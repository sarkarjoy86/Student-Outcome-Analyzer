/**
 * rubricsHelper.js
 * NLP Question Extraction, Metadata Parser, and Official MS Word Rubrics Exporter
 * Specifically engineered for OBE Assessment Rubrics in QuestionPaperEditor.
 */

import { BAIUST_LOGO } from '../components/marks/baiustLogo.js'

/**
 * Sanitizes math formulas and LaTeX notation into clean Unicode text suitable for Microsoft Word.
 * Removes unsightly dollar signs ($ and $$) and converts LaTeX commands into readable Unicode symbols.
 * 
 * @param {string} text - Raw text or formula string.
 * @returns {string} - Clean formatted string without dollar signs.
 */
export function cleanMathAndLatexForWord(text = '') {
  if (!text) return ''
  let s = String(text)

  // Replace common LaTeX symbols with clean Unicode characters
  s = s.replace(/\\infty\b/g, '∞')
  s = s.replace(/\\times\b/g, '×')
  s = s.replace(/\\cdot\b/g, '·')
  s = s.replace(/\\le\b|\\leq\b/g, '≤')
  s = s.replace(/\\ge\b|\\geq\b/g, '≥')
  s = s.replace(/\\ne\b|\\neq\b/g, '≠')
  s = s.replace(/\\pm\b/g, '±')
  s = s.replace(/\\approx\b/g, '≈')
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')')
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']')
  s = s.replace(/\\alpha\b/g, 'α').replace(/\\beta\b/g, 'β').replace(/\\gamma\b/g, 'γ')
  s = s.replace(/\\theta\b/g, 'θ').replace(/\\lambda\b/g, 'λ').replace(/\\mu\b/g, 'μ')
  s = s.replace(/\\pi\b/g, 'π').replace(/\\sigma\b/g, 'σ').replace(/\\sum\b/g, 'Σ')

  // Remove double dollar signs $$...$$
  s = s.replace(/\$\$([^$]+)\$\$/g, '$1')

  // Remove single dollar signs $...$
  s = s.replace(/\$([^$]+)\$/g, '$1')

  // Any stray dollar signs adjacent to variables or formulas (e.g. $r(x,y) -> r(x,y))
  s = s.replace(/\$([a-zA-Z0-9_\(\)\{\}\\\+\-\*\/\^=<>]+)\$/g, '$1')
  s = s.replace(/\$(?=[a-zA-Z0-9\(\)\\])/g, '')
  s = s.replace(/(?<=[a-zA-Z0-9\)\}\]])\$/g, '')

  // Remove any remaining stray single dollar signs
  s = s.replace(/\$/g, '')

  // Clean up remaining escaped backslashes in math like \( or \)
  s = s.replace(/\\([a-zA-Z]+)/g, '$1')

  return s.trim()
}

/**
 * Automatically extracts Course Code, Course Title, Credit Hour, Duration, Full Marks,
 * and Department from rich-text editor content if present.
 * 
 * @param {string} contentHtml - HTML string from the Question Paper Editor.
 * @returns {Object} - Extracted metadata object.
 */
export function parseHeaderMetadataFromContent(contentHtml = '') {
  const meta = {
    courseCode: '',
    courseTitle: '',
    creditHour: '',
    duration: '',
    totalMarks: '',
    department: '',
    assessmentName: ''
  }
  if (!contentHtml) return meta

  try {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = contentHtml
    const plainText = tempDiv.textContent || tempDiv.innerText || ''

    // Course Code: e.g. Course code: CSE 411 or Course Code: CSE-411
    const codeMatch = plainText.match(/Course\s*Code\s*[:\-]\s*([A-Za-z]{2,5}\s*[-]?\s*\d{3,4}[A-Za-z]?)/i)
    if (codeMatch) meta.courseCode = codeMatch[1].trim()

    // Course Title: e.g. Course title: Digital Image Processing
    const titleMatch = plainText.match(/Course\s*Title\s*[:\-]\s*([^\n\r,]+)/i)
    if (titleMatch) meta.courseTitle = titleMatch[1].trim()

    // Credit Hour: e.g. Credit Hour: 3 or Credit Hours: 3.0
    const creditMatch = plainText.match(/Credit\s*Hours?\s*[:\-]\s*([\d\.]+)/i)
    if (creditMatch) meta.creditHour = creditMatch[1].trim()

    // Duration / Time: e.g. Time: 20 Minutes or Duration: 20 Minutes
    const timeMatch = plainText.match(/(?:Time|Duration)\s*[:\-]\s*([^\n\r,]+)/i)
    if (timeMatch) meta.duration = timeMatch[1].trim()

    // Full Marks: e.g. Full Marks: 10 or Total Marks: 20
    const marksMatch = plainText.match(/(?:Full|Total)\s*Marks\s*[:\-]\s*(\d+)/i)
    if (marksMatch) meta.totalMarks = marksMatch[1].trim()

    // Department: e.g. Department of Computer Science and Engineering
    const deptMatch = plainText.match(/Department\s+of\s+([^\n\r]+)/i)
    if (deptMatch) meta.department = 'Department of ' + deptMatch[1].trim()

    // Assessment Name: e.g. Class Test: CT-1 or CT-2 or Midterm Examination
    const assessMatch = plainText.match(/(?:Class\s*Test\s*[:\-]?\s*([A-Za-z0-9\-]+)|(?:CT\s*[-]?\s*\d+)|Midterm\s*Examination|Term\s*Final\s*Examination)/i)
    if (assessMatch) meta.assessmentName = assessMatch[0].trim()
  } catch {
    // Non-fatal fallback
  }

  return meta
}

