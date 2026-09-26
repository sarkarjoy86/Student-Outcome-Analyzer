"""
evaluate_model.py — OBE SBERT Model Evaluation & Benchmark Suite
=================================================================
Dataset  : OBE_Augmented_Dataset.xlsx  (Unique_Master_Questions + Course_Outcomes_Master)
Metrics  : Mean Cosine Similarity | Top-1 Accuracy | Top-3 Accuracy | Benchmark Table
"""

import os
import sys
import logging
import numpy as np
import pandas as pd
from tabulate import tabulate
from sentence_transformers import SentenceTransformer

# Reconfigure stdout/stderr for Windows UTF-8 compatibility
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("evaluate_model")

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR          = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT        = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DATASET_PATH        = os.path.join(PROJECT_ROOT, "dataset", "OBE_Augmented_Dataset.xlsx")
FINE_TUNED_MODEL_DIR = os.path.join(PROJECT_ROOT, "models", "sbert-obe-csematch")
BASE_MODEL_NAME     = "sentence-transformers/all-MiniLM-L6-v2"


# ─────────────────────────────────────────────────────────────────────────────
# Core helpers
# ─────────────────────────────────────────────────────────────────────────────

def _encode_norm(model: SentenceTransformer, texts: list) -> np.ndarray:
    """Encode a list of texts and L2-normalize the embeddings."""
    return model.encode(texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)


def predict_top_co(model: SentenceTransformer, question_text: str, candidate_cos: list) -> tuple:
    """
    Computes normalized cosine similarity between question and candidate CO descriptions.
    Returns (predicted_co_code, max_similarity_score, ranked_list_of_(code, score)).
    """
    q_emb = _encode_norm(model, [question_text])[0]

    co_texts = [
        f"{item['code']}: {item['description']}".strip() if item.get("description") else item["code"]
        for item in candidate_cos
    ]
    co_embs   = _encode_norm(model, co_texts)
    sims      = np.dot(co_embs, q_emb)
    ranked    = sorted(zip([c["code"] for c in candidate_cos], sims.tolist()),
                       key=lambda x: x[1], reverse=True)
    best_code = ranked[0][0]
    best_sim  = ranked[0][1]
    return best_code, float(best_sim), ranked


# ─────────────────────────────────────────────────────────────────────────────
# Metric 1 — Mean Cosine Similarity on positive pairs
# ─────────────────────────────────────────────────────────────────────────────

def compute_mean_cosine(model: SentenceTransformer, df: pd.DataFrame, n_samples: int = 500) -> float:
    """Samples up to n_samples positive (Question, CO Description) pairs and
    returns the mean cosine similarity (higher = better alignment)."""
    sample_df = df.sample(min(n_samples, len(df)), random_state=42)
    q_embs  = _encode_norm(model, sample_df["Question"].tolist())
    co_embs = _encode_norm(model, sample_df["CO Description"].tolist())
    # Diagonal of (q @ co.T) gives pair-wise similarities
    sims = np.einsum("ij,ij->i", q_embs, co_embs)
    return float(np.mean(sims))


# ─────────────────────────────────────────────────────────────────────────────
# Metric 2 — Top-1 / Top-3 Accuracy
# ─────────────────────────────────────────────────────────────────────────────

