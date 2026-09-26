"""
train_sbert.py — Enterprise-Grade OBE SBERT Continual Learning Pipeline
========================================================================
Warm-start  : ml-service/models/sbert-obe-csematch  (existing fine-tuned weights)
Dataset     : OBE_Augmented_Dataset.xlsx  Sheet: Unique_Master_Questions (7 009 rows)
Loss        : MultipleNegativesRankingLoss (in-batch hard negatives)
Optimizer   : AdamW  lr=2e-5  weight_decay=0.01  warmup=10% of total steps
Output      : ml-service/models/sbert-obe-csematch  (all HF-deployable artifacts)
"""

import os
import sys
import time
import random
import logging
import warnings

import torch
import pandas as pd
from torch.utils.data import DataLoader
from sentence_transformers import SentenceTransformer, InputExample
from sentence_transformers.losses import MultipleNegativesRankingLoss
from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator

warnings.filterwarnings("ignore", category=FutureWarning)

# ─────────────────────────────────────────────────────────────────────────────
# Logging — UTF-8 safe on Windows
# ─────────────────────────────────────────────────────────────────────────────
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("train_sbert")

# ─────────────────────────────────────────────────────────────────────────────
# Path Resolution
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR       = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT     = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DATASET_PATH     = os.path.join(PROJECT_ROOT, "dataset", "OBE_Augmented_Dataset.xlsx")
SHEET_NAME       = "Unique_Master_Questions"
OUTPUT_MODEL_DIR = os.path.join(PROJECT_ROOT, "models", "sbert-obe-csematch")

# ─────────────────────────────────────────────────────────────────────────────
# Hyper-parameters
# ─────────────────────────────────────────────────────────────────────────────
EPOCHS          = 4
BATCH_SIZE      = 32          # adaptive: falls back to 16 if VRAM < 4 GB
LEARNING_RATE   = 2e-5
WEIGHT_DECAY    = 0.01
WARMUP_RATIO    = 0.10
EVAL_STEPS      = 100
VAL_SPLIT_RATIO = 0.10
RANDOM_STATE    = 42


# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────

def _banner(text: str, width: int = 70) -> None:
    border = "=" * width
    logger.info(border)
    logger.info(text.center(width))
    logger.info(border)


def _group_shuffle_split(df: pd.DataFrame, group_col: str, val_ratio: float, seed: int):
    """
    Group-aware train/val split.
    Each unique (Course Name || CO) combination is one group so that all
    augmented variants of the same exam question land entirely in train OR val.
    """
    unique_groups = list(df[group_col].unique())
    rng = random.Random(seed)
    rng.shuffle(unique_groups)

    split_point    = max(1, int(len(unique_groups) * val_ratio))
    val_groups_set = set(unique_groups[:split_point])

    val_mask = df[group_col].isin(val_groups_set)
    train_df = df[~val_mask].copy().reset_index(drop=True)
    val_df   = df[val_mask].copy().reset_index(drop=True)

    # Strict leakage assertion
    overlap = set(train_df[group_col].unique()) & set(val_df[group_col].unique())
    assert len(overlap) == 0, f"Data leakage detected: {len(overlap)} overlapping groups!"

    return train_df, val_df


# ─────────────────────────────────────────────────────────────────────────────
# Main Pipeline
# ─────────────────────────────────────────────────────────────────────────────

