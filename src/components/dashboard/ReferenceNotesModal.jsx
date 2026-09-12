import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  FileCode,
  Layers,
  FileCheck,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Eye,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  CheckCircle,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Monitor,
  LayoutGrid
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { renderAsync } from 'docx-preview';
import {
  uploadNotesFile,
  getNotesStatus,
  clearCourseNotes,
  stripQuestionLeadingNumber,
  getCachedNotesStatus,
  getNotesFileUrl,
  getPresentationSlides
} from '../../services/notesApi';
import {
  saveNoteBlobToIDB,
  getNoteBlobFromIDB,
  deleteNoteBlobFromIDB,
  clearCourseBlobsFromIDB
} from '../../utils/notesStorage';
import { detectEmbeddedCodeInQuestion } from '../../utils/codeFormatter';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  } catch (e) {}
}

/**
 * Parses a question chunk that may contain [Scenario: ...] prefix and/or
 * markdown table syntax (| col1 | col2 |). Returns structured parts.
 */
function parseScenarioAndTable(text) {
  if (!text) return { scenarioText: null, questionText: '', markdownTable: null }
  let scenarioText = null
  let remaining = text
  const scenarioMatch = remaining.match(/^\[Scenario:\s*([\s\S]*?)\]\s*\n?/)
  if (scenarioMatch) {
    scenarioText = scenarioMatch[1].trim()
    remaining = remaining.slice(scenarioMatch[0].length).trim()
  }
  let markdownTable = null
  const tableLines = []
  const nonTableLines = []
  remaining.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableLines.push(trimmed)
    } else {
      nonTableLines.push(line)
    }
  })
  if (tableLines.length >= 2) {
    const parseRow = (row) => row.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim())
    const headers = parseRow(tableLines[0])
    const dataStartIdx = tableLines[1].includes('---') ? 2 : 1
    const rows = tableLines.slice(dataStartIdx).map(parseRow)
    if (headers.length > 0 && rows.length > 0) {
      markdownTable = { headers, rows }
    }
  }
  const questionText = nonTableLines.join('\n').trim()
  return { scenarioText, questionText, markdownTable }
}

/**
 * Robust HTML5 Canvas PDF Viewer (100% IDM-immune, zero download prompts)
 */
function PdfDocumentViewer({ blob, fileName }) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);

  useEffect(() => {
    if (!blob) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setNumPages(0);

    const loadPdf = async () => {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        if (!isMounted) return;

        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('PDF load error:', err);
        setError('Failed to parse PDF document for visual rendering.');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch (e) {}
        pdfDocRef.current = null;
      }
    };
  }, [blob]);

  useEffect(() => {
    const doc = pdfDocRef.current;
    if (!doc || numPages === 0) return;

    let isCancelled = false;

    const renderPages = async () => {
      const container = containerRef.current;
      if (!container) return;
      container.innerHTML = '';

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        if (isCancelled) break;
        try {
          const page = await doc.getPage(pageNum);
          if (isCancelled) break;

          const viewport = page.getViewport({ scale });

          const pageWrapper = document.createElement('div');
          pageWrapper.className = 'flex flex-col items-center mb-4 last:mb-1 w-full';

          const shadowBox = document.createElement('div');
          shadowBox.className = 'bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden';

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          shadowBox.appendChild(canvas);
          pageWrapper.appendChild(shadowBox);

          const badge = document.createElement('div');
          badge.className = 'text-[10.5px] font-semibold text-gray-500 mt-1';
          badge.textContent = `Page ${pageNum} of ${doc.numPages}`;
          pageWrapper.appendChild(badge);

          container.appendChild(pageWrapper);

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
        } catch (err) {
          console.warn(`Error rendering page ${pageNum}:`, err);
        }
      }
    };

    renderPages();

    return () => {
      isCancelled = true;
    };
  }, [numPages, scale]);

  return (
    <div className="flex flex-col bg-slate-100/90 rounded-xl overflow-hidden border border-gray-300 shadow-inner">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <span className="font-semibold text-emerald-800">
            {numPages > 0 ? `${numPages} Pages` : 'Loading pages...'}
          </span>
          {fileName && <span className="text-gray-400 truncate max-w-[240px]">| {fileName}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setScale(s => Math.max(0.6, s - 0.15))}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] font-mono text-gray-600 w-12 text-center select-none">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale(s => Math.min(2.0, s + 0.15))}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setScale(1.0)}
            className="text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition cursor-pointer ml-1"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="p-4 max-h-[460px] overflow-y-auto custom-scrollbar flex flex-col items-center">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-500">
            <Loader2 size={24} className="animate-spin text-emerald-600" />
            <span className="text-xs font-semibold">Rendering PDF document preview...</span>
          </div>
        )}
        {error && !loading && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div ref={containerRef} className="w-full flex flex-col items-center" />
      </div>
    </div>
  );
}

