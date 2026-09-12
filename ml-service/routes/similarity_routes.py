import logging
from fastapi import APIRouter, HTTPException
from schemas.nlp_schemas import SimilarityCheckRequest, SimilarityCheckResponse
from services.similarity_service import compute_paper_similarity

logger = logging.getLogger("ml-service.routes.similarity")

router = APIRouter(prefix="", tags=["Paper Similarity"])


@router.post("/similarity-check", response_model=SimilarityCheckResponse)
def similarity_check_endpoint(payload: SimilarityCheckRequest):
    """
    Compares the current exam question paper against a list of archived papers
    using Sentence-BERT semantic embeddings and Cosine Similarity matrices.
    Direct drop-in replacement for the Gemini API call in server/routes/aiRoutes.js.
    """
    if not payload.currentPaperText or not payload.currentPaperText.strip():
        raise HTTPException(status_code=400, detail="No current paper text provided.")

    try:
        response = compute_paper_similarity(payload.currentPaperText, payload.archivedPapers)
        return response
    except Exception as e:
        logger.error(f"Error in /similarity-check: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Similarity check failed: {str(e)}")
