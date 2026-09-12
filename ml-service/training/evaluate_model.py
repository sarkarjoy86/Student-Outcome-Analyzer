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
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("evaluate_model")

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DATASET_PATH = os.path.join(PROJECT_ROOT, "dataset", "OBE_NLP_Dataset.xlsx")
FINE_TUNED_MODEL_DIR = os.path.join(PROJECT_ROOT, "models", "sbert-obe-csematch")
BASE_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def predict_top_co(model: SentenceTransformer, question_text: str, candidate_cos: list) -> tuple:
    """
    Computes normalized cosine similarity between question and candidate CO descriptions.
    Returns (predicted_co_code, max_similarity_score).
    """
    q_emb = model.encode(question_text, convert_to_numpy=True, normalize_embeddings=True)
    
    co_texts = [
        f"{item['code']}: {item['description']}".strip() if item.get("description") else item["code"]
        for item in candidate_cos
    ]
    co_embs = model.encode(co_texts, convert_to_numpy=True, normalize_embeddings=True)
    
    similarities = np.dot(co_embs, q_emb)
    best_idx = int(np.argmax(similarities))
    return candidate_cos[best_idx]["code"], float(similarities[best_idx])


def run_evaluation_benchmark():
    logger.info("=" * 70)
    logger.info("OBE SBERT Model Evaluation & Comparison Benchmark")
    logger.info("=" * 70)

    # 1. Load Dataset
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Master dataset not found at: {DATASET_PATH}")

    logger.info(f"Loading dataset from: {DATASET_PATH}")
    augmented_df = pd.read_excel(DATASET_PATH, sheet_name="OBE_Augmented_Dataset")
    co_master_df = pd.read_excel(DATASET_PATH, sheet_name="Course_Outcomes_Master")

    # 2. Load Models
    logger.info(f"Loading Baseline Model: {BASE_MODEL_NAME}...")
    baseline_model = SentenceTransformer(BASE_MODEL_NAME)

    has_fine_tuned = os.path.exists(FINE_TUNED_MODEL_DIR) and (
        os.path.exists(os.path.join(FINE_TUNED_MODEL_DIR, "model.safetensors")) or
        os.path.exists(os.path.join(FINE_TUNED_MODEL_DIR, "pytorch_model.bin"))
    )

    if has_fine_tuned:
        logger.info(f"Loading Fine-Tuned Model from: {FINE_TUNED_MODEL_DIR}...")
        fine_tuned_model = SentenceTransformer(FINE_TUNED_MODEL_DIR)
    else:
        logger.warning(
            f"Fine-tuned model not found at '{FINE_TUNED_MODEL_DIR}'. "
            "Falling back to base model for both sides of comparison."
        )
        fine_tuned_model = baseline_model

    # 3. Select 5 Representative Benchmark Test Cases across Different Courses
    target_courses = [
        "CSE 443",  # Digital Image Processing
        "CSE 315",  # Computer Architecture and Design
        "CSE 313",  # Database Management System
        "CSE 327",  # Computer Networks
        "CSE 317",  # Software Engineering & Design Patterns
    ]

    benchmark_cases = []
    for course_code in target_courses:
        # Get matching questions from original exams in dataset
        matched_rows = augmented_df[
            augmented_df["Course Name"].str.startswith(course_code) & 
            (augmented_df["Data Type"] == "Original Exam")
        ]
        if matched_rows.empty:
            matched_rows = augmented_df[augmented_df["Course Name"].str.startswith(course_code)]

        sample_row = matched_rows.iloc[0]
        question_text = str(sample_row["Question"]).strip()
        true_co = str(sample_row["CO"]).strip()
        course_name = str(sample_row["Course Name"]).strip()

        # Extract all candidate CO definitions for this course from Course_Outcomes_Master
        course_cos_df = co_master_df[co_master_df["Course Code"] == course_code]
        candidate_cos = [
            {
                "code": str(row["Outcome ID"]).strip(),
                "description": str(row["Outcome Description"]).strip()
            }
            for _, row in course_cos_df.iterrows()
        ]

        benchmark_cases.append({
            "course_code": course_code,
            "course_name": course_name,
            "question": question_text,
            "true_co": true_co,
            "candidates": candidate_cos
        })

    # 4. Run Benchmark Inference
    results_table = []
    baseline_correct = 0
    finetuned_correct = 0

    for idx, case in enumerate(benchmark_cases, start=1):
        q = case["question"]
        true_co = case["true_co"]
        candidates = case["candidates"]

        # Baseline prediction
        base_pred, base_score = predict_top_co(baseline_model, q, candidates)
        base_is_correct = (base_pred == true_co)
        if base_is_correct:
            baseline_correct += 1

        # Fine-tuned prediction
        ft_pred, ft_score = predict_top_co(fine_tuned_model, q, candidates)
        ft_is_correct = (ft_pred == true_co)
        if ft_is_correct:
            finetuned_correct += 1

        # Status determination
        if ft_is_correct and not base_is_correct:
            status = "Improved (FT Correct)"
        elif ft_is_correct and base_is_correct:
            if ft_score > base_score:
                status = "Accurate (+Score Boost)"
            else:
                status = "Accurate"
        elif not ft_is_correct and base_is_correct:
            status = "Regression"
        else:
            status = "Mismatched"

        # Truncate question for clean table display
        display_q = (q[:55] + "...") if len(q) > 55 else q

        results_table.append([
            case["course_code"],
            display_q,
            true_co,
            f"{base_pred} ({base_score:.3f})",
            f"{ft_pred} ({ft_score:.3f})",
            status
        ])

    # 5. Display Benchmark Summary
    headers = [
        "Course",
        "Question",
        "True CO",
        "Baseline Pred (Sim)",
        "Fine-Tuned Pred (Sim)",
        "Status"
    ]

    print("\n" + tabulate(results_table, headers=headers, tablefmt="grid"))

    print("\n" + "=" * 70)
    print("BENCHMARK ACCURACY SUMMARY")
    print("=" * 70)
    print(f"Total Benchmark Cases Evaluated : {len(benchmark_cases)}")
    print(f"Baseline (all-MiniLM-L6-v2)     : {baseline_correct}/{len(benchmark_cases)} ({baseline_correct/len(benchmark_cases)*100:.1f}%)")
    print(f"Fine-Tuned (sbert-obe-csematch) : {finetuned_correct}/{len(benchmark_cases)} ({finetuned_correct/len(benchmark_cases)*100:.1f}%)")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    run_evaluation_benchmark()
