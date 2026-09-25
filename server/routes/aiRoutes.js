import express from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// ---------------------------------------------------------------------------
// Local NLP Microservice Configuration (Python FastAPI @ localhost:8000)
// ---------------------------------------------------------------------------
const NLP_SERVICE_BASE = (process.env.ML_SERVICE_URL || process.env.NLP_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '')
const NLP_FETCH_TIMEOUT_MS = 120_000 // 120-second timeout for Render cold-starts & SBERT inference

/**
 * Checks whether the local/remote NLP microservice is reachable.
 * Returns { online: true, status: 'ready', device, gpu_name } or { online: false, status: 'warming' | 'offline' }.
 */
async function checkNlpServiceHealth(timeoutMs = 6000) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(`${NLP_SERVICE_BASE}/health`, { signal: controller.signal })
    clearTimeout(timer)
    if (response.ok) {
      const data = await response.json().catch(() => ({}))
      return {
        online: true,
        status: data.status === 'online' ? 'ready' : (data.status || 'ready'),
        device: data.device || 'cpu',
        gpu_name: data.gpu_name || null,
        models: data.models || null
      }
    }
    return { online: false, status: 'warming', httpStatus: response.status }
  } catch (err) {
    return { online: false, status: 'warming', error: err.message }
  }
}

/**
 * GET /api/ai/ml-status
 * Health & readiness probe for frontend JIT pre-warming engine
 */
router.get('/ml-status', async (req, res) => {
  try {
    const timeout = req.query.timeout ? Math.min(30000, Math.max(1000, Number(req.query.timeout))) : 6000
    const health = await checkNlpServiceHealth(timeout)
    return res.json({
      success: true,
      serviceUrl: NLP_SERVICE_BASE,
      ...health
    })
  } catch (err) {
    return res.json({
      success: true,
      online: false,
      status: 'offline',
      error: err.message
    })
  }
})

/**
 * POST /api/ai/ml-wake
 * Silent JIT pre-warming ping to eliminate cold-start latency before user interactions
 */
router.post('/ml-wake', async (req, res) => {
  try {
    const waitForReady = req.body?.waitForReady === true
    const timeoutMs = waitForReady ? 50_000 : 35_000
    const health = await checkNlpServiceHealth(timeoutMs)
    return res.json({
      success: true,
      waking: true,
      online: health.online,
      status: health.status || (health.online ? 'ready' : 'warming'),
      timestamp: Date.now()
    })
  } catch (err) {
    return res.json({
      success: true,
      waking: true,
      online: false,
      status: 'warming',
      error: err.message,
      timestamp: Date.now()
    })
  }
})

/**
 * POST /api/ai/ml-heartbeat
 * Keep-alive heartbeat strictly scoped to active Question Paper Editor sessions
 */
router.post('/ml-heartbeat', async (req, res) => {
  try {
    const health = await checkNlpServiceHealth(5000)
    return res.json({
      success: true,
      heartbeat: true,
      online: health.online,
      status: health.status || (health.online ? 'ready' : 'warming'),
      timestamp: Date.now()
    })
  } catch (err) {
    return res.json({
      success: true,
      heartbeat: true,
      online: false,
      status: 'warming',
      timestamp: Date.now()
    })
  }
})

