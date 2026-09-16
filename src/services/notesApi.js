/**
 * Client API service for Teacher's Reference Notes & Real-time Question Suggestion
 * 
 * Features:
 * - Client-side LocalStorage persistence: Keeps teacher reference notes strictly
 *   local to the teacher's machine for privacy and offline persistence across reloads/logouts.
 * - Normalized Course Key: Links sections of the same course (e.g., CSE 213 Sec A & Sec B)
 *   to the same notes repository, while strictly isolating different courses (e.g., CSE 223 vs CSE 213).
 * - Multi-document support with individual file removal and aggregate indexing.
 */

import { getApiBaseUrl } from './apiService.js';
import { getNoteBlobFromIDB } from '../utils/notesStorage.js';

const API_BASE = getApiBaseUrl();

// ML service URL if configured directly, else routes through backend gateway /api/notes
const DIRECT_ML_URL = import.meta.env.VITE_ML_SERVICE_URL || import.meta.env.REACT_APP_ML_SERVICE_URL || '';

const LOCAL_STORAGE_KEY_PREFIX = 'teacher_course_notes_';

/**
 * Normalizes a course offering object, course code, or ID to a canonical course key.
 * Sections of the same course (e.g. CSE 213 Sec A, CSE 213 Sec B) produce identical keys ("CSE_213"),
 * ensuring seamless sharing between sections of the same course.
 * Different courses (e.g. CSE 223) produce isolated keys ("CSE_223").
 *
 * @param {string|object} courseInput 
 * @returns {string} e.g. "CSE_213", "CSE_223"
 */
export function getNormalizedCourseKey(courseInput) {
  if (!courseInput) return '';

  let raw = '';
  if (typeof courseInput === 'string') {
    raw = courseInput;
  } else if (typeof courseInput === 'object') {
    if (typeof courseInput.course === 'string') {
      raw = courseInput.course;
    } else {
      raw = courseInput.course?.courseCode ||
            courseInput.course?.code ||
            courseInput.courseCode ||
            courseInput.code ||
            courseInput.course?.courseTitle ||
            courseInput.course?.title ||
            courseInput.course?.name ||
            courseInput.course?._id ||
            courseInput._id || '';
    }
  }

  // Extract course code prefix if raw contains full course title e.g. "CSE 213 — Object..."
  const codeMatch = String(raw).match(/^([a-zA-Z]{2,4}\s*[-_]?\s*\d{3,4}[a-zA-Z]?)/);
  if (codeMatch) {
    raw = codeMatch[1];
  }

  // Sanitize and normalize string: strip outer spaces, uppercase, replace spaces/hyphens with underscore
  return String(raw).trim().toUpperCase().replace(/[\s\-]+/g, '_');
}

/**
 * Returns the effective base URL for notes endpoints.
 * Prioritizes direct ML service if configured, otherwise uses backend gateway.
 */
function getNotesEndpoint(subPath) {
  if (DIRECT_ML_URL) {
    return `${DIRECT_ML_URL.replace(/\/+$/, '')}/api/notes${subPath}`;
  }
  return `${API_BASE}/api/notes${subPath}`;
}

/**
 * Returns the direct URL to stream/download an indexed document file for preview
 * @param {string|object} courseInput
 * @param {string} fileName
 * @returns {string}
 */
export function getNotesFileUrl(courseInput, fileName) {
  const courseKey = getNormalizedCourseKey(courseInput);
  if (!courseKey || !fileName) return '';
  return getNotesEndpoint(`/file/${encodeURIComponent(courseKey)}/${encodeURIComponent(fileName)}`);
}

/**
 * Get internal localStorage key for a course
 */
function getStorageKey(courseInput) {
  const key = getNormalizedCourseKey(courseInput);
  return key ? `${LOCAL_STORAGE_KEY_PREFIX}${key}` : null;
}

/**
 * Synchronously retrieves cached notes metadata from browser LocalStorage.
 * Enables instantaneous UI rendering without any network latency or flicker.
 *
 * @param {string|object} courseInput
 * @returns {{hasNotes: boolean, fileName: string|null, fileType: string|null, totalChunks: number, sampleChunks: string[], files: Array}}
 */
