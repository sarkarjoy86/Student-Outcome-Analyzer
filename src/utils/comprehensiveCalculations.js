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
    // Keep Performance CO as is - don't default to CO2, show N/A if not assigned
    all.push({
      ...assessments.performance,
      name: 'Performance',
      type: 'performance',
      co: assessments.performance.co || '' // Keep empty if no CO assigned
    })
  }
  if (assessments.presentation) {
    all.push({
      ...assessments.presentation,
      name: 'Presentation',
      type: 'presentation',
      co: assessments.presentation.co || '' // Keep empty if no CO assigned
    })
  }

  return all
}

/**
 * Calculate CO percentage for a single student
 * Excel Formula: Sum of ((Student Mark / Max Mark) * (Assessment Max / Total CO Max)) * 100
 * Using IF(MaxMark=0, 0.00000001, MaxMark) to avoid division by zero
 */
export const calculateStudentCO = (studentId, co, marks, assessments, metadataMap = {}, studentDbId) => {
  const allAssessments = getAllAssessments(assessments)
  const normCo = co.replace(/\s+/g, '').toUpperCase()

  // 1. Calculate total max marks for this CO
  let totalCOMaxMarks = 0
  allAssessments.forEach(a => {
    const aId = a._id ? a._id.toString() : ''
    const questions = metadataMap[aId]
    if (questions && questions.length > 0) {
      questions.forEach(q => {
        const coKey = (q.co || '').replace(/\s+/g, '').toUpperCase()
        if (coKey === normCo) {
          totalCOMaxMarks += parseFloat(q.maxMarks) || 0
        }
      })
    } else {
      const coKey = (a.co || '').replace(/\s+/g, '').toUpperCase()
      if (coKey === normCo) {
        totalCOMaxMarks += parseFloat(a.maxMarks) || 0
      }
    }
  })

  if (totalCOMaxMarks === 0) return 0

  // 2. Calculate obtained marks for this CO for this student
  let totalObtained = 0
  allAssessments.forEach(a => {
    const aId = a._id ? a._id.toString() : ''
    
    // Check marks using either database ObjectId (studentDbId) or student roll/id (studentId)
    let sMarks = null
    if (studentDbId && marks[studentDbId]?.[aId]) {
      sMarks = marks[studentDbId][aId]
    } else if (marks[studentId]?.[aId]) {
      sMarks = marks[studentId][aId]
    } else {
      // Fallback: maybe flat marks mapped by assessment type & name
      const key = `${a.type}_${a.name}`
      const studentMark = parseFloat(marks[studentId]?.[key] || 0) || 0
      const assessmentMax = parseFloat(a.maxMarks) || 0
      const coKey = (a.co || '').replace(/\s+/g, '').toUpperCase()
      if (coKey === normCo) {
        totalObtained += studentMark
      }
      return
    }

    const questions = metadataMap[aId]
    if (questions && questions.length > 0) {
      questions.forEach(q => {
        const coKey = (q.co || '').replace(/\s+/g, '').toUpperCase()
        if (coKey === normCo) {
          const obtainedMark = parseFloat(sMarks.questionMarks?.[q.questionNumber] ?? 0) || 0
          totalObtained += obtainedMark
        }
      })
    } else {
      const coKey = (a.co || '').replace(/\s+/g, '').toUpperCase()
      if (coKey === normCo) {
        const obtainedMark = parseFloat(sMarks.totalMark ?? sMarks.marks ?? 0) || 0
        totalObtained += obtainedMark
      }
    }
  })

  return (totalObtained / totalCOMaxMarks) * 100
}

/**
 * Calculate PO percentage for a single student
 * PO = HIGHEST CO percentage among all COs mapped to this PO
 * Rule: If multiple COs map to one PO, the PO value is the maximum of those CO values
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

  // PO percentage = highest CO percentage among all mapped COs
  // studentCOs here is already the student's CO object: { CO1: value, CO2: value, ... }
  let maxCOPercentage = 0

  relatedCOs.forEach((co) => {
    const coPercentage = studentCOs[co] || 0
    if (coPercentage > maxCOPercentage) {
      maxCOPercentage = coPercentage
    }
  })

  return maxCOPercentage
}

/**
 * Calculate all COs for all students
 */
