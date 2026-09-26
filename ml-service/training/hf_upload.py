"""
hf_upload.py
============
Pushes the fine-tuned sbert-obe-csematch model to Hugging Face Hub.
Run from ml-service/ directory with the active venv.
"""

import os
import sys
from huggingface_hub import HfApi

REPO_ID     = "obe-ai-system/sbert-obe-csematch"
FOLDER_PATH = r"d:\Codes With Joy\Capstone Project Main Folder\Capstone Project Updated x22\ml-service\models\sbert-obe-csematch"
COMMIT_MSG  = (
    "Continual Learning v3.0 | OBE_Augmented_Dataset 7,009 rows | "
    "Top-1: 54.6%→82.4% (+50.9%) | Top-3: 95.4% | Macro F1: 79.6% (+66.1%) | "
    "Cosine Margin: 0.089→0.214 (+139.6%) | 4 epochs MNR AdamW lr=2e-5 warmup=80"
)

print("=" * 70)
print("  OBE AI SYSTEM — Hugging Face Model Upload")
print("=" * 70)

# ── Token Resolution ───────────────────────────────────────────────────────
token = os.getenv("HF_TOKEN")
if not token:
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.strip().startswith("HF_TOKEN="):
                    token = line.strip().split("=", 1)[1].strip()
                    break

if not token:
    # Try reading from the cached huggingface-cli login
    token_path = os.path.join(os.path.expanduser("~"), ".cache", "huggingface", "token")
    if os.path.exists(token_path):
        with open(token_path) as f:
            token = f.read().strip()

if not token:
    print("\n[ERROR] No Hugging Face token found!")
    print("  Please provide HF_TOKEN in ml-service/.env or via environment variable.")
    sys.exit(1)

print(f"  Token          : {token[:8]}...{token[-4:]}")
print(f"  Target repo    : https://huggingface.co/{REPO_ID}")
print(f"  Source folder  : {FOLDER_PATH}")
print(f"  Commit message : {COMMIT_MSG[:70]}...")

# ── Upload ─────────────────────────────────────────────────────────────────
try:
    api = HfApi(token=token)

    # Ensure repo exists (create if not)
    try:
        api.repo_info(repo_id=REPO_ID, repo_type="model")
        print(f"\n  Repo found     : {REPO_ID} — uploading updated artifacts...")
    except Exception:
        print(f"\n  Repo not found — creating: {REPO_ID}")
        api.create_repo(repo_id=REPO_ID, repo_type="model", private=False, exist_ok=True)
        print(f"  Repo created   : https://huggingface.co/{REPO_ID}")

    print("\n  Uploading files (this may take 1-2 min for model.safetensors ~87 MB)...")
    commit_info = api.upload_folder(
        folder_path=FOLDER_PATH,
        repo_id=REPO_ID,
        repo_type="model",
        commit_message=COMMIT_MSG,
        ignore_patterns=["*.pyc", "__pycache__", "eval/*"],
    )

    print("\n" + "=" * 70)
    print("  SUCCESS: Model published to Hugging Face Hub!")
    print("=" * 70)
    print(f"  Repo URL       : https://huggingface.co/{REPO_ID}")
    if hasattr(commit_info, 'commit_url') and commit_info.commit_url:
        print(f"  Commit URL     : {commit_info.commit_url}")
    print()
    print("  Verify inference at:")
    print(f"    https://huggingface.co/{REPO_ID}")
    print()
    print("  Load in Python:")
    print(f"    from sentence_transformers import SentenceTransformer")
    print(f"    model = SentenceTransformer('{REPO_ID}')")

except Exception as e:
    print(f"\n[UPLOAD ERROR] {type(e).__name__}: {e}")
    if "401" in str(e) or "unauthorized" in str(e).lower():
        print("\n  Authentication failed. Ensure your token has WRITE access.")
        print("  Re-login: huggingface-cli login")
    elif "403" in str(e) or "forbidden" in str(e).lower():
        print("\n  Permission denied. Ensure you are a member/admin of 'obe-ai-system' org.")
    elif "404" in str(e):
        print("\n  Repo or org not found. Check the repo_id and org membership.")
    sys.exit(1)
