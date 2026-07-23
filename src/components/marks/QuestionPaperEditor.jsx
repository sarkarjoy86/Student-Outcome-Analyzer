import { useState, useEffect, useRef } from 'react'
import { apiService } from '../../services/apiService'
import {
  HtmlEditor,
  Image,
  Inject,
  Link,
  QuickToolbar,
  RichTextEditorComponent,
  Toolbar,
  Table,
  FormatPainter,
  EmojiPicker,
  PasteCleanup,
  Count,
  SlashMenu,
  ImportExport
} from '@syncfusion/ej2-react-richtexteditor'
import { ArrowLeft, Save, FileDown, Printer, Loader2, AlertCircle, Plus, Minus, X, Maximize2, Sparkles, ChevronRight, Check, Target, Share2, Grid, RefreshCw } from 'lucide-react'
import mammoth from 'mammoth'

// Syncfusion CSS imports
import '@syncfusion/ej2-base/styles/material.css'
import '@syncfusion/ej2-icons/styles/material.css'
import '@syncfusion/ej2-buttons/styles/material.css'
import '@syncfusion/ej2-splitbuttons/styles/material.css'
import '@syncfusion/ej2-inputs/styles/material.css'
import '@syncfusion/ej2-lists/styles/material.css'
import '@syncfusion/ej2-navigations/styles/material.css'
import '@syncfusion/ej2-popups/styles/material.css'
import '@syncfusion/ej2-richtexteditor/styles/material.css'
import '@syncfusion/ej2-dropdowns/styles/material.css'

// Helper: Word-by-word diff calculation for AI comparison view
function getWordDiff(oldText = '', newText = '') {
  if (!oldText || !newText) return { oldDiff: [], newDiff: [] }
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  const m = oldWords.length
  const n = newWords.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  let i = m, j = n
  const oldDiff = []
  const newDiff = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      oldDiff.unshift({ type: 'same', text: oldWords[i - 1] })
      newDiff.unshift({ type: 'same', text: newWords[j - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newDiff.unshift({ type: 'add', text: newWords[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      oldDiff.unshift({ type: 'del', text: oldWords[i - 1] })
      i--
    }
  }

  return { oldDiff, newDiff }
}

// Helper: Convert plain text AI response into proper HTML paragraphs and lists for RTE pasting
function formatAiTextToHtml(text = '') {
  if (!text) return ''
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text // Already contains HTML tags
  }

  // Split double-newline separated blocks
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0)

  const htmlBlocks = blocks.map(block => {
    const lines = block.trim().split(/\n/).map(l => l.trim()).filter(Boolean)

    // Numbered list items (e.g. "1. Item" or "1) Item")
    const isNumbered = lines.length > 0 && lines.every(l => /^\d+[\.\)]\s+/.test(l))
    if (isNumbered) {
      const items = lines.map(l => `<li style="margin-bottom: 4px;">${l.replace(/^\d+[\.\)]\s+/, '')}</li>`).join('')
      return `<ol style="margin-top: 6px; margin-bottom: 14px; padding-left: 24px; list-style-type: decimal;">${items}</ol>`
    }

    // Bullet list items (e.g. "- Item" or "* Item")
    const isBullet = lines.length > 0 && lines.every(l => /^[\-\*•]\s+/.test(l))
    if (isBullet) {
      const items = lines.map(l => `<li style="margin-bottom: 4px;">${l.replace(/^[\-\*•]\s+/, '')}</li>`).join('')
      return `<ul style="margin-top: 6px; margin-bottom: 14px; padding-left: 24px; list-style-type: disc;">${items}</ul>`
    }

    // Standard paragraph with line breaks
    return `<p style="margin-bottom: 12px; line-height: 1.6;">${lines.join('<br/>')}</p>`
  })

  return htmlBlocks.join('')
}

// Helper: SVG Graph Diagram Generator (Supports B&W Print Theme & Emerald System Theme)
function generateGraphSvg(edgeText = '', isDirected = true, theme = 'bw') {
  const lines = edgeText.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)
  const nodesSet = new Set()
  const edges = []

  lines.forEach(line => {
    const match = line.match(/^([\w]+)\s*(?:->|-|=>)\s*([\w]+)(?:\s*[:=]\s*(.+))?$/i)
    if (match) {
      const from = match[1].toUpperCase()
      const to = match[2].toUpperCase()
      const weight = match[3] ? match[3].trim() : ''
      nodesSet.add(from)
      nodesSet.add(to)
      edges.push({ from, to, weight })
    }
  })

  if (nodesSet.size === 0) {
    ['A', 'B', 'C', 'D'].forEach(n => nodesSet.add(n))
    edges.push({ from: 'A', to: 'B', weight: '10' })
    edges.push({ from: 'A', to: 'C', weight: '5' })
    edges.push({ from: 'B', to: 'C', weight: '15' })
    edges.push({ from: 'C', to: 'D', weight: '8' })
  }

  const nodeList = Array.from(nodesSet)
  const N = nodeList.length
  const width = 480
  const height = 320
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.34

  const positions = {}
  nodeList.forEach((node, idx) => {
    const angle = (2 * Math.PI * idx) / N - Math.PI / 2
    positions[node] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  })

  const nodeRadius = 20
  const isBw = theme === 'bw'
  const strokeColor = isBw ? '#000000' : '#047857'
  const lineStroke = isBw ? '#000000' : '#059669'
  const nodeFill = '#ffffff'
  const textColor = isBw ? '#000000' : '#065f46'
  const badgeFill = '#ffffff'
  const badgeStroke = isBw ? '#000000' : '#10b981'
  const badgeText = isBw ? '#000000' : '#047857'

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="max-width: 100%; height: auto; font-family: 'Segoe UI', Arial, sans-serif; background-color: transparent; display: block; margin: 0 auto;">`

  svg += `<defs>
    <marker id="arrowhead-${theme}" viewBox="0 0 10 10" refX="23" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${strokeColor}" />
    </marker>
  </defs>`

  edges.forEach(edge => {
    const p1 = positions[edge.from]
    const p2 = positions[edge.to]
    if (!p1 || !p2) return

    const markerAttr = isDirected ? `marker-end="url(#arrowhead-${theme})"` : ''
    svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${lineStroke}" stroke-width="2.5" ${markerAttr} />`

    if (edge.weight) {
      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2
      const textWidth = Math.max(edge.weight.length * 8 + 10, 22)
      svg += `<rect x="${midX - textWidth / 2}" y="${midY - 10}" width="${textWidth}" height="18" rx="4" fill="${badgeFill}" stroke="${badgeStroke}" stroke-width="1.5" />`
      svg += `<text x="${midX}" y="${midY + 3}" font-size="11" font-weight="bold" fill="${badgeText}" text-anchor="middle">${edge.weight}</text>`
    }
  })

  nodeList.forEach(node => {
    const p = positions[node]
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${nodeRadius}" fill="${nodeFill}" stroke="${strokeColor}" stroke-width="2.5" />`
    svg += `<text x="${p.x}" y="${p.y + 5}" font-size="14" font-weight="extrabold" fill="${textColor}" text-anchor="middle">${node}</text>`
  })

  svg += `</svg>`
  return svg
}

// Helper: Formatted Data Table Generator (Compatible with Syncfusion RTE Resizing & Quick Toolbar)
function generateTableHtml(headers = [], rows = []) {
  if (!headers || headers.length === 0) return ''

  let html = `<table class="e-rte-table" style="border-collapse: collapse; width: 100%; max-width: 550px; margin: 14px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; border: 1px solid #9ca3af; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">`
  html += `<thead><tr style="background-color: #e5e7eb; border-bottom: 2px solid #9ca3af;">`

  headers.forEach(h => {
    html += `<th style="padding: 9px 14px; border: 1px solid #9ca3af; text-align: left; font-weight: 700; color: #1f2937; background-color: #e5e7eb;">${h}</th>`
  })
  html += `</tr></thead><tbody>`

  rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb'
    html += `<tr style="background-color: ${bg};">`
    row.forEach(cell => {
      html += `<td style="padding: 8px 14px; border: 1px solid #9ca3af; color: #374151;">${cell}</td>`
    })
    html += `</tr>`
  })

  html += `</tbody></table>`
  return html
}

