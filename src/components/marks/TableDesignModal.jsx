import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  X,
  Grid,
  Check,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Maximize2,
  Trash2,
  Plus,
  Minus,
  Palette,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  Sliders,
  Table as TableIcon,
  RotateCcw,
  RotateCw,
  GripHorizontal
} from 'lucide-react'

export default function TableDesignModal({
  isOpen,
  onClose,
  editorRef,
  onTableUpdated
}) {
  const [targetTable, setTargetTable] = useState(null)
  const [tableDimensions, setTableDimensions] = useState({ rows: 0, cols: 0 })
  const [headerRow, setHeaderRow] = useState(true)
  const [bandedRows, setBandedRows] = useState(false)
  const [firstColumnBold, setFirstColumnBold] = useState(false)
  const [tableAlign, setTableAlign] = useState('center')
  const [borderWidth, setBorderWidth] = useState('1px')
  const [borderColor, setBorderColor] = useState('#000000')
  const [cellPadding, setCellPadding] = useState('6px 10px')
  const [activeTab, setActiveTab] = useState('styles') // 'styles' | 'borders' | 'shading' | 'layout'

  // Draggable floating panel state
  const [position, setPosition] = useState({ x: 100, y: 80 })
  const [hasPositioned, setHasPositioned] = useState(false)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })

  useEffect(() => {
    if (isOpen && !hasPositioned) {
      // Default floating position: upper right area so editor table is clearly visible
      const initialX = Math.max(20, window.innerWidth - 560)
      const initialY = 85
      setPosition({ x: initialX, y: initialY })
      setHasPositioned(true)
    }
  }, [isOpen, hasPositioned])

  const handleDragStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return
    }
    isDraggingRef.current = true
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y
    }
    const onMouseMove = (ev) => {
      if (!isDraggingRef.current) return
      const dx = ev.clientX - dragStartRef.current.mouseX
      const dy = ev.clientY - dragStartRef.current.mouseY
      const newX = Math.max(10, Math.min(window.innerWidth - 480, dragStartRef.current.posX + dx))
      const newY = Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.posY + dy))
      setPosition({ x: newX, y: newY })
    }
    const onMouseUp = () => {
      isDraggingRef.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Detect currently active table in the editor
  useEffect(() => {
    if (!isOpen || !editorRef?.current) return

    const editor = editorRef.current
    const editArea = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
    if (!editArea) return

    const doc = editArea.ownerDocument || document
    const sel = doc.getSelection ? doc.getSelection() : window.getSelection()
    let node = sel?.anchorNode
    let foundTable = null

    // Walk up to find the active table
    while (node && node !== editArea) {
      if (node.nodeName === 'TABLE') {
        foundTable = node
        break
      }
      node = node.parentNode
    }

    // If cursor wasn't inside a table, pick table with active selection or last table
    if (!foundTable) {
      foundTable = editArea.querySelector('table:has(.e-multi-cells-select), table:has(.e-cell-select)')
    }

    if (!foundTable) {
      const tables = editArea.querySelectorAll('table.e-rte-table, table')
      if (tables.length > 0) {
        foundTable = tables[tables.length - 1]
      }
    }

    setTargetTable(foundTable)

    if (foundTable) {
      const rows = foundTable.querySelectorAll('tr').length
      const firstRow = foundTable.querySelector('tr')
      const cols = firstRow ? firstRow.querySelectorAll('td, th').length : 0
      setTableDimensions({ rows, cols })

      // Detect current table alignment
      const ml = foundTable.style.marginLeft
      const mr = foundTable.style.marginRight
      if (ml === '0px' || ml === '0') setTableAlign('left')
      else if (mr === '0px' || mr === '0') setTableAlign('right')
      else setTableAlign('center')
    } else {
      setTableDimensions({ rows: 0, cols: 0 })
    }
  }, [isOpen, editorRef])

  // Undo & Redo History for Table Design actions
  const tableHistoryRef = useRef([])
  const tableRedoRef = useRef([])

  // Seed/reset history whenever modal opens with target table
  useEffect(() => {
    if (isOpen && targetTable) {
      tableHistoryRef.current = []
      tableRedoRef.current = []
    }
  }, [isOpen, targetTable])

  const recordBeforeChange = () => {
    const editor = editorRef?.current
    const table = targetTable
    if (!editor || !table) return

    // Snapshot table outer HTML and editor inner HTML
    const editArea = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
    tableHistoryRef.current.push({
      tableOuter: table.outerHTML,
      editorHtml: editArea ? editArea.innerHTML : ''
    })
    tableRedoRef.current = []

    // Pre-save to Syncfusion undoRedoStack so editor's native undo tracks it
    try {
      if (editor.formatter?.getUndoRedoStack) {
        if (editor.formatter.getUndoRedoStack().length === 0) {
          editor.formatter.saveData()
        }
      }
    } catch (e) {}
  }

  const recordAfterChange = () => {
    const editor = editorRef?.current
    if (!editor) return

    // Post-save to Syncfusion undoRedoStack
    try {
      if (editor.formatter?.saveData) {
        editor.formatter.saveData()
      }
      if (editor.notify) {
        editor.notify('contentChanged', {})
      }
    } catch (e) {}

    if (onTableUpdated) onTableUpdated()
  }

  // Alias for backward compatibility
  const saveUndoState = recordBeforeChange

  const handleUndo = useCallback(() => {
    const editor = editorRef?.current
    if (!editor) return

    if (tableHistoryRef.current.length > 0) {
      const prevState = tableHistoryRef.current.pop()
      const table = targetTable
      if (table && prevState.tableOuter) {
        tableRedoRef.current.push({
          tableOuter: table.outerHTML,
          editorHtml: editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel().innerHTML : ''
        })

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = prevState.tableOuter
        const restoredTable = tempDiv.firstElementChild
        if (restoredTable && table.parentNode) {
          table.parentNode.replaceChild(restoredTable, table)
          setTargetTable(restoredTable)
        }
      } else if (prevState.editorHtml) {
        const editPanel = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
        if (editPanel) {
          tableRedoRef.current.push({
            tableOuter: table ? table.outerHTML : '',
            editorHtml: editPanel.innerHTML
          })
          editPanel.innerHTML = prevState.editorHtml
        }
      }

      try {
        if (editor.formatter?.saveData) editor.formatter.saveData()
        if (editor.notify) editor.notify('contentChanged', {})
      } catch (e) {}
      if (onTableUpdated) onTableUpdated()
      return
    }

    // Fallback to Syncfusion editor undo
    try {
      if (editor.formatter?.editorManager?.undoRedoManager) {
        editor.formatter.editorManager.undoRedoManager.undo({
          callBack: () => {
            if (editor.notify) editor.notify('contentChanged', {})
            if (onTableUpdated) onTableUpdated()
          }
        })
      } else if (editor.executeCommand) {
        editor.executeCommand('undo')
        if (onTableUpdated) onTableUpdated()
      }
    } catch (e) {
      console.warn('Syncfusion undo error:', e)
    }
  }, [editorRef, targetTable, onTableUpdated])

  const handleRedo = useCallback(() => {
    const editor = editorRef?.current
    if (!editor) return

    if (tableRedoRef.current.length > 0) {
      const nextState = tableRedoRef.current.pop()
      const table = targetTable
      if (table && nextState.tableOuter) {
        tableHistoryRef.current.push({
          tableOuter: table.outerHTML,
          editorHtml: editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel().innerHTML : ''
        })

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = nextState.tableOuter
        const restoredTable = tempDiv.firstElementChild
        if (restoredTable && table.parentNode) {
          table.parentNode.replaceChild(restoredTable, table)
          setTargetTable(restoredTable)
        }
      }

      try {
        if (editor.formatter?.saveData) editor.formatter.saveData()
        if (editor.notify) editor.notify('contentChanged', {})
      } catch (e) {}
      if (onTableUpdated) onTableUpdated()
      return
    }

    try {
      if (editor.formatter?.editorManager?.undoRedoManager) {
        editor.formatter.editorManager.undoRedoManager.redo({
          callBack: () => {
            if (editor.notify) editor.notify('contentChanged', {})
            if (onTableUpdated) onTableUpdated()
          }
        })
      } else if (editor.executeCommand) {
        editor.executeCommand('redo')
        if (onTableUpdated) onTableUpdated()
      }
    } catch (e) {
      console.warn('Syncfusion redo error:', e)
    }
  }, [editorRef, targetTable, onTableUpdated])

  // Keydown listener inside modal for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    if (!isOpen) return
    const onModalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        e.stopPropagation()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        e.stopPropagation()
        handleRedo()
      }
    }
    window.addEventListener('keydown', onModalKeyDown, true)
    return () => window.removeEventListener('keydown', onModalKeyDown, true)
  }, [isOpen, handleUndo, handleRedo])

  const getDirectCells = (table) => {
    if (!table) return []
    const tbody = table.querySelector(':scope > tbody') || table
    return Array.from(tbody.querySelectorAll(':scope > tr > td, :scope > tr > th'))
  }

  // ─────────────────────────────────────────────────────────────
  // 1. PRESET STYLES (Word Table Styles Gallery)
  // ─────────────────────────────────────────────────────────────
  const applyPresetStyle = (styleKey) => {
    if (!targetTable) return
    saveUndoState()

    const table = targetTable
    table.style.borderCollapse = 'collapse'
    table.style.fontFamily = 'inherit'
    table.style.fontSize = 'inherit'
    const rows = Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr'))
    const directCells = getDirectCells(table)

    // Reset styles
    directCells.forEach(cell => {
      cell.style.border = ''
      cell.style.background = ''
      cell.style.color = ''
      cell.style.fontWeight = ''
      cell.style.padding = cellPadding
    })
    table.style.border = ''
    table.style.background = ''

    if (styleKey === 'academic') {
      // 🎓 Academic Exam Paper (IEEE / APA standard)
      table.style.borderTop = '2px solid #000000'
      table.style.borderBottom = '2px solid #000000'
      table.style.borderLeft = 'none'
      table.style.borderRight = 'none'

      rows.forEach((row, rowIdx) => {
        const cells = Array.from(row.querySelectorAll(':scope > td, :scope > th'))
        cells.forEach(cell => {
          cell.style.border = 'none'
          cell.style.padding = cellPadding
          if (rowIdx === 0) {
            cell.style.borderBottom = '1.5px solid #000000'
            cell.style.fontWeight = 'bold'
          }
        })
      })
    } else if (styleKey === 'clearBorders') {
      // 🚫 Clear All Borders (Borderless Layout)
      table.style.border = 'none'
      directCells.forEach(cell => {
        cell.style.border = 'none'
        cell.style.padding = cellPadding
      })
    } else if (styleKey === 'classicGrid') {
      // 🔲 Classic Word Grid
      table.style.border = '1px solid #000000'
      directCells.forEach(cell => {
        cell.style.border = '1px solid #000000'
        cell.style.padding = cellPadding
      })
      if (headerRow && rows[0]) {
        rows[0].querySelectorAll('td, th').forEach(c => {
          c.style.fontWeight = 'bold'
          c.style.background = '#f8fafc'
        })
      }
    } else if (styleKey === 'striped') {
      // 📊 Banded Rows (Zebra)
      table.style.border = '1px solid #cbd5e1'
      rows.forEach((row, rowIdx) => {
        const isHead = rowIdx === 0
        const isEven = rowIdx % 2 === 0
        row.querySelectorAll('td, th').forEach(cell => {
          cell.style.border = '1px solid #e2e8f0'
          cell.style.padding = cellPadding
          if (isHead) {
            cell.style.background = '#1e293b'
            cell.style.color = '#ffffff'
            cell.style.fontWeight = 'bold'
          } else if (isEven) {
            cell.style.background = '#f8fafc'
          }
        })
      })
    } else if (styleKey === 'emeraldAcademic') {
      // 🟩 Academic Emerald
      table.style.border = '1px solid #a7f3d0'
      rows.forEach((row, rowIdx) => {
        const isHead = rowIdx === 0
        const isEven = rowIdx % 2 === 0
        row.querySelectorAll('td, th').forEach(cell => {
          cell.style.border = '1px solid #d1fae5'
          cell.style.padding = cellPadding
          if (isHead) {
            cell.style.background = '#065f46'
            cell.style.color = '#ffffff'
            cell.style.fontWeight = 'bold'
          } else if (isEven) {
            cell.style.background = '#f0fdf4'
          }
        })
      })
    } else if (styleKey === 'executiveBlue') {
      // 🟦 Executive Blue
      table.style.border = '1px solid #bfdbfe'
      rows.forEach((row, rowIdx) => {
        const isHead = rowIdx === 0
        const isEven = rowIdx % 2 === 0
        row.querySelectorAll('td, th').forEach(cell => {
          cell.style.border = '1px solid #dbeafe'
          cell.style.padding = cellPadding
          if (isHead) {
            cell.style.background = '#1e40af'
            cell.style.color = '#ffffff'
            cell.style.fontWeight = 'bold'
          } else if (isEven) {
            cell.style.background = '#eff6ff'
          }
        })
      })
    } else if (styleKey === 'minimalHorizontal') {
      // 📑 Minimal Horizontal Dividers
      table.style.border = 'none'
      table.style.borderTop = '1px solid #cbd5e1'
      table.style.borderBottom = '1px solid #cbd5e1'
      rows.forEach((row, rowIdx) => {
        row.querySelectorAll('td, th').forEach(cell => {
          cell.style.border = 'none'
          cell.style.borderBottom = '1px solid #e2e8f0'
          cell.style.padding = cellPadding
          if (rowIdx === 0) {
            cell.style.fontWeight = 'bold'
            cell.style.borderBottom = '1.5px solid #94a3b8'
          }
        })
      })
    } else if (styleKey === 'compactExam') {
      // 📐 Compact Exam Layout
      table.style.border = '1px solid #000000'
      directCells.forEach(cell => {
        cell.style.border = '1px solid #000000'
        cell.style.padding = '3px 6px'
      })
      if (rows[0]) {
        rows[0].querySelectorAll('td, th').forEach(c => {
          c.style.fontWeight = 'bold'
          c.style.background = '#f1f5f9'
        })
      }
    }

    saveUndoState()
    if (onTableUpdated) onTableUpdated()
  }

  // ─────────────────────────────────────────────────────────────
  // 2. BORDERS CONTROLS (Word Borders Module)
  // ─────────────────────────────────────────────────────────────
  const applyBorders = (borderType) => {
    if (!targetTable) return
    saveUndoState()

    const table = targetTable
    table.style.borderCollapse = 'collapse'
    const directCells = getDirectCells(table)
    const bStr = `${borderWidth} solid ${borderColor}`

    if (borderType === 'all') {
      table.style.border = bStr
      directCells.forEach(c => { c.style.border = bStr })
    } else if (borderType === 'outside') {
      table.style.border = bStr
      directCells.forEach(c => { c.style.border = 'none' })
    } else if (borderType === 'inside') {
      table.style.border = 'none'
      directCells.forEach(c => { c.style.border = bStr })
    } else if (borderType === 'topBottom') {
      table.style.border = 'none'
      table.style.borderTop = bStr
      table.style.borderBottom = bStr
      directCells.forEach(c => { c.style.border = 'none' })
    } else if (borderType === 'clear') {
      table.style.border = 'none'
      directCells.forEach(c => { c.style.border = 'none' })
    }

    saveUndoState()
    if (onTableUpdated) onTableUpdated()
  }

  // ─────────────────────────────────────────────────────────────
  // 3. SHADING / BACKGROUND COLOR
  // ─────────────────────────────────────────────────────────────
  const applyShading = (color, target) => {
    if (!targetTable) return
    saveUndoState()

    const table = targetTable
    const rows = Array.from(table.querySelectorAll(':scope > tbody > tr, :scope > tr'))
    const directCells = getDirectCells(table)

    if (target === 'header' && rows[0]) {
      rows[0].querySelectorAll('td, th').forEach(c => {
        c.style.backgroundColor = color || 'transparent'
        if (color === '#1e293b' || color === '#065f46' || color === '#1e40af') {
          c.style.color = '#ffffff'
          c.style.fontWeight = 'bold'
        } else if (color === '' || color === 'transparent') {
          c.style.color = 'inherit'
        }
      })
    } else if (target === 'table') {
      directCells.forEach(c => {
        c.style.backgroundColor = color || 'transparent'
      })
    } else if (target === 'banded') {
      rows.forEach((r, idx) => {
        if (idx > 0 && idx % 2 === 0) {
          r.querySelectorAll('td, th').forEach(c => {
            c.style.backgroundColor = color || 'transparent'
          })
        }
      })
    }

    saveUndoState()
    if (onTableUpdated) onTableUpdated()
  }

  // ─────────────────────────────────────────────────────────────
  // 4. TABLE ALIGNMENT & CELL ALIGNMENT
  // ─────────────────────────────────────────────────────────────
  const applyTableAlignment = (align) => {
    if (!targetTable) return
    saveUndoState()

    targetTable.style.display = 'table'
    targetTable.style.float = 'none'
    setTableAlign(align)

    if (align === 'left') {
      targetTable.style.marginLeft = '0'
      targetTable.style.marginRight = 'auto'
    } else if (align === 'center') {
      targetTable.style.marginLeft = 'auto'
      targetTable.style.marginRight = 'auto'
    } else if (align === 'right') {
      targetTable.style.marginLeft = 'auto'
      targetTable.style.marginRight = '0'
    } else if (align === 'full') {
      targetTable.style.width = '100%'
      targetTable.style.marginLeft = '0'
      targetTable.style.marginRight = '0'
    }

    saveUndoState()
    if (onTableUpdated) onTableUpdated()
  }

  const applyCellDataAlign = (align) => {
    if (!targetTable) return
    saveUndoState()

    const directCells = getDirectCells(targetTable)
    directCells.forEach(c => {
      c.style.textAlign = align
    })

    saveUndoState()
    if (onTableUpdated) onTableUpdated()
  }

  const applyCellPadding = (pad) => {
    if (!targetTable) return
    saveUndoState()
    setCellPadding(pad)

    const directCells = getDirectCells(targetTable)
    directCells.forEach(c => {
      c.style.padding = pad
    })

    saveUndoState()
    if (onTableUpdated) onTableUpdated()
  }

  // ─────────────────────────────────────────────────────────────
  // 5. ROW & COLUMN STRUCTURE OPERATIONS
  // ─────────────────────────────────────────────────────────────
  const insertRow = (position = 'below') => {
    if (!targetTable) return
    saveUndoState()

    const tbody = targetTable.querySelector(':scope > tbody') || targetTable
    const rows = tbody.querySelectorAll(':scope > tr')
    if (rows.length === 0) return

    const sampleRow = rows[rows.length - 1]
    const numCols = sampleRow.querySelectorAll('td, th').length
    const newTr = document.createElement('tr')

    for (let i = 0; i < numCols; i++) {
      const td = document.createElement('td')
      td.style.padding = cellPadding
      td.style.border = sampleRow.children[i]?.style?.border || '1px solid #000'
      td.innerHTML = '<br>'
      newTr.appendChild(td)
    }

    if (position === 'above') {
      tbody.insertBefore(newTr, rows[0])
    } else {
      tbody.appendChild(newTr)
    }

    setTableDimensions(prev => ({ ...prev, rows: prev.rows + 1 }))
    saveUndoState()
    if (onTableUpdated) onTableUpdated()
  }

  const deleteRow = () => {
    if (!targetTable) return
    saveUndoState()

    const tbody = targetTable.querySelector(':scope > tbody') || targetTable
    const rows = tbody.querySelectorAll(':scope > tr')
    if (rows.length <= 1) {
      alert('Cannot delete the only row of the table. Delete the entire table instead.')
      return
    }

    const lastRow = rows[rows.length - 1]
    lastRow.remove()

    setTableDimensions(prev => ({ ...prev, rows: prev.rows - 1 }))
    saveUndoState()
    if (onTableUpdated) onTableUpdated()
  }

  const insertColumn = (position = 'right') => {
    if (!targetTable) return
    saveUndoState()

    const rows = targetTable.querySelectorAll('tr')
    rows.forEach((row, rowIdx) => {
      const isHeader = rowIdx === 0 && row.querySelector('th')
      const newCell = document.createElement(isHeader ? 'th' : 'td')
      newCell.style.padding = cellPadding
      newCell.style.border = row.children[0]?.style?.border || '1px solid #000'
      newCell.innerHTML = '<br>'

      if (position === 'left') {
        row.insertBefore(newCell, row.firstChild)
      } else {
        row.appendChild(newCell)
      }
    })

    setTableDimensions(prev => ({ ...prev, cols: prev.cols + 1 }))
    saveUndoState()
    if (onTableUpdated) onTableUpdated()
  }

  const deleteColumn = () => {
    if (!targetTable) return
    saveUndoState()

    const rows = targetTable.querySelectorAll('tr')
    const firstRow = rows[0]
    if (!firstRow || firstRow.children.length <= 1) {
      alert('Cannot delete the only column. Delete the entire table instead.')
      return
    }

    rows.forEach(row => {
      if (row.lastChild) row.removeChild(row.lastChild)
    })

    setTableDimensions(prev => ({ ...prev, cols: prev.cols - 1 }))
    saveUndoState()
    if (onTableUpdated) onTableUpdated()
  }

  const deleteEntireTable = () => {
    if (!targetTable) return
    if (!confirm('Are you sure you want to delete this table?')) return
    saveUndoState()

    targetTable.remove()
    setTargetTable(null)
    setTableDimensions({ rows: 0, cols: 0 })
    saveUndoState()
    if (onTableUpdated) onTableUpdated()
    onClose()
  }

  const insertNewTable = () => {
    const editor = editorRef?.current
    if (!editor) return
    saveUndoState()

    const tableHtml = `
      <table class="e-rte-table" style="width: 100%; border-collapse: collapse; margin: 12px auto; border-top: 2px solid #000; border-bottom: 2px solid #000;">
        <thead>
          <tr style="border-bottom: 1.5px solid #000; font-weight: bold; background: #f8fafc;">
            <th style="padding: 6px 10px; text-align: left; border: none;">Col 1</th>
            <th style="padding: 6px 10px; text-align: left; border: none;">Col 2</th>
            <th style="padding: 6px 10px; text-align: left; border: none;">Col 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px 10px; border: none;"><br></td>
            <td style="padding: 6px 10px; border: none;"><br></td>
            <td style="padding: 6px 10px; border: none;"><br></td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: none;"><br></td>
            <td style="padding: 6px 10px; border: none;"><br></td>
            <td style="padding: 6px 10px; border: none;"><br></td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `
    editor.executeCommand('insertHTML', tableHtml)
    saveUndoState()

    setTimeout(() => {
      const editArea = editor.contentModule?.getEditPanel ? editor.contentModule.getEditPanel() : null
      if (editArea) {
        const tables = editArea.querySelectorAll('table')
        if (tables.length > 0) {
          setTargetTable(tables[tables.length - 1])
          setTableDimensions({ rows: 3, cols: 3 })
        }
      }
    }, 100)
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999999
      }}
      className="w-[520px] max-w-[95vw] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.12)] border border-slate-300 overflow-hidden flex flex-col max-h-[82vh] font-sans select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header Ribbon (Word Table Design Title Bar with Drag Handle) */}
      <div
        onMouseDown={handleDragStart}
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm cursor-move select-none"
        title="Click and drag anywhere on this header to reposition the panel"
      >
        <div className="flex items-center gap-2">
          <div className="text-slate-400 p-0.5 hover:text-slate-200">
            <GripHorizontal size={18} />
          </div>
          <div className="p-1.5 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-lg">
            <TableIcon size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold tracking-wide">Table Design</h2>
              <span className="px-1.5 py-0.2 bg-blue-600/40 border border-blue-400/30 text-blue-200 rounded text-[9px] font-bold uppercase tracking-wider">
                Ribbon
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              {targetTable
                ? `Active Table: ${tableDimensions.rows} Rows × ${tableDimensions.cols} Columns`
                : 'No table selected'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 text-slate-200 hover:text-white rounded-md text-[11px] font-semibold border border-slate-600/60 shadow-xs transition-all cursor-pointer"
            title="Undo Table Change (Ctrl+Z)"
          >
            <RotateCcw size={12} />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={handleRedo}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 text-slate-200 hover:text-white rounded-md text-[11px] font-semibold border border-slate-600/60 shadow-xs transition-all cursor-pointer"
            title="Redo Table Change (Ctrl+Y)"
          >
            <RotateCw size={12} />
            <span>Redo</span>
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Panel"
          >
            <X size={18} />
          </button>
        </div>
      </div>

        {/* Tab Navigation matching Word Ribbon Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('styles')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'styles'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={14} className="text-blue-600" />
            Table Styles Gallery
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('borders')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'borders'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid size={14} className="text-slate-600" />
            Borders & Lines
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shading')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'shading'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette size={14} className="text-emerald-600" />
            Shading & Colors
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'layout'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg border-t border-x border-slate-200 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders size={14} className="text-purple-600" />
            Layout & Alignment
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">

          {/* If No Table is Active */}
          {!targetTable && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center font-bold">
                <TableIcon size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">No Table Currently Selected</h3>
                <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
                  Click inside any table in your question paper to design it, or click the button below to insert a new academic exam table.
                </p>
              </div>
              <button
                type="button"
                onClick={insertNewTable}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Insert 3×3 Exam Table
              </button>
            </div>
          )}

          {targetTable && (
            <>
              {/* ═════════════════════════════════════════════════════════════
                  TAB 1: TABLE STYLES GALLERY (Matching Image 3 in Microsoft Word)
                  ═════════════════════════════════════════════════════════════ */}
              {activeTab === 'styles' && (
                <div className="space-y-5">
                  {/* Word Style Checkboxes (Header Row, Banded Rows, First Column) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-700">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-extrabold">Table Options:</span>
                    
                    <label className="flex items-center gap-2 cursor-pointer select-none hover:text-blue-700">
                      <input
                        type="checkbox"
                        checked={headerRow}
                        onChange={(e) => setHeaderRow(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Header Row</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none hover:text-blue-700">
                      <input
                        type="checkbox"
                        checked={bandedRows}
                        onChange={(e) => {
                          setBandedRows(e.target.checked)
                          applyPresetStyle(e.target.checked ? 'striped' : 'classicGrid')
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Banded Rows</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none hover:text-blue-700">
                      <input
                        type="checkbox"
                        checked={firstColumnBold}
                        onChange={(e) => {
                          setFirstColumnBold(e.target.checked)
                          const rows = targetTable.querySelectorAll('tr')
                          rows.forEach(r => {
                            if (r.children[0]) r.children[0].style.fontWeight = e.target.checked ? 'bold' : 'normal'
                          })
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>First Column Bold</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => applyPresetStyle('clearBorders')}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Clear Borders Only</span>
                    </button>
                  </div>

                  {/* Styles Grid Cards */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Preset Styles Gallery (Click to Apply)
                    </h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      
                      {/* 1. Academic Exam Paper (IEEE / APA Standard) */}
                      <div
                        onClick={() => applyPresetStyle('academic')}
                        className="p-3 border-2 border-slate-200 hover:border-emerald-500 rounded-xl cursor-pointer transition-all hover:shadow-md bg-white flex flex-col justify-between group"
                      >
                        <div className="space-y-1 py-1">
                          <div className="h-0.5 bg-black w-full" />
                          <div className="h-4 bg-slate-100 flex items-center px-1 text-[9px] font-bold text-slate-700 border-b border-black">
                            Header Row
                          </div>
                          <div className="h-3.5 flex items-center px-1 text-[8px] text-slate-500">Data Row 1</div>
                          <div className="h-3.5 flex items-center px-1 text-[8px] text-slate-500">Data Row 2</div>
                          <div className="h-0.5 bg-black w-full" />
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 block">Academic (IEEE/APA)</span>
                          <span className="text-[10px] text-slate-500">Top & bottom line, no vertical</span>
                        </div>
                      </div>

                      {/* 2. Clear All Borders (Borderless Layout) */}
                      <div
                        onClick={() => applyPresetStyle('clearBorders')}
                        className="p-3 border-2 border-slate-200 hover:border-amber-500 rounded-xl cursor-pointer transition-all hover:shadow-md bg-white flex flex-col justify-between group"
                      >
                        <div className="space-y-1 py-1 border border-dashed border-amber-300 rounded-md p-1 bg-amber-50/30">
                          <div className="h-4 flex items-center px-1 text-[9px] font-semibold text-slate-700">Question Item A</div>
                          <div className="h-3.5 flex items-center px-1 text-[8px] text-slate-500">Details & Options</div>
                          <div className="h-3.5 flex items-center px-1 text-[8px] text-slate-500">Marks aligned right</div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-amber-700 block">Clear All Borders</span>
                          <span className="text-[10px] text-slate-500">100% borderless alignment</span>
                        </div>
                      </div>

                      {/* 3. Classic Word Grid */}
                      <div
                        onClick={() => applyPresetStyle('classicGrid')}
                        className="p-3 border-2 border-slate-200 hover:border-blue-500 rounded-xl cursor-pointer transition-all hover:shadow-md bg-white flex flex-col justify-between group"
                      >
                        <div className="border border-black rounded-xs overflow-hidden">
                          <div className="grid grid-cols-3 border-b border-black bg-slate-100 text-[8px] font-bold text-center py-0.5">
                            <span className="border-r border-black">H1</span>
                            <span className="border-r border-black">H2</span>
                            <span>H3</span>
                          </div>
                          <div className="grid grid-cols-3 border-b border-black text-[8px] text-center py-0.5">
                            <span className="border-r border-black">1</span>
                            <span className="border-r border-black">2</span>
                            <span>3</span>
                          </div>
                          <div className="grid grid-cols-3 text-[8px] text-center py-0.5">
                            <span className="border-r border-black">4</span>
                            <span className="border-r border-black">5</span>
                            <span>6</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 block">Classic Word Grid</span>
                          <span className="text-[10px] text-slate-500">Standard crisp black grid</span>
                        </div>
                      </div>

                      {/* 4. Banded Rows (Zebra) */}
                      <div
                        onClick={() => applyPresetStyle('striped')}
                        className="p-3 border-2 border-slate-200 hover:border-indigo-500 rounded-xl cursor-pointer transition-all hover:shadow-md bg-white flex flex-col justify-between group"
                      >
                        <div className="border border-slate-300 rounded-xs overflow-hidden">
                          <div className="bg-slate-800 text-white text-[8px] font-bold px-1 py-0.5">Dark Header</div>
                          <div className="bg-white text-[8px] px-1 py-0.5 border-b border-slate-200">White Row</div>
                          <div className="bg-slate-100 text-[8px] px-1 py-0.5 border-b border-slate-200">Banded Row</div>
                          <div className="bg-white text-[8px] px-1 py-0.5">White Row</div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 block">Zebra Striped</span>
                          <span className="text-[10px] text-slate-500">Alternating row shades</span>
                        </div>
                      </div>

                      {/* 5. Emerald Academic */}
                      <div
                        onClick={() => applyPresetStyle('emeraldAcademic')}
                        className="p-3 border-2 border-slate-200 hover:border-emerald-500 rounded-xl cursor-pointer transition-all hover:shadow-md bg-white flex flex-col justify-between group"
                      >
                        <div className="border border-emerald-300 rounded-xs overflow-hidden">
                          <div className="bg-emerald-800 text-white text-[8px] font-bold px-1 py-0.5">Emerald Header</div>
                          <div className="bg-white text-[8px] px-1 py-0.5 border-b border-emerald-100">Row 1</div>
                          <div className="bg-emerald-50 text-[8px] px-1 py-0.5 border-b border-emerald-100">Row 2</div>
                          <div className="bg-white text-[8px] px-1 py-0.5">Row 3</div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 block">Emerald Academic</span>
                          <span className="text-[10px] text-slate-500">Theme-matching green</span>
                        </div>
                      </div>

                      {/* 6. Executive Blue */}
                      <div
                        onClick={() => applyPresetStyle('executiveBlue')}
                        className="p-3 border-2 border-slate-200 hover:border-blue-500 rounded-xl cursor-pointer transition-all hover:shadow-md bg-white flex flex-col justify-between group"
                      >
                        <div className="border border-blue-300 rounded-xs overflow-hidden">
                          <div className="bg-blue-800 text-white text-[8px] font-bold px-1 py-0.5">Blue Header</div>
                          <div className="bg-white text-[8px] px-1 py-0.5 border-b border-blue-100">Row 1</div>
                          <div className="bg-blue-50 text-[8px] px-1 py-0.5 border-b border-blue-100">Row 2</div>
                          <div className="bg-white text-[8px] px-1 py-0.5">Row 3</div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 block">Executive Blue</span>
                          <span className="text-[10px] text-slate-500">Corporate navy styling</span>
                        </div>
                      </div>

                      {/* 7. Minimal Horizontal Dividers */}
                      <div
                        onClick={() => applyPresetStyle('minimalHorizontal')}
                        className="p-3 border-2 border-slate-200 hover:border-slate-500 rounded-xl cursor-pointer transition-all hover:shadow-md bg-white flex flex-col justify-between group"
                      >
                        <div className="space-y-1 py-1">
                          <div className="h-4 border-b-2 border-slate-400 flex items-center px-1 text-[9px] font-bold text-slate-700">
                            Header Line
                          </div>
                          <div className="h-3.5 border-b border-slate-200 flex items-center px-1 text-[8px] text-slate-600">Row Line 1</div>
                          <div className="h-3.5 border-b border-slate-200 flex items-center px-1 text-[8px] text-slate-600">Row Line 2</div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900 block">Minimal Divider</span>
                          <span className="text-[10px] text-slate-500">Subtle horizontal lines</span>
                        </div>
                      </div>

                      {/* 8. Compact Exam Layout */}
                      <div
                        onClick={() => applyPresetStyle('compactExam')}
                        className="p-3 border-2 border-slate-200 hover:border-purple-500 rounded-xl cursor-pointer transition-all hover:shadow-md bg-white flex flex-col justify-between group"
                      >
                        <div className="border border-black text-[7px] text-center">
                          <div className="bg-slate-200 font-bold border-b border-black">Q No | Part | Marks</div>
                          <div className="border-b border-black">1 | a | 5</div>
                          <div>1 | b | 5</div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-purple-700 block">Compact Exam</span>
                          <span className="text-[10px] text-slate-500">Tight spacing for marks</span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  TAB 2: BORDERS & LINES (Word Borders Ribbon Module)
                  ═════════════════════════════════════════════════════════════ */}
              {activeTab === 'borders' && (
                <div className="space-y-6">
                  
                  {/* Border Width & Color Pickers */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-6">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Border Width</label>
                      <select
                        value={borderWidth}
                        onChange={(e) => setBorderWidth(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="0.5px">½ pt (Fine)</option>
                        <option value="1px">1 pt (Standard Word)</option>
                        <option value="1.5px">1½ pt (Medium)</option>
                        <option value="2px">2 pt (Thick)</option>
                        <option value="3px">3 pt (Heavy)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Border Color</label>
                      <div className="flex items-center gap-2">
                        {[
                          { name: 'Black', hex: '#000000' },
                          { name: 'Slate', hex: '#334155' },
                          { name: 'Gray', hex: '#94a3b8' },
                          { name: 'Light Gray', hex: '#cbd5e1' },
                          { name: 'Emerald', hex: '#059669' },
                          { name: 'Blue', hex: '#2563eb' }
                        ].map(c => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setBorderColor(c.hex)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                              borderColor === c.hex ? 'scale-125 border-blue-600 shadow-xs' : 'border-white'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Border Application Buttons (All, Outside, Inside, Clear) */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Apply Borders to Table
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <button
                        type="button"
                        onClick={() => applyBorders('all')}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left font-bold text-xs text-slate-800 transition-all hover:shadow-xs flex flex-col items-center justify-center gap-2 cursor-pointer"
                      >
                        <Grid size={22} className="text-blue-600" />
                        <span>All Borders</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyBorders('outside')}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left font-bold text-xs text-slate-800 transition-all hover:shadow-xs flex flex-col items-center justify-center gap-2 cursor-pointer"
                      >
                        <Square size={22} className="text-indigo-600" />
                        <span>Outside Only</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyBorders('inside')}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left font-bold text-xs text-slate-800 transition-all hover:shadow-xs flex flex-col items-center justify-center gap-2 cursor-pointer"
                      >
                        <Layers size={22} className="text-emerald-600" />
                        <span>Inside Only</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyBorders('topBottom')}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left font-bold text-xs text-slate-800 transition-all hover:shadow-xs flex flex-col items-center justify-center gap-2 cursor-pointer"
                      >
                        <div className="w-5 h-5 flex flex-col justify-between border-t-2 border-b-2 border-slate-800" />
                        <span>Top & Bottom</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyBorders('clear')}
                        className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left font-bold text-xs text-amber-900 transition-all hover:shadow-xs flex flex-col items-center justify-center gap-2 cursor-pointer"
                      >
                        <div className="w-5 h-5 rounded-xs border border-dashed border-amber-500" />
                        <span>Clear Borders</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  TAB 3: SHADING & BACKGROUND (Word Shading Module)
                  ═════════════════════════════════════════════════════════════ */}
              {activeTab === 'shading' && (
                <div className="space-y-6">
                  
                  {/* Header Row Shading */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Header Row Shading</h4>
                        <p className="text-[11px] text-slate-500">Apply background color to the top header row</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyShading('transparent', 'header')}
                        className="text-xs text-slate-600 hover:text-slate-900 underline font-semibold cursor-pointer"
                      >
                        Clear Header Color
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {[
                        { label: 'Dark Slate', hex: '#1e293b' },
                        { label: 'Emerald Header', hex: '#065f46' },
                        { label: 'Navy Blue', hex: '#1e40af' },
                        { label: 'Light Gray', hex: '#f1f5f9' },
                        { label: 'Soft Green', hex: '#ecfdf5' },
                        { label: 'Soft Blue', hex: '#eff6ff' },
                        { label: 'Soft Amber', hex: '#fef3c7' }
                      ].map(item => (
                        <button
                          key={item.hex}
                          type="button"
                          onClick={() => applyShading(item.hex, 'header')}
                          className="px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 hover:shadow-2xs transition-all cursor-pointer"
                          style={{
                            backgroundColor: item.hex,
                            color: (item.hex === '#1e293b' || item.hex === '#065f46' || item.hex === '#1e40af') ? '#fff' : '#1e293b',
                            borderColor: '#cbd5e1'
                          }}
                        >
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entire Table Shading */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Entire Table Shading</h4>
                        <p className="text-[11px] text-slate-500">Apply subtle background tint to all cells</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyShading('transparent', 'table')}
                        className="text-xs text-slate-600 hover:text-slate-900 underline font-semibold cursor-pointer"
                      >
                        Clear Table Color
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {[
                        { label: 'Plain White', hex: '#ffffff' },
                        { label: 'Subtle Gray', hex: '#f8fafc' },
                        { label: 'Soft Slate', hex: '#f1f5f9' },
                        { label: 'Mint Tint', hex: '#f0fdf4' },
                        { label: 'Ice Blue', hex: '#f0f9ff' },
                        { label: 'Warm Tint', hex: '#fffbeb' }
                      ].map(item => (
                        <button
                          key={item.hex}
                          type="button"
                          onClick={() => applyShading(item.hex, 'table')}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 hover:shadow-2xs transition-all cursor-pointer"
                          style={{ backgroundColor: item.hex }}
                        >
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ═════════════════════════════════════════════════════════════
                  TAB 4: LAYOUT & ROW/COLUMN TOOLS
                  ═════════════════════════════════════════════════════════════ */}
              {activeTab === 'layout' && (
                <div className="space-y-6">

                  {/* Table Alignment & Width */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-800">Table Alignment on Page</h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => applyTableAlignment('left')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            tableAlign === 'left' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Left
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTableAlignment('center')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            tableAlign === 'center' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Center
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTableAlignment('right')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            tableAlign === 'right' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Right
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTableAlignment('full')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            tableAlign === 'full' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          100%
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-800">Cell Text Alignment</h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => applyCellDataAlign('left')}
                          className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <AlignLeft size={14} /> Left
                        </button>
                        <button
                          type="button"
                          onClick={() => applyCellDataAlign('center')}
                          className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <AlignCenter size={14} /> Center
                        </button>
                        <button
                          type="button"
                          onClick={() => applyCellDataAlign('right')}
                          className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <AlignRight size={14} /> Right
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cell Padding / Spacing */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-800">Cell Padding (Density)</h4>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => applyCellPadding('3px 6px')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          cellPadding === '3px 6px' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Compact (Tight Exam)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCellPadding('6px 10px')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          cellPadding === '6px 10px' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Standard Word
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCellPadding('10px 14px')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          cellPadding === '10px 14px' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Relaxed
                      </button>
                    </div>
                  </div>

                  {/* Structure Operations: Add/Delete Rows and Columns */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800">Table Structure Tools</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <button
                        type="button"
                        onClick={() => insertRow('above')}
                        className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} className="text-emerald-600" /> Row Above
                      </button>
                      <button
                        type="button"
                        onClick={() => insertRow('below')}
                        className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} className="text-emerald-600" /> Row Below
                      </button>
                      <button
                        type="button"
                        onClick={() => insertColumn('left')}
                        className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} className="text-blue-600" /> Column Left
                      </button>
                      <button
                        type="button"
                        onClick={() => insertColumn('right')}
                        className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} className="text-blue-600" /> Column Right
                      </button>
                      <button
                        type="button"
                        onClick={deleteRow}
                        className="py-1.5 px-3 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Minus size={13} className="text-rose-600" /> Delete Row
                      </button>
                      <button
                        type="button"
                        onClick={deleteColumn}
                        className="py-1.5 px-3 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Minus size={13} className="text-rose-600" /> Delete Column
                      </button>
                      <button
                        type="button"
                        onClick={deleteEntireTable}
                        className="col-span-2 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 size={13} className="text-rose-600" /> Delete Table
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </div>

        {/* Compact Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-[11px]">
          <span className="text-slate-500 font-medium flex items-center gap-1.5">
            <span>⠿ Drag header to reposition</span>
            <span className="text-emerald-600 font-semibold">• Live real-time preview</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
  )
}
