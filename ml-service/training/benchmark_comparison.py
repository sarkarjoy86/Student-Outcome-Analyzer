"""
benchmark_comparison.py
=======================
Rigorous Benchmark: Base Pre-trained Model vs Fine-Tuned OBE Model
Dataset : OBE_Augmented_Dataset.xlsx  (Sheet: Unique_Master_Questions)
N       : 500 diverse questions, fixed seed=42
Metrics : Top-1 / Top-3 Accuracy | Macro & Weighted P/R/F1
          Mean Positive / Negative Cosine Similarity | Cosine Margin
"""

import os
import re
import sys
import json
import random
import warnings

import numpy as np
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer, util
from sklearn.metrics import classification_report, accuracy_score

warnings.filterwarnings("ignore")

# ── UTF-8 safe output on Windows ──────────────────────────────────────────────
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# ── Path resolution ────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
EXCEL_PATH   = os.path.join(PROJECT_ROOT, "dataset", "OBE_Augmented_Dataset.xlsx")
FT_MODEL_DIR = os.path.join(PROJECT_ROOT, "models", "sbert-obe-csematch")
OUT_JSON     = os.path.join(SCRIPT_DIR, "benchmark_results.json")

# ── Constants ─────────────────────────────────────────────────────────────────
BASE_MODEL   = "sentence-transformers/all-MiniLM-L6-v2"
SAMPLE_SIZE  = 500
RANDOM_SEED  = 42

# ─────────────────────────────────────────────────────────────────────────────
print("=" * 80)
print("  OBE AI SYSTEM: BASELINE VS FINE-TUNED BENCHMARK  (N=500)")
print("=" * 80)

device = "cuda" if torch.cuda.is_available() else "cpu"
if device == "cuda":
    gpu = torch.cuda.get_device_name(0)
    vram = torch.cuda.get_device_properties(0).total_memory / 1e9
    print(f"Compute Device  : CUDA — {gpu}  ({vram:.1f} GB VRAM)")
else:
    print("Compute Device  : CPU")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Load Dataset
# ─────────────────────────────────────────────────────────────────────────────
print(f"\nLoading dataset : {EXCEL_PATH}")
xls   = pd.ExcelFile(EXCEL_PATH)
df_q  = pd.read_excel(xls, sheet_name="Unique_Master_Questions")
df_co = pd.read_excel(xls, sheet_name="Course_Outcomes_Master")

# Normalise column whitespace
df_q.columns  = df_q.columns.str.strip()
df_co.columns = df_co.columns.str.strip()

print(f"  Questions      : {len(df_q):,}")
print(f"  CO Master rows : {len(df_co):,}")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Build CO Catalog: {course_code -> [{co_id, desc}]}
#    Use robust regex extraction so "CSE 113: Discrete Math" -> "CSE 113"
# ─────────────────────────────────────────────────────────────────────────────
def extract_course_code(text: str) -> str:
    """Extract 'CSE NNN' prefix from any course name string."""
    m = re.search(r"(CSE\s*\d+)", str(text), re.IGNORECASE)
    return m.group(1).strip().upper() if m else str(text).strip().upper()

course_cos: dict[str, list] = {}
for _, row in df_co.iterrows():
    code = extract_course_code(row["Course Code"])
    if code not in course_cos:
        course_cos[code] = []
    course_cos[code].append({
        "co_id": str(row["Outcome ID"]).strip().upper(),
        "desc":  str(row["Outcome Description"]).strip(),
    })

print(f"  Course catalog : {len(course_cos)} courses with mapped COs")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Sample 500 diverse questions (stratified across courses, fixed seed)
# ─────────────────────────────────────────────────────────────────────────────
df_q["_course_code"] = df_q["Course Name"].apply(extract_course_code)
df_q["CO"]           = df_q["CO"].astype(str).str.strip().str.upper()
df_q["Question"]     = df_q["Question"].astype(str).str.strip()

# Keep only rows where CO candidates exist in master
valid_mask = df_q["_course_code"].isin(course_cos) & (df_q["Question"] != "") & (df_q["Question"] != "NAN")
df_valid   = df_q[valid_mask].reset_index(drop=True)
print(f"  Valid rows     : {len(df_valid):,}  (course CO exists + non-empty question)")

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