export function getCachedNotesStatus(courseInput) {
  const storageKey = getStorageKey(courseInput);
  if (!storageKey || typeof window === 'undefined' || !window.localStorage) {
    return { hasNotes: false, fileName: null, fileType: null, totalChunks: 0, sampleChunks: [], files: [] };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { hasNotes: false, fileName: null, fileType: null, totalChunks: 0, sampleChunks: [], files: [] };
    }
    const parsed = JSON.parse(raw);
    const files = Array.isArray(parsed.files) ? parsed.files : [];
    let sampleChunks = Array.isArray(parsed.sampleChunks) ? parsed.sampleChunks : [];

    // If root sampleChunks is empty but files have chunks, flatten from files
    if (sampleChunks.length === 0 && files.length > 0) {
      sampleChunks = files.flatMap(f => f.sampleChunks || []).filter(Boolean);
    }

    return {
      hasNotes: Boolean(parsed.hasNotes),
      fileName: parsed.fileName || files[0]?.fileName || null,
      fileType: parsed.fileType || files[0]?.fileType || null,
      totalChunks: Number(parsed.totalChunks) || sampleChunks.length || 0,
      sampleChunks,
      files
    };
  } catch (err) {
    console.warn('[notesApi] getCachedNotesStatus error:', err);
    return { hasNotes: false, fileName: null, fileType: null, totalChunks: 0, sampleChunks: [], files: [] };
  }
}

/**
 * Saves notes metadata to browser LocalStorage for persistent client-side storage.
 * Stores up to 1,000 question chunks locally to ensure zero-latency offline suggestions.
 *
 * @param {string|object} courseInput
 * @param {object} notesData
 */
export function saveNotesToLocalStorage(courseInput, notesData) {
  const storageKey = getStorageKey(courseInput);
  if (!storageKey || !notesData || typeof window === 'undefined' || !window.localStorage) return;

  try {
    const courseKey = getNormalizedCourseKey(courseInput);
    const toStore = {
      courseKey,
      hasNotes: Boolean(notesData.hasNotes),
      fileName: notesData.fileName || null,
      fileType: notesData.fileType || null,
      totalChunks: Number(notesData.totalChunks) || 0,
      sampleChunks: (notesData.sampleChunks || []).slice(0, 1000),
      files: (notesData.files || []).map(f => ({
        fileName: f.fileName,
        fileType: f.fileType,
        totalChunks: Number(f.totalChunks) || 0,
        sampleChunks: (f.sampleChunks || []).slice(0, 1000)
      })),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(toStore));
  } catch (err) {
    console.warn('[notesApi] saveNotesToLocalStorage error:', err);
  }
}

/**
 * Removes or updates LocalStorage when notes or a specific document are cleared.
 *
 * @param {string|object} courseInput
 * @param {string|null} fileName
 */
export function removeNotesFromLocalStorage(courseInput, fileName = null) {
  const storageKey = getStorageKey(courseInput);
  if (!storageKey || typeof window === 'undefined' || !window.localStorage) return;

  try {
    if (!fileName) {
      localStorage.removeItem(storageKey);
      return;
    }

    const current = getCachedNotesStatus(courseInput);
    if (current && Array.isArray(current.files)) {
      const remainingFiles = current.files.filter(f => f.fileName !== fileName);
      if (remainingFiles.length === 0) {
        localStorage.removeItem(storageKey);
      } else {
        const remainingChunks = remainingFiles.reduce((sum, f) => sum + (f.totalChunks || 0), 0);
        const combinedSamples = remainingFiles.flatMap(f => f.sampleChunks || []).slice(0, 100);
        const updated = {
          hasNotes: true,
          fileName: remainingFiles[0].fileName,
          fileType: remainingFiles[0].fileType,
          totalChunks: remainingChunks,
          sampleChunks: combinedSamples,
          files: remainingFiles
        };
        saveNotesToLocalStorage(courseInput, updated);
      }
    }
  } catch (err) {
    console.warn('[notesApi] removeNotesFromLocalStorage error:', err);
  }
}

