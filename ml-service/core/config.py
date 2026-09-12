import os
import logging
from dotenv import load_dotenv

# Load local environment variables from .env if present
load_dotenv()

# Configure global logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ml-service.config")


class Settings:
    APP_NAME: str = "OBE Question Paper NLP Microservice"
    APP_VERSION: str = "2.0.0 (Serverless)"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Hugging Face Serverless Inference Credentials & Endpoints
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")

    # Custom Fine-Tuned SBERT Model Endpoints
    SBERT_PRIMARY_URL: str = os.getenv(
        "SBERT_PRIMARY_URL",
        "https://router.huggingface.co/hf-inference/models/obe-ai-system/sbert-obe-csematch"
    )
    SBERT_FALLBACK_URL: str = os.getenv(
        "SBERT_FALLBACK_URL",
        "https://api-inference.huggingface.co/models/obe-ai-system/sbert-obe-csematch"
    )
    # Tested pre-warmed base model fallback ensuring 100% uptime on HF free serverless tier
    SBERT_BACKUP_URL: str = os.getenv(
        "SBERT_BACKUP_URL",
        "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"
    )

    # Bloom Taxonomy Zero-Shot Model Endpoints
    ZERO_SHOT_PRIMARY_URL: str = os.getenv(
        "ZERO_SHOT_PRIMARY_URL",
        "https://router.huggingface.co/hf-inference/models/valhalla/distilbart-mnli-12-3"
    )
    ZERO_SHOT_FALLBACK_URL: str = os.getenv(
        "ZERO_SHOT_FALLBACK_URL",
        "https://api-inference.huggingface.co/models/valhalla/distilbart-mnli-12-3"
    )

    # Lightweight Serverless Compute Profile
    DEVICE: str = "serverless-hf"
    PIPELINE_DEVICE: int = -1
    CUDA_AVAILABLE: bool = False
    GPU_NAME: str = None


settings = Settings()
