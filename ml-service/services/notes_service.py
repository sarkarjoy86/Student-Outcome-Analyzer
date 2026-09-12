"""
Teacher's Reference Notes — Core Service Module
=================================================
Provides:
  1. Multi-format text extraction  (.docx, .pdf, .pptx, .txt)
  2. Pedagogical question chunking  (numbered items, slides, double-newline splits)
  3. In-memory SBERT vector store   (NotesIndexManager singleton)
"""

import io
import re
import logging
import numpy as np
from pathlib import Path
import pickle
from typing import List, Dict, Any, Optional

from core.hf_client import compute_sentence_similarity_sync
from services.bloom_service import sanitize_question_text

logger = logging.getLogger("ml-service.notes_service")


# ---------------------------------------------------------------------------
# 1. MULTI-FORMAT TEXT EXTRACTOR
# ---------------------------------------------------------------------------

def table_to_markdown(table) -> str:
    """
    Converts a python-docx Table object into a clean Markdown table string.
    First row is treated as headers with a separator row below it.
    """
    rows = []
    for row in table.rows:
        cells = [cell.text.strip().replace('|', '\\|') for cell in row.cells]
        rows.append('| ' + ' | '.join(cells) + ' |')
    if not rows:
        return ''
    # Insert header separator after first row
    if len(rows) >= 1:
        num_cols = len(table.rows[0].cells)
        header_sep = '| ' + ' | '.join(['---'] * num_cols) + ' |'
        rows.insert(1, header_sep)
    return '\n'.join(rows)


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """
    Extracts plain text from a binary file buffer based on its extension.

    Supported formats:
      .docx  — paragraph text + table text (in-order)  (python-docx)
      .pdf   — page-by-page text                       (pypdf)
      .pptx  — slide shapes + tables                    (python-pptx)
      .txt   — UTF-8 decode with latin-1 fallback

    Raises:
      ValueError: If the file extension is not supported.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # ── DOCX ────────────────────────────────────────────────────────────
    if ext == "docx":
        import docx
        from docx import Document as DocxDocument
        from docx.oxml.ns import qn
        doc = DocxDocument(io.BytesIO(file_bytes))
        parts: List[str] = []

        # In-order iteration: paragraphs and tables in their true reading order
        for child in doc.element.body:
            if child.tag == qn('w:p'):
                para = docx.text.paragraph.Paragraph(child, doc)
                text = para.text.strip()
                if text:
                    parts.append(text)
            elif child.tag == qn('w:tbl'):
                tbl = docx.table.Table(child, doc)
                md_table = table_to_markdown(tbl)
                if md_table:
                    parts.append(md_table)

        return "\n".join(parts)

    # ── PDF ─────────────────────────────────────────────────────────────
    if ext == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        pages: List[str] = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                pages.append(page_text.strip())
        return "\n\n".join(pages)

    # ── PPTX ────────────────────────────────────────────────────────────
    if ext == "pptx":
        from pptx import Presentation
        prs = Presentation(io.BytesIO(file_bytes))
        parts_pptx: List[str] = []
        for slide in prs.slides:
            for shape in slide.shapes:
                # Text frames (titles, body, text boxes)
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        text = paragraph.text.strip()
                        if text:
                            parts_pptx.append(text)
                # Tables inside slides
                if shape.has_table:
                    for row in shape.table.rows:
                        for cell in row.cells:
                            cell_text = cell.text.strip()
                            if cell_text:
                                parts_pptx.append(cell_text)
        return "\n".join(parts_pptx)

    # ── TXT ─────────────────────────────────────────────────────────────
    if ext == "txt":
        try:
            return file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return file_bytes.decode("latin-1")

    # ── UNSUPPORTED ─────────────────────────────────────────────────────
    raise ValueError(
        "Unsupported file format. Please upload .docx, .pdf, .pptx, or .txt"
    )


# ---------------------------------------------------------------------------
# 2. SMART PEDAGOGICAL QUESTION CHUNKER & FILTER
# ---------------------------------------------------------------------------

# Regex: splits on numbered items, Q-tags, sub-numbering, lettered markers, or double-newlines
_SPLIT_PATTERN = re.compile(
    r'\n\s*(?='
    r'(?:Question|Que|Prob|Problem|Q)\s*(?:#|\.)?\s*\d+[:\.\s]'  # Q1:, Question 1., Q 1
    r'|\d+(?:\.\d+)*\s*[-—–]\s*(?:NEW|OLD|REVISED)\s*'           # 15 - NEW
    r'|\d+[\.\)]\s+'                                            # 1. or 1)
    r'|\d+\.\d+(?:\.\d+)?\s*'                                   # 1.1 or 1.1.1
    r'|\d+\s+[A-Z"\'“”`]'                                        # 12 What... bare number before letter/quote
    r'|\([a-zA-Z0-9]+\)\s+'                                     # (a) or (i)
    r'|[a-zA-Z][\.\)]\s+[A-Z]'                                  # a. What or b) Explain
    r')'
    r'|\n\s*\n',                                                 # double newline (paragraph break)
    re.IGNORECASE
)

# OBE / mapping tags to strip from chunk tails
_OBE_TAG_PATTERN = re.compile(
    r'[\u2192→]\s*CO\d+\s*[\u2192→]?\s*C\d+.*$'   # → CO1 → C4 ...
    r'|\[CO\d+\s*->\s*C\d+\]'                       # [CO2->C3]
    r'|\[\d+\s*marks?\]'                             # [5 marks]
    r'|\(\d+\s*marks?\)',                            # (5 marks)
    re.IGNORECASE
)


def strip_leading_question_number(text: str) -> str:
    """
    Strips bare leading numbers (e.g. '12 What...', '9 What...', '5 Why...'),
    question tags ('Q1:', 'Question 3:'), revision notes ('15 — NEW\\n'),
    subpart markers ('(a)', '1.b)'), and full outer quotes, leaving pure question text.
    """
    if not text or not isinstance(text, str):
        return ""
    s = text.strip()

    # Unwrap full outer quotes
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()

    # Strip leading bullets, dashes, asterisks
    s = re.sub(r'^[\s•\-\*]+', '', s)

    # Prefix pattern matching question numbering:
    prefix_pattern = re.compile(
        r'^(?:'
        r'(?:Question|Que|Prob|Problem|Q)\s*(?:#|\.)?\s*\d+(?:[\.\)\:\-]\s*|\s+)'
        r'|\d+(?:\.\d+)*\s*[-—–]\s*(?:NEW|OLD|REVISED)\s*[\n\r\s]*'
        r'|\d+(?:\.\d+)*\s*[\.\)\:\-]\s*'
        r'|\d+\s*[\n\r]+\s*'
        r'|\d+\s+'
        r'|\([a-zA-Z0-9]+\)\s*'
        r'|[a-zA-Z][\.\)\:\-]\s+'
        r'|\b(?:part|section)\s*[-–—:]?\s*[a-zA-Z0-9]+[\.\)\:\-]?\s*'
        r')+',
        re.IGNORECASE
    )

    prev = None
    while prev != s:
        prev = s
        s = prefix_pattern.sub('', s).strip()
        s = re.sub(r'^[\s•\-\:\.]+', '', s).strip()

    s = re.sub(r'[\t ]+', ' ', s).strip()

    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()

    return s


def is_valid_pedagogical_question(chunk: str) -> bool:
    """
    Intelligently determines whether a text chunk is an actual pedagogical / exam
    question, filtering out non-question content such as course headers, metadata,
    Bloom/CO taxonomy legends, instructor commentary, and section banner headers.

    Recognizes scenario-embedded chunks (prefixed with [Scenario: ...]) and chunks
    containing markdown table syntax as valid pedagogical content.
    """
    if not chunk or not isinstance(chunk, str):
        return False
    s = chunk.strip()
    if len(s) < 12:
        return False

    # Scenario-embedded chunks and table-containing chunks may be longer than
    # regular questions — allow up to 2500 chars for composite scenario blocks
    has_scenario_tag = s.startswith('[Scenario:')
    has_markdown_table = bool(re.search(r'^\|.+\|$', s, re.MULTILINE))
    max_len = 2500 if (has_scenario_tag or has_markdown_table) else 700
    if len(s) > max_len:
        return False

    # Scenario-tagged chunks are always valid (they were explicitly constructed)
    if has_scenario_tag:
        return True

    # Chunks containing embedded markdown tables are valid if they also have
    # question-like text around the table
    if has_markdown_table:
        # Extract non-table text to verify it has some pedagogical content
        non_table_text = re.sub(r'^\|.+\|$', '', s, flags=re.MULTILINE).strip()
        if len(non_table_text) >= 10:
            return True

    # 1. Negative Filters: Metadata, Course headers, Bloom taxonomy legends, instructor remarks
    if re.search(r'\b(?:course\s*(?:code|title|name)|credit\s*hours?|department\s*of|faculty\s*of|semester|midterm|final\s*exam|question\s*bank|curriculum|syllabus)\b', s, re.I):
        return False
    if re.search(r'\bC[1-6]\s*=\s*(?:remember|understand|apply|analyze|evaluate|create)\b', s, re.I):
        return False
    if re.search(r'\b(?:bloom(?:\'s)?\s*(?:taxonomy|mapping|levels?)|type-wise\s*co|co\s*&\s*bloom)\b', s, re.I):
        return False
    if re.search(r'\b(?:I\s+(?:have|did|will|am|prefer|recommend|suggest|not\s+forced)|my\s+notes?|not\s+forced\s+CO\d)\b', s, re.I):
        return False
    if re.search(r'\b(?:these\s+(?:questions|are|topics)\s+(?:especially|important|mainly|intended|move\s+toward)|assess(?:es)?\s+teamwork)\b', s, re.I):
        return False
    if re.match(r'^(?:note|instructions?|guidelines?|remark|notice|important\s+note)\s*[:\-]', s, re.I):
        return False
    if re.search(r'^(?:PREVIOUS\s+YEAR|SPRING\s+\d{4}|FALL\s+\d{4}|SUMMER\s+\d{4}|SECTION\s+[A-Z]|PART\s*[-–—:]\s*[A-Z]|MODULE\s+\d+|UNIT\s+\d+)\b', s, re.I):
        return False

    # Section headings in ALL CAPS without a question mark (e.g. "ENCAPSULATION / DATA HIDING")
    letters = [c for c in s if c.isalpha()]
    if letters:
        upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
        if upper_ratio > 0.65 and '?' not in s:
            return False

    clean_s = strip_leading_question_number(s)
    if len(clean_s) < 10:
        return False

    # 2. Positive Filters: Questions or academic task directives
    if '?' in clean_s:
        return True

    question_starters = (
        r'^(?:what|why|how|when|where|which|who|whom|whose)\b',
        r'^(?:explain|describe|define|differentiate|distinguish|compare|contrast|'
        r'discuss|state|list|mention|illustrate|outline|summarize|clarify|elaborate|'
        r'write|implement|calculate|compute|derive|prove|design|develop|construct|'
        r'solve|evaluate|analyze|trace|find|determine|draw|demonstrate|show|simulate|'
        r'create|briefly|give|provide|identify|justify|use|using|divide|multiply|apply|'
        r'consider|syntax\s+for|advantages\s+of|disadvantages\s+of|difference\s+between|'
        r'short\s+notes\s+on|comparative\s+study|program\s+to|true/false|handle\s+derived|'
        r'is\s+(?:it|a|an|constructor|there)|can\s+you|could\s+you)\b'
    )
    for pattern in question_starters:
        if re.search(pattern, clean_s, re.I):
            return True

    if re.search(r'\b(?:differentiate\s+between|compare\s+(?:and\s+contrast\s+)?with|'
                 r'write\s+(?:a\s+)?(?:java|python|c\+\+|code|program|function|class|query)|'
                 r'explain\s+with\s+(?:an?\s+)?example|how\s+can\s+we|why\s+do\s+we|'
                 r'what\s+(?:is|are|happens|would\s+happen)|justify(?:\s+with|\s+the|\s+logically|\s+your|\.)?|'
                 r'elaborate\.?|difference\s+between|code\s+segment|expected\s+output|'
                 r'short\s+notes?\s+on)\b', clean_s, re.I):
        return True

    return False


# Regex to detect sub-question markers: A. / B) / (a) / (i) etc.
_SUB_Q_MARKER = re.compile(
    r'^\s*(?:[A-Za-z][\.\)]\s+|\([a-zA-Z0-9]+\)\s+)',
    re.MULTILINE
)

# Regex to detect if a fragment starts with a major question header
_MAJOR_Q_HEADER = re.compile(
    r'^(?:Question|Que|Prob|Problem|Q)\s*(?:#|\.)?\s*\d+',
    re.IGNORECASE
)


def _is_scenario_context(text: str) -> bool:
    """
    Determines if a text fragment is a scenario/descriptive context paragraph
    (not a standalone question, but contextual setup for sub-questions).

    Recognizes both explicit 'Scenario:' labels and implicit scenario paragraphs
    that describe a situation without being a valid standalone question.
    """
    if not text or len(text) < 20:
        return False
    s = text.strip()

    # Explicit scenario label
    if re.match(r'^(?:Scenario|Case\s*Study|Context|Situation|Background)\s*[:\-]', s, re.I):
        return True

    # Major question headers that contain a scenario description inline
    # e.g. "Question 1 — Searching Algorithms\nScenario: A university library..."
    if _MAJOR_Q_HEADER.match(s) and len(s) > 60:
        return True

    # Implicit scenario: a descriptive paragraph (no question mark in first sentence,
    # not a directive verb, but substantial enough to be contextual setup)
    if not is_valid_pedagogical_question(s) and len(s) > 40:
        # Check it's descriptive prose, not just a heading or metadata
        word_count = len(s.split())
        if word_count >= 8:
            return True

    return False


def chunk_teacher_notes(raw_text: str) -> List[str]:
    """
    Splits raw extracted text into distinct pedagogical question chunks,
    filtering out non-question noise and stripping leading numbering prefixes.

    Enhanced with Scenario-Aware Contextual Chunking:
      - Detects scenario/descriptive context paragraphs followed by sub-questions.
      - Embeds scenario context into each sub-question for keyword searchability.
      - Registers the full composite scenario block for holistic matching.
      - Preserves embedded markdown tables within their parent questions.

    Processing:
      1. Split on numbered items, Q-tags, or double-newlines.
      2. Detect scenario blocks and embed context into sub-questions.
      3. Filter out non-questions (course headers, Bloom legends, section titles).
      4. Strip leading numbering tags and trailing OBE tags.
      5. Deduplicate identical consecutive chunks while preserving reading order.
    """
    if not raw_text or not raw_text.strip():
        return []

    # Split into raw fragments
    fragments = _SPLIT_PATTERN.split(raw_text)

    # ── Phase 1: Scenario-Aware Assembly ──────────────────────────────
    # Walk through fragments, detect scenario blocks, and assemble them
    # with their sub-questions before filtering.
    assembled_chunks: List[str] = []
    pending_scenario: Optional[str] = None       # Accumulated scenario context text
    scenario_sub_questions: List[str] = []        # Sub-questions under current scenario

    def _flush_scenario():
        """Flush any pending scenario block into assembled_chunks."""
        nonlocal pending_scenario, scenario_sub_questions
        if pending_scenario and scenario_sub_questions:
            # Clean the scenario text (strip leading question headers like "Question 1 — ...")
            scenario_text = pending_scenario.strip()
            # Remove leading "Question N — Topic" header line if present, keep the body
            header_match = re.match(
                r'^(?:Question|Que|Prob|Problem|Q)\s*(?:#|\.)?\s*\d+\s*[-—–:.]\s*[^\n]*\n',
                scenario_text, re.I
            )
            scenario_body = scenario_text[header_match.end():].strip() if header_match else scenario_text

            # Emit each sub-question with embedded scenario context
            for sub_q in scenario_sub_questions:
                clean_sub = sub_q.strip()
                if clean_sub:
                    tagged = f"[Scenario: {scenario_body}]\n{clean_sub}"
                    assembled_chunks.append(tagged)

            # Also emit the full composite block for holistic matching
            composite = scenario_body + '\n' + '\n'.join(
                sq.strip() for sq in scenario_sub_questions if sq.strip()
            )
            if len(composite) <= 2500:
                assembled_chunks.append(composite)

        elif pending_scenario and not scenario_sub_questions:
            # Scenario without sub-questions — just pass it through normally
            assembled_chunks.append(pending_scenario.strip())

        pending_scenario = None
        scenario_sub_questions = []

    for frag in fragments:
        if frag is None:
            continue
        chunk = frag.strip()
        if not chunk:
            continue

        is_sub_q = bool(_SUB_Q_MARKER.match(chunk))

        if is_sub_q and pending_scenario is not None:
            # This is a sub-question belonging to the current scenario
            scenario_sub_questions.append(chunk)
        elif _is_scenario_context(chunk):
            # Flush any previous scenario, start a new one
            _flush_scenario()
            pending_scenario = chunk
        else:
            # Regular fragment — flush any pending scenario first
            _flush_scenario()
            assembled_chunks.append(chunk)

    # Flush any trailing scenario block
    _flush_scenario()

    # ── Phase 2: Standard Filtering & Cleaning ────────────────────────
    cleaned_chunks: List[str] = []
    prev_chunk: Optional[str] = None

    for chunk in assembled_chunks:
        if not chunk:
            continue

        # Smart filter: verify chunk is an actual pedagogical question/problem
        if not is_valid_pedagogical_question(chunk):
            continue

        # Don't strip scenario tags from scenario-embedded chunks
        if not chunk.startswith('[Scenario:'):
            chunk = strip_leading_question_number(chunk)

        # Strip trailing OBE mapping tags / marks annotations
        chunk = _OBE_TAG_PATTERN.sub("", chunk).strip()

        # Length filter: scenario/table chunks can be longer
        has_scenario = chunk.startswith('[Scenario:')
        has_table = bool(re.search(r'^\|.+\|$', chunk, re.MULTILINE))
        max_len = 2000 if (has_scenario or has_table) else 600
        min_len = 10 if has_scenario else 15

        if len(chunk) < min_len or len(chunk) > max_len:
            continue

        # Consecutive deduplication
        if chunk == prev_chunk:
            continue

        cleaned_chunks.append(chunk)
        prev_chunk = chunk

    return cleaned_chunks


# ---------------------------------------------------------------------------
# 3. IN-MEMORY & PERSISTENT VECTOR STORE MANAGER (Singleton)
# ---------------------------------------------------------------------------

CACHE_DIR = Path(__file__).resolve().parent.parent / "cache" / "notes"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
DOCS_DIR = CACHE_DIR / "documents"
DOCS_DIR.mkdir(parents=True, exist_ok=True)

class NotesIndexManager:
    """
    Singleton managing per-course SBERT vector stores for teacher-uploaded
    reference notes with local disk cache persistence.

    Stores:
      self.stores[course_id] = {
          "fileName":   str,
          "fileType":   str,          # e.g. "docx", "pdf"
          "chunks":     List[str],
          "embeddings": np.ndarray    # shape (N, 384), unit-normalized
      }
    """
    _instance: Optional["NotesIndexManager"] = None

    def __new__(cls) -> "NotesIndexManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.stores: Dict[str, Dict[str, Any]] = {}
        return cls._instance

    def _get_safe_filename(self, course_id: str) -> Path:
        safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(course_id).strip())
        return CACHE_DIR / f"{safe_id}.pkl"

    def get_document_file_path(self, course_id: str, filename: str) -> Optional[Path]:
        safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(course_id).strip())
        doc_path = DOCS_DIR / safe_id / filename
        if doc_path.exists() and doc_path.is_file():
            return doc_path
        return None

    def get_pptx_slides(self, course_id: str, filename: str) -> List[dict]:
        doc_path = self.get_document_file_path(course_id, filename)
        if not doc_path or not doc_path.exists():
            return []

        try:
            from pptx import Presentation
            prs = Presentation(str(doc_path))
            slides_data: List[dict] = []

            for s_idx, slide in enumerate(prs.slides):
                slide_title = ""
                bullets: List[str] = []
                tables_data: List[List[List[str]]] = []

                if slide.shapes.title and slide.shapes.title.has_text_frame:
                    slide_title = slide.shapes.title.text_frame.text.strip()

                for shape in slide.shapes:
                    if shape == slide.shapes.title:
                        continue
                    if shape.has_text_frame:
                        if not slide_title:
                            first_t = shape.text_frame.text.strip()
                            if first_t and len(first_t) < 100 and '\n' not in first_t:
                                slide_title = first_t
                                continue
                        for p in shape.text_frame.paragraphs:
                            t = p.text.strip()
                            if t and t != slide_title:
                                bullets.append(t)
                    elif shape.has_table:
                        tbl = []
                        for row in shape.table.rows:
                            tbl.append([c.text.strip() for c in row.cells])
                        if tbl:
                            tables_data.append(tbl)

                slides_data.append({
                    "slideNumber": s_idx + 1,
                    "title": slide_title or f"Slide {s_idx + 1}",
                    "bullets": bullets,
                    "tables": tables_data
                })

            return slides_data
        except Exception as e:
            logger.warning(f"Failed to parse PPTX slides for '{filename}': {e}")
            return []

    def save_document_file(self, course_id: str, filename: str, file_bytes: bytes) -> Path:
        safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(course_id).strip())
        target_dir = DOCS_DIR / safe_id
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / filename
        with open(target_path, "wb") as f_out:
            f_out.write(file_bytes)
        return target_path

    def _sanitize_store(self, course_id: str, store: dict) -> dict:
        """
        Ensures loaded stores support multiple documents per course, legacy caches
        are migrated to multi-file structure, non-question noise is pruned, and
        leading question numbering is cleanly stripped.
        """
        if not store:
            return store

        # Migrate legacy single-file store to multi-file structure
        if "files" not in store or not isinstance(store["files"], list):
            fn = store.get("fileName") or f"{course_id}_notes"
            ft = store.get("fileType") or (fn.rsplit(".", 1)[-1].lower() if "." in fn else "unknown")
            legacy_chunks = store.get("chunks", [])
            legacy_embs = store.get("embeddings")
            store["files"] = [
                {
                    "fileName": fn,
                    "fileType": ft,
                    "totalChunks": len(legacy_chunks),
                    "chunks": legacy_chunks,
                    "embeddings": legacy_embs
                }
            ]

        # Sanitize each file's chunks
        any_modified = False
        active_files = []
        for f in store.get("files", []):
            f_chunks = f.get("chunks", [])
            f_embs = f.get("embeddings")
            valid_indices = [
                i for i, c in enumerate(f_chunks)
                if is_valid_pedagogical_question(c)
            ]
            has_unstripped = any(strip_leading_question_number(c) != c for c in f_chunks)

            if len(valid_indices) < len(f_chunks) or has_unstripped:
                any_modified = True
                cleaned = [strip_leading_question_number(f_chunks[i]) for i in valid_indices]
                f["chunks"] = cleaned
                f["totalChunks"] = len(cleaned)
                if f_embs is not None and len(f_embs) > 0 and len(valid_indices) > 0:
                    f["embeddings"] = f_embs[valid_indices]
                else:
                    f["embeddings"] = np.empty((0, 384), dtype=np.float32)

            if len(f.get("chunks", [])) > 0:
                active_files.append(f)
            else:
                any_modified = True

        store["files"] = active_files

        # Re-aggregate chunks, sources, and embeddings
        all_chunks: List[str] = []
        all_sources: List[str] = []
        all_embs_list = []

        for f in active_files:
            fn = f.get("fileName", "Document")
            all_chunks.extend(f.get("chunks", []))
            all_sources.extend([fn] * len(f.get("chunks", [])))
            embs = f.get("embeddings")
            if embs is not None and len(embs) > 0:
                all_embs_list.append(embs)

        store["chunks"] = all_chunks
        store["chunkSources"] = all_sources

        if all_embs_list:
            store["embeddings"] = np.vstack(all_embs_list)
        else:
            store["embeddings"] = np.empty((0, 384), dtype=np.float32)

        # Update primary filename / type for backwards compatibility
        if active_files:
            store["fileName"] = active_files[-1].get("fileName")
            store["fileType"] = active_files[-1].get("fileType")
        else:
            store["fileName"] = None
            store["fileType"] = None

        # Persist updated sanitized store back to disk if modified or newly migrated
        if any_modified or "chunkSources" not in store:
            try:
                import pickle
                cache_path = self._get_safe_filename(course_id)
                with open(cache_path, "wb") as f_out:
                    pickle.dump(store, f_out)
                logger.info(
                    f"Persisted multi-file sanitized index for '{course_id}' ({len(active_files)} files, {len(all_chunks)} total Qs)"
                )
            except Exception as e:
                logger.warning(f"Could not re-save sanitized cache for '{course_id}': {e}")

        return store

    def _get_store(self, course_id: str) -> Optional[dict]:
        if course_id in self.stores:
            return self._sanitize_store(course_id, self.stores[course_id])
        # Attempt to load from disk cache
        cache_path = self._get_safe_filename(course_id)
        if cache_path.exists():
            try:
                import pickle
                with open(cache_path, "rb") as f:
                    store = pickle.load(f)
                    store = self._sanitize_store(course_id, store)
                    self.stores[course_id] = store
                    logger.info(
                        f"Loaded {len(store.get('chunks', []))} total chunks ({len(store.get('files', []))} files) for '{course_id}'"
                    )
                    return store
            except Exception as err:
                logger.warning(f"Failed to load cached index for '{course_id}': {err}")
        return None

    # ── Index notes ─────────────────────────────────────────────────────
    def index_notes(self, course_id: str, filename: str, raw_text: str) -> dict:
        """
        Chunks raw text, computes SBERT embeddings, and adds/updates the document
        in the course's multi-document store. Preserves other existing documents!
        """
        chunks = chunk_teacher_notes(raw_text)

        if not chunks:
            raise ValueError(
                "No readable questions or conceptual chunks found in document."
            )

        # In serverless mode, embeddings are computed on-demand via HF Inference API
        new_embeddings = None

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown"

        # Load existing store or initialize new multi-file container
        store = self._get_store(course_id)
        if not store:
            store = {
                "files": [],
                "chunks": [],
                "chunkSources": [],
                "embeddings": np.empty((0, 384), dtype=np.float32)
            }

        # Remove previous entry for this exact filename if already present (update file)
        existing_files = [f for f in store.get("files", []) if f.get("fileName") != filename]

        # Add new file entry
        existing_files.append({
            "fileName": filename,
            "fileType": ext,
            "totalChunks": len(chunks),
            "chunks": chunks,
            "embeddings": new_embeddings
        })

        store["files"] = existing_files

        # Re-aggregate all chunks and embeddings across all files
        all_chunks: List[str] = []
        all_sources: List[str] = []
        all_embs_list = []

        for f in existing_files:
            fn = f.get("fileName", "Document")
            all_chunks.extend(f.get("chunks", []))
            all_sources.extend([fn] * len(f.get("chunks", [])))
            embs = f.get("embeddings")
            if embs is not None and len(embs) > 0:
                all_embs_list.append(embs)

        store["chunks"] = all_chunks
        store["chunkSources"] = all_sources
        store["embeddings"] = np.vstack(all_embs_list) if all_embs_list else np.empty((0, 384), dtype=np.float32)
        store["fileName"] = filename
        store["fileType"] = ext

        self.stores[course_id] = store

        # Persist to disk cache
        try:
            import pickle
            cache_path = self._get_safe_filename(course_id)
            with open(cache_path, "wb") as f:
                pickle.dump(store, f)
            logger.info(f"Persisted multi-file index for '{course_id}' to {cache_path}")
        except Exception as err:
            logger.warning(f"Could not persist cache to disk: {err}")

        logger.info(
            f"Indexed {len(chunks)} questions from '{filename}'. Total questions across {len(existing_files)} file(s): {len(all_chunks)}"
        )

        return {
            "totalChunks": len(all_chunks),
            "fileChunks": len(chunks),
            "fileName": filename,
            "totalFiles": len(existing_files),
            "files": [
                {
                    "fileName": f["fileName"],
                    "fileType": f["fileType"],
                    "totalChunks": f["totalChunks"]
                }
                for f in existing_files
            ]
        }

    # ── Remove single file ──────────────────────────────────────────────
    def remove_file(self, course_id: str, filename: str) -> bool:
        """
        Removes a specific document from a course's multi-document store,
        re-aggregating the remaining documents.
        """
        store = self._get_store(course_id)
        if not store or "files" not in store or not store["files"]:
            return False

        orig_len = len(store["files"])
        remaining_files = [f for f in store["files"] if f.get("fileName", "").strip().lower() != filename.strip().lower()]

        if len(remaining_files) == orig_len:
            return False

        if not remaining_files:
            return self.clear_notes(course_id)

        store["files"] = remaining_files

        # Re-aggregate
        all_chunks: List[str] = []
        all_sources: List[str] = []
        all_embs_list = []

        for f in remaining_files:
            fn = f.get("fileName", "Document")
            all_chunks.extend(f.get("chunks", []))
            all_sources.extend([fn] * len(f.get("chunks", [])))
            embs = f.get("embeddings")
            if embs is not None and len(embs) > 0:
                all_embs_list.append(embs)

        store["chunks"] = all_chunks
        store["chunkSources"] = all_sources
        store["embeddings"] = np.vstack(all_embs_list) if all_embs_list else np.empty((0, 384), dtype=np.float32)
        store["fileName"] = remaining_files[-1].get("fileName")
        store["fileType"] = remaining_files[-1].get("fileType")

        self.stores[course_id] = store

        try:
            import pickle
            cache_path = self._get_safe_filename(course_id)
            with open(cache_path, "wb") as f:
                pickle.dump(store, f)
            logger.info(f"Removed '{filename}' from '{course_id}'. {len(remaining_files)} files remaining.")
        except Exception as err:
            logger.warning(f"Could not re-save cache after file removal: {err}")

        try:
            doc_p = self.get_document_file_path(course_id, filename)
            if doc_p and doc_p.exists():
                doc_p.unlink()
        except Exception:
            pass

        return True

    # ── Semantic & Lexical Suggestion ──────────────────────────────────
    def suggest_questions(
        self, course_id: str, query_text: str, top_k: int = 20
    ) -> List[dict]:
        """
        Finds the top-k semantically and lexically matched questions to `query_text`
        from all indexed reference notes for `course_id`.
        """
        store = self._get_store(course_id)
        if not store or len(store.get("chunks", [])) == 0:
            return []

        raw_query = (query_text or "").strip()
        clean_query = sanitize_question_text(raw_query)
        if not clean_query:
            clean_query = raw_query

        clean_query = strip_leading_question_number(clean_query)
        if not clean_query:
            clean_query = raw_query

        if len(clean_query) < 2:
            return []

        query_lower = clean_query.lower()
        query_tokens = [t for t in re.findall(r'[a-zA-Z0-9_#\+\-]+', query_lower) if len(t) >= 2]

        # Compute semantic similarity scores remotely via Hugging Face Serverless Inference
        all_chunks = store.get("chunks", [])
        raw_scores = compute_sentence_similarity_sync(
            source_sentence=clean_query,
            sentences=all_chunks
        )
        if raw_scores and len(raw_scores) == len(all_chunks):
            scores = np.array(raw_scores, dtype=np.float32)
        else:
            scores = np.zeros(len(all_chunks), dtype=np.float32)
        adjusted_scores = scores.copy()

        matched_flags = [False] * len(store["chunks"])
        chunk_sources = store.get("chunkSources", [])

        for idx, chunk in enumerate(store["chunks"]):
            chunk_lower = chunk.lower()
            cleaned_chunk_lower = strip_leading_question_number(chunk).lower()

            token_matches = 0
            exact_phrase = (query_lower in chunk_lower) or (query_lower in cleaned_chunk_lower)
            starts_with_query = (
                chunk_lower.startswith(query_lower)
                or cleaned_chunk_lower.startswith(query_lower)
            )

            for token in query_tokens:
                if re.search(r'\b' + re.escape(token) + r'\b', chunk_lower):
                    token_matches += 1
                elif token in chunk_lower:
                    token_matches += 0.5

            if token_matches > 0 or exact_phrase or starts_with_query:
                matched_flags[idx] = True
                boost = min(0.45, 0.22 + (token_matches * 0.10))
                if exact_phrase:
                    boost += 0.15
                if starts_with_query:
                    boost += 0.25
                adjusted_scores[idx] += boost

        # Sort indices by score descending
        sorted_indices = np.argsort(adjusted_scores)[::-1]

        results: List[dict] = []
        for idx in sorted_indices:
            if len(results) >= top_k:
                break
            raw_text = store["chunks"][idx]
            if not is_valid_pedagogical_question(raw_text):
                continue

            adj_score = float(adjusted_scores[idx])

            # Smart relevance filter:
            # Questions with direct token/phrase/prefix match are always included.
            # Purely semantic matches (no keyword overlap) must meet meaningful similarity (>= 0.44)
            # to avoid returning unrelated questions just to fill the quota.
            if not matched_flags[idx] and adj_score < 0.44:
                continue

            clean_q = strip_leading_question_number(raw_text)
            adj_score = float(adjusted_scores[idx])
            match_pct = int(round(min(98, max(45, (adj_score * 100.0) * 1.02))))
            if matched_flags[idx]:
                match_pct = max(match_pct, 75)

            source_file = chunk_sources[idx] if idx < len(chunk_sources) else store.get("fileName")

            results.append({
                "id": int(idx),
                "questionText": clean_q,
                "matchPercentage": match_pct,
                "sourceFile": source_file
            })

        return results

    # ── Status query ────────────────────────────────────────────────────
    def get_notes_status(self, course_id: str) -> dict:
        """
        Returns indexing status for a course, including document files and sample chunks.
        """
        store = self._get_store(course_id)
        if not store:
            return {
                "hasNotes": False,
                "fileName": None,
                "fileType": None,
                "totalChunks": 0,
                "sampleChunks": [],
                "files": []
            }

        valid_chunks = [
            strip_leading_question_number(c)
            for c in store.get("chunks", [])
            if is_valid_pedagogical_question(c)
        ]

        files_info = []
        for f in store.get("files", []):
            f_clean = [
                strip_leading_question_number(c)
                for c in f.get("chunks", [])
                if is_valid_pedagogical_question(c)
            ]
            files_info.append({
                "fileName": f.get("fileName"),
                "fileType": f.get("fileType"),
                "totalChunks": len(f_clean),
                "sampleChunks": f_clean
            })

        return {
            "hasNotes": len(valid_chunks) > 0,
            "fileName": store.get("fileName"),
            "fileType": store.get("fileType"),
            "totalChunks": len(valid_chunks),
            "sampleChunks": valid_chunks,
            "files": files_info
        }

    # ── Clear notes ─────────────────────────────────────────────────────
    def clear_notes(self, course_id: str) -> bool:
        cleared = False
        if course_id in self.stores:
            del self.stores[course_id]
            cleared = True
        cache_path = self._get_safe_filename(course_id)
        if cache_path.exists():
            try:
                cache_path.unlink()
                cleared = True
            except Exception as e:
                logger.warning(f"Could not delete cache file {cache_path}: {e}")

        try:
            safe_id = re.sub(r'[^a-zA-Z0-9_\-]', '_', str(course_id).strip())
            d = DOCS_DIR / safe_id
            if d.exists():
                import shutil
                shutil.rmtree(d, ignore_errors=True)
        except Exception:
            pass

        return cleared


# Global singleton instance
notes_manager = NotesIndexManager()