/**
 * Strips bare leading question numbers (e.g. "12 What...", "9 What...", "5 Why..."),
 * question identifiers ("Q1:", "Question 3:"), revision markers ("15 — NEW"),
 * subpart markers ("(a)", "1.b)"), and full outer quotes, returning pure question text.
 * @param {string} text
 * @returns {string}
 */
export function stripQuestionLeadingNumber(text) {
  if (!text || typeof text !== 'string') return '';
  let s = text.trim();

  // Unwrap full outer quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }

  // Strip leading bullets, dashes, asterisks
  s = s.replace(/^[\s•\-\*]+/, '');

  const prefixRegex = /^(?:(?:(?:Question|Que|Prob|Problem|Q)\s*(?:#|\.)?\s*\d+(?:[\.\)\:\-]\s*|\s+)|\d+(?:\.\d+)*\s*[-—–]\s*(?:NEW|OLD|REVISED)\s*[\n\r\s]*|\d+(?:\.\d+)*\s*[\.\)\:\-]\s*|\d+\s*[\n\r]+\s*|\d+\s+|\([a-zA-Z0-9]+\)\s*|[a-zA-Z][\.\)\:\-]\s+|\b(?:part|section)\s*[-–—:]?\s*[a-zA-Z0-9]+[\.\)\:\-]?\s*))+/i;

  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(prefixRegex, '').trim();
    s = s.replace(/^[\s•\-\:\.]+/, '').trim();
  }

  s = s.replace(/[\t ]+/g, ' ').trim();

  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }

  return s;
}

/**
 * Upload a reference notes document (.docx, .pdf, .pptx, .txt)
 * @param {File} file 
 * @param {string|object} courseInput 
 * @returns {Promise<{success: boolean, courseId: string, fileName: string, totalChunks: number, message: string}>}
 */
export async function uploadNotesFile(file, courseInput) {
  const courseKey = getNormalizedCourseKey(courseInput);
  if (!courseKey) {
    throw new Error('Valid Course ID or Course Offering is required for uploading reference notes.');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseKey);

    const endpoint = getNotesEndpoint('/upload');
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.detail || `Upload failed with status ${response.status}`);
    }

    // Refresh status and synchronize directly with LocalStorage
    try {
      const fresh = await getNotesStatus(courseKey);
      saveNotesToLocalStorage(courseKey, fresh);
    } catch {
      // If direct re-fetch failed, ensure minimal update
      const existing = getCachedNotesStatus(courseKey);
      saveNotesToLocalStorage(courseKey, {
        hasNotes: true,
        fileName: file.name,
        totalChunks: (existing.totalChunks || 0) + (data.totalChunks || 0),
        files: [...(existing.files || []), { fileName: file.name, totalChunks: data.totalChunks || 0 }]
      });
    }

    // Emit event so other tabs/components synchronize seamlessly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher_notes_updated', {
        detail: { courseId: courseKey, action: 'upload', fileName: file.name }
      }));
    }

    return data;
  } catch (error) {
    console.error('[notesApi] uploadNotesFile error:', error);
    throw error;
  }
}

// In-flight sync tracker to prevent duplicate concurrent uploads
const activeSyncCourses = new Set();

/**
 * Searches client-side cached question chunks with 0ms latency.
 * Provides instant live suggestions even if backend ML service is cold or restarting.
 *
 * @param {string|object} courseInput
 * @param {string} queryText
 * @param {number} topK
 * @returns {Array<{id: string, questionText: string, similarity: number, matchPercentage: number, source: string, isLocalMatch: boolean}>}
 */
