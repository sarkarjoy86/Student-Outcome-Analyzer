// Comprehensive CO-PO Calculation Engine
// Based on Excel formulas from the provided spreadsheet

/**
 * Get all assessments with their types
 */
const getAllAssessments = (assessments) => {
  const all = []
  
  assessments.cts.forEach(a => all.push({ ...a, type: 'cts' }))
  assessments.midTerm.forEach(a => all.push({ ...a, type: 'midTerm' }))
  assessments.final.forEach(a => all.push({ ...a, type: 'final' }))
  assessments.assignments.forEach(a => all.push({ ...a, type: 'assignments' }))
  
  if (assessments.attendance) {
    all.push({ ...assessments.attendance, name: 'Attendance', type: 'attendance' })
  }
  if (assessments.performance) {
    // Ensure Performance is always assigned to CO2 if not explicitly set
    const performanceCO = assessments.performance.co || 'CO2'
    all.push({ 
      ...assessments.performance, 
      name: 'Performance', 
      type: 'performance',
      co: performanceCO
    })
  }
  
  return all
}

/**
 * Calculate CO percentage for a single student
 * Excel Formula: Sum of ((Student Mark / Max Mark) * (Assessment Max / Total CO Max)) * 100
 * Using IF(MaxMark=0, 0.00000001, MaxMark) to avoid division by zero
 */
export const calculateStudentCO = (studentId, co, marks, assessments) => {
  const allAssessments = getAllAssessments(assessments)
  
  // Filter assessments for this CO
  const relevantAssessments = allAssessments.filter((a) => a.co === co)
  
  if (relevantAssessments.length === 0) return 0
  
  // Calculate total max marks for this CO
  const totalCOMaxMarks = relevantAssessments.reduce(
    (sum, a) => sum + (parseFloat(a.maxMarks) || 0),
    0
  )
  
  if (totalCOMaxMarks === 0) return 0
  
  // Calculate CO percentage using Excel formula
  let coPercentage = 0
  
  relevantAssessments.forEach((assessment) => {
    const key = `${assessment.type}_${assessment.name}`
    const studentMark = parseFloat(marks[studentId]?.[key] || 0) || 0
    const assessmentMax = parseFloat(assessment.maxMarks) || 0
    
    // Excel formula: (StudentMark / IF(MaxMark=0, 0.00000001, MaxMark)) * (AssessmentMax / TotalCOMax)
    const maxMarks = assessmentMax === 0 ? 0.00000001 : assessmentMax
    const studentRatio = studentMark / maxMarks
    const weight = assessmentMax / totalCOMaxMarks
    
    coPercentage += studentRatio * weight
  })
  
  return coPercentage * 100
}

/**
 * Calculate PO percentage for a single student
 * PO = Weighted average of related COs
 * Weight = Total marks allocated to each CO
 */
export const calculateStudentPO = (studentId, po, assessments, coMapping, studentCOs) => {
  // Find all COs that map to this PO
  const relatedCOs = []
  
  for (let co = 1; co <= 12; co++) {
    const coKey = `CO${co}`
    if (coMapping && coMapping[coKey] && coMapping[coKey][po] === 1) {
      relatedCOs.push(coKey)
    }
  }
  
  if (relatedCOs.length === 0) return 0
  
  const allAssessments = getAllAssessments(assessments)
  
  // Calculate weighted average
  // studentCOs here is already the student's CO object: { CO1: value, CO2: value, ... }
  let totalWeight = 0
  let weightedSum = 0
  
  relatedCOs.forEach((co) => {
    const coPercentage = studentCOs[co] || 0
    
    // Calculate weight based on total marks for this CO
    const coAssessments = allAssessments.filter((a) => a.co === co)
    const coTotalMarks = coAssessments.reduce(
      (sum, a) => sum + (parseFloat(a.maxMarks) || 0),
      0
    )
    
    if (coTotalMarks > 0) {
      weightedSum += coPercentage * coTotalMarks
      totalWeight += coTotalMarks
    }
  })
  
  if (totalWeight === 0) return 0
  
  return weightedSum / totalWeight
}

/**
 * Calculate all COs for all students
 */
export const calculateAllStudentCOs = (students, marks, assessments) => {
  const studentCOs = {}
  
  students.forEach((student) => {
    studentCOs[student.id] = {}
    for (let co = 1; co <= 12; co++) {
      const coKey = `CO${co}`
      studentCOs[student.id][coKey] = calculateStudentCO(
        student.id,
        coKey,
        marks,
        assessments
      )
    }
  })
  
  return studentCOs
}

