from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, AliasChoices


# ---------------------------------------------------------------------------
# Metadata Suggestion Schemas (Bloom's Taxonomy & Course Outcome Mapping)
# ---------------------------------------------------------------------------
class CourseOutcomeItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: Optional[Union[str, int]] = Field(None, description="Optional CO identifier")
    code: str = Field(
        ...,
        validation_alias=AliasChoices("code", "id", "coCode"),
        description="Outcome identifier, e.g. 'CO1', 'CO2'"
    )
    description: str = Field(
        ...,
        validation_alias=AliasChoices("description", "desc", "coDescription"),
        description="Descriptive text of the course outcome"
    )


class SuggestMetadataRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    questionText: str = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("questionText", "question_text"),
        description="Raw or formatted question text"
    )
    courseOutcomes: List[CourseOutcomeItem] = Field(
        default=[],
        validation_alias=AliasChoices("courseOutcomes", "course_outcomes"),
        description="List of available course outcomes for the course"
    )


class BloomRankingItem(BaseModel):
    level: str = Field(..., description="Bloom code e.g. 'C1' to 'C6'")
    name: str = Field(..., description="Taxonomy name e.g. 'Remember', 'Understand'")
    score: float = Field(..., description="Confidence probability (0.0 to 1.0)")


class BloomResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    suggested: str = Field(..., description="Top suggested Bloom level code (e.g. 'C2')")
    confidence: float = Field(..., description="Top confidence score")
    level: Optional[str] = Field(None, description="Same as suggested code e.g. 'C2'")
    name: Optional[str] = Field(None, description="Level name e.g. 'Understand'")
    description: Optional[str] = Field(None, description="Concise pedagogical summary of the Bloom level")
    rankings: Optional[List[BloomRankingItem]] = Field(
        default=[],
        description="All Bloom levels ranked by classification confidence"
    )


class CORankingItem(BaseModel):
    code: str = Field(..., description="Course outcome code, e.g. 'CO1'")
    score: float = Field(..., description="Cosine similarity score (0.0 to 1.0)")
    description: Optional[str] = Field(None, description="Course outcome description")


class COResult(BaseModel):
    suggested: str = Field(..., description="Best matching CO code (e.g. 'CO1')")
    confidence: float = Field(..., description="Highest cosine similarity score")
    rankings: List[CORankingItem] = Field(
        default=[],
        description="All evaluated COs ranked by cosine similarity"
    )


class SuggestMetadataResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    success: bool = True
    suggestedBloom: str = Field(..., description="Top Bloom cognitive level e.g. 'C3'")
    bloomConfidence: int = Field(..., description="Calibrated Bloom confidence integer percentage (e.g. 78)")
    suggestedCO: str = Field(..., description="Best-matching Course Outcome code (e.g. 'CO2')")
    coMatchPercentage: int = Field(..., description="Calibrated CO match percentage integer (e.g. 81)")
    bloomDescription: str = Field(..., description="Concise pedagogical summary of the Bloom level")
    sanitizedQuestion: Optional[str] = Field(None, description="Cleaned and sanitized question text")
    bloom: Optional[BloomResult] = None
    co: Optional[COResult] = None
    message: Optional[str] = None


# ---------------------------------------------------------------------------
# Paper Similarity Schemas (Directly mirroring server/routes/aiRoutes.js)
# ---------------------------------------------------------------------------
class ArchivedPaper(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: Optional[Union[str, int]] = Field(None, description="Archive document identifier")
    assessmentName: Optional[str] = Field("", validation_alias=AliasChoices("assessmentName", "assessment_name"), description="Exam assessment name e.g. Midterm")
    semester: Optional[str] = Field("", description="Semester name e.g. Spring 2025")
    section: Optional[str] = Field("", description="Course section")
    batch: Optional[str] = Field("", description="Batch number")
    isCurrentSemester: Optional[bool] = Field(False, validation_alias=AliasChoices("isCurrentSemester", "is_current_semester"), description="Flag if paper is from current semester")
    text: Optional[str] = Field("", description="Full text or content of the archived question paper")


class SimilarityCheckRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    currentPaperText: str = Field(..., validation_alias=AliasChoices("currentPaperText", "current_paper_text"), description="Text of the current question paper under evaluation")
    archivedPapers: List[ArchivedPaper] = Field(
        default=[],
        validation_alias=AliasChoices("archivedPapers", "archived_papers"),
        description="List of archived question papers to compare against"
    )


class MatchedQuestion(BaseModel):
    currentQ: str = Field(..., description="Question snippet from current paper")
    archivedQ: str = Field(..., description="Question snippet from archived paper")
    similarity: int = Field(..., description="Question-level similarity percentage (0-100)")
    explanation: str = Field(..., description="Brief explanation or citation of semantic overlap")


class PaperComparisonResult(BaseModel):
    archiveId: Optional[Union[str, int]] = Field(None, description="Archive document identifier")
    assessmentName: str = Field("Unknown", description="Assessment title")
    semester: str = Field("", description="Semester")
    section: str = Field("", description="Section")
    batch: str = Field("", description="Batch")
    isCurrentSemester: bool = Field(False, description="Is current semester flag")
    overallSimilarity: int = Field(0, description="Overall paper overlap percentage (0-100)")
    verdict: str = Field("Original", description="Original | Low Overlap | Moderate Overlap | High Overlap | Heavily Reused")
    matchedQuestions: List[MatchedQuestion] = Field(default=[], description="List of individual question matches")
    summary: str = Field("", description="Executive summary of the comparison")


class SimilarityCheckResponse(BaseModel):
    success: bool = True
    maxSimilarity: int = Field(0, description="Maximum similarity across all compared archives")
    totalArchivesCompared: int = Field(0, description="Count of archived papers compared")
    results: List[PaperComparisonResult] = Field(default=[], description="Sorted comparison results")
    message: Optional[str] = None


# ---------------------------------------------------------------------------
# Health Check Schema
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str = "online"
    device: str
    cuda_available: bool
    gpu_name: Optional[str] = None
    models: Dict[str, bool]