export const calculateAllStudentCOs = (students, marks, assessments, metadataMap = {}) => {
  const studentCOs = {}

  students.forEach((student) => {
    studentCOs[student.id] = {}
    for (let co = 1; co <= 12; co++) {
      const coKey = `CO${co}`
      studentCOs[student.id][coKey] = calculateStudentCO(
        student.id,
        coKey,
        marks,
        assessments,
        metadataMap,
        student._id
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
 * Calculate percentage of students at or above target pass marks for a CO
 * Formula: (COUNTIF(CO_scores >= targetPassMarks) / totalStudents) * 100
 * Using >= so students scoring exactly at the threshold ARE counted as passing
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
    return coScore >= targetPassMarks
  }).length

  return (studentsAbovePass / students.length) * 100
}

/**
 * Calculate percentage of students at or above KPI for a CO
 * Formula: (COUNTIF(CO_scores >= KPI) / totalStudents) * 100
 * Using >= so students scoring exactly at the threshold ARE counted as passing
 */
export const calculateCOAttainmentByKPI = (students, studentCOs, co, kpi) => {
  if (students.length === 0) return 0

  const studentsAboveKPI = students.filter((student) => {
    const coScore = studentCOs[student.id]?.[co] || 0
    return coScore >= kpi
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
  kpiPO = 50,
  metadataMap = {}
) => {
  // Calculate individual student COs
  const studentCOs = calculateAllStudentCOs(students, marks, assessments, metadataMap)

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
  // Rule: PO attainment = HIGHEST CO attainment among all COs mapped to that PO
  // Both passMarksPercentage and kpiPercentage use this max rule
  const poAttainment = {}
  for (let po = 1; po <= 12; po++) {
    const poKey = `PO${po}`

    // Find all COs that map to this PO
    const relatedCOs = []
    for (let co = 1; co <= 12; co++) {
      const coKey = `CO${co}`
      if (coMapping && coMapping[coKey] && coMapping[coKey][poKey] === 1) {
        relatedCOs.push(coKey)
      }
    }

    if (relatedCOs.length === 0) {
      poAttainment[poKey] = { passMarksPercentage: 0, kpiPercentage: 0 }
      continue
    }

    // PO % = highest CO % among all mapped COs (applied to both pass-marks and KPI)
    let maxPassMarks = 0
    let maxKPI = 0
    relatedCOs.forEach((co) => {
      const coAtt = coAttainment[co]
      if (coAtt.passMarksPercentage > maxPassMarks) maxPassMarks = coAtt.passMarksPercentage
      if (coAtt.kpiPercentage > maxKPI) maxKPI = coAtt.kpiPercentage
    })

    poAttainment[poKey] = {
      passMarksPercentage: maxPassMarks,
      kpiPercentage: maxKPI,
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
export const getCOMarkAllocations = (assessments, metadataMap = {}) => {
  const allocations = {}
  const allAssessments = getAllAssessments(assessments)

  for (let co = 1; co <= 12; co++) {
    const coKey = `CO${co}`
    
    let totalCOMaxMarks = 0
    allAssessments.forEach(a => {
      const aId = a._id ? a._id.toString() : ''
      const questions = metadataMap[aId]
      if (questions && questions.length > 0) {
        questions.forEach(q => {
          const normCo = (q.co || '').replace(/\s+/g, '').toUpperCase()
          if (normCo === coKey) {
            totalCOMaxMarks += parseFloat(q.maxMarks) || 0
          }
        })
      } else {
        const normCo = (a.co || '').replace(/\s+/g, '').toUpperCase()
        if (normCo === coKey) {
          totalCOMaxMarks += parseFloat(a.maxMarks) || 0
        }
      }
    })
    allocations[coKey] = totalCOMaxMarks
  }

  return allocations
}
