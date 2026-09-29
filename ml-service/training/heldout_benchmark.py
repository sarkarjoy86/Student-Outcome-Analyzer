import os, sys, json, time, random, argparse, datetime, statistics
from collections import Counter, defaultdict
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, ROOT)

DATASET = os.path.join(ROOT, "dataset", "OBE_Augmented_Dataset.xlsx")
SHEET = "Unique_Master_Questions"
SEED, VAL_RATIO = 42, 0.10
BASE_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
FT_LOCAL = os.path.join(ROOT, "models", "sbert-obe-csematch")
FT_HUB = "obe-ai-system/sbert-obe-csematch"

def load_and_split():
    df = pd.read_excel(DATASET, sheet_name=SHEET)
    for c in ["Question", "CO Description", "CO", "Course Name"]:
        df[c] = df[c].astype(str).str.strip()
    df = df[(df["Question"] != "") & (df["Question"] != "nan") &
            (df["CO Description"] != "") & (df["CO Description"] != "nan")].reset_index(drop=True)
    df["_group_key"] = df["Course Name"] + "||" + df["CO"]
    groups = list(df["_group_key"].unique())
    rng = random.Random(SEED); rng.shuffle(groups)
    val_groups = set(groups[:max(1, int(len(groups) * VAL_RATIO))])
    val = df[df["_group_key"].isin(val_groups)].reset_index(drop=True)
    train = df[~df["_group_key"].isin(val_groups)].reset_index(drop=True)
    assert not (set(val["_group_key"]) & set(train["_group_key"])), "leakage!"
    return df, train, val

def co_catalog(df):
    cat = defaultdict(dict)
    for (course, co), g in df.groupby(["Course Name", "CO"]):
        cat[course][co] = g["CO Description"].mode().iloc[0]
    return cat

