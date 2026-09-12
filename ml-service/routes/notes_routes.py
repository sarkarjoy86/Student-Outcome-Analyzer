"""
Teacher's Reference Notes — FastAPI Route Handlers
====================================================
Prefix: /api/notes

Endpoints:
  POST   /upload           — Upload & index a teacher notes file
  POST   /suggest          — Semantic question suggestion from indexed notes
  GET    /status/{courseId} — Check indexing status for a course
  DELETE /{courseId}        — Clear indexed notes for a course
"""

import logging
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from typing import Optional, Union

from services.notes_service import extract_text_from_file, notes_manager

logger = logging.getLogger("ml-service.notes_routes")

router = APIRouter(prefix="/api/notes", tags=["Teacher Notes"])

# Allowed file extensions
_ALLOWED_EXTENSIONS = {"docx", "pdf", "pptx", "txt"}

class SuggestRequest(BaseModel):
    courseId: Optional[str] = None
    course_id: Optional[str] = None
    queryText: Optional[str] = None
    query_text: Optional[str] = None
    topK: Optional[Union[int, str]] = 4
    top_k: Optional[Union[int, str]] = 4


# ---------------------------------------------------------------------------
# 1. POST /api/notes/upload
# ---------------------------------------------------------------------------

@router.post("/upload")
async def upload_notes(
    file: UploadFile = File(...),
    courseId: str = Form(...)
):
    """
    Upload a teacher's reference notes file (.docx, .pdf, .pptx, .txt)
    and index its contents for semantic question suggestion.
    """
    # Validate file extension
    filename = file.filename or "unknown"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed: {', '.join('.' + e for e in sorted(_ALLOWED_EXTENSIONS))}"
        )

    try:
        # Read file bytes
        file_bytes = await file.read()

        # Persist raw document file for interactive previewing
        try:
            notes_manager.save_document_file(courseId, filename, file_bytes)
        except Exception as save_err:
            logger.warning(f"Could not persist raw document file: {save_err}")

        # Extract text from the uploaded file
        raw_text = extract_text_from_file(file_bytes, filename)

        if not raw_text or not raw_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract any text from the uploaded file. The file may be empty or corrupted."
            )

        # Index the notes
        result = notes_manager.index_notes(courseId, filename, raw_text)

        return {
            "success": True,
            "courseId": courseId,
            "fileName": filename,
            "totalChunks": result["totalChunks"],
            "message": f"Successfully indexed {result['totalChunks']} questions from {filename}"
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error processing notes upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error while processing file: {str(e)}"
        )


# ---------------------------------------------------------------------------
# 2. POST /api/notes/suggest
# ---------------------------------------------------------------------------

@router.post("/suggest")
async def suggest_from_notes(request: SuggestRequest):
    """
    Suggest semantically similar questions from the teacher's indexed notes
    based on the provided query text.
    """
    cid = (request.courseId or request.course_id or "").strip()
    q = (request.queryText or request.query_text or "").strip()
    try:
        k = int(request.topK or request.top_k or 20)
    except (ValueError, TypeError):
        k = 20

    if not cid or not q:
        return {
            "success": True,
            "suggestions": []
        }

    try:
        suggestions = notes_manager.suggest_questions(
            course_id=cid,
            query_text=q,
            top_k=k
        )

        return {
            "success": True,
            "suggestions": suggestions
        }

    except Exception as e:
        logger.error(f"Error generating suggestions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal error during suggestion: {str(e)}"
        )


# ---------------------------------------------------------------------------
# 3. GET /api/notes/status/{courseId}
# ---------------------------------------------------------------------------

@router.get("/status/{courseId}")
async def get_notes_status(courseId: str):
    """
    Returns the indexing status for a course, including sample chunks.
    """
    status = notes_manager.get_notes_status(courseId)
    return {
        "success": True,
        **status
    }


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# 4. DELETE /api/notes/{courseId}
# ---------------------------------------------------------------------------

@router.delete("/{courseId}")
async def delete_notes(courseId: str, fileName: Optional[str] = None):
    """
    Clears indexed notes for the specified course.
    If fileName is provided, removes only that specific document.
    """
    if fileName:
        removed = notes_manager.remove_file(courseId, fileName)
        return {
            "success": True,
            "cleared": removed,
            "fileName": fileName,
            "message": f"Document '{fileName}' has been removed from course '{courseId}'." if removed
                       else f"Document '{fileName}' was not found in course '{courseId}'."
        }

    removed = notes_manager.clear_notes(courseId)
    return {
        "success": True,
        "cleared": removed,
        "message": f"All notes for course '{courseId}' have been cleared." if removed
                   else f"No notes found for course '{courseId}'."
    }


# ---------------------------------------------------------------------------
# 5. GET /api/notes/file/{courseId}/{fileName}
# ---------------------------------------------------------------------------

@router.get("/file/{courseId}/{fileName}")
async def get_document_file(courseId: str, fileName: str):
    """
    Returns the raw original document file (.docx, .pdf, .txt, .pptx)
    for in-browser preview rendering.
    """
    doc_path = notes_manager.get_document_file_path(courseId, fileName)
    ext = fileName.rsplit(".", 1)[-1].lower() if "." in fileName else ""
    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "txt": "text/plain; charset=utf-8",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    if doc_path and doc_path.exists():
        return FileResponse(
            path=str(doc_path),
            media_type=media_type,
            filename=fileName,
            content_disposition_type="inline",
            headers={
                "Content-Disposition": f'inline; filename="{fileName}"',
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=3600"
            }
        )

    # Fallback if raw file not stored yet (e.g. legacy index before binary storage)
    # Return formatted text representation so viewer renders nicely
    status = notes_manager.get_notes_status(courseId)
    matching_file = next((f for f in status.get("files", []) if f.get("fileName", "").strip().lower() == fileName.strip().lower()), None)

    if matching_file and matching_file.get("sampleChunks"):
        text_content = f"=== {fileName} ===\n\n" + "\n\n".join(matching_file["sampleChunks"])
        return Response(
            content=text_content.encode("utf-8"),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'inline; filename="{fileName}.txt"'}
        )

    raise HTTPException(status_code=404, detail=f"Document '{fileName}' not found.")


# ---------------------------------------------------------------------------
# 6. GET /api/notes/slides/{courseId}/{fileName}
# ---------------------------------------------------------------------------

@router.get("/slides/{courseId}/{fileName}")
async def get_presentation_slides(courseId: str, fileName: str):
    """
    Extracts structured slide-by-slide data from a PPTX file for in-browser presentation preview.
    """
    ext = fileName.rsplit(".", 1)[-1].lower() if "." in fileName else ""
    if ext not in ["pptx", "ppt"]:
        raise HTTPException(status_code=400, detail="Slides extraction only supported for .pptx files.")

    slides_data = notes_manager.get_pptx_slides(courseId, fileName)
    return {
        "success": True,
        "fileName": fileName,
        "totalSlides": len(slides_data),
        "slides": slides_data
    }
