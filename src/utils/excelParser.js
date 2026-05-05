// Excel Parser - Extracts all data from the comprehensive Excel file
import * as XLSX from 'xlsx'

/**
 * Parse Excel file and extract:
 * - Assessment configuration (from upper rows)
 * - Student data with marks
 * - Course information (if available)
 * - CO-PO mapping (if available)
 */
export const parseComprehensiveExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

        // Convert sheet to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1, // Use array format to preserve row structure
          defval: '' // Default value for empty cells
        })

        // Parse the data
        const parsed = parseExcelStructure(jsonData)
        resolve(parsed)
      } catch (err) {
        reject(new Error(`Error parsing Excel file: ${err.message}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Error reading file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse Excel structure to extract assessments, students, and marks
 */
const parseExcelStructure = (rows) => {
  // Find the assessment configuration section (usually in first 10-15 rows)
  // Look for rows containing "Assessment Type", "Description", "Maximum Marks", "CO"
  let assessmentStartRow = -1
  let studentDataStartRow = -1

  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const row = rows[i] || []
    const rowText = row.join(' ').toLowerCase()

    if (rowText.includes('assessment type') || rowText.includes('description')) {
      assessmentStartRow = i
    }

    // Look for student ID column header
    if ((rowText.includes('student id') || rowText.includes('id') || rowText.includes('roll')) &&
      rowText.includes('name') && assessmentStartRow !== -1) {
      studentDataStartRow = i
      break
    }
  }

  // If we didn't find the structure, try alternative approach
  if (assessmentStartRow === -1) {
    assessmentStartRow = 0
  }
  if (studentDataStartRow === -1) {
    // Look for first row with numeric ID
    for (let i = 10; i < rows.length; i++) {
      const row = rows[i] || []
      if (row.length > 0 && /^\d+$/.test(String(row[0]).trim())) {
        studentDataStartRow = i
        break
      }
    }
  }

  // Extract assessment configuration
  const { config: assessments, assessmentColPositions, assessmentOrder } = extractAssessmentConfig(rows, assessmentStartRow, studentDataStartRow)

  // Extract student data (pass column positions and order)
  const { students, marks } = extractStudentData(rows, studentDataStartRow, assessments, assessmentColPositions, assessmentOrder)

  // Extract course info if available (look in first few rows)
  const courseInfo = extractCourseInfo(rows)

  return {
    assessments,
    students,
    marks,
    courseInfo,
  }
}

/**
 * Extract assessment configuration from Excel
 * Expected structure based on image:
 * - Row with "Assessment Type", "Description", etc. headers
 * - Row with assessment names (CT-1, CT-2, Q1, etc.)
 * - Row with Maximum Marks
 * - Row with CO mapping
 */
const extractAssessmentConfig = (rows, startRow, studentDataStartRow) => {
  const config = {
    cts: [],
    midTerm: [],
    final: [],
    assignments: [],
    attendance: null, // Only set if found in Excel
    performance: null, // Only set if found in Excel
    presentation: null, // Only set if found in Excel
  }

  // Track column positions in the configuration section
  const assessmentColPositions = []

  // Find rows by content pattern
  let nameRow = -1
  let maxMarksRow = -1
  let coRow = -1

  // Search for assessment configuration rows
  for (let i = startRow; i < Math.min(startRow + 20, studentDataStartRow); i++) {
    const row = rows[i] || []
    if (row.length === 0) continue

    const rowText = row.join(' ').toLowerCase()

    // Find row with assessment names (CT-1, CT-2, Q1, Assignment, etc.)
    const hasAssessmentNames = row.some(cell => {
      const cellStr = String(cell).toUpperCase().trim()
      return cellStr.match(/^CT-\d+$/) ||
        cellStr.match(/^Q\d+$/) ||
        cellStr === 'ASSIGNMENT' ||
        cellStr.includes('ASSIGNMENT') ||
        cellStr.includes('ATTENDANCE') ||
        cellStr.includes('PERFORMANCE') ||
        cellStr.includes('PERF') ||
        cellStr.includes('PRESENTATION')
    })

    if (hasAssessmentNames && nameRow === -1) {
      nameRow = i
      continue
    }

    // Find row with max marks (contains positive numbers like 10, 15, 30, etc.)
    if (nameRow !== -1 && i > nameRow) {
      const hasMaxMarks = row.some(cell => {
        const val = parseFloat(cell)
        return !isNaN(val) && val > 0
      })

      if (hasMaxMarks && maxMarksRow === -1) {
        maxMarksRow = i
        continue
      }
    }

    // Find row with CO numbers (1-12)
    if (maxMarksRow !== -1 && i > maxMarksRow) {
      const hasCOs = row.some(cell => {
        const val = parseFloat(cell)
        return !isNaN(val) && val >= 1 && val <= 12 && Number.isInteger(val)
      })

      if (hasCOs && coRow === -1) {
        coRow = i
        break
      }
    }
  }

  // Also track the order of assessments as they appear in Excel columns
  const assessmentOrder = []

  // If we found the configuration rows, parse them
  if (nameRow !== -1 && maxMarksRow !== -1 && coRow !== -1) {
    const names = rows[nameRow] || []
    const maxMarks = rows[maxMarksRow] || []
    const cos = rows[coRow] || []

    // Also check the row above nameRow for "Mid Term" / "Term Final" context
    const descRow = nameRow > 0 ? (rows[nameRow - 1] || []) : []

    // Build a column-to-section map from the description row
    // e.g., if descRow has "Mid Term (90)" at col9, then cols 9-11 belong to Mid Term
    const colSectionMap = {}
    let currentSection = ''
    for (let col = 0; col < descRow.length; col++) {
      const desc = String(descRow[col] || '').trim().toUpperCase()
      if (desc.includes('MID TERM') || desc.includes('MIDTERM')) {
        currentSection = 'midTerm'
      } else if (desc.includes('TERM FINAL') || desc.includes('FINAL')) {
        currentSection = 'final'
      } else if (desc.includes('ASSESSMENT') || desc.includes('CP')) {
        currentSection = 'assessment'
      }
      if (currentSection) {
        colSectionMap[col] = currentSection
      }
    }
    // Forward-fill: columns without a section inherit the previous column's section
    let lastSection = ''
    for (let col = 0; col < Math.max(names.length, maxMarks.length); col++) {
      if (colSectionMap[col]) {
        lastSection = colSectionMap[col]
      } else if (lastSection) {
        colSectionMap[col] = lastSection
      }
    }

    for (let col = 0; col < Math.max(names.length, maxMarks.length, cos.length); col++) {
      const name = String(names[col] || '').trim()
      const maxMark = parseFloat(maxMarks[col]) || 0
      const coNum = parseFloat(cos[col])

      if (!name || maxMark === 0) continue

      const nameUpper = name.toUpperCase()
      // Only set CO if it's a valid number, otherwise leave as empty string
      const coValue = !isNaN(coNum) && coNum >= 1 && coNum <= 12 ? `CO${Math.floor(coNum)}` : ''

      // Store column position for this assessment
      assessmentColPositions.push(col)

      // Determine the section from the description row for Q-type assessments
      const section = colSectionMap[col] || ''

      // Classify assessments
      if (nameUpper.match(/^CT-\d+$/)) {
        config.cts.push({
          name: name,
          maxMarks: maxMark,
          co: coValue,
        })
        assessmentOrder.push({ key: `cts_${name}`, type: 'cts', name, col })
      } else if (nameUpper.includes('PRESENTATION')) {
        // IMPORTANT: Check PRESENTATION before ASSIGNMENT because both could match substring patterns
        config.presentation = {
          name: 'Presentation',
          maxMarks: maxMark,
          co: coValue,
        }
        assessmentOrder.push({ key: 'presentation_Presentation', type: 'presentation', name: 'Presentation', col })
      } else if (nameUpper === 'ASSIGNMENT' || nameUpper.includes('ASSIGNMENT')) {
        config.assignments.push({
          name: name,
          maxMarks: maxMark,
          co: coValue,
        })
        assessmentOrder.push({ key: `assignments_${name}`, type: 'assignments', name, col })
      } else if (nameUpper.includes('ATTENDANCE')) {
        config.attendance = {
          name: name,
          maxMarks: maxMark,
          co: coValue,
        }
        assessmentOrder.push({ key: 'attendance_Attendance', type: 'attendance', name: 'Attendance', col })
      } else if (nameUpper.includes('PERFORMANCE') || nameUpper.includes('PERF')) {
        config.performance = {
          name: 'Performance',
          maxMarks: maxMark,
          co: coValue,
        }
        assessmentOrder.push({ key: 'performance_Performance', type: 'performance', name: 'Performance', col })
      } else if (nameUpper.match(/^Q\d+$/)) {
        // Use section context from description row to determine Mid Term vs Final
        if (section === 'final') {
          config.final.push({ name, maxMarks: maxMark, co: coValue })
          assessmentOrder.push({ key: `final_${name}`, type: 'final', name, col })
        } else if (section === 'midTerm') {
          config.midTerm.push({ name, maxMarks: maxMark, co: coValue })
          assessmentOrder.push({ key: `midTerm_${name}`, type: 'midTerm', name, col })
        } else {
          // No section context — fallback: first 3 Qs are Mid Term, rest are Final
          if (config.midTerm.length < 3) {
            config.midTerm.push({ name, maxMarks: maxMark, co: coValue })
            assessmentOrder.push({ key: `midTerm_${name}`, type: 'midTerm', name, col })
          } else {
            config.final.push({ name, maxMarks: maxMark, co: coValue })
            assessmentOrder.push({ key: `final_${name}`, type: 'final', name, col })
          }
        }
      }
    }
  }

  return { config, assessmentColPositions, assessmentOrder }
}

/**
 * Extract student data and marks from Excel
 */
const extractStudentData = (rows, startRow, assessments, assessmentColPositions = null, assessmentOrder = null) => {
  const students = []
  const marks = {}

  if (startRow === -1 || startRow >= rows.length) {
    return { students, marks }
  }

  // Try to find header row - check startRow and startRow - 1
  let headerRow = rows[startRow] || []
  let dataStartRow = startRow + 1

  // Check if startRow - 1 has better headers
  if (startRow > 0) {
    const prevRow = rows[startRow - 1] || []
    const prevRowText = prevRow.join(' ').toLowerCase()
    const currentRowText = headerRow.join(' ').toLowerCase()

    // If previous row has more assessment-related keywords, use it as header
    const prevHasAssessments = prevRowText.includes('ct-') || prevRowText.includes('q1') || prevRowText.includes('assignment')
    const currentHasAssessments = currentRowText.includes('ct-') || currentRowText.includes('q1') || currentRowText.includes('assignment')

    if (prevHasAssessments && !currentHasAssessments) {
      headerRow = prevRow
      dataStartRow = startRow
    }
  }

  // Find ID and Name columns
  let idCol = -1
  let nameCol = -1
  let noCol = -1
  const assessmentColMap = {}
  const usedCols = new Set()

  // First, find ID, Name, and No. columns
  for (let col = 0; col < headerRow.length; col++) {
    const header = String(headerRow[col] || '').toLowerCase().trim()

    // Check for "No." column
    if ((header === 'no.' || header === 'no' || header.includes('number')) && noCol === -1) {
      noCol = col
      usedCols.add(col)
    }
    // Check for ID column
    else if ((header.includes('id') || header.includes('roll') || header === '* id' || header === '*id') &&
      !header.includes('name') && idCol === -1) {
      idCol = col
      usedCols.add(col)
    }
    // Check for Name column
    else if (header.includes('name') && !header.includes('id') && nameCol === -1) {
      nameCol = col
      usedCols.add(col)
    }
  }

  // If not found, use default positions (accounting for No. column)
  if (idCol === -1) {
    // If No. column exists, ID is next; otherwise ID is first
    idCol = noCol !== -1 ? noCol + 1 : 0
    usedCols.add(idCol)
  }
  if (nameCol === -1) {
    // Name is typically after ID
    nameCol = idCol + 1
    if (usedCols.has(nameCol)) {
      // Find first unused column
      for (let col = 0; col < headerRow.length; col++) {
        if (!usedCols.has(col)) {
          nameCol = col
          break
        }
      }
    }
    usedCols.add(nameCol)
  }

  // Build expected assessment order from the assessmentOrder array (preserves Excel column order)
  // This is the KEY fix: use the actual column order from the Excel config section
  const expectedOrder = []

  if (assessmentOrder && assessmentOrder.length > 0) {
    // Use the order exactly as parsed from Excel columns
    assessmentOrder.forEach(item => {
      const searchPatterns = []
      const nameUpper = item.name.toUpperCase()

      if (item.type === 'cts') {
        searchPatterns.push(nameUpper, `CT-${item.name.replace(/^ct-/i, '').toUpperCase()}`)
      } else if (item.type === 'assignments') {
        searchPatterns.push(nameUpper, 'ASSIGNMENT')
      } else if (item.type === 'attendance') {
        searchPatterns.push('ATTENDANCE')
      } else if (item.type === 'performance') {
        searchPatterns.push('PERFORMANCE', 'PERF', 'PERFORM')
      } else if (item.type === 'presentation') {
        searchPatterns.push('PRESENTATION', 'PRESENT')
      } else if (item.type === 'midTerm') {
        searchPatterns.push(nameUpper, `MID TERM ${nameUpper}`, `MIDTERM ${nameUpper}`, `MID ${nameUpper}`)
      } else if (item.type === 'final') {
        searchPatterns.push(nameUpper, `TERM FINAL ${nameUpper}`, `FINAL ${nameUpper}`, `TERM ${nameUpper}`)
      }

      expectedOrder.push({
        key: item.key,
        name: item.name,
        type: item.type,
        searchPatterns
      })
    })
  } else {
    // Fallback: build order from config categories
    assessments.cts.forEach(ct => expectedOrder.push({ key: `cts_${ct.name}`, name: ct.name, type: 'cts', searchPatterns: [ct.name.toUpperCase()] }))
    if (assessments.presentation) expectedOrder.push({ key: 'presentation_Presentation', name: 'Presentation', type: 'presentation', searchPatterns: ['PRESENTATION', 'PRESENT'] })
    assessments.assignments.forEach(asg => expectedOrder.push({ key: `assignments_${asg.name}`, name: asg.name, type: 'assignments', searchPatterns: [asg.name.toUpperCase(), 'ASSIGNMENT'] }))
    if (assessments.attendance) expectedOrder.push({ key: 'attendance_Attendance', name: 'Attendance', type: 'attendance', searchPatterns: ['ATTENDANCE'] })
    if (assessments.performance) expectedOrder.push({ key: 'performance_Performance', name: 'Performance', type: 'performance', searchPatterns: ['PERFORMANCE', 'PERF', 'PERFORM'] })
    assessments.midTerm.forEach(mt => expectedOrder.push({ key: `midTerm_${mt.name}`, name: mt.name, type: 'midTerm', searchPatterns: [mt.name.toUpperCase()] }))
    assessments.final.forEach(fin => expectedOrder.push({ key: `final_${fin.name}`, name: fin.name, type: 'final', searchPatterns: [fin.name.toUpperCase()] }))
  }

  // Match headers to assessments - handle headers like "CT-1 (CO1)" or just "CT-1"
  for (let col = 0; col < headerRow.length; col++) {
    if (usedCols.has(col)) continue

    const header = String(headerRow[col] || '').trim()
    if (!header) continue

    // Remove CO information from header (e.g., "CT-1 (CO1)" -> "CT-1")
    const cleanHeader = header.replace(/\s*\([^)]*\)/g, '').trim()
    const headerUpper = cleanHeader.toUpperCase()

    // Try to match each expected assessment in order
    for (const expected of expectedOrder) {
      if (assessmentColMap[expected.key]) continue // Already matched

      // Try all search patterns for this assessment
      let matched = false
      for (const pattern of expected.searchPatterns) {
        // For Performance and Attendance, be more flexible with matching
        if (expected.type === 'performance' || expected.type === 'attendance' || expected.type === 'presentation') {
          // Match if header contains the pattern (case-insensitive)
          if (headerUpper.includes(pattern) || pattern.includes(headerUpper)) {
            assessmentColMap[expected.key] = col
            usedCols.add(col)
            matched = true
            break
          }
        } else if (headerUpper === pattern ||
          headerUpper.includes(pattern) ||
          pattern.includes(headerUpper)) {
          assessmentColMap[expected.key] = col
          usedCols.add(col)
          matched = true
          break
        }
      }

      if (matched) break

      // Special handling for Q1, Q2, etc. - need to distinguish Mid Term vs Final
      if (expected.name.toUpperCase().match(/^Q\d+$/)) {
        const qNum = parseInt(expected.name.toUpperCase().replace('Q', ''))
        const headerQNum = parseInt(headerUpper.replace(/[^0-9]/g, ''))

        if (qNum === headerQNum && !isNaN(headerQNum)) {
          // Check context - if header mentions "mid" or "final", use that
          const headerLower = header.toLowerCase()
          const isMidTerm = headerLower.includes('mid')
          const isFinal = headerLower.includes('final') || headerLower.includes('term final')

          if (isMidTerm && expected.type === 'midTerm') {
            assessmentColMap[expected.key] = col
            usedCols.add(col)
            break
          } else if (isFinal && expected.type === 'final') {
            assessmentColMap[expected.key] = col
            usedCols.add(col)
            break
          } else if (!isMidTerm && !isFinal) {
            // No context, match by order - first Qs are Mid Term, later are Final
            const midTermMatched = expectedOrder
              .filter(e => e.type === 'midTerm' && assessmentColMap[e.key])
              .length
            const finalMatched = expectedOrder
              .filter(e => e.type === 'final' && assessmentColMap[e.key])
              .length

            if (expected.type === 'midTerm' && midTermMatched < assessments.midTerm.length) {
              assessmentColMap[expected.key] = col
              usedCols.add(col)
              break
            } else if (expected.type === 'final' && finalMatched < assessments.final.length) {
              assessmentColMap[expected.key] = col
              usedCols.add(col)
              break
            }
          }
        }
      }
    }
  }

  // If headers didn't match well, use the EXACT column positions from the config section
  // This is critical because the Excel may have gaps (e.g., empty col12 between Mid Term and Final)
  // assessmentColPositions has the exact columns: [4,5,6,7,8,9,10,11,13,14,15,16,17]

  // Count how many assessments we successfully matched
  const matchedCount = Object.keys(assessmentColMap).length
  const totalExpected = expectedOrder.length

  // If we have assessmentColPositions from the config section, use them directly
  // This is the most reliable method because it uses the exact same columns as the config
  if (assessmentColPositions && assessmentColPositions.length > 0 && matchedCount < totalExpected * 0.5) {
    // Clear partial matches and use config column positions directly
    for (const key of Object.keys(assessmentColMap)) {
      delete assessmentColMap[key]
    }

    // Map each assessment in order to its config column position
    for (let i = 0; i < expectedOrder.length && i < assessmentColPositions.length; i++) {
      assessmentColMap[expectedOrder[i].key] = assessmentColPositions[i]
    }
  } else if (matchedCount < totalExpected * 0.5) {
    // No config positions available, use sequential position-based mapping (legacy fallback)
    for (const key of Object.keys(assessmentColMap)) {
      delete assessmentColMap[key]
    }
    usedCols.clear()
    usedCols.add(idCol)
    usedCols.add(nameCol)
    if (noCol !== -1) usedCols.add(noCol)

    let colIndex = Math.max(idCol, nameCol) + 1
    for (const expected of expectedOrder) {
      while (usedCols.has(colIndex) && colIndex < headerRow.length) {
        colIndex++
      }
      if (colIndex < headerRow.length) {
        assessmentColMap[expected.key] = colIndex
        usedCols.add(colIndex)
        colIndex++
      }
    }
  } else {
    // Fill in missing mappings using config positions if available
    if (assessmentColPositions && assessmentColPositions.length > 0) {
      for (let i = 0; i < expectedOrder.length && i < assessmentColPositions.length; i++) {
        if (!assessmentColMap[expectedOrder[i].key]) {
          assessmentColMap[expectedOrder[i].key] = assessmentColPositions[i]
        }
      }
    } else {
      // Legacy: fill in with sequential positions
      let colIndex = Math.max(idCol, nameCol) + 1
      for (const expected of expectedOrder) {
        if (!assessmentColMap[expected.key]) {
          while (usedCols.has(colIndex) && colIndex < headerRow.length) {
            colIndex++
          }
          if (colIndex < headerRow.length) {
            assessmentColMap[expected.key] = colIndex
            usedCols.add(colIndex)
            colIndex++
          }
        }
      }
    }
  }

  // Extract student data
  for (let row = dataStartRow; row < rows.length; row++) {
    const rowData = rows[row] || []

    if (rowData.length === 0) continue

    const id = String(rowData[idCol] || '').trim()
    const name = String(rowData[nameCol] || '').trim()

    // Skip if ID or Name is empty, or if it looks like a header row
    if (!id || !name || id === '' || name === '' ||
      id.toLowerCase().includes('id') || name.toLowerCase().includes('name')) {
      continue
    }

    // Remove strict numeric-only filter to allow IDs like "201-15-13492"
    // Previously:
    // if (!/^\d+$/.test(id)) {
    //   continue
    // }

    students.push({ id, name })

    // Extract marks
    marks[id] = {}

    // Extract all assessment marks
    for (const [key, colIndex] of Object.entries(assessmentColMap)) {
      if (rowData[colIndex] !== undefined && rowData[colIndex] !== '') {
        const markValue = parseFloat(rowData[colIndex])
        if (!isNaN(markValue)) {
          marks[id][key] = markValue
        } else {
          marks[id][key] = 0
        }
      } else {
        marks[id][key] = 0
      }
    }
  }

  return { students, marks }
}

/**
 * Extract course information from Excel (if available in first rows)
 */
const extractCourseInfo = (rows) => {
  const courseInfo = {
    courseCode: '',
    courseTitle: '',
    department: '',
    academicYear: '',
    semester: '',
    section: '',
  }

  // Look for course info in first 10 rows
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] || []
    const rowText = row.join(' ').toLowerCase()

    // Look for course code pattern (e.g., CSE 213)
    if (rowText.includes('cse') || rowText.includes('course code')) {
      for (let col = 0; col < row.length; col++) {
        const cell = String(row[col] || '').trim()
        if (cell.match(/^[A-Z]{2,4}\s*\d{3}$/i)) {
          courseInfo.courseCode = cell
        }
      }
    }
  }

  return courseInfo
}