def evaluate_co(model, rows, cat, batch=64):
    from sklearn.metrics import f1_score
    qs = rows["Question"].tolist()
    q_emb = model.encode(qs, batch_size=batch, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    co_cache = {}
    preds, trues, top3, rr, margins, pos_sims, ncand = [], [], [], [], [], [], []
    for i, r in enumerate(rows.itertuples(index=False)):
        course = r[rows.columns.get_loc("Course Name")]
        true_co = r[rows.columns.get_loc("CO")]
        cands = cat[course]
        codes = list(cands)
        if course not in co_cache:
            co_cache[course] = model.encode([cands[c] for c in codes], convert_to_numpy=True, normalize_embeddings=True)
        sims = co_cache[course] @ q_emb[i]
        order = np.argsort(-sims)
        ranked = [codes[j] for j in order]
        preds.append(ranked[0]); trues.append(true_co); top3.append(true_co in ranked[:3])
        rr.append(1.0 / (ranked.index(true_co) + 1))
        ti = codes.index(true_co); pos = float(sims[ti])
        neg = max(float(s) for j, s in enumerate(sims) if j != ti) if len(codes) > 1 else 0.0
        margins.append(pos - neg); pos_sims.append(pos); ncand.append(len(codes))
    keys = [f"{c}||{t}" for c, t in zip(rows["Course Name"], trues)]
    pkeys = [f"{c}||{p}" for c, p in zip(rows["Course Name"], preds)]
    res = {
        "n": len(rows),
        "top1": float(np.mean([p == t for p, t in zip(preds, trues)])),
        "top3": float(np.mean(top3)),
        "mrr": float(np.mean(rr)),
        "macro_f1": float(f1_score(keys, pkeys, average="macro", zero_division=0)),
        "weighted_f1": float(f1_score(keys, pkeys, average="weighted", zero_division=0)),
        "mean_pos_cos": float(np.mean(pos_sims)),
        "mean_margin": float(np.mean(margins)),
        "random_baseline_top1": float(np.mean([1.0 / n for n in ncand])),
        "avg_candidates": float(np.mean(ncand)),
    }
    return res, preds

def pm(x): return f"{x*100:.1f}%"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bloom-api", type=int, default=0)
    ap.add_argument("--ft", default=None)
    ap.add_argument("--train-sample", type=int, default=0)
    args = ap.parse_args()
    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out = os.path.join(HERE, "results", f"heldout_{stamp}"); os.makedirs(out, exist_ok=True)
    R = {"generated": stamp, "seed": SEED, "val_ratio": VAL_RATIO}
    md = [f"# Held-out benchmark -- {stamp}\n"]
    df, train, val = load_and_split()
    cat = co_catalog(df)
    if "Data Type" not in df.columns:
        df["Data Type"] = "Original"
        val["Data Type"] = "Original"
        train["Data Type"] = "Original"
    orig_mask = ~val["Data Type"].astype(str).str.contains("Augment", case=False)
    val_orig = val[orig_mask].reset_index(drop=True)
    n_tr = args.train_sample or len(val)
    train_s = train.sample(n=min(n_tr, len(train)), random_state=SEED).reset_index(drop=True)
    R["split"] = {"total_rows": len(df), "groups": int(df["_group_key"].nunique()),
                  "train_rows": len(train), "train_groups": int(train["_group_key"].nunique()),
                  "heldout_rows": len(val), "heldout_groups": int(val["_group_key"].nunique()),
                  "heldout_original_rows": len(val_orig), "heldout_courses": int(val["Course Name"].nunique()),
                  "heldout_datatype": val["Data Type"].astype(str).value_counts().to_dict()}
    s = R["split"]
    md.append("## 1. Split (re-created exactly as in train_sbert.py)\n")
    md.append(f"- Total rows {s['total_rows']:,} in {s['groups']} Course+CO groups")
    md.append(f"- Train {s['train_rows']:,} rows / {s['train_groups']} groups")
    md.append(f"- **Held-out {s['heldout_rows']} rows / {s['heldout_groups']} groups / {s['heldout_courses']} courses** "
              f"(original questions: {s['heldout_original_rows']}) -- {s['heldout_datatype']}\n")
    from sentence_transformers import SentenceTransformer
    ft_id = args.ft or (FT_LOCAL if os.path.exists(FT_LOCAL) else FT_HUB)
    models = {"base (all-MiniLM-L6-v2)": BASE_MODEL, "fine-tuned (sbert-obe-csematch)": ft_id}
    R["models"] = models
    R["co"] = {}
    subsets = {"Held-out (all)": val, "Held-out (original questions only)": val_orig, "Training sample (seen)": train_s}
    loaded = {}
    SLUG = {"Held-out (all)": "heldout_all", "Held-out (original questions only)": "heldout_original", "Training sample (seen)": "train_sample"}
    for mname, mid in models.items():
        print(f"Loading {mname}: {mid}")
        loaded[mname] = SentenceTransformer(mid, device="cpu")
        R["co"][mname] = {}
        for sname, rows in subsets.items():
            if len(rows) == 0:
                print(f"  {sname:40s} SKIPPED (0 rows)"); continue
            t0 = time.time()
            res, preds = evaluate_co(loaded[mname], rows, cat)
            res["seconds"] = round(time.time() - t0, 1)
            R["co"][mname][sname] = res
            pd.DataFrame({"course": rows["Course Name"], "question": rows["Question"], "true_co": rows["CO"],
                          "pred_co": preds, "data_type": rows["Data Type"]}).to_csv(
                os.path.join(out, f"co_predictions_{mname.split()[0]}_{SLUG[sname]}.csv"), index=False)
            print(f"  {sname:40s} top1={pm(res['top1'])} top3={pm(res['top3'])} macroF1={pm(res['macro_f1'])}")
    md.append("## 2. CO-mapping results\n")
    md.append("| Model | Subset | n | Top-1 | Top-3 | MRR | Macro-F1 | Weighted-F1 | Mean margin | Random Top-1 |")
    md.append("|---|---|---|---|---|---|---|---|---|---|")
    for m, d in R["co"].items():
        for sname, r in d.items():
            md.append(f"| {m} | {sname} | {r['n']} | {pm(r['top1'])} | {pm(r['top3'])} | {r['mrr']:.3f} | {pm(r['macro_f1'])} | "
                      f"{pm(r['weighted_f1'])} | {r['mean_margin']:.3f} | {pm(r['random_baseline_top1'])} |")
    md.append("")
    ft = loaded["fine-tuned (sbert-obe-csematch)"]
    para, unrel = [], []
    rng = random.Random(SEED)
    for g, grp in val.groupby("_group_key"):
        o = grp[~grp["Data Type"].astype(str).str.contains("Augment", case=False)]["Question"].tolist()
        a = grp[grp["Data Type"].astype(str).str.contains("Augment", case=False)]["Question"].tolist()
        for q in o[:10]:
            if a: para.append((q, rng.choice(a)))
    allq = val["Question"].tolist(); courses = val["Course Name"].tolist()
    while len(unrel) < max(len(para), 50):
        i, j = rng.randrange(len(allq)), rng.randrange(len(allq))
        if courses[i] != courses[j]: unrel.append((allq[i], allq[j]))
    def pair_cos(pairs):
        a = ft.encode([p[0] for p in pairs], normalize_embeddings=True, convert_to_numpy=True)
        b = ft.encode([p[1] for p in pairs], normalize_embeddings=True, convert_to_numpy=True)
        return [float(x) for x in (a * b).sum(1)]
    pc, uc = pair_cos(para) if para else [], pair_cos(unrel)
    R["similarity"] = {"paraphrase": {"n": len(pc), "mean": float(np.mean(pc)) if pc else None, "sd": float(np.std(pc)) if pc else None},
                       "unrelated_cross_course": {"n": len(uc), "mean": float(np.mean(uc)), "sd": float(np.std(uc))}}
    sm = R["similarity"]
    md.append("## 3. Similarity evidence (fine-tuned model, held-out questions)\n")
    if pc: md.append(f"- Paraphrase pairs (original vs augmented): **{sm['paraphrase']['mean']:.4f} +/- {sm['paraphrase']['sd']:.4f}** (n={len(pc)})")
    md.append(f"- Unrelated pairs (different courses): **{sm['unrelated_cross_course']['mean']:.4f} +/- {sm['unrelated_cross_course']['sd']:.4f}** (n={len(uc)})\n")
    from sklearn.metrics import f1_score, confusion_matrix
    from services.bloom_service import detect_action_verb, sanitize_question_text
    if "Bloom's Level" not in df.columns:
        print("  [NOTE] 'Bloom''s Level' column not found -- skipping Bloom evaluation")
        R["bloom_rule"] = {"skipped": True, "reason": "No Bloom Level column in dataset"}
        md.append("## 4. Bloom classifier\n_Skipped: Bloom Level column not found._\n")
    else:
        real = df[~df["Data Type"].astype(str).str.contains("Augment", case=False)].copy()
        real["true"] = real["Bloom's Level"].astype(str).str.extract(r"(C[1-6])")[0]
        real = real[real["true"].notna()].reset_index(drop=True)
        labels = [f"C{i}" for i in range(1, 7)]
        rule = [detect_action_verb(sanitize_question_text(q))[0] for q in real["Question"]]
        fired = [p is not None for p in rule]
        acc_f = float(np.mean([p == t for p, t, f in zip(rule, real["true"], fired) if f])) if any(fired) else 0
        R["bloom_rule"] = {"n": len(real), "coverage": float(np.mean(fired)), "accuracy_when_fired": acc_f,
                           "accuracy_overall_nofire_wrong": float(np.mean([p == t for p, t in zip(rule, real["true"])])),
                           "label_distribution": real["true"].value_counts().sort_index().to_dict()}
        fr = [(p, t) for p, t, f in zip(rule, real["true"], fired) if f]
        cm = confusion_matrix([t for _, t in fr], [p for p, _ in fr], labels=labels)
        R["bloom_rule"]["confusion_when_fired"] = cm.tolist()
        R["bloom_rule"]["macro_f1_when_fired"] = float(f1_score([t for _, t in fr], [p for p, _ in fr], labels=labels, average="macro", zero_division=0))
        pd.DataFrame({"question": real["Question"], "true": real["true"], "rule_pred": rule}).to_csv(os.path.join(out, "bloom_predictions_rule.csv"), index=False)
        b = R["bloom_rule"]
        md.append("## 4. Bloom classifier\n")
        md.append(f"### 4a. Rule engine only -- {b['n']} real labelled questions")
        md.append(f"- Coverage (a verb rule fired): **{pm(b['coverage'])}**")
        md.append(f"- Accuracy when fired: **{pm(b['accuracy_when_fired'])}**, Macro-F1 when fired: {pm(b['macro_f1_when_fired'])}")
        md.append(f"- Label distribution: {b['label_distribution']}")
        md.append("- Confusion matrix (rows = true C1..C6, cols = predicted):")
        md.append("```\n" + "\n".join(" ".join(f"{v:5d}" for v in row) for row in cm) + "\n```")
        if args.bloom_api > 0:
            if not os.getenv("HF_TOKEN"):
                md.append("\n_4b skipped: HF_TOKEN is not set._")
            else:
                from services.bloom_service import classify_bloom
                per = max(1, args.bloom_api // 6)
                samp = pd.concat([g.sample(n=min(per, len(g)), random_state=SEED) for _, g in real.groupby("true")]).reset_index(drop=True)
                preds2, errs = [], 0
                for k, q in enumerate(samp["Question"]):
                    try:
                        r = classify_bloom(q); preds2.append(r.suggested)
                    except Exception as e:
                        preds2.append(None); errs += 1
                    if (k + 1) % 20 == 0: print(f"  bloom api {k+1}/{len(samp)}")
                    time.sleep(0.3)
                ok = [(p, t) for p, t in zip(preds2, samp["true"]) if p]
                cm2 = confusion_matrix([t for _, t in ok], [p for p, _ in ok], labels=labels)
                R["bloom_hybrid"] = {"n": len(samp), "errors": errs,
                                     "accuracy": float(np.mean([p == t for p, t in ok])) if ok else None,
                                     "macro_f1": float(f1_score([t for _, t in ok], [p for p, _ in ok], labels=labels, average="macro", zero_division=0)) if ok else None,
                                     "per_level_n": samp["true"].value_counts().sort_index().to_dict(), "confusion": cm2.tolist()}
                pd.DataFrame({"question": samp["Question"], "true": samp["true"], "hybrid_pred": preds2}).to_csv(os.path.join(out, "bloom_predictions_hybrid.csv"), index=False)
                h = R["bloom_hybrid"]
                md.append(f"\n### 4b. Full production pipeline (rule + zero-shot) -- n={h['n']} (API errors: {h['errors']})")
                md.append(f"- Accuracy: **{pm(h['accuracy'])}**, Macro-F1: {pm(h['macro_f1'])}  -- per level n: {h['per_level_n']}")
                md.append("```\n" + "\n".join(" ".join(f"{v:5d}" for v in row) for row in cm2) + "\n```")
    md.append("\n## Notes\n- Held-out = 10% Course+CO groups excluded from training (seed 42).\n- CO metrics: raw cosine ranking, no production keyword boosts.")
    json.dump(R, open(os.path.join(out, "results.json"), "w"), indent=2, default=str)
    open(os.path.join(out, "report.md"), "w", encoding="utf-8").write("\n".join(md))
    print("\n".join(md)); print(f"\nSaved to: {out}")

if __name__ == "__main__":
    main()