// Local smart semantic similarity fallback analyzer (keyword-based, no ML)
function computeLocalSimilarityFallback(currentPaperText, archiveText) {
  try {
    const cleanCurrent = String(currentPaperText || '').toLowerCase().replace(/\[\d+\]|\[CO\d+[-\w]*\]/gi, '').trim()
    const cleanArchive = String(archiveText || '').toLowerCase().replace(/\[\d+\]|\[CO\d+[-\w]*\]/gi, '').trim()

    const currentQuestions = cleanCurrent.split(/(?=\b\d+\.|\b[a-c]\.|\bOR\b)/i).map(s => s.trim()).filter(s => s.length > 15)
    const archiveQuestions = cleanArchive.split(/(?=\b\d+\.|\b[a-c]\.|\bOR\b)/i).map(s => s.trim()).filter(s => s.length > 15)

    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'with', 'using', 'explain', 'compare', 'analyze', 'illustrate', 'describe', 'suitable', 'examples', 'real-life', 'for', 'to', 'of', 'how', 'what', 'why', 'your', 'their'])

    const matchedQuestions = []
    let totalScore = 0

    for (const qCurr of currentQuestions) {
      const wordsCurr = qCurr.split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))
      if (wordsCurr.length === 0) continue

      let bestMatch = null
      let bestScore = 0

      for (const qArch of archiveQuestions) {
        const wordsArch = qArch.split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))
        if (wordsArch.length === 0) continue

        const commonWords = wordsCurr.filter(w => wordsArch.includes(w))
        const score = Math.round((commonWords.length * 2 / (wordsCurr.length + wordsArch.length)) * 100)

        if (score > bestScore) {
          bestScore = score
          bestMatch = { qCurr, qArch, score, commonWords }
        }
      }

      if (bestMatch && bestScore >= 15) {
        matchedQuestions.push({
          currentQ: String(bestMatch.qCurr || '').substring(0, 200),
          archivedQ: String(bestMatch.qArch || '').substring(0, 200),
          similarity: Math.min(95, Math.max(15, Math.round(bestMatch.score * 1.5))),
          explanation: `Shares key academic concepts: ${bestMatch.commonWords.slice(0, 4).join(', ')}.`
        })
        totalScore += Math.min(95, Math.max(15, Math.round(bestMatch.score * 1.5)))
      }
    }

    const overallSimilarity = matchedQuestions.length > 0
      ? Math.min(95, Math.round(totalScore / Math.max(1, matchedQuestions.length)))
      : 0

    let verdict = 'Original'
    if (overallSimilarity > 60) verdict = 'High Overlap'
    else if (overallSimilarity > 30) verdict = 'Moderate Overlap'
    else if (overallSimilarity > 0) verdict = 'Low Overlap'

    return {
      overallSimilarity,
      verdict,
      matchedQuestions,
      summary: matchedQuestions.length > 0
        ? `Detected ${matchedQuestions.length} matched question topic(s) with ${overallSimilarity}% overall similarity.`
        : 'No content overlap found.'
    }
  } catch (err) {
    console.error('computeLocalSimilarityFallback error:', err)
    return {
      overallSimilarity: 0,
      verdict: 'Original',
      matchedQuestions: [],
      summary: 'No content overlap found.'
    }
  }
}

/**
 * POST /api/ai/rte-assist
 * Proxies AI requests from the Syncfusion RTE AI Assistant to Google Gemini (FREE).
 */