export default function QuestionPaperEditor({ assessment, offering, onBack }) {
  const [editorValue, setEditorValue] = useState('')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [availableCOs, setAvailableCOs] = useState([])
  const [coDetails, setCoDetails] = useState([]) // Full CO objects with code + description
  // Bloom levels are now stored directly in the questions array (q.bloom)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadingCount, setUploadingCount] = useState(0)
  const [showBlobWarning, setShowBlobWarning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showAiMenu, setShowAiMenu] = useState(false)
  const [aiMenuPosition, setAiMenuPosition] = useState({ top: 0, left: 0 })
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiPreview, setAiPreview] = useState(null) // { originalText, suggestedText, range, commandLabel }

  // AI Creation Tools States (Enhanced)
  const [showQuestionGenModal, setShowQuestionGenModal] = useState(false)
  const [questionGenParams, setQuestionGenParams] = useState({
    examType: 'Class Test (CT)',
    totalMarks: 10,
    bloomLevel: 'C4 - Analyze',
    selectedCo: '',
    numQuestions: 1,
    topic: '',
    sampleQuestion: ''
  })
  const [questionGenResults, setQuestionGenResults] = useState([]) // Array of generated questions
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0)
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)

  // Graph Generator State
  const [showGraphGenModal, setShowGraphGenModal] = useState(false)
  const [graphTheme, setGraphTheme] = useState('bw') // 'bw' (B&W print default) or 'emerald'
  const [graphType, setGraphType] = useState('directed')
  const [numNodes, setNumNodes] = useState(4)
  const [edgeRows, setEdgeRows] = useState([
    { from: 'A', to: 'B', weight: '10' },
    { from: 'B', to: 'C', weight: '15' },
    { from: 'A', to: 'C', weight: '5' },
    { from: 'C', to: 'D', weight: '8' }
  ])
  const [graphEdgesText, setGraphEdgesText] = useState('A-B: 10\nB-C: 15\nA-C: 5\nC-D: 8')
  const [graphInputMode, setGraphInputMode] = useState('form') // 'form' or 'text'

  // Table Generator State
  const [showTableGenModal, setShowTableGenModal] = useState(false)
  const [tableGridHeaders, setTableGridHeaders] = useState(['Item', 'Weight (kg)', 'Profit'])
  const [tableGridRows, setTableGridRows] = useState([
    ['1', '10', '60'],
    ['2', '20', '100'],
    ['3', '30', '120']
  ])
  const [tableAiPrompt, setTableAiPrompt] = useState('')
  const [isGeneratingTable, setIsGeneratingTable] = useState(false)

  const [examDuration, setExamDuration] = useState(assessment.examDuration || '')
  const [numQuestions, setNumQuestions] = useState(assessment.numQuestions || 0)
  const [level, setLevel] = useState(assessment.level || offering?.course?.level || '1')
  const [term, setTerm] = useState(assessment.term || offering?.course?.term || 'I')

  const BLOOM_OPTIONS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']

  const isExtraCT = Boolean(assessment.isExtraCT || (assessment.name && assessment.name.toLowerCase().startsWith('extra ct')))
  const matchedParent = assessment.name ? assessment.name.match(/\(([^)]+)\)/) : null
  const parentName = assessment.parentCTName || (matchedParent && matchedParent[1] ? matchedParent[1].replace(/^for\s+/i, '') : 'Target CT')

  const rteRef = useRef(null)
  const uploadingCountRef = useRef(0)

  useEffect(() => {
    loadPaperData()
  }, [assessment])

  // Fullscreen: ESC key handler + body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  // Close AI menu when clicking outside
  useEffect(() => {
    if (!showAiMenu) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('.ai-command-menu') && !e.target.closest('#ai-commands-btn')) {
        setShowAiMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAiMenu])

  const loadPaperData = async () => {
    setLoading(true)
    setError('')
    try {
      // Fetch available COs for this course (full objects with code + description)
      let cosList = []
      let cosFullList = []
      if (offering.course?._id || offering.course) {
        const courseId = offering.course?._id || offering.course
        try {
          const coRes = await apiService.getCourseOutcomes(courseId)
          if (coRes && coRes.outcomes && coRes.outcomes.length > 0) {
            cosList = coRes.outcomes.map(o => o.code)
            cosFullList = coRes.outcomes.map(o => ({ code: o.code, description: o.description || '' }))
          }
        } catch (coErr) {
          console.error("Failed to load course outcomes:", coErr)
        }
      }

      // Fallback to course.numCOs if no database outcomes are configured
      if (cosList.length === 0) {
        const numCOs = offering.course?.numCOs || 4
        cosList = Array.from({ length: numCOs }, (_, i) => `CO${i + 1}`)
        cosFullList = cosList.map(code => ({ code, description: '' }))
      }
      setAvailableCOs(cosList)
      setCoDetails(cosFullList)

      const res = await apiService.getQuestionPaper(assessment._id)
      const content = res.content || '<p>Write your questions here...</p>'
      setEditorValue(content)
      if (content.includes('src="blob:') || content.includes("src='blob:")) {
        setShowBlobWarning(true)
      } else {
        setShowBlobWarning(false)
      }

      const currentAssessment = res.assessment || assessment
      setExamDuration(currentAssessment.examDuration || '')
      setLevel(currentAssessment.level || offering.course?.level || '1')
      setTerm(currentAssessment.term || offering.course?.term || 'I')

      const isExtra = Boolean(currentAssessment.isExtraCT || (currentAssessment.name && currentAssessment.name.toLowerCase().startsWith('extra ct')))

      // If questions are not initialized, generate array based on assessment.numQuestions
      const qList = res.questions || []
      const finalQs = []

      // Auto-set default numQuestions for Mid (3) and Final (5) when first opening
      let targetNum = currentAssessment.numQuestions || 0
      if (targetNum === 0 && qList.length === 0) {
        if (currentAssessment.type === 'midTerm') {
          targetNum = 3
        } else if (currentAssessment.type === 'final') {
          targetNum = 5
        }
      }
      setNumQuestions(targetNum)

      for (let i = 1; i <= targetNum; i++) {
        const qNum = `Q${i}`
        const existing = qList.find(q => q.questionNumber === qNum)
        const defaultCO = isExtra ? (currentAssessment.co || 'NONE') : 'NONE'
        if (existing) {
          finalQs.push({
            questionNumber: qNum,
            maxMarks: existing.maxMarks ?? 0,
            co: isExtra ? defaultCO : (existing.co || 'NONE'),
            bloom: existing.bloom || ''
          })
        } else {
          // Default division of marks
          const defaultMax = Math.floor(currentAssessment.maxMarks / (targetNum || 1))
          finalQs.push({
            questionNumber: qNum,
            maxMarks: i === targetNum ? defaultMax + (currentAssessment.maxMarks % (targetNum || 1)) : defaultMax,
            co: defaultCO,
            bloom: ''
          })
        }
      }
      setQuestions(finalQs)
    } catch (err) {
      setError('Failed to load question paper data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNumQuestionsChange = (newVal) => {
    const val = Math.max(0, parseInt(newVal) || 0)
    setNumQuestions(val)

    const isExtra = Boolean(assessment.isExtraCT || (assessment.name && assessment.name.toLowerCase().startsWith('extra ct')))

    setQuestions(prev => {
      const updated = [...prev]
      const defaultCO = isExtra ? (assessment.co || 'NONE') : 'NONE'
      if (updated.length < val) {
        // Add new questions
        for (let i = updated.length + 1; i <= val; i++) {
          const qNum = `Q${i}`
          const defaultMax = Math.floor(assessment.maxMarks / (val || 1))
          updated.push({
            questionNumber: qNum,
            maxMarks: i === val ? defaultMax + (assessment.maxMarks % (val || 1)) : defaultMax,
            co: defaultCO,
            bloom: ''
          })
        }
      } else if (updated.length > val) {
        // Truncate
        updated.splice(val)
      }
      return updated
    })
  }

  const handleBloomChange = (idx, value) => {
    setQuestions(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], bloom: value }
      return updated
    })
  }

  const handleMetadataChange = (index, key, value) => {
    setQuestions(prev => {
      const updated = [...prev]
      if (key === 'maxMarks') {
        updated[index] = {
          ...updated[index],
          [key]: parseInt(value) || 0
        }
      } else {
        updated[index] = {
          ...updated[index],
          [key]: value
        }
      }
      return updated
    })
  }

  const savePaper = async () => {
    // 1. Check if an image is currently uploading
    if (uploadingCount > 0) {
      alert('One or more images are still temporary. Please wait until image uploads complete.')
      return
    }

    // 2. Parse editor HTML and check for unfinished temporary file uploads (blob:)
    const currentContent = rteRef.current ? rteRef.current.value : editorValue
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = currentContent || ''
    const imgs = tempDiv.querySelectorAll('img')
    let hasTemporaryImages = false
    let offendingSrc = ''
    for (let img of imgs) {
      const src = img.getAttribute('src') || ''
      // Only block blob: URLs (unfinished file uploads). Vector SVG graph diagrams and data URLs are fully valid!
      if (src.startsWith('blob:')) {
        hasTemporaryImages = true
        offendingSrc = src.substring(0, 60) + '...'
        break
      }
    }
    if (hasTemporaryImages) {
      alert(`One or more images are still uploading (${offendingSrc}). Please wait until image uploads complete.`)
      return
    }

    // Validate max marks allocation sum
    const totalAllocated = questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0)
    if (questions.length > 0 && totalAllocated !== assessment.maxMarks) {
      if (!window.confirm(`Warning: The total allocated marks for all questions is ${totalAllocated}, but the assessment's total is ${assessment.maxMarks}. Do you want to save anyway?`)) {
        return
      }
    }

    setSaving(true)
    try {
      const validCOs = Array.from(new Set(
        questions
          .map(q => q.co)
          .filter(c => c && c !== 'NONE' && c !== '')
      ))
      const aggregatedCO = validCOs.join(', ')

      // 1. Update Assessment fields (examDuration, numQuestions, level, term, co, status)
      await apiService.updateAssessment(assessment._id, {
        examDuration,
        numQuestions,
        level,
        term,
        co: aggregatedCO || assessment.co || '',
        status: validCOs.length > 0 ? 'Published' : assessment.status
      })

      // 2. Save Question Paper content and metadata questions (including bloom levels)
      await apiService.saveQuestionPaper(assessment._id, {
        content: currentContent,
        questions: questions.map(q => ({
          questionNumber: q.questionNumber,
          maxMarks: q.maxMarks,
          co: q.co,
          bloom: q.bloom || ''
        }))
      })
      alert('Question paper, metadata, and assessment settings saved successfully!')
      loadPaperData()
    } catch (err) {
      alert('Failed to save question paper: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Get pre-populated university header (CT format)
  const getHeaderHtml = () => {
    const deptName = offering.course?.department || 'Department of Computer Science and Engineering'
    const courseCode = offering.course?.courseCode || ''
    const courseTitle = offering.course?.courseName || ''
    const creditHours = offering.course?.creditHours || '3.0'
    const duration = examDuration || 'N/A'
    const fullMarks = assessment.maxMarks || 0
    const section = offering.section || ''
    const semesterName = offering.semester?.semesterName || ''
    const academicYear = offering.academicYear || ''
    const assessmentName = assessment.name || ''

    // Build Level/Term line
    const levelTermLine = (level && term) ? `Level ${level} Term ${term}` : (level ? `Level ${level}` : (term ? `Term ${term}` : ''))

    // Build assessment type label based on actual type
    let typeLabel = 'Assessment'
    const aType = assessment.type || ''
    if (aType === 'cts') typeLabel = 'Class Test'
    else if (aType === 'midTerm') typeLabel = 'Mid Term Exam'
    else if (aType === 'final') typeLabel = 'Final Exam'
    else if (aType === 'assignments') typeLabel = 'Assignment'
    else if (aType === 'presentation') typeLabel = 'Presentation'
    else if (aType === 'attendance') typeLabel = 'Attendance'
    else if (aType === 'performance') typeLabel = 'Performance'

    const semesterFull = academicYear ? `${semesterName} ${academicYear}` : semesterName
    const ctParts = []
    
    const creditsVal = parseFloat(offering.course?.creditHours || offering.course?.numCredits) || 3
    const standardCTCount = Math.max(1, Math.floor(creditsVal))
    const formattedAssessmentName = isExtraCT ? `Extra CT (CT-${standardCTCount + 1})` : assessmentName

    let typeName = ''
    if (aType === 'cts') {
      typeName = `Class Test: ${formattedAssessmentName}`
    } else if (aType === 'midTerm') {
      typeName = `Mid Term Examination`
    } else if (aType === 'final') {
      typeName = `Final Examination`
    } else {
      typeName = `${typeLabel}: ${formattedAssessmentName}`
    }
    
    if (typeName) ctParts.push(typeName)
    if (section) ctParts.push(`Section: ${section}`)
    if (semesterFull) ctParts.push(`Semester: ${semesterFull}`)
    const ctLine = ctParts.join(', ')

    return `
      <div style="text-align: center; font-family: 'Times New Roman', Times, serif; margin-bottom: 20px; line-height: 1.5; color: #000;">
        <p style="margin: 0; font-size: 16px; font-weight: bold;">${deptName}</p>
        ${levelTermLine ? `<p style="margin: 2px 0 0 0; font-size: 15px; font-weight: bold;">${levelTermLine}</p>` : ''}
        <p style="margin: 2px 0 0 0; font-size: 14px;">Course code: ${courseCode}</p>
        <p style="margin: 2px 0 0 0; font-size: 14px;">Course title: ${courseTitle}</p>
        <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold;">Credit Hour: ${creditHours}, Exam Duration: ${duration}, Full Marks: ${fullMarks}</p>
        ${ctLine ? `<p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold;">${ctLine}</p>` : ''}
        <hr style="border: none; border-top: 1.5px solid #000; margin-top: 10px;" />
      </div>
    `
  }

  // Generate CO description lines for print/export (shown before questions)
  const getCoDescriptionsHtml = () => {
    if (questions.length === 0) return ''

    // Collect unique COs used by questions
    const usedCOs = new Set()
    questions.forEach(q => {
      if (q.co && q.co !== 'NONE') usedCOs.add(q.co)
    })

    let html = ''
    // Sort COs and show description for each
    const sortedCOs = Array.from(usedCOs).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    )

    sortedCOs.forEach(coKey => {
      const coObj = coDetails.find(c => c.code === coKey)
      const coDesc = coObj?.description || ''
      if (coDesc) {
        html += `<p style="margin: 15px 0 8px 0; font-size: 14px; font-weight: bold; font-style: normal;">${coKey}: ${coDesc}</p>`
      }
    })

    return html
  }

  // Inject [CO→Bloom] tags and marks into each question's HTML for print/export
  const injectQuestionAnnotations = (htmlContent) => {
    if (questions.length === 0) return htmlContent

    // Use a temporary DOM element to parse and modify the HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = htmlContent

    // Find all list items (questions are typically in <li> elements)
    const listItems = tempDiv.querySelectorAll('li')

    listItems.forEach((li, idx) => {
      if (idx < questions.length) {
        const q = questions[idx]
        const co = q.co && q.co !== 'NONE' ? q.co : ''
        const bloom = q.bloom || ''
        const marks = q.maxMarks || 0

        // Build the annotation string
        let annotation = ''

        // Add [CO→Bloom] tag if both are set
        if (co && bloom) {
          annotation += ` <strong>[${co}\u2192${bloom}]</strong>`
        } else if (co) {
          annotation += ` <strong>[${co}]</strong>`
        }

        // Create marks span (right-aligned)
        const marksSpan = `<span style="float: right; font-weight: bold; font-size: 14px; margin-left: 15px;">${marks}</span>`

        // Prepend marks float to the beginning of li content, append annotation to the end
        li.innerHTML = marksSpan + li.innerHTML + annotation
      }
    })

    return tempDiv.innerHTML
  }

  // Print styles
  const getPrintStyles = () => {
    return `
      li {
        margin-bottom: 8px;
        text-align: justify;
      }
    `
  }

  // Word export
  const handleExportWord = () => {
    const currentContent = rteRef.current ? rteRef.current.value : editorValue
    const headerHtml = getHeaderHtml()
    const coDescriptions = getCoDescriptionsHtml()
    const annotatedContent = injectQuestionAnnotations(currentContent)
    const fullHtml = headerHtml + coDescriptions + annotatedContent

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><title>Question Paper</title><style>" +
      "body { font-family: 'Times New Roman', Times, serif; padding: 20px; }" +
      "table { border-collapse: collapse; width: 100%; }" +
      "th, td { border: 1px solid black; padding: 8px; text-align: left; }" +
      getPrintStyles() +
      "</style></head><body>"
    const footer = "</body></html>"
    const sourceHTML = header + fullHtml + footer

    const blob = new Blob(['\ufeff' + sourceHTML], {
      type: 'application/msword'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${assessment.name || 'question_paper'}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Print/PDF export
  const handlePrint = () => {
    const currentContent = rteRef.current ? rteRef.current.value : editorValue
    const headerHtml = getHeaderHtml()
    const coDescriptions = getCoDescriptionsHtml()
    const annotatedContent = injectQuestionAnnotations(currentContent)

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Question Paper</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.6; color: #000; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            ${getPrintStyles()}
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${headerHtml}
          ${coDescriptions}
          <div>${annotatedContent}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleCustomImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.docx'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer })
          if (rteRef.current) {
            rteRef.current.executeCommand('insertHTML', result.value)
          }
        } catch (err) {
          console.error('Error converting file:', err)
          alert('Failed to convert Word file: ' + err.message)
        }
      }
      reader.readAsArrayBuffer(file)
    }
    input.click()
  }

  const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== "undefined" && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1") ? "https://student-outcome-analyzer-api.onrender.com" : "");

  const insertImageSettings = {
    saveUrl: `${API_BASE}/api/upload/image`,
    path: 'https://'
  }

  const getNextImageName = (currentUploading) => {
    const courseCode = (offering?.course?.courseCode || 'COURSE').replace(/[^a-zA-Z0-9]/g, '');
    const assessmentName = (assessment?.name || 'ASSESSMENT').replace(/[^a-zA-Z0-9]/g, '');
    const year = offering?.academicYear || new Date().getFullYear();
    
    // Count existing img tags in current editor content
    const currentHtml = rteRef.current ? rteRef.current.value : editorValue;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml || '';
    const imgCount = tempDiv.querySelectorAll('img').length;
    
    return `${courseCode}_${assessmentName}_Q${imgCount + currentUploading + 1}_${year}`;
  };

  const onImageUploading = (args) => {
    // Count existing img tags in current editor content
    const currentHtml = rteRef.current ? rteRef.current.value : editorValue;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml || '';
    const imgCount = tempDiv.querySelectorAll('img').length;

    if (imgCount + uploadingCountRef.current >= 10) {
      args.cancel = true;
      setUploadStatus('❌ Upload failed: A maximum of 10 images are allowed per question paper.');
      alert('A maximum of 10 images are allowed per question paper.');
      return;
    }

    uploadingCountRef.current += 1;
    setUploadingCount(uploadingCountRef.current);
    
    const token = localStorage.getItem('obe-auth-token')
    if (token && args.currentRequest) {
      args.currentRequest.setRequestHeader('Authorization', `Bearer ${token}`)
      
      const filename = getNextImageName(uploadingCountRef.current - 1)
      args.currentRequest.setRequestHeader('x-filename', filename)
    }

    const request = args.currentRequest
    if (request && request.upload) {
      request.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          const totalBlocks = 10
          const filled = Math.round((percent / 100) * totalBlocks)
          const empty = totalBlocks - filled
          const progressStr = '█'.repeat(filled) + '░'.repeat(empty)
          setUploadStatus(`Uploading image... ${progressStr} ${percent}%`)
        }
      }
    }
  }

  const onImageUploadSuccess = (args) => {
    uploadingCountRef.current = Math.max(0, uploadingCountRef.current - 1)
    const nextCount = uploadingCountRef.current
    setUploadingCount(nextCount)
    if (nextCount === 0) {
      setUploadStatus('✓ Image uploaded successfully.')
      setTimeout(() => setUploadStatus(''), 3000)
    }

    try {
      if (args.e && args.e.currentTarget && args.e.currentTarget.response) {
        const response = JSON.parse(args.e.currentTarget.response)
        let newUrl = ''
        if (response && response.success && response.url) {
          newUrl = response.url
        } else if (response && response.secureUrl) {
          newUrl = response.secureUrl
        }

        if (newUrl) {
          // Strip "https://" or "http://" prefix from the start of newUrl
          // because Syncfusion will prepend the "path" setting (which we set to 'https://')
          let relativeName = newUrl
          if (newUrl.startsWith('https://')) {
            relativeName = newUrl.substring(8)
          } else if (newUrl.startsWith('http://')) {
            relativeName = newUrl.substring(7)
          }
          
          // Set args.file.name to update the internal Syncfusion model natively
          if (args.file) {
            args.file.name = relativeName
          }
        }
      }
    } catch (err) {
      console.error('Error parsing image upload response:', err)
    }
  }

  const onImageUploadFailed = (args) => {
    uploadingCountRef.current = Math.max(0, uploadingCountRef.current - 1)
    const nextCount = uploadingCountRef.current
    setUploadingCount(nextCount)
    if (nextCount === 0) {
      setUploadStatus('❌ Upload failed.')
      setTimeout(() => setUploadStatus(''), 3000)
    }

    console.error('Image upload failed:', args)
    let message = 'Image upload failed. Please try again.'
    try {
      if (args.e && args.e.currentTarget && args.e.currentTarget.response) {
        const response = JSON.parse(args.e.currentTarget.response)
        if (response && response.message) {
          message = `Upload failed: ${response.message}`
          if (response.error) {
            message += `\n\nDetails: ${response.error}`
          }
        }
      }
    } catch (e) {}
    alert(message)
  }

  const onDialogOpen = (args) => {
    if (args.container) {
      const uploadInput = args.container.querySelector('.e-rte-upload-input');
      if (uploadInput && uploadInput.ej2_instances && uploadInput.ej2_instances[0]) {
        const uploaderInstance = uploadInput.ej2_instances[0];
        
        // Enable multiple file upload and set limit
        uploaderInstance.multiple = true;
        uploaderInstance.maxFilesCount = 10;
        uploaderInstance.filesLimit = 10;
        
        // Attach selected event handler to enforce the 10-image limit when selecting files
        uploaderInstance.selected = (selectArgs) => {
          const currentHtml = rteRef.current ? rteRef.current.value : editorValue;
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = currentHtml || '';
          const imgCount = tempDiv.querySelectorAll('img').length;
          
          const newFilesCount = selectArgs.filesData.length;
          if (imgCount + uploadingCountRef.current + newFilesCount > 10) {
            selectArgs.cancel = true;
            alert('A maximum of 10 images are allowed per question paper.');
          }
        };
      }
    }
  }

  // AI Commands handler
  const handleAiButtonClick = () => {
    const btn = document.getElementById('ai-commands-btn')
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setAiMenuPosition({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 260) })
    }
    setShowAiMenu(prev => !prev)
  }

  const handleAICommand = async (command, subCommand = '') => {
    setShowAiMenu(false)
    const editor = rteRef.current
    if (!editor) return

    // Get selected text from the editor
    const editorDoc = editor.contentModule?.getDocument()
    const sel = editorDoc ? editorDoc.getSelection() : window.getSelection()
    const selectedText = sel ? sel.toString().trim() : ''
    if (!selectedText) {
      alert('Please select some text first, then use AI commands.')
      return
    }

    // Save selection range so we can restore it when user accepts
    let savedRange = null
    if (sel && sel.rangeCount > 0) {
      try {
        savedRange = sel.getRangeAt(0).cloneRange()
      } catch (e) {
        console.warn('Could not clone selection range:', e)
      }
    }

    let prompt = ''
    let commandLabel = command
    switch (command) {
      case 'improve': prompt = 'Improve the clarity and readability of this text:'; commandLabel = 'Improve Content'; break
      case 'shorten': prompt = 'Shorten this text while keeping the key information:'; commandLabel = 'Shorten'; break
      case 'elaborate': prompt = 'Elaborate on this text with more detail and examples:'; commandLabel = 'Elaborate'; break
      case 'summarize': prompt = 'Summarize this text concisely:'; commandLabel = 'Summarize'; break
      case 'grammar': prompt = 'Check and fix all grammar and spelling errors in this text. Return the corrected text:'; commandLabel = 'Grammar & Spelling Check'; break
      case 'tone': prompt = `Rewrite this text in a ${subCommand} tone:`; commandLabel = `Change Tone (${subCommand})`; break
      case 'style': prompt = `Rewrite this text in a ${subCommand} style:`; commandLabel = `Change Style (${subCommand})`; break
      case 'translate': prompt = `Translate this text to ${subCommand}:`; commandLabel = `Translate (${subCommand})`; break
      default: prompt = command
    }

    setAiProcessing(true)
    try {
      const token = localStorage.getItem('obe-auth-token')
      const response = await fetch(`${API_BASE}/api/ai/rte-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prompt, selectedText })
      })
      const data = await response.json()
      if (data.success && data.content) {
        setAiPreview({
          originalText: selectedText,
          suggestedText: data.content,
          range: savedRange,
          commandLabel
        })
      } else {
        alert(data.message || 'AI processing failed. Please try again.')
      }
    } catch (err) {
      console.error('AI command error:', err)
      alert('Failed to process AI command: ' + err.message)
    } finally {
      setAiProcessing(false)
    }
  }

  const handleAcceptAiSuggestion = () => {
    if (!aiPreview || !rteRef.current) return
    const editor = rteRef.current
    const editorDoc = editor.contentModule?.getDocument()

    // 1. Focus the editor first
    editor.focusIn()

    // 2. Restore saved range if available
    const sel = editorDoc ? editorDoc.getSelection() : window.getSelection()
    if (sel && aiPreview.range) {
      try {
        sel.removeAllRanges()
        sel.addRange(aiPreview.range)
      } catch (e) {
        console.warn('Could not restore selection range:', e)
      }
    }

    // 3. Save snapshot into Syncfusion RTE formatter to register undo state
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }

    // 4. Convert plain text AI output into structured HTML paragraphs/lists
    const htmlContent = formatAiTextToHtml(aiPreview.suggestedText)

    // 5. Replace selection via Syncfusion executeCommand (this integrates directly into Syncfusion Undo stack)
    editor.executeCommand('insertHTML', htmlContent)

    // 6. Close preview modal
    setAiPreview(null)
  }

  const handleRejectAiSuggestion = () => {
    setAiPreview(null)
  }

  // --- AI Creation Tools Handlers (Enhanced) ---
  const handleGenerateQuestion = async () => {
    if (!questionGenParams.topic) {
      alert('Please enter a topic or syllabus description.')
      return
    }
    setIsGeneratingQuestion(true)
    setQuestionGenResults([])

    const coInfo = questionGenParams.selectedCo && questionGenParams.selectedCo !== 'NONE'
      ? `Target Course Outcome (CO): ${questionGenParams.selectedCo}`
      : ''

    const prompt = `Generate ${questionGenParams.numQuestions || 1} distinct university exam question option(s) for assessment '${questionGenParams.examType}', course '${offering?.course?.name || ''}', total marks ${questionGenParams.totalMarks}, Bloom's taxonomy level '${questionGenParams.bloomLevel}'.
${coInfo}
Topic/Syllabus: '${questionGenParams.topic}'.
${questionGenParams.sampleQuestion ? `Reference style: '${questionGenParams.sampleQuestion}'` : ''}

STRICT INSTRUCTIONS:
1. If generating multiple questions, separate each distinct question option with the EXACT delimiter "===QUESTION_BREAK===".
2. Format each question with sub-parts (a), (b) and mark distributions [X Marks] totaling ${questionGenParams.totalMarks}.
3. Return clean, professional text without conversational intro.`

    try {
      const token = localStorage.getItem('obe-auth-token')
      const response = await fetch(`${API_BASE}/api/ai/rte-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prompt })
      })
      const data = await response.json()
      if (data.success && data.content) {
        const questionsArray = data.content
          .split(/===QUESTION_BREAK===/i)
          .map(q => q.trim())
          .filter(Boolean)
        setQuestionGenResults(questionsArray.length > 0 ? questionsArray : [data.content])
        setSelectedQuestionIndex(0)
      } else {
        alert(data.message || 'Question generation failed.')
      }
    } catch (err) {
      alert('Error generating question: ' + err.message)
    } finally {
      setIsGeneratingQuestion(false)
    }
  }

  const handleInsertQuestionResult = () => {
    const selectedText = questionGenResults[selectedQuestionIndex]
    if (!selectedText || !rteRef.current) return
    const editor = rteRef.current
    editor.focusIn()
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }
    const htmlToInsert = formatAiTextToHtml(selectedText)
    editor.executeCommand('insertHTML', htmlToInsert)
    setShowQuestionGenModal(false)
    setQuestionGenResults([])
  }

  // Edge Form Sync Handlers
  const handleUpdateEdgeRow = (index, field, value) => {
    const updated = [...edgeRows]
    updated[index][field] = value
    setEdgeRows(updated)
    // Sync to graphEdgesText
    const text = updated.map(e => `${e.from}-${e.to}${e.weight ? `: ${e.weight}` : ''}`).join('\n')
    setGraphEdgesText(text)
  }

  const handleAddEdgeRow = () => {
    const nodeLabels = Array.from({ length: Math.max(numNodes, 2) }, (_, i) => String.fromCharCode(65 + i))
    const from = nodeLabels[0] || 'A'
    const to = nodeLabels[1] || 'B'
    const updated = [...edgeRows, { from, to, weight: '' }]
    setEdgeRows(updated)
    const text = updated.map(e => `${e.from}-${e.to}${e.weight ? `: ${e.weight}` : ''}`).join('\n')
    setGraphEdgesText(text)
  }

  const handleRemoveEdgeRow = (index) => {
    const updated = edgeRows.filter((_, i) => i !== index)
    setEdgeRows(updated)
    const text = updated.map(e => `${e.from}-${e.to}${e.weight ? `: ${e.weight}` : ''}`).join('\n')
    setGraphEdgesText(text)
  }

  const handleInsertGraph = () => {
    if (!rteRef.current) return
    const editor = rteRef.current
    editor.focusIn()
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }
    const svgMarkup = generateGraphSvg(graphEdgesText, graphType === 'directed', graphTheme)
    
    // Base64 encoding avoids URL fragment truncation (# symbol parsing issue) in browsers
    const svgBase64 = btoa(unescape(encodeURIComponent(svgMarkup)))
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`

    // Insert image inside block container with clear: both to prevent text wrapping or auto-floating shift
    const htmlToInsert = `<p style="clear: both; text-align: center; margin: 14px 0;"><img src="${dataUrl}" alt="Graph Diagram" class="e-rte-image e-imgbreak e-imgcenter" style="min-width: 120px; max-width: 100%; width: 400px; height: auto;" /></p><p style="clear: both;"><br></p>`
    editor.executeCommand('insertHTML', htmlToInsert)
    setShowGraphGenModal(false)
  }

  // Data Table Grid Handlers
  const handleUpdateHeader = (colIndex, val) => {
    const updated = [...tableGridHeaders]
    updated[colIndex] = val
    setTableGridHeaders(updated)
  }

  const handleUpdateCell = (rowIndex, colIndex, val) => {
    const updated = tableGridRows.map((r, rIdx) => {
      if (rIdx === rowIndex) {
        const rowCopy = [...r]
        rowCopy[colIndex] = val
        return rowCopy
      }
      return r
    })
    setTableGridRows(updated)
  }

  const handleAddTableColumn = () => {
    setTableGridHeaders([...tableGridHeaders, `Header ${tableGridHeaders.length + 1}`])
    setTableGridRows(tableGridRows.map(r => [...r, '']))
  }

  const handleRemoveTableColumn = (colIndex) => {
    if (tableGridHeaders.length <= 1) return
    setTableGridHeaders(tableGridHeaders.filter((_, i) => i !== colIndex))
    setTableGridRows(tableGridRows.map(r => r.filter((_, i) => i !== colIndex)))
  }

  const handleAddTableRow = () => {
    const emptyRow = Array(tableGridHeaders.length).fill('')
    setTableGridRows([...tableGridRows, emptyRow])
  }

  const handleRemoveTableRow = (rowIndex) => {
    if (tableGridRows.length <= 1) return
    setTableGridRows(tableGridRows.filter((_, i) => i !== rowIndex))
  }

  const handleGenerateTableWithAi = async () => {
    if (!tableAiPrompt) {
      alert('Please enter a table topic or description.')
      return
    }
    setIsGeneratingTable(true)
    const prompt = `Generate a CSV formatted data table for a university exam question about: '${tableAiPrompt}'.
Return ONLY comma-separated lines. The first line MUST be headers. The following lines MUST be row values. Do not include markdown code block syntax or preambles.`

    try {
      const token = localStorage.getItem('obe-auth-token')
      const response = await fetch(`${API_BASE}/api/ai/rte-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prompt })
      })
      const data = await response.json()
      if (data.success && data.content) {
        const lines = data.content.trim().split('\n').filter(Boolean)
        if (lines.length > 0) {
          const parsedHeaders = lines[0].split(',').map(h => h.trim())
          const parsedRows = lines.slice(1).map(l => l.split(',').map(c => c.trim()))
          setTableGridHeaders(parsedHeaders)
          setTableGridRows(parsedRows)
        }
      } else {
        alert(data.message || 'Table generation failed.')
      }
    } catch (err) {
      alert('Error generating table: ' + err.message)
    } finally {
      setIsGeneratingTable(false)
    }
  }

  const handleInsertTable = () => {
    if (!rteRef.current) return
    if (tableGridHeaders.length === 0) {
      alert('Please specify table headers.')
      return
    }

    const editor = rteRef.current
    editor.focusIn()
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }
    const tableHtml = generateTableHtml(tableGridHeaders, tableGridRows)
    editor.executeCommand('insertHTML', tableHtml)
    setShowTableGenModal(false)
  }

  const toolbarSettings = {
    type: 'MultiRow',
    items: [
      'Undo', 'Redo', '|',
      'FormatPainter', '|',
      'ImportWord', 'ExportWord', 'ExportPdf', '|',
      'Bold', 'Italic', 'Underline', 'StrikeThrough', '|',
      'SubScript', 'SuperScript', '|',
      'FontName', 'FontSize', 'FontColor', 'BackgroundColor', '|',
      'EmojiPicker', 'CreateLink', '|',
      'Formats', 'Blockquote', '|',
      'NumberFormatList', 'BulletFormatList', '|',
      'Outdent', 'Indent', '|',
      'Image', 'CreateTable', '|',
      'LowerCase', 'UpperCase', '|',
      'Alignments', '|',
      'ClearFormat', 'Print', 'SourceCode', '|',
      {
        tooltipText: 'AI Commands (Select text first)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="ai-commands-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; gap: 4px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg><span style="font-size:11px;font-weight:700;color:#059669;">AI</span></button>',
        click: handleAiButtonClick
      },
      '|',
      {
        tooltipText: 'Fullscreen Editor (MS Word View)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="fullscreen-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg></button>',
        click: () => setIsFullscreen(true)
      },
      '|',
      {
        tooltipText: 'Import Word Document (.docx) via Mammoth',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="import-word-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-up" style="display: inline-block; vertical-align: middle;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 12v6"/><path d="m9 15 3-3 3 3"/></svg></button>',
        click: handleCustomImportClick
      }
    ]
  }

  // Syncfusion Import/Export service configuration (uses Syncfusion demo endpoints)
  const importWordSettings = {
    serviceUrl: 'https://services.syncfusion.com/react/production/api/RichTextEditor/ImportFromWord'
  }
  const exportWordSettings = {
    serviceUrl: 'https://services.syncfusion.com/react/production/api/RichTextEditor/ExportToDocx',
    fileName: `${assessment.name || 'QuestionPaper'}.docx`
  }
  const exportPdfSettings = {
    serviceUrl: 'https://services.syncfusion.com/react/production/api/RichTextEditor/ExportToPdf',
    fileName: `${assessment.name || 'QuestionPaper'}.pdf`
  }

  // Slash Menu configuration - type "/" for quick formatting
  const slashMenuConfig = {
    enable: true,
    items: ['Paragraph', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'OrderedList', 'UnorderedList', 'CodeBlock', 'Blockquote']
  }

  // Paste Cleanup configuration - prompts user when pasting from Word
  const pasteCleanupConfig = {
    prompt: true,
    plainText: false,
    keepFormat: true
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md border p-12 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-green-700" size={36} />
        <p className="text-gray-500 font-semibold">Loading Question Paper...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-white to-green-50/20 rounded-2xl shadow-md p-6 border border-green-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-green-50 rounded-lg text-green-700 transition-colors border border-green-150"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-2xl font-extrabold text-gray-800">
              Question Paper Editor: {isExtraCT ? `Extra CT (CT-${Math.max(1, Math.floor(parseFloat(offering.course?.creditHours) || 3)) + 1})` : assessment.name}
            </h1>
          </div>
          <p className="text-sm text-gray-500 font-semibold pl-9">
            Manage, format, map, and export question papers.
          </p>
        </div>

        <div className="flex items-center gap-2 pl-9 md:pl-0">
          <button
            onClick={savePaper}
            disabled={saving || uploadingCount > 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Paper</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportWord}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all"
          >
            <FileDown size={16} />
            Word
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md transition-all"
          >
            <Printer size={16} />
            Print/PDF
          </button>
        </div>
      </div>

      {showBlobWarning && (
        <div className="p-4 rounded-xl flex items-start gap-3 bg-amber-50 text-amber-800 border border-amber-200 shadow-sm font-medium">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div>
            <span className="font-bold">Warning:</span> This question paper contains temporary image references. Please reinsert those images before saving.
          </div>
        </div>
      )}

      {uploadStatus && (
        <div className="p-4 rounded-xl flex items-center gap-3 bg-blue-50 text-blue-800 border border-blue-200 shadow-sm font-semibold">
          <Loader2 className={`shrink-0 ${uploadStatus.includes('✓') || uploadStatus.includes('❌') ? '' : 'animate-spin'}`} size={20} />
          <div className="font-mono text-sm">
            {uploadStatus}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 shadow-sm font-medium">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Syncfusion Editor Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Read only header layout */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">University Header Preview (Read-Only)</h3>
            <div
              className="border p-6 bg-gray-50/50 rounded-xl"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
              dangerouslySetInnerHTML={{ __html: getHeaderHtml() }}
            />
          </div>

          {/* Syncfusion Editor */}
          <div 
            className={isFullscreen 
              ? 'fixed inset-0 z-[9999] flex flex-col' 
              : 'bg-white rounded-2xl shadow-md border border-gray-150 p-4'
            }
            style={isFullscreen ? { background: '#d6d6d6' } : {}}
          >
            {/* Fullscreen Top Bar */}
            {isFullscreen && (
              <div className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between shadow-lg shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📄</span>
                  <div>
                    <span className="text-sm font-bold">Question Paper Editor</span>
                    <span className="text-xs text-gray-400 ml-3">{assessment.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={savePaper} disabled={saving || uploadingCount > 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                    <Save size={14} /> Save
                  </button>
                  <button onClick={handleExportWord} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all">
                    <FileDown size={14} /> Word
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all">
                    <Printer size={14} /> Print/PDF
                  </button>
                  <div className="w-px h-6 bg-gray-600 mx-1"></div>
                  <button onClick={() => setIsFullscreen(false)} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-all" title="Exit Fullscreen (ESC)">
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Editor Content Area */}
            <div className={isFullscreen ? 'flex-1 overflow-auto flex justify-center py-8 px-4' : ''}>
              <div className={isFullscreen ? 'w-full max-w-[900px] bg-white shadow-2xl rounded-sm' : ''}>
                {!isFullscreen && <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Question Paper Content</h3>}
                <RichTextEditorComponent
                  ref={rteRef}
                  value={editorValue}
                  toolbarSettings={toolbarSettings}
                  insertImageSettings={insertImageSettings}
                  imageUploading={onImageUploading}
                  imageUploadSuccess={onImageUploadSuccess}
                  imageUploadFailed={onImageUploadFailed}
                  dialogOpen={onDialogOpen}
                  height={isFullscreen ? 'calc(100vh - 180px)' : 500}
                  showCharCount={true}
                  maxLength={50000}
                  importWord={importWordSettings}
                  exportWord={exportWordSettings}
                  exportPdf={exportPdfSettings}
                  slashMenuSettings={slashMenuConfig}
                  pasteCleanupSettings={pasteCleanupConfig}
                >
                  <Inject services={[Toolbar, HtmlEditor, Link, Image, QuickToolbar, Table, FormatPainter, EmojiPicker, PasteCleanup, Count, SlashMenu, ImportExport]} />
                </RichTextEditorComponent>
              </div>
            </div>

            {/* Fullscreen Status Bar */}
            {isFullscreen && (
              <div className="bg-gray-700 text-gray-300 px-6 py-2 text-xs flex justify-between items-center shrink-0">
                <span>Press <kbd className="px-1.5 py-0.5 bg-gray-600 rounded text-gray-200 font-mono text-[10px]">ESC</kbd> to exit fullscreen</span>
                <span><kbd className="px-1.5 py-0.5 bg-gray-600 rounded text-gray-200 font-mono text-[10px]">Ctrl+S</kbd> to save</span>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Panel (Right side) */}
        <div className="space-y-6">
          {/* Assessment Settings Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3 font-sans">Assessment Settings</h3>
            <div className="space-y-4 text-xs font-semibold text-gray-600">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Level</label>
                  <select
                    value={level || '1'}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white font-extrabold text-gray-800 shadow-2xs"
                  >
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Term</label>
                  <select
                    value={term || 'I'}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white font-extrabold text-gray-800 shadow-2xs"
                  >
                    <option value="I">Term I</option>
                    <option value="II">Term II</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-600 mb-1">Exam Duration</label>
                <input
                  type="text"
                  value={examDuration}
                  onChange={(e) => setExamDuration(e.target.value)}
                  placeholder="e.g. 30 Minutes"
                  className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-600 mb-1">Number of Questions</label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleNumQuestionsChange(Math.max(0, Number(numQuestions) - 1))}
                    disabled={Number(numQuestions) <= 0}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-l-xl border border-r-0 border-gray-300 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                    title="Decrease number of questions"
                  >
                    <Minus size={15} strokeWidth={2.5} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={numQuestions}
                    onChange={(e) => handleNumQuestionsChange(e.target.value)}
                    className="w-full border border-gray-300 py-2 text-center focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-extrabold text-gray-800 text-sm min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => handleNumQuestionsChange(Number(numQuestions) + 1)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-r-xl border border-l-0 border-emerald-600 transition flex items-center justify-center shrink-0"
                    title="Increase number of questions"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Question wise CO Mapping Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3 font-sans">Question wise CO Mapping</h3>
            {isExtraCT && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 flex items-center gap-2">
                <AlertCircle size={16} className="text-indigo-600 shrink-0" />
                <span>All questions for this Extra CT are auto-mapped to <strong>{assessment.co || 'Target CO'}</strong> (inherited from {parentName}). Question count and Bloom's levels remain fully customizable.</span>
              </div>
            )}
            <p className="text-xs text-gray-500 font-semibold mb-4">Map each question to its marks, CO, and Bloom's Taxonomy level.</p>

            {questions.length === 0 ? (
              <p className="text-sm text-gray-500 font-semibold text-center py-6">No questions configured. Set the number of questions in assessment settings above.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div key={q.questionNumber} className="border p-4 rounded-xl space-y-3 bg-gray-50/30">
                    <div className="flex justify-between items-center border-b pb-1.5">
                      <span className="font-extrabold text-gray-800">{q.questionNumber}</span>
                      {q.co && q.co !== 'NONE' && q.bloom && (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          [{q.co}→{q.bloom}]
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">Max Marks</label>
                        <input
                          type="number"
                          min="0"
                          value={q.maxMarks}
                          onChange={(e) => handleMetadataChange(idx, 'maxMarks', e.target.value)}
                          className="w-full border border-gray-300 px-2 py-1.5 rounded-lg bg-white font-semibold"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-bold text-gray-600">Mapped CO</label>
                          {isExtraCT && (
                            <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              Auto-Mapped
                            </span>
                          )}
                        </div>
                        <select
                          value={q.co}
                          disabled={isExtraCT}
                          onChange={(e) => !isExtraCT && handleMetadataChange(idx, 'co', e.target.value)}
                          className={`w-full border border-gray-300 px-2 py-1.5 rounded-lg font-semibold ${isExtraCT ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-dashed' : 'bg-white'}`}
                        >
                          {availableCOs.map(coVal => (
                            <option key={coVal} value={coVal}>{coVal}</option>
                          ))}
                          <option value="NONE">NONE</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-600 mb-1">Bloom's</label>
                        <select
                          value={q.bloom || ''}
                          onChange={(e) => handleBloomChange(idx, e.target.value)}
                          className="w-full border border-gray-300 px-2 py-1.5 rounded-lg bg-white font-semibold"
                        >
                          <option value="">—</option>
                          {BLOOM_OPTIONS.map(bl => (
                            <option key={bl} value={bl}>{bl}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <div className="flex justify-between items-center text-sm font-bold text-gray-700 bg-gray-50 p-3 rounded-lg border">
                <span>Total Allocated Marks:</span>
                <span className={questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0) === assessment.maxMarks ? 'text-green-700' : 'text-yellow-700'}>
                  {questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0)} / {assessment.maxMarks}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Processing Overlay */}
      {aiProcessing && (
        <div className="fixed inset-0 z-[10000] bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 border">
            <Loader2 className="animate-spin text-emerald-600" size={36} />
            <p className="text-gray-700 font-bold text-sm">AI is processing your text...</p>
            <p className="text-gray-400 text-xs">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* AI Commands Dropdown Menu (System Theme) */}
      {showAiMenu && (
        <div
          className="ai-command-menu fixed z-[10001] bg-white rounded-xl shadow-2xl border border-emerald-200/80 p-1.5 w-[240px] font-sans text-xs animate-in fade-in duration-150"
          style={{ top: aiMenuPosition.top, left: aiMenuPosition.left }}
        >
          {/* Menu Header Bar */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white font-extrabold text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg flex items-center justify-between shadow-sm mb-1.5">
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-emerald-300" />
              AI ASSISTANT
            </span>
            <span className="text-[9px] text-emerald-200/90 font-normal">OBE TOOLS</span>
          </div>

          {/* AI CREATION TOOLS (NEW) */}
          <div className="px-2 py-1 text-[9px] font-bold text-emerald-800 uppercase tracking-wider">AI Creation Tools</div>
          <button
            onClick={() => { setShowAiMenu(false); setShowQuestionGenModal(true); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-normal transition-all text-left"
          >
            <span className="text-sm">🎯</span>
            <span>Automated Question Gen</span>
          </button>
          <button
            onClick={() => { setShowAiMenu(false); setShowGraphGenModal(true); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-normal transition-all text-left"
          >
            <span className="text-sm">🕸️</span>
            <span>Automated Graph Diagram</span>
          </button>
          <button
            onClick={() => { setShowAiMenu(false); setShowTableGenModal(true); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-normal transition-all text-left"
          >
            <span className="text-sm">📊</span>
            <span>Automated Data Table</span>
          </button>

          <div className="border-t border-gray-100 my-1.5"></div>

          {/* Quick Commands */}
          <div className="px-2 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Text Refinement (Select text)</div>
          {[
            { icon: '✨', label: 'Improve Content', cmd: 'improve' },
            { icon: '📝', label: 'Shorten', cmd: 'shorten' },
            { icon: '📖', label: 'Elaborate', cmd: 'elaborate' },
            { icon: '📋', label: 'Summarize', cmd: 'summarize' },
            { icon: '✅', label: 'Check Grammar & Spelling', cmd: 'grammar' },
          ].map(item => (
            <button
              key={item.cmd}
              onClick={() => handleAICommand(item.cmd)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 font-semibold transition-all text-left"
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <div className="border-t border-gray-100 my-1"></div>

          {/* Change Tone submenu */}
          <div className="group relative">
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 font-semibold transition-all text-left">
              <div className="flex items-center gap-2.5">
                <span className="text-sm">🎭</span>
                <span>Change Tone</span>
              </div>
              <ChevronRight size={14} className="text-emerald-600/70" />
            </button>
            <div className="absolute left-full top-0 ml-1.5 bg-white rounded-xl shadow-2xl border border-emerald-100 p-1 w-[160px] hidden group-hover:block animate-in fade-in duration-150">
              {['Academic', 'Formal', 'Professional', 'Casual', 'Friendly'].map(tone => (
                <button key={tone} onClick={() => handleAICommand('tone', tone)} className="w-full px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 text-left font-semibold transition-all">
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* Change Style submenu */}
          <div className="group relative">
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 font-semibold transition-all text-left">
              <div className="flex items-center gap-2.5">
                <span className="text-sm">🎨</span>
                <span>Change Style</span>
              </div>
              <ChevronRight size={14} className="text-emerald-600/70" />
            </button>
            <div className="absolute left-full top-0 ml-1.5 bg-white rounded-xl shadow-2xl border border-emerald-100 p-1 w-[160px] hidden group-hover:block animate-in fade-in duration-150">
              {['Formal', 'Informal', 'Concise', 'Detailed'].map(style => (
                <button key={style} onClick={() => handleAICommand('style', style)} className="w-full px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 text-left font-semibold transition-all">
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Translate submenu (Restricted to Bengali & English) */}
          <div className="group relative">
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 font-semibold transition-all text-left">
              <div className="flex items-center gap-2.5">
                <span className="text-sm">🌐</span>
                <span>Translate</span>
              </div>
              <ChevronRight size={14} className="text-emerald-600/70" />
            </button>
            <div className="absolute left-full top-0 ml-1.5 bg-white rounded-xl shadow-2xl border border-emerald-100 p-1 w-[150px] hidden group-hover:block animate-in fade-in duration-150">
              {['Bengali', 'English'].map(lang => (
                <button key={lang} onClick={() => handleAICommand('translate', lang)} className="w-full px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 text-left font-semibold transition-all">
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Revision Preview & Approval Modal */}
      {aiPreview && (() => {
        const { oldDiff, newDiff } = getWordDiff(aiPreview.originalText, aiPreview.suggestedText)
        const formattedHtml = formatAiTextToHtml(aiPreview.suggestedText)
        const isStructured = aiPreview.suggestedText.includes('\n')

        return (
          <div className="fixed inset-0 z-[10002] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-3xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* Modal Header (System Theme) */}
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/15 rounded-lg border border-white/20">
                    <Sparkles size={20} className="text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">AI Revision Review</h3>
                    <p className="text-xs text-emerald-200">{aiPreview.commandLabel}</p>
                  </div>
                </div>
                <button
                  onClick={handleRejectAiSuggestion}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors text-emerald-100 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content - Comparison */}
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto bg-gray-50/60">
                {/* Original Text with Deletion Highlights */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                    <span>Original Text</span>
                    <span className="text-[10px] text-gray-400 font-normal">Original selection</span>
                  </div>
                  <div className="p-4 bg-red-50/40 border border-red-200/80 rounded-xl text-sm text-gray-700 leading-relaxed font-sans">
                    {oldDiff.map((item, idx) => (
                      item.type === 'del' ? (
                        <mark key={idx} className="bg-red-100 text-red-800 font-semibold line-through px-1 py-0.5 rounded mx-0.5 border border-red-300">
                          {item.text}
                        </mark>
                      ) : (
                        <span key={idx}>{item.text}</span>
                      )
                    ))}
                  </div>
                </div>

                {/* AI Suggested Text with Word Addition Highlights / Structured HTML */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-800">
                    <span className="flex items-center gap-1.5">✨ AI Suggested Revision</span>
                    <span className="text-[10px] text-emerald-600 font-normal">New version</span>
                  </div>
                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm text-gray-800 leading-relaxed font-sans">
                    {isStructured ? (
                      <div
                        className="prose prose-sm max-w-none text-gray-800 space-y-2"
                        dangerouslySetInnerHTML={{ __html: formattedHtml }}
                      />
                    ) : (
                      newDiff.map((item, idx) => (
                        item.type === 'add' ? (
                          <mark key={idx} className="bg-emerald-100 text-emerald-900 font-semibold px-1 py-0.5 rounded mx-0.5 border border-emerald-300">
                            {item.text}
                          </mark>
                        ) : (
                          <span key={idx}>{item.text}</span>
                        )
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer / Action Buttons */}
              <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={handleRejectAiSuggestion}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <X size={16} /> Reject
                </button>
                <button
                  onClick={handleAcceptAiSuggestion}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
                >
                  <Check size={16} /> Accept & Replace
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 🎯 Modal 1: Automated Question Generator (Enhanced) */}
      {/* 🎯 Modal 1: Automated Question Generator (Enhanced) */}
      {showQuestionGenModal && (
        <div className="fixed inset-0 z-[10002] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-3xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/15 rounded-lg border border-white/20">
                  <Target size={20} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Automated Question Generator</h3>
                  <p className="text-xs text-emerald-200">Generate OBE exam questions aligned with COs & Bloom's Taxonomy</p>
                </div>
              </div>
              <button onClick={() => setShowQuestionGenModal(false)} className="p-1 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto bg-gray-50/50 text-sm">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">Assessment Type</label>
                  <select
                    value={questionGenParams.examType}
                    onChange={(e) => setQuestionGenParams({ ...questionGenParams, examType: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold text-xs"
                  >
                    <option value="Class Test (CT)">Class Test (CT)</option>
                    <option value="Mid Term Exam">Mid Term Exam</option>
                    <option value="Final Exam">Final Exam</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">Target CO</label>
                  <select
                    value={questionGenParams.selectedCo}
                    onChange={(e) => setQuestionGenParams({ ...questionGenParams, selectedCo: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold text-xs"
                  >
                    <option value="">Any / General CO</option>
                    {availableCOs.map(co => (
                      <option key={co} value={co}>{co}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={questionGenParams.totalMarks}
                    onChange={(e) => setQuestionGenParams({ ...questionGenParams, totalMarks: parseInt(e.target.value) || 10 })}
                    className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">Bloom's Taxonomy</label>
                  <select
                    value={questionGenParams.bloomLevel}
                    onChange={(e) => setQuestionGenParams({ ...questionGenParams, bloomLevel: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold text-xs"
                  >
                    <option value="C1 - Remember">C1 - Remember (Define, List)</option>
                    <option value="C2 - Understand">C2 - Understand (Explain, Discuss)</option>
                    <option value="C3 - Apply">C3 - Apply (Calculate, Solve)</option>
                    <option value="C4 - Analyze">C4 - Analyze (Compare, Contrast)</option>
                    <option value="C5 - Evaluate">C5 - Evaluate (Justify, Appraise)</option>
                    <option value="C6 - Create">C6 - Create (Design, Formulate)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">Number of Question Options to Generate</label>
                <div className="flex gap-3 items-center">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuestionGenParams({ ...questionGenParams, numQuestions: n })}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${questionGenParams.numQuestions === n ? 'bg-emerald-700 text-white border-emerald-800 shadow' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Generate {n} Option{n > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">Topic / Syllabus Requirements <span className="text-red-500">*</span></label>
                <textarea
                  rows="3"
                  value={questionGenParams.topic}
                  onChange={(e) => setQuestionGenParams({ ...questionGenParams, topic: e.target.value })}
                  placeholder="e.g. 0/1 Knapsack problem using Dynamic Programming vs Greedy strategy, recurrence relation, and Big-O time complexity"
                  className="w-full border border-gray-300 p-3 rounded-xl bg-white font-sans text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">Optional Reference / Sample Style</label>
                <textarea
                  rows="2"
                  value={questionGenParams.sampleQuestion}
                  onChange={(e) => setQuestionGenParams({ ...questionGenParams, sampleQuestion: e.target.value })}
                  placeholder="Paste an example question style if you want AI to mimic its structure..."
                  className="w-full border border-gray-300 p-2.5 rounded-xl bg-white font-sans text-xs"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateQuestion}
                  disabled={isGeneratingQuestion}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow disabled:opacity-50"
                >
                  {isGeneratingQuestion ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  {isGeneratingQuestion ? 'Generating Questions...' : '✨ Generate Questions with AI'}
                </button>
              </div>

              {/* Generated Question Option Cards & Selector */}
              {questionGenResults.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <Check size={14} /> Generated Question Options ({questionGenResults.length})
                    </span>
                    <span className="text-[11px] text-gray-500 font-semibold">Select an option to insert</span>
                  </div>

                  {/* Tabs / Selection Cards */}
                  <div className="flex gap-2 border-b border-gray-200 pb-2">
                    {questionGenResults.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedQuestionIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedQuestionIndex === idx ? 'bg-emerald-800 text-white border-emerald-900 shadow' : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50'}`}
                      >
                        Option #{idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Selected Question Card Content */}
                  <div
                    className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-gray-800 leading-relaxed font-sans shadow-inner"
                    dangerouslySetInnerHTML={{ __html: formatAiTextToHtml(questionGenResults[selectedQuestionIndex] || '') }}
                  />
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex justify-end gap-2.5">
              <button onClick={() => setShowQuestionGenModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs">
                Cancel
              </button>
              {questionGenResults.length > 0 && (
                <button onClick={handleInsertQuestionResult} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow">
                  <Plus size={16} /> Insert Selected Question into Paper
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🕸️ Modal 2: Automated Graph Diagram Generator (B&W Print Theme Default + Form Builder) */}
      {showGraphGenModal && (
        <div className="fixed inset-0 z-[10002] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-3xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/15 rounded-lg border border-white/20">
                  <Share2 size={20} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Automated Graph Diagram Generator</h3>
                  <p className="text-xs text-emerald-200">Create vector SVG graph diagrams for exam papers & algorithms</p>
                </div>
              </div>
              <button onClick={() => setShowGraphGenModal(false)} className="p-1 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto bg-gray-50/50 text-sm">
              {/* Presets */}
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1.5">Quick Academic Presets</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setGraphType('directed'); setGraphEdgesText('A-B: 10\nB-C: 15\nA-C: 5\nC-D: 8'); setEdgeRows([{ from: 'A', to: 'B', weight: '10' }, { from: 'B', to: 'C', weight: '15' }, { from: 'A', to: 'C', weight: '5' }, { from: 'C', to: 'D', weight: '8' }]); }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                  >
                    4-Node Weighted Graph
                  </button>
                  <button
                    onClick={() => { setGraphType('directed'); setGraphEdgesText('ROOT-L: 4\nROOT-R: 7\nL-L1: 2\nL-L2: 5\nR-R1: 8\nR-R2: 9'); setEdgeRows([{ from: 'ROOT', to: 'L', weight: '4' }, { from: 'ROOT', to: 'R', weight: '7' }, { from: 'L', to: 'L1', weight: '2' }, { from: 'L', to: 'L2', weight: '5' }, { from: 'R', to: 'R1', weight: '8' }, { from: 'R', to: 'R2', weight: '9' }]); }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                  >
                    Binary Tree (7 Nodes)
                  </button>
                  <button
                    onClick={() => { setGraphType('undirected'); setGraphEdgesText('1-2: 4\n1-3: 2\n2-3: 1\n2-4: 5\n3-4: 8'); setEdgeRows([{ from: '1', to: '2', weight: '4' }, { from: '1', to: '3', weight: '2' }, { from: '2', to: '3', weight: '1' }, { from: '2', to: '4', weight: '5' }, { from: '3', to: '4', weight: '8' }]); }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                  >
                    Undirected Network
                  </button>
                </div>
              </div>

              {/* Theme & Direction Controls */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">Color Theme (Print Standard)</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGraphTheme('bw')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${graphTheme === 'bw' ? 'bg-gray-900 text-white border-black shadow' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
                    >
                      🔘 Black & White (Print Ready)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGraphTheme('emerald')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${graphTheme === 'emerald' ? 'bg-emerald-700 text-white border-emerald-800 shadow' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
                    >
                      🎨 Emerald System
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">Graph Direction</label>
                  <select
                    value={graphType}
                    onChange={(e) => setGraphType(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold text-xs"
                  >
                    <option value="directed">Directed Graph (with Arrows)</option>
                    <option value="undirected">Undirected Graph</option>
                  </select>
                </div>
              </div>

              {/* Input Mode Selector */}
              <div className="flex justify-between items-center">
                <label className="font-bold text-gray-700 text-xs">Graph Edge Connections</label>
                <div className="flex gap-2 text-xs font-semibold">
                  <button
                    onClick={() => setGraphInputMode('form')}
                    className={`px-2.5 py-1 rounded-md border ${graphInputMode === 'form' ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-gray-600'}`}
                  >
                    Form Builder
                  </button>
                  <button
                    onClick={() => setGraphInputMode('text')}
                    className={`px-2.5 py-1 rounded-md border ${graphInputMode === 'text' ? 'bg-emerald-700 text-white border-emerald-800' : 'bg-white text-gray-600'}`}
                  >
                    Text Input
                  </button>
                </div>
              </div>

              {/* Form-Based Edge Builder */}
              {graphInputMode === 'form' ? (
                <div className="space-y-2 bg-white p-3 border border-gray-200 rounded-xl max-h-[220px] overflow-y-auto">
                  {edgeRows.map((edge, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-gray-500 w-4">#{idx + 1}</span>
                      <span className="font-semibold text-gray-600">From</span>
                      <input
                        type="text"
                        value={edge.from}
                        onChange={(e) => handleUpdateEdgeRow(idx, 'from', e.target.value)}
                        placeholder="Node A"
                        className="w-20 border border-gray-300 p-1.5 rounded-lg text-center font-bold"
                      />
                      <span className="text-emerald-700 font-bold">➔</span>
                      <span className="font-semibold text-gray-600">To</span>
                      <input
                        type="text"
                        value={edge.to}
                        onChange={(e) => handleUpdateEdgeRow(idx, 'to', e.target.value)}
                        placeholder="Node B"
                        className="w-20 border border-gray-300 p-1.5 rounded-lg text-center font-bold"
                      />
                      <span className="font-semibold text-gray-600 ml-2">Weight / Cost:</span>
                      <input
                        type="text"
                        value={edge.weight}
                        onChange={(e) => handleUpdateEdgeRow(idx, 'weight', e.target.value)}
                        placeholder="e.g. 10"
                        className="w-24 border border-gray-300 p-1.5 rounded-lg font-semibold"
                      />
                      <button
                        onClick={() => handleRemoveEdgeRow(idx)}
                        className="p-1 hover:bg-red-50 text-red-600 rounded-lg transition-colors ml-auto"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleAddEdgeRow}
                    className="w-full py-1.5 border border-dashed border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors mt-2"
                  >
                    <Plus size={14} /> Add Edge Connection
                  </button>
                </div>
              ) : (
                <div>
                  <textarea
                    rows="4"
                    value={graphEdgesText}
                    onChange={(e) => setGraphEdgesText(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-xl bg-white font-mono text-xs"
                    placeholder="A-B: 10&#10;B-C: 15&#10;A-C: 5"
                  />
                </div>
              )}

              {/* Live Vector SVG Preview */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Live Print Vector SVG Preview ({graphTheme === 'bw' ? 'Black & White Print Standard' : 'System Theme'})</span>
                <div
                  className="p-4 bg-white border border-emerald-200 rounded-xl shadow-inner flex justify-center"
                  dangerouslySetInnerHTML={{ __html: generateGraphSvg(graphEdgesText, graphType === 'directed', graphTheme) }}
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex justify-end gap-2.5">
              <button onClick={() => setShowGraphGenModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs">
                Cancel
              </button>
              <button onClick={handleInsertGraph} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow">
                <Plus size={16} /> Insert Resizable Graph Diagram into Question Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 Modal 3: Automated Data Table Generator (Direct Grid Data Entry + CSE Academic Presets) */}
      {showTableGenModal && (
        <div className="fixed inset-0 z-[10002] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-3xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/15 rounded-lg border border-white/20">
                  <Grid size={20} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Automated Data Table Generator</h3>
                  <p className="text-xs text-emerald-200">Directly edit table headers & data cells for exam papers</p>
                </div>
              </div>
              <button onClick={() => setShowTableGenModal(false)} className="p-1 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto bg-gray-50/50 text-sm">
              {/* Presets */}
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1.5">CSE Academic Presets</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setTableGridHeaders(['Item', 'Weight (kg)', 'Profit ($)']); setTableGridRows([['1', '10', '60'], ['2', '20', '100'], ['3', '30', '120']]); }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                  >
                    🎒 0/1 Knapsack
                  </button>
                  <button
                    onClick={() => { setTableGridHeaders(['Process', 'Arrival Time', 'Burst Time', 'Priority']); setTableGridRows([['P1', '0', '8', '2'], ['P2', '1', '4', '1'], ['P3', '2', '9', '3'], ['P4', '3', '5', '4']]); }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                  >
                    ⏱️ CPU Scheduling
                  </button>
                  <button
                    onClick={() => { setTableGridHeaders(['A', 'B', 'A AND B', 'A OR B', 'A XOR B']); setTableGridRows([['0', '0', '0', '0', '0'], ['0', '1', '0', '1', '1'], ['1', '0', '0', '1', '1'], ['1', '1', '1', '1', '0']]); }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                  >
                    🔀 Logic Truth Table
                  </button>
                  <button
                    onClick={() => { setTableGridHeaders(['Page Ref', 'Frame 1', 'Frame 2', 'Frame 3', 'Hit/Miss']); setTableGridRows([['7', '7', '-', '-', 'Miss'], ['0', '7', '0', '-', 'Miss'], ['1', '7', '0', '1', 'Miss'], ['2', '2', '0', '1', 'Miss']]); }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                  >
                    💾 Page Replacement
                  </button>
                  <button
                    onClick={() => { setTableGridHeaders(['Subnet', 'Network ID', 'Host Range', 'Broadcast ID']); setTableGridRows([['Subnet 1', '192.168.1.0/26', '192.168.1.1 - 192.168.1.62', '192.168.1.63'], ['Subnet 2', '192.168.1.64/26', '192.168.1.65 - 192.168.1.126', '192.168.1.127']]); }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                  >
                    🌐 Subnetting / IP Table
                  </button>
                </div>
              </div>

              {/* AI Prompt Input */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <label className="block font-bold text-emerald-900 text-xs">Or Auto-Generate Table via AI Prompt</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tableAiPrompt}
                    onChange={(e) => setTableAiPrompt(e.target.value)}
                    placeholder="e.g. Process allocation table with 4 processes and memory sizes"
                    className="flex-1 border border-gray-300 p-2 rounded-lg bg-white text-xs"
                  />
                  <button
                    onClick={handleGenerateTableWithAi}
                    disabled={isGeneratingTable}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow"
                  >
                    {isGeneratingTable ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    AI Generate Grid
                  </button>
                </div>
              </div>

              {/* DIRECT DATA ENTRY TABLE GRID */}
              <div className="space-y-2 bg-white p-4 border border-gray-200 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-gray-700">Direct Grid Entry (Click cell to edit)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddTableColumn}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-bold text-xs hover:bg-emerald-100 flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Column
                    </button>
                    <button
                      onClick={handleAddTableRow}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-bold text-xs hover:bg-emerald-100 flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Row
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        {tableGridHeaders.map((h, colIdx) => (
                          <th key={colIdx} className="p-1.5 border border-gray-300 font-bold text-gray-700 bg-gray-200/80">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={h}
                                onChange={(e) => handleUpdateHeader(colIdx, e.target.value)}
                                className="w-full bg-white border border-gray-300 p-1 rounded font-bold text-xs text-gray-800"
                              />
                              {tableGridHeaders.length > 1 && (
                                <button onClick={() => handleRemoveTableColumn(colIdx)} className="p-0.5 text-red-500 hover:bg-red-50 rounded">
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableGridRows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {tableGridHeaders.map((_, cIdx) => (
                            <td key={cIdx} className="p-1 border border-gray-300">
                              <input
                                type="text"
                                value={row[cIdx] || ''}
                                onChange={(e) => handleUpdateCell(rIdx, cIdx, e.target.value)}
                                className="w-full bg-transparent p-1 rounded font-sans text-xs focus:bg-white focus:border border-emerald-400 outline-none"
                              />
                            </td>
                          ))}
                          <td className="p-1 text-center w-8">
                            {tableGridRows.length > 1 && (
                              <button onClick={() => handleRemoveTableRow(rIdx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                <X size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live Preview */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Live Styled Table Preview (Editable inside Editor)</span>
                <div
                  className="p-4 bg-white border border-emerald-200 rounded-xl shadow-inner flex justify-center overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: generateTableHtml(tableGridHeaders, tableGridRows) }}
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex justify-end gap-2.5">
              <button onClick={() => setShowTableGenModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs">
                Cancel
              </button>
              <button onClick={handleInsertTable} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow">
                <Plus size={16} /> Insert Resizable Table into Question Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table & Image Alignment CSS Fix */}
      <style>{`
        .e-richtexteditor .e-rte-content table td > p,
        .e-richtexteditor .e-rte-content table td > div,
        .e-richtexteditor .e-rte-content table th > p,
        .e-richtexteditor .e-rte-content table th > div {
          text-align: inherit;
          margin: 0;
        }
        .e-richtexteditor .e-rte-content table td[style*="text-align"] > p,
        .e-richtexteditor .e-rte-content table td[style*="text-align"] > div,
        .e-richtexteditor .e-rte-content table th[style*="text-align"] > p,
        .e-richtexteditor .e-rte-content table th[style*="text-align"] > div {
          text-align: inherit !important;
        }
        /* Syncfusion RTE Image Alignment & Block Isolation Fixes */
        .e-richtexteditor .e-rte-content p:has(> img.e-rte-image),
        .e-richtexteditor .e-rte-content span.e-img-wrap {
          clear: both !important;
        }
        .e-richtexteditor .e-rte-content img.e-imgcenter,
        .e-richtexteditor .e-rte-content span.e-img-center,
        .e-richtexteditor .e-rte-content span.e-rte-img-cap.e-imgcenter {
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
          float: none !important;
          clear: both !important;
        }
        .e-richtexteditor .e-rte-content img.e-imgleft,
        .e-richtexteditor .e-rte-content span.e-img-left,
        .e-richtexteditor .e-rte-content span.e-rte-img-cap.e-imgleft {
          display: block !important;
          float: left !important;
          margin-right: 16px !important;
          margin-left: 0 !important;
          margin-top: 6px !important;
          margin-bottom: 6px !important;
          clear: both !important;
        }
        .e-richtexteditor .e-rte-content img.e-imgright,
        .e-richtexteditor .e-rte-content span.e-img-right,
        .e-richtexteditor .e-rte-content span.e-rte-img-cap.e-imgright {
          display: block !important;
          float: right !important;
          margin-left: 16px !important;
          margin-right: 0 !important;
          margin-top: 6px !important;
          margin-bottom: 6px !important;
          clear: both !important;
        }
      `}</style>
    </div>
  )
}
