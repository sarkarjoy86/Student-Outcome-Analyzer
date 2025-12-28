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
  const { config: assessments, assessmentColPositions } = extractAssessmentConfig(rows, assessmentStartRow, studentDataStartRow)
  
  // Extract student data (pass column positions if available)
  const { students, marks } = extractStudentData(rows, studentDataStartRow, assessments, assessmentColPositions)
  
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
             cellStr.includes('ATTENDANCE') || 
             cellStr.includes('PERFORMANCE')
    })
    
    if (hasAssessmentNames && nameRow === -1) {
      nameRow = i
      continue
    }
    
    // Find row with max marks (contains 10, 30, etc.)
    if (nameRow !== -1 && i > nameRow) {
      const hasMaxMarks = row.some(cell => {
        const val = parseFloat(cell)
        return !isNaN(val) && (val === 10 || val === 30) && val > 0
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

  // If we found the configuration rows, parse them
  if (nameRow !== -1 && maxMarksRow !== -1 && coRow !== -1) {
    const names = rows[nameRow] || []
    const maxMarks = rows[maxMarksRow] || []
    const cos = rows[coRow] || []

    // Track position to determine Mid Term vs Final
    let midTermCount = 0
    let finalCount = 0

    for (let col = 0; col < Math.min(names.length, maxMarks.length, cos.length); col++) {
      const name = String(names[col] || '').trim()
      const maxMark = parseFloat(maxMarks[col]) || 0
      const coNum = parseFloat(cos[col])

      if (!name || maxMark === 0) continue

      const nameUpper = name.toUpperCase()
      // Only set CO if it's a valid number, otherwise leave as empty string
      const coValue = !isNaN(coNum) && coNum >= 1 && coNum <= 12 ? `CO${Math.floor(coNum)}` : ''

      // Store column position for this assessment
      assessmentColPositions.push(col)

      // Classify assessments
      if (nameUpper.match(/^CT-\d+$/)) {
        config.cts.push({
          name: name,
          maxMarks: maxMark,
          co: coValue, // Don't default - keep as assigned in Excel or empty
        })
      } else if (nameUpper === 'ASSIGNMENT' || nameUpper.includes('ASSIGNMENT')) {
        config.assignments.push({
          name: name,
          maxMarks: maxMark,
          co: coValue, // Don't default - keep as assigned in Excel or empty
        })
      } else if (nameUpper.includes('ATTENDANCE')) {
        // Only add if attendance exists in Excel with max marks
        config.attendance = {
          name: name,
          maxMarks: maxMark,
          co: coValue, // Keep empty if no CO assigned
        }
      } else if (nameUpper.includes('PERFORMANCE')) {
        // Read CO from Excel, don't default to CO2
        // If no CO is assigned, it will remain empty
        config.performance = {
          name: name,
          maxMarks: maxMark,
          co: coValue, // Keep empty if no CO assigned
        }
      } else if (nameUpper.match(/^Q\d+$/)) {
        // Determine if this Q belongs to Mid Term or Final based on context
        // Strategy: First 3 Qs encountered are Mid Term, next 5 Qs are Final
        // OR we can check the row above for "Mid Term" or "Term Final" indicators
        const qNum = parseInt(nameUpper.replace('Q', ''))
        
        // Check if we already have 3 Mid Term questions
        if (config.midTerm.length < 3) {
          config.midTerm.push({
            name: name,
            maxMarks: maxMark,
            co: coValue,
          })
        } else {
          // Remaining Qs go to Final
          config.final.push({
            name: name,
            maxMarks: maxMark,
            co: coValue,
          })
        }
      }
    }
  }

  return { config, assessmentColPositions }
}

/**
 * Extract student data and marks from Excel
 */
const extractStudentData = (rows, startRow, assessments, assessmentColPositions = null) => {
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

  // Build expected assessment order from configuration
  // IMPORTANT: This order MUST match the column order in the Excel student data section
  const expectedOrder = []
  
  // The order should match how assessments appear in the Excel configuration section
  // Based on the image: CT-1, CT-2, CT-3, Assignment, Attendance, Performance, Mid Term Q1-Q3, Final Q1-Q5
  
  // Add CTs in order (CT-1, CT-2, CT-3)
  assessments.cts.forEach(ct => expectedOrder.push({ 
    key: `cts_${ct.name}`, 
    name: ct.name, 
    type: 'cts',
    searchPatterns: [
      ct.name.toUpperCase(), 
      `CT-${ct.name.replace('CT-', '').replace('ct-', '')}`,
      ct.name.replace(/^ct-/i, '').toUpperCase()
    ]
  }))
  
  // Add Assignments (after CTs)
  assessments.assignments.forEach(asg => expectedOrder.push({ 
    key: `assignments_${asg.name}`, 
    name: asg.name, 
    type: 'assignments',
    searchPatterns: [asg.name.toUpperCase(), 'ASSIGNMENT']
  }))
  
  // Add Attendance and Performance (after Assignments)
  if (assessments.attendance) {
    expectedOrder.push({ 
      key: 'attendance_Attendance', 
      name: 'Attendance', 
      type: 'attendance',
      searchPatterns: ['ATTENDANCE']
    })
  }
  if (assessments.performance) {
    expectedOrder.push({ 
      key: 'performance_Performance', 
      name: 'Performance', 
      type: 'performance',
      searchPatterns: ['PERFORMANCE']
    })
  }
  
  // Add Mid Term questions in order (after Attendance/Performance)
  assessments.midTerm.forEach(mt => expectedOrder.push({ 
    key: `midTerm_${mt.name}`, 
    name: mt.name, 
    type: 'midTerm',
    searchPatterns: [
      mt.name.toUpperCase(), 
      `MID TERM ${mt.name.toUpperCase()}`, 
      `MIDTERM ${mt.name.toUpperCase()}`,
      `MID ${mt.name.toUpperCase()}`
    ]
  }))
  
  // Add Final questions in order (after Mid Term)
  assessments.final.forEach(fin => expectedOrder.push({ 
    key: `final_${fin.name}`, 
    name: fin.name, 
    type: 'final',
    searchPatterns: [
      fin.name.toUpperCase(), 
      `TERM FINAL ${fin.name.toUpperCase()}`, 
      `FINAL ${fin.name.toUpperCase()}`,
      `TERM ${fin.name.toUpperCase()}`
    ]
  }))

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
        if (headerUpper === pattern || 
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

  // If headers didn't match well, use position-based mapping
  // This happens when headers are not clear or missing
  // Use the order from assessment configuration to map columns
  let colIndex = Math.max(idCol, nameCol) + 1
  
  // Count how many assessments we successfully matched
  const matchedCount = Object.keys(assessmentColMap).length
  const totalExpected = expectedOrder.length
  
  // Primary strategy: Use assessment configuration order to map columns
  // The order from config should match the column order in student data
  // Start from the column after ID and Name
  let startCol = Math.max(idCol, nameCol) + 1
  
  // If we matched less than 50% of assessments, use pure position-based mapping
  if (matchedCount < totalExpected * 0.5) {
    // Clear partial matches and use pure position-based
    // Delete all existing mappings
    for (const key of Object.keys(assessmentColMap)) {
      delete assessmentColMap[key]
    }
    usedCols.clear()
    usedCols.add(idCol)
    usedCols.add(nameCol)
    if (noCol !== -1) usedCols.add(noCol)
    
    // Map in the exact order from assessment configuration
    // This is the most reliable method - use the order from config
    colIndex = startCol
    for (const expected of expectedOrder) {
      // Skip any columns that are already used
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
    // Fill in missing mappings using position
    for (const expected of expectedOrder) {
      if (!assessmentColMap[expected.key]) {
        // Find next unused column
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

