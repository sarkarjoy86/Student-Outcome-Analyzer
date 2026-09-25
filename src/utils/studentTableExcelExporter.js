import * as XLSX from 'xlsx-js-style'

/**
 * Export the complete Student Table to a beautifully styled Excel workbook.
 * 
 * Features:
 * - 2-tier headers matching the UI (Continuous Assessment, Mid Term, Term Final, Overall Results)
 * - Sub-headers with assessment names, question numbers, CO mappings, and Max Marks
 * - Full student records with IDs stored as strings (preserving leading zeroes)
 * - Custom styling: emerald header bars, pastel section fills, bold numbers, clear borders
 * - Pass/Fail color pills (soft green / soft red)
 * - Summary / Class Average row at the bottom
 * - Automatic column width calculation
 */
export function exportStudentTableToExcel({
  courseInfo = {},
  students = [],
  cols = [],
  studentTotals = {},
  getColMark,
  totalMax = 300,
  credits = 3,
  avgGPA = 0,
  passRatePct = 0,
  totalAvg = 0,
  getGradeAndGP
}) {
  if (!students || students.length === 0) {
    alert('No student records available to export.')
    return
  }

  const wb = XLSX.utils.book_new()

  // Calculate spans for tier-1 headers
  const contCols = cols.filter(c => c.parent === 'CT' || c.parent === 'Others')
  const midCols = cols.filter(c => c.parent === 'Mid Term')
  const finalCols = cols.filter(c => c.parent === 'Term Final')

  const contSpan = contCols.length
  const midSpan = midCols.length
  const finalSpan = finalCols.length
  const overallSpan = 5 // Total, %, Grade, CGPA, Pass/Fail

  const contMax = credits === 2 ? 40 : 60
  const midMax = credits === 2 ? 60 : 90
  const finalMax = credits === 2 ? 100 : 150
  const courseTotalMax = credits === 2 ? 200 : 300

  // Total columns = 2 (Roll ID, Name) + cols.length + 5 (Overall)
  const totalColCount = 2 + cols.length + overallSpan

  // Palettes (Hex colors without # for xlsx-js-style RGB)
  const C_DARK_EMERALD = '064E3B'
  const C_MID_EMERALD = '047857'
  const C_LIGHT_GREEN = '15803D'
  const C_MINT_HEADER = 'D1FAE5'
  const C_MINT_BEST_CT = 'A7F3D0'
  const C_LIGHT_ROW_ALT = 'F9FAFB'
  const C_WHITE = 'FFFFFF'
  const C_GRAY_BORDER = 'D1D5DB'
  const C_DARK_TEXT = '111827'
  const C_GREEN_TEXT = '065F46'
  const C_PASS_BG = 'DCFCE7'
  const C_PASS_FG = '166534'
  const C_FAIL_BG = 'FEE2E2'
  const C_FAIL_FG = '991B1B'
  const C_SUMMARY_BG = 'ECFDF5'

  const borderThin = {
    top: { style: 'thin', color: { rgb: C_GRAY_BORDER } },
    bottom: { style: 'thin', color: { rgb: C_GRAY_BORDER } },
    left: { style: 'thin', color: { rgb: C_GRAY_BORDER } },
    right: { style: 'thin', color: { rgb: C_GRAY_BORDER } }
  }

  const borderMedium = {
    top: { style: 'medium', color: { rgb: C_MID_EMERALD } },
    bottom: { style: 'medium', color: { rgb: C_MID_EMERALD } },
    left: { style: 'thin', color: { rgb: C_GRAY_BORDER } },
    right: { style: 'thin', color: { rgb: C_GRAY_BORDER } }
  }

  const rows = []
  const merges = []

  // Row 0: Banner Title
  const r0 = new Array(totalColCount).fill('')
  r0[0] = 'STUDENT MARKS OVERVIEW & ASSESSMENT SHEET'
  rows.push(r0)
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalColCount - 1 } })

  // Row 1: Course Info
  const courseCode = courseInfo?.courseCode || 'Course'
  const courseName = courseInfo?.courseName || courseInfo?.courseTitle || ''
  const batchName = courseInfo?.batchName || courseInfo?.batch || ''
  const semesterName = courseInfo?.semesterName || courseInfo?.semester || ''
  const sectionName = courseInfo?.sectionName || courseInfo?.section || ''

  const r1 = new Array(totalColCount).fill('')
  r1[0] = `Course: ${courseCode} — ${courseName}  |  Batch: ${batchName || 'All'}  |  Semester: ${semesterName || 'All'}  |  Section: ${sectionName || 'All'}`
  rows.push(r1)
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalColCount - 1 } })

  // Row 2: Metadata / Date
  const r2 = new Array(totalColCount).fill('')
  const exportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  r2[0] = `Total Students: ${students.length}  |  Credits: ${credits} (${courseTotalMax} Marks)  |  Generated on: ${exportDate}`
  rows.push(r2)
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: totalColCount - 1 } })

  // Row 3: Blank separator
  rows.push(new Array(totalColCount).fill(''))

  // Row 4: Tier-1 Header (Parent Sections)
  const headerRowIdx = 4
  const r4 = new Array(totalColCount).fill('')
  let colPointer = 0

  // Student Info
  r4[colPointer] = 'STUDENT INFO'
  merges.push({ s: { r: headerRowIdx, c: colPointer }, e: { r: headerRowIdx, c: colPointer + 1 } })
  colPointer += 2

  // Continuous Assessment
  if (contSpan > 0) {
    r4[colPointer] = `CONTINUOUS ASSESSMENT (${contMax} MARKS)`
    merges.push({ s: { r: headerRowIdx, c: colPointer }, e: { r: headerRowIdx, c: colPointer + contSpan - 1 } })
    colPointer += contSpan
  }

  // Mid Term
  if (midSpan > 0) {
    r4[colPointer] = `MID TERM (${midMax} MARKS)`
    merges.push({ s: { r: headerRowIdx, c: colPointer }, e: { r: headerRowIdx, c: colPointer + midSpan - 1 } })
    colPointer += midSpan
  }

  // Term Final
  if (finalSpan > 0) {
    r4[colPointer] = `TERM-FINAL (${finalMax} MARKS)`
    merges.push({ s: { r: headerRowIdx, c: colPointer }, e: { r: headerRowIdx, c: colPointer + finalSpan - 1 } })
    colPointer += finalSpan
  }

  // Overall Results
  r4[colPointer] = 'OVERALL RESULTS'
  merges.push({ s: { r: headerRowIdx, c: colPointer }, e: { r: headerRowIdx, c: colPointer + overallSpan - 1 } })
  rows.push(r4)

  // Row 5: Tier-2 Sub-Header (Assessment Names & Mappings)
  const subHeaderRowIdx = 5
  const r5 = [
    'Roll ID',
    'Student Name',
    ...cols.map(c => c.co ? `${c.name}\n(${c.co})` : c.name),
    `Total (${totalMax})`,
    'Total (100)',
    'Grade',
    'CGPA',
    'Pass / Fail'
  ]
  rows.push(r5)

  // Row 6: Tier-3 Max Marks Row
  const maxMarksRowIdx = 6
  const r6 = [
    '',
    'Max Marks',
    ...cols.map(c => `Max: ${c.maxMarks}`),
    `Max: ${totalMax}`,
    'Max: 100',
    '-',
    'Scale 4.00',
    'Target ≥40%'
  ]
  rows.push(r6)

  // Rows 7 to N: Student Data Rows
  const sortedStudents = [...students].sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
  const studentStartRowIdx = 7

  sortedStudents.forEach(student => {
    const totalScore = studentTotals[student.id] || 0
    const pct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0
    const { grade, gp } = getGradeAndGP ? getGradeAndGP(pct) : { grade: pct >= 40 ? 'D' : 'F', gp: pct >= 40 ? 2.0 : 0 }
    const isPassed = pct >= 40

    const rowData = [
      String(student.id || ''),
      student.enrollmentType === 'retake'
        ? `${student.name} [Re-B:${String(student.originalBatch || '').trim().replace(/^batch\s*/i, '').replace(/^b/i, '') || 'Retake'}]`
        : student.name,
      ...cols.map(col => {
        const val = getColMark(student, col)
        return typeof val === 'number' ? val : (parseFloat(val) || 0)
      }),
      parseFloat(totalScore.toFixed(1)),
      parseFloat(pct.toFixed(1)),
      grade,
      parseFloat(gp.toFixed(2)),
      isPassed ? 'Pass' : 'Fail'
    ]
    rows.push(rowData)
  })

  // Final Row: Class Average Row
  const avgRowIdx = rows.length
  const avgRow = [
    'Class Average',
    '',
    ...cols.map(col => {
      const marksList = students.map(s => getColMark(s, col))
      const avg = marksList.length > 0 ? marksList.reduce((sum, val) => sum + (parseFloat(val) || 0), 0) / marksList.length : 0
      return parseFloat(avg.toFixed(1))
    }),
    parseFloat(totalAvg.toFixed(1)),
    parseFloat((totalMax > 0 ? (totalAvg / totalMax) * 100 : 0).toFixed(1)),
    '-',
    `Avg GPA: ${avgGPA.toFixed(2)}`,
    `${passRatePct}% Pass`
  ]
  rows.push(avgRow)
  merges.push({ s: { r: avgRowIdx, c: 0 }, e: { r: avgRowIdx, c: 1 } })

  // Convert array of arrays to sheet
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = merges

  // Column Widths
  const colWidths = [
    { wch: 20 }, // Roll ID
    { wch: 28 }, // Student Name
    ...cols.map(c => ({ wch: Math.max(c.name.length + 3, (c.co ? c.co.length + 4 : 8), 12) })),
    { wch: 14 }, // Total (300)
    { wch: 14 }, // Total (100)
    { wch: 10 }, // Grade
    { wch: 14 }, // CGPA
    { wch: 14 }  // Pass/Fail
  ]
  ws['!cols'] = colWidths

  // Apply Beautiful Cell Styles
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < totalColCount; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c })
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }
      const cell = ws[cellRef]

      // Format Roll ID explicitly as string
      if (r >= studentStartRowIdx && r < avgRowIdx && c === 0) {
        cell.t = 's'
      }

      // Default border
      cell.s = {
        border: borderThin,
        font: { name: 'Calibri', sz: 10 },
        alignment: { vertical: 'center' }
      }

      // 1. Banner Row 0
      if (r === 0) {
        cell.s = {
          fill: { fgColor: { rgb: C_DARK_EMERALD } },
          font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: C_WHITE } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
      // 2. Course Info Row 1
      else if (r === 1) {
        cell.s = {
          fill: { fgColor: { rgb: 'ECFDF5' } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C_GREEN_TEXT } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
      // 3. Metadata Row 2
      else if (r === 2) {
        cell.s = {
          fill: { fgColor: { rgb: 'ECFDF5' } },
          font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: '4B5563' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
      // 4. Blank Row 3
      else if (r === 3) {
        cell.s = {}
      }
      // 5. Tier-1 Header Row 4
      else if (r === headerRowIdx) {
        let bgColor = C_MID_EMERALD
        if (c < 2) bgColor = C_DARK_EMERALD
        else if (c >= 2 + contSpan && c < 2 + contSpan + midSpan) bgColor = C_LIGHT_GREEN
        else if (c >= totalColCount - overallSpan) bgColor = C_DARK_EMERALD

        cell.s = {
          fill: { fgColor: { rgb: bgColor } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C_WHITE } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: borderThin
        }
      }
      // 6. Tier-2 Sub-Header Row 5
      else if (r === subHeaderRowIdx) {
        const isBestCT = c >= 2 && c < 2 + cols.length && cols[c - 2]?.isBestCTTotal
        const isOverall = c >= totalColCount - overallSpan

        let bgColor = C_MINT_HEADER
        let textColor = C_GREEN_TEXT
        if (isBestCT) {
          bgColor = C_MINT_BEST_CT
          textColor = C_DARK_EMERALD
        } else if (isOverall) {
          bgColor = 'D1FAE5'
          textColor = C_GREEN_TEXT
        }

        cell.s = {
          fill: { fgColor: { rgb: bgColor } },
          font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: textColor } },
          alignment: { horizontal: c === 1 ? 'left' : 'center', vertical: 'center', wrapText: true },
          border: borderThin
        }
      }
      // 7. Tier-3 Max Marks Row 6
      else if (r === maxMarksRowIdx) {
        cell.s = {
          fill: { fgColor: { rgb: 'F3F4F6' } },
          font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: '6B7280' } },
          alignment: { horizontal: c === 1 ? 'left' : 'center', vertical: 'center' },
          border: borderThin
        }
      }
      // 8. Student Data Rows
      else if (r >= studentStartRowIdx && r < avgRowIdx) {
        const isEvenRow = (r - studentStartRowIdx) % 2 === 0
        const rowBg = isEvenRow ? C_WHITE : C_LIGHT_ROW_ALT
        const isBestCT = c >= 2 && c < 2 + cols.length && cols[c - 2]?.isBestCTTotal

        let cellBg = isBestCT ? 'ECFDF5' : rowBg
        let fontColor = C_DARK_TEXT
        let fontBold = false

        // Roll ID
        if (c === 0) {
          fontBold = true
          fontColor = '1F2937'
        }
        // Student Name
        else if (c === 1) {
          fontBold = true
          fontColor = '1F2937'
        }
        // Best CT Total
        else if (isBestCT) {
          fontBold = true
          fontColor = C_DARK_EMERALD
        }
        // Total columns
        else if (c === totalColCount - 5 || c === totalColCount - 4) {
          cellBg = 'ECFDF5'
          fontBold = true
          fontColor = C_DARK_EMERALD
        }
        // Grade
        else if (c === totalColCount - 3) {
          fontBold = true
        }
        // CGPA
        else if (c === totalColCount - 2) {
          fontBold = true
        }
        // Pass/Fail Pill
        else if (c === totalColCount - 1) {
          const val = String(cell.v || '').trim()
          const isPass = val.toLowerCase() === 'pass'
          cellBg = isPass ? C_PASS_BG : C_FAIL_BG
          fontColor = isPass ? C_PASS_FG : C_FAIL_FG
          fontBold = true
        }

        cell.s = {
          fill: { fgColor: { rgb: cellBg } },
          font: { name: 'Calibri', sz: 10, bold: fontBold, color: { rgb: fontColor } },
          alignment: {
            horizontal: c === 1 ? 'left' : 'center',
            vertical: 'center'
          },
          border: borderThin
        }
      }
      // 9. Summary / Class Average Row
      else if (r === avgRowIdx) {
        const isPassFail = c === totalColCount - 1
        cell.s = {
          fill: { fgColor: { rgb: isPassFail ? C_PASS_BG : C_SUMMARY_BG } },
          font: {
            name: 'Calibri',
            sz: 10,
            bold: true,
            color: { rgb: isPassFail ? C_PASS_FG : C_DARK_EMERALD }
          },
          alignment: {
            horizontal: c <= 1 ? 'left' : 'center',
            vertical: 'center'
          },
          border: borderMedium
        }
      }
    }
  }

  // Freeze Panes: keep Roll ID, Name, and Header Rows frozen when scrolling
  ws['!freeze'] = { xSplit: 2, ySplit: studentStartRowIdx }

  // Append sheet and download
  XLSX.utils.book_append_sheet(wb, ws, 'Student Marks')

  const safeCourse = (courseCode || 'Course').replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeBatch = (batchName || 'All_Batch').replace(/[^a-zA-Z0-9_-]/g, '_')
  const dateStr = new Date().toISOString().split('T')[0]
  const fileName = `Student_Table_${safeCourse}_${safeBatch}_${dateStr}.xlsx`

  XLSX.writeFile(wb, fileName)
}