/**
 * Slide-by-slide PowerPoint Presentation Viewer
 */
function PresentationViewer({ slidesData, loading, fallbackText, fileName }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState('single');

  const slides = slidesData?.slides || [];
  const totalSlides = slides.length;

  useEffect(() => {
    setCurrentSlide(0);
  }, [fileName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-xs">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
        <span className="text-xs font-semibold">Extracting presentation slides...</span>
      </div>
    );
  }

  if (totalSlides === 0) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 whitespace-pre-wrap font-sans text-xs text-gray-800 leading-relaxed max-h-[380px] overflow-y-auto">
        <div className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2 border-b pb-2">
          <span>Presentation Content:</span>
        </div>
        {fallbackText || 'Presentation slides loaded.'}
      </div>
    );
  }

  const activeSlide = slides[currentSlide] || slides[0];

  return (
    <div className="flex flex-col bg-slate-100/90 rounded-xl overflow-hidden border border-gray-300 shadow-inner">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium text-gray-700">
          <span className="font-semibold text-emerald-800">
            Slide {currentSlide + 1} of {totalSlides}
          </span>
          <span className="text-gray-400 truncate max-w-[240px]">| {fileName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(v => v === 'single' ? 'grid' : 'single')}
            className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 px-2 py-1 rounded border border-gray-200 transition cursor-pointer"
          >
            {viewMode === 'single' ? (
              <>
                <LayoutGrid size={13} />
                <span>All Slides</span>
              </>
            ) : (
              <>
                <Monitor size={13} />
                <span>Slide View</span>
              </>
            )}
          </button>

          {viewMode === 'single' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentSlide === 0}
                onClick={() => setCurrentSlide(c => Math.max(0, c - 1))}
                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Previous Slide"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={currentSlide >= totalSlides - 1}
                onClick={() => setCurrentSlide(c => Math.min(totalSlides - 1, c + 1))}
                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                title="Next Slide"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 max-h-[460px] overflow-y-auto custom-scrollbar flex flex-col items-center">
        {viewMode === 'single' ? (
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-md border border-gray-300 p-6 space-y-4 transition-all">
            <div className="border-b border-gray-100 pb-3 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Slide {activeSlide.slideNumber}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1.5 leading-snug">
                  {activeSlide.title}
                </h3>
              </div>
            </div>

            {activeSlide.bullets && activeSlide.bullets.length > 0 && (
              <div className="space-y-2 py-1">
                {activeSlide.bullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2.5 text-xs text-gray-700 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            )}

            {activeSlide.tables && activeSlide.tables.length > 0 && (
              <div className="space-y-3 pt-2">
                {activeSlide.tables.map((tbl, tIdx) => (
                  <div key={tIdx} className="overflow-x-auto rounded-lg border border-gray-200 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <tbody>
                        {tbl.map((row, rIdx) => (
                          <tr key={rIdx} className={rIdx === 0 ? 'bg-gray-100 font-bold text-gray-800' : 'border-t border-gray-200 hover:bg-gray-50'}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2 border-r border-gray-200 last:border-r-0">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {slides.map((s, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setCurrentSlide(idx);
                  setViewMode('single');
                }}
                className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-xs hover:shadow-md hover:border-emerald-400 space-y-2 ${
                  currentSlide === idx ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    Slide {s.slideNumber}
                  </span>
                  <span className="text-[10px] text-gray-400">Click to view</span>
                </div>
                <h4 className="text-xs font-bold text-gray-800 truncate">
                  {s.title}
                </h4>
                {s.bullets && s.bullets.length > 0 && (
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                    {s.bullets[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReferenceNotesModal({
  isOpen,
  onClose,
  courseId,
  courseTitle = '',
  onNotesUpdated = () => {},
  onInsertQuestion = null
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'preview'
  const [status, setStatus] = useState({
    hasNotes: false,
    fileName: null,
    fileType: null,
    totalChunks: 0,
    sampleChunks: [],
    files: []
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileBlobs, setFileBlobs] = useState({}); // { [fileName]: Blob }
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  // Document Viewer specific states
  const [activeDocBlob, setActiveDocBlob] = useState(null);
  const [docPreviewLoading, setDocPreviewLoading] = useState(false);
  const [docPreviewError, setDocPreviewError] = useState('');
  const [docPreviewText, setDocPreviewText] = useState('');
  const [docViewerCollapsed, setDocViewerCollapsed] = useState(false);
  const [presentationData, setPresentationData] = useState(null);
  const [presentationLoading, setPresentationLoading] = useState(false);

  const fileInputRef = useRef(null);
  const docxPreviewContainerRef = useRef(null);

  // Fetch status whenever modal opens or courseId changes
  useEffect(() => {
    if (isOpen && courseId) {
      loadStatus();
    }
  }, [isOpen, courseId]);

  const loadStatus = async () => {
    // Instantly show cached state from localStorage if available
    const cached = getCachedNotesStatus(courseId);
    if (cached && (cached.hasNotes || (cached.files && cached.files.length > 0))) {
      setStatus(cached);
      if (cached.files && cached.files.length > 0) {
        setSelectedPreviewDoc(prev => {
          const exists = cached.files.some(f => f.fileName === prev);
          return exists ? prev : cached.files[0].fileName;
        });
      } else if (cached.fileName) {
        setSelectedPreviewDoc(cached.fileName);
      }
    } else {
      setIsLoadingStatus(true);
    }

    try {
      const data = await getNotesStatus(courseId);
      setStatus(data);
      if (data.files && data.files.length > 0) {
        setSelectedPreviewDoc(prev => {
          // Keep existing selection if valid, else pick first file
          const exists = data.files.some(f => f.fileName === prev);
          return exists ? prev : data.files[0].fileName;
        });
      } else if (data.fileName) {
        setSelectedPreviewDoc(data.fileName);
      } else {
        setSelectedPreviewDoc(null);
      }
    } catch (err) {
      console.error('Failed to load notes status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Load document blob (from memory -> IndexedDB -> server cache)
  useEffect(() => {
    if (!isOpen || activeTab !== 'preview' || !selectedPreviewDoc || !courseId) return;

    let isCancelled = false;
    const isDocx = selectedPreviewDoc.toLowerCase().endsWith('.docx');
    const isPdf = selectedPreviewDoc.toLowerCase().endsWith('.pdf');
    const isPptx = selectedPreviewDoc.toLowerCase().endsWith('.pptx') || selectedPreviewDoc.toLowerCase().endsWith('.ppt');

    setDocPreviewLoading(true);
    setDocPreviewError('');
    setDocPreviewText('');
    setPresentationData(null);

    // If PPTX presentation, fetch structured slide data
    if (isPptx) {
      setPresentationLoading(true);
      getPresentationSlides(courseId, selectedPreviewDoc)
        .then(slidesRes => {
          if (!isCancelled && slidesRes && slidesRes.success) {
            setPresentationData(slidesRes);
          }
        })
        .catch(err => {
          console.warn('PPTX slide fetch warning:', err);
        })
        .finally(() => {
          if (!isCancelled) setPresentationLoading(false);
        });
    }

    const fetchDocumentBlob = async () => {
      try {
        // 1. Check in-memory state
        let blob = fileBlobs[selectedPreviewDoc];

        // 2. Check browser IndexedDB storage (offline persistence on teacher's PC)
        if (!blob) {
          blob = await getNoteBlobFromIDB(courseId, selectedPreviewDoc);
          if (blob && !isCancelled) {
            setFileBlobs(prev => ({ ...prev, [selectedPreviewDoc]: blob }));
          }
        }

        // 3. Fallback: Fetch from server cache endpoint
        if (!blob) {
          const fileUrl = getNotesFileUrl(courseId, selectedPreviewDoc);
          if (fileUrl) {
            const res = await fetch(fileUrl);
            if (res.ok) {
              const fetchedBlob = await res.blob();
              if (fetchedBlob && fetchedBlob.size > 0) {
                blob = fetchedBlob;
                if (!isCancelled) {
                  setFileBlobs(prev => ({ ...prev, [selectedPreviewDoc]: fetchedBlob }));
                  // Cache in IndexedDB for permanent fast offline access
                  await saveNoteBlobToIDB(courseId, selectedPreviewDoc, fetchedBlob);
                }
              }
            }
          }
        }

        if (isCancelled) return;

        if (blob) {
          setActiveDocBlob(blob);
          if (!isDocx && !isPdf && !isPptx) {
            const txt = await blob.text();
            if (!isCancelled) setDocPreviewText(txt);
          }
          setDocPreviewLoading(false);
        } else {
          // Fallback to sample chunks if raw document is unavailable
          const currentDoc = (status.files || []).find(f => f.fileName === selectedPreviewDoc);
          if (currentDoc && currentDoc.sampleChunks?.length) {
            setDocPreviewText(currentDoc.sampleChunks.join('\n\n'));
          } else {
            setDocPreviewError('Original document file not available for visual preview.');
          }
          setDocPreviewLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Document loading error:', err);
          setDocPreviewError('Failed to load original document preview.');
          setDocPreviewLoading(false);
        }
      }
    };

    fetchDocumentBlob();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, activeTab, selectedPreviewDoc, courseId]);

  // Dedicated DOCX visual document renderer with docx-preview
  useEffect(() => {
    if (!isOpen || activeTab !== 'preview' || !activeDocBlob || !selectedPreviewDoc || docViewerCollapsed) {
      return;
    }
    const isDocx = selectedPreviewDoc.toLowerCase().endsWith('.docx');
    if (!isDocx) return;

    let cancelled = false;

    const renderWordDocument = async () => {
      const container = docxPreviewContainerRef.current;
      if (!container) return;

      try {
        container.innerHTML = '';
        await renderAsync(activeDocBlob, container, null, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          renderHeaders: true,
          renderFooters: true,
          useBase64URL: true
        });
      } catch (err) {
        if (!cancelled) {
          console.warn('DOCX preview render error:', err);
          const txt = await activeDocBlob.text().catch(() => '');
          if (txt && !txt.startsWith('PK')) {
            setDocPreviewText(txt);
          } else {
            setDocPreviewError('Unable to render full DOCX visual styling.');
          }
        }
      }
    };

    // Small delay ensures DOM container is attached
    const timer = setTimeout(renderWordDocument, 60);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, activeTab, activeDocBlob, selectedPreviewDoc, docViewerCollapsed]);

  if (!isOpen) return null;

  const handleFileSelected = async (file) => {
    if (!file) return;

    // Validate size (max 20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError('File exceeds maximum size limit of 20MB.');
      return;
    }

    // Validate extension
    const validExtensions = ['.docx', '.pdf', '.pptx', '.txt'];
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError(`Invalid file format '${ext}'. Please upload .docx, .pdf, .pptx, or .txt`);
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setIsUploading(true);

    try {
      const result = await uploadNotesFile(file, courseId);
      
      // Save blob for live preview and persist into IndexedDB
      setFileBlobs(prev => ({
        ...prev,
        [file.name]: file
      }));
      setActiveDocBlob(file);
      await saveNoteBlobToIDB(courseId, file.name, file);
      setSelectedPreviewDoc(file.name);

      setUploadSuccess(
        result.message || `Successfully indexed ${result.fileChunks || result.totalChunks} questions from ${file.name}!`
      );
      await loadStatus();
      onNotesUpdated();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload and index reference notes.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleClearAllNotes = async () => {
    if (!window.confirm(`Are you sure you want to clear ALL reference notes for course "${courseId}"?`)) {
      return;
    }
    try {
      await clearCourseNotes(courseId);
      await clearCourseBlobsFromIDB(courseId);
      setFileBlobs({});
      setActiveDocBlob(null);
      setSelectedPreviewDoc(null);
      setUploadSuccess('All course reference notes have been cleared.');
      await loadStatus();
      onNotesUpdated();
    } catch (err) {
      setUploadError(err.message || 'Failed to clear notes.');
    }
  };

  const handleRemoveSingleFile = async (fileName) => {
    if (!window.confirm(`Remove "${fileName}" from course reference notes?`)) {
      return;
    }
    try {
      await clearCourseNotes(courseId, fileName);
      await deleteNoteBlobFromIDB(courseId, fileName);
      setFileBlobs(prev => {
        const next = { ...prev };
        delete next[fileName];
        return next;
      });
      if (selectedPreviewDoc === fileName) {
        setActiveDocBlob(null);
      }
      setUploadSuccess(`Document "${fileName}" has been removed.`);
      await loadStatus();
      onNotesUpdated();
    } catch (err) {
      setUploadError(err.message || `Failed to remove ${fileName}.`);
    }
  };

  const handleCopyChunk = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  // Determine active files list
  const activeFiles = status.files && status.files.length > 0
    ? status.files
    : (status.fileName ? [{ fileName: status.fileName, fileType: status.fileType, totalChunks: status.totalChunks, sampleChunks: status.sampleChunks }] : []);

  // Determine current active document object
  const currentDocObj = activeFiles.find(f => f.fileName === selectedPreviewDoc) || activeFiles[0] || null;

  // Filter chunks: if a specific document is selected, show its questions; otherwise all questions
  const baseChunks = currentDocObj?.sampleChunks?.length
    ? currentDocObj.sampleChunks
    : (status.sampleChunks || []);

  const filteredChunks = baseChunks.filter(chunk =>
    chunk.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-150 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-150 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-gray-900">Teacher's Reference Questions & Notes</h3>
                {status.hasNotes && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Active ({activeFiles.length} {activeFiles.length === 1 ? 'Doc' : 'Docs'} • {status.totalChunks} Qs)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {typeof courseId === 'string' ? courseId.replace(/_/g, ' ') : courseId} {courseTitle ? `— ${courseTitle}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-150 px-6 bg-gray-50/70 text-xs font-bold">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-700 bg-white font-extrabold shadow-2xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Upload size={15} />
            Upload & Files ({activeFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'border-emerald-600 text-emerald-700 bg-white font-extrabold shadow-2xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Layers size={15} />
            Notes Content & Document Preview
            {status.totalChunks > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 rounded-full font-extrabold border border-emerald-300">
                {status.totalChunks}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Messages */}
          {uploadError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3 font-medium animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 flex-1">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError('')}
                className="text-red-600 hover:text-red-900 font-bold px-2 py-1 rounded-lg hover:bg-red-100 transition-colors cursor-pointer text-xs shrink-0"
                title="Dismiss message"
              >
                Dismiss ✕
              </button>
            </div>
          )}
          {uploadSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 font-medium animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 flex-1">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadSuccess('')}
                className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer text-xs shrink-0"
                title="Dismiss message"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: UPLOAD & FILES LIST */}
          {activeTab === 'upload' && (
            <div className="space-y-5">
              
              {/* Active Documents List Card */}
              {status.hasNotes && activeFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck size={15} className="text-emerald-600" />
                      Active Reference Documents ({activeFiles.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleClearAllNotes}
                      className="text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Clear All Notes
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeFiles.map((fileItem, fIdx) => (
                      <div
                        key={fileItem.fileName || fIdx}
                        className="bg-white border border-emerald-200 hover:border-emerald-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-black text-xs uppercase shrink-0">
                            {fileItem.fileType || 'DOC'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-gray-900 truncate" title={fileItem.fileName}>
                                {fileItem.fileName}
                              </h5>
                              <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0">
                                {fileItem.fileType || 'ACTIVE'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                              Contains <strong className="text-emerald-800 font-bold">{fileItem.totalChunks}</strong> questions indexed.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPreviewDoc(fileItem.fileName);
                              setActiveTab('preview');
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Eye size={12} />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSingleFile(fileItem.fileName)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors cursor-pointer"
                            title={`Remove ${fileItem.fileName}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4 text-center text-gray-500 text-xs">
                  No reference notes uploaded for course <strong className="text-gray-700">{courseId}</strong> yet.
                </div>
              )}

              {/* Drag and Drop Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-7 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/60 scale-[0.99]'
                    : 'border-gray-300 hover:border-emerald-400 bg-white hover:bg-gray-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf,.pptx,.txt"
                  className="hidden"
                  onChange={(e) => handleFileSelected(e.target.files?.[0])}
                />

                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                  {isUploading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Upload size={24} />
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-800">
                    {isUploading
                      ? 'Extracting & Indexing Questions...'
                      : activeFiles.length > 0
                        ? 'Upload another question document / sheet (.docx, .pdf, .pptx, .txt)'
                        : 'Click to upload or drag & drop teacher reference notes'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Supports <strong className="text-gray-600">.docx, .pdf, .pptx, .txt</strong> (Max 20MB per file)
                  </p>
                </div>

                <div className="flex gap-1.5 mt-0.5">
                  {['.DOCX', '.PDF', '.PPTX', '.TXT'].map(fmt => (
                    <span key={fmt} className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md border border-gray-200">
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>

              {/* Feature info bullets */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-slate-800 text-xs">
                  <FileCheck size={14} className="text-emerald-600" />
                  Real-time Multi-Document Knowledge Base:
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-[11px] pl-1">
                  <li>You can attach multiple question banks, previous exams, or lecture sheets to a single course.</li>
                  <li>Questions from all documents are cleaned, number-stripped, and indexed for semantic suggestions.</li>
                  <li>Non-question content (course metadata, Bloom legends, commentary) is automatically filtered out.</li>
                </ul>
              </div>

            </div>
          )}

          {/* TAB 2: NOTES CONTENT & DOCUMENT PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              
              {/* Document Selector Bar (if multiple or single files) */}
              {activeFiles.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold px-0.5">
                    <span>Active Documents ({activeFiles.length}):</span>
                    <span className="text-[10px] text-gray-400 font-normal">Click a tab to view document</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {activeFiles.map((fileItem) => {
                      const isSelected = selectedPreviewDoc === fileItem.fileName;
                      return (
                        <button
                          key={fileItem.fileName}
                          type="button"
                          onClick={() => setSelectedPreviewDoc(fileItem.fileName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          <FileText size={13} className={isSelected ? 'text-white' : 'text-emerald-600'} />
                          <span className="max-w-[200px] truncate">{fileItem.fileName}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                            isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {fileItem.totalChunks} Qs
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Document Preview Viewport (Interactive In-Modal Document Viewer) */}
              {selectedPreviewDoc && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  {/* Viewer Top Toolbar */}
                  <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 via-slate-50 to-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-800 min-w-0">
                      <FileText size={15} className="text-emerald-600 shrink-0" />
                      <span className="shrink-0 text-gray-700">Document Viewer:</span>
                      <span className="truncate font-mono text-emerald-800 font-semibold px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200 text-[11px]">
                        {selectedPreviewDoc}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-200 text-gray-700 shrink-0">
                        {selectedPreviewDoc.split('.').pop() || 'DOC'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDocViewerCollapsed(!docViewerCollapsed)}
                        className="flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        {docViewerCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                        <span>{docViewerCollapsed ? 'Show Document' : 'Collapse'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Viewer Content Viewport */}
                  {!docViewerCollapsed && (
                    <div className="p-3 bg-gray-100/70 border-b border-gray-200">
                      {selectedPreviewDoc.toLowerCase().endsWith('.pdf') ? (
                        <PdfDocumentViewer
                          blob={activeDocBlob}
                          fileName={selectedPreviewDoc}
                        />
                      ) : selectedPreviewDoc.toLowerCase().endsWith('.docx') ? (
                        <div className="relative bg-slate-100/90 rounded-xl shadow-inner border border-gray-200 p-3 max-h-[460px] overflow-y-auto">
                          {docPreviewLoading && (
                            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 text-xs bg-white rounded-xl border border-gray-200 shadow-xs mb-3">
                              <Loader2 size={24} className="animate-spin text-emerald-600" />
                              <span className="font-semibold text-gray-700">Rendering original Word document layout...</span>
                            </div>
                          )}
                          {docPreviewError && !docPreviewLoading && (
                            <div className="p-3 mb-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                              <AlertCircle size={15} className="shrink-0" />
                              <span>{docPreviewError}</span>
                            </div>
                          )}
                          <div
                            ref={docxPreviewContainerRef}
                            className={`docx-preview-container max-w-none text-xs ${docPreviewLoading ? 'hidden' : 'block'}`}
                          />
                          {docPreviewText && !docPreviewLoading && (
                            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 whitespace-pre-wrap font-sans text-xs text-gray-800 leading-relaxed">
                              {docPreviewText}
                            </div>
                          )}
                        </div>
                      ) : (selectedPreviewDoc.toLowerCase().endsWith('.pptx') || selectedPreviewDoc.toLowerCase().endsWith('.ppt')) ? (
                        <PresentationViewer
                          slidesData={presentationData}
                          loading={presentationLoading}
                          fallbackText={docPreviewText || (currentDocObj?.sampleChunks || []).join('\n\n')}
                          fileName={selectedPreviewDoc}
                        />
                      ) : (
                        /* Text or general document view */
                        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 max-h-[340px] overflow-y-auto text-xs font-mono text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {docPreviewLoading ? (
                            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                              <Loader2 size={18} className="animate-spin text-emerald-600" />
                              <span>Loading document content...</span>
                            </div>
                          ) : (
                            docPreviewText || (currentDocObj?.sampleChunks || []).join('\n\n') || 'Document content loaded.'
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Section Header: Extracted Pedagogical Questions */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={15} className="text-emerald-600" />
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                    Extracted Reference Questions
                  </h4>
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {currentDocObj?.totalChunks || baseChunks.length} Questions Verified
                  </span>
                </div>
              </div>

              {/* Universal Indexed Questions Search & List */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search questions in this document..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-bold whitespace-nowrap">
                    {filteredChunks.length} of {baseChunks.length} shown
                  </span>
                </div>

                {filteredChunks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    {baseChunks.length > 0
                      ? 'No questions match your search.'
                      : 'No questions indexed for this document yet.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredChunks.map((chunk, idx) => {
                      const cleanChunk = stripQuestionLeadingNumber(chunk);
                      const parsed = parseScenarioAndTable(chunk);
                      const displayQuestion = parsed.scenarioText ? parsed.questionText : cleanChunk;
                      const detected = detectEmbeddedCodeInQuestion(displayQuestion);
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white border border-gray-200 hover:border-emerald-300 rounded-xl text-xs text-gray-800 flex items-start justify-between gap-3 transition-colors shadow-2xs group"
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] shrink-0 border border-emerald-200">
                              #{idx + 1}
                            </span>
                            <div className="space-y-2 flex-1 min-w-0">
                              {/* Scenario Context Callout */}
                              {parsed.scenarioText && (
                                <div className="bg-indigo-50/70 rounded-lg px-2.5 py-1.5 border border-indigo-200/80 text-[11px] text-indigo-900 leading-snug font-medium flex items-start gap-1.5">
                                  <span className="text-indigo-500 shrink-0 mt-0.5">📋</span>
                                  <span className="line-clamp-4">{parsed.scenarioText}</span>
                                </div>
                              )}
                              <p className="leading-relaxed font-medium text-gray-800 break-words">
                                {detected.hasCode ? detected.promptText : displayQuestion}
                              </p>
                              {detected.hasCode && (
                                <div className="bg-gray-900 rounded-lg p-2.5 font-mono text-[10.5px] text-emerald-300 leading-snug overflow-x-auto max-h-[140px] border border-gray-700 shadow-inner select-all">
                                  <pre className="m-0 whitespace-pre font-mono">{detected.codeSnippet}</pre>
                                </div>
                              )}
                              {/* Markdown Table Preview */}
                              {parsed.markdownTable && (
                                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-2xs">
                                  <table className="w-full text-left text-[11px] border-collapse">
                                    <thead>
                                      <tr className="bg-gray-100 border-b border-gray-300">
                                        {parsed.markdownTable.headers.map((h, hi) => (
                                          <th key={hi} className="px-2.5 py-1 font-bold text-gray-800 border-r border-gray-200 last:border-r-0">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {parsed.markdownTable.rows.map((row, ri) => (
                                        <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}>
                                          {row.map((cell, ci) => (
                                            <td key={ci} className="px-2.5 py-1 text-gray-700 border-r border-gray-100 last:border-r-0">{cell}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {onInsertQuestion && (
                              <button
                                type="button"
                                onClick={() => {
                                  onInsertQuestion(cleanChunk);
                                  onClose();
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                                title="Insert question directly into paper"
                              >
                                <Plus size={12} />
                                <span>Insert</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyChunk(cleanChunk, idx)}
                              className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                              title="Copy question text"
                            >
                              {copiedIdx === idx ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-150 bg-gray-50 flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">
            Course: <strong className="text-gray-800">{courseId}</strong> • Total Questions: <strong className="text-emerald-700 font-black">{status.totalChunks || 0}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>

        {/* Word Document Visual Presentation Styles */}
        <style>{`
          .docx-preview-container .docx-wrapper {
            background: transparent !important;
            padding: 0 !important;
          }
          .docx-preview-container .docx-wrapper > section.docx {
            background: #ffffff !important;
            color: #1f2937 !important;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08) !important;
            margin: 0 auto 20px auto !important;
            padding: 28px 36px !important;
            min-height: auto !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 10px !important;
            font-size: 11pt !important;
            line-height: 1.5 !important;
          }
          .docx-preview-container table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin: 10px 0 !important;
          }
          .docx-preview-container table td,
          .docx-preview-container table th {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 10px !important;
          }
        `}</style>

      </div>
    </div>
  );
}
