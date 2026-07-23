import express from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

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

    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash-exp']
    let lastErrorMsg = ''
    let isRateLimited = false

    for (const model of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userMessage }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          })
        })

        const data = await response.json()

        if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          aiContent = data.candidates[0].content.parts[0].text.trim()
          if (aiContent) break // Success! Exit fallback loop
        } else {
          const errMsg = data?.error?.message || data?.message || ''
          if (response.status === 429 || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limit')) {
            isRateLimited = true
          }
          lastErrorMsg = errMsg || `HTTP status ${response.status}`
          console.warn(`Gemini model ${model} status ${response.status}:`, lastErrorMsg)
        }
      } catch (fetchErr) {
        lastErrorMsg = fetchErr.message
      }
    }

    if (!aiContent) {
      if (isRateLimited) {
        return res.status(429).json({
          success: false,
          message: 'Gemini AI rate limit reached (15 requests/min). Please wait 15-20 seconds before generating again.'
        })
      }
      return res.status(502).json({
        success: false,
        message: `AI Service Error: ${lastErrorMsg || 'Unable to generate response.'}`
      })
    }

    return res.json({ success: true, content: aiContent })
  } catch (error) {
    console.error('AI assist handler error:', error)
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` })
  }
})

export default router
