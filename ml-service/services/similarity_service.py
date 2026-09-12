import re
import logging
from typing import List
import numpy as np
from core.hf_client import compute_sentence_similarity_sync
from schemas.nlp_schemas import (
    ArchivedPaper,
    MatchedQuestion,
    PaperComparisonResult,
    SimilarityCheckResponse
)

logger = logging.getLogger("ml-service.similarity_service")

HEADER_KEYWORDS = [
    "department of", "university", "faculty of", "semester final",
    "mid term", "midterm", "full marks", "time:", "course code",
    "course title", "answer any", "figures in the right", "candidates are required",
    "section:", "credit:", "session:"
]

VERB_INDICATORS = [
    "explain", "what", "how", "write", "derive", "calculate",
    "solve", "design", "define", "discuss", "differentiate", "compare"
]


def extract_questions_from_paper(paper_text: str) -> List[str]:
    """
    Sanitizes exam paper text and partitions it into discrete questions using
    regex pattern matching for question numbers, sub-parts, and academic demarcations.
    """
    if not paper_text or not paper_text.strip():
        return []

    # Strip HTML formatting
    cleaned = re.sub(r"<[^>]+>", "\n", paper_text)

    # Strip OBE tags and mark brackets
    cleaned = re.sub(r"\[(?:CO\d+)?(?:[-\s>→]*C[1-6])?\]", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\[\d+(?:\s*(?:marks?|pts?))?\]", " ", cleaned, flags=re.IGNORECASE)

    # Split on question indicators e.g., Question 1, Q1, 1., 1(a), (a), a., OR
    split_pattern = r"(?=(?:^|\n)\s*(?:Question\s*\d+|Q\d+[:.]?|\b\d{1,2}\s*[.):]|\([a-d]\)|[a-d]\s*[.):]|\bOR\b))"
    raw_chunks = re.split(split_pattern, cleaned, flags=re.IGNORECASE)

    questions = []
    for chunk in raw_chunks:
        trimmed = re.sub(r"\s+", " ", chunk).strip()
        if len(trimmed) < 20:
            continue

        lower = trimmed.lower()
        # Discard exam paper headers or instruction banners
        if any(h in lower for h in HEADER_KEYWORDS) and not any(v in lower for v in VERB_INDICATORS):
            continue

        questions.append(trimmed)

    # Fallback: line-by-line extraction if structured regex yielded nothing
    if not questions:
        lines = [re.sub(r"\s+", " ", line).strip() for line in cleaned.split("\n")]
        questions = [
            line for line in lines
            if len(line) >= 25 and not (any(h in line.lower() for h in HEADER_KEYWORDS) and not any(v in line.lower() for v in VERB_INDICATORS))
        ]

    return questions


def compute_paper_similarity(current_paper_text: str, archived_papers: List[ArchivedPaper]) -> SimilarityCheckResponse:
    """
    Computes semantic similarity between current paper and each archived paper
    using Sentence-BERT embeddings.
    """
    if not current_paper_text or not current_paper_text.strip():
        return SimilarityCheckResponse(
            success=False,
            maxSimilarity=0,
            totalArchivesCompared=0,
            results=[],
            message="No current paper text provided."
        )

    if not archived_papers:
        return SimilarityCheckResponse(
            success=True,
            maxSimilarity=0,
            totalArchivesCompared=0,
            results=[],
            message="No archived papers to compare against."
        )

    current_questions = extract_questions_from_paper(current_paper_text)
    if not current_questions:
        current_questions = [current_paper_text[:500]]

    try:
        results: List[PaperComparisonResult] = []

        for idx, archive in enumerate(archived_papers):
            archive_text = archive.text or ""
            archived_questions = extract_questions_from_paper(archive_text)

            if not archived_questions:
                results.append(
                    PaperComparisonResult(
                        archiveId=archive.id if archive.id is not None else f"archive-{idx}",
                        assessmentName=archive.assessmentName or "Unknown",
                        semester=archive.semester or "",
                        section=archive.section or "",
                        batch=archive.batch or "",
                        isCurrentSemester=bool(archive.isCurrentSemester),
                        overallSimilarity=0,
                        verdict="Original",
                        matchedQuestions=[],
                        summary="No questions could be extracted from this archived paper."
                    )
                )
                continue

            matched_questions: List[MatchedQuestion] = []
            similarity_scores: List[int] = []

            for q_idx, q_curr in enumerate(current_questions):
                row = compute_sentence_similarity_sync(
                    source_sentence=q_curr,
                    sentences=archived_questions
                )
                if not row:
                    continue
                best_idx = int(np.argmax(row))
                best_val = float(row[best_idx])
                pct = int(round(max(0.0, min(1.0, best_val)) * 100))
                similarity_scores.append(pct)

                # Overlap threshold (55% or higher)
                if pct >= 55:
                    q_arch = archived_questions[best_idx]
                    matched_questions.append(
                        MatchedQuestion(
                            currentQ=q_curr[:250],
                            archivedQ=q_arch[:250],
                            similarity=pct,
                            explanation=f"High semantic overlap ({pct}%) detected with question #{best_idx + 1} of archived paper."
                        )
                    )

            # Calculate overall similarity
            if matched_questions:
                avg_match = float(np.mean([m.similarity for m in matched_questions]))
                coverage_ratio = len(matched_questions) / max(1, len(current_questions))
                # Balanced score combining matched intensity and breadth
                overall_score = int(round((avg_match * 0.70) + (coverage_ratio * avg_match * 0.30)))
                overall_similarity = min(100, max(0, overall_score))
            else:
                top_score = max(similarity_scores) if similarity_scores else 0
                overall_similarity = int(round(top_score * 0.5)) if top_score >= 40 else 0

            # Determine verdict matching server/routes/aiRoutes.js
            if overall_similarity > 75:
                verdict = "Heavily Reused"
            elif overall_similarity > 55:
                verdict = "High Overlap"
            elif overall_similarity > 30:
                verdict = "Moderate Overlap"
            elif overall_similarity > 10:
                verdict = "Low Overlap"
            else:
                verdict = "Original"

            summary = (
                f"Detected {len(matched_questions)} matched question topic(s) with {overall_similarity}% overall similarity."
                if matched_questions
                else "No significant content overlap found."
            )

            results.append(
                PaperComparisonResult(
                    archiveId=archive.id if archive.id is not None else f"archive-{idx}",
                    assessmentName=archive.assessmentName or "Unknown",
                    semester=archive.semester or "",
                    section=archive.section or "",
                    batch=archive.batch or "",
                    isCurrentSemester=bool(archive.isCurrentSemester),
                    overallSimilarity=overall_similarity,
                    verdict=verdict,
                    matchedQuestions=matched_questions,
                    summary=summary
                )
            )

        results.sort(key=lambda r: r.overallSimilarity, reverse=True)
        max_similarity = max((r.overallSimilarity for r in results), default=0)

        return SimilarityCheckResponse(
            success=True,
            maxSimilarity=max_similarity,
            totalArchivesCompared=len(archived_papers),
            results=results
        )

    except Exception as err:
        logger.error(f"Error computing paper similarity: {err}", exc_info=True)
        return SimilarityCheckResponse(
            success=False,
            maxSimilarity=0,
            totalArchivesCompared=len(archived_papers),
            results=[],
            message=f"Similarity Check Error: {str(err)}"
        )