router.post('/rte-assist', requireAuth, async (req, res) => {
  try {
    const { prompt, selectedText } = req.body

    if (!prompt && !selectedText) {
      return res.status(400).json({ success: false, message: 'No prompt or text provided.' })
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim()
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: 'AI features are not configured. Please add GEMINI_API_KEY to your .env file.'
      })
    }

    const systemPrompt = `You are an expert AI assistant for an Outcome-Based Education (OBE) university question paper system used by professors.
Your role is to help teachers refine, improve, summarize, elaborate, check grammar, or translate exam questions.

STRICT ACADEMIC RULES:
1. Preserve technical accuracy, computer science/engineering terminology, mathematical formulas, Big-O notations, algorithm names, code snippets, and mark allocations.
2. Structure output cleanly using numbered points or paragraphs suitable for university exam papers.
3. Return ONLY the finalized content without conversational preambles (e.g. do NOT write "Here is the revised question:"). Do not wrap output in markdown code blocks unless requested.
4. Maintain any HTML formatting in the input.`

    const userMessage = selectedText
      ? `${prompt}\n\nText to process:\n${selectedText}`
      : prompt

    let aiContent = ''

    const assistModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3-flash-preview',
      'gemini-flash-latest'
    ]

    const endpointsToTry = assistModels.map(model => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      body: {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      }
    }))

    let lastErrorMsg = ''

    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(ep.body)
        })

        const data = await response.json()

        if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          aiContent = data.candidates[0].content.parts[0].text.trim()
          if (aiContent) break // Success! Exit loop
        } else {
          lastErrorMsg = data?.error?.message || data?.message || `HTTP ${response.status}`
          console.warn(`Gemini endpoint failed (${response.status}):`, lastErrorMsg)
        }
      } catch (fetchErr) {
        lastErrorMsg = fetchErr.message
      }
    }

    if (!aiContent) {
      return res.status(502).json({
        success: false,
        message: `AI Service Error: ${lastErrorMsg || 'Unable to generate response from Gemini API.'}`
      })
    }

    return res.json({ success: true, content: aiContent })
  } catch (error) {
    console.error('AI assist handler error:', error)
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` })
  }
})

/**
 * POST /api/ai/swot-generate
 * Generates course-oriented SWOT Analysis JSON using Gemini API
 */
router.post('/swot-generate', async (req, res) => {
  try {
    const { promptText } = req.body
    if (!promptText) {
      return res.status(400).json({ success: false, message: 'No prompt text provided.' })
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim()
    if (!apiKey) {
      return res.status(533).json({
        success: false,
        message: 'GEMINI_API_KEY is missing in server .env file.'
      })
    }

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.5-flash-lite'
    ]

    const endpointsToTry = modelsToTry.map(model => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      body: {
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.85 }
      }
    }))

    let aiContent = ''
    let lastErrorMsg = ''

    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(ep.body)
        })

        const data = await response.json()

        if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          aiContent = data.candidates[0].content.parts[0].text.trim()
          if (aiContent) break
        } else {
          lastErrorMsg = data?.error?.message || data?.message || `HTTP ${response.status}`
          console.warn(`Gemini endpoint failed (${response.status}):`, lastErrorMsg)
        }
      } catch (fetchErr) {
        lastErrorMsg = fetchErr.message
      }
    }

    if (!aiContent) {
      return res.status(502).json({
        success: false,
        message: `Gemini API Error: ${lastErrorMsg}`
      })
    }

    return res.json({ success: true, content: aiContent })
  } catch (error) {
    console.error('SWOT AI handler error:', error)
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` })
  }
})

// ===========================================================================
// LOCAL NLP MICROSERVICE ROUTES (Sentence-BERT + Zero-Shot on CUDA / CPU)
// ===========================================================================

/**
 * POST /api/ai/suggest-metadata
 * Routes to the local NLP microservice for Bloom's Taxonomy classification
 * and Course Outcome (CO) mapping using SBERT + Zero-Shot Classification.
 * Accepts both camelCase (questionText, courseOutcomes) and snake_case (question_text, course_outcomes).
 */
router.post('/suggest-metadata', async (req, res) => {
  try {
    const rawQuestion = req.body.questionText || req.body.question_text || ''
    const rawOutcomes = req.body.courseOutcomes || req.body.course_outcomes || []

    const questionText = String(rawQuestion).trim()
    if (!questionText) {
      return res.status(400).json({ success: false, message: 'No question text provided.' })
    }

    // Normalize course outcomes to guarantee required FastAPI keys (code, description)
    const normalizedOutcomes = (Array.isArray(rawOutcomes) ? rawOutcomes : []).map(item => ({
      id: item?.id || item?._id || item?.code || '',
      code: item?.code || item?.id || item?.coCode || '',
      description: item?.description || item?.desc || item?.coDescription || ''
    }))

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), NLP_FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(`${NLP_SERVICE_BASE}/suggest-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText,
          courseOutcomes: normalizedOutcomes
        }),
        signal: controller.signal
      })
      clearTimeout(timer)

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error(`[Suggest-Metadata] NLP service returned ${response.status}:`, data)
        const isColdStart = response.status === 502 || response.status === 503 || response.status === 504
        return res.status(response.status).json({
          success: false,
          status: isColdStart ? 'warming' : 'error',
          retryAfter: isColdStart ? 4 : undefined,
          message: data?.detail || data?.message || (isColdStart ? 'ML microservice is warming up.' : 'NLP metadata suggestion failed.')
        })
      }

      return res.json({ success: true, ...data })
    } catch (fetchErr) {
      clearTimeout(timer)
      if (fetchErr.name === 'AbortError') {
        console.error('[Suggest-Metadata] NLP service request timed out (90s limit).')
        return res.status(504).json({
          success: false,
          status: 'warming',
          retryAfter: 5,
          message: 'ML service cold-start timed out. The container is warming up, please retry shortly.'
        })
      }

      console.warn('[Suggest-Metadata] Direct fetch to ML service failed:', fetchErr.message)
      return res.status(503).json({
        success: false,
        status: 'warming',
        retryAfter: 5,
        message: 'ML microservice is starting up or temporarily offline. Retrying automatically...'
      })
    }
  } catch (error) {
    console.error('[Suggest-Metadata] handler error:', error)
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` })
  }
})

