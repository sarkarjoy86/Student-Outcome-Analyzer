import logging
from fastapi import APIRouter, HTTPException
from schemas.nlp_schemas import SuggestMetadataRequest, SuggestMetadataResponse
from services.metadata_service import suggest_metadata_pipeline

logger = logging.getLogger("ml-service.routes.metadata")

router = APIRouter(prefix="", tags=["Metadata Suggestion"])


@router.post("/suggest-metadata", response_model=SuggestMetadataResponse)
@router.post("/api/ai/suggest-metadata", response_model=SuggestMetadataResponse)
def suggest_metadata_endpoint(payload: SuggestMetadataRequest):
    """
    Suggests Bloom's Taxonomy Cognitive Level (C1 to C6) and best-matching Course Outcome (CO)
    for a university exam question using Production Hybrid ML + Dynamic Calibration.
    """
    if not payload.questionText or not payload.questionText.strip():
        raise HTTPException(status_code=400, detail="Question text cannot be empty.")

    try:
        result_dict = suggest_metadata_pipeline(
            question_text=payload.questionText,
            course_outcomes=payload.courseOutcomes
        )
        return SuggestMetadataResponse(**result_dict)
    except Exception as e:
        logger.error(f"Error in /suggest-metadata: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Metadata suggestion failed: {str(e)}")
