import express from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Local smart semantic similarity fallback analyzer
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

    const endpointsToTry = [
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
        body: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        }
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        body: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        }
      }
    ]

    let lastErrorMsg = ''

    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

    const endpointsToTry = [
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        body: {
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.85 }
        }
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
        body: {
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.85 }
        }
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        body: {
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.85 }
        }
      }
    ]

    let aiContent = ''
    let lastErrorMsg = ''

    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

/**
 * POST /api/ai/similarity-check
 * Compares the current question paper against archived papers using Gemini AI
 * for intelligent semantic similarity detection.
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

    const apiKey = (process.env.GEMINI_API_KEY || '').trim()

    // Truncate current paper text for prompts
    const currentTextTruncated = currentPaperText.substring(0, 5000)

    const results = []

    // Process archives one-by-one to avoid rate limits
    for (let i = 0; i < archivedPapers.length; i++) {
      try {
        const archive = archivedPapers[i]
        const archiveTextTruncated = (archive.text || '').substring(0, 5000)

        let parsed = null

        // Try Gemini AI if API key is available
        if (apiKey && archiveTextTruncated.length > 10) {
          const prompt = `You are an expert academic exam paper similarity analyzer.

TASK: Compare CURRENT question paper against an ARCHIVED question paper. Find questions that test the same concepts.

CURRENT QUESTION PAPER:
"""
${currentTextTruncated}
"""

ARCHIVED QUESTION PAPER (${archive.assessmentName || 'Unknown'} — ${archive.semester || ''} — Section ${archive.section || ''}):
"""
${archiveTextTruncated}
"""

RULES:
1. IGNORE headers, university names, course codes, instructions, mark allocations like "[10]" or "[CO1-C4]".
2. FOCUS on the actual exam questions and what concepts they test.
3. Questions are "similar" if they test the SAME concept/topic even if worded differently.
4. Be thorough — if both papers have questions about the same OOP concept (inheritance, polymorphism, encapsulation, abstraction, constructors, etc.), flag them.
5. Return overallSimilarity as a percentage reflecting how much question content overlaps.

Return ONLY valid JSON:
{
  "overallSimilarity": <number 0-100>,
  "verdict": "<Original|Low Overlap|Moderate Overlap|High Overlap|Heavily Reused>",
  "matchedQuestions": [
    {
      "currentQ": "<question text from current paper>",
      "archivedQ": "<question text from archived paper>",
      "similarity": <number 0-100>,
      "explanation": "<why these questions are similar>"
    }
  ],
  "summary": "<1-2 sentence summary>"
}`

          // Try up to 3 attempts with exponential backoff
          for (let attempt = 0; attempt < 3 && !parsed; attempt++) {
            if (attempt > 0) {
              await new Promise(r => setTimeout(r, 1000 * attempt))
            }

            const endpoints = [
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
            ]

            for (const url of endpoints) {
              if (parsed) break
              try {
                const response = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                      temperature: 0.15,
                      maxOutputTokens: 2048
                    }
                  })
                })

                if (!response.ok) {
                  const errBody = await response.text().catch(() => '')
                  console.warn(`[Similarity] Gemini ${response.status} for archive ${i}:`, errBody.substring(0, 200))
                  continue
                }

                let data
                try {
                  data = await response.json()
                } catch (jsonParseErr) {
                  console.warn(`[Similarity] Could not parse Gemini response for archive ${i}`)
                  continue
                }
                const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

                if (rawText) {
                  try {
                    let clean = rawText.trim()
                    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
                    const fb = clean.indexOf('{')
                    const lb = clean.lastIndexOf('}')
                    if (fb !== -1 && lb > fb) {
                      clean = clean.substring(fb, lb + 1)
                    }
                    const candidate = JSON.parse(clean)
                    if (typeof candidate.overallSimilarity === 'number') {
                      parsed = candidate
                    }
                  } catch (jsonErr) {
                    console.warn(`[Similarity] JSON parse failed for archive ${i}:`, jsonErr.message)
                  }
                }
              } catch (fetchErr) {
                console.warn(`[Similarity] Fetch error for archive ${i}:`, fetchErr.message)
              }
            }
          }
        }

        // Fallback to local keyword-based analysis if AI failed
        if (!parsed) {
          parsed = computeLocalSimilarityFallback(currentPaperText, archive.text || '')
        }

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

      // Small delay between archives to respect rate limits
      if (i < archivedPapers.length - 1) {
        await new Promise(r => setTimeout(r, 500))
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

export default router
