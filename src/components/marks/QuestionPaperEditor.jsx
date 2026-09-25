import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { apiService, isMLReady } from '../../services/apiService'
import { useAuth } from '../../context/AuthContext'
import { useMLServiceWakeup } from '../../hooks/useMLServiceWakeup'
import {
  HtmlEditor,
  Image,
  Inject,
  Link,
  QuickToolbar,
  RichTextEditorComponent,
  Toolbar,
  Table,
  PasteCleanup,
  Count
} from '@syncfusion/ej2-react-richtexteditor'
import { ArrowLeft, Save, FileDown, Printer, Loader2, AlertCircle, Plus, Minus, X, Maximize2, Sparkles, ChevronRight, Check, Target, Share2, Grid, RefreshCw, ClipboardList, ShieldCheck, Search, FileText, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Trash2, GripHorizontal, Code2, Terminal, AlignCenter, AlignLeft, Copy, CheckSquare, ListOrdered, Square, Edit3, BookOpen, Play, Undo2, Redo2 } from 'lucide-react'
import mammoth from 'mammoth'
import html2canvas from 'html2canvas'

import katex from 'katex'
import 'katex/dist/katex.min.css'
import { BAIUST_LOGO } from './baiustLogo'
import { getNotesStatus, suggestQuestionsFromNotes, stripQuestionLeadingNumber, getNormalizedCourseKey, getCachedNotesStatus, syncNotesBlobToBackend } from '../../services/notesApi'
import { smartFormatCode, isCodeLikelySingleLine, detectEmbeddedCodeInQuestion } from '../../utils/codeFormatter'
import ReferenceNotesModal from '../dashboard/ReferenceNotesModal'
import TableDesignModal from './TableDesignModal'

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

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== "undefined" && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1") ? "https://student-outcome-analyzer-api.onrender.com" : "");

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
      return `<ol style="margin-top: 6px; margin-bottom: 14px; padding-left: 36px; list-style-type: decimal;">${items}</ol>`
    }

    // Bullet list items (e.g. "- Item" or "* Item")
    const isBullet = lines.length > 0 && lines.every(l => /^[\-\*•]\s+/.test(l))
    if (isBullet) {
      const items = lines.map(l => `<li style="margin-bottom: 4px;">${l.replace(/^[\-\*•]\s+/, '')}</li>`).join('')
      return `<ul style="margin-top: 6px; margin-bottom: 14px; padding-left: 36px; list-style-type: disc;">${items}</ul>`
    }

    // Standard paragraphs (each non-empty line as its own paragraph to avoid br wrapping issues with rich text list commands)
    return lines.map(line => `<p style="margin-bottom: 6px; line-height: 1.5;">${line}</p>`).join('')
  })

  return htmlBlocks.join('')
}

// Helper: Intelligently distribute total exam marks across generated questions
function calculateQuestionMarkDistribution(totalMarks, numQuestions) {
  const marks = Math.max(1, parseInt(totalMarks) || 10)
  const count = Math.max(1, Math.min(5, parseInt(numQuestions) || 1))
  const base = Math.floor(marks / count)
  const remainder = marks % count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0))
}

// Helper: Get strictly permitted OBE marks based on assessment type (Mid/Final: 10, 15, 30; CT, Assignment, Presentation, Project Report: 10, 15)
function getAllowedMarksForExamType(type = '') {
  if (type === 'Mid Term Exam' || type === 'Final Exam') {
    return [10, 15, 30]
  }
  return [10, 15]
}

// Helper: Bloom's Taxonomy Cognitive Hierarchy & Pedagogical Action Verbs
const BLOOM_TAXONOMY_MAP = {
  'C1': {
    level: 'C1',
    name: 'Remember',
    verbs: ['Define', 'List', 'State', 'Identify', 'Recall', 'Name', 'Outline'],
    cognitiveExpectation: 'Tests direct memory and factual recall of definitions, terminology, formulas, and foundational principles.',
    promptDirective: 'Ask direct definition, syntax, or identification questions without requiring analytical elaboration.'
  },
  'C2': {
    level: 'C2',
    name: 'Understand',
    verbs: ['Explain', 'Describe', 'Discuss', 'Distinguish', 'Summarize', 'Interpret', 'Illustrate'],
    cognitiveExpectation: 'Tests comprehension of concepts, internal mechanisms, and explaining why algorithms/methods work in own words.',
    promptDirective: 'Require students to explain principles, interpret workflows, or describe step-by-step executions.'
  },
  'C3': {
    level: 'C3',
    name: 'Apply',
    verbs: ['Calculate', 'Solve', 'Implement', 'Demonstrate', 'Trace', 'Execute', 'Construct'],
    cognitiveExpectation: 'Tests practical problem-solving: applying formulas, algorithms, or code to concrete inputs/data.',
    promptDirective: 'Provide specific input values, step-by-step trace tasks, code implementation exercises, or numerical calculations.'
  },
  'C4': {
    level: 'C4',
    name: 'Analyze',
    verbs: ['Analyze', 'Compare', 'Contrast', 'Differentiate', 'Deconstruct', 'Examine', 'Trade-off Analysis'],
    cognitiveExpectation: 'Tests breaking down systems, comparing approaches, diagnosing bottlenecks, and evaluating trade-offs (e.g. time/space complexity, edge cases).',
    promptDirective: 'Require rigorous comparative analysis (e.g. Approach A vs Approach B), time/space complexity derivations, or boundary case diagnosis.'
  },
  'C5': {
    level: 'C5',
    name: 'Evaluate',
    verbs: ['Evaluate', 'Justify', 'Critique', 'Appraise', 'Defend', 'Prioritize', 'Validate'],
    cognitiveExpectation: 'Tests critical judgment, defending technical decisions, and evaluating against strict performance criteria.',
    promptDirective: 'Ask students to critique a design or algorithm, justify the optimal choice under strict trade-offs, or validate correctness.'
  },
  'C6': {
    level: 'C6',
    name: 'Create',
    verbs: ['Design', 'Formulate', 'Develop', 'Architect', 'Synthesize', 'Devise'],
    cognitiveExpectation: 'Tests synthesis: designing an end-to-end architecture, novel algorithm, or comprehensive solution from requirements.',
    promptDirective: 'Provide real-world engineering constraints and require designing an innovative algorithm, architecture, or modular framework.'
  }
}

function getBloomInfo(bloomLevelStr) {
  const code = (bloomLevelStr || '').substring(0, 2).toUpperCase()
  return BLOOM_TAXONOMY_MAP[code] || BLOOM_TAXONOMY_MAP['C4']
}

// Helper: Render modals via Portal targeting active fullscreen element (HTML5, Custom Fullscreen, or Syncfusion RTE) or document.body
function ModalPortal({ children }) {
  const getPortalContainer = () => {
    if (typeof document === 'undefined') return null
    if (document.fullscreenElement) return document.fullscreenElement
    const customFullscreen = document.querySelector('.fixed.w-screen.h-screen, .fixed.w-screen, .e-rte-fullscreen, .e-richtexteditor.e-full-screen, .e-rte-full-screen')
    if (customFullscreen) return customFullscreen
    return document.body
  }

  const [target, setTarget] = useState(() => getPortalContainer() || (typeof document !== 'undefined' ? document.body : null))

  useEffect(() => {
    const updateTarget = () => {
      setTarget(getPortalContainer() || document.body)
    }
    updateTarget()

    const observer = new MutationObserver(updateTarget)
    if (typeof document !== 'undefined' && document.body) {
      observer.observe(document.body, { attributes: true, subtree: true, childList: true, attributeFilter: ['class'] })
    }

    document.addEventListener('fullscreenchange', updateTarget)
    document.addEventListener('webkitfullscreenchange', updateTarget)
    document.addEventListener('mozfullscreenchange', updateTarget)
    document.addEventListener('MSFullscreenChange', updateTarget)

    return () => {
      observer.disconnect()
      document.removeEventListener('fullscreenchange', updateTarget)
      document.removeEventListener('webkitfullscreenchange', updateTarget)
      document.removeEventListener('mozfullscreenchange', updateTarget)
      document.removeEventListener('MSFullscreenChange', updateTarget)
    }
  }, [])

  if (!target) return null
  return createPortal(children, target)
}

// Helper: Universal Graph / Tree Edge Line Parser (Supports negative numbers like -5, math symbols, words)
function parseGraphLines(edgeText = '') {
  const lines = (edgeText || '').split(/\r?\n|;/).map(l => l.trim()).filter(Boolean)
  const nodesSet = new Set()
  const edges = []
  const syntaxShapes = {}

  // Extracts clean node label and any bracket shape syntax: [Node] -> rect, ((Node)) or (Node) -> circle
  const cleanNode = (raw) => {
    let s = (raw || '').trim()
    let shape = null
    if (s.startsWith('[') && s.endsWith(']')) {
      shape = 'rect'
      s = s.slice(1, -1).trim()
    } else if (s.startsWith('((') && s.endsWith('))')) {
      shape = 'circle'
      s = s.slice(2, -2).trim()
    } else if (s.startsWith('(') && s.endsWith(')')) {
      shape = 'circle'
      s = s.slice(1, -1).trim()
    }
    return { name: s, shape }
  }

  lines.forEach(line => {
    // Extract optional weight: e.g. ": 10", ": a", or "= 10"
    let weight = ''
    let edgePart = line.trim()
    // Prioritize colon delimiter first (standard for automata and CS graphs)
    const colonMatch = edgePart.match(/^(.+?)\s*:\s*(.+)$/)
    if (colonMatch) {
      edgePart = colonMatch[1].trim()
      weight = colonMatch[2].trim()
    } else {
      // Equals sign only when not part of => or <=>
      const eqMatch = edgePart.match(/^([^<>=]+(?:->|--|-|<->|<=>)?(?:[^<>=]+)?)\s*=\s*([^>].*)$/)
      if (eqMatch) {
        edgePart = eqMatch[1].trim()
        weight = eqMatch[2].trim()
      }
    }

    let from = ''
    let to = ''
    let isBidirectional = false

    // Delimiter priority: bidirectional first (<-> , <=> , <>) then directed (-> , =>) then undirected (-- , " - " , -)
    if (edgePart.includes('<->')) {
      const parts = edgePart.split('<->')
      from = parts[0].trim()
      to = parts.slice(1).join('<->').trim()
      isBidirectional = true
    } else if (edgePart.includes('<=>')) {
      const parts = edgePart.split('<=>')
      from = parts[0].trim()
      to = parts.slice(1).join('<=>').trim()
      isBidirectional = true
    } else if (edgePart.includes('<>')) {
      const parts = edgePart.split('<>')
      from = parts[0].trim()
      to = parts.slice(1).join('<>').trim()
      isBidirectional = true
    } else if (edgePart.includes('->')) {
      const parts = edgePart.split('->')
      from = parts[0].trim()
      to = parts.slice(1).join('->').trim()
    } else if (edgePart.includes('=>')) {
      const parts = edgePart.split('=>')
      from = parts[0].trim()
      to = parts.slice(1).join('=>').trim()
    } else if (edgePart.includes('--')) {
      const parts = edgePart.split('--')
      from = parts[0].trim()
      to = parts.slice(1).join('--').trim()
    } else if (/\s+-\s+/.test(edgePart)) {
      const parts = edgePart.split(/\s+-\s+/)
      from = parts[0].trim()
      to = parts.slice(1).join(' - ').trim()
    } else if (edgePart.includes('-')) {
      // e.g. A-B, or C--5, or -5-B, or -5--10
      let dashIdx = -1
      if (edgePart.startsWith('-')) {
        dashIdx = edgePart.indexOf('-', 1)
      } else {
        dashIdx = edgePart.indexOf('-')
      }
      if (dashIdx !== -1) {
        from = edgePart.substring(0, dashIdx).trim()
        to = edgePart.substring(dashIdx + 1).trim()
      }
    }

    if (from && to) {
      const cFrom = cleanNode(from)
      const cTo = cleanNode(to)
      from = cFrom.name
      to = cTo.name
      if (cFrom.shape) syntaxShapes[from] = cFrom.shape
      if (cTo.shape) syntaxShapes[to] = cTo.shape
      if (from && to) {
        nodesSet.add(from)
        nodesSet.add(to)
        edges.push({ from, to, weight })
        if (isBidirectional) {
          edges.push({ from: to, to: from, weight })
        }
      }
    } else if (!from && !to && edgePart) {
      // Standalone node declaration e.g. -> q0 or [NodeA] or NodeA
      if (edgePart.startsWith('->') || edgePart.startsWith('=>')) {
        const target = cleanNode(edgePart.replace(/^->|=>/, '').trim())
        if (target.name) {
          nodesSet.add(target.name)
          if (target.shape) syntaxShapes[target.name] = target.shape
        }
      } else {
        const solo = cleanNode(edgePart)
        if (solo.name && !solo.name.includes('->') && !solo.name.includes('--')) {
          nodesSet.add(solo.name)
          if (solo.shape) syntaxShapes[solo.name] = solo.shape
        }
      }
    }
  })

  if (nodesSet.size === 0) {
    ['A', 'B', 'C', 'D'].forEach(n => nodesSet.add(n))
    edges.push({ from: 'A', to: 'B', weight: '10' })
    edges.push({ from: 'A', to: 'C', weight: '5' })
    edges.push({ from: 'B', to: 'C', weight: '15' })
    edges.push({ from: 'C', to: 'D', weight: '8' })
  }

  return { nodes: Array.from(nodesSet), edges, nodeShapes: syntaxShapes }
}

// Helper: Resolve effective shape of a node (circle or rect)
// Respects: (1) Explicit per-node state override -> (2) Syntax [Node] override -> (3) Category default (Map = rect, Tree/Graph/Automata = circle)
function resolveNodeShape(nodeName, category = 'graph', customShapes = {}, syntaxShapes = {}) {
  if (customShapes && customShapes[nodeName]) {
    return customShapes[nodeName]
  }
  if (syntaxShapes && syntaxShapes[nodeName]) {
    return syntaxShapes[nodeName]
  }
  if (category === 'map') {
    return 'rect'
  }
  return 'circle'
}// Helper: Compute positions for Graph & Tree layouts (Tree Hierarchical, Map, Circle/Polygon, Horizontal Flow, or Custom Dragged)
function computeGraphLayout(nodesList = [], edges = [], graphType = 'directed', customPositions = {}, automataOptions = {}) {
  const width = 750
  const height = 400
  const positions = {}

  // Keep any custom dragged positions
  nodesList.forEach(node => {
    if (customPositions && customPositions[node]) {
      positions[node] = { ...customPositions[node] }
    }
  })

  const unpositioned = nodesList.filter(n => !positions[n])
  if (unpositioned.length === 0) return positions

  // 1. Symmetrical Level-Wise Tree Layout Algorithms (Top-Down, Left-to-Right, Right-to-Left)
  if (graphType.startsWith('tree')) {
    const isTopDown = graphType === 'tree' || graphType === 'tree_directed'
    const isLR = graphType === 'tree_lr' || graphType === 'tree_lr_directed'
    const isRL = graphType === 'tree_rl' || graphType === 'tree_rl_directed'

    // Exact Symmetrical Coordinates crafted and approved by Teacher for the default academic tree
    const predefinedAcademicTreeCoords = {
      '15': { x: 375, y: 55 },
      '35': { x: 260, y: 115 },
      '9':  { x: 375, y: 115 },
      '40': { x: 490, y: 115 },
      '3':  { x: 215, y: 185 },
      '6':  { x: 305, y: 185 },
      '5':  { x: 445, y: 185 },
      '7':  { x: 535, y: 185 },
      '1':  { x: 170, y: 255 },
      '10': { x: 270, y: 255 },
      '8':  { x: 395, y: 255 },
      '4':  { x: 450, y: 255 },
      '41': { x: 510, y: 255 }
    }

    const isAcademicTree = ['15', '35', '9', '40'].every(n => nodesList.includes(n))
    if (isAcademicTree && isTopDown) {
      nodesList.forEach((n, idx) => {
        if (predefinedAcademicTreeCoords[n]) {
          positions[n] = { ...predefinedAcademicTreeCoords[n] }
        } else {
          positions[n] = { x: 80 + idx * 55, y: 255 }
        }
      })
    } else {
      const inDegree = {}
      const childrenMap = {}
      nodesList.forEach(n => { inDegree[n] = 0; childrenMap[n] = [] })

      edges.forEach(e => {
        if (inDegree[e.to] !== undefined) inDegree[e.to] += 1
        if (childrenMap[e.from]) childrenMap[e.from].push(e.to)
      })

      let roots = nodesList.filter(n => inDegree[n] === 0)
      if (roots.length === 0 && nodesList.length > 0) roots = [nodesList[0]]

      const nodeLevels = {}
      const levels = {}
      const visited = new Set()

      const assignLevels = (node, level) => {
        if (visited.has(node)) return
        visited.add(node)
        nodeLevels[node] = level
        if (!levels[level]) levels[level] = []
        levels[level].push(node)
        const children = childrenMap[node] || []
        children.forEach(child => assignLevels(child, level + 1))
      }

      roots.forEach(r => assignLevels(r, 0))
      nodesList.forEach(n => {
        if (!visited.has(n)) {
          nodeLevels[n] = 0
          if (!levels[0]) levels[0] = []
          levels[0].push(n)
        }
      })

      const levelKeys = Object.keys(levels).map(Number).sort((a, b) => a - b)
      const maxLevel = levelKeys.length > 0 ? Math.max(...levelKeys) : 0

      // Symmetrical subtree layout
      const subtreeLeaves = (node, seen = new Set()) => {
        if (seen.has(node)) return 1
        seen.add(node)
        const children = childrenMap[node] || []
        if (children.length === 0) return 1
        return children.reduce((sum, c) => sum + subtreeLeaves(c, seen), 0)
      }

      const totalLeaves = roots.reduce((sum, r) => sum + subtreeLeaves(r), 0)

      if (isLR || isRL) {
        // Horizontal Tree Layout (Left-to-Right or Right-to-Left)
        const stepX = maxLevel > 0 ? Math.min(Math.floor((width - 150) / maxLevel), 125) : 125
        const slotH = Math.min((height - 70) / Math.max(totalLeaves, 1), 58)

        let leafCursor = 0
        const placeNodeHorizontal = (node, seen = new Set()) => {
          if (seen.has(node)) return positions[node].y
          seen.add(node)
          const children = childrenMap[node] || []
          const lvl = nodeLevels[node] || 0
          const x = isLR ? (85 + lvl * stepX) : ((width - 85) - lvl * stepX)

          if (children.length === 0) {
            const y = 45 + (leafCursor + 0.5) * slotH
            leafCursor++
            positions[node] = { x, y: Math.round(y) }
            return positions[node].y
          }

          const childYs = children.map(c => placeNodeHorizontal(c, seen))
          let parentY
          if (children.length === 3) {
            const midChildY = childYs[1]
            const topGap = midChildY - childYs[0]
            const bottomGap = childYs[2] - midChildY
            const avgGap = Math.max(topGap, bottomGap, 40)
            positions[children[0]].y = Math.round(midChildY - avgGap)
            positions[children[1]].y = Math.round(midChildY)
            positions[children[2]].y = Math.round(midChildY + avgGap)
            parentY = midChildY
          } else {
            parentY = Math.round((childYs[0] + childYs[childYs.length - 1]) / 2)
          }

          positions[node] = { x, y: parentY }
          return parentY
        }

        roots.forEach(r => placeNodeHorizontal(r))

        // Center tree vertically around centerY = 200
        let tMinY = Infinity, tMaxY = -Infinity
        nodesList.forEach(n => {
          if (positions[n]) {
            tMinY = Math.min(tMinY, positions[n].y)
            tMaxY = Math.max(tMaxY, positions[n].y)
          }
        })
        if (isFinite(tMinY) && isFinite(tMaxY)) {
          const shiftY = Math.round(200 - (tMinY + tMaxY) / 2)
          nodesList.forEach(n => {
            if (positions[n]) {
              positions[n].y = Math.max(26, Math.min(height - 26, positions[n].y + shiftY))
            }
          })
        }
      } else {
        // Top-Down Hierarchical Tree Layout
        const stepY = maxLevel > 0 ? Math.min(Math.floor((height - 90) / maxLevel), 75) : 75
        const slotW = Math.min((width - 70) / Math.max(totalLeaves, 1), 75)

        let leafCursor = 0
        const placeNode = (node, seen = new Set()) => {
          if (seen.has(node)) return positions[node].x
          seen.add(node)
          const children = childrenMap[node] || []
          const lvl = nodeLevels[node] || 0
          const y = 65 + lvl * stepY

          if (children.length === 0) {
            const x = 45 + (leafCursor + 0.5) * slotW
            leafCursor++
            positions[node] = { x: Math.round(x), y }
            return positions[node].x
          }

          const childXs = children.map(c => placeNode(c, seen))
          let parentX
          if (children.length === 3) {
            const midChildX = childXs[1]
            const leftGap = midChildX - childXs[0]
            const rightGap = childXs[2] - midChildX
            const avgGap = Math.max(leftGap, rightGap, 45)
            positions[children[0]].x = Math.round(midChildX - avgGap)
            positions[children[1]].x = Math.round(midChildX)
            positions[children[2]].x = Math.round(midChildX + avgGap)
            parentX = midChildX
          } else {
            parentX = Math.round((childXs[0] + childXs[childXs.length - 1]) / 2)
          }

          positions[node] = { x: parentX, y }
          return parentX
        }

        roots.forEach(r => placeNode(r))

        // Second pass: For parent with 3 children, lock middle child directly below parent
        nodesList.forEach(node => {
          const children = childrenMap[node] || []
          if (children.length === 3) {
            const pX = positions[node].x
            positions[children[1]].x = pX
            const dX = Math.max(Math.abs(pX - positions[children[0]].x), Math.abs(positions[children[2]].x - pX), 52)
            positions[children[0]].x = pX - dX
            positions[children[2]].x = pX + dX
          }
        })

        // Handle any orphan nodes
        nodesList.forEach((n, idx) => {
          if (!positions[n]) {
            positions[n] = { x: 60 + idx * 55, y: 65 }
          }
        })

        // Center tree horizontally around centerX = width / 2
        let tMinX = Infinity, tMaxX = -Infinity
        nodesList.forEach(n => {
          if (positions[n]) {
            tMinX = Math.min(tMinX, positions[n].x)
            tMaxX = Math.max(tMaxX, positions[n].x)
          }
        })
        if (isFinite(tMinX) && isFinite(tMaxX)) {
          const shiftX = Math.round(width / 2 - (tMinX + tMaxX) / 2)
          nodesList.forEach(n => {
            if (positions[n]) {
              positions[n].x = Math.max(28, Math.min(width - 28, positions[n].x + shiftX))
            }
          })
        }
      }
    }
  }

  // 2. Horizontal Flow Layout (Left-to-Right Pipeline)
  if (graphType === 'horizontal') {
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
    const stepX = (width - 140) / Math.max(maxLevel, 1)

    levelKeys.forEach(lvl => {
      const nodesAtLvl = levels[lvl]
      const count = nodesAtLvl.length
      const stepY = height / (count + 1)
      const x = 70 + lvl * Math.min(stepX, 140)
      nodesAtLvl.forEach((node, idx) => {
        if (!positions[node]) {
          positions[node] = {
            x: x,
            y: stepY * (idx + 1)
          }
        }
      })
    })
  }

  // 3. Map Layout (Network & Geography Layout with clean coordinates)
  if (graphType === 'map' || graphType === 'map_directed') {
    const predefinedMapCoords = {
      'ORADEA': { x: 260, y: 35 },
      'ZERIND': { x: 170, y: 105 },
      'ARAD': { x: 175, y: 215 },
      'SIBIU': { x: 345, y: 82 },
      'FAGARAS': { x: 415, y: 220 },
      'RIMNICU': { x: 310, y: 225 },
      'PITESTI': { x: 375, y: 298 },
      'BUCHAREST': { x: 500, y: 298 },
      'URZICENI': { x: 605, y: 220 },
      'VASLUI': { x: 615, y: 105 },
      'IASI': { x: 525, y: 160 },
      'NEAMT': { x: 475, y: 88 },
      'TIMISOARA': { x: 120, y: 295 },
      'LUGOJ': { x: 190, y: 345 },
      'MEHADIA': { x: 225, y: 385 },
      'DROBETA': { x: 260, y: 385 },
      'CRAIOVA': { x: 330, y: 385 },
      'GIURGIU': { x: 505, y: 385 },
      'HIRSOVA': { x: 675, y: 220 },
      'EFORIE': { x: 690, y: 295 }
    }

    nodesList.forEach((node, idx) => {
      if (!positions[node]) {
        const upper = node.toUpperCase()
        if (predefinedMapCoords[upper]) {
          positions[node] = { ...predefinedMapCoords[upper] }
        } else {
          const angle = (2 * Math.PI * idx) / nodesList.length - Math.PI / 2
          positions[node] = {
            x: 375 + 220 * Math.cos(angle),
            y: 200 + 130 * Math.sin(angle)
          }
        }
      }
    })
  }

  // 4. Automata / State Diagram Smart Pipeline & Branch Layout
  // Accurately recognizes main state pipeline (q0 -> q1 -> q4 -> q5 -> q6) and branch/satellite states (q2 above q0, q3 above q1)
  const isAutomata = ['dfa', 'nfa', 'enfa', 'moore', 'mealy'].includes(graphType)
  if (isAutomata) {
    const unpositionedNodes = nodesList.filter(n => !positions[n])
    if (unpositionedNodes.length > 0) {
      const adj = {}
      const outEdges = {}
      nodesList.forEach(n => { adj[n] = new Set(); outEdges[n] = [] })
      edges.forEach(e => {
        if (e.from !== e.to && adj[e.from] && adj[e.to]) {
          adj[e.from].add(e.to)
          adj[e.to].add(e.from)
          outEdges[e.from].push(e.to)
        }
      })

      const start = (automataOptions && automataOptions.startState && nodesList.includes(automataOptions.startState))
        ? automataOptions.startState
        : nodesList[0]

      // Find longest directed forward chain / spine starting from start
      let bestPath = [start]
      const findPaths = (curr, currentPath, visited) => {
        if (currentPath.length > bestPath.length) bestPath = [...currentPath]
        const nexts = (outEdges[curr] || []).filter(nxt => !visited.has(nxt))
        for (const nxt of nexts) {
          visited.add(nxt)
          findPaths(nxt, [...currentPath, nxt], visited)
          visited.delete(nxt)
        }
      }
      findPaths(start, [start], new Set([start]))

      const spineSet = new Set(bestPath)
      const nonSpine = nodesList.filter(n => !spineSet.has(n))

      // Identify satellites attached to spine nodes (e.g. q2 attached to q0, q3 attached to q1)
      const satellitesAbove = {}
      const satellitesBelow = {}
      const remainingNodes = []

      nonSpine.forEach(n => {
        const spineNeighbors = Array.from(adj[n] || []).filter(nbr => spineSet.has(nbr))
        if (spineNeighbors.length === 1) {
          const parent = spineNeighbors[0]
          if (!satellitesAbove[parent]) {
            satellitesAbove[parent] = n
          } else if (!satellitesBelow[parent]) {
            satellitesBelow[parent] = n
          } else {
            remainingNodes.push(n)
          }
        } else {
          remainingNodes.push(n)
        }
      })

      const hasSatellites = Object.keys(satellitesAbove).length > 0 || Object.keys(satellitesBelow).length > 0
      const spineY = hasSatellites ? 240 : 200
      const spineCount = bestPath.length
      const startX = 110
      const maxSpineW = width - startX - 80
      const spineStepX = spineCount > 1
        ? Math.min(135, Math.max(75, Math.floor(maxSpineW / (spineCount - 1))))
        : 0
      const totalSpineW = (spineCount - 1) * spineStepX
      const spineOffsetX = Math.max(startX, Math.round((width - totalSpineW) / 2))

      bestPath.forEach((node, idx) => {
        if (!positions[node]) {
          positions[node] = {
            x: spineCount === 1 ? Math.round(width / 2) : spineOffsetX + idx * spineStepX,
            y: spineY
          }
        }
      })

      // Position satellite states directly above / below their spine parents
      Object.entries(satellitesAbove).forEach(([parent, satNode]) => {
        if (!positions[satNode] && positions[parent]) {
          positions[satNode] = {
            x: positions[parent].x,
            y: Math.max(65, positions[parent].y - 130)
          }
        }
      })

      Object.entries(satellitesBelow).forEach(([parent, satNode]) => {
        if (!positions[satNode] && positions[parent]) {
          positions[satNode] = {
            x: positions[parent].x,
            y: Math.min(height - 50, positions[parent].y + 120)
          }
        }
      })

      // Any remaining nodes placed with comfortable spacing so nothing is ever clipped
      remainingNodes.forEach((node, idx) => {
        if (!positions[node]) {
          const slotStepX = Math.min(110, Math.floor((width - startX - 60) / Math.max(remainingNodes.length, 1)))
          positions[node] = {
            x: startX + idx * slotStepX,
            y: 80
          }
        }
      })
    }
  }

  // 5. Grid / Matrix Layout (e.g. 3x3 Kruskal, 3x3 BFS/DFS, 2x2 Floyd-Warshall)
  const isGrid = graphType === 'grid' || graphType === 'grid_directed' || graphType === 'grid_matrix'
  if (isGrid) {
    const unpositioned = nodesList.filter(n => !positions[n])
    const N = nodesList.length
    const cols = N <= 4 ? 2 : (N <= 9 ? 3 : (N <= 16 ? 4 : 5))
    const rows = Math.ceil(N / cols)
    const stepX = Math.min(185, Math.floor((width - 140) / Math.max(cols - 1, 1)))
    const stepY = Math.min(130, Math.floor((height - 100) / Math.max(rows - 1, 1)))
    const startX = Math.round((width - (cols - 1) * stepX) / 2)
    const startY = Math.round((height - (rows - 1) * stepY) / 2)

    nodesList.forEach((node, idx) => {
      if (!positions[node]) {
        const r = Math.floor(idx / cols)
        const c = idx % cols
        positions[node] = {
          x: startX + c * stepX,
          y: startY + r * stepY
        }
      }
    })
  }

  // 6. Default Circular / Regular Symmetrical Polygon Layout
  if (!graphType.startsWith('tree') && !graphType.startsWith('map') && graphType !== 'horizontal' && !isAutomata && !isGrid) {
    const unpositioned = nodesList.filter(n => !positions[n])
    const N = unpositioned.length || nodesList.length
    const centerX = width / 2
    const centerY = height / 2 + 10
    const radius = Math.min(width, height) * 0.34

    unpositioned.forEach((node, idx) => {
      const angle = (2 * Math.PI * idx) / N - Math.PI / 2
      positions[node] = {
        x: Math.round(centerX + radius * Math.cos(angle)),
        y: Math.round(centerY + radius * Math.sin(angle))
      }
    })
  }

  // CRITICAL: Any manually dragged node in customPositions ALWAYS overrides the default calculated position!
  nodesList.forEach(node => {
    if (customPositions && customPositions[node]) {
      positions[node] = { ...customPositions[node] }
    }
  })

  return positions
}

// Helper: Compute optimal outward direction & smooth geometry for self-loops
// Automatically steers loop away from all incident edges to prevent any collision
function getSelfLoopGeometry(u, positions, edges, subIdx = 0, options = {}) {
  const pu = positions[u]
  if (!pu) return null

  const isAutomata = options.isAutomata || false
  const isStart = options.startState === u

  // Collect all blocked angles around node u from incident edges and initial start arrow
  const blockedAngles = []
  if (isStart) {
    blockedAngles.push(Math.PI) // Start arrow enters from the left (180 deg)
  }
  edges.forEach(e => {
    const other = e.from === u ? e.to : (e.to === u ? e.from : null)
    if (other && other !== u && positions[other]) {
      const po = positions[other]
      blockedAngles.push(Math.atan2(po.y - pu.y, po.x - pu.x))
    }
  })

  let finalAngle
  if (isAutomata || isStart) {
    // 8 candidate directions: UP, RIGHT, TOP-RIGHT, DOWN, BOTTOM-RIGHT, TOP-LEFT, LEFT, BOTTOM-LEFT
    const candidates = [-Math.PI / 2, 0, -Math.PI / 4, Math.PI / 2, Math.PI / 4, -3 * Math.PI / 4, Math.PI, 3 * Math.PI / 4]
    let bestCand = -Math.PI / 2
    let maxScore = -1

    candidates.forEach(cand => {
      let minDist = Infinity
      if (blockedAngles.length === 0) {
        minDist = Math.PI
      } else {
        blockedAngles.forEach(ba => {
          let diff = Math.abs(cand - ba)
          while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI)
          if (diff < minDist) minDist = diff
        })
      }

      // If UP has at least 75 deg clearance (1.31 rad), prefer standard UP.
      // Otherwise, select the candidate sector with highest angular clearance from all incident edges.
      let score = minDist
      if (cand === -Math.PI / 2 && minDist >= 1.3) score += 0.55
      else if (cand === 0 && minDist >= 1.3) score += 0.35
      else if (cand === -Math.PI / 4 && minDist >= 1.1) score += 0.25

      if (score > maxScore) {
        maxScore = score
        bestCand = cand
      }
    })

    const fanOffset = subIdx === 0 ? 0 : (subIdx % 2 === 1 ? 1 : -1) * Math.ceil(subIdx / 2) * 0.45
    finalAngle = bestCand + fanOffset
  } else {
    // General Graph: Outward direction opposite of net neighbor pull
    let rx = 0
    let ry = 0
    let neighborCount = 0

    edges.forEach(e => {
      if (e.from === u && e.to !== u) {
        const pv = positions[e.to]
        if (pv) {
          const dx = pv.x - pu.x
          const dy = pv.y - pu.y
          const d = Math.sqrt(dx * dx + dy * dy) || 1
          rx += dx / d
          ry += dy / d
          neighborCount++
        }
      } else if (e.to === u && e.from !== u) {
        const pv = positions[e.from]
        if (pv) {
          const dx = pv.x - pu.x
          const dy = pv.y - pu.y
          const d = Math.sqrt(dx * dx + dy * dy) || 1
          rx += dx / d
          ry += dy / d
          neighborCount++
        }
      }
    })

    let angle
    if (neighborCount === 0 || (Math.abs(rx) < 0.05 && Math.abs(ry) < 0.05)) {
      angle = -Math.PI / 2
    } else {
      angle = Math.atan2(-ry, -rx)
    }

    // Never point into start arrow if this node is a start state
    if (isStart && Math.cos(angle) < -0.3) {
      angle = -Math.PI / 2
    }

    const angleSpread = (subIdx - 0) * 0.42
    finalAngle = angle + angleSpread
  }

  const ox = Math.cos(finalAngle)
  const oy = Math.sin(finalAngle)
  const px = -oy
  const py = ox

  const nodeR = 22
  const loopLen = 42 + subIdx * 16
  const loopSpread = 22 + subIdx * 8

  // Start point on node circumference (counter-clockwise)
  const startX = pu.x + nodeR * (ox * 0.80 - px * 0.60)
  const startY = pu.y + nodeR * (oy * 0.80 - py * 0.60)

  // End point on node circumference (clockwise)
  const endX = pu.x + nodeR * (ox * 0.80 + px * 0.60)
  const endY = pu.y + nodeR * (oy * 0.80 + py * 0.60)

  // Cubic Bezier control points
  const c1x = pu.x + ox * loopLen - px * loopSpread
  const c1y = pu.y + oy * loopLen - py * loopSpread
  const c2x = pu.x + ox * loopLen + px * loopSpread
  const c2y = pu.y + oy * loopLen + py * loopSpread

  // Peak badge coordinate
  const midX = pu.x + ox * (loopLen + 8)
  const midY = pu.y + oy * (loopLen + 8)

  const path = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`

  return {
    path,
    midX,
    midY,
    minX: Math.min(startX, endX, c1x, c2x, midX - 16),
    maxX: Math.max(startX, endX, c1x, c2x, midX + 16),
    minY: Math.min(startY, endY, c1y, c2y, midY - 12),
    maxY: Math.max(startY, endY, c1y, c2y, midY + 12)
  }
}

// Helper: Resolve collisions/overlapping between edge weight badges (deflection/repulsion)
function resolveBadgeCollisions(badges, iterations = 8) {
  if (!badges || badges.length < 2) return
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false
    for (let i = 0; i < badges.length; i++) {
      for (let j = i + 1; j < badges.length; j++) {
        const b1 = badges[i]
        const b2 = badges[j]
        if (!b1 || !b2) continue
        const w1 = b1.width || 24
        const h1 = b1.height || 18
        const w2 = b2.width || 24
        const h2 = b2.height || 18

        const padX = 6
        const padY = 4
        const minDistanceX = (w1 + w2) / 2 + padX
        const minDistanceY = (h1 + h2) / 2 + padY

        const dx = b2.midX - b1.midX
        const dy = b2.midY - b1.midY
        const overlapX = minDistanceX - Math.abs(dx)
        const overlapY = minDistanceY - Math.abs(dy)

        if (overlapX > 0 && overlapY > 0) {
          moved = true
          if (overlapX < overlapY) {
            const shift = overlapX / 2 + 1
            const sign = dx >= 0 ? 1 : -1
            b1.midX -= sign * shift
            b2.midX += sign * shift
          } else {
            const shift = overlapY / 2 + 1
            const sign = dy >= 0 ? 1 : -1
            b1.midY -= sign * shift
            b2.midY += sign * shift
          }
        }
      }
    }
    if (!moved) break
  }
}

// Helper: Universal Edge Geometry & Routing Calculator
// Specializes in Automata State Diagrams (clean straight forward spine, parallel vertical dual transitions, graceful underneath return curves, tiered non-overlapping multi-hop skip transitions)
// and Symmetrical Multigraph offsets for general graphs
function computeEdgeGeometry(edge, idx, allEdges, positions, nodeList = [], isAutomata = false, pairGroups = {}) {
  const p1 = positions[edge.from]
  const p2 = positions[edge.to]
  if (!p1 || !p2) return null

  const isSelfLoop = edge.from === edge.to
  if (isSelfLoop) return { isSelfLoop: true }

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const dist = Math.hypot(dx, dy)
  if (dist < 1) return { path: null, midX: p1.x, midY: p1.y, isStraight: true }

  const ux = dx / dist
  const uy = dy / dist
  const nx = -uy
  const ny = ux

  if (isAutomata) {
    // Intervening node test: check if any other node lies along the direct line segment between p1 and p2
    let interveningCount = 0
    nodeList.forEach(n => {
      if (n === edge.from || n === edge.to) return
      const pK = positions[n]
      if (!pK) return
      const proj = (pK.x - p1.x) * ux + (pK.y - p1.y) * uy
      const perpDist = Math.abs((pK.x - p1.x) * nx + (pK.y - p1.y) * ny)
      if (proj > 30 && proj < dist - 30 && perpDist < 28) {
        interveningCount++
      }
    })

    const sameDirEdges = allEdges.filter(e => e.from === edge.from && e.to === edge.to)
    const sameSubIdx = Math.max(0, sameDirEdges.indexOf(edge))
    const sameCount = sameDirEdges.length

    const oppositeDirEdges = allEdges.filter(e => e.from === edge.to && e.to === edge.from)
    const hasOpposite = oppositeDirEdges.length > 0

    // 1. Multi-hop Transitions (physically crossing intermediate states, e.g. q4 -> q0 or q0 -> q5)
    if (interveningCount > 0) {
      const isBackward = p2.x < p1.x || (p2.x === p1.x && p2.y < p1.y)
      if (isBackward) {
        // Sweeps UNDERNEATH intermediate states with generous tiered clearance so it never intersects intervening nodes!
        const arcDepth = 42 + interveningCount * 28 + sameSubIdx * 20
        const midX = (p1.x + p2.x) / 2
        const peakY = Math.max(p1.y, p2.y) + arcDepth
        const cx = midX
        const cy = Math.max(p1.y, p2.y) + arcDepth * 1.55
        return {
          path: `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`,
          midX,
          midY: peakY + 8,
          cx,
          cy,
          isStraight: false
        }
      } else {
        // Sweeps ABOVE intermediate states with clearance above
        const arcHeight = 44 + interveningCount * 28 + sameSubIdx * 20
        const midX = (p1.x + p2.x) / 2
        const peakY = Math.min(p1.y, p2.y) - arcHeight
        const cx = midX
        const cy = Math.min(p1.y, p2.y) - arcHeight * 1.55
        return {
          path: `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`,
          midX,
          midY: peakY - 8,
          cx,
          cy,
          isStraight: false
        }
      }
    }

    // 2. Direct Transitions (No intervening nodes)
    if (hasOpposite) {
      // 2A. Vertical / Near-Vertical Dual Transitions (e.g. q0 <-> q2 or q1 <-> q3, like the textbook exam question)
      // Parallel straight vertical arrows with labels positioned cleanly on outer sides!
      if (Math.abs(dx) <= 25 && Math.abs(dy) >= 30) {
        const offset = 12
        if (dy < 0) {
          // Upward transition: Shift left by offset, label on outer left
          const lineX = p1.x - offset
          return {
            path: `M ${lineX} ${p1.y} L ${lineX} ${p2.y}`,
            midX: lineX - 16,
            midY: (p1.y + p2.y) / 2,
            isStraight: true
          }
        } else {
          // Downward transition: Shift right by offset, label on outer right
          const lineX = p1.x + offset
          return {
            path: `M ${lineX} ${p1.y} L ${lineX} ${p2.y}`,
            midX: lineX + 16,
            midY: (p1.y + p2.y) / 2,
            isStraight: true
          }
        }
      }

      // 2B. Horizontal / Near-Horizontal Dual Transitions (e.g. q2 <-> q3, like the textbook exam question)
      // Parallel straight horizontal arrows with labels positioned cleanly above & below!
      if (Math.abs(dy) <= 25 && Math.abs(dx) >= 30) {
        const offset = 12
        if (p2.x > p1.x) {
          // Forward (pointing RIGHT): Shift UP by offset, label on outer top
          const lineY = p1.y - offset
          return {
            path: `M ${p1.x} ${lineY} L ${p2.x} ${lineY}`,
            midX: (p1.x + p2.x) / 2,
            midY: lineY - 14,
            isStraight: true
          }
        } else {
          // Backward (pointing LEFT): Shift DOWN by offset, label on outer bottom
          const lineY = p1.y + offset
          return {
            path: `M ${p1.x} ${lineY} L ${p2.x} ${lineY}`,
            midX: (p1.x + p2.x) / 2,
            midY: lineY + 14,
            isStraight: true
          }
        }
      }

      // 2C. Diagonal Dual Transitions: Symmetrically curve away from each other along normal vector
      const curveOffset = (p2.x > p1.x ? -1 : 1) * (26 + sameSubIdx * 18)
      const cx = (p1.x + p2.x) / 2 + nx * curveOffset
      const cy = (p1.y + p2.y) / 2 + ny * curveOffset
      const midX = (p1.x + p2.x) / 2 + nx * (curveOffset * 0.7)
      const midY = (p1.y + p2.y) / 2 + ny * (curveOffset * 0.7)
      return {
        path: `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`,
        midX,
        midY,
        cx,
        cy,
        isStraight: false
      }
    }

    // Direct Single Transition (No opposite edge): Clean straight line along center axis!
    if (sameCount === 1) {
      return {
        path: null,
        midX: (p1.x + p2.x) / 2,
        midY: Math.abs(dy) <= 25 ? (p1.y + p2.y) / 2 - 14 : (p1.y + p2.y) / 2,
        isStraight: true
      }
    } else {
      // Multiple edges in the same direction: Fan out gracefully
      const arcHeight = 32 + sameSubIdx * 22
      const cx = (p1.x + p2.x) / 2 + nx * (-arcHeight)
      const cy = (p1.y + p2.y) / 2 + ny * (-arcHeight)
      const midX = (p1.x + p2.x) / 2 + nx * (-arcHeight * 0.7)
      const midY = (p1.y + p2.y) / 2 + ny * (-arcHeight * 0.7)
      return {
        path: `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`,
        midX,
        midY,
        cx,
        cy,
        isStraight: false
      }
    }
  }

  // 3. General Non-Automata Multigraph Layout (Trees, Directed Graphs, Maps)
  const u = edge.from < edge.to ? edge.from : edge.to
  const v = edge.from < edge.to ? edge.to : edge.from
  const key = `${u}~~~${v}`
  const group = pairGroups[key] || [idx]
  const k = group.length
  const subIdx = group.indexOf(idx)

  const pu = positions[u]
  const pv = positions[v]

  if (k > 1 && pu && pv) {
    const dx = pv.x - pu.x
    const dy = pv.y - pu.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / dist
    const ny = dx / dist

    const step = Math.min(54, Math.max(36, dist * 0.26))
    let offset = 0
    if (k === 2) {
      if (subIdx === 0) {
        offset = 0 // Straight line for edge 1 (e.g. Floyd-Warshall B-C straight)
      } else {
        // Bend OUTWARD away from canvas center for edge 2 (e.g. Floyd-Warshall B-C curved arc)
        const midBaseX = (pu.x + pv.x) / 2
        const midBaseY = (pu.y + pv.y) / 2
        const outwardSign = (nx * (midBaseX - 375) + ny * (midBaseY - 200) >= 0) ? 1 : -1
        offset = outwardSign * step * 1.25
      }
    } else {
      offset = (subIdx - (k - 1) / 2) * step
    }

    if (Math.abs(offset) > 1) {
      const cx = (pu.x + pv.x) / 2 + nx * offset
      const cy = (pu.y + pv.y) / 2 + ny * offset
      const midX = (pu.x + pv.x) / 2 + nx * (offset * 0.55)
      const midY = (pu.y + pv.y) / 2 + ny * (offset * 0.55)
      return {
        path: `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`,
        midX,
        midY,
        cx,
        cy,
        isStraight: false
      }
    } else if (k === 2 && subIdx === 0) {
      // Straight edge for subIdx 0, shift badge slightly inward away from outer arc
      const midBaseX = (pu.x + pv.x) / 2
      const midBaseY = (pu.y + pv.y) / 2
      const outwardSign = (nx * (midBaseX - 375) + ny * (midBaseY - 200) >= 0) ? 1 : -1
      const shiftX = -outwardSign * nx * 22
      const shiftY = -outwardSign * ny * 18
      return {
        path: null,
        midX: (p1.x + p2.x) / 2 + shiftX,
        midY: (p1.y + p2.y) / 2 + shiftY,
        isStraight: true
      }
    }
  }

  return {
    path: null,
    midX: (p1.x + p2.x) / 2,
    midY: (p1.y + p2.y) / 2,
    isStraight: true
  }
}

// Helper: SVG Graph Diagram Generator (Supports Dynamic Auto-Crop ViewBox, B&W Print Theme, Emerald System Theme)
function generateGraphSvg(edgeText = '', graphType = 'directed', theme = 'bw', customPositions = {}, automataOptions = {}) {
  const { nodes: nodeList, edges } = parseGraphLines(edgeText)
  const positions = computeGraphLayout(nodeList, edges, graphType, customPositions, automataOptions)

  const nodeRadius = 22
  const isBw = theme === 'bw'
  const strokeColor = isBw ? '#000000' : '#047857'
  const lineStroke = isBw ? '#000000' : '#059669'
  const nodeFill = '#ffffff'
  const textColor = isBw ? '#000000' : '#065f46'
  const badgeFill = '#ffffff'
  const badgeStroke = isBw ? '#000000' : '#10b981'
  const badgeText = isBw ? '#000000' : '#047857'
  const isAutomata = ['dfa', 'nfa', 'enfa', 'moore', 'mealy'].includes(graphType)
  const isDirected = (graphType === 'directed' || graphType === 'horizontal' || graphType.endsWith('_directed') || isAutomata)

  const acceptSet = new Set(automataOptions.acceptStates || [])
  const parsedData = parseGraphLines(edgeText)
  const syntaxShapes = parsedData.nodeShapes || {}

  // Calculate dynamic responsive bounding box ensuring zero clipping across all 4 directions!
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

  nodeList.forEach(node => {
    const p = positions[node]
    if (!p) return
    const isAccepting = acceptSet.has(node)
    const shape = resolveNodeShape(node, automataOptions.category, automataOptions.nodeShapes, syntaxShapes)
    const isRect = shape === 'rect'
    const nodeWidth = isRect ? Math.max(node.length * 9 + 26, 48) : nodeRadius * 2
    const nodeHeight = isRect ? 36 : nodeRadius * 2
    // Extra safety margin for stroke (2.5px), accepting double ring/border (+8px), plus padding
    const extraMargin = isAccepting ? 10 : 6
    const halfW = nodeWidth / 2 + extraMargin
    const halfH = nodeHeight / 2 + extraMargin

    minX = Math.min(minX, p.x - halfW)
    maxX = Math.max(maxX, p.x + halfW)
    minY = Math.min(minY, p.y - halfH)
    maxY = Math.max(maxY, p.y + halfH)
  })

  // Expand bounding box for Automata start state arrow
  if (automataOptions.startState && positions[automataOptions.startState]) {
    minX = Math.min(minX, positions[automataOptions.startState].x - 65)
  }

  // Group all edges by canonical pair of endpoints {u, v} to calculate symmetrical multigraph offsets
  const pairGroups = {}
  edges.forEach((edge, idx) => {
    const u = edge.from < edge.to ? edge.from : edge.to
    const v = edge.from < edge.to ? edge.to : edge.from
    const key = `${u}~~~${v}`
    if (!pairGroups[key]) pairGroups[key] = []
    pairGroups[key].push(idx)
  })

  edges.forEach((edge, idx) => {
    const p1 = positions[edge.from]
    const p2 = positions[edge.to]
    if (!p1 || !p2) return

    const isSelfLoop = edge.from === edge.to

    if (isSelfLoop) {
      const loopGeo = getSelfLoopGeometry(edge.from, positions, edges, 0, { isAutomata, startState: automataOptions.startState })
      if (loopGeo) {
        minX = Math.min(minX, loopGeo.minX - 12)
        maxX = Math.max(maxX, loopGeo.maxX + 12)
        minY = Math.min(minY, loopGeo.minY - 12)
        maxY = Math.max(maxY, loopGeo.maxY + 12)
      }
    } else {
      const geo = computeEdgeGeometry(edge, idx, edges, positions, nodeList, isAutomata, pairGroups)
      if (geo) {
        if (geo.cx !== undefined) {
          minX = Math.min(minX, geo.cx - 24)
          maxX = Math.max(maxX, geo.cx + 24)
        }
        if (geo.cy !== undefined) {
          minY = Math.min(minY, geo.cy - 20)
          maxY = Math.max(maxY, geo.cy + 20)
        }
        minX = Math.min(minX, geo.midX - 24)
        maxX = Math.max(maxX, geo.midX + 24)
        minY = Math.min(minY, geo.midY - 20)
        maxY = Math.max(maxY, geo.midY + 20)
      }
    }

    if (edge.weight) {
      const weightLines = String(edge.weight).split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      let bW = 24
      let bH = 18
      if (weightLines.length > 1) {
        const lineH = 14
        const maxLen = Math.max(...weightLines.map(l => l.length))
        bW = Math.max(maxLen * 8 + 16, 28)
        bH = weightLines.length * lineH + 8
      } else {
        bW = Math.max(String(edge.weight).length * 8 + 14, 24)
        bH = 20
      }
      let midX = (p1.x + p2.x) / 2
      let midY = (p1.y + p2.y) / 2
      if (isSelfLoop) {
        const loopGeo = getSelfLoopGeometry(edge.from, positions, edges, 0, { isAutomata, startState: automataOptions.startState })
        if (loopGeo) { midX = loopGeo.midX; midY = loopGeo.midY }
      } else {
        const geo = computeEdgeGeometry(edge, idx, edges, positions, nodeList, isAutomata, pairGroups)
        if (geo) { midX = geo.midX; midY = geo.midY }
      }
      minX = Math.min(minX, midX - bW / 2 - 8)
      maxX = Math.max(maxX, midX + bW / 2 + 8)
      minY = Math.min(minY, midY - bH / 2 - 8)
      maxY = Math.max(maxY, midY + bH / 2 + 8)
    }
  })

  // Ensure caption width is accommodated if present
  if (automataOptions.caption) {
    const captionStr = automataOptions.caption.trim()
    const captionW = captionStr.length * 8.5 + 30
    const centerMidX = (minX + maxX) / 2
    minX = Math.min(minX, centerMidX - captionW / 2)
    maxX = Math.max(maxX, centerMidX + captionW / 2)
  }

  if (!isFinite(minX)) {
    minX = 100; maxX = 500; minY = 50; maxY = 350;
  }

  // Generous padding around the true bounding box so arrows, outlines, and borders NEVER clip.
  // Note: Do NOT clamp cropX or cropY with Math.max(0, ...) — SVG viewBox supports negative coords!
  const pad = 28
  const captionPad = automataOptions.caption ? 38 : 0
  const cropX = Math.floor(minX - pad)
  const cropY = Math.floor(minY - pad)
  const cropW = Math.ceil((maxX + pad) - cropX)
  const cropH = Math.ceil((maxY + pad + captionPad) - cropY)

  const payloadAttr = automataOptions.payloadAttr || ''
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cropX} ${cropY} ${cropW} ${cropH}" width="${cropW}" height="${cropH}" ${payloadAttr ? `data-diagram-payload="${payloadAttr}"` : ''} style="max-width: 100%; height: auto; font-family: 'Segoe UI', Arial, sans-serif; background-color: transparent; display: block; margin: 0 auto;">`

  svg += `<defs>
    <marker id="arrowhead-${theme}" viewBox="0 0 10 10" refX="27" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="${strokeColor}" />
    </marker>
    <marker id="arrowhead-loop-${theme}" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
      <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="${strokeColor}" />
    </marker>
  </defs>`

  const precomputedSvgEdges = edges.map((edge, idx) => {
    const p1 = positions[edge.from]
    const p2 = positions[edge.to]
    if (!p1 || !p2) return null

    const isSelfLoop = edge.from === edge.to
    const markerAttr = isDirected ? `marker-end="url(#${isSelfLoop ? `arrowhead-loop-${theme}` : `arrowhead-${theme}`})"` : ''

    let edgePath = null
    let midX = (p1.x + p2.x) / 2
    let midY = (p1.y + p2.y) / 2

    if (isSelfLoop) {
      const loopGeo = getSelfLoopGeometry(edge.from, positions, edges, 0, { isAutomata, startState: automataOptions.startState })
      if (loopGeo) {
        edgePath = loopGeo.path
        midX = loopGeo.midX
        midY = loopGeo.midY
      }
    } else {
      const geo = computeEdgeGeometry(edge, idx, edges, positions, nodeList, isAutomata, pairGroups)
      if (geo) {
        edgePath = geo.path
        midX = geo.midX
        midY = geo.midY
      }
    }

    let badge = null
    if (edge.weight) {
      const weightLines = String(edge.weight).split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      let bW = 24
      let bH = 18
      if (weightLines.length > 1) {
        const lineH = 14
        const maxLen = Math.max(...weightLines.map(l => l.length))
        bW = Math.max(maxLen * 8 + 12, 26)
        bH = weightLines.length * lineH + 6
      } else {
        bW = Math.max(edge.weight.length * 8 + 10, 22)
        bH = 18
      }
      badge = { midX, midY, width: bW, height: bH, weightLines, weight: edge.weight }
    }

    return { edge, idx, p1, p2, isDirected, isSelfLoop, edgePath, markerAttr, badge }
  }).filter(Boolean)

  const allSvgBadges = precomputedSvgEdges.map(item => item.badge).filter(Boolean)
  resolveBadgeCollisions(allSvgBadges)

  precomputedSvgEdges.forEach(item => {
    if (item.edgePath) {
      svg += `<path d="${item.edgePath}" fill="none" stroke="${lineStroke}" stroke-width="2.5" ${item.markerAttr} />`
    } else {
      svg += `<line x1="${item.p1.x}" y1="${item.p1.y}" x2="${item.p2.x}" y2="${item.p2.y}" stroke="${lineStroke}" stroke-width="2.5" ${item.markerAttr} />`
    }
  })

  precomputedSvgEdges.forEach(item => {
    if (!item.badge) return
    const { midX, midY, width: badgeW, height: badgeH, weightLines, weight } = item.badge
    if (weightLines && weightLines.length > 1) {
      svg += `<rect x="${midX - badgeW / 2}" y="${midY - badgeH / 2}" width="${badgeW}" height="${badgeH}" rx="4" fill="${badgeFill}" stroke="${badgeStroke}" stroke-width="1.5" />`
      weightLines.forEach((wLine, lineIdx) => {
        const lineY = (midY - badgeH / 2) + 12 + lineIdx * 14
        svg += `<text x="${midX}" y="${lineY}" font-size="11" font-weight="bold" fill="${badgeText}" text-anchor="middle">${wLine}</text>`
      })
    } else {
      svg += `<rect x="${midX - badgeW / 2}" y="${midY - 9}" width="${badgeW}" height="18" rx="4" fill="${badgeFill}" stroke="${badgeStroke}" stroke-width="1.5" />`
      svg += `<text x="${midX}" y="${midY + 4}" font-size="11" font-weight="bold" fill="${badgeText}" text-anchor="middle">${weight}</text>`
    }
  })

  // Automata Initial/Start State Arrow from nowhere
  if (automataOptions.startState && positions[automataOptions.startState]) {
    const sp = positions[automataOptions.startState]
    svg += `<line x1="${sp.x - 48}" y1="${sp.y}" x2="${sp.x}" y2="${sp.y}" stroke="${lineStroke}" stroke-width="2.5" marker-end="url(#arrowhead-${theme})" />`
  }

  nodeList.forEach(node => {
    const p = positions[node]
    if (!p) return
    const isAccepting = acceptSet.has(node)
    const shape = resolveNodeShape(node, automataOptions.category, automataOptions.nodeShapes, syntaxShapes)
    const isRect = shape === 'rect'
    const fontSize = node.length > 5 ? '9' : (node.length > 3 ? '11' : '13')
    const nodeWidth = Math.max(node.length * 9 + 26, 48)
    const nodeHeight = 36

    if (isRect) {
      svg += `<rect x="${p.x - nodeWidth / 2}" y="${p.y - nodeHeight / 2}" width="${nodeWidth}" height="${nodeHeight}" rx="6" fill="${nodeFill}" stroke="${strokeColor}" stroke-width="2.5" />`
      if (isAccepting) {
        svg += `<rect x="${p.x - (nodeWidth - 8) / 2}" y="${p.y - (nodeHeight - 8) / 2}" width="${nodeWidth - 8}" height="${nodeHeight - 8}" rx="4" fill="none" stroke="${strokeColor}" stroke-width="2" />`
      }
    } else {
      svg += `<circle cx="${p.x}" cy="${p.y}" r="${nodeRadius}" fill="${nodeFill}" stroke="${strokeColor}" stroke-width="2.5" />`
      if (isAccepting) {
        svg += `<circle cx="${p.x}" cy="${p.y}" r="${nodeRadius - 4.5}" fill="none" stroke="${strokeColor}" stroke-width="2" />`
      }
    }
    svg += `<text x="${p.x}" y="${p.y + 4}" font-size="${fontSize}" font-weight="extrabold" fill="${textColor}" text-anchor="middle">${node}</text>`
  })

  // Centered Diagram Caption / Title (Available for all 4 modules: Tree, Map, Graph, Automata)
  if (automataOptions.caption) {
    const captionX = cropX + cropW / 2
    const captionY = maxY + pad + 16
    svg += `<text x="${captionX}" y="${captionY}" font-size="13" font-weight="bold" font-family="'Times New Roman', Times, 'Segoe UI', serif" fill="${textColor}" text-anchor="middle">${automataOptions.caption}</text>`
  }

  svg += `</svg>`
  return svg
}

// Helper: Formatted Data Table Generator (Compatible with Syncfusion RTE Resizing & Quick Toolbar)
function generateTableHtml(headers = [], rows = []) {
  if (!headers || headers.length === 0) return ''

  const colCount = headers.length
  const colWidthPct = (100 / colCount).toFixed(1)
  const cellPadding = colCount >= 6 ? '3px 5px' : (colCount === 5 ? '4px 6px' : '6px 10px')
  const fontSize = colCount >= 6 ? '11px' : (colCount === 5 ? '12px' : '13px')

  let html = `<table class="e-rte-table" style="border-collapse: collapse; width: 100%; max-width: 100%; margin: 8px auto; font-family: 'Times New Roman', Times, serif; font-size: ${fontSize}; border: 1px solid #000000; box-sizing: border-box;">`
  html += `<thead><tr style="background-color: #f3f4f6; border-bottom: 1.5px solid #000000;">`

  headers.forEach(h => {
    html += `<th style="width: ${colWidthPct}%; padding: ${cellPadding}; border: 1px solid #000000; text-align: center; font-weight: 700; color: #000000; background-color: #f3f4f6; word-break: break-word; overflow-wrap: break-word; line-height: 1.2;">${h}</th>`
  })
  html += `</tr></thead><tbody>`

  rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb'
    html += `<tr style="background-color: ${bg};">`
    row.forEach(cell => {
      html += `<td style="width: ${colWidthPct}%; padding: ${cellPadding}; border: 1px solid #000000; color: #000000; text-align: center; word-break: break-word; overflow-wrap: break-word; line-height: 1.2;">${cell}</td>`
    })
    html += `</tr>`
  })

  html += `</tbody></table>`
  return html
}

/**
 * Parses a question chunk that may contain [Scenario: ...] prefix and/or
 * markdown table syntax (| col1 | col2 |). Returns structured parts for rendering.
 *
 * @param {string} text - The raw question text from the ML service
 * @returns {{ scenarioText: string|null, questionText: string, markdownTable: { headers: string[], rows: string[][] }|null }}
 */
function parseScenarioAndTable(text) {
  if (!text) return { scenarioText: null, questionText: '', markdownTable: null }

  let scenarioText = null
  let remaining = text

  // Extract [Scenario: ...] prefix
  const scenarioMatch = remaining.match(/^\[Scenario:\s*([\s\S]*?)\]\s*\n?/)
  if (scenarioMatch) {
    scenarioText = scenarioMatch[1].trim()
    remaining = remaining.slice(scenarioMatch[0].length).trim()
  }

  // Extract markdown table (lines starting/ending with |)
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
    // Parse markdown table: first row = headers, skip separator row, rest = data
    const parseRow = (row) => row.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(c => c.trim())
    const headers = parseRow(tableLines[0])
    // Skip separator row (| --- | --- |)
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
 * Converts a parsed markdown table to an HTML <table> string with academic styling
 * for insertion into the Syncfusion RTE.
 */
function markdownTableToHtml(parsedTable) {
  if (!parsedTable || !parsedTable.headers || parsedTable.headers.length === 0) return ''

  const colCount = parsedTable.headers.length
  const colWidthPct = (100 / colCount).toFixed(1)
  const cellPadding = colCount >= 6 ? '3px 5px' : (colCount === 5 ? '4px 6px' : '5px 8px')
  const fontSize = colCount >= 6 ? '8.5pt' : (colCount === 5 ? '9pt' : '10pt')

  let html = `<table class="e-rte-table" style="border-collapse: collapse; width: 100%; max-width: 100%; margin: 8px auto; font-family: 'Times New Roman', Times, serif; font-size: ${fontSize}; border: 1px solid #000000; box-sizing: border-box;">`
  html += `<thead><tr style="background-color: #f3f4f6; border-bottom: 1.5px solid #000000;">`
  parsedTable.headers.forEach(h => {
    html += `<th style="width: ${colWidthPct}%; padding: ${cellPadding}; border: 1px solid #000000; text-align: center; font-weight: 700; color: #000000; background-color: #f3f4f6; word-break: break-word; overflow-wrap: break-word; line-height: 1.2;">${h}</th>`
  })
  html += `</tr></thead><tbody>`
  parsedTable.rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb'
    html += `<tr style="background-color: ${bg};">`
    row.forEach(cell => {
      html += `<td style="width: ${colWidthPct}%; padding: ${cellPadding}; border: 1px solid #000000; color: #000000; text-align: center; word-break: break-word; overflow-wrap: break-word; line-height: 1.2;">${cell}</td>`
    })
    html += `</tr>`
  })
  html += `</tbody></table>`
  return html
}

// Helper: Parse existing exam structure table from DOM to preserve typed question text
function parseExamPaperStructureFromDom(tableEl) {
  if (!tableEl) return null

  // IMPORTANT: Only get DIRECT rows of tableEl, completely ignoring any nested tables
  // that users may have inserted inside question cells.
  const allRows = Array.from(tableEl.querySelectorAll('tr'))
  const rows = allRows.filter(tr => tr.closest('table') === tableEl)
  if (rows.length === 0) return null

  const parts = []
  let currentPart = null
  let currentQ = null
  let pendingOrContext = null // Tracks when an OR divider is passed ('after-or')
  let blankSpaceCount = 0 // Tracks blank spacing rows between questions/sub-questions

  rows.forEach(tr => {
    // Only get DIRECT child cells of this row — not cells from nested tables inside content
    const tds = Array.from(tr.children).filter(el => el.tagName === 'TD' || el.tagName === 'TH')
    if (tds.length === 0) return

    const rowType = tr.getAttribute('data-obe-row')
    const firstCellColspan = parseInt(tds[0].getAttribute('colspan') || '1')
    const fullRowText = tds.map(t => t.textContent.trim()).join(' ')
    const isOrRow = rowType === 'or-separator' || /^\s*OR\s*$/i.test(fullRowText)

    // 1. Part Header Row (colspan="4" or single-cell row with text containing "PART")
    if (tds.length === 1 && !isOrRow && (firstCellColspan >= 4 || /PART/i.test(tds[0].textContent))) {
      const partBeforeSpace = blankSpaceCount
      blankSpaceCount = 0

      const partName = tds[0].textContent.trim()
      currentPart = { name: partName, beforeSpace: partBeforeSpace, afterSpace: 0, questions: [] }
      parts.push(currentPart)
      currentQ = null
      pendingOrContext = 'after-part'
      return
    }

    // 2. OR Separator Row
    if (isOrRow) {
      if (currentQ) {
        currentQ.qOrBeforeSpace = blankSpaceCount
      }
      blankSpaceCount = 0
      pendingOrContext = 'after-or'
      return
    }

    // 3. Question Data Row (3 direct columns when subCount === 0 with colspan="2", or 4 direct columns)
    if (tds.length === 3 || tds.length === 4) {
      const is3Col = tds.length === 3
      const col0Text = tds[0].textContent.trim()
      const col1Text = is3Col ? '' : tds[1].textContent.trim()
      const col2Html = is3Col ? tds[1].innerHTML.trim() : tds[2].innerHTML.trim()
      const col3Text = is3Col ? tds[2].textContent.trim() : tds[3].textContent.trim()

      const clean0 = col0Text.replace(/[\s\xa0]/g, '').replace(/&nbsp;/gi, '')
      const clean1 = col1Text.replace(/[\s\xa0]/g, '').replace(/&nbsp;/gi, '')

      const isSubQLabel = !is3Col && /^[a-z]\.?$/i.test(clean1)
      const isQNumber = /^\d+\.?$/.test(clean0)

      // Spacing row check: all cells are empty / blank
      const isBlankRow = !isQNumber && !isSubQLabel && !col2Html.replace(/<[^>]*>/g, '').replace(/(?:&nbsp;|\u00a0)/gi, '').trim()
      if (isBlankRow && rowType !== 'sub-q-or' && rowType !== 'question-or') {
        blankSpaceCount++
        return
      }

      const markMatch = col3Text.match(/\d+/)
      const markVal = markMatch ? parseInt(markMatch[0]) : 10

      // Extract existing Bloom's level if tag present in col2Html e.g. [CO3->C4] or [C4]
      const bloomMatch = col2Html.match(/\[(?:CO\d+)?(?:\s*(?:->|→|&rarr;|&#8594;|&#x2192;|-&gt;|-&#62;)\s*)?(C[1-6])\]/i) || col2Html.match(/\[(C[1-6])\]/i)
      const bloomVal = bloomMatch ? bloomMatch[1].toUpperCase() : ''

      // A. Explicit Sub-Q OR alternative row
      if (rowType === 'sub-q-or' || (pendingOrContext === 'after-or' && !isQNumber && !isSubQLabel)) {
        if (currentQ) {
          currentQ.qOrAfterSpace = blankSpaceCount
          const sIdx = tr.hasAttribute('data-sub-idx')
            ? parseInt(tr.getAttribute('data-sub-idx'))
            : Math.max(0, (currentQ.marks?.length || 1) - 1)

          if (!currentQ.subHasOr) currentQ.subHasOr = Array(currentQ.marks?.length || 1).fill(false)
          if (!currentQ.subOrBlooms) currentQ.subOrBlooms = Array(currentQ.marks?.length || 1).fill('')
          if (!currentQ.subOrContents) currentQ.subOrContents = Array(currentQ.marks?.length || 1).fill('')
          if (!currentQ.subOrMarks) currentQ.subOrMarks = [...(currentQ.marks || [markVal])]

          currentQ.subHasOr[sIdx] = true
          currentQ.subOrBlooms[sIdx] = bloomVal
          currentQ.subOrContents[sIdx] = col2Html || ''
          currentQ.subOrMarks[sIdx] = markVal
        }
        pendingOrContext = null
        blankSpaceCount = 0
        return
      }

      // B. Explicit Question-level OR alternative row
      if (rowType === 'question-or' || (pendingOrContext === 'after-or' && !isQNumber && isSubQLabel)) {
        if (currentQ) {
          if (!currentQ.hasQuestionOr) {
            currentQ.qOrAfterSpace = blankSpaceCount
          }
          currentQ.hasQuestionOr = true
          if (!currentQ.questionOrMarks) currentQ.questionOrMarks = []
          if (!currentQ.questionOrBlooms) currentQ.questionOrBlooms = []
          if (!currentQ.questionOrContents) currentQ.questionOrContents = []

          currentQ.questionOrMarks.push(markVal)
          currentQ.questionOrBlooms.push(bloomVal)
          currentQ.questionOrContents.push(col2Html || '')
        }
        blankSpaceCount = 0
        return
      }

      // C. Standard Question row (e.g. "1.")
      if (isQNumber) {
        if (pendingOrContext === 'after-part' && currentPart) {
          currentPart.afterSpace = blankSpaceCount
        } else if (currentQ && blankSpaceCount > 0) {
          currentQ.qSpaceRows = blankSpaceCount
        }
        blankSpaceCount = 0
        pendingOrContext = null
        if (!currentPart) {
          currentPart = { name: '', questions: [] }
          parts.push(currentPart)
        }
        currentQ = {
          subCount: is3Col ? 0 : 1,
          marks: [markVal],
          blooms: [bloomVal],
          contents: [col2Html || ''],
          subHasOr: [false],
          subOrBlooms: [''],
          subOrContents: [''],
          subOrMarks: [markVal],
          subOrBeforeSpace: [0],
          subOrAfterSpace: [0],
          hasQuestionOr: false,
          questionOrMarks: [],
          questionOrBlooms: [],
          questionOrContents: [],
          qOrBeforeSpace: 0,
          qOrAfterSpace: 0,
          spaceRows: 1,
          subSpaceRows: [0],
          qSpaceRows: 1
        }
        currentPart.questions.push(currentQ)
      } else if (currentQ && isSubQLabel) {
        if (blankSpaceCount > 0 && Array.isArray(currentQ.subSpaceRows)) {
          const prevSubIdx = (currentQ.subCount || 1) - 1
          currentQ.subSpaceRows[prevSubIdx] = blankSpaceCount
        }
        blankSpaceCount = 0
        pendingOrContext = null
        currentQ.subCount = (currentQ.subCount || 0) + 1
        currentQ.marks.push(markVal)
        currentQ.blooms.push(bloomVal)
        currentQ.contents.push(col2Html || '')
        if (!currentQ.subHasOr) currentQ.subHasOr = []
        currentQ.subHasOr.push(false)
        if (!currentQ.subOrBlooms) currentQ.subOrBlooms = []
        currentQ.subOrBlooms.push('')
        if (!currentQ.subOrContents) currentQ.subOrContents = []
        currentQ.subOrContents.push('')
        if (!currentQ.subOrMarks) currentQ.subOrMarks = []
        currentQ.subOrMarks.push(markVal)
        if (!currentQ.subOrBeforeSpace) currentQ.subOrBeforeSpace = []
        currentQ.subOrBeforeSpace.push(0)
        if (!currentQ.subOrAfterSpace) currentQ.subOrAfterSpace = []
        currentQ.subOrAfterSpace.push(0)
        if (!currentQ.subSpaceRows) currentQ.subSpaceRows = []
        currentQ.subSpaceRows.push(0)
      }
    }
  })

  // Final check for trailing spacing on last question
  if (currentQ && blankSpaceCount > 0) {
    currentQ.qSpaceRows = blankSpaceCount
  }

  return parts.length > 0 ? parts : null
}

// Helper: Exam Paper Structure Builder — generates professional exam question paper table layout
// Produces a 4-column table: Q# | Sub-Q | Content Area | Marks [X]
// Matches BAIUST university exam paper format with proper spacing rows, OR choice rows & [CO->Bloom] tags
function generateExamPaperStructureHtml(parts = [], questionsList = [], isBordersCleared = false) {
  if (!parts || parts.length === 0) return ''

  const bd = isBordersCleared ? 'border:none;' : 'border:1px solid #000;'
  const qW = 'width:28px;max-width:32px;'
  const sW = 'width:24px;max-width:28px;'
  const mW = 'width:50px;max-width:55px;'
  const qPad = 'padding:5px 2px 5px 0px;'
  const sPad = 'padding:5px 4px 5px 0px;'
  const cPad = 'padding:5px 8px 5px 2px;'
  const mPad = 'padding:5px 0px 5px 4px;text-align:right;'
  const vt = 'vertical-align:top;'

  const clearedClass = isBordersCleared ? ' borders-cleared' : ''
  const clearedAttr = isBordersCleared ? ' data-obe-borders-cleared="true"' : ''

  let html = `<table class="e-rte-table obe-paper-structure-table${clearedClass}" data-obe-paper-structure="true"${clearedAttr} style="border-collapse:collapse;width:100%;font-family:'Times New Roman',Times,serif;font-size:12pt;${bd}">`
  html += `<colgroup><col class="col-qnum" style="width:28px;max-width:32px;" /><col class="col-subq" style="width:24px;max-width:28px;" /><col class="col-content" style="width:auto;" /><col class="col-marks" style="width:50px;max-width:55px;" /></colgroup>`

  let globalQNum = 1

  parts.forEach((part) => {
    // Part Header Row — merged across all 4 columns, bold centered (only if part.name is non-empty)
    if (part.name && part.name.trim()) {
      // Space before Part header
      const beforeCount = Math.max(0, parseInt(part.beforeSpace) || 0)
      for (let sp = 0; sp < beforeCount; sp++) {
        html += `<tr><td style="${bd}${qW}height:18px;">&nbsp;</td><td style="${bd}${sW}">&nbsp;</td><td style="${bd}">&nbsp;</td><td style="${bd}${mW}">&nbsp;</td></tr>`
      }

      html += `<tr data-obe-row="part-header"><td colspan="4" style="${bd}text-align:center;font-weight:bold;padding:10px 6px;font-family:'Times New Roman',Times,serif;font-size:14pt;letter-spacing:2px;">${part.name.trim()}</td></tr>`

      // Space after Part header
      const afterCount = Math.max(0, parseInt(part.afterSpace) || 0)
      for (let sp = 0; sp < afterCount; sp++) {
        html += `<tr><td style="${bd}${qW}height:18px;">&nbsp;</td><td style="${bd}${sW}">&nbsp;</td><td style="${bd}">&nbsp;</td><td style="${bd}${mW}">&nbsp;</td></tr>`
      }
    }

    part.questions.forEach((q) => {
      const isNoSubQ = q.subCount === 0
      const effectiveSubCount = isNoSubQ ? 1 : (q.subCount || 1)
      const subLabels = 'abcdefghijklmnopqrstuvwxyz'

      const mappedCo = (questionsList && questionsList[globalQNum - 1] && questionsList[globalQNum - 1].co && questionsList[globalQNum - 1].co !== 'NONE')
        ? questionsList[globalQNum - 1].co
        : ''

      // Helper to render spacing rows
      const renderSpacingRows = (count = 1) => {
        let sHtml = ''
        for (let sp = 0; sp < count; sp++) {
          if (isNoSubQ) {
            sHtml += `<tr><td style="${bd}${qW}height:18px;">&nbsp;</td><td colspan="2" style="${bd}">&nbsp;</td><td style="${bd}${mW}">&nbsp;</td></tr>`
          } else {
            sHtml += `<tr><td style="${bd}${qW}height:18px;">&nbsp;</td><td style="${bd}${sW}">&nbsp;</td><td style="${bd}">&nbsp;</td><td style="${bd}${mW}">&nbsp;</td></tr>`
          }
        }
        return sHtml
      }

      // Helper to render prominent centered OR divider row (14pt, bold, Times New Roman)
      const renderOrRow = () => {
        return `<tr data-obe-row="or-separator"><td colspan="4" style="${bd}text-align:center;font-weight:bold;padding:6px 8px;font-family:'Times New Roman',Times,serif;font-size:14pt;letter-spacing:2px;">OR</td></tr>`
      }

      // Helper to format question cell content with tags and clean formatting
      const formatCellContent = (rawContent, bloomCode) => {
        let tagStr = ''
        if (mappedCo && bloomCode) {
          tagStr = `[${mappedCo}\u2192${bloomCode}]`
        } else if (mappedCo) {
          tagStr = `[${mappedCo}]`
        } else if (bloomCode) {
          tagStr = `[${bloomCode}]`
        }

        const ARROW_PATTERN = '(?:->|→|&rarr;|&#8594;|&#x2192;|-&gt;|-&#62;)'

        // 1. Process <span class="co-bloom-tag">...</span> safely:
        // If it only contains a tag like [CO1->C2] or [C2] or whitespace, remove the whole span.
        // If it contains actual question content, unwrap the span (keep the inner content).
        let cleaned = (rawContent || '').replace(/<span\s+class="co-bloom-tag"[^>]*>([\s\S]*?)<\/span>/gi, (match, inner) => {
          const textOnly = inner.replace(/<[^>]*>/g, '').replace(/(?:&nbsp;|\u00a0)/gi, ' ').trim()
          const tagRegex = new RegExp(`^\\[(?:CO\\d+)?\\s*${ARROW_PATTERN}?\\s*(?:C[1-6])?\\]$`, 'i')
          const isOnlyTag = tagRegex.test(textOnly) ||
                            /^\[CO\d+\]$/i.test(textOnly) ||
                            /^\[C[1-6]\]$/i.test(textOnly) ||
                            textOnly.length === 0
          if (isOnlyTag) {
            return '' // Safe to remove pure tag span
          }
          return inner // Preserves question text that was typed inside the span!
        })

        // 2. Strip any remaining standalone CO/Bloom tags
        const standaloneTagRegex = new RegExp(`\\s*\\[CO\\d+\\s*${ARROW_PATTERN}\\s*C[1-6]\\]`, 'gi')
        const standaloneCoRegex = /\s*\[CO\d+\]/gi
        const standaloneBloomRegex = /\s*\[C[1-6]\]/gi

        cleaned = cleaned
          .replace(standaloneTagRegex, '')
          .replace(standaloneCoRegex, '')
          .replace(standaloneBloomRegex, '')
          .replace(/<(?:strong|b|span|em|i)\b[^>]*>\s*(?:&nbsp;|\u00a0|\s)*<\/(?:strong|b|span|em|i)>/gi, '')
          .replace(/<p>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/p>/gi, '')
          .replace(/<div>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/div>/gi, '')
          .replace(/^(?:\s|&nbsp;|\u00a0|<br\s*\/?>)+/gi, '')
          .replace(/(?:\s|&nbsp;|\u00a0|<br\s*\/?>)+$/gi, '')
          .trim()

        const hasActualContent = cleaned && (
          cleaned.replace(/<[^>]*>/g, '').replace(/(?:&nbsp;|\u00a0)/gi, '').trim().length > 0 ||
          /<(?:img|table|svg|math|canvas|pre)\b/i.test(cleaned) ||
          /math-equation-wrapper|obe-code-snippet/i.test(cleaned)
        )

        if (hasActualContent) {
          // Unwrap outer paragraph tag if it wraps the entire text so content stays strictly on the same baseline as Q# and Sub-Q
          let unwrapped = cleaned
          if (/^<p\b[^>]*>[\s\S]*<\/p>$/i.test(unwrapped) && (unwrapped.match(/<p\b/gi) || []).length === 1) {
            unwrapped = unwrapped.replace(/^<p\b[^>]*>/i, '').replace(/<\/p>$/i, '').trim()
          }

          if (tagStr) {
            const tagSpan = `<span class="co-bloom-tag" style="font-weight:bold;margin-left:6px;">${tagStr}</span>`
            if (/<\/(p|div)>\s*$/i.test(unwrapped)) {
              return unwrapped.replace(/<\/(p|div)>\s*$/i, `&nbsp;${tagSpan}</$1>`)
            } else {
              return `${unwrapped}&nbsp;${tagSpan}`
            }
          }
          return unwrapped
        } else {
          if (tagStr) {
            return `<span class="co-bloom-tag" style="font-weight:bold;">${tagStr}</span>`
          }
          return `<br>`
        }
      }

      // 1. Primary sub-questions
      for (let s = 0; s < effectiveSubCount; s++) {
        const isFirst = s === 0
        const qLabel = isFirst ? `${globalQNum}.` : ''
        const subLabel = isNoSubQ ? '' : (effectiveSubCount > 1 ? `${subLabels[s]}.` : '')
        const mark = q.marks && q.marks[s] !== undefined ? q.marks[s] : ''
        const markDisplay = mark !== '' ? `[${mark}]` : ''
        const subBloom = q.blooms && q.blooms[s] ? q.blooms[s] : ''
        const cellHtml = formatCellContent(q.contents && q.contents[s], subBloom)

        html += `<tr>`
        html += `<td class="col-qnum-cell" style="${bd}${qW}${vt}${qPad}font-weight:bold;white-space:nowrap;">${qLabel}</td>`
        if (isNoSubQ) {
          html += `<td colspan="2" class="col-content-cell" style="${bd}${vt}${cPad}min-height:50px;height:55px;">${cellHtml}</td>`
        } else {
          html += `<td class="col-subq-cell" style="${bd}${sW}${vt}${sPad}white-space:nowrap;">${subLabel}</td>`
          html += `<td class="col-content-cell" style="${bd}${vt}${cPad}min-height:50px;height:55px;">${cellHtml}</td>`
        }
        html += `<td class="col-marks-cell" style="${bd}${mW}${vt}${mPad}font-weight:bold;white-space:nowrap;">${markDisplay}</td>`
        html += `</tr>`

        // Check if this sub-question has an individual Sub-Q level OR choice
        const hasSubOr = Boolean(q.subHasOr && q.subHasOr[s])
        if (hasSubOr) {
          const subBeforeOr = (Array.isArray(q.subOrBeforeSpace) && q.subOrBeforeSpace[s] !== undefined)
            ? parseInt(q.subOrBeforeSpace[s])
            : (q.subOrBeforeSpace !== undefined ? parseInt(q.subOrBeforeSpace) : 0)
          const subAfterOr = (Array.isArray(q.subOrAfterSpace) && q.subOrAfterSpace[s] !== undefined)
            ? parseInt(q.subOrAfterSpace[s])
            : (q.subOrAfterSpace !== undefined ? parseInt(q.subOrAfterSpace) : 0)

          // Gap row(s) before OR
          html += renderSpacingRows(subBeforeOr)
          // OR divider row
          html += renderOrRow()
          // Gap row(s) after OR
          html += renderSpacingRows(subAfterOr)

          // Alternative Sub-Q row (No Q# label, No Sub-Q label per specification; matching marks)
          const orBloom = (q.subOrBlooms && q.subOrBlooms[s]) ? q.subOrBlooms[s] : subBloom
          const orContent = (q.subOrContents && q.subOrContents[s]) ? q.subOrContents[s] : ''
          const orCellHtml = formatCellContent(orContent, orBloom)
          const orMark = (q.subOrMarks && q.subOrMarks[s] !== undefined) ? q.subOrMarks[s] : mark
          const orMarkDisplay = orMark !== '' ? `[${orMark}]` : markDisplay

          html += `<tr data-obe-row="sub-q-or" data-sub-idx="${s}">`
          html += `<td class="col-qnum-cell" style="${bd}${qW}${vt}${qPad}">&nbsp;</td>`
          if (isNoSubQ) {
            html += `<td colspan="2" class="col-content-cell" style="${bd}${vt}${cPad}min-height:50px;height:55px;">${orCellHtml}</td>`
          } else {
            html += `<td class="col-subq-cell" style="${bd}${sW}${vt}${sPad}">&nbsp;</td>`
            html += `<td class="col-content-cell" style="${bd}${vt}${cPad}min-height:50px;height:55px;">${orCellHtml}</td>`
          }
          html += `<td class="col-marks-cell" style="${bd}${mW}${vt}${mPad}font-weight:bold;white-space:nowrap;">${orMarkDisplay}</td>`
          html += `</tr>`
        }

        const isLastSubQ = s === effectiveSubCount - 1
        let subSpace = 0
        if (Array.isArray(q.subSpaceRows)) {
          subSpace = q.subSpaceRows[s] !== undefined ? parseInt(q.subSpaceRows[s]) : 0
        } else if (q.subSpaceRows !== undefined) {
          subSpace = parseInt(q.subSpaceRows)
        } else if (q.spaceRows !== undefined) {
          subSpace = parseInt(q.spaceRows)
        }

        if (!isLastSubQ) {
          html += renderSpacingRows(subSpace)
        } else if (!q.hasQuestionOr) {
          const qSpace = q.qSpaceRows !== undefined ? parseInt(q.qSpaceRows) : 1
          html += renderSpacingRows(qSpace)
        }
      }

      // 2. Question-level OR alternative set
      if (q.hasQuestionOr) {
        const beforeOrCount = q.qOrBeforeSpace !== undefined ? parseInt(q.qOrBeforeSpace) : 0
        const afterOrCount = q.qOrAfterSpace !== undefined ? parseInt(q.qOrAfterSpace) : 0

        // Gap row(s) before OR
        html += renderSpacingRows(beforeOrCount)
        // OR divider row
        html += renderOrRow()
        // Gap row(s) after OR
        html += renderSpacingRows(afterOrCount)

        // Alternate set with numbering preserved (a., b., c.)
        for (let s = 0; s < effectiveSubCount; s++) {
          const subLabel = isNoSubQ ? '' : (effectiveSubCount > 1 ? `${subLabels[s]}.` : '')
          const orMark = (q.questionOrMarks && q.questionOrMarks[s] !== undefined)
            ? q.questionOrMarks[s]
            : (q.marks && q.marks[s] !== undefined ? q.marks[s] : '')
          const orMarkDisplay = orMark !== '' ? `[${orMark}]` : ''
          const orBloom = (q.questionOrBlooms && q.questionOrBlooms[s])
            ? q.questionOrBlooms[s]
            : (q.blooms && q.blooms[s] ? q.blooms[s] : '')
          const orContent = (q.questionOrContents && q.questionOrContents[s]) ? q.questionOrContents[s] : ''
          const orCellHtml = formatCellContent(orContent, orBloom)

          html += `<tr data-obe-row="question-or" data-sub-idx="${s}">`
          html += `<td class="col-qnum-cell" style="${bd}${qW}${vt}${qPad}">&nbsp;</td>`
          if (isNoSubQ) {
            html += `<td colspan="2" class="col-content-cell" style="${bd}${vt}${cPad}min-height:50px;height:55px;">${orCellHtml}</td>`
          } else {
            html += `<td class="col-subq-cell" style="${bd}${sW}${vt}${sPad}${effectiveSubCount > 1 ? 'font-weight:bold;' : ''}white-space:nowrap;">${subLabel}</td>`
            html += `<td class="col-content-cell" style="${bd}${vt}${cPad}min-height:50px;height:55px;">${orCellHtml}</td>`
          }
          html += `<td class="col-marks-cell" style="${bd}${mW}${vt}${mPad}font-weight:bold;white-space:nowrap;">${orMarkDisplay}</td>`
          html += `</tr>`

          const isLastOrSubQ = s === effectiveSubCount - 1
          const qSpace = q.qSpaceRows !== undefined ? parseInt(q.qSpaceRows) : 1
          const sSpace = Array.isArray(q.subSpaceRows) ? (q.subSpaceRows[s] ?? 0) : (q.subSpaceRows !== undefined ? parseInt(q.subSpaceRows) : 0)
          const spaceCount = isLastOrSubQ ? qSpace : sSpace

          html += renderSpacingRows(spaceCount)
        }
      }

      globalQNum++
    })
  })

  html += `</table>`
  return html
}

// ─── Code Snippet Generator Presets & Utilities ───
const CODE_SNIPPET_PRESETS = {
  cpp: [
    {
      title: 'OOP Class Error Finding (Screenshot Example)',
      code: `class MyClass {
private:
    int y;
};

int main() {
    MyClass obj;
    obj.y = 50;
    return 0;
}`
    },
    {
      title: 'Virtual Functions & Runtime Polymorphism',
      code: `class Base {
public:
    virtual void print() {
        cout << "Base Function" << endl;
    }
};

class Derived : public Base {
public:
    void print() override {
        cout << "Derived Function" << endl;
    }
};`
    },
    {
      title: 'Constructor & Destructor Order',
      code: `class Alpha {
public:
    Alpha() { cout << "Alpha constructed\\n"; }
    ~Alpha() { cout << "Alpha destroyed\\n"; }
};

class Beta : public Alpha {
public:
    Beta() { cout << "Beta constructed\\n"; }
    ~Beta() { cout << "Beta destroyed\\n"; }
};`
    },
    {
      title: 'Operator Overloading (+)',
      code: `class Complex {
private:
    float real, imag;
public:
    Complex(float r = 0, float i = 0) : real(r), imag(i) {}
    Complex operator + (const Complex& obj) {
        return Complex(real + obj.real, imag + obj.imag);
    }
};`
    },
    {
      title: 'Generic Template Class',
      code: `template <typename T>
class Pair {
private:
    T first, second;
public:
    Pair(T a, T b) : first(a), second(b) {}
    T getMax() { return (first > second) ? first : second; }
};`
    }
  ],
  c: [
    {
      title: 'Pointer Arithmetic & Output Tracing',
      code: `int arr[] = {10, 20, 30, 40, 50};
int *ptr = arr;

printf("%d\\n", *(ptr + 2));
printf("%d\\n", *ptr++);
printf("%d\\n", *++ptr);`
    },
    {
      title: 'Dynamic Memory Allocation (malloc & free)',
      code: `int n = 5;
int *arr = (int*) malloc(n * sizeof(int));

if (arr == NULL) {
    printf("Memory Allocation Failed!\\n");
    return 1;
}

for (int i = 0; i < n; i++) arr[i] = (i + 1) * 10;
free(arr);`
    },
    {
      title: 'Recursive Function Output',
      code: `int mystery(int a, int b) {
    if (b == 0) return 0;
    if (b % 2 == 0) 
        return mystery(a + a, b / 2);
    return mystery(a + a, b / 2) + a;
}`
    },
    {
      title: 'Structure with Pointer Node',
      code: `typedef struct Student {
    int id;
    char name[50];
    float marks;
    struct Student *next;
} Student;`
    }
  ],
  python: [
    {
      title: 'Indented Loops & Conditionals',
      code: `def count_vowels(text):
    vowels = "aeiouAEIOU"
    count = 0
    for char in text:
        if char in vowels:
            count += 1
    return count`
    },
    {
      title: 'Class with __init__ & Methods',
      code: `class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def perimeter(self):
        return 2 * (self.width + self.height)`
    },
    {
      title: 'Fibonacci with Recursion & Memoization',
      code: `def fib(n, memo={}):
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo)
    return memo[n]`
    },
    {
      title: 'List Comprehension & Filtering',
      code: `numbers = [12, 45, 23, 67, 88, 90, 34]
even_squares = [x**2 for x in numbers if x % 2 == 0]
freq = {x: numbers.count(x) for x in numbers}`
    }
  ],
  pseudocode: [
    {
      title: 'Binary Search Algorithm',
      code: `Algorithm BinarySearch(A, n, key):
    low ← 0, high ← n - 1
    while low ≤ high do:
        mid ← ⌊(low + high) / 2⌋
        if A[mid] = key then
            return mid
        else if A[mid] < key then
            low ← mid + 1
        else
            high ← mid - 1
    return -1`
    },
    {
      title: 'QuickSort Partitioning (Lomuto)',
      code: `Algorithm Partition(A, p, r):
    x ← A[r]
    i ← p - 1
    for j ← p to r - 1 do:
        if A[j] ≤ x then
            i ← i + 1
            swap A[i] with A[j]
    swap A[i + 1] with A[r]
    return i + 1`
    },
    {
      title: 'Dijkstra Single-Source Shortest Path',
      code: `Algorithm Dijkstra(G, w, s):
    for each vertex v in V[G] do:
        dist[v] ← ∞
        parent[v] ← NIL
    dist[s] ← 0
    Q ← V[G]
    while Q ≠ ∅ do:
        u ← Extract-Min(Q)
        for each neighbor v of u do:
            if dist[u] + w(u, v) < dist[v] then
                dist[v] ← dist[u] + w(u, v)
                parent[v] ← u`
    }
  ]
}

// Helper: Format academic code keywords in bold pure black text (#000000) without red/pink syntax coloring
function formatCodeWithKeywordsBold(codeStr = '', language = 'cpp') {
  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

  const escaped = escapeHtml(codeStr)

  // Standard Computer Science keywords to bold in pure black (#000000)
  const keywordsPattern = /\b(int|float|double|char|void|bool|long|short|unsigned|class|struct|union|typedef|enum|private|public|protected|virtual|override|return|if|else|switch|case|default|while|for|do|break|continue|new|delete|malloc|free|sizeof|NULL|true|false|nullptr|def|self|import|from|in|is|not|and|or|lambda|try|except|finally|raise|Algorithm|to|then|exchange|swap|cout|cin|printf|scanf|endl)\b/g

  return escaped.replace(keywordsPattern, '<strong style="font-weight: 700; color: #000000;">$1</strong>')
}

function generateCodeSnippetHtml({
  code = '',
  language = 'cpp',
  alignment = 'center',
  hasBorder = true,
  boxStyle = 'exam',
  showLineNumbers = false,
  fontSize = '11pt'
}) {
  const safeCode = (code || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = safeCode.split('\n')
  const encodedCode = encodeURIComponent(safeCode)

  const isWithBorder = hasBorder !== false && boxStyle !== 'borderless'
  const boxBorder = isWithBorder ? 'border: 1px solid #000000;' : 'border: none;'
  const boxBg = isWithBorder ? 'background: #ffffff;' : 'background: transparent;'
  const boxPadding = isWithBorder ? 'padding: 8px 14px;' : 'padding: 4px 6px;'
  const borderRadius = isWithBorder ? 'border-radius: 4px;' : 'border-radius: 0;'

  const isCentered = alignment === 'center'
  const containerStyle = isCentered
    ? 'text-align: center; margin: 8px 0; clear: both;'
    : 'text-align: left; margin: 8px 0; clear: both;'

  let innerCodeHtml = ''
  if (showLineNumbers) {
    const tableRows = lines.map((line, idx) => {
      const lineNum = idx + 1
      const formattedLine = formatCodeWithKeywordsBold(line, language) || '&nbsp;'
      return `<tr><td class="obe-code-ln" style="border:none;color:#555555;user-select:none;padding:0 10px 0 0;text-align:right;border-right:1px solid #999999;font-family:Consolas,Courier New,Monaco,monospace;font-size:${fontSize};vertical-align:top;line-height:1.35;font-weight:normal;">${lineNum}</td><td class="obe-code-txt" style="border:none;padding:0 0 0 10px;font-family:Consolas,Courier New,Monaco,monospace;font-size:${fontSize};white-space:pre-wrap;line-height:1.35;vertical-align:top;text-align:left;color:#000000;">${formattedLine}</td></tr>`
    }).join('')

    innerCodeHtml = `<table class="obe-code-table" style="border-collapse:collapse;border:none;margin:0;padding:0;width:auto;text-align:left;background:transparent;color:#000000;user-select:none;-webkit-user-select:none;pointer-events:none;"><tbody>${tableRows}</tbody></table>`
  } else {
    innerCodeHtml = `<code style="font-family:inherit;font-size:inherit;color:#000000;background:transparent;padding:0;border:none;user-select:none;-webkit-user-select:none;pointer-events:none;">${formatCodeWithKeywordsBold(safeCode, language)}</code>`
  }

  return `<div class="obe-code-wrapper" style="clear: both; ${isCentered ? 'text-align: center;' : 'text-align: left;'} margin: 6px 0;"><div class="obe-code-snippet-container" data-obe-code="true" data-code="${encodedCode}" data-language="${language}" data-align="${alignment}" data-hasborder="${isWithBorder ? 'true' : 'false'}" data-linenumbers="${showLineNumbers ? 'true' : 'false'}" data-fontsize="${fontSize}" style="display: inline-block; vertical-align: middle; text-align: left; max-width: 95%; cursor: pointer;" contenteditable="false" tabindex="0" draggable="false"><pre class="obe-code-block" draggable="false" style="display: block; text-align: left; margin: 0; ${boxPadding} font-family: 'Consolas', 'Courier New', Monaco, monospace; font-size: ${fontSize}; line-height: 1.35; ${boxBg} ${boxBorder} color: #000000; ${borderRadius} tab-size: 4; -moz-tab-size: 4; white-space: pre-wrap; word-break: break-word; user-select: none; -webkit-user-select: none; pointer-events: none;" title="Click to select, double-click to edit code snippet">${innerCodeHtml}</pre></div></div>`
}

export default function QuestionPaperEditor({ assessment, offering, onBack }) {
  const { setIsEditingActive } = useAuth()
  const aType = assessment.type || assessment.assessmentType || ''
  const aName = assessment.name || ''
  const isMidTerm = aType === 'midTerm' || (aName && aName.toLowerCase().includes('mid'))
  const isTermFinal = aType === 'final' || aType === 'termFinal' || (aName && aName.toLowerCase().includes('final'))
  const isOfficialExam = isMidTerm || isTermFinal
  const isCT = !isOfficialExam && (aType === 'ct' || aType === 'classTest' || (aName && (aName.toLowerCase().includes('ct') || aName.toLowerCase().includes('class test'))))
  const isAssignment = aType === 'assignment' || aType === 'assignments' || (aName && aName.toLowerCase().includes('assignment'))
  const isPresentation = aType === 'presentation' || (aName && aName.toLowerCase().includes('presentation'))
  const isProjectReport = aType === 'projectReport' || aType === 'project' || (aName && aName.toLowerCase().includes('project'))
  const isParticipation = aType === 'participation' || (aName && aName.toLowerCase().includes('participation'))
  const isAttendance = aType === 'attendance' || (aName && aName.toLowerCase().includes('attendance'))
  const isPerformance = aType === 'performance' || (aName && aName.toLowerCase().includes('performance'))
  const isAssignmentOrReport = isAssignment || isPresentation || isProjectReport || isParticipation || isAttendance || isPerformance
  const isNoParts = isMidTerm || isCT || isAssignmentOrReport || !isTermFinal

  const [editorValue, setEditorValue] = useState('')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [availableCOs, setAvailableCOs] = useState([])
  const [coDetails, setCoDetails] = useState([]) // Full CO objects with code + description
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadingCount, setUploadingCount] = useState(0)
  const [showBlobWarning, setShowBlobWarning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Non-blocking Toast Notification State
  const [notifications, setNotifications] = useState([])

  const showNotification = useCallback((message, type = 'info', duration = 4500) => {
    // 1. Never show AI ready / active / standby toasts (keep editor silent)
    if (typeof message === 'string' && (
      message.toLowerCase().includes('ai service') ||
      message.toLowerCase().includes('connecting to ai')
    )) {
      return
    }
    const id = Date.now() + Math.random().toString(36).substring(2, 7)
    setNotifications(prev => {
      // 2. Strict deduplication: if exact same message is already visible, do not re-add!
      if (prev.some(n => n.message === message)) return prev
      // 3. Limit to max 3 concurrent notifications to prevent stacking floods
      const updated = [...prev, { id, message, type }].slice(-3)
      return updated
    })
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }
  }, [])

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Non-blocking AI Cold-Start Warming Indicator Overlay
  const [aiWarmingInfo, setAiWarmingInfo] = useState(null)

  // Strictly Scoped Keep-Alive Heartbeat for ML Service (Render Cold-Start Mitigation)
  const { status: mlStatus, isWarming: isMlWarming, isIdle: isUserIdle, wakeUp: wakeUpMLService } = useMLServiceWakeup({
    isEditingSession: true,
    autoWarm: true,
    onIdleChange: (idle) => {
      if (idle) {
        // Teacher has been inactive for >= 5 minutes.
        // Auto-pause Live reference question suggestions to preserve quota/battery and prevent calls to sleeping server
        setIsLiveSuggestActive(prev => {
          if (prev) {
            setIsSuggestionsAutoPaused(true)
            return false
          }
          return prev
        })
      }
    },
    onVisibilityChange: (visibility) => {
      if (visibility === 'hidden') {
        // Teacher switched to another tab (e.g. YouTube or portal). Auto-pause live suggestions
        setIsLiveSuggestActive(prev => {
          if (prev) {
            setIsSuggestionsAutoPaused(true)
            return false
          }
          return prev
        })
      }
    }
  })

  // Handle Fullscreen Toggle with 100% Content Preservation
  const handleToggleFullscreen = useCallback(() => {
    if (rteRef.current) {
      try {
        const liveContent = rteRef.current.value || ''
        setEditorValue(liveContent)
      } catch (e) {}
    }
    setIsFullscreen(prev => !prev)
  }, [])

  // Listen for Escape key to exit fullscreen smoothly and preserve content
  useEffect(() => {
    if (!isFullscreen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleToggleFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, handleToggleFullscreen])
  const [showAiMenu, setShowAiMenu] = useState(false)
  const [aiMenuPosition, setAiMenuPosition] = useState({ top: 0, left: 0 })
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiPreview, setAiPreview] = useState(null)

  // Selection-based AI Tag Verifier State
  const [aiVerifySelection, setAiVerifySelection] = useState(null)
  const [showAiVerifyPopover, setShowAiVerifyPopover] = useState(false)
  const [aiVerifyLoading, setAiVerifyLoading] = useState(false)
  const [aiVerifyResult, setAiVerifyResult] = useState(null)
  const [aiVerifySuccessMsg, setAiVerifySuccessMsg] = useState('')
  const showAiVerifyPopoverRef = useRef(false)
  showAiVerifyPopoverRef.current = showAiVerifyPopover
  const aiVerifyPopoverRef = useRef(null)
  const lastSelectionRangeRef = useRef(null)
  const [popoverPos, setPopoverPos] = useState(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ startX: 0, startY: 0, initialLeft: 0, initialTop: 0 })
  const [floatingBtnPos, setFloatingBtnPos] = useState(null)
  const isDraggingBtnRef = useRef(false)
  const btnDragStartRef = useRef({ startX: 0, startY: 0, initialLeft: 0, initialTop: 0, hasMoved: false })
  const userMovedFloatingBtnRef = useRef(false)
  const [showFloatingAiMenu, setShowFloatingAiMenu] = useState(false)
  const showFloatingAiMenuRef = useRef(false)
  showFloatingAiMenuRef.current = showFloatingAiMenu
  const [isContextMenuTriggered, setIsContextMenuTriggered] = useState(false)
  const isContextMenuTriggeredRef = useRef(false)
  isContextMenuTriggeredRef.current = isContextMenuTriggered
  const [activeAiSubmenu, setActiveAiSubmenu] = useState(null)



  // Real-time Reference Notes Suggestion States (Local to teacher machine & persistent)
  const notesCourseId = getNormalizedCourseKey(offering)
  const [notesStatusInfo, setNotesStatusInfo] = useState(() => getCachedNotesStatus(notesCourseId))
  const [activeNoteSuggestions, setActiveNoteSuggestions] = useState([])
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const [noteSuggestionPos, setNoteSuggestionPos] = useState(null)
  const [activeInputTarget, setActiveInputTarget] = useState(null)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showTableDesignModal, setShowTableDesignModal] = useState(false)
  const noteDebounceTimerRef = useRef(null)
  const notePopoverRef = useRef(null)

  // Dual-Layer Resource Optimization: Live suggestions default to PAUSED (false) to prevent accidental backend load.
  // Resets to paused whenever the teacher navigates away, enters idle state, or switches tabs.
  const [isLiveSuggestActive, setIsLiveSuggestActive] = useState(false)
  const [isSuggestionsAutoPaused, setIsSuggestionsAutoPaused] = useState(false)
  const suggestAbortRef = useRef(null)
  const suggestRequestIdRef = useRef(0)

  useEffect(() => {
    try { localStorage.removeItem('obe_live_suggest_toggle') } catch {}
  }, [])

  // Dual-Layer Live Suggest Toggle with Auto ML Microservice Cold-Start Wake-up & Auto-Sync
  const handleToggleLiveSuggest = useCallback((forceState = null) => {
    setIsLiveSuggestActive(prev => {
      const nextState = forceState !== null ? forceState : !prev
      if (nextState) {
        setIsSuggestionsAutoPaused(false)
        // Teacher toggled Live ON: Ensure ML microservice begins waking up if not yet ready
        if (mlStatus !== 'ready' || !isMLReady()) {
          wakeUpMLService({ silent: false, waitForReady: false })
        } else {
          showNotification('Live question suggestions active.', 'success', 2500)
        }
        // Auto re-sync notes from browser IndexedDB to server if Render restarted
        if (notesCourseId) {
          syncNotesBlobToBackend(notesCourseId).catch(() => {})
        }
      }
      return nextState
    })
  }, [mlStatus, wakeUpMLService, showNotification, notesCourseId])



  const [restoredPaperDraftInfo, setRestoredPaperDraftInfo] = useState(null)
  const [showParagraphMarks, setShowParagraphMarks] = useState(false)

  const [examDuration, setExamDuration] = useState(assessment.examDuration || '')
  const [deadline, setDeadline] = useState(() => {
    if (assessment.deadline) {
      const d = new Date(assessment.deadline)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      }
      return assessment.deadline
    }
    return ''
  })
  const [numQuestions, setNumQuestions] = useState(assessment.numQuestions || 0)
  const [level, setLevel] = useState(assessment.level || offering?.course?.level || '1')
  const [term, setTerm] = useState(assessment.term || offering?.course?.term || 'I')

  // Exam Duration Parser & Formatter
  const parseExamDuration = useCallback((str) => {
    if (!str) {
      if (isTermFinal) return { hours: 3, minutes: 0 }
      if (isMidTerm) return { hours: 1, minutes: 30 }
      return { hours: 0, minutes: 30 }
    }
    const s = String(str).toLowerCase().trim()

    // Decimal hours like "1.5 hours" or "2.5 hrs"
    const decMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)$/i)
    if (decMatch && decMatch[1].includes('.')) {
      const val = parseFloat(decMatch[1])
      const h = Math.floor(val)
      const m = Math.round((val - h) * 60)
      return { hours: h, minutes: m }
    }

    const hrMatch = s.match(/(\d+)\s*(?:hours?|hrs?|h)\b/i)
    const minMatch = s.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i)

    let h = hrMatch ? parseInt(hrMatch[1], 10) : 0
    let m = minMatch ? parseInt(minMatch[1], 10) : 0

    if (!hrMatch && minMatch) {
      const totalMin = parseInt(minMatch[1], 10)
      if (totalMin >= 60) {
        h = Math.floor(totalMin / 60)
        m = totalMin % 60
      } else {
        h = 0
        m = totalMin
      }
    } else if (!hrMatch && !minMatch) {
      const num = parseInt(s, 10)
      if (!isNaN(num)) {
        if (num <= 5) {
          h = num
          m = 0
        } else {
          h = Math.floor(num / 60)
          m = num % 60
        }
      }
    }

    return { hours: Math.max(0, h), minutes: Math.max(0, m) }
  }, [isTermFinal, isMidTerm])

  const formatExamDuration = useCallback((h, m) => {
    const hours = parseInt(h, 10) || 0
    const minutes = parseInt(m, 10) || 0

    if (hours === 0 && minutes === 0) return '30 Minutes'
    if (hours > 0 && minutes === 0) {
      return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`
    }
    if (hours === 0 && minutes > 0) {
      return `${minutes} Minutes`
    }
    return `${hours} ${hours === 1 ? 'Hour' : 'Hours'} ${minutes} Minutes`
  }, [])

  const handleUpdateExamDuration = useCallback((newHours, newMinutes) => {
    const formatted = formatExamDuration(newHours, newMinutes)
    setExamDuration(formatted)
    setHeaderCustom(prev => ({ ...prev, duration: formatted }))
  }, [formatExamDuration])

  // Disable idle auto-logout while editing a question paper
  useEffect(() => {
    if (setIsEditingActive) setIsEditingActive(true)
    return () => {
      if (setIsEditingActive) setIsEditingActive(false)
    }
  }, [setIsEditingActive])

  const getPaperDraftKey = useCallback(() => {
    if (!offering?._id || !assessment?._id) return null
    return `obe_paper_draft_${offering._id}_${assessment._id}`
  }, [offering?._id, assessment?._id])

  // Persist unsaved question paper draft to localStorage
  useEffect(() => {
    if (!loading && (questions.length > 0 || (editorValue && editorValue.trim().length > 20))) {
      const draftKey = getPaperDraftKey()
      if (draftKey) {
        try {
          localStorage.setItem(draftKey, JSON.stringify({
            questions,
            editorValue,
            numQuestions,
            timestamp: Date.now()
          }))
        } catch (e) {}
      }
    }
  }, [questions, editorValue, numQuestions, loading, getPaperDraftKey])

  const handleDiscardPaperDraft = () => {
    const draftKey = getPaperDraftKey()
    if (draftKey) {
      try { localStorage.removeItem(draftKey) } catch (e) {}
    }
    setRestoredPaperDraftInfo(null)
    loadPaperData()
  }

  // Question Similarity Checker States & Handler
  const [similarityResults, setSimilarityResults] = useState(null)
  const [similarityLoading, setSimilarityLoading] = useState(false)
  const [similarityError, setSimilarityError] = useState('')
  const [expandedArchiveId, setExpandedArchiveId] = useState(null)
  const [comparisonModalData, setComparisonModalData] = useState(null)
  const [similarityFilterTab, setSimilarityFilterTab] = useState('current')

  const handleRunSimilarityCheck = async () => {
    setSimilarityLoading(true)
    setSimilarityError('')
    setSimilarityResults(null)
    try {
      const currentContent = rteRef.current ? rteRef.current.value : editorValue
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = currentContent || ''
      const currentPlainText = (tempDiv.textContent || tempDiv.innerText || '').trim()

      if (!currentPlainText || currentPlainText.length < 15) {
        setSimilarityError('Please write some question content in the paper editor first before running the similarity check.')
        setSimilarityLoading(false)
        return
      }

      const courseId = offering?.course?._id || offering?.course
      const qBankRes = await apiService.getQuestionBank(courseId)
      const papers = qBankRes.papers || []

      const curOfferingId = String(offering?._id || offering?.id || '')
      const curAssessmentId = String(assessment?._id || '')
      const curAssessmentName = (assessment?.name || '').toLowerCase().trim()
      const curSection = (offering?.section || '').toLowerCase().trim()
      const curSemesterId = String(offering?.semester?._id || offering?.semester || '')

      // Classify assessment types
      const examTypeKeywords = ['ct', 'class test', 'mid', 'midterm', 'mid term', 'final', 'final exam', 'quiz', 'test', 'exam', 'viva']
      const isExamType = (name) => {
        const lower = (name || '').toLowerCase().trim()
        return examTypeKeywords.some(kw => lower.includes(kw))
      }
      const currentIsExamType = isExamType(curAssessmentName)

      const availableArchives = papers.filter(p => {
        if (!p.content || p.content.trim().length < 10) return false

        const pOfferingId = String(p.courseOffering?._id || p.courseOffering || '')
        const pAssessmentId = String(p.assessment?._id || p.assessment || '')
        const pAssessmentName = (p.assessment?.name || '').toLowerCase().trim()
        const pSection = (p.courseOffering?.section || '').toLowerCase().trim()
        const pSemesterId = String(p.courseOffering?.semester?._id || p.courseOffering?.semester || '')

        // 1. Skip by ID match (exact same offering + assessment)
        if (pOfferingId === curOfferingId && pAssessmentId === curAssessmentId) return false

        // 2. Skip by name + semester + section match (same assessment name in same semester & section = same paper)
        if (pAssessmentName === curAssessmentName && pSemesterId === curSemesterId && pSection === curSection) return false

        // 3. Skip if content is identical to what's currently in the editor (same paper saved previously)
        const div = document.createElement('div')
        div.innerHTML = p.content || ''
        const pText = (div.textContent || div.innerText || '').trim()
        if (pText === currentPlainText) return false

        // 4. Type-based filtering
        if (currentIsExamType) {
          // Current is exam-type (CT, Mid, Final, Quiz) → only compare with other exam-type archives
          return isExamType(pAssessmentName)
        } else {
          // Current is non-exam (Assignment, Presentation, Project Report) → only compare with same assessment type
          return pAssessmentName === curAssessmentName
        }
      })

      if (availableArchives.length === 0) {
        setSimilarityResults({
          maxSimilarity: 0,
          totalArchivesCompared: 0,
          results: [],
          message: 'No previous archived question papers found for this course.'
        })
        setSimilarityLoading(false)
        return
      }

      const curSem = offering?.semester
      const curSemId = String(curSem?._id || curSem || '')
      const curSemName = (curSem?.semesterName || '').toLowerCase().trim()
      const curSemYear = String(curSem?.academicYear || offering?.academicYear || '').toLowerCase().trim()

      const archivedPayload = availableArchives.map(p => {
        const div = document.createElement('div')
        div.innerHTML = p.content || ''
        const text = (div.textContent || div.innerText || '').trim()
        const sem = p.courseOffering?.semester
        const pSemId = String(sem?._id || sem || '')
        const semName = sem ? (sem.semesterName || '') : ''
        const semYear = sem ? (sem.academicYear || p.courseOffering?.academicYear || '') : ''
        const fullSem = semYear ? `${semName} (${semYear})` : semName

        const isCurrentSemester = Boolean(
          (pSemId && curSemId && pSemId === curSemId) ||
          (semName && curSemName && semName.toLowerCase().trim() === curSemName &&
           semYear && curSemYear && String(semYear).toLowerCase().trim() === curSemYear)
        )

        return {
          id: p._id,
          assessmentName: p.assessment?.name || 'Assessment Paper',
          semester: fullSem || 'Previous Semester',
          section: p.courseOffering?.section || 'A',
          batch: p.courseOffering?.batch?.name || '',
          isCurrentSemester,
          text
        }
      })



      const res = await apiService.checkQuestionSimilarity(
        {
          currentPaperText: currentPlainText,
          archivedPapers: archivedPayload
        },
        {
          onProgress: (info) => {
            if (info?.isComplete) {
              setAiWarmingInfo(null)
            } else {
              setAiWarmingInfo(info)
            }
          }
        }
      )

      if (res.success) {
        setSimilarityResults(res)
        showNotification(`✓ Question similarity check complete (${res.totalArchivesCompared || 0} papers analyzed).`, 'success', 3500)
      } else {
        setSimilarityError(res.message || 'Failed to analyze similarity.')
      }
    } catch (err) {
      console.error('Similarity check error:', err)
      setSimilarityError(err.message || 'Error occurred while running similarity check.')
    } finally {
      setSimilarityLoading(false)
      setAiWarmingInfo(null)
    }
  }

  // AI Creation Tools States (Enhanced)
  const [showQuestionGenModal, setShowQuestionGenModal] = useState(false)
  const [questionGenParams, setQuestionGenParams] = useState(() => {
    const defaultExamType = isMidTerm
      ? 'Mid Term Exam'
      : isTermFinal
      ? 'Final Exam'
      : isAssignment
      ? 'Assignment'
      : isPresentation
      ? 'Presentation'
      : isProjectReport
      ? 'Project Report'
      : 'Class Test (CT)'
    return {
      examType: defaultExamType,
      totalMarks: 10,
      bloomLevel: 'C4 - Analyze',
      selectedCo: '',
      numQuestions: 1,
      topic: '',
      sampleQuestion: ''
    }
  })
  const [questionGenResults, setQuestionGenResults] = useState([]) // Array of generated questions
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0)
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState([0]) // Multi-selection array
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)

  // Cache key for persisting generated questions and form inputs until explicitly cleared
  const QP_GEN_CACHE_KEY = `obe_qp_ai_gen_${offering?._id || 'global'}`

  // Restore cached question generator state on load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(QP_GEN_CACHE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.params) {
          const defaultExamType = isMidTerm
            ? 'Mid Term Exam'
            : isTermFinal
            ? 'Final Exam'
            : isAssignment
            ? 'Assignment'
            : isPresentation
            ? 'Presentation'
            : isProjectReport
            ? 'Project Report'
            : 'Class Test (CT)'
          const type = parsed.params.examType || defaultExamType
          const allowedMarks = getAllowedMarksForExamType(type)
          let parsedMarks = parseInt(parsed.params.totalMarks) || 10
          if (!allowedMarks.includes(parsedMarks)) {
            parsedMarks = 10
          }
          setQuestionGenParams(prev => ({
            ...prev,
            ...parsed.params,
            examType: type,
            totalMarks: parsedMarks
          }))
        }
        if (Array.isArray(parsed.results) && parsed.results.length > 0) {
          setQuestionGenResults(parsed.results)
          if (Array.isArray(parsed.selectedIndices) && parsed.selectedIndices.length > 0) {
            setSelectedQuestionIndices(parsed.selectedIndices)
          } else {
            setSelectedQuestionIndices(parsed.results.map((_, i) => i))
          }
          setSelectedQuestionIndex(0)
        }
      }
    } catch (e) {
      console.warn('Could not restore question generator cache:', e)
    }
  }, [offering?._id])

  // Sync question generator state to localStorage so closing/re-opening/page revisit preserves it
  useEffect(() => {
    try {
      if (questionGenResults.length > 0 || (questionGenParams.topic && questionGenParams.topic.trim())) {
        localStorage.setItem(QP_GEN_CACHE_KEY, JSON.stringify({
          params: questionGenParams,
          results: questionGenResults,
          selectedIndices: selectedQuestionIndices
        }))
      }
    } catch (e) {
      console.warn('Could not save question generator cache:', e)
    }
  }, [questionGenResults, questionGenParams, selectedQuestionIndices, offering?._id])

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
    notesList: [
      'Figure on the right of each question indicates the marks for the respective question.',
      'Answer all questions.'
    ],
    customCOs: []
  })

  // Professional Export Filename Generator (Shared by Word and PDF exports)
  // Example output: TF_Question_CSE311_Operating_Systems_Spring_2026_L2_T2
  const generateExportBaseFileName = useCallback(() => {
    let examPrefix = 'Question_Paper'
    if (isTermFinal) examPrefix = 'TF_Question'
    else if (isMidTerm) examPrefix = 'Mid_Question'
    else if (isCT) examPrefix = 'CT_Question'
    else if (isAssignment) examPrefix = 'Assignment'

    const rawCode = headerCustom.courseCode || offering?.course?.courseCode || offering?.courseCode || ''
    const cleanCode = rawCode.replace(/[^a-zA-Z0-9]/g, '')

    const rawTitle = headerCustom.courseTitle || offering?.course?.courseName || offering?.courseName || offering?.course?.title || ''
    const cleanTitle = rawTitle
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join('_')

    const semName = offering?.semester?.semesterName || offering?.semesterName || ''
    const acadYear = offering?.academicYear || offering?.semester?.academicYear || ''
    const semFull = acadYear ? `${semName}_${acadYear}` : (semName || 'Spring_2026')
    const cleanSem = semFull
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    const lvlMatch = (level ? String(level) : (headerCustom.levelTerm || offering?.level || '')).match(/\d+/)
    const lvlShort = `L${lvlMatch ? lvlMatch[0] : '4'}`

    let termShort = 'T1'
    const rawTerm = (term ? String(term) : (headerCustom.levelTerm || offering?.term || ''))
    if (/iii|3/i.test(rawTerm)) termShort = 'T3'
    else if (/ii|2/i.test(rawTerm)) termShort = 'T2'
    else if (/i|1/i.test(rawTerm)) termShort = 'T1'

    const ltCode = `${lvlShort}_${termShort}`

    const parts = [examPrefix]
    if (cleanCode) parts.push(cleanCode)
    if (cleanTitle) parts.push(cleanTitle)
    if (cleanSem) parts.push(cleanSem)
    parts.push(ltCode)

    const resultName = parts.filter(Boolean).join('_').replace(/[/\\?%*:|"<>]/g, '_')
    return resultName || 'Question_Paper'
  }, [
    isTermFinal, isMidTerm, isCT, isAssignment,
    headerCustom.courseCode, headerCustom.courseTitle, headerCustom.levelTerm,
    offering, level, term
  ])

  // Synchronize browser tab and window title with the Question Paper metadata
  // Ensures Windows Print Spooler and Chrome always have the exact desired filename
  useEffect(() => {
    const paperTitle = generateExportBaseFileName()
    if (paperTitle) {
      document.title = paperTitle
    }
    return () => {
      document.title = 'OBE Course Outcome Attainment System'
    }
  }, [generateExportBaseFileName])

  // Graph Generator State & Interactive Drag-and-Drop (Defaults to Tree preset as requested)
  const [showGraphGenModal, setShowGraphGenModal] = useState(false)
  const [graphTheme, setGraphTheme] = useState('bw') // 'bw' or 'emerald'
  const [graphCategory, setGraphCategory] = useState('tree') // 'tree', 'map', 'graph', 'automata'
  const [graphType, setGraphType] = useState('tree') // 'tree', 'tree_directed', 'tree_lr', 'tree_lr_directed', 'tree_rl', 'tree_rl_directed', 'directed', 'undirected', 'horizontal', 'map', 'map_directed', 'dfa', 'nfa', 'enfa', 'moore', 'mealy'
  const [graphCaption, setGraphCaption] = useState('') // Optional caption / title for diagram (e.g. Automation-X, Figure 1)
  const [customNodeShapes, setCustomNodeShapes] = useState({}) // Per-node shape: { [nodeName]: 'circle' | 'rect' }
  const [startState, setStartState] = useState('q0') // Initial / Start state (arrow from nowhere)
  const [acceptStates, setAcceptStates] = useState(['q1']) // Accepting / Final states (concentric double circle)
  const [numNodes, setNumNodes] = useState(12)
  const [edgeRows, setEdgeRows] = useState([
    { from: '15', to: '35', weight: '' }, { from: '15', to: '9', weight: '' }, { from: '15', to: '40', weight: '' },
    { from: '35', to: '3', weight: '' }, { from: '35', to: '6', weight: '' },
    { from: '40', to: '5', weight: '' }, { from: '40', to: '7', weight: '' },
    { from: '3', to: '1', weight: '' }, { from: '3', to: '10', weight: '' },
    { from: '5', to: '8', weight: '' }, { from: '5', to: '4', weight: '' }, { from: '5', to: '41', weight: '' }
  ])
  const [graphEdgesText, setGraphEdgesText] = useState('15 -> 35\n15 -> 9\n15 -> 40\n35 -> 3\n35 -> 6\n40 -> 5\n40 -> 7\n3 -> 1\n3 -> 10\n5 -> 8\n5 -> 4\n5 -> 41')
  const [graphInputMode, setGraphInputMode] = useState('form') // 'form' or 'text'
  const [customNodePositions, setCustomNodePositions] = useState({})
  const [draggingNode, setDraggingNode] = useState(null)
  const [activeGuideLines, setActiveGuideLines] = useState([]) // Smart alignment guidelines { type: 'h'|'v', pos, label }
  const graphSvgRef = useRef(null)
  const [editingDiagramElement, setEditingDiagramElement] = useState(null)
  const [editingDiagramId, setEditingDiagramId] = useState(null)

  const savedDiagramRangeRef = useRef(null)

  const handleOpenNewDiagramModal = () => {
    try {
      const editor = rteRef.current
      const doc = editor?.contentModule?.getDocument ? editor.contentModule.getDocument() : document
      const sel = doc ? doc.getSelection() : window.getSelection()
      const editPanel = editor?.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null

      if (sel && sel.rangeCount > 0 && editPanel && editPanel.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        savedDiagramRangeRef.current = sel.getRangeAt(0).cloneRange()
        savedEditorRangeRef.current = sel.getRangeAt(0).cloneRange()
      } else if (savedEditorRangeRef.current && editPanel && editPanel.contains(savedEditorRangeRef.current.commonAncestorContainer)) {
        savedDiagramRangeRef.current = savedEditorRangeRef.current.cloneRange()
      }
    } catch (e) {
      savedDiagramRangeRef.current = null
    }

    setEditingDiagramElement(null)
    setEditingDiagramId(null)
    setGraphCaption('')
    setShowGraphGenModal(true)
  }

  const handleCloseDiagramModal = () => {
    setEditingDiagramElement(null)
    setEditingDiagramId(null)
    setGraphCaption('')
    setShowGraphGenModal(false)
  }

  const handleOpenDiagramEditModal = (targetImg) => {
    if (!targetImg) return

    let diagId = targetImg.getAttribute('data-diagram-id')
    if (!diagId) {
      diagId = `cs-diag-${Date.now()}`
      targetImg.setAttribute('data-diagram-id', diagId)
    }

    setEditingDiagramElement(targetImg)
    setEditingDiagramId(diagId)

    let payload = null
    const payloadAttr = targetImg.getAttribute('data-diagram-payload')
    if (payloadAttr) {
      try {
        payload = JSON.parse(decodeURIComponent(payloadAttr))
      } catch (err) {
        console.warn('Failed to parse data-diagram-payload attribute:', err)
      }
    }

    // Fallback: decode SVG data URI from src if payloadAttr wasn't directly on img attribute
    if (!payload && targetImg.src && targetImg.src.startsWith('data:image/svg+xml;base64,')) {
      try {
        const base64 = targetImg.src.replace('data:image/svg+xml;base64,', '')
        const decodedSvg = decodeURIComponent(escape(atob(base64)))
        const match = decodedSvg.match(/data-diagram-payload="([^"]+)"/)
        if (match && match[1]) {
          payload = JSON.parse(decodeURIComponent(match[1]))
        }
      } catch (e) {
        console.warn('Failed to decode data-diagram-payload from SVG src:', e)
      }
    }

    if (payload) {
      if (payload.category) setGraphCategory(payload.category)
      if (payload.type) setGraphType(payload.type)
      if (payload.theme) setGraphTheme(payload.theme)
      if (payload.caption !== undefined) setGraphCaption(payload.caption || '')
      if (payload.edgesText !== undefined) setGraphEdgesText(payload.edgesText)
      if (Array.isArray(payload.edgeRows) && payload.edgeRows.length > 0) {
        setEdgeRows(payload.edgeRows)
      } else if (payload.edgesText) {
        const parsed = parseGraphLines(payload.edgesText)
        setEdgeRows(parsed.edges.map(e => ({ from: e.from, to: e.to, weight: e.weight || '' })))
      }
      if (payload.customPositions && typeof payload.customPositions === 'object') {
        setCustomNodePositions(payload.customPositions)
      } else {
        setCustomNodePositions({})
      }
      if (payload.nodeShapes && typeof payload.nodeShapes === 'object') {
        setCustomNodeShapes(payload.nodeShapes)
      } else {
        setCustomNodeShapes({})
      }
      if (payload.startState !== undefined) setStartState(payload.startState || '')
      if (Array.isArray(payload.acceptStates)) setAcceptStates(payload.acceptStates)
      if (payload.inputMode) setGraphInputMode(payload.inputMode)
    }

    setShowGraphGenModal(true)
  }

  const parseGraphData = (text) => {
    return parseGraphLines(text)
  }

  // Auto-Align & Smart Symmetrical Layout
  const handleAutoAlignGraph = (requestedType = null) => {
    const activeData = parseGraphLines(graphEdgesText)
    const { nodes, edges } = activeData
    if (nodes.length === 0) return

    if (requestedType) {
      setGraphType(requestedType)
    }
    // Clear custom positions so computeGraphLayout generates mathematically symmetrical coordinates
    setCustomNodePositions({})
    setActiveGuideLines([])
  }

  const handleSvgMouseDown = (nodeId, e) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingNode(nodeId)
  }

  const handleSvgMouseMove = (e) => {
    if (!draggingNode || !graphSvgRef.current) return
    const svg = graphSvgRef.current
    let rawX, rawY
    if (svg.getScreenCTM) {
      const ctm = svg.getScreenCTM()
      if (ctm) {
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(ctm.inverse())
        rawX = svgP.x
        rawY = svgP.y
      }
    }
    if (rawX === undefined) {
      const rect = svg.getBoundingClientRect()
      rawX = (e.clientX - rect.left) * (750 / rect.width)
      rawY = (e.clientY - rect.top) * (400 / rect.height)
    }

    const activeData = parseGraphLines(graphEdgesText)
    const currentPositions = computeGraphLayout(activeData.nodes, activeData.edges, graphType, customNodePositions, {
      startState: graphCategory === 'automata' ? startState : null,
      acceptStates: graphCategory === 'automata' ? acceptStates : []
    })

    // Snapping threshold in SVG pixels (magnetic alignment)
    const SNAP_DIST = 8
    let finalX = rawX
    let finalY = rawY
    const guides = []

    const otherNodes = activeData.nodes.filter(n => n !== draggingNode)

    // 1. Horizontal Level Alignment (Y-axis matching)
    let snappedY = false
    for (const other of otherNodes) {
      const p = currentPositions[other]
      if (p && Math.abs(rawY - p.y) <= SNAP_DIST) {
        finalY = p.y
        snappedY = true
        guides.push({ type: 'h', pos: p.y, label: `Level with ${other}` })
        break
      }
    }
    if (!snappedY && Math.abs(rawY - 200) <= SNAP_DIST) {
      finalY = 200
      guides.push({ type: 'h', pos: 200, label: 'Center Y' })
    }

    // 2. Vertical Column Alignment (X-axis matching)
    let snappedX = false
    for (const other of otherNodes) {
      const p = currentPositions[other]
      if (p && Math.abs(rawX - p.x) <= SNAP_DIST) {
        finalX = p.x
        snappedX = true
        guides.push({ type: 'v', pos: p.x, label: `Column with ${other}` })
        break
      }
    }
    if (!snappedX && Math.abs(rawX - 375) <= SNAP_DIST) {
      finalX = 375
      guides.push({ type: 'v', pos: 375, label: 'Center X' })
    }

    setActiveGuideLines(guides)

    setCustomNodePositions(prev => ({
      ...prev,
      [draggingNode]: { x: Math.round(finalX), y: Math.round(finalY) }
    }))
  }

  const handleSvgMouseUp = () => {
    setDraggingNode(null)
    setActiveGuideLines([])
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

  // Exam Paper Structure Builder State
  const [showPaperStructureModal, setShowPaperStructureModal] = useState(false)
  const [isEditingExistingTable, setIsEditingExistingTable] = useState(false)
  const [tableAlignState, setTableAlignState] = useState('center') // 'center', 'left', 'right'
  const [dataAlignState, setDataAlignState] = useState('left')    // 'left', 'center', 'right', 'justify'
  const [paperStructureParts, setPaperStructureParts] = useState([
    {
      name: 'PART A',
      beforeSpace: 0,
      afterSpace: 0,
      questions: [
        { subCount: 3, marks: [10, 10, 10], subSpaceRows: [0, 0, 0], qSpaceRows: 1 },
        { subCount: 3, marks: [10, 10, 10], subSpaceRows: [0, 0, 0], qSpaceRows: 1 },
        { subCount: 3, marks: [10, 10, 10], subSpaceRows: [0, 0, 0], qSpaceRows: 1 }
      ]
    },
    {
      name: 'PART B',
      beforeSpace: 0,
      afterSpace: 0,
      questions: [
        { subCount: 3, marks: [10, 10, 10], subSpaceRows: [0, 0, 0], qSpaceRows: 1 },
        { subCount: 3, marks: [10, 10, 10], subSpaceRows: [0, 0, 0], qSpaceRows: 1 }
      ]
    }
  ])

  // Code Snippet Generator State
  const [showCodeSnippetModal, setShowCodeSnippetModal] = useState(false)
  const [codeLanguage, setCodeLanguage] = useState('cpp') // 'cpp', 'c', 'python', 'pseudocode'
  const [codeContent, setCodeContent] = useState(CODE_SNIPPET_PRESETS.cpp[0].code)
  const [codeAlignment, setCodeAlignment] = useState('center') // 'center', 'left'
  const [codeHasBorder, setCodeHasBorder] = useState(true) // true: With Border (1px box), false: No Border
  const [codeBoxStyle, setCodeBoxStyle] = useState('exam')
  const [codeShowLineNumbers, setCodeShowLineNumbers] = useState(false)
  const [codeFontSize, setCodeFontSize] = useState('11pt') // '10pt', '11pt', '12pt'
  const [editingCodeElement, setEditingCodeElement] = useState(null)
  const [selectedCodeBlockInfo, setSelectedCodeBlockInfo] = useState(null)
  const savedCodeRangeRef = useRef(null)
  const [copiedCodeNotice, setCopiedCodeNotice] = useState(false)
  const [formatNotice, setFormatNotice] = useState('')
  const [smartOutputLoading, setSmartOutputLoading] = useState(false)
  const [smartOutputResult, setSmartOutputResult] = useState(null)
  const [smartOutputError, setSmartOutputError] = useState('')
  const [copiedOutputNotice, setCopiedOutputNotice] = useState(false)
  const codeUndoStackRef = useRef([])
  const codeRedoStackRef = useRef([])
  const lastCodeSnapshotTimeRef = useRef(0)
  const codeTextareaRef = useRef(null)
  const [canCodeUndo, setCanCodeUndo] = useState(false)
  const [canCodeRedo, setCanCodeRedo] = useState(false)

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

  const BLOOM_OPTIONS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']

  const isExtraCT = Boolean(assessment.isExtraCT || (assessment.name && assessment.name.toLowerCase().startsWith('extra ct')))
  const matchedParent = assessment.name ? assessment.name.match(/\(([^)]+)\)/) : null
  const parentName = assessment.parentCTName || (matchedParent && matchedParent[1] ? matchedParent[1].replace(/^for\s+/i, '') : 'Target CT')

  const rteRef = useRef(null)
  const uploadingCountRef = useRef(0)
  const savedEquationRangeRef = useRef(null)  // Save cursor position before equation modal opens

  // Cloudinary image tracking and debounced auto-deletion (30-second window for Ctrl+Z undo)
  const activeCloudinaryImagesRef = useRef(new Set())
  const pendingDeletionTimersRef = useRef(new Map())

  // Helper to extract Cloudinary image URLs from an HTML string
  const extractCloudinaryUrls = useCallback((html) => {
    if (!html || typeof html !== 'string' || !html.includes('cloudinary.com')) return []
    try {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      const imgs = tempDiv.querySelectorAll('img')
      const urls = []
      imgs.forEach(img => {
        const src = img.getAttribute('src') || ''
        if (src.includes('cloudinary.com') && src.includes('question-papers')) {
          urls.push(src)
        }
      })
      if (urls.length > 0) return urls
    } catch (e) {}

    const urls = []
    const regex = /https?:\/\/res\.cloudinary\.com\/[^\s"'<>]+\/question-papers\/[^\s"'<>]+/gi
    let match
    while ((match = regex.exec(html)) !== null) {
      urls.push(match[0])
    }
    return urls
  }, [])

  // Automatic Cloudinary image lifecycle tracker:
  // Detects when images are removed from the editor, waits 30 seconds (allowing Ctrl+Z undo),
  // and deletes them from Cloudinary if not restored.
  useEffect(() => {
    if (loading) return

    const currentLiveHtml = rteRef.current ? (rteRef.current.value || '') : editorValue
    const currentUrls = new Set(extractCloudinaryUrls(currentLiveHtml))

    // 1. If an image with a pending deletion timer reappeared in HTML (e.g. via Undo / Ctrl+Z), cancel deletion!
    currentUrls.forEach(url => {
      if (pendingDeletionTimersRef.current.has(url)) {
        clearTimeout(pendingDeletionTimersRef.current.get(url))
        pendingDeletionTimersRef.current.delete(url)
      }
      activeCloudinaryImagesRef.current.add(url)
    })

    // 2. If a tracked Cloudinary image is no longer in the HTML, schedule 30s deletion
    activeCloudinaryImagesRef.current.forEach(url => {
      if (!currentUrls.has(url) && !pendingDeletionTimersRef.current.has(url)) {
        const timerId = setTimeout(async () => {
          pendingDeletionTimersRef.current.delete(url)
          activeCloudinaryImagesRef.current.delete(url)
          try {
            await apiService.deleteCloudinaryImage(url)
          } catch (err) {
            console.warn('[Cloudinary] 30s debounced delete failed:', err)
          }
        }, 30000)
        pendingDeletionTimersRef.current.set(url, timerId)
      }
    })
  }, [editorValue, loading, extractCloudinaryUrls])

  // Cleanup all pending deletion timers when unmounting
  useEffect(() => {
    return () => {
      if (pendingDeletionTimersRef.current) {
        pendingDeletionTimersRef.current.forEach(timerId => clearTimeout(timerId))
        pendingDeletionTimersRef.current.clear()
      }
    }
  }, [])

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
    const bracketMatch = aiEquationLatex.match(/\\\\begin\{(\w*matrix)\}/)
    const bracketType = bracketMatch ? bracketMatch[1] : 'bmatrix'
    setAiEquationLatex(`\\begin{${bracketType}}\n${rowStrings.join(' \\\\\n')}\n\\end{${bracketType}}`)
  }

  const handleUpdateVisualMatrixDims = (newRows, newCols) => {
    const rows = Math.max(1, Math.min(10, parseInt(newRows) || 2))
    const cols = Math.max(1, Math.min(10, parseInt(newCols) || 2))
    const newCells = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => (visualMatrix.cells[r] && visualMatrix.cells[r][c] !== undefined ? visualMatrix.cells[r][c] : ''))
    )
    setVisualMatrix({ rows, cols, cells: newCells })
    const rowStrings = newCells.map(row => row.join(' & '))
    const bracketMatch = aiEquationLatex.match(/\\\\begin\{(\w*matrix)\}/)
    const bracketType = bracketMatch ? bracketMatch[1] : 'bmatrix'
    setAiEquationLatex(`\\begin{${bracketType}}\n${rowStrings.join(' \\\\\n')}\n\\end{${bracketType}}`)
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

  // Helper: Smart Hint Label for Equation & Matrix Badges in RTE Editor
  const getEquationBadgeHint = (latexStr, promptStr = '') => {
    if (!latexStr || !latexStr.trim()) return '📐 Equation'

    const trimmedLatex = latexStr.trim()

    // 1. Matrix Detection & Dimension Extraction
    const matrixMatch = trimmedLatex.match(/\\begin\{(?:b|p|v|V|B|array|matrix)\}([\s\S]*?)\\end\{(?:b|p|v|V|B|array|matrix)\}/)
    if (matrixMatch && matrixMatch[1]) {
      const inner = matrixMatch[1].trim()
      const rows = inner.split(/\\\\/).map(r => r.trim()).filter(Boolean)
      const rowCount = rows.length || 1
      const colCount = rows[0] ? rows[0].split(/&/).length : 1
      return `📊 Matrix (${rowCount}×${colCount})`
    }

    // 2. If user provided a descriptive prompt/name
    if (promptStr && promptStr.trim()) {
      const cleanPrompt = promptStr.trim()
      const shortPrompt = cleanPrompt.length > 32 ? cleanPrompt.substring(0, 29) + '...' : cleanPrompt
      return `🧮 ${shortPrompt}`
    }

    // 3. Clean LaTeX commands into readable math symbols
    let cleanHint = trimmedLatex
      .replace(/\\mathbf\{([^}]+)\}/g, '$1')
      .replace(/\\mathit\{([^}]+)\}/g, '$1')
      .replace(/\\mathrm\{([^}]+)\}/g, '$1')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\hat\{([^}]+)\}/g, '$1̂')
      .replace(/\\vec\{([^}]+)\}/g, '$1⃗')
      .replace(/\\bar\{([^}]+)\}/g, '$1̄')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
      .replace(/\\left|\\right/g, '')
      .replace(/\\theta/g, 'θ')
      .replace(/\\eta/g, 'η')
      .replace(/\\nabla/g, '∇')
      .replace(/\\sum/g, '∑')
      .replace(/\\int/g, '∫')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\infty/g, '∞')
      .replace(/\\pm/g, '±')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\s+/g, ' ')
      .trim()

    if (cleanHint.length > 32) {
      cleanHint = cleanHint.substring(0, 29) + '...'
    }

    return `🧮 Equation: ${cleanHint}`
  }

  // Equation Modal Handlers
  const handleOpenEquationModal = (existingLatex = '', element = null, existingPrompt = '') => {
    // Save the current cursor/selection position BEFORE the modal steals focus
    try {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        savedEquationRangeRef.current = sel.getRangeAt(0).cloneRange()
      }
    } catch (e) {
      savedEquationRangeRef.current = null
    }

    if (element) {
      setEditingEquationElement(element)
      setAiEquationLatex(existingLatex || 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}')
      if (existingPrompt) setAiEquationPrompt(existingPrompt)
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
      showNotification('Please describe the equation you want to create.', 'warning')
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
      const data = await apiService.rteAssist(
        { prompt },
        {
          onProgress: (info) => {
            if (info?.isComplete) setAiWarmingInfo(null)
            else setAiWarmingInfo(info)
          }
        }
      )
      if (data && data.success && data.content) {
        // Clean the AI response - strip any markdown code fences, dollar signs, or whitespace wrappers
        let cleanLatex = data.content.trim()
        cleanLatex = cleanLatex.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '')
        cleanLatex = cleanLatex.replace(/^\$\$?\s*/, '').replace(/\s*\$\$?$/, '')
        cleanLatex = cleanLatex.replace(/^\\\[\s*/, '').replace(/\s*\\\]$/, '')
        cleanLatex = cleanLatex.trim()
        setAiEquationLatex(cleanLatex)
        showNotification('LaTeX equation generated successfully!', 'success')
      } else {
        showNotification(data?.message || 'AI equation generation failed.', 'error')
      }
    } catch (err) {
      showNotification('Error generating equation: ' + err.message, 'error')
    } finally {
      setAiEquationGenerating(false)
      setAiWarmingInfo(null)
    }
  }

  const handleInsertAiEquation = () => {
    if (!aiEquationLatex.trim()) {
      showNotification('Please enter or generate a LaTeX equation first.', 'warning')
      return
    }
    const editor = rteRef.current
    if (!editor) return

    const encodedLatex = encodeURIComponent(aiEquationLatex)
    const encodedPrompt = encodeURIComponent(aiEquationPrompt || '')
    const badgeHint = getEquationBadgeHint(aiEquationLatex, aiEquationPrompt)
    const escapedHint = badgeHint.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    // The editor shows a clean clickable badge with hover delete cross button; print/PDF reads data-latex and converts to a high-res image
    const wrapperHtml = `<span class="math-equation-wrapper" data-latex="${encodedLatex}" data-prompt="${encodedPrompt}" contenteditable="false" title="Click to edit equation"><span class="math-eq-badge"><code>${escapedHint}</code><button type="button" class="math-eq-delete-btn" title="Delete equation" contenteditable="false" aria-label="Delete equation">&times;</button></span><span class="math-eq-print-content" style="display:none;"></span></span>`

    if (editingEquationElement) {
      // Replace existing equation in editor DOM
      editingEquationElement.outerHTML = wrapperHtml
      setEditingEquationElement(null)
    } else {
      // Restore saved cursor position before inserting
      editor.focusIn()
      try {
        if (savedEquationRangeRef.current) {
          const sel = window.getSelection()
          sel.removeAllRanges()
          sel.addRange(savedEquationRangeRef.current)
        }
      } catch (e) {
        // Fallback: just use focusIn's default position
      }
      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
      editor.executeCommand('insertHTML', wrapperHtml)
      savedEquationRangeRef.current = null
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

  const lastListActionRef = useRef({ time: 0, key: '' })

  // Smart List Helper: Handles bullet/numbering list creation, switching, and unlisting (None)
  // Supports all dropdown variants (Disc, Circle, Square, Decimal, Lower-Alpha, Upper-Alpha, Lower-Roman, Upper-Roman, Lower-Greek, None)
  // Ensures lists are never applied to outer table cells, supports caret list creation on empty lines (Word-identical),
  // and cleanly converts between lists and paragraphs
  const handleSmartListAction = (args, editor) => {
    if (!editor) return false
    const editPanel = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
    if (!editPanel) return false

    const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
    const sel = doc ? doc.getSelection() : window.getSelection()
    if (!sel || !sel.rangeCount) return false

    const range = sel.getRangeAt(0)
    let startNode = range.startContainer
    if (startNode.nodeType === 3) startNode = startNode.parentElement
    if (!startNode || !editPanel.contains(startNode)) return false

    const req = (args.requestType || args.item?.command || '').toLowerCase()
    const sub = (args.subCommand || args.item?.subCommand || '').toLowerCase()

    let rawVal = ''
    if (typeof args.value === 'string') {
      rawVal = args.value
    } else if (args.value?.listStyle && typeof args.value.listStyle === 'string') {
      rawVal = args.value.listStyle
    } else if (args.value?.selectedValue && typeof args.value.selectedValue === 'string') {
      rawVal = args.value.selectedValue
    } else if (args.itemCollection?.listStyle && typeof args.itemCollection.listStyle === 'string') {
      rawVal = args.itemCollection.listStyle
    } else if (args.item?.value && typeof args.item.value === 'string') {
      rawVal = args.item.value
    } else if (args.item?.text && typeof args.item.text === 'string') {
      rawVal = args.item.text
    } else if (sub !== 'bulletformatlist' && sub !== 'numberformatlist' && sub !== 'ul' && sub !== 'ol') {
      rawVal = sub
    }

    const norm = (rawVal || '').toLowerCase().replace(/[\s_-]+/g, '')

    // Debounce rapid duplicate calls (e.g. within 60ms)
    const actionKey = `${req}_${sub}_${norm}`
    const now = Date.now()
    if (lastListActionRef.current && (now - lastListActionRef.current.time < 60) && lastListActionRef.current.key === actionKey) {
      return true
    }
    lastListActionRef.current = { time: now, key: actionKey }

    const isNoneAction = norm === 'none' || norm === 'clear' || sub === 'none' || req === 'none'

    // Identify containment
    const containingCell = startNode.closest('td, th')
    const existingLi = startNode.closest('li')
    const existingList = existingLi ? existingLi.closest('ol, ul') : startNode.closest('ol, ul')

    // Helper to safely apply Microsoft Word 36px tab indentation and CSS classes to list elements
    const styleListElem = (listEl, styleType) => {
      listEl.style.listStyleType = styleType
      listEl.className = `e-list-${styleType}`
      listEl.style.paddingLeft = '36px'
      listEl.style.marginTop = '6px'
      listEl.style.marginBottom = '6px'
      listEl.style.listStylePosition = 'outside'
    }

    const styleLiElem = (liEl, styleType) => {
      liEl.style.listStyleType = styleType
      liEl.className = `e-list-${styleType}`
      liEl.style.marginTop = '4px'
      liEl.style.marginBottom = '4px'
    }

    const saveAndSyncEditor = () => {
      if (editor.formatter?.saveData) editor.formatter.saveData()
      if (editor.contentModule?.getEditPanel) {
        const newHtml = editor.contentModule.getEditPanel().innerHTML
        setEditorValue(newHtml)
        if (typeof editor.value !== 'undefined') editor.value = newHtml
      }
    }

    // CASE 1: Cursor or selection is inside an existing list
    if (existingList && editPanel.contains(existingList) && (!containingCell || containingCell.contains(existingList))) {
      if (isNoneAction) {
        // Unlist: convert list items to paragraphs
        const listItems = Array.from(existingList.children).filter(c => c.tagName === 'LI')
        const frag = doc.createDocumentFragment()
        const createdPs = []
        listItems.forEach(li => {
          const p = doc.createElement('p')
          p.innerHTML = li.innerHTML || '<br>'
          p.style.marginBottom = '4px'
          p.style.lineHeight = '1.5'
          frag.appendChild(p)
          createdPs.push(p)
        })
        const parent = existingList.parentNode
        if (parent) {
          parent.replaceChild(frag, existingList)
          saveAndSyncEditor()
          if (createdPs.length > 0) {
            try {
              const newRange = doc.createRange()
              newRange.selectNodeContents(createdPs[0])
              newRange.collapse(true)
              sel.removeAllRanges()
              sel.addRange(newRange)
            } catch (e) {}
          }
        }
        return true
      }

      // Determine target list style
      let isNumbered = req.includes('number') || sub.includes('number') || sub === 'ol' || req === 'ol' ||
        norm.includes('decimal') || norm.includes('alpha') || norm.includes('roman') || norm.includes('greek') || norm === 'number'

      if (req.includes('bullet') || sub.includes('bullet') || sub === 'ul' || req === 'ul' ||
          norm.includes('disc') || norm.includes('circle') || norm.includes('square')) {
        isNumbered = false
      }

      let targetTag = isNumbered ? 'ol' : 'ul'
      let targetStyle = isNumbered ? 'decimal' : 'disc'

      if (isNumbered) {
        if (norm.includes('greek')) targetStyle = 'lower-greek'
        else if (norm.includes('lowerroman') || (norm.includes('lower') && norm.includes('roman'))) targetStyle = 'lower-roman'
        else if (norm.includes('upperroman') || (norm.includes('upper') && norm.includes('roman'))) targetStyle = 'upper-roman'
        else if (norm.includes('loweralpha') || (norm.includes('lower') && norm.includes('alpha'))) targetStyle = 'lower-alpha'
        else if (norm.includes('upperalpha') || (norm.includes('upper') && norm.includes('alpha'))) targetStyle = 'upper-alpha'
        else targetStyle = 'decimal'
      } else {
        if (norm.includes('circle')) targetStyle = 'circle'
        else if (norm.includes('square')) targetStyle = 'square'
        else targetStyle = 'disc'
      }

      // Switching list tag (ul <-> ol):
      if (existingList.tagName.toLowerCase() !== targetTag) {
        const newList = doc.createElement(targetTag)
        styleListElem(newList, targetStyle)
        while (existingList.firstChild) {
          const child = existingList.firstChild
          if (child.nodeType === 1 && child.tagName === 'LI') {
            styleLiElem(child, targetStyle)
          }
          newList.appendChild(child)
        }
        const parent = existingList.parentNode
        if (parent) {
          parent.replaceChild(newList, existingList)
          saveAndSyncEditor()
        }
        return true
      } else {
        // Same tag: update list-style-type and class
        styleListElem(existingList, targetStyle)
        Array.from(existingList.children).forEach(li => {
          if (li.tagName === 'LI') {
            styleLiElem(li, targetStyle)
          }
        })
        saveAndSyncEditor()
        return true
      }
    }

    // CASE 2: Outside a list and user selected "None"
    if (isNoneAction) {
      return true
    }

    // Determine target list style for creating a new list
    let isNumbered = req.includes('number') || sub.includes('number') || sub === 'ol' || req === 'ol' ||
      norm.includes('decimal') || norm.includes('alpha') || norm.includes('roman') || norm.includes('greek') || norm === 'number'

    if (req.includes('bullet') || sub.includes('bullet') || sub === 'ul' || req === 'ul' ||
        norm.includes('disc') || norm.includes('circle') || norm.includes('square')) {
      isNumbered = false
    }

    let targetTag = isNumbered ? 'ol' : 'ul'
    let targetStyle = isNumbered ? 'decimal' : 'disc'

    if (isNumbered) {
      if (norm.includes('greek')) targetStyle = 'lower-greek'
      else if (norm.includes('lowerroman') || (norm.includes('lower') && norm.includes('roman'))) targetStyle = 'lower-roman'
      else if (norm.includes('upperroman') || (norm.includes('upper') && norm.includes('roman'))) targetStyle = 'upper-roman'
      else if (norm.includes('loweralpha') || (norm.includes('lower') && norm.includes('alpha'))) targetStyle = 'lower-alpha'
      else if (norm.includes('upperalpha') || (norm.includes('upper') && norm.includes('alpha'))) targetStyle = 'upper-alpha'
      else targetStyle = 'decimal'
    } else {
      if (norm.includes('circle')) targetStyle = 'circle'
      else if (norm.includes('square')) targetStyle = 'square'
      else targetStyle = 'disc'
    }

    // CASE 3: Selection is collapsed (empty line or caret point - Word-style instant list item)
    if (sel.isCollapsed) {
      // Find enclosing <p> STRICTLY bounded by containingCell or editPanel
      const enclosingP = startNode.closest('p')
      const isValidP = enclosingP && 
        (containingCell ? containingCell.contains(enclosingP) : editPanel.contains(enclosingP)) &&
        !enclosingP.querySelector('table') &&
        enclosingP.nodeName === 'P'

      const listElem = doc.createElement(targetTag)
      styleListElem(listElem, targetStyle)

      const li = doc.createElement('li')
      styleLiElem(li, targetStyle)

      const isEmptyP = isValidP && (enclosingP.textContent.trim() === '' || enclosingP.innerHTML.trim() === '<br>' || enclosingP.innerHTML.trim() === '')

      if (isEmptyP && enclosingP.parentNode) {
        li.innerHTML = '<br>'
        listElem.appendChild(li)
        enclosingP.parentNode.replaceChild(listElem, enclosingP)
      } else if (isValidP && !enclosingP.innerHTML.match(/<br\s*\/?>/i) && enclosingP.parentNode) {
        li.innerHTML = enclosingP.innerHTML || '<br>'
        listElem.appendChild(li)
        enclosingP.parentNode.replaceChild(listElem, enclosingP)
      } else {
        // Direct insertion at caret: NEVER replace any table cell, div, or parent container!
        li.innerHTML = '<br>'
        listElem.appendChild(li)
        range.deleteContents()
        range.insertNode(listElem)
      }

      try {
        const newRange = doc.createRange()
        newRange.setStart(li, 0)
        newRange.collapse(true)
        sel.removeAllRanges()
        sel.addRange(newRange)
      } catch (e) {}

      saveAndSyncEditor()
      return true
    }

    // CASE 4: Text is selected across words/lines
    const selectedText = sel.toString().trim()
    if (!selectedText) return false

    const commonAncestor = range.commonAncestorContainer
    const commonElem = commonAncestor.nodeType === 3 ? commonAncestor.parentElement : commonAncestor
    if (!commonElem || !editPanel.contains(commonElem)) return false
    if (containingCell && !containingCell.contains(commonElem)) {
      // Cross-cell selection: do not touch table layout
      return false
    }

    const listElem = doc.createElement(targetTag)
    styleListElem(listElem, targetStyle)

    // Extract selected contents safely from the DOM Range
    const frag = range.extractContents()
    const temp = doc.createElement('div')
    temp.appendChild(frag)

    let lines = []
    const childBlocks = temp.querySelectorAll('p, div, li')
    if (childBlocks.length > 0) {
      childBlocks.forEach(b => {
        const t = b.innerHTML.trim()
        if (t) lines.push(t)
      })
    } else {
      lines = temp.innerHTML.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean)
    }

    if (lines.length === 0 && temp.textContent.trim()) {
      lines = [temp.textContent.trim()]
    }

    if (lines.length === 0) {
      lines = ['<br>']
    }

    lines.forEach(lineHtml => {
      const li = doc.createElement('li')
      li.innerHTML = lineHtml
      styleLiElem(li, targetStyle)
      listElem.appendChild(li)
    })

    range.insertNode(listElem)

    try {
      const newRange = doc.createRange()
      newRange.selectNodeContents(listElem)
      sel.removeAllRanges()
      sel.addRange(newRange)
    } catch (e) {}

    saveAndSyncEditor()
    return true
  }

  // Helper to detect if a specific alignment (center, right, justify, or left) is active
  const isBlockAligned = useCallback((editor, alignmentType) => {
    // 1. Check toolbar button active state first (Syncfusion tracks selection accurately)
    const btnIdMap = {
      center: '_JustifyCenter',
      right: '_JustifyRight',
      justify: '_JustifyFull',
      left: '_JustifyLeft'
    }
    const btnId = btnIdMap[alignmentType]
    if (btnId) {
      const btn = document.querySelector(`.e-richtexteditor button[id*="${btnId}"]`)
      if (btn && (btn.classList.contains('e-active') || btn.getAttribute('aria-pressed') === 'true')) {
        return true
      }
    }

    // 2. Check direct DOM block styles at caret
    if (!editor) return false
    const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
    const sel = doc ? doc.getSelection() : window.getSelection()
    if (!sel || !sel.rangeCount) return false

    let node = sel.getRangeAt(0).startContainer
    if (node && node.nodeType === 3) node = node.parentNode
    const block = node ? (node.closest ? node.closest('p, div, li, td, th, h1, h2, h3, h4, h5, h6') : node.parentElement) : null
    if (!block) return false

    const inline = (block.style?.textAlign || block.getAttribute('align') || '').toLowerCase().trim()
    if (alignmentType === 'center') return inline === 'center'
    if (alignmentType === 'right') return inline === 'right'
    if (alignmentType === 'justify') return inline === 'justify'
    if (alignmentType === 'left') {
      return inline === 'left' || (!inline && !block.style.textAlign)
    }

    return false
  }, [])

  const isProgrammaticAlignRef = useRef(false)

  // Helper to toggle block alignment (Word-style: pressing Ctrl+E on centered text toggles back to Left)
  const toggleBlockAlignment = useCallback((editor, requestedAlign) => {
    if (!editor) return
    isProgrammaticAlignRef.current = true

    try {
      const isAlready = isBlockAligned(editor, requestedAlign)
      // If already at requested alignment, toggle back to left (Word behavior).
      // Otherwise apply requested alignment.
      const targetAlign = (isAlready && requestedAlign !== 'left') ? 'left' : requestedAlign

      const subCmdMap = {
        left: 'JustifyLeft',
        center: 'JustifyCenter',
        right: 'JustifyRight',
        justify: 'JustifyFull'
      }

      const syncCmdMap = {
        left: 'justifyLeft',
        center: 'justifyCenter',
        right: 'justifyRight',
        justify: 'justifyFull'
      }

      const subCmd = subCmdMap[targetAlign] || 'JustifyLeft'
      const syncCmd = syncCmdMap[targetAlign] || 'justifyLeft'

      // 1. Try Syncfusion formatter
      try {
        if (editor.formatter && typeof editor.formatter.process === 'function') {
          editor.formatter.process(editor, { subCommand: subCmd }, null, { value: targetAlign })
        }
      } catch (err) {}

      // 2. Try Syncfusion executeCommand
      try {
        editor.executeCommand(syncCmd)
      } catch (e) {}

      // 3. Fallback direct DOM style on the active block node
      const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
      const sel = doc ? doc.getSelection() : window.getSelection()
      if (sel && sel.rangeCount) {
        let node = sel.getRangeAt(0).startContainer
        if (node && node.nodeType === 3) node = node.parentNode
        const block = node ? (node.closest ? node.closest('p, div, li, td, th, h1, h2, h3, h4, h5, h6') : node.parentElement) : null
        if (block) {
          block.style.textAlign = targetAlign === 'left' ? '' : targetAlign
        }
      }

      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
      if (editor.refreshUI) {
        editor.refreshUI()
      }
    } finally {
      setTimeout(() => {
        isProgrammaticAlignRef.current = false
      }, 100)
    }
  }, [isBlockAligned])

  const savedEditorRangeRef = useRef(null)

  // Apply custom font size (e.g. 11pt, 12pt, 14pt) from manual input or dropdown safely without breaking table structure
  const applyCustomFontSize = useCallback((sizeInput) => {
    const editor = rteRef.current
    if (!editor) return

    const num = parseFloat(String(sizeInput).replace(/[^\d\.]/g, ''))
    if (isNaN(num) || num < 4 || num > 144) return
    const ptVal = `${num}pt`

    const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
    const win = doc?.defaultView || window
    const sel = doc ? doc.getSelection() : win.getSelection()
    const editPanel = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null

    // 1. Restore saved selection if current selection is lost, outside editPanel, or collapsed when saved was not
    if (savedEditorRangeRef.current && editPanel) {
      const isCurrentSelInside = sel && sel.rangeCount > 0 && editPanel.contains(sel.getRangeAt(0).commonAncestorContainer)
      if (!isCurrentSelInside || (sel && sel.isCollapsed && !savedEditorRangeRef.current.collapsed)) {
        try {
          sel.removeAllRanges()
          sel.addRange(savedEditorRangeRef.current.cloneRange())
        } catch (e) {}
      }
    }

    // 2. Pre-save undo state before applying
    try {
      if (editor.formatter?.getUndoRedoStack) {
        if (editor.formatter.getUndoRedoStack().length === 0) {
          editor.formatter.saveData()
        }
      }
    } catch (e) {}

    // 3. Detect if selection is inside a table cell — Syncfusion's NodeCutter.SplitNode uses
    //    extractContents() which destroys table structure via HTML5 Foster Parenting.
    //    When inside a table, we MUST bypass Syncfusion's command engine and apply styles directly.
    const activeSel = doc ? doc.getSelection() : win.getSelection()
    let isInsideTable = false
    if (activeSel && activeSel.rangeCount > 0) {
      const range = activeSel.getRangeAt(0)
      const ancestor = range.commonAncestorContainer
      const ancestorEl = ancestor?.nodeType === 1 ? ancestor : ancestor?.parentElement
      if (ancestorEl) {
        isInsideTable = !!(ancestorEl.closest?.('td') || ancestorEl.closest?.('th') || ancestorEl.closest?.('table'))
      }
    }

    if (isInsideTable && activeSel && activeSel.rangeCount > 0) {
      // === SAFE TABLE PATH: Apply font size via direct DOM styling ===
      const range = activeSel.getRangeAt(0)

      if (range.collapsed) {
        // Cursor is in a cell but no text selected — style the containing block
        let node = range.startContainer
        if (node.nodeType === 3) node = node.parentNode
        const block = node?.closest?.('p, div, li, td, th, h1, h2, h3, h4, h5, h6, span')
        if (block) {
          block.style.fontSize = ptVal
        }
      } else {
        // Text is selected inside table — walk all text nodes in the range and wrap/style them safely
        const commonAncestor = range.commonAncestorContainer
        const commonEl = commonAncestor?.nodeType === 1 ? commonAncestor : commonAncestor?.parentElement

        // Check if the entire content of a cell (or multiple cells) is selected
        const selectedCells = []
        if (commonEl) {
          // If commonAncestor IS a td/th, style all content inside it
          if (commonEl.matches?.('td, th')) {
            selectedCells.push(commonEl)
          } else if (commonEl.matches?.('tr, tbody, table')) {
            // Multiple cells selected — find all cells that intersect the range
            commonEl.querySelectorAll('td, th').forEach(cell => {
              if (range.intersectsNode ? range.intersectsNode(cell) : true) {
                selectedCells.push(cell)
              }
            })
          }
        }

        if (selectedCells.length > 0) {
          // Style all content within selected cells
          selectedCells.forEach(cell => {
            // Apply to the cell itself for inheritance
            cell.style.fontSize = ptVal
            // Also update all inline elements and paragraphs within
            cell.querySelectorAll('span, p, div, b, i, u, strong, em, a').forEach(el => {
              if (el.style.fontSize) {
                el.style.fontSize = ptVal
              }
            })
          })
        } else {
          // Partial text selected within a single cell — wrap in a styled span safely
          // Check if the selection is entirely within a single parent node
          try {
            const span = doc.createElement('span')
            span.style.fontSize = ptVal
            // surroundContents only works if selection doesn't cross element boundaries
            range.surroundContents(span)
            // Re-select the wrapped content
            activeSel.removeAllRanges()
            const newRange = doc.createRange()
            newRange.selectNodeContents(span)
            activeSel.addRange(newRange)
            savedEditorRangeRef.current = newRange.cloneRange()
          } catch (surroundErr) {
            // Selection crosses element boundaries — fallback to walking text nodes
            // Collect all text nodes within the range
            const textNodes = []
            const treeWalker = doc.createTreeWalker(
              range.commonAncestorContainer?.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer?.parentElement || editPanel,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: (node) => {
                  if (range.intersectsNode ? range.intersectsNode(node) : true) {
                    return NodeFilter.FILTER_ACCEPT
                  }
                  return NodeFilter.FILTER_REJECT
                }
              }
            )
            while (treeWalker.nextNode()) {
              textNodes.push(treeWalker.currentNode)
            }
            textNodes.forEach(textNode => {
              const parent = textNode.parentElement
              if (parent) {
                // If parent is already a span, just update its font size
                if (parent.tagName === 'SPAN' && parent.childNodes.length === 1) {
                  parent.style.fontSize = ptVal
                } else {
                  // Wrap the text node in a styled span
                  const wrapper = doc.createElement('span')
                  wrapper.style.fontSize = ptVal
                  parent.insertBefore(wrapper, textNode)
                  wrapper.appendChild(textNode)
                }
              }
            })
          }
        }

        // Also set fontSize on any table element that fully contains the selection
        if (commonEl) {
          const parentTable = commonEl.closest?.('table')
          if (parentTable) {
            // Check if the entire table is selected
            const tableText = parentTable.textContent || ''
            const selText = activeSel.toString() || ''
            if (selText.length > 0 && tableText.trim().length > 0 && selText.length >= tableText.trim().length * 0.9) {
              parentTable.style.fontSize = ptVal
            }
          }
        }
      }
    } else {
      // === NON-TABLE PATH: Use Syncfusion's command engine safely ===
      try {
        editor.executeCommand('fontSize', ptVal, { undo: true })
      } catch (e) {
        console.warn('Syncfusion executeCommand fontSize error:', e)
      }
    }

    // 4. If whole table, rows, or cells are in the broader selection, gracefully update table font size too
    try {
      const finalSel = doc ? doc.getSelection() : win.getSelection()
      if (finalSel && finalSel.rangeCount > 0 && editPanel) {
        const range = finalSel.getRangeAt(0)
        if (!range.collapsed) {
          const common = range.commonAncestorContainer
          const ancestor = common?.nodeType === 1 ? common : common?.parentElement
          if (ancestor && !isInsideTable) {
            // For non-table selections that contain tables (e.g. Ctrl+A)
            const tables = ancestor.matches?.('table') ? [ancestor] : Array.from(ancestor.querySelectorAll?.('table') || [])
            tables.forEach(tbl => {
              if (range.intersectsNode ? range.intersectsNode(tbl) : true) {
                tbl.style.fontSize = ptVal
                tbl.querySelectorAll('td, th').forEach(cell => {
                  cell.style.fontSize = ptVal
                  cell.querySelectorAll('span[style*="font-size"]').forEach(s => {
                    s.style.fontSize = ptVal
                  })
                })
              }
            })
          }
        }
        savedEditorRangeRef.current = range.cloneRange()
      }
    } catch (e) {}

    // 5. Post-save undo state and update editor value state
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }
    if (editor.notify) {
      editor.notify('contentChanged', {})
    }
    if (editPanel) {
      setEditorValue(editPanel.innerHTML)
    }

    // 6. Sync all font size input fields in the UI
    const inputs = document.querySelectorAll('.word-fontsize-input')
    inputs.forEach(inp => {
      inp.value = `${num}`
    })
  }, [])

  // Apply line height to selected blocks/paragraphs or current cursor block
  const applySelectedLineHeight = useCallback((selectedVal) => {
    const editor = rteRef.current
    if (!editor) return
    const cssVal = (!selectedVal || selectedVal === 'Default' || selectedVal === '') ? 'normal' : String(selectedVal)

    // 0. Pre-save undo state before applying
    try {
      if (editor.formatter?.getUndoRedoStack) {
        if (editor.formatter.getUndoRedoStack().length === 0) {
          editor.formatter.saveData()
        }
      }
    } catch (e) {}

    // 1. Notify Syncfusion internal editorManager observer
    try {
      if (editor.formatter?.editorManager?.observer) {
        editor.formatter.editorManager.observer.notify('line-height-type', {
          subCommand: 'LineHeight',
          value: { selectedValue: (!selectedVal || selectedVal === 'Default') ? '' : String(selectedVal) },
          enterAction: editor.enterKey || 'P'
        })
      }
    } catch (e) {}

    // 2. Direct DOM application to selected elements / closest block
    try {
      const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
      const win = doc?.defaultView || window
      const sel = doc ? doc.getSelection() : win.getSelection()
      let range = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0) : savedEditorRangeRef.current

      const blocks = new Set()
      if (range) {
        if (!range.collapsed) {
          const common = range.commonAncestorContainer
          const ancestor = common?.nodeType === 1 ? common : common?.parentElement
          if (ancestor) {
            if (/^(P|DIV|LI|TD|TH|H[1-6])$/i.test(ancestor.tagName)) {
              blocks.add(ancestor)
            }
            ancestor.querySelectorAll('p, div, li, td, th, h1, h2, h3, h4, h5, h6').forEach(b => {
              if (range.intersectsNode ? range.intersectsNode(b) : (sel?.containsNode ? sel.containsNode(b, true) : true)) {
                blocks.add(b)
              }
            })
          }
        }
        if (blocks.size === 0) {
          let node = range.startContainer
          if (node && node.nodeType === 3) node = node.parentNode
          const b = node?.closest ? node.closest('p, div, li, td, th, h1, h2, h3, h4, h5, h6') : node?.parentElement
          if (b) blocks.add(b)
        }
      }

      if (blocks.size === 0) {
        const editPanel = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
        const active = doc?.activeElement
        if (editPanel && editPanel.contains(active)) {
          const b = active.closest ? active.closest('p, div, li, td, th, h1, h2, h3, h4, h5, h6') : active
          if (b) blocks.add(b)
        }
      }

      blocks.forEach(b => {
        if (cssVal === 'normal') {
          b.style.removeProperty('line-height')
        } else {
          b.style.setProperty('line-height', cssVal, 'important')
        }
      })

      // Post-save undo state
      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
      if (editor.notify) {
        editor.notify('contentChanged', {})
      }
      const editPanel = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
      if (editPanel) {
        setEditorValue(editPanel.innerHTML)
      }
    } catch (err) {
      console.warn('applySelectedLineHeight error:', err)
    }
  }, [])

  const onRteCreated = useCallback(() => {
    if (rteRef.current) {
      // Ensure the edit panel body defaults to Times New Roman and 12pt
      try {
        const editPanel = rteRef.current.contentModule?.getEditPanel ? rteRef.current.contentModule.getEditPanel() : null
        if (editPanel) {
          if (!editPanel.style.fontFamily) {
            editPanel.style.fontFamily = "'Times New Roman', Times, serif"
          }
          if (!editPanel.style.fontSize) {
            editPanel.style.fontSize = '12pt'
          }
        }
      } catch (e) {}

      // Ensure the font size inputs display '12' by default
      try {
        const inputs = document.querySelectorAll('.word-fontsize-input')
        inputs.forEach(inp => {
          if (!inp.value || inp.value === '') inp.value = '12'
        })
      } catch (e) {}

      try {
        rteRef.current.on('dropDownSelect', (e) => {
          if (e?.item?.command === 'LineHeight') {
            const val = e.item?.value
            applySelectedLineHeight(val)
          }
        })
      } catch (err) {}
    }
  }, [applySelectedLineHeight])

  const onActionBegin = (args) => {
    if (isProgrammaticAlignRef.current) return

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
    } else if (args.requestType === 'JustifyCenter' || args.subCommand === 'JustifyCenter') {
      if (isBlockAligned(rteRef.current, 'center')) {
        args.cancel = true
        toggleBlockAlignment(rteRef.current, 'center')
      }
    } else if (args.requestType === 'JustifyRight' || args.subCommand === 'JustifyRight') {
      if (isBlockAligned(rteRef.current, 'right')) {
        args.cancel = true
        toggleBlockAlignment(rteRef.current, 'right')
      }
    } else if (args.requestType === 'JustifyFull' || args.subCommand === 'JustifyFull') {
      if (isBlockAligned(rteRef.current, 'justify')) {
        args.cancel = true
        toggleBlockAlignment(rteRef.current, 'justify')
      }
    } else if (args.requestType === 'LineHeights' || args.subCommand === 'LineHeights' || args.requestType === 'LineHeight' || args.subCommand === 'LineHeight') {
      const selectedVal = args.value?.selectedValue ?? args.value?.value ?? args.value
      applySelectedLineHeight(selectedVal)
    } else if (
      args.requestType === 'Lists' ||
      args.requestType === 'BulletFormatList' ||
      args.requestType === 'NumberFormatList' ||
      args.subCommand === 'UL' ||
      args.subCommand === 'OL' ||
      args.subCommand === 'BulletFormatList' ||
      args.subCommand === 'NumberFormatList'
    ) {
      if (handleSmartListAction(args, rteRef.current)) {
        args.cancel = true
      }
    }
  }

  const onActionComplete = useCallback((args) => {
    // Sync editorValue when image actions (insert, delete, change) occur
    if (args && (args.requestType === 'Images' || args.requestType === 'Image' || args.requestType === 'delete')) {
      const editor = rteRef.current
      if (editor?.contentModule?.getEditPanel) {
        const newHtml = editor.contentModule.getEditPanel().innerHTML
        setEditorValue(newHtml)
      }
    }

    // Gracefully handle FontName propagation if entire table is selected
    if (args && args.requestType === 'FontName') {
      const editor = rteRef.current
      const doc = editor?.contentModule?.getDocument ? editor.contentModule.getDocument() : document
      const sel = doc ? doc.getSelection() : window.getSelection()
      const editPanel = editor?.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
      if (sel && sel.rangeCount > 0 && editPanel && !sel.isCollapsed) {
        try {
          const range = sel.getRangeAt(0)
          const common = range.commonAncestorContainer
          const root = common?.nodeType === 1 ? common : common?.parentElement
          if (root) {
            const fontVal = args.value?.value || args.value || ''
            if (fontVal) {
              const tables = root.matches?.('table') ? [root] : Array.from(root.querySelectorAll?.('table') || [])
              tables.forEach(tbl => {
                if (range.intersectsNode ? range.intersectsNode(tbl) : true) {
                  tbl.style.fontFamily = fontVal
                }
              })
            }
          }
        } catch (e) {}
      }
    }
  }, [])

  const onImageRemoving = useCallback((args) => {
    setTimeout(() => {
      const editor = rteRef.current
      if (editor?.contentModule?.getEditPanel) {
        const newHtml = editor.contentModule.getEditPanel().innerHTML
        setEditorValue(newHtml)
      }
    }, 10)
  }, [])

  // Click-to-Edit & MS Word Keyboard listener for Rich Text Editor
  useEffect(() => {
    const handleEditorClicks = (e) => {
      // 1. Math Equation delete button click
      const deleteBtn = e.target.closest('.math-eq-delete-btn')
      if (deleteBtn) {
        e.preventDefault()
        e.stopPropagation()
        const wrapper = deleteBtn.closest('.math-equation-wrapper')
        if (wrapper) {
          wrapper.remove()
          const editor = rteRef.current
          if (editor?.formatter?.saveData) editor.formatter.saveData()
          if (editor?.contentModule?.getEditPanel) {
            const newHtml = editor.contentModule.getEditPanel().innerHTML
            setEditorValue(newHtml)
            if (typeof editor.value !== 'undefined') editor.value = newHtml
          }
        }
        return
      }

      // Math Equation edit click/dblclick
      const target = e.target.closest('.math-equation-wrapper') || e.target.closest('[data-latex]')
      if (target) {
        e.preventDefault()
        e.stopPropagation()
        const encoded = target.getAttribute('data-latex') || ''
        const encodedPrompt = target.getAttribute('data-prompt') || ''
        const latex = encoded ? decodeURIComponent(encoded) : ''
        const prompt = encodedPrompt ? decodeURIComponent(encodedPrompt) : ''
        handleOpenEquationModal(latex, target, prompt)
        return
      }

      // 2. Code Snippet click / dblclick
      const codeTarget = e.target.closest('.obe-code-snippet-container') || e.target.closest('.obe-code-block')
      if (codeTarget) {
        // If user is actively drag-selecting text with mouse, do NOT hijack selection or prevent copy
        const doc = e.target.ownerDocument || document
        const currentSel = doc.getSelection ? doc.getSelection() : window.getSelection()
        if (currentSel && !currentSel.isCollapsed && (currentSel.toString() || '').trim().length > 0) {
          return
        }

        e.preventDefault()
        e.stopPropagation()
        const container = codeTarget.closest('.obe-code-snippet-container') || codeTarget

        // Double click: Open Edit Modal directly
        if (e.type === 'dblclick') {
          const encoded = container.getAttribute('data-code') || ''
          const lang = container.getAttribute('data-language') || 'cpp'
          const align = container.getAttribute('data-align') || 'center'
          const hasBrd = container.getAttribute('data-hasborder') !== 'false'
          const lineNums = container.getAttribute('data-linenumbers') === 'true'
          const fontSz = container.getAttribute('data-fontsize') || '11pt'

          let rawCode = ''
          if (encoded) {
            try {
              rawCode = decodeURIComponent(encoded)
            } catch (err) {
              rawCode = container.textContent || ''
            }
          } else {
            const tableTxts = container.querySelectorAll('.obe-code-txt')
            if (tableTxts.length > 0) {
              rawCode = Array.from(tableTxts).map(td => td.textContent).join('\n')
            } else {
              rawCode = container.textContent || ''
            }
          }

          setSelectedCodeBlockInfo(null)
          handleOpenCodeSnippetModal({
            code: rawCode,
            language: lang,
            alignment: align,
            hasBorder: hasBrd,
            showLineNumbers: lineNums,
            fontSize: fontSz,
            element: container
          })
          return
        }

        // Single click: Select code block with visible outline & show action toolbar
        const editor = rteRef.current
        const editArea = editor?.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
        if (editArea) {
          editArea.querySelectorAll('.obe-code-snippet-container').forEach(c => c.removeAttribute('data-selected'))
        }
        container.setAttribute('data-selected', 'true')

        const iframe = document.querySelector('.e-rte-content iframe, iframe.e-rte-frame')
        let iframeLeft = 0
        let iframeTop = 0
        if (iframe && container.ownerDocument !== document) {
          const ifRect = iframe.getBoundingClientRect()
          iframeLeft = ifRect.left
          iframeTop = ifRect.top
        }

        const rect = container.getBoundingClientRect()
        setSelectedCodeBlockInfo({
          element: container,
          rect: {
            top: rect.top + iframeTop,
            left: rect.left + iframeLeft,
            width: rect.width,
            height: rect.height
          },
          hasBorder: container.getAttribute('data-hasborder') !== 'false'
        })
        return
      } else {
        if (e.type === 'click') {
          const editor = rteRef.current
          const editArea = editor?.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
          if (editArea) {
            editArea.querySelectorAll('.obe-code-snippet-container').forEach(c => c.removeAttribute('data-selected'))
          }
          setSelectedCodeBlockInfo(null)
        }
      }

      // 3. CS Diagram Studio diagram edit on double-click (Tree, Map, Graph, State Diagram / Automata)
      if (e.type === 'dblclick') {
        let diagramImg = null
        if (e.target?.tagName === 'IMG' && (
          e.target.classList?.contains('obe-graph-diagram') ||
          e.target.getAttribute?.('data-obe-diagram') === 'true' ||
          e.target.getAttribute?.('alt') === 'Graph Diagram' ||
          e.target.hasAttribute?.('data-diagram-payload')
        )) {
          diagramImg = e.target
        } else {
          const container = e.target?.closest?.('.e-img-wrap, .e-rte-img-resize, .e-img-resize, .obe-graph-diagram, p, div, span')
          if (container) {
            diagramImg = container.matches?.('img.obe-graph-diagram, img[data-obe-diagram="true"], img[data-diagram-payload], img[alt="Graph Diagram"]')
              ? container
              : container.querySelector?.('img.obe-graph-diagram, img[data-obe-diagram="true"], img[data-diagram-payload], img[alt="Graph Diagram"]')
          }
        }

        if (diagramImg) {
          e.preventDefault()
          e.stopPropagation()
          handleOpenDiagramEditModal(diagramImg)
          return
        }
      }
    }

    const handleMsWordKeyboard = (e) => {
      const editor = rteRef.current
      if (!editor) return

      // If a code block is currently selected, Delete/Backspace immediately deletes it
      if (selectedCodeBlockInfo?.element) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          e.stopPropagation()
          handleDeleteSelectedCodeBlock()
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setSelectedCodeBlockInfo(null)
          return
        }
      }

      // Math equation and graph diagram deletion via Backspace or Delete key
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
        const sel = doc ? doc.getSelection() : window.getSelection()
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)

          // 0. If range contains or is an image (graph diagram or inserted graphic)
          let targetImg = null
          if (!range.collapsed) {
            const container = range.commonAncestorContainer
            targetImg = container.nodeType === 1
              ? (container.tagName === 'IMG' ? container : container.querySelector?.('img'))
              : container.parentElement?.querySelector?.('img')
          } else {
            const anchor = sel.anchorNode
            if (anchor?.nodeType === 1 && anchor.tagName === 'IMG') {
              targetImg = anchor
            } else if (anchor?.parentElement?.querySelector?.('img.e-rte-image, img.obe-graph-diagram')) {
              targetImg = anchor.parentElement.querySelector('img.e-rte-image, img.obe-graph-diagram')
            }
          }

          if (targetImg) {
            e.preventDefault()
            e.stopPropagation()
            const pWrap = targetImg.closest('p') || targetImg
            const nextP = pWrap.nextElementSibling
            pWrap.remove()
            if (nextP && nextP.tagName === 'P' && (!nextP.textContent.trim() || nextP.innerHTML === '<br>') && !nextP.querySelector('img, table')) {
              nextP.remove()
            }
            if (editor.formatter?.saveData) editor.formatter.saveData()
            if (editor.contentModule?.getEditPanel) {
              const newHtml = editor.contentModule.getEditPanel().innerHTML
              setEditorValue(newHtml)
              if (typeof editor.value !== 'undefined') editor.value = newHtml
            }
            return
          }

          // 1. If range contains or is inside a .math-equation-wrapper
          let wrapper = null
          if (!range.collapsed) {
            const container = range.commonAncestorContainer
            wrapper = container.nodeType === 1
              ? (container.classList?.contains('math-equation-wrapper') ? container : container.querySelector?.('.math-equation-wrapper'))
              : container.parentElement?.closest?.('.math-equation-wrapper')
          } else {
            const anchor = sel.anchorNode
            wrapper = anchor?.nodeType === 1 ? anchor.closest?.('.math-equation-wrapper') : anchor?.parentElement?.closest?.('.math-equation-wrapper')
          }

          if (wrapper) {
            e.preventDefault()
            e.stopPropagation()
            wrapper.remove()
            if (editor.formatter?.saveData) editor.formatter.saveData()
            if (editor.contentModule?.getEditPanel) {
              const newHtml = editor.contentModule.getEditPanel().innerHTML
              setEditorValue(newHtml)
              if (typeof editor.value !== 'undefined') editor.value = newHtml
            }
            return
          }

          // 2. If cursor is collapsed right next to an equation or graph diagram
          if (range.collapsed) {
            const node = range.startContainer
            const offset = range.startOffset

            if (e.key === 'Backspace') {
              // Check for preceding graph diagram
              let prevEl = null
              if (node.nodeType === Node.TEXT_NODE && offset === 0) {
                prevEl = node.parentElement?.previousElementSibling || node.previousSibling
              } else if (node.nodeType === Node.ELEMENT_NODE && offset === 0) {
                prevEl = node.previousElementSibling
              }
              if (prevEl) {
                const img = prevEl.tagName === 'IMG' ? prevEl : prevEl.querySelector?.('img.obe-graph-diagram, img.e-rte-image, img[alt="Graph Diagram"]')
                if (img) {
                  e.preventDefault()
                  e.stopPropagation()
                  const pWrap = img.closest('p') || img
                  pWrap.remove()
                  if (editor.formatter?.saveData) editor.formatter.saveData()
                  if (editor.contentModule?.getEditPanel) {
                    const newHtml = editor.contentModule.getEditPanel().innerHTML
                    setEditorValue(newHtml)
                    if (typeof editor.value !== 'undefined') editor.value = newHtml
                  }
                  return
                }
              }

              let targetWrapper = null
              if (node.nodeType === Node.TEXT_NODE && offset === 0) {
                let prev = node.previousSibling
                while (prev && prev.nodeType === Node.TEXT_NODE && !prev.textContent.trim()) {
                  prev = prev.previousSibling
                }
                if (prev && (prev.classList?.contains('math-equation-wrapper') || prev.getAttribute?.('data-latex'))) {
                  targetWrapper = prev
                }
              } else if (node.nodeType === Node.ELEMENT_NODE && offset > 0) {
                const prevChild = node.childNodes[offset - 1]
                if (prevChild && (prevChild.classList?.contains('math-equation-wrapper') || prevChild.getAttribute?.('data-latex'))) {
                  targetWrapper = prevChild
                }
              }

              if (targetWrapper) {
                e.preventDefault()
                e.stopPropagation()
                targetWrapper.remove()
                if (editor.formatter?.saveData) editor.formatter.saveData()
                if (editor.contentModule?.getEditPanel) {
                  const newHtml = editor.contentModule.getEditPanel().innerHTML
                  setEditorValue(newHtml)
                  if (typeof editor.value !== 'undefined') editor.value = newHtml
                }
                return
              }
            } else if (e.key === 'Delete') {
              // Check for succeeding graph diagram
              let nextEl = null
              if (node.nodeType === Node.TEXT_NODE && offset === node.textContent.length) {
                nextEl = node.parentElement?.nextElementSibling || node.nextSibling
              } else if (node.nodeType === Node.ELEMENT_NODE && offset >= node.childNodes.length) {
                nextEl = node.nextElementSibling
              }
              if (nextEl) {
                const img = nextEl.tagName === 'IMG' ? nextEl : nextEl.querySelector?.('img.obe-graph-diagram, img.e-rte-image, img[alt="Graph Diagram"]')
                if (img) {
                  e.preventDefault()
                  e.stopPropagation()
                  const pWrap = img.closest('p') || img
                  pWrap.remove()
                  if (editor.formatter?.saveData) editor.formatter.saveData()
                  if (editor.contentModule?.getEditPanel) {
                    const newHtml = editor.contentModule.getEditPanel().innerHTML
                    setEditorValue(newHtml)
                    if (typeof editor.value !== 'undefined') editor.value = newHtml
                  }
                  return
                }
              }

              let targetWrapper = null
              if (node.nodeType === Node.TEXT_NODE && offset === node.textContent.length) {
                let next = node.nextSibling
                while (next && next.nodeType === Node.TEXT_NODE && !next.textContent.trim()) {
                  next = next.nextSibling
                }
                if (next && (next.classList?.contains('math-equation-wrapper') || next.getAttribute?.('data-latex'))) {
                  targetWrapper = next
                }
              } else if (node.nodeType === Node.ELEMENT_NODE && offset < node.childNodes.length) {
                const nextChild = node.childNodes[offset]
                if (nextChild && (nextChild.classList?.contains('math-equation-wrapper') || nextChild.getAttribute?.('data-latex'))) {
                  targetWrapper = nextChild
                }
              }

              if (targetWrapper) {
                e.preventDefault()
                e.stopPropagation()
                targetWrapper.remove()
                if (editor.formatter?.saveData) editor.formatter.saveData()
                if (editor.contentModule?.getEditPanel) {
                  const newHtml = editor.contentModule.getEditPanel().innerHTML
                  setEditorValue(newHtml)
                  if (typeof editor.value !== 'undefined') editor.value = newHtml
                }
                return
              }
            }
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        setSelectedCodeBlockInfo(null)
      }

      // ══════════════════════════════════════════════════════════
      // MS Word Alignment Toggle Shortcuts: Ctrl+E, Ctrl+R, Ctrl+J, Ctrl+L
      // ══════════════════════════════════════════════════════════
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        const key = e.key.toLowerCase()
        if (key === 'e' || key === 'r' || key === 'j' || key === 'l') {
          e.preventDefault()
          e.stopPropagation()
          const targetAlign = key === 'e' ? 'center' : key === 'r' ? 'right' : key === 'j' ? 'justify' : 'left'
          toggleBlockAlignment(editor, targetAlign)
          return
        }
      }

      // ══════════════════════════════════════════════════════════
      // MS Word Font Size Shortcuts: Ctrl+] / Ctrl+Shift+> (grow) and Ctrl+[ / Ctrl+Shift+< (shrink)
      // ══════════════════════════════════════════════════════════
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === ']' || e.key === '[' || e.key === '>' || e.key === '<')) {
        e.preventDefault()
        e.stopPropagation()
        const isGrow = e.key === ']' || e.key === '>'
        const standardSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72]
        const currentInput = document.querySelector('.word-fontsize-input')
        const currentSize = parseFloat(currentInput?.value) || 12
        let newSize = 12
        if (isGrow) {
          const found = standardSizes.find(s => s > currentSize)
          newSize = found || Math.min(144, currentSize + 2)
        } else {
          const found = [...standardSizes].reverse().find(s => s < currentSize)
          newSize = found || Math.max(4, currentSize - 2)
        }
        applyCustomFontSize(newSize)
        return
      }

      const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
      const sel = doc ? doc.getSelection() : window.getSelection()
      if (!sel || !sel.rangeCount) return

      const range = sel.getRangeAt(0)
      let node = range.startContainer
      if (node.nodeType === 3) node = node.parentNode
      const parentElem = node ? (node.nodeType === 1 ? node : node.parentElement) : null
      const listItem = parentElem ? parentElem.closest('li') : null
      const codeBlock = parentElem ? (parentElem.closest('.obe-code-block') || parentElem.closest('.obe-code-snippet-container') || parentElem.closest('pre') || parentElem.closest('code')) : null

      // If inside code block in the editor:
      if (codeBlock) {
        if (e.key === 'Tab') {
          e.preventDefault()
          e.stopPropagation()
          if (editor.formatter && typeof editor.formatter.saveData === 'function') {
            editor.formatter.saveData()
          }
          editor.executeCommand('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;')
          return
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          e.stopPropagation()
          if (editor.formatter && typeof editor.formatter.saveData === 'function') {
            editor.formatter.saveData()
          }
          editor.executeCommand('insertHTML', '<br>')
          return
        }
      }

      // ══════════════════════════════════════════════════════════
      // 1. BACKSPACE / DELETE KEY: Delete empty lines without destroying diagrams or code snippets
      // ══════════════════════════════════════════════════════════
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const cell = parentElem ? parentElem.closest('td, th, .col-content-cell') : (node?.closest ? node.closest('td, th, .col-content-cell') : null)

        const isBlockEmpty = (el) => {
          if (!el) return false
          if (el.querySelector && el.querySelector('img, svg, table, pre, code, .obe-code-snippet-container, .obe-graph-diagram, [data-diagram-id], [data-obe-diagram], .math-equation-wrapper')) {
            return false
          }
          const text = (el.textContent || '').replace(/[\s\u200B\u00A0\r\n\t]+/g, '')
          return text.length === 0
        }

        const isDiagramOrCode = (target) => {
          if (!target) return false
          if (target.nodeType === 1) {
            if (target.matches?.('img.obe-graph-diagram, [data-obe-diagram], .obe-code-snippet-container, pre.obe-code-block, .obe-diagram-wrapper, .obe-code-wrapper, table.e-rte-table, table:not(.obe-paper-structure-table)')) return true
            if (target.querySelector?.('img.obe-graph-diagram, [data-obe-diagram], .obe-code-snippet-container, pre.obe-code-block, table.e-rte-table')) return true
          }
          return false
        }

        const syncEditor = () => {
          if (editor.formatter && typeof editor.formatter.saveData === 'function') {
            editor.formatter.saveData()
          }
          if (editor.contentModule && editor.contentModule.getEditPanel) {
            const newHtml = editor.contentModule.getEditPanel().innerHTML
            setEditorValue(newHtml)
            if (typeof editor.value !== 'undefined') editor.value = newHtml
          }
        }

        if (cell && sel && sel.isCollapsed) {
          // --- SCENARIO A: Caret is inside a diagram wrapper, code wrapper, or paragraph containing media ---
          let directDiagParent = null
          if (parentElem && (parentElem.querySelector?.('img.obe-graph-diagram, [data-obe-diagram], .obe-code-snippet-container') || parentElem.classList?.contains('obe-diagram-wrapper') || parentElem.classList?.contains('obe-code-wrapper'))) {
            directDiagParent = parentElem
          } else if (node?.parentElement && (node.parentElement.querySelector?.('img.obe-graph-diagram, [data-obe-diagram], .obe-code-snippet-container') || node.parentElement.classList?.contains('obe-diagram-wrapper') || node.parentElement.classList?.contains('obe-code-wrapper'))) {
            directDiagParent = node.parentElement
          }

          if (directDiagParent) {
            if (e.key === 'Backspace') {
              e.preventDefault()
              e.stopPropagation()

              Array.from(directDiagParent.childNodes).forEach(ch => {
                if (ch.nodeName === 'BR' || (ch.nodeType === 3 && !ch.textContent.replace(/[\s\u200B\u00A0\r\n\t]+/g, ''))) {
                  ch.remove()
                }
              })

              const prev = directDiagParent.previousElementSibling
              const newRange = doc.createRange()
              if (prev && prev.nodeName === 'P') {
                newRange.selectNodeContents(prev)
                newRange.collapse(false)
              } else {
                newRange.selectNodeContents(cell)
                newRange.collapse(false)
              }
              sel.removeAllRanges()
              sel.addRange(newRange)

              syncEditor()
              return
            } else if (e.key === 'Delete') {
              e.preventDefault()
              e.stopPropagation()
              return
            }
          }

          // --- SCENARIO B: Caret is in a separate empty paragraph/block after diagram or code ---
          let currentBlock = node ? (node.closest ? node.closest('p, div, li') : node.parentElement?.closest('p, div, li')) : null
          if (currentBlock && cell.contains(currentBlock) && currentBlock !== cell && !currentBlock.classList.contains('obe-code-snippet-container')) {
            if (isBlockEmpty(currentBlock)) {
              e.preventDefault()
              e.stopPropagation()

              const prevEl = currentBlock.previousElementSibling
              const nextEl = currentBlock.nextElementSibling

              currentBlock.remove()

              const newRange = doc.createRange()
              if (e.key === 'Delete' && nextEl) {
                newRange.selectNodeContents(nextEl)
                newRange.collapse(true)
              } else if (prevEl) {
                if (prevEl.nodeName === 'P' && !isDiagramOrCode(prevEl)) {
                  newRange.selectNodeContents(prevEl)
                  newRange.collapse(false)
                } else {
                  newRange.selectNodeContents(cell)
                  newRange.collapse(false)
                }
              } else {
                newRange.selectNodeContents(cell)
                newRange.collapse(false)
              }

              sel.removeAllRanges()
              sel.addRange(newRange)

              syncEditor()
              return
            }
          }

          // --- SCENARIO C: Loose <br> or empty text node in the cell ---
          if (cell.contains(node)) {
            const childList = Array.from(cell.childNodes)
            for (let i = childList.length - 1; i >= 0; i--) {
              const ch = childList[i]
              if (ch.nodeName === 'BR' || (ch.nodeType === 3 && !ch.textContent.replace(/[\s\u200B\u00A0\r\n\t]+/g, '')) || (ch.nodeType === 1 && isBlockEmpty(ch) && !ch.classList.contains('obe-code-snippet-container'))) {
                if (ch.contains(node) || node === ch) {
                  e.preventDefault()
                  e.stopPropagation()
                  ch.remove()
                  const newRange = doc.createRange()
                  newRange.selectNodeContents(cell)
                  newRange.collapse(false)
                  sel.removeAllRanges()
                  sel.addRange(newRange)
                  syncEditor()
                  return
                }
              }
            }
          }

          // --- SCENARIO D: Caret is right after a diagram or code block (collapsed) ---
          if (e.key === 'Backspace') {
            let prevNode = null
            if (range.startContainer.nodeType === 1) {
              prevNode = range.startContainer.childNodes[range.startOffset - 1] || null
            } else if (range.startContainer.nodeType === 3 && range.startOffset === 0) {
              prevNode = range.startContainer.previousSibling || range.startContainer.parentElement?.previousElementSibling
            }

            if (isDiagramOrCode(prevNode)) {
              e.preventDefault()
              e.stopPropagation()
              if (node && node !== cell && isBlockEmpty(node)) {
                node.remove()
              }
              const newRange = doc.createRange()
              newRange.selectNodeContents(cell)
              newRange.collapse(false)
              sel.removeAllRanges()
              sel.addRange(newRange)
              syncEditor()
              return
            }
          }
        }

        if (e.key === 'Backspace' && listItem) {
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
      // 2. ENTER KEY (Create clean line below diagram, code snippet, or table)
      // ══════════════════════════════════════════════════════════
      if (e.key === 'Enter' && !e.shiftKey) {
        const cell = parentElem ? parentElem.closest('td, th, .col-content-cell') : (node?.closest ? node.closest('td, th, .col-content-cell') : null)

        // Check if caret is inside a diagram wrapper or code wrapper or table
        const wrapper = parentElem ? (parentElem.closest('.obe-diagram-wrapper, .obe-code-wrapper, .obe-code-snippet-container, table.e-rte-table') || ((parentElem.classList?.contains('obe-diagram-wrapper') || parentElem.classList?.contains('obe-code-wrapper')) ? parentElem : null)) : null

        if (wrapper && cell && cell.contains(wrapper)) {
          e.preventDefault()
          e.stopPropagation()

          if (editor.formatter && typeof editor.formatter.saveData === 'function') {
            editor.formatter.saveData()
          }

          const newP = doc.createElement('p')
          newP.innerHTML = '<br>'
          newP.style.margin = '4px 0'
          newP.style.textAlign = 'left'
          newP.style.lineHeight = '1.4'
          newP.style.fontSize = '12pt'
          newP.style.color = '#000000'

          wrapper.insertAdjacentElement('afterend', newP)

          const newRange = doc.createRange()
          newRange.setStart(newP, 0)
          newRange.collapse(true)
          sel.removeAllRanges()
          sel.addRange(newRange)

          syncEditor()
          return
        }

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

    // Attach click, dblclick, and keydown handlers to window (capture), RTE container & iframe
    let iframeDoc = null
    const attachListeners = () => {
      window.addEventListener('keydown', handleMsWordKeyboard, true)
      document.addEventListener('keydown', handleMsWordKeyboard, true)

      const container = document.querySelector('.e-richtexteditor .e-rte-content')
      if (container) {
        container.addEventListener('click', handleEditorClicks)
        container.addEventListener('dblclick', handleEditorClicks)
        container.addEventListener('keydown', handleMsWordKeyboard, true)
      }

      const editPanel = rteRef.current?.contentModule?.getEditPanel ? rteRef.current.contentModule.getEditPanel() : document.querySelector('.e-rte-content .e-content')
      if (editPanel) {
        editPanel.addEventListener('keydown', handleMsWordKeyboard, true)
      }

      const iframe = document.querySelector('.e-richtexteditor iframe')
      if (iframe && iframe.contentDocument) {
        iframeDoc = iframe.contentDocument
        iframeDoc.addEventListener('click', handleEditorClicks)
        iframeDoc.addEventListener('dblclick', handleEditorClicks)
        iframeDoc.addEventListener('keydown', handleMsWordKeyboard, true)
      }
    }

    const timer = setTimeout(attachListeners, 50)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleMsWordKeyboard, true)
      document.removeEventListener('keydown', handleMsWordKeyboard, true)

      const container = document.querySelector('.e-richtexteditor .e-rte-content')
      if (container) {
        container.removeEventListener('click', handleEditorClicks)
        container.removeEventListener('dblclick', handleEditorClicks)
        container.removeEventListener('keydown', handleMsWordKeyboard, true)
      }
      const editPanel = rteRef.current?.contentModule?.getEditPanel ? rteRef.current.contentModule.getEditPanel() : document.querySelector('.e-rte-content .e-content')
      if (editPanel) {
        editPanel.removeEventListener('keydown', handleMsWordKeyboard, true)
      }
      if (iframeDoc) {
        iframeDoc.removeEventListener('click', handleEditorClicks)
        iframeDoc.removeEventListener('dblclick', handleEditorClicks)
        iframeDoc.removeEventListener('keydown', handleMsWordKeyboard, true)
      }
    }
  }, [loading])

  // Word-Style Editable Font Size Combobox: Direct number typing + dropdown list
  useEffect(() => {
    let menuEl = document.getElementById('word-fontsize-menu')
    if (!menuEl) {
      menuEl = document.createElement('div')
      menuEl.id = 'word-fontsize-menu'
      menuEl.className = 'word-fontsize-menu'
      menuEl.style.display = 'none'

      const standardSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72]
      menuEl.innerHTML = standardSizes.map(sz => `
        <div class="word-fontsize-menu-item" data-val="${sz}">${sz}</div>
      `).join('')

      document.body.appendChild(menuEl)
    }

    const handleMenuMouseDown = (e) => {
      // Prevent mousedown from blurring editor selection
      e.preventDefault()
      e.stopPropagation()
    }
    menuEl.addEventListener('mousedown', handleMenuMouseDown)

    const handleMenuClick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      const item = e.target.closest('.word-fontsize-menu-item')
      if (item) {
        const val = item.getAttribute('data-val')
        if (val) {
          const inputs = document.querySelectorAll('.word-fontsize-input')
          inputs.forEach(inp => { inp.value = val })
          applyCustomFontSize(val)
          menuEl.style.display = 'none'
          const editor = rteRef.current
          if (editor && typeof editor.focusIn === 'function') {
            editor.focusIn()
          }
        }
      }
    }
    menuEl.addEventListener('click', handleMenuClick)

    const handleDocumentClick = (e) => {
      const clickedInsidePicker = e.target.closest && e.target.closest('.word-fontsize-wrapper')
      if (clickedInsidePicker) return
      if (menuEl && menuEl.contains(e.target)) return
      if (menuEl) menuEl.style.display = 'none'
    }
    document.addEventListener('mousedown', handleDocumentClick)

    const setupPickerEvents = () => {
      const wrappers = document.querySelectorAll('.word-fontsize-wrapper')
      wrappers.forEach(wrapper => {
        if (wrapper.getAttribute('data-initialized') === 'true') return
        wrapper.setAttribute('data-initialized', 'true')

        const input = wrapper.querySelector('.word-fontsize-input')
        const btn = wrapper.querySelector('.word-fontsize-btn')
        if (!input || !btn) return

        const toggleDropdown = (e) => {
          e.preventDefault()
          e.stopPropagation()

          const doc = rteRef.current?.contentModule?.getDocument ? rteRef.current.contentModule.getDocument() : document
          const sel = doc ? doc.getSelection() : window.getSelection()
          const editPanel = rteRef.current?.contentModule?.getEditPanel ? rteRef.current.contentModule.getEditPanel() : null
          if (sel && sel.rangeCount > 0 && editPanel && editPanel.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            savedEditorRangeRef.current = sel.getRangeAt(0).cloneRange()
          }

          if (menuEl.style.display === 'block') {
            menuEl.style.display = 'none'
          } else {
            const rect = wrapper.getBoundingClientRect()
            menuEl.style.top = `${rect.bottom + 2}px`
            menuEl.style.left = `${rect.left}px`
            menuEl.style.display = 'block'

            const curVal = input.value.trim()
            menuEl.querySelectorAll('.word-fontsize-menu-item').forEach(el => {
              if (el.getAttribute('data-val') === curVal) {
                el.classList.add('active')
              } else {
                el.classList.remove('active')
              }
            })
          }
        }

        btn.onmousedown = toggleDropdown
        btn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
        }

        input.onfocus = () => {
          const doc = rteRef.current?.contentModule?.getDocument ? rteRef.current.contentModule.getDocument() : document
          const sel = doc ? doc.getSelection() : window.getSelection()
          const editPanel = rteRef.current?.contentModule?.getEditPanel ? rteRef.current.contentModule.getEditPanel() : null
          if (sel && sel.rangeCount > 0 && editPanel && editPanel.contains(sel.getRangeAt(0).commonAncestorContainer)) {
            savedEditorRangeRef.current = sel.getRangeAt(0).cloneRange()
          }
          input.select()
        }

        const commitInput = () => {
          const raw = input.value.replace(/[^\d\.]/g, '').trim()
          let num = parseFloat(raw)
          if (isNaN(num) || num < 4 || num > 144) {
            num = 12
          }
          input.value = `${num}`
          applyCustomFontSize(num)
        }

        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            commitInput()
            menuEl.style.display = 'none'
            const editor = rteRef.current
            if (editor && typeof editor.focusIn === 'function') {
              editor.focusIn()
            }
          } else if (e.key === 'Escape') {
            menuEl.style.display = 'none'
            input.blur()
          }
        }

        input.onblur = () => {
          commitInput()
        }
      })
    }

    const interval = setInterval(setupPickerEvents, 300)

    // Sync input value with current selection font size
    const handleSelectionSync = () => {
      const editor = rteRef.current
      if (!editor) return

      const activeInp = document.activeElement
      if (activeInp && activeInp.classList.contains('word-fontsize-input')) {
        return
      }

      const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
      const sel = doc ? doc.getSelection() : window.getSelection()
      if (!sel || !sel.rangeCount) return

      savedEditorRangeRef.current = sel.getRangeAt(0).cloneRange()

      let node = sel.getRangeAt(0).startContainer
      if (node && node.nodeType === 3) node = node.parentNode
      if (!node) return

      const win = doc?.defaultView || window
      let ptNum = ''

      const elWithInline = node.closest ? node.closest('[style*="font-size"]') : null
      if (elWithInline && elWithInline.style?.fontSize) {
        const fs = elWithInline.style.fontSize
        if (fs.endsWith('pt')) ptNum = String(parseFloat(fs))
        else if (fs.endsWith('px')) ptNum = String(Math.round(parseFloat(fs) * 0.75))
      }

      if (!ptNum && win.getComputedStyle) {
        try {
          const comp = win.getComputedStyle(node).fontSize
          if (comp) {
            if (comp.endsWith('px')) ptNum = String(Math.round(parseFloat(comp) * 0.75))
            else if (comp.endsWith('pt')) ptNum = String(parseFloat(comp))
          }
        } catch (e) {}
      }

      // Default fallback is always 12pt Times New Roman standard
      if (!ptNum || isNaN(parseFloat(ptNum))) {
        ptNum = '12'
      }

      const inputs = document.querySelectorAll('.word-fontsize-input')
      inputs.forEach(inp => {
        if (document.activeElement !== inp) {
          inp.value = ptNum
        }
      })
    }

    // Delegated click on Syncfusion Line Height dropdown list item
    const handleLineHeightDropdownClick = (e) => {
      const item = e.target.closest('.e-dropdown-popup li.e-item, .e-dropdown-popup .e-item')
      if (!item) return
      const text = item.textContent?.trim()
      const heights = ['Default', '1', '1.15', '1.5', '2', '2.5', '3']
      if (heights.includes(text)) {
        const popup = item.closest('.e-dropdown-popup')
        const activeBtn = document.querySelector('.e-toolbar-item button[id*="LineHeight"].e-active, .e-toolbar-item button[id*="lineheight"].e-active')
        const isLineHeight = activeBtn || (popup && popup.id && popup.id.toLowerCase().includes('lineheight'))
        if (isLineHeight || heights.slice(1).includes(text)) {
          const val = text === 'Default' ? '' : text
          applySelectedLineHeight(val)
        }
      }
    }

    // Global Ctrl+Z / Ctrl+Y undo/redo shortcut handler for Question Paper Editor
    const handleGlobalUndoRedo = (e) => {
      const active = document.activeElement
      // If user is typing in a native input/textarea outside the editor, preserve default browser behavior
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && !active.closest('.e-rte-content')) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        const editor = rteRef.current
        if (!editor) return
        e.preventDefault()
        e.stopPropagation()

        if (e.shiftKey) {
          // Redo
          try {
            if (editor.formatter?.editorManager?.undoRedoManager) {
              editor.formatter.editorManager.undoRedoManager.redo({
                callBack: () => {
                  if (editor.notify) editor.notify('contentChanged', {})
                  const p = editor.contentModule?.getEditPanel?.()
                  if (p) setEditorValue(p.innerHTML)
                }
              })
            } else if (editor.executeCommand) {
              editor.executeCommand('redo')
            }
          } catch (err) {
            console.warn('Global redo error:', err)
          }
        } else {
          // Undo
          try {
            if (editor.formatter?.editorManager?.undoRedoManager) {
              editor.formatter.editorManager.undoRedoManager.undo({
                callBack: () => {
                  if (editor.notify) editor.notify('contentChanged', {})
                  const p = editor.contentModule?.getEditPanel?.()
                  if (p) setEditorValue(p.innerHTML)
                }
              })
            } else if (editor.executeCommand) {
              editor.executeCommand('undo')
            }
          } catch (err) {
            console.warn('Global undo error:', err)
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && !active.closest('.e-rte-content')) {
          return
        }
        const editor = rteRef.current
        if (!editor) return
        e.preventDefault()
        e.stopPropagation()
        try {
          if (editor.formatter?.editorManager?.undoRedoManager) {
            editor.formatter.editorManager.undoRedoManager.redo({
              callBack: () => {
                if (editor.notify) editor.notify('contentChanged', {})
                const p = editor.contentModule?.getEditPanel?.()
                if (p) setEditorValue(p.innerHTML)
              }
            })
          } else if (editor.executeCommand) {
            editor.executeCommand('redo')
          }
        } catch (err) {
          console.warn('Global redo error:', err)
        }
      }
    }

    document.addEventListener('keydown', handleGlobalUndoRedo, true)
    document.addEventListener('click', handleLineHeightDropdownClick, true)
    document.addEventListener('selectionchange', handleSelectionSync)
    document.addEventListener('mouseup', handleSelectionSync)
    document.addEventListener('keyup', handleSelectionSync)

    return () => {
      clearInterval(interval)
      menuEl.removeEventListener('mousedown', handleMenuMouseDown)
      menuEl.removeEventListener('click', handleMenuClick)
      document.removeEventListener('keydown', handleGlobalUndoRedo, true)
      document.removeEventListener('click', handleLineHeightDropdownClick, true)
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('selectionchange', handleSelectionSync)
      document.removeEventListener('mouseup', handleSelectionSync)
      document.removeEventListener('keyup', handleSelectionSync)
      if (menuEl && menuEl.parentNode) {
        menuEl.parentNode.removeChild(menuEl)
      }
    }
  }, [applyCustomFontSize])

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

  // Close AI menus when clicking outside
  useEffect(() => {
    if (!showAiMenu && !showFloatingAiMenu) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('.ai-command-menu') && !e.target.closest('#ai-commands-btn') && !e.target.closest('#floating-ai-assistant-btn')) {
        setShowAiMenu(false)
        setShowFloatingAiMenu(false)
        setActiveAiSubmenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    const editorDoc = rteRef.current?.contentModule?.getDocument()
    if (editorDoc) {
      try {
        editorDoc.addEventListener('mousedown', handleClickOutside)
      } catch (err) {}
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (editorDoc) {
        try {
          editorDoc.removeEventListener('mousedown', handleClickOutside)
        } catch (err) {}
      }
    }
  }, [showAiMenu, showFloatingAiMenu])

  // Helpers for Selection-based AI Tag Verifier
  const getConfidenceBadgeClass = useCallback((confidence = 0) => {
    if (confidence >= 0.7) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (confidence >= 0.4) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }, [])

  const getCoDescription = useCallback((code) => {
    if (!code) return ''
    const item = (coDetails || []).find(c => c && (c.code || c.id) && (c.code || c.id).toUpperCase() === code.toUpperCase())
    if (item && item.description) return item.description
    const rankItem = aiVerifyResult?.co?.rankings?.find(r => r && r.code && r.code.toUpperCase() === code.toUpperCase())
    if (rankItem && rankItem.description) return rankItem.description
    if (aiVerifyResult?.co?.description) return aiVerifyResult.co.description
    return `Course Outcome ${code}`
  }, [coDetails, aiVerifyResult])

  const calculateClampedPosition = useCallback((rect, isPopover = false) => {
    if (!rect) return { top: 60, left: 100 }
    const width = isPopover ? 430 : 256
    const height = isPopover ? 520 : 42
    const pad = 16

    const iframe = document.querySelector('.e-rte-content iframe, iframe.e-rte-frame')
    let iframeLeft = 0
    let iframeTop = 0
    if (iframe) {
      const ifRect = iframe.getBoundingClientRect()
      iframeLeft = ifRect.left
      iframeTop = ifRect.top
    }

    let left = 0
    let top = 0

    if (isPopover) {
      const rightSpace = window.innerWidth - (rect.right + iframeLeft)
      if (rightSpace >= 450) {
        left = rect.right + iframeLeft + 20
      } else if (rect.left + iframeLeft >= 450) {
        left = rect.left + iframeLeft - 430 - 20
      } else {
        left = rect.left + iframeLeft + (rect.width / 2) - (430 / 2)
      }
      left = Math.max(pad, Math.min(window.innerWidth - 430 - pad, left))
      top = rect.top + iframeTop - 10
      top = Math.max(pad, Math.min(window.innerHeight - 520 - pad, top))
    } else {
      // Position to the side of the selection so the question text is NOT covered
      const rightSpace = window.innerWidth - (rect.right + iframeLeft)
      if (rightSpace >= 280) {
        // Generous room to the right of the selected text
        left = rect.right + iframeLeft + 24
      } else if (rect.left + iframeLeft >= 280) {
        // Room to the left of the selected text
        left = rect.left + iframeLeft - 180
      } else {
        // Fallback: place towards the right edge of viewport with padding
        left = window.innerWidth - 200
      }
      // Ensure the centered 256px menu won't overflow screen left/right
      left = Math.max(140, Math.min(window.innerWidth - 150, left))

      // Align vertically with the question line
      top = rect.top + iframeTop - 4
      top = Math.max(50, Math.min(window.innerHeight - 80, top))
    }

    return { top, left }
  }, [])

  const handleCloseAiVerify = useCallback(() => {
    setShowAiVerifyPopover(false)
    setShowFloatingAiMenu(false)
    setIsContextMenuTriggered(false)
    showFloatingAiMenuRef.current = false
    isContextMenuTriggeredRef.current = false
    setAiVerifySelection(null)
    setAiVerifyResult(null)
    setAiVerifySuccessMsg('')
    setPopoverPos(null)
    setFloatingBtnPos(null)
    userMovedFloatingBtnRef.current = false
  }, [])



  const handleDragStart = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return
    e.preventDefault()
    e.stopPropagation()

    isDraggingRef.current = true
    const currentLeft = popoverPos?.left ?? 100
    const currentTop = popoverPos?.top ?? 60
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: currentLeft,
      initialTop: currentTop
    }

    const handleMouseMove = (moveEv) => {
      if (!isDraggingRef.current) return
      const dx = moveEv.clientX - dragStartRef.current.startX
      const dy = moveEv.clientY - dragStartRef.current.startY
      const width = 430
      const height = 520
      const pad = 8

      const newLeft = Math.max(pad, Math.min(window.innerWidth - width - pad, dragStartRef.current.initialLeft + dx))
      const newTop = Math.max(pad, Math.min(window.innerHeight - height - pad, dragStartRef.current.initialTop + dy))

      setPopoverPos({ left: newLeft, top: newTop })
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [popoverPos])

  // Listen for text selection inside the Question Paper Content editor / table cells
  useEffect(() => {
    let selectionTimeout = null

    const handleSelectionCheck = () => {
      if (showFloatingAiMenuRef.current || isContextMenuTriggeredRef.current || showAiVerifyPopoverRef.current || isDraggingBtnRef.current) {
        return
      }
      clearTimeout(selectionTimeout)
      selectionTimeout = setTimeout(() => {
        if (showFloatingAiMenuRef.current || isContextMenuTriggeredRef.current || showAiVerifyPopoverRef.current || isDraggingBtnRef.current) {
          return
        }


        const editor = rteRef.current
        if (!editor) return

        const editorDoc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
        const sel = (editorDoc && editorDoc.getSelection) ? editorDoc.getSelection() : window.getSelection()

        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setAiVerifySelection(null)
          userMovedFloatingBtnRef.current = false
          setFloatingBtnPos(null)
          return
        }

        const text = sel.toString().trim()
        if (text.length <= 10) {
          setAiVerifySelection(null)
          userMovedFloatingBtnRef.current = false
          setFloatingBtnPos(null)
          return
        }

        const range = sel.getRangeAt(0)
        const common = range.commonAncestorContainer
        const editPanel = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : document.querySelector('.e-rte-content .e-content')

        if (!editPanel || (!editPanel.contains(common) && editPanel !== common)) {
          setAiVerifySelection(null)
          userMovedFloatingBtnRef.current = false
          setFloatingBtnPos(null)
          return
        }

        // Identify target container element (cell or paragraph)
        let container = common.nodeType === Node.ELEMENT_NODE ? common : common.parentElement
        while (container && container !== editPanel && !['TD', 'TH', 'P', 'LI', 'DIV'].includes(container.tagName)) {
          container = container.parentElement
        }

        // Try to identify target question number (e.g. Q1, Q2)
        let qNumStr = null
        let qIndex = null

        const tr = container ? container.closest('tr') : null
        if (tr) {
          let curr = tr
          while (curr) {
            const firstCol = curr.querySelector('td')
            const textContent = firstCol ? firstCol.textContent.trim() : ''
            const match = textContent.match(/^(?:Q\s*)?(\d+)/i)
            if (match) {
              const num = parseInt(match[1])
              qNumStr = `Q${num}`
              qIndex = num - 1
              break
            }
            curr = curr.previousElementSibling
          }
        }

        if (!qNumStr && container) {
          const match = container.textContent.trim().match(/^(?:Q(?:uestion)?\s*(\d+)|\b(\d+)[\.\)])/i)
          if (match) {
            const num = parseInt(match[1] || match[2])
            qNumStr = `Q${num}`
            qIndex = num - 1
          }
        }

        // Extract existing tag from container if present
        let existingCo = null
        let existingBloom = null
        const cellOrContainer = container ? (container.closest('td, li, p') || container) : null
        const tagSpan = cellOrContainer ? cellOrContainer.querySelector('.co-bloom-tag') : null
        if (tagSpan) {
          const spanText = tagSpan.textContent || ''
          const coMatch = spanText.match(/CO\d+/i)
          const bloomMatch = spanText.match(/C[1-6]/i)
          if (coMatch) existingCo = coMatch[0].toUpperCase()
          if (bloomMatch) existingBloom = bloomMatch[0].toUpperCase()
        } else if (cellOrContainer) {
          const rawMatch = cellOrContainer.textContent.match(/\[(?:(CO\d+))?(?:\s*(?:->|→)\s*)?(C[1-6])?\]/i)
          if (rawMatch) {
            if (rawMatch[1]) existingCo = rawMatch[1].toUpperCase()
            if (rawMatch[2]) existingBloom = rawMatch[2].toUpperCase()
          }
        }

        // Compute floating coordinates with strict viewport clamping
        const rect = range.getBoundingClientRect()
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          setAiVerifySelection(null)
          userMovedFloatingBtnRef.current = false
          setFloatingBtnPos(null)
          return
        }

        const btnPos = calculateClampedPosition(rect, false)
        if (!userMovedFloatingBtnRef.current) {
          setFloatingBtnPos(btnPos)
        }

        lastSelectionRangeRef.current = range.cloneRange()
        setAiVerifySelection({
          selectedText: text,
          position: userMovedFloatingBtnRef.current && floatingBtnPos ? floatingBtnPos : btnPos,
          targetInfo: {
            containerElement: container,
            questionNumber: qNumStr,
            questionIndex: qIndex,

            existingCo,
            existingBloom,
            tagSpan
          }
        })
      }, 180)
    }

    const handleClickOutsideVerify = (e) => {
      // Don't close on right-click (button 2)
      if (e.button === 2) return
      if (isDraggingRef.current || isDraggingBtnRef.current) return
      if (aiVerifyPopoverRef.current && aiVerifyPopoverRef.current.contains(e.target)) {
        return
      }
      if (e.target && e.target.closest && (
        e.target.closest('#floating-ai-assistant-wrapper') ||
        e.target.closest('#floating-ai-assistant-btn') ||
        e.target.closest('.ai-command-menu') ||
        e.target.closest('#ai-commands-btn') ||
        e.target.closest('.e-toolbar') ||
        e.target.closest('.word-fontsize-wrapper') ||
        e.target.closest('#word-fontsize-menu')
      )) {
        return
      }
      handleCloseAiVerify()
    }

    const handleKeyDownVerify = (e) => {
      if (e.key === 'Escape') {
        handleCloseAiVerify()
      }
    }

    const handleContextMenu = (e) => {
      const editor = rteRef.current
      if (!editor) return
      const editPanel = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : document.querySelector('.e-rte-content .e-content')
      const rteWrapper = document.querySelector('.e-richtexteditor')

      // Only trigger if right-clicked inside the editor content or wrapper
      const isInside = (editPanel && (editPanel.contains(e.target) || editPanel === e.target)) ||
                       (rteWrapper && (rteWrapper.contains(e.target) || rteWrapper === e.target))
      if (!isInside) return

      e.preventDefault()
      e.stopPropagation()

      // Position caret precisely where user right-clicked so insertion target is accurate!
      try {
        const doc = e.target.ownerDocument || document
        if (doc.caretRangeFromPoint) {
          const clickRange = doc.caretRangeFromPoint(e.clientX, e.clientY)
          if (clickRange && editPanel && editPanel.contains(clickRange.commonAncestorContainer)) {
            const sel = doc.getSelection ? doc.getSelection() : window.getSelection()
            sel.removeAllRanges()
            sel.addRange(clickRange)
            savedEditorRangeRef.current = clickRange.cloneRange()
            savedDiagramRangeRef.current = clickRange.cloneRange()
          }
        } else if (doc.caretPositionFromPoint) {
          const pos = doc.caretPositionFromPoint(e.clientX, e.clientY)
          if (pos && pos.offsetNode && editPanel && editPanel.contains(pos.offsetNode)) {
            const clickRange = doc.createRange()
            clickRange.setStart(pos.offsetNode, pos.offset)
            clickRange.collapse(true)
            const sel = doc.getSelection ? doc.getSelection() : window.getSelection()
            sel.removeAllRanges()
            sel.addRange(clickRange)
            savedEditorRangeRef.current = clickRange.cloneRange()
            savedDiagramRangeRef.current = clickRange.cloneRange()
          }
        }
      } catch (err) {}

      // Calculate coordinates: only add iframe offset if event was dispatched inside an iframe document
      let clientX = e.clientX
      let clientY = e.clientY

      if (e.target.ownerDocument && e.target.ownerDocument !== document) {
        const iframe = document.querySelector('.e-rte-content iframe, iframe.e-rte-frame, .e-richtexteditor iframe')
        if (iframe) {
          const ifRect = iframe.getBoundingClientRect()
          clientX += ifRect.left
          clientY += ifRect.top
        }
      }

      const menuWidth = 260
      const menuHeight = 360
      const pad = 16

      let left = clientX
      let top = clientY

      // Clamp horizontally so menu doesn't overflow right edge
      if (left + menuWidth > window.innerWidth - pad) {
        left = window.innerWidth - menuWidth - pad
      }
      left = Math.max(pad, left)

      // Clamp vertically so menu doesn't overflow bottom edge
      if (top + menuHeight > window.innerHeight - pad) {
        top = window.innerHeight - menuHeight - pad
      }
      top = Math.max(pad, top)

      const targetPos = { left, top }
      setFloatingBtnPos(targetPos)
      userMovedFloatingBtnRef.current = true
      isContextMenuTriggeredRef.current = true
      showFloatingAiMenuRef.current = true
      setIsContextMenuTriggered(true)
      setShowFloatingAiMenu(true)
      setShowAiVerifyPopover(false)
    }


    document.addEventListener('mouseup', handleSelectionCheck)
    document.addEventListener('keyup', handleSelectionCheck)
    document.addEventListener('selectionchange', handleSelectionCheck)
    document.addEventListener('mousedown', handleClickOutsideVerify)
    document.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleKeyDownVerify)

    const editorDoc = rteRef.current?.contentModule?.getDocument ? rteRef.current.contentModule.getDocument() : null
    if (editorDoc && editorDoc !== document) {
      try {
        editorDoc.addEventListener('mouseup', handleSelectionCheck)
        editorDoc.addEventListener('keyup', handleSelectionCheck)
        editorDoc.addEventListener('selectionchange', handleSelectionCheck)
        editorDoc.addEventListener('mousedown', handleClickOutsideVerify)
        editorDoc.addEventListener('contextmenu', handleContextMenu)
        editorDoc.addEventListener('keydown', handleKeyDownVerify)
      } catch (err) {}
    }

    return () => {
      clearTimeout(selectionTimeout)
      document.removeEventListener('mouseup', handleSelectionCheck)
      document.removeEventListener('keyup', handleSelectionCheck)
      document.removeEventListener('selectionchange', handleSelectionCheck)
      document.removeEventListener('mousedown', handleClickOutsideVerify)
      document.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleKeyDownVerify)
      if (editorDoc && editorDoc !== document) {
        try {
          editorDoc.removeEventListener('mouseup', handleSelectionCheck)
          editorDoc.removeEventListener('keyup', handleSelectionCheck)
          editorDoc.removeEventListener('selectionchange', handleSelectionCheck)
          editorDoc.removeEventListener('mousedown', handleClickOutsideVerify)
          editorDoc.removeEventListener('contextmenu', handleContextMenu)
          editorDoc.removeEventListener('keydown', handleKeyDownVerify)
        } catch (err) {}
      }
    }

  }, [handleCloseAiVerify, calculateClampedPosition])

  // Trigger AI metadata analysis from local NLP microservice
  const handleTriggerAiVerify = useCallback(async () => {
    let selText = aiVerifySelection?.selectedText || ''
    let rect = null
    let range = null

    if (rteRef.current) {
      const editorDoc = rteRef.current.contentModule?.getDocument ? rteRef.current.contentModule.getDocument() : null
      const sel = (editorDoc && editorDoc.getSelection) ? editorDoc.getSelection() : window.getSelection()
      if (sel && sel.rangeCount > 0) {
        range = sel.getRangeAt(0)
        const rangeText = sel.toString().trim()
        if (rangeText) selText = rangeText
        rect = range.getBoundingClientRect()
      }
    }

    if (!selText) {
      showNotification('Please select a question or line of text first to verify its CO & Bloom level.', 'warning')
      return
    }

    setShowFloatingAiMenu(false)
    setShowAiMenu(false)

    // Immediately compute perfectly clamped coordinates for the expanded popover card
    const targetRect = rect || (lastSelectionRangeRef.current ? lastSelectionRangeRef.current.getBoundingClientRect() : null)
    const cardPos = calculateClampedPosition(targetRect, true)
    setPopoverPos(cardPos)

    // Ensure targetInfo is properly parsed if aiVerifySelection was null (e.g. after closing via X button)
    let targetInfo = aiVerifySelection?.targetInfo || null
    if (!targetInfo && range) {
      try {
        const common = range.commonAncestorContainer
        const editPanel = rteRef.current?.contentModule?.getEditPanel ? rteRef.current.contentModule.getEditPanel() : document.querySelector('.e-rte-content .e-content')
        let container = common.nodeType === Node.ELEMENT_NODE ? common : common.parentElement
        while (container && container !== editPanel && !['TD', 'TH', 'P', 'LI', 'DIV'].includes(container.tagName)) {
          container = container.parentElement
        }

        let qNumStr = null
        let qIndex = null

        const tr = container ? container.closest('tr') : null
        if (tr) {
          let curr = tr
          while (curr) {
            const firstCol = curr.querySelector('td')
            const textContent = firstCol ? firstCol.textContent.trim() : ''
            const match = textContent.match(/^(?:Q\s*)?(\d+)/i)
            if (match) {
              const num = parseInt(match[1])
              qNumStr = `Q${num}`
              qIndex = num - 1
              break
            }
            curr = curr.previousElementSibling
          }
        }

        if (!qNumStr && container) {
          const match = container.textContent.trim().match(/^(?:Q(?:uestion)?\s*(\d+)|\b(\d+)[\.\)])/i)
          if (match) {
            const num = parseInt(match[1] || match[2])
            qNumStr = `Q${num}`
            qIndex = num - 1
          }
        }

        let existingCo = null
        let existingBloom = null
        const cellOrContainer = container ? (container.closest('td, li, p') || container) : null
        const tagSpan = cellOrContainer ? cellOrContainer.querySelector('.co-bloom-tag') : null
        if (tagSpan) {
          const spanText = tagSpan.textContent || ''
          const coMatch = spanText.match(/CO\d+/i)
          const bloomMatch = spanText.match(/C[1-6]/i)
          if (coMatch) existingCo = coMatch[0].toUpperCase()
          if (bloomMatch) existingBloom = bloomMatch[0].toUpperCase()
        } else if (cellOrContainer) {
          const rawMatch = cellOrContainer.textContent.match(/\[(?:(CO\d+))?(?:\s*(?:->|→)\s*)?(C[1-6])?\]/i)
          if (rawMatch) {
            if (rawMatch[1]) existingCo = rawMatch[1].toUpperCase()
            if (rawMatch[2]) existingBloom = rawMatch[2].toUpperCase()
          }
        }

        targetInfo = {
          containerElement: container,
          questionNumber: qNumStr,
          questionIndex: qIndex,
          existingCo,
          existingBloom,
          tagSpan
        }
      } catch (err) {
        console.warn('Error resolving targetInfo in handleTriggerAiVerify:', err)
      }
    }

    if (!targetInfo) {
      targetInfo = {
        containerElement: null,
        questionNumber: null,
        questionIndex: null,
        existingCo: null,
        existingBloom: null,
        tagSpan: null
      }
    }

    // Always guarantee valid aiVerifySelection object before rendering popover
    setAiVerifySelection({
      selectedText: selText,
      position: cardPos,
      targetInfo
    })

    setShowAiVerifyPopover(true)
    setAiVerifyLoading(true)
    setAiVerifyResult(null)
    setAiVerifySuccessMsg('')

    try {
      const outcomesPayload = (coDetails && coDetails.length > 0)
        ? coDetails
        : availableCOs.map(c => ({ code: c, description: `Course Outcome description for ${offering?.course?.title || c}` }))

      const data = await apiService.suggestMetadata(
        {
          questionText: selText,
          courseOutcomes: outcomesPayload
        },
        {
          onProgress: (info) => {
            if (info?.isComplete) {
              setAiWarmingInfo(null)
            } else {
              setAiWarmingInfo(info)
            }
          }
        }
      )

      if (data && data.success) {
        setAiVerifyResult({
          bloom: data.bloom,
          co: data.co
        })
      } else {
        showNotification(data?.message || 'Failed to analyze question with OBE AI Engine.', 'error')
        setShowAiVerifyPopover(false)
      }
    } catch (err) {
      console.error('AI Verify error:', err)
      showNotification('Failed to connect to AI metadata verification service: ' + err.message, 'error')
      setShowAiVerifyPopover(false)
    } finally {
      setAiVerifyLoading(false)
      setAiWarmingInfo(null)
    }
  }, [aiVerifySelection, calculateClampedPosition, coDetails, availableCOs, offering, showNotification, mlStatus, wakeUpMLService])

  // Helper: Trigger AI Tag Verifier for newly inserted suggested question text
  const triggerAiVerifyForText = useCallback(async (text, rect = null) => {
    if (!text) return
    const btnPos = calculateClampedPosition(rect, false)
    setFloatingBtnPos(btnPos)
    const cardPos = calculateClampedPosition(rect, true)
    setPopoverPos(cardPos)

    const selObj = {
      selectedText: text,
      position: btnPos,
      targetInfo: {
        questionNumber: null,
        existingCo: null,
        existingBloom: null
      }
    }
    setAiVerifySelection(selObj)
    setShowAiVerifyPopover(true)
    setAiVerifyLoading(true)
    setAiVerifyResult(null)
    setAiVerifySuccessMsg('')

    try {
      const outcomesPayload = (coDetails && coDetails.length > 0)
        ? coDetails
        : availableCOs.map(c => ({ code: c, description: `Course Outcome description for ${offering?.course?.title || c}` }))

      const data = await apiService.suggestMetadata(
        {
          questionText: text,
          courseOutcomes: outcomesPayload
        },
        {
          onProgress: (info) => {
            if (info?.isComplete) {
              setAiWarmingInfo(null)
            } else {
              setAiWarmingInfo(info)
            }
          }
        }
      )

      if (data && data.success) {
        setAiVerifyResult({
          bloom: data.bloom,
          co: data.co
        })
      }
    } catch (err) {
      console.warn('Auto AI Verify error on note insert:', err)
    } finally {
      setAiVerifyLoading(false)
      setAiWarmingInfo(null)
    }
  }, [calculateClampedPosition, coDetails, availableCOs, offering, showNotification, mlStatus, wakeUpMLService])

  // Fetch reference notes status for current course on load (shared across sections of same course)
  const refreshNotesStatus = useCallback(() => {
    if (notesCourseId) {
      const cached = getCachedNotesStatus(notesCourseId)
      if (cached && cached.hasNotes) {
        setNotesStatusInfo(cached)
      }
      getNotesStatus(notesCourseId).then(data => {
        if (data && typeof data === 'object') {
          setNotesStatusInfo(data)
        }
      }).catch(err => {
        console.warn('Failed to load notes status:', err)
        setNotesStatusInfo(getCachedNotesStatus(notesCourseId))
      })
    }
  }, [notesCourseId])

  useEffect(() => {
    refreshNotesStatus()
  }, [refreshNotesStatus])

  // Auto-retry fetching notes if not yet loaded (handles ML service still booting up)
  useEffect(() => {
    if (notesStatusInfo?.hasNotes || !notesCourseId) return

    const timer1 = setTimeout(() => {
      refreshNotesStatus()
    }, 2000)

    const timer2 = setTimeout(() => {
      refreshNotesStatus()
    }, 5000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [notesCourseId, notesStatusInfo?.hasNotes, refreshNotesStatus])

  useEffect(() => {
    const handleNotesUpdated = (e) => {
      if (!e.detail?.courseId || e.detail.courseId === notesCourseId) {
        refreshNotesStatus()
      }
    }
    const handleFocus = () => {
      refreshNotesStatus()
    }
    window.addEventListener('teacher_notes_updated', handleNotesUpdated)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('teacher_notes_updated', handleNotesUpdated)
      window.removeEventListener('focus', handleFocus)
    }
  }, [notesCourseId, refreshNotesStatus])

  // Background Auto-Sync: If client LocalStorage or IndexedDB has notes but server restarted, silently re-sync
  useEffect(() => {
    if (notesCourseId && notesStatusInfo?.hasNotes) {
      syncNotesBlobToBackend(notesCourseId).catch(() => {})
    }
  }, [notesCourseId, notesStatusInfo?.hasNotes])

  // Real-time debounced typing listener (300ms) for Teacher's Reference Notes Question Auto-Suggestion
  // Dual-Layer Optimization: Manual toggle gate (Layer 1) + Debounce & AbortController (Layer 2)
  useEffect(() => {
    if (!notesStatusInfo?.hasNotes || !isLiveSuggestActive) return

    const executeSuggestQuery = async () => {
      const activeEl = document.activeElement
      let activeLineText = ''
      let currentPrefix = ''
      let targetObj = null

      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        if (activeEl.type === 'number' || activeEl.type === 'password') return
        activeLineText = (activeEl.value || '').trim()
        targetObj = { type: 'element', element: activeEl }
      } else {
        const editor = rteRef.current
        if (editor) {
          const editorDoc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
          const sel = (editorDoc && editorDoc.getSelection) ? editorDoc.getSelection() : window.getSelection()
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0)
            const node = range.startContainer

            if (node.nodeType === Node.TEXT_NODE) {
              const fullText = node.textContent || ''
              const beforeCursor = fullText.slice(0, range.startOffset ?? fullText.length)
              const lastBreak = Math.max(beforeCursor.lastIndexOf('\n'), beforeCursor.lastIndexOf('\r'))
              activeLineText = (lastBreak >= 0 ? beforeCursor.slice(lastBreak + 1) : beforeCursor).trim()
              if (!activeLineText) activeLineText = fullText.trim()
              targetObj = { type: 'rteNode', node, range: range.cloneRange() }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              let targetNode = node
              if (node.childNodes && node.childNodes.length > 0) {
                const childIdx = Math.min(range.startOffset, node.childNodes.length - 1)
                const child = node.childNodes[childIdx]
                if (child) {
                  targetNode = child
                }
              }
              const block = targetNode.closest ? targetNode.closest('p, li, td, th, h1, h2, h3, h4, h5, h6, blockquote') : null
              const elToRead = (block && !block.classList?.contains('e-content')) ? block : targetNode
              const rawText = elToRead.textContent || ''
              const lines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean)
              activeLineText = lines[lines.length - 1] || rawText.trim()
              targetObj = { type: 'rteNode', node: targetNode, range: range.cloneRange() }
            }
          }
        }
      }

      // Detect and isolate question marker (e.g. "12 ", "3. ", "Q2: ", "a) ", "1.b) ")
      const prefixMatch = activeLineText.match(/^(\s*(?:(?:Question|Que|Prob|Problem|Q)\s*(?:#|\.)?\s*\d+[:\.\s]|\d+(?:\.\d+)*\s*[-—–]\s*(?:NEW|OLD|REVISED)\s*|\d+[\.\)]\s*|\d+\s+|\([a-zA-Z0-9]+\)\s*|[a-zA-Z][\.\)]\s*))\s*/i)
      if (prefixMatch) {
        currentPrefix = prefixMatch[1].trim()
        activeLineText = activeLineText.slice(prefixMatch[0].length).trim()
      }

      if (targetObj) {
        targetObj.currentPrefix = currentPrefix
        targetObj.queryText = activeLineText

        // Capture current active font family, font size, and color directly from typing position
        try {
          const editorDoc = rteRef.current?.contentModule?.getDocument ? rteRef.current.contentModule.getDocument() : document
          const win = editorDoc?.defaultView || window
          const activeElem = targetObj.node?.nodeType === Node.ELEMENT_NODE ? targetObj.node : targetObj.node?.parentElement
          if (activeElem) {
            const comp = win.getComputedStyle(activeElem)
            targetObj.fontSize = comp.fontSize || '12pt'
            targetObj.fontFamily = comp.fontFamily || "'Times New Roman', Times, serif"
            targetObj.color = comp.color || '#000000'
            targetObj.lineHeight = comp.lineHeight || '1.5'
          }
        } catch (e) {}
      }

      // Allow keyword queries with at least 2 characters (e.g. 'what', 'how', 'explain', 'oop', 'class')
      if (!activeLineText || activeLineText.length < 2) {
        setActiveNoteSuggestions([])
        setShowAllSuggestions(false)
        return
      }

      // Abort previous in-flight request before dispatching a new one
      suggestAbortRef.current?.abort()
      suggestAbortRef.current = new AbortController()

      // Monotonic request ID counter for race condition prevention
      const thisRequestId = ++suggestRequestIdRef.current

      try {
        const suggestions = await suggestQuestionsFromNotes(
          notesCourseId,
          activeLineText,
          20,
          suggestAbortRef.current.signal
        )

        // Stale response guard: ensure only the latest request updates the UI
        if (thisRequestId !== suggestRequestIdRef.current) return

        if (suggestions && suggestions.length > 0) {
          setActiveNoteSuggestions(suggestions)
          setActiveInputTarget(targetObj)
        } else {
          setActiveNoteSuggestions([])
          setShowAllSuggestions(false)
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('Reference notes suggest error:', err)
      }
    }

    const handleTypingQuery = (e) => {
      if (e?.key === 'Escape') {
        setActiveNoteSuggestions([])
        setShowAllSuggestions(false)
        return
      }

      clearTimeout(noteDebounceTimerRef.current)
      noteDebounceTimerRef.current = setTimeout(executeSuggestQuery, 300)
    }

    // Immediately check and fetch suggestions for currently active line when Live is toggled ON
    executeSuggestQuery()

    // Attach listeners with capture across document, window, editorDoc, and editPanel
    const attachedTargets = []
    const addListener = (target) => {
      if (!target || typeof target.addEventListener !== 'function') return
      try {
        target.addEventListener('keyup', handleTypingQuery, true)
        target.addEventListener('input', handleTypingQuery, true)
        attachedTargets.push(target)
      } catch (e) {}
    }

    addListener(document)
    addListener(window)

    const editor = rteRef.current
    const editorDoc = editor?.contentModule?.getDocument ? editor.contentModule.getDocument() : null
    if (editorDoc && editorDoc !== document) {
      addListener(editorDoc)
    }

    const editPanel = editor?.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
    if (editPanel) {
      addListener(editPanel)
    }

    const domPanels = document.querySelectorAll('.e-rte-content .e-content, .e-rte-content iframe')
    domPanels.forEach(p => {
      addListener(p)
      if (p.tagName === 'IFRAME' && p.contentDocument) {
        addListener(p.contentDocument)
      }
    })

    // Safety interval to ensure listeners stay attached if view switches (e.g. fullscreen toggle)
    const listenerSyncInterval = setInterval(() => {
      const currentEditPanel = rteRef.current?.contentModule?.getEditPanel ? rteRef.current.contentModule.getEditPanel() : null
      if (currentEditPanel && !attachedTargets.includes(currentEditPanel)) {
        addListener(currentEditPanel)
      }
    }, 1500)

    return () => {
      clearInterval(listenerSyncInterval)
      clearTimeout(noteDebounceTimerRef.current)
      suggestAbortRef.current?.abort()
      attachedTargets.forEach(target => {
        try {
          target.removeEventListener('keyup', handleTypingQuery, true)
          target.removeEventListener('input', handleTypingQuery, true)
        } catch (e) {}
      })
    }
  }, [notesStatusInfo, notesCourseId, isLiveSuggestActive])

  // Layer 1 Cleanup: Immediately clear suggestions and cancel pending fetch when Live Suggest is toggled OFF
  useEffect(() => {
    if (!isLiveSuggestActive) {
      clearTimeout(noteDebounceTimerRef.current)
      suggestAbortRef.current?.abort()
      setActiveNoteSuggestions([])
      setShowAllSuggestions(false)
    }
  }, [isLiveSuggestActive])

  // Handle "+ Insert Question" from reference notes sidebar panel & modal
  const handleInsertNoteSuggestion = (suggestion) => {
    if (!suggestion || !suggestion.questionText) return

    let cleanText = stripQuestionLeadingNumber(suggestion.questionText)

    // Parse scenario context and markdown table from the question
    const parsed = parseScenarioAndTable(suggestion.questionText)
    const effectiveQuestion = parsed.scenarioText ? parsed.questionText : cleanText
    const detected = detectEmbeddedCodeInQuestion(effectiveQuestion)

    let promptToInsert = detected.hasCode ? detected.promptText : effectiveQuestion
    if (activeInputTarget?.currentPrefix) {
      promptToInsert = `${activeInputTarget.currentPrefix} ${promptToInsert}`
    }

    // Determine target font styling (maintain 12pt Times New Roman standard)
    let targetFontSize = activeInputTarget?.fontSize || '12pt'
    if (targetFontSize === '13px' || targetFontSize === '14px') {
      targetFontSize = '12pt'
    }
    const targetFontFamily = activeInputTarget?.fontFamily || "'Times New Roman', Times, serif"
    const targetColor = activeInputTarget?.color || '#000000'
    const targetLineHeight = activeInputTarget?.lineHeight || '1.5'

    // Build scenario blockquote HTML if applicable
    const scenarioHtml = parsed.scenarioText
      ? `<blockquote style="margin:0 0 8px 0;padding:8px 14px;border-left:3px solid #6366f1;background:#eef2ff;font-family:${targetFontFamily};font-size:${targetFontSize};color:#312e81;line-height:${targetLineHeight};font-style:italic;">${parsed.scenarioText}</blockquote>`
      : ''

    // Build markdown table HTML if applicable
    const tableHtml = parsed.markdownTable ? markdownTableToHtml(parsed.markdownTable) : ''

    // 1. Fill or replace active HTML input / textarea
    if (activeInputTarget?.type === 'element' && activeInputTarget.element) {
      const el = activeInputTarget.element
      // For plain text inputs, concatenate scenario + question + table as plain text
      const fullContent = [
        parsed.scenarioText ? `[Scenario: ${parsed.scenarioText}]` : '',
        detected.hasCode ? `${promptToInsert}\n\n${detected.codeSnippet}` : promptToInsert,
      ].filter(Boolean).join('\n')
      el.value = fullContent
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      el.focus()
      setActiveNoteSuggestions([])
      setShowAllSuggestions(false)
      return
    }

    // 2. Rich Text Editor Insertion & Replacement
    const targetNode = activeInputTarget?.type === 'rteNode' ? activeInputTarget.node : null
    const codeHtml = detected.hasCode
      ? generateCodeSnippetHtml({
          code: detected.codeSnippet,
          language: detected.language || 'cpp',
          alignment: 'center',
          hasBorder: true,
          boxStyle: 'exam',
          showLineNumbers: false,
          fontSize: '11pt'
        })
      : ''

    let replacedDirectly = false

    if (targetNode && targetNode.isConnected) {
      try {
        const pEl = targetNode.nodeType === Node.TEXT_NODE ? targetNode.parentElement : targetNode
        const blockEl = pEl ? pEl.closest('p, div, td, th') : null

        if (blockEl && (blockEl.tagName === 'P' || blockEl.tagName === 'DIV')) {
          // Replace the paragraph where user typed query text (e.g. 'what will be')
          blockEl.style.fontFamily = targetFontFamily
          blockEl.style.fontSize = targetFontSize
          blockEl.style.color = targetColor
          blockEl.style.lineHeight = targetLineHeight
          blockEl.style.margin = '0 0 6px 0'

          // Insert scenario blockquote before the question if present
          if (scenarioHtml) {
            blockEl.insertAdjacentHTML('beforebegin', scenarioHtml)
          }

          blockEl.innerHTML = promptToInsert

          // Insert embedded table after the question if present
          if (tableHtml) {
            blockEl.insertAdjacentHTML('afterend', tableHtml)
          }

          if (detected.hasCode && codeHtml) {
            const insertAfter = tableHtml ? blockEl.nextElementSibling || blockEl : blockEl
            insertAfter.insertAdjacentHTML('afterend', codeHtml + `<p style="margin:0;padding:0;font-family:${targetFontFamily};font-size:${targetFontSize};"><br></p>`)
          }
          replacedDirectly = true
        } else if (blockEl && (blockEl.tagName === 'TD' || blockEl.tagName === 'TH')) {
          // Inside a table cell directly
          const newP = targetNode.ownerDocument.createElement('p')
          newP.style.fontFamily = targetFontFamily
          newP.style.fontSize = targetFontSize
          newP.style.color = targetColor
          newP.style.lineHeight = targetLineHeight
          newP.style.margin = '0 0 6px 0'
          newP.innerHTML = promptToInsert

          targetNode.parentNode.replaceChild(newP, targetNode)

          if (detected.hasCode && codeHtml) {
            newP.insertAdjacentHTML('afterend', codeHtml + `<p style="margin:0;padding:0;font-family:${targetFontFamily};font-size:${targetFontSize};"><br></p>`)
          }
          replacedDirectly = true
        }
      } catch (err) {
        console.warn('Direct node replace error, falling back to RTE insert:', err)
        replacedDirectly = false
      }
    }

    // 3. Fallback using RTE execution if direct DOM replacement didn't run
    if (!replacedDirectly && rteRef.current) {
      try {
        const editorDoc = rteRef.current.contentModule?.getDocument ? rteRef.current.contentModule.getDocument() : document
        const sel = editorDoc?.getSelection ? editorDoc.getSelection() : window.getSelection()

        // Delete previous typed text range if available
        if (activeInputTarget?.range && sel) {
          try {
            sel.removeAllRanges()
            sel.addRange(activeInputTarget.range)
            sel.deleteFromDocument()
          } catch (e) {}
        }

        const htmlToInsert = scenarioHtml +
          `<p style="font-family:${targetFontFamily};font-size:${targetFontSize};line-height:${targetLineHeight};color:${targetColor};margin:0 0 6px 0;">${promptToInsert}</p>` +
          tableHtml +
          (detected.hasCode ? codeHtml + `<p style="margin:0;padding:0;font-family:${targetFontFamily};font-size:${targetFontSize};"><br></p>` : '')

        rteRef.current.executeCommand('insertHTML', htmlToInsert)
      } catch (e) {
        console.warn('RTE fallback insert error:', e)
      }
    }

    // Sync RTE internal data & history
    if (rteRef.current?.formatter?.saveData) {
      rteRef.current.formatter.saveData()
    }
    if (rteRef.current?.refreshUI) {
      rteRef.current.refreshUI()
    }

    // 4. Clear suggestions
    setActiveNoteSuggestions([])
    setShowAllSuggestions(false)
  }


  // Draggable floating pill button & menu (press & hold to move, single click to toggle menu)
  const handleFloatingBtnMouseDown = useCallback((e) => {
    // Don't drag if clicking buttons inside menu
    if (e.target.closest('button') && !e.target.closest('#floating-ai-assistant-btn')) return

    e.stopPropagation()

    isDraggingBtnRef.current = true
    const currentLeft = floatingBtnPos?.left ?? aiVerifySelection?.position?.left ?? 100
    const currentTop = floatingBtnPos?.top ?? aiVerifySelection?.position?.top ?? 60
    btnDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: currentLeft,
      initialTop: currentTop,
      hasMoved: false
    }

    const handleMouseMove = (moveEv) => {
      if (!isDraggingBtnRef.current) return
      const dx = moveEv.clientX - btnDragStartRef.current.startX
      const dy = moveEv.clientY - btnDragStartRef.current.startY
      const dist = Math.hypot(dx, dy)

      // If user drags more than 3px, treat as dragging
      if (dist > 3) {
        moveEv.preventDefault()
        btnDragStartRef.current.hasMoved = true
        userMovedFloatingBtnRef.current = true
      }

      const minLeft = 16
      const maxLeft = window.innerWidth - 270
      const minTop = 16
      const maxTop = window.innerHeight - 80

      const newLeft = Math.max(minLeft, Math.min(maxLeft, btnDragStartRef.current.initialLeft + dx))
      const newTop = Math.max(minTop, Math.min(maxTop, btnDragStartRef.current.initialTop + dy))

      setFloatingBtnPos({ left: newLeft, top: newTop })
    }

    const handleMouseUp = () => {
      isDraggingBtnRef.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)

      if (btnDragStartRef.current.hasMoved) {
        // User dragged it somewhere: lock it in place until closed
        userMovedFloatingBtnRef.current = true
      }
    }


    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [floatingBtnPos, aiVerifySelection])


  // Granular In-Place Tag Replacement (Bloom, CO, or Both)
  const handleApplyAiTag = ({ applyCo = false, applyBloom = false }) => {
    if (!aiVerifyResult || !aiVerifySelection) return

    const targetInfo = aiVerifySelection?.targetInfo || {}
    const container = targetInfo.containerElement
    const qIndex = targetInfo.questionIndex

    const selectedQText = (aiVerifySelection?.selectedText || '').trim()

    // Determine CO to apply
    let finalCo = targetInfo.existingCo || (qIndex !== null && questions[qIndex] && questions[qIndex].co !== 'NONE' ? questions[qIndex].co : '')
    if (finalCo === 'NONE') finalCo = ''
    if (applyCo && aiVerifyResult.co?.suggested) {
      finalCo = aiVerifyResult.co.suggested.toUpperCase()
    }

    // Determine Bloom to apply
    let finalBloom = targetInfo.existingBloom || (qIndex !== null && questions[qIndex] ? questions[qIndex].bloom : '')
    if (applyBloom && aiVerifyResult.bloom?.suggested) {
      finalBloom = aiVerifyResult.bloom.suggested.toUpperCase()
    }

    // Build Tag String: e.g. [CO2→C4], [CO2], or [C4]
    let tagStr = ''
    if (finalCo && finalBloom) {
      tagStr = `[${finalCo}\u2192${finalBloom}]`
    } else if (finalCo) {
      tagStr = `[${finalCo}]`
    } else if (finalBloom) {
      tagStr = `[${finalBloom}]`
    }

    if (!tagStr) return

    const editor = rteRef.current
    const editPanel = editor?.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : document.querySelector('.e-rte-content .e-content')

    // 1. Immediately clear any active text selection in editor to prevent browser/Syncfusion from overwriting highlighted text
    try {
      const editorDoc = editor?.contentModule?.getDocument ? editor.contentModule.getDocument() : null
      const currentSel = (editorDoc && editorDoc.getSelection) ? editorDoc.getSelection() : window.getSelection()
      if (currentSel && currentSel.removeAllRanges) {
        currentSel.removeAllRanges()
      }
    } catch (e) {}

    // In-place HTML tag replacement inside question container / table cell
    if (editPanel) {
      // Find the target container cell or block element
      let contentCell = null

      if (container && editPanel.contains(container)) {
        // Check if inside a table row (the standard question paper layout)
        const tr = container.closest('tr')
        if (tr && editPanel.contains(tr)) {
          contentCell = tr.querySelector('td:nth-child(3), td[colspan="2"]') || tr.querySelectorAll('td')[tr.children.length - 2] || container.closest('td')
        }
        if (!contentCell) {
          contentCell = container.closest('td, th, li, p') || container
        }
      }

      // Fallback: If container is missing or outside editPanel, search editPanel for the question text
      if ((!contentCell || !editPanel.contains(contentCell) || contentCell === editPanel) && selectedQText) {
        const allRows = editPanel.querySelectorAll('tr')
        for (const tr of allRows) {
          if (tr.textContent && tr.textContent.includes(selectedQText)) {
            contentCell = tr.querySelector('td:nth-child(3), td[colspan="2"]') || tr.querySelectorAll('td')[tr.children.length - 2] || tr
            break
          }
        }
        if (!contentCell) {
          const allBlocks = editPanel.querySelectorAll('p, li, td, th, div')
          for (const el of allBlocks) {
            if (['P', 'LI', 'TD', 'TH'].includes(el.tagName) && el.textContent && el.textContent.includes(selectedQText)) {
              contentCell = el
              break
            }
          }
        }
      }

      if (contentCell && editPanel.contains(contentCell)) {
        // Tag HTML (bold font, clean spacing)
        const tagHtml = `<span class="co-bloom-tag" style="font-weight:bold;margin-left:6px;">${tagStr}</span>`

        const cleanManualTags = (str = '') => {
          return str
            .replace(/\s*<span[^>]*class=["']?[^"']*co-bloom-tag[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '')
            .replace(/\s*<(?:strong|b|span)[^>]*>\s*\[\s*(?:CO\d+)?(?:\s*(?:->|→|&rarr;|&#8594;|&minus;&gt;|,)\s*)?(?:C[1-6])?\s*\]\s*<\/(?:strong|b|span)>/gi, '')
            .replace(/\s*\[\s*<(?:strong|b|span)[^>]*>[^\]]*?(?:CO\d+|C[1-6])[^\]]*?<\/(?:strong|b|span)>\s*\]/gi, '')
            .replace(/\s*\[\s*(?:CO\d+)?(?:\s*(?:->|→|&rarr;|&#8594;|&minus;&gt;|,|\s|&nbsp;)*)?(?:C[1-6])?\s*\]/gi, '')
        }

        // 1. Check if the question content contains a code block, image, figure, or table
        const snippetOrMedia = contentCell.querySelector(
          '.obe-code-snippet-container, pre.obe-code-block, table.obe-code-table, img, .question-image, .math-equation-wrapper, svg'
        )

        if (snippetOrMedia) {
          // Find top-level block inside contentCell that contains or is the media/code
          let mediaTopBlock = snippetOrMedia
          while (mediaTopBlock.parentElement && mediaTopBlock.parentElement !== contentCell && mediaTopBlock.parentElement !== editPanel) {
            mediaTopBlock = mediaTopBlock.parentElement
          }

          // Clean all existing .co-bloom-tag elements everywhere in contentCell first
          contentCell.querySelectorAll('.co-bloom-tag').forEach(el => el.remove())

          // The tag MUST be placed right at the end of the question text BEFORE the code snippet/media!
          const prevElem = mediaTopBlock.previousElementSibling
          if (prevElem && ['P', 'DIV', 'LI', 'SPAN'].includes(prevElem.tagName)) {
            let inner = cleanManualTags(prevElem.innerHTML)
            inner = inner.replace(/(?:\s|&nbsp;|<br\s*\/?>)*$/i, '')
            prevElem.innerHTML = `${inner}&nbsp;${tagHtml}`
          } else {
            // No preceding element block, check if there are preceding text nodes or insert right before mediaTopBlock
            let prevNode = mediaTopBlock.previousSibling
            let inserted = false
            while (prevNode) {
              if (prevNode.nodeType === Node.TEXT_NODE && prevNode.textContent.trim().length > 0) {
                const cleanedText = cleanManualTags(prevNode.textContent).trimEnd()
                prevNode.textContent = cleanedText + ' '
                const span = document.createElement('span')
                span.className = 'co-bloom-tag'
                span.style.fontWeight = 'bold'
                span.style.marginLeft = '6px'
                span.textContent = tagStr
                if (prevNode.nextSibling) {
                  prevNode.parentNode.insertBefore(span, prevNode.nextSibling)
                } else {
                  prevNode.parentNode.appendChild(span)
                }
                inserted = true
                break
              }
              prevNode = prevNode.previousSibling
            }
            if (!inserted) {
              // Insert tag directly right before mediaTopBlock
              mediaTopBlock.insertAdjacentHTML('beforebegin', `<p style="margin: 0 0 6px 0;">${tagHtml}</p>`)
            }
          }
        } else {
          // 2. Regular question without code snippet / media
          contentCell.querySelectorAll('.co-bloom-tag').forEach(el => el.remove())

          // Check if contentCell has child paragraphs/divs with question text
          const childBlocks = Array.from(contentCell.querySelectorAll('p, div, li')).filter(b => b.textContent.trim().length > 0)
          if (childBlocks.length > 0) {
            const lastBlock = childBlocks[childBlocks.length - 1]
            let inner = cleanManualTags(lastBlock.innerHTML)
            inner = inner.replace(/(?:\s|&nbsp;|<br\s*\/?>)*$/i, '')
            lastBlock.innerHTML = `${inner}&nbsp;${tagHtml}`
          } else {
            let html = cleanManualTags(contentCell.innerHTML)
            if (/<\/(p|div)>\s*$/i.test(html)) {
              contentCell.innerHTML = html.replace(/(\s*(?:&nbsp;)*)<\/(p|div)>\s*$/i, `&nbsp;${tagHtml}</$2>`)
            } else {
              contentCell.innerHTML = `${html.replace(/\s+$/, '')}&nbsp;${tagHtml}`
            }
          }
        }

        // Sync updated HTML back to Syncfusion RTE and React state
        if (editor) {
          const newHtml = editPanel.innerHTML
          setEditorValue(newHtml)
          if (typeof editor.value !== 'undefined') editor.value = newHtml
          if (editor.formatter && typeof editor.formatter.saveData === 'function') {
            editor.formatter.saveData()
          }
        }
      }
    }

    // Update questions state if qIndex was identified
    if (qIndex !== null && qIndex >= 0 && qIndex < questions.length) {
      setQuestions(prev => {
        const updated = [...prev]
        const currentItem = updated[qIndex] || {}
        updated[qIndex] = {
          ...currentItem,
          co: (applyCo && finalCo) ? finalCo : currentItem.co,
          bloom: (applyBloom && finalBloom) ? finalBloom : currentItem.bloom
        }
        return updated
      })
    }

    // Update targetInfo in selection state
    setAiVerifySelection(prev => {
      if (!prev) return null
      return {
        ...prev,
        targetInfo: {
          ...prev.targetInfo,
          existingCo: finalCo,
          existingBloom: finalBloom
        }
      }
    })

    const appliedLabel = (applyCo && applyBloom) ? `Updated tag to ${tagStr}` : (applyBloom ? `Bloom level updated to ${finalBloom}` : `Course Outcome updated to ${finalCo}`)
    setAiVerifySuccessMsg(`✓ ${appliedLabel}`)
    setTimeout(() => {
      setAiVerifySuccessMsg('')
      handleCloseAiVerify()
    }, 1200)
  }

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
      let content = res.content || '<p style="font-family:\'Times New Roman\', Times, serif; font-size:12pt;">Write your questions here...</p>'
      // Normalize legacy drafts that had 13px or Georgia to 12pt Times New Roman standard
      if (content.includes('font-size:13px') || content.includes('font-size: 13px')) {
        content = content.replace(/font-size:\s*13px;?/gi, 'font-size:12pt;')
      }
      if (content.includes('Georgia,serif') || content.includes('Georgia, serif')) {
        content = content.replace(/'Times New Roman',\s*Georgia,\s*serif/gi, "'Times New Roman', Times, serif")
      }
      setEditorValue(content)
      // Populate active Cloudinary image tracking
      if (pendingDeletionTimersRef.current) {
        pendingDeletionTimersRef.current.forEach(timerId => clearTimeout(timerId))
        pendingDeletionTimersRef.current.clear()
      }
      const initialUrls = extractCloudinaryUrls(content)
      activeCloudinaryImagesRef.current = new Set(initialUrls)

      if (content.includes('src="blob:') || content.includes("src='blob:")) {
        setShowBlobWarning(true)
      } else {
        setShowBlobWarning(false)
      }

      const currentAssessment = res.assessment || assessment
      setExamDuration(currentAssessment.examDuration || '')
      if (currentAssessment.deadline) {
        const d = new Date(currentAssessment.deadline)
        if (!isNaN(d.getTime())) {
          setDeadline(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
        } else {
          setDeadline(currentAssessment.deadline)
        }
      }
      setLevel(currentAssessment.level || offering.course?.level || '1')
      setTerm(currentAssessment.term || offering.course?.term || 'I')

      const isExtra = Boolean(currentAssessment.isExtraCT || (currentAssessment.name && currentAssessment.name.toLowerCase().startsWith('extra ct')))

      // If questions are not initialized, generate array based on assessment.numQuestions
      const qList = res.questions || []
      const finalQs = []

      // Auto-set default numQuestions for Mid (3), Final (5), and others (1) when first opening
      let targetNum = currentAssessment.numQuestions || (qList.length > 0 ? qList.length : 0)
      if (targetNum === 0) {
        const aType = currentAssessment.type || currentAssessment.assessmentType || ''
        const aName = currentAssessment.name || ''
        const isMid = aType === 'midTerm' || (aName && aName.toLowerCase().includes('mid'))
        const isFin = aType === 'final' || aType === 'termFinal' || (aName && aName.toLowerCase().includes('final'))
        if (isMid) {
          targetNum = 3
        } else if (isFin) {
          targetNum = 5
        } else {
          targetNum = 2
        }
      }
      setNumQuestions(targetNum)

      const totalMax = currentAssessment.maxMarks || 100
      const perQ = Math.floor(totalMax / (targetNum || 1))
      const remainder = totalMax % (targetNum || 1)

      for (let i = 1; i <= targetNum; i++) {
        const qNum = `Q${i}`
        const existing = qList.find(q => q.questionNumber === qNum)
        const defaultCO = isExtra
          ? (currentAssessment.co || 'NONE')
          : (currentAssessment.co && currentAssessment.co !== 'NONE' ? currentAssessment.co : 'NONE')
        const calculatedMarks = (i <= remainder) ? perQ + 1 : perQ

        if (existing) {
          finalQs.push({
            questionNumber: qNum,
            maxMarks: existing.maxMarks !== undefined ? existing.maxMarks : calculatedMarks,
            co: isExtra ? defaultCO : (existing.co || 'NONE'),
            bloom: existing.bloom || ''
          })
        } else {
          finalQs.push({
            questionNumber: qNum,
            maxMarks: calculatedMarks,
            co: defaultCO,
            bloom: ''
          })
        }
      }
      setQuestions(finalQs)

      // Check for local unsaved paper draft
      const draftKey = getPaperDraftKey()
      if (draftKey) {
        try {
          const savedDraftRaw = localStorage.getItem(draftKey)
          if (savedDraftRaw) {
            const savedDraft = JSON.parse(savedDraftRaw)
            if (savedDraft && (savedDraft.questions?.length > 0 || savedDraft.editorValue)) {
              if (savedDraft.questions && savedDraft.questions.length > 0) {
                setQuestions(savedDraft.questions)
              }
              if (savedDraft.editorValue) {
                setEditorValue(savedDraft.editorValue)
                const draftUrls = extractCloudinaryUrls(savedDraft.editorValue)
                draftUrls.forEach(u => activeCloudinaryImagesRef.current.add(u))
              }
              if (savedDraft.numQuestions) {
                setNumQuestions(savedDraft.numQuestions)
              }
              setRestoredPaperDraftInfo({
                timestamp: savedDraft.timestamp ? new Date(savedDraft.timestamp).toLocaleTimeString() : 'recently'
              })
            } else {
              setRestoredPaperDraftInfo(null)
            }
          } else {
            setRestoredPaperDraftInfo(null)
          }
        } catch (e) {
          console.error('Failed to load local paper draft:', e)
          setRestoredPaperDraftInfo(null)
        }
      } else {
        setRestoredPaperDraftInfo(null)
      }
    } catch (err) {
      setError('Failed to load question paper data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNumQuestionsChange = (newVal) => {
    const val = Math.max(1, parseInt(newVal) || 1)
    setNumQuestions(val)

    const isExtra = Boolean(assessment.isExtraCT || (assessment.name && assessment.name.toLowerCase().startsWith('extra ct')))
    const totalMax = assessment.maxMarks || 100
    const perQ = Math.floor(totalMax / val)
    const remainder = totalMax % val

    setQuestions(prev => {
      const updated = []
      const defaultCO = isExtra ? (assessment.co || 'NONE') : 'NONE'
      for (let i = 1; i <= val; i++) {
        const qNum = `Q${i}`
        const existing = prev.find(q => q.questionNumber === qNum)
        const qMarks = (i <= remainder) ? perQ + 1 : perQ
        updated.push({
          questionNumber: qNum,
          maxMarks: qMarks,
          co: existing ? existing.co : defaultCO,
          bloom: existing ? (existing.bloom || '') : ''
        })
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
        const totalMax = assessment.maxMarks || 100
        const parsed = parseInt(value)
        let newMark = isNaN(parsed) ? 0 : Math.max(0, Math.min(totalMax, parsed))

        let otherSum = 0
        for (let i = 0; i < updated.length; i++) {
          if (i !== index) otherSum += (updated[i].maxMarks || 0)
        }
        if (otherSum + newMark > totalMax) {
          newMark = Math.max(0, totalMax - otherSum)
        }

        updated[index] = {
          ...updated[index],
          maxMarks: newMark
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
    setSaving(true)
    try {
      // 1. Process and upload any pasted base64/blob images to Cloudinary
      const currentRawContent = rteRef.current ? rteRef.current.value : editorValue
      const cleanContent = await processAndUploadHtmlImages(currentRawContent)

      // Purge any orphaned Cloudinary images not present in finalized saved document
      const finalSavedUrls = new Set(extractCloudinaryUrls(cleanContent))
      const urlsToDeleteOnSave = []
      activeCloudinaryImagesRef.current.forEach(url => {
        if (!finalSavedUrls.has(url)) {
          urlsToDeleteOnSave.push(url)
        }
      })
      urlsToDeleteOnSave.forEach(url => {
        if (pendingDeletionTimersRef.current.has(url)) {
          clearTimeout(pendingDeletionTimersRef.current.get(url))
          pendingDeletionTimersRef.current.delete(url)
        }
        activeCloudinaryImagesRef.current.delete(url)
        apiService.deleteCloudinaryImage(url).catch(err => {
          console.warn('[Cloudinary] Save-time purge error:', err)
        })
      })
      finalSavedUrls.forEach(url => activeCloudinaryImagesRef.current.add(url))

      // Validate max marks allocation sum
      const totalAllocated = questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0)
      if (questions.length > 0 && totalAllocated !== assessment.maxMarks) {
        if (!window.confirm(`Warning: The total allocated marks for all questions is ${totalAllocated}, but the assessment's total is ${assessment.maxMarks}. Do you want to save anyway?`)) {
          setSaving(false)
          return
        }
      }

      const validCOs = Array.from(new Set(
        questions
          .map(q => q.co)
          .filter(c => c && c !== 'NONE' && c !== '')
      ))
      const aggregatedCO = validCOs.join(', ')

      // 2. Update Assessment fields (examDuration, deadline, numQuestions, level, term, co, status)
      await apiService.updateAssessment(assessment._id, {
        examDuration,
        deadline,
        numQuestions,
        level,
        term,
        co: aggregatedCO || assessment.co || '',
        status: validCOs.length > 0 ? 'Published' : assessment.status
      })

      // 3. Save Question Paper content and metadata questions (including bloom levels)
      await apiService.saveQuestionPaper(assessment._id, {
        content: cleanContent,
        questions: questions.map(q => ({
          questionNumber: q.questionNumber,
          maxMarks: q.maxMarks,
          co: q.co,
          bloom: q.bloom || ''
        }))
      })

      const draftKey = getPaperDraftKey()
      if (draftKey) {
        try { localStorage.removeItem(draftKey) } catch (e) {}
      }
      setRestoredPaperDraftInfo(null)

      showNotification('Question paper, metadata, and assessment settings saved successfully!', 'success')
      loadPaperData()
    } catch (err) {
      showNotification('Failed to save question paper: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const autoSavePaper = async () => {
    if (!assessment?._id || loading) return
    const currentContent = rteRef.current ? rteRef.current.value : editorValue
    if (!currentContent && questions.length === 0) return
    try {
      const validCOs = Array.from(new Set(
        questions.map(q => q.co).filter(c => c && c !== 'NONE' && c !== '')
      ))
      const aggregatedCO = validCOs.join(', ')

      await apiService.updateAssessment(assessment._id, {
        examDuration,
        deadline,
        numQuestions,
        level,
        term,
        co: aggregatedCO || assessment.co || '',
        status: validCOs.length > 0 ? 'Published' : assessment.status
      })

      await apiService.saveQuestionPaper(assessment._id, {
        content: currentContent,
        questions: questions.map(q => ({
          questionNumber: q.questionNumber,
          maxMarks: q.maxMarks,
          co: q.co,
          bloom: q.bloom || ''
        }))
      })

      const draftKey = getPaperDraftKey()
      if (draftKey) {
        try { localStorage.removeItem(draftKey) } catch (e) {}
      }
    } catch (e) {
      console.error('Auto-save paper failed silently:', e)
    }
  }

  const handleBackWithAutoSave = async () => {
    await autoSavePaper()
    onBack()
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
    const aName = assessment.name || ''

    const isMidTerm = aType === 'midTerm' || (aName && aName.toLowerCase().includes('mid'))
    const isTermFinal = aType === 'final' || (aName && aName.toLowerCase().includes('final'))
    const isOfficialExam = isMidTerm || isTermFinal
    const isAssignment = aType === 'assignment' || aType === 'assignments' || (aName && aName.toLowerCase().includes('assignment'))
    const isPresentation = aType === 'presentation' || (aName && aName.toLowerCase().includes('presentation'))
    const isProjectReport = aType === 'projectReport' || (aName && aName.toLowerCase().includes('project'))
    const isParticipation = aType === 'participation' || (aName && aName.toLowerCase().includes('participation'))
    const isAttendance = aType === 'attendance' || (aName && aName.toLowerCase().includes('attendance'))
    const isPerformance = aType === 'performance' || (aName && aName.toLowerCase().includes('performance'))

    const rawDeadline = headerCustom.deadline || deadline || (assessment.deadline ? (
      !isNaN(new Date(assessment.deadline).getTime())
        ? new Date(assessment.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : assessment.deadline
    ) : '')
    const deadlineVal = rawDeadline || 'Not Set'

    const timeOrDeadlineLabel = (isAssignment || isPresentation || isProjectReport) ? 'Deadline' : (isParticipation || isAttendance || isPerformance ? (duration ? 'Duration' : 'Type') : 'Exam Duration')
    const timeOrDeadlineValue = (isAssignment || isPresentation || isProjectReport) ? deadlineVal : (isParticipation || isAttendance || isPerformance ? (duration || 'Continuous') : duration)

    // Build Level/Term format (e.g. Level-4 Term-II)
    const levelStr = level ? `Level-${level}` : 'Level-4'
    const termStr = term ? (term.startsWith('Term') ? term : `Term-${term}`) : 'Term-II'
    const levelTermLine = headerCustom.levelTerm || `${levelStr} ${termStr}`

    const confText = headerCustom.confidentialText || 'EXAMINATION CONFIDENTIAL'
    const bengaliName = headerCustom.bengaliUniName || 'বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি, কুমিল্লা'
    const englishName = headerCustom.englishUniName || 'BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST), CUMILLA'

    // Gather allocated CO codes for this Question Sheet (QS)
    const allocatedCOCodes = new Set()
    if (questions && questions.length > 0) {
      questions.forEach(q => {
        if (q && q.co && q.co !== 'NONE' && q.co.trim() !== '') {
          const matches = q.co.match(/CO\s*-?\s*\d+/gi)
          if (matches && matches.length > 0) {
            matches.forEach(code => {
              const norm = code.toUpperCase().replace(/[\s-_]/g, '')
              allocatedCOCodes.add(norm)
            })
          } else {
            q.co.split(/[,;\s]+/).forEach(part => {
              const trimmed = part.trim()
              if (trimmed && trimmed !== 'NONE') {
                const norm = trimmed.toUpperCase().replace(/[\s-_]/g, '')
                allocatedCOCodes.add(norm)
              }
            })
          }
        }
      })
    }
    if (allocatedCOCodes.size === 0 && assessment && assessment.co && assessment.co.trim() !== '' && assessment.co !== 'NONE') {
      const matches = assessment.co.match(/CO\s*-?\s*\d+/gi)
      if (matches && matches.length > 0) {
        matches.forEach(code => {
          const norm = code.toUpperCase().replace(/[\s-_]/g, '')
          allocatedCOCodes.add(norm)
        })
      } else {
        assessment.co.split(/[,;\s]+/).forEach(part => {
          const trimmed = part.trim()
          if (trimmed && trimmed !== 'NONE') {
            const norm = trimmed.toUpperCase().replace(/[\s-_]/g, '')
            allocatedCOCodes.add(norm)
          }
        })
      }
    }

    const baseCOs = (headerCustom.customCOs && headerCustom.customCOs.length > 0)
      ? headerCustom.customCOs
      : (coDetails.filter(c => c && c.description && c.description.trim()).length > 0
          ? coDetails.filter(c => c && c.description && c.description.trim())
          : availableCOs.map(code => ({ code, description: `Course Outcome description for ${courseTitle || code}.` })))

    let activeCOs = []
    if (allocatedCOCodes.size > 0) {
      const filtered = baseCOs.filter(c => {
        if (!c || !c.code) return false
        const norm = c.code.toUpperCase().replace(/[\s-_]/g, '')
        return allocatedCOCodes.has(norm)
      })
      if (filtered.length > 0) {
        activeCOs = filtered
      } else {
        activeCOs = Array.from(allocatedCOCodes).map(normCode => {
          const orig = availableCOs.find(ac => ac.toUpperCase().replace(/[\s-_]/g, '') === normCode) || normCode
          return { code: orig, description: `Course Outcome description for ${courseTitle || orig}.` }
        })
      }
    }

    const coNotesHtml = activeCOs.map(c => `<div><strong>${c.code}:</strong> ${c.description}</div>`).join('')

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
          'Answer all questions.'
        ]
      }

      const letterPrefixes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      let notesHtml = ''
      notesArray.forEach((noteText, idx) => {
        const prefix = letterPrefixes[idx] || `${idx + 1}`
        notesHtml += `<div>${prefix}. ${noteText}</div>`
      })
      if (activeCOs.length > 0) {
        const coPrefix = letterPrefixes[notesArray.length] || 'c'
        const coHeadingLabel = isTermFinal ? 'The Course Outcomes (COs) are:' : 'Course Learning Outcomes are-'
        notesHtml += `<div>${coPrefix}. ${coHeadingLabel}</div>`
        notesHtml += `<div style="margin-left: 18px !important; margin-top: 2px !important;">${coNotesHtml}</div>`
      }

      return `
        <div class="qp-official-header" style="font-family: 'Times New Roman', Times, serif !important; color: #000 !important; margin-bottom: 12px !important;">
          <!-- Top Confidential Header (Static in preview, replaced by fixed on print) -->
          <div class="static-top-confidential" style="text-align: center !important; font-size: 11px !important; font-weight: bold !important; text-transform: uppercase !important; letter-spacing: 0.8px !important; margin-bottom: 6px !important;">
            ${confText}
          </div>

          <!-- University Logo & Name Table (2-Column Perfectly Centered, Zero Overlap) -->
          <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 6px auto !important; border: none !important; border-collapse: collapse !important;">
            <tr>
              <td width="55" valign="middle" align="left" style="vertical-align: middle !important; text-align: left !important; border: none !important; padding: 0 8px 0 0 !important; width: 55px !important;">
                <img src="${BAIUST_LOGO}" width="48" height="51" alt="BAIUST Logo" style="height: 50px !important; width: 48px !important; display: block !important; border: 0 !important;" />
              </td>
              <td valign="middle" align="center" style="text-align: center !important; vertical-align: middle !important; border: none !important; padding: 0 !important; white-space: nowrap !important;">
                <div style="font-size: 14.5px !important; font-weight: bold !important; color: #000 !important; line-height: 1.25 !important; font-family: 'Times New Roman', Times, serif !important; white-space: nowrap !important; letter-spacing: 0.1px !important;">
                  ${bengaliName}
                </div>
                <div style="font-size: 10.6px !important; font-weight: bold !important; color: #000 !important; letter-spacing: 0.05px !important; margin-top: 2px !important; font-family: 'Times New Roman', Times, serif !important; white-space: nowrap !important;">
                  ${englishName}
                </div>
              </td>
            </tr>
          </table>

          <!-- Exam & Course Info Block -->
          <div style="text-align: center !important; font-size: 13.5px !important; line-height: 1.35 !important; margin-top: 4px !important;">
            <div style="font-size: 16.5px !important; font-weight: bold !important; margin-bottom: 3px !important; letter-spacing: 0.2px !important;">${examTitleStr}</div>
            <div style="font-weight: bold !important; font-size: 13.8px !important;">Department of ${deptName}</div>
            <div style="font-weight: bold !important; font-size: 13.8px !important;">${levelTermLine}</div>
            <div style="font-weight: bold !important; font-size: 13.8px !important;">Course Code: ${courseCode}</div>
            <div style="font-weight: bold !important; font-size: 13.8px !important;">Course Title: ${courseTitle}</div>
            <div>Credit Hour: ${creditHours}</div>
            <div>${timeOrDeadlineLabel}: ${timeOrDeadlineValue}</div>
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

    // Default Class Test (CT) & Assignment Format
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
        <!-- University Logo & English Name Header for CT / Assignment -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="width: 100% !important; border: none !important; border-collapse: collapse !important; margin-bottom: 8px !important; table-layout: fixed !important;">
          <tr>
            <td width="55" valign="middle" align="left" style="width: 55px !important; vertical-align: middle !important; text-align: left !important; border: none !important; padding: 0 !important;">
              <img src="${BAIUST_LOGO}" width="44" height="46" alt="BAIUST Logo" style="height: 46px !important; width: 44px !important; display: block !important; border: 0 !important;" />
            </td>
            <td valign="middle" align="center" style="text-align: center !important; vertical-align: middle !important; border: none !important; padding: 0 4px !important;">
              <div style="font-size: 10.6px !important; font-weight: bold !important; color: #000 !important; letter-spacing: 0.05px !important; font-family: 'Times New Roman', Times, serif !important;">
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
        <p style="margin: 2px 0 0 0 !important; font-size: 14px !important; font-weight: bold !important; text-align: center !important; line-height: 1.3 !important; padding: 0 !important;">Credit Hour: ${creditHours}, ${timeOrDeadlineLabel}: ${timeOrDeadlineValue}, Full Marks: ${fullMarks}</p>
        ${ctLine ? `<p style="margin: 2px 0 0 0 !important; font-size: 14px !important; font-weight: bold !important; text-align: center !important; line-height: 1.3 !important; padding: 0 !important;">${ctLine}</p>` : ''}
        ${activeCOs.length > 0 ? `
          <div style="text-align: left !important; font-size: 13px !important; margin-top: 10px !important; line-height: 1.35 !important;">
            <div style="font-weight: bold !important; margin-bottom: 2px !important;">Course Outcome(s):</div>
            <div style="margin-left: 14px !important;">
              ${coNotesHtml}
            </div>
          </div>
        ` : ''}
        <hr style="border: none !important; border-top: 1.5px solid #000 !important; margin-top: 10px !important; margin-bottom: 15px !important;" />
      </div>
    `
  }

  // Generate CO description lines for print/export (only for CTs, as Mid/Final includes them in Notes)
  const getCoDescriptionsHtml = () => {
    return '' // CO details are now directly embedded in getHeaderHtml()
  }

  // Inject [CO→Bloom] tags and marks into each question's HTML for print/export
  // OBE question papers already have marks cells and CO badges in the paper structure.
  // We must NEVER append marks or CO annotations to user-created <li> lists.
  const injectQuestionAnnotations = (htmlContent) => {
    return htmlContent
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

      /* Base List Defaults (36px Tab Indent to keep bullets inside table cells) */
      ol {
        margin-top: 6px !important;
        margin-bottom: 6px !important;
        padding-left: 36px !important;
        list-style-type: decimal !important;
        list-style-position: outside !important;
      }
      ol > li {
        list-style-type: inherit !important;
      }

      ol ol {
        list-style-type: lower-alpha !important;
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        padding-left: 28px !important;
      }
      ol ol > li {
        list-style-type: inherit !important;
      }

      ol ol ol {
        list-style-type: lower-roman !important;
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        padding-left: 28px !important;
      }
      ol ol ol > li {
        list-style-type: inherit !important;
      }

      ol ol ol ol {
        list-style-type: upper-alpha !important;
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        padding-left: 28px !important;
      }
      ol ol ol ol > li {
        list-style-type: inherit !important;
      }

      /* Explicit Numbered List Format Overrides */
      ol[style*="lower-alpha"], ol.e-list-lower-alpha, ol[style*="lower-alpha"] li, ol.e-list-lower-alpha li, li[style*="lower-alpha"] {
        list-style-type: lower-alpha !important;
      }
      ol[style*="upper-alpha"], ol.e-list-upper-alpha, ol[style*="upper-alpha"] li, ol.e-list-upper-alpha li, li[style*="upper-alpha"] {
        list-style-type: upper-alpha !important;
      }
      ol[style*="lower-roman"], ol.e-list-lower-roman, ol[style*="lower-roman"] li, ol.e-list-lower-roman li, li[style*="lower-roman"] {
        list-style-type: lower-roman !important;
      }
      ol[style*="upper-roman"], ol.e-list-upper-roman, ol[style*="upper-roman"] li, ol.e-list-upper-roman li, li[style*="upper-roman"] {
        list-style-type: upper-roman !important;
      }
      ol[style*="lower-greek"], ol.e-list-lower-greek, ol[style*="lower-greek"] li, ol.e-list-lower-greek li, li[style*="lower-greek"] {
        list-style-type: lower-greek !important;
      }
      ol[style*="decimal"], ol.e-list-decimal, ol[style*="decimal"] li, ol.e-list-decimal li, li[style*="decimal"] {
        list-style-type: decimal !important;
      }

      /* Base Unordered List Defaults & Overrides */
      ul {
        margin-top: 6px !important;
        margin-bottom: 6px !important;
        padding-left: 36px !important;
        list-style-type: disc !important;
        list-style-position: outside !important;
      }
      ul > li {
        list-style-type: inherit !important;
      }
      ul ul {
        list-style-type: circle !important;
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        padding-left: 28px !important;
      }
      ul ul > li {
        list-style-type: inherit !important;
      }
      ul ul ul {
        list-style-type: square !important;
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        padding-left: 28px !important;
      }
      ul ul ul > li {
        list-style-type: inherit !important;
      }

      ul[style*="disc"], ul.e-list-disc, ul[style*="disc"] li, ul.e-list-disc li, li[style*="disc"] {
        list-style-type: disc !important;
      }
      ul[style*="circle"], ul.e-list-circle, ul[style*="circle"] li, ul.e-list-circle li, li[style*="circle"] {
        list-style-type: circle !important;
      }
      ul[style*="square"], ul.e-list-square, ul[style*="square"] li, ul.e-list-square li, li[style*="square"] {
        list-style-type: square !important;
      }
      ul[style*="none"], ul.e-list-none, ul[style*="none"] li, ul.e-list-none li, ol[style*="none"], ol.e-list-none, ol[style*="none"] li, ol.e-list-none li, li[style*="none"] {
        list-style-type: none !important;
      }

      p, li {
        margin-bottom: 4px;
        text-align: justify;
      }

      .math-eq-badge {
        display: none !important;
      }
      .math-equation-wrapper {
        background-color: transparent !important;
        border: none !important;
        position: relative;
        overflow: visible !important;
        line-height: normal !important;
      }
      .math-equation-wrapper.math-display-block {
        display: block !important;
        margin: 10px 0 10px 4px !important;
        clear: both !important;
        text-align: left !important;
        overflow: visible !important;
      }
      .math-equation-wrapper.math-display-block .katex-display {
        display: block !important;
        margin: 4px 0 !important;
        text-align: left !important;
        overflow: visible !important;
      }
      .math-equation-wrapper.math-inline {
        display: inline-block !important;
        vertical-align: middle !important;
        margin: 0 4px !important;
        overflow: visible !important;
      }

      .katex {
        font-size: 1.12em !important;
        line-height: normal !important;
        text-indent: 0 !important;
        overflow: visible !important;
        white-space: nowrap;
      }
      .katex-display {
        overflow: visible !important;
      }
      .katex-html, .katex .base {
        overflow: visible !important;
      }
      p:has(> .math-equation-wrapper.math-display-block) {
        margin-top: 6px !important;
        margin-bottom: 6px !important;
        line-height: normal !important;
        text-align: left !important;
      }

      /* Code Snippet Styles for Print / PDF / Word Export */
      .obe-code-snippet-container {
        margin: 8px 0 !important;
        clear: both !important;
        page-break-inside: avoid !important;
      }
      .obe-code-snippet-container[data-align="center"] {
        text-align: center !important;
      }
      .obe-code-snippet-container[data-align="left"] {
        text-align: left !important;
      }
      .obe-code-block {
        display: inline-block !important;
        font-family: Consolas, 'Courier New', Monaco, monospace !important;
        line-height: 1.35 !important;
        letter-spacing: 0 !important;
        tab-size: 4 !important;
        -moz-tab-size: 4 !important;
        white-space: pre-wrap !important;
        word-break: break-word !important;
        margin: 0 !important;
        text-align: left !important;
        box-sizing: border-box !important;
      }
      .obe-code-block,
      .obe-code-block *,
      .obe-code-block code,
      .obe-code-block span,
      .obe-code-table,
      .obe-code-table * {
        color: #000000 !important;
        background-color: transparent !important;
      }
      .obe-code-block strong {
        font-weight: 700 !important;
        color: #000000 !important;
      }
      .obe-code-table {
        border-collapse: collapse !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        width: auto !important;
      }
      .obe-code-table td {
        border: none !important;
        padding: 1px 0 !important;
        line-height: 1.35 !important;
        vertical-align: top !important;
      }
      .obe-code-table .obe-code-ln {
        color: #555555 !important;
        user-select: none !important;
        text-align: right !important;
        padding-right: 12px !important;
        border-right: 1px solid #999999 !important;
      }
      .obe-code-table .obe-code-txt {
        padding-left: 12px !important;
        white-space: pre-wrap !important;
      }

      /* Question Paper Structure Table Formatting for Print & PDF */
      table.obe-paper-structure-table,
      table[data-obe-paper-structure="true"] {
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
        margin-top: 6px !important;
        margin-bottom: 6px !important;
        box-sizing: border-box !important;
      }
      table.obe-paper-structure-table col.col-qnum,
      table[data-obe-paper-structure="true"] col.col-qnum {
        width: 28px !important;
        max-width: 28px !important;
      }
      table.obe-paper-structure-table col.col-subq,
      table[data-obe-paper-structure="true"] col.col-subq {
        width: 24px !important;
        max-width: 24px !important;
      }
      table.obe-paper-structure-table col.col-content,
      table[data-obe-paper-structure="true"] col.col-content {
        width: auto !important;
      }
      table.obe-paper-structure-table col.col-marks,
      table[data-obe-paper-structure="true"] col.col-marks {
        width: 50px !important;
        max-width: 50px !important;
      }

      /* Specific column padding overrides to prevent huge print gaps — DIRECT CHILDREN ONLY */
      table.obe-paper-structure-table > tbody > tr > td,
      table.obe-paper-structure-table > tr > td,
      table[data-obe-paper-structure="true"] > tbody > tr > td,
      table[data-obe-paper-structure="true"] > tr > td {
        vertical-align: top !important;
        font-family: 'Times New Roman', Times, serif !important;
        font-size: 12pt !important;
        line-height: 1.4 !important;
      }
      table.obe-paper-structure-table > tbody > tr > td.col-qnum-cell,
      table.obe-paper-structure-table > tr > td.col-qnum-cell,
      table[data-obe-paper-structure="true"] > tbody > tr > td.col-qnum-cell,
      table[data-obe-paper-structure="true"] > tr > td.col-qnum-cell,
      table[data-obe-paper-structure="true"] > tbody > tr > td:first-child:not([colspan]),
      table[data-obe-paper-structure="true"] > tr > td:first-child:not([colspan]) {
        width: 28px !important;
        max-width: 28px !important;
        padding: 4px 2px 4px 0px !important;
        text-align: left !important;
        white-space: nowrap !important;
      }
      table.obe-paper-structure-table > tbody > tr > td.col-subq-cell,
      table.obe-paper-structure-table > tr > td.col-subq-cell,
      table[data-obe-paper-structure="true"] > tbody > tr > td.col-subq-cell,
      table[data-obe-paper-structure="true"] > tr > td.col-subq-cell,
      table[data-obe-paper-structure="true"] > tbody > tr:not([data-obe-row="or-separator"]) > td:nth-child(2):not([colspan]),
      table[data-obe-paper-structure="true"] > tr:not([data-obe-row="or-separator"]) > td:nth-child(2):not([colspan]) {
        width: 24px !important;
        max-width: 24px !important;
        padding: 4px 4px 4px 0px !important;
        text-align: left !important;
        white-space: nowrap !important;
      }
      table.obe-paper-structure-table > tbody > tr > td.col-content-cell,
      table.obe-paper-structure-table > tr > td.col-content-cell,
      table[data-obe-paper-structure="true"] > tbody > tr > td.col-content-cell,
      table[data-obe-paper-structure="true"] > tr > td.col-content-cell,
      table[data-obe-paper-structure="true"] > tbody > tr:not([data-obe-row="or-separator"]) > td:nth-child(3):not([colspan]),
      table[data-obe-paper-structure="true"] > tr:not([data-obe-row="or-separator"]) > td:nth-child(3):not([colspan]) {
        padding: 4px 8px 4px 2px !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        overflow: visible !important;
      }
      table.obe-paper-structure-table > tbody > tr > td.col-marks-cell,
      table.obe-paper-structure-table > tr > td.col-marks-cell,
      table[data-obe-paper-structure="true"] > tbody > tr > td.col-marks-cell,
      table[data-obe-paper-structure="true"] > tr > td.col-marks-cell,
      table[data-obe-paper-structure="true"] > tbody > tr > td:last-child:not([colspan]),
      table[data-obe-paper-structure="true"] > tr > td:last-child:not([colspan]) {
        width: 50px !important;
        max-width: 50px !important;
        padding: 4px 0px 4px 4px !important;
        text-align: right !important;
        white-space: nowrap !important;
      }

      /* Force zero margin for direct content paragraphs inside table cells so they stay aligned with Q# and Sub-Q */
      table.obe-paper-structure-table > tbody > tr > td > p,
      table.obe-paper-structure-table > tr > td > p,
      table[data-obe-paper-structure="true"] > tbody > tr > td > p,
      table[data-obe-paper-structure="true"] > tr > td > p {
        margin: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding: 0 !important;
        line-height: inherit !important;
        display: inline !important;
      }

      /* When borders are cleared on structure table, force borders to none ONLY on direct cells */
      table.obe-paper-structure-table.borders-cleared > tbody > tr > td,
      table.obe-paper-structure-table.borders-cleared > tbody > tr > th,
      table.obe-paper-structure-table.borders-cleared > tr > td,
      table.obe-paper-structure-table.borders-cleared > tr > th,
      table.obe-paper-structure-table[data-obe-borders-cleared="true"] > tbody > tr > td,
      table.obe-paper-structure-table[data-obe-borders-cleared="true"] > tbody > tr > th,
      table.obe-paper-structure-table[data-obe-borders-cleared="true"] > tr > td,
      table.obe-paper-structure-table[data-obe-borders-cleared="true"] > tr > th,
      table.obe-paper-structure-table[style*="border: none"] > tbody > tr > td,
      table.obe-paper-structure-table[style*="border: none"] > tr > td,
      table.obe-paper-structure-table[style*="border:none"] > tbody > tr > td,
      table.obe-paper-structure-table[style*="border:none"] > tr > td {
        border: none !important;
      }

      /* =========================================================================
         Nested User Content Tables (Inside Question Content Cells)
         ========================================================================= */
      td.col-content-cell table:not(.obe-code-table),
      td[colspan="2"].col-content-cell table:not(.obe-code-table),
      table.obe-paper-structure-table > tbody > tr > td:nth-child(3) table:not(.obe-code-table),
      table.obe-paper-structure-table > tbody > tr > td table:not(.obe-code-table),
      table[data-obe-paper-structure="true"] > tbody > tr > td table:not(.obe-code-table),
      table.e-rte-table:not(.obe-paper-structure-table):not(.obe-code-table),
      .obe-content-table {
        display: table !important;
        width: auto;
        max-width: 100% !important;
        margin: 6px auto !important;
        margin-left: auto !important;
        margin-right: auto !important;
        border-collapse: collapse !important;
        table-layout: auto !important;
        font-family: 'Times New Roman', Times, serif !important;
        font-size: 10pt !important;
        line-height: 1.25 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        box-sizing: border-box !important;
        clear: both !important;
        overflow: visible !important;
      }

      /* Explicit alignment overrides for user content tables */
      td.col-content-cell table[data-obe-align="left"],
      td.col-content-cell table.obe-align-left {
        margin-left: 0 !important;
        margin-right: auto !important;
      }
      td.col-content-cell table[data-obe-align="right"],
      td.col-content-cell table.obe-align-right {
        margin-left: auto !important;
        margin-right: 0 !important;
      }
      td.col-content-cell table[data-obe-align="center"],
      td.col-content-cell table.obe-align-center {
        margin-left: auto !important;
        margin-right: auto !important;
      }
      td.col-content-cell table[data-obe-align="full"],
      td.col-content-cell table.obe-table-full {
        width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      /* Auto-scale: Tables with many columns get tighter formatting to fit A4 width */
      td.col-content-cell table.obe-print-compact,
      td[colspan="2"].col-content-cell table.obe-print-compact {
        font-size: 8.5pt !important;
        line-height: 1.15 !important;
      }
      td.col-content-cell table.obe-print-compact th,
      td.col-content-cell table.obe-print-compact td,
      td[colspan="2"].col-content-cell table.obe-print-compact th,
      td[colspan="2"].col-content-cell table.obe-print-compact td {
        padding: 2px 3px !important;
        font-size: 8.5pt !important;
        line-height: 1.15 !important;
      }

      td.col-content-cell table th,
      td[colspan="2"].col-content-cell table th,
      table.obe-paper-structure-table > tbody > tr > td:nth-child(3) table th,
      table.obe-paper-structure-table > tbody > tr > td table th,
      table[data-obe-paper-structure="true"] > tbody > tr > td table th,
      table.e-rte-table:not(.obe-paper-structure-table) th,
      .obe-content-table th {
        border: 1px solid #000 !important;
        padding: 3px 5px !important;
        text-align: left !important;
        font-weight: bold !important;
        font-size: 10pt !important;
        background-color: transparent !important;
        vertical-align: middle !important;
        white-space: normal !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        box-sizing: border-box !important;
      }

      td.col-content-cell table td,
      td[colspan="2"].col-content-cell table td,
      table.obe-paper-structure-table > tbody > tr > td:nth-child(3) table td,
      table.obe-paper-structure-table > tbody > tr > td table td,
      table[data-obe-paper-structure="true"] > tbody > tr > td table td,
      table.e-rte-table:not(.obe-paper-structure-table) td,
      .obe-content-table td {
        border: 1px solid #000 !important;
        padding: 3px 5px !important;
        text-align: left !important;
        vertical-align: middle !important;
        white-space: normal !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        font-size: 10pt !important;
        line-height: 1.25 !important;
        box-sizing: border-box !important;
      }

      td.col-content-cell table td p,
      td.col-content-cell table td div,
      table.obe-paper-structure-table > tbody > tr > td:nth-child(3) table td p,
      table.obe-paper-structure-table > tbody > tr > td:nth-child(3) table td div,
      table.obe-paper-structure-table > tbody > tr > td table td p,
      table[data-obe-paper-structure="true"] > tbody > tr > td table td p,
      .obe-content-table td p {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        line-height: inherit !important;
      }

      /* Prevent nested table colgroup/col from inheriting structure table column constraints */
      td.col-content-cell table col,
      td.col-content-cell table colgroup,
      table.obe-paper-structure-table > tbody > tr > td table col,
      table.obe-paper-structure-table > tbody > tr > td table colgroup {
        max-width: 100% !important;
        min-width: 0 !important;
      }
    `
  }

  // Render KaTeX equation wrappers into native vector KaTeX HTML for 100% unclipped, crisp Print/PDF export
  const renderEquationsForPrint = (htmlContent) => {
    if (!htmlContent || (!htmlContent.includes('math-equation-wrapper') && !htmlContent.includes('data-latex'))) {
      return htmlContent
    }

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = htmlContent

    const wrappers = Array.from(tempDiv.querySelectorAll('.math-equation-wrapper, [data-latex]'))

    for (const wrapper of wrappers) {
      try {
        const encodedLatex = wrapper.getAttribute('data-latex') || ''
        const latexStr = encodedLatex ? decodeURIComponent(encodedLatex) : wrapper.textContent || ''
        if (!latexStr.trim()) continue

        // Check if equation is standalone on its line / in its paragraph
        const parentP = wrapper.closest('p, div, li')
        const isStandalone = !wrapper.previousSibling ||
          (wrapper.previousSibling.nodeType === Node.TEXT_NODE && !wrapper.previousSibling.textContent.trim()) ||
          (parentP && parentP.querySelectorAll('.math-equation-wrapper').length <= 2 && parentP.textContent.trim() === '')

        // Render native vector KaTeX HTML
        const katexHtml = katex.renderToString(latexStr, {
          displayMode: isStandalone,
          throwOnError: false,
          output: 'html'
        })

        const container = document.createElement('span')
        container.className = `math-equation-wrapper math-rendered ${isStandalone ? 'math-display-block' : 'math-inline'}`
        container.innerHTML = katexHtml

        if (wrapper.parentNode) {
          wrapper.parentNode.replaceChild(container, wrapper)
        }
      } catch (err) {
        console.error('Error rendering equation for print:', err)
      }
    }

    return tempDiv.innerHTML
  }

  // ---------------------------------------------------------------------------
  // Pre-Print DOM Sanitizer: Cleans nested tables for faithful A4 printing
  // ---------------------------------------------------------------------------
  // This function ONLY does two safe things:
  // 1. Strips destructive inline pixel widths from nested user tables and their
  //    cells/colgroups so they flow naturally within the content column
  // 2. Auto-detects multi-column tables (5+ columns) and applies compact
  //    formatting (smaller font, tighter padding) so all columns fit on A4
  //
  // It does NOT attempt to move, reparent, or recover DOM rows — that approach
  // caused ghost/duplicate table rows in earlier versions.
  // ---------------------------------------------------------------------------
  const sanitizeNestedTablesForPrint = (htmlContent) => {
    if (!htmlContent) return htmlContent

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = htmlContent

    // Step 0: Aggressively purge any redundant in-DOM footer or confidential elements
    const redundantFooters = tempDiv.querySelectorAll(
      '.exam-footer, .footer-confidential, .exam-running-footer-cell, .running-footer-bottom, [data-exam-footer="true"], .static-top-confidential, .running-footer-container, #page-counter-slot, .page-number-indicator, .running-header-top'
    )
    redundantFooters.forEach(el => el.remove())

    // Remove any trailing or empty paragraphs that might push extra blank lines
    const trailingEmptyParagraphs = tempDiv.querySelectorAll('p:empty, p > br:only-child')
    trailingEmptyParagraphs.forEach(el => {
      if (!el.textContent.trim() && !el.querySelector('img, svg, canvas, table')) {
        el.remove()
      }
    })

    // Find ALL tables in the content (both structure table and nested user tables)
    const allTables = tempDiv.querySelectorAll('table')

    for (const table of allTables) {
      // Skip the outer structure table itself — only process nested user tables
      if (table.classList.contains('obe-paper-structure-table') || table.getAttribute('data-obe-paper-structure') === 'true') continue

      // --- Table Alignment & Width Handling ---
      const ml = (table.style.marginLeft || '').trim().toLowerCase()
      const mr = (table.style.marginRight || '').trim().toLowerCase()
      const alignAttr = (table.getAttribute('align') || '').trim().toLowerCase()
      const styleAlign = (table.style.textAlign || '').trim().toLowerCase()
      const parentTextAlign = (table.parentElement?.style?.textAlign || '').trim().toLowerCase()
      const rawMargin = (table.style.margin || '').toLowerCase()

      let align = 'center'
      if (ml === '0px' || ml === '0' || alignAttr === 'left' || parentTextAlign === 'left' || styleAlign === 'left') {
        align = 'left'
      } else if (((mr === '0px' || mr === '0') && ml !== '0px' && ml !== '0') || alignAttr === 'right' || parentTextAlign === 'right' || styleAlign === 'right') {
        align = 'right'
      } else if ((ml === 'auto' && mr === 'auto') || alignAttr === 'center' || parentTextAlign === 'center' || rawMargin.includes('auto')) {
        align = 'center'
      }

      table.setAttribute('data-obe-align', align)
      table.classList.add(`obe-align-${align}`)

      const rawTableWidth = (table.style.width || table.getAttribute('width') || '').trim()
      const rawMaxWidth = (table.style.maxWidth || '').trim()
      const isFullWidth = (rawTableWidth === '100%' || align === 'full' || table.classList.contains('obe-table-full') || table.classList.contains('w-full')) && align !== 'center' && align !== 'left' && align !== 'right'

      if (isFullWidth) {
        table.setAttribute('data-obe-align', 'full')
        table.classList.add('obe-table-full')
        table.style.width = '100%'
        table.style.maxWidth = '100%'
        table.style.marginLeft = '0'
        table.style.marginRight = '0'
      } else {
        // Compact / Sized table matching editor dimensions
        let explicitPx = null
        if (rawTableWidth && (rawTableWidth.includes('px') || /^\d+(\.\d+)?$/.test(rawTableWidth))) {
          explicitPx = parseFloat(rawTableWidth)
        }

        // Check if cols have defined pixel widths
        const cols = table.querySelectorAll(':scope > colgroup > col, :scope > col')
        let totalColPx = 0
        let hasColPx = false
        cols.forEach(col => {
          const cw = col.style.width || col.getAttribute('width') || ''
          if (cw && (cw.includes('px') || /^\d+(\.\d+)?$/.test(cw))) {
            totalColPx += parseFloat(cw)
            hasColPx = true
          }
        })

        // Check if first-row cells have defined pixel widths
        const firstRow = table.querySelector('tr')
        const firstRowCells = firstRow ? Array.from(firstRow.querySelectorAll(':scope > td, :scope > th')) : []
        let totalCellPx = 0
        let hasCellPx = false
        if (!hasColPx && firstRowCells.length > 0) {
          firstRowCells.forEach(cell => {
            const cw = cell.style.width || cell.getAttribute('width') || ''
            if (cw && (cw.includes('px') || /^\d+(\.\d+)?$/.test(cw))) {
              totalCellPx += parseFloat(cw)
              hasCellPx = true
            }
          })
        }

        const MAX_PRINTABLE_WIDTH = 580 // Max printable content cell width in px

        if (explicitPx !== null && explicitPx > 0) {
          if (explicitPx > MAX_PRINTABLE_WIDTH) {
            table.style.width = '100%'
            table.style.maxWidth = '100%'
            // Proportionally scale cols if they were in px
            if (hasColPx && totalColPx > 0) {
              cols.forEach(col => {
                const cw = col.style.width || col.getAttribute('width') || ''
                if (cw && (cw.includes('px') || /^\d+(\.\d+)?$/.test(cw))) {
                  const pct = ((parseFloat(cw) / totalColPx) * 100).toFixed(1)
                  col.style.width = `${pct}%`
                  col.setAttribute('width', `${pct}%`)
                }
              })
            }
          } else {
            table.style.width = `${Math.round(explicitPx)}px`
            table.style.maxWidth = '100%'
            if (hasColPx) {
              cols.forEach(col => {
                const cw = col.style.width || col.getAttribute('width') || ''
                if (cw && (cw.includes('px') || /^\d+(\.\d+)?$/.test(cw))) {
                  col.style.width = `${Math.round(parseFloat(cw))}px`
                  col.setAttribute('width', `${Math.round(parseFloat(cw))}`)
                }
              })
            }
          }
        } else if (rawTableWidth && rawTableWidth.endsWith('%') && rawTableWidth !== '100%') {
          table.style.width = rawTableWidth
          table.style.maxWidth = '100%'
        } else if (hasColPx && totalColPx > 0) {
          if (totalColPx > MAX_PRINTABLE_WIDTH) {
            table.style.width = '100%'
            table.style.maxWidth = '100%'
            cols.forEach(col => {
              const cw = col.style.width || col.getAttribute('width') || ''
              if (cw && (cw.includes('px') || /^\d+(\.\d+)?$/.test(cw))) {
                const pct = ((parseFloat(cw) / totalColPx) * 100).toFixed(1)
                col.style.width = `${pct}%`
                col.setAttribute('width', `${pct}%`)
              }
            })
          } else {
            table.style.width = `${Math.round(totalColPx)}px`
            table.style.maxWidth = '100%'
            cols.forEach(col => {
              const cw = col.style.width || col.getAttribute('width') || ''
              if (cw && (cw.includes('px') || /^\d+(\.\d+)?$/.test(cw))) {
                col.style.width = `${Math.round(parseFloat(cw))}px`
                col.setAttribute('width', `${Math.round(parseFloat(cw))}`)
              }
            })
          }
        } else if (hasCellPx && totalCellPx > 0) {
          if (totalCellPx > MAX_PRINTABLE_WIDTH) {
            table.style.width = '100%'
            table.style.maxWidth = '100%'
            firstRowCells.forEach(cell => {
              const cw = cell.style.width || cell.getAttribute('width') || ''
              if (cw && (cw.includes('px') || /^\d+(\.\d+)?$/.test(cw))) {
                cell.style.width = `${((parseFloat(cw) / totalCellPx) * 100).toFixed(1)}%`
              }
            })
          } else {
            table.style.width = `${Math.round(totalCellPx)}px`
            table.style.maxWidth = '100%'
            firstRowCells.forEach(cell => {
              const cw = cell.style.width || cell.getAttribute('width') || ''
              if (cw && (cw.includes('px') || /^\d+(\.\d+)?$/.test(cw))) {
                cell.style.width = `${Math.round(parseFloat(cw))}px`
              }
            })
          }
        } else if (rawMaxWidth && (rawMaxWidth.includes('px') || /^\d+(\.\d+)?$/.test(rawMaxWidth))) {
          const maxPx = parseFloat(rawMaxWidth)
          if (maxPx <= MAX_PRINTABLE_WIDTH) {
            table.style.maxWidth = `${Math.round(maxPx)}px`
            table.style.width = 'auto'
          } else {
            table.style.maxWidth = '100%'
            table.style.width = '100%'
          }
        } else {
          table.style.width = 'auto'
          table.style.maxWidth = '100%'
        }

        if (align === 'left') {
          table.style.marginLeft = '0'
          table.style.marginRight = 'auto'
        } else if (align === 'right') {
          table.style.marginLeft = 'auto'
          table.style.marginRight = '0'
        } else {
          table.style.marginLeft = 'auto'
          table.style.marginRight = 'auto'
        }
      }
      table.style.tableLayout = 'auto'
      table.style.borderCollapse = 'collapse'
      table.style.boxSizing = 'border-box'

      // Count actual columns by checking first row
      const firstRow = table.querySelector('tr')
      let colCount = 0
      if (firstRow) {
        const cells = firstRow.querySelectorAll(':scope > td, :scope > th')
        cells.forEach(cell => {
          colCount += parseInt(cell.getAttribute('colspan') || '1', 10)
        })
      }

      // Auto-scale: Apply compact class for tables with 5+ columns
      if (colCount >= 5) {
        table.classList.add('obe-print-compact')
      }

      // Ensure all cells have proper borders and word wrapping
      const allCells = table.querySelectorAll('td, th')
      for (const cell of allCells) {
        // Ensure borders are visible
        if (!cell.style.border || cell.style.border === 'none' || cell.style.border === '0') {
          cell.style.border = '1px solid #000'
        }
        cell.style.wordBreak = 'break-word'
        cell.style.overflowWrap = 'break-word'
        cell.style.boxSizing = 'border-box'
      }
    }

    // Step 3: Trim trailing empty elements that cause phantom blank pages
    // Syncfusion RTE often appends trailing <p><br></p>, <p>&nbsp;</p>, empty <div>, etc.
    let lastChild = tempDiv.lastElementChild
    while (lastChild) {
      const tag = lastChild.tagName?.toLowerCase()
      if (tag === 'p' || tag === 'div' || tag === 'br') {
        const text = lastChild.textContent?.replace(/[\s\u00a0]/g, '').trim() || ''
        const hasBlock = lastChild.querySelector('table, img, svg, canvas, .math-equation-wrapper, .katex')
        if (!text && !hasBlock) {
          const prev = lastChild.previousElementSibling
          lastChild.remove()
          lastChild = prev
          continue
        }
      }
      break
    }

    return tempDiv.innerHTML
  }

  // Helper: Parse SVG width & height from viewBox or attributes
  const parseSvgDimensions = (svgText) => {
    try {
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
      const svgEl = svgDoc.querySelector('svg')
      if (svgEl) {
        const vb = svgEl.getAttribute('viewBox')
        if (vb) {
          const parts = vb.trim().split(/[\s,]+/).map(parseFloat)
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            return { w: Math.round(parts[2]), h: Math.round(parts[3]) }
          }
        }
        const wAttr = parseFloat(svgEl.getAttribute('width'))
        const hAttr = parseFloat(svgEl.getAttribute('height'))
        if (wAttr > 0 && hAttr > 0) {
          return { w: Math.round(wAttr), h: Math.round(hAttr) }
        }
      }
    } catch (e) {}
    return { w: 400, h: 300 }
  }

  // Helper: Convert SVG Data URL or diagram payload to high-res PNG Data URL for Microsoft Word compatibility
  const convertSvgDataUrlToPng = (svgDataUrl, fallbackPayload = null) => {
    return new Promise(async (resolve) => {
      const timer = setTimeout(() => resolve(null), 4000)
      try {
        let svgMarkup = ''
        if (fallbackPayload && fallbackPayload.edgesText) {
          try {
            svgMarkup = generateGraphSvg(
              fallbackPayload.edgesText,
              fallbackPayload.type || 'directed',
              'bw',
              fallbackPayload.positions || {},
              {
                startState: fallbackPayload.startState || null,
                acceptStates: fallbackPayload.acceptStates || []
              }
            )
          } catch (e) {}
        }

        if (!svgMarkup && svgDataUrl) {
          if (svgDataUrl.includes(';base64,')) {
            const b64 = svgDataUrl.split(';base64,')[1]
            try {
              svgMarkup = decodeURIComponent(escape(atob(b64)))
            } catch (e) {
              try {
                svgMarkup = atob(b64)
              } catch (e2) {}
            }
          } else if (svgDataUrl.includes(',')) {
            svgMarkup = decodeURIComponent(svgDataUrl.split(',')[1])
          } else if (svgDataUrl.startsWith('<svg')) {
            svgMarkup = svgDataUrl
          }
        }

        if (!svgMarkup) {
          clearTimeout(timer)
          resolve(null)
          return
        }

        const dims = parseSvgDimensions(svgMarkup)
        const w = dims.w || 400
        const h = dims.h || 300

        // Ensure root <svg> has explicit width & height and xml namespace
        if (!svgMarkup.includes('xmlns="http://www.w3.org/2000/svg"')) {
          svgMarkup = svgMarkup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
        }
        svgMarkup = svgMarkup.replace(/<svg\b([^>]*)>/i, (m, attrs) => {
          const cleanAttrs = attrs
            .replace(/\bwidth=["'][^"']*["']/gi, '')
            .replace(/\bheight=["'][^"']*["']/gi, '')
          return `<svg width="${w}" height="${h}" ${cleanAttrs}>`
        })

        // Attempt 1: html2canvas on off-screen DOM element (handles all CSS, markers, paths without canvas tainting)
        try {
          const container = document.createElement('div')
          container.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${w}px;height:${h}px;background:#ffffff;display:block;margin:0;padding:0;overflow:hidden;`
          container.innerHTML = svgMarkup
          document.body.appendChild(container)

          const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            width: w,
            height: h
          })

          if (container.parentNode) {
            container.parentNode.removeChild(container)
          }

          if (canvas && canvas.width > 0 && canvas.height > 0) {
            clearTimeout(timer)
            resolve({
              dataUrl: canvas.toDataURL('image/png'),
              width: w,
              height: h
            })
            return
          }
        } catch (e) {
          console.warn('html2canvas SVG conversion error:', e)
        }

        // Attempt 2: Image loader with Blob URL + Canvas
        try {
          const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
          const blobUrl = URL.createObjectURL(blob)
          const img = new Image()
          img.onload = () => {
            clearTimeout(timer)
            URL.revokeObjectURL(blobUrl)
            try {
              const canvas = document.createElement('canvas')
              const scale = 2
              canvas.width = w * scale
              canvas.height = h * scale
              const ctx = canvas.getContext('2d')
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              resolve({
                dataUrl: canvas.toDataURL('image/png'),
                width: w,
                height: h
              })
            } catch (e2) {
              resolve(null)
            }
          }
          img.onerror = () => {
            clearTimeout(timer)
            URL.revokeObjectURL(blobUrl)
            resolve(null)
          }
          img.src = blobUrl
        } catch (e3) {
          clearTimeout(timer)
          resolve(null)
        }
      } catch (err) {
        clearTimeout(timer)
        resolve(null)
      }
    })
  }

  // Word export — Authentic BAIUST Exam Paper Format
  const handleExportWord = async () => {
    const currentContent = rteRef.current ? rteRef.current.value : editorValue
    const headerHtml = getHeaderHtml()
    const coDescriptions = getCoDescriptionsHtml()
    const rawAnnotatedContent = injectQuestionAnnotations(currentContent)

    // Confidential watermark text
    const confText = headerCustom.confidentialText || 'EXAMINATION CONFIDENTIAL'

    // Clean university header by removing embedded static confidential (running header handles it)
    let cleanHeaderHtml = headerHtml || ''
    cleanHeaderHtml = cleanHeaderHtml.replace(/<div class="static-top-confidential"[\s\S]*?<\/div>/gi, '')

    // Parse into working DOM
    const parser = new DOMParser()
    const doc = parser.parseFromString(cleanHeaderHtml + (coDescriptions || '') + (rawAnnotatedContent || ''), 'text/html')

    // 1. Raw LaTeX for Word: replace equation wrappers with exact LaTeX formula string
    // Teachers in Word can select it and press Alt + = to instantly convert it to Word's native equation object!
    const mathWrappers = Array.from(doc.querySelectorAll('.math-equation-wrapper, [data-latex]'))
    for (const wrapper of mathWrappers) {
      try {
        const encodedLatex = wrapper.getAttribute('data-latex') || ''
        let latexStr = encodedLatex ? decodeURIComponent(encodedLatex) : wrapper.textContent || ''
        latexStr = latexStr.trim()
        if (!latexStr) continue

        const parentP = wrapper.closest('p, div, li')
        const isStandalone = !wrapper.previousSibling ||
          (wrapper.previousSibling.nodeType === Node.TEXT_NODE && !wrapper.previousSibling.textContent.trim()) ||
          (parentP && parentP.querySelectorAll('.math-equation-wrapper').length <= 2 && parentP.textContent.trim() === '')

        if (isStandalone && wrapper.parentNode) {
          const centerP = doc.createElement('p')
          centerP.setAttribute('align', 'center')
          centerP.style.cssText = 'text-align: center; margin: 6px auto; font-family: "Cambria Math", "Times New Roman", serif; font-size: 11pt; color: #000000;'
          centerP.textContent = latexStr
          wrapper.parentNode.replaceChild(centerP, wrapper)
        } else if (wrapper.parentNode) {
          const span = doc.createElement('span')
          span.className = 'latex-equation'
          span.style.cssText = 'font-family: "Cambria Math", "Times New Roman", serif; font-size: 11pt; color: #000000; padding: 0 2px;'
          span.textContent = latexStr
          wrapper.parentNode.replaceChild(span, wrapper)
        }
      } catch (err) {
        console.warn('Equation processing error for Word:', err)
      }
    }

    // 2. Remove unwanted 4-sided boxes around scenarios/blockquotes in Word
    doc.querySelectorAll('blockquote').forEach(bq => {
      const p = doc.createElement('p')
      p.style.cssText = 'margin: 4px 0 6px 0; padding: 2px 4px; border: none; font-style: italic; font-family: "Times New Roman", Times, serif; color: #000000; line-height: 1.25;'
      p.innerHTML = bq.innerHTML
      bq.parentNode.replaceChild(p, bq)
    })

    // 3. Unwrap single-cell nested tables inside question content cells (often created by pasted callouts or text boxes)
    doc.querySelectorAll('td.col-content-cell table, table.obe-paper-structure-table td table').forEach(tbl => {
      if (tbl.classList.contains('obe-code-table')) return
      const rows = Array.from(tbl.querySelectorAll('tr'))
      const cells = Array.from(tbl.querySelectorAll('td, th'))
      if (rows.length === 1 && cells.length === 1) {
        const div = doc.createElement('div')
        div.style.cssText = 'margin: 0; padding: 0; border: none;'
        div.innerHTML = cells[0].innerHTML
        tbl.parentNode.replaceChild(div, tbl)
      }
    })

    // 4. Strip all unwanted borders and outlines from inline elements inside question cells
    doc.querySelectorAll('td.col-content-cell *, table.obe-paper-structure-table td:nth-child(3) *').forEach(el => {
      if (
        el.tagName === 'TABLE' ||
        el.tagName === 'TD' ||
        el.tagName === 'TH' ||
        el.classList.contains('obe-code-block') ||
        el.classList.contains('obe-code-table') ||
        el.closest('.obe-code-snippet-container')
      ) {
        return
      }
      el.style.border = 'none'
      el.style.outline = 'none'
      if (el.hasAttribute('border')) el.removeAttribute('border')
      if (el.hasAttribute('style')) {
        let s = el.getAttribute('style')
        s = s.replace(/\bborder(-[a-z]+)?\s*:\s*[^;]+;?/gi, '')
        s = s.replace(/\bmso-border-[a-z]+\s*:\s*[^;]+;?/gi, '')
        s = s.replace(/\boutline(-[a-z]+)?\s*:\s*[^;]+;?/gi, '')
        el.setAttribute('style', s)
      }
    })

    // 5. Normalize all images (Logo, diagrams, uploads) and convert SVGs/diagrams to PNG for Word
    const allImages = Array.from(doc.querySelectorAll('img'))
    for (const img of allImages) {
      const src = img.getAttribute('src') || ''
      const alt = (img.getAttribute('alt') || '').toLowerCase()
      const isLogo = alt.includes('logo') || src.includes('data:image/gif') || src.includes('baiust')

      if (isLogo) {
        img.setAttribute('width', '48')
        img.setAttribute('height', '51')
        img.style.width = '48px'
        img.style.height = '51px'
        img.style.display = 'block'
        img.style.border = '0'
        img.style.transform = 'none'
      } else if (
        src.startsWith('data:image/svg+xml') ||
        src.includes('<svg') ||
        img.classList.contains('obe-graph-diagram') ||
        img.hasAttribute('data-diagram-payload')
      ) {
        let payload = null
        const rawPayload = img.getAttribute('data-diagram-payload')
        if (rawPayload) {
          try {
            payload = JSON.parse(decodeURIComponent(rawPayload))
          } catch (e) {
            try { payload = JSON.parse(rawPayload) } catch (e2) {}
          }
        }

        // Convert SVG diagram to high-res PNG for Microsoft Word compatibility
        const pngResult = await convertSvgDataUrlToPng(src, payload)
        if (pngResult && pngResult.dataUrl) {
          img.src = pngResult.dataUrl
          const displayW = Math.min(Math.max(pngResult.width, 180), 480)
          const displayH = Math.round(displayW * (pngResult.height / pngResult.width))
          img.setAttribute('width', String(displayW))
          img.setAttribute('height', String(displayH))
          img.style.width = `${displayW}px`
          img.style.height = 'auto'
          img.style.maxWidth = '100%'
          img.style.border = '0'
          img.style.transform = 'none'
        }
        if (img.parentElement) {
          img.parentElement.setAttribute('align', 'center')
          img.parentElement.style.textAlign = 'center'
          img.parentElement.style.margin = '8px auto'
        }
      } else {
        // Other raster images (PNG, JPEG, etc.)
        let explicitWidth = null
        const styleWidth = img.style.width || ''
        const attrWidth = img.getAttribute('width') || ''
        if (styleWidth.includes('px')) {
          explicitWidth = parseInt(styleWidth, 10)
        } else if (/^\d+$/.test(attrWidth)) {
          explicitWidth = parseInt(attrWidth, 10)
        }

        const safeWidth = explicitWidth ? Math.min(explicitWidth, 520) : Math.min(img.width || 460, 520)
        img.setAttribute('width', String(safeWidth))
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        img.style.border = '0'
        img.style.transform = 'none'

        if (img.classList.contains('obe-graph-diagram') || img.hasAttribute('data-obe-diagram') || alt.includes('diagram')) {
          if (img.parentElement) {
            img.parentElement.setAttribute('align', 'center')
            img.parentElement.style.textAlign = 'center'
            img.parentElement.style.margin = '6px auto'
          }
        }
      }
    }

    // 6. Normalize Tables for Word
    const allTables = Array.from(doc.querySelectorAll('table'))
    allTables.forEach(tbl => {
      const isStructureTable = tbl.classList.contains('obe-paper-structure-table') || tbl.getAttribute('data-obe-paper-structure') === 'true'
      const isCodeTable = tbl.classList.contains('obe-code-table')
      const isHeaderTable = tbl.closest('.qp-official-header, .qp-header-wrapper') !== null

      if (isHeaderTable) {
        tbl.setAttribute('border', '0')
        tbl.setAttribute('cellspacing', '0')
        tbl.setAttribute('cellpadding', '0')
        tbl.setAttribute('align', 'center')
        tbl.style.border = 'none'
        tbl.style.margin = '0 auto 6px auto'
        tbl.querySelectorAll('td, th').forEach(c => {
          c.setAttribute('border', '0')
          c.style.border = 'none'
        })
      } else if (isCodeTable) {
        tbl.setAttribute('border', '0')
        tbl.setAttribute('cellspacing', '0')
        tbl.setAttribute('cellpadding', '0')
        tbl.style.border = 'none'
        tbl.style.backgroundColor = 'transparent'
        tbl.querySelectorAll('.obe-code-ln').forEach(c => {
          c.setAttribute('border', '0')
          c.style.border = 'none'
          c.style.borderRight = '1px solid #999999'
          c.style.paddingRight = '8px'
          c.style.color = '#555555'
        })
        tbl.querySelectorAll('.obe-code-txt').forEach(c => {
          c.setAttribute('border', '0')
          c.style.border = 'none'
          c.style.paddingLeft = '8px'
          c.style.color = '#000000'
        })
      } else if (isStructureTable) {
        // Detect if user has cleared/hidden borders on the structure table in the editor
        const isBordersCleared = tbl.getAttribute('data-obe-borders-cleared') === 'true' ||
          tbl.classList.contains('borders-cleared') ||
          tbl.style.border === 'none' ||
          tbl.style.borderWidth === '0px' ||
          (tbl.getAttribute('style') || '').includes('border: none') ||
          (tbl.getAttribute('style') || '').includes('border:none')

        if (isBordersCleared) {
          tbl.setAttribute('border', '0')
          tbl.setAttribute('cellspacing', '0')
          tbl.setAttribute('cellpadding', '4')
          tbl.setAttribute('width', '100%')
          tbl.style.width = '100%'
          tbl.style.border = 'none'
          tbl.style.borderCollapse = 'collapse'
          tbl.querySelectorAll(':scope > tbody > tr > td, :scope > tbody > tr > th, :scope > tr > td, :scope > tr > th').forEach(c => {
            c.setAttribute('border', '0')
            c.style.border = 'none'
            c.style.fontFamily = "'Times New Roman', Times, serif"
            c.style.verticalAlign = 'top'
          })
        } else {
          tbl.setAttribute('border', '1')
          tbl.setAttribute('cellspacing', '0')
          tbl.setAttribute('cellpadding', '4')
          tbl.setAttribute('width', '100%')
          tbl.style.width = '100%'
          tbl.style.border = '1px solid #000000'
          tbl.style.borderCollapse = 'collapse'
          tbl.querySelectorAll(':scope > tbody > tr > td, :scope > tbody > tr > th, :scope > tr > td, :scope > tr > th').forEach(c => {
            c.style.border = '1px solid #000000'
            c.style.fontFamily = "'Times New Roman', Times, serif"
            c.style.verticalAlign = 'top'
          })
        }
      } else {
        // User nested content tables - ensure 100% width fit inside question column so it never overflows/gets cut off
        tbl.setAttribute('border', '1')
        tbl.setAttribute('cellspacing', '0')
        tbl.setAttribute('width', '100%')
        tbl.style.width = '100%'
        tbl.style.maxWidth = '100%'
        tbl.style.boxSizing = 'border-box'
        tbl.style.borderCollapse = 'collapse'
        tbl.style.msoTableLspace = '0pt'
        tbl.style.msoTableRspace = '0pt'
        tbl.style.tableLayout = 'auto'
        tbl.style.msoTableLayoutAlt = 'autofit'

        // Determine maximum columns in any row
        let maxCols = 1
        const rows = Array.from(tbl.querySelectorAll('tr'))
        rows.forEach(r => {
          const count = r.querySelectorAll('td, th').length
          if (count > maxCols) maxCols = count
        })

        // Dynamically compute proportional column width, padding, and font size based on column count
        const colWidthPct = (100 / maxCols).toFixed(1) + '%'
        let cellFontSize = '9pt'
        let cellPadding = '2px 4px'
        if (maxCols >= 6) {
          cellFontSize = '8pt'
          cellPadding = '2px 3px'
        } else if (maxCols === 5) {
          cellFontSize = '8.5pt'
          cellPadding = '2px 4px'
        }

        const align = tbl.getAttribute('data-obe-align') || 'center'
        if (align === 'center') {
          tbl.setAttribute('align', 'center')
          tbl.style.marginLeft = 'auto'
          tbl.style.marginRight = 'auto'
        } else if (align === 'left') {
          tbl.setAttribute('align', 'left')
          tbl.style.marginLeft = '0'
          tbl.style.marginRight = 'auto'
        } else if (align === 'right') {
          tbl.setAttribute('align', 'right')
          tbl.style.marginLeft = 'auto'
          tbl.style.marginRight = '0'
        }

        tbl.querySelectorAll('td, th').forEach(c => {
          c.setAttribute('border', '1')
          c.setAttribute('width', colWidthPct)
          c.style.border = '1px solid #000000'
          c.style.fontFamily = "'Times New Roman', Times, serif"
          c.style.fontSize = cellFontSize
          c.style.padding = cellPadding
          c.style.lineHeight = '1.15'
          c.style.wordBreak = 'break-word'
          c.style.overflowWrap = 'break-word'
          c.style.whiteSpace = 'normal'
          c.style.width = colWidthPct
          c.style.verticalAlign = 'middle'
          // Clean any explicit max-width / min-width styles that could force horizontal overflow
          if (c.hasAttribute('style')) {
            let s = c.getAttribute('style')
            s = s.replace(/\b(min-width|max-width)\s*:\s*[^;]+;?/gi, '')
            c.setAttribute('style', s)
          }
        })
      }
    })

    // 7. Sanitize and encode special Unicode characters (arrows, dashes)
    // using HTML decimal entities (&#8594;) so Microsoft Word never corrupts them into ANSI garbled characters (â†’)
    let bodyHtml = doc.body.innerHTML
      .replace(/→/g, '&#8594;')
      .replace(/â†’/g, '&#8594;')
      .replace(/&rarr;/g, '&#8594;')
      .replace(/←/g, '&#8592;')
      .replace(/↔/g, '&#8596;')
      .replace(/⇒/g, '&#8658;')
      .replace(/–/g, '&#8211;')
      .replace(/—/g, '&#8212;')

    // Clean any trailing empty paragraphs at the end of bodyHtml to prevent extra blank pages
    bodyHtml = bodyHtml.replace(/(?:<p[^>]*>(?:\s|&nbsp;|<br[^>]*>)*<\/p>\s*)+$/gi, '').trim()

    const wordHtml = `
      <html xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>${assessment.name || 'Question Paper'}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
            <w:ValidateAgainstSchemas/>
            <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
            <w:IgnoreMixedContent>false</w:IgnoreMixedContent>
            <w:AlwaysShowPlaceholderText>false</w:AlwaysShowPlaceholderText>
            <w:Compatibility>
              <w:BreakWrappedTables/>
              <w:SnapToGridInCell/>
              <w:WrapTextWithPunct/>
              <w:UseAsianBreakRules/>
              <w:DontGrowAutofit/>
            </w:Compatibility>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          /* Page Definition */
          @page Section1 {
            size: 210mm 297mm; /* A4 standard */
            margin: 20mm 18mm 22mm 18mm;
            mso-header-margin: 8mm;
            mso-footer-margin: 8mm;
            mso-header: h1;
            mso-footer: f1;
          }
          div.Section1 {
            page: Section1;
          }

          /* Base Typography */
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 10pt;
            line-height: 1.25;
            color: #000000;
            margin: 0;
            padding: 0;
          }
          p, div, td, th, span {
            font-family: 'Times New Roman', Times, serif;
          }

          /* Running Header & Footer for Word */
          p.MsoHeader, div.MsoHeader {
            margin: 0;
            font-family: 'Times New Roman', Times, serif;
            font-size: 9.5pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: center;
          }
          p.MsoFooter, div.MsoFooter {
            margin: 0;
            font-family: 'Times New Roman', Times, serif;
            font-size: 9pt;
            font-weight: bold;
            color: #000000;
            text-align: center;
          }
          #hrdftrtbl, table#hrdftrtbl {
            margin: 0in 0in 0in 9in;
            width: 1px;
            height: 1px;
            overflow: hidden;
          }

          /* University Header */
          .qp-official-header table,
          .qp-header-wrapper table {
            border: none !important;
            border-collapse: collapse !important;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
          }
          .qp-official-header td,
          .qp-header-wrapper td {
            border: none !important;
            padding: 0;
          }

          /* Main Exam Structure Table */
          table.obe-paper-structure-table {
            width: 100% !important;
            border-collapse: collapse !important;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            margin-bottom: 0 !important;
          }
          table.obe-paper-structure-table > tbody > tr > td,
          table.obe-paper-structure-table > tr > td {
            border: 1px solid #000000;
            padding: 3px 5px !important;
            vertical-align: top !important;
            font-family: 'Times New Roman', Times, serif !important;
            font-size: 10pt !important;
            line-height: 1.25 !important;
          }

          /* When borders are cleared on structure table, force borders to none on direct cells */
          table.obe-paper-structure-table.borders-cleared,
          table.obe-paper-structure-table[data-obe-borders-cleared="true"] {
            border: none !important;
          }
          table.obe-paper-structure-table.borders-cleared > tbody > tr > td,
          table.obe-paper-structure-table.borders-cleared > tr > td,
          table.obe-paper-structure-table[data-obe-borders-cleared="true"] > tbody > tr > td,
          table.obe-paper-structure-table[data-obe-borders-cleared="true"] > tr > td,
          table.obe-paper-structure-table.borders-cleared td,
          table.obe-paper-structure-table[data-obe-borders-cleared="true"] td {
            border: none !important;
          }

          /* Prevent borders/boxes around question text inside content cells */
          .col-content-cell p,
          .col-content-cell span,
          .col-content-cell div:not(.obe-code-snippet-container) {
            border: none !important;
            outline: none !important;
          }

          /* Spacer Rows */
          tr[data-space-row="true"] td,
          tr.space-row td {
            height: 14pt !important;
            font-size: 10pt !important;
            border: 1px solid #000000;
            padding: 0 4px !important;
          }
          table.obe-paper-structure-table.borders-cleared tr[data-space-row="true"] td,
          table.obe-paper-structure-table[data-obe-borders-cleared="true"] tr[data-space-row="true"] td {
            border: none !important;
          }

          /* Part Header Row */
          tr[data-part-row="true"] td {
            font-size: 13pt !important;
            font-weight: bold !important;
            text-align: center !important;
            letter-spacing: 0.5px !important;
          }

          /* Question OR Row */
          tr[data-or-row="true"] td {
            font-size: 11pt !important;
            font-weight: bold !important;
            text-align: center !important;
            letter-spacing: 0.5px !important;
          }

          /* Nested Content Tables */
          .col-content-cell table:not(.obe-code-table) {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            margin: 6px auto !important;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            table-layout: auto !important;
            box-sizing: border-box !important;
          }
          .col-content-cell table:not(.obe-code-table) td,
          .col-content-cell table:not(.obe-code-table) th {
            border: 1px solid #000000 !important;
            padding: 2px 3px !important;
            font-family: 'Times New Roman', Times, serif !important;
            font-size: 8.5pt !important;
            line-height: 1.15 !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
            vertical-align: middle !important;
          }

          /* Code Snippets */
          .obe-code-snippet-container {
            margin: 6px 0;
          }
          pre.obe-code-block {
            display: inline-block;
            border: 1px solid #444444 !important;
            background-color: #f8f9fa !important;
            padding: 6px 10px !important;
            margin: 4px 0 !important;
            font-family: 'Consolas', 'Courier New', Courier, monospace !important;
            font-size: 9pt !important;
            line-height: 1.3 !important;
          }
          table.obe-code-table {
            border: none !important;
            background: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          table.obe-code-table td {
            border: none !important;
            padding: 1px 4px !important;
            font-family: 'Consolas', 'Courier New', Courier, monospace !important;
            font-size: 9pt !important;
            line-height: 1.3 !important;
          }
          .obe-code-ln {
            border-right: 1px solid #999999 !important;
            padding-right: 8px !important;
            color: #555555 !important;
          }
          .obe-code-txt {
            padding-left: 8px !important;
            color: #000000 !important;
          }

          /* Diagrams and Images */
          img {
            max-width: 100%;
            border: 0;
            outline: none;
          }
          .obe-graph-diagram {
            display: block;
            margin: 6px auto;
          }

          /* Raw LaTeX Equations */
          .latex-equation {
            font-family: 'Cambria Math', 'Times New Roman', serif;
            font-size: 11pt;
            color: #000000;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${bodyHtml}
        </div>

        <!-- Word Running Header and Footer -->
        <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="mso-element:header" id="h1">
                <p class="MsoHeader" align="center" style="text-align:center;font-family:'Times New Roman',Times,serif;font-size:9.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#000000;margin:0;">
                  ${confText}
                </p>
              </div>
            </td>
            <td>
              <div style="mso-element:footer" id="f1">
                <p class="MsoFooter" align="center" style="text-align:center;font-family:'Times New Roman',Times,serif;font-size:9pt;font-weight:bold;color:#000000;margin:0 0 2px 0;letter-spacing:0.5px;">
                  <span style="mso-field-code: PAGE "></span> OF <span style="mso-field-code: NUMPAGES "></span>
                </p>
                <p class="MsoFooter" align="center" style="text-align:center;font-family:'Times New Roman',Times,serif;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#000000;margin:0;">
                  ${confText}
                </p>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    const blob = new Blob(['\ufeff' + wordHtml], {
      type: 'application/msword;charset=utf-8'
    })

    const downloadFileName = `${generateExportBaseFileName()}.doc`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadFileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ===========================================================================
  // AUTHENTIC BAIUST EXAM PAPER PRINT ENGINE — PIXEL-PERFECT
  // ===========================================================================
  // Architecture: Isolated IFrame with position:fixed running header/footer.
  //
  // Key design decisions:
  // 1. @page { margin: 18mm } — symmetric balanced margins on all sides,
  //    also suppresses browser Date/URL chrome in Chromium
  // 2. position:fixed header/footer — pinned inside @page margin area,
  //    appears on EVERY page including partially filled last page
  // 3. JS-based page count — measures scrollHeight and injects "X of Y"
  //    (CSS counter(pages) doesn't work in Chromium DOM elements)
  // 4. Compact academic spacing — tight layout matching physical exam papers
  // 5. Selective break-inside:avoid — only on atomic elements
  // 6. Centered diagrams — graphs, automata, images: margin:auto
  // 7. Hidden iframe — editor DOM stays 100% intact
  // ===========================================================================
  const handlePrint = async () => {
    const currentContent = rteRef.current ? rteRef.current.value : editorValue
    const headerHtml = getHeaderHtml()
    const coDescriptions = getCoDescriptionsHtml()
    const rawAnnotatedContent = injectQuestionAnnotations(currentContent)
    const exportBaseFileName = generateExportBaseFileName()

    // Render equations into native vector KaTeX HTML
    const equationRenderedContent = renderEquationsForPrint(rawAnnotatedContent)

    // Sanitize nested tables + trim trailing empty nodes + purge redundant footers
    const annotatedContent = sanitizeNestedTablesForPrint(equationRenderedContent)

    // Clean university header by removing any embedded static confidential markings
    let cleanHeaderHtml = headerHtml || ''
    cleanHeaderHtml = cleanHeaderHtml.replace(/<div class="static-top-confidential"[\s\S]*?<\/div>/gi, '')

    // Collect KaTeX CSS rules for injection
    let katexCssInline = ''
    try {
      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules
          if (rules) {
            for (const rule of rules) {
              if (rule.cssText && (rule.cssText.includes('.katex') || rule.cssText.includes('KaTeX_'))) {
                katexCssInline += rule.cssText + '\n'
              }
            }
          }
        } catch (e) { /* cross-origin */ }
      }
    } catch (e) { /* no stylesheets */ }

    // -------------------------------------------------------------------------
    // Deterministic Sheet Pagination & Measurement Sandbox Routine
    // -------------------------------------------------------------------------
    // 1. Parse content to cleanly separate structure table rows from any surrounding elements
    const parser = new DOMParser()
    const contentDoc = parser.parseFromString(annotatedContent, 'text/html')
    const structureTable = contentDoc.querySelector('table.obe-paper-structure-table, table[data-obe-paper-structure="true"]')

    let preTableHtml = ''
    let postTableHtml = ''
    if (structureTable) {
      let foundTable = false
      Array.from(contentDoc.body.children).forEach(child => {
        if (child === structureTable) {
          foundTable = true
        } else if (!foundTable) {
          preTableHtml += child.outerHTML
        } else {
          postTableHtml += child.outerHTML
        }
      })
    }

    // 2. Accurate A4 Pixel Budget Calculation (210mm x 297mm at 96 DPI)
    // Physical A4: 297mm = ~1123px.
    // Protected Top: 10mm padding (~38px) + confidential header (~25px) = ~63px.
    // Protected Bottom: Compact footer (3.5mm bottom + 9.5mm height = 13mm) leaving >266mm for content.
    // Slicing budget: 980px (~259mm) provides an optimal balance: fills the page naturally while maintaining a clean 7-8mm safety margin above the footer.
    const USABLE_SHEET_HEIGHT = 980

    const getAvailableHeight = (isFirst, hH = 0) => {
      if (isFirst) {
        return Math.max(150, USABLE_SHEET_HEIGHT - hH)
      }
      return USABLE_SHEET_HEIGHT
    }

    // Hidden measurement sandbox matching exact printable width (174mm = 210mm - 18mm*2)
    const sandbox = document.createElement('div')
    sandbox.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:174mm;visibility:hidden;font-family:"Times New Roman",Times,serif;font-size:10pt;line-height:1.3;box-sizing:border-box;'

    // Inject exact print simulation styles and KaTeX rules into measurement sandbox so offsets match print layout
    const sandboxStyle = document.createElement('style')
    sandboxStyle.textContent = `
      ${katexCssInline}
      * { box-sizing: border-box; }
      .print-exam-header { margin: 0 0 3mm 0; padding: 0; }
      table.obe-paper-structure-table { width: 174mm; border-collapse: collapse; table-layout: fixed; margin: 2px 0; }
      table.obe-paper-structure-table > tbody > tr > td { vertical-align: top; font-family: "Times New Roman", Times, serif; font-size: 10pt; line-height: 1.3; }
      .col-qnum-cell { width: 24px; min-width: 24px; max-width: 28px; padding: 3px 2px 3px 0; font-weight: bold; white-space: nowrap; vertical-align: top; }
      .col-subq-cell { width: 20px; min-width: 20px; max-width: 24px; padding: 3px 3px 3px 0; font-weight: bold; white-space: nowrap; vertical-align: top; }
      .col-content-cell { padding: 3px 8px; word-break: break-word; overflow-wrap: break-word; vertical-align: top; }
      .col-marks-cell { width: 42px; min-width: 42px; max-width: 46px; padding: 3px 0 3px 3px; text-align: right; font-weight: bold; white-space: nowrap; vertical-align: top; }
      
      /* Question text paragraphs */
      .col-content-cell p, td.col-content-cell p { margin: 2px 0 3px 0; padding: 0; line-height: 1.25; display: block; clear: both; }
      
      /* Part headers and OR separators */
      tr > td[colspan="4"] { padding: 6px 6px; font-size: 11pt; text-align: center; font-weight: bold; }
      tr[data-obe-row="or-separator"] > td { padding: 4px 6px; font-size: 10pt; font-weight: bold; text-align: center; letter-spacing: 2px; }
      
      /* Scenario box and blockquotes */
      .col-content-cell .scenario-box, .col-content-cell blockquote { margin: 4px 0; padding: 4px 8px; font-size: 10pt; }
      .katex-display { margin: 4px 0; }
      
      /* Nested user tables — compact styling matching print iframe */
      .col-content-cell table:not(.obe-code-table) { width: auto; max-width: 100%; margin: 4px auto; border-collapse: collapse; table-layout: auto; font-size: 9pt; line-height: 1.2; }
      .col-content-cell table[data-obe-align="left"], .col-content-cell table.obe-align-left { margin-left: 0; margin-right: auto; }
      .col-content-cell table[data-obe-align="right"], .col-content-cell table.obe-align-right { margin-left: auto; margin-right: 0; }
      .col-content-cell table[data-obe-align="center"], .col-content-cell table.obe-align-center { margin-left: auto; margin-right: auto; }
      .col-content-cell table[data-obe-align="full"], .col-content-cell table.obe-table-full { width: 100%; margin-left: 0; margin-right: 0; }
      
      .col-content-cell table th, .col-content-cell table td { border: 1px solid #000; padding: 2px 4px; font-size: 9pt; line-height: 1.2; word-break: break-word; overflow-wrap: break-word; vertical-align: middle; }
      .col-content-cell table th { font-weight: bold; }
      
      /* Auto-scaled compact tables (5+ columns, e.g. Q4.a snapshot table) */
      .col-content-cell table.obe-print-compact, .col-content-cell table.obe-print-compact td, .col-content-cell table.obe-print-compact th { font-size: 8pt !important; line-height: 1.1 !important; padding: 1.5px 2.5px !important; }
      
      /* Inner table paragraphs MUST NOT inherit question paragraph margins */
      .col-content-cell table td p, .col-content-cell table td div { display: block; margin: 0; padding: 0; line-height: inherit; }
      
      /* Code tables and snippets */
      .obe-code-table { font-size: 8.5pt; line-height: 1.15; margin: 4px 0; }
      .obe-code-table td { padding: 3px 5px; }
      pre.obe-code-block { font-family: Consolas, monospace; font-size: 9pt; line-height: 1.35; margin: 0; }
      
      /* Images / diagrams */
      .col-content-cell img, .col-content-cell svg, .col-content-cell canvas, .col-content-cell .diagram-container, .col-content-cell .graph-container { display: block; margin: 6px auto; text-align: center; max-width: 90%; height: auto; }
    `
    sandbox.appendChild(sandboxStyle)
    document.body.appendChild(sandbox)

    // Measure actual rendered height of university metadata header for Sheet 1
    const headerSandbox = document.createElement('div')
    headerSandbox.className = 'print-exam-header'
    headerSandbox.style.width = '174mm'
    headerSandbox.innerHTML = cleanHeaderHtml + coDescriptions + (preTableHtml || '')
    sandbox.appendChild(headerSandbox)
    const headerHeightPx = (headerSandbox.offsetHeight || 220) + 15
    sandbox.removeChild(headerSandbox)

    // Measurement table inside sandbox matching exact print styles
    const measureTable = document.createElement('table')
    measureTable.className = 'obe-paper-structure-table'
    measureTable.style.cssText = 'width:174mm;border-collapse:collapse;table-layout:fixed;'
    measureTable.innerHTML = `
      <colgroup>
        <col style="width:24px;" />
        <col style="width:20px;" />
        <col style="width:auto;" />
        <col style="width:42px;" />
      </colgroup>
      <tbody></tbody>
    `
    sandbox.appendChild(measureTable)
    const measureTbody = measureTable.querySelector('tbody')

    const measureRowHtml = (html) => {
      measureTbody.innerHTML = html
      return measureTbody.firstElementChild ? measureTbody.firstElementChild.offsetHeight : 35
    }

    const renderRowHtml = (rowInfo, blocks, isCont, showMarks) => {
      const qNum = isCont ? '' : (rowInfo.qNum || '')
      const subQ = isCont ? '' : (rowInfo.subQ || '')
      const marks = showMarks ? (rowInfo.marks || '') : ''
      const contentHtml = blocks.map(b => b.outerHTML).join('')

      return `
        <tr>
          <td class="col-qnum-cell">${qNum}</td>
          <td class="col-subq-cell">${subQ}</td>
          <td class="col-content-cell">${contentHtml}</td>
          <td class="col-marks-cell">${marks}</td>
        </tr>
      `
    }

    const measureRowWithChildren = (rowInfo, blocks, isCont, showMarks) => {
      const html = renderRowHtml(rowInfo, blocks, isCont, showMarks)
      measureTbody.innerHTML = html
      return measureTbody.firstElementChild ? measureTbody.firstElementChild.offsetHeight : 35
    }

    const isSliceableContainer = (el) => {
      if (!el || !el.tagName) return false
      const tag = el.tagName.toLowerCase()
      if (el.classList.contains('obe-code-snippet-container') || el.classList.contains('obe-code-block') || tag === 'pre') return true
      if (tag === 'table' && !el.classList.contains('obe-paper-structure-table') && el.getAttribute('data-obe-paper-structure') !== 'true') return true
      if (tag === 'div' && el.querySelector('pre.obe-code-block, table.obe-code-table, table:not(.obe-paper-structure-table)')) return true
      return false
    }

    const trySliceBlock = (block, item, currentFitting, isCont, currentH, maxH) => {
      if (!block || !block.tagName) return null

      // --- 1. CODE SNIPPET SLICING ---
      const isCode = block.classList.contains('obe-code-snippet-container') ||
                     block.classList.contains('obe-code-block') ||
                     block.tagName.toLowerCase() === 'pre' ||
                     !!block.querySelector('pre.obe-code-block, table.obe-code-table, pre')

      if (isCode) {
        // Case A: Line-numbered code table
        const codeTable = block.querySelector('.obe-code-table')
        const codeRows = codeTable ? Array.from(codeTable.querySelectorAll('tbody > tr, tr')) : []

        if (codeTable && codeRows.length > 1) {
          let bestK = 0
          let bestPart1 = null

          for (let k = 1; k < codeRows.length; k++) {
            const cand1 = block.cloneNode(true)
            const cand1Tbody = cand1.querySelector('.obe-code-table tbody') || cand1.querySelector('.obe-code-table')
            if (cand1Tbody) {
              cand1Tbody.innerHTML = codeRows.slice(0, k).map(r => r.outerHTML).join('')
            }
            const testH = measureRowWithChildren(item, [...currentFitting, cand1], isCont, false)
            if (currentH + testH <= maxH) {
              bestK = k
              bestPart1 = cand1
            } else {
              break
            }
          }

          if (bestK >= 1 && bestPart1) {
            const cand2 = block.cloneNode(true)
            const cand2Tbody = cand2.querySelector('.obe-code-table tbody') || cand2.querySelector('.obe-code-table')
            if (cand2Tbody) {
              cand2Tbody.innerHTML = codeRows.slice(bestK).map(r => r.outerHTML).join('')
            }
            return { part1: bestPart1, part2: cand2 }
          }
          return null
        }

        // Case B: Non-table code block (code/pre with newline-separated lines)
        const codeTarget = block.querySelector('code') || block.querySelector('pre') || (block.tagName.toLowerCase() === 'pre' ? block : null)
        if (codeTarget) {
          const rawHtml = codeTarget.innerHTML
          let codeLines = rawHtml.split(/\r?\n/)
          let joinDelimiter = '\n'
          if (codeLines.length <= 1 && rawHtml.includes('<br')) {
            codeLines = rawHtml.split(/<br\s*\/?>/i)
            joinDelimiter = '<br/>'
          }

          if (codeLines.length > 2) {
            let bestK = 0
            let bestPart1 = null

            for (let k = 1; k < codeLines.length; k++) {
              const cand1 = block.cloneNode(true)
              const cand1Target = cand1.querySelector('code') || cand1.querySelector('pre') || (cand1.tagName.toLowerCase() === 'pre' ? cand1 : null)
              if (cand1Target) {
                cand1Target.innerHTML = codeLines.slice(0, k).join(joinDelimiter)
              }
              const testH = measureRowWithChildren(item, [...currentFitting, cand1], isCont, false)
              if (currentH + testH <= maxH) {
                bestK = k
                bestPart1 = cand1
              } else {
                break
              }
            }

            if (bestK >= 1 && bestPart1) {
              const cand2 = block.cloneNode(true)
              const cand2Target = cand2.querySelector('code') || cand2.querySelector('pre') || (cand2.tagName.toLowerCase() === 'pre' ? cand2 : null)
              if (cand2Target) {
                cand2Target.innerHTML = codeLines.slice(bestK).join(joinDelimiter)
              }
              return { part1: bestPart1, part2: cand2 }
            }
          }
        }
        return null
      }

      // --- 2. USER DATA TABLE SLICING ---
      const isTable = block.tagName.toLowerCase() === 'table' &&
                      !block.classList.contains('obe-paper-structure-table') &&
                      block.getAttribute('data-obe-paper-structure') !== 'true'
      const nestedTable = isTable ? block : block.querySelector('table:not(.obe-paper-structure-table):not(.obe-code-table)')

      if (nestedTable) {
        const thead = nestedTable.querySelector('thead')
        const tbody = nestedTable.querySelector('tbody') || nestedTable
        const allTrs = Array.from(tbody.querySelectorAll(':scope > tr'))

        if (allTrs.length > 1) {
          const hasThead = !!thead
          const firstRowIsHeader = !hasThead && !!allTrs[0].querySelector('th')
          const headerRow = firstRowIsHeader ? allTrs[0] : null
          const dataRows = firstRowIsHeader ? allTrs.slice(1) : allTrs

          if (dataRows.length > 1) {
            let bestK = 0
            let bestPart1 = null

            for (let k = 1; k < dataRows.length; k++) {
              const cand1 = block.cloneNode(true)
              const cand1Table = cand1.tagName.toLowerCase() === 'table' ? cand1 : cand1.querySelector('table:not(.obe-paper-structure-table):not(.obe-code-table)')
              const cand1Tbody = cand1Table.querySelector('tbody') || cand1Table
              const cand1Rows = headerRow ? [headerRow, ...dataRows.slice(0, k)] : dataRows.slice(0, k)
              cand1Tbody.innerHTML = cand1Rows.map(r => r.outerHTML).join('')

              const testH = measureRowWithChildren(item, [...currentFitting, cand1], isCont, false)
              if (currentH + testH <= maxH) {
                bestK = k
                bestPart1 = cand1
              } else {
                break
              }
            }

            if (bestK >= 1 && bestPart1) {
              const cand2 = block.cloneNode(true)
              const cand2Table = cand2.tagName.toLowerCase() === 'table' ? cand2 : cand2.querySelector('table:not(.obe-paper-structure-table):not(.obe-code-table)')
              const cand2Tbody = cand2Table.querySelector('tbody') || cand2Table
              const cand2Rows = headerRow ? [headerRow, ...dataRows.slice(bestK)] : dataRows.slice(bestK)
              cand2Tbody.innerHTML = cand2Rows.map(r => r.outerHTML).join('')

              return { part1: bestPart1, part2: cand2 }
            }
          }
        }
        return null
      }

      return null
    }

    const extractGranularBlocks = (contentCell) => {
      if (!contentCell) return []
      if (contentCell.children.length > 1) {
        return Array.from(contentCell.children)
      }
      if (contentCell.children.length === 1) {
        const single = contentCell.firstElementChild
        const tag = single.tagName.toLowerCase()
        const isAtomic = single.classList.contains('scenario-box') ||
                         single.classList.contains('katex-display') ||
                         single.classList.contains('diagram-container') ||
                         single.classList.contains('graph-container') ||
                         single.classList.contains('obe-code-snippet-container') ||
                         single.classList.contains('math-equation-wrapper') ||
                         tag === 'table' || tag === 'svg' || tag === 'img' || tag === 'pre'
        if (!isAtomic && single.children.length > 1) {
          return Array.from(single.children)
        }
        return [single]
      }
      return []
    }

    const sheets = []

    if (structureTable) {
      // Select top-level rows only — NEVER tear nested user tables inside col-content-cell
      const topLevelRows = Array.from(structureTable.querySelectorAll(':scope > tbody > tr, :scope > tr'))

      const itemsToPack = topLevelRows.map(row => {
        const isSpecial = !!row.querySelector('td[colspan="4"]') ||
                          row.getAttribute('data-obe-row') === 'or-separator' ||
                          row.textContent.trim().toUpperCase() === 'OR'

        if (isSpecial) {
          return {
            type: 'header',
            isSpecial: true,
            html: row.outerHTML,
            height: measureRowHtml(row.outerHTML)
          }
        }

        const qNum = row.querySelector('.col-qnum-cell')?.innerHTML.trim() || ''
        const subQ = row.querySelector('.col-subq-cell')?.innerHTML.trim() || ''
        const marks = row.querySelector('.col-marks-cell')?.innerHTML.trim() || ''
        const contentCell = row.querySelector('.col-content-cell')

        const childBlocks = extractGranularBlocks(contentCell)
        const fullHeight = measureRowHtml(row.outerHTML)

        return {
          type: 'question',
          qNum,
          subQ,
          marks,
          canSplit: childBlocks.length > 1 || (childBlocks.length === 1 && isSliceableContainer(childBlocks[0])),
          childBlocks,
          rowElement: row,
          html: row.outerHTML,
          height: fullHeight
        }
      })

      // Fluid Space Allocation & Anti-Orphan Greedy Slicing Loop
      let currentSheetRows = []
      let currentSheetH = 0
      let isFirstPage = true
      let maxAllowedH = getAvailableHeight(true, headerHeightPx)

      for (let i = 0; i < itemsToPack.length; i++) {
        const item = itemsToPack[i]

        // Special header row (PART A, PART B, OR separator)
        if (item.isSpecial) {
          if (currentSheetRows.length > 0 && (currentSheetH + item.height > maxAllowedH)) {
            sheets.push([...currentSheetRows])
            currentSheetRows = [item.html]
            isFirstPage = false
            maxAllowedH = getAvailableHeight(false, 0)
            currentSheetH = item.height
          } else {
            currentSheetRows.push(item.html)
            currentSheetH += item.height
          }
          continue
        }

        // Atomic question: cannot be sliced
        if (!item.canSplit) {
          if (currentSheetH + item.height <= maxAllowedH) {
            currentSheetRows.push(item.html)
            currentSheetH += item.height
          } else {
            // Look-behind: If last placed item was an orphaned PART or OR separator, pull it to next sheet
            const prevItem = itemsToPack[i - 1]
            if (prevItem && prevItem.isSpecial && currentSheetRows.length > 1) {
              currentSheetRows.pop()
              sheets.push([...currentSheetRows])
              currentSheetRows = [prevItem.html, item.html]
              isFirstPage = false
              maxAllowedH = getAvailableHeight(false, 0)
              currentSheetH = prevItem.height + item.height
            } else {
              sheets.push([...currentSheetRows])
              currentSheetRows = [item.html]
              isFirstPage = false
              maxAllowedH = getAvailableHeight(false, 0)
              currentSheetH = item.height
            }
          }
          continue
        }

        // Divisible question: greedy child block slicing with anti-orphan protection
        let remainingBlocks = item.childBlocks
        let isContinuation = false

        while (remainingBlocks.length > 0) {
          // If all remaining blocks fit on current sheet
          const fullRemainingH = measureRowWithChildren(item, remainingBlocks, isContinuation, true)
          if (currentSheetH + fullRemainingH <= maxAllowedH) {
            const rowHtml = renderRowHtml(item, remainingBlocks, isContinuation, true)
            currentSheetRows.push(rowHtml)
            currentSheetH += fullRemainingH
            break
          }

          // Does not fit fully! Pack as many child blocks as fit into the remaining space
          let fittingBlocks = []
          let nextRemaining = []

          for (let b = 0; b < remainingBlocks.length; b++) {
            const testList = [...fittingBlocks, remainingBlocks[b]]
            const testH = measureRowWithChildren(item, testList, isContinuation, false)
            if (currentSheetH + testH <= maxAllowedH) {
              fittingBlocks.push(remainingBlocks[b])
            } else {
              // remainingBlocks[b] does not fit in full!
              // Attempt to smart-slice code snippet or user data table across pages
              const sliceResult = trySliceBlock(
                remainingBlocks[b],
                item,
                fittingBlocks,
                isContinuation,
                currentSheetH,
                maxAllowedH
              )

              if (sliceResult) {
                fittingBlocks.push(sliceResult.part1)
                nextRemaining = [sliceResult.part2, ...remainingBlocks.slice(b + 1)]
              } else {
                nextRemaining = remainingBlocks.slice(b)
              }
              break
            }
          }

          // Anti-orphan safeguard: If only 1 block fits on a new question start,
          // and that block is a short question statement (< 180 chars / < 100px) while major blocks remain,
          // do not leave an isolated heading at the bottom of the sheet! Push the whole question to next sheet.
          if (!isContinuation && fittingBlocks.length === 1 && remainingBlocks.length > 1) {
            const firstBlock = fittingBlocks[0]
            const tag = firstBlock.tagName ? firstBlock.tagName.toLowerCase() : ''
            const isShortHeader = (tag === 'p' || tag === 'div' || tag.startsWith('h')) && firstBlock.textContent.trim().length < 180
            if (isShortHeader && currentSheetRows.length > 0) {
              fittingBlocks = []
              nextRemaining = item.childBlocks
            }
          }

          if (fittingBlocks.length > 0) {
            // Render fitting slice on current sheet (marks shown if this is question start)
            const partHtml = renderRowHtml(item, fittingBlocks, isContinuation, !isContinuation)
            currentSheetRows.push(partHtml)
            sheets.push([...currentSheetRows])

            // Advance to new sheet for remaining slice
            currentSheetRows = []
            isFirstPage = false
            maxAllowedH = getAvailableHeight(false, 0)
            currentSheetH = 0
            isContinuation = true
            remainingBlocks = nextRemaining
          } else {
            // No blocks fit in remaining space on current sheet
            if (currentSheetRows.length > 0) {
              // Check look-behind for orphaned special header
              const prevItem = itemsToPack[i - 1]
              if (!isContinuation && prevItem && prevItem.isSpecial && currentSheetRows.length > 1) {
                currentSheetRows.pop()
                sheets.push([...currentSheetRows])
                currentSheetRows = [prevItem.html]
                isFirstPage = false
                maxAllowedH = getAvailableHeight(false, 0)
                currentSheetH = prevItem.height
              } else {
                sheets.push([...currentSheetRows])
                currentSheetRows = []
                isFirstPage = false
                maxAllowedH = getAvailableHeight(false, 0)
                currentSheetH = 0
              }
            } else {
              // Current sheet is already blank, but even 1 block exceeds maxAllowedH (very large block)
              // Attempt to slice the oversized block across pages
              const sliceResult = trySliceBlock(
                remainingBlocks[0],
                item,
                [],
                isContinuation,
                0,
                maxAllowedH
              )

              if (sliceResult) {
                const partHtml = renderRowHtml(item, [sliceResult.part1], isContinuation, !isContinuation)
                currentSheetRows.push(partHtml)
                sheets.push([...currentSheetRows])

                currentSheetRows = []
                isFirstPage = false
                maxAllowedH = getAvailableHeight(false, 0)
                currentSheetH = 0
                isContinuation = true
                remainingBlocks = [sliceResult.part2, ...remainingBlocks.slice(1)]
              } else {
                // Force place at least 1 block to ensure progress
                const forcedBlock = [remainingBlocks[0]]
                const forcedHtml = renderRowHtml(item, forcedBlock, isContinuation, remainingBlocks.length === 1)
                currentSheetRows.push(forcedHtml)
                sheets.push([...currentSheetRows])

                currentSheetRows = []
                isFirstPage = false
                maxAllowedH = getAvailableHeight(false, 0)
                currentSheetH = 0
                isContinuation = true
                remainingBlocks = remainingBlocks.slice(1)
              }
            }
          }
        }
      }

      if (currentSheetRows.length > 0) {
        sheets.push(currentSheetRows)
      }
    } else {
      // Fallback if content has no structure table: chunk top-level child elements
      const topLevelBlocks = Array.from(contentDoc.body.children)
      const measuredBlocks = topLevelBlocks.map(block => {
        const clone = block.cloneNode(true)
        sandbox.appendChild(clone)
        const height = clone.offsetHeight || 30
        sandbox.removeChild(clone)
        return { html: block.outerHTML, height }
      })

      let currentSheetRows = []
      let currentSheetUsedH = 0
      let maxAllowedH = getAvailableHeight(true, headerHeightPx)

      for (const item of measuredBlocks) {
        if (currentSheetRows.length > 0 && (currentSheetUsedH + item.height > maxAllowedH)) {
          sheets.push(currentSheetRows)
          currentSheetRows = [item.html]
          maxAllowedH = getAvailableHeight(false, 0)
          currentSheetUsedH = item.height
        } else {
          currentSheetRows.push(item.html)
          currentSheetUsedH += item.height
        }
      }
      if (currentSheetRows.length > 0) {
        sheets.push(currentSheetRows)
      }
    }

    // Clean up sandbox DOM element
    try { document.body.removeChild(sandbox) } catch (e) {}

    // Ensure at least one sheet exists
    if (sheets.length === 0) {
      sheets.push([])
    }

    const totalPages = sheets.length

    // Column definition template for OBE Question Paper structure table
    const colgroupHtml = `
      <colgroup>
        <col class="col-qnum" style="width:24px;" />
        <col class="col-subq" style="width:20px;" />
        <col class="col-content" style="width:auto;" />
        <col class="col-marks" style="width:42px;" />
      </colgroup>
    `

    // Generate discrete A4 print sheets with deterministic page numbering
    const generatedSheetsHtml = sheets.map((sheetRows, index) => {
      const pageNumber = index + 1
      const isFirstPage = index === 0
      const isLastPage = index === sheets.length - 1

      let sheetBodyContent = ''
      if (structureTable) {
        const isBordersCleared = structureTable.classList.contains('borders-cleared') ||
                                 structureTable.getAttribute('data-obe-borders-cleared') === 'true'
        const rowsHtml = sheetRows.join('')
        const tableHtml = rowsHtml ? `
          <table class="obe-paper-structure-table${isBordersCleared ? ' borders-cleared' : ''}" data-obe-paper-structure="true"${isBordersCleared ? ' data-obe-borders-cleared="true"' : ''}>
            ${colgroupHtml}
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        ` : ''

        sheetBodyContent = `
          ${isFirstPage ? `<div class="print-exam-header">${cleanHeaderHtml}${coDescriptions}</div>${preTableHtml}` : ''}
          ${tableHtml}
          ${isLastPage && postTableHtml ? `<div class="post-table-content">${postTableHtml}</div>` : ''}
        `
      } else {
        sheetBodyContent = `
          ${isFirstPage ? `<div class="print-exam-header">${cleanHeaderHtml}${coDescriptions}</div>` : ''}
          ${sheetRows.join('')}
        `
      }

      return `
        <div class="exam-print-sheet">
          <!-- TOP RUNNING HEADER -->
          <div class="sheet-header-confidential">EXAMINATION CONFIDENTIAL</div>

          <!-- SHEET CONTENT -->
          <div class="sheet-content-body">
            ${sheetBodyContent}
          </div>

          <!-- PINNED BOTTOM FOOTER WITH PROMINENT PAGE NUMBER -->
          <div class="sheet-footer-container">
            <div class="sheet-page-number">${pageNumber} OF ${totalPages}</div>
            <div class="sheet-footer-confidential">EXAMINATION CONFIDENTIAL</div>
          </div>
        </div>
      `
    }).join('')

    // -------------------------------------------------------------------------
    // Discrete Sheet Print Document with Zero-Margin @page CSS
    // -------------------------------------------------------------------------
    const printDocumentHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${exportBaseFileName}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <style>
            ${katexCssInline}

            * { box-sizing: border-box; }

            @media print {
              @page {
                size: A4 portrait;
                margin: 0 !important; /* CRITICAL: Completely suppresses Chromium Date, Time, URL, and 1/5 */
              }

              html, body {
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                min-height: auto !important;
                background: #fff !important;
                font-family: "Times New Roman", Times, serif !important;
                color: #000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* Fixed A4 dimensions with protected internal margins */
              .exam-print-sheet {
                width: 210mm !important;
                height: 296mm !important;
                max-height: 296mm !important;
                position: relative !important; /* Creates positioning context for absolute footer */
                box-sizing: border-box !important;
                padding: 10mm 18mm 0mm 18mm !important;
                overflow: hidden !important;
                background: #fff !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              .exam-print-sheet:not(:last-child) {
                page-break-after: always !important;
                break-after: page !important;
              }

              .exam-print-sheet:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }

              /* Top Running Header: Pinned at top as protected block */
              .sheet-header-confidential {
                text-align: center !important;
                font-size: 9.5pt !important;
                font-weight: bold !important;
                letter-spacing: 0.5px !important;
                text-transform: uppercase !important;
                margin-bottom: 3mm !important;
                height: 14px !important;
                line-height: 14px !important;
                background: #ffffff !important;
                z-index: 9999 !important;
                font-family: "Times New Roman", Times, serif !important;
              }

              /* Content area strictly bounded above footer zone */
              .sheet-content-body {
                width: 100% !important;
                max-height: 268mm !important; /* Maximized content area allowing bottom borders and padding to display fully without clipping */
                overflow: hidden !important;
              }

              /* ABSOLUTELY PINNED FOOTER: Compact protected block locked to the bottom */
              .sheet-footer-container {
                position: absolute !important;
                bottom: 3.5mm !important;
                left: 18mm !important;
                right: 18mm !important;
                height: 9.5mm !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                text-align: center !important;
                background: #ffffff !important;
                border-top: none !important;
                z-index: 9999 !important;
                pointer-events: none !important;
                font-family: "Times New Roman", Times, serif !important;
              }

              .sheet-page-number {
                font-size: 10pt !important;
                font-weight: bold !important;
                font-family: "Times New Roman", Times, serif !important;
                letter-spacing: 0.5px !important;
                line-height: 1.1 !important;
                margin-bottom: 1px !important;
              }

              .sheet-footer-confidential {
                font-size: 8.5pt !important;
                font-weight: bold !important;
                letter-spacing: 0.5px !important;
                text-transform: uppercase !important;
                line-height: 1.1 !important;
                font-family: "Times New Roman", Times, serif !important;
              }

              /* Aggressively suppress any residual in-DOM footers */
              .static-top-confidential,
              .exam-footer,
              .footer-confidential,
              .running-header-top,
              .running-footer-bottom {
                display: none !important;
              }

              /* University Header */
              .print-exam-header {
                margin: 0 0 3mm 0 !important;
                padding: 0 !important;
              }

              /* ================================================================
                 QUESTION PAPER STRUCTURE TABLE
                 ================================================================ */
              table.obe-paper-structure-table,
              table[data-obe-paper-structure="true"] {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                margin-top: 2px !important;
                margin-bottom: 2px !important;
              }

              /* Column widths */
              table.obe-paper-structure-table col.col-qnum,
              table[data-obe-paper-structure="true"] col.col-qnum {
                width: 24px !important;
              }
              table.obe-paper-structure-table col.col-subq,
              table[data-obe-paper-structure="true"] col.col-subq {
                width: 20px !important;
              }
              table.obe-paper-structure-table col.col-content,
              table[data-obe-paper-structure="true"] col.col-content {
                width: auto !important;
              }
              table.obe-paper-structure-table col.col-marks,
              table[data-obe-paper-structure="true"] col.col-marks {
                width: 42px !important;
              }

              /* Structure table cells: compact academic spacing */
              table.obe-paper-structure-table > tbody > tr > td,
              table[data-obe-paper-structure="true"] > tbody > tr > td {
                vertical-align: top !important;
                font-family: 'Times New Roman', Times, serif !important;
                font-size: 10pt !important;
                line-height: 1.3 !important;
              }

              /* Q# column */
              .col-qnum-cell,
              table.obe-paper-structure-table > tbody > tr > td:first-child:not([colspan]) {
                width: 24px !important;
                min-width: 24px !important;
                max-width: 28px !important;
                padding: 3px 2px 3px 0 !important;
                font-weight: bold !important;
                white-space: nowrap !important;
                vertical-align: top !important;
              }
              /* Sub-Q column */
              .col-subq-cell,
              table.obe-paper-structure-table > tbody > tr:not([data-obe-row="or-separator"]) > td:nth-child(2):not([colspan]) {
                width: 20px !important;
                min-width: 20px !important;
                max-width: 24px !important;
                padding: 3px 3px 3px 0 !important;
                white-space: nowrap !important;
                vertical-align: top !important;
                font-weight: bold !important;
              }
              /* Content column */
              .col-content-cell,
              td.col-content-cell,
              td[colspan="2"].col-content-cell {
                padding: 3px 8px !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                overflow: visible !important;
                vertical-align: top !important;
              }
              /* Marks column */
              .col-marks-cell,
              table.obe-paper-structure-table > tbody > tr > td:last-child:not([colspan]) {
                width: 42px !important;
                min-width: 42px !important;
                max-width: 46px !important;
                padding: 3px 0 3px 3px !important;
                text-align: right !important;
                font-weight: bold !important;
                white-space: nowrap !important;
                vertical-align: top !important;
              }

              /* Content cell paragraphs */
              .col-content-cell p,
              td.col-content-cell p,
              table.obe-paper-structure-table > tbody > tr > td.col-content-cell > p,
              table[data-obe-paper-structure="true"] > tbody > tr > td.col-content-cell > p {
                margin: 2px 0 3px 0 !important;
                padding: 0 !important;
                line-height: 1.25 !important;
                display: block !important;
                clear: both !important;
              }

              /* Borders-cleared structure table */
              table.obe-paper-structure-table.borders-cleared > tbody > tr > td,
              table.obe-paper-structure-table[data-obe-borders-cleared="true"] > tbody > tr > td,
              table.obe-paper-structure-table[style*="border: none"] > tbody > tr > td,
              table.obe-paper-structure-table[style*="border:none"] > tbody > tr > td {
                border: none !important;
              }

              /* Centered diagrams, graphs, and images */
              .col-content-cell img,
              .col-content-cell svg,
              .col-content-cell canvas,
              .col-content-cell .diagram-container,
              .col-content-cell .graph-container,
              .col-content-cell .e-rte-image,
              .col-content-cell .e-img-inline,
              .col-content-cell .e-rte-img-caption,
              .col-content-cell figure,
              td.col-content-cell img,
              td.col-content-cell svg,
              td.col-content-cell canvas,
              td.col-content-cell .diagram-container,
              td.col-content-cell .graph-container {
                display: block !important;
                margin: 6px auto !important;
                text-align: center !important;
                max-width: 98% !important;
                height: auto !important;
                clear: both !important;
                float: none !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              .col-content-cell p:has(img),
              .col-content-cell p:has(svg),
              .col-content-cell p:has(canvas) {
                text-align: center !important;
                display: block !important;
                clear: both !important;
                margin: 6px 0 !important;
              }

              /* Strictly prevent atomic components from breaking internally */
              .col-content-cell table,
              .col-content-cell img,
              .col-content-cell svg,
              .col-content-cell canvas,
              .col-content-cell .graph-container,
              .col-content-cell .diagram-container,
              .col-content-cell .katex-display,
              .col-content-cell pre,
              .col-content-cell code,
              .col-content-cell .obe-code-table {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              /* Scenario description box styling: compact & tight */
              .col-content-cell .scenario-box,
              .col-content-cell blockquote {
                margin: 4px 0 !important;
                padding: 4px 8px !important;
                background-color: #f8f9fa !important;
                border-left: 3px solid #3b82f6 !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              /* Compact math formulas */
              .katex-display {
                margin: 4px 0 !important;
              }

              /* Nested user data tables: Compact & Orientation-Preserving */
              .col-content-cell table:not(.obe-code-table),
              td.col-content-cell table:not(.obe-code-table),
              td[colspan="2"].col-content-cell table:not(.obe-code-table) {
                display: table !important;
                width: auto;
                max-width: 100% !important;
                table-layout: auto !important;
                border-collapse: collapse !important;
                margin: 4px auto !important;
                margin-left: auto !important;
                margin-right: auto !important;
                overflow: visible !important;
                font-size: 9pt !important;
                line-height: 1.2 !important;
              }

              .col-content-cell table[data-obe-align="left"],
              .col-content-cell table.obe-align-left {
                margin-left: 0 !important;
                margin-right: auto !important;
              }
              .col-content-cell table[data-obe-align="right"],
              .col-content-cell table.obe-align-right {
                margin-left: auto !important;
                margin-right: 0 !important;
              }
              .col-content-cell table[data-obe-align="center"],
              .col-content-cell table.obe-align-center {
                margin-left: auto !important;
                margin-right: auto !important;
              }
              .col-content-cell table[data-obe-align="full"],
              .col-content-cell table.obe-table-full {
                width: 100% !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
              }

              .col-content-cell table th,
              .col-content-cell table td,
              td.col-content-cell table th,
              td.col-content-cell table td,
              td[colspan="2"].col-content-cell table th,
              td[colspan="2"].col-content-cell table td {
                border: 1px solid #000 !important;
                padding: 2px 4px !important;
                font-size: 9pt !important;
                line-height: 1.2 !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                vertical-align: middle !important;
              }
              .col-content-cell table th,
              td.col-content-cell table th {
                font-weight: bold !important;
                background-color: transparent !important;
              }

              /* Auto-scale: 5+ columns */
              .col-content-cell table.obe-print-compact,
              td.col-content-cell table.obe-print-compact {
                font-size: 8pt !important;
                line-height: 1.1 !important;
              }
              .col-content-cell table.obe-print-compact th,
              .col-content-cell table.obe-print-compact td,
              td.col-content-cell table.obe-print-compact th,
              td.col-content-cell table.obe-print-compact td {
                padding: 1.5px 2.5px !important;
                font-size: 8pt !important;
                line-height: 1.1 !important;
              }

              /* Strip inherited widths from nested col/colgroup */
              .col-content-cell table col,
              .col-content-cell table colgroup,
              td.col-content-cell table col,
              td.col-content-cell table colgroup {
                max-width: 100% !important;
                min-width: 0 !important;
              }

              /* Inner table cell paragraphs */
              .col-content-cell table td p,
              .col-content-cell table td div {
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: inherit !important;
              }

              /* OR separator */
              tr[data-obe-row="or-separator"] > td {
                padding: 4px 6px !important;
                font-size: 10pt !important;
                font-weight: bold !important;
                text-align: center !important;
                letter-spacing: 2px !important;
              }

              /* PART A / PART B headers */
              tr > td[colspan="4"] {
                padding: 6px 6px !important;
                font-size: 11pt !important;
                text-align: center !important;
                font-weight: bold !important;
              }

              /* Code blocks */
              .obe-code-table {
                font-size: 8.5pt !important;
                line-height: 1.15 !important;
                margin: 4px 0 !important;
              }
              .obe-code-table td {
                padding: 3px 5px !important;
              }

              /* Fallback tables */
              table:not(.obe-paper-structure-table):not([data-obe-paper-structure="true"]) {
                border-collapse: collapse;
              }
              table:not(.obe-paper-structure-table):not([data-obe-paper-structure="true"]) th,
              table:not(.obe-paper-structure-table):not([data-obe-paper-structure="true"]) td {
                border: 1px solid #000;
                text-align: left;
              }

              /* Import getPrintStyles (list styles, counter styles, etc.) */
              ${getPrintStyles()}

              /* Override getPrintStyles rules that conflict with compact layout */
              table.obe-paper-structure-table > tbody > tr > td.col-content-cell,
              table[data-obe-paper-structure="true"] > tbody > tr > td.col-content-cell {
                overflow: visible !important;
              }

              button, .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>${generatedSheetsHtml}</body>
      </html>
    `

    // Render into isolated iframe with Blob URL so Chromium treats it as a full document
    const blob = new Blob([printDocumentHtml], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)

    const printIframe = document.createElement('iframe')
    printIframe.title = exportBaseFileName
    printIframe.style.cssText = 'position:fixed;right:0;bottom:0;width:40px;height:40px;border:none;opacity:0.01;z-index:-9999;pointer-events:none;'
    printIframe.setAttribute('aria-hidden', 'true')
    printIframe.src = blobUrl
    document.body.appendChild(printIframe)

    printIframe.onload = async () => {
      const iframeWindow = printIframe.contentWindow
      const iframeDoc = printIframe.contentDocument || iframeWindow.document

      try {
        if (iframeDoc.fonts && iframeDoc.fonts.ready) {
          await iframeDoc.fonts.ready
        }
        const images = iframeDoc.querySelectorAll('img')
        if (images.length > 0) {
          await Promise.all(Array.from(images).map(img => {
            if (img.complete) return Promise.resolve()
            return new Promise(resolve => {
              img.onload = resolve
              img.onerror = resolve
            })
          }))
        }
      } catch (e) { /* proceed anyway */ }

      iframeDoc.title = exportBaseFileName
      document.title = exportBaseFileName

      let cleanedUp = false
      const cleanup = () => {
        if (cleanedUp) return
        cleanedUp = true
        try {
          URL.revokeObjectURL(blobUrl)
          if (printIframe && printIframe.parentNode) {
            printIframe.parentNode.removeChild(printIframe)
          }
        } catch (e) {}
      }

      window.addEventListener('afterprint', cleanup, { once: true })
      try {
        if (iframeWindow) {
          iframeWindow.addEventListener('afterprint', cleanup, { once: true })
        }
      } catch (e) {}

      // Generous safety fallback (120 seconds) so iframe is never destroyed while user is saving
      setTimeout(cleanup, 120000)

      await new Promise(resolve => setTimeout(resolve, 300))

      try {
        iframeWindow.focus()
        iframeWindow.print()
      } catch (e) {
        const printWindow = window.open(blobUrl, '_blank')
        if (printWindow) {
          printWindow.focus()
        }
      }
    }
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
          showNotification('Failed to convert Word file: ' + err.message, 'error')
        }
      }
      reader.readAsArrayBuffer(file)
    }
    input.click()
  }

  const insertImageSettings = {
    saveUrl: `${API_BASE}/api/upload/image`,
    path: 'https://'
  }

  const getNextImageName = (currentUploading) => {
    const courseCode = (offering?.course?.courseCode || 'COURSE').replace(/[^a-zA-Z0-9]/g, '');
    const assessmentName = (assessment?.name || 'ASSESSMENT').replace(/[^a-zA-Z0-9]/g, '');
    const year = offering?.academicYear || new Date().getFullYear();
    const currentHtml = rteRef.current ? rteRef.current.value : editorValue;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml || '';
    const imgCount = tempDiv.querySelectorAll('img').length;
    return `${courseCode}_${assessmentName}_Q${imgCount + currentUploading + 1}_${year}`;
  };

  const uploadBase64ImageToCloudinary = async (base64Data, filenamePrefix = 'pasted') => {
    try {
      const token = localStorage.getItem('obe-auth-token')
      const filename = getNextImageName(0) + `_${filenamePrefix}`
      const res = await fetch(`${API_BASE}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-filename': filename
        },
        body: JSON.stringify({ base64: base64Data, filename })
      })

      const data = await res.json()
      if (data && (data.secureUrl || data.url)) {
        const finalUrl = data.secureUrl || data.url
        activeCloudinaryImagesRef.current.add(finalUrl)
        return finalUrl
      }
      return null
    } catch (err) {
      console.error('Error uploading base64 image to Cloudinary:', err)
      return null
    }
  }

  const processAndUploadHtmlImages = async (rawHtml) => {
    if (!rawHtml || (!rawHtml.includes('data:image/') && !rawHtml.includes('blob:'))) {
      return rawHtml
    }

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = rawHtml

    const base64Imgs = Array.from(tempDiv.querySelectorAll('img')).filter(img => {
      const src = img.getAttribute('src') || ''
      return src.startsWith('data:image/') || src.startsWith('blob:')
    })

    if (base64Imgs.length === 0) return rawHtml

    setUploadStatus(`Uploading ${base64Imgs.length} pasted image(s) to Cloudinary...`)

    for (let i = 0; i < base64Imgs.length; i++) {
      const img = base64Imgs[i]
      const src = img.getAttribute('src') || ''

      if (src.startsWith('data:image/')) {
        const cloudUrl = await uploadBase64ImageToCloudinary(src, `pasted_${i + 1}`)
        if (cloudUrl) {
          img.setAttribute('src', cloudUrl)
        }
      } else if (src.startsWith('blob:')) {
        try {
          const blobRes = await fetch(src)
          const blob = await blobRes.blob()
          const reader = new FileReader()
          const base64Data = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          })
          if (base64Data) {
            const cloudUrl = await uploadBase64ImageToCloudinary(base64Data, `blob_${i + 1}`)
            if (cloudUrl) {
              img.setAttribute('src', cloudUrl)
            }
          }
        } catch (e) {
          console.warn('Could not read blob image:', e)
        }
      }
    }

    setUploadStatus('✓ All pasted images uploaded to Cloudinary.')
    setTimeout(() => setUploadStatus(''), 3000)

    return tempDiv.innerHTML
  }

  const onImageUploading = (args) => {
    // Count existing img tags in current editor content
    const currentHtml = rteRef.current ? rteRef.current.value : editorValue;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml || '';
    const imgCount = tempDiv.querySelectorAll('img').length;

    if (imgCount + uploadingCountRef.current >= 10) {
      args.cancel = true;
      setUploadStatus('❌ Upload failed: A maximum of 10 images are allowed per question paper.');
      showNotification('A maximum of 10 images are allowed per question paper.', 'warning');
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
          activeCloudinaryImagesRef.current.add(newUrl)
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
      setUploadStatus('⚠️ Image ready for auto-upload on save.')
      setTimeout(() => setUploadStatus(''), 3000)
    }

    console.warn('Syncfusion uploader fallback note:', args)
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
            showNotification('A maximum of 10 images are allowed per question paper.', 'warning');
          }
        };
      }
    }
  }

  // AI Commands handler
  const handleAiButtonClick = (e) => {
    const btn = e?.currentTarget || e?.target?.closest('#ai-commands-btn') || document.getElementById('ai-commands-btn')
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const menuWidth = 260
      const left = Math.max(10, Math.min(rect.left, window.innerWidth - menuWidth))
      setAiMenuPosition({ top: rect.bottom + 4, left })
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
      showNotification('Please select some text first, then use AI commands.', 'warning')
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
      const data = await apiService.rteAssist(
        { prompt, selectedText },
        {
          onProgress: (info) => {
            if (info?.isComplete) setAiWarmingInfo(null)
            else setAiWarmingInfo(info)
          }
        }
      )
      if (data && data.success && data.content) {
        setAiPreview({
          originalText: selectedText,
          suggestedText: data.content,
          range: savedRange,
          commandLabel
        })
      } else {
        showNotification(data?.message || 'AI processing failed. Please try again.', 'error')
      }
    } catch (err) {
      console.error('AI command error:', err)
      showNotification('Failed to process AI command: ' + err.message, 'error')
    } finally {
      setAiProcessing(false)
      setAiWarmingInfo(null)
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
  const handleClearQuestionGen = () => {
    if (window.confirm('Clear all generated questions and reset the generator?')) {
      setQuestionGenResults([])
      setSelectedQuestionIndices([])
      setSelectedQuestionIndex(0)
      setQuestionGenParams(prev => ({
        ...prev,
        topic: '',
        sampleQuestion: ''
      }))
      try {
        localStorage.removeItem(QP_GEN_CACHE_KEY)
      } catch (e) {}
    }
  }

  const toggleQuestionSelection = (index) => {
    setSelectedQuestionIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      } else {
        return [...prev, index].sort((a, b) => a - b)
      }
    })
  }

  const selectAllQuestions = () => {
    setSelectedQuestionIndices(questionGenResults.map((_, i) => i))
  }

  const deselectAllQuestions = () => {
    setSelectedQuestionIndices([])
  }

  const handleGenerateQuestion = async () => {
    if (!questionGenParams.topic) {
      showNotification('Please enter a topic or syllabus description.', 'warning')
      return
    }
    setIsGeneratingQuestion(true)

    const allowedMarks = getAllowedMarksForExamType(questionGenParams.examType)
    const effectiveTotalMarks = allowedMarks.includes(Number(questionGenParams.totalMarks)) ? Number(questionGenParams.totalMarks) : 10
    const markDist = calculateQuestionMarkDistribution(effectiveTotalMarks, questionGenParams.numQuestions)
    const count = markDist.length

    const bloomInfo = getBloomInfo(questionGenParams.bloomLevel)
    const selectedCoObj = coDetails.find(item => item.code === questionGenParams.selectedCo)
    const targetCoCode = selectedCoObj?.code || questionGenParams.selectedCo || 'CO'
    const coDescription = selectedCoObj?.description || (offering?.course?.name ? `Course Outcome for ${offering.course.name}` : '')

    const markBreakdownText = markDist.map((m, idx) => {
      const qName = count <= 2 ? `Question ${String.fromCharCode(65 + idx)}` : `Question ${idx + 1}`
      return `${qName}: ${m} Marks`
    }).join(', ')

    const prompt = `You are a distinguished university professor and Outcome-Based Education (OBE) accreditation expert designing an official exam question paper.

EXAMINATION CONTEXT:
- Course: ${offering?.course?.name || offering?.course?.code || 'University Course'}
- Assessment: ${questionGenParams.examType}
- Total Allocated Marks: ${effectiveTotalMarks} Marks
- Question Count: Exactly ${count} question(s)
- Mark Allocation: ${markBreakdownText} (Total = ${effectiveTotalMarks} Marks)
- Topic / Syllabus Description: ${questionGenParams.topic}
${questionGenParams.sampleQuestion ? `- Reference Style / Format Pattern: "${questionGenParams.sampleQuestion}"` : ''}

========================================================================
MANDATORY OBE CRITERION 1: BLOOM'S TAXONOMY LEVEL [${bloomInfo.level} - ${bloomInfo.name}]
========================================================================
Every question MUST strictly target Bloom's Cognitive Level ${bloomInfo.level} (${bloomInfo.name}):
- Cognitive Demand: ${bloomInfo.cognitiveExpectation}
- Mandatory Action Verbs: You MUST incorporate pedagogical action verbs from this list: ${bloomInfo.verbs.join(', ')}.
- Pedagogical Directive: ${bloomInfo.promptDirective}
- COGNITIVE RIGOR CONSTRAINT: ${bloomInfo.level === 'C1' || bloomInfo.level === 'C2' ? 'Keep questions focused on definitions, conceptual explanations, or principles.' : `DO NOT write simple "Define X" or "What is Y" recall questions. The questions MUST demand genuine ${bloomInfo.name.toLowerCase()} depth matching ${bloomInfo.level}.`}

========================================================================
MANDATORY OBE CRITERION 2: TARGET COURSE OUTCOME (${targetCoCode})
========================================================================
${selectedCoObj && selectedCoObj.code && selectedCoObj.code !== 'NONE' ? `Target Course Outcome: ${targetCoCode}
Competency Statement: "${coDescription}"
- Direct Assessment Mandate: The question scenario, problem statement, and expected solution MUST directly test, assess, and evaluate the specific skill, knowledge area, and competency described in ${targetCoCode}.
- Students answering these questions must directly demonstrate attainment of ${targetCoCode}.` : `Course Outcome Context: Align all questions with the core learning outcomes of ${offering?.course?.name || 'this course'}.`}

========================================================================
EXAMINATION STRUCTURE & OBE TAGGING:
========================================================================
1. Generate EXACTLY ${count} separate question(s) dividing ${questionGenParams.totalMarks} marks (${markBreakdownText}).
2. Tagging Format:
   Each question MUST start with an explicit OBE header including Question Label, CO tag, Bloom tag, and Mark allocation.
   Examples:
   - If 1 question: "Question 1 [${targetCoCode}, ${bloomInfo.level}] [${markDist[0]} Marks]"
   - If 2 questions:
     "Question A [${targetCoCode}, ${bloomInfo.level}] [${markDist[0]} Marks]"
     "Question B [${targetCoCode}, ${bloomInfo.level}] [${markDist[1]} Marks]"
   - If 3+ questions:
     "Question 1 [${targetCoCode}, ${bloomInfo.level}] [${markDist[0]} Marks]"
     ...
3. If a question is worth 6 or more marks, divide it into sub-parts (e.g. (a) [X Marks] [${targetCoCode}, ${bloomInfo.level}] and (b) [Y Marks] [${targetCoCode}, ${bloomInfo.level}]) using appropriate Bloom action verbs.
4. Delimiter: Separate each distinct question with the EXACT line:
===QUESTION_BREAK===
5. Output ONLY the finalized exam questions ready for the question paper. Do NOT include conversational preambles or code fences.`

    try {
      const data = await apiService.rteAssist(
        { prompt },
        {
          onProgress: (info) => {
            if (info?.isComplete) setAiWarmingInfo(null)
            else setAiWarmingInfo(info)
          }
        }
      )
      if (data && data.success && data.content) {
        let questionsArray = data.content
          .split(/===QUESTION_BREAK===/i)
          .map(q => q.trim())
          .filter(Boolean)

        if (questionsArray.length < count && count > 1) {
          const fallbackSplit = data.content
            .split(/\n(?=(?:Question\s+[B-Z\d]+|Q[2-9]+|\b\d+\.\s+[A-Z]))/i)
            .map(q => q.trim())
            .filter(Boolean)
          if (fallbackSplit.length === count) {
            questionsArray = fallbackSplit
          }
        }

        const finalQuestions = questionsArray.length > 0 ? questionsArray : [data.content]
        setQuestionGenResults(finalQuestions)
        setSelectedQuestionIndex(0)
        // Select all generated questions by default so user can easily insert both/all or toggle
        setSelectedQuestionIndices(finalQuestions.map((_, i) => i))
        showNotification(`Successfully generated ${finalQuestions.length} OBE exam question(s)!`, 'success')
      } else {
        showNotification(data?.message || 'Question generation failed.', 'error')
      }
    } catch (err) {
      showNotification('Error generating question: ' + err.message, 'error')
    } finally {
      setIsGeneratingQuestion(false)
      setAiWarmingInfo(null)
    }
  }

  const handleInsertQuestionResult = () => {
    const indicesToInsert = selectedQuestionIndices.length > 0
      ? [...selectedQuestionIndices].sort((a, b) => a - b)
      : [selectedQuestionIndex]

    const toInsertTexts = indicesToInsert
      .map(i => questionGenResults[i])
      .filter(Boolean)

    if (toInsertTexts.length === 0 || !rteRef.current) return
    const editor = rteRef.current
    editor.focusIn()
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }

    const htmlToInsert = toInsertTexts
      .map(text => formatAiTextToHtml(text))
      .join('<p style="clear: both;"><br></p>')

    editor.executeCommand('insertHTML', htmlToInsert)
    // NOTE: Keep questionGenResults intact! Do NOT clear so user can reopen modal and see them until clicking clean/clear!
    setShowQuestionGenModal(false)
  }

  // Edge Form Sync Handlers
  const handleUpdateEdgeRow = (index, field, value) => {
    const updated = [...edgeRows]
    updated[index][field] = value
    setEdgeRows(updated)
    // Sync to graphEdgesText using " -> " so negative nodes (e.g. -5) never conflict with dash
    const text = updated.map(e => `${e.from} -> ${e.to}${e.weight ? `: ${e.weight}` : ''}`).join('\n')
    setGraphEdgesText(text)
  }

  const handleAddEdgeRow = () => {
    const nodeLabels = Array.from({ length: Math.max(numNodes, 2) }, (_, i) => String.fromCharCode(65 + i))
    const from = nodeLabels[0] || 'A'
    const to = nodeLabels[1] || 'B'
    const updated = [...edgeRows, { from, to, weight: '' }]
    setEdgeRows(updated)
    const text = updated.map(e => `${e.from} -> ${e.to}${e.weight ? `: ${e.weight}` : ''}`).join('\n')
    setGraphEdgesText(text)
  }

  const handleRemoveEdgeRow = (index) => {
    const updated = edgeRows.filter((_, i) => i !== index)
    setEdgeRows(updated)
    const text = updated.map(e => `${e.from} -> ${e.to}${e.weight ? `: ${e.weight}` : ''}`).join('\n')
    setGraphEdgesText(text)
  }

  const handleInsertGraph = () => {
    if (!rteRef.current) return
    const editor = rteRef.current
    editor.focusIn()
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }

    const diagramPayload = {
      category: graphCategory,
      type: graphType,
      theme: graphTheme,
      caption: graphCaption,
      nodeShapes: customNodeShapes,
      edgesText: graphEdgesText,
      edgeRows: edgeRows,
      customPositions: customNodePositions,
      startState: graphCategory === 'automata' ? startState : null,
      acceptStates: graphCategory === 'automata' ? acceptStates : [],
      inputMode: graphInputMode
    }
    const payloadAttr = encodeURIComponent(JSON.stringify(diagramPayload))

    const svgMarkup = generateGraphSvg(graphEdgesText, graphType, graphTheme, customNodePositions, {
      startState: graphCategory === 'automata' ? startState : null,
      acceptStates: graphCategory === 'automata' ? acceptStates : [],
      caption: graphCaption,
      category: graphCategory,
      nodeShapes: customNodeShapes,
      payloadAttr: payloadAttr
    })
    
    // Base64 encoding avoids URL fragment truncation (# symbol parsing issue) in browsers
    const svgBase64 = btoa(unescape(encodeURIComponent(svgMarkup)))
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`

    // Calculate proportional width matching diagram geometry
    const dims = parseSvgDimensions(svgMarkup)
    const naturalW = dims.w || 400
    // Generously display large diagrams (up to 580px width) so trees, maps, and network architectures fit beautifully
    const displayWidth = Math.min(Math.max(Math.round(naturalW * 0.98), 200), 580)

    const editArea = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
    let targetEl = editingDiagramElement
    if ((!targetEl || !targetEl.isConnected) && editingDiagramId && editArea) {
      targetEl = editArea.querySelector(`[data-diagram-id="${editingDiagramId}"]`)
    }

    if (targetEl) {
      // In-place Update existing diagram in question paper DOM
      const prevWidth = targetEl.style?.width || targetEl.getAttribute?.('width')
      const prevWVal = parseInt(prevWidth) || 0
      // If previous width was set but is now too cramped compared to new natural width, adapt to displayWidth
      const finalWidth = (prevWVal > 150 && prevWVal >= displayWidth * 0.8) ? `${prevWVal}px` : `${displayWidth}px`
      targetEl.src = dataUrl
      targetEl.setAttribute('data-diagram-payload', payloadAttr)
      targetEl.setAttribute('data-obe-diagram', 'true')
      targetEl.setAttribute('alt', 'Graph Diagram')
      targetEl.setAttribute('title', 'Double-click to edit CS Diagram in Studio')
      if (editingDiagramId) {
        targetEl.setAttribute('data-diagram-id', editingDiagramId)
      }
      targetEl.classList.add('e-rte-image', 'obe-graph-diagram')
      targetEl.style.width = finalWidth
      targetEl.style.height = 'auto'
      targetEl.style.minWidth = '120px'
      targetEl.style.maxWidth = '100%'

      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
      if (editArea) {
        const newHtml = editArea.innerHTML
        setEditorValue(newHtml)
        if (typeof editor.value !== 'undefined') editor.value = newHtml
      }
      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }

      setEditingDiagramElement(null)
      setEditingDiagramId(null)
      setShowGraphGenModal(false)
      return
    }

    // Insert new diagram image precisely at user cursor location inside block container with clear: both
    editor.focusIn()
    const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
    const sel = doc ? doc.getSelection() : window.getSelection()
    const targetRange = savedDiagramRangeRef.current || savedEditorRangeRef.current

    let rangeRestored = false
    if (targetRange && editArea && editArea.contains(targetRange.commonAncestorContainer)) {
      try {
        sel.removeAllRanges()
        sel.addRange(targetRange.cloneRange())
        rangeRestored = true
      } catch (e) {}
    }

    // Safety fallback: If range was not inside a content cell, locate the active question cell
    if (!rangeRestored && editArea) {
      const activeCell = editArea.querySelector('.col-content-cell:focus, .col-content-cell[data-active="true"]') ||
        editArea.querySelector('tr[data-obe-row="question"]:last-of-type .col-content-cell') ||
        editArea.querySelector('.col-content-cell:last-of-type')
      if (activeCell) {
        try {
          const fallbackRange = doc.createRange()
          fallbackRange.selectNodeContents(activeCell)
          fallbackRange.collapse(false)
          sel.removeAllRanges()
          sel.addRange(fallbackRange)
        } catch (e) {}
      }
    }

    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }

    const newDiagramId = `cs-diag-${Date.now()}`
    // Clean diagram container WITHOUT trailing <p><br></p>
    const htmlToInsert = `<p class="obe-diagram-wrapper" style="clear: both; text-align: center; margin: 4px 0; line-height: 0; font-size: 0;"><img src="${dataUrl}" alt="Graph Diagram" title="Double-click to edit CS Diagram in Studio" class="e-rte-image e-imgbreak e-imgcenter obe-graph-diagram" data-obe-diagram="true" data-diagram-id="${newDiagramId}" data-diagram-payload="${payloadAttr}" style="min-width: 120px; max-width: 100%; width: ${displayWidth}px; height: auto; display: inline-block; vertical-align: middle;" /></p>`
    editor.executeCommand('insertHTML', htmlToInsert)

    // Immediately clean up any empty trailing <p><br></p> that Chrome contentEditable automatically appends
    try {
      const insertedImg = editArea ? editArea.querySelector(`img[data-diagram-id="${newDiagramId}"]`) : null
      if (insertedImg) {
        const parentBlock = insertedImg.closest('p, div')
        if (parentBlock) {
          const nextBlock = parentBlock.nextElementSibling
          if (nextBlock && (nextBlock.nodeName === 'P' || nextBlock.nodeName === 'DIV')) {
            const nextText = (nextBlock.textContent || '').replace(/[\s\u200B\u00A0\r\n\t]+/g, '')
            const hasMedia = nextBlock.querySelector('img, svg, table, pre, code')
            if (!nextText && !hasMedia) {
              nextBlock.remove()
            }
          }
        }
      }
      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
      if (editArea) {
        const newHtml = editArea.innerHTML
        setEditorValue(newHtml)
        if (typeof editor.value !== 'undefined') editor.value = newHtml
      }
    } catch (e) {}

    savedDiagramRangeRef.current = null
    setEditingDiagramElement(null)
    setEditingDiagramId(null)
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
      showNotification('Please enter a table topic or description.', 'warning')
      return
    }
    setIsGeneratingTable(true)
    const prompt = `Generate a CSV formatted data table for a university exam question about: '${tableAiPrompt}'.
Return ONLY comma-separated lines. The first line MUST be headers. The following lines MUST be row values. Do not include markdown code block syntax or preambles.`

    try {
      const data = await apiService.rteAssist(
        { prompt },
        {
          onProgress: (info) => {
            if (info?.isComplete) setAiWarmingInfo(null)
            else setAiWarmingInfo(info)
          }
        }
      )
      if (data && data.success && data.content) {
        const lines = data.content.trim().split('\n').filter(Boolean)
        if (lines.length > 0) {
          const parsedHeaders = lines[0].split(',').map(h => h.trim())
          const parsedRows = lines.slice(1).map(l => l.split(',').map(c => c.trim()))
          setTableGridHeaders(parsedHeaders)
          setTableGridRows(parsedRows)
          showNotification('Table generated successfully!', 'success')
        }
      } else {
        showNotification(data?.message || 'Table generation failed.', 'error')
      }
    } catch (err) {
      showNotification('Error generating table: ' + err.message, 'error')
    } finally {
      setIsGeneratingTable(false)
      setAiWarmingInfo(null)
    }
  }

  const handleInsertTable = () => {
    if (!rteRef.current) return
    if (tableGridHeaders.length === 0) {
      showNotification('Please specify table headers.', 'warning')
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

  // ─── Exam Paper Structure Builder Handlers ───
  const makePresetQuestion = (subCount, marks, blooms = []) => ({
    subCount,
    marks,
    blooms: blooms.length ? blooms : Array(subCount || 1).fill(''),
    subSpaceRows: Array(subCount || 1).fill(0),
    qSpaceRows: 1,
    qOrBeforeSpace: 0,
    qOrAfterSpace: 0,
    subOrBeforeSpace: Array(subCount || 1).fill(0),
    subOrAfterSpace: Array(subCount || 1).fill(0)
  })

  const handlePaperStructureAddPart = () => {
    setPaperStructureParts(prev => {
      const idx = prev.length
      const partName = `PART ${String.fromCharCode(65 + idx)}`
      return [...prev, { name: partName, beforeSpace: 0, afterSpace: 0, questions: [makePresetQuestion(2, [10, 10])] }]
    })
  }

  const handlePaperStructureRemovePart = (partIdx) => {
    if (paperStructureParts.length <= 1) return
    setPaperStructureParts(prev => prev.filter((_, i) => i !== partIdx))
  }

  const handlePaperStructureRenamePart = (partIdx, newName) => {
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return { ...part, name: newName }
    }))
  }

  const handlePaperStructureSetPartBeforeSpace = (partIdx, space) => {
    const parsed = Math.max(0, parseInt(space) || 0)
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return { ...part, beforeSpace: parsed }
    }))
  }

  const handlePaperStructureSetPartAfterSpace = (partIdx, space) => {
    const parsed = Math.max(0, parseInt(space) || 0)
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return { ...part, afterSpace: parsed }
    }))
  }

  const handlePaperStructureAddQuestion = (partIdx) => {
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return { ...part, questions: [...part.questions, makePresetQuestion(2, [10, 10])] }
    }))
  }

  const handlePaperStructureRemoveQuestion = (partIdx, qIdx) => {
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      if (part.questions.length <= 1) return part
      return { ...part, questions: part.questions.filter((_, j) => j !== qIdx) }
    }))
  }

  const handlePaperStructureSetSubCount = (partIdx, qIdx, count) => {
    const parsed = parseInt(count)
    const newCount = isNaN(parsed) ? 0 : Math.max(0, Math.min(10, parsed))
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const effectiveCount = newCount === 0 ? 1 : newCount
          // Preserve existing marks
          const newMarks = Array(effectiveCount).fill(10)
          if (q.marks) q.marks.forEach((m, k) => { if (k < effectiveCount) newMarks[k] = m })
          // Preserve existing typed content
          const newContents = Array(effectiveCount).fill('')
          if (q.contents) q.contents.forEach((c, k) => { if (k < effectiveCount) newContents[k] = c })
          // Preserve existing blooms
          const newBlooms = Array(effectiveCount).fill('')
          if (q.blooms) q.blooms.forEach((b, k) => { if (k < effectiveCount) newBlooms[k] = b })
          // Preserve existing sub-question spacings
          const defaultSubSpace = Array.isArray(q.subSpaceRows) ? (q.subSpaceRows[0] ?? 0) : (q.subSpaceRows !== undefined ? q.subSpaceRows : 0)
          const newSubSpaces = Array(effectiveCount).fill(defaultSubSpace)
          if (Array.isArray(q.subSpaceRows)) {
            q.subSpaceRows.forEach((sp, k) => { if (k < effectiveCount) newSubSpaces[k] = sp })
          }

          // Preserve existing sub-question level OR settings
          const newSubHasOr = Array(effectiveCount).fill(false)
          if (q.subHasOr) q.subHasOr.forEach((h, k) => { if (k < effectiveCount) newSubHasOr[k] = h })
          const newSubOrMarks = Array(effectiveCount).fill(10)
          if (q.subOrMarks) q.subOrMarks.forEach((m, k) => { if (k < effectiveCount) newSubOrMarks[k] = m })
          const newSubOrBlooms = Array(effectiveCount).fill('')
          if (q.subOrBlooms) q.subOrBlooms.forEach((b, k) => { if (k < effectiveCount) newSubOrBlooms[k] = b })
          const newSubOrContents = Array(effectiveCount).fill('')
          if (q.subOrContents) q.subOrContents.forEach((c, k) => { if (k < effectiveCount) newSubOrContents[k] = c })

          // Preserve question-level OR settings
          const newQOrMarks = Array(effectiveCount).fill(10)
          if (q.questionOrMarks) q.questionOrMarks.forEach((m, k) => { if (k < effectiveCount) newQOrMarks[k] = m })
          const newQOrBlooms = Array(effectiveCount).fill('')
          if (q.questionOrBlooms) q.questionOrBlooms.forEach((b, k) => { if (k < effectiveCount) newQOrBlooms[k] = b })
          const newQOrContents = Array(effectiveCount).fill('')
          if (q.questionOrContents) q.questionOrContents.forEach((c, k) => { if (k < effectiveCount) newQOrContents[k] = c })

          const newSubOrBeforeSpace = Array(effectiveCount).fill(0)
          if (Array.isArray(q.subOrBeforeSpace)) q.subOrBeforeSpace.forEach((v, k) => { if (k < effectiveCount) newSubOrBeforeSpace[k] = v })
          const newSubOrAfterSpace = Array(effectiveCount).fill(0)
          if (Array.isArray(q.subOrAfterSpace)) q.subOrAfterSpace.forEach((v, k) => { if (k < effectiveCount) newSubOrAfterSpace[k] = v })

          return {
            ...q,
            subCount: newCount,
            marks: newMarks,
            contents: newContents,
            blooms: newBlooms,
            subSpaceRows: newSubSpaces,
            subHasOr: newSubHasOr,
            subOrMarks: newSubOrMarks,
            subOrBlooms: newSubOrBlooms,
            subOrContents: newSubOrContents,
            subOrBeforeSpace: newSubOrBeforeSpace,
            subOrAfterSpace: newSubOrAfterSpace,
            hasQuestionOr: Boolean(q.hasQuestionOr),
            questionOrMarks: newQOrMarks,
            questionOrBlooms: newQOrBlooms,
            questionOrContents: newQOrContents,
            qOrBeforeSpace: q.qOrBeforeSpace !== undefined ? q.qOrBeforeSpace : 0,
            qOrAfterSpace: q.qOrAfterSpace !== undefined ? q.qOrAfterSpace : 0,
            qSpaceRows: q.qSpaceRows !== undefined ? q.qSpaceRows : 1
          }
        })
      }
    }))
  }

  const handlePaperStructureSetMark = (partIdx, qIdx, subIdx, mark) => {
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const newMarks = [...q.marks]
          const maxLimit = assessment.maxMarks || 200
          const parsed = parseInt(mark)
          newMarks[subIdx] = isNaN(parsed) ? 0 : Math.max(0, Math.min(maxLimit, parsed))
          const newSubOrMarks = Array.isArray(q.subOrMarks) ? [...q.subOrMarks] : [...newMarks]
          newSubOrMarks[subIdx] = newMarks[subIdx]
          const newQOrMarks = Array.isArray(q.questionOrMarks) ? [...q.questionOrMarks] : [...newMarks]
          if (newQOrMarks[subIdx] !== undefined) newQOrMarks[subIdx] = newMarks[subIdx]
          return { ...q, marks: newMarks, subOrMarks: newSubOrMarks, questionOrMarks: newQOrMarks }
        })
      }
    }))
  }

  const handlePaperStructureSetBloom = (partIdx, qIdx, subIdx, bloomVal) => {
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const newBlooms = Array(q.subCount).fill('')
          if (q.blooms) q.blooms.forEach((b, k) => { if (k < q.subCount) newBlooms[k] = b })
          newBlooms[subIdx] = bloomVal
          return { ...q, blooms: newBlooms }
        })
      }
    }))
  }

  const handlePaperStructureToggleSubOr = (partIdx, qIdx, subIdx) => {
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const count = q.subCount === 0 ? 1 : (q.subCount || 1)
          const currentSubHasOr = Array.isArray(q.subHasOr) ? [...q.subHasOr] : Array(count).fill(false)
          currentSubHasOr[subIdx] = !currentSubHasOr[subIdx]

          const currentSubOrBlooms = Array.isArray(q.subOrBlooms) ? [...q.subOrBlooms] : Array(count).fill('')
          if (!currentSubOrBlooms[subIdx] && q.blooms && q.blooms[subIdx]) {
            currentSubOrBlooms[subIdx] = q.blooms[subIdx]
          }

          const currentSubOrMarks = Array.isArray(q.subOrMarks) ? [...q.subOrMarks] : Array(count).fill(q.marks[subIdx] || 10)
          currentSubOrMarks[subIdx] = q.marks[subIdx] || 10

          const currentSubOrBeforeSpace = Array.isArray(q.subOrBeforeSpace) ? [...q.subOrBeforeSpace] : Array(count).fill(0)
          const currentSubOrAfterSpace = Array.isArray(q.subOrAfterSpace) ? [...q.subOrAfterSpace] : Array(count).fill(0)

          return {
            ...q,
            subHasOr: currentSubHasOr,
            subOrBlooms: currentSubOrBlooms,
            subOrMarks: currentSubOrMarks,
            subOrBeforeSpace: currentSubOrBeforeSpace,
            subOrAfterSpace: currentSubOrAfterSpace
          }
        })
      }
    }))
  }

  const handlePaperStructureToggleQuestionOr = (partIdx, qIdx) => {
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const count = q.subCount === 0 ? 1 : (q.subCount || 1)
          const newHasQuestionOr = !q.hasQuestionOr
          const currentQOrBlooms = Array.isArray(q.questionOrBlooms) ? [...q.questionOrBlooms] : Array(count).fill('')
          if (newHasQuestionOr && q.blooms) {
            q.blooms.forEach((b, idx) => {
              if (idx < count && !currentQOrBlooms[idx]) currentQOrBlooms[idx] = b
            })
          }
          return {
            ...q,
            hasQuestionOr: newHasQuestionOr,
            questionOrMarks: [...(q.marks || Array(count).fill(10))],
            questionOrBlooms: currentQOrBlooms,
            qOrBeforeSpace: q.qOrBeforeSpace !== undefined ? q.qOrBeforeSpace : 0,
            qOrAfterSpace: q.qOrAfterSpace !== undefined ? q.qOrAfterSpace : 0
          }
        })
      }
    }))
  }

  const handlePaperStructureSetSubOrBloom = (partIdx, qIdx, subIdx, bloomVal) => {
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const count = q.subCount === 0 ? 1 : (q.subCount || 1)
          const newBlooms = Array.isArray(q.subOrBlooms) ? [...q.subOrBlooms] : Array(count).fill('')
          newBlooms[subIdx] = bloomVal
          return { ...q, subOrBlooms: newBlooms }
        })
      }
    }))
  }

  const handlePaperStructureSetQuestionOrBloom = (partIdx, qIdx, subIdx, bloomVal) => {
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const count = q.subCount === 0 ? 1 : (q.subCount || 1)
          const newBlooms = Array.isArray(q.questionOrBlooms) ? [...q.questionOrBlooms] : Array(count).fill('')
          newBlooms[subIdx] = bloomVal
          return { ...q, questionOrBlooms: newBlooms }
        })
      }
    }))
  }

  const handlePaperStructureSetQuestionOrBeforeSpace = (partIdx, qIdx, val) => {
    const parsed = Math.max(0, Math.min(10, parseInt(val) || 0))
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          return { ...q, qOrBeforeSpace: parsed }
        })
      }
    }))
  }

  const handlePaperStructureSetQuestionOrAfterSpace = (partIdx, qIdx, val) => {
    const parsed = Math.max(0, Math.min(10, parseInt(val) || 0))
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          return { ...q, qOrAfterSpace: parsed }
        })
      }
    }))
  }

  const handlePaperStructureSetSubOrBeforeSpace = (partIdx, qIdx, subIdx, val) => {
    const parsed = Math.max(0, Math.min(10, parseInt(val) || 0))
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const count = q.subCount === 0 ? 1 : (q.subCount || 1)
          const newBefore = Array.isArray(q.subOrBeforeSpace) ? [...q.subOrBeforeSpace] : Array(count).fill(0)
          newBefore[subIdx] = parsed
          return { ...q, subOrBeforeSpace: newBefore }
        })
      }
    }))
  }

  const handlePaperStructureSetSubOrAfterSpace = (partIdx, qIdx, subIdx, val) => {
    const parsed = Math.max(0, Math.min(10, parseInt(val) || 0))
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const count = q.subCount === 0 ? 1 : (q.subCount || 1)
          const newAfter = Array.isArray(q.subOrAfterSpace) ? [...q.subOrAfterSpace] : Array(count).fill(0)
          newAfter[subIdx] = parsed
          return { ...q, subOrAfterSpace: newAfter }
        })
      }
    }))
  }

  const handlePaperStructureSetIndividualSubSpaceRows = (partIdx, qIdx, subIdx, rowsCount) => {
    const newRows = Math.max(0, Math.min(10, parseInt(rowsCount) || 0))
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const count = q.subCount || 1
          const currentArr = Array.isArray(q.subSpaceRows)
            ? [...q.subSpaceRows]
            : Array(count).fill(q.subSpaceRows !== undefined ? q.subSpaceRows : 0)
          currentArr[subIdx] = newRows
          return { ...q, subSpaceRows: currentArr }
        })
      }
    }))
  }

  const handlePaperStructureSetSubSpaceRows = (partIdx, qIdx, rowsCount) => {
    const newRows = Math.max(0, Math.min(10, parseInt(rowsCount) || 0))
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const count = q.subCount || 1
          return { ...q, subSpaceRows: Array(count).fill(newRows) }
        })
      }
    }))
  }

  const handlePaperStructureSetGlobalSubSpaceRows = (rowsCount) => {
    const newRows = Math.max(0, Math.min(10, parseInt(rowsCount) || 0))
    setPaperStructureParts(prev => prev.map(part => ({
      ...part,
      questions: part.questions.map(q => ({
        ...q,
        subSpaceRows: Array(q.subCount || 1).fill(newRows)
      }))
    })))
  }

  const handlePaperStructureSetQSpaceRows = (partIdx, qIdx, rowsCount) => {
    const newRows = Math.max(0, Math.min(10, parseInt(rowsCount) || 0))
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          return { ...q, qSpaceRows: newRows }
        })
      }
    }))
  }

  const handlePaperStructureSetGlobalQSpaceRows = (rowsCount) => {
    const newRows = Math.max(0, Math.min(10, parseInt(rowsCount) || 0))
    setPaperStructureParts(prev => prev.map(part => ({
      ...part,
      questions: part.questions.map(q => ({
        ...q,
        qSpaceRows: newRows
      }))
    })))
  }

  const handlePaperStructureSetSpaceRows = (partIdx, qIdx, rowsCount) => {
    const newRows = Math.max(0, Math.min(10, parseInt(rowsCount) || 0))
    setPaperStructureParts(prev => prev.map((part, i) => {
      if (i !== partIdx) return part
      return {
        ...part,
        questions: part.questions.map((q, j) => {
          if (j !== qIdx) return q
          const count = q.subCount || 1
          return { ...q, spaceRows: newRows, subSpaceRows: Array(count).fill(newRows), qSpaceRows: newRows }
        })
      }
    }))
  }

  const handlePaperStructureSetGlobalSpaceRows = (rowsCount) => {
    const newRows = Math.max(0, Math.min(10, parseInt(rowsCount) || 0))
    setPaperStructureParts(prev => prev.map(part => ({
      ...part,
      questions: part.questions.map(q => ({ ...q, spaceRows: newRows, subSpaceRows: Array(q.subCount || 1).fill(newRows), qSpaceRows: newRows }))
    })))
  }

  const handleOpenPaperStructureModal = () => {
    if (!rteRef.current) {
      setIsEditingExistingTable(false)
      setShowPaperStructureModal(true)
      return
    }

    const editArea = rteRef.current.contentModule?.getEditPanel ? rteRef.current.contentModule.getEditPanel() : null
    let existingTable = null

    if (editArea) {
      existingTable = editArea.querySelector('table[data-obe-paper-structure="true"], table.obe-paper-structure-table')
      if (!existingTable) {
        const tables = Array.from(editArea.querySelectorAll('table'))
        existingTable = tables.find(t => {
          const firstTd = t.querySelector('td')
          return firstTd && (firstTd.getAttribute('colspan') === '4' || /PART/i.test(t.textContent))
        })
      }
    }

    if (existingTable) {
      const parsedStructure = parseExamPaperStructureFromDom(existingTable)
      if (parsedStructure && parsedStructure.length > 0) {
        setPaperStructureParts(parsedStructure)
        setIsEditingExistingTable(true)
      } else {
        setIsEditingExistingTable(false)
      }
    } else {
      setIsEditingExistingTable(false)
    }

    if (!existingTable) {
      if (isMidTerm) {
        setPaperStructureParts([
          {
            name: '',
            questions: [
              { subCount: 3, marks: [10, 10, 10], blooms: ['', '', ''], subSpaceRows: [0, 0, 0], qSpaceRows: 1 },
              { subCount: 3, marks: [10, 10, 10], blooms: ['', '', ''], subSpaceRows: [0, 0, 0], qSpaceRows: 1 },
              { subCount: 3, marks: [10, 10, 10], blooms: ['', '', ''], subSpaceRows: [0, 0, 0], qSpaceRows: 1 }
            ]
          }
        ])
      } else if (isCT || (!isTermFinal && !isMidTerm)) {
        setPaperStructureParts([
          {
            name: '',
            questions: [
              { subCount: 1, marks: [5], blooms: [''], subSpaceRows: [0], qSpaceRows: 1 },
              { subCount: 1, marks: [5], blooms: [''], subSpaceRows: [0], qSpaceRows: 1 }
            ]
          }
        ])
      } else {
        setPaperStructureParts([
          {
            name: 'PART A',
            beforeSpace: 0,
            afterSpace: 0,
            questions: [
              { subCount: 3, marks: [10, 10, 10], blooms: ['', '', ''], subSpaceRows: [0, 0, 0], qSpaceRows: 1 },
              { subCount: 3, marks: [10, 10, 10], blooms: ['', '', ''], subSpaceRows: [0, 0, 0], qSpaceRows: 1 },
              { subCount: 3, marks: [10, 10, 10], blooms: ['', '', ''], subSpaceRows: [0, 0, 0], qSpaceRows: 1 }
            ]
          },
          {
            name: 'PART B',
            beforeSpace: 0,
            afterSpace: 0,
            questions: [
              { subCount: 3, marks: [10, 10, 10], blooms: ['', '', ''], subSpaceRows: [0, 0, 0], qSpaceRows: 1 },
              { subCount: 3, marks: [10, 10, 10], blooms: ['', '', ''], subSpaceRows: [0, 0, 0], qSpaceRows: 1 }
            ]
          }
        ])
      }
    }

    setShowPaperStructureModal(true)
  }

  const handleInsertPaperStructure = () => {
    if (!rteRef.current) return
    const editor = rteRef.current
    editor.focusIn()
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }

    const editArea = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
    
    let existingTable = null
    if (editArea) {
      existingTable = editArea.querySelector('table[data-obe-paper-structure="true"], table.obe-paper-structure-table')
      if (!existingTable) {
        const tables = Array.from(editArea.querySelectorAll('table'))
        existingTable = tables.find(t => {
          const firstTd = t.querySelector('td')
          return firstTd && (firstTd.getAttribute('colspan') === '4' || /PART/i.test(t.textContent))
        })
      }
    }

    const isBordersCleared = existingTable ? (
      existingTable.getAttribute('data-obe-borders-cleared') === 'true' ||
      existingTable.classList.contains('borders-cleared') ||
      existingTable.style.border === 'none' ||
      existingTable.style.borderWidth === '0px'
    ) : false

    const tableHtml = generateExamPaperStructureHtml(paperStructureParts, questions, isBordersCleared)

    if (existingTable && isEditingExistingTable) {
      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
      existingTable.outerHTML = tableHtml
      if (editor.contentModule && editor.contentModule.getEditPanel) {
        const newHtml = editor.contentModule.getEditPanel().innerHTML
        setEditorValue(newHtml)
        if (typeof editor.value !== 'undefined') editor.value = newHtml
      }
      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
    } else {
      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
      editor.executeCommand('insertHTML', tableHtml)
      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
    }

    setShowPaperStructureModal(false)
  }

  // ─── Code Snippet Generator Handlers ───
  const pushCodeHistorySnapshot = (contentToSave = codeContent, start = null, end = null) => {
    const textarea = codeTextareaRef.current
    const selStart = start !== null ? start : (textarea ? textarea.selectionStart : (contentToSave ? contentToSave.length : 0))
    const selEnd = end !== null ? end : (textarea ? textarea.selectionEnd : (contentToSave ? contentToSave.length : 0))

    const stack = codeUndoStackRef.current
    if (stack.length > 0 && stack[stack.length - 1].value === contentToSave) {
      return
    }

    stack.push({
      value: contentToSave,
      selectionStart: selStart,
      selectionEnd: selEnd
    })
    if (stack.length > 60) stack.shift()
    codeRedoStackRef.current = []
    setCanCodeUndo(true)
    setCanCodeRedo(false)
  }

  const handleCodeUndo = () => {
    if (codeUndoStackRef.current.length === 0) return
    const textarea = codeTextareaRef.current
    const currentSnapshot = {
      value: codeContent,
      selectionStart: textarea ? textarea.selectionStart : (codeContent ? codeContent.length : 0),
      selectionEnd: textarea ? textarea.selectionEnd : (codeContent ? codeContent.length : 0)
    }
    const previous = codeUndoStackRef.current.pop()
    codeRedoStackRef.current.push(currentSnapshot)

    setCodeContent(previous.value)
    setCanCodeUndo(codeUndoStackRef.current.length > 0)
    setCanCodeRedo(true)

    setTimeout(() => {
      if (codeTextareaRef.current) {
        codeTextareaRef.current.value = previous.value
        codeTextareaRef.current.selectionStart = previous.selectionStart ?? previous.value.length
        codeTextareaRef.current.selectionEnd = previous.selectionEnd ?? previous.value.length
        codeTextareaRef.current.focus()
      }
    }, 10)
  }

  const handleCodeRedo = () => {
    if (codeRedoStackRef.current.length === 0) return
    const textarea = codeTextareaRef.current
    const currentSnapshot = {
      value: codeContent,
      selectionStart: textarea ? textarea.selectionStart : (codeContent ? codeContent.length : 0),
      selectionEnd: textarea ? textarea.selectionEnd : (codeContent ? codeContent.length : 0)
    }
    const next = codeRedoStackRef.current.pop()
    codeUndoStackRef.current.push(currentSnapshot)

    setCodeContent(next.value)
    setCanCodeUndo(true)
    setCanCodeRedo(codeRedoStackRef.current.length > 0)

    setTimeout(() => {
      if (codeTextareaRef.current) {
        codeTextareaRef.current.value = next.value
        codeTextareaRef.current.selectionStart = next.selectionStart ?? next.value.length
        codeTextareaRef.current.selectionEnd = next.selectionEnd ?? next.value.length
        codeTextareaRef.current.focus()
      }
    }, 10)
  }

  const handleCodeTextareaChange = (e) => {
    const newVal = e.target.value
    const now = Date.now()
    if (now - lastCodeSnapshotTimeRef.current > 450) {
      pushCodeHistorySnapshot(codeContent, e.target.selectionStart, e.target.selectionEnd)
    }
    lastCodeSnapshotTimeRef.current = now
    setCodeContent(newVal)
  }

  const handleOpenCodeSnippetModal = (existingData = null, autoRunSmartOutput = false) => {
    try {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        savedCodeRangeRef.current = sel.getRangeAt(0).cloneRange()
      }
    } catch (e) {
      savedCodeRangeRef.current = null
    }

    codeUndoStackRef.current = []
    codeRedoStackRef.current = []
    lastCodeSnapshotTimeRef.current = 0
    setCanCodeUndo(false)
    setCanCodeRedo(false)

    let codeToAnalyze = ''
    let langToAnalyze = 'cpp'

    if (existingData && existingData.element) {
      setEditingCodeElement(existingData.element)
      const rawCode = existingData.code || ''
      const lang = existingData.language || 'cpp'
      // Auto-orient / format if the code is single-line or squished
      const orientedCode = isCodeLikelySingleLine(rawCode) ? smartFormatCode(rawCode, lang) : rawCode
      codeToAnalyze = orientedCode
      langToAnalyze = lang
      setCodeContent(orientedCode)
      setCodeLanguage(lang)
      setCodeAlignment(existingData.alignment || 'center')
      setCodeHasBorder(existingData.hasBorder !== false)
      setCodeBoxStyle(existingData.hasBorder === false ? 'borderless' : 'exam')
      setCodeShowLineNumbers(Boolean(existingData.showLineNumbers))
      setCodeFontSize(existingData.fontSize || '11pt')
    } else {
      setEditingCodeElement(null)
      if (!codeContent) {
        setCodeContent(CODE_SNIPPET_PRESETS.cpp[0].code)
        codeToAnalyze = CODE_SNIPPET_PRESETS.cpp[0].code
      } else {
        codeToAnalyze = codeContent
      }
      langToAnalyze = codeLanguage || 'cpp'
    }
    setSmartOutputResult(null)
    setSmartOutputError('')
    setSmartOutputLoading(false)
    setShowCodeSnippetModal(true)

    if (autoRunSmartOutput && codeToAnalyze) {
      setTimeout(() => {
        handleRunSmartOutput(codeToAnalyze, langToAnalyze)
      }, 150)
    }
  }

  const handleSmartFormatCode = () => {
    if (!codeContent) return
    pushCodeHistorySnapshot(codeContent)
    const formatted = smartFormatCode(codeContent, codeLanguage)
    setCodeContent(formatted)
    setFormatNotice('Code formatted and auto-indented with 4 spaces.')
    setTimeout(() => setFormatNotice(''), 2500)
  }

  const handleSelectCodeLanguage = (lang) => {
    if (codeContent) pushCodeHistorySnapshot(codeContent)
    setCodeLanguage(lang)
    setSmartOutputResult(null)
    setSmartOutputError('')
    const presets = CODE_SNIPPET_PRESETS[lang]
    if (presets && presets.length > 0) {
      setCodeContent(presets[0].code)
    }
  }

  const handleSelectCodePreset = (presetCode) => {
    if (codeContent) pushCodeHistorySnapshot(codeContent)
    setCodeContent(presetCode)
    setSmartOutputResult(null)
    setSmartOutputError('')
  }

  // Smart Code Output: Simulates execution & checks for syntax/compile/runtime errors with Gemini
  const handleRunSmartOutput = async (overrideCode = null, overrideLang = null) => {
    const codeToRun = (overrideCode !== null ? overrideCode : codeContent || '').trim()
    const langToRun = overrideLang || codeLanguage || 'cpp'
    if (!codeToRun) {
      showNotification('Please enter or paste code first to analyze its execution output.', 'warning')
      return
    }

    setSmartOutputLoading(true)
    setSmartOutputError('')
    setSmartOutputResult(null)

    try {
      const data = await apiService.smartCodeOutput(
        {
          code: codeToRun,
          language: langToRun
        },
        {
          onProgress: (info) => {
            if (info?.isComplete) setAiWarmingInfo(null)
            else setAiWarmingInfo(info)
          }
        }
      )

      if (data && data.success && data.data) {
        setSmartOutputResult(data.data)
      } else {
        setSmartOutputError(data?.message || 'Failed to simulate code execution.')
      }
    } catch (err) {
      console.error('Smart code output error:', err)
      setSmartOutputError('Failed to connect to smart output service: ' + err.message)
    } finally {
      setSmartOutputLoading(false)
      setAiWarmingInfo(null)
    }
  }

  const handleCodeTextareaKeyDown = (e) => {
    // Undo: Ctrl+Z or Cmd+Z (without Shift)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      e.preventDefault()
      handleCodeUndo()
      return
    }

    // Redo: Ctrl+Y or Cmd+Y, or Ctrl+Shift+Z
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
      e.preventDefault()
      handleCodeRedo()
      return
    }

    // Shortcut: Ctrl+Shift+F or Alt+Shift+F for instant smart formatting
    if ((e.ctrlKey || e.metaKey || e.altKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault()
      handleSmartFormatCode()
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.target
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      pushCodeHistorySnapshot(value, start, end)

      if (e.shiftKey) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1
        if (value.substring(lineStart, lineStart + 4) === '    ') {
          textarea.value = value.substring(0, lineStart) + value.substring(lineStart + 4)
          textarea.selectionStart = Math.max(lineStart, start - 4)
          textarea.selectionEnd = Math.max(lineStart, end - 4)
        } else if (value[lineStart] === '\t') {
          textarea.value = value.substring(0, lineStart) + value.substring(lineStart + 1)
          textarea.selectionStart = Math.max(lineStart, start - 1)
          textarea.selectionEnd = Math.max(lineStart, end - 1)
        }
      } else {
        textarea.value = value.substring(0, start) + '    ' + value.substring(end)
        textarea.selectionStart = textarea.selectionEnd = start + 4
      }
      setCodeContent(textarea.value)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const textarea = e.target
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      pushCodeHistorySnapshot(value, start, end)

      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const currentLine = value.substring(lineStart, start)
      const matchIndent = currentLine.match(/^\s*/)
      let indent = matchIndent ? matchIndent[0] : ''

      if (/[:{]\s*$/.test(currentLine)) {
        indent += '    '
      }

      const toInsert = '\n' + indent
      textarea.value = value.substring(0, start) + toInsert + value.substring(end)
      textarea.selectionStart = textarea.selectionEnd = start + toInsert.length
      setCodeContent(textarea.value)
    }
  }

  const handleCopyCodeToClipboard = () => {
    if (!codeContent) return
    navigator.clipboard.writeText(codeContent).then(() => {
      setCopiedCodeNotice(true)
      setTimeout(() => setCopiedCodeNotice(false), 2000)
    }).catch(() => {})
  }

  const handleDeleteSelectedCodeBlock = () => {
    if (!selectedCodeBlockInfo?.element) return
    const editor = rteRef.current
    if (editor && editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }
    const elem = selectedCodeBlockInfo.element
    const nextP = elem.nextElementSibling
    if (nextP && nextP.tagName === 'P' && (nextP.innerHTML === '<br>' || nextP.innerHTML === '')) {
      nextP.remove()
    }
    elem.remove()
    if (editor?.contentModule?.getEditPanel) {
      const newHtml = editor.contentModule.getEditPanel().innerHTML
      setEditorValue(newHtml)
      if (typeof editor.value !== 'undefined') editor.value = newHtml
    }
    setSelectedCodeBlockInfo(null)
  }

  const handleToggleSelectedCodeBorder = () => {
    if (!selectedCodeBlockInfo?.element) return
    const editor = rteRef.current
    if (editor && editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }
    const container = selectedCodeBlockInfo.element
    const pre = container.querySelector('pre.obe-code-block')
    const currentHasBorder = container.getAttribute('data-hasborder') !== 'false'
    const newHasBorder = !currentHasBorder

    container.setAttribute('data-hasborder', newHasBorder ? 'true' : 'false')
    if (pre) {
      pre.style.border = newHasBorder ? '1px solid #000000' : 'none'
      pre.style.background = newHasBorder ? '#ffffff' : 'transparent'
      pre.style.padding = newHasBorder ? '8px 14px' : '4px 6px'
      pre.style.borderRadius = newHasBorder ? '4px' : '0'
    }

    if (editor?.contentModule?.getEditPanel) {
      const newHtml = editor.contentModule.getEditPanel().innerHTML
      setEditorValue(newHtml)
      if (typeof editor.value !== 'undefined') editor.value = newHtml
    }

    setSelectedCodeBlockInfo(prev => prev ? {
      ...prev,
      hasBorder: newHasBorder,
      rect: container.getBoundingClientRect()
    } : null)
  }

  const handleInsertCodeSnippet = () => {
    if (!codeContent.trim()) {
      showNotification('Please enter or select code first.', 'warning')
      return
    }

    // Auto-Format Safety Check: If single-line or squished code was entered and not yet formatted, format it now!
    const effectiveCode = isCodeLikelySingleLine(codeContent)
      ? smartFormatCode(codeContent, codeLanguage)
      : codeContent
    if (effectiveCode !== codeContent) {
      setCodeContent(effectiveCode)
    }

    const editor = rteRef.current
    if (!editor) return

    const snippetHtml = generateCodeSnippetHtml({
      code: effectiveCode,
      language: codeLanguage,
      alignment: codeAlignment,
      hasBorder: codeHasBorder,
      boxStyle: codeHasBorder ? 'exam' : 'borderless',
      showLineNumbers: codeShowLineNumbers,
      fontSize: codeFontSize
    })

    if (editingCodeElement) {
      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
      editingCodeElement.outerHTML = snippetHtml
      if (editor.contentModule && editor.contentModule.getEditPanel) {
        const newHtml = editor.contentModule.getEditPanel().innerHTML
        setEditorValue(newHtml)
        if (typeof editor.value !== 'undefined') editor.value = newHtml
      }
      setEditingCodeElement(null)
    } else {
      editor.focusIn()
      const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
      const sel = doc ? doc.getSelection() : window.getSelection()
      const editArea = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
      const targetRange = savedCodeRangeRef.current || savedEditorRangeRef.current

      let rangeRestored = false
      if (targetRange && editArea && editArea.contains(targetRange.commonAncestorContainer)) {
        try {
          sel.removeAllRanges()
          sel.addRange(targetRange.cloneRange())
          rangeRestored = true
        } catch (e) {}
      }

      if (!rangeRestored && editArea) {
        const activeCell = editArea.querySelector('.col-content-cell:focus, .col-content-cell[data-active="true"]') ||
          editArea.querySelector('tr[data-obe-row="question"]:last-of-type .col-content-cell') ||
          editArea.querySelector('.col-content-cell:last-of-type')
        if (activeCell) {
          try {
            const fallbackRange = doc.createRange()
            fallbackRange.selectNodeContents(activeCell)
            fallbackRange.collapse(false)
            sel.removeAllRanges()
            sel.addRange(fallbackRange)
          } catch (e) {}
        }
      }

      if (editor.formatter && typeof editor.formatter.saveData === 'function') {
        editor.formatter.saveData()
      }
      editor.executeCommand('insertHTML', snippetHtml)
      // DO NOT call saveData() here so Syncfusion undo stack records the undo rollback correctly!
      savedCodeRangeRef.current = null
    }

    setShowCodeSnippetModal(false)
    setTimeout(() => {
      try {
        if (editor?.contentModule?.getEditPanel) {
          editor.contentModule.getEditPanel().focus()
        } else if (typeof editor?.focusIn === 'function') {
          editor.focusIn()
        }
      } catch (e) {}
    }, 60)
  }

  // Toggle Table Borders (Clear / Restore) — makes the question paper table look professional (like MS Word "Clear" table style)
  const handleClearTableBorders = () => {
    if (!rteRef.current) return
    const editor = rteRef.current
    const editArea = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
    if (!editArea) return

    // Find the target table
    let targetTable = null

    // 1. If user clicked gripper / handle, cells have multi-cell selection
    const multiCell = editArea.querySelector('.e-cell-select.e-multi-cells-select, .e-multi-cells-select')
    if (multiCell) {
      targetTable = multiCell.closest('table')
    }

    // 2. Or walk up from current selection / cursor position
    if (!targetTable) {
      const selection = editArea.ownerDocument?.getSelection ? editArea.ownerDocument.getSelection() : window.getSelection()
      let node = selection?.anchorNode
      while (node && node !== editArea) {
        if (node.nodeName === 'TABLE') { targetTable = node; break }
        node = node.parentNode
      }
    }

    // 3. Fallback: find the OBE structure table or last table in the editor
    if (!targetTable) {
      const tables = editArea.querySelectorAll('table.obe-paper-structure-table, table[data-obe-paper-structure="true"], table.e-rte-table')
      if (tables.length > 0) targetTable = tables[tables.length - 1]
    }
    if (!targetTable) return

    // Save undo history before border mutation
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }

    const tbody = targetTable.querySelector(':scope > tbody') || targetTable
    const directCells = Array.from(tbody.querySelectorAll(':scope > tr > td, :scope > tr > th'))

    // Determine if borders are currently cleared:
    const isExplicitlyCleared = targetTable.getAttribute('data-obe-borders-cleared') === 'true' ||
      targetTable.classList.contains('borders-cleared') ||
      targetTable.style.border === 'none' ||
      targetTable.style.borderWidth === '0px' ||
      (directCells.length > 0 && (
        directCells[0].style.border === 'none' ||
        directCells[0].style.borderWidth === '0px' ||
        directCells[0].style.borderStyle === 'none'
      ))

    if (isExplicitlyCleared) {
      // ── RESTORE BORDERS ──
      targetTable.removeAttribute('data-obe-borders-cleared')
      targetTable.classList.remove('borders-cleared')
      targetTable.style.border = '1px solid #000'
      directCells.forEach(cell => {
        cell.style.border = '1px solid #000'
      })

      // Update button text in quick toolbar
      const btn = document.getElementById('clear-borders-btn')
      if (btn) {
        const textSpan = btn.querySelector('span')
        if (textSpan) textSpan.textContent = 'Clear Borders'
        btn.classList.remove('e-active')
      }
    } else {
      // ── CLEAR BORDERS ──
      targetTable.setAttribute('data-obe-borders-cleared', 'true')
      targetTable.classList.add('borders-cleared')
      targetTable.style.border = 'none'
      directCells.forEach(cell => {
        cell.style.border = 'none'
      })

      // Update button text in quick toolbar
      const btn = document.getElementById('clear-borders-btn')
      if (btn) {
        const textSpan = btn.querySelector('span')
        if (textSpan) textSpan.textContent = 'Restore Borders'
        btn.classList.add('e-active')
      }
    }

    // Save undo history after border mutation
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }
  }

  // ─── Table & Data Alignment Handlers for Quick Toolbar ───
  const handleCycleTableAlign = () => {
    if (!rteRef.current) return
    const editor = rteRef.current
    const editArea = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
    if (!editArea) return

    const selection = editArea.ownerDocument?.getSelection ? editArea.ownerDocument.getSelection() : window.getSelection()
    let node = selection?.anchorNode
    let targetTable = null
    while (node && node !== editArea) {
      if (node.nodeName === 'TABLE') { targetTable = node; break }
      node = node.parentNode
    }
    if (!targetTable) {
      const tables = editArea.querySelectorAll('table.e-rte-table, table')
      if (tables.length > 0) targetTable = tables[tables.length - 1]
    }
    if (!targetTable) return

    // Detect actual current alignment from table inline styles
    const ml = targetTable.style.marginLeft
    const mr = targetTable.style.marginRight
    let currentAlign = 'center'
    if (ml === '0px' || ml === '0') currentAlign = 'left'
    else if (mr === '0px' || mr === '0') currentAlign = 'right'

    // Save undo history before table align mutation
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }

    // Compute next alignment: Center -> Left -> Right -> Center
    const nextAlign = currentAlign === 'center' ? 'left' : currentAlign === 'left' ? 'right' : 'center'

    targetTable.style.float = 'none'
    targetTable.style.display = 'table'
    if (nextAlign === 'left') {
      targetTable.style.marginLeft = '0'
      targetTable.style.marginRight = 'auto'
    } else if (nextAlign === 'center') {
      targetTable.style.marginLeft = 'auto'
      targetTable.style.marginRight = 'auto'
    } else if (nextAlign === 'right') {
      targetTable.style.marginLeft = 'auto'
      targetTable.style.marginRight = '0'
    }

    // Update DOM button label immediately to guarantee 100% consistency
    const btnSpan = document.querySelector('#table-align-btn span')
    if (btnSpan) {
      btnSpan.textContent = `Table: ${nextAlign.charAt(0).toUpperCase() + nextAlign.slice(1)}`
    }

    // Save undo history after table align mutation
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }
  }

  const handleCycleDataAlign = () => {
    if (!rteRef.current) return
    const editor = rteRef.current
    const editArea = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
    if (!editArea) return

    const selection = editArea.ownerDocument?.getSelection ? editArea.ownerDocument.getSelection() : window.getSelection()
    let node = selection?.anchorNode
    let targetTable = null
    while (node && node !== editArea) {
      if (node.nodeName === 'TABLE') { targetTable = node; break }
      node = node.parentNode
    }
    if (!targetTable) {
      const tables = editArea.querySelectorAll('table.e-rte-table, table')
      if (tables.length > 0) targetTable = tables[tables.length - 1]
    }
    if (!targetTable) return

    let targetCells = []
    if (selection && selection.rangeCount > 0) {
      let container = selection.getRangeAt(0).commonAncestorContainer
      if (container.nodeType === 3) container = container.parentNode
      const cell = container.closest ? container.closest('td, th') : null
      if (cell) targetCells.push(cell)
    }

    const selectedCells = targetTable.querySelectorAll('.e-cell-select, .e-multi-cells-select')
    if (selectedCells.length > 0) {
      targetCells = Array.from(selectedCells)
    }

    if (targetCells.length === 0) {
      targetCells = Array.from(targetTable.querySelectorAll('td, th'))
    }

    // Save undo history before cell data align mutation
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }

    // Detect actual current cell alignment from first target cell
    const firstCell = targetCells[0]
    const currentAlign = firstCell ? (firstCell.style.textAlign || 'left') : 'left'
    const nextAlign = currentAlign === 'left' ? 'center' : currentAlign === 'center' ? 'right' : currentAlign === 'right' ? 'justify' : 'left'

    targetCells.forEach(cell => {
      cell.style.textAlign = nextAlign
    })

    // Update DOM button label immediately to guarantee 100% consistency
    const btnSpan = document.querySelector('#cell-align-btn span')
    if (btnSpan) {
      btnSpan.textContent = `Data: ${nextAlign.charAt(0).toUpperCase() + nextAlign.slice(1)}`
    }

    // Save undo history after cell data align mutation
    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }
  }

  // Helper to check if a table is explicitly selected (via the top-left corner move/select handle or multi-cell selection)
  // Ensures regular typing or single-cell cursor focus NEVER triggers table design or table quick toolbars!
  const isTableFullySelected = (targetEl = null) => {
    const editor = rteRef.current
    if (!editor) return false
    const doc = editor.contentModule?.getDocument ? editor.contentModule.getDocument() : document
    const editArea = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null

    // 1. Gripper / Table Handle check (the top-left corner ✢ move/drag icon)
    if (targetEl) {
      const isGripper = targetEl.classList?.contains?.('e-move') ||
                        targetEl.classList?.contains?.('e-drag-and-drop') ||
                        targetEl.closest?.('.e-rte-table-resize') ||
                        targetEl.closest?.('.e-table-box') ||
                        (typeof targetEl.className === 'string' && (targetEl.className.includes('e-move') || targetEl.className.includes('e-drag-and-drop')))
      if (isGripper) return true
    }

    // Check if the gripper in the document is currently active
    const activeGripper = (editArea || doc).querySelector?.('.e-icons.e-move.e-active, .e-icons.e-drag-and-drop.e-active')
    if (activeGripper) return true

    // 2. Multi-cell selection check: In Syncfusion RTE, clicking the top-left table handle
    // highlights all cells in the table with .e-multi-cells-select (light pink background)
    const multiSelectedCells = (editArea || doc).querySelectorAll?.('.e-cell-select.e-multi-cells-select, .e-multi-cells-select')
    if (multiSelectedCells && multiSelectedCells.length > 0) return true

    return false
  }

  // Update contextual Table Design ribbon button visibility (Word-style Contextual Ribbon Tab)
  // ONLY displays when the table is explicitly selected via top-left corner handle or multi-cell selection.
  // Stays hidden during normal typing and single-cell editing.
  const updateTableDesignRibbonVisibility = (targetEl = null) => {
    const editor = rteRef.current
    if (!editor) return

    const isSelected = isTableFullySelected(targetEl)

    const ribbonBtns = document.querySelectorAll('#table-design-ribbon-btn')
    ribbonBtns.forEach(btn => {
      const item = btn.closest('.e-toolbar-item')
      if (item) {
        item.style.display = isSelected ? 'inline-flex' : 'none'
      }
    })
  }

  // Intercept Syncfusion Quick Toolbar before it opens.
  // The table quick toolbar should ONLY open when the table is explicitly selected (via the corner handle).
  // When the user is simply typing or moving the cursor inside a cell, it is cancelled immediately.
  const handleBeforeQuickToolbarOpen = (args) => {
    if (!args) return

    const popupEl = args.popup?.element
    const id = popupEl?.id || ''
    const isTablePopup = id.includes('Table') || id.includes('table') ||
                         Boolean(popupEl?.querySelector?.('#quick-table-design-btn, #clear-borders-btn, .e-rte-table-quick-toolbar')) ||
                         Boolean(args.targetElement?.closest?.('table'))

    if (isTablePopup) {
      const tableSelected = isTableFullySelected(args.targetElement)
      if (!tableSelected) {
        // User is just typing or cursor is inside a cell — cancel the floating table quick toolbar!
        args.cancel = true
        return
      }

      // Sync Clear / Restore Borders button label to current table border state
      setTimeout(() => {
        const editor = rteRef.current
        const editArea = editor?.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
        const targetTable = args.targetElement?.closest?.('table') ||
                            editArea?.querySelector?.('.e-cell-select.e-multi-cells-select, .e-multi-cells-select')?.closest('table') ||
                            editArea?.querySelector?.('table.obe-paper-structure-table, table[data-obe-paper-structure="true"]')
        const btn = document.getElementById('clear-borders-btn')
        if (btn && targetTable) {
          const isCleared = targetTable.getAttribute('data-obe-borders-cleared') === 'true' ||
                            targetTable.classList.contains('borders-cleared') ||
                            targetTable.style.border === 'none' ||
                            targetTable.style.borderWidth === '0px'
          const textSpan = btn.querySelector('span')
          if (textSpan) textSpan.textContent = isCleared ? 'Restore Borders' : 'Clear Borders'
          if (isCleared) btn.classList.add('e-active')
          else btn.classList.remove('e-active')
        }
      }, 30)
    }
  }

  const handleQuickToolbarClose = () => {
    setTimeout(() => updateTableDesignRibbonVisibility(null), 50)
  }

  useEffect(() => {
    const handleCellInteraction = (e) => {
      // If typing (keyup), ensure Table Design ribbon button and table quick toolbar remain hidden!
      if (e.type === 'keyup') {
        updateTableDesignRibbonVisibility(null)
        return
      }

      // If user clicked inside a cell for typing (and NOT on the table move/select handle),
      // dismiss any open table quick toolbar immediately so it doesn't linger!
      const isGripper = e.target?.classList?.contains?.('e-move') ||
                        e.target?.classList?.contains?.('e-drag-and-drop') ||
                        e.target?.closest?.('.e-rte-table-resize') ||
                        e.target?.closest?.('.e-table-box')

      const targetCell = e.target.closest ? e.target.closest('td, th') : null
      if (targetCell && !isGripper) {
        try {
          const editor = rteRef.current
          if (editor?.quickToolbarModule) {
            editor.quickToolbarModule.hideQuickToolbars()
          }
        } catch (err) {}
      }

      // Let Syncfusion finish updating selection state before evaluating table selection
      updateTableDesignRibbonVisibility(e.target)
      setTimeout(() => updateTableDesignRibbonVisibility(e.target), 30)

      if (targetCell) {
        // Automatically clean any orphan &nbsp; / \u00a0 space in the cell so the cursor is strictly flush left
        try {
          const paras = targetCell.querySelectorAll('p, div')
          paras.forEach(p => {
            if (/^(?:&nbsp;|\u00a0|\s)+$/i.test(p.innerHTML.trim())) {
              p.innerHTML = '<br>'
            } else if (/^(?:&nbsp;|\u00a0|\s)+/i.test(p.innerHTML)) {
              p.innerHTML = p.innerHTML.replace(/^(?:&nbsp;|\u00a0|\s)+/gi, '')
            }
          })
          if (/^(?:&nbsp;|\u00a0|\s)+<span/i.test(targetCell.innerHTML.trim())) {
            targetCell.innerHTML = targetCell.innerHTML.replace(/^(?:&nbsp;|\u00a0|\s)+/gi, '')
          }
        } catch (err) {}
      }
    }

    const editArea = rteRef.current?.contentModule?.getEditPanel ? rteRef.current.contentModule.getEditPanel() : null
    if (editArea) {
      editArea.addEventListener('click', handleCellInteraction, true)
      editArea.addEventListener('keyup', handleCellInteraction, true)
      editArea.addEventListener('mouseup', handleCellInteraction, true)
      editArea.addEventListener('focusin', handleCellInteraction, true)
      const onSelectionChange = () => {
        updateTableDesignRibbonVisibility(null)
      }
      document.addEventListener('selectionchange', onSelectionChange)

      // Initial check (hidden by default)
      setTimeout(() => updateTableDesignRibbonVisibility(null), 200)

      return () => {
        editArea.removeEventListener('click', handleCellInteraction, true)
        editArea.removeEventListener('keyup', handleCellInteraction, true)
        editArea.removeEventListener('mouseup', handleCellInteraction, true)
        editArea.removeEventListener('focusin', handleCellInteraction, true)
        document.removeEventListener('selectionchange', onSelectionChange)
      }
    }
  }, [loading])

  const handleOpenTableDesignModal = () => {
    setShowTableDesignModal(true)
  }

  // Quick Toolbar settings for tables & images — streamlined toolbar with Word Table Design & Image Removal
  const quickToolbarSettings = {
    image: [
      'Replace', 'Align', 'Caption', 'Remove', '|', 'Display', 'AltText', 'Dimension'
    ],
    table: [
      'TableHeader', 'TableRows', 'TableColumns', 'TableCell', '|',
      'BackgroundColor', 'TableRemove', '|',
      {
        tooltipText: 'Open Table Design & Styles Modal (Word Table Ribbon)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="quick-table-design-btn" tabIndex="-1" style="display:flex;align-items:center;gap:4px;border:none;background:#eff6ff;padding:2px 8px;border-radius:4px;cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg><span style="font-size:11px;font-weight:700;color:#2563eb;">Table Design</span></button>',
        click: () => handleOpenTableDesignModal()
      },
      {
        tooltipText: 'Toggle Borders (Clear / Restore)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="clear-borders-btn" tabIndex="-1" style="display:flex;align-items:center;gap:4px;border:none;background:transparent;padding:2px 8px;cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/><line x1="3" y1="12" x2="21" y2="12" stroke-dasharray="4 2"/><line x1="12" y1="3" x2="12" y2="21" stroke-dasharray="4 2"/></svg><span style="font-size:11px;font-weight:600;">Clear Borders</span></button>',
        click: handleClearTableBorders
      }
    ]
  }

  // Handlers for Microsoft Word-Style Paragraph Ribbon Tools
  const handleToggleParagraphMarks = () => {
    setShowParagraphMarks(prev => {
      const next = !prev
      const btns = document.querySelectorAll('#show-hide-pilcrow-btn')
      btns.forEach(btn => {
        if (next) btn.classList.add('e-active')
        else btn.classList.remove('e-active')
      })
      return next
    })
  }

  const handleSortAlphabetical = () => {
    const editor = rteRef.current
    if (!editor) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      showNotification('Please highlight/select lines or list items first to sort them alphabetically.', 'warning')
      return
    }
    const text = sel.toString()
    if (!text.trim()) return

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length <= 1) return

    lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    const sortedHtml = lines.map(l => `<p>${l}</p>`).join('')

    if (editor.formatter && typeof editor.formatter.saveData === 'function') {
      editor.formatter.saveData()
    }
    editor.executeCommand('insertHTML', sortedHtml)
  }

  const handleToggleMultilevelList = () => {
    const editor = rteRef.current
    if (!editor) return
    editor.focusIn()
    editor.executeCommand('insertOrderedList')
  }

  // Microsoft Word-Style Font Family and Font Size Configurations
  const fontFamilyConfig = useMemo(() => ({
    default: 'Times New Roman,Times,serif',
    width: '148px',
    items: [
      { text: 'Times New Roman', value: 'Times New Roman,Times,serif', command: 'Font', subCommand: 'FontName' },
      { text: 'Calibri', value: 'Calibri,Candara,Segoe,Segoe UI,Arial,sans-serif', command: 'Font', subCommand: 'FontName' },
      { text: 'Cambria', value: 'Cambria,Georgia,serif', command: 'Font', subCommand: 'FontName' },
      { text: 'Arial', value: 'Arial,Helvetica,sans-serif', command: 'Font', subCommand: 'FontName' },
      { text: 'Segoe UI', value: "'Segoe UI',Tahoma,Geneva,Verdana,sans-serif", command: 'Font', subCommand: 'FontName' },
      { text: 'Garamond', value: 'Garamond,Baskerville,Hoefler Text,Times New Roman,serif', command: 'Font', subCommand: 'FontName' },
      { text: 'Georgia', value: 'Georgia,Times,serif', command: 'Font', subCommand: 'FontName' },
      { text: 'Century Gothic', value: "'Century Gothic',CenturyGothic,AppleGothic,sans-serif", command: 'Font', subCommand: 'FontName' },
      { text: 'Trebuchet MS', value: "'Trebuchet MS',Lucida Sans Unicode,Lucida Grande,sans-serif", command: 'Font', subCommand: 'FontName' },
      { text: 'Tahoma', value: 'Tahoma,Verdana,Segoe,sans-serif', command: 'Font', subCommand: 'FontName' },
      { text: 'Verdana', value: 'Verdana,Geneva,sans-serif', command: 'Font', subCommand: 'FontName' },
      { text: 'Book Antiqua', value: "'Book Antiqua',Palatino,Palatino Linotype,serif", command: 'Font', subCommand: 'FontName' },
      { text: 'Palatino Linotype', value: "'Palatino Linotype',Palatino,Book Antiqua,serif", command: 'Font', subCommand: 'FontName' },
      { text: 'Consolas', value: 'Consolas,monaco,Courier New,monospace', command: 'Font', subCommand: 'FontName' },
      { text: 'Courier New', value: "'Courier New',Courier,monospace", command: 'Font', subCommand: 'FontName' },
      { text: 'Comic Sans MS', value: "'Comic Sans MS',Chalkboard SE,Comic Neue,cursive", command: 'Font', subCommand: 'FontName' },
      { text: 'Franklin Gothic Medium', value: "'Franklin Gothic Medium',Arial Bold,sans-serif", command: 'Font', subCommand: 'FontName' },
      { text: 'Impact', value: 'Impact,Haettenschweiler,Arial Narrow Bold,sans-serif', command: 'Font', subCommand: 'FontName' },
      { text: 'Nirmala UI', value: "'Nirmala UI', sans-serif", command: 'Font', subCommand: 'FontName' },
      { text: 'Aptos', value: 'Aptos,Calibri,sans-serif', command: 'Font', subCommand: 'FontName' }
    ]
  }), [])

  const fontSizeConfig = useMemo(() => ({
    default: '12pt',
    width: '65px',
    items: [
      { text: '8 pt', value: '8pt', command: 'Font', subCommand: 'FontSize' },
      { text: '9 pt', value: '9pt', command: 'Font', subCommand: 'FontSize' },
      { text: '10 pt', value: '10pt', command: 'Font', subCommand: 'FontSize' },
      { text: '11 pt', value: '11pt', command: 'Font', subCommand: 'FontSize' },
      { text: '12 pt', value: '12pt', command: 'Font', subCommand: 'FontSize' },
      { text: '14 pt', value: '14pt', command: 'Font', subCommand: 'FontSize' },
      { text: '16 pt', value: '16pt', command: 'Font', subCommand: 'FontSize' },
      { text: '18 pt', value: '18pt', command: 'Font', subCommand: 'FontSize' },
      { text: '20 pt', value: '20pt', command: 'Font', subCommand: 'FontSize' },
      { text: '22 pt', value: '22pt', command: 'Font', subCommand: 'FontSize' },
      { text: '24 pt', value: '24pt', command: 'Font', subCommand: 'FontSize' },
      { text: '26 pt', value: '26pt', command: 'Font', subCommand: 'FontSize' },
      { text: '28 pt', value: '28pt', command: 'Font', subCommand: 'FontSize' },
      { text: '36 pt', value: '36pt', command: 'Font', subCommand: 'FontSize' },
      { text: '48 pt', value: '48pt', command: 'Font', subCommand: 'FontSize' },
      { text: '72 pt', value: '72pt', command: 'Font', subCommand: 'FontSize' }
    ]
  }), [])

  const toolbarSettings = useMemo(() => ({
    type: 'MultiRow',
    items: [
      // 📋 CLIPBOARD GROUP
      'Undo', 'Redo', '|',

      // 🔤 FONT GROUP (Microsoft Word Ribbon Layout)
      'FontName',
      {
        tooltipText: 'Font Size (Type size e.g. 11, or click arrow)',
        template: '<div class="word-fontsize-wrapper" id="word-fontsize-wrapper"><input type="text" id="word-fontsize-input" class="word-fontsize-input" value="12" maxlength="4" autocomplete="off" spellcheck="false" title="Font Size (e.g. 11, 12, 14)" /><button type="button" id="word-fontsize-btn" class="word-fontsize-btn" title="Font Size Options" tabIndex="-1"><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg></button></div>'
      },
      '|',
      'Bold', 'Italic', 'Underline', 'StrikeThrough', '|',
      'SubScript', 'SuperScript', '|',
      'FontColor', '|',
      'LowerCase', 'UpperCase', '|',
      'ClearFormat', '|',

      // 📄 PARAGRAPH GROUP (Exact Microsoft Word Paragraph Ribbon Module)
      // Top Row of Word Paragraph Module: Bullets, Numbering, Multilevel, Indents, Sort, Pilcrow
      'BulletFormatList', 'NumberFormatList',
      {
        tooltipText: 'Multilevel List (1 ➔ a ➔ i) for Exam Sub-questions',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="multilevel-list-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; padding: 0 4px;" title="Multilevel List (1 ➔ a ➔ i)"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 6H9"/><path d="M21 12H9"/><path d="M21 18H9"/><path d="M4 6V4l1 1"/><path d="M3 11a1 1 0 0 1 1-1h1v3"/><path d="M3 18h2v-2"/></svg></button>',
        click: handleToggleMultilevelList
      },
      '|',
      'Outdent', 'Indent', '|',
      {
        tooltipText: 'Sort Lines / List Items Alphabetically (A to Z)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="sort-az-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; padding: 0 4px;" title="Sort Alphabetically (A to Z)"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M15 4h5l-5 6h5"/><path d="M15 20v-3.5a2.5 2.5 0 0 1 5 0V20"/><path d="M15 18h5"/></svg></button>',
        click: handleSortAlphabetical
      },
      '|',
      {
        tooltipText: 'Show / Hide Paragraph Marks (¶) & Formatting Guides',
        template: `<button class="e-tbar-btn e-control e-btn e-lib ${showParagraphMarks ? 'e-active' : ''}" id="show-hide-pilcrow-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; padding: 0 4px;" title="Show/Hide Paragraph Marks (¶)"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4v16"/><path d="M17 4v16"/><path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13"/></svg></button>`,
        click: handleToggleParagraphMarks
      },
      '|',
      // Bottom Row of Word Paragraph Module: Align Left, Center, Align Right, Justify, Line Spacing, Shading, Borders
      'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyFull', '|',
      'LineHeight', '|',
      'BackgroundColor', '|',
      {
        tooltipText: 'Table Borders: Toggle / Clear borders on tables',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="toolbar-table-borders-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; padding: 0 4px;" title="Table Borders"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h18"/><path d="M12 3v18"/></svg></button>',
        click: handleClearTableBorders
      },
      '|',
      'Formats', 'Blockquote', '|',

      // 🛠️ ACADEMIC EXAM & INSERT TOOLS GROUP
      {
        tooltipText: 'Exam Paper Structure Builder (Mid/Final Question Format)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="paper-structure-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; gap: 4px; padding: 0 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M8 10h8"/><path d="M8 14h8"/><path d="M8 18h5"/></svg><span style="font-size:11px;font-weight:700;color:#059669;">Paper Structure</span></button>',
        click: handleOpenPaperStructureModal
      },
      'CreateTable',
      {
        tooltipText: 'Table Design & Styles (Word Table Ribbon: Presets, Borders, Shading)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="table-design-ribbon-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; gap: 4px; padding: 0 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg><span style="font-size:11px;font-weight:700;color:#2563eb;">Table Design</span></button>',
        click: () => handleOpenTableDesignModal()
      },
      'Image', 'CreateLink', 'EmojiPicker', '|',
      {
        tooltipText: 'Programming Code Snippet Generator (C++, Python, Pseudocode)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="code-snippet-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; gap: 4px; padding: 0 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg><span style="font-size:11px;font-weight:700;color:#2563eb;">Code</span></button>',
        click: () => handleOpenCodeSnippetModal()
      },
      '|',
      {
        tooltipText: 'AI Assistant & Question Suggestions',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="ai-commands-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; gap: 4px; padding: 0 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg><span style="font-size:11px;font-weight:700;color:#059669;">AI</span></button>',
        click: handleAiButtonClick
      },
      '|',

      // 💾 FILE & EXPORT GROUP
      'ExportWord', 'ExportPdf', 'Print', '|',
      {
        tooltipText: 'Import Word Document (.docx) via Mammoth',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="import-word-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; gap: 4px; padding: 0 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-up"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 12v6"/><path d="m9 15 3-3 3 3"/></svg><span style="font-size:11px;font-weight:600;color:#4b5563;">Import</span></button>',
        click: handleCustomImportClick
      },
      '|',
      {
        tooltipText: 'Fullscreen Editor (Toggle view)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="fullscreen-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent; padding: 0 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg></button>',
        click: handleToggleFullscreen
      }
    ]
  }), [showParagraphMarks])

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

  const renderQuestionCoMappingCard = (inFullscreen = false) => {
    const totalAllocated = questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0)
    const isMarksExact = totalAllocated === assessment.maxMarks

    return (
      <div
        className={`bg-white rounded-2xl shadow-md border border-gray-150 p-5 ${
          inFullscreen
            ? 'flex flex-col h-full overflow-hidden select-text shadow-xl'
            : 'space-y-4'
        }`}
      >
        {/* Header */}
        <div className="border-b pb-3 shrink-0 font-sans space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 shadow-2xs">
              <CheckSquare size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-800 leading-tight">Question wise CO Mapping</h3>
              <p className="text-[11px] text-gray-500 font-medium">Map each question to its marks and CO</p>
            </div>
          </div>

          {inFullscreen && (
            <div className="flex items-center justify-between bg-gray-50/80 border border-gray-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-xs font-bold text-gray-600">Number of Questions:</span>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => handleNumQuestionsChange(Math.max(0, Number(numQuestions) - 1))}
                  disabled={Number(numQuestions) <= 0}
                  className="w-6 h-6 rounded bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs disabled:opacity-40 cursor-pointer transition-colors"
                  title="Decrease questions"
                >
                  <Minus size={12} strokeWidth={2.5} />
                </button>
                <span className="px-2 text-xs font-black text-gray-800 min-w-[28px] text-center">{numQuestions}</span>
                <button
                  type="button"
                  onClick={() => handleNumQuestionsChange(Number(numQuestions) + 1)}
                  className="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                  title="Increase questions"
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </div>

        {isExtraCT && (
          <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] font-semibold text-indigo-900 flex items-center gap-2 shrink-0">
            <AlertCircle size={15} className="text-indigo-600 shrink-0" />
            <span>All questions auto-mapped to <strong>{assessment.co || 'Target CO'}</strong> (inherited from {parentName}).</span>
          </div>
        )}

        {/* Question List */}
        {questions.length === 0 ? (
          <div className={`text-center py-8 ${inFullscreen ? 'flex-1 flex flex-col justify-center items-center' : ''}`}>
            <p className="text-sm text-gray-400 font-semibold">No questions configured.</p>
            <p className="text-xs text-gray-400 mt-1">Set the number of questions above.</p>
          </div>
        ) : (
          <div
            className={`space-y-3 pr-1.5 ${
              inFullscreen
                ? 'flex-1 min-h-0 overflow-y-auto'
                : 'max-h-[370px] overflow-y-auto'
            }`}
          >
            {questions.map((q, idx) => (
              <div key={q.questionNumber || idx} className="border border-gray-200/90 hover:border-emerald-300 p-3 rounded-xl space-y-2.5 bg-gray-50/40 transition-colors">
                <div className="flex justify-between items-center border-b border-gray-200/70 pb-1.5">
                  <span className="font-black text-xs text-gray-800">{q.questionNumber}</span>
                  {q.co && q.co !== 'NONE' && (
                    <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      [{q.co}]
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Max Marks</label>
                    <input
                      type="number"
                      min="0"
                      max={assessment.maxMarks || 200}
                      value={q.maxMarks}
                      onChange={(e) => handleMetadataChange(idx, 'maxMarks', e.target.value)}
                      className="w-full border border-gray-300 px-2.5 py-1.5 rounded-lg bg-white font-bold text-gray-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none shadow-2xs"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-bold text-gray-500">Mapped CO</label>
                      {isExtraCT && (
                        <span className="text-[8px] font-extrabold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">
                          Auto
                        </span>
                      )}
                    </div>
                    <select
                      value={q.co}
                      disabled={isExtraCT}
                      onChange={(e) => !isExtraCT && handleMetadataChange(idx, 'co', e.target.value)}
                      className={`w-full border border-gray-300 px-2 py-1.5 rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs ${
                        isExtraCT ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-dashed' : 'bg-white text-gray-800'
                      }`}
                    >
                      {availableCOs.map(coVal => (
                        <option key={coVal} value={coVal}>{coVal}</option>
                      ))}
                      <option value="NONE">NONE</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer: Total Allocated Marks */}
        <div className={`pt-2 shrink-0 ${inFullscreen ? 'mt-auto' : ''}`}>
          <div className="flex justify-between items-center text-xs font-bold text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-200 shadow-2xs">
            <span>Total Allocated Marks:</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
              isMarksExact
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                : 'text-amber-800 bg-amber-50 border border-amber-200'
            }`}>
              {totalAllocated} / {assessment.maxMarks}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderReferenceNotesCard = (inFullscreen = false) => {
    if (!notesStatusInfo?.hasNotes) {
      if (inFullscreen) return null
      return (
        /* Upload Reference Notes Prompt Card when notes are not yet attached */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/90 p-4 space-y-3 transition-all hover:border-gray-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center border border-gray-200/80 shadow-2xs shrink-0">
                <BookOpen size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-800 tracking-tight">
                  Reference Questions
                </h4>
                <p className="text-[11px] text-gray-500 font-normal">
                  Course: <span className="font-semibold text-gray-700">{offering?.course?.courseCode || notesCourseId || 'Active Course'}</span>
                </p>
              </div>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200">
              Not Attached
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Upload teacher's reference question files (.docx, .pdf, .pptx) to unlock real-time question suggestions while writing exam papers.
          </p>
          <button
            type="button"
            onClick={() => setShowNotesModal(true)}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Attach Reference Questions</span>
          </button>
        </div>
      )
    }

    const suggestionsCount = activeNoteSuggestions.length
    const displayedSuggestions = showAllSuggestions ? activeNoteSuggestions : activeNoteSuggestions.slice(0, 5)

    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-200/90 p-4 space-y-3.5 transition-all hover:border-gray-300 ${inFullscreen ? 'shrink-0 shadow-md' : ''}`}>
        {/* Clean, Minimal Professional Academic Header */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-2xs shrink-0">
              <BookOpen size={16} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-gray-900 tracking-tight">
                  Reference Questions
                </h4>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLiveSuggestActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}
                  title={isLiveSuggestActive ? 'Live suggestions active' : 'Live suggestions paused'}
                />
              </div>
              <p className="text-[11px] text-gray-500 font-normal truncate">
                Course: <span className="font-semibold text-gray-700">{offering?.course?.courseCode || notesCourseId}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Live Suggestions Toggle Switch */}
            <button
              type="button"
              onClick={() => handleToggleLiveSuggest()}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border shadow-2xs ${
                isLiveSuggestActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
              }`}
              title={isLiveSuggestActive ? (isMlWarming ? 'AI service is waking up... click to pause' : 'Live suggestions are active — click to pause') : 'Suggestions paused — click to enable'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isLiveSuggestActive ? (isMlWarming ? 'bg-amber-500 animate-ping' : 'bg-emerald-500') : 'bg-gray-400'}`} />
              {isLiveSuggestActive ? (isMlWarming ? 'Warming...' : 'Live') : 'Paused'}
            </button>
            <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              {notesStatusInfo.totalChunks} Qs
            </span>
            <button
              type="button"
              onClick={() => setShowNotesModal(true)}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-transparent hover:border-gray-200 transition-colors cursor-pointer flex items-center justify-center"
              title="Manage / View Reference Notes"
            >
              <Edit3 size={13} />
            </button>
          </div>
        </div>

        {/* File Info Bar */}
        <div className="bg-gray-50/80 border border-gray-200/70 rounded-xl px-2.5 py-1.5 text-xs text-gray-700 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText size={12} className="text-gray-400 shrink-0" />
            <span className="truncate font-medium text-gray-700 text-[11px]" title={notesStatusInfo.fileName || 'Course Reference Notes'}>
              {notesStatusInfo.fileName || 'Course Reference Notes'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-semibold text-gray-600 bg-white border border-gray-200 px-1.5 py-0.5 rounded uppercase">
              {notesStatusInfo.fileType || 'Active'}
            </span>
            <button
              type="button"
              onClick={() => setShowNotesModal(true)}
              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              Manage
            </button>
          </div>
        </div>

        {/* Real-time Suggestions Section */}
        {suggestionsCount > 0 ? (
          <div className="space-y-2 pt-1 border-t border-gray-100 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-800">
                  Matched Suggestions
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {suggestionsCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveNoteSuggestions([])
                  setShowAllSuggestions(false)
                }}
                className="text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100 cursor-pointer"
                title="Dismiss suggestions"
              >
                Clear ✕
              </button>
            </div>

            {/* Scrollable Container with dynamic height */}
            <div className={`${inFullscreen ? 'max-h-[260px] xl:max-h-[300px]' : 'max-h-[340px]'} overflow-y-auto space-y-2 pr-1 custom-scrollbar`}>
              {displayedSuggestions.map((sug) => {
                const cleanedText = stripQuestionLeadingNumber(sug.questionText)
                const parsed = parseScenarioAndTable(sug.questionText)
                const displayQuestion = parsed.scenarioText ? parsed.questionText : cleanedText
                const detected = detectEmbeddedCodeInQuestion(displayQuestion)
                return (
                  <div
                    key={sug.id}
                    className="p-2.5 rounded-xl border border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 transition-all shadow-2xs space-y-2 group"
                  >
                    {/* Scenario Context Callout */}
                    {parsed.scenarioText && (
                      <div className="bg-indigo-50/70 rounded-lg px-2.5 py-1.5 border border-indigo-200/80 text-[10.5px] text-indigo-900 leading-snug font-medium flex items-start gap-1.5">
                        <span className="text-indigo-500 shrink-0 mt-0.5">📋</span>
                        <span className="line-clamp-3">{parsed.scenarioText}</span>
                      </div>
                    )}
                    <p className="text-[11.5px] text-gray-800 font-medium leading-relaxed">
                      "{detected.hasCode ? detected.promptText : displayQuestion}"
                    </p>
                    {detected.hasCode && (
                      <div className="bg-gray-900 rounded-lg p-2 font-mono text-[10.5px] text-emerald-300 leading-snug overflow-x-auto max-h-[90px] border border-gray-700 shadow-inner">
                        <pre className="m-0 whitespace-pre font-mono">{detected.codeSnippet}</pre>
                      </div>
                    )}
                    {/* Markdown Table Preview */}
                    {parsed.markdownTable && (
                      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-2xs">
                        <table className="w-full text-left text-[10.5px] border-collapse">
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
                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-gray-100">
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        {sug.matchPercentage}% Match
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInsertNoteSuggestion({ ...sug, questionText: cleanedText })}
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Insert Question</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Smart Expand/Collapse Toggle when results exceed 5 */}
            {suggestionsCount > 5 && (
              <button
                type="button"
                onClick={() => setShowAllSuggestions(prev => !prev)}
                className="w-full py-1.5 px-3 bg-gray-50 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 rounded-lg border border-gray-200 hover:border-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                {showAllSuggestions ? (
                  <>
                    <span>Show top 5 only</span>
                    <ChevronUp size={13} />
                  </>
                ) : (
                  <>
                    <span>Show all {suggestionsCount} matching questions (+{suggestionsCount - 5} more)</span>
                    <ChevronDown size={13} />
                  </>
                )}
              </button>
            )}

            <p className="text-[10.5px] text-gray-400 italic text-center pt-0.5">
              Click "Insert Question" to insert into current line
            </p>
          </div>
        ) : !isLiveSuggestActive ? (
          /* Subtle Paused Helper Tip when Live Suggestions are turned OFF or Auto-Paused */
          <div className="bg-amber-50/70 rounded-xl p-2.5 border border-amber-200/60 text-[11px] text-amber-900 leading-snug font-medium space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 text-xs mt-0.5">⏸️</span>
              <p>
                Suggestions are paused {isSuggestionsAutoPaused ? '(auto-paused due to inactivity / tab switch). ' : ''}Click{' '}
                <button
                  type="button"
                  onClick={() => handleToggleLiveSuggest(true)}
                  className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer inline"
                >
                  Live
                </button>{' '}
                to resume real-time question suggestions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNotesModal(true)}
              className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer pl-5"
            >
              <span>Browse all {notesStatusInfo.totalChunks} indexed questions manually &rarr;</span>
            </button>
          </div>
        ) : isLiveSuggestActive && isMlWarming ? (
          /* Microservice Warming State Feedback */
          <div className="bg-indigo-50/70 rounded-xl p-2.5 border border-indigo-200/70 text-[11px] text-indigo-900 leading-snug font-medium space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-xs mt-0.5">⏳</span>
              <p>
                <span className="font-bold text-indigo-950">AI Microservice is waking up from standby...</span> Real-time question suggestions will appear automatically as soon as it's ready.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNotesModal(true)}
              className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1 cursor-pointer pl-5"
            >
              <span>Browse all {notesStatusInfo.totalChunks} indexed questions manually &rarr;</span>
            </button>
          </div>
        ) : (
          /* Subtle Idle Helper Tip */
          <div className="bg-gray-50/70 rounded-xl p-2.5 border border-gray-200/60 text-[11px] text-gray-600 leading-snug font-medium space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 text-xs mt-0.5">💡</span>
              <p>
                Question suggestions will automatically appear here as you type in the editor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNotesModal(true)}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer pl-5"
            >
              <span>Browse all {notesStatusInfo.totalChunks} indexed questions &rarr;</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderSimilarityCheckerCard = (inFullscreen = false) => {
    const hasActiveNotes = Boolean(notesStatusInfo?.hasNotes)

    return (
      <div className={`bg-white rounded-2xl shadow-md border border-gray-150 ${
        inFullscreen
          ? hasActiveNotes
            ? 'p-5 space-y-3.5 shrink-0 shadow-lg'
            : 'p-6 space-y-4 flex flex-col h-full overflow-hidden'
          : 'p-6 space-y-4'
      }`}>
        <div className="flex items-center justify-between border-b pb-3 font-sans shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200/80 shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-800">Question Similarity Checker</h3>
              <p className="text-[11px] text-gray-500 font-medium">AI-powered originality analysis against archived papers</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600 font-medium leading-relaxed shrink-0">
          Compare your current question paper with all archived question papers for this course across semesters, batches, and sections to check for repetitive questions or high content overlap.
        </p>

        {/* Run Check Action Button */}
        <button
          type="button"
          onClick={handleRunSimilarityCheck}
          disabled={similarityLoading}
          className="w-full bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-900 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          {similarityLoading ? (
            <>
              <Loader2 size={16} className="animate-spin text-emerald-200" />
              <span>Analyzing Similarity with AI...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} className="text-emerald-300" />
              <span>{similarityResults ? 'Re-run Similarity Check' : 'Run Similarity Check'}</span>
            </>
          )}
        </button>

        {/* Error Message */}
        {similarityError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2 animate-fadeIn shrink-0">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{similarityError}</span>
          </div>
        )}

        {/* Results Display Area */}
        {similarityResults && (
          <div className={`space-y-4 pt-1 animate-fadeIn ${
            inFullscreen
              ? hasActiveNotes
                ? 'max-h-[350px] xl:max-h-[420px] overflow-y-auto pr-1 custom-scrollbar'
                : 'flex-1 min-h-0 overflow-y-auto pr-1'
              : ''
          }`}>
          {similarityResults.message ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>{similarityResults.message}</span>
            </div>
          ) : (() => {
            const filteredList = (similarityResults.results || []).filter(item => item.overallSimilarity > 0 || (item.matchedQuestions && item.matchedQuestions.length > 0))
            const currentSemList = filteredList.filter(item => item.isCurrentSemester)
            const olderSemList = filteredList.filter(item => !item.isCurrentSemester)

            const allResults = similarityResults.results || []
            const totalCurrentCompared = allResults.filter(item => item.isCurrentSemester).length
            const totalPreviousCompared = allResults.filter(item => !item.isCurrentSemester).length

            // Priority logic for summary card:
            // 1. If previous semester matches exist -> prioritize Previous Semesters
            // 2. If no previous semester matches -> fall back to Current Semester
            const hasPreviousMatches = olderSemList.length > 0
            const primarySummaryList = hasPreviousMatches ? olderSemList : (currentSemList.length > 0 ? currentSemList : filteredList)
            const summaryMaxSimilarity = primarySummaryList.length > 0
              ? Math.max(...primarySummaryList.map(item => item.overallSimilarity))
              : 0
            const summaryCategoryLabel = hasPreviousMatches
              ? 'Previous Semesters'
              : (currentSemList.length > 0 ? 'Current Semester' : 'Overall')
            const summaryMatchCount = primarySummaryList.length
            const summaryTotalCompared = hasPreviousMatches ? totalPreviousCompared : (currentSemList.length > 0 ? totalCurrentCompared : similarityResults.totalArchivesCompared)

            // Active list for current tab selection (defaulting to 'current' or 'previous')
            const displayedList = similarityFilterTab === 'previous'
              ? olderSemList
              : currentSemList

            if (filteredList.length === 0) {
              return (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-fadeIn shadow-xs">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-300 shadow-2xs">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">🎉 High Originality — No Content Overlap Found</h4>
                  <p className="text-xs text-emerald-800 font-semibold leading-relaxed">
                    No similar questions were found across all <strong>{similarityResults.totalArchivesCompared} archived question papers</strong> for this course! Your question paper is 100% unique.
                  </p>
                </div>
              )
            }

            return (
              <>
                {/* Overall Summary Card (Prioritizes Previous Semesters First) */}
                <div className="p-4 rounded-xl border space-y-2.5 bg-slate-50/80 border-slate-200 shrink-0 shadow-2xs">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">Highest Similarity</span>
                      <span className="text-[9px] font-extrabold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded border border-slate-300">
                        {hasPreviousMatches ? 'Prioritized: Prev Semesters' : 'Current Semester'}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                      summaryMaxSimilarity > 60
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : summaryMaxSimilarity > 30
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}>
                      {summaryMaxSimilarity}% Overlap
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        summaryMaxSimilarity > 60
                          ? 'bg-rose-600'
                          : summaryMaxSimilarity > 30
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.max(5, summaryMaxSimilarity)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-600 font-semibold pt-0.5 flex-wrap gap-1">
                    <span>
                      Found similarity in <strong>{summaryMatchCount}</strong> of <strong>{summaryTotalCompared}</strong> {summaryCategoryLabel.toLowerCase()} paper{summaryTotalCompared === 1 ? '' : 's'}
                    </span>
                    {summaryMaxSimilarity <= 25 ? (
                      <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Low Overlap
                      </span>
                    ) : summaryMaxSimilarity <= 60 ? (
                      <span className="text-amber-700 font-extrabold flex items-center gap-1">
                        <AlertTriangle size={12} /> Moderate Overlap
                      </span>
                    ) : (
                      <span className="text-rose-700 font-extrabold flex items-center gap-1">
                        <AlertCircle size={12} /> High Overlap Risk
                      </span>
                    )}
                  </div>
                </div>

                {/* Semester Filter Tabs (2-Tab View: Current Semester vs Previous Semesters) */}
                <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex items-center gap-1 text-[11px] font-extrabold shrink-0">
                  <button
                    type="button"
                    onClick={() => setSimilarityFilterTab('current')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                      similarityFilterTab === 'current'
                        ? 'bg-white text-emerald-900 shadow-xs border border-slate-200 font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Current Semester ({currentSemList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimilarityFilterTab('previous')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                      similarityFilterTab === 'previous'
                        ? 'bg-white text-emerald-900 shadow-xs border border-slate-200 font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Previous Semesters ({olderSemList.length})
                  </button>
                </div>

                {/* Archived Papers Breakdown List */}
                <div className={`space-y-2.5 pr-1 ${inFullscreen ? '' : 'max-h-[400px] overflow-y-auto'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Matched Archived Papers ({displayedList.length})
                    </p>
                    <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {similarityFilterTab === 'previous' ? 'Previous Semesters Only' : 'Current Semester Only'}
                    </span>
                  </div>

                  {displayedList.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 font-semibold">
                      No matching question similarity found in {similarityFilterTab === 'previous' ? 'previous semesters' : 'current semester'}.
                    </div>
                  ) : (
                    displayedList.map((item) => {
                      const isExpanded = expandedArchiveId === item.archiveId || displayedList.length === 1
                    return (
                      <div
                        key={item.archiveId}
                        className="border rounded-xl bg-white shadow-2xs overflow-hidden transition-all border-gray-200 hover:border-emerald-300"
                      >
                        {/* Archive Item Header */}
                        <div
                          onClick={() => setExpandedArchiveId(isExpanded ? null : item.archiveId)}
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                        >
                          <div className="space-y-0.5 min-w-0 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-xs text-slate-800">{item.assessmentName}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold border border-slate-200">
                                {item.semester}
                              </span>
                              {item.section && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold border border-indigo-200">
                                  Sec {item.section}
                                </span>
                              )}
                            </div>
                            {item.summary && (
                              <p className="text-[11px] text-gray-500 truncate font-medium">{item.summary}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                              item.overallSimilarity > 60
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : item.overallSimilarity > 30
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {item.overallSimilarity}%
                            </span>
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="p-3 bg-slate-50/50 border-t border-gray-150 space-y-3 text-xs">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI Summary Verdict</span>
                              <p className="text-gray-700 font-semibold leading-relaxed bg-white p-2.5 rounded-lg border border-gray-200 text-[11px]">
                                {item.summary || 'Content overlap detected.'}
                              </p>
                            </div>

                            {item.matchedQuestions && item.matchedQuestions.length > 0 && (
                              <div className="space-y-2.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Matched Question Breakdown</span>
                                {item.matchedQuestions.map((match, mIdx) => (
                                  <div key={mIdx} className="bg-white p-3 rounded-xl border border-gray-200 space-y-2.5 shadow-2xs">
                                    {/* Pair Header & Score */}
                                    <div className="flex items-center justify-between border-b pb-1.5 border-gray-100">
                                      <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        Match Pair #{mIdx + 1}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                          {match.similarity}% similar
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setComparisonModalData({
                                              currentQ: match.currentQ,
                                              archivedQ: match.archivedQ,
                                              explanation: match.explanation,
                                              similarity: match.similarity,
                                              archiveInfo: `${item.assessmentName} — ${item.semester} (Sec ${item.section})`
                                            })
                                          }}
                                          className="text-[10px] font-extrabold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                                          title="Inspect full text side-by-side"
                                        >
                                          <Maximize2 size={11} /> Compare Side-by-Side
                                        </button>
                                      </div>
                                    </div>

                                    {/* Horizontal Side-by-Side Comparison Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                      {/* Left Column: Current Question */}
                                      <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/80 space-y-1">
                                        <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Current Paper
                                        </div>
                                        <p className="text-slate-800 font-semibold text-[11px] leading-snug">
                                          {match.currentQ}
                                        </p>
                                      </div>

                                      {/* Right Column: Archived Question */}
                                      <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-200/80 space-y-1">
                                        <div className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span> Archived Paper
                                        </div>
                                        <p className="text-slate-800 font-semibold text-[11px] leading-snug">
                                          {match.archivedQ}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Explanation */}
                                    {match.explanation && (
                                      <div className="bg-slate-50 p-2 rounded-lg text-[10px] text-gray-600 font-medium italic border border-slate-200">
                                        💡 <strong>AI Analysis:</strong> {match.explanation}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }))}
                </div>

                {/* Clear / Dismiss Action */}
                <button
                  type="button"
                  onClick={() => setSimilarityResults(null)}
                  className="w-full text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 py-1.5 rounded-lg transition-colors cursor-pointer text-center shrink-0"
                >
                  Clear Results
                </button>
              </>
            )
          })()}
        </div>
      )}
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
              onClick={handleBackWithAutoSave}
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

      {restoredPaperDraftInfo && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center justify-between gap-3 text-amber-900 text-xs font-medium shadow-xs max-w-md">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle size={14} className="text-amber-600 shrink-0" />
            <span className="truncate">Restored draft ({restoredPaperDraftInfo.timestamp})</span>
          </div>
          <button onClick={handleDiscardPaperDraft} className="text-[11px] bg-amber-200/70 hover:bg-amber-300 px-2 py-0.5 rounded text-amber-900 font-semibold transition-colors shrink-0">
            Discard Draft
          </button>
        </div>
      )}

        <div className="flex items-center gap-2 pl-9 md:pl-0">
          <button
            onClick={savePaper}
            disabled={saving || uploadingCount > 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-950 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-900 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-950/20"
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
        <div className="p-4 rounded-xl flex items-center justify-between gap-3 bg-rose-50 text-rose-800 border border-rose-200 shadow-sm font-semibold animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadPaperData}
            className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className="text-rose-600" />
            <span>Retry</span>
          </button>
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
                <p className="text-xs text-gray-500 font-medium">Authentic exam header (Customizable)</p>
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
                      notesList: [
                        'Figure on the right of each question indicates the marks for the respective question.',
                        'Answer all questions.'
                      ],
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

          {/* Syncfusion Editor (Inline Normal View) */}
          {!isFullscreen && (
            <div className={`bg-white rounded-2xl shadow-md border border-gray-150 p-4 ${showParagraphMarks ? 'show-paragraph-marks' : ''}`}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Question Paper Content</h3>
              <RichTextEditorComponent
                ref={rteRef}
                created={onRteCreated}
                value={editorValue}
                change={(e) => { if (e && e.value !== undefined) setEditorValue(e.value) }}
                actionBegin={onActionBegin}
                actionComplete={onActionComplete}
                toolbarSettings={toolbarSettings}
                quickToolbarSettings={quickToolbarSettings}
                beforeQuickToolbarOpen={handleBeforeQuickToolbarOpen}
                quickToolbarClose={handleQuickToolbarClose}
                fontFamily={fontFamilyConfig}
                fontSize={fontSizeConfig}
                insertImageSettings={insertImageSettings}
                imageUploading={onImageUploading}
                imageUploadSuccess={onImageUploadSuccess}
                imageUploadFailed={onImageUploadFailed}
                imageRemoving={onImageRemoving}
                dialogOpen={onDialogOpen}
                height={780}
                showCharCount={true}
                maxLength={50000}
                pasteCleanupSettings={pasteCleanupConfig}
              >
                <Inject services={[Toolbar, HtmlEditor, Link, Image, QuickToolbar, Table, PasteCleanup, Count]} />
              </RichTextEditorComponent>
            </div>
          )}

          {/* Fullscreen Overlay - Portaled directly to document.body for guaranteed zero top gap & visible status bar */}
          {isFullscreen && createPortal(
            <div
              className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[999999] flex flex-col bg-[#d6d6d6] overflow-hidden select-none"
              style={{ width: '111.12vw', height: '111.12vh' }}
            >
              {/* Fullscreen Top Bar */}
              <div className="bg-gray-800 text-white px-6 py-2 flex items-center justify-between shadow-lg shrink-0 h-[48px] z-10">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📄</span>
                  <div>
                    <span className="text-sm font-bold">Question Paper Editor</span>
                    <span className="text-xs text-gray-400 ml-3">{assessment.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNotesModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/70 hover:bg-emerald-800/80 border border-emerald-400/50 text-emerald-300 rounded-lg text-xs font-bold shadow-xs cursor-pointer select-none mr-1 transition-colors"
                    title={notesStatusInfo?.hasNotes ? `Reference Notes Active: ${notesStatusInfo.fileName || 'Notes'} (${notesStatusInfo.totalChunks || 0} questions available) - Click to manage` : 'Upload Reference Notes'}
                  >
                    <span className="text-amber-400 font-extrabold">⚡</span>
                    <span>{notesStatusInfo?.hasNotes ? `Ref Questions (${notesStatusInfo.totalChunks})` : 'Reference Questions'}</span>
                  </button>

                  <button onClick={savePaper} disabled={saving || uploadingCount > 0} className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-950 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-900 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 border border-emerald-950/20">
                    <Save size={14} /> Save
                  </button>
                  <button onClick={handleExportWord} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all">
                    <FileDown size={14} /> Word
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all">
                    <Printer size={14} /> Print/PDF
                  </button>
                  <div className="w-px h-5 bg-gray-600 mx-1"></div>
                  <button onClick={handleToggleFullscreen} className="p-1 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-all" title="Exit Fullscreen (ESC)">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Middle Flex Container (CO Mapping + Editor + Similarity Checker) */}
              <div className="flex-1 w-full min-h-0 overflow-hidden flex items-stretch gap-4 p-3 xl:p-4">
                {/* Left: Question wise CO Mapping Container */}
                <div className="w-[300px] xl:w-[330px] shrink-0 h-full overflow-hidden">
                  {renderQuestionCoMappingCard(true)}
                </div>

                {/* Center: Text Editor Container */}
                <div className={`flex-1 min-w-0 bg-white shadow-2xl rounded-sm flex flex-col h-full overflow-hidden ${showParagraphMarks ? 'show-paragraph-marks' : ''}`}>
                  <RichTextEditorComponent
                    ref={rteRef}
                    created={onRteCreated}
                    value={editorValue}
                    change={(e) => { if (e && e.value !== undefined) setEditorValue(e.value) }}
                    actionBegin={onActionBegin}
                    actionComplete={onActionComplete}
                    toolbarSettings={toolbarSettings}
                    quickToolbarSettings={quickToolbarSettings}
                    beforeQuickToolbarOpen={handleBeforeQuickToolbarOpen}
                    quickToolbarClose={handleQuickToolbarClose}
                    fontFamily={fontFamilyConfig}
                    fontSize={fontSizeConfig}
                    insertImageSettings={insertImageSettings}
                    imageUploading={onImageUploading}
                    imageUploadSuccess={onImageUploadSuccess}
                    imageUploadFailed={onImageUploadFailed}
                    imageRemoving={onImageRemoving}
                    dialogOpen={onDialogOpen}
                    height="100%"
                    showCharCount={true}
                    maxLength={50000}
                    pasteCleanupSettings={pasteCleanupConfig}
                  >
                    <Inject services={[Toolbar, HtmlEditor, Link, Image, QuickToolbar, Table, PasteCleanup, Count]} />
                  </RichTextEditorComponent>
                </div>

                {/* Right: Reference Notes + Similarity Checker Container */}
                <div className={`w-[340px] xl:w-[380px] shrink-0 h-full select-text ${
                  notesStatusInfo?.hasNotes
                    ? 'overflow-y-auto space-y-3.5 pr-1.5 custom-scrollbar'
                    : 'overflow-hidden flex flex-col'
                }`}>
                  {notesStatusInfo?.hasNotes && renderReferenceNotesCard(true)}
                  {renderSimilarityCheckerCard(true)}
                </div>
              </div>

              {/* Fullscreen Bottom Status Bar - ALWAYS VISIBLE AT BOTTOM */}
              <div className="bg-gray-700 text-gray-300 px-6 py-2 text-xs flex justify-between items-center shrink-0 border-t border-gray-600 h-[36px] z-10">
                <span>Press <kbd className="px-1.5 py-0.5 bg-gray-600 rounded text-gray-200 font-mono text-[10px]">ESC</kbd> to exit fullscreen</span>
                <span className="text-gray-400 italic font-medium">A product of Syncfusion modified by the developers</span>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Metadata Panel (Right side in Normal View) */}
        <div className="space-y-6">
          {/* Assessment Settings Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3 font-sans">Assessment Settings</h3>
            <div className="space-y-4 text-xs font-semibold text-gray-600">
              {isAssignmentOrReport ? (
                <div>
                  <label className="block font-bold text-gray-700 mb-1 text-xs">Submission Deadline</label>
                  <input
                    type="text"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    placeholder="e.g. 10 August 2026"
                    className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white font-bold text-gray-800 text-xs shadow-2xs"
                  />
                </div>
              ) : (() => {
                const parsedDuration = parseExamDuration(examDuration)
                return (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1 text-xs">Exam Duration</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={parsedDuration.hours}
                        onChange={(e) => handleUpdateExamDuration(parseInt(e.target.value, 10), parsedDuration.minutes)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white font-bold text-gray-800 shadow-2xs text-xs cursor-pointer"
                      >
                        <option value="0">0 hr</option>
                        <option value="1">1 hr</option>
                        <option value="2">2 hrs</option>
                        <option value="3">3 hrs</option>
                        <option value="4">4 hrs</option>
                        <option value="5">5 hrs</option>
                      </select>
                      <select
                        value={parsedDuration.minutes}
                        onChange={(e) => handleUpdateExamDuration(parsedDuration.hours, parseInt(e.target.value, 10))}
                        className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white font-bold text-gray-800 shadow-2xs text-xs cursor-pointer"
                      >
                        <option value="0">0 min</option>
                        <option value="5">5 min</option>
                        <option value="10">10 min</option>
                        <option value="15">15 min</option>
                        <option value="20">20 min</option>
                        <option value="25">25 min</option>
                        <option value="30">30 min</option>
                        <option value="35">35 min</option>
                        <option value="40">40 min</option>
                        <option value="45">45 min</option>
                        <option value="50">50 min</option>
                        <option value="55">55 min</option>
                      </select>
                    </div>
                  </div>
                )
              })()}
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
          {renderQuestionCoMappingCard(false)}

          {/* Reference Notes Card with Integrated Real-time Suggestions (Above Question Similarity Checker) */}
          {renderReferenceNotesCard(false)}


          {/* Question Similarity Checker Card (Normal View Sidebar) */}
          {renderSimilarityCheckerCard(false)}
        </div>
      </div>

      {/* Selection-based & Right-Click Floating AI Assistant Toolbox & Granular Popover */}
      {(aiVerifySelection || showFloatingAiMenu || showAiVerifyPopover) && (
        <ModalPortal>
          <div
            ref={aiVerifyPopoverRef}
            onMouseDown={(e) => {
              // Prevent clearing editor text selection when interacting with popover or button
              e.stopPropagation()
            }}
            className="fixed z-[9999999] pointer-events-auto select-none font-sans"
            style={showAiVerifyPopover && popoverPos ? {
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`
            } : {
              top: `${(floatingBtnPos || aiVerifySelection?.position || { top: 100, left: 100 }).top}px`,
              left: `${(floatingBtnPos || aiVerifySelection?.position || { top: 100, left: 100 }).left}px`
            }}
          >
            {(!showAiVerifyPopover || !aiVerifySelection) ? (
              <div id="floating-ai-assistant-wrapper" className="relative flex flex-col items-center">
                {/* Floating Button (Green/Emerald Theme + Draggable on Press & Hold) - Hidden when opened via right-click */}
                {!isContextMenuTriggered && (
                  <div
                    id="floating-ai-assistant-btn"
                    onMouseDown={handleFloatingBtnMouseDown}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!btnDragStartRef.current?.hasMoved) {
                        setShowFloatingAiMenu(prev => !prev)
                      }
                    }}
                    className="group flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-600 active:from-emerald-800 text-white text-xs font-bold rounded-full shadow-2xl hover:shadow-emerald-500/40 border border-emerald-300/40 backdrop-blur-md transition-shadow duration-200 cursor-grab active:cursor-grabbing select-none shrink-0"
                    title="Click to open AI Assistant, or drag to move anywhere"
                  >
                    <GripHorizontal size={13} className="text-emerald-200 opacity-80 group-hover:opacity-100 shrink-0" />
                    <Sparkles size={14} className="text-amber-300 animate-pulse shrink-0" />
                    <span>AI Assistant</span>
                    <ChevronDown size={13} className={`text-emerald-200 transition-transform duration-150 ${showFloatingAiMenu ? 'rotate-180' : ''}`} />
                  </div>
                )}

                {/* Floating AI Assistant Dropdown Menu (Symmetrically Centered or Direct Context Menu) */}
                {showFloatingAiMenu && (
                  <div
                    onMouseLeave={() => setActiveAiSubmenu(null)}
                    className={`ai-command-menu ${
                      isContextMenuTriggered
                        ? 'relative'
                        : `absolute ${
                            ((floatingBtnPos?.top || aiVerifySelection?.position?.top || 0) > (window.innerHeight - 400))
                              ? 'bottom-full mb-2'
                              : 'top-full mt-2'
                          } left-1/2 -translate-x-1/2`
                    } z-[9999999] bg-white rounded-xl shadow-2xl border border-emerald-200/80 p-1.5 w-[256px] font-sans text-xs animate-in fade-in zoom-in-95 duration-150`}
                  >
                    {/* Menu Header Bar (Draggable) */}
                    <div
                      onMouseDown={handleFloatingBtnMouseDown}
                      className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white font-extrabold text-[10px] uppercase tracking-wider py-2 px-3 rounded-lg flex items-center justify-between shadow-sm mb-1.5 cursor-grab active:cursor-grabbing select-none"
                      title="Drag to move anywhere"
                    >
                      <span className="flex items-center gap-1.5">
                        <GripHorizontal size={12} className="text-emerald-300/80" />
                        <Sparkles size={12} className="text-emerald-300" />
                        AI ASSISTANT
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-emerald-200/90 font-normal">OBE TOOLS</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowFloatingAiMenu(false)
                            setIsContextMenuTriggered(false)
                            setActiveAiSubmenu(null)
                          }}
                          className="hover:bg-emerald-700/80 p-0.5 rounded text-emerald-200 hover:text-white transition-colors cursor-pointer"
                          title="Close"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>

                    {/* AI CREATION TOOLS */}
                    <div className="px-2 py-1 text-[9px] font-bold text-emerald-800 uppercase tracking-wider">AI Creation Tools</div>
                    
                    {/* First Option: AI Verify [CO / Bloom Level] */}
                    <button
                      type="button"
                      onMouseEnter={() => setActiveAiSubmenu(null)}
                      onClick={() => {
                        setShowFloatingAiMenu(false);
                        setIsContextMenuTriggered(false);
                        setActiveAiSubmenu(null);
                        handleTriggerAiVerify();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/90 hover:bg-emerald-100 text-emerald-950 font-bold transition-all text-left border border-emerald-200/70 shadow-2xs mb-1 group"
                    >
                      <span className="text-sm">🎯</span>
                      <span className="flex-1 text-[11px]">AI Verify [CO / Bloom Level]</span>
                      <span className="text-[8px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wide">OBE</span>
                    </button>

                    <button
                      type="button"
                      onMouseEnter={() => setActiveAiSubmenu(null)}
                      onClick={() => {
                        setShowFloatingAiMenu(false);
                        setIsContextMenuTriggered(false);
                        setActiveAiSubmenu(null);
                        setShowQuestionGenModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-all text-left"
                    >
                      <span className="text-sm">📝</span>
                      <span>Automated Question Gen</span>
                    </button>

                    <button
                      type="button"
                      onMouseEnter={() => setActiveAiSubmenu(null)}
                      onClick={() => {
                        setShowFloatingAiMenu(false);
                        setIsContextMenuTriggered(false);
                        setActiveAiSubmenu(null);
                        setShowTableGenModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-all text-left"
                    >
                      <span className="text-sm">📊</span>
                      <span>Automated Data Table</span>
                    </button>

                    <button
                      type="button"
                      onMouseEnter={() => setActiveAiSubmenu(null)}
                      onClick={() => {
                        setShowFloatingAiMenu(false);
                        setIsContextMenuTriggered(false);
                        setActiveAiSubmenu(null);
                        handleOpenEquationModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-all text-left"
                    >
                      <span className="text-sm">🧮</span>
                      <span>Math Equation Editor</span>
                    </button>

                    <button
                      type="button"
                      onMouseEnter={() => setActiveAiSubmenu(null)}
                      onClick={() => {
                        setShowFloatingAiMenu(false);
                        setIsContextMenuTriggered(false);
                        setActiveAiSubmenu(null);
                        handleOpenNewDiagramModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-all text-left"
                    >
                      <span className="text-sm">📈</span>
                      <span>CS Diagram Studio</span>
                    </button>

                    <button
                      type="button"
                      onMouseEnter={() => setActiveAiSubmenu(null)}
                      onClick={() => {
                        setShowFloatingAiMenu(false);
                        setIsContextMenuTriggered(false);
                        setActiveAiSubmenu(null);
                        handleOpenCodeSnippetModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-all text-left"
                    >
                      <span className="text-sm">💻</span>
                      <span>Code Snippet Editor</span>
                    </button>

                    <div className="border-t border-gray-100 my-1.5"></div>


                    {/* Quick Commands (Text Refinement) */}
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
                        type="button"
                        onMouseEnter={() => setActiveAiSubmenu(null)}
                        onClick={() => {
                          setShowFloatingAiMenu(false);
                          setActiveAiSubmenu(null);
                          handleAICommand(item.cmd);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 font-medium transition-all text-left"
                      >
                        <span className="text-sm">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}

                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Change Tone submenu */}
                    <div
                      className="group relative"
                      onMouseEnter={() => setActiveAiSubmenu('tone')}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveAiSubmenu(prev => prev === 'tone' ? null : 'tone')}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left font-medium transition-all ${
                          activeAiSubmenu === 'tone'
                            ? 'bg-emerald-100/90 text-emerald-900 font-bold'
                            : 'hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">🎭</span>
                          <span>Change Tone</span>
                        </div>
                        <ChevronRight size={14} className={`text-emerald-600/70 transition-transform ${activeAiSubmenu === 'tone' ? 'translate-x-0.5' : ''}`} />
                      </button>
                      <div
                        className={`absolute left-full top-0 pl-1.5 z-[100] ${
                          activeAiSubmenu === 'tone' ? 'block' : 'hidden group-hover:block'
                        }`}
                      >
                        <div className="bg-white rounded-xl shadow-2xl border border-emerald-100 p-1 w-[160px] animate-in fade-in duration-100">
                          {['Academic', 'Formal', 'Professional', 'Casual', 'Friendly'].map(tone => (
                            <button
                              key={tone}
                              type="button"
                              onClick={() => {
                                setShowFloatingAiMenu(false);
                                setActiveAiSubmenu(null);
                                handleAICommand('tone', tone);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 text-left font-medium transition-all"
                            >
                              {tone}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Change Style submenu */}
                    <div
                      className="group relative"
                      onMouseEnter={() => setActiveAiSubmenu('style')}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveAiSubmenu(prev => prev === 'style' ? null : 'style')}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left font-medium transition-all ${
                          activeAiSubmenu === 'style'
                            ? 'bg-emerald-100/90 text-emerald-900 font-bold'
                            : 'hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">🎨</span>
                          <span>Change Style</span>
                        </div>
                        <ChevronRight size={14} className={`text-emerald-600/70 transition-transform ${activeAiSubmenu === 'style' ? 'translate-x-0.5' : ''}`} />
                      </button>
                      <div
                        className={`absolute left-full top-0 pl-1.5 z-[100] ${
                          activeAiSubmenu === 'style' ? 'block' : 'hidden group-hover:block'
                        }`}
                      >
                        <div className="bg-white rounded-xl shadow-2xl border border-emerald-100 p-1 w-[160px] animate-in fade-in duration-100">
                          {['Formal', 'Informal', 'Concise', 'Detailed'].map(style => (
                            <button
                              key={style}
                              type="button"
                              onClick={() => {
                                setShowFloatingAiMenu(false);
                                setActiveAiSubmenu(null);
                                handleAICommand('style', style);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 text-left font-medium transition-all"
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Translate submenu */}
                    <div
                      className="group relative"
                      onMouseEnter={() => setActiveAiSubmenu('translate')}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveAiSubmenu(prev => prev === 'translate' ? null : 'translate')}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left font-medium transition-all ${
                          activeAiSubmenu === 'translate'
                            ? 'bg-emerald-100/90 text-emerald-900 font-bold'
                            : 'hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">🌐</span>
                          <span>Translate</span>
                        </div>
                        <ChevronRight size={14} className={`text-emerald-600/70 transition-transform ${activeAiSubmenu === 'translate' ? 'translate-x-0.5' : ''}`} />
                      </button>
                      <div
                        className={`absolute left-full bottom-0 pl-1.5 z-[100] ${
                          activeAiSubmenu === 'translate' ? 'block' : 'hidden group-hover:block'
                        }`}
                      >
                        <div className="bg-white rounded-xl shadow-2xl border border-emerald-100 p-1 w-[150px] animate-in fade-in duration-100">
                          {['Bengali', 'English'].map(lang => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => {
                                setShowFloatingAiMenu(false);
                                setActiveAiSubmenu(null);
                                handleAICommand('translate', lang);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 text-left font-medium transition-all"
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Granular Result Popover Card (Green/Emerald Theme with Drag Handle) */
              <div className="w-[430px] max-w-[95vw] max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-emerald-300 ring-1 ring-emerald-500/20 overflow-hidden font-sans text-xs animate-in fade-in zoom-in-95">
                {/* Popover Header Bar (System Emerald Gradient + Drag Handle) */}
                <div
                  onMouseDown={handleDragStart}
                  className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-800 text-white px-3.5 py-2.5 cursor-move flex items-center justify-between select-none shadow-sm shrink-0"
                  title="Click and drag to move this box anywhere"
                >
                  <div className="flex items-center gap-2 pointer-events-none">
                    <span className="p-1 bg-white/15 rounded-md border border-white/20">
                      <Sparkles size={13} className="text-emerald-300" />
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs tracking-wide">AI Tag Verifier</span>
                      {aiVerifySelection?.targetInfo?.questionNumber && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-700/90 text-emerald-100 rounded border border-emerald-500/40">
                          {aiVerifySelection.targetInfo.questionNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Center Drag Hint */}
                  <div className="flex items-center gap-1 text-[10px] text-emerald-200/80 pointer-events-none font-medium">
                    <GripHorizontal size={14} className="opacity-80" />
                    <span>Drag to move</span>
                  </div>

                  {/* Header Right: Engine badge & Prominent Close Button */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-emerald-200/90 bg-white/10 px-1.5 py-0.5 rounded border border-white/15 font-semibold">
                      OBE AI Engine
                    </span>
                    <button
                      type="button"
                      onClick={handleCloseAiVerify}
                      className="p-1 hover:bg-white/20 active:bg-white/30 rounded-lg text-emerald-100 hover:text-white transition-all cursor-pointer"
                      title="Close (ESC)"
                    >
                      <X size={16} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Popover Body */}
                <div className="p-4 space-y-3 bg-white overflow-y-auto max-h-[calc(92vh-50px)]">
                  {/* Selected Text Excerpt */}
                  <div 
                    title={aiVerifySelection?.selectedText || ''}
                    className="px-3 py-2 bg-emerald-50/50 border border-emerald-200/60 rounded-xl text-[11px] text-gray-700 italic font-serif leading-relaxed line-clamp-2"
                  >
                    "{aiVerifySelection?.selectedText || ''}"
                  </div>

                  {/* Loading State with Micro-spinner */}
                  {aiVerifyLoading && (
                    <div className="py-6 flex flex-col items-center justify-center gap-2.5">
                      <Loader2 className="animate-spin text-emerald-600" size={26} />
                      <p className="text-gray-800 font-bold text-xs">Analyzing Bloom taxonomy & Course Outcomes...</p>
                      <p className="text-gray-400 text-[10px]">Processing via OBE AI Engine</p>
                    </div>
                  )}

                  {/* Success Banner */}
                  {aiVerifySuccessMsg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>{aiVerifySuccessMsg}</span>
                    </div>
                  )}

                  {/* Results Section */}
                  {!aiVerifyLoading && aiVerifyResult && (
                    <div className="space-y-3">
                      {/* Row 1 (Bloom Suggestion) */}
                      <div className="p-3 bg-purple-50/40 border border-purple-200/80 rounded-xl space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🧠</span>
                            <span className="font-bold text-gray-900 text-xs">Bloom:</span>
                            <span className="font-extrabold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded text-[11px] border border-purple-300/80">
                              {aiVerifyResult.bloom?.suggested} ({aiVerifyResult.bloom?.name || getBloomInfo(aiVerifyResult.bloom?.suggested)?.name})
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getConfidenceBadgeClass(aiVerifyResult.bloom?.confidence)}`}>
                            {Math.round((aiVerifyResult.bloom?.confidence || 0) * 100)}% confidence
                          </span>
                        </div>

                        {/* Full Bloom details - Always fully visible */}
                        <div className="text-[11px] text-gray-700 leading-relaxed font-normal bg-white/85 rounded-lg p-2.5 border border-purple-100/90 shadow-2xs break-words">
                          {aiVerifyResult.bloom?.description || getBloomInfo(aiVerifyResult.bloom?.suggested)?.cognitiveExpectation || 'Cognitive domain level'}
                        </div>

                        <div className="flex justify-between items-center pt-1.5 border-t border-purple-100">
                          <span className="text-[10px] text-gray-500">
                            Current: <strong className="text-gray-700">{aiVerifySelection?.targetInfo?.existingBloom || 'None'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyAiTag({ applyBloom: true })}
                            className="px-3 py-1 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all shadow-sm hover:shadow cursor-pointer"
                          >
                            <Check size={12} /> Apply Bloom
                          </button>
                        </div>
                      </div>

                      {/* Row 2 (CO Suggestion) */}
                      <div className="p-3 bg-teal-50/50 border border-teal-200/80 rounded-xl space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🎯</span>
                            <span className="font-bold text-gray-900 text-xs">CO:</span>
                            <span className="font-extrabold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded text-[11px] border border-blue-300/80">
                              {aiVerifyResult.co?.suggested}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getConfidenceBadgeClass(aiVerifyResult.co?.confidence)}`}>
                            {Math.round((aiVerifyResult.co?.confidence || 0) * 100)}% match
                          </span>
                        </div>

                        {/* Full CO details - Always fully visible without dot dot or truncation */}
                        <div className="text-[11px] text-gray-700 leading-relaxed font-normal bg-white/85 rounded-lg p-2.5 border border-teal-100/90 shadow-2xs break-words">
                          {getCoDescription(aiVerifyResult.co?.suggested)}
                        </div>

                        <div className="flex justify-between items-center pt-1.5 border-t border-teal-100">
                          <span className="text-[10px] text-gray-500">
                            Current: <strong className="text-gray-700">{aiVerifySelection?.targetInfo?.existingCo || 'None'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyAiTag({ applyCo: true })}
                            className="px-3.5 py-1 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all shadow-sm hover:shadow cursor-pointer"
                          >
                            <Check size={12} /> Apply CO
                          </button>
                        </div>
                      </div>

                      {/* Batch Action: Apply Both (Emerald/Teal Gradient) */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleApplyAiTag({ applyCo: true, applyBloom: true })}
                          className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                        >
                          <Sparkles size={14} className="text-amber-300" />
                          Apply Both [{aiVerifyResult.co?.suggested}→{aiVerifyResult.bloom?.suggested}]
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {/* AI Processing Overlay */}
      {aiProcessing && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999999] bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 border">
              <Loader2 className="animate-spin text-emerald-600" size={36} />
              <p className="text-gray-700 font-bold text-sm">AI is processing your text...</p>
              <p className="text-gray-400 text-xs">This may take a few seconds</p>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* AI Commands Dropdown Menu (System Theme) */}
      {showAiMenu && (
        <ModalPortal>
          <div
            onMouseLeave={() => setActiveAiSubmenu(null)}
            className="ai-command-menu fixed z-[9999999] bg-white rounded-xl shadow-2xl border border-emerald-200/80 p-1.5 w-[240px] font-sans text-xs animate-in fade-in duration-150"
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
            
            {/* First Option: AI Verify [CO / Bloom Level] */}
            <button
              type="button"
              onMouseEnter={() => setActiveAiSubmenu(null)}
              onClick={() => {
                setShowAiMenu(false);
                setActiveAiSubmenu(null);
                handleTriggerAiVerify();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/90 hover:bg-emerald-100 text-emerald-950 font-bold transition-all text-left border border-emerald-200/70 shadow-2xs mb-1 group"
            >
              <span className="text-sm">🎯</span>
              <span className="flex-1 text-[11px]">AI Verify [CO / Bloom Level]</span>
              <span className="text-[8px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wide">OBE</span>
            </button>

            <button
              onMouseEnter={() => setActiveAiSubmenu(null)}
              onClick={() => { setShowAiMenu(false); setActiveAiSubmenu(null); setShowQuestionGenModal(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-normal transition-all text-left"
            >
              <span className="text-sm">🎯</span>
              <span>Automated Question Gen</span>
            </button>
            <button
              onMouseEnter={() => setActiveAiSubmenu(null)}
              onClick={() => { setShowAiMenu(false); setActiveAiSubmenu(null); setShowTableGenModal(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-normal transition-all text-left"
            >
              <span className="text-sm">📊</span>
              <span>Automated Data Table</span>
            </button>
            <button
              onMouseEnter={() => setActiveAiSubmenu(null)}
              onClick={() => { setShowAiMenu(false); setActiveAiSubmenu(null); handleOpenEquationModal(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-normal transition-all text-left"
            >
              <span className="text-sm">🧮</span>
              <span>Math Equation Editor</span>
            </button>
            <button
              onMouseEnter={() => setActiveAiSubmenu(null)}
              onClick={() => { setShowAiMenu(false); setActiveAiSubmenu(null); handleOpenNewDiagramModal(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-normal transition-all text-left"
            >
              <span className="text-sm">📈</span>
              <span>CS Diagram Studio</span>
            </button>
            <button
              onMouseEnter={() => setActiveAiSubmenu(null)}
              onClick={() => { setShowAiMenu(false); setActiveAiSubmenu(null); handleOpenCodeSnippetModal(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-normal transition-all text-left"
            >
              <span className="text-sm">💻</span>
              <span>Code Snippet Editor</span>
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
                onMouseEnter={() => setActiveAiSubmenu(null)}
                onClick={() => { setActiveAiSubmenu(null); handleAICommand(item.cmd); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 font-semibold transition-all text-left"
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            <div className="border-t border-gray-100 my-1"></div>

            {/* Change Tone submenu */}
            <div
              className="group relative"
              onMouseEnter={() => setActiveAiSubmenu('tone')}
            >
              <button
                type="button"
                onClick={() => setActiveAiSubmenu(prev => prev === 'tone' ? null : 'tone')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all text-left ${
                  activeAiSubmenu === 'tone'
                    ? 'bg-emerald-100/90 text-emerald-900'
                    : 'hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🎭</span>
                  <span>Change Tone</span>
                </div>
                <ChevronRight size={14} className={`text-emerald-600/70 transition-transform ${activeAiSubmenu === 'tone' ? 'translate-x-0.5' : ''}`} />
              </button>
              <div
                className={`absolute left-full top-0 pl-1.5 z-[100] ${
                  activeAiSubmenu === 'tone' ? 'block' : 'hidden group-hover:block'
                }`}
              >
                <div className="bg-white rounded-xl shadow-2xl border border-emerald-100 p-1 w-[160px] animate-in fade-in duration-100">
                  {['Academic', 'Formal', 'Professional', 'Casual', 'Friendly'].map(tone => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => {
                        setShowAiMenu(false);
                        setActiveAiSubmenu(null);
                        handleAICommand('tone', tone);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 text-left font-semibold transition-all"
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Change Style submenu */}
            <div
              className="group relative"
              onMouseEnter={() => setActiveAiSubmenu('style')}
            >
              <button
                type="button"
                onClick={() => setActiveAiSubmenu(prev => prev === 'style' ? null : 'style')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all text-left ${
                  activeAiSubmenu === 'style'
                    ? 'bg-emerald-100/90 text-emerald-900'
                    : 'hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🎨</span>
                  <span>Change Style</span>
                </div>
                <ChevronRight size={14} className={`text-emerald-600/70 transition-transform ${activeAiSubmenu === 'style' ? 'translate-x-0.5' : ''}`} />
              </button>
              <div
                className={`absolute left-full top-0 pl-1.5 z-[100] ${
                  activeAiSubmenu === 'style' ? 'block' : 'hidden group-hover:block'
                }`}
              >
                <div className="bg-white rounded-xl shadow-2xl border border-emerald-100 p-1 w-[160px] animate-in fade-in duration-100">
                  {['Formal', 'Informal', 'Concise', 'Detailed'].map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => {
                        setShowAiMenu(false);
                        setActiveAiSubmenu(null);
                        handleAICommand('style', style);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 text-left font-semibold transition-all"
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Translate submenu (Restricted to Bengali & English) */}
            <div
              className="group relative"
              onMouseEnter={() => setActiveAiSubmenu('translate')}
            >
              <button
                type="button"
                onClick={() => setActiveAiSubmenu(prev => prev === 'translate' ? null : 'translate')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold transition-all text-left ${
                  activeAiSubmenu === 'translate'
                    ? 'bg-emerald-100/90 text-emerald-900'
                    : 'hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🌐</span>
                  <span>Translate</span>
                </div>
                <ChevronRight size={14} className={`text-emerald-600/70 transition-transform ${activeAiSubmenu === 'translate' ? 'translate-x-0.5' : ''}`} />
              </button>
              <div
                className={`absolute left-full bottom-0 pl-1.5 z-[100] ${
                  activeAiSubmenu === 'translate' ? 'block' : 'hidden group-hover:block'
                }`}
              >
                <div className="bg-white rounded-xl shadow-2xl border border-emerald-100 p-1 w-[150px] animate-in fade-in duration-100">
                  {['Bengali', 'English'].map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setShowAiMenu(false);
                        setActiveAiSubmenu(null);
                        handleAICommand('translate', lang);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg hover:bg-emerald-50/80 text-gray-700 hover:text-emerald-800 text-left font-semibold transition-all"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* AI Revision Preview & Approval Modal */}
      {aiPreview && (() => {
        const { oldDiff, newDiff } = getWordDiff(aiPreview.originalText, aiPreview.suggestedText)
        const formattedHtml = formatAiTextToHtml(aiPreview.suggestedText)
        const isStructured = aiPreview.suggestedText.includes('\n')

        return (
          <ModalPortal>
            <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
          </ModalPortal>
        )
      })()}

      {/* 🎯 Modal 1: Automated Question Generator (Enhanced) */}
      {showQuestionGenModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
                      onChange={(e) => {
                        const newType = e.target.value
                        const allowed = getAllowedMarksForExamType(newType)
                        const newTotal = allowed.includes(questionGenParams.totalMarks) ? questionGenParams.totalMarks : 10
                        setQuestionGenParams({ ...questionGenParams, examType: newType, totalMarks: newTotal })
                      }}
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold text-xs"
                    >
                      <option value="Class Test (CT)">Class Test (CT)</option>
                      <option value="Mid Term Exam">Mid Term Exam</option>
                      <option value="Final Exam">Final Exam</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Presentation">Presentation</option>
                      <option value="Project Report">Project Report</option>
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
                    <select
                      value={questionGenParams.totalMarks}
                      onChange={(e) => setQuestionGenParams({ ...questionGenParams, totalMarks: parseInt(e.target.value) || 10 })}
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold text-xs text-gray-800"
                    >
                      {getAllowedMarksForExamType(questionGenParams.examType).map(m => (
                        <option key={m} value={m}>{m} Marks</option>
                      ))}
                    </select>
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

                {/* OBE Alignment Live Card: Shows both Target CO and Bloom's Taxonomy Details */}
                {(() => {
                  const selectedCoObj = coDetails.find(item => item.code === questionGenParams.selectedCo)
                  const bloomInfo = getBloomInfo(questionGenParams.bloomLevel)

                  return (
                    <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border border-emerald-200 rounded-xl text-xs space-y-2 shadow-sm animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                        <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-emerald-700" />
                          OBE Alignment Live Verification
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-200/80 text-emerald-950 font-bold px-2 py-0.5 rounded text-[10px]">
                            CO: {questionGenParams.selectedCo || 'General'}
                          </span>
                          <span className="bg-teal-200/80 text-teal-950 font-bold px-2 py-0.5 rounded text-[10px]">
                            Bloom: {bloomInfo.level} ({bloomInfo.name})
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-emerald-950">
                        <div className="bg-white/80 p-2 rounded-lg border border-emerald-200/70">
                          <div className="font-bold text-[11px] text-emerald-900 mb-0.5 flex items-center gap-1">
                            <Target size={12} className="text-emerald-600" />
                            Target CO Competency:
                          </div>
                          <div className="text-[11px] text-emerald-800 leading-snug">
                            {selectedCoObj?.description || (questionGenParams.selectedCo ? `Aligns directly with ${questionGenParams.selectedCo} for ${offering?.course?.name || 'this course'}.` : 'General Course Outcome alignment across the course curriculum.')}
                          </div>
                        </div>

                        <div className="bg-white/80 p-2 rounded-lg border border-teal-200/70">
                          <div className="font-bold text-[11px] text-teal-900 mb-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                            Bloom Cognitive Depth & Verbs:
                          </div>
                          <div className="text-[11px] text-teal-800 leading-snug">
                            <span className="font-semibold text-teal-900">Required Verbs: </span>
                            {bloomInfo.verbs.slice(0, 5).join(', ')}.
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {bloomInfo.cognitiveExpectation}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-gray-700 text-xs">
                      Number of Questions to Generate (Splits {questionGenParams.totalMarks} Total Marks)
                    </label>
                    <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100/70 px-2 py-0.5 rounded">
                      Intelligent Mark Split
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map(n => {
                      const dist = calculateQuestionMarkDistribution(questionGenParams.totalMarks, n)
                      const isSelected = questionGenParams.numQuestions === n
                      const allEqual = dist.every(m => m === dist[0])
                      const markLabel = allEqual ? `${dist[0]}M each` : `${dist.join('M+')}`
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setQuestionGenParams({ ...questionGenParams, numQuestions: n })}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-400/30'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50 hover:border-emerald-300'
                          }`}
                        >
                          <span className="text-xs">{n === 1 ? '1 Question' : `${n} Questions`}</span>
                          <span className={`text-[10px] mt-0.5 font-semibold ${isSelected ? 'text-emerald-200' : 'text-emerald-700'}`}>
                            ({markLabel})
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  
                  {/* Live Allocation Preview */}
                  <div className="mt-2 text-[11px] text-emerald-950 bg-emerald-50/90 px-3 py-1.5 rounded-lg border border-emerald-200 flex flex-wrap items-center gap-1.5 font-medium shadow-xs">
                    <span className="font-bold text-emerald-800">⚡ Split Breakdown:</span>
                    {calculateQuestionMarkDistribution(questionGenParams.totalMarks, questionGenParams.numQuestions).map((m, i) => (
                      <span key={i} className="bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold text-emerald-800 shadow-xs">
                        {questionGenParams.numQuestions <= 2 ? `Question ${String.fromCharCode(65 + i)}` : `Q${i + 1}`}: {m} Marks
                      </span>
                    ))}
                    <span className="text-gray-500 font-semibold ml-auto">
                      = {questionGenParams.totalMarks} Total Marks
                    </span>
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
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-950 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-900 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer border border-emerald-950/20"
                  >
                    {isGeneratingQuestion ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {isGeneratingQuestion ? 'Generating Questions...' : '✨ Generate Questions with AI'}
                  </button>
                </div>

                {/* Generated Question Option Cards & Multi-Selector */}
                {questionGenResults.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                          <Check size={14} /> Generated Questions ({questionGenResults.length})
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          {selectedQuestionIndices.length} of {questionGenResults.length} selected
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllQuestions}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={deselectAllQuestions}
                          className="text-[11px] font-bold text-gray-500 hover:text-gray-700 hover:underline cursor-pointer"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {/* Tabs / Selection Cards with Checkbox */}
                    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2.5">
                      {questionGenResults.map((_, idx) => {
                        const markDist = calculateQuestionMarkDistribution(questionGenParams.totalMarks, questionGenResults.length)
                        const isChecked = selectedQuestionIndices.includes(idx)
                        const isCurrentTab = selectedQuestionIndex === idx
                        const qLabel = questionGenResults.length <= 2 ? `Question ${String.fromCharCode(65 + idx)}` : `Question ${idx + 1}`
                        const qMarks = markDist[idx] || Math.round(questionGenParams.totalMarks / questionGenResults.length)

                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedQuestionIndex(idx)}
                            className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all select-none ${
                              isCurrentTab
                                ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-400/30'
                                : isChecked
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation()
                                toggleQuestionSelection(idx)
                              }}
                              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                            />
                            <span>{qLabel}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              isCurrentTab ? 'bg-white/20 text-white' : 'bg-emerald-200/60 text-emerald-900'
                            }`}>
                              {qMarks}M
                            </span>
                          </div>
                        )
                      })}

                      {/* Multi-question preview option if more than 1 question is selected */}
                      {selectedQuestionIndices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSelectedQuestionIndex(-1)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            selectedQuestionIndex === -1
                              ? 'bg-teal-800 text-white border-teal-900 shadow-sm ring-2 ring-teal-400/30'
                              : 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
                          }`}
                        >
                          👁️ Preview All Selected ({selectedQuestionIndices.length})
                        </button>
                      )}
                    </div>

                    {/* Content Display: All Selected or Single Question */}
                    {selectedQuestionIndex === -1 ? (
                      <div className="space-y-3 max-h-[36vh] overflow-y-auto pr-1">
                        {selectedQuestionIndices.sort((a, b) => a - b).map(idx => {
                          const markDist = calculateQuestionMarkDistribution(questionGenParams.totalMarks, questionGenResults.length)
                          const qLabel = questionGenResults.length <= 2 ? `Question ${String.fromCharCode(65 + idx)}` : `Question ${idx + 1}`
                          const qMarks = markDist[idx] || Math.round(questionGenParams.totalMarks / questionGenResults.length)
                          return (
                            <div key={idx} className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-gray-800 leading-relaxed font-sans shadow-inner">
                              <div className="flex items-center justify-between font-bold text-emerald-900 border-b border-emerald-200/60 pb-1.5 mb-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={true}
                                    onChange={() => toggleQuestionSelection(idx)}
                                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                                  />
                                  <span>{qLabel}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {questionGenParams.selectedCo || 'CO'}
                                  </span>
                                  <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {getBloomInfo(questionGenParams.bloomLevel).level}
                                  </span>
                                  <span className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {qMarks} Marks
                                  </span>
                                </div>
                              </div>
                              <div dangerouslySetInnerHTML={{ __html: formatAiTextToHtml(questionGenResults[idx] || '') }} />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-gray-800 leading-relaxed font-sans shadow-inner max-h-[36vh] overflow-y-auto">
                        {questionGenResults[selectedQuestionIndex] && (
                          <div>
                            <div className="flex items-center justify-between font-bold text-emerald-900 border-b border-emerald-200/60 pb-1.5 mb-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedQuestionIndices.includes(selectedQuestionIndex)}
                                  onChange={() => toggleQuestionSelection(selectedQuestionIndex)}
                                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                                />
                                <span>{questionGenResults.length <= 2 ? `Question ${String.fromCharCode(65 + selectedQuestionIndex)}` : `Question ${selectedQuestionIndex + 1}`}</span>
                              </div>
                              {(() => {
                                const markDist = calculateQuestionMarkDistribution(questionGenParams.totalMarks, questionGenResults.length)
                                const qMarks = markDist[selectedQuestionIndex] || Math.round(questionGenParams.totalMarks / questionGenResults.length)
                                return (
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      {questionGenParams.selectedCo || 'CO'}
                                    </span>
                                    <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      {getBloomInfo(questionGenParams.bloomLevel).level}
                                    </span>
                                    <span className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded text-[10px] font-bold">
                                      {qMarks} Marks
                                    </span>
                                  </div>
                                )
                              })()}
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: formatAiTextToHtml(questionGenResults[selectedQuestionIndex] || '') }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex items-center justify-between">
                <div>
                  {questionGenResults.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearQuestionGen}
                      className="px-3.5 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Clear all generated questions and form inputs"
                    >
                      <Trash2 size={15} /> Clean / Clear All
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowQuestionGenModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  {questionGenResults.length > 0 && (
                    <button
                      type="button"
                      onClick={handleInsertQuestionResult}
                      disabled={selectedQuestionIndices.length === 0}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-950 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-emerald-950/20"
                    >
                      <Plus size={16} />
                      {selectedQuestionIndices.length === 0
                        ? 'Select Question(s) to Insert'
                        : selectedQuestionIndices.length === 1
                          ? `Insert Question ${questionGenResults.length <= 2 ? String.fromCharCode(65 + selectedQuestionIndices[0]) : (selectedQuestionIndices[0] + 1)} into Paper`
                          : `Insert Selected Questions (${selectedQuestionIndices.length}) into Paper`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 🕸️ Modal 2: Automated Graph Diagram Generator (B&W Theme Default + Interactive Drag & Drop) */}
      {showGraphGenModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-4xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/15 rounded-lg border border-white/20">
                    <Share2 size={20} className="text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">
                      {editingDiagramElement ? 'CS Diagram Studio — Edit Diagram' : 'CS Diagram Studio'}
                    </h3>
                    <p className="text-xs text-emerald-200">
                      {editingDiagramElement
                        ? 'Modify and update existing vector SVG diagram in-place'
                        : 'Create vector SVG graphs, trees, automata state diagrams & maps for exam papers'}
                    </p>
                  </div>
                </div>
                <button onClick={handleCloseDiagramModal} className="p-1 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-gray-50/50 text-sm">
                {/* Diagram Classification / Category Selector */}
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1.5 flex items-center justify-between">
                    <span>Diagram Category / Classification</span>
                    <span className="text-[11px] text-gray-500 font-normal">Choose diagram domain</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGraphCategory('tree')
                        setGraphType('tree')
                        setGraphCaption('')
                        setCustomNodePositions({})
                        setCustomNodeShapes({})
                        const text = '15 -> 35\n15 -> 9\n15 -> 40\n35 -> 3\n35 -> 6\n40 -> 5\n40 -> 7\n3 -> 1\n3 -> 10\n5 -> 8\n5 -> 4\n5 -> 41'
                        setGraphEdgesText(text)
                        setEdgeRows(parseGraphLines(text).edges)
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                        graphCategory === 'tree'
                          ? 'bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-500/30'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-emerald-50 hover:border-emerald-300'
                      }`}
                    >
                      <span>🌳</span>
                      <span>Tree (Hierarchical)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGraphCategory('map')
                        setGraphType('map')
                        setGraphCaption('')
                        setCustomNodePositions({})
                        setCustomNodeShapes({})
                        const text = 'ORADEA -> ZERIND: 71\nZERIND -> ARAD: 75\nARAD -> SIBIU: 140\nSIBIU -> FAGARAS: 99\nSIBIU -> RIMNICU: 80\nRIMNICU -> PITESTI: 97\nPITESTI -> BUCHAREST: 101\nBUCHAREST -> URZICENI: 85\nURZICENI -> VASLUI: 142\nVASLUI -> IASI: 92\nIASI -> NEAMT: 87'
                        setGraphEdgesText(text)
                        setEdgeRows(parseGraphLines(text).edges)
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                        graphCategory === 'map'
                          ? 'bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-500/30'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-emerald-50 hover:border-emerald-300'
                      }`}
                    >
                      <span>🗺️</span>
                      <span>Map / Network</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGraphCategory('graph')
                        setGraphType('directed')
                        setGraphCaption('')
                        setCustomNodePositions({})
                        setCustomNodeShapes({})
                        const text = 'A -> B: 10\nB -> C: 15\nC -> D: 20\nD -> A: 5'
                        setGraphEdgesText(text)
                        setEdgeRows(parseGraphLines(text).edges)
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                        graphCategory === 'graph'
                          ? 'bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-500/30'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-emerald-50 hover:border-emerald-300'
                      }`}
                    >
                      <span>⚖️</span>
                      <span>Graph</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGraphCategory('automata')
                        setGraphType('dfa')
                        setStartState('q0')
                        setAcceptStates(['q1'])
                        setGraphCaption('')
                        setCustomNodePositions({})
                        setCustomNodeShapes({})
                        const text = 'q0 -> q0: a\nq0 -> q1: b\nq1 -> q1: b\nq1 -> q0: a'
                        setGraphEdgesText(text)
                        setEdgeRows(parseGraphLines(text).edges)
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                        graphCategory === 'automata'
                          ? 'bg-emerald-800 text-white border-emerald-900 ring-2 ring-emerald-500/30'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-emerald-50 hover:border-emerald-300'
                      }`}
                    >
                      <span>🔄</span>
                      <span>State Diagram</span>
                    </button>
                  </div>
                </div>

                {/* Diagram Caption / Title (Available for all 4 modules: Tree, Map, Graph, Automata) */}
                <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-700 text-xs flex items-center gap-1.5">
                      🏷️ Diagram Name / Caption <span className="font-normal text-gray-500">(Optional — displayed centered below diagram)</span>
                    </label>
                    {graphCaption && (
                      <button
                        type="button"
                        onClick={() => setGraphCaption('')}
                        className="text-[11px] text-gray-400 hover:text-red-600 font-semibold"
                      >
                        Clear Caption
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={graphCaption}
                    onChange={(e) => setGraphCaption(e.target.value)}
                    placeholder="e.g. Automation-X, Automation-Y, Mealy Machine, Figure 1"
                    className="w-full border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
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
                    <label className="block font-bold text-gray-700 text-xs mb-1 flex items-center justify-between">
                      <span>{graphCategory === 'graph' ? 'Graph Structure Format' : (graphCategory === 'map' ? 'Map Structure Format' : (graphCategory === 'automata' ? 'State Diagram Format' : 'Tree Structure Format'))}</span>
                      <span className="text-[10px] text-gray-400 font-normal">Formats & Exam Presets</span>
                    </label>
                    <select
                      value={(() => {
                        if (graphCategory === 'automata') {
                          if (graphCaption === 'Automation-X') return 'preset_automation_x'
                          if (graphCaption === 'Automation-Y') return 'preset_automation_y'
                          if (graphCaption.includes('Moore Machine') || graphEdgesText.includes('q0/0')) return 'preset_moore_machine'
                          if (graphCaption === 'Mealy Machine' || (graphType === 'mealy' && graphEdgesText.includes('1/a'))) return 'preset_mealy_machine'
                          if (graphType === 'enfa' && graphEdgesText.includes('q4') && !graphEdgesText.includes('q7')) return 'preset_enfa_pipeline'
                          return graphType
                        }
                        if (graphCategory === 'graph') {
                          if (graphCaption.includes('Kruskal')) return 'preset_kruskal'
                          if (graphCaption.includes('BFS')) return 'preset_bfs_dfs'
                          if (graphCaption.includes('Floyd')) return 'preset_floyd_warshall'
                          return graphType
                        }
                        if (graphCategory === 'tree') {
                          if (graphCaption.includes('BST') || graphCaption.includes('Academic')) return 'preset_tree_bst'
                          if (graphCaption.includes('AVL')) return 'preset_tree_avl'
                          if (graphCaption.includes('Max-Heap') || graphCaption.includes('Heap Sort')) return 'preset_tree_heap'
                          if (graphCaption.includes('Huffman')) return 'preset_tree_huffman'
                          return graphType
                        }
                        if (graphCategory === 'map') {
                          if (graphCaption.includes('Romania')) return 'preset_map_romania'
                          if (graphCaption.includes('Dijkstra') || graphCaption.includes('Shortest Path')) return 'preset_map_dijkstra'
                          if (graphCaption.includes('LAN') || graphCaption.includes('Campus') || graphCaption.includes('Enterprise')) return 'preset_map_lan'
                          if (graphCaption.includes('Königsberg') || graphCaption.includes('Konigsberg') || graphCaption.includes('Seven Bridges')) return 'preset_map_konigsberg'
                          return graphType
                        }
                        return graphType
                      })()}
                      onChange={(e) => {
                        const val = e.target.value
                        // --- Automata Presets Loaded from Dropdown ---
                        if (val === 'preset_enfa_pipeline') {
                          setGraphCategory('automata')
                          setGraphType('enfa')
                          setStartState('q0')
                          setAcceptStates(['q6'])
                          setGraphCaption('')
                          setCustomNodePositions({})
                          setCustomNodeShapes({})
                          const text = 'q0 -> q1: ε\nq1 -> q4: ε\nq4 -> q5: 0\nq5 -> q6: 1\nq0 -> q2: 1\nq2 -> q0: 0\nq1 -> q3: 0\nq3 -> q1: 0'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_mealy_machine') {
                          setGraphCategory('automata')
                          setGraphType('mealy')
                          setStartState('q0')
                          setAcceptStates([])
                          setGraphCaption('Mealy Machine')
                          setCustomNodePositions({})
                          setCustomNodeShapes({})
                          const text = 'q0 -> q0: 1/a, 0/a\nq0 -> q1: 10/c\nq1 -> q1: 10/c, 1/b, 0/a'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_moore_machine') {
                          setGraphCategory('automata')
                          setGraphType('dfa')
                          setStartState('q0/0')
                          setAcceptStates(['q2/1'])
                          setGraphCaption('Moore Machine (Sequence Detector 11)')
                          setCustomNodePositions({
                            'q0/0': { x: 220, y: 200 },
                            'q1/0': { x: 380, y: 200 },
                            'q2/1': { x: 540, y: 200 }
                          })
                          setCustomNodeShapes({})
                          const text = 'q0/0 -> q0/0: 0\nq0/0 -> q1/0: 1\nq1/0 -> q0/0: 0\nq1/0 -> q2/1: 1\nq2/1 -> q0/0: 0\nq2/1 -> q2/1: 1'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_automation_x') {
                          setGraphCategory('automata')
                          setGraphType('dfa')
                          setStartState('q1')
                          setAcceptStates(['q1'])
                          setGraphCaption('Automation-X')
                          setCustomNodeShapes({})
                          setCustomNodePositions({
                            'q1': { x: 260, y: 150 },
                            'q2': { x: 260, y: 280 },
                            'q3': { x: 440, y: 280 }
                          })
                          const text = 'q1 -> q1: c\nq1 -> q2: d\nq2 -> q1: d\nq2 -> q3: c\nq3 -> q2: c\nq3 -> q3: d'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_automation_y') {
                          setGraphCategory('automata')
                          setGraphType('dfa')
                          setStartState('q4')
                          setAcceptStates(['q4'])
                          setGraphCaption('Automation-Y')
                          setCustomNodeShapes({})
                          setCustomNodePositions({
                            'q4': { x: 240, y: 150 },
                            'q5': { x: 240, y: 280 },
                            'q7': { x: 440, y: 150 },
                            'q6': { x: 440, y: 280 }
                          })
                          const text = 'q4 -> q4: c\nq4 -> q5: d\nq5 -> q4: d\nq4 -> q7: d\nq5 -> q6: c\nq6 -> q7: c\nq7 -> q6: c\nq6 -> q6: d'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } 
                        // --- Graph Presets Loaded from Dropdown ---
                        else if (val === 'preset_kruskal') {
                          setGraphCategory('graph')
                          setGraphType('undirected')
                          setGraphCaption("Figure: Kruskal's Algorithm Graph")
                          setCustomNodeShapes({})
                          setCustomNodePositions({
                            'A': { x: 205, y: 70 },  'B': { x: 375, y: 70 },  'C': { x: 545, y: 70 },
                            'D': { x: 205, y: 200 }, 'E': { x: 375, y: 200 }, 'F': { x: 545, y: 200 },
                            'G': { x: 205, y: 330 }, 'H': { x: 375, y: 330 }, 'I': { x: 545, y: 330 }
                          })
                          const text = 'A -- B : 12\nB -- C : 3\nD -- E : 5\nE -- F : 3\nG -- H : 2\nH -- I : 12\nA -- D : 7\nD -- G : 8\nB -- E : 2\nE -- H : 6\nC -- F : 7\nF -- I : 12\nA -- E : 5\nA -- H : 3\nB -- I : 11\nC -- E : 4\nC -- H : 9\nE -- G : 7\nE -- I : 4\nH -- F : 10'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_bfs_dfs') {
                          setGraphCategory('graph')
                          setGraphType('undirected')
                          setGraphCaption("Figure: BFS & DFS Traversal Graph")
                          setCustomNodeShapes({})
                          setCustomNodePositions({
                            'A': { x: 205, y: 70 },  'D': { x: 375, y: 70 },  'G': { x: 545, y: 70 },
                            'B': { x: 205, y: 200 }, 'E': { x: 375, y: 200 }, 'H': { x: 545, y: 200 },
                            'C': { x: 205, y: 330 }, 'F': { x: 375, y: 330 }, 'I': { x: 545, y: 330 }
                          })
                          const text = 'A -- D\nD -- G\nA -- B\nD -- E\nG -- H\nB -- C\nE -- F\nH -- I\nB -- E\nE -- H\nC -- F\nF -- I\nA -- E\nB -- D\nD -- H\nE -- G\nB -- F\nC -- E\nE -- I\nF -- H'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_floyd_warshall') {
                          setGraphCategory('graph')
                          setGraphType('undirected')
                          setGraphCaption("Figure: Floyd-Warshall Weighted Graph")
                          setCustomNodeShapes({})
                          setCustomNodePositions({
                            'A': { x: 220, y: 110 },
                            'B': { x: 510, y: 110 },
                            'D': { x: 220, y: 290 },
                            'C': { x: 510, y: 290 }
                          })
                          const text = 'A -- B : 5\nA -- D : 2\nD -- C : 4\nA -- C : 1\nB -- C : 3\nB -- C : 8'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        }
                        // --- Tree Presets Loaded from Dropdown ---
                        else if (val === 'preset_tree_bst') {
                          setGraphCategory('tree')
                          setGraphType('tree')
                          setGraphCaption('Figure: Academic Binary Search Tree (BST)')
                          setCustomNodePositions({})
                          setCustomNodeShapes({})
                          const text = '15 -- 35\n15 -- 9\n15 -- 40\n35 -- 3\n35 -- 8\n9 -- 1\n9 -- 10\n40 -- 4\n40 -- 12\n3 -- 20\n8 -- 30\n12 -- 5'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_tree_avl') {
                          setGraphCategory('tree')
                          setGraphType('tree')
                          setGraphCaption('Figure: AVL Balanced Tree (Rotations)')
                          setCustomNodePositions({})
                          setCustomNodeShapes({})
                          const text = '50 -- 30\n50 -- 70\n30 -- 20\n30 -- 40\n70 -- 60\n70 -- 80\n20 -- 10\n20 -- 25\n60 -- 55\n80 -- 90'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_tree_heap') {
                          setGraphCategory('tree')
                          setGraphType('tree_directed')
                          setGraphCaption('Figure: Complete Binary Max-Heap (Heap Sort)')
                          setCustomNodePositions({})
                          setCustomNodeShapes({})
                          const text = '100 -> 84\n100 -> 72\n84 -> 55\n84 -> 42\n72 -> 68\n72 -> 35\n55 -> 19\n55 -> 28\n42 -> 30'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_tree_huffman') {
                          setGraphCategory('tree')
                          setGraphType('tree_directed')
                          setGraphCaption('Figure: Huffman Coding Tree (Prefix Codes)')
                          setCustomNodePositions({})
                          setCustomNodeShapes({})
                          const text = '100 -> 45 : 0\n100 -> 55 : 1\n55 -> 25 : 0\n55 -> 30 : 1\n25 -> 12 : 0\n25 -> 13 : 1\n30 -> 14 : 0\n30 -> 16 : 1'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        }
                        // --- Map Presets Loaded from Dropdown ---
                        else if (val === 'preset_map_romania') {
                          setGraphCategory('map')
                          setGraphType('map')
                          setGraphCaption('Figure: Simplified Road Map of Romania (A* Search)')
                          setCustomNodePositions({
                            'ORADEA': { x: 120, y: 70 },
                            'ZERIND': { x: 100, y: 150 },
                            'ARAD': { x: 100, y: 240 },
                            'TIMISOARA': { x: 100, y: 350 },
                            'LUGOJ': { x: 180, y: 380 },
                            'SIBIU': { x: 260, y: 190 },
                            'FAGARAS': { x: 380, y: 190 },
                            'RIMNICU': { x: 280, y: 270 },
                            'PITESTI': { x: 400, y: 300 },
                            'CRAIOVA': { x: 300, y: 390 },
                            'BUCHAREST': { x: 530, y: 310 },
                            'GIURGIU': { x: 500, y: 400 },
                            'URZICENI': { x: 620, y: 250 },
                            'HIRSOVA': { x: 700, y: 250 },
                            'EFORIE': { x: 710, y: 340 },
                            'VASLUI': { x: 670, y: 160 },
                            'IASI': { x: 630, y: 90 },
                            'NEAMT': { x: 520, y: 70 }
                          })
                          const romShapes = {}
                          ;['ORADEA', 'ZERIND', 'ARAD', 'SIBIU', 'FAGARAS', 'RIMNICU', 'PITESTI', 'BUCHAREST', 'URZICENI', 'VASLUI', 'IASI', 'NEAMT'].forEach(c => { romShapes[c] = 'rect' })
                          setCustomNodeShapes(romShapes)
                          const text = 'ORADEA -- ZERIND : 71\nZERIND -- ARAD : 75\nARAD -- SIBIU : 140\nSIBIU -- FAGARAS : 99\nSIBIU -- RIMNICU : 80\nFAGARAS -- BUCHAREST : 211\nRIMNICU -- PITESTI : 97\nPITESTI -- BUCHAREST : 101\nBUCHAREST -- URZICENI : 85\nURZICENI -- VASLUI : 142\nVASLUI -- IASI : 92\nIASI -- NEAMT : 87'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_map_dijkstra') {
                          setGraphCategory('map')
                          setGraphType('map_directed')
                          setGraphCaption('Figure: Shortest Path Road Network (Dijkstra / Bellman-Ford)')
                          setCustomNodePositions({
                            'S': { x: 150, y: 200 },
                            'A': { x: 280, y: 100 },
                            'B': { x: 280, y: 300 },
                            'C': { x: 440, y: 100 },
                            'D': { x: 440, y: 300 },
                            'T': { x: 580, y: 200 }
                          })
                          setCustomNodeShapes({ 'S': 'rect', 'A': 'circle', 'B': 'circle', 'C': 'circle', 'D': 'circle', 'T': 'rect' })
                          const text = 'S -> A : 4\nS -> B : 2\nA -> B : 1\nA -> C : 5\nB -> D : 8\nB -> C : 10\nC -> D : 2\nC -> T : 6\nD -> T : 3'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_map_lan') {
                          setGraphCategory('map')
                          setGraphType('map')
                          setGraphCaption('Figure: Campus Enterprise Network Architecture')
                          setCustomNodePositions({
                            'Gateway': { x: 375, y: 50 },
                            'Firewall': { x: 375, y: 120 },
                            'Core-Switch': { x: 375, y: 190 },
                            'Server-Farm': { x: 180, y: 190 },
                            'Switch-Dept-A': { x: 220, y: 275 },
                            'Switch-Dept-B': { x: 375, y: 275 },
                            'Wireless-AP': { x: 530, y: 275 },
                            'Lab-PC1': { x: 160, y: 360 },
                            'Lab-PC2': { x: 240, y: 360 },
                            'Office-PC': { x: 375, y: 360 },
                            'Mobile-Clients': { x: 530, y: 360 }
                          })
                          const lanShapes = {}
                          ;['Gateway', 'Firewall', 'Core-Switch', 'Server-Farm', 'Switch-Dept-A', 'Switch-Dept-B', 'Wireless-AP', 'Lab-PC1', 'Lab-PC2', 'Office-PC', 'Mobile-Clients'].forEach(n => { lanShapes[n] = 'rect' })
                          setCustomNodeShapes(lanShapes)
                          const text = 'Gateway -- Firewall : 10 Gbps\nFirewall -- Core-Switch : 10 Gbps\nCore-Switch -- Server-Farm : 10 Gbps\nCore-Switch -- Switch-Dept-A : 1 Gbps\nCore-Switch -- Switch-Dept-B : 1 Gbps\nCore-Switch -- Wireless-AP : 1 Gbps\nSwitch-Dept-A -- Lab-PC1 : 100 Mbps\nSwitch-Dept-A -- Lab-PC2 : 100 Mbps\nSwitch-Dept-B -- Office-PC : 100 Mbps\nWireless-AP -- Mobile-Clients : WiFi-6'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else if (val === 'preset_map_konigsberg') {
                          setGraphCategory('map')
                          setGraphType('map')
                          setGraphCaption('Figure: Seven Bridges of Königsberg (Euler Path Analysis)')
                          setCustomNodePositions({
                            'North-Bank': { x: 375, y: 70 },
                            'Island': { x: 375, y: 200 },
                            'South-Bank': { x: 375, y: 330 },
                            'East-Bank': { x: 560, y: 200 }
                          })
                          setCustomNodeShapes({ 'North-Bank': 'rect', 'Island': 'rect', 'South-Bank': 'rect', 'East-Bank': 'rect' })
                          const text = 'North-Bank -- Island : Bridge 1\nNorth-Bank -- Island : Bridge 2\nSouth-Bank -- Island : Bridge 3\nSouth-Bank -- Island : Bridge 4\nNorth-Bank -- East-Bank : Bridge 5\nSouth-Bank -- East-Bank : Bridge 6\nIsland -- East-Bank : Bridge 7'
                          setGraphEdgesText(text)
                          setEdgeRows(parseGraphLines(text).edges)
                        } else {
                          // Standard format selection
                          setGraphType(val)
                          setCustomNodePositions({})
                        }
                      }}
                      className="w-full border border-gray-300 p-2 rounded-lg bg-white font-semibold text-xs"
                    >
                      {graphCategory === 'graph' && (
                        <>
                          <optgroup label="Standard Graph Layouts">
                            <option value="directed">Directed Graph (with Arrows)</option>
                            <option value="undirected">Undirected Graph (Lines without Arrows)</option>
                            <option value="grid">Grid / Matrix Layout (Undirected, e.g. Kruskal 3x3)</option>
                            <option value="grid_directed">Grid / Matrix Layout (Directed, e.g. BFS/DFS 3x3)</option>
                            <option value="horizontal">Horizontal Flow (Left to Right)</option>
                          </optgroup>
                          <optgroup label="Preset Exam Graphs">
                            <option value="preset_kruskal">📐 Kruskal's MST Graph (9-Node Grid)</option>
                            <option value="preset_bfs_dfs">🔄 BFS & DFS Traversal Graph (9-Node Grid)</option>
                            <option value="preset_floyd_warshall">⚡ Floyd-Warshall Graph (Dual Arc B-C)</option>
                          </optgroup>
                        </>
                      )}
                      {graphCategory === 'tree' && (
                        <>
                          <optgroup label="Standard Tree Layouts">
                            <option value="tree">Hierarchical Tree (Top-Down, Undirected)</option>
                            <option value="tree_directed">Hierarchical Tree (Top-Down, Directed)</option>
                            <option value="tree_lr">Horizontal Tree (Left-to-Right, Undirected)</option>
                            <option value="tree_lr_directed">Horizontal Tree (Left-to-Right, Directed)</option>
                            <option value="tree_rl">Horizontal Tree (Right-to-Left, Undirected)</option>
                            <option value="tree_rl_directed">Horizontal Tree (Right-to-Left, Directed)</option>
                          </optgroup>
                          <optgroup label="Preset Exam Trees">
                            <option value="preset_tree_bst">🌲 Academic BST (12-Node Default)</option>
                            <option value="preset_tree_avl">🌳 AVL Balanced Tree (Rotations)</option>
                            <option value="preset_tree_heap">⚡ Max-Heap Tree (Heap Sort)</option>
                            <option value="preset_tree_huffman">📶 Huffman Coding Tree (Prefix Codes)</option>
                          </optgroup>
                        </>
                      )}
                      {graphCategory === 'map' && (
                        <>
                          <optgroup label="Standard Map & Network Layouts">
                            <option value="map">Undirected Map / Network (without Arrows)</option>
                            <option value="map_directed">Directed Map / Network (with Arrows)</option>
                          </optgroup>
                          <optgroup label="Preset Exam Maps & Networks">
                            <option value="preset_map_romania">🇷🇴 Romania Map (A* Search Classic)</option>
                            <option value="preset_map_dijkstra">🚚 Dijkstra Road Network (Cities S..T)</option>
                            <option value="preset_map_lan">📡 Enterprise LAN Network Topology</option>
                            <option value="preset_map_konigsberg">🌉 Seven Bridges of Königsberg (Euler Path)</option>
                          </optgroup>
                        </>
                      )}
                      {graphCategory === 'automata' && (
                        <>
                          <optgroup label="Standard Automata Models">
                            <option value="dfa">DFA (Deterministic Finite Automata)</option>
                            <option value="nfa">NFA (Non-Deterministic Finite Automata)</option>
                            <option value="enfa">ε-NFA (with Epsilon Transitions)</option>
                          </optgroup>
                          <optgroup label="Preset Exam Automata & Machines">
                            <option value="preset_enfa_pipeline">⚡ ε-NFA Pipeline (q0..q6)</option>
                            <option value="preset_mealy_machine">🏷️ Mealy Machine (q0, q1)</option>
                            <option value="preset_moore_machine">🏷️ Moore Machine (q0..q2)</option>
                            <option value="preset_automation_x">⚡ Automation-X (Equivalence q1..q3)</option>
                            <option value="preset_automation_y">⚡ Automation-Y (Equivalence q4..q7)</option>
                          </optgroup>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Automata / State Diagram Specialized Controls */}
                {graphCategory === 'automata' && (() => {
                  const automataNodes = parseGraphLines(graphEdgesText).nodes
                  return (
                    <div className="p-3 bg-white border border-emerald-200 rounded-xl shadow-sm space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        {/* Start State Indicator Selector */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-700 text-xs flex items-center gap-1">
                            <span className="text-emerald-700 font-extrabold text-sm">➔</span> Start State:
                          </span>
                          <select
                            value={startState}
                            onChange={(e) => setStartState(e.target.value)}
                            className="border border-emerald-300 rounded-lg px-2.5 py-1 bg-emerald-50 font-bold text-emerald-900 text-xs focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">(None)</option>
                            {automataNodes.map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                          <span className="text-[11px] text-gray-500 italic">(Arrow coming from nowhere)</span>
                        </div>

                        {/* Quick Insert Symbols */}
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 font-semibold text-[11px]">Quick Insert:</span>
                          {['ε', 'λ', 'a', 'b', '0', '1'].map(sym => (
                            <button
                              key={sym}
                              type="button"
                              onClick={() => {
                                if (edgeRows.length > 0) {
                                  const lastIdx = edgeRows.length - 1
                                  const curr = edgeRows[lastIdx].weight
                                  handleUpdateEdgeRow(lastIdx, 'weight', curr ? `${curr}, ${sym}` : sym)
                                }
                              }}
                              className="px-1.5 py-0.5 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-800 rounded border border-gray-200 text-[11px] font-mono font-bold transition-all"
                              title={`Append "${sym}" to last transition`}
                            >
                              {sym}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Accepting / Final States Chips */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-700 text-xs flex items-center gap-1">
                          <span className="text-emerald-700 font-extrabold text-sm">⊚</span> Accepting / Final States:
                        </span>
                        {automataNodes.map(n => {
                          const isAccepting = acceptStates.includes(n)
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => {
                                if (isAccepting) {
                                  setAcceptStates(acceptStates.filter(s => s !== n))
                                } else {
                                  setAcceptStates([...acceptStates, n])
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                                isAccepting
                                  ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-400/30'
                                  : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                              }`}
                            >
                              <span className="text-xs">{isAccepting ? '⊚' : '○'}</span>
                              <span>{n}</span>
                              {isAccepting && <span className="text-[10px] bg-white/25 px-1 rounded font-normal">Double Circle</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Per-Node Shape Selector (Circle ○ vs Rectangle ▢) */}
                {(() => {
                  const currentParsed = parseGraphData(graphEdgesText)
                  if (!currentParsed.nodes || currentParsed.nodes.length === 0) return null
                  const defaultShapeName = graphCategory === 'map' ? 'Rectangle ▢' : 'Circle ○'

                  return (
                    <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-700 text-xs flex items-center gap-1">
                            <span className="text-emerald-700 font-extrabold text-sm">▢</span> Node Shapes (Circle vs Rectangle):
                          </span>
                          <span className="text-[11px] text-gray-500 italic">
                            (Default: {defaultShapeName})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => {
                              const newShapes = {}
                              currentParsed.nodes.forEach(n => { newShapes[n] = 'circle' })
                              setCustomNodeShapes(newShapes)
                            }}
                            className="px-2 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold"
                            title="Set all nodes in this diagram to Circular shape"
                          >
                            All Circle ○
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newShapes = {}
                              currentParsed.nodes.forEach(n => { newShapes[n] = 'rect' })
                              setCustomNodeShapes(newShapes)
                            }}
                            className="px-2 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold"
                            title="Set all nodes in this diagram to Rectangular shape"
                          >
                            All Rect ▢
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomNodeShapes({})}
                            className="px-2 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500"
                            title="Reset all node shapes to category default"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {currentParsed.nodes.map(node => {
                          const currentShape = resolveNodeShape(node, graphCategory, customNodeShapes, currentParsed.nodeShapes)
                          const isRect = currentShape === 'rect'
                          return (
                            <button
                              key={node}
                              type="button"
                              onClick={() => {
                                const nextShape = isRect ? 'circle' : 'rect'
                                setCustomNodeShapes(prev => ({ ...prev, [node]: nextShape }))
                              }}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                                isRect
                                  ? 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/30'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30'
                              }`}
                              title={`Click to toggle ${node} to ${isRect ? 'Circle ○' : 'Rectangle ▢'}`}
                            >
                              <span className="text-xs">{isRect ? '▢' : '○'}</span>
                              <span>{node}</span>
                              <span className="text-[10px] opacity-75 font-normal">
                                ({isRect ? 'Rect' : 'Circle'})
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

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
                  const activeGraphPositions = computeGraphLayout(activeGraphData.nodes, activeGraphData.edges, graphType, customNodePositions, {
                    startState: graphCategory === 'automata' ? startState : null,
                    acceptStates: graphCategory === 'automata' ? acceptStates : []
                  })

                  // Compute dynamic responsive bounding box & viewBox for live preview SVG
                  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

                  activeGraphData.nodes.forEach(node => {
                    const p = activeGraphPositions[node]
                    if (!p) return
                    const shape = resolveNodeShape(node, graphCategory, customNodeShapes, activeGraphData.nodeShapes)
                    const isRect = shape === 'rect'
                    const halfW = isRect ? Math.max(node.length * 9 + 26, 48) / 2 : 24
                    const halfH = isRect ? 20 : 24
                    minX = Math.min(minX, p.x - halfW)
                    maxX = Math.max(maxX, p.x + halfW)
                    minY = Math.min(minY, p.y - halfH)
                    maxY = Math.max(maxY, p.y + halfH)
                  })

                  if (graphCategory === 'automata' && startState && activeGraphPositions[startState]) {
                    minX = Math.min(minX, activeGraphPositions[startState].x - 60)
                  }

                  activeGraphData.edges.forEach(edge => {
                    const p1 = activeGraphPositions[edge.from]
                    const p2 = activeGraphPositions[edge.to]
                    if (p1 && p2) {
                      minX = Math.min(minX, p1.x - 24, p2.x - 24)
                      maxX = Math.max(maxX, p1.x + 24, p2.x + 24)
                      minY = Math.min(minY, p1.y - 24, p2.y - 24)
                      maxY = Math.max(maxY, p1.y + 24, p2.y + 24)
                    }
                    if (edge.weight && p1 && p2) {
                      const midX = (p1.x + p2.x) / 2
                      const midY = (p1.y + p2.y) / 2
                      const bW = Math.max(String(edge.weight).length * 8 + 14, 24)
                      minX = Math.min(minX, midX - bW / 2 - 8)
                      maxX = Math.max(maxX, midX + bW / 2 + 8)
                      minY = Math.min(minY, midY - 18)
                      maxY = Math.max(maxY, midY + 18)
                    }
                  })

                  if (graphCaption) {
                    const capStr = graphCaption.trim()
                    const capW = capStr.length * 8.5 + 30
                    const centerMidX = (minX + maxX) / 2
                    minX = Math.min(minX, centerMidX - capW / 2)
                    maxX = Math.max(maxX, centerMidX + capW / 2)
                  }

                  if (!isFinite(minX)) {
                    minX = 50; maxX = 700; minY = 50; maxY = 350;
                  }

                  const pad = 44
                  const captionPad = graphCaption ? 38 : 0
                  const computedMinX = Math.min(0, minX - pad)
                  const computedMaxX = Math.max(750, maxX + pad)
                  const computedMinY = Math.min(0, minY - pad)
                  const computedMaxY = Math.max(400, maxY + pad + captionPad)

                  const viewBoxX = Math.floor(computedMinX)
                  const viewBoxY = Math.floor(computedMinY)
                  const viewBoxW = Math.ceil(computedMaxX - computedMinX)
                  const viewBoxH = Math.ceil(computedMaxY - computedMinY)

                  const captionX = viewBoxX + viewBoxW / 2
                  const captionY = maxY + pad + 14

                  return (
                    <div className="space-y-2">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                          Live Vector SVG Preview ({graphTheme === 'bw' ? 'Black & White' : 'System Theme'})
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleAutoAlignGraph()}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            title="Automatically arrange nodes in a mathematically symmetrical balanced layout"
                          >
                            <Sparkles size={14} /> Auto-Align Symmetrically
                          </button>
                          {Object.keys(customNodePositions).length > 0 && (
                            <button
                              type="button"
                              onClick={() => { setCustomNodePositions({}); setActiveGuideLines([]); }}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              title="Reset all manual node drag positions"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-gray-600 bg-emerald-50/80 px-3 py-1.5 rounded-lg border border-emerald-200/70">
                        <span className="flex items-center gap-1">🖱️ Click & drag any node with mouse to reposition</span>
                        <span className="text-emerald-800 font-semibold flex items-center gap-1">✨ Magnetic alignment guidelines will automatically snap & level nodes</span>
                      </div>

                      <div className="p-3 bg-white border border-emerald-200 rounded-xl shadow-inner flex justify-center overflow-auto select-none relative" style={{ maxHeight: '65vh' }}>
                        <svg
                          ref={graphSvgRef}
                          viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
                          onMouseMove={handleSvgMouseMove}
                          onMouseUp={handleSvgMouseUp}
                          onMouseLeave={handleSvgMouseUp}
                          style={{ width: '100%', height: 'auto', maxHeight: '520px', cursor: draggingNode ? 'grabbing' : 'default' }}
                        >
                          <defs>
                            <marker id="arrowhead-interactive" viewBox="0 0 10 10" refX="27" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={graphTheme === 'bw' ? '#000000' : '#047857'} />
                            </marker>
                            <marker id="arrowhead-loop-interactive" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
                              <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={graphTheme === 'bw' ? '#000000' : '#047857'} />
                            </marker>
                          </defs>

                          {/* Magnetic Alignment Guidelines (Figma / Illustrator style) */}
                          {activeGuideLines.map((guide, gIdx) => {
                            if (guide.type === 'v') {
                              return (
                                <g key={`g-v-${gIdx}`} className="pointer-events-none">
                                  <line
                                    x1={guide.pos}
                                    y1={viewBoxY}
                                    x2={guide.pos}
                                    y2={viewBoxY + viewBoxH}
                                    stroke="#059669"
                                    strokeWidth="1.5"
                                    strokeDasharray="4,4"
                                    opacity="0.85"
                                  />
                                  <rect
                                    x={guide.pos - 40}
                                    y={viewBoxY + 8}
                                    width="80"
                                    height="16"
                                    rx="3"
                                    fill="#047857"
                                    opacity="0.95"
                                  />
                                  <text
                                    x={guide.pos}
                                    y={viewBoxY + 19}
                                    fontSize="9"
                                    fontWeight="bold"
                                    fill="#ffffff"
                                    textAnchor="middle"
                                  >
                                    {guide.label || 'Aligned'}
                                  </text>
                                </g>
                              )
                            }
                            return (
                              <g key={`g-h-${gIdx}`} className="pointer-events-none">
                                <line
                                  x1={viewBoxX}
                                  y1={guide.pos}
                                  x2={viewBoxX + viewBoxW}
                                  y2={guide.pos}
                                  stroke="#059669"
                                  strokeWidth="1.5"
                                  strokeDasharray="4,4"
                                  opacity="0.85"
                                />
                                <rect
                                  x={viewBoxX + 8}
                                  y={guide.pos - 8}
                                  width="80"
                                  height="16"
                                  rx="3"
                                  fill="#047857"
                                  opacity="0.95"
                                />
                                <text
                                  x={viewBoxX + 48}
                                  y={guide.pos + 3}
                                  fontSize="9"
                                  fontWeight="bold"
                                  fill="#ffffff"
                                  textAnchor="middle"
                                >
                                  {guide.label || 'Aligned'}
                                </text>
                              </g>
                            )
                          })}

                          {/* Render Edges (Curved Bezier for Multigraphs & Straight for Single with Deflection) */}
                          {(() => {
                            const pairGroups = {}
                            activeGraphData.edges.forEach((edge, idx) => {
                              const u = edge.from < edge.to ? edge.from : edge.to
                              const v = edge.from < edge.to ? edge.to : edge.from
                              const key = `${u}~~~${v}`
                              if (!pairGroups[key]) pairGroups[key] = []
                              pairGroups[key].push(idx)
                            })
                            const isAutomata = ['dfa', 'nfa', 'enfa', 'moore', 'mealy'].includes(graphType) || graphCategory === 'automata'

                            // Precalculate all edge geometries & badge positions
                            const precomputed = activeGraphData.edges.map((edge, idx) => {
                              const p1 = activeGraphPositions[edge.from]
                              const p2 = activeGraphPositions[edge.to]
                              if (!p1 || !p2) return null
                              const isDirected = (graphType === 'directed' || graphType === 'horizontal' || graphType.endsWith('_directed') || isAutomata)
                              const isSelfLoop = edge.from === edge.to

                              let edgePath = null
                              let midX = (p1.x + p2.x) / 2
                              let midY = (p1.y + p2.y) / 2

                              if (isSelfLoop) {
                                const loopGeo = getSelfLoopGeometry(edge.from, activeGraphPositions, activeGraphData.edges, 0, {
                                  isAutomata,
                                  startState: graphCategory === 'automata' ? startState : null
                                })
                                if (loopGeo) {
                                  edgePath = loopGeo.path
                                  midX = loopGeo.midX
                                  midY = loopGeo.midY
                                }
                              } else {
                                const geo = computeEdgeGeometry(edge, idx, activeGraphData.edges, activeGraphPositions, activeGraphData.nodes, isAutomata, pairGroups)
                                if (geo) {
                                  edgePath = geo.path
                                  midX = geo.midX
                                  midY = geo.midY
                                }
                              }

                              let badge = null
                              if (edge.weight) {
                                const weightLines = String(edge.weight).split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
                                let bW = 24
                                let bH = 18
                                if (weightLines.length > 1) {
                                  const maxLen = Math.max(...weightLines.map(l => l.length))
                                  bW = Math.max(maxLen * 8 + 12, 26)
                                  bH = weightLines.length * 14 + 6
                                } else {
                                  bW = Math.max(edge.weight.length * 8 + 10, 22)
                                  bH = 18
                                }
                                badge = { midX, midY, width: bW, height: bH, weightLines, weight: edge.weight }
                              }

                              return { edge, idx, p1, p2, isDirected, isSelfLoop, edgePath, badge }
                            }).filter(Boolean)

                            // Resolve badge collision deflection
                            const previewBadges = precomputed.map(item => item.badge).filter(Boolean)
                            resolveBadgeCollisions(previewBadges)

                            return (
                              <g>
                                {/* Draw Edge Lines */}
                                {precomputed.map(item => (
                                  <g key={`line-${item.idx}`}>
                                    {item.edgePath ? (
                                      <path
                                        d={item.edgePath}
                                        fill="none"
                                        stroke={graphTheme === 'bw' ? '#000000' : '#059669'}
                                        strokeWidth="2.5"
                                        markerEnd={item.isDirected ? (item.isSelfLoop ? 'url(#arrowhead-loop-interactive)' : 'url(#arrowhead-interactive)') : undefined}
                                      />
                                    ) : (
                                      <line
                                        x1={item.p1.x}
                                        y1={item.p1.y}
                                        x2={item.p2.x}
                                        y2={item.p2.y}
                                        stroke={graphTheme === 'bw' ? '#000000' : '#059669'}
                                        strokeWidth="2.5"
                                        markerEnd={item.isDirected ? 'url(#arrowhead-interactive)' : undefined}
                                      />
                                    )}
                                  </g>
                                ))}

                                {/* Draw Deflected Badges */}
                                {precomputed.map(item => {
                                  if (!item.badge) return null
                                  const { midX, midY, width: bW, height: bH, weightLines, weight } = item.badge
                                  if (weightLines && weightLines.length > 1) {
                                    return (
                                      <g key={`badge-${item.idx}`}>
                                        <rect
                                          x={midX - bW / 2}
                                          y={midY - bH / 2}
                                          width={bW}
                                          height={bH}
                                          rx="4"
                                          fill="#ffffff"
                                          stroke={graphTheme === 'bw' ? '#000000' : '#10b981'}
                                          strokeWidth="1.5"
                                        />
                                        {weightLines.map((wLine, lineIdx) => (
                                          <text
                                            key={lineIdx}
                                            x={midX}
                                            y={(midY - bH / 2) + 12 + lineIdx * 14}
                                            fontSize="11"
                                            fontWeight="bold"
                                            fill={graphTheme === 'bw' ? '#000000' : '#047857'}
                                            textAnchor="middle"
                                          >
                                            {wLine}
                                          </text>
                                        ))}
                                      </g>
                                    )
                                  }
                                  return (
                                    <g key={`badge-${item.idx}`}>
                                      <rect
                                        x={midX - bW / 2}
                                        y={midY - 10}
                                        width={bW}
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
                                        {weight}
                                      </text>
                                    </g>
                                  )
                                })}
                              </g>
                            )
                          })()}

                          {/* Automata Initial/Start State Arrow from nowhere */}
                          {graphCategory === 'automata' && startState && activeGraphPositions[startState] && (
                            <g className="start-state-indicator pointer-events-none">
                              <line
                                x1={activeGraphPositions[startState].x - 48}
                                y1={activeGraphPositions[startState].y}
                                x2={activeGraphPositions[startState].x}
                                y2={activeGraphPositions[startState].y}
                                stroke={graphTheme === 'bw' ? '#000000' : '#047857'}
                                strokeWidth="2.5"
                                markerEnd="url(#arrowhead-interactive)"
                              />
                            </g>
                          )}

                          {/* Render Nodes (Interactive Drag & Drop: Circle vs Rectangle) */}
                          {activeGraphData.nodes.map(node => {
                            const p = activeGraphPositions[node]
                            if (!p) return null
                            const isDragged = draggingNode === node
                            const isAccepting = graphCategory === 'automata' && acceptStates.includes(node)
                            const shape = resolveNodeShape(node, graphCategory, customNodeShapes, activeGraphData.nodeShapes)
                            const isRect = shape === 'rect'
                            const fontSize = node.length > 5 ? '9' : (node.length > 3 ? '11' : '13')
                            const nodeWidth = Math.max(node.length * 9 + 26, 48)
                            const nodeHeight = 36

                            return (
                              <g
                                key={node}
                                onMouseDown={(e) => handleSvgMouseDown(node, e)}
                                style={{ cursor: draggingNode === node ? 'grabbing' : 'grab' }}
                              >
                                {isRect ? (
                                  <>
                                    <rect
                                      x={p.x - nodeWidth / 2}
                                      y={p.y - nodeHeight / 2}
                                      width={nodeWidth}
                                      height={nodeHeight}
                                      rx="6"
                                      fill={isDragged ? (graphTheme === 'bw' ? '#e5e7eb' : '#d1fae5') : '#ffffff'}
                                      stroke={graphTheme === 'bw' ? '#000000' : '#047857'}
                                      strokeWidth={isDragged ? '3.5' : '2.5'}
                                    />
                                    {isAccepting && (
                                      <rect
                                        x={p.x - (nodeWidth - 8) / 2}
                                        y={p.y - (nodeHeight - 8) / 2}
                                        width={nodeWidth - 8}
                                        height={nodeHeight - 8}
                                        rx="4"
                                        fill="none"
                                        stroke={graphTheme === 'bw' ? '#000000' : '#047857'}
                                        strokeWidth="2"
                                      />
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <circle
                                      cx={p.x}
                                      cy={p.y}
                                      r={22}
                                      fill={isDragged ? (graphTheme === 'bw' ? '#e5e7eb' : '#d1fae5') : '#ffffff'}
                                      stroke={graphTheme === 'bw' ? '#000000' : '#047857'}
                                      strokeWidth={isDragged ? '3.5' : '2.5'}
                                    />
                                    {isAccepting && (
                                      <circle
                                        cx={p.x}
                                        cy={p.y}
                                        r={17.5}
                                        fill="none"
                                        stroke={graphTheme === 'bw' ? '#000000' : '#047857'}
                                        strokeWidth="2"
                                      />
                                    )}
                                  </>
                                )}
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

                          {/* Centered Diagram Caption / Title in Live Preview */}
                          {graphCaption && (
                            <g className="pointer-events-none select-none">
                              <text
                                x={captionX}
                                y={captionY}
                                fontSize="13"
                                fontWeight="bold"
                                fontFamily="'Times New Roman', Times, 'Segoe UI', serif"
                                fill={graphTheme === 'bw' ? '#000000' : '#047857'}
                                textAnchor="middle"
                              >
                                {graphCaption}
                              </text>
                            </g>
                          )}
                        </svg>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex justify-end gap-2.5">
                <button onClick={handleCloseDiagramModal} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs">
                  Cancel
                </button>
                <button onClick={handleInsertGraph} className="px-5 py-2 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-950 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md border border-emerald-950/20">
                  {editingDiagramElement ? (
                    <>
                      <Check size={16} /> Update CS Diagram in Question Paper
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Insert Resizable CS Diagram into Question Paper
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 📊 Modal 3: Automated Data Table Generator (Direct Grid Data Entry + CSE Academic Presets) */}
      {showTableGenModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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
                <button onClick={handleInsertTable} className="px-5 py-2 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-950 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md border border-emerald-950/20">
                  <Plus size={16} /> Insert Resizable Table into Question Paper
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 📋 Exam Paper Structure Builder Modal */}
      {showPaperStructureModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-4xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" style={{ maxHeight: '92vh' }}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-800 text-white px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/15 rounded-lg border border-white/20">
                    <ClipboardList size={20} className="text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">
                      {isEditingExistingTable ? 'Edit Existing Paper Structure' : isMidTerm ? 'Mid Term Paper Structure Builder' : isCT ? 'Class Test (CT) Paper Structure Builder' : 'Term Final Paper Structure Builder'}
                    </h3>
                    <p className="text-xs text-emerald-200">
                      {isEditingExistingTable ? 'Modify structure without losing typed question text' : isMidTerm ? 'Build professional Mid Term exam question paper table layout' : isCT ? 'Build professional Class Test exam paper layout (5M / 10M questions)' : 'Build professional Term Final exam question paper table layout with Parts'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowPaperStructureModal(false)} className="p-1 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto bg-gray-50/50 text-sm">
                {/* Quick Presets */}
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1.5">
                    Quick Presets ({isMidTerm ? 'Mid Term' : isCT ? 'Class Test (CT)' : isAssignmentOrReport ? 'Assignment / Report' : 'Term Final'})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {isCT ? (
                      <>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(1, [5]), makePresetQuestion(1, [5])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📝 2Q × 5 Marks = 10 Marks
                        </button>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(1, [10])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📋 1Q × 10 Marks = 10 Marks
                        </button>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(2, [5, 5])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          🧩 1Q × 2 Sub (5M each) = 10 Marks
                        </button>
                      </>
                    ) : isAssignmentOrReport ? (
                      <>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(1, [5]), makePresetQuestion(1, [5])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📝 2Q × 5 Marks = 10 Marks
                        </button>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(1, [10])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📋 1Q × 10 Marks = 10 Marks
                        </button>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(1, [5]), makePresetQuestion(1, [5]), makePresetQuestion(1, [5])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📄 3Q × 5 Marks = 15 Marks
                        </button>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(1, [15])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          🎯 1Q × 15 Marks = 15 Marks
                        </button>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(2, [5, 5])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          🧩 1Q × 2 Sub (5M each) = 10 Marks
                        </button>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(3, [5, 5, 5])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📚 1Q × 3 Sub (5M each) = 15 Marks
                        </button>
                      </>
                    ) : isMidTerm ? (
                      <>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(3, [10, 10, 10]), makePresetQuestion(3, [10, 10, 10]), makePresetQuestion(3, [10, 10, 10])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📝 3Q × 3 Sub = 90 Marks
                        </button>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(2, [10, 10]), makePresetQuestion(2, [10, 10]), makePresetQuestion(2, [10, 10])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📋 3Q × 2 Sub = 60 Marks
                        </button>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: '', questions: [makePresetQuestion(3, [10, 10, 10]), makePresetQuestion(3, [10, 10, 10])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📄 2Q × 3 Sub = 60 Marks
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: 'PART A', beforeSpace: 0, afterSpace: 0, questions: [makePresetQuestion(3, [10, 10, 10]), makePresetQuestion(3, [10, 10, 10]), makePresetQuestion(3, [10, 10, 10])] },
                            { name: 'PART B', beforeSpace: 0, afterSpace: 0, questions: [makePresetQuestion(3, [10, 10, 10]), makePresetQuestion(3, [10, 10, 10])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📝 3 Credit Final (5Q × 3 Sub = 150 Marks)
                        </button>
                        <button
                          onClick={() => setPaperStructureParts([
                            { name: 'PART A', beforeSpace: 0, afterSpace: 0, questions: [makePresetQuestion(2, [10, 10]), makePresetQuestion(2, [10, 10]), makePresetQuestion(2, [10, 10])] },
                            { name: 'PART B', beforeSpace: 0, afterSpace: 0, questions: [makePresetQuestion(2, [10, 10]), makePresetQuestion(2, [10, 10])] }
                          ])}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold"
                        >
                          📋 2 Credit Final (5Q × 2 Sub = 100 Marks)
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Teacher Guide Tip */}
                <div className="px-3.5 py-2.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 shadow-2xs">
                  <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11.5px] text-amber-800 leading-snug space-y-1">
                    <p>
                      <strong>Teacher Guide:</strong> Customize sub-questions, marks, Bloom taxonomy codes, and &apos;OR&apos; choices freely — existing typed question content is always preserved automatically.
                    </p>
                    <p className="text-amber-700">
                      After inserting into the editor, click anywhere on the table and select <strong>&quot;Clear Borders&quot;</strong> in the table toolbar to hide gridlines for the final print view.
                    </p>
                  </div>
                </div>

                {/* Spacing Rows Formatting Control */}
                {(() => {
                  const firstQ = paperStructureParts[0]?.questions[0]
                  const currentSubSpace = firstQ?.subSpaceRows !== undefined
                    ? (Array.isArray(firstQ.subSpaceRows) ? (firstQ.subSpaceRows[0] ?? 0) : firstQ.subSpaceRows)
                    : 0
                  const currentQSpace = firstQ?.qSpaceRows !== undefined
                    ? firstQ.qSpaceRows
                    : 1

                  return (
                    <div className="p-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-emerald-800">Format Spacing:</span>
                        <span className="text-[11px] text-gray-500 font-medium">Add blank spacing rows between questions & sub-questions</span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-gray-500 font-bold">Sub-Q Space:</span>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                            const isSelected = currentSubSpace === n
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => handlePaperStructureSetGlobalSubSpaceRows(n)}
                                className={`px-1.5 py-0.5 rounded text-[11px] transition ${
                                  isSelected
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-2xs'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold'
                                }`}
                                title={`Set ${n} spacing row(s) between sub-questions`}
                              >
                                {n}
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                          <span className="text-[11px] text-emerald-800 font-extrabold">Q-to-Q Space:</span>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                            const isSelected = currentQSpace === n
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => handlePaperStructureSetGlobalQSpaceRows(n)}
                                className={`px-1.5 py-0.5 rounded text-[11px] transition ${
                                  isSelected
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-2xs'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold'
                                }`}
                                title={`Set ${n} spacing row(s) between main questions`}
                              >
                                {n}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Parts Configuration */}
                {paperStructureParts.map((part, partIdx) => (
                  <div key={partIdx} className="bg-white border border-emerald-200 rounded-xl p-4 space-y-3">
                    {!isNoParts && (
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-emerald-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={part.name}
                            onChange={(e) => handlePaperStructureRenamePart(partIdx, e.target.value)}
                            className="font-extrabold text-emerald-800 text-sm bg-transparent border-b border-dashed border-emerald-300 focus:border-emerald-600 outline-none px-1 py-0.5 w-28"
                          />
                          <span className="text-xs text-gray-400 font-medium">
                            ({part.questions.length} question{part.questions.length !== 1 ? 's' : ''})
                          </span>

                          {/* Space Before & After Part Controls */}
                          <div className="flex items-center gap-2 ml-2 bg-emerald-50/80 border border-emerald-200 rounded-lg px-2.5 py-1">
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs text-emerald-900 font-bold whitespace-nowrap" title="Blank spacing rows before Part header">
                                Space Before Part:
                              </label>
                              <select
                                value={part.beforeSpace !== undefined ? part.beforeSpace : 0}
                                onChange={(e) => handlePaperStructureSetPartBeforeSpace(partIdx, e.target.value)}
                                className="border border-emerald-300 rounded px-1.5 py-0.5 text-xs bg-white font-bold text-emerald-900 outline-none cursor-pointer focus:border-emerald-500"
                                title="Blank spacing rows before Part header"
                              >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                  <option key={n} value={n}>{n} {n === 1 ? 'row' : 'rows'}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-1.5 border-l border-emerald-200 pl-2">
                              <label className="text-xs text-emerald-900 font-bold whitespace-nowrap" title="Blank spacing rows after Part header">
                                Space After Part:
                              </label>
                              <select
                                value={part.afterSpace !== undefined ? part.afterSpace : 0}
                                onChange={(e) => handlePaperStructureSetPartAfterSpace(partIdx, e.target.value)}
                                className="border border-emerald-300 rounded px-1.5 py-0.5 text-xs bg-white font-bold text-emerald-900 outline-none cursor-pointer focus:border-emerald-500"
                                title="Blank spacing rows after Part header"
                              >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                  <option key={n} value={n}>{n} {n === 1 ? 'row' : 'rows'}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        {paperStructureParts.length > 1 && (
                          <button
                            onClick={() => handlePaperStructureRemovePart(partIdx)}
                            className="flex items-center gap-1 px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold"
                          >
                            <X size={14} /> Remove Part
                          </button>
                        )}
                      </div>
                    )}

                    {/* Questions within this part */}
                    <div className="space-y-2">
                      {part.questions.map((q, qIdx) => {
                        let displayQNum = qIdx + 1
                        for (let p = 0; p < partIdx; p++) {
                          displayQNum += paperStructureParts[p].questions.length
                        }
                        return (
                          <div key={qIdx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-700">Question {displayQNum}</span>
                                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 cursor-pointer select-none hover:bg-amber-100 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(q.hasQuestionOr)}
                                    onChange={() => handlePaperStructureToggleQuestionOr(partIdx, qIdx)}
                                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span>Question &apos;OR&apos; Alternative</span>
                                </label>
                              </div>
                              {part.questions.length > 1 && (
                                <button
                                  onClick={() => handlePaperStructureRemoveQuestion(partIdx, qIdx)}
                                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-red-500 hover:bg-red-50 rounded text-[11px] font-bold"
                                >
                                  <Minus size={12} /> Remove
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Sub-Qs:</label>
                                <select
                                  value={q.subCount}
                                  onChange={(e) => handlePaperStructureSetSubCount(partIdx, qIdx, e.target.value)}
                                  className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white font-bold w-14"
                                >
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                              {q.subCount > 1 && (
                                <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
                                  <label className="text-xs text-gray-500 font-medium whitespace-nowrap">All Sub-Q Spacing:</label>
                                  <select
                                    value={Array.isArray(q.subSpaceRows) ? (q.subSpaceRows[0] ?? 0) : (q.subSpaceRows !== undefined ? q.subSpaceRows : (q.spaceRows !== undefined ? q.spaceRows : 0))}
                                    onChange={(e) => handlePaperStructureSetSubSpaceRows(partIdx, qIdx, e.target.value)}
                                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white font-bold text-gray-700 cursor-pointer outline-none focus:border-emerald-500"
                                  >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                      <option key={n} value={n}>{n} {n === 1 ? 'row' : 'rows'}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
                                <label className="text-xs text-emerald-800 font-extrabold whitespace-nowrap">Q-to-Q Spacing:</label>
                                <select
                                  value={q.qSpaceRows !== undefined ? q.qSpaceRows : (q.spaceRows !== undefined ? q.spaceRows : 1)}
                                  onChange={(e) => handlePaperStructureSetQSpaceRows(partIdx, qIdx, e.target.value)}
                                  className="border border-emerald-300 rounded-lg px-2 py-1 text-xs bg-emerald-50 font-extrabold text-emerald-900 cursor-pointer outline-none focus:border-emerald-500 shadow-2xs"
                                >
                                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                    <option key={n} value={n}>{n} {n === 1 ? 'row' : 'rows'}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {q.marks.map((m, sIdx) => {
                                  const subLetter = String.fromCharCode(97 + sIdx)
                                  const currentBloom = q.blooms && q.blooms[sIdx] ? q.blooms[sIdx] : ''
                                  const subSpaceVal = Array.isArray(q.subSpaceRows)
                                    ? (q.subSpaceRows[sIdx] !== undefined ? q.subSpaceRows[sIdx] : 0)
                                    : (q.subSpaceRows !== undefined ? q.subSpaceRows : 0)

                                  return (
                                    <div key={sIdx} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1 shadow-2xs">
                                      {q.subCount > 1 && <span className="text-xs font-extrabold text-emerald-800">{subLetter}.</span>}
                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px] text-gray-400 font-medium">Marks:</span>
                                        <input
                                          type="number"
                                          value={m}
                                          onChange={(e) => handlePaperStructureSetMark(partIdx, qIdx, sIdx, e.target.value)}
                                          className="border border-gray-300 rounded px-1 py-0.5 text-xs w-12 text-center font-bold focus:border-emerald-500 outline-none"
                                          min="0"
                                          max={assessment.maxMarks || 200}
                                        />
                                      </div>
                                      <div className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2">
                                        <span className="text-[11px] text-gray-400 font-medium">Bloom:</span>
                                        <select
                                          value={currentBloom}
                                          onChange={(e) => handlePaperStructureSetBloom(partIdx, qIdx, sIdx, e.target.value)}
                                          className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-gray-50 font-bold text-emerald-800 focus:border-emerald-500 outline-none cursor-pointer"
                                        >
                                          <option value="">—</option>
                                          {BLOOM_OPTIONS.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Sub-Q OR toggle */}
                                      <label className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2 cursor-pointer select-none text-[11px] font-bold text-amber-800" title={`Add alternative choice OR row for ${q.subCount > 1 ? `sub-question ${subLetter}.` : 'this question'}`}>
                                        <input
                                          type="checkbox"
                                          checked={Boolean(q.subHasOr && q.subHasOr[sIdx])}
                                          onChange={() => handlePaperStructureToggleSubOr(partIdx, qIdx, sIdx)}
                                          className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <span>OR</span>
                                      </label>

                                      {/* Sub-Q Alt Bloom when OR is enabled */}
                                      {q.subHasOr && q.subHasOr[sIdx] && (
                                        <div className="flex items-center gap-1 ml-1 border-l border-amber-200 pl-2 bg-amber-50/70 rounded px-1 py-0.5">
                                          <span className="text-[10px] text-amber-700 font-bold">Alt Bloom:</span>
                                          <select
                                            value={(q.subOrBlooms && q.subOrBlooms[sIdx]) ? q.subOrBlooms[sIdx] : currentBloom}
                                            onChange={(e) => handlePaperStructureSetSubOrBloom(partIdx, qIdx, sIdx, e.target.value)}
                                            className="border border-amber-300 rounded px-1 py-0.5 text-[11px] bg-white font-bold text-amber-800 focus:border-amber-500 outline-none cursor-pointer"
                                          >
                                            <option value="">—</option>
                                            {BLOOM_OPTIONS.map(b => (
                                              <option key={b} value={b}>{b}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}

                                      {/* Sub-Q OR Spacing controls */}
                                      {q.subHasOr && q.subHasOr[sIdx] && (
                                        <div className="flex items-center gap-1 ml-1 border-l border-amber-200 pl-2 bg-amber-50/70 rounded px-1.5 py-0.5">
                                          <span className="text-[10px] text-amber-800 font-bold" title="Spacing rows before / after OR">OR Space:</span>
                                          <select
                                            value={Array.isArray(q.subOrBeforeSpace) ? (q.subOrBeforeSpace[sIdx] ?? 0) : (q.subOrBeforeSpace !== undefined ? q.subOrBeforeSpace : 0)}
                                            onChange={(e) => handlePaperStructureSetSubOrBeforeSpace(partIdx, qIdx, sIdx, e.target.value)}
                                            className="border border-amber-300 rounded px-1 py-0.5 text-[10px] bg-white font-bold text-amber-900 outline-none cursor-pointer"
                                            title="Blank rows before Sub-Q OR"
                                          >
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                              <option key={n} value={n}>bef: {n}</option>
                                            ))}
                                          </select>
                                          <select
                                            value={Array.isArray(q.subOrAfterSpace) ? (q.subOrAfterSpace[sIdx] ?? 0) : (q.subOrAfterSpace !== undefined ? q.subOrAfterSpace : 0)}
                                            onChange={(e) => handlePaperStructureSetSubOrAfterSpace(partIdx, qIdx, sIdx, e.target.value)}
                                            className="border border-amber-300 rounded px-1 py-0.5 text-[10px] bg-white font-bold text-amber-900 outline-none cursor-pointer"
                                            title="Blank rows after Sub-Q OR"
                                          >
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                              <option key={n} value={n}>aft: {n}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}

                                      {/* Per Sub-Q Spacing option after this specific Sub-Q */}
                                      {q.subCount > 1 && sIdx < q.marks.length - 1 && (
                                        <div className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2">
                                          <span className="text-[11px] text-gray-500 font-bold">Space after {subLetter}.:</span>
                                          <select
                                            value={subSpaceVal}
                                            onChange={(e) => handlePaperStructureSetIndividualSubSpaceRows(partIdx, qIdx, sIdx, e.target.value)}
                                            className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white font-bold text-gray-700 focus:border-emerald-500 outline-none cursor-pointer"
                                            title={`Set blank spacing row(s) after sub-question ${subLetter}.`}
                                          >
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                              <option key={n} value={n}>{n} {n === 1 ? 'row' : 'rows'}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Question-level OR alternative section */}
                              {q.hasQuestionOr && (
                                <div className="w-full mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                                      <span className="px-1.5 py-0.5 bg-amber-200/80 rounded text-[10px] uppercase tracking-wide">Question OR</span>
                                      <span>Alternative Question Set ({q.subCount > 1 ? `${q.subCount} Sub-Questions` : 'Single Question'})</span>
                                    </div>
                                    <span className="text-[11px] text-amber-700 font-medium">Marks match primary ({q.marks.reduce((s, m) => s + (parseInt(m) || 0), 0)} pts)</span>
                                  </div>

                                  {/* OR Spacing Controls */}
                                  <div className="flex items-center gap-4 flex-wrap bg-white/70 p-2 rounded-lg border border-amber-200">
                                    <div className="flex items-center gap-1.5">
                                      <label className="text-xs text-amber-900 font-bold whitespace-nowrap">Space Before OR:</label>
                                      <select
                                        value={q.qOrBeforeSpace !== undefined ? q.qOrBeforeSpace : 0}
                                        onChange={(e) => handlePaperStructureSetQuestionOrBeforeSpace(partIdx, qIdx, e.target.value)}
                                        className="border border-amber-300 rounded px-2 py-0.5 text-xs bg-white font-bold text-amber-900 outline-none cursor-pointer focus:border-amber-500"
                                        title="Blank spacing rows between primary questions and the OR row"
                                      >
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                          <option key={n} value={n}>{n} {n === 1 ? 'row' : 'rows'}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-1.5 border-l border-amber-200 pl-3">
                                      <label className="text-xs text-amber-900 font-bold whitespace-nowrap">Space After OR:</label>
                                      <select
                                        value={q.qOrAfterSpace !== undefined ? q.qOrAfterSpace : 0}
                                        onChange={(e) => handlePaperStructureSetQuestionOrAfterSpace(partIdx, qIdx, e.target.value)}
                                        className="border border-amber-300 rounded px-2 py-0.5 text-xs bg-white font-bold text-amber-900 outline-none cursor-pointer focus:border-amber-500"
                                        title="Blank spacing rows between the OR row and alternative questions"
                                      >
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                          <option key={n} value={n}>{n} {n === 1 ? 'row' : 'rows'}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-amber-800 leading-snug">
                                    A bold centered <strong>OR</strong> row will be placed after Question {displayQNum}, followed by an alternate set of questions matching the marks and letterings.
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap pt-1">
                                    {q.marks.map((m, sIdx) => {
                                      const subLetter = String.fromCharCode(97 + sIdx)
                                      const altBloom = (q.questionOrBlooms && q.questionOrBlooms[sIdx]) ? q.questionOrBlooms[sIdx] : (q.blooms && q.blooms[sIdx] ? q.blooms[sIdx] : '')
                                      return (
                                        <div key={sIdx} className="flex items-center gap-1 bg-white border border-amber-200 rounded px-2 py-0.5 text-xs">
                                          {q.subCount > 1 && <span className="font-bold text-amber-900">{subLetter}.</span>}
                                          <span className="text-[10px] text-gray-500">Alt Bloom:</span>
                                          <select
                                            value={altBloom}
                                            onChange={(e) => handlePaperStructureSetQuestionOrBloom(partIdx, qIdx, sIdx, e.target.value)}
                                            className="border border-gray-300 rounded px-1 py-0.5 text-[11px] bg-amber-50 font-bold text-amber-900 outline-none cursor-pointer"
                                          >
                                            <option value="">—</option>
                                            {BLOOM_OPTIONS.map(b => (
                                              <option key={b} value={b}>{b}</option>
                                            ))}
                                          </select>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => handlePaperStructureAddQuestion(partIdx)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100"
                    >
                      <Plus size={14} /> Add Question
                    </button>
                  </div>
                ))}

                {/* Add Part Button (Final Exams Only) */}
                {!isNoParts && (
                  <button
                    onClick={handlePaperStructureAddPart}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 w-full justify-center"
                  >
                    <Plus size={16} /> Add New Part
                  </button>
                )}

                {/* Total Marks Summary */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-emerald-800">Total Marks</span>
                    <span className="block text-[11px] text-emerald-600 font-medium">(Alternative &apos;OR&apos; choices are excluded from cumulative marks)</span>
                  </div>
                  <span className="text-base font-extrabold text-emerald-700">
                    {paperStructureParts.reduce((sum, p) => sum + p.questions.reduce((qs, q) => qs + q.marks.reduce((ms, m) => ms + (parseInt(m) || 0), 0), 0), 0)}
                  </span>
                </div>

                {/* Live Preview */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Live Table Preview (Exact format that will be inserted)</span>
                  <div
                    className="p-4 bg-white border border-emerald-200 rounded-xl shadow-inner overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: generateExamPaperStructureHtml(paperStructureParts, questions) }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex justify-end gap-2.5 flex-shrink-0">
                <button
                  onClick={() => setShowPaperStructureModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertPaperStructure}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus size={16} /> {isEditingExistingTable ? 'Update Paper Structure (Preserve Text)' : 'Insert Paper Structure into Question Paper'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 💻 Code Snippet Generator Modal (C++, Python, C, Pseudocode) */}
      {showCodeSnippetModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-200 max-w-4xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" style={{ maxHeight: '92vh' }}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-800 text-white px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/15 rounded-lg border border-white/20">
                    <Terminal size={20} className="text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">
                      {editingCodeElement ? 'Edit Question Code Snippet' : 'Programming Code Snippet Generator'}
                    </h3>
                    <p className="text-xs text-emerald-200">
                      Formatted C++, C, Python & Pseudocode Blocks for University Exam Papers
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCodeSnippetModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors text-emerald-100 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                {/* Language Selection Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-700 mr-2">Language:</span>
                    {[
                      { id: 'cpp', label: 'C++', icon: '⚡' },
                      { id: 'c', label: 'C', icon: '🔹' },
                      { id: 'python', label: 'Python', icon: '🐍' },
                      { id: 'pseudocode', label: 'Pseudocode', icon: '📋' }
                    ].map(lang => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => handleSelectCodeLanguage(lang.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          codeLanguage === lang.id
                            ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-sm ring-1 ring-emerald-800'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span>{lang.icon}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Preset / Template Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">Preset:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleSelectCodePreset(e.target.value)
                      }}
                      className="border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-gray-800 focus:ring-2 focus:ring-emerald-500 max-w-[220px]"
                    >
                      <option value="">-- Choose Template --</option>
                      {(CODE_SNIPPET_PRESETS[codeLanguage] || []).map((preset, idx) => (
                        <option key={idx} value={preset.code}>
                          {preset.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Styling & Alignment Controls (Core User Customization) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs text-xs">
                  {/* Alignment Control (Centered vs Left) */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-700">Block Alignment</label>
                    <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => setCodeAlignment('center')}
                        className={`flex-1 py-1 px-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                          codeAlignment === 'center'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Center the code block on the question paper"
                      >
                        <AlignCenter size={13} />
                        Center
                      </button>
                      <button
                        type="button"
                        onClick={() => setCodeAlignment('left')}
                        className={`flex-1 py-1 px-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                          codeAlignment === 'left'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Align code block to the left margin"
                      >
                        <AlignLeft size={13} />
                        Left
                      </button>
                    </div>
                  </div>

                  {/* Exam Border Option (With Border vs No Border) */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-700">Exam Border Option</label>
                    <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => {
                          setCodeHasBorder(true)
                          setCodeBoxStyle('exam')
                        }}
                        className={`flex-1 py-1 px-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          codeHasBorder
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Include 1px solid black border around code box"
                      >
                        <Square size={13} />
                        With Border
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCodeHasBorder(false)
                          setCodeBoxStyle('borderless')
                        }}
                        className={`flex-1 py-1 px-2 rounded-md font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          !codeHasBorder
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Borderless clean text"
                      >
                        <Minus size={13} />
                        No Border
                      </button>
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-700">Font Size</label>
                    <select
                      value={codeFontSize}
                      onChange={(e) => setCodeFontSize(e.target.value)}
                      className="w-full border border-gray-300 p-1.5 rounded-lg bg-white font-semibold text-xs"
                    >
                      <option value="10pt">10pt (Compact Exam Size)</option>
                      <option value="11pt">11pt (Standard University Size)</option>
                      <option value="12pt">12pt (Large & Readable)</option>
                    </select>
                  </div>

                  {/* Line Numbers Toggle */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-700">Line Numbers</label>
                    <button
                      type="button"
                      onClick={() => setCodeShowLineNumbers(!codeShowLineNumbers)}
                      className={`w-full py-1.5 px-2.5 rounded-lg font-bold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                        codeShowLineNumbers
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-gray-50 border-gray-300 text-gray-600'
                      }`}
                    >
                      <ListOrdered size={14} className={codeShowLineNumbers ? 'text-emerald-700' : 'text-gray-400'} />
                      <span>{codeShowLineNumbers ? 'Line Numbers: ON' : 'Line Numbers: OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* Code Textarea with Smart Tab / Indent Keyboard Handling */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Code Editor ({codeLanguage.toUpperCase()})
                      </span>
                      <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                        {codeContent.split('\n').length} lines
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-emerald-700 font-medium hidden sm:inline mr-1">
                        💡 <strong>Tab</strong> indents 4 spaces · <strong>Enter</strong> auto-indents
                      </span>

                      {/* Undo Button (Ctrl+Z) */}
                      <button
                        type="button"
                        disabled={!canCodeUndo}
                        onClick={handleCodeUndo}
                        className="px-2.5 py-1 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 border border-gray-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo2 size={13} className={canCodeUndo ? "text-gray-700" : "text-gray-400"} />
                        <span>Undo</span>
                      </button>

                      {/* Redo Button (Ctrl+Y / Ctrl+Shift+Z) */}
                      <button
                        type="button"
                        disabled={!canCodeRedo}
                        onClick={handleCodeRedo}
                        className="px-2.5 py-1 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 border border-gray-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                        title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
                      >
                        <Redo2 size={13} className={canCodeRedo ? "text-gray-700" : "text-gray-400"} />
                        <span>Redo</span>
                      </button>

                      {/* Formal Smart Format Button */}
                      <button
                        type="button"
                        onClick={handleSmartFormatCode}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        title="Auto-format squished single-line code and align 4-space indentation (Ctrl+Shift+F)"
                      >
                        <AlignLeft size={13} className="text-emerald-700" />
                        <span>Smart Format</span>
                      </button>

                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={handleCopyCodeToClipboard}
                        className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        title="Copy code to clipboard"
                      >
                        <Copy size={12} />
                        {copiedCodeNotice ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {formatNotice && (
                    <div className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 animate-in fade-in duration-150">
                      <span>{formatNotice}</span>
                    </div>
                  )}

                  <textarea
                    ref={codeTextareaRef}
                    rows={8}
                    value={codeContent}
                    onChange={handleCodeTextareaChange}
                    onKeyDown={handleCodeTextareaKeyDown}
                    onPaste={(e) => {
                      const text = e.clipboardData?.getData('text')
                      if (text && isCodeLikelySingleLine(text)) {
                        e.preventDefault()
                        pushCodeHistorySnapshot(codeContent)
                        const formatted = smartFormatCode(text, codeLanguage)
                        const textarea = e.target
                        const start = textarea.selectionStart
                        const end = textarea.selectionEnd
                        const val = textarea.value
                        const newVal = val.substring(0, start) + formatted + val.substring(end)
                        textarea.value = newVal
                        textarea.selectionStart = textarea.selectionEnd = start + formatted.length
                        setCodeContent(newVal)
                        setFormatNotice('Auto-oriented and indented single-line code with 4 spaces.')
                        setTimeout(() => setFormatNotice(''), 2500)
                      }
                    }}
                    placeholder={`Type or paste your ${codeLanguage} code here...`}
                    spellCheck={false}
                    className="w-full border border-gray-300 p-3 rounded-xl bg-[#fafafa] focus:bg-white text-gray-900 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-inner"
                    style={{ tabSize: 4, whiteSpace: 'pre' }}
                  />
                </div>

                {/* Live Exam Paper Layout Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Live Question Paper Preview ({codeAlignment === 'center' ? 'Centered Layout' : 'Left Aligned'})
                    </span>
                    <button
                      type="button"
                      disabled={smartOutputLoading || !codeContent.trim()}
                      onClick={() => handleRunSmartOutput()}
                      className="px-3 py-1.5 bg-gray-900 hover:bg-black active:bg-gray-800 text-white border border-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Simulate code execution and predict stdout or compilation errors"
                    >
                      {smartOutputLoading ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-gray-300" />
                          <span>Simulating...</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} className="fill-current text-emerald-400" />
                          <span>Smart Output</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Smart Output Analysis Display Panel */}
                  {smartOutputLoading && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 animate-in fade-in">
                      <Loader2 size={16} className="animate-spin text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold">Simulating {codeLanguage.toUpperCase()} code execution...</span>
                        <span className="text-gray-500 text-[11px] block">Evaluating compiler semantics, stdout, and error checks</span>
                      </div>
                    </div>
                  )}

                  {smartOutputError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-800 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-rose-600 shrink-0" />
                        <span>{smartOutputError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSmartOutputError('')}
                        className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {smartOutputResult && (
                    <div className="p-3.5 bg-gray-900 rounded-xl text-white space-y-2.5 border border-emerald-500/40 shadow-md animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-1.5 border-b border-gray-800">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Terminal size={14} className="text-emerald-400" />
                          <span className="font-extrabold text-xs tracking-wide text-gray-100">
                            Smart Output ({codeLanguage.toUpperCase()})
                          </span>

                          {smartOutputResult.status === 'SUCCESS' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ✓ Normal Execution
                            </span>
                          )}
                          {smartOutputResult.status === 'COMPILATION_ERROR' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              ⚠ Compilation Error
                            </span>
                          )}
                          {smartOutputResult.status === 'RUNTIME_ERROR' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              ⚠ Runtime Error
                            </span>
                          )}
                          {smartOutputResult.status === 'PSEUDOCODE_RESULT' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              📋 Algorithm Result
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {smartOutputResult.output && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(smartOutputResult.output)
                                setCopiedOutputNotice(true)
                                setTimeout(() => setCopiedOutputNotice(false), 2000)
                              }}
                              className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border border-gray-700"
                              title="Copy predicted output to clipboard"
                            >
                              <Copy size={12} />
                              {copiedOutputNotice ? 'Copied!' : 'Copy Output'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSmartOutputResult(null)}
                            className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Close"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Console Output Block */}
                      <div className="bg-black/60 rounded-lg p-2.5 font-mono text-xs leading-relaxed border border-gray-800 max-h-36 overflow-y-auto">
                        {smartOutputResult.output ? (
                          <div className="text-emerald-400 whitespace-pre-wrap">{smartOutputResult.output}</div>
                        ) : (
                          <div className="text-rose-400 italic">
                            {smartOutputResult.errorType || 'Error'}: No console output produced (execution halted due to error).
                          </div>
                        )}
                      </div>

                      {/* Academic Explanation / Teacher Note */}
                      {smartOutputResult.explanation && (
                        <div className="text-[11px] text-gray-300 leading-relaxed bg-gray-800/60 rounded-lg p-2 border border-gray-700/60">
                          <strong className="text-emerald-300">Teacher's Note:</strong> {smartOutputResult.explanation}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4 bg-white border border-emerald-200 rounded-xl shadow-inner overflow-x-auto min-h-[90px]">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateCodeSnippetHtml({
                          code: codeContent,
                          language: codeLanguage,
                          alignment: codeAlignment,
                          hasBorder: codeHasBorder,
                          boxStyle: codeHasBorder ? 'exam' : 'borderless',
                          showLineNumbers: codeShowLineNumbers,
                          fontSize: codeFontSize
                        })
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-gray-500 italic">
                  Tip: In the question paper, double-click any code snippet anytime to re-edit it.
                </span>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCodeSnippetModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertCodeSnippet}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Plus size={16} />
                    {editingCodeElement ? 'Update Code Snippet in Paper' : 'Insert Code Snippet into Question Paper'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* 💻 Floating Quick Toolbar for Selected Code Block */}
      {selectedCodeBlockInfo && (
        <ModalPortal>
          <div
            className="fixed z-[999999] flex items-center gap-1.5 bg-gray-900/95 text-white px-3 py-1.5 rounded-full shadow-2xl border border-gray-700 text-xs font-semibold backdrop-blur-xs animate-in fade-in zoom-in duration-150"
            style={{
              top: Math.max(10, selectedCodeBlockInfo.rect.top - 42),
              left: Math.max(10, Math.min(window.innerWidth - 320, selectedCodeBlockInfo.rect.left + (selectedCodeBlockInfo.rect.width / 2) - 150))
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                const container = selectedCodeBlockInfo.element
                const encoded = container.getAttribute('data-code') || ''
                const lang = container.getAttribute('data-language') || 'cpp'
                const align = container.getAttribute('data-align') || 'center'
                const hasBrd = container.getAttribute('data-hasborder') !== 'false'
                const lineNums = container.getAttribute('data-linenumbers') === 'true'
                const fontSz = container.getAttribute('data-fontsize') || '11pt'
                let rawCode = ''
                if (encoded) {
                  try { rawCode = decodeURIComponent(encoded) } catch (err) { rawCode = container.textContent || '' }
                } else {
                  rawCode = container.textContent || ''
                }
                setSelectedCodeBlockInfo(null)
                handleOpenCodeSnippetModal({
                  code: rawCode,
                  language: lang,
                  alignment: align,
                  hasBorder: hasBrd,
                  showLineNumbers: lineNums,
                  fontSize: fontSz,
                  element: container
                })
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-gray-800 text-gray-200 hover:text-white transition cursor-pointer"
              title="Edit code snippet"
            >
              <Edit3 size={13} className="text-emerald-400" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const container = selectedCodeBlockInfo.element
                const encoded = container.getAttribute('data-code') || ''
                const lang = container.getAttribute('data-language') || 'cpp'
                const align = container.getAttribute('data-align') || 'center'
                const hasBrd = container.getAttribute('data-hasborder') !== 'false'
                const lineNums = container.getAttribute('data-linenumbers') === 'true'
                const fontSz = container.getAttribute('data-fontsize') || '11pt'
                let rawCode = ''
                if (encoded) {
                  try { rawCode = decodeURIComponent(encoded) } catch (err) { rawCode = container.textContent || '' }
                } else {
                  rawCode = container.textContent || ''
                }
                setSelectedCodeBlockInfo(null)
                handleOpenCodeSnippetModal({
                  code: rawCode,
                  language: lang,
                  alignment: align,
                  hasBorder: hasBrd,
                  showLineNumbers: lineNums,
                  fontSize: fontSz,
                  element: container
                }, true)
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-gray-800 text-gray-200 hover:text-white transition cursor-pointer"
              title="Simulate execution & predict stdout or compilation errors with Smart Output"
            >
              <Play size={11} className="fill-current text-emerald-400" />
              <span>Output</span>
            </button>

            <span className="text-gray-600">|</span>

            <button
              type="button"
              onClick={handleToggleSelectedCodeBorder}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-gray-800 text-gray-200 hover:text-white transition cursor-pointer"
              title="Toggle 1px solid border"
            >
              <Square size={13} className={selectedCodeBlockInfo.hasBorder ? "text-emerald-400" : "text-gray-400"} />
              <span>{selectedCodeBlockInfo.hasBorder ? 'Border: On' : 'Border: Off'}</span>
            </button>

            <span className="text-gray-600">|</span>

            <button
              type="button"
              onClick={handleDeleteSelectedCodeBlock}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-red-900/80 text-red-300 hover:text-red-100 transition cursor-pointer"
              title="Delete block (Or press Delete / Backspace key)"
            >
              <Trash2 size={13} className="text-red-400" />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const editArea = rteRef.current?.contentModule?.getEditPanel ? rteRef.current.contentModule.getEditPanel() : null
                if (editArea) {
                  editArea.querySelectorAll('.obe-code-snippet-container').forEach(c => c.removeAttribute('data-selected'))
                }
                setSelectedCodeBlockInfo(null)
              }}
              className="ml-1 p-0.5 text-gray-400 hover:text-white rounded hover:bg-gray-800 cursor-pointer"
              title="Deselect"
            >
              <X size={13} />
            </button>
          </div>
        </ModalPortal>
      )}

      {/* 🧮 Upgraded Mathematical Equation Creator (Interactive AI + Presets + Symbols) */}
      {(showEquationModal || showAiEquationModal) && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
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

              {/* ═══════ SECTION 3.5: Interactive Matrix Builder ═══════ */}
              <div className="space-y-2">
                <span className="font-extrabold text-gray-700 text-xs uppercase tracking-wider">📐 Matrix Builder — Custom Size</span>
                <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-3">
                  {/* Matrix Size & Bracket Controls */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-600">Size:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={visualMatrix.rows}
                        onChange={(e) => handleUpdateVisualMatrixDims(e.target.value, visualMatrix.cols)}
                        className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-xs text-center font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none"
                      />
                      <span className="text-xs font-bold text-gray-400">×</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={visualMatrix.cols}
                        onChange={(e) => handleUpdateVisualMatrixDims(visualMatrix.rows, e.target.value)}
                        className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-xs text-center font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-gray-600">Brackets:</span>
                      {[
                        { id: 'bmatrix', label: '[ ]', title: 'Square Brackets' },
                        { id: 'pmatrix', label: '( )', title: 'Parentheses' },
                        { id: 'Bmatrix', label: '{ }', title: 'Curly Braces' },
                        { id: 'vmatrix', label: '| |', title: 'Vertical Bars (Determinant)' },
                        { id: 'Vmatrix', label: '‖ ‖', title: 'Double Vertical Bars' },
                        { id: 'matrix', label: 'none', title: 'No Brackets' },
                      ].map(br => (
                        <button
                          key={br.id}
                          type="button"
                          title={br.title}
                          onClick={() => {
                            // Regenerate LaTeX with chosen bracket type
                            const rowStrings = visualMatrix.cells.map(row => row.join(' & '))
                            setAiEquationLatex(`\\begin{${br.id}}\n${rowStrings.join(' \\\\\n')}\n\\end{${br.id}}`)
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            aiEquationLatex.includes(`\\begin{${br.id}}`) 
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-emerald-50 hover:border-emerald-300'
                          }`}
                        >
                          {br.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          const rows = visualMatrix.rows
                          const cols = visualMatrix.cols
                          const zeroCells = Array.from({ length: rows }, () => Array(cols).fill('0'))
                          setVisualMatrix({ rows, cols, cells: zeroCells })
                          const rowStrings = zeroCells.map(row => row.join(' & '))
                          setAiEquationLatex(`\\begin{bmatrix}\n${rowStrings.join(' \\\\\n')}\n\\end{bmatrix}`)
                        }}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded text-[10px] font-bold transition-colors"
                      >
                        Fill 0s
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rows = visualMatrix.rows
                          const cols = visualMatrix.cols
                          const identityCells = Array.from({ length: rows }, (_, r) =>
                            Array.from({ length: cols }, (_, c) => r === c ? '1' : '0')
                          )
                          setVisualMatrix({ rows, cols, cells: identityCells })
                          const rowStrings = identityCells.map(row => row.join(' & '))
                          setAiEquationLatex(`\\begin{bmatrix}\n${rowStrings.join(' \\\\\n')}\n\\end{bmatrix}`)
                        }}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 rounded text-[10px] font-bold transition-colors"
                      >
                        Identity
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rows = visualMatrix.rows
                          const cols = visualMatrix.cols
                          const emptyCells = Array.from({ length: rows }, () => Array(cols).fill(''))
                          setVisualMatrix({ rows, cols, cells: emptyCells })
                          const rowStrings = emptyCells.map(row => row.join(' & '))
                          setAiEquationLatex(`\\begin{bmatrix}\n${rowStrings.join(' \\\\\n')}\n\\end{bmatrix}`)
                        }}
                        className="px-2 py-0.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded text-[10px] font-bold transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Matrix Cell Grid */}
                  <div className="overflow-x-auto">
                    <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${visualMatrix.cols}, minmax(40px, 1fr))` }}>
                      {visualMatrix.cells.map((row, rIdx) =>
                        row.map((cell, cIdx) => (
                          <input
                            key={`${rIdx}-${cIdx}`}
                            type="text"
                            value={cell}
                            onChange={(e) => handleUpdateVisualMatrixCell(rIdx, cIdx, e.target.value)}
                            placeholder={`r${rIdx + 1}c${cIdx + 1}`}
                            className="w-full min-w-[40px] border border-gray-300 rounded px-1.5 py-1 text-xs text-center font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none placeholder:text-gray-300"
                          />
                        ))
                      )}
                    </div>
                  </div>
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
            <div className="px-6 py-3.5 bg-white border-t border-gray-100 flex justify-between items-center flex-shrink-0">
              {editingEquationElement ? (
                <button
                  type="button"
                  onClick={() => {
                    editingEquationElement.remove()
                    setEditingEquationElement(null)
                    setShowEquationModal(false)
                    setShowAiEquationModal(false)
                    const editor = rteRef.current
                    if (editor?.formatter?.saveData) editor.formatter.saveData()
                    if (editor?.contentModule?.getEditPanel) {
                      const newHtml = editor.contentModule.getEditPanel().innerHTML
                      setEditorValue(newHtml)
                      if (typeof editor.value !== 'undefined') editor.value = newHtml
                    }
                  }}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 size={15} /> Delete Equation
                </button>
              ) : <div />}
              <div className="flex gap-2.5">
                <button onClick={() => { setShowEquationModal(false); setShowAiEquationModal(false); setEditingEquationElement(null); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleInsertAiEquation} className="px-5 py-2 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-950 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-emerald-950/20">
                  <Plus size={16} /> {editingEquationElement ? 'Update Equation' : 'Insert Equation into Question Paper'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* Table, Multi-level List & Equation Alignment CSS */}
      {/* Side-by-Side Question Comparison Inspection Modal (Portaled to document.body for guaranteed top visibility) */}
      {comparisonModalData && createPortal(
        <div className="fixed inset-0 z-[1000005] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn font-sans">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                  <ShieldCheck size={20} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Question Similarity Inspection</h3>
                  <p className="text-xs text-emerald-200 font-medium">Comparing against {comparisonModalData.archiveInfo}</p>
                </div>
              </div>
              <button
                onClick={() => setComparisonModalData(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Side-by-Side Columns */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Score Banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-700">Semantic Content Overlap</span>
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                  comparisonModalData.similarity > 60
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : comparisonModalData.similarity > 30
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}>
                  {comparisonModalData.similarity}% Match
                </span>
              </div>

              {/* Side-by-Side Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Question Column */}
                <div className="border border-emerald-200 rounded-xl p-4 space-y-3 bg-emerald-50/20 shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-2 border-emerald-200">
                    <span className="font-extrabold text-xs text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Current Draft Question
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {comparisonModalData.currentQ}
                  </div>
                </div>

                {/* Archived Question Column */}
                <div className="border border-indigo-200 rounded-xl p-4 space-y-3 bg-indigo-50/20 shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-2 border-indigo-200">
                    <span className="font-extrabold text-xs text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Archived Question ({comparisonModalData.archiveInfo})
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {comparisonModalData.archivedQ}
                  </div>
                </div>
              </div>

              {/* AI Explanation Box */}
              {comparisonModalData.explanation && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                    <Sparkles size={15} className="text-amber-600" />
                    AI Concept Analysis & Teacher Guidance
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    {comparisonModalData.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setComparisonModalData(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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

        /* Multi-Level List Hierarchy Styling (36px Tab Indent to prevent overflow) */
        .e-richtexteditor .e-rte-content ol,
        .question-paper-preview ol {
          margin-top: 6px !important;
          margin-bottom: 6px !important;
          padding-left: 36px !important;
          list-style-type: decimal !important;
          list-style-position: outside !important;
        }
        .e-richtexteditor .e-rte-content ol > li,
        .question-paper-preview ol > li {
          list-style-type: inherit !important;
        }

        .e-richtexteditor .e-rte-content ol ol,
        .question-paper-preview ol ol {
          list-style-type: lower-alpha !important;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
          padding-left: 28px !important;
        }
        .e-richtexteditor .e-rte-content ol ol > li,
        .question-paper-preview ol ol > li {
          list-style-type: inherit !important;
        }

        .e-richtexteditor .e-rte-content ol ol ol,
        .question-paper-preview ol ol ol {
          list-style-type: lower-roman !important;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
          padding-left: 28px !important;
        }
        .e-richtexteditor .e-rte-content ol ol ol > li,
        .question-paper-preview ol ol ol > li {
          list-style-type: inherit !important;
        }

        .e-richtexteditor .e-rte-content ol ol ol ol,
        .question-paper-preview ol ol ol ol {
          list-style-type: upper-alpha !important;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
          padding-left: 28px !important;
        }
        .e-richtexteditor .e-rte-content ol ol ol ol > li,
        .question-paper-preview ol ol ol ol > li {
          list-style-type: inherit !important;
        }

        /* Explicit Numbered List Format Overrides */
        .e-richtexteditor .e-rte-content ol[style*="lower-alpha"],
        .e-richtexteditor .e-rte-content ol.e-list-lower-alpha,
        .e-richtexteditor .e-rte-content ol[style*="lower-alpha"] li,
        .e-richtexteditor .e-rte-content ol.e-list-lower-alpha li,
        .e-richtexteditor .e-rte-content li[style*="lower-alpha"],
        .question-paper-preview ol[style*="lower-alpha"],
        .question-paper-preview ol.e-list-lower-alpha,
        .question-paper-preview ol[style*="lower-alpha"] li,
        .question-paper-preview li[style*="lower-alpha"] {
          list-style-type: lower-alpha !important;
        }

        .e-richtexteditor .e-rte-content ol[style*="upper-alpha"],
        .e-richtexteditor .e-rte-content ol.e-list-upper-alpha,
        .e-richtexteditor .e-rte-content ol[style*="upper-alpha"] li,
        .e-richtexteditor .e-rte-content ol.e-list-upper-alpha li,
        .e-richtexteditor .e-rte-content li[style*="upper-alpha"],
        .question-paper-preview ol[style*="upper-alpha"],
        .question-paper-preview ol.e-list-upper-alpha,
        .question-paper-preview ol[style*="upper-alpha"] li,
        .question-paper-preview li[style*="upper-alpha"] {
          list-style-type: upper-alpha !important;
        }

        .e-richtexteditor .e-rte-content ol[style*="lower-roman"],
        .e-richtexteditor .e-rte-content ol.e-list-lower-roman,
        .e-richtexteditor .e-rte-content ol[style*="lower-roman"] li,
        .e-richtexteditor .e-rte-content ol.e-list-lower-roman li,
        .e-richtexteditor .e-rte-content li[style*="lower-roman"],
        .question-paper-preview ol[style*="lower-roman"],
        .question-paper-preview ol.e-list-lower-roman,
        .question-paper-preview ol[style*="lower-roman"] li,
        .question-paper-preview li[style*="lower-roman"] {
          list-style-type: lower-roman !important;
        }

        .e-richtexteditor .e-rte-content ol[style*="upper-roman"],
        .e-richtexteditor .e-rte-content ol.e-list-upper-roman,
        .e-richtexteditor .e-rte-content ol[style*="upper-roman"] li,
        .e-richtexteditor .e-rte-content ol.e-list-upper-roman li,
        .e-richtexteditor .e-rte-content li[style*="upper-roman"],
        .question-paper-preview ol[style*="upper-roman"],
        .question-paper-preview ol.e-list-upper-roman,
        .question-paper-preview ol[style*="upper-roman"] li,
        .question-paper-preview li[style*="upper-roman"] {
          list-style-type: upper-roman !important;
        }

        .e-richtexteditor .e-rte-content ol[style*="lower-greek"],
        .e-richtexteditor .e-rte-content ol.e-list-lower-greek,
        .e-richtexteditor .e-rte-content ol[style*="lower-greek"] li,
        .e-richtexteditor .e-rte-content ol.e-list-lower-greek li,
        .e-richtexteditor .e-rte-content li[style*="lower-greek"],
        .question-paper-preview ol[style*="lower-greek"],
        .question-paper-preview ol.e-list-lower-greek,
        .question-paper-preview ol[style*="lower-greek"] li,
        .question-paper-preview li[style*="lower-greek"] {
          list-style-type: lower-greek !important;
        }

        .e-richtexteditor .e-rte-content ol[style*="decimal"],
        .e-richtexteditor .e-rte-content ol.e-list-decimal,
        .e-richtexteditor .e-rte-content ol[style*="decimal"] li,
        .e-richtexteditor .e-rte-content ol.e-list-decimal li,
        .e-richtexteditor .e-rte-content li[style*="decimal"],
        .question-paper-preview ol[style*="decimal"],
        .question-paper-preview ol.e-list-decimal,
        .question-paper-preview ol[style*="decimal"] li,
        .question-paper-preview li[style*="decimal"] {
          list-style-type: decimal !important;
        }

        /* Base Unordered List Defaults & Overrides in RTE and Preview */
        .e-richtexteditor .e-rte-content ul,
        .question-paper-preview ul {
          margin-top: 6px !important;
          margin-bottom: 6px !important;
          padding-left: 36px !important;
          list-style-type: disc !important;
          list-style-position: outside !important;
        }
        .e-richtexteditor .e-rte-content ul > li,
        .question-paper-preview ul > li {
          list-style-type: inherit !important;
        }
        .e-richtexteditor .e-rte-content ul ul,
        .question-paper-preview ul ul {
          list-style-type: circle !important;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
          padding-left: 28px !important;
        }
        .e-richtexteditor .e-rte-content ul ul > li,
        .question-paper-preview ul ul > li {
          list-style-type: inherit !important;
        }
        .e-richtexteditor .e-rte-content ul ul ul,
        .question-paper-preview ul ul ul {
          list-style-type: square !important;
          margin-top: 4px !important;
          margin-bottom: 4px !important;
          padding-left: 28px !important;
        }
        .e-richtexteditor .e-rte-content ul ul ul > li,
        .question-paper-preview ul ul ul > li {
          list-style-type: inherit !important;
        }

        .e-richtexteditor .e-rte-content ul[style*="disc"],
        .e-richtexteditor .e-rte-content ul.e-list-disc,
        .e-richtexteditor .e-rte-content ul[style*="disc"] li,
        .e-richtexteditor .e-rte-content ul.e-list-disc li,
        .e-richtexteditor .e-rte-content li[style*="disc"],
        .question-paper-preview ul[style*="disc"],
        .question-paper-preview ul.e-list-disc,
        .question-paper-preview ul[style*="disc"] li,
        .question-paper-preview li[style*="disc"] {
          list-style-type: disc !important;
        }

        .e-richtexteditor .e-rte-content ul[style*="circle"],
        .e-richtexteditor .e-rte-content ul.e-list-circle,
        .e-richtexteditor .e-rte-content ul[style*="circle"] li,
        .e-richtexteditor .e-rte-content ul.e-list-circle li,
        .e-richtexteditor .e-rte-content li[style*="circle"],
        .question-paper-preview ul[style*="circle"],
        .question-paper-preview ul.e-list-circle,
        .question-paper-preview ul[style*="circle"] li,
        .question-paper-preview li[style*="circle"] {
          list-style-type: circle !important;
        }

        .e-richtexteditor .e-rte-content ul[style*="square"],
        .e-richtexteditor .e-rte-content ul.e-list-square,
        .e-richtexteditor .e-rte-content ul[style*="square"] li,
        .e-richtexteditor .e-rte-content ul.e-list-square li,
        .e-richtexteditor .e-rte-content li[style*="square"],
        .question-paper-preview ul[style*="square"],
        .question-paper-preview ul.e-list-square,
        .question-paper-preview ul[style*="square"] li,
        .question-paper-preview li[style*="square"] {
          list-style-type: square !important;
        }

        .e-richtexteditor .e-rte-content ul[style*="none"],
        .e-richtexteditor .e-rte-content ul.e-list-none,
        .e-richtexteditor .e-rte-content ul[style*="none"] li,
        .e-richtexteditor .e-rte-content ul.e-list-none li,
        .e-richtexteditor .e-rte-content ol[style*="none"],
        .e-richtexteditor .e-rte-content ol.e-list-none,
        .e-richtexteditor .e-rte-content ol[style*="none"] li,
        .e-richtexteditor .e-rte-content ol.e-list-none li,
        .e-richtexteditor .e-rte-content li[style*="none"],
        .question-paper-preview ul[style*="none"],
        .question-paper-preview ul.e-list-none,
        .question-paper-preview ul[style*="none"] li,
        .question-paper-preview ol[style*="none"],
        .question-paper-preview ol.e-list-none,
        .question-paper-preview ol[style*="none"] li,
        .question-paper-preview li[style*="none"] {
          list-style-type: none !important;
        }

        .e-richtexteditor .e-rte-content > ol > li,
        .e-richtexteditor .e-rte-content > ul > li,
        .question-paper-preview > ol > li,
        .question-paper-preview > ul > li {
          margin-top: 8px !important;
          margin-bottom: 8px !important;
        }

        /* Default Microsoft Word Typography: Times New Roman 12pt */
        .e-richtexteditor .e-rte-content,
        .e-richtexteditor .e-rte-content .e-content,
        .question-paper-preview {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          color: #000000;
        }

        .e-richtexteditor .e-rte-content p,
        .e-richtexteditor .e-rte-content li,
        .question-paper-preview p,
        .question-paper-preview li {
          font-family: inherit;
          font-size: 12pt;
          line-height: 1.5;
          margin-bottom: 4px;
        }

        .e-richtexteditor .e-rte-content table,
        .e-richtexteditor .e-rte-content table td,
        .e-richtexteditor .e-rte-content table th,
        .question-paper-preview table,
        .question-paper-preview table td,
        .question-paper-preview table th {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
        }

        /* Mathematical Equation Styling — Editor Badge View */
        .math-equation-wrapper {
          display: inline-flex !important;
          align-items: center !important;
          vertical-align: middle !important;
          padding: 0 !important;
          margin: 2px 3px !important;
          line-height: normal !important;
          border: none !important;
          border-radius: 8px !important;
          background-color: transparent !important;
          cursor: pointer;
          transition: all 0.15s ease;
          position: relative;
          z-index: 1;
        }

        /* The clickable badge shown in the RTE editor */
        .math-eq-badge {
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px;
          padding: 4px 12px 4px 8px !important;
          border: 1.5px solid #93c5fd !important;
          border-radius: 8px !important;
          background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 50%, #ecfeff 100%) !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #1e40af !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
          line-height: 1.4 !important;
          vertical-align: middle !important;
          white-space: nowrap !important;
          max-width: 360px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .math-eq-badge code {
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          color: #1e3a5f !important;
          background: rgba(59, 130, 246, 0.08) !important;
          padding: 1px 5px !important;
          border-radius: 4px !important;
          max-width: 280px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          display: inline-block !important;
          vertical-align: middle !important;
        }
        .math-equation-wrapper:hover .math-eq-badge {
          border-color: #3b82f6 !important;
          background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 50%, #cffafe 100%) !important;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.18) !important;
          transform: translateY(-1px);
        }
        .math-equation-wrapper:hover .math-eq-badge code {
          color: #1e40af !important;
          background: rgba(59, 130, 246, 0.14) !important;
        }

        .math-eq-delete-btn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 16px !important;
          height: 16px !important;
          margin-left: 6px !important;
          border-radius: 50% !important;
          border: none !important;
          background: #fee2e2 !important;
          color: #ef4444 !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          line-height: 1 !important;
          cursor: pointer !important;
          padding: 0 !important;
          opacity: 0.75 !important;
          transition: all 0.15s ease !important;
          vertical-align: middle !important;
        }
        .math-eq-badge:hover .math-eq-delete-btn,
        .math-eq-delete-btn:hover {
          opacity: 1 !important;
          background: #ef4444 !important;
          color: #ffffff !important;
          transform: scale(1.15) !important;
        }

        /* Hide print content in editor view */
        .math-eq-print-content {
          display: none !important;
        }

        /* Prevent Syncfusion Editor line-height paragraph styles from inflating equation spacing */
        .e-richtexteditor .e-rte-content .math-equation-wrapper,
        .e-richtexteditor .e-rte-content .math-equation-wrapper * {
          line-height: normal !important;
        }

        .katex-display {
          display: inline-block !important;
          margin: 0.2em 0 !important;
        }
        .katex {
          font-size: 1.1em !important;
          text-indent: 0 !important;
        }
        .e-richtexteditor .e-rte-content table td,
        .e-richtexteditor .e-rte-content table th {
          text-indent: 0 !important;
        }
        .e-richtexteditor .e-rte-content table td > p,
        .e-richtexteditor .e-rte-content table td > div,
        .e-richtexteditor .e-rte-content table th > p,
        .e-richtexteditor .e-rte-content table th > div {
          text-align: inherit;
          margin: 0 !important;
          padding: 0 !important;
          text-indent: 0 !important;
        }
        .e-richtexteditor .e-rte-content table td[style*="text-align"] > p,
        .e-richtexteditor .e-rte-content table td[style*="text-align"] > div,
        .e-richtexteditor .e-rte-content table th[style*="text-align"] > p,
        .e-richtexteditor .e-rte-content table th[style*="text-align"] > div {
          text-align: inherit !important;
        }
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table,
        .e-richtexteditor .e-rte-content table[data-obe-paper-structure="true"],
        .question-paper-preview table.obe-paper-structure-table,
        .question-paper-preview table[data-obe-paper-structure="true"] {
          width: 100% !important;
          border-collapse: collapse !important;
          table-layout: auto !important;
        }
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table col.col-qnum,
        .question-paper-preview table.obe-paper-structure-table col.col-qnum {
          width: 28px !important;
          max-width: 32px !important;
        }
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table col.col-subq,
        .question-paper-preview table.obe-paper-structure-table col.col-subq {
          width: 24px !important;
          max-width: 28px !important;
        }
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table col.col-content,
        .question-paper-preview table.obe-paper-structure-table col.col-content {
          width: auto !important;
        }
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table col.col-marks,
        .question-paper-preview table.obe-paper-structure-table col.col-marks {
          width: 50px !important;
          max-width: 55px !important;
        }

        .e-richtexteditor .e-rte-content table.obe-paper-structure-table td,
        .e-richtexteditor .e-rte-content table[data-obe-paper-structure="true"] td,
        .question-paper-preview table.obe-paper-structure-table td,
        .question-paper-preview table[data-obe-paper-structure="true"] td {
          vertical-align: top !important;
          text-indent: 0 !important;
        }
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table td.col-qnum-cell,
        .question-paper-preview table.obe-paper-structure-table td.col-qnum-cell {
          width: 28px !important;
          max-width: 32px !important;
          padding: 5px 2px 5px 0px !important;
          text-align: left !important;
          white-space: nowrap !important;
        }
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table td.col-subq-cell,
        .question-paper-preview table.obe-paper-structure-table td.col-subq-cell {
          width: 24px !important;
          max-width: 28px !important;
          padding: 5px 4px 5px 0px !important;
          text-align: left !important;
          white-space: nowrap !important;
        }
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table td.col-content-cell,
        .question-paper-preview table.obe-paper-structure-table td.col-content-cell {
          padding: 5px 8px 5px 2px !important;
        }
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table td.col-marks-cell,
        .question-paper-preview table.obe-paper-structure-table td.col-marks-cell {
          width: 50px !important;
          max-width: 55px !important;
          padding: 5px 0px 5px 4px !important;
          text-align: right !important;
          white-space: nowrap !important;
        }
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table td p,
        .e-richtexteditor .e-rte-content table.obe-paper-structure-table td div {
          margin: 0 !important;
          padding: 0 !important;
          text-indent: 0 !important;
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

        /* Code Snippet Styles in RTE Editor */
        .obe-code-wrapper {
          clear: both !important;
          margin: 6px 0 !important;
          line-height: 1.4 !important;
        }
        .obe-code-snippet-container {
          display: inline-block !important;
          vertical-align: middle !important;
          margin: 4px 0 !important;
          clear: both !important;
          position: relative !important;
          page-break-inside: avoid !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          cursor: pointer !important;
        }
        .obe-code-snippet-container[data-align="center"] {
          text-align: center !important;
        }
        .obe-code-snippet-container[data-align="left"] {
          text-align: left !important;
        }
        .obe-code-block {
          display: block !important;
          font-family: Consolas, 'Courier New', Monaco, monospace !important;
          line-height: 1.35 !important;
          letter-spacing: 0 !important;
          tab-size: 4 !important;
          -moz-tab-size: 4 !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          margin: 0 !important;
          text-align: left !important;
          box-sizing: border-box !important;
          transition: box-shadow 0.15s ease, border-color 0.15s ease !important;
          cursor: pointer !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          pointer-events: none !important;
        }
        .obe-code-snippet-container:hover .obe-code-block {
          box-shadow: 0 0 0 2px #10b981 !important;
        }
        .obe-code-snippet-container[data-selected="true"] .obe-code-block,
        .obe-code-snippet-container:focus .obe-code-block {
          outline: 2px dashed #059669 !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2) !important;
        }
        .obe-code-block,
        .obe-code-block *,
        .obe-code-block code,
        .obe-code-block span,
        .obe-code-table,
        .obe-code-table * {
          color: #000000 !important;
          background-color: transparent !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          pointer-events: none !important;
        }
        .obe-code-block strong {
          font-weight: 700 !important;
          color: #000000 !important;
        }
        .obe-code-table {
          border-collapse: collapse !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
          width: auto !important;
          background: transparent !important;
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        .obe-code-table td {
          border: none !important;
          padding: 1px 0 !important;
          line-height: 1.35 !important;
          vertical-align: top !important;
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        .obe-code-table .obe-code-ln {
          color: #718096 !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          text-align: right !important;
          padding-right: 12px !important;
          border-right: 1px solid #cbd5e1 !important;
          cursor: default !important;
        }
        .obe-code-table .obe-code-txt {
          padding-left: 12px !important;
          white-space: pre-wrap !important;
          user-select: text !important;
          -webkit-user-select: text !important;
          cursor: text !important;
        }

        /* =========================================================
           MICROSOFT WORD STYLE RIBBON TOOLBAR & CONTROLS
           ========================================================= */
        .e-richtexteditor .e-rte-toolbar,
        .e-richtexteditor.e-rte-tb-expand .e-rte-toolbar {
          background-color: #f8fafc !important;
          border: none !important;
          border-bottom: 1px solid #cbd5e1 !important;
          padding: 5px 8px !important;
        }

        .e-richtexteditor .e-toolbar {
          background-color: #f8fafc !important;
          border: none !important;
        }

        .e-richtexteditor .e-toolbar-items {
          background: transparent !important;
          gap: 2px !important;
        }

        /* Ribbon item buttons: Word style rounded hover box */
        .e-richtexteditor .e-toolbar .e-toolbar-item .e-tbar-btn {
          border-radius: 4px !important;
          height: 28px !important;
          min-width: 28px !important;
          padding: 1px 4px !important;
          border: 1px solid transparent !important;
          background: transparent !important;
          color: #334155 !important;
          transition: all 0.12s ease !important;
        }

        .e-richtexteditor .e-toolbar .e-toolbar-item .e-tbar-btn:hover {
          background: #e2e8f0 !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
        }

        .e-richtexteditor .e-toolbar .e-toolbar-item .e-tbar-btn.e-active,
        .e-richtexteditor .e-toolbar .e-toolbar-item .e-tbar-btn:active {
          background: #dbeafe !important;
          border-color: #93c5fd !important;
          color: #1d4ed8 !important;
        }

        .e-richtexteditor .e-toolbar .e-toolbar-item .e-tbar-btn.e-active .e-icons {
          color: #1d4ed8 !important;
        }

        /* Word-Style Font Name Dropdown: Crisp input box appearance */
        .e-richtexteditor .e-toolbar .e-toolbar-item button[id*="_FontName"],
        .e-richtexteditor .e-toolbar .e-toolbar-item.e-font-name-tbar-btn,
        .e-richtexteditor .e-toolbar .e-toolbar-item .e-rte-font-name-dropdown {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          height: 28px !important;
          min-width: 148px !important;
          max-width: 180px !important;
          padding: 1px 8px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }

        .e-richtexteditor .e-toolbar .e-toolbar-item button[id*="_FontName"]:hover {
          border-color: #94a3b8 !important;
          background: #fafafa !important;
        }

        /* Ensure font family and font size dropdown popups appear above all modals */
        .e-dropdown-popup,
        .e-popup.e-popup-open,
        .e-rte-dropdown-popup,
        .e-rte-font-name-dropdown + .e-dropdown-popup,
        .e-toolbar .e-dropdown-popup {
          z-index: 10000005 !important;
        }

        .e-richtexteditor .e-toolbar .e-toolbar-item button[id*="_FontName"] .e-rte-dropdown-btn-text,
        .e-richtexteditor .e-toolbar .e-toolbar-item button[id*="_FontName"] .e-tbar-btn-text {
          font-family: inherit !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          color: #1e293b !important;
          text-align: left !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        /* Microsoft Word Style Font Size Combobox */
        .word-fontsize-wrapper {
          display: inline-flex !important;
          align-items: center !important;
          height: 28px !important;
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          width: 58px !important;
          position: relative !important;
          margin: 0 2px !important;
        }

        .word-fontsize-wrapper:hover {
          border-color: #94a3b8 !important;
          background: #fafafa !important;
        }

        .word-fontsize-wrapper:focus-within {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 1.5px rgba(59, 130, 246, 0.3) !important;
        }

        .word-fontsize-input {
          width: 36px !important;
          height: 26px !important;
          border: none !important;
          outline: none !important;
          background: transparent !important;
          text-align: center !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #1e293b !important;
          padding: 0 !important;
          margin: 0 !important;
          cursor: text !important;
        }

        .word-fontsize-btn {
          width: 22px !important;
          height: 26px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: none !important;
          background: transparent !important;
          cursor: pointer !important;
          padding: 0 !important;
          color: #64748b !important;
          transition: background-color 0.1s ease !important;
          pointer-events: auto !important;
          user-select: none !important;
        }

        .word-fontsize-btn:hover {
          background-color: #e2e8f0 !important;
          color: #0f172a !important;
        }

        .word-fontsize-btn svg,
        .word-fontsize-btn path {
          pointer-events: none !important;
        }

        .word-fontsize-menu {
          position: fixed !important;
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
          max-height: 260px !important;
          overflow-y: auto !important;
          width: 62px !important;
          z-index: 99999999 !important;
          padding: 4px 0 !important;
        }

        .word-fontsize-menu-item {
          padding: 4px 8px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          color: #1e293b !important;
          cursor: pointer !important;
          text-align: center !important;
          user-select: none !important;
          transition: background-color 0.1s ease !important;
        }

        .word-fontsize-menu-item:hover {
          background: #eff6ff !important;
          color: #2563eb !important;
          font-weight: 700 !important;
        }

        .word-fontsize-menu-item.active {
          background: #dbeafe !important;
          color: #1d4ed8 !important;
          font-weight: 700 !important;
        }

        .e-dropdown-popup ul.e-dropdown-menu {
          max-height: 380px !important;
          overflow-y: auto !important;
        }

        /* Word-Style Paragraph/Formats Dropdown */
        .e-richtexteditor .e-toolbar .e-toolbar-item button[id*="_Formats"] {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          height: 28px !important;
          min-width: 95px !important;
          padding: 1px 8px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }

        .e-richtexteditor .e-toolbar .e-toolbar-item button[id*="_Formats"]:hover {
          border-color: #94a3b8 !important;
          background: #fafafa !important;
        }

        .e-richtexteditor .e-toolbar .e-toolbar-item button[id*="_Formats"] .e-rte-dropdown-btn-text {
          font-size: 12px !important;
          font-weight: 500 !important;
          color: #1e293b !important;
        }

        /* Subtle vertical group separators */
        .e-richtexteditor .e-toolbar .e-toolbar-item.e-separator {
          height: 20px !important;
          margin: 0 4px !important;
          border-left: 1px solid #cbd5e1 !important;
          opacity: 0.85 !important;
        }

        /* Custom Word Action Buttons */
        #paper-structure-btn {
          background: #ecfdf5 !important;
          border: 1px solid #a7f3d0 !important;
          border-radius: 4px !important;
          height: 28px !important;
          padding: 0 8px !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03) !important;
        }
        #paper-structure-btn:hover {
          background: #d1fae5 !important;
          border-color: #6ee7b7 !important;
        }

        #code-snippet-btn {
          background: #eff6ff !important;
          border: 1px solid #bfdbfe !important;
          border-radius: 4px !important;
          height: 28px !important;
          padding: 0 8px !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03) !important;
        }
        #code-snippet-btn:hover {
          background: #dbeafe !important;
          border-color: #93c5fd !important;
        }

        /* Word Contextual Ribbon Tab: Table Design only appears when inside a table */
        .e-toolbar-item:has(#table-design-ribbon-btn) {
          display: none;
        }

        #table-design-ribbon-btn {
          background: #eff6ff !important;
          border: 1.5px solid #60a5fa !important;
          border-radius: 4px !important;
          height: 28px !important;
          padding: 0 8px !important;
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12) !important;
        }
        #table-design-ribbon-btn:hover {
          background: #dbeafe !important;
          border-color: #2563eb !important;
        }

        #ai-commands-btn {
          background: #f0fdf4 !important;
          border: 1px solid #bbf7d0 !important;
          border-radius: 4px !important;
          height: 28px !important;
          padding: 0 8px !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03) !important;
        }
        #ai-commands-btn:hover {
          background: #dcfce7 !important;
          border-color: #86efac !important;
        }

        #import-word-btn {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          height: 28px !important;
          padding: 0 8px !important;
        }
        #import-word-btn:hover {
          background: #f1f5f9 !important;
          border-color: #94a3b8 !important;
        }

        /* =========================================================
           MICROSOFT WORD PARAGRAPH MODULE & CONTROLS
           ========================================================= */

        /* Active formatting button appearance matching Word Ribbon */
        .e-richtexteditor .e-toolbar .e-toolbar-item button.e-active,
        .e-richtexteditor .e-toolbar .e-toolbar-item button[aria-pressed="true"],
        .e-richtexteditor .e-toolbar .e-toolbar-item button[id*="Justify"].e-active,
        #show-hide-pilcrow-btn.e-active {
          background: #e2e8f0 !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 4px !important;
          color: #0f172a !important;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08) !important;
        }

        /* Show/Hide Paragraph Marks (Pilcrow ¶) */
        .show-paragraph-marks .e-rte-content p::after,
        .show-paragraph-marks .e-rte-content h1::after,
        .show-paragraph-marks .e-rte-content h2::after,
        .show-paragraph-marks .e-rte-content h3::after,
        .show-paragraph-marks .e-rte-content h4::after,
        .show-paragraph-marks .e-rte-content li::after {
          content: ' ¶';
          color: #94a3b8;
          font-size: 11px;
          font-weight: normal;
          pointer-events: none;
          user-select: none;
        }
        .show-paragraph-marks .e-rte-content p:empty::after,
        .show-paragraph-marks .e-rte-content div:empty::after {
          content: '¶';
          color: #cbd5e1;
          font-size: 11px;
          pointer-events: none;
        }
        @media print {
          .show-paragraph-marks .e-rte-content p::after,
          .show-paragraph-marks .e-rte-content h1::after,
          .show-paragraph-marks .e-rte-content h2::after,
          .show-paragraph-marks .e-rte-content h3::after,
          .show-paragraph-marks .e-rte-content h4::after,
          .show-paragraph-marks .e-rte-content li::after {
            display: none !important;
          }
        }
      `}</style>

      {/* Teacher's Reference Notes Modal */}
      <ReferenceNotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        courseId={notesCourseId}
        courseTitle={offering?.course?.title || offering?.course?.courseTitle || offering?.course?.courseName || ''}
        onNotesUpdated={refreshNotesStatus}
        onInsertQuestion={(text) => handleInsertNoteSuggestion({ questionText: text })}
      />

      {/* Microsoft Word Table Design Modal */}
      <TableDesignModal
        isOpen={showTableDesignModal}
        onClose={() => setShowTableDesignModal(false)}
        editorRef={rteRef}
        onTableUpdated={() => {
          if (rteRef.current?.formatter?.saveData) {
            rteRef.current.formatter.saveData()
          }
        }}
      />

      {/* Non-Blocking Notifications Container (Top-Right Stack with Translucent Glassy Dark Emerald Aesthetic) */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print">
        {/* Real-Time AI Cold-Start Warming Card - Stays visible continuously while warming */}
        {Boolean(aiWarmingInfo && !aiWarmingInfo.isComplete && aiWarmingInfo.statusMsg) && (
          <div className="pointer-events-auto px-4 py-3 rounded-2xl border shadow-xl flex items-start gap-3.5 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 text-xs font-semibold bg-emerald-950/95 text-emerald-100 border-emerald-400/60 ring-1 ring-emerald-400/25">
            <div className="relative flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={17} className="text-emerald-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="flex-1 flex flex-col text-left pr-1">
              <span className="text-white font-bold tracking-wide leading-tight">
                {aiWarmingInfo?.statusMsg || 'AI Service is waking up from standby...'}
              </span>
              <span className="text-[11px] text-emerald-200/90 font-normal mt-1 leading-tight">
                {aiWarmingInfo?.attempt > 1
                  ? `Attempt ${aiWarmingInfo.attempt}/${aiWarmingInfo.maxAttempts || 24} • Elapsed: ${aiWarmingInfo.elapsedSec || 0}s (Microservice waking from sleep)`
                  : 'First run takes ~20–30 seconds. Please wait a moment while the neural models load into memory.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (aiWarmingInfo?.onCancel) aiWarmingInfo.onCancel()
                setAiWarmingInfo(null)
              }}
              className="shrink-0 text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-lg transition cursor-pointer"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Regular Toast Notifications */}
        {notifications.map(n => {
          let bg = 'bg-emerald-950/95 text-emerald-100 border-emerald-400/60 ring-1 ring-emerald-400/25'
          let IconComp = Sparkles
          let iconColor = 'text-emerald-400'

          if (n.type === 'success') {
            bg = 'bg-emerald-950/95 text-emerald-100 border-emerald-400/60 ring-1 ring-emerald-400/25'
            IconComp = CheckCircle2
            iconColor = 'text-emerald-400'
          } else if (n.type === 'error') {
            bg = 'bg-rose-950/95 text-rose-100 border-rose-500/50 ring-1 ring-rose-400/20'
            IconComp = AlertCircle
            iconColor = 'text-rose-400'
          } else if (n.type === 'warning') {
            bg = 'bg-amber-950/95 text-amber-100 border-amber-500/50 ring-1 ring-amber-400/20'
            IconComp = AlertTriangle
            iconColor = 'text-amber-400'
          }

          return (
            <div
              key={n.id}
              className={`pointer-events-auto px-4 py-3 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 text-xs font-semibold ${bg}`}
            >
              <IconComp size={16} className={`shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 leading-relaxed break-words">{n.message}</div>
              <button
                type="button"
                onClick={() => dismissNotification(n.id)}
                className="shrink-0 text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-lg transition cursor-pointer"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