/**
 * Extracts questions, sub-parts, scenarios, formulas, diagrams, and tables
 * from the Question Paper Editor's HTML content.
 * 
 * @param {string} htmlContent - The rich-text HTML string from the editor.
 * @returns {Array<{ qNo: string, title: string, text: string, subparts: string[], hasDiagram: boolean, hasEquation: boolean, hasTable: boolean }>}
 */
export function extractQuestionsFromEditorContent(htmlContent = '') {
  if (!htmlContent || typeof htmlContent !== 'string') return []

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')

  // Remove official university header and metadata blocks if present inside content
  doc.querySelectorAll('.qp-official-header, .qp-header-wrapper, .static-top-confidential, .co-descriptions-container, header').forEach(el => el.remove())

  // Helper to process math equations and formulas into clean unicode text
  const processMath = (root) => {
    root.querySelectorAll('.math-equation-wrapper, [data-latex]').forEach(el => {
      try {
        const rawLatex = el.getAttribute('data-latex') || ''
        const decodedLatex = rawLatex ? decodeURIComponent(rawLatex) : el.textContent.trim()
        const cleanLatex = cleanMathAndLatexForWord(decodedLatex)
        const textNode = doc.createTextNode(` ${cleanLatex} `)
        el.parentNode?.replaceChild(textNode, el)
      } catch {
        // fallback
      }
    })
  }

  // Helper to process diagrams and figures
  const processDiagrams = (root) => {
    root.querySelectorAll('img').forEach(img => {
      const alt = (img.getAttribute('alt') || '').trim()
      const payload = img.getAttribute('data-diagram-payload') || ''
      const isDiagram = img.classList.contains('obe-graph-diagram') ||
                        img.hasAttribute('data-obe-diagram') ||
                        alt.toLowerCase().includes('diagram') ||
                        alt.toLowerCase().includes('graph') ||
                        alt.toLowerCase().includes('flowchart') ||
                        payload.length > 0

      if (isDiagram) {
        const label = alt || 'System Diagram / Graph'
        const textNode = doc.createTextNode(`\n[Diagram: ${label}]\n`)
        img.parentNode?.replaceChild(textNode, img)
      } else {
        const textNode = doc.createTextNode(`\n[Figure: ${alt || 'Attached Illustration'}]\n`)
        img.parentNode?.replaceChild(textNode, img)
      }
    })
  }

  // Helper to convert data tables / matrices to text representation
  const processDataTables = (root) => {
    root.querySelectorAll('table').forEach(tbl => {
      const rows = Array.from(tbl.querySelectorAll('tr'))
      if (rows.length === 0) return

      const isMatrix = tbl.classList.contains('matrix') || rows.length <= 4 && rows.every(r => r.cells.length <= 4)
      const tableLines = []
      rows.forEach(r => {
        const cells = Array.from(r.querySelectorAll('th, td')).map(c => c.textContent.trim()).filter(Boolean)
        if (cells.length > 0) {
          tableLines.push(cells.join(' | '))
        }
      })

      if (tableLines.length > 0) {
        const tag = isMatrix ? 'Matrix' : 'Table'
        const textNode = doc.createTextNode(`\n[${tag}:\n${tableLines.join('\n')}\n]\n`)
        tbl.parentNode?.replaceChild(textNode, tbl)
      }
    })
  }

  // =========================================================================
  // MODE 1: Detect and parse from Master Exam Paper Structure Table
  // =========================================================================
  const paperTable = doc.querySelector('.obe-paper-structure-table, [data-obe-paper-structure="true"]')
  if (paperTable) {
    processMath(paperTable)
    processDiagrams(paperTable)

    // Convert only nested dataset tables / matrices INSIDE content cells
    paperTable.querySelectorAll('tr > td:nth-child(3) table').forEach(nestedTbl => {
      const rows = Array.from(nestedTbl.querySelectorAll('tr'))
      const tableLines = []
      rows.forEach(r => {
        const cells = Array.from(r.querySelectorAll('th, td')).map(c => c.textContent.trim()).filter(Boolean)
        if (cells.length > 0) tableLines.push(cells.join(' | '))
      })
      if (tableLines.length > 0) {
        const textNode = doc.createTextNode(`\n[Table:\n${tableLines.join('\n')}\n]\n`)
        nestedTbl.parentNode?.replaceChild(textNode, nestedTbl)
      }
    })

    const questions = []
    let currentQ = null
    let isPendingOr = false

    const trs = Array.from(paperTable.querySelectorAll('tr'))
    trs.forEach(tr => {
      // 1. Skip Part Header Row (e.g. PART A, PART B)
      if (tr.getAttribute('data-obe-row') === 'part-header' || (tr.cells.length === 1 && /PART\s+[A-Z]/i.test(tr.textContent))) {
        return
      }

      // 2. OR separator row
      if (tr.getAttribute('data-obe-row') === 'or-separator' || tr.textContent.trim().toUpperCase() === 'OR') {
        isPendingOr = true
        return
      }

      // Extract direct row cells
      const cells = Array.from(tr.querySelectorAll(':scope > td, :scope > th'))
      if (cells.length < 3) return // spacing or empty row

      const qNumText = (cells[0]?.textContent || '').trim()
      const subQText = (cells[1]?.textContent || '').trim()
      const contentEl = cells[2]
      const marksText = (cells[3]?.textContent || '').trim()

      const contentText = (contentEl?.textContent || contentEl?.innerText || '').trim()
      if (!contentText && !qNumText && !subQText) return // empty row

      // Check if this row starts a new main question (e.g. "1.", "2.", "3.")
      const qNumMatch = qNumText.match(/(\d+)/)
      if (qNumMatch) {
        if (currentQ) questions.push(currentQ)
        currentQ = {
          qNo: `Question ${qNumMatch[1]}`,
          marks: 0,
          subparts: [],
          contentParts: []
        }
      }

      if (!currentQ) {
        currentQ = {
          qNo: 'Question 1',
          marks: 0,
          subparts: [],
          contentParts: []
        }
      }

      // Format subpart text & label
      let subpartPrefix = ''
      if (isPendingOr) {
        subpartPrefix = 'OR: '
        isPendingOr = false
      }

      const subLabel = subQText ? `${subpartPrefix}${subQText}` : (subpartPrefix ? 'OR' : '')
      const fullSubText = `${subLabel ? subLabel + ' ' : ''}${contentText}`
      currentQ.subparts.push(fullSubText.trim())
      currentQ.contentParts.push(`${fullSubText} ${marksText ? '[' + marksText.replace(/\[|\]/g, '') + ']' : ''}`.trim())

      // Extract marks (do not double-count if it's an OR alternative)
      const mMatch = marksText.match(/\[?\s*(\d+(?:\.\d+)?)\s*\]?/)
      if (mMatch && !subpartPrefix) {
        currentQ.marks += parseFloat(mMatch[1])
      }
    })

    if (currentQ) questions.push(currentQ)

    if (questions.length > 0) {
      return questions.map((q, idx) => {
        let snippet = ''
        for (const part of q.subparts) {
          const cleanPart = part
            .replace(/^(?:OR:\s*)?[a-z][\.\)]\s*/i, '')
            .replace(/\[(?:Table|Matrix|Diagram|Figure|Code)[^\]]*\]/g, '')
            .replace(/\[CO\d+[^\]]*\]/g, '')
            .replace(/\[\d+\]/g, '')
            .trim()
          if (cleanPart.length > 5) {
            snippet = cleanPart
            break
          }
        }
        if (!snippet) snippet = q.subparts[0] || `Question ${idx + 1}`

        const hasDiagram = q.contentParts.some(p => p.includes('[Diagram:') || p.includes('[Figure:'))
        const hasEquation = q.contentParts.some(p => p.includes('$') || /[\=×·≤≥≠±√πθλΣ∞]/.test(p))
        const hasTable = q.contentParts.some(p => p.includes('[Table:') || p.includes('[Matrix:'))

        return {
          qNo: q.qNo,
          title: snippet.slice(0, 90).trim(),
          text: q.contentParts.join('\n\n'),
          marks: q.marks > 0 ? q.marks : null,
          subparts: q.subparts,
          hasDiagram,
          hasEquation,
          hasTable
        }
      })
    }
  }

  // =========================================================================
  // MODE 2: Fallback paragraph / free-text question parser
  // =========================================================================
  processMath(doc.body)
  processDiagrams(doc.body)
  processDataTables(doc.body)

  // Ensure all block elements have explicit line breaks
  doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
  doc.querySelectorAll('p, div, tr, li, h1, h2, h3, h4, h5, h6, hr').forEach(el => {
    el.prepend(doc.createTextNode('\n'))
    el.append(doc.createTextNode('\n'))
  })

  const fullText = (doc.body.textContent || doc.body.innerText || '').replace(/\r\n/g, '\n')
  if (!fullText.trim()) return []

  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean)

  const rawBlocks = []
  let currentBlock = []
  let activeScenario = ''

  // Matches main question starters:
  // "Question 1", "Question 2", "Q1", "Q.1", "Q 1",
  // "1. a.", "1.a.", "1. ", "1)", "1:", "1 -", "1(a)"
  const mainQuestionRegex = /^(?:Question\s*(\d+)|\bQ(?:uestion)?\.?\s*(\d+)|\(?(\d+)\)[\.\:\-]?|\b(\d+)[\.\:\-]\s*(?:[a-z][\.\)]\s*)?|\b(\d+)\s*\([a-z]\))\s*(.*)$/i

  // Matches standalone subparts that start with letters or roman numerals WITHOUT a main question number:
  // "a.", "(a)", "a)", "b.", "(b)", "b)", "c.", "(c)", "i.", "(i)", "iv."
  const standaloneSubpartRegex = /^(?:\(?([a-z]|[ivx]+)\)[\.\:\)]?|\b([a-z])[\.\)])\s*(.*)$/i

  const isOrLine = /^\s*OR\b/i

  lines.forEach(line => {
    const isStandaloneSubpart = standaloneSubpartRegex.test(line)
    const mainMatch = line.match(mainQuestionRegex)
    const isScenario = /^(?:scenario|case study|context|consider the following|given the following|read the passage|information:)/i.test(line)

    if (isScenario) {
      activeScenario = line
      return
    }

    // A new main question starts if it matches mainQuestionRegex and is NOT a standalone subpart line
    if (mainMatch && !isStandaloneSubpart) {
      if (currentBlock.length > 0) {
        rawBlocks.push({ lines: currentBlock, scenario: activeScenario })
        currentBlock = []
        activeScenario = ''
      }
      currentBlock.push(line)
    } else {
      if (currentBlock.length > 0) {
        currentBlock.push(line)
      } else {
        if (!activeScenario) {
          activeScenario = line
        } else {
          activeScenario += '\n' + line
        }
      }
    }
  })

  if (currentBlock.length > 0) {
    rawBlocks.push({ lines: currentBlock, scenario: activeScenario })
  }

  // Fallback: If no "Question X" prefix was found, treat entire text as Question 1
  if (rawBlocks.length === 0 && lines.length > 0) {
    rawBlocks.push({ lines: lines, scenario: activeScenario })
  }

  const detectedQuestions = rawBlocks.map((block, idx) => {
    const blockText = block.lines.join('\n')
    const firstLine = block.lines[0] || ''
    const mainMatch = firstLine.match(mainQuestionRegex)
    const extractedNum = mainMatch ? (mainMatch[1] || mainMatch[2] || mainMatch[3] || mainMatch[4] || mainMatch[5]) : null
    const qNumber = extractedNum ? `Question ${extractedNum}` : `Question ${idx + 1}`

    // Extract marks by subparts to correctly sum a, b, c without double-counting OR alternatives
    const marksBySubpart = {}
    let currentSubKey = 'main'
    block.lines.forEach(l => {
      const subMatch = l.match(/^[a-z][\.\)]|^\([a-z]\)/i) || l.match(/^[0-9]+[\.\)]\s*([a-z])[\.\)]/i)
      if (subMatch) {
        currentSubKey = (subMatch[1] || subMatch[0]).toLowerCase().replace(/[^a-z]/g, '')
      }
      const m = l.match(/\[\s*(\d+(?:\.\d+)?)\s*(?:Marks?|pts?|points?)?\s*\]/i) ||
                l.match(/\(\s*(\d+(?:\.\d+)?)\s*(?:Marks?|pts?|points?)?\s*\)/i)
      if (m && !marksBySubpart[currentSubKey]) {
        marksBySubpart[currentSubKey] = parseFloat(m[1])
      }
    })
    const totalCalculatedMarks = Object.values(marksBySubpart).reduce((a, b) => a + b, 0)
    const marks = totalCalculatedMarks > 0 ? totalCalculatedMarks : null

    // Find all distinct sub-questions (e.g. a, b, c, or OR options)
    const subparts = []
    let isNextOrAlternative = false
    block.lines.forEach(l => {
      if (isOrLine.test(l)) {
        isNextOrAlternative = true
        return
      }
      if (standaloneSubpartRegex.test(l) || /^[0-9]+[\.\)]\s*[a-z][\.\)]/i.test(l)) {
        subparts.push(l)
        isNextOrAlternative = false
      } else if (isNextOrAlternative) {
        subparts.push(`OR: ${l}`)
        isNextOrAlternative = false
      }
    })

    const hasDiagram = blockText.includes('[Diagram:') || blockText.includes('[Figure:')
    const hasEquation = blockText.includes('$') || /[\=×·≤≥≠±√πθλΣ∞]/.test(blockText)
    const hasTable = blockText.includes('[Table:') || blockText.includes('[Matrix:')

    // Extract a meaningful title (skip table/diagram metadata tags)
    let snippet = ''
    for (const l of block.lines) {
      const cleaned = l
        .replace(mainQuestionRegex, '$6')
        .replace(/\[(?:Table|Matrix|Diagram|Figure|Code)[^\]]*\]/g, '')
        .replace(/\[CO\d+[^\]]*\]/g, '')
        .replace(/\[\d+\]/g, '')
        .trim()
      if (cleaned.length > 5) {
        snippet = cleaned
        break
      }
    }
    if (!snippet) snippet = firstLine.slice(0, 80)

    let completeText = ''
    if (block.scenario) {
      completeText += `[Context/Scenario:\n${block.scenario}]\n\n`
    }
    completeText += blockText

    return {
      qNo: qNumber,
      title: snippet.slice(0, 90).trim(),
      text: completeText,
      marks: marks,
      subparts: subparts,
      hasDiagram: hasDiagram,
      hasEquation: hasEquation,
      hasTable: hasTable
    }
  })

  return detectedQuestions
}

