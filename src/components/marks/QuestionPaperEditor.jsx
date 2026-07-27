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
import html2canvas from 'html2canvas'

import katex from 'katex'
import 'katex/dist/katex.min.css'
import { BAIUST_LOGO } from './baiustLogo'

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

// Helper: Compute positions for Graph & Tree layouts (Tree Hierarchical, Map, Circle, or Custom Dragged)
function computeGraphLayout(nodesList = [], edges = [], graphType = 'directed', customPositions = {}) {
  const width = 600
  const height = 400
  const positions = {}

  // Keep any custom dragged positions
  nodesList.forEach(node => {
    if (customPositions[node]) {
      positions[node] = { ...customPositions[node] }
    }
  })

  const unpositioned = nodesList.filter(n => !positions[n])
  if (unpositioned.length === 0) return positions

  // 1. Tree Layout Algorithm (Hierarchical Top-Down Layout for Binary, Ternary, & N-ary trees)
  if (graphType === 'tree') {
    const inDegree = {}
    const childrenMap = {}
    nodesList.forEach(n => { inDegree[n] = 0; childrenMap[n] = [] })

    edges.forEach(e => {
      if (inDegree[e.to] !== undefined) inDegree[e.to] += 1
      if (childrenMap[e.from]) childrenMap[e.from].push(e.to)
    })

    let roots = nodesList.filter(n => inDegree[n] === 0)
    if (roots.length === 0 && nodesList.length > 0) roots = [nodesList[0]]

    const levels = {}
    const visited = new Set()

    const assignLevels = (node, level) => {
      if (visited.has(node)) return
      visited.add(node)
      if (!levels[level]) levels[level] = []
      levels[level].push(node)
      const children = childrenMap[node] || []
      children.forEach(child => assignLevels(child, level + 1))
    }

    roots.forEach(r => assignLevels(r, 0))
    nodesList.forEach(n => {
      if (!visited.has(n)) {
        if (!levels[0]) levels[0] = []
        levels[0].push(n)
      }
    })

    const levelKeys = Object.keys(levels).map(Number).sort((a, b) => a - b)
    const maxLevel = levelKeys.length > 0 ? Math.max(...levelKeys) : 0
    const stepY = (height - 90) / Math.max(maxLevel, 1)

    levelKeys.forEach(lvl => {
      const nodesAtLvl = levels[lvl]
      const count = nodesAtLvl.length
      const stepX = width / (count + 1)
      const y = 45 + lvl * Math.min(stepY, 80)

      nodesAtLvl.forEach((node, idx) => {
        if (!positions[node]) {
          positions[node] = {
            x: stepX * (idx + 1),
            y: y
          }
        }
      })
    })

    return positions
  }

  // 2. Map Layout (Romania Network & Geography Layout)
  if (graphType === 'map') {
    const predefinedMapCoords = {
      'ORADEA': { x: 80, y: 40 },
      'ZERIND': { x: 60, y: 100 },
      'ARAD': { x: 50, y: 175 },
      'TIMISOARA': { x: 50, y: 255 },
      'LUGOJ': { x: 130, y: 295 },
      'MEHADIA': { x: 130, y: 345 },
      'DROBETA': { x: 130, y: 385 },
      'CRAIOVA': { x: 260, y: 385 },
      'SIBIU': { x: 210, y: 185 },
      'RIMNICU': { x: 250, y: 245 },
      'PITESTI': { x: 340, y: 295 },
      'FAGARAS': { x: 320, y: 185 },
      'BUCHAREST': { x: 440, y: 345 },
      'GIURGIU': { x: 410, y: 395 },
      'URZICENI': { x: 500, y: 305 },
      'VASLUI': { x: 550, y: 215 },
      'IASI': { x: 510, y: 135 },
      'NEAMT': { x: 450, y: 70 },
      'HIRSOVA': { x: 570, y: 305 },
      'EFORIE': { x: 580, y: 375 }
    }

    nodesList.forEach((node, idx) => {
      if (!positions[node]) {
        if (predefinedMapCoords[node]) {
          positions[node] = { ...predefinedMapCoords[node] }
        } else {
          const angle = (2 * Math.PI * idx) / nodesList.length - Math.PI / 2
          positions[node] = {
            x: 300 + 180 * Math.cos(angle),
            y: 200 + 130 * Math.sin(angle)
          }
        }
      }
    })
    return positions
  }

  // 3. Default Circular Layout
  const N = unpositioned.length
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.36

  unpositioned.forEach((node, idx) => {
    const angle = (2 * Math.PI * idx) / N - Math.PI / 2
    positions[node] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  })

  return positions
}