actual_sample = min(SAMPLE_SIZE, len(df_valid))
test_df = df_valid.sample(n=actual_sample, random_state=RANDOM_SEED).reset_index(drop=True)
print(f"  Sampled        : {actual_sample} diverse evaluation questions (seed={RANDOM_SEED})")
print(f"  Courses covered: {test_df['_course_code'].nunique()}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Evaluation Engine
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_model(model_name_or_path: str, label: str) -> dict:
    """
    Run the SAME 500 questions through the given model and return a full
    metrics dict covering accuracy, F1, cosine similarity, and margin.
    """
    print(f"\n{'─'*60}")
    print(f"Evaluating : {label}")
    print(f"{'─'*60}")

    model = SentenceTransformer(model_name_or_path, device=device)

    y_true         = []
    y_pred         = []
    top3_hits      = 0
    pos_sims       = []   # sim(question, correct CO)
    neg_sims       = []   # sim(question, wrong COs)
    skipped        = 0

    for _, row in test_df.iterrows():
        q_text     = row["Question"]
        course_key = row["_course_code"]
        target_co  = row["CO"]

        candidates = course_cos.get(course_key, [])
        if len(candidates) < 2:
            skipped += 1
            continue

        # Encode question and all candidate CO descriptions
        q_emb    = model.encode(q_text, convert_to_tensor=True, normalize_embeddings=True)
        co_descs = [c["desc"] for c in candidates]
        co_embs  = model.encode(co_descs, convert_to_tensor=True, normalize_embeddings=True)

        sims       = util.cos_sim(q_emb, co_embs)[0].cpu().numpy()  # shape: (n_cos,)
        ranked_idx = np.argsort(-sims)
        ranked_cos = [candidates[i]["co_id"] for i in ranked_idx]

        top1 = ranked_cos[0]
        y_true.append(target_co)
        y_pred.append(top1)

        if target_co in ranked_cos[:3]:
            top3_hits += 1

        # Separate positive and negative similarities
        for i, c in enumerate(candidates):
            if c["co_id"] == target_co:
                pos_sims.append(float(sims[i]))
            else:
                neg_sims.append(float(sims[i]))

    total = len(y_true)
    if skipped:
        print(f"  [NOTE] Skipped {skipped} rows with < 2 CO candidates.")
    print(f"  Evaluated : {total} questions")

    top1_acc  = accuracy_score(y_true, y_pred) * 100
    top3_acc  = (top3_hits / total) * 100 if total else 0.0

    report    = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    macro     = report.get("macro avg",    {})
    weighted  = report.get("weighted avg", {})

    mean_pos = float(np.mean(pos_sims)) if pos_sims else 0.0
    mean_neg = float(np.mean(neg_sims)) if neg_sims else 0.0
    margin   = mean_pos - mean_neg

    print(f"  Top-1 Acc : {top1_acc:.2f}%  |  Top-3 Acc : {top3_acc:.2f}%")
    print(f"  Macro F1  : {macro.get('f1-score', 0)*100:.2f}%")
    print(f"  Mean +Sim : {mean_pos:.4f}  |  Mean -Sim : {mean_neg:.4f}  |  Margin : {margin:.4f}")

    return {
        "label"        : label,
        "total"        : total,
        "top1_acc"     : top1_acc,
        "top3_acc"     : top3_acc,
        "macro_prec"   : macro.get("precision", 0) * 100,
        "macro_rec"    : macro.get("recall",    0) * 100,
        "macro_f1"     : macro.get("f1-score",  0) * 100,
        "weighted_prec": weighted.get("precision", 0) * 100,
        "weighted_rec" : weighted.get("recall",    0) * 100,
        "weighted_f1"  : weighted.get("f1-score",  0) * 100,
        "mean_pos"     : mean_pos,
        "mean_neg"     : mean_neg,
        "margin"       : margin,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. Run both models on the IDENTICAL test set
# ─────────────────────────────────────────────────────────────────────────────
base_results = evaluate_model(BASE_MODEL,   label="Base Model (all-MiniLM-L6-v2)")
ft_results   = evaluate_model(FT_MODEL_DIR, label="Fine-Tuned Model (sbert-obe-csematch)")


# ─────────────────────────────────────────────────────────────────────────────
# 6. Benchmark Report Table
# ─────────────────────────────────────────────────────────────────────────────

def fmt_delta(ft_val: float, base_val: float, is_similarity: bool = False) -> str:
    diff = ft_val - base_val
    sign = "+" if diff >= 0 else ""
    if is_similarity:
        return f"{sign}{diff:.4f}"
    pct = (diff / base_val * 100) if base_val != 0 else 0.0
    return f"{sign}{diff:.2f} ({sign}{pct:.1f}%)"


METRICS = [
    ("Top-1 Accuracy (%)",        "top1_acc",     False),
    ("Top-3 Accuracy (%)",        "top3_acc",     False),
    ("Macro Precision (%)",       "macro_prec",   False),
    ("Macro Recall (%)",          "macro_rec",    False),
    ("Macro F1-Score (%)",        "macro_f1",     False),
    ("Weighted Precision (%)",    "weighted_prec",False),
    ("Weighted Recall (%)",       "weighted_rec", False),
    ("Weighted F1-Score (%)",     "weighted_f1",  False),
    ("Mean Positive Similarity",  "mean_pos",     True),
    ("Mean Negative Similarity",  "mean_neg",     True),
    ("Cosine Separation Margin",  "margin",       True),
]

print("\n\n" + "=" * 88)
print(f"  OBE BENCHMARK RESULTS  —  N={actual_sample} questions  |  seed={RANDOM_SEED}")
print("=" * 88)
print(f"{'METRIC':<33} | {'BASE MODEL':>14} | {'FINE-TUNED':>14} | {'DELTA / IMPROVEMENT':>20}")
print("-" * 88)

for label, key, is_sim in METRICS:
    b  = base_results[key]
    f  = ft_results[key]
    dl = fmt_delta(f, b, is_sim)
    if is_sim:
        print(f"{label:<33} | {b:>14.4f} | {f:>14.4f} | {dl:>20}")
    else:
        print(f"{label:<33} | {b:>14.2f} | {f:>14.2f} | {dl:>20}")

print("=" * 88)
print(f"  Questions evaluated     : {ft_results['total']} / {actual_sample}")
print(f"  Base model              : {BASE_MODEL}")
print(f"  Fine-tuned model        : {FT_MODEL_DIR}")
print("=" * 88)


# ─────────────────────────────────────────────────────────────────────────────
# 7. Export JSON
# ─────────────────────────────────────────────────────────────────────────────
export = {
    "config": {
        "sample_size" : actual_sample,
        "random_seed" : RANDOM_SEED,
        "device"      : device,
        "base_model"  : BASE_MODEL,
        "fine_tuned"  : FT_MODEL_DIR,
        "dataset"     : EXCEL_PATH,
    },
    "base_model"      : base_results,
    "fine_tuned_model": ft_results,
}

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(export, f, indent=4, ensure_ascii=False)

print(f"\nBenchmark results exported -> {OUT_JSON}")
