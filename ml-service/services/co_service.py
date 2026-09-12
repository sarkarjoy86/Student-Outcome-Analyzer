import logging
import numpy as np
from typing import List
from core.hf_client import compute_sentence_similarity_sync
from schemas.nlp_schemas import CourseOutcomeItem, COResult, CORankingItem
from services.bloom_service import sanitize_question_text

logger = logging.getLogger("ml-service.co_service")


def map_course_outcomes(question_text: str, course_outcomes: List[CourseOutcomeItem]) -> COResult:
    """
    Computes Cosine Similarity between the normalized embedding of the question text
    and each Course Outcome description using Hugging Face Serverless Inference.
    Identifies the best matching CO code and full ranking list.
    """
    clean_q = sanitize_question_text(question_text)
    if not clean_q or not course_outcomes:
        return COResult(suggested="", confidence=0.0, rankings=[])

    try:
        # Contextualize CO texts (Code + Description) for semantic alignment
        co_texts = [
            f"{co.code}: {co.description}".strip() if co.description else co.code
            for co in course_outcomes
        ]

        # Compute similarities remotely via Hugging Face Serverless Inference
        similarities = compute_sentence_similarity_sync(
            source_sentence=clean_q,
            sentences=co_texts
        )

        rankings: List[CORankingItem] = []
        for co_item, sim in zip(course_outcomes, similarities):
            # Bound cosine similarity in [0.0, 1.0]
            normalized_score = max(0.0, min(1.0, float(sim)))
            rankings.append(
                CORankingItem(
                    code=co_item.code,
                    score=round(normalized_score, 4),
                    description=co_item.description
                )
            )

        # Sort descending by similarity score
        rankings.sort(key=lambda r: r.score, reverse=True)

        top_co = rankings[0] if rankings else None
        suggested_code = top_co.code if top_co else ""
        confidence = top_co.score if top_co else 0.0

        return COResult(
            suggested=suggested_code,
            confidence=confidence,
            rankings=rankings
        )

    except Exception as err:
        logger.error(f"Error occurred during CO mapping: {err}")
        # Fallback ranking if encoder is unavailable
        fallback_rankings = [
            CORankingItem(code=co.code, score=0.50 if idx == 0 else 0.20, description=co.description)
            for idx, co in enumerate(course_outcomes)
        ]
        return COResult(
            suggested=course_outcomes[0].code if course_outcomes else "",
            confidence=0.50 if course_outcomes else 0.0,
            rankings=fallback_rankings
        )
