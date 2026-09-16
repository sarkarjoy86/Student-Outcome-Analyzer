import express from 'express';
import multer from 'multer';

const router = express.Router();

const ML_SERVICE_BASE = (process.env.ML_SERVICE_URL || process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8000').replace('localhost', '127.0.0.1').replace(/\/+$/, '');
const ML_TIMEOUT_MS = 90_000; // 90-second timeout for Render cold-starts

// Configure Multer for in-memory file uploads (up to 20MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

/**
 * Helper to execute fetch to ML service with timeout
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /api/notes/upload
 * Accepts multipart/form-data with 'file' and 'courseId'.
 * Forwards to FastAPI ml-service /api/notes/upload.
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const courseId = req.body.courseId;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required.' });
    }

    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' });
    formData.append('file', blob, file.originalname);
    formData.append('courseId', courseId);

    const mlResponse = await fetchWithTimeout(`${ML_SERVICE_BASE}/api/notes/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await mlResponse.json().catch(() => ({}));

    if (!mlResponse.ok) {
      const isColdStart = mlResponse.status === 502 || mlResponse.status === 503 || mlResponse.status === 504;
      return res.status(mlResponse.status).json({
        success: false,
        status: isColdStart ? 'warming' : 'error',
        message: data.detail || data.message || (isColdStart ? 'ML microservice is warming up.' : 'Failed to index notes in ML service.')
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ success: false, status: 'warming', message: 'Notes indexing timed out.' });
    }
    console.error('[Notes Route Upload Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/notes/suggest
 * Body: { courseId, queryText, topK }
 * Forwards to FastAPI ml-service /api/notes/suggest.
 */
router.post('/suggest', async (req, res) => {
  try {
    const { courseId, queryText, topK = 4 } = req.body;

    if (!courseId || !queryText || !String(queryText).trim()) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    const mlResponse = await fetchWithTimeout(`${ML_SERVICE_BASE}/api/notes/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, queryText, topK })
    });

    const data = await mlResponse.json().catch(() => ({}));

    if (!mlResponse.ok) {
      const isColdStart = mlResponse.status === 502 || mlResponse.status === 503 || mlResponse.status === 504;
      return res.status(mlResponse.status).json({
        success: false,
        status: isColdStart ? 'warming' : 'error',
        message: data.detail || data.message || (isColdStart ? 'ML microservice is warming up.' : 'Failed to fetch suggestions from ML service.')
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ success: false, status: 'warming', message: 'Question suggestion timed out.' });
    }
    console.error('[Notes Route Suggest Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/notes/status/:courseId
 * Forwards to FastAPI ml-service /api/notes/status/:courseId.
 */
router.get('/status/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    const mlResponse = await fetchWithTimeout(`${ML_SERVICE_BASE}/api/notes/status/${encodeURIComponent(courseId)}`, {
      method: 'GET'
    });

    const data = await mlResponse.json().catch(() => ({}));

    if (!mlResponse.ok) {
      const isColdStart = mlResponse.status === 502 || mlResponse.status === 503 || mlResponse.status === 504;
      return res.status(mlResponse.status).json({
        success: false,
        status: isColdStart ? 'warming' : 'error',
        hasNotes: false,
        mlServiceAvailable: false,
        message: data.detail || data.message || (isColdStart ? 'ML microservice is warming up.' : 'Failed to get notes status from ML service.')
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.warn('[Notes Route Status Error - ML service unavailable]:', error.message);
    return res.status(503).json({
      success: false,
      hasNotes: false,
      mlServiceAvailable: false,
      status: 'warming',
      message: 'ML service is currently unavailable or starting up: ' + error.message
    });
  }
});

/**
 * DELETE /api/notes/:courseId
 * Forwards to FastAPI ml-service /api/notes/:courseId.
 */
router.delete('/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { fileName } = req.query;

    let targetUrl = `${ML_SERVICE_BASE}/api/notes/${encodeURIComponent(courseId)}`;
    if (fileName) {
      targetUrl += `?fileName=${encodeURIComponent(fileName)}`;
    }

    const mlResponse = await fetchWithTimeout(targetUrl, {
      method: 'DELETE'
    });

    const data = await mlResponse.json();

    if (!mlResponse.ok) {
      return res.status(mlResponse.status).json({
        success: false,
        message: data.detail || data.message || 'Failed to clear notes in ML service.'
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('[Notes Route Delete Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/notes/file/:courseId/:fileName
 * Streams the raw document file from ml-service for client-side preview.
 */
router.get('/file/:courseId/:fileName', async (req, res) => {
  try {
    const { courseId, fileName } = req.params;
    const targetUrl = `${ML_SERVICE_BASE}/api/notes/file/${encodeURIComponent(courseId)}/${encodeURIComponent(fileName)}`;
    const mlResponse = await fetchWithTimeout(targetUrl);

    if (!mlResponse.ok) {
      return res.status(mlResponse.status).json({ success: false, message: 'Document file not found.' });
    }

    const contentType = mlResponse.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const disposition = mlResponse.headers.get('content-disposition');
    if (disposition) res.setHeader('Content-Disposition', disposition);

    const buffer = Buffer.from(await mlResponse.arrayBuffer());
    return res.send(buffer);
  } catch (error) {
    console.error('[Notes Route File Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

export default router;