/**
 * Calculate all POs for all students
 */
export const calculateAllStudentPOs = (students, assessments, coMapping, studentCOs) => {
  const studentPOs = {}
  
  students.forEach((student) => {
    studentPOs[student.id] = {}
    for (let po = 1; po <= 12; po++) {
      const poKey = `PO${po}`
      studentPOs[student.id][poKey] = calculateStudentPO(
        student.id,
        poKey,
        assessments,
        coMapping,
        studentCOs[student.id]
      )
    }
  })
  
  return studentPOs
}

/**
 * Calculate percentage of students above target pass marks for a CO
 * Excel Formula: (COUNTIF(CO_scores > targetPassMarks) / totalStudents) * 100
 * Note: Using > (strictly greater than) to match Excel COUNTIF behavior - students at exactly 40% are NOT counted
 */
export const calculateCOAttainmentByPassMarks = (
  students,
  studentCOs,
  co,
  targetPassMarks
) => {
  if (students.length === 0) return 0
  
  const studentsAbovePass = students.filter((student) => {
    const coScore = studentCOs[student.id]?.[co] || 0
    // Use > (strictly greater) - students with exactly 40% are NOT counted as passing
    return coScore > targetPassMarks
  }).length
  
  return (studentsAbovePass / students.length) * 100
}

/**
 * Calculate percentage of students above KPI for a CO
 * Excel Formula: (COUNTIF(CO_scores > KPI) / totalStudents) * 100
 * Note: Using > (strictly greater than) to match Excel COUNTIF behavior - students at exactly 50% are NOT counted
 */
export const calculateCOAttainmentByKPI = (students, studentCOs, co, kpi) => {
  if (students.length === 0) return 0
  
  const studentsAboveKPI = students.filter((student) => {
    const coScore = studentCOs[student.id]?.[co] || 0
    // Use > (strictly greater) - students with exactly 50% are NOT counted as passing
    return coScore > kpi
  }).length
  
  return (studentsAboveKPI / students.length) * 100
}

/**
 * Main calculation function - calculates everything
 */
export const calculateAllAttainments = (
  students,
  marks,
  assessments,
  coMapping,
  targetPassMarks = 40,
  kpiCO = 50,
  kpiPO = 50
) => {
  // Calculate individual student COs
  const studentCOs = calculateAllStudentCOs(students, marks, assessments)
  
  // Calculate individual student POs
  const studentPOs = calculateAllStudentPOs(
    students,
    assessments,
    coMapping,
    studentCOs
  )
  
  // Calculate CO attainment percentages
  const coAttainment = {}
  for (let co = 1; co <= 12; co++) {
    const coKey = `CO${co}`
    coAttainment[coKey] = {
      passMarksPercentage: calculateCOAttainmentByPassMarks(
        students,
        studentCOs,
        coKey,
        targetPassMarks
      ),
      kpiPercentage: calculateCOAttainmentByKPI(students, studentCOs, coKey, kpiCO),
    }
  }
  
  // Calculate PO attainment percentages
  const poAttainment = {}
  for (let po = 1; po <= 12; po++) {
    const poKey = `PO${po}`
    
    // Calculate based on student PO scores using COUNTIF formula
    // Note: Using > (strictly greater than) to match Excel COUNTIF behavior - students at exactly threshold are NOT counted
    const studentsAbovePass = students.filter((student) => {
      const poScore = studentPOs[student.id]?.[poKey] || 0
      return poScore > targetPassMarks
    }).length
    const studentsAboveKPI = students.filter((student) => {
      const poScore = studentPOs[student.id]?.[poKey] || 0
      return poScore > kpiPO
    }).length
    
    poAttainment[poKey] = {
      passMarksPercentage: students.length > 0 ? (studentsAbovePass / students.length) * 100 : 0,
      kpiPercentage: students.length > 0 ? (studentsAboveKPI / students.length) * 100 : 0,
    }
  }
  
  return {
    studentCOs,
    studentPOs,
    coAttainment,
    poAttainment,
    targetPassMarks,
    kpiCO,
    kpiPO,
  }
}

/**
 * Get total marks allocated to each CO
 */
export const getCOMarkAllocations = (assessments) => {
  const allocations = {}
  const allAssessments = getAllAssessments(assessments)
  
  for (let co = 1; co <= 12; co++) {
    const coKey = `CO${co}`
    const coAssessments = allAssessments.filter((a) => a.co === coKey)
    allocations[coKey] = coAssessments.reduce(
      (sum, a) => sum + (parseFloat(a.maxMarks) || 0),
      0
    )
  }
  
  return allocations
}