export function searchLocalCachedNotes(courseInput, queryText, topK = 20) {
  if (!queryText || typeof queryText !== 'string' || queryText.trim().length < 2) return [];

  const courseKey = getNormalizedCourseKey(courseInput);
  if (!courseKey) return [];

  const cached = getCachedNotesStatus(courseKey);
  if (!cached || !cached.hasNotes) return [];

  const rawChunks = [
    ...(cached.sampleChunks || []),
    ...(cached.files || []).flatMap(f => f.sampleChunks || [])
  ];

  if (rawChunks.length === 0) return [];

  // Deduplicate raw chunks
  const uniqueQuestions = Array.from(new Set(rawChunks.map(c => stripQuestionLeadingNumber(c)).filter(Boolean)));
  if (uniqueQuestions.length === 0) return [];

  const cleanQuery = queryText.trim().toLowerCase();
  // Split into tokens of 2+ characters
  const queryTokens = cleanQuery
    .split(/[\s,.;:?!'"`()[\]{}]+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length >= 2);

  const matches = [];

  for (let i = 0; i < uniqueQuestions.length; i++) {
    const qText = uniqueQuestions[i];
    const qLower = qText.toLowerCase();

    let score = 0;

    // 1. Direct prefix match (e.g. "how" at the very beginning of the question)
    if (qLower.startsWith(cleanQuery)) {
      score = 0.98;
    }
    // 2. Direct substring match (e.g. "how" somewhere in the question)
    else if (qLower.includes(cleanQuery)) {
      // Reward matches closer to the beginning of the sentence
      const idx = qLower.indexOf(cleanQuery);
      score = idx < 15 ? 0.94 : 0.88;
    }
    // 3. Multi-token overlap scoring
    else if (queryTokens.length > 0) {
      let matchedCount = 0;
      for (const tok of queryTokens) {
        if (qLower.includes(tok)) {
          matchedCount++;
        }
      }
      const ratio = matchedCount / queryTokens.length;
      if (ratio >= 0.5) {
        score = 0.65 + (0.28 * ratio);
      }
    }

    if (score > 0) {
      // Small bonus if it's formatted as a full question
      if (qText.includes('?')) score = Math.min(score + 0.01, 0.99);

      matches.push({
        id: `local-note-${i}-${qText.slice(0, 16).replace(/\W+/g, '')}`,
        questionText: qText,
        similarity: Number(score.toFixed(2)),
        matchPercentage: Math.round(score * 100),
        source: cached.fileName || 'Reference Questions',
        isLocalMatch: true
      });
    }
  }

  // Sort descending by similarity score
  matches.sort((a, b) => b.similarity - a.similarity);
  return matches.slice(0, topK);
}

/**
 * Silently re-syncs reference note document Blobs from browser IndexedDB to the ML microservice.
 * Runs in the background whenever Render's ephemeral container wipes in-memory cache upon restart.
 *
 * @param {string|object} courseInput
 * @returns {Promise<boolean>}
 */
export async function syncNotesBlobToBackend(courseInput) {
  const courseKey = getNormalizedCourseKey(courseInput);
  if (!courseKey || activeSyncCourses.has(courseKey)) return false;

  const cached = getCachedNotesStatus(courseKey);
  if (!cached || !cached.hasNotes) return false;

  activeSyncCourses.add(courseKey);

  try {
    // Check if server already has notes loaded to avoid redundant uploads
    const statusUrl = getNotesEndpoint(`/status/${encodeURIComponent(courseKey)}`);
    const statusRes = await fetch(statusUrl).catch(() => null);
    if (statusRes && statusRes.ok) {
      const statusData = await statusRes.json().catch(() => ({}));
      if (statusData.hasNotes && (statusData.totalChunks > 0 || (statusData.files && statusData.files.length > 0))) {
        activeSyncCourses.delete(courseKey);
        return true;
      }
    }

    console.info(`[notesApi] Server has 0 chunks for ${courseKey}. Auto-syncing document Blob from IndexedDB...`);

    const filesToSync = (cached.files && cached.files.length > 0)
      ? cached.files
      : (cached.fileName ? [{ fileName: cached.fileName }] : []);

    let syncedCount = 0;

    for (const f of filesToSync) {
      const fileName = f.fileName;
      if (!fileName) continue;

      const blob = await getNoteBlobFromIDB(courseKey, fileName);
      if (!blob) {
        console.warn(`[notesApi] No stored IndexedDB blob found for ${courseKey} - ${fileName}`);
        continue;
      }

      console.info(`[notesApi] Uploading ${fileName} (${blob.size} bytes) to server for ${courseKey}...`);
      const fileObj = new File([blob], fileName, {
        type: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        lastModified: Date.now()
      });

      const formData = new FormData();
      formData.append('file', fileObj);
      formData.append('courseId', courseKey);

      const uploadUrl = getNotesEndpoint('/upload');
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json().catch(() => ({}));
        syncedCount++;
        console.info(`[notesApi] Successfully re-synced ${fileName} to server! Chunks: ${uploadData.totalChunks || uploadData.fileChunks}`);
      } else {
        console.warn(`[notesApi] Re-sync upload failed with HTTP status ${uploadRes.status}`);
      }
    }

    return syncedCount > 0;
  } catch (err) {
    console.warn('[notesApi] syncNotesBlobToBackend error:', err.message);
    return false;
  } finally {
    activeSyncCourses.delete(courseKey);
  }
}

/**
 * Get suggestions from notes for a given question query text.
 * Integrates dual-engine fallback:
 * 1. Queries backend ML service for neural embeddings.
 * 2. Instant client-side candidate search from local cache if server is warming, empty, or unreachable.
 *
 * @param {string|object} courseInput 
 * @param {string} queryText 
 * @param {number} topK 
 * @param {AbortSignal|null} signal
 * @returns {Promise<Array<{id: string|number, questionText: string, similarity: number, matchPercentage: number}>>}
 */
export async function suggestQuestionsFromNotes(courseInput, queryText, topK = 20, signal = null) {
  try {
    const courseKey = getNormalizedCourseKey(courseInput);
    if (!courseKey || !queryText || queryText.trim().length < 2) {
      return [];
    }

    const trimmedQuery = queryText.trim();

    // 1. Instant local search from cached sample chunks (0ms latency fallback)
    const localMatches = searchLocalCachedNotes(courseKey, trimmedQuery, topK);

    // 2. Fetch semantic suggestions from backend ML service with a 4s timeout
    let serverSuggestions = [];
    let serverHadEmptyNotes = false;

    try {
      const endpoint = getNotesEndpoint('/suggest');
      const fetchPromise = fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: courseKey,
          queryText: trimmedQuery,
          topK,
        }),
        ...(signal ? { signal } : {}),
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Suggest fetch timeout')), 4000)
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response.ok) {
        const data = await response.json();
        const rawSuggestions = data.suggestions || [];
        if (rawSuggestions.length > 0) {
          serverSuggestions = rawSuggestions.map(item => ({
            ...item,
            questionText: stripQuestionLeadingNumber(item.questionText)
          }));
        } else {
          serverHadEmptyNotes = true;
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn('[notesApi] Backend suggest warning, using local candidate search:', err.message);
    }

    // If server returned empty suggestions, trigger silent background re-sync
    if (serverHadEmptyNotes) {
      syncNotesBlobToBackend(courseKey).catch(() => {});
    }

    // If server returned results, merge with any high-confidence local matches
    if (serverSuggestions.length > 0) {
      const seen = new Set(serverSuggestions.map(s => s.questionText.toLowerCase().trim()));
      const combined = [...serverSuggestions];
      for (const loc of localMatches) {
        const norm = loc.questionText.toLowerCase().trim();
        if (!seen.has(norm) && combined.length < topK) {
          combined.push(loc);
          seen.add(norm);
        }
      }
      return combined;
    }

    // Fall back to instant local candidate search results
    return localMatches;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.warn('[notesApi] suggestQuestionsFromNotes error:', error.message);
    const courseKey = getNormalizedCourseKey(courseInput);
    return searchLocalCachedNotes(courseKey, queryText, topK);
  }
}