def compute_topk_accuracy(model: SentenceTransformer, test_cases: list) -> dict:
    """
    For each test case, checks whether the true CO appears in top-1 and top-3 predictions.
    test_cases: list of dicts with keys: question, true_co, candidates
    Returns dict with top1, top3 accuracy rates.
    """
    top1_hits = 0
    top3_hits = 0

    for case in test_cases:
        _, _, ranked = predict_top_co(model, case["question"], case["candidates"])
        top3_codes = [code for code, _ in ranked[:3]]
        if ranked[0][0] == case["true_co"]:
            top1_hits += 1
        if case["true_co"] in top3_codes:
            top3_hits += 1

    n = len(test_cases)
    return {
        "top1": top1_hits / n if n > 0 else 0.0,
        "top3": top3_hits / n if n > 0 else 0.0,
        "n":    n,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main Evaluation
# ─────────────────────────────────────────────────────────────────────────────

def run_evaluation_benchmark():
    logger.info("=" * 70)
    logger.info("OBE SBERT Model Evaluation & Comparison Benchmark")
    logger.info("=" * 70)

    # 1. Load Dataset
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Master dataset not found at: {DATASET_PATH}")

    logger.info(f"Loading dataset from: {DATASET_PATH}")
    augmented_df  = pd.read_excel(DATASET_PATH, sheet_name="Unique_Master_Questions")
    co_master_df  = pd.read_excel(DATASET_PATH, sheet_name="Course_Outcomes_Master")

    # Sanitise column names
    augmented_df.columns = augmented_df.columns.str.strip()
    co_master_df.columns = co_master_df.columns.str.strip()

    # Extract Course Code from 'Course Name' if needed (e.g. "CSE 443 Digital...")
    if "Course Code" not in augmented_df.columns:
        augmented_df["Course Code"] = (
            augmented_df["Course Name"].astype(str).str.extract(r"(CSE\s*\d+)", expand=False).str.strip()
        )

    logger.info(f"Augmented rows : {len(augmented_df):,}")
    logger.info(f"CO master rows : {len(co_master_df):,}")

    # 2. Load Models
    logger.info(f"Loading Baseline Model: {BASE_MODEL_NAME} ...")
    baseline_model = SentenceTransformer(BASE_MODEL_NAME)

    has_fine_tuned = os.path.exists(FINE_TUNED_MODEL_DIR) and (
        os.path.exists(os.path.join(FINE_TUNED_MODEL_DIR, "model.safetensors")) or
        os.path.exists(os.path.join(FINE_TUNED_MODEL_DIR, "pytorch_model.bin"))
    )

    if has_fine_tuned:
        logger.info(f"Loading Fine-Tuned Model from: {FINE_TUNED_MODEL_DIR} ...")
        fine_tuned_model = SentenceTransformer(FINE_TUNED_MODEL_DIR)
    else:
        logger.warning(
            f"Fine-tuned model not found at '{FINE_TUNED_MODEL_DIR}'. "
            "Falling back to base model for both sides of comparison."
        )
        fine_tuned_model = baseline_model

    # ── Metric 1 : Mean Cosine Similarity ────────────────────────────────────
    logger.info("Computing Mean Cosine Similarity on positive pairs (n=500) ...")
    base_mean_cos = compute_mean_cosine(baseline_model, augmented_df)
    ft_mean_cos   = compute_mean_cosine(fine_tuned_model, augmented_df)
    logger.info(f"Baseline mean cosine   : {base_mean_cos:.4f}")
    logger.info(f"Fine-tuned mean cosine : {ft_mean_cos:.4f}")

    # 3. Build Benchmark Test Cases (5 representative courses)
    target_courses = [
        "CSE 443",   # Digital Image Processing
        "CSE 315",   # Computer Architecture and Design
        "CSE 313",   # Database Management System
        "CSE 327",   # Computer Networks
        "CSE 317",   # Software Engineering & Design Patterns
    ]

    benchmark_cases = []
    for course_code in target_courses:
        # Match rows — try 'Original Exam' first, fall back to any
        matched = augmented_df[
            augmented_df["Course Name"].astype(str).str.startswith(course_code)
        ]
        original = matched[matched.get("Data Type", pd.Series()).astype(str) == "Original Exam"] \
            if "Data Type" in matched.columns else matched
        if original.empty:
            original = matched
        if original.empty:
            logger.warning(f"No rows found for course {course_code} — skipping.")
            continue

        row          = original.iloc[0]
        question     = str(row["Question"]).strip()
        true_co      = str(row["CO"]).strip()
        course_name  = str(row["Course Name"]).strip()

        # CO candidates from Course_Outcomes_Master
        # Support both "Course Code" and derived code
        co_rows = co_master_df[co_master_df["Course Code"].astype(str).str.strip() == course_code]
        candidate_cos = [
            {
                "code":        str(r["Outcome ID"]).strip(),
                "description": str(r["Outcome Description"]).strip(),
            }
            for _, r in co_rows.iterrows()
        ]
        if not candidate_cos:
            logger.warning(f"No CO candidates in master for {course_code} — skipping benchmark.")
            continue

        benchmark_cases.append({
            "course_code": course_code,
            "course_name": course_name,
            "question":    question,
            "true_co":     true_co,
            "candidates":  candidate_cos,
        })

    # ── Metric 2 : Top-1 / Top-3 Accuracy ────────────────────────────────────
    logger.info(f"Running Top-K accuracy on {len(benchmark_cases)} benchmark cases ...")
    base_topk = compute_topk_accuracy(baseline_model, benchmark_cases)
    ft_topk   = compute_topk_accuracy(fine_tuned_model, benchmark_cases)

    # 4. Per-Case Results Table
    results_table = []
    baseline_correct  = 0
    finetuned_correct = 0

    for case in benchmark_cases:
        q           = case["question"]
        true_co     = case["true_co"]
        candidates  = case["candidates"]

        base_pred, base_score, _ = predict_top_co(baseline_model, q, candidates)
        ft_pred, ft_score, _     = predict_top_co(fine_tuned_model, q, candidates)

        base_ok = (base_pred == true_co)
        ft_ok   = (ft_pred   == true_co)
        if base_ok:
            baseline_correct  += 1
        if ft_ok:
            finetuned_correct += 1

        if ft_ok and not base_ok:
            status = "Improved (FT Wins)"
        elif ft_ok and base_ok:
            status = "Accurate (+Score Boost)" if ft_score > base_score else "Accurate"
        elif not ft_ok and base_ok:
            status = "Regression"
        else:
            status = "Mismatched"

        display_q = (q[:55] + "...") if len(q) > 55 else q
        results_table.append([
            case["course_code"],
            display_q,
            true_co,
            f"{base_pred} ({base_score:.3f})",
            f"{ft_pred} ({ft_score:.3f})",
            status,
        ])

    # 5. Print Per-Case Table
    headers = [
        "Course",
        "Question (truncated)",
        "True CO",
        "Baseline Pred (Sim)",
        "Fine-Tuned Pred (Sim)",
        "Status",
    ]
    print("\n" + tabulate(results_table, headers=headers, tablefmt="grid"))

    # 6. Print Comprehensive Summary
    n = len(benchmark_cases)
    print("\n" + "=" * 70)
    print("EVALUATION BENCHMARK SUMMARY")
    print("=" * 70)

    summary_rows = [
        ["Metric",                         "Baseline (all-MiniLM)",       "Fine-Tuned (sbert-obe-csematch)", "Delta"],
        ["Mean Cosine Similarity (n=500)",  f"{base_mean_cos:.4f}",        f"{ft_mean_cos:.4f}",             f"{ft_mean_cos - base_mean_cos:+.4f}"],
        ["Top-1 Accuracy",                  f"{base_topk['top1']*100:.1f}%", f"{ft_topk['top1']*100:.1f}%",  f"{(ft_topk['top1']-base_topk['top1'])*100:+.1f}%"],
        ["Top-3 Accuracy",                  f"{base_topk['top3']*100:.1f}%", f"{ft_topk['top3']*100:.1f}%",  f"{(ft_topk['top3']-base_topk['top3'])*100:+.1f}%"],
        ["Benchmark Cases Correct",         f"{baseline_correct}/{n}",      f"{finetuned_correct}/{n}",       ""],
    ]
    print(tabulate(summary_rows[1:], headers=summary_rows[0], tablefmt="grid"))
    print("=" * 70 + "\n")


if __name__ == "__main__":
    run_evaluation_benchmark()

