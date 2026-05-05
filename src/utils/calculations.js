// Constants
const PASS_MARK = 40
const KPI_THRESHOLD = 50
const DEPARTMENT_GOAL = 80

// PO Mapping: CO to PO
const PO_MAPPING = {
  CO1: 'PO1', // Engineering Knowledge
  CO2: 'PO2', // Problem Analysis
  CO3: 'PO9', // Teamwork
  CO4: 'PO2', // Problem Analysis
}

const PO_NAMES = {
  PO1: 'PO1 - Engineering Knowledge',
  PO2: 'PO2 - Problem Analysis',
  PO9: 'PO9 - Teamwork',
}

// Calculate CO score for a student
export const calculateCOScore = (studentId, co, marksData, questions) => {
  const studentMarks = marksData[studentId] || {}
  
  // Filter questions for this CO
  const coQuestions = questions.filter((q) => q.co === co)
  
  if (coQuestions.length === 0) return 0

  let totalObtained = 0
  let totalMaxMarks = 0

  coQuestions.forEach((q) => {
    const marks = parseFloat(studentMarks[q.name]) || 0
    const maxMarks = parseFloat(q.maxMarks) || 0
    
    totalObtained += marks
    totalMaxMarks += maxMarks
  })

  // Handle division by zero
  if (totalMaxMarks === 0) return 0

  return (totalObtained / totalMaxMarks) * 100
}

// Calculate if a student attained a CO (>= 50%)
export const isCOAttained = (coScore) => {
  return coScore >= KPI_THRESHOLD
}

// Calculate CO Attainment for the class
export const calculateCOAttainment = (students, questions, marksData) => {
  const cos = ['CO1', 'CO2', 'CO3', 'CO4']
  const attainment = {}

  cos.forEach((co) => {
    const studentScores = students.map((student) =>
      calculateCOScore(student.id, co, marksData, questions)
    )

    const attainedCount = studentScores.filter((score) =>
      isCOAttained(score)
    ).length

    const attainmentPercentage =
      students.length > 0 ? (attainedCount / students.length) * 100 : 0

    attainment[co] = {
      percentage: attainmentPercentage,
      attainedCount,
      totalStudents: students.length,
      studentScores,
    }
  })

  return attainment
}

// Calculate PO Attainment
export const calculatePOAttainment = (coAttainment) => {
  const poAttainment = {}

  // Group COs by PO
  Object.keys(PO_MAPPING).forEach((co) => {
    const po = PO_MAPPING[co]
    
    if (!poAttainment[po]) {
      poAttainment[po] = {
        cos: [],
        percentages: [],
      }
    }
    
    poAttainment[po].cos.push(co)
    poAttainment[po].percentages.push(coAttainment[co]?.percentage || 0)
  })

  // Calculate PO percentage (average of related COs)
  const finalPOAttainment = {}
  Object.keys(poAttainment).forEach((po) => {
    const percentages = poAttainment[po].percentages
    const average =
      percentages.length > 0
        ? percentages.reduce((sum, p) => sum + p, 0) / percentages.length
        : 0
    
    finalPOAttainment[po] = {
      percentage: average,
      name: PO_NAMES[po],
      cos: poAttainment[po].cos,
    }
  })

  return finalPOAttainment
}

// Get all calculations
export const calculateAllAttainments = (students, questions, marksData) => {
  const coAttainment = calculateCOAttainment(students, questions, marksData)
  const poAttainment = calculatePOAttainment(coAttainment)

  return {
    coAttainment,
    poAttainment,
    constants: {
      passMark: PASS_MARK,
      kpiThreshold: KPI_THRESHOLD,
      departmentGoal: DEPARTMENT_GOAL,
    },
  }
}

export { PASS_MARK, KPI_THRESHOLD, DEPARTMENT_GOAL, PO_NAMES }
