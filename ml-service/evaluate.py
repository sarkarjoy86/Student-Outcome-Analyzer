import os
import sys
import json
import time
import io
import numpy as np
from typing import List, Dict, Any

# Ensure terminal stdout handles UTF-8 cleanly on Windows
if sys.platform.startswith("win"):
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from tabulate import tabulate
try:
    from sklearn.metrics import (
        accuracy_score,
        precision_score,
        recall_score,
        f1_score,
        classification_report,
        confusion_matrix
    )
except Exception as e:
    logger.warning(f"sklearn.metrics import issue ({e}), using built-in exact metric calculators.")
    def accuracy_score(y_true, y_pred):
        return sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp) / len(y_true) if y_true else 0.0

    def precision_score(y_true, y_pred, labels=None, average="macro", zero_division=0):
        # Implementation for macro and weighted precision
        labels = labels or sorted(list(set(y_true) | set(y_pred)))
        precisions = []
        weights = []
        for lbl in labels:
            tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == lbl and yp == lbl)
            fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt != lbl and yp == lbl)
            prec = tp / (tp + fp) if (tp + fp) > 0 else zero_division
            precisions.append(prec)
            weights.append(sum(1 for yt in y_true if yt == lbl))
        if average == "macro":
            return float(np.mean(precisions))
        elif average == "weighted":
            total_w = sum(weights)
            return float(sum(p * w for p, w in zip(precisions, weights)) / total_w) if total_w > 0 else 0.0
        return precisions

    def recall_score(y_true, y_pred, labels=None, average="macro", zero_division=0):
        labels = labels or sorted(list(set(y_true) | set(y_pred)))
        recalls = []
        weights = []
        for lbl in labels:
            tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == lbl and yp == lbl)
            fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == lbl and yp != lbl)
            rec = tp / (tp + fn) if (tp + fn) > 0 else zero_division
            recalls.append(rec)
            weights.append(sum(1 for yt in y_true if yt == lbl))
        if average == "macro":
            return float(np.mean(recalls))
        elif average == "weighted":
            total_w = sum(weights)
            return float(sum(r * w for r, w in zip(recalls, weights)) / total_w) if total_w > 0 else 0.0
        return recalls

    def f1_score(y_true, y_pred, labels=None, average="macro", zero_division=0):
        labels = labels or sorted(list(set(y_true) | set(y_pred)))
        f1s = []
        weights = []
        for lbl in labels:
            tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == lbl and yp == lbl)
            fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt != lbl and yp == lbl)
            fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == lbl and yp != lbl)
            prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else zero_division
            f1s.append(f1)
            weights.append(sum(1 for yt in y_true if yt == lbl))
        if average == "macro":
            return float(np.mean(f1s))
        elif average == "weighted":
            total_w = sum(weights)
            return float(sum(f * w for f, w in zip(f1s, weights)) / total_w) if total_w > 0 else 0.0
        return f1s

    def confusion_matrix(y_true, y_pred, labels=None):
        labels = labels or sorted(list(set(y_true) | set(y_pred)))
        label_idx = {lbl: i for i, lbl in enumerate(labels)}
        cm = np.zeros((len(labels), len(labels)), dtype=int)
        for yt, yp in zip(y_true, y_pred):
            if yt in label_idx and yp in label_idx:
                cm[label_idx[yt]][label_idx[yp]] += 1
        return cm

    def classification_report(y_true, y_pred, labels=None, target_names=None, output_dict=False, zero_division=0):
        labels = labels or sorted(list(set(y_true) | set(y_pred)))
        names = target_names or labels
        out = {}
        for lbl, name in zip(labels, names):
            tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == lbl and yp == lbl)
            fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt != lbl and yp == lbl)
            fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == lbl and yp != lbl)
            supp = sum(1 for yt in y_true if yt == lbl)
            p = tp / (tp + fp) if (tp + fp) > 0 else zero_division
            r = tp / (tp + fn) if (tp + fn) > 0 else zero_division
            f = (2 * p * r / (p + r)) if (p + r) > 0 else zero_division
            out[name] = {"precision": p, "recall": r, "f1-score": f, "support": supp}
        macro_p = float(np.mean([out[n]["precision"] for n in names]))
        macro_r = float(np.mean([out[n]["recall"] for n in names]))
        macro_f = float(np.mean([out[n]["f1-score"] for n in names]))
        tot_supp = len(y_true)
        out["macro avg"] = {"precision": macro_p, "recall": macro_r, "f1-score": macro_f, "support": tot_supp}
        weighted_p = float(sum(out[n]["precision"] * out[n]["support"] for n in names) / tot_supp) if tot_supp else 0.0
        weighted_r = float(sum(out[n]["recall"] * out[n]["support"] for n in names) / tot_supp) if tot_supp else 0.0
        weighted_f = float(sum(out[n]["f1-score"] * out[n]["support"] for n in names) / tot_supp) if tot_supp else 0.0
        out["weighted avg"] = {"precision": weighted_p, "recall": weighted_r, "f1-score": weighted_f, "support": tot_supp}
        return out

