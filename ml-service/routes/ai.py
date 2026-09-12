import logging
from fastapi import APIRouter, HTTPException
from schemas.nlp_schemas import SuggestMetadataRequest, SuggestMetadataResponse
from services.metadata_service import suggest_metadata_pipeline

logger = logging.getLogger("ml-service.routes.ai")

router = APIRouter(tags=["AI Metadata"])


@router.post("/suggest-metadata", response_model=SuggestMetadataResponse)
@router.post("/api/ai/suggest-metadata", response_model=SuggestMetadataResponse)
def suggest_metadata_ai_endpoint(payload: SuggestMetadataRequest):
    """
    Direct Live Production Endpoint for Bloom's Taxonomy Cognitive Level and Course Outcome (CO)
    metadata suggestions.
    
    Consumes:
    - Text Sanitization & Preprocessing (removes OCR artifacts, numbering tags, code boilerplate)
    - Production Hybrid Bloom Classifier (75-100% benchmark verified ML Zero-Shot + Action Verbs)
    - Dynamic 6-Class Bloom Confidence Normalization
    - Course Outcome SBERT Temperature Softmax Scaling (T = 0.10)
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
        logger.error(f"Error in suggest-metadata endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Metadata suggestion failed: {str(e)}")