def train_pipeline():
    pipeline_start = time.time()
    _banner("OBE SBERT Continual Learning Pipeline  v3.0")

    # ── Step 1 · Device Resolution ──────────────────────────────────────────
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda":
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb  = torch.cuda.get_device_properties(0).total_memory / 1e9
        logger.info(f"[GPU] {gpu_name}  |  VRAM: {vram_gb:.1f} GB")
    else:
        logger.warning("[Device] CUDA not available — training on CPU (this will be slow).")
    logger.info(f"Active compute device: {device.upper()}")

    # ── Step 2 · Data Ingestion ──────────────────────────────────────────────
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")

    logger.info(f"Loading dataset   : {DATASET_PATH}")
    logger.info(f"Target sheet      : {SHEET_NAME}")
    df = pd.read_excel(DATASET_PATH, sheet_name=SHEET_NAME)
    logger.info(f"Raw rows loaded   : {len(df):,}")

    # Validate required columns
    required_cols = ["Question", "CO Description", "CO", "Course Name"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in dataset: {missing}")

    # Strip whitespace and drop empties / NaN placeholders
    for col in ["Question", "CO Description", "CO", "Course Name"]:
        df[col] = df[col].astype(str).str.strip()

    before = len(df)
    df = df[
        (df["Question"]       != "") & (df["Question"]       != "nan") &
        (df["CO Description"] != "") & (df["CO Description"] != "nan")
    ].reset_index(drop=True)
    dropped = before - len(df)
    if dropped:
        logger.info(f"Dropped {dropped} empty/NaN rows. Remaining: {len(df):,}")
    else:
        logger.info(f"All {len(df):,} rows passed quality filter (0 empty rows).")

    # ── Step 3 · Group-Aware Train / Val Split ───────────────────────────────
    df["_group_key"] = df["Course Name"] + "||" + df["CO"]
    total_groups     = df["_group_key"].nunique()
    logger.info(f"Unique question groups (Course + CO): {total_groups:,}")

    train_df, val_df = _group_shuffle_split(
        df, "_group_key", VAL_SPLIT_RATIO, RANDOM_STATE
    )
    n_train_g = train_df["_group_key"].nunique()
    n_val_g   = val_df["_group_key"].nunique()
    logger.info(
        f"Split  Train : {len(train_df):,} rows | {n_train_g:,} groups "
        f"({len(train_df)/len(df)*100:.1f}%)"
    )
    logger.info(
        f"Split  Val   : {len(val_df):,} rows  | {n_val_g:,} groups "
        f"({len(val_df)/len(df)*100:.1f}%)"
    )
    logger.info("Zero data leakage verified — Train and Val share 0 question groups.")

    # ── Step 4 · Build Training InputExamples ────────────────────────────────
    logger.info("Building InputExample pairs (Question <-> CO Description) ...")
    train_examples = [
        InputExample(texts=[row["Question"], row["CO Description"]])
        for _, row in train_df.iterrows()
    ]
    logger.info(f"Training InputExamples: {len(train_examples):,}")

    # ── Step 5 · Validation Evaluator ────────────────────────────────────────
    # Mix positive pairs (score=1.0) with shuffled-negative pairs (score=0.0)
    # to provide score variance and avoid Pearson=nan warnings.
    import random as _rnd
    _rnd.seed(RANDOM_STATE)
    pos_q   = val_df["Question"].tolist()
    pos_co  = val_df["CO Description"].tolist()
    neg_co  = pos_co.copy()
    _rnd.shuffle(neg_co)
    neg_co  = [c if c != pos_co[i] else (pos_co[i-1] if i > 0 else pos_co[i+1])
               for i, c in enumerate(neg_co)]

    eval_s1     = pos_q     + pos_q
    eval_s2     = pos_co    + neg_co
    eval_scores = [1.0] * len(pos_q) + [0.0] * len(pos_q)

    evaluator = EmbeddingSimilarityEvaluator(
        sentences1=eval_s1,
        sentences2=eval_s2,
        scores=eval_scores,
        name="obe-val",
        show_progress_bar=False,
    )
    logger.info(
        f"EmbeddingSimilarityEvaluator: {len(pos_q):,} positive + {len(pos_q):,} negative pairs "
        f"(score variance guaranteed)."
    )

    # ── Step 6 · Continual Learning — Warm-Start from Local Weights ──────────
    has_local_weights = os.path.exists(OUTPUT_MODEL_DIR) and (
        os.path.exists(os.path.join(OUTPUT_MODEL_DIR, "model.safetensors")) or
        os.path.exists(os.path.join(OUTPUT_MODEL_DIR, "pytorch_model.bin"))
    )

    if has_local_weights:
        logger.info(f"Warm-start: Loading existing fine-tuned weights from {OUTPUT_MODEL_DIR}")
        model = SentenceTransformer(OUTPUT_MODEL_DIR, device=device)
        logger.info("Continual learning mode — existing domain knowledge preserved.")
    else:
        fallback = "sentence-transformers/all-MiniLM-L6-v2"
        logger.warning(f"Local weights not found — initialising from HF base: {fallback}")
        model = SentenceTransformer(fallback, device=device)

    # Verify 384d embedding dimension
    emb_dim = model.encode("dim_check", convert_to_numpy=True).shape[0]
    logger.info(f"Embedding dimension: {emb_dim}d (expected 384 — backward compatible)")
    if emb_dim != 384:
        raise ValueError(f"Embedding dimension mismatch! Got {emb_dim}, expected 384.")

    # ── Step 7 · Training Configuration ──────────────────────────────────────
    effective_batch = BATCH_SIZE
    if device == "cuda":
        if torch.cuda.get_device_properties(0).total_memory / 1e9 < 4.0:
            effective_batch = 16
            logger.info(f"Low VRAM detected — batch size reduced to {effective_batch}.")

    train_dataloader = DataLoader(
        train_examples, shuffle=True, batch_size=effective_batch, drop_last=False
    )
    train_loss   = MultipleNegativesRankingLoss(model)
    total_steps  = len(train_dataloader) * EPOCHS
    warmup_steps = max(1, int(total_steps * WARMUP_RATIO))

    logger.info("─" * 70)
    logger.info("TRAINING CONFIGURATION")
    logger.info("─" * 70)
    logger.info(f"  Epochs           : {EPOCHS}")
    logger.info(f"  Batch size       : {effective_batch}")
    logger.info(f"  Learning rate    : {LEARNING_RATE}")
    logger.info(f"  Weight decay     : {WEIGHT_DECAY}")
    logger.info(f"  Total steps      : {total_steps:,}")
    logger.info(f"  Warmup steps     : {warmup_steps:,}  ({WARMUP_RATIO*100:.0f}% of total)")
    logger.info(f"  Eval every       : {EVAL_STEPS} steps")
    logger.info(f"  Loss function    : MultipleNegativesRankingLoss")
    logger.info(f"  Output dir       : {OUTPUT_MODEL_DIR}")
    logger.info("─" * 70)

    os.makedirs(OUTPUT_MODEL_DIR, exist_ok=True)

    # ── Step 8 · Fine-Tuning ──────────────────────────────────────────────────
    _banner("Fine-Tuning Started")

    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        evaluator=evaluator,
        epochs=EPOCHS,
        warmup_steps=warmup_steps,
        optimizer_params={
            "lr": LEARNING_RATE,
            "weight_decay": WEIGHT_DECAY,
        },
        evaluation_steps=EVAL_STEPS,
        output_path=OUTPUT_MODEL_DIR,
        save_best_model=True,
        show_progress_bar=True,
    )

    # ── Step 9 · Persist All HF-Deployable Artifacts ─────────────────────────
    logger.info("Saving final model state to disk ...")
    model.save(OUTPUT_MODEL_DIR)

    # ── Step 10 · Artifact Verification ──────────────────────────────────────
    _banner("Artifact Verification")
    REQUIRED_FILES = [
        "model.safetensors",
        "config.json",
        "config_sentence_transformers.json",
        "tokenizer.json",
        "tokenizer_config.json",
        "modules.json",
        "sentence_bert_config.json",
    ]
    saved_files = os.listdir(OUTPUT_MODEL_DIR)
    all_ok = True
    for fname in REQUIRED_FILES:
        ok = fname in saved_files
        logger.info(f"  {'OK' if ok else 'MISSING':7s}  {fname}")
        if not ok:
            all_ok = False

    # vocab.txt may live in a sub-directory
    vocab_ok = "vocab.txt" in saved_files or any(
        "vocab.txt" in os.listdir(os.path.join(OUTPUT_MODEL_DIR, d))
        for d in saved_files
        if os.path.isdir(os.path.join(OUTPUT_MODEL_DIR, d))
    )
    logger.info(f"  {'OK' if vocab_ok else 'NOTE':7s}  vocab.txt")

    if all_ok:
        logger.info("All required HF-deployable artifacts present.")
    else:
        logger.warning("Some artifacts missing — review the output directory.")

    # ── Final Summary ─────────────────────────────────────────────────────────
    elapsed = time.time() - pipeline_start
    _banner("Pipeline Completed Successfully")
    logger.info(f"Total training time : {elapsed/60:.1f} min ({elapsed:.0f}s)")
    logger.info(f"Model saved to      : {OUTPUT_MODEL_DIR}")
    logger.info(f"Embedding dimension : {emb_dim}d (384d — API backward-compatible)")
    logger.info("Next step -> python training/evaluate_model.py")


if __name__ == "__main__":
    train_pipeline()