/**
 * POST /api/ai/similarity-check
 * Routes to the local NLP microservice for SBERT-powered semantic similarity.
 * Falls back to local keyword-based analysis if the NLP service is unreachable.
 */
router.post('/similarity-check', requireAuth, async (req, res) => {
  try {
    const { currentPaperText, archivedPapers } = req.body

    console.log(`[Similarity Check] Received request: currentPaperText length=${(currentPaperText || '').length}, archivedPapers count=${Array.isArray(archivedPapers) ? archivedPapers.length : 0}`)

    if (!currentPaperText || !currentPaperText.trim()) {
      return res.status(400).json({ success: false, message: 'No current paper text provided.' })
    }

    if (!Array.isArray(archivedPapers) || archivedPapers.length === 0) {
      return res.status(200).json({ success: true, results: [], maxSimilarity: 0, totalArchivesCompared: 0, message: 'No archived papers to compare against.' })
    }

    // Route directly through the ML microservice for Sentence-BERT analysis
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), NLP_FETCH_TIMEOUT_MS)

      const nlpResponse = await fetch(`${NLP_SERVICE_BASE}/similarity-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPaperText, archivedPapers }),
        signal: controller.signal
      })
      clearTimeout(timer)

      if (nlpResponse.ok) {
        const nlpData = await nlpResponse.json().catch(() => ({}))
        if (nlpData && nlpData.success) {
          console.log(`[Similarity Check] ✓ NLP service returned results — maxSimilarity=${nlpData.maxSimilarity}%`)
          return res.json(nlpData)
        }
      }

      const isColdStart = nlpResponse.status === 502 || nlpResponse.status === 503 || nlpResponse.status === 504
      if (isColdStart) {
        return res.status(nlpResponse.status).json({
          success: false,
          status: 'warming',
          message: 'ML microservice is warming up.'
        })
      }
    } catch (nlpErr) {
      console.warn(`[Similarity Check] ML service fetch failed (${nlpErr.message})`)
      return res.status(503).json({
        success: false,
        status: 'warming',
        message: 'ML microservice is warming up.'
      })
    }

    // -----------------------------------------------------------------------
    // Fallback: Keyword-based local similarity analysis (no ML, no API key)
    // -----------------------------------------------------------------------
    const results = []

    for (let i = 0; i < archivedPapers.length; i++) {
      try {
        const archive = archivedPapers[i]
        const parsed = computeLocalSimilarityFallback(currentPaperText, archive.text || '')

        results.push({
          archiveId: archive.id,
          assessmentName: archive.assessmentName || 'Unknown',
          semester: archive.semester || '',
          section: archive.section || '',
          batch: archive.batch || '',
          isCurrentSemester: Boolean(archive.isCurrentSemester),
          overallSimilarity: Math.min(100, Math.max(0, Number(parsed?.overallSimilarity) || 0)),
          verdict: parsed?.verdict || 'Original',
          matchedQuestions: Array.isArray(parsed?.matchedQuestions) ? parsed.matchedQuestions : [],
          summary: parsed?.summary || 'Analysis complete.'
        })
      } catch (archiveErr) {
        console.error(`[Similarity] Error processing archive ${i}:`, archiveErr.message)
        results.push({
          archiveId: archivedPapers[i]?.id || `archive-${i}`,
          assessmentName: archivedPapers[i]?.assessmentName || 'Unknown',
          semester: archivedPapers[i]?.semester || '',
          section: archivedPapers[i]?.section || '',
          batch: archivedPapers[i]?.batch || '',
          isCurrentSemester: Boolean(archivedPapers[i]?.isCurrentSemester),
          overallSimilarity: 0,
          verdict: 'Original',
          matchedQuestions: [],
          summary: 'Could not analyze this paper.'
        })
      }
    }

    results.sort((a, b) => b.overallSimilarity - a.overallSimilarity)

    const maxSimilarity = results.length > 0 ? Math.max(...results.map(r => r.overallSimilarity)) : 0

    return res.json({
      success: true,
      maxSimilarity,
      totalArchivesCompared: archivedPapers.length,
      results
    })
  } catch (error) {
    console.error('Similarity check handler error:', error)
    return res.status(200).json({ success: false, message: `Similarity Check Error: ${error.message}` })
  }
})

/**
 * POST /api/ai/smart-code-output
 * Accurately analyzes university exam code snippets (C++, C, Python, Pseudocode)
 * to predict stdout or identify Compilation / Syntax / Runtime errors.
 */
router.post('/smart-code-output', async (req, res) => {
  try {
    const { code, language = 'cpp' } = req.body

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'No code provided for execution analysis.' })
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim()
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured in server .env file.'
      })
    }

    const systemPrompt = `You are an expert compiler, code execution engine, and computer science professor evaluating exam questions.
Analyze the provided university exam code snippet (${language}) and determine:
1. The EXACT standard console output (stdout) if the code compiles and runs successfully.
2. If the code has errors (intentional trick question or syntax/logic mistake by the professor, e.g. private member access, const violation, missing semicolon, undeclared variable, infinite loop/recursion, type error, zero division):
   Identify if it is a "Compilation Error", "Syntax Error", or "Runtime Error" and explain the exact issue clearly.
3. If language is Pseudocode, simulate the algorithm trace and return the expected output or result.

STRICT JSON FORMAT:
Return ONLY a valid JSON object without markdown fences, matching this structure:
{
  "status": "SUCCESS" | "COMPILATION_ERROR" | "RUNTIME_ERROR" | "PSEUDOCODE_RESULT",
  "output": "Exact stdout string or algorithm result (null if error prevents output)",
  "errorType": "Compilation Error" | "Syntax Error" | "Runtime Error" | null,
  "explanation": "Concise 1-2 sentence academic explanation of the result or error cause"
}
Rules:
- Be strictly accurate. In C++, accessing private members from main() is COMPILATION_ERROR.
- If no output is produced due to error, output MUST be null or an empty string.
- Keep explanation concise to minimize token usage.`

    const userMessage = `Language: ${language}\n\nCode:\n\`\`\`${language}\n${code.trim()}\n\`\`\``

    const endpointsToTry = [
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        body: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 800
          }
        }
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
        body: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 800
          }
        }
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${encodeURIComponent(apiKey)}`,
        body: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 800
          }
        }
      }
    ]

    let resultJson = null
    let lastErrorMsg = ''

    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(ep.body)
        })

        const data = await response.json()
        if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text.trim()
          try {
            resultJson = JSON.parse(rawText)
            if (resultJson) break
          } catch (pErr) {
            const match = rawText.match(/\{[\s\S]*\}/)
            if (match) {
              resultJson = JSON.parse(match[0])
              if (resultJson) break
            }
          }
        } else {
          lastErrorMsg = data?.error?.message || data?.message || `HTTP ${response.status}`
        }
      } catch (fErr) {
        lastErrorMsg = fErr.message
      }
    }

    if (!resultJson) {
      return res.status(502).json({
        success: false,
        message: `Smart Output failed: ${lastErrorMsg || 'Unable to simulate code execution.'}`
      })
    }

    return res.json({
      success: true,
      data: resultJson
    })
  } catch (err) {
    console.error('[Smart-Code-Output] handler error:', err)
    return res.status(500).json({ success: false, message: `Server error: ${err.message}` })
  }
})

export default router
