import * as XLSX from 'xlsx-js-style'

/**
 * Course Overview Excel Exporter
 * 
 * Generates an official, beautifully styled multi-sheet Excel workbook for the
 * Course Overview sub-page of Automated OBE Reports:
 * 
 * 1. Sheet 1: "Course Overview & Attainment"
 *    - Official Course Info & Metrics Banner (with Semester & Academic Year)
 *    - 1. COs Attainment Summary Table + Dedicated Figure 1 Graph Placement Box
 *    - 2. CO Student Distribution Breakdown Table + Dedicated Figure 2 Graph Placement Box
 *    - 3. POs Attainment Summary Table + Dedicated Figure 3 Graph Placement Box
 *    - 4. PO Contribution from Mapped COs Table + Dedicated Figure 4 Graph Placement Box
 * 
 * 2. Sheet 2: "Student CO Heatmap"
 *    - Multi-tier header (Student Info, CO Attainment Scores %, Overall Tier)
 *    - Every student's Roll ID (string type to preserve leading zeroes)
 *    - Color-coded heatmap fills (>=80% Soft Green, 40-79% Soft Yellow, <40% Soft Red)
 *    - Class Average Row at bottom
 *    - Frozen panes on Roll ID and Name for smooth horizontal scrolling
 */
export function exportCourseOverviewToExcel({
  courseInfo = {},
  students = [],
  activeCOs = [],
  activePOs = [],
  coDescriptions = {},
  poDescriptions = {},
  coToPoMapping = {},
  calculations = {},
  batchMetrics = {},
  targetPassMarks = 40,
  kpiCO = 50,
  kpiPO = 50,
  reportScope = 'section'
}) {
  if (!students || students.length === 0) {
    alert('No student records available to export for Course Overview.')
    return
  }

  const wb = XLSX.utils.book_new()

  // Helper to safely unpack string representations from potential object payloads
  const resolveFieldString = (val, fieldType = '') => {
    if (!val) return ''
    if (typeof val === 'string') return val.trim()
    if (typeof val === 'number') return String(val)
    if (typeof val === 'object') {
      if (fieldType === 'semester') {
        const sName = val.semesterName || val.name || val.title || ''
        const year = val.academicYear || ''
        if (sName && year && !sName.includes(year)) return `${sName} ${year}`
        return sName || year || ''
      }
      return val.name || val.batchName || val.sectionName || val.semesterName || val.title || val.code || ''
    }
    return String(val).trim()
  }

  const courseCode = resolveFieldString(courseInfo?.courseCode, 'code') || 'Course'
  const courseTitle = resolveFieldString(courseInfo?.courseTitle || courseInfo?.courseName, 'name') || 'Course Title'
  const batchName = resolveFieldString(courseInfo?.batchName || courseInfo?.batch, 'batch') || 'N/A'
  
  // Format semester to ensure year is always included (e.g. "Spring 2026")
  const rawSem = resolveFieldString(courseInfo?.semesterName || courseInfo?.semester, 'semester') || 'Spring'
  const acadYear = courseInfo?.academicYear || courseInfo?.year || (courseInfo?.semester && typeof courseInfo.semester === 'object' ? courseInfo.semester.academicYear : '') || new Date().getFullYear()
  
  let semesterDisplay = rawSem
  if (semesterDisplay && !/\b\d{4}\b/.test(semesterDisplay)) {
    semesterDisplay = `${semesterDisplay} ${acadYear}`.trim()
  } else if (!semesterDisplay) {
    semesterDisplay = `Spring ${acadYear}`
  }

  const sectionName = resolveFieldString(courseInfo?.rawSectionName || courseInfo?.sectionName || courseInfo?.section, 'section') || 'All'
  const teacherName = resolveFieldString(courseInfo?.teacherName || courseInfo?.instructor, 'name') || 'Course Instructor'

  const PO_NAMES = {
    PO1: 'Engineering knowledge',
    PO2: 'Problem analysis',
    PO3: 'Design/development of solutions',
    PO4: 'Investigation',
    PO5: 'Modern tool usage',
    PO6: 'The engineer and society',
    PO7: 'Environment & sustainability',
    PO8: 'Ethics',
    PO9: 'Individual work and teamwork',
    PO10: 'Communication',
    PO11: 'Project management and finance',
    PO12: 'Life-long learning',
  }

  // Color Palette (Hex without #)
  const C_DARK_EMERALD = '064E3B'
  const C_MID_EMERALD = '047857'
  const C_LIGHT_GREEN = '15803D'
  const C_MINT_BG = 'D1FAE5'
  const C_ICE_BG = 'ECFDF5'
  const C_WHITE = 'FFFFFF'
  const C_GRAY_BORDER = 'D1D5DB'
  const C_GRAY_BG = 'F3F4F6'
  const C_DARK_TEXT = '111827'
  const C_PASS_BG = 'DCFCE7'
  const C_PASS_FG = '166534'
  const C_FAIL_BG = 'FEE2E2'
  const C_FAIL_FG = '991B1B'
  const C_WARN_BG = 'FEF3C7'
  const C_WARN_FG = '92400E'

  const borderThin = {
    top: { style: 'thin', color: { rgb: C_GRAY_BORDER } },
    bottom: { style: 'thin', color: { rgb: C_GRAY_BORDER } },
    left: { style: 'thin', color: { rgb: C_GRAY_BORDER } },
    right: { style: 'thin', color: { rgb: C_GRAY_BORDER } }
  }

  const borderHeader = {
    top: { style: 'medium', color: { rgb: C_DARK_EMERALD } },
    bottom: { style: 'medium', color: { rgb: C_DARK_EMERALD } },
    left: { style: 'thin', color: { rgb: C_GRAY_BORDER } },
    right: { style: 'thin', color: { rgb: C_GRAY_BORDER } }
  }

  /* -------------------------------------------------------------
     SHEET 1: COURSE OVERVIEW & ATTAINMENT SUMMARY
  ------------------------------------------------------------- */
  const ws1Rows = []
  const ws1Merges = []
  const ws1ColCount = 8
  const graphPlaceholders = []

  // Helper to add a dedicated Graph Placement Box with generous canvas
  const addGraphPlacementBox = ({
    figNum,
    title,
    caption
  }) => {
    // 1. Spacing row
    ws1Rows.push(new Array(ws1ColCount).fill(''))

    // 2. Figure Header Banner
    const figHeaderIdx = ws1Rows.length
    const rHeader = new Array(ws1ColCount).fill('')
    rHeader[0] = `📊 FIGURE ${figNum}: ${title.toUpperCase()} (CHART INSERTION AREA)`
    ws1Rows.push(rHeader)
    ws1Merges.push({ s: { r: figHeaderIdx, c: 0 }, e: { r: figHeaderIdx, c: ws1ColCount - 1 } })

    // 3. Dedicated Tall Graph Placement Canvas (15 merged rows for large, spacious image placement)
    const canvasStartIdx = ws1Rows.length
    const canvasRowCount = 15

    for (let i = 0; i < canvasRowCount; i++) {
      const rCanvas = new Array(ws1ColCount).fill('')
      if (i === 0) {
        rCanvas[0] = '[ 🖼️ GRAPH CANVAS AREA: PASTE (Ctrl+V) OR INSERT PICTURE HERE ]'
      }
      ws1Rows.push(rCanvas)
    }

    const canvasEndIdx = ws1Rows.length - 1
    // Merge the entire canvas into ONE large block across all 15 rows and all columns
    ws1Merges.push({ s: { r: canvasStartIdx, c: 0 }, e: { r: canvasEndIdx, c: ws1ColCount - 1 } })

    // 4. Figure Caption Footer
    const captionIdx = ws1Rows.length
    const rCap = new Array(ws1ColCount).fill('')
    rCap[0] = `Figure ${figNum} Description: ${caption}`
    ws1Rows.push(rCap)
    ws1Merges.push({ s: { r: captionIdx, c: 0 }, e: { r: captionIdx, c: ws1ColCount - 1 } })

    // 5. Trailing spacing row
    ws1Rows.push(new Array(ws1ColCount).fill(''))

    graphPlaceholders.push({ figHeaderIdx, canvasStartIdx, canvasEndIdx, captionIdx })
  }

  // 1. Top Banner
  const r0 = new Array(ws1ColCount).fill('')
  r0[0] = `OBE COURSE OVERVIEW & ATTAINMENT REPORT (${reportScope === 'combined' ? 'COMBINED BATCH' : `SECTION: ${sectionName}`})`
  ws1Rows.push(r0)
  ws1Merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: ws1ColCount - 1 } })

  // 2. Course Info Banner (includes Semester with Year)
  const r1 = new Array(ws1ColCount).fill('')
  r1[0] = `Course: ${courseCode} — ${courseTitle}  |  Batch: ${batchName}  |  Section: ${sectionName}  |  Semester: ${semesterDisplay}`
  ws1Rows.push(r1)
  ws1Merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: ws1ColCount - 1 } })

  // 3. Metadata Metrics Banner
  const exportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const r2 = new Array(ws1ColCount).fill('')
  const avgPct = batchMetrics?.averagePercentage ? `${batchMetrics.averagePercentage.toFixed(1)}%` : 'N/A'
  const pRate = batchMetrics?.passRate ? `${batchMetrics.passRate.toFixed(1)}%` : 'N/A'
  r2[0] = `Instructor: ${teacherName}  |  Enrollment: ${students.length} Students  |  Pass Rate: ${pRate}  |  Class Avg: ${avgPct}  |  Date: ${exportDate}`
  ws1Rows.push(r2)
  ws1Merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: ws1ColCount - 1 } })

  // Blank line
  ws1Rows.push(new Array(ws1ColCount).fill(''))

  // -----------------------------------------------------------------
  // 4. Section 1 Header: CO Attainment Summary
  // -----------------------------------------------------------------
  const s1HeaderIdx = ws1Rows.length
  const rSec1 = new Array(ws1ColCount).fill('')
  rSec1[0] = '1. COURSE OUTCOMES (COs) ATTAINMENT SUMMARY'
  ws1Rows.push(rSec1)
  ws1Merges.push({ s: { r: s1HeaderIdx, c: 0 }, e: { r: s1HeaderIdx, c: ws1ColCount - 1 } })

  // Table 1 Headers
  const t1HeaderIdx = ws1Rows.length
  ws1Rows.push([
    'CO Code',
    'CO Description / Focus',
    `Target Pass Mark % (${targetPassMarks}%)`,
    `% Students ≥ Pass Mark`,
    `KPI Benchmark % (${kpiCO}%)`,
    `% Students ≥ KPI`,
    'Attainment Status',
    'Target Difference'
  ])

  const t1StartRow = ws1Rows.length
  activeCOs.forEach(co => {
    const coData = calculations?.coAttainment?.[co] || {}
    const passPct = coData.passMarksPercentage || 0
    const kpiPct = coData.kpiPercentage || 0
    const isAttained = kpiPct >= kpiCO
    const diff = (kpiPct - kpiCO).toFixed(1)
    const diffText = diff >= 0 ? `+${diff}%` : `${diff}%`
    const desc = coDescriptions[co] || `Course Outcome ${co}`

    ws1Rows.push([
      co,
      desc,
      `${targetPassMarks}%`,
      `${passPct.toFixed(1)}%`,
      `${kpiCO}%`,
      `${kpiPct.toFixed(1)}%`,
      isAttained ? 'ATTAINED' : 'NOT ATTAINED',
      diffText
    ])
  })
  const t1EndRow = ws1Rows.length - 1

  // Figure 1: Graph Placement Box for CO Attainment
  addGraphPlacementBox({
    figNum: 1,
    title: 'Course Outcomes (COs) Attainment Graph',
    systemChartTitle: 'Course Outcomes (COs) Attainment',
    caption: 'Bar chart comparison of students meeting course pass threshold versus KPI benchmark across evaluated Course Outcomes.'
  })

  // -----------------------------------------------------------------
  // 5. Section 2 Header: CO Student Distribution Breakdown
  // -----------------------------------------------------------------
  const s2HeaderIdx = ws1Rows.length
  const rSec2 = new Array(ws1ColCount).fill('')
  rSec2[0] = '2. CO STUDENT PERFORMANCE DISTRIBUTION BREAKDOWN (% OF STUDENTS)'
  ws1Rows.push(rSec2)
  ws1Merges.push({ s: { r: s2HeaderIdx, c: 0 }, e: { r: s2HeaderIdx, c: ws1ColCount - 1 } })

  // Table 2 Headers
  const t2HeaderIdx = ws1Rows.length
  ws1Rows.push([
    'CO Code',
    'Total Evaluated',
    'Below 40% (Count)',
    'Below 40% (Student %)',
    '40% – 79% (Count)',
    '40% – 79% (Student %)',
    '≥ 80% (Count)',
    '≥ 80% (Student %)'
  ])

  const t2StartRow = ws1Rows.length
  activeCOs.forEach(co => {
    let below40 = 0
    let between40_79 = 0
    let above80 = 0
    students.forEach(s => {
      const score = calculations?.studentCOs?.[s.id]?.[co] || 0
      if (score > 0 && score < 40) below40++
      else if (score >= 40 && score < 80) between40_79++
      else if (score >= 80) above80++
    })
    const total = students.length || 1

    ws1Rows.push([
      co,
      total,
      below40,
      `${Math.round((below40 / total) * 100)}%`,
      between40_79,
      `${Math.round((between40_79 / total) * 100)}%`,
      above80,
      `${Math.round((above80 / total) * 100)}%`
    ])
  })
  const t2EndRow = ws1Rows.length - 1

  // Figure 2: Graph Placement Box for CO Student Distribution
  addGraphPlacementBox({
    figNum: 2,
    title: 'CO Student Performance Distribution Breakdown Graph',
    systemChartTitle: 'CO Student Distribution',
    caption: 'Stacked cohort distribution illustrating student performance brackets (<40%, 40%–79%, and ≥80%) across Course Outcomes.'
  })

  // -----------------------------------------------------------------
  // 6. Section 3 Header: Program Outcomes (POs) Attainment Summary
  // -----------------------------------------------------------------
  const s3HeaderIdx = ws1Rows.length
  const rSec3 = new Array(ws1ColCount).fill('')
  rSec3[0] = '3. PROGRAM OUTCOMES (POs) ATTAINMENT SUMMARY'
  ws1Rows.push(rSec3)
  ws1Merges.push({ s: { r: s3HeaderIdx, c: 0 }, e: { r: s3HeaderIdx, c: ws1ColCount - 1 } })

  // Table 3 Headers
  const t3HeaderIdx = ws1Rows.length
  ws1Rows.push([
    'PO Code',
    'Program Outcome Description',
    `Target Pass Mark % (${targetPassMarks}%)`,
    `% Students ≥ Pass Mark`,
    `KPI Benchmark % (${kpiPO}%)`,
    `% Students ≥ KPI`,
    'Attainment Status',
    'Target Difference'
  ])

  const t3StartRow = ws1Rows.length
  activePOs.forEach(po => {
    const poData = calculations?.poAttainment?.[po] || {}
    const passPct = poData.passMarksPercentage || 0
    const kpiPct = poData.kpiPercentage || 0
    const isAttained = kpiPct >= kpiPO
    const diff = (kpiPct - kpiPO).toFixed(1)
    const diffText = diff >= 0 ? `+${diff}%` : `${diff}%`
    const desc = poDescriptions[po] || PO_NAMES[po] || `Program Outcome ${po}`

    ws1Rows.push([
      po,
      desc,
      `${targetPassMarks}%`,
      `${passPct.toFixed(1)}%`,
      `${kpiPO}%`,
      `${kpiPct.toFixed(1)}%`,
      isAttained ? 'ATTAINED' : 'NOT ATTAINED',
      diffText
    ])
  })
  const t3EndRow = ws1Rows.length - 1

  // Figure 3: Graph Placement Box for PO Attainment
  addGraphPlacementBox({
    figNum: 3,
    title: 'Program Outcomes (POs) Attainment Graph',
    systemChartTitle: 'Program Outcomes (POs) Attainment',
    caption: 'Cohort attainment levels across Program Outcomes against target pass marks and benchmark KPI criteria.'
  })

  // -----------------------------------------------------------------
  // 7. Section 4 Header: PO Contribution Breakdown from Mapped COs
  // -----------------------------------------------------------------
  const s4HeaderIdx = ws1Rows.length
  const rSec4 = new Array(ws1ColCount).fill('')
  rSec4[0] = '4. PO CONTRIBUTION BREAKDOWN FROM MAPPED COURSE OUTCOMES (COs)'
  ws1Rows.push(rSec4)
  ws1Merges.push({ s: { r: s4HeaderIdx, c: 0 }, e: { r: s4HeaderIdx, c: ws1ColCount - 1 } })

  // Table 4 Headers
  const t4HeaderIdx = ws1Rows.length
  ws1Rows.push([
    'PO Code',
    'PO Focus Domain',
    'Mapped Course Outcomes (COs)',
    'Contributing COs Attainment Values',
    'Calculated PO KPI Attainment %',
    'Attainment Status',
    '',
    ''
  ])
  ws1Merges.push({ s: { r: t4HeaderIdx, c: 5 }, e: { r: t4HeaderIdx, c: 7 } })

  const t4StartRow = ws1Rows.length
  activePOs.forEach(po => {
    const contributingCOs = []
    const contribDetails = []
    activeCOs.forEach(co => {
      const isMapped = coToPoMapping?.[co]?.[po] === 1 || coToPoMapping?.[co]?.[po] === '1' || coToPoMapping?.[co]?.[po] === true
      if (isMapped) {
        const val = (calculations?.coAttainment?.[co]?.kpiPercentage || 0).toFixed(1)
        contributingCOs.push(co)
        contribDetails.push(`${co}: ${val}%`)
      }
    })
    const poKpi = (calculations?.poAttainment?.[po]?.kpiPercentage || 0).toFixed(1)
    const isAttained = parseFloat(poKpi) >= kpiPO

    const row = [
      po,
      PO_NAMES[po] || 'Domain Knowledge',
      contributingCOs.join(', ') || '(Direct Measurement)',
      contribDetails.join(' | ') || 'Direct mapping',
      `${poKpi}%`,
      isAttained ? 'ATTAINED' : 'NOT ATTAINED',
      '',
      ''
    ]
    ws1Rows.push(row)
    ws1Merges.push({ s: { r: ws1Rows.length - 1, c: 5 }, e: { r: ws1Rows.length - 1, c: 7 } })
  })
  const t4EndRow = ws1Rows.length - 1

  // Figure 4: Graph Placement Box for PO Contribution from COs
  addGraphPlacementBox({
    figNum: 4,
    title: 'Program Outcomes (POs) Contribution from Mapped COs Graph',
    systemChartTitle: 'PO Contribution from COs',
    caption: 'Visual breakdown showing individual Course Outcome KPI contributions mapped into each Program Outcome domain.'
  })

  // Convert AOA to Sheet
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Rows)
  ws1['!merges'] = ws1Merges

  // Styling Sheet 1
  for (let r = 0; r < ws1Rows.length; r++) {
    for (let c = 0; c < ws1ColCount; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c })
      const cell = ws1[cellRef]
      if (!cell) continue

      // Row 0: Title Banner
      if (r === 0) {
        cell.s = {
          fill: { fgColor: { rgb: C_DARK_EMERALD } },
          font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: C_WHITE } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
      // Row 1: Course Info
      else if (r === 1) {
        cell.s = {
          fill: { fgColor: { rgb: C_MINT_BG } },
          font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: C_DARK_EMERALD } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
      // Row 2: Metadata Info
      else if (r === 2) {
        cell.s = {
          fill: { fgColor: { rgb: C_ICE_BG } },
          font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: C_DARK_TEXT } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
      // Section Header Banners (Rows: s1HeaderIdx, s2HeaderIdx, s3HeaderIdx, s4HeaderIdx)
      else if (r === s1HeaderIdx || r === s2HeaderIdx || r === s3HeaderIdx || r === s4HeaderIdx) {
        cell.s = {
          fill: { fgColor: { rgb: C_MID_EMERALD } },
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: C_WHITE } },
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 }
        }
      }
      // Table Header Rows (t1HeaderIdx, t2HeaderIdx, t3HeaderIdx, t4HeaderIdx)
      else if (r === t1HeaderIdx || r === t2HeaderIdx || r === t3HeaderIdx || r === t4HeaderIdx) {
        cell.s = {
          fill: { fgColor: { rgb: C_GRAY_BG } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C_DARK_TEXT } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: borderHeader
        }
      }
      // Data Rows in Table 1 (CO Attainment)
      else if (r >= t1StartRow && r <= t1EndRow) {
        const isStatusCol = c === 6
        const isAttained = String(cell.v).toUpperCase().includes('ATTAINED') && !String(cell.v).toUpperCase().includes('NOT')
        const bg = isStatusCol ? (isAttained ? C_PASS_BG : C_FAIL_BG) : (r % 2 === 0 ? C_WHITE : C_ICE_BG)
        const fg = isStatusCol ? (isAttained ? C_PASS_FG : C_FAIL_FG) : (c === 0 ? C_DARK_EMERALD : C_DARK_TEXT)

        cell.s = {
          fill: { fgColor: { rgb: bg } },
          font: { name: 'Calibri', sz: 10, bold: isStatusCol || c === 0 || c === 5, color: { rgb: fg } },
          alignment: { horizontal: c === 1 ? 'left' : 'center', vertical: 'center' },
          border: borderThin
        }
      }
      // Data Rows in Table 2 (CO Distribution)
      else if (r >= t2StartRow && r <= t2EndRow) {
        let bg = r % 2 === 0 ? C_WHITE : C_ICE_BG
        let fg = C_DARK_TEXT
        if (c === 3) { fg = C_FAIL_FG } // Below 40%
        else if (c === 5) { fg = C_WARN_FG } // 40-79%
        else if (c === 7) { fg = C_PASS_FG } // >=80%

        cell.s = {
          fill: { fgColor: { rgb: bg } },
          font: { name: 'Calibri', sz: 10, bold: c === 0 || c >= 3, color: { rgb: fg } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderThin
        }
      }
      // Data Rows in Table 3 (PO Attainment)
      else if (r >= t3StartRow && r <= t3EndRow) {
        const isStatusCol = c === 6
        const isAttained = String(cell.v).toUpperCase().includes('ATTAINED') && !String(cell.v).toUpperCase().includes('NOT')
        const bg = isStatusCol ? (isAttained ? C_PASS_BG : C_FAIL_BG) : (r % 2 === 0 ? C_WHITE : C_ICE_BG)
        const fg = isStatusCol ? (isAttained ? C_PASS_FG : C_FAIL_FG) : (c === 0 ? C_DARK_EMERALD : C_DARK_TEXT)

        cell.s = {
          fill: { fgColor: { rgb: bg } },
          font: { name: 'Calibri', sz: 10, bold: isStatusCol || c === 0 || c === 5, color: { rgb: fg } },
          alignment: { horizontal: c === 1 ? 'left' : 'center', vertical: 'center' },
          border: borderThin
        }
      }
      // Data Rows in Table 4 (PO Contribution)
      else if (r >= t4StartRow && r <= t4EndRow) {
        const isStatusCol = c === 5
        const isAttained = String(cell.v).toUpperCase().includes('ATTAINED') && !String(cell.v).toUpperCase().includes('NOT')
        const bg = isStatusCol ? (isAttained ? C_PASS_BG : C_FAIL_BG) : (r % 2 === 0 ? C_WHITE : C_ICE_BG)
        const fg = isStatusCol ? (isAttained ? C_PASS_FG : C_FAIL_FG) : (c === 0 ? C_DARK_EMERALD : C_DARK_TEXT)

        cell.s = {
          fill: { fgColor: { rgb: bg } },
          font: { name: 'Calibri', sz: 10, bold: isStatusCol || c === 0 || c === 4, color: { rgb: fg } },
          alignment: { horizontal: (c === 1 || c === 2 || c === 3) ? 'left' : 'center', vertical: 'center' },
          border: borderThin
        }
      }
    }
  }

  // Style Graph Placeholders in Sheet 1
  graphPlaceholders.forEach(({ figHeaderIdx, canvasStartIdx, canvasEndIdx, captionIdx }) => {
    // 1. Figure Header
    for (let c = 0; c < ws1ColCount; c++) {
      const cell = ws1[XLSX.utils.encode_cell({ r: figHeaderIdx, c })]
      if (cell) {
        cell.s = {
          fill: { fgColor: { rgb: 'ECFDF5' } },
          font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '065F46' } },
          alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
          border: {
            top: { style: 'medium', color: { rgb: '047857' } },
            bottom: { style: 'thin', color: { rgb: 'A7F3D0' } },
            left: { style: 'medium', color: { rgb: '047857' } },
            right: { style: 'medium', color: { rgb: '047857' } }
          }
        }
      }
    }

    // 2. Canvas Area (15 merged rows for spacious image placement)
    for (let r = canvasStartIdx; r <= canvasEndIdx; r++) {
      for (let c = 0; c < ws1ColCount; c++) {
        const cell = ws1[XLSX.utils.encode_cell({ r, c })]
        if (cell) {
          const isTop = r === canvasStartIdx
          const isBottom = r === canvasEndIdx
          const isLeft = c === 0
          const isRight = c === ws1ColCount - 1

          cell.s = {
            fill: { fgColor: { rgb: 'FAFAFA' } },
            font: {
              name: 'Calibri',
              sz: 11,
              bold: true,
              color: { rgb: '6B7280' }
            },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: isTop ? { style: 'dashed', color: { rgb: '059669' } } : undefined,
              bottom: isBottom ? { style: 'dashed', color: { rgb: '059669' } } : undefined,
              left: isLeft ? { style: 'medium', color: { rgb: '047857' } } : undefined,
              right: isRight ? { style: 'medium', color: { rgb: '047857' } } : undefined
            }
          }
        }
      }
    }

    // 3. Caption Footer
    for (let c = 0; c < ws1ColCount; c++) {
      const cell = ws1[XLSX.utils.encode_cell({ r: captionIdx, c })]
      if (cell) {
        cell.s = {
          fill: { fgColor: { rgb: 'F3F4F6' } },
          font: { name: 'Calibri', sz: 9.5, italic: true, color: { rgb: '374151' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'medium', color: { rgb: '047857' } },
            left: { style: 'medium', color: { rgb: '047857' } },
            right: { style: 'medium', color: { rgb: '047857' } }
          }
        }
      }
    }
  })

  // Dynamic Row Heights for Sheet 1
  const ws1RowHeights = []
  for (let r = 0; r < ws1Rows.length; r++) {
    const isCanvas = graphPlaceholders.some(p => r >= p.canvasStartIdx && r <= p.canvasEndIdx)
    const isFigHeader = graphPlaceholders.some(p => p.figHeaderIdx === r)
    const isCaption = graphPlaceholders.some(p => p.captionIdx === r)

    if (r === 0) ws1RowHeights.push({ hpt: 32 })
    else if (r === 1) ws1RowHeights.push({ hpt: 24 })
    else if (r === 2) ws1RowHeights.push({ hpt: 20 })
    else if (r === s1HeaderIdx || r === s2HeaderIdx || r === s3HeaderIdx || r === s4HeaderIdx) ws1RowHeights.push({ hpt: 25 })
    else if (r === t1HeaderIdx || r === t2HeaderIdx || r === t3HeaderIdx || r === t4HeaderIdx) ws1RowHeights.push({ hpt: 22 })
    else if (isFigHeader) ws1RowHeights.push({ hpt: 24 })
    else if (isCaption) ws1RowHeights.push({ hpt: 22 })
    else if (isCanvas) ws1RowHeights.push({ hpt: 22 })
    else ws1RowHeights.push({ hpt: 19 })
  }
  ws1['!rows'] = ws1RowHeights

  // Column widths for Sheet 1
  ws1['!cols'] = [
    { wch: 12 }, // CO / PO Code
    { wch: 38 }, // Description
    { wch: 22 }, // Target Pass Mark
    { wch: 24 }, // % >= Pass Mark
    { wch: 22 }, // KPI Benchmark
    { wch: 24 }, // % >= KPI
    { wch: 20 }, // Status
    { wch: 18 }  // Difference
  ]

  XLSX.utils.book_append_sheet(wb, ws1, 'Course Overview & Attainment')

  /* -------------------------------------------------------------
     SHEET 2: STUDENT CO ATTAINMENT HEATMAP
  ------------------------------------------------------------- */
  const ws2Rows = []
  const ws2Merges = []
  const coCount = activeCOs.length
  const ws2ColCount = 2 + coCount + 2 // Roll ID, Name, COs..., Avg %, Tier

  // 1. Sheet 2 Banner
  const s2r0 = new Array(ws2ColCount).fill('')
  s2r0[0] = `STUDENT-LEVEL COURSE OUTCOME (CO) ATTAINMENT HEATMAP (${courseCode} — ${sectionName})`
  ws2Rows.push(s2r0)
  ws2Merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: ws2ColCount - 1 } })

  // 2. Course & Batch Info (includes Semester with Year)
  const s2r1 = new Array(ws2ColCount).fill('')
  s2r1[0] = `Course: ${courseCode} — ${courseTitle}  |  Batch: ${batchName}  |  Section: ${sectionName}  |  Semester: ${semesterDisplay}  |  Students: ${students.length}`
  ws2Rows.push(s2r1)
  ws2Merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: ws2ColCount - 1 } })

  // Blank line
  ws2Rows.push(new Array(ws2ColCount).fill(''))

  // 3. Multi-tier Header Row 1 (Parent Groups)
  const tier1RowIdx = ws2Rows.length
  const t1GroupRow = new Array(ws2ColCount).fill('')
  t1GroupRow[0] = 'STUDENT INFO'
  ws2Merges.push({ s: { r: tier1RowIdx, c: 0 }, e: { r: tier1RowIdx, c: 1 } })

  t1GroupRow[2] = `COURSE OUTCOME (CO) ATTAINMENT SCORES (% OBTAINED PER CO)`
  ws2Merges.push({ s: { r: tier1RowIdx, c: 2 }, e: { r: tier1RowIdx, c: 2 + coCount - 1 } })

  t1GroupRow[2 + coCount] = 'OVERALL PERFORMANCE'
  ws2Merges.push({ s: { r: tier1RowIdx, c: 2 + coCount }, e: { r: tier1RowIdx, c: ws2ColCount - 1 } })
  ws2Rows.push(t1GroupRow)

  // 4. Multi-tier Header Row 2 (Sub-columns)
  const tier2RowIdx = ws2Rows.length
  const subCols = ['Student Roll ID', 'Student Name']
  activeCOs.forEach(co => subCols.push(`${co} (%)`))
  subCols.push('Average CO %', 'Mastery Tier')
  ws2Rows.push(subCols)

  // Student Data Rows
  const s2DataStartRow = ws2Rows.length
  students.forEach((student, sIdx) => {
    const sId = String(student.id || student.roll || '')
    const sName = student.name || 'Unknown'
    const row = [sId, sName]

    let coSum = 0
    let validCOCount = 0

    activeCOs.forEach(co => {
      const val = calculations?.studentCOs?.[student.id]?.[co]
      if (typeof val === 'number') {
        row.push(`${val.toFixed(1)}%`)
        coSum += val
        validCOCount++
      } else {
        row.push('0.0%')
      }
    })

    const avgScore = validCOCount > 0 ? (coSum / validCOCount) : 0
    row.push(`${avgScore.toFixed(1)}%`)

    let tier = 'Developing'
    if (avgScore >= 80) tier = 'Exemplary (≥80%)'
    else if (avgScore >= 60) tier = 'Proficient (60-79%)'
    else if (avgScore >= targetPassMarks) tier = 'Satisfactory (Pass Met)'
    else tier = 'Unsatisfactory (Below Pass)'
    row.push(tier)

    ws2Rows.push(row)
  })
  const s2DataEndRow = ws2Rows.length - 1

  // Summary Row: Class Average
  const s2AvgRowIdx = ws2Rows.length
  const avgRow = ['CLASS AVERAGE', `${students.length} Students Evaluated`]
  let overallCOSum = 0

  activeCOs.forEach(co => {
    let sum = 0
    let count = 0
    students.forEach(s => {
      const v = calculations?.studentCOs?.[s.id]?.[co]
      if (typeof v === 'number') {
        sum += v
        count++
      }
    })
    const avg = count > 0 ? (sum / count) : 0
    avgRow.push(`${avg.toFixed(1)}%`)
    overallCOSum += avg
  })

  const grandCOAvg = activeCOs.length > 0 ? (overallCOSum / activeCOs.length) : 0
  avgRow.push(`${grandCOAvg.toFixed(1)}%`)
  avgRow.push(grandCOAvg >= kpiCO ? 'KPI ACHIEVED' : 'KPI NOT ACHIEVED')
  ws2Rows.push(avgRow)

  // Convert Sheet 2 to Sheet
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Rows)
  ws2['!merges'] = ws2Merges

  // Format Sheet 2 Cells
  for (let r = 0; r < ws2Rows.length; r++) {
    for (let c = 0; c < ws2ColCount; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c })
      const cell = ws2[cellRef]
      if (!cell) continue

      // Enforce Roll ID as string text type explicitly to preserve leading zeroes
      if (c === 0 && r >= s2DataStartRow && r <= s2DataEndRow) {
        cell.t = 's'
        cell.z = '@'
      }

      // Title Banner
      if (r === 0) {
        cell.s = {
          fill: { fgColor: { rgb: C_DARK_EMERALD } },
          font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: C_WHITE } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
      // Course Info
      else if (r === 1) {
        cell.s = {
          fill: { fgColor: { rgb: C_MINT_BG } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C_DARK_EMERALD } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
      // Multi-tier Header 1
      else if (r === tier1RowIdx) {
        cell.s = {
          fill: { fgColor: { rgb: C_MID_EMERALD } },
          font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: C_WHITE } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderHeader
        }
      }
      // Multi-tier Header 2
      else if (r === tier2RowIdx) {
        cell.s = {
          fill: { fgColor: { rgb: C_GRAY_BG } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C_DARK_TEXT } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: borderHeader
        }
      }
      // Student Data Rows
      else if (r >= s2DataStartRow && r <= s2DataEndRow) {
        let bg = r % 2 === 0 ? C_WHITE : C_ICE_BG
        let fg = C_DARK_TEXT
        let isBold = false

        // Individual CO Cells (Heatmap Styling)
        if (c >= 2 && c < 2 + coCount) {
          const rawVal = parseFloat(String(cell.v).replace('%', '')) || 0
          if (rawVal >= 80) {
            bg = C_PASS_BG
            fg = C_PASS_FG
            isBold = true
          } else if (rawVal >= 50) {
            bg = C_WARN_BG
            fg = C_WARN_FG
            isBold = true
          } else {
            bg = C_FAIL_BG
            fg = C_FAIL_FG
            isBold = true
          }
        }
        // Average CO %
        else if (c === 2 + coCount) {
          const avgVal = parseFloat(String(cell.v).replace('%', '')) || 0
          bg = avgVal >= kpiCO ? C_PASS_BG : C_FAIL_BG
          fg = avgVal >= kpiCO ? C_PASS_FG : C_FAIL_FG
          isBold = true
        }
        // Mastery Tier
        else if (c === 2 + coCount + 1) {
          const tierStr = String(cell.v)
          if (tierStr.includes('Exemplary') || tierStr.includes('Proficient')) {
            bg = C_PASS_BG
            fg = C_PASS_FG
          } else if (tierStr.includes('Satisfactory')) {
            bg = C_WARN_BG
            fg = C_WARN_FG
          } else {
            bg = C_FAIL_BG
            fg = C_FAIL_FG
          }
          isBold = true
        } else if (c === 0) {
          isBold = true
          fg = C_DARK_EMERALD
        }

        cell.s = {
          fill: { fgColor: { rgb: bg } },
          font: { name: 'Calibri', sz: 9.5, bold: isBold, color: { rgb: fg } },
          alignment: { horizontal: c === 1 ? 'left' : 'center', vertical: 'center' },
          border: borderThin
        }
      }
      // Summary / Class Average Row
      else if (r === s2AvgRowIdx) {
        cell.s = {
          fill: { fgColor: { rgb: C_MINT_BG } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C_DARK_EMERALD } },
          alignment: { horizontal: c === 1 ? 'left' : 'center', vertical: 'center' },
          border: borderHeader
        }
      }
    }
  }

  // Freeze Panes for Sheet 2: Roll ID and Name frozen on left, headers frozen on top
  ws2['!freeze'] = { xSplit: 2, ySplit: s2DataStartRow }

  // Auto-column widths for Sheet 2
  const ws2Cols = [
    { wch: 18 }, // Roll ID
    { wch: 26 }, // Name
    ...Array(coCount).fill({ wch: 12 }), // COs
    { wch: 16 }, // Avg CO %
    { wch: 22 }  // Mastery Tier
  ]
  ws2['!cols'] = ws2Cols

  XLSX.utils.book_append_sheet(wb, ws2, 'Student CO Heatmap')

  // Generate Safe Descriptive File Name
  const safeCourseCode = (courseCode || 'Course').trim().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_')
  const safeCourseName = (courseTitle || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  const safeBatch = (batchName || 'All_Batch').trim().replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeSection = (sectionName || 'All_Sec').trim().replace(/[^a-zA-Z0-9_-]/g, '_')
  const dateStr = new Date().toISOString().split('T')[0]

  const fileNameParts = ['OBE_Course_Overview', safeCourseCode]
  if (safeCourseName) fileNameParts.push(safeCourseName)
  fileNameParts.push(`Batch_${safeBatch}`)
  if (reportScope !== 'combined') fileNameParts.push(`Sec_${safeSection}`)
  else fileNameParts.push('Combined_Batch')

  const fileName = `${fileNameParts.join('_')}.xlsx`
  XLSX.writeFile(wb, fileName)
}