# Ensure ml-service root directory is in python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from core.config import settings, logger
from core.models import model_manager
from services.bloom_service import classify_bloom


# ---------------------------------------------------------------------------
# Reference Course Outcome Definitions
# ---------------------------------------------------------------------------
REFERENCE_COURSE_OUTCOMES: Dict[str, str] = {
    "CO1": "Classify and apply major object-oriented concepts such as data abstraction, encapsulation, polymorphism, and inheritance.",
    "CO2": "Solve various programming problems using C++ features like templates, exceptions, casting, operator overloads, and dynamic memory.",
    "CO3": "Work in collaborative teams to construct software engineering specifications.",
    "CO4": "Replicate and design software architectures to solve real-life engineering problems."
}

# Candidate labels for Bloom Zero-Shot classification
BLOOM_LABELS = [
    "C1 - Remember",
    "C2 - Understand",
    "C3 - Apply",
    "C4 - Analyze",
    "C5 - Evaluate",
    "C6 - Create"
]
BLOOM_LEVELS = ["C1", "C2", "C3", "C4", "C5", "C6"]
CO_LEVELS = ["CO1", "CO2", "CO3", "CO4"]


def load_benchmark_dataset(dataset_path: str) -> List[Dict[str, Any]]:
    """Loads the ground-truth benchmark JSON dataset."""
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Benchmark dataset not found at: {dataset_path}")
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def evaluate_pipeline():
    print("=" * 88)
    print("        FORMAL NLP MODEL EVALUATION BENCHMARK PIPELINE - OBE ML-SERVICE")
    print("=" * 88)
    print(f"[*] Compute Device : {settings.DEVICE.upper()} (GPU: {settings.GPU_NAME or 'None'})")
    print(f"[*] SBERT Model    : {settings.SBERT_MODEL_NAME}")
    print(f"[*] Zero-Shot Model: {settings.ZERO_SHOT_MODEL_NAME}")
    print("=" * 88)

    # 1. Load active models
    print("\n[Step 1/4] Loading models into memory/VRAM...")
    t0 = time.time()
    sbert_model = model_manager.get_sbert_model()
    classifier = model_manager.get_zero_shot_classifier()
    print(f"[OK] Models initialized in {time.time() - t0:.2f}s")

    # 2. Load dataset
    benchmark_file = os.path.join(CURRENT_DIR, "test_benchmark.json")
    print(f"\n[Step 2/4] Loading ground truth dataset: {benchmark_file}")
    dataset = load_benchmark_dataset(benchmark_file)
    total_samples = len(dataset)
    print(f"[OK] Loaded {total_samples} evaluation samples.")

    # 3. Precompute CO embeddings for efficient cosine similarity
    co_codes = list(REFERENCE_COURSE_OUTCOMES.keys())
    co_descriptions = [f"{code}: {REFERENCE_COURSE_OUTCOMES[code]}" for code in co_codes]
    co_embeddings = sbert_model.encode(
        co_descriptions,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    # 4. Run inference loop
    print("\n[Step 3/4] Running inference across benchmark dataset...")
    y_true_bloom: List[str] = []
    y_pred_bloom_baseline: List[str] = []
    y_pred_bloom_hybrid: List[str] = []
    y_true_co: List[str] = []
    y_pred_co: List[str] = []

    per_sample_results = []
    inference_times = []

    for idx, item in enumerate(dataset, start=1):
        question = item["question"]
        true_bloom = item["true_bloom"].strip().upper()
        true_co = item["true_co"].strip().upper()

        sample_t0 = time.time()

        # Bloom Zero-Shot Baseline Classification
        bloom_res = classifier(
            question,
            candidate_labels=BLOOM_LABELS,
            hypothesis_template="This university exam question requires students to {}.",
            multi_label=False
        )
        top_bloom_label = bloom_res["labels"][0]
        bloom_score = bloom_res["scores"][0]
        pred_bloom_base = top_bloom_label.split()[0].upper()

        # Production Hybrid Bloom Pipeline (Zero-Shot + Action Verb Heuristics)
        hybrid_res = classify_bloom(question)
        pred_bloom_hyb = hybrid_res.suggested.upper()

        # CO Semantic Similarity Prediction
        q_emb = sbert_model.encode(question, convert_to_numpy=True, normalize_embeddings=True)
        similarities = np.dot(co_embeddings, q_emb)
        best_co_idx = int(np.argmax(similarities))
        pred_co = co_codes[best_co_idx]
        co_score = float(similarities[best_co_idx])

        elapsed = time.time() - sample_t0
        inference_times.append(elapsed)

        y_true_bloom.append(true_bloom)
        y_pred_bloom_baseline.append(pred_bloom_base)
        y_pred_bloom_hybrid.append(pred_bloom_hyb)
        y_true_co.append(true_co)
        y_pred_co.append(pred_co)

        b_base_hit = "HIT" if true_bloom == pred_bloom_base else "MISS"
        b_hyb_hit = "HIT" if true_bloom == pred_bloom_hyb else "MISS"
        co_hit = "HIT" if true_co == pred_co else "MISS"

        # Truncate question for readable terminal table
        q_snippet = (question[:42] + "...") if len(question) > 45 else question
        per_sample_results.append([
            idx,
            q_snippet,
            true_bloom,
            f"{pred_bloom_base} ({bloom_score:.2f})",
            b_base_hit,
            pred_bloom_hyb,
            b_hyb_hit,
            true_co,
            f"{pred_co} ({co_score:.2f})",
            co_hit,
            f"{elapsed * 1000:.1f}ms"
        ])

    print("\n" + tabulate(
        per_sample_results,
        headers=[
            "#", "Question Snippet", "True Bloom", "Base Bloom", "Base-Hit",
            "Hybrid Bloom", "Hyb-Hit", "True CO", "Pred CO", "CO-Hit", "Latency"
        ],
        tablefmt="grid"
    ))

    # 5. Compute Metrics
    print("\n" + "=" * 88)
    print("                       PERFORMANCE EVALUATION METRICS")
    print("=" * 88)

    # Bloom Baseline Metrics
    b_acc_base = accuracy_score(y_true_bloom, y_pred_bloom_baseline)
    b_prec_base = precision_score(y_true_bloom, y_pred_bloom_baseline, labels=BLOOM_LEVELS, average="macro", zero_division=0)
    b_rec_base = recall_score(y_true_bloom, y_pred_bloom_baseline, labels=BLOOM_LEVELS, average="macro", zero_division=0)
    b_f1_base = f1_score(y_true_bloom, y_pred_bloom_baseline, labels=BLOOM_LEVELS, average="macro", zero_division=0)

    # Bloom Production Hybrid Metrics
    b_acc_hyb = accuracy_score(y_true_bloom, y_pred_bloom_hybrid)
    b_prec_hyb = precision_score(y_true_bloom, y_pred_bloom_hybrid, labels=BLOOM_LEVELS, average="macro", zero_division=0)
    b_rec_hyb = recall_score(y_true_bloom, y_pred_bloom_hybrid, labels=BLOOM_LEVELS, average="macro", zero_division=0)
    b_f1_hyb = f1_score(y_true_bloom, y_pred_bloom_hybrid, labels=BLOOM_LEVELS, average="macro", zero_division=0)

    # Weighted versions
    b_prec_hyb_w = precision_score(y_true_bloom, y_pred_bloom_hybrid, labels=BLOOM_LEVELS, average="weighted", zero_division=0)
    b_rec_hyb_w = recall_score(y_true_bloom, y_pred_bloom_hybrid, labels=BLOOM_LEVELS, average="weighted", zero_division=0)
    b_f1_hyb_w = f1_score(y_true_bloom, y_pred_bloom_hybrid, labels=BLOOM_LEVELS, average="weighted", zero_division=0)

    # CO Metrics
    co_acc = accuracy_score(y_true_co, y_pred_co)
    co_prec_macro = precision_score(y_true_co, y_pred_co, labels=CO_LEVELS, average="macro", zero_division=0)
    co_rec_macro = recall_score(y_true_co, y_pred_co, labels=CO_LEVELS, average="macro", zero_division=0)
    co_f1_macro = f1_score(y_true_co, y_pred_co, labels=CO_LEVELS, average="macro", zero_division=0)

    summary_metrics = [
        ["Bloom Baseline (DistilBART Zero-Shot)", f"{b_acc_base * 100:.2f}%", f"{b_prec_base * 100:.2f}%", f"{b_rec_base * 100:.2f}%", f"{b_f1_base * 100:.2f}%"],
        ["Bloom Production (Hybrid ML + Verbs)", f"{b_acc_hyb * 100:.2f}%", f"{b_prec_hyb * 100:.2f}%", f"{b_rec_hyb * 100:.2f}%", f"{b_f1_hyb * 100:.2f}%"],
        ["Bloom Production (Weighted Macro)", f"{b_acc_hyb * 100:.2f}%", f"{b_prec_hyb_w * 100:.2f}%", f"{b_rec_hyb_w * 100:.2f}%", f"{b_f1_hyb_w * 100:.2f}%"],
        ["Course Outcome Mapping (SBERT CO1-CO4)", f"{co_acc * 100:.2f}%", f"{co_prec_macro * 100:.2f}%", f"{co_rec_macro * 100:.2f}%", f"{co_f1_macro * 100:.2f}%"]
    ]

    print("\n--- Summary Performance Comparison Table ---")
    print(tabulate(
        summary_metrics,
        headers=["Pipeline / Evaluation Domain", "Top-1 Accuracy", "Precision", "Recall", "F1-Score"],
        tablefmt="grid"
    ))

    # Detailed Bloom Baseline Classification Report
    print("\n--- Bloom's Taxonomy Baseline Classification Report (Zero-Shot) ---")
    b_base_rep = classification_report(
        y_true_bloom,
        y_pred_bloom_baseline,
        labels=BLOOM_LEVELS,
        target_names=[f"{lvl} ({lbl.split(' - ')[1]})" for lvl, lbl in zip(BLOOM_LEVELS, BLOOM_LABELS)],
        output_dict=True,
        zero_division=0
    )
    b_base_rows = []
    for level, lbl in zip(BLOOM_LEVELS, BLOOM_LABELS):
        target_name = f"{level} ({lbl.split(' - ')[1]})"
        m = b_base_rep.get(target_name, {})
        b_base_rows.append([target_name, f"{m.get('precision', 0.0):.3f}", f"{m.get('recall', 0.0):.3f}", f"{m.get('f1-score', 0.0):.3f}", int(m.get('support', 0))])
    b_base_rows.append(["macro avg", f"{b_base_rep['macro avg']['precision']:.3f}", f"{b_base_rep['macro avg']['recall']:.3f}", f"{b_base_rep['macro avg']['f1-score']:.3f}", int(b_base_rep['macro avg']['support'])])
    b_base_rows.append(["weighted avg", f"{b_base_rep['weighted avg']['precision']:.3f}", f"{b_base_rep['weighted avg']['recall']:.3f}", f"{b_base_rep['weighted avg']['f1-score']:.3f}", int(b_base_rep['weighted avg']['support'])])
    print(tabulate(b_base_rows, headers=["Cognitive Level", "Precision", "Recall", "F1-Score", "Support"], tablefmt="rst"))

    # Detailed Bloom Production Hybrid Classification Report
    print("\n--- Bloom's Taxonomy Production Hybrid Classification Report (ML + Verbs) ---")
    b_hyb_rep = classification_report(
        y_true_bloom,
        y_pred_bloom_hybrid,
        labels=BLOOM_LEVELS,
        target_names=[f"{lvl} ({lbl.split(' - ')[1]})" for lvl, lbl in zip(BLOOM_LEVELS, BLOOM_LABELS)],
        output_dict=True,
        zero_division=0
    )
    b_hyb_rows = []
    for level, lbl in zip(BLOOM_LEVELS, BLOOM_LABELS):
        target_name = f"{level} ({lbl.split(' - ')[1]})"
        m = b_hyb_rep.get(target_name, {})
        b_hyb_rows.append([target_name, f"{m.get('precision', 0.0):.3f}", f"{m.get('recall', 0.0):.3f}", f"{m.get('f1-score', 0.0):.3f}", int(m.get('support', 0))])
    b_hyb_rows.append(["macro avg", f"{b_hyb_rep['macro avg']['precision']:.3f}", f"{b_hyb_rep['macro avg']['recall']:.3f}", f"{b_hyb_rep['macro avg']['f1-score']:.3f}", int(b_hyb_rep['macro avg']['support'])])
    b_hyb_rows.append(["weighted avg", f"{b_hyb_rep['weighted avg']['precision']:.3f}", f"{b_hyb_rep['weighted avg']['recall']:.3f}", f"{b_hyb_rep['weighted avg']['f1-score']:.3f}", int(b_hyb_rep['weighted avg']['support'])])
    print(tabulate(b_hyb_rows, headers=["Cognitive Level", "Precision", "Recall", "F1-Score", "Support"], tablefmt="rst"))

    # Confusion Matrix for Bloom Baseline
    print("\n--- Bloom's Taxonomy Baseline Confusion Matrix (Zero-Shot) ---")
    cm_base = confusion_matrix(y_true_bloom, y_pred_bloom_baseline, labels=BLOOM_LEVELS)
    cm_base_rows = [[f"Actual {BLOOM_LEVELS[i]}"] + list(row) for i, row in enumerate(cm_base)]
    print(tabulate(cm_base_rows, headers=["Actual \\ Pred"] + [f"Pred {lvl}" for lvl in BLOOM_LEVELS], tablefmt="grid"))

    # Confusion Matrix for Bloom Production Hybrid
    print("\n--- Bloom's Taxonomy Production Hybrid Confusion Matrix (ML + Verbs) ---")
    cm_hyb = confusion_matrix(y_true_bloom, y_pred_bloom_hybrid, labels=BLOOM_LEVELS)
    cm_hyb_rows = [[f"Actual {BLOOM_LEVELS[i]}"] + list(row) for i, row in enumerate(cm_hyb)]
    print(tabulate(cm_hyb_rows, headers=["Actual \\ Pred"] + [f"Pred {lvl}" for lvl in BLOOM_LEVELS], tablefmt="grid"))

    # Confusion Matrix for Course Outcomes
    print("\n--- Course Outcome (CO) Confusion Matrix ---")
    cm_co = confusion_matrix(y_true_co, y_pred_co, labels=CO_LEVELS)
    cm_co_rows = [[f"Actual {CO_LEVELS[i]}"] + list(row) for i, row in enumerate(cm_co)]
    print(tabulate(cm_co_rows, headers=["Actual \\ Pred"] + [f"Pred {lvl}" for lvl in CO_LEVELS], tablefmt="grid"))

    # Latency Stats
    avg_latency = np.mean(inference_times) * 1000
    p95_latency = np.percentile(inference_times, 95) * 1000
    print(f"\n[Performance & Latency Benchmark]")
    print(f" - Total Samples Evaluated : {total_samples}")
    print(f" - Mean Pipeline Latency   : {avg_latency:.1f} ms / sample")
    print(f" - 95th Percentile Latency : {p95_latency:.1f} ms / sample")
    print("=" * 80)
    print("                     BENCHMARK EVALUATION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    evaluate_pipeline()