/**
 * Fetch current indexed notes status for a course.
 * Automatically synchronizes with browser LocalStorage for privacy, security, and offline resilience.
 *
 * @param {string|object} courseInput 
 * @returns {Promise<{hasNotes: boolean, fileName: string|null, fileType: string|null, totalChunks: number, sampleChunks: string[], files: Array}>}
 */
export async function getNotesStatus(courseInput) {
  const courseKey = getNormalizedCourseKey(courseInput);
  if (!courseKey) {
    return { hasNotes: false, fileName: null, fileType: null, totalChunks: 0, sampleChunks: [], files: [] };
  }

  // 1. Instant snapshot from LocalStorage
  const cached = getCachedNotesStatus(courseKey);

  try {
    const endpoint = getNotesEndpoint(`/status/${encodeURIComponent(courseKey)}`);
    const response = await fetch(endpoint, {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      const rawChunks = data.sampleChunks || [];
      const cleanedChunks = rawChunks.map(c => stripQuestionLeadingNumber(c)).filter(Boolean);

      const files = (data.files || []).map(f => ({
        fileName: f.fileName,
        fileType: f.fileType,
        totalChunks: f.totalChunks || 0,
        sampleChunks: (f.sampleChunks || []).map(c => stripQuestionLeadingNumber(c)).filter(Boolean)
      }));

      const freshStatus = {
        hasNotes: Boolean(data.hasNotes),
        fileName: data.fileName || (files[0]?.fileName || null),
        fileType: data.fileType || (files[0]?.fileType || null),
        totalChunks: data.totalChunks || cleanedChunks.length,
        sampleChunks: cleanedChunks,
        files: files
      };

      // Synchronize with LocalStorage
      if (freshStatus.hasNotes && freshStatus.totalChunks > 0) {
        saveNotesToLocalStorage(courseKey, freshStatus);
        return freshStatus;
      }

      // If server returned hasNotes: false, but client has cached notes from a previous session,
      // preserve local cache rather than wiping it out, and trigger silent re-sync!
      if (cached && cached.hasNotes) {
        console.warn(`[notesApi] Server returned no notes for ${courseKey}, preserving local cache (${cached.totalChunks} chunks) and triggering silent re-sync`);
        syncNotesBlobToBackend(courseKey).catch(() => {});
        return cached;
      }

      return freshStatus;
    }
  } catch (error) {
    console.warn('[notesApi] ML service getNotesStatus warning, falling back to LocalStorage cache:', error.message);
  }

  // Fallback to client LocalStorage snapshot if ML service is unreachable or restarting
  if (cached && cached.hasNotes) {
    syncNotesBlobToBackend(courseKey).catch(() => {});
  }
  return cached;
}

/**
 * Clear indexed notes for a course or remove a specific file.
 * Synchronizes with both local ML service and browser LocalStorage.
 *
 * @param {string|object} courseInput 
 * @param {string|null} fileName 
 * @returns {Promise<{success: boolean, cleared: boolean, message: string}>}
 */
export async function clearCourseNotes(courseInput, fileName = null) {
  const courseKey = getNormalizedCourseKey(courseInput);
  if (!courseKey) return { success: false, cleared: false };

  try {
    let endpoint = getNotesEndpoint(`/${encodeURIComponent(courseKey)}`);
    if (fileName) {
      endpoint += `?fileName=${encodeURIComponent(fileName)}`;
    }

    const response = await fetch(endpoint, {
      method: 'DELETE',
    });

    const data = await response.json();

    // Immediately remove from LocalStorage
    removeNotesFromLocalStorage(courseKey, fileName);

    // Notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher_notes_updated', {
        detail: { courseId: courseKey, action: 'delete', fileName }
      }));
    }

    return data;
  } catch (error) {
    console.error('[notesApi] clearCourseNotes error:', error);
    removeNotesFromLocalStorage(courseKey, fileName);
    throw error;
  }
}

/**
 * Fetch structured slide-by-slide data for a PPTX document
 * @param {string|object} courseInput
 * @param {string} fileName
 * @returns {Promise<{success: boolean, fileName: string, totalSlides: number, slides: Array}>}
 */
export async function getPresentationSlides(courseInput, fileName) {
  try {
    const courseKey = getNormalizedCourseKey(courseInput);
    if (!courseKey || !fileName) return null;
    const endpoint = getNotesEndpoint(`/slides/${encodeURIComponent(courseKey)}/${encodeURIComponent(fileName)}`);
    const res = await fetch(endpoint);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[notesApi] getPresentationSlides warning:', err.message);
  }
  return null;
}