// Helper: SVG Graph Diagram Generator (Supports B&W Print Theme, Emerald System Theme, Custom Drag Positions)
function generateGraphSvg(edgeText = '', graphType = 'directed', theme = 'bw', customPositions = {}) {
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
  const positions = computeGraphLayout(nodeList, edges, graphType, customPositions)

  const width = 600
  const height = 400
  const nodeRadius = 22
  const isBw = theme === 'bw'
  const strokeColor = isBw ? '#000000' : '#047857'
  const lineStroke = isBw ? '#000000' : '#059669'
  const nodeFill = '#ffffff'
  const textColor = isBw ? '#000000' : '#065f46'
  const badgeFill = '#ffffff'
  const badgeStroke = isBw ? '#000000' : '#10b981'
  const badgeText = isBw ? '#000000' : '#047857'
  const isDirected = (graphType === 'directed' || graphType === 'directed_tree')

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="max-width: 100%; height: auto; font-family: 'Segoe UI', Arial, sans-serif; background-color: transparent; display: block; margin: 0 auto;">`

  svg += `<defs>
    <marker id="arrowhead-${theme}" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
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
    if (!p) return
    const fontSize = node.length > 5 ? '9' : (node.length > 3 ? '11' : '13')
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${nodeRadius}" fill="${nodeFill}" stroke="${strokeColor}" stroke-width="2.5" />`
    svg += `<text x="${p.x}" y="${p.y + 4}" font-size="${fontSize}" font-weight="extrabold" fill="${textColor}" text-anchor="middle">${node}</text>`
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

  // Header Customization State (Editable Header Info & Notes)
  const [showEditHeaderModal, setShowEditHeaderModal] = useState(false)
  const [headerCustom, setHeaderCustom] = useState({
    confidentialText: 'EXAMINATION CONFIDENTIAL',
    bengaliUniName: 'বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি, কুমিল্লা',
    englishUniName: 'BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST), CUMILLA',
    deptName: '',
    examTitle: '',
    levelTerm: '',
    courseCode: '',
    courseTitle: '',
    creditHours: '',
    duration: '',
    fullMarks: '',
    notesList: [],
    customCOs: []
  })

  // Graph Generator State & Interactive Drag-and-Drop
  const [showGraphGenModal, setShowGraphGenModal] = useState(false)
  const [graphTheme, setGraphTheme] = useState('bw') // 'bw' or 'emerald'
  const [graphType, setGraphType] = useState('directed') // 'directed', 'undirected', 'tree', 'map'
  const [numNodes, setNumNodes] = useState(4)
  const [edgeRows, setEdgeRows] = useState([
    { from: 'A', to: 'B', weight: '10' },
    { from: 'B', to: 'C', weight: '15' },
    { from: 'A', to: 'C', weight: '5' },
    { from: 'C', to: 'D', weight: '8' }
  ])
  const [graphEdgesText, setGraphEdgesText] = useState('A-B: 10\nB-C: 15\nA-C: 5\nC-D: 8')
  const [graphInputMode, setGraphInputMode] = useState('form') // 'form' or 'text'
  const [customNodePositions, setCustomNodePositions] = useState({})
  const [draggingNode, setDraggingNode] = useState(null)
  const graphSvgRef = useRef(null)

  const parseGraphData = (text) => {
    const lines = text.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)
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

    return { nodes: Array.from(nodesSet), edges }
  }

  const handleSvgMouseDown = (nodeId, e) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingNode(nodeId)
  }

  const handleSvgMouseMove = (e) => {
    if (!draggingNode || !graphSvgRef.current) return
    const rect = graphSvgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const scaleX = 600 / rect.width
    const scaleY = 400 / rect.height
    const svgX = Math.max(25, Math.min(575, mouseX * scaleX))
    const svgY = Math.max(25, Math.min(375, mouseY * scaleY))

    setCustomNodePositions(prev => ({
      ...prev,
      [draggingNode]: { x: svgX, y: svgY }
    }))
  }

  const handleSvgMouseUp = () => {
    setDraggingNode(null)
  }

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

  // Mathematical Equation Editor State & Visual Builder Mode
  const [showEquationModal, setShowEquationModal] = useState(false)
  const [equationLatex, setEquationLatex] = useState('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}')
  const [editingEquationElement, setEditingEquationElement] = useState(null)
  const [activeEquationTab, setActiveEquationTab] = useState('basic')
  const [equationEditMode, setEquationEditMode] = useState('visual') // 'visual' or 'latex'
  const [activeVisualCategory, setActiveVisualCategory] = useState('fraction') // 'fraction', 'power', 'subscript', 'root', 'delimiters', 'calculus', 'matrix'

  // Visual Builder Form States
  const [visualFraction, setVisualFraction] = useState({ num: '-b \\pm \\sqrt{b^2 - 4ac}', den: '2a' })
  const [visualPower, setVisualPower] = useState({ base: 'x', exp: '2' })
  const [visualSubscript, setVisualSubscript] = useState({ base: 'x', sub: '1' })
  const [visualRoot, setVisualRoot] = useState({ type: 'sqrt', degree: '3', expr: 'b^2 - 4ac' })
  const [visualDelimiter, setVisualDelimiter] = useState({ type: 'parentheses', expr: 'a + b' })
  const [visualCalculus, setVisualCalculus] = useState({ type: 'sum', lower: 'i=1', upper: 'n', expr: 'x_i' })
  const [visualMatrix, setVisualMatrix] = useState({ rows: 2, cols: 2, cells: [['a', 'b'], ['c', 'd']] })

  // AI Equation Creator States
  const [showAiEquationModal, setShowAiEquationModal] = useState(false)
  const [aiEquationPrompt, setAiEquationPrompt] = useState('')
  const [aiEquationLatex, setAiEquationLatex] = useState('')
  const [aiEquationGenerating, setAiEquationGenerating] = useState(false)
  const [aiEquationActiveCategory, setAiEquationActiveCategory] = useState('ml')
  const [aiEquationActiveSymbolTab, setAiEquationActiveSymbolTab] = useState('operators')
  const [aiEquationHistory, setAiEquationHistory] = useState([])
  const [editingTokenIdx, setEditingTokenIdx] = useState(null) // index of token being edited inline
  const [tokenEditValue, setTokenEditValue] = useState('')
  const aiPreviewRef = useRef(null)

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

  // Visual Builder Handlers
  const handleUpdateVisualFraction = (numVal, denVal) => {
    setVisualFraction({ num: numVal, den: denVal })
    setEquationLatex(`\\frac{${numVal}}{${denVal}}`)
  }

  const handleUpdateVisualPower = (baseVal, expVal) => {
    setVisualPower({ base: baseVal, exp: expVal })
    setEquationLatex(`{${baseVal}}^{${expVal}}`)
  }

  const handleUpdateVisualSubscript = (baseVal, subVal) => {
    setVisualSubscript({ base: baseVal, sub: subVal })
    setEquationLatex(`{${baseVal}}_{${subVal}}`)
  }

  const handleUpdateVisualRoot = (typeVal, degreeVal, exprVal) => {
    setVisualRoot({ type: typeVal, degree: degreeVal, expr: exprVal })
    if (typeVal === 'nth') {
      setEquationLatex(`\\sqrt[${degreeVal}]{${exprVal}}`)
    } else {
      setEquationLatex(`\\sqrt{${exprVal}}`)
    }
  }

  const handleUpdateVisualDelimiter = (typeVal, exprVal) => {
    setVisualDelimiter({ type: typeVal, expr: exprVal })
    let left = '('; let right = ')'
    if (typeVal === 'brackets') { left = '['; right = ']' }
    else if (typeVal === 'braces') { left = '\\{'; right = '\\}' }
    else if (typeVal === 'absolute') { left = '|'; right = '|' }
    setEquationLatex(`\\left${left} ${exprVal} \\right${right}`)
  }

  const handleUpdateVisualCalculus = (typeVal, lowerVal, upperVal, exprVal) => {
    setVisualCalculus({ type: typeVal, lower: lowerVal, upper: upperVal, expr: exprVal })
    if (typeVal === 'sum') {
      setEquationLatex(`\\sum_{${lowerVal}}^{${upperVal}} ${exprVal}`)
    } else if (typeVal === 'int') {
      setEquationLatex(`\\int_{${lowerVal}}^{${upperVal}} ${exprVal}\\,dx`)
    } else if (typeVal === 'lim') {
      setEquationLatex(`\\lim_{${lowerVal} \\to ${upperVal}} ${exprVal}`)
    } else if (typeVal === 'prod') {
      setEquationLatex(`\\prod_{${lowerVal}}^{${upperVal}} ${exprVal}`)
    }
  }

  const handleUpdateVisualMatrixCell = (rIdx, cIdx, val) => {
    const newCells = visualMatrix.cells.map((row, r) =>
      r === rIdx ? row.map((cell, c) => (c === cIdx ? val : cell)) : row
    )
    setVisualMatrix(prev => ({ ...prev, cells: newCells }))
    const rowStrings = newCells.map(row => row.join(' & '))
    setEquationLatex(`\\begin{bmatrix}\n${rowStrings.join(' \\\\\n')}\n\\end{bmatrix}`)
  }

  const handleUpdateVisualMatrixDims = (newRows, newCols) => {
    const rows = Math.max(1, Math.min(4, parseInt(newRows) || 2))
    const cols = Math.max(1, Math.min(4, parseInt(newCols) || 2))
    const newCells = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => (visualMatrix.cells[r] && visualMatrix.cells[r][c] !== undefined ? visualMatrix.cells[r][c] : ''))
    )
    setVisualMatrix({ rows, cols, cells: newCells })
    const rowStrings = newCells.map(row => row.join(' & '))
    setEquationLatex(`\\begin{bmatrix}\n${rowStrings.join(' \\\\\n')}\n\\end{bmatrix}`)
  }

  // Helper: Render LaTeX string to KaTeX HTML + MathML
  const renderEquationHtml = (latexStr) => {
    if (!latexStr || !latexStr.trim()) return ''
    try {
      return katex.renderToString(latexStr, {
        displayMode: false,
        throwOnError: false,
        output: 'htmlAndMathml'
      })
    } catch (err) {
      console.error('KaTeX rendering error:', err)
      return `<span style="color: #dc2626; font-weight: bold;">[Equation Error: ${err.message}]</span>`
    }
  }

  // Equation Modal Handlers
  const handleOpenEquationModal = (existingLatex = '', element = null) => {
    if (element) {
      setEditingEquationElement(element)
      setAiEquationLatex(existingLatex || 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}')
    } else {
      setEditingEquationElement(null)
      setAiEquationLatex('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}')
    }
    setShowAiEquationModal(true)
  }

  const handleAppendLatexSymbol = (symbolStr) => {
    setAiEquationLatex(prev => prev + symbolStr)
  }

  const handleSaveEquation = () => {
    handleInsertAiEquation()
  }

  // AI Equation Creator Handlers
  const handleGenerateEquationWithAi = async () => {
    if (!aiEquationPrompt.trim()) {
      alert('Please describe the equation you want to create.')
      return
    }
    setAiEquationGenerating(true)
    const prompt = `You are a LaTeX equation expert. Generate ONLY the raw LaTeX math code for the following equation or formula description. Do NOT include any explanation, markdown, dollar signs ($), or \\[ \\] delimiters. Return ONLY the pure LaTeX math expression that can be rendered by KaTeX.

IMPORTANT RULES:
1. Output ONLY the LaTeX code, nothing else. No text before or after.
2. Use standard LaTeX math commands compatible with KaTeX.
3. For matrices use \\begin{bmatrix}...\\end{bmatrix}
4. For piecewise functions use \\begin{cases}...\\end{cases}
5. Use \\text{} for text labels inside equations.
6. Use \\mathbf{} for bold vectors/matrices.
7. Do NOT use \\displaystyle, \\[ \\], or $$ wrappers.

Equation description: "${aiEquationPrompt}"`

    try {
      const token = localStorage.getItem('obe-auth-token')
      const response = await fetch(`${API_BASE}/api/ai/rte-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prompt })
      })
      const data = await response.json()
      if (data.success && data.content) {
        // Clean the AI response - strip any markdown code fences, dollar signs, or whitespace wrappers
        let cleanLatex = data.content.trim()
        cleanLatex = cleanLatex.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '')
        cleanLatex = cleanLatex.replace(/^\$\$?\s*/, '').replace(/\s*\$\$?$/, '')
        cleanLatex = cleanLatex.replace(/^\\\[\s*/, '').replace(/\s*\\\]$/, '')
        cleanLatex = cleanLatex.trim()
        setAiEquationLatex(cleanLatex)
      } else {
        alert(data.message || 'AI equation generation failed.')
      }
    } catch (err) {
      alert('Error generating equation: ' + err.message)
    } finally {
      setAiEquationGenerating(false)
    }
  }

  const handleInsertAiEquation = () => {
    if (!aiEquationLatex.trim()) {
      alert('Please enter or generate a LaTeX equation first.')
      return
    }
    const editor = rteRef.current
    if (!editor) return

    const renderedKaTeX = renderEquationHtml(aiEquationLatex)
    const encodedLatex = encodeURIComponent(aiEquationLatex)
    const wrapperHtml = `<span class="math-equation-wrapper" data-latex="${encodedLatex}" contenteditable="false" style="display: inline-block; padding: 2px 6px; margin: 0 2px; border: 1px dashed #93c5fd; border-radius: 4px; cursor: pointer; vertical-align: middle; background-color: #f0f9ff;" title="Click to edit equation">${renderedKaTeX}</span>`

    if (editingEquationElement) {
      // Replace existing equation in editor DOM
      editingEquationElement.outerHTML = wrapperHtml
      setEditingEquationElement(null)
    } else {
      // Insert at current cursor position
      editor.focusIn()
      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
      editor.executeCommand('insertHTML', wrapperHtml)
    }

    // Save to history (max 20 items)
    setAiEquationHistory(prev => {
      const updated = [{ latex: aiEquationLatex, label: aiEquationPrompt || aiEquationLatex.substring(0, 40) }, ...prev.filter(h => h.latex !== aiEquationLatex)]
      return updated.slice(0, 20)
    })

    setShowAiEquationModal(false)
    setAiEquationLatex('')
    setAiEquationPrompt('')
  }

  const handleAppendAiEquationSymbol = (symbolStr) => {
    setAiEquationLatex(prev => prev + symbolStr)
  }

  // Extract editable variable tokens from LaTeX string
  const extractEquationVariables = (latex) => {
    if (!latex || !latex.trim()) return []
    const tokens = []
    const seen = new Set()

    // 1. Match \mathbf{X}, \mathit{y}, \mathrm{w}, \boldsymbol{x} etc
    const mathbfRe = /\\(?:mathbf|mathit|mathrm|boldsymbol|mathcal|mathbb)\{([^}]+)\}/g
    let m
    while ((m = mathbfRe.exec(latex)) !== null) {
      const inner = m[1].trim()
      const key = `mathbf:${inner}`
      if (!seen.has(key) && inner.length <= 10) {
        seen.add(key)
        tokens.push({ display: inner, searchPattern: m[0], type: 'mathbf', value: inner })
      }
    }

    // 2. Match \text{label}
    const textRe = /\\text\{([^}]+)\}/g
    while ((m = textRe.exec(latex)) !== null) {
      const inner = m[1].trim()
      const key = `text:${inner}`
      if (!seen.has(key) && inner.length <= 20) {
        seen.add(key)
        tokens.push({ display: inner, searchPattern: m[0], type: 'text', value: inner })
      }
    }

    // 3. Match Greek letters: \alpha, \beta, \gamma, etc.
    const greekRe = /\\(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)(?![a-zA-Z])/g
    while ((m = greekRe.exec(latex)) !== null) {
      const name = m[1]
      const key = `greek:${name}`
      if (!seen.has(key)) {
        seen.add(key)
        tokens.push({ display: `\\${name}`, searchPattern: m[0], type: 'greek', value: name })
      }
    }

    // 4. Match standalone single-letter variables (not part of \commands, not inside \text{} or \mathbf{})
    // We scan character-by-character to avoid matching letters inside LaTeX commands
    const cleanedLatex = latex
      .replace(/\\(?:mathbf|mathit|mathrm|boldsymbol|mathcal|mathbb|text|operatorname|frac|sqrt|hat|bar|dot|ddot|tilde|vec|log|ln|sin|cos|tan|exp|lim|max|min|sup|inf|det|dim|deg|arg|sum|prod|int|iint|oint|partial|nabla|begin|end|left|right|cdot|cdots|ldots|vdots|ddots|times|div|pm|mp|circ|otimes|oplus|wedge|vee|neg|subset|supset|cup|cap|in|notin|emptyset|forall|exists|to|implies|iff|neq|approx|equiv|le|ge|ll|gg|propto|infty|rightarrow|leftarrow|leftrightarrow|Rightarrow|Leftarrow|mapsto|uparrow|quad|qquad|hspace|vspace|Big|big|bigg|Bigg|binom|tbinom|dbinom)(?:\{[^}]*\}|[^a-zA-Z])/g, '□')
    
    for (let i = 0; i < cleanedLatex.length; i++) {
      const ch = cleanedLatex[i]
      if (/[a-zA-Z]/.test(ch)) {
        // Check it's not preceded by \\ (part of a command)
        const prevChar = i > 0 ? cleanedLatex[i-1] : ''
        const nextChar = i < cleanedLatex.length - 1 ? cleanedLatex[i+1] : ''
        if (prevChar !== '\\' && !/[a-zA-Z]/.test(prevChar) && !/[a-zA-Z]/.test(nextChar)) {
          const key = `var:${ch}`
          if (!seen.has(key)) {
            seen.add(key)
            tokens.push({ display: ch, searchPattern: ch, type: 'variable', value: ch })
          }
        }
      }
    }

    // 5. Match standalone numbers (not inside commands)
    const numRe = /(?<!\\|[a-zA-Z{])\b(\d+(?:\.\d+)?)\b/g
    const numCleaned = latex.replace(/\\[a-zA-Z]+/g, '□')
    while ((m = numRe.exec(numCleaned)) !== null) {
      const num = m[1]
      const key = `num:${num}`
      if (!seen.has(key) && num !== '0' && num !== '1' && num !== '2') {
        seen.add(key)
        tokens.push({ display: num, searchPattern: num, type: 'number', value: num })
      }
    }

    return tokens
  }

  // Replace a specific token in the LaTeX string
  const handleVariableReplacement = (tokenIdx, newValue) => {
    const tokens = extractEquationVariables(aiEquationLatex)
    if (tokenIdx < 0 || tokenIdx >= tokens.length) return
    const token = tokens[tokenIdx]
    if (!newValue.trim()) return

    let updatedLatex = aiEquationLatex
    
    if (token.type === 'mathbf') {
      // Replace inside \mathbf{old} with \mathbf{new}
      const cmdMatch = token.searchPattern.match(/^(\\(?:mathbf|mathit|mathrm|boldsymbol|mathcal|mathbb))\{(.+)\}$/)
      if (cmdMatch) {
        const cmd = cmdMatch[1]
        const oldInner = cmdMatch[2]
        updatedLatex = updatedLatex.split(`${cmd}{${oldInner}}`).join(`${cmd}{${newValue}}`)
      }
    } else if (token.type === 'text') {
      updatedLatex = updatedLatex.split(`\\text{${token.value}}`).join(`\\text{${newValue}}`)
    } else if (token.type === 'greek') {
      // Replace Greek letter with new one (if user types a Greek name like 'beta')
      const newGreek = newValue.startsWith('\\') ? newValue : `\\${newValue}`
      updatedLatex = updatedLatex.split(`\\${token.value}`).join(newGreek)
    } else if (token.type === 'variable') {
      // Smart replace: only replace standalone instances, not inside commands
      // Use word-boundary-aware replacement
      const escaped = token.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?<![a-zA-Z\\\\{])${escaped}(?![a-zA-Z}])`, 'g')
      updatedLatex = updatedLatex.replace(regex, newValue)
    } else if (token.type === 'number') {
      updatedLatex = updatedLatex.split(token.value).join(newValue)
    }

    setAiEquationLatex(updatedLatex)
    setEditingTokenIdx(null)
    setTokenEditValue('')
  }

  // Start inline editing a token in the preview
  const handleStartTokenEdit = (idx, currentValue) => {
    setEditingTokenIdx(idx)
    setTokenEditValue(currentValue)
  }

  // Make preview interactive: add click handlers to KaTeX rendered text spans
  useEffect(() => {
    if (!aiPreviewRef.current || !aiEquationLatex.trim()) return
    const container = aiPreviewRef.current
    
    // KaTeX renders text in spans with class 'mord' (ordinary character)
    const textSpans = container.querySelectorAll('.mord, .mbin, .mrel, .mopen, .mclose, .mpunct')
    textSpans.forEach(span => {
      // Only make leaf text nodes interactive (those with direct text content)
      if (span.children.length === 0 && span.textContent.trim()) {
        span.style.cursor = 'pointer'
        span.style.transition = 'all 0.15s ease'
        span.style.borderRadius = '2px'
        span.addEventListener('mouseenter', () => {
          span.style.backgroundColor = '#d1fae5'
          span.style.outline = '2px solid #10b981'
          span.style.outlineOffset = '1px'
        })
        span.addEventListener('mouseleave', () => {
          span.style.backgroundColor = ''
          span.style.outline = ''
          span.style.outlineOffset = ''
        })
      }
    })
  }, [aiEquationLatex, showAiEquationModal])

  // True HTML DOM List Indentation helpers
  const indentListItem = (doc, editor) => {
    const activeDoc = doc || document
    const sel = activeDoc.getSelection ? activeDoc.getSelection() : window.getSelection()
    if (!sel || !sel.rangeCount) return false

    const range = sel.getRangeAt(0)
    let node = range.startContainer
    if (node.nodeType === 3) node = node.parentNode
    const li = node ? node.closest('li') : null

    if (!li) return false

    const parentList = li.parentElement // <ol> or <ul>
    if (!parentList) return false

    const prevLi = li.previousElementSibling
    if (prevLi) {
      // Find or create sub-list inside prevLi
      let subList = Array.from(prevLi.children).find(c => c.tagName === 'OL' || c.tagName === 'UL')
      if (!subList) {
        const listTag = parentList.tagName.toLowerCase()
        subList = activeDoc.createElement(listTag)
        prevLi.appendChild(subList)
      }
      subList.appendChild(li)
    } else {
      // First item in parent list: wrap its content in a sublist inside itself
      const listTag = parentList.tagName.toLowerCase()
      const subList = activeDoc.createElement(listTag)
      const newLi = activeDoc.createElement('li')
      while (li.firstChild) {
        newLi.appendChild(li.firstChild)
      }
      subList.appendChild(newLi)
      li.appendChild(subList)
      node = newLi
    }

    try {
      const newRange = activeDoc.createRange()
      newRange.selectNodeContents(node.tagName === 'LI' ? node : li)
      newRange.collapse(false)
      sel.removeAllRanges()
      sel.addRange(newRange)
    } catch (e) {
      console.warn('Selection reset error:', e)
    }
    return true
  }

  const outdentListItem = (doc, editor) => {
    const activeDoc = doc || document
    const sel = activeDoc.getSelection ? activeDoc.getSelection() : window.getSelection()
    if (!sel || !sel.rangeCount) return false

    const range = sel.getRangeAt(0)
    let node = range.startContainer
    if (node.nodeType === 3) node = node.parentNode
    const li = node ? node.closest('li') : null

    if (!li) return false

    const parentList = li.parentElement // current <ol> or <ul>
    if (!parentList) return false

    const parentLi = parentList.closest('li')
    if (parentLi) {
      const grandParentList = parentLi.parentElement
      if (grandParentList) {
        grandParentList.insertBefore(li, parentLi.nextElementSibling)
        if (parentList.children.length === 0) {
          parentList.remove()
        }
        try {
          const newRange = activeDoc.createRange()
          newRange.selectNodeContents(li)
          newRange.collapse(false)
          sel.removeAllRanges()
          sel.addRange(newRange)
        } catch (e) {
          console.warn('Selection reset error:', e)
        }
        return true
      }
    }
    return false
  }

  const removeEmptyListItem = (doc, li) => {
    const activeDoc = doc || document
    const sel = activeDoc.getSelection ? activeDoc.getSelection() : window.getSelection()
    const parentList = li ? li.parentElement : null
    if (!parentList) return false

    const p = activeDoc.createElement('p')
    p.innerHTML = '<br>'

    const grandParent = parentList.parentElement || activeDoc.body
    if (parentList.nextElementSibling) {
      grandParent.insertBefore(p, parentList.nextElementSibling)
    } else {
      grandParent.appendChild(p)
    }

    li.remove()

    if (parentList.children.length === 0) {
      parentList.remove()
    }

    try {
      const range = activeDoc.createRange()
      range.setStart(p, 0)
      range.collapse(true)
      if (sel) {
        sel.removeAllRanges()
        sel.addRange(range)
      }
    } catch (e) {
      console.warn('Cursor move error:', e)
    }
    return true
  }

  const onActionBegin = (args) => {
    if (args.requestType === 'Indent') {
      const doc = rteRef.current?.contentModule?.getDocument ? rteRef.current.contentModule.getDocument() : document
      if (indentListItem(doc, rteRef.current)) {
        args.cancel = true
      }
    } else if (args.requestType === 'Outdent') {
      const doc = rteRef.current?.contentModule?.getDocument ? rteRef.current.contentModule.getDocument() : document
      if (outdentListItem(doc, rteRef.current)) {
        args.cancel = true
      }
    }
  }

  // Click-to-Edit & MS Word Keyboard listener for Rich Text Editor
  useEffect(() => {
    const handleEditorClicks = (e) => {
      const target = e.target.closest('.math-equation-wrapper') || e.target.closest('[data-latex]')
      if (target) {
        e.preventDefault()
        e.stopPropagation()
        const encoded = target.getAttribute('data-latex') || ''
        const latex = encoded ? decodeURIComponent(encoded) : ''
        handleOpenEquationModal(latex, target)
      }
    }

    const handleMsWordKeyboard = (e) => {
      const editor = rteRef.current
      if (!editor) return

      const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
      const sel = doc ? doc.getSelection() : window.getSelection()
      if (!sel || !sel.rangeCount) return

      const range = sel.getRangeAt(0)
      let node = range.startContainer
      if (node.nodeType === 3) node = node.parentNode
      const parentElem = node ? (node.nodeType === 1 ? node : node.parentElement) : null
      const listItem = parentElem ? parentElem.closest('li') : null

      // ══════════════════════════════════════════════════════════
      // 1. BACKSPACE KEY (MS Word: Erase empty list item 2. or outdent sublist)
      // ══════════════════════════════════════════════════════════
      if (e.key === 'Backspace') {
        if (listItem) {
          const liText = listItem.textContent.replace(/[\s\u200B\u00A0\r\n\t]+/g, '').trim()
          if (!liText) {
            e.preventDefault()
            e.stopPropagation()

            const parentList = listItem.parentElement
            const parentLi = parentList ? parentList.closest('li') : null

            if (parentLi) {
              // Sublist item (a., b.) -> Outdent to main level (1., 2.)
              outdentListItem(doc, editor)
            } else {
              // Top-level item (2., 4.) -> Erase list number, turn into plain paragraph
              removeEmptyListItem(doc, listItem)
            }
            return
          }
        }
      }

      // ══════════════════════════════════════════════════════════
      // 2. ENTER KEY (MS Word: Enter on empty item exits list / outdents)
      // ══════════════════════════════════════════════════════════
      if (e.key === 'Enter' && !e.shiftKey) {
        if (listItem) {
          const liText = listItem.textContent.replace(/[\s\u200B\u00A0\r\n\t]+/g, '').trim()
          if (!liText) {
            e.preventDefault()
            e.stopPropagation()

            const parentList = listItem.parentElement
            const parentLi = parentList ? parentList.closest('li') : null

            if (parentLi) {
              outdentListItem(doc, editor)
            } else {
              removeEmptyListItem(doc, listItem)
            }
            return
          }
        }
      }

      // ══════════════════════════════════════════════════════════
      // 3. TAB KEY (MS Word: Tab indents to sublist a., b., c., Shift+Tab outdents)
      // ══════════════════════════════════════════════════════════
      if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()

        // Inside a List Item (li): Tab -> Indent (sublist a., b.), Shift+Tab -> Outdent
        if (listItem) {
          if (e.shiftKey) {
            outdentListItem(doc, editor)
          } else {
            indentListItem(doc, editor)
          }
          return
        }

        // Inside Table Cell (td/th): Navigate cells
        const tableCell = parentElem ? parentElem.closest('td, th') : null
        if (tableCell) {
          const table = tableCell.closest('table')
          if (table) {
            const allCells = Array.from(table.querySelectorAll('td, th'))
            const currentIdx = allCells.indexOf(tableCell)
            let targetIdx = e.shiftKey ? currentIdx - 1 : currentIdx + 1
            if (targetIdx >= 0 && targetIdx < allCells.length) {
              const nextCell = allCells[targetIdx]
              const nextRange = doc.createRange()
              nextRange.selectNodeContents(nextCell)
              nextRange.collapse(true)
              if (sel) {
                sel.removeAllRanges()
                sel.addRange(nextRange)
              }
            }
          }
          return
        }

        // Normal paragraph text: Insert 4 non-breaking spaces for tab indent
        if (e.shiftKey) {
          editor.executeCommand('Outdent')
        } else {
          if (editor.formatter && typeof editor.formatter.saveData === 'function') {
            editor.formatter.saveData()
          }
          editor.executeCommand('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;')
        }
      }
    }

    // Attach click, dblclick, and keydown handlers to RTE container & iframe
    let iframeDoc = null
    const timer = setTimeout(() => {
      const container = document.querySelector('.e-richtexteditor .e-rte-content')
      if (container) {
        container.addEventListener('click', handleEditorClicks)
        container.addEventListener('dblclick', handleEditorClicks)
        container.addEventListener('keydown', handleMsWordKeyboard, true)
      }

      const iframe = document.querySelector('.e-richtexteditor iframe')
      if (iframe && iframe.contentDocument) {
        iframeDoc = iframe.contentDocument
        iframeDoc.addEventListener('click', handleEditorClicks)
        iframeDoc.addEventListener('dblclick', handleEditorClicks)
        iframeDoc.addEventListener('keydown', handleMsWordKeyboard, true)
      }
    }, 500)

    return () => {
      clearTimeout(timer)
      const container = document.querySelector('.e-richtexteditor .e-rte-content')
      if (container) {
        container.removeEventListener('click', handleEditorClicks)
        container.removeEventListener('dblclick', handleEditorClicks)
        container.removeEventListener('keydown', handleMsWordKeyboard, true)
      }
      if (iframeDoc) {
        iframeDoc.removeEventListener('click', handleEditorClicks)
        iframeDoc.removeEventListener('dblclick', handleEditorClicks)
        iframeDoc.removeEventListener('keydown', handleMsWordKeyboard, true)
      }
    }
  }, [editorValue, loading])

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
            cosFullList = coRes.outcomes.map(o => ({ code: o.code, description: o.description || o.statement || o.title || '' }))
          }
        } catch (coErr) {
          console.error("Failed to load course outcomes:", coErr)
        }
      }

      // Check if course object directly contains courseOutcomes array
      if (cosFullList.length === 0 && offering.course?.courseOutcomes && Array.isArray(offering.course.courseOutcomes) && offering.course.courseOutcomes.length > 0) {
        cosFullList = offering.course.courseOutcomes.map((o, idx) => ({
          code: o.code || `CO${idx + 1}`,
          description: o.description || o.statement || o.title || ''
        }))
        cosList = cosFullList.map(o => o.code)
      }

      // Fallback to course.numCOs if no database outcomes are configured
      if (cosList.length === 0) {
        const numCOs = offering.course?.numCOs || 6
        cosList = Array.from({ length: numCOs }, (_, i) => `CO${i + 1}`)
        cosFullList = cosList.map(code => ({ code, description: `Course Outcome ${code.replace('CO', '')}` }))
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

  // Get pre-populated university header
  const getHeaderHtml = () => {
    const defaultDept = offering.course?.department || 'Department of Computer Science and Engineering'
    const rawDept = headerCustom.deptName || defaultDept
    const deptName = rawDept.replace(/^Department of\s+/i, '')

    const courseCode = headerCustom.courseCode || offering.course?.courseCode || ''
    const courseTitle = headerCustom.courseTitle || offering.course?.courseName || ''
    const creditHours = headerCustom.creditHours || offering.course?.creditHours || '3.0'
    const duration = headerCustom.duration || examDuration || '1 hour 30 Minutes'
    const fullMarks = headerCustom.fullMarks || assessment.maxMarks || 60
    const semesterName = offering.semester?.semesterName || ''
    const academicYear = offering.academicYear || ''
    const semesterFull = academicYear ? `${semesterName} ${academicYear}` : (semesterName || 'Spring 2026')
    const aType = assessment.type || ''

    const isMidTerm = aType === 'midTerm' || (assessment.name && assessment.name.toLowerCase().includes('mid'))
    const isTermFinal = aType === 'final' || (assessment.name && assessment.name.toLowerCase().includes('final'))
    const isOfficialExam = isMidTerm || isTermFinal

    // Build Level/Term format (e.g. Level-4 Term-II)
    const levelStr = level ? `Level-${level}` : 'Level-4'
    const termStr = term ? (term.startsWith('Term') ? term : `Term-${term}`) : 'Term-II'
    const levelTermLine = headerCustom.levelTerm || `${levelStr} ${termStr}`

    const confText = headerCustom.confidentialText || 'EXAMINATION CONFIDENTIAL'
    const bengaliName = headerCustom.bengaliUniName || 'বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি, কুমিল্লা'
    const englishName = headerCustom.englishUniName || 'BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST), CUMILLA'

    // Render Authentic BAIUST Official Header for Mid Term & Term Final Exams
    if (isOfficialExam) {
      const defaultTitle = isTermFinal
        ? `Term Final Examination, ${semesterFull}`
        : `Mid Term Examination, ${semesterFull}`
      const examTitleStr = headerCustom.examTitle || defaultTitle

      // Custom Notes List
      let notesArray = headerCustom.notesList
      if (!notesArray || notesArray.length === 0) {
        notesArray = [
          'Figure on the right of each question indicates the marks for the respective question.',
          ...(isTermFinal ? ['Answer all questions.'] : [])
        ]
      }

      // COs for Notes section
      const activeCOs = (headerCustom.customCOs && headerCustom.customCOs.length > 0)
        ? headerCustom.customCOs
        : (coDetails.filter(c => c && c.description && c.description.trim()).length > 0
            ? coDetails.filter(c => c && c.description && c.description.trim())
            : availableCOs.map(code => ({ code, description: `Course Outcome description for ${courseTitle || code}.` })))

      const coNotesHtml = activeCOs.map(c => `<div><strong>${c.code}:</strong> ${c.description}</div>`).join('')

      const letterPrefixes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      let notesHtml = ''
      notesArray.forEach((noteText, idx) => {
        const prefix = letterPrefixes[idx] || `${idx + 1}`
        notesHtml += `<div>${prefix}. ${noteText}</div>`
      })
      const coPrefix = letterPrefixes[notesArray.length] || 'c'
      const coHeadingLabel = isTermFinal ? 'The Course Outcomes (COs) are:' : 'Course Learning Outcomes are-'
      notesHtml += `<div>${coPrefix}. ${coHeadingLabel}</div>`
      notesHtml += `<div style="margin-left: 18px !important; margin-top: 2px !important;">${coNotesHtml}</div>`

      return `
        <div class="qp-official-header" style="font-family: 'Times New Roman', Times, serif !important; color: #000 !important; margin-bottom: 12px !important;">
          <!-- Top Confidential Header -->
          <div style="text-align: center !important; font-size: 11px !important; font-weight: bold !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; margin-bottom: 6px !important;">
            ${confText}
          </div>

          <!-- University Logo & Name Table (3-Column Perfect Centering) -->
          <table style="width: 100% !important; border: none !important; border-collapse: collapse !important; margin-bottom: 6px !important; table-layout: fixed !important;">
            <tr>
              <td style="width: 70px !important; vertical-align: middle !important; text-align: left !important; border: none !important; padding: 0 !important;">
                <img src="${BAIUST_LOGO}" alt="BAIUST Logo" style="height: 60px !important; width: auto !important; display: block !important;" />
              </td>
              <td style="text-align: center !important; vertical-align: middle !important; border: none !important; padding: 0 5px !important;">
                <div style="font-size: 16px !important; font-weight: bold !important; color: #000 !important; line-height: 1.25 !important; font-family: 'Times New Roman', Times, serif !important;">
                  ${bengaliName}
                </div>
                <div style="font-size: 13px !important; font-weight: bold !important; color: #000 !important; letter-spacing: 0.2px !important; margin-top: 2px !important; font-family: 'Times New Roman', Times, serif !important;">
                  ${englishName}
                </div>
              </td>
              <td style="width: 70px !important; border: none !important; padding: 0 !important;"></td>
            </tr>
          </table>

          <!-- Exam & Course Info Block -->
          <div style="text-align: center !important; font-size: 13.5px !important; line-height: 1.35 !important; margin-top: 4px !important;">
            <div style="font-size: 15px !important; font-weight: bold !important;">${examTitleStr}</div>
            <div style="font-weight: bold !important;">Department of ${deptName}</div>
            <div style="font-weight: bold !important;">${levelTermLine}</div>
            <div style="font-weight: bold !important;">Course Code: ${courseCode}</div>
            <div style="font-weight: bold !important;">Course Title: ${courseTitle}</div>
            <div>Credit Hour: ${creditHours}</div>
            <div>Exam Duration: ${duration}</div>
            <div>Full Marks: ${fullMarks}</div>
          </div>

          <!-- Notes Section -->
          <div style="text-align: left !important; font-size: 13px !important; margin-top: 10px !important; line-height: 1.35 !important;">
            <div style="font-weight: bold !important; margin-bottom: 2px !important;">Notes:</div>
            <div style="margin-left: 18px !important;">
              ${notesHtml}
            </div>
          </div>

          <!-- Horizontal Divider -->
          <hr style="border: none !important; border-top: 1px solid #000 !important; margin-top: 10px !important; margin-bottom: 12px !important;" />
        </div>
      `
    }

    // Default Class Test (CT) Format (Preserved)
    const section = offering.section || ''
    const assessmentName = assessment.name || ''
    const creditsVal = parseFloat(offering.course?.creditHours || offering.course?.numCredits) || 3
    const standardCTCount = Math.max(1, Math.floor(creditsVal))
    const formattedAssessmentName = isExtraCT ? `Extra CT (CT-${standardCTCount + 1})` : assessmentName

    let typeName = ''
    if (aType === 'cts') {
      typeName = `Class Test: ${formattedAssessmentName}`
    } else {
      typeName = `Assessment: ${formattedAssessmentName}`
    }
    
    const ctParts = []
    if (typeName) ctParts.push(typeName)
    if (section) ctParts.push(`Section: ${section}`)
    if (semesterFull) ctParts.push(`Semester: ${semesterFull}`)
    const ctLine = ctParts.join(', ')

    return `
      <div class="qp-header-wrapper" style="text-align: center !important; font-family: 'Times New Roman', Times, serif !important; margin-bottom: 15px !important; line-height: 1.3 !important; color: #000 !important;">
        <!-- University Logo & English Name Header for CT (Smaller Font) -->
        <table style="width: 100% !important; border: none !important; border-collapse: collapse !important; margin-bottom: 8px !important; table-layout: fixed !important;">
          <tr>
            <td style="width: 55px !important; vertical-align: middle !important; text-align: left !important; border: none !important; padding: 0 !important;">
              <img src="${BAIUST_LOGO}" alt="BAIUST Logo" style="height: 46px !important; width: auto !important; display: block !important;" />
            </td>
            <td style="text-align: center !important; vertical-align: middle !important; border: none !important; padding: 0 5px !important;">
              <div style="font-size: 11.5px !important; font-weight: bold !important; color: #000 !important; letter-spacing: 0.2px !important; font-family: 'Times New Roman', Times, serif !important;">
                ${englishName}
              </div>
            </td>
            <td style="width: 55px !important; border: none !important; padding: 0 !important;"></td>
          </tr>
        </table>

        <p style="margin: 0 !important; font-size: 16px !important; font-weight: bold !important; text-align: center !important; line-height: 1.3 !important; padding: 0 !important;">Department of ${deptName}</p>
        ${levelTermLine ? `<p style="margin: 2px 0 0 0 !important; font-size: 15px !important; font-weight: bold !important; text-align: center !important; line-height: 1.3 !important; padding: 0 !important;">${levelTermLine}</p>` : ''}
        <p style="margin: 2px 0 0 0 !important; font-size: 14px !important; text-align: center !important; line-height: 1.3 !important; padding: 0 !important;">Course code: ${courseCode}</p>
        <p style="margin: 2px 0 0 0 !important; font-size: 14px !important; text-align: center !important; line-height: 1.3 !important; padding: 0 !important;">Course title: ${courseTitle}</p>
        <p style="margin: 2px 0 0 0 !important; font-size: 14px !important; font-weight: bold !important; text-align: center !important; line-height: 1.3 !important; padding: 0 !important;">Credit Hour: ${creditHours}, Exam Duration: ${duration}, Full Marks: ${fullMarks}</p>
        ${ctLine ? `<p style="margin: 2px 0 0 0 !important; font-size: 14px !important; font-weight: bold !important; text-align: center !important; line-height: 1.3 !important; padding: 0 !important;">${ctLine}</p>` : ''}
        <hr style="border: none !important; border-top: 1.5px solid #000 !important; margin-top: 10px !important; margin-bottom: 15px !important;" />
      </div>
    `
  }

  // Generate CO description lines for print/export (only for CTs, as Mid/Final includes them in Notes)
  const getCoDescriptionsHtml = () => {
    const aType = assessment.type || ''
    const isMidTerm = aType === 'midTerm' || (assessment.name && assessment.name.toLowerCase().includes('mid'))
    const isTermFinal = aType === 'final' || (assessment.name && assessment.name.toLowerCase().includes('final'))
    if (isMidTerm || isTermFinal) return '' // Included in official Notes header

    if (questions.length === 0) return ''

    const usedCOs = new Set()
    questions.forEach(q => {
      if (q.co && q.co !== 'NONE') usedCOs.add(q.co)
    })

    let html = ''
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

    // Find ONLY top-level list items (main questions Q1, Q2, Q3...), ignoring nested sub-questions
    const allListItems = Array.from(tempDiv.querySelectorAll('li'))
    const mainListItems = allListItems.filter(
      li => !li.parentElement || li.parentElement.closest('li') === null
    )

    mainListItems.forEach((li, idx) => {
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

  // Print & Export styles for Multi-level Lists & Equations
  const getPrintStyles = () => {
    return `
      .qp-header-wrapper {
        text-align: center !important;
        font-family: 'Times New Roman', Times, serif !important;
        margin-bottom: 15px !important;
        line-height: 1.3 !important;
      }
      .qp-header-wrapper p {
        text-align: center !important;
        margin: 2px 0 0 0 !important;
        padding: 0 !important;
        line-height: 1.3 !important;
      }
      .qp-header-wrapper p:first-child {
        margin-top: 0 !important;
      }

      @counter-style lower-alpha-bracket {
        system: alphabetic;
        symbols: 'a' 'b' 'c' 'd' 'e' 'f' 'g' 'h' 'i' 'j' 'k' 'l' 'm' 'n' 'o' 'p' 'q' 'r' 's' 't' 'u' 'v' 'w' 'x' 'y' 'z';
        suffix: ") ";
      }
      @counter-style lower-roman-bracket {
        system: additive;
        additive-symbols: 1000 M, 900 CM, 500 D, 400 CD, 100 C, 90 XC, 50 L, 40 XL, 10 X, 9 IX, 5 V, 4 IV, 1 i;
        suffix: ") ";
      }
      @counter-style upper-alpha-bracket {
        system: alphabetic;
        symbols: 'A' 'B' 'C' 'D' 'E' 'F' 'G' 'H' 'I' 'J' 'K' 'L' 'M' 'N' 'O' 'P' 'Q' 'R' 'S' 'T' 'U' 'V' 'W' 'X' 'Y' 'Z';
        suffix: ") ";
      }

      /* Base Ordered List Defaults */
      ol {
        margin-top: 6px !important;
        margin-bottom: 6px !important;
        padding-left: 28px !important;
        list-style-type: decimal;
      }
      ol > li {
        list-style-type: decimal;
      }

      ol ol {
        list-style-type: lower-alpha;
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        padding-left: 28px !important;
      }
      ol ol > li {
        list-style-type: lower-alpha;
      }

      ol ol ol {
        list-style-type: lower-roman;
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        padding-left: 28px !important;
      }
      ol ol ol > li {
        list-style-type: lower-roman;
      }

      ol ol ol ol {
        list-style-type: upper-alpha;
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        padding-left: 28px !important;
      }
      ol ol ol ol > li {
        list-style-type: upper-alpha;
      }

      /* Explicit Numbered List Format Overrides */
      ol[style*="lower-alpha"], ol.e-list-lower-alpha, ol[style*="lower-alpha"] li, ol.e-list-lower-alpha li {
        list-style-type: lower-alpha !important;
      }
      ol[style*="upper-alpha"], ol.e-list-upper-alpha, ol[style*="upper-alpha"] li, ol.e-list-upper-alpha li {
        list-style-type: upper-alpha !important;
      }
      ol[style*="lower-roman"], ol.e-list-lower-roman, ol[style*="lower-roman"] li, ol.e-list-lower-roman li {
        list-style-type: lower-roman !important;
      }
      ol[style*="upper-roman"], ol.e-list-upper-roman, ol[style*="upper-roman"] li, ol.e-list-upper-roman li {
        list-style-type: upper-roman !important;
      }
      ol[style*="lower-greek"], ol.e-list-lower-greek, ol[style*="lower-greek"] li, ol.e-list-lower-greek li {
        list-style-type: lower-greek !important;
      }
      ol[style*="decimal"], ol.e-list-decimal, ol[style*="decimal"] li, ol.e-list-decimal li {
        list-style-type: decimal !important;
      }

      p, li {
        margin-bottom: 4px;
        text-align: justify;
      }

      .math-equation-wrapper {
        display: inline-flex !important;
        align-items: center !important;
        vertical-align: middle !important;
        padding: 1px 4px !important;
        margin: 2px 3px !important;
        line-height: normal !important;
        border: none !important;
        background-color: transparent !important;
        position: relative;
        z-index: 1;
      }
      .math-print-img {
        display: inline-block !important;
        vertical-align: middle !important;
        margin: 2px 6px !important;
        height: auto !important;
        max-height: 3.5em !important;
      }

      .katex-display {
        display: inline-block !important;
        margin: 0.2em 0 !important;
      }
      .katex {
        font-size: 1.1em !important;
        line-height: 1.2 !important;
        text-indent: 0 !important;
      }
    `
  }

  // Convert KaTeX equation wrappers into crisp, self-contained high-resolution PNG/SVG images ONLY for Print/PDF export
  const convertEquationsToImages = async (htmlContent) => {
    if (!htmlContent || (!htmlContent.includes('math-equation-wrapper') && !htmlContent.includes('data-latex'))) {
      return htmlContent
    }

    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    tempDiv.style.width = '850px'
    tempDiv.style.background = '#ffffff'
    tempDiv.style.color = '#000000'
    tempDiv.style.fontFamily = "'Times New Roman', Times, serif"
    tempDiv.innerHTML = htmlContent
    document.body.appendChild(tempDiv)

    const wrappers = Array.from(tempDiv.querySelectorAll('.math-equation-wrapper, [data-latex]'))

    if (wrappers.length === 0) {
      document.body.removeChild(tempDiv)
      return htmlContent
    }

    for (const wrapper of wrappers) {
      try {
        const encodedLatex = wrapper.getAttribute('data-latex') || ''
        const latexStr = encodedLatex ? decodeURIComponent(encodedLatex) : wrapper.textContent || ''

        if (!latexStr.trim()) continue

        // Render KaTeX offscreen with generous padding so tall fractions & square roots are never clipped
        const renderContainer = document.createElement('div')
        renderContainer.style.display = 'inline-block'
        renderContainer.style.padding = '10px 14px'
        renderContainer.style.background = '#ffffff'
        renderContainer.style.color = '#000000'
        renderContainer.style.fontFamily = "'Times New Roman', Times, serif"
        renderContainer.style.fontSize = '20px'
        renderContainer.style.lineHeight = 'normal'
        renderContainer.style.overflow = 'visible'
        renderContainer.innerHTML = katex.renderToString(latexStr, {
          displayMode: false,
          throwOnError: false,
          output: 'html' // Omit MathML <annotation> tags so raw LaTeX is never extracted by PDF parsers
        })
        document.body.appendChild(renderContainer)

        const canvas = await html2canvas(renderContainer, {
          scale: 3, // 3x high-resolution capture for sharp vector-like print quality
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true
        })

        const dataUrl = canvas.toDataURL('image/png')
        document.body.removeChild(renderContainer)

        // Exact proportional width and height scaling (0.85 scale to match surrounding print font size)
        const printScale = 0.85
        const displayWidth = (canvas.width / 3) * printScale
        const displayHeight = (canvas.height / 3) * printScale

        // Replace ONLY the equation wrapper with clean crisp <img> tag
        const img = document.createElement('img')
        img.src = dataUrl
        img.alt = latexStr
        img.style.width = `${displayWidth.toFixed(1)}px`
        img.style.height = `${displayHeight.toFixed(1)}px`
        img.style.verticalAlign = 'middle'
        img.style.margin = '2px 4px'
        img.style.display = 'inline-block'
        img.className = 'math-print-img'

        if (wrapper.parentNode) {
          wrapper.parentNode.replaceChild(img, wrapper)
        }
      } catch (err) {
        console.error('Error converting equation to image for print:', err)
      }
    }

    const processedHtml = tempDiv.innerHTML
    document.body.removeChild(tempDiv)
    return processedHtml
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
      "<head><title>Question Paper</title>" +
      "<link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css'>" +
      "<style>" +
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
  const handlePrint = async () => {
    const currentContent = rteRef.current ? rteRef.current.value : editorValue
    const headerHtml = getHeaderHtml()
    const coDescriptions = getCoDescriptionsHtml()
    const rawAnnotatedContent = injectQuestionAnnotations(currentContent)

    // Convert equations to self-contained crisp high-res PNG images for 100% PDF/Print reliability
    const annotatedContent = await convertEquationsToImages(rawAnnotatedContent)

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Question Paper</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
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
            async function doPrint() {
              try {
                if (document.fonts && document.fonts.ready) {
                  await document.fonts.ready;
                }
              } catch(e) {}
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 800);
              }, 400);
            }
            if (document.readyState === 'complete') {
              doPrint();
            } else {
              window.addEventListener('load', doPrint);
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

    const selectedCoObj = coDetails.find(item => item.code === questionGenParams.selectedCo)
    const coInfo = selectedCoObj && selectedCoObj.code && selectedCoObj.code !== 'NONE'
      ? `Target Course Outcome (CO): ${selectedCoObj.code}${selectedCoObj.description ? ` - "${selectedCoObj.description}"` : ''}.
CRITICAL CO MANDATE: The generated question MUST explicitly target, test, and assess the capabilities described in this Course Outcome (${selectedCoObj.code}).`
      : (questionGenParams.selectedCo && questionGenParams.selectedCo !== 'NONE'
          ? `Target Course Outcome (CO): ${questionGenParams.selectedCo}. The question MUST directly align with this Course Outcome.`
          : '')

    const prompt = `Generate ${questionGenParams.numQuestions || 1} distinct university exam question option(s) for assessment '${questionGenParams.examType}', course '${offering?.course?.name || ''}', total marks ${questionGenParams.totalMarks}, Bloom's taxonomy level '${questionGenParams.bloomLevel}'.
${coInfo}
Topic/Syllabus: '${questionGenParams.topic}'.
${questionGenParams.sampleQuestion ? `Reference style: '${questionGenParams.sampleQuestion}'` : ''}

STRICT INSTRUCTIONS:
1. If generating multiple questions, separate each distinct question option with the EXACT delimiter "===QUESTION_BREAK===".
2. Format each question with sub-parts (a), (b) and mark distributions [X Marks] totaling ${questionGenParams.totalMarks}.
3. Ensure every question option strictly reflects the Target Course Outcome (${questionGenParams.selectedCo || 'General'}) and Bloom's level '${questionGenParams.bloomLevel}'.
4. Return clean, professional text without conversational intro.`

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
    const svgMarkup = generateGraphSvg(graphEdgesText, graphType, graphTheme, customNodePositions)
    
    // Base64 encoding avoids URL fragment truncation (# symbol parsing issue) in browsers
    const svgBase64 = btoa(unescape(encodeURIComponent(svgMarkup)))
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`

    // Insert image inside block container with clear: both to prevent text wrapping or auto-floating shift
    const htmlToInsert = `<p style="clear: both; text-align: center; margin: 14px 0;"><img src="${dataUrl}" alt="Graph Diagram" class="e-rte-image e-imgbreak e-imgcenter" style="min-width: 120px; max-width: 100%; width: 440px; height: auto;" /></p><p style="clear: both;"><br></p>`
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
      {
        tooltipText: 'Equation Generator (AI, Presets, Symbols)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="math-equation-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; gap: 4px; padding: 0 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19L11 5"/><path d="M9 19L16 5"/><path d="M5 12h14"/></svg><span style="font-size:11px;font-weight:700;color:#059669;">Equation Generator</span></button>',
        click: () => handleOpenEquationModal()
      },
      '|',
      {
        tooltipText: 'Graph Generator (Trees, Maps, Weighted Graphs)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="graph-generator-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; gap: 4px; padding: 0 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/></svg><span style="font-size:11px;font-weight:700;color:#059669;">Graph Generator</span></button>',
        click: () => setShowGraphGenModal(true)
      },
      '|',
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
          {/* Official University Header Preview & Customizer */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Official University Header</h3>
                <p className="text-xs text-gray-500 font-medium">Authentic exam header (Auto-centered & customizable)</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditHeaderModal(prev => !prev)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Sparkles size={14} />
                {showEditHeaderModal ? 'Close Header Editor' : '✏️ Customize / Edit Header'}
              </button>
            </div>

            {/* Header Customization Drawer */}
            {showEditHeaderModal && (
              <div className="p-4 bg-gray-50 border border-emerald-200 rounded-xl space-y-4 text-xs animate-in fade-in duration-200">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="font-extrabold text-emerald-900 text-sm">Header Details Editor</span>
                  <span className="text-[11px] text-gray-500 font-medium">Changes apply live to Preview, Word, and Print</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={headerCustom.deptName}
                      onChange={(e) => setHeaderCustom({ ...headerCustom, deptName: e.target.value })}
                      placeholder={offering.course?.department || 'Computer Science and Engineering'}
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Exam Title & Semester</label>
                    <input
                      type="text"
                      value={headerCustom.examTitle}
                      onChange={(e) => setHeaderCustom({ ...headerCustom, examTitle: e.target.value })}
                      placeholder="e.g. Mid Term Examination, Spring 2026"
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Level & Term</label>
                    <input
                      type="text"
                      value={headerCustom.levelTerm}
                      onChange={(e) => setHeaderCustom({ ...headerCustom, levelTerm: e.target.value })}
                      placeholder={`Level-${level} Term-${term}`}
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Course Code</label>
                    <input
                      type="text"
                      value={headerCustom.courseCode}
                      onChange={(e) => setHeaderCustom({ ...headerCustom, courseCode: e.target.value })}
                      placeholder={offering.course?.courseCode || 'CSE 223'}
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Course Title</label>
                    <input
                      type="text"
                      value={headerCustom.courseTitle}
                      onChange={(e) => setHeaderCustom({ ...headerCustom, courseTitle: e.target.value })}
                      placeholder={offering.course?.courseName || 'Computer Algorithm'}
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Credit Hour</label>
                    <input
                      type="text"
                      value={headerCustom.creditHours}
                      onChange={(e) => setHeaderCustom({ ...headerCustom, creditHours: e.target.value })}
                      placeholder={offering.course?.creditHours || '3.0'}
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Exam Duration</label>
                    <input
                      type="text"
                      value={headerCustom.duration}
                      onChange={(e) => setHeaderCustom({ ...headerCustom, duration: e.target.value })}
                      placeholder={examDuration || '90 Minutes'}
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Full Marks</label>
                    <input
                      type="text"
                      value={headerCustom.fullMarks}
                      onChange={(e) => setHeaderCustom({ ...headerCustom, fullMarks: e.target.value })}
                      placeholder={`${assessment.maxMarks || 60}`}
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold"
                    />
                  </div>
                </div>

                {/* Custom Notes Section */}
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-gray-700">Notes Lines (Add/Remove Instructions)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const currentNotes = headerCustom.notesList.length > 0 ? headerCustom.notesList : [
                          'Figure on the right of each question indicates the marks for the respective question.',
                          'Answer all questions.'
                        ]
                        setHeaderCustom({ ...headerCustom, notesList: [...currentNotes, 'New instruction note line'] })
                      }}
                      className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Plus size={12} /> Add Note Line
                    </button>
                  </div>

                  {(headerCustom.notesList.length > 0 ? headerCustom.notesList : [
                    'Figure on the right of each question indicates the marks for the respective question.',
                    'Answer all questions.'
                  ]).map((note, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-bold text-gray-500 w-5 text-center">{String.fromCharCode(97 + idx)}.</span>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => {
                          const updated = [...(headerCustom.notesList.length > 0 ? headerCustom.notesList : [
                            'Figure on the right of each question indicates the marks for the respective question.',
                            'Answer all questions.'
                          ])]
                          updated[idx] = e.target.value
                          setHeaderCustom({ ...headerCustom, notesList: updated })
                        }}
                        className="flex-1 border border-gray-300 p-1.5 rounded-lg bg-white font-medium text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (headerCustom.notesList.length > 0 ? headerCustom.notesList : [
                            'Figure on the right of each question indicates the marks for the respective question.',
                            'Answer all questions.'
                          ]).filter((_, i) => i !== idx)
                          setHeaderCustom({ ...headerCustom, notesList: updated })
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setHeaderCustom({
                      confidentialText: '',
                      bengaliUniName: '',
                      englishUniName: '',
                      deptName: '',
                      examTitle: '',
                      levelTerm: '',
                      courseCode: '',
                      courseTitle: '',
                      creditHours: '',
                      duration: '',
                      fullMarks: '',
                      notesList: [],
                      customCOs: []
                    })}
                    className="text-xs text-gray-500 hover:text-red-600 font-bold underline"
                  >
                    Reset to Default Header
                  </button>
                </div>
              </div>
            )}

            {/* Live Centered Header Preview */}
            <div
              className="border p-6 bg-white rounded-xl shadow-inner overflow-x-auto"
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
                  actionBegin={onActionBegin}
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
                    className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold text-xs text-gray-800"
                  >
                    <option value="">Any / General CO</option>
                    {availableCOs.map(co => {
                      const details = coDetails.find(d => d.code === co)
                      const descSnippet = details && details.description ? ` (${details.description.substring(0, 32)}${details.description.length > 32 ? '...' : ''})` : ''
                      return (
                        <option key={co} value={co}>{co}{descSnippet}</option>
                      )
                    })}
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

              {/* CO Details & Statement Info Card */}
              {(() => {
                const selectedCoObj = coDetails.find(item => item.code === questionGenParams.selectedCo)
                if (!selectedCoObj || !questionGenParams.selectedCo) return null

                return (
                  <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5 shadow-sm animate-in fade-in duration-200">
                    <div className="p-1 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <span className="font-extrabold text-emerald-900">{selectedCoObj.code} Details: </span>
                      <span className="font-medium text-emerald-800">
                        {selectedCoObj.description || `Course Outcome ${selectedCoObj.code.replace('CO', '')} for ${offering?.course?.name || 'this course'}.`}
                      </span>
                    </div>
                  </div>
                )
              })()}

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">Number of Question Options to Generate</label>
                <div className="flex gap-3 items-center">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuestionGenParams({ ...questionGenParams, numQuestions: n })}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${questionGenParams.numQuestions === n ? 'bg-emerald-700 text-white border-emerald-800 shadow' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
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

      {/* 🕸️ Modal 2: Automated Graph Diagram Generator (B&W Theme Default + Interactive Drag & Drop) */}
      {showGraphGenModal && (
        <div className="fixed inset-0 z-[10002] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-3xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/15 rounded-lg border border-white/20">
                  <Share2 size={20} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Automated Graph & Tree Generator</h3>
                  <p className="text-xs text-emerald-200">Create vector SVG trees, maps & weighted graphs for exam papers</p>
                </div>
              </div>
              <button onClick={() => setShowGraphGenModal(false)} className="p-1 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-gray-50/50 text-sm">
              {/* Presets */}
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1.5">Quick Academic Presets</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setGraphType('tree')
                      setCustomNodePositions({})
                      const text = '15-35\n15-9\n15-40\n35-3\n35-6\n40-5\n40-7\n3-1\n3-10\n5-8\n5-4\n5-41'
                      setGraphEdgesText(text)
                      setEdgeRows([
                        { from: '15', to: '35', weight: '' }, { from: '15', to: '9', weight: '' }, { from: '15', to: '40', weight: '' },
                        { from: '35', to: '3', weight: '' }, { from: '35', to: '6', weight: '' },
                        { from: '40', to: '5', weight: '' }, { from: '40', to: '7', weight: '' },
                        { from: '3', to: '1', weight: '' }, { from: '3', to: '10', weight: '' },
                        { from: '5', to: '8', weight: '' }, { from: '5', to: '4', weight: '' }, { from: '5', to: '41', weight: '' }
                      ])
                    }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold shadow-sm"
                  >
                    🌳 Tree (Hierarchical)
                  </button>
                  <button
                    onClick={() => {
                      setGraphType('map')
                      setCustomNodePositions({})
                      const text = 'ORADEA-ZERIND: 71\nZERIND-ARAD: 75\nARAD-SIBIU: 140\nSIBIU-FAGARAS: 99\nSIBIU-RIMNICU: 80\nRIMNICU-PITESTI: 97\nPITESTI-BUCHAREST: 101\nBUCHAREST-URZICENI: 85\nURZICENI-VASLUI: 142\nVASLUI-IASI: 92\nIASI-NEAMT: 87'
                      setGraphEdgesText(text)
                      setEdgeRows([
                        { from: 'ORADEA', to: 'ZERIND', weight: '71' }, { from: 'ZERIND', to: 'ARAD', weight: '75' }, { from: 'ARAD', to: 'SIBIU', weight: '140' },
                        { from: 'SIBIU', to: 'FAGARAS', weight: '99' }, { from: 'SIBIU', to: 'RIMNICU', weight: '80' }, { from: 'RIMNICU', to: 'PITESTI', weight: '97' },
                        { from: 'PITESTI', to: 'BUCHAREST', weight: '101' }, { from: 'BUCHAREST', to: 'URZICENI', weight: '85' }, { from: 'URZICENI', to: 'VASLUI', weight: '142' },
                        { from: 'VASLUI', to: 'IASI', weight: '92' }, { from: 'IASI', to: 'NEAMT', weight: '87' }
                      ])
                    }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold shadow-sm"
                  >
                    🗺️ Map / Romania Network
                  </button>
                  <button
                    onClick={() => {
                      setGraphType('directed')
                      setCustomNodePositions({})
                      setGraphEdgesText('A-B: 10\nB-C: 15\nC-D: 20\nD-A: 5')
                      setEdgeRows([{ from: 'A', to: 'B', weight: '10' }, { from: 'B', to: 'C', weight: '15' }, { from: 'C', to: 'D', weight: '20' }, { from: 'D', to: 'A', weight: '5' }])
                    }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold shadow-sm"
                  >
                    ⚖️ Node Weighted Graph
                  </button>
                  <button
                    onClick={() => {
                      setGraphType('undirected')
                      setCustomNodePositions({})
                      setGraphEdgesText('1-2: 4\n1-3: 2\n2-3: 1\n2-4: 5\n3-4: 8')
                      setEdgeRows([{ from: '1', to: '2', weight: '4' }, { from: '1', to: '3', weight: '2' }, { from: '2', to: '3', weight: '1' }, { from: '2', to: '4', weight: '5' }, { from: '3', to: '4', weight: '8' }])
                    }}
                    className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold shadow-sm"
                  >
                    🕸️ Undirected Network
                  </button>
                </div>
              </div>

              {/* Theme & Direction Controls */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">Color Theme</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGraphTheme('bw')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${graphTheme === 'bw' ? 'bg-gray-900 text-white border-black shadow' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
                    >
                      🔘 Black & White
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
                  <label className="block font-bold text-gray-700 text-xs mb-1">Graph / Tree Structure Format</label>
                  <select
                    value={graphType}
                    onChange={(e) => {
                      setGraphType(e.target.value)
                      setCustomNodePositions({})
                    }}
                    className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold text-xs"
                  >
                    <option value="directed">Directed Graph (with Arrows)</option>
                    <option value="undirected">Undirected Graph (Lines without Arrows)</option>
                    <option value="tree">Tree Layout (Hierarchical Top-Down)</option>
                    <option value="map">Map / Network Layout</option>
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
                <div className="space-y-2 bg-white p-3 border border-gray-200 rounded-xl max-h-[180px] overflow-y-auto">
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
                    rows="3"
                    value={graphEdgesText}
                    onChange={(e) => setGraphEdgesText(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-xl bg-white font-mono text-xs"
                    placeholder="A-B: 10&#10;B-C: 15&#10;A-C: 5"
                  />
                </div>
              )}

              {/* Live Interactive Vector SVG Preview with Click & Drag Node Repositioning */}
              {(() => {
                const activeGraphData = parseGraphData(graphEdgesText)
                const activeGraphPositions = computeGraphLayout(activeGraphData.nodes, activeGraphData.edges, graphType, customNodePositions)

                return (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Live Vector SVG Preview ({graphTheme === 'bw' ? 'Black & White' : 'System Theme'})
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        🖱️ Click & drag any node with mouse to restructure
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-emerald-200 rounded-xl shadow-inner flex justify-center overflow-hidden select-none">
                      <svg
                        ref={graphSvgRef}
                        viewBox="0 0 600 400"
                        onMouseMove={handleSvgMouseMove}
                        onMouseUp={handleSvgMouseUp}
                        onMouseLeave={handleSvgMouseUp}
                        style={{ maxWidth: '100%', height: 'auto', maxHeight: '340px', cursor: draggingNode ? 'grabbing' : 'default' }}
                      >
                        <defs>
                          <marker id="arrowhead-interactive" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill={graphTheme === 'bw' ? '#000000' : '#047857'} />
                          </marker>
                        </defs>

                        {/* Render Edges */}
                        {activeGraphData.edges.map((edge, idx) => {
                          const p1 = activeGraphPositions[edge.from]
                          const p2 = activeGraphPositions[edge.to]
                          if (!p1 || !p2) return null
                          const isDirected = (graphType === 'directed' || graphType === 'directed_tree')
                          const midX = (p1.x + p2.x) / 2
                          const midY = (p1.y + p2.y) / 2
                          const badgeW = Math.max(edge.weight.length * 8 + 10, 22)

                          return (
                            <g key={idx}>
                              <line
                                x1={p1.x}
                                y1={p1.y}
                                x2={p2.x}
                                y2={p2.y}
                                stroke={graphTheme === 'bw' ? '#000000' : '#059669'}
                                strokeWidth="2.5"
                                markerEnd={isDirected ? 'url(#arrowhead-interactive)' : undefined}
                              />
                              {edge.weight && (
                                <g>
                                  <rect
                                    x={midX - badgeW / 2}
                                    y={midY - 10}
                                    width={badgeW}
                                    height={18}
                                    rx="4"
                                    fill="#ffffff"
                                    stroke={graphTheme === 'bw' ? '#000000' : '#10b981'}
                                    strokeWidth="1.5"
                                  />
                                  <text
                                    x={midX}
                                    y={midY + 3}
                                    fontSize="11"
                                    fontWeight="bold"
                                    fill={graphTheme === 'bw' ? '#000000' : '#047857'}
                                    textAnchor="middle"
                                  >
                                    {edge.weight}
                                  </text>
                                </g>
                              )}
                            </g>
                          )
                        })}

                        {/* Render Nodes (Interactive Drag & Drop) */}
                        {activeGraphData.nodes.map(node => {
                          const p = activeGraphPositions[node]
                          if (!p) return null
                          const isDragged = draggingNode === node
                          const fontSize = node.length > 5 ? '9' : (node.length > 3 ? '11' : '13')

                          return (
                            <g
                              key={node}
                              onMouseDown={(e) => handleSvgMouseDown(node, e)}
                              style={{ cursor: draggingNode === node ? 'grabbing' : 'grab' }}
                            >
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={22}
                                fill={isDragged ? (graphTheme === 'bw' ? '#e5e7eb' : '#d1fae5') : '#ffffff'}
                                stroke={graphTheme === 'bw' ? '#000000' : '#047857'}
                                strokeWidth={isDragged ? '3.5' : '2.5'}
                              />
                              <text
                                x={p.x}
                                y={p.y + 4}
                                fontSize={fontSize}
                                fontWeight="extrabold"
                                fill={graphTheme === 'bw' ? '#000000' : '#065f46'}
                                textAnchor="middle"
                                style={{ userSelect: 'none', pointerEvents: 'none' }}
                              >
                                {node}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                  </div>
                )
              })()}
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

      {/* 🧮 Upgraded Mathematical Equation Creator (Interactive AI + Presets + Symbols) */}
      {(showEquationModal || showAiEquationModal) && (
        <div className="fixed inset-0 z-[10002] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-5xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" style={{ maxHeight: '92vh' }}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/15 rounded-lg border border-white/20">
                  <Sparkles size={20} className="text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    {editingEquationElement ? 'Edit Mathematical Equation' : 'Mathematical Equation Creator'}
                  </h3>
                  <p className="text-xs text-emerald-100">Create equations with AI, presets, or manual LaTeX — Math · ML · Signal · Image Processing</p>
                </div>
              </div>
              <button onClick={() => { setShowEquationModal(false); setShowAiEquationModal(false); }} className="p-1 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50 text-sm">

              {/* ═══════ SECTION 1: AI Natural Language Input ═══════ */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-600" />
                  <span className="font-extrabold text-emerald-800 text-xs uppercase tracking-wider">AI-Powered — Describe Your Equation</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiEquationPrompt}
                    onChange={(e) => setAiEquationPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !aiEquationGenerating) handleGenerateEquationWithAi() }}
                    placeholder="e.g. &quot;cross-entropy loss function&quot;, &quot;2D DFT formula&quot;, &quot;softmax activation&quot;, &quot;Bayes theorem&quot;..."
                    className="flex-1 border border-emerald-300 px-4 py-2.5 rounded-xl bg-white text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none placeholder:text-emerald-400/70"
                  />
                  <button
                    onClick={handleGenerateEquationWithAi}
                    disabled={aiEquationGenerating}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all whitespace-nowrap"
                  >
                    {aiEquationGenerating ? (
                      <><Loader2 size={14} className="animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles size={14} /> Generate with AI</>
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Cross-entropy loss', 'Softmax function', 'Gradient descent', 'Fourier transform (DFT)', 'Convolution 2D', 'Backpropagation chain rule', 'Bayes theorem', 'Z-transform'].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => { setAiEquationPrompt(q); }}
                      className="px-2 py-0.5 bg-white/80 border border-emerald-200/80 text-emerald-700 rounded-md text-[10px] font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* ═══════ SECTION 2: Domain-Specific Preset Categories ═══════ */}
              <div className="space-y-2">
                <span className="font-extrabold text-gray-700 text-xs uppercase tracking-wider">📚 Domain Presets — One-Click Equations</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'ml', label: '🤖 Machine Learning' },
                    { id: 'dl', label: '🧠 Deep Learning' },
                    { id: 'signal', label: '📡 Signal Processing' },
                    { id: 'image', label: '🖼️ Image Processing' },
                    { id: 'linalg', label: '📐 Linear Algebra' },
                    { id: 'calculus', label: '∫ Calculus' },
                    { id: 'prob', label: '🎲 Probability & Stats' },
                    { id: 'basic', label: '➕ Basic Math' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAiEquationActiveCategory(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${aiEquationActiveCategory === tab.id ? 'bg-emerald-600 text-white shadow-md scale-105' : 'bg-white text-gray-700 border border-gray-200 hover:bg-emerald-50 hover:border-emerald-300'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-xl max-h-[140px] overflow-y-auto">
                  {aiEquationActiveCategory === 'ml' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'MSE Loss', latex: 'L = \\frac{1}{n} \\sum_{i=1}^{n} (y_i - \\hat{y}_i)^2' },
                        { label: 'Cross-Entropy', latex: 'L = -\\sum_{i=1}^{C} y_i \\log(\\hat{y}_i)' },
                        { label: 'Softmax', latex: '\\sigma(z_i) = \\frac{e^{z_i}}{\\sum_{j=1}^{K} e^{z_j}}' },
                        { label: 'Sigmoid', latex: '\\sigma(x) = \\frac{1}{1 + e^{-x}}' },
                        { label: 'Gradient Descent', latex: '\\theta_{t+1} = \\theta_t - \\eta \\nabla_{\\theta} J(\\theta)' },
                        { label: 'Linear Regression', latex: 'y = \\mathbf{w}^T \\mathbf{x} + b' },
                        { label: 'Logistic Regression', latex: 'P(y=1|x) = \\frac{1}{1 + e^{-(\\mathbf{w}^T \\mathbf{x} + b)}}' },
                        { label: 'Ridge (L2)', latex: 'J(\\theta) = \\frac{1}{2n} \\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2 + \\lambda \\|\\theta\\|_2^2' },
                        { label: 'Lasso (L1)', latex: 'J(\\theta) = \\frac{1}{2n} \\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2 + \\lambda \\|\\theta\\|_1' },
                        { label: 'KNN Distance', latex: 'd(\\mathbf{x}, \\mathbf{y}) = \\sqrt{\\sum_{i=1}^{n}(x_i - y_i)^2}' },
                        { label: 'SVM Hinge Loss', latex: 'L = \\max(0, 1 - y_i(\\mathbf{w} \\cdot \\mathbf{x}_i + b))' },
                        { label: 'R² Score', latex: 'R^2 = 1 - \\frac{\\sum(y_i - \\hat{y}_i)^2}{\\sum(y_i - \\bar{y})^2}' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => setAiEquationLatex(item.latex)}
                          className="p-2 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-800 transition-colors text-left hover:border-emerald-300"
                        >{item.label}</button>
                      ))}
                    </div>
                  )}

                  {aiEquationActiveCategory === 'dl' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'ReLU', latex: 'f(x) = \\max(0, x)' },
                        { label: 'Leaky ReLU', latex: 'f(x) = \\begin{cases} x & x > 0 \\\\ \\alpha x & x \\le 0 \\end{cases}' },
                        { label: 'Tanh', latex: 'f(x) = \\tanh(x) = \\frac{e^x - e^{-x}}{e^x + e^{-x}}' },
                        { label: 'Backprop Chain Rule', latex: '\\frac{\\partial L}{\\partial w} = \\frac{\\partial L}{\\partial a} \\cdot \\frac{\\partial a}{\\partial z} \\cdot \\frac{\\partial z}{\\partial w}' },
                        { label: 'Attention (Scaled Dot)', latex: '\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V' },
                        { label: 'Batch Normalization', latex: '\\hat{x}_i = \\frac{x_i - \\mu_B}{\\sqrt{\\sigma_B^2 + \\epsilon}}' },
                        { label: 'Dropout', latex: 'h^{\\prime} = \\frac{1}{1-p} \\cdot m \\odot h, \\quad m_i \\sim \\text{Bernoulli}(1-p)' },
                        { label: 'Adam Optimizer', latex: 'm_t = \\beta_1 m_{t-1} + (1-\\beta_1)g_t, \\quad v_t = \\beta_2 v_{t-1} + (1-\\beta_2)g_t^2' },
                        { label: 'Conv Layer Output', latex: 'o = \\left\\lfloor \\frac{n + 2p - k}{s} \\right\\rfloor + 1' },
                        { label: 'LSTM Forget Gate', latex: 'f_t = \\sigma(W_f \\cdot [h_{t-1}, x_t] + b_f)' },
                        { label: 'GRU Update Gate', latex: 'z_t = \\sigma(W_z \\cdot [h_{t-1}, x_t] + b_z)' },
                        { label: 'Positional Encoding', latex: 'PE_{(pos,2i)} = \\sin\\left(\\frac{pos}{10000^{2i/d}}\\right)' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => setAiEquationLatex(item.latex)}
                          className="p-2 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-800 transition-colors text-left hover:border-emerald-300"
                        >{item.label}</button>
                      ))}
                    </div>
                  )}

                  {aiEquationActiveCategory === 'signal' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'DFT', latex: 'X[k] = \\sum_{n=0}^{N-1} x[n] \\, e^{-j2\\pi kn/N}' },
                        { label: 'Inverse DFT', latex: 'x[n] = \\frac{1}{N} \\sum_{k=0}^{N-1} X[k] \\, e^{j2\\pi kn/N}' },
                        { label: 'Continuous FT', latex: 'X(f) = \\int_{-\\infty}^{\\infty} x(t) \\, e^{-j2\\pi ft} \\, dt' },
                        { label: 'Z-Transform', latex: 'X(z) = \\sum_{n=-\\infty}^{\\infty} x[n] z^{-n}' },
                        { label: 'Laplace Transform', latex: 'X(s) = \\int_{0}^{\\infty} x(t) e^{-st} \\, dt' },
                        { label: 'Convolution (Discrete)', latex: 'y[n] = \\sum_{k=-\\infty}^{\\infty} x[k] \\cdot h[n-k]' },
                        { label: 'Convolution (Continuous)', latex: 'y(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) \\, d\\tau' },
                        { label: 'Sampling Theorem', latex: 'f_s \\geq 2 f_{\\max}' },
                        { label: 'Transfer Function', latex: 'H(z) = \\frac{Y(z)}{X(z)} = \\frac{\\sum_{k=0}^{M} b_k z^{-k}}{1 + \\sum_{k=1}^{N} a_k z^{-k}}' },
                        { label: 'Parseval\'s Theorem', latex: '\\sum_{n} |x[n]|^2 = \\frac{1}{N} \\sum_{k} |X[k]|^2' },
                        { label: 'Autocorrelation', latex: 'R_{xx}[m] = \\sum_{n} x[n] \\cdot x[n+m]' },
                        { label: 'SNR (dB)', latex: '\\text{SNR}_{dB} = 10 \\log_{10}\\left(\\frac{P_{\\text{signal}}}{P_{\\text{noise}}}\\right)' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => setAiEquationLatex(item.latex)}
                          className="p-2 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-800 transition-colors text-left hover:border-emerald-300"
                        >{item.label}</button>
                      ))}
                    </div>
                  )}

                  {aiEquationActiveCategory === 'image' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: '2D Convolution', latex: 'g(x,y) = \\sum_{s=-a}^{a} \\sum_{t=-b}^{b} w(s,t) \\cdot f(x-s, y-t)' },
                        { label: 'Gaussian Blur', latex: 'G(x,y) = \\frac{1}{2\\pi\\sigma^2} e^{-\\frac{x^2+y^2}{2\\sigma^2}}' },
                        { label: 'Sobel Gx', latex: 'G_x = \\begin{bmatrix} -1 & 0 & 1 \\\\ -2 & 0 & 2 \\\\ -1 & 0 & 1 \\end{bmatrix} * I' },
                        { label: 'Sobel Gy', latex: 'G_y = \\begin{bmatrix} -1 & -2 & -1 \\\\ 0 & 0 & 0 \\\\ 1 & 2 & 1 \\end{bmatrix} * I' },
                        { label: 'Edge Magnitude', latex: 'G = \\sqrt{G_x^2 + G_y^2}' },
                        { label: 'Histogram Eq.', latex: 's_k = (L-1) \\sum_{j=0}^{k} p_r(r_j)' },
                        { label: '2D DFT', latex: 'F(u,v) = \\sum_{x=0}^{M-1} \\sum_{y=0}^{N-1} f(x,y) e^{-j2\\pi(ux/M + vy/N)}' },
                        { label: 'PSNR', latex: '\\text{PSNR} = 10 \\log_{10}\\left(\\frac{\\text{MAX}^2}{\\text{MSE}}\\right)' },
                        { label: 'SSIM', latex: '\\text{SSIM}(x,y) = \\frac{(2\\mu_x\\mu_y + c_1)(2\\sigma_{xy} + c_2)}{(\\mu_x^2 + \\mu_y^2 + c_1)(\\sigma_x^2 + \\sigma_y^2 + c_2)}' },
                        { label: 'Morphological Erosion', latex: 'A \\ominus B = \\{z | (B)_z \\subseteq A\\}' },
                        { label: 'Morphological Dilation', latex: 'A \\oplus B = \\{z | (\\hat{B})_z \\cap A \\neq \\emptyset\\}' },
                        { label: 'Laplacian Filter', latex: '\\nabla^2 f = \\frac{\\partial^2 f}{\\partial x^2} + \\frac{\\partial^2 f}{\\partial y^2}' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => setAiEquationLatex(item.latex)}
                          className="p-2 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-800 transition-colors text-left hover:border-emerald-300"
                        >{item.label}</button>
                      ))}
                    </div>
                  )}

                  {aiEquationActiveCategory === 'linalg' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Matrix Multiply', latex: 'C_{ij} = \\sum_{k=1}^{n} A_{ik} B_{kj}' },
                        { label: 'Eigenvalue', latex: 'A\\mathbf{v} = \\lambda \\mathbf{v}' },
                        { label: 'Determinant (2×2)', latex: '\\det(A) = ad - bc' },
                        { label: 'Inverse (2×2)', latex: 'A^{-1} = \\frac{1}{ad-bc} \\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix}' },
                        { label: 'Dot Product', latex: '\\mathbf{a} \\cdot \\mathbf{b} = \\sum_{i=1}^{n} a_i b_i = \\|\\mathbf{a}\\| \\|\\mathbf{b}\\| \\cos\\theta' },
                        { label: 'Cross Product', latex: '\\mathbf{a} \\times \\mathbf{b} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ a_1 & a_2 & a_3 \\\\ b_1 & b_2 & b_3 \\end{vmatrix}' },
                        { label: 'SVD', latex: 'A = U \\Sigma V^T' },
                        { label: 'Matrix Norm (Frobenius)', latex: '\\|A\\|_F = \\sqrt{\\sum_{i} \\sum_{j} |a_{ij}|^2}' },
                        { label: 'Trace', latex: '\\text{tr}(A) = \\sum_{i=1}^{n} a_{ii}' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => setAiEquationLatex(item.latex)}
                          className="p-2 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-800 transition-colors text-left hover:border-emerald-300"
                        >{item.label}</button>
                      ))}
                    </div>
                  )}

                  {aiEquationActiveCategory === 'calculus' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Derivative', latex: 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}' },
                        { label: 'Chain Rule', latex: '\\frac{d}{dx}[f(g(x))] = f\'(g(x)) \\cdot g\'(x)' },
                        { label: 'Product Rule', latex: '(fg)\' = f\'g + fg\'' },
                        { label: 'Integration by Parts', latex: '\\int u \\, dv = uv - \\int v \\, du' },
                        { label: 'Taylor Series', latex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x-a)^n' },
                        { label: 'Gradient', latex: '\\nabla f = \\left(\\frac{\\partial f}{\\partial x_1}, \\frac{\\partial f}{\\partial x_2}, \\ldots, \\frac{\\partial f}{\\partial x_n}\\right)' },
                        { label: 'Divergence', latex: '\\nabla \\cdot \\mathbf{F} = \\frac{\\partial F_x}{\\partial x} + \\frac{\\partial F_y}{\\partial y} + \\frac{\\partial F_z}{\\partial z}' },
                        { label: 'Jacobian', latex: 'J = \\begin{bmatrix} \\frac{\\partial f_1}{\\partial x_1} & \\cdots & \\frac{\\partial f_1}{\\partial x_n} \\\\ \\vdots & \\ddots & \\vdots \\\\ \\frac{\\partial f_m}{\\partial x_1} & \\cdots & \\frac{\\partial f_m}{\\partial x_n} \\end{bmatrix}' },
                        { label: 'Hessian', latex: 'H_{ij} = \\frac{\\partial^2 f}{\\partial x_i \\partial x_j}' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => setAiEquationLatex(item.latex)}
                          className="p-2 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-800 transition-colors text-left hover:border-emerald-300"
                        >{item.label}</button>
                      ))}
                    </div>
                  )}

                  {aiEquationActiveCategory === 'prob' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Bayes\' Theorem', latex: 'P(A|B) = \\frac{P(B|A) P(A)}{P(B)}' },
                        { label: 'Gaussian / Normal', latex: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}' },
                        { label: 'Expectation', latex: 'E[X] = \\sum_{i} x_i \\cdot P(x_i)' },
                        { label: 'Variance', latex: '\\text{Var}(X) = E[(X - \\mu)^2] = E[X^2] - (E[X])^2' },
                        { label: 'Standard Deviation', latex: '\\sigma = \\sqrt{\\frac{1}{N}\\sum_{i=1}^{N}(x_i - \\mu)^2}' },
                        { label: 'Binomial PMF', latex: 'P(X=k) = \\binom{n}{k} p^k (1-p)^{n-k}' },
                        { label: 'Poisson PMF', latex: 'P(X=k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}' },
                        { label: 'Entropy', latex: 'H(X) = -\\sum_{i} P(x_i) \\log_2 P(x_i)' },
                        { label: 'KL Divergence', latex: 'D_{KL}(P \\| Q) = \\sum_{i} P(i) \\log \\frac{P(i)}{Q(i)}' },
                        { label: 'Covariance', latex: '\\text{Cov}(X,Y) = E[(X - \\mu_X)(Y - \\mu_Y)]' },
                        { label: 'Correlation', latex: '\\rho_{XY} = \\frac{\\text{Cov}(X,Y)}{\\sigma_X \\sigma_Y}' },
                        { label: 'Conditional Prob.', latex: 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => setAiEquationLatex(item.latex)}
                          className="p-2 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-800 transition-colors text-left hover:border-emerald-300"
                        >{item.label}</button>
                      ))}
                    </div>
                  )}

                  {aiEquationActiveCategory === 'basic' && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Quadratic Formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
                        { label: 'Pythagorean Theorem', latex: 'a^2 + b^2 = c^2' },
                        { label: 'Euler\'s Identity', latex: 'e^{i\\pi} + 1 = 0' },
                        { label: 'Euler\'s Formula', latex: 'e^{ix} = \\cos x + i \\sin x' },
                        { label: 'Binomial Theorem', latex: '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k' },
                        { label: 'Geometric Series', latex: 'S = \\frac{a(1-r^n)}{1-r}' },
                        { label: 'Logarithm Rules', latex: '\\log_b(xy) = \\log_b x + \\log_b y' },
                        { label: 'Trigonometric Identity', latex: '\\sin^2\\theta + \\cos^2\\theta = 1' },
                        { label: 'Quadratic Equation', latex: 'ax^2 + bx + c = 0' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => setAiEquationLatex(item.latex)}
                          className="p-2 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-800 transition-colors text-left hover:border-emerald-300"
                        >{item.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ═══════ SECTION 3: Extended Symbol Palette ═══════ */}
              <div className="space-y-2">
                <span className="font-extrabold text-gray-700 text-xs uppercase tracking-wider">✏️ Symbol Palette — Click to Append</span>
                <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-2">
                  {[
                    { id: 'operators', label: 'Operators' },
                    { id: 'relations', label: 'Relations' },
                    { id: 'greek', label: 'Greek' },
                    { id: 'structures', label: 'Structures' },
                    { id: 'calcOps', label: 'Calculus' },
                    { id: 'accents', label: 'Accents & Arrows' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAiEquationActiveSymbolTab(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${aiEquationActiveSymbolTab === tab.id ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-2.5 bg-white border border-gray-200 rounded-xl max-h-[90px] overflow-y-auto">
                  {aiEquationActiveSymbolTab === 'operators' && (
                    <div className="grid grid-cols-10 gap-1">
                      {[
                        { l: '+', s: '+' }, { l: '-', s: '-' }, { l: '×', s: '\\times ' }, { l: '÷', s: '\\div ' },
                        { l: '±', s: '\\pm ' }, { l: '∓', s: '\\mp ' }, { l: '·', s: '\\cdot ' }, { l: '∘', s: '\\circ ' },
                        { l: '⊗', s: '\\otimes ' }, { l: '⊕', s: '\\oplus ' }, { l: '∧', s: '\\wedge ' }, { l: '∨', s: '\\vee ' },
                        { l: '¬', s: '\\neg ' }, { l: '⊂', s: '\\subset ' }, { l: '⊃', s: '\\supset ' }, { l: '∪', s: '\\cup ' },
                        { l: '∩', s: '\\cap ' }, { l: '∈', s: '\\in ' }, { l: '∉', s: '\\notin ' }, { l: '∅', s: '\\emptyset ' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => handleAppendAiEquationSymbol(item.s)}
                          className="p-1.5 bg-gray-50 hover:bg-emerald-100 border border-gray-150 rounded text-xs font-bold text-gray-800 transition-colors flex items-center justify-center"
                        >{item.l}</button>
                      ))}
                    </div>
                  )}
                  {aiEquationActiveSymbolTab === 'relations' && (
                    <div className="grid grid-cols-10 gap-1">
                      {[
                        { l: '=', s: '= ' }, { l: '≠', s: '\\neq ' }, { l: '≈', s: '\\approx ' }, { l: '≡', s: '\\equiv ' },
                        { l: '<', s: '< ' }, { l: '>', s: '> ' }, { l: '≤', s: '\\le ' }, { l: '≥', s: '\\ge ' },
                        { l: '≪', s: '\\ll ' }, { l: '≫', s: '\\gg ' }, { l: '∝', s: '\\propto ' }, { l: '∞', s: '\\infty ' },
                        { l: '∀', s: '\\forall ' }, { l: '∃', s: '\\exists ' }, { l: '→', s: '\\to ' }, { l: '⟹', s: '\\implies ' },
                        { l: '⟺', s: '\\iff ' }, { l: '…', s: '\\dots ' }, { l: '⋯', s: '\\cdots ' }, { l: '⋮', s: '\\vdots ' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => handleAppendAiEquationSymbol(item.s)}
                          className="p-1.5 bg-gray-50 hover:bg-emerald-100 border border-gray-150 rounded text-xs font-bold text-gray-800 transition-colors flex items-center justify-center"
                        >{item.l}</button>
                      ))}
                    </div>
                  )}
                  {aiEquationActiveSymbolTab === 'greek' && (
                    <div className="grid grid-cols-10 gap-1">
                      {[
                        { l: 'α', s: '\\alpha ' }, { l: 'β', s: '\\beta ' }, { l: 'γ', s: '\\gamma ' }, { l: 'δ', s: '\\delta ' },
                        { l: 'ε', s: '\\epsilon ' }, { l: 'ζ', s: '\\zeta ' }, { l: 'η', s: '\\eta ' }, { l: 'θ', s: '\\theta ' },
                        { l: 'κ', s: '\\kappa ' }, { l: 'λ', s: '\\lambda ' }, { l: 'μ', s: '\\mu ' }, { l: 'ν', s: '\\nu ' },
                        { l: 'ξ', s: '\\xi ' }, { l: 'π', s: '\\pi ' }, { l: 'ρ', s: '\\rho ' }, { l: 'σ', s: '\\sigma ' },
                        { l: 'τ', s: '\\tau ' }, { l: 'φ', s: '\\phi ' }, { l: 'ψ', s: '\\psi ' }, { l: 'ω', s: '\\omega ' },
                        { l: 'Γ', s: '\\Gamma ' }, { l: 'Δ', s: '\\Delta ' }, { l: 'Θ', s: '\\Theta ' }, { l: 'Λ', s: '\\Lambda ' },
                        { l: 'Σ', s: '\\Sigma ' }, { l: 'Φ', s: '\\Phi ' }, { l: 'Ψ', s: '\\Psi ' }, { l: 'Ω', s: '\\Omega ' },
                        { l: 'ε̃', s: '\\varepsilon ' }, { l: 'ϕ', s: '\\varphi ' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => handleAppendAiEquationSymbol(item.s)}
                          className="p-1.5 bg-gray-50 hover:bg-emerald-100 border border-gray-150 rounded text-xs font-bold text-gray-800 transition-colors flex items-center justify-center"
                        >{item.l}</button>
                      ))}
                    </div>
                  )}
                  {aiEquationActiveSymbolTab === 'structures' && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { l: 'Fraction a/b', s: '\\frac{a}{b}' }, { l: 'Power x²', s: '^{2}' }, { l: 'Subscript x₁', s: '_{1}' },
                        { l: 'Square Root √', s: '\\sqrt{}' }, { l: 'N-th Root ⁿ√', s: '\\sqrt[n]{}' },
                        { l: 'Parentheses ()', s: '\\left(  \\right)' }, { l: 'Brackets []', s: '\\left[  \\right]' },
                        { l: 'Braces {}', s: '\\left\\{  \\right\\}' }, { l: 'Absolute ||', s: '\\left|  \\right|' },
                        { l: '2×2 Matrix', s: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
                        { l: '3×3 Matrix', s: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}' },
                        { l: 'Piecewise', s: '\\begin{cases} f(x) & x > 0 \\\\ g(x) & x \\le 0 \\end{cases}' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => handleAppendAiEquationSymbol(item.s)}
                          className="p-1.5 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded text-[10px] font-bold text-gray-800 transition-colors"
                        >{item.l}</button>
                      ))}
                    </div>
                  )}
                  {aiEquationActiveSymbolTab === 'calcOps' && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { l: 'Summation ∑', s: '\\sum_{i=1}^{n} ' }, { l: 'Product ∏', s: '\\prod_{i=1}^{n} ' },
                        { l: 'Integral ∫', s: '\\int_{a}^{b} ' }, { l: 'Double ∫∫', s: '\\iint ' },
                        { l: 'Limit lim', s: '\\lim_{x \\to \\infty} ' }, { l: 'd/dx', s: '\\frac{d}{dx} ' },
                        { l: '∂/∂x', s: '\\frac{\\partial}{\\partial x} ' }, { l: 'Gradient ∇', s: '\\nabla ' },
                        { l: 'Laplacian ∇²', s: '\\nabla^2 ' }, { l: 'dx', s: '\\, dx' },
                        { l: 'Oint ∮', s: '\\oint ' }, { l: 'argmin', s: '\\arg\\min_{} ' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => handleAppendAiEquationSymbol(item.s)}
                          className="p-1.5 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded text-[10px] font-bold text-gray-800 transition-colors"
                        >{item.l}</button>
                      ))}
                    </div>
                  )}
                  {aiEquationActiveSymbolTab === 'accents' && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { l: 'x̂ (hat)', s: '\\hat{x}' }, { l: 'x̄ (bar)', s: '\\bar{x}' }, { l: 'ẋ (dot)', s: '\\dot{x}' },
                        { l: 'ẍ (ddot)', s: '\\ddot{x}' }, { l: 'x̃ (tilde)', s: '\\tilde{x}' },
                        { l: 'vec(x)', s: '\\vec{x}' }, { l: 'bold x', s: '\\mathbf{x}' }, { l: 'text{...}', s: '\\text{}' },
                        { l: '→', s: '\\rightarrow ' }, { l: '←', s: '\\leftarrow ' },
                        { l: '↔', s: '\\leftrightarrow ' }, { l: '⇒', s: '\\Rightarrow ' }, { l: '⇐', s: '\\Leftarrow ' },
                        { l: '↦', s: '\\mapsto ' }, { l: '↑', s: '\\uparrow ' },
                      ].map((item, idx) => (
                        <button key={idx} type="button" onClick={() => handleAppendAiEquationSymbol(item.s)}
                          className="p-1.5 bg-gray-50 hover:bg-emerald-100 border border-gray-200 rounded text-[10px] font-bold text-gray-800 transition-colors"
                        >{item.l}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ═══════ SECTION 4: Interactive Variable Quick-Edit + LaTeX + Preview ═══════ */}

              {/* Variable Quick-Edit Panel */}
              {aiEquationLatex.trim() && extractEquationVariables(aiEquationLatex).length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <span className="font-extrabold text-indigo-800 text-[10px] uppercase tracking-wider">Variable Quick-Edit — Click any variable to change it</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {extractEquationVariables(aiEquationLatex).map((token, idx) => (
                      <div key={`${token.type}-${token.display}-${idx}`} className="relative">
                        {editingTokenIdx === idx ? (
                          <div className="flex items-center gap-1 bg-white border-2 border-indigo-400 rounded-lg px-2 py-1 shadow-lg animate-in fade-in duration-150">
                            <span className="text-[9px] text-indigo-500 font-bold uppercase">{token.type === 'greek' ? 'Greek' : token.type === 'mathbf' ? 'Bold' : token.type === 'text' ? 'Text' : token.type === 'number' ? 'Num' : 'Var'}:</span>
                            <input
                              type="text"
                              autoFocus
                              value={tokenEditValue}
                              onChange={(e) => setTokenEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleVariableReplacement(idx, tokenEditValue)
                                if (e.key === 'Escape') { setEditingTokenIdx(null); setTokenEditValue('') }
                              }}
                              className="w-16 border border-indigo-300 rounded px-1.5 py-0.5 text-xs font-mono text-indigo-900 focus:border-indigo-500 outline-none bg-indigo-50/50"
                            />
                            <button
                              type="button"
                              onClick={() => handleVariableReplacement(idx, tokenEditValue)}
                              className="p-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingTokenIdx(null); setTokenEditValue('') }}
                              className="p-0.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartTokenEdit(idx, token.value)}
                            className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md transition-all text-left"
                          >
                            <span className="text-[9px] text-gray-400 font-bold uppercase group-hover:text-indigo-500 transition-colors">
                              {token.type === 'greek' ? 'α' : token.type === 'mathbf' ? '𝐁' : token.type === 'text' ? 'T' : token.type === 'number' ? '#' : 'x'}
                            </span>
                            <span className="font-bold text-xs text-gray-800 group-hover:text-indigo-700 font-mono" dangerouslySetInnerHTML={{ __html: renderEquationHtml(token.display) }} />
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-300 group-hover:text-indigo-500 transition-colors"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LaTeX Code + Live Interactive Preview (Side by Side) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-gray-700 text-xs uppercase tracking-wider">LaTeX Code</span>
                    <button type="button" onClick={() => setAiEquationLatex('')} className="text-[10px] text-red-500 font-bold hover:underline">Clear</button>
                  </div>
                  <textarea
                    rows="4"
                    value={aiEquationLatex}
                    onChange={(e) => setAiEquationLatex(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-xl bg-white font-mono text-xs text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none shadow-inner resize-none"
                    placeholder="LaTeX code will appear here after AI generation or preset selection. You can also type directly..."
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-emerald-700 text-xs uppercase tracking-wider">Live Interactive Preview</span>
                    <span className="text-[9px] text-emerald-500 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">Hover to highlight</span>
                  </div>
                  <div
                    ref={aiPreviewRef}
                    className="p-4 bg-white border-2 border-emerald-200 rounded-xl shadow-inner flex justify-center items-center min-h-[106px] overflow-x-auto text-base text-gray-900"
                    style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)' }}
                    dangerouslySetInnerHTML={{ __html: aiEquationLatex.trim() ? renderEquationHtml(aiEquationLatex) : '<span style="color: #9ca3af; font-size: 12px; font-weight: 600;">Equation preview will appear here...</span>' }}
                  />
                </div>
              </div>

              {/* ═══════ SECTION 5: Recent Equations History ═══════ */}
              {aiEquationHistory.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-extrabold text-gray-500 text-[10px] uppercase tracking-wider">🕒 Recently Used Equations</span>
                  <div className="flex flex-wrap gap-1.5">
                    {aiEquationHistory.slice(0, 8).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAiEquationLatex(item.latex)}
                        className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-[10px] font-semibold hover:bg-emerald-50 hover:border-emerald-300 transition-colors truncate max-w-[200px]"
                        title={item.latex}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer Actions */}
            <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex justify-end items-center flex-shrink-0">
              <div className="flex gap-2.5">
                <button onClick={() => { setShowEquationModal(false); setShowAiEquationModal(false); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs">
                  Cancel
                </button>
                <button onClick={handleInsertAiEquation} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all">
                  <Plus size={16} /> {editingEquationElement ? 'Update Equation' : 'Insert Equation into Question Paper'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table, Multi-level List & Equation Alignment CSS */}
      <style>{`
        @counter-style lower-alpha-bracket {
          system: alphabetic;
          symbols: 'a' 'b' 'c' 'd' 'e' 'f' 'g' 'h' 'i' 'j' 'k' 'l' 'm' 'n' 'o' 'p' 'q' 'r' 's' 't' 'u' 'v' 'w' 'x' 'y' 'z';
          suffix: ") ";
        }
        @counter-style lower-roman-bracket {
          system: additive;
          additive-symbols: 1000 M, 900 CM, 500 D, 400 CD, 100 C, 90 XC, 50 L, 40 XL, 10 X, 9 IX, 5 V, 4 IV, 1 i;
          suffix: ") ";
        }
        @counter-style upper-alpha-bracket {
          system: alphabetic;
          symbols: 'A' 'B' 'C' 'D' 'E' 'F' 'G' 'H' 'I' 'J' 'K' 'L' 'M' 'N' 'O' 'P' 'Q' 'R' 'S' 'T' 'U' 'V' 'W' 'X' 'Y' 'Z';
          suffix: ") ";
        }

        /* Multi-Level List Hierarchy Styling */
        .e-richtexteditor .e-rte-content ol,
        .question-paper-preview ol {
          margin-top: 6px !important;
          margin-bottom: 6px !important;
          padding-left: 28px !important;
          list-style-type: decimal;
        }
        .e-richtexteditor .e-rte-content ol > li,
        .question-paper-preview ol > li {
          list-style-type: decimal;
        }

        .e-richtexteditor .e-rte-content ol ol,
        .question-paper-preview ol ol {
          list-style-type: lower-alpha;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
          padding-left: 28px !important;
        }
        .e-richtexteditor .e-rte-content ol ol > li,
        .question-paper-preview ol ol > li {
          list-style-type: lower-alpha;
        }

        .e-richtexteditor .e-rte-content ol ol ol,
        .question-paper-preview ol ol ol {
          list-style-type: lower-roman;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
          padding-left: 28px !important;
        }
        .e-richtexteditor .e-rte-content ol ol ol > li,
        .question-paper-preview ol ol ol > li {
          list-style-type: lower-roman;
        }

        .e-richtexteditor .e-rte-content ol ol ol ol,
        .question-paper-preview ol ol ol ol {
          list-style-type: upper-alpha;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
          padding-left: 28px !important;
        }
        .e-richtexteditor .e-rte-content ol ol ol ol > li,
        .question-paper-preview ol ol ol ol > li {
          list-style-type: upper-alpha;
        }

        /* Explicit Numbered List Format Overrides */
        .e-richtexteditor .e-rte-content ol[style*="lower-alpha"],
        .e-richtexteditor .e-rte-content ol.e-list-lower-alpha,
        .e-richtexteditor .e-rte-content ol[style*="lower-alpha"] li,
        .e-richtexteditor .e-rte-content ol.e-list-lower-alpha li,
        .question-paper-preview ol[style*="lower-alpha"],
        .question-paper-preview ol.e-list-lower-alpha,
        .question-paper-preview ol[style*="lower-alpha"] li {
          list-style-type: lower-alpha !important;
        }

        .e-richtexteditor .e-rte-content ol[style*="upper-alpha"],
        .e-richtexteditor .e-rte-content ol.e-list-upper-alpha,
        .e-richtexteditor .e-rte-content ol[style*="upper-alpha"] li,
        .e-richtexteditor .e-rte-content ol.e-list-upper-alpha li,
        .question-paper-preview ol[style*="upper-alpha"],
        .question-paper-preview ol.e-list-upper-alpha,
        .question-paper-preview ol[style*="upper-alpha"] li {
          list-style-type: upper-alpha !important;
        }

        .e-richtexteditor .e-rte-content ol[style*="lower-roman"],
        .e-richtexteditor .e-rte-content ol.e-list-lower-roman,
        .e-richtexteditor .e-rte-content ol[style*="lower-roman"] li,
        .e-richtexteditor .e-rte-content ol.e-list-lower-roman li,
        .question-paper-preview ol[style*="lower-roman"],
        .question-paper-preview ol.e-list-lower-roman,
        .question-paper-preview ol[style*="lower-roman"] li {
          list-style-type: lower-roman !important;
        }

        .e-richtexteditor .e-rte-content ol[style*="upper-roman"],
        .e-richtexteditor .e-rte-content ol.e-list-upper-roman,
        .e-richtexteditor .e-rte-content ol[style*="upper-roman"] li,
        .e-richtexteditor .e-rte-content ol.e-list-upper-roman li,
        .question-paper-preview ol[style*="upper-roman"],
        .question-paper-preview ol.e-list-upper-roman,
        .question-paper-preview ol[style*="upper-roman"] li {
          list-style-type: upper-roman !important;
        }

        .e-richtexteditor .e-rte-content ol[style*="lower-greek"],
        .e-richtexteditor .e-rte-content ol.e-list-lower-greek,
        .e-richtexteditor .e-rte-content ol[style*="lower-greek"] li,
        .e-richtexteditor .e-rte-content ol.e-list-lower-greek li,
        .question-paper-preview ol[style*="lower-greek"],
        .question-paper-preview ol.e-list-lower-greek,
        .question-paper-preview ol[style*="lower-greek"] li {
          list-style-type: lower-greek !important;
        }

        .e-richtexteditor .e-rte-content ol[style*="decimal"],
        .e-richtexteditor .e-rte-content ol.e-list-decimal,
        .e-richtexteditor .e-rte-content ol[style*="decimal"] li,
        .e-richtexteditor .e-rte-content ol.e-list-decimal li,
        .question-paper-preview ol[style*="decimal"],
        .question-paper-preview ol.e-list-decimal,
        .question-paper-preview ol[style*="decimal"] li {
          list-style-type: decimal !important;
        }

        .e-richtexteditor .e-rte-content > ol > li,
        .question-paper-preview > ol > li {
          margin-top: 8px !important;
          margin-bottom: 8px !important;
        }

        .e-richtexteditor .e-rte-content p,
        .e-richtexteditor .e-rte-content li,
        .question-paper-preview p,
        .question-paper-preview li {
          line-height: 2.0 !important;
          margin-bottom: 4px;
        }

        /* Mathematical Equation Styling */
        .math-equation-wrapper {
          display: inline-flex !important;
          align-items: center !important;
          vertical-align: middle !important;
          padding: 3px 8px !important;
          margin: 6px 4px !important;
          line-height: normal !important;
          border: 1px dashed #93c5fd !important;
          border-radius: 6px !important;
          background-color: #f0f9ff !important;
          cursor: pointer;
          transition: all 0.15s ease;
          position: relative;
          z-index: 1;
        }
        .math-equation-wrapper:hover {
          border-color: #2563eb !important;
          background-color: #e0f2fe !important;
          box-shadow: 0 1px 4px rgba(37, 99, 235, 0.2);
        }

        .katex-display {
          display: inline-block !important;
          margin: 0.2em 0 !important;
        }
        .katex {
          font-size: 1.1em !important;
          line-height: 1.2 !important;
          text-indent: 0 !important;
        }
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
