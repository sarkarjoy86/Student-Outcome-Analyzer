import os
import sys
import logging
import torch
import pandas as pd
from torch.utils.data import DataLoader
from sklearn.model_selection import GroupShuffleSplit
from sentence_transformers import SentenceTransformer, InputExample
from sentence_transformers.losses import MultipleNegativesRankingLoss
from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("train_sbert")

# Resolve Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DATASET_PATH = os.path.join(PROJECT_ROOT, "dataset", "OBE_NLP_Dataset.xlsx")
OUTPUT_MODEL_DIR = os.path.join(PROJECT_ROOT, "models", "sbert-obe-csematch")


def train_pipeline():
    logger.info("=" * 65)
    logger.info("Starting OBE SBERT Fine-Tuning Pipeline")
    logger.info("=" * 65)

    # 1. Device Resolution
    device = "cuda" if torch.cuda.is_available() else "cpu"
    gpu_name = torch.cuda.get_device_name(0) if device == "cuda" else "None"
    logger.info(f"Active Compute Device: {device.upper()} (GPU: {gpu_name})")

    # 2. Load Dataset
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset file not found at: {DATASET_PATH}")

    logger.info(f"Loading master dataset from: {DATASET_PATH}")
    df = pd.read_excel(DATASET_PATH, sheet_name="OBE_Augmented_Dataset")
    total_rows = len(df)
    logger.info(f"Total dataset rows loaded: {total_rows}")

    # 3. Prevent Data Leakage (GroupShuffleSplit on Question Families)
    # Each question family contains exactly 4 consecutive rows
    df["group_id"] = df.index // 4
    total_groups = df["group_id"].nunique()
    logger.info(f"Total question families (groups): {total_groups} (4 rows/group)")

    gss = GroupShuffleSplit(n_splits=1, test_size=0.10, random_state=42)
    train_indices, val_indices = next(gss.split(df, groups=df["group_id"]))

    train_df = df.iloc[train_indices].copy().reset_index(drop=True)
    val_df = df.iloc[val_indices].copy().reset_index(drop=True)

    train_groups = set(train_df["group_id"].unique())
    val_groups = set(val_df["group_id"].unique())

    # Strict Data Leakage Assertion
    overlap = train_groups.intersection(val_groups)
    assert len(overlap) == 0, f"Critical Data Leakage: Found overlapping groups: {overlap}"

    logger.info(
        f"Data split summary: Train = {len(train_df)} rows ({len(train_groups)} groups, {len(train_groups)/total_groups*100:.1f}%), "
        f"Validation = {len(val_df)} rows ({len(val_groups)} groups, {len(val_groups)/total_groups*100:.1f}%)"
    )
    logger.info("✓ Zero data leakage verified: Train and Validation sets share 0 question families.")

    # 4. Build Training Pairs (Contrastive Learning with InputExample)
    logger.info("Constructing training pairs (Question <-> CO Description)...")
    train_examples = []
    for _, row in train_df.iterrows():
        question_text = str(row["Question"]).strip()
        co_desc = str(row["CO Description"]).strip()
        if question_text and co_desc:
            train_examples.append(InputExample(texts=[question_text, co_desc]))

    logger.info(f"Constructed {len(train_examples)} training InputExamples.")

    # 5. Build Validation Evaluator
    val_s1 = [str(row["Question"]).strip() for _, row in val_df.iterrows()]
    val_s2 = [str(row["CO Description"]).strip() for _, row in val_df.iterrows()]
    val_scores = [1.0] * len(val_df)

    evaluator = EmbeddingSimilarityEvaluator(
        sentences1=val_s1,
        sentences2=val_s2,
        scores=val_scores,
        name="obe-val",
        show_progress_bar=False
    )
    logger.info(f"Configured EmbeddingSimilarityEvaluator with {len(val_s1)} validation pairs.")

    # 6. Initialize Base SentenceTransformer
    base_model_name = "sentence-transformers/all-MiniLM-L6-v2"
    logger.info(f"Initializing base model: {base_model_name} on device: {device}")
    model = SentenceTransformer(base_model_name, device=device)

    # 7. Training Configuration
    batch_size = 16
    epochs = 4
    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=batch_size)
    train_loss = MultipleNegativesRankingLoss(model)

    total_steps = len(train_dataloader) * epochs
    warmup_steps = int(total_steps * 0.1)
    evaluation_steps = 60

    logger.info(f"Training parameters: Batch Size = {batch_size}, Epochs = {epochs}")
    logger.info(f"Total Steps = {total_steps}, Warmup Steps = {warmup_steps}, Eval Steps = {evaluation_steps}")
    logger.info(f"Target Output Directory: {OUTPUT_MODEL_DIR}")
    os.makedirs(OUTPUT_MODEL_DIR, exist_ok=True)

    # 8. Run Model Training
    logger.info("Beginning fine-tuning with MultipleNegativesRankingLoss...")
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        evaluator=evaluator,
        epochs=epochs,
        warmup_steps=warmup_steps,
        evaluation_steps=evaluation_steps,
        output_path=OUTPUT_MODEL_DIR,
        save_best_model=True,
        show_progress_bar=True
    )

    # Ensure model artifacts are explicitly persisted in output path
    model.save(OUTPUT_MODEL_DIR)
    logger.info(f"✓ Model successfully saved to: {OUTPUT_MODEL_DIR}")

    # Verify output files
    saved_files = os.listdir(OUTPUT_MODEL_DIR)
    logger.info(f"Saved artifacts: {saved_files}")
    has_weights = any(f in saved_files for f in ["model.safetensors", "pytorch_model.bin"])
    if has_weights:
        logger.info("✓ Model weight verification PASSED (safetensors/bin present).")
    else:
        logger.warning("⚠ Warning: Standard model weight file not explicitly detected in directory listing.")

    logger.info("=" * 65)
    logger.info("Fine-Tuning Pipeline Completed Successfully!")
    logger.info("=" * 65)


if __name__ == "__main__":
    train_pipeline()
