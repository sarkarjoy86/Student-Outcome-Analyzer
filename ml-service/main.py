import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure current directory is on python path for clean relative/package imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import settings, logger
from core.models import model_manager
from schemas.nlp_schemas import HealthResponse
from routes.metadata_routes import router as metadata_router
from routes.similarity_routes import router as similarity_router
from routes.ai import router as ai_router
from routes.notes_routes import router as notes_router


# ---------------------------------------------------------------------------
# Lifespan Management: Preload NLP Models on Server Startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle event handler for FastAPI. Preloads singleton NLP models into VRAM/RAM
    prior to accepting HTTP requests.
    """
    logger.info(f"Initializing {settings.APP_NAME} v{settings.APP_VERSION}...")
    logger.info(f"Active Compute Device: {settings.DEVICE.upper()} (GPU: {settings.GPU_NAME or 'None'})")
    
    # Preload models in background/startup
    try:
        model_manager.preload_all()
    except Exception as e:
        logger.warning(f"Initial model preload encountered an issue (models will load on first request): {e}")

    yield

    logger.info(f"Shutting down {settings.APP_NAME} cleanly.")


# ---------------------------------------------------------------------------
# FastAPI Application Initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Local NLP Microservice for Outcome-Based Education (OBE) Question Papers. "
        "Provides Bloom's taxonomy classification, Course Outcome mapping, and exam similarity analysis."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# ---------------------------------------------------------------------------
# Cross-Origin Resource Sharing (CORS)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Register API Routers
# ---------------------------------------------------------------------------
app.include_router(metadata_router)
app.include_router(similarity_router)
app.include_router(ai_router)
app.include_router(notes_router)



# ---------------------------------------------------------------------------
# Health & Status Endpoints
# ---------------------------------------------------------------------------
@app.get("/", response_model=HealthResponse, tags=["System Health"])
@app.get("/health", response_model=HealthResponse, tags=["System Health"])
def health_check():
    """
    Returns system status, active compute device, CUDA availability, and model load status.
    """
    return HealthResponse(
        status="online",
        device=settings.DEVICE,
        cuda_available=settings.CUDA_AVAILABLE,
        gpu_name=settings.GPU_NAME,
        models=model_manager.get_status()
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