/**
 * Generates and triggers download of an official Microsoft Word (.doc / .docx compatible)
 * OBE Assessment Rubrics document with institutional branding and 5-column criteria tables.
 * 
 * @param {Object} params
 * @param {Array} params.rubrics - Generated rubrics array from AI.
 * @param {string} params.assessmentName - Assessment Name (e.g. "CT-1", "Midterm Examination").
 * @param {string} params.courseCode - Course Code (e.g. "CSE 411").
 * @param {string} params.courseTitle - Course Title (e.g. "Digital Image Processing").
 * @param {string} params.department - Department name.
 * @param {string|number} params.creditHour - Course Credit.
 * @param {string} params.examDuration - Duration string (e.g. "20 Minutes").
 * @param {string|number} params.totalMarks - Total marks.
 * @param {string} params.semester - Semester name.
 */
export function exportRubricsToWord({
  rubrics = [],
  assessmentName = 'Class Test',
  courseCode = '',
  courseTitle = '',
  department = 'Department of Computer Science and Engineering',
  creditHour = '3',
  examDuration = '20 Minutes',
  totalMarks = '',
  semester = 'Spring 2026'
}) {
  if (!rubrics || rubrics.length === 0) {
    throw new Error('No rubrics data available to export.')
  }

  // Ensure clean, non-empty metadata fallbacks
  const safeCourseCode = courseCode || 'CSE'
  const safeCourseTitle = courseTitle || 'Course Title'
  const safeAssessment = assessmentName || 'Class Test'
  const safeDuration = examDuration || '20 Minutes'
  const safeMarks = totalMarks ? String(totalMarks) : '10'
  const safeCredits = creditHour ? String(creditHour) : '3'
  const safeDept = department || 'Department of Computer Science and Engineering'

  // Build Rubric Tables HTML with Theme Dark Green Table Headers (#064e3b)
  const rubricTablesHtml = rubrics.map((rubricItem, idx) => {
    const qNum = rubricItem.questionNumber || `Question ${idx + 1}`
    const rawTitle = rubricItem.questionTitle ? cleanMathAndLatexForWord(rubricItem.questionTitle) : ''
    const qTitle = rawTitle ? ` &mdash; ${escapeHtml(rawTitle)}` : ''
    const rows = rubricItem.rows || []

    const rowsHtml = rows.map((r, rIdx) => {
      const isAlt = rIdx % 2 === 1
      const rowBg = isAlt ? '#f8fafc' : '#ffffff'

      const cleanCriteria = cleanMathAndLatexForWord(r.criteria || '')
      const cleanExcellent = cleanMathAndLatexForWord(r.excellent || '')
      const cleanGood = cleanMathAndLatexForWord(r.good || '')
      const cleanAverage = cleanMathAndLatexForWord(r.average || '')
      const cleanPoor = cleanMathAndLatexForWord(r.poor || '')

      return `
        <tr style="background-color: ${rowBg};">
          <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold; font-size: 10pt; font-family: 'Times New Roman', serif; vertical-align: top; width: 20%; line-height: 1.3;">
            ${escapeHtml(cleanCriteria)}
          </td>
          <td style="border: 1px solid #000000; padding: 6px 8px; font-size: 9.5pt; font-family: 'Times New Roman', serif; vertical-align: top; width: 20%; line-height: 1.3;">
            ${escapeHtml(cleanExcellent)}
          </td>
          <td style="border: 1px solid #000000; padding: 6px 8px; font-size: 9.5pt; font-family: 'Times New Roman', serif; vertical-align: top; width: 20%; line-height: 1.3;">
            ${escapeHtml(cleanGood)}
          </td>
          <td style="border: 1px solid #000000; padding: 6px 8px; font-size: 9.5pt; font-family: 'Times New Roman', serif; vertical-align: top; width: 20%; line-height: 1.3;">
            ${escapeHtml(cleanAverage)}
          </td>
          <td style="border: 1px solid #000000; padding: 6px 8px; font-size: 9.5pt; font-family: 'Times New Roman', serif; vertical-align: top; width: 20%; line-height: 1.3;">
            ${escapeHtml(cleanPoor)}
          </td>
        </tr>
      `
    }).join('')

    return `
      <div style="margin-top: 20px; margin-bottom: 26px; page-break-inside: avoid;">
        <h3 style="font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold; text-align: center; margin: 14px 0 8px 0; color: #000000; text-transform: uppercase; letter-spacing: 0.2px;">
          ${escapeHtml(qNum)} Assessment Rubrics${qTitle}
        </h3>
        <table border="1" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <thead>
            <tr style="background-color: #064e3b; color: #ffffff;">
              <th style="border: 1px solid #000000; padding: 7px 8px; font-family: 'Times New Roman', serif; font-size: 10pt; font-weight: bold; text-align: center; width: 20%; color: #ffffff; background-color: #064e3b;">
                Criteria
              </th>
              <th style="border: 1px solid #000000; padding: 7px 8px; font-family: 'Times New Roman', serif; font-size: 10pt; font-weight: bold; text-align: center; width: 20%; color: #ffffff; background-color: #064e3b;">
                Excellent (80-100% marks)
              </th>
              <th style="border: 1px solid #000000; padding: 7px 8px; font-family: 'Times New Roman', serif; font-size: 10pt; font-weight: bold; text-align: center; width: 20%; color: #ffffff; background-color: #064e3b;">
                Good (60-79% marks)
              </th>
              <th style="border: 1px solid #000000; padding: 7px 8px; font-family: 'Times New Roman', serif; font-size: 10pt; font-weight: bold; text-align: center; width: 20%; color: #ffffff; background-color: #064e3b;">
                Average (40-59% marks)
              </th>
              <th style="border: 1px solid #000000; padding: 7px 8px; font-family: 'Times New Roman', serif; font-size: 10pt; font-weight: bold; text-align: center; width: 20%; color: #ffffff; background-color: #064e3b;">
                Poor (below 40% marks)
              </th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `
  }).join('')

  // Build Complete Word Document HTML
  const wordDocumentHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(safeAssessment)} Assessment Rubrics</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 210mm 297mm; /* A4 Standard */
          margin: 18mm 16mm 20mm 16mm;
          mso-header-margin: 8mm;
          mso-footer-margin: 8mm;
          mso-footer: f1;
        }
        div.Section1 {
          page: Section1;
        }
        table#hrdftrtbl {
          margin: 0in 0in 0in 900in;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 10pt;
          line-height: 1.25;
          color: #000000;
          margin: 0;
          padding: 0;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        p.MsoFooter, div.MsoFooter {
          margin: 0;
          font-family: 'Times New Roman', Times, serif;
          font-size: 9pt;
          color: #444444;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- University Official Header with BAIUST Logo -->
        <div style="text-align: center; margin-bottom: 14px;">
          ${BAIUST_LOGO ? `
            <p style="text-align: center; margin: 0 0 6pt 0;">
              <img src="${BAIUST_LOGO}" width="65" height="65" style="width: 50pt; height: 50pt; margin: 0 auto; display: block;" alt="BAIUST Logo" />
            </p>
          ` : ''}
          <h2 style="font-family: 'Times New Roman', serif; font-size: 13.5pt; font-weight: bold; margin: 0; text-transform: uppercase; color: #000000;">
            Bangladesh Army International University of Science and Technology (BAIUST), Cumilla
          </h2>
          <h3 style="font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold; margin: 3px 0; color: #000000;">
            ${escapeHtml(safeDept)}
          </h3>
          <h4 style="font-family: 'Times New Roman', serif; font-size: 11.5pt; font-weight: bold; margin: 2px 0 8px 0; text-transform: uppercase; color: #064e3b; letter-spacing: 0.5px;">
            Outcome-Based Assessment Rubrics: ${escapeHtml(safeAssessment)}
          </h4>
        </div>

        <!-- Metadata Table -->
        <table border="1" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: 1px solid #000000; margin-bottom: 14px; font-size: 9.5pt;">
          <tr style="background-color: #f1f5f9;">
            <td style="padding: 4px 6px; font-weight: bold; border: 1px solid #000000; width: 16%;">Course Code:</td>
            <td style="padding: 4px 6px; border: 1px solid #000000; width: 34%; font-weight: bold;">${escapeHtml(safeCourseCode)}</td>
            <td style="padding: 4px 6px; font-weight: bold; border: 1px solid #000000; width: 16%;">Assessment:</td>
            <td style="padding: 4px 6px; border: 1px solid #000000; width: 34%; font-weight: bold;">${escapeHtml(safeAssessment)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 6px; font-weight: bold; border: 1px solid #000000;">Course Title:</td>
            <td style="padding: 4px 6px; border: 1px solid #000000;">${escapeHtml(safeCourseTitle)}</td>
            <td style="padding: 4px 6px; font-weight: bold; border: 1px solid #000000;">Duration:</td>
            <td style="padding: 4px 6px; border: 1px solid #000000;">${escapeHtml(safeDuration)}</td>
          </tr>
          <tr style="background-color: #f1f5f9;">
            <td style="padding: 4px 6px; font-weight: bold; border: 1px solid #000000;">Credit Hour:</td>
            <td style="padding: 4px 6px; border: 1px solid #000000;">${escapeHtml(safeCredits)}</td>
            <td style="padding: 4px 6px; font-weight: bold; border: 1px solid #000000;">Total Marks:</td>
            <td style="padding: 4px 6px; border: 1px solid #000000;">${escapeHtml(safeMarks)}</td>
          </tr>
        </table>

        <!-- Question-wise Rubric Tables -->
        ${rubricTablesHtml}
      </div>

      <!-- Word Running Footer (Assigned to Section1 via mso-footer: f1) -->
      <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <div style="mso-element:footer" id="f1">
              <table border="0" cellspacing="0" cellpadding="0" style="width:100%; border:none; border-top:0.5pt solid #cccccc; padding-top:4pt; font-family:'Times New Roman',Times,serif; font-size:9pt; color:#444444;">
                <tr>
                  <td style="border:none; text-align:left; font-size:9pt; color:#444444; padding:0;">
                    <p class="MsoFooter" style="text-align:left; margin:0;">
                      OBE Outcome-Based Assessment Rubrics${safeCourseCode ? ` (${escapeHtml(safeCourseCode)})` : ''}
                    </p>
                  </td>
                  <td style="border:none; text-align:right; font-size:9pt; color:#444444; padding:0;">
                    <p class="MsoFooter" style="text-align:right; margin:0;">
                      Page <!--[if supportFields]><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'> </span>PAGE <span style='mso-element:field-separator'></span><![endif]--><span style='mso-field-code:" PAGE "'><span style='mso-no-proof:yes'>1</span></span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]--> of <!--[if supportFields]><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'> </span>NUMPAGES <span style='mso-element:field-separator'></span><![endif]--><span style='mso-field-code:" NUMPAGES "'><span style='mso-no-proof:yes'>1</span></span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->
                    </p>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>

  `

  // Trigger download
  const blob = new Blob(['\ufeff' + wordDocumentHtml], {
    type: 'application/msword;charset=utf-8'
  })

  const cleanCourse = safeCourseCode.replace(/[^a-zA-Z0-9_-]/g, '_')
  const cleanAssess = safeAssessment.replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `${cleanCourse}_${cleanAssess}_Assessment_Rubrics.doc`

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)

  return fileName
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Direct client fallback for Gemini API if backend is unreachable or on standby.
 */
export async function callClientGeminiRubrics(payload, apiKey) {
  const { questions, assessmentName, courseCode, courseTitle, department, totalMarks } = payload

  // Robust JSON Parser with trailing comma removal, unescaped quote repair, and bracket-stack auto-healer
  const robustParseJson = (rawText) => {
    if (!rawText) return null
    let cleaned = String(rawText).replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()

    // 1. Direct parse
    try { return JSON.parse(cleaned) } catch (e1) {}

    // 2. Remove trailing commas before brackets
    let fixed = cleaned.replace(/,\s*([\]}])/g, '$1')
    try { return JSON.parse(fixed) } catch (e2) {}

    // 3. Extract JSON object or array substring
    const match = fixed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (match) {
      try { return JSON.parse(match[0].replace(/,\s*([\]}])/g, '$1')) } catch (e3) {}
    }

    // 4. Line-by-line repair of unescaped quotes inside JSON string values
    try {
      const lines = (match ? match[0] : fixed).split('\n')
      const repairedLines = lines.map(line => {
        const kvMatch = line.match(/^(\s*"[^"]+"\s*:\s*")(.*)("(?:\s*,\s*|\s*))$/)
        if (kvMatch) {
          const prefix = kvMatch[1]
          let val = kvMatch[2]
          const suffix = kvMatch[3]
          val = val.replace(/(?<!\\)"/g, '\\"')
          return prefix + val + suffix
        }
        return line
      })
      const repairedText = repairedLines.join('\n').replace(/,\s*([\]}])/g, '$1')
      try { return JSON.parse(repairedText) } catch (e4) {}
    } catch (errLine) {}

    // 5. Auto-heal truncated JSON using bracket stack
    try {
      let s = (match ? match[0] : fixed).trim()
      s = s.replace(/,\s*$/, '').replace(/:\s*$/, ': ""')

      const stack = []
      let inString = false
      let escape = false

      for (let i = 0; i < s.length; i++) {
        const ch = s[i]
        if (escape) {
          escape = false
          continue
        }
        if (ch === '\\') {
          escape = true
          continue
        }
        if (ch === '"') {
          inString = !inString
          continue
        }
        if (inString) continue

        if (ch === '{') stack.push('}')
        else if (ch === '[') stack.push(']')
        else if (ch === '}' || ch === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === ch) {
            stack.pop()
          }
        }
      }

      if (inString) s += '"'
      while (stack.length > 0) {
        s += stack.pop()
      }
      return JSON.parse(s.replace(/,\s*([\]}])/g, '$1'))
    } catch (e5) {}

    return null
  }

  const models = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite'
  ]

  const generateBatch = async (batchQuestions) => {
    const questionsFormatted = batchQuestions.map((q, idx) => {
      const qNum = q.qNo || `Question ${idx + 1}`
      const qMarks = q.marks ? ` [${q.marks} Marks]` : ''
      return `### ${qNum}${qMarks}:\n${q.text || ''}`
    }).join('\n\n')

    const promptText = `You are an expert academic assessment specialist, university professor, and OBE (Outcome-Based Education) accreditation rubric designer.
Generate official 5-column outcome-based assessment rubrics for each examination question below.

COURSE: ${courseCode || 'N/A'} - ${courseTitle || 'N/A'} (${department || 'Department of CSE'})
ASSESSMENT: ${assessmentName || 'Examination'}
${totalMarks ? `TOTAL MARKS: ${totalMarks}` : ''}

EXAMINATION QUESTIONS TO EVALUATE:
${questionsFormatted}

CRITICAL PEDAGOGICAL & STYLE GUIDELINES (MODELED AFTER UNIVERSITY FACULTY RUBRICS):
1. Focus on what the STUDENT demonstrates (e.g., "Clearly explains...", "Accurately traces code/derivation...", "Correctly applies algorithm...", "Compares..."). DO NOT merely quote textbook paragraphs.
2. For each question, construct 3 to 4 focused criteria rows capturing the core concepts, derivations, formulas, diagrams, or comparisons demanded by the question.
3. The FINAL criterion row for EVERY question MUST ALWAYS BE "Clarity and Organization".
4. Follow this natural 4-tier graduation pattern matching standard academic assessment rubrics:
   - "excellent" (80-100% marks): Clearly explains/identifies/solves all required elements with accurate concepts, logical reasoning, and complete depth.
   - "good" (60-79% marks): Explains/solves correctly but with limited details, minor conceptual gaps, or slight omissions.
   - "average" (40-59% marks): Shows basic or partial understanding; mentions some concepts correctly with noticeable errors, superficial explanation, or incomplete analysis.
   - "poor" (below 40% marks): Fails to explain/solve, provides fundamentally incorrect concepts, or misses the description entirely.

CRITICAL MATHEMATICAL & SCIENTIFIC NOTATION RULE:
- NEVER USE RAW LATEX DOLLAR SIGNS (DO NOT OUTPUT $ OR $$). Write clean unicode (e.g. O(n log n), T(n) = 2T(n/2) + n, √, ≤, ≥).

CRITICAL CODE & JSON ESCAPING RULES:
- When describing programming code (e.g. C/C++/Java/Python, printf, conditionals), ALWAYS use single quotes inside JSON string values (e.g. printf('A is greater')) OR escape double quotes with a backslash (\\").
- NEVER output unescaped double quotes inside text values.

Output MUST BE valid JSON only, without any markdown backticks or commentary:
{
  "rubrics": [
    {
      "questionNumber": "Question 1",
      "questionTitle": "Brief topic summary",
      "rows": [
        {
          "criteria": "Understanding of ...",
          "excellent": "Clearly explains ... with accurate concepts and proper reasoning.",
          "good": "Explains ... correctly but with limited details or minor conceptual gaps.",
          "average": "Describes ... with some errors, partial understanding, or incomplete details.",
          "poor": "Incorrect explanation or missing description of ..."
        },
        {
          "criteria": "Clarity and Organization",
          "excellent": "The answer is well-structured, clear, and logically organized with appropriate technical terms.",
          "good": "Mostly clear with minor issues in organization or explanation.",
          "average": "Somewhat disorganized or difficult to follow.",
          "poor": "Poorly structured and unclear answer."
        }
      ]
    }
  ]
}`

    let lastError = null
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json'
            }
          }),
          signal: AbortSignal.timeout(25000)
        })
        const data = await resp.json()
        if (resp.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text.trim()
          const parsed = robustParseJson(rawText)

          let rubricsList = null
          if (Array.isArray(parsed)) {
            rubricsList = parsed
          } else if (parsed && typeof parsed === 'object') {
            rubricsList = parsed.rubrics || parsed.questions || parsed.data || Object.values(parsed).find(v => Array.isArray(v))
          }

          if (rubricsList && Array.isArray(rubricsList) && rubricsList.length > 0) {
            return rubricsList
          }
        } else {
          lastError = data?.error?.message || `HTTP ${resp.status}`
        }
      } catch (err) {
        lastError = err.message
      }
    }
    throw new Error(lastError || 'Could not generate rubrics for batch.')
  }

  // Process questions: if more than 2 questions, split into parallel chunks of 2
  let allRubrics = []
  if (questions.length <= 2) {
    allRubrics = await generateBatch(questions)
  } else {
    const chunks = []
    for (let i = 0; i < questions.length; i += 2) {
      chunks.push(questions.slice(i, i + 2))
    }
    const chunkResults = await Promise.all(chunks.map(chunk => generateBatch(chunk)))
    allRubrics = chunkResults.flat()
  }

  if (!allRubrics || allRubrics.length === 0) {
    throw new Error('AI returned an invalid JSON response structure.')
  }

  const sanitizedRubrics = allRubrics.map((q, idx) => ({
    ...q,
    questionNumber: q.questionNumber || q.qNo || `Question ${idx + 1}`,
    questionTitle: cleanMathAndLatexForWord(q.questionTitle || q.title || ''),
    rows: Array.isArray(q.rows) ? q.rows.map(r => ({
      criteria: cleanMathAndLatexForWord(r.criteria || ''),
      excellent: cleanMathAndLatexForWord(r.excellent || ''),
      good: cleanMathAndLatexForWord(r.good || ''),
      average: cleanMathAndLatexForWord(r.average || ''),
      poor: cleanMathAndLatexForWord(r.poor || '')
    })) : []
  }))

  return { rubrics: sanitizedRubrics }
}


