import React, { useState, Fragment, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts'
import {
  Download,
  Users,
  TrendingUp,
  BookOpen,
  Target,
  FileText,
  Layout,
  Award,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Printer,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { calculateAllAttainments, getCOMarkAllocations } from '../utils/comprehensiveCalculations'
import { downloadChartAsJPG } from '../utils/chartDownload'
import html2canvas from 'html2canvas'
import { apiService } from '../services/apiService'

// University color scheme: Green, Gold/Yellow, Blue
const UNIVERSITY_COLORS = {
  primary: '#1a5f3f', // Dark green
  secondary: '#d4af37', // Gold
  accent: '#2c5282', // Blue
  lightGreen: '#48bb78',
  lightGold: '#f6e05e',
  lightBlue: '#4299e1',
}

const COLORS = [
  UNIVERSITY_COLORS.primary,
  UNIVERSITY_COLORS.secondary,
  UNIVERSITY_COLORS.accent,
  UNIVERSITY_COLORS.lightGreen,
  UNIVERSITY_COLORS.lightGold,
  UNIVERSITY_COLORS.lightBlue,
  '#4f46e5',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
]

// Custom Legend Component to show color indicators
const ColorLegend = ({ items }) => {
  return (
    <div className="flex flex-wrap gap-4 justify-center mt-4 pt-4 border-t border-gray-200">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm font-medium text-gray-700">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// Letter Grade and GP Calculator
const getGradeAndGP = (percentage) => {
  if (percentage >= 80) return { grade: 'A+', gp: 4.00, desc: 'Outstanding' }
  if (percentage >= 75) return { grade: 'A', gp: 3.75, desc: 'Excellent' }
  if (percentage >= 70) return { grade: 'A-', gp: 3.50, desc: 'Very Good' }
  if (percentage >= 65) return { grade: 'B+', gp: 3.25, desc: 'Good' }
  if (percentage >= 60) return { grade: 'B', gp: 3.00, desc: 'Satisfactory' }
  if (percentage >= 55) return { grade: 'B-', gp: 2.75, desc: 'Above Average' }
  if (percentage >= 50) return { grade: 'C+', gp: 2.50, desc: 'Average' }
  if (percentage >= 45) return { grade: 'C', gp: 2.25, desc: 'Below Average' }
  if (percentage >= 40) return { grade: 'D', gp: 2.00, desc: 'Pass' }
  return { grade: 'F', gp: 0.00, desc: 'Fail' }
}

const formatScorerNames = (names, assessmentName, isHighest) => {
  if (!names || names.length === 0) return 'N/A'
  if (assessmentName?.toLowerCase() === 'attendance' && isHighest) {
    return `${names.length} ${names.length === 1 ? 'Student' : 'Students'}`
  }
  if (names.length > 3) {
    return names[0]
  }
  return names.join(', ')
}

const ComprehensiveReports = ({
  students = [],
  marks = {},
  assessments = null,
  coMapping = null,
  courseInfo = {},
  targetPassMarks = 40,
  kpiCO = 50,
  kpiPO = 50,
  metadataMap = {},
  initialViewMode = 'overview',
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedCompareStudents, setSelectedCompareStudents] = useState([])
  const [viewMode, setViewMode] = useState(initialViewMode)
  const [teacherReflection, setTeacherReflection] = useState('')
  const [coDescriptions, setCoDescriptions] = useState({})
  const [poDescriptions, setPoDescriptions] = useState({})

  React.useEffect(() => {
    async function loadDescriptions() {
      try {
        const courseId = courseInfo._id || courseInfo.id
        if (courseId) {
          const cos = await apiService.getCourseCOs(courseId)
          const coMap = {}
          cos.forEach(co => {
            coMap[co.code] = co.description
          })
          setCoDescriptions(coMap)
        }

        const pos = await apiService.getProgramOutcomes()
        const poMap = {}
        pos.forEach(po => {
          poMap[po.code] = po.description
        })
        setPoDescriptions(poMap)
      } catch (err) {
        console.error("Error loading outcome descriptions:", err)
      }
    }
    loadDescriptions()
  }, [courseInfo])

  const getCODescription = (coCode) => {
    if (coDescriptions[coCode]) return coDescriptions[coCode]
    const fallbacks = {
      'CO1': 'Knowledge of AI concepts, search techniques, and agent architectures.',
      'CO2': 'Problem solving and reasoning using logic, knowledge representation, and planning.',
      'CO3': 'AI tools and applications including machine learning, NLP, and neural networks.',
      'CO4': 'Design and evaluation of intelligent systems for real-world scenarios.',
      'CO5': 'Ethics, society, and implications of artificial intelligence technologies.',
      'CO6': 'Lifelong learning and research directions in emerging AI paradigms.',
    }
    return fallbacks[coCode] || `Course Outcome ${coCode} - Detailed analysis and competency evaluation.`
  }

  const getPODescription = (poCode) => {
    if (poDescriptions[poCode]) return poDescriptions[poCode]
    const fallbacks = {
      'PO1': 'Engineering knowledge: Apply knowledge of mathematics, science, and engineering.',
      'PO2': 'Problem analysis: Identify, formulate, and analyze complex engineering problems.',
      'PO3': 'Design/development of solutions: Design solutions for complex engineering problems.',
      'PO4': 'Investigation: Conduct investigations of complex problems using research-based knowledge.',
      'PO5': 'Modern tool usage: Create, select, and apply appropriate techniques and resources.',
      'PO6': 'The engineer and society: Apply reasoning informed by contextual knowledge.',
      'PO7': 'Environment and sustainability: Understand the impact of professional engineering solutions.',
      'PO8': 'Ethics: Apply ethical principles and commit to professional ethics and responsibilities.',
      'PO9': 'Individual and team work: Function effectively as an individual and as a member or leader.',
      'PO10': 'Communication: Communicate effectively on complex engineering activities.',
      'PO11': 'Project management: Demonstrate knowledge and understanding of engineering principles.',
      'PO12': 'Lifelong learning: Recognize the need for and have the preparation to engage in lifelong learning.',
    }
    return fallbacks[poCode] || `Program Outcome ${poCode} - Engineering graduate attribute alignment.`
  }

  // Safety check
  if (!assessments || !coMapping || students.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center border-2 border-red-200">
          <h2 className="text-2xl font-bold text-red-700 mb-4 flex items-center justify-center gap-2">
            <AlertTriangle className="w-8 h-8" />
            Incomplete Configuration
          </h2>
          <p className="text-gray-600 font-semibold mb-2">
            Please complete all previous steps (Course Info, CO-PO Mapping, Assessments, and Marks Entry) before viewing reports.
          </p>
          <p className="text-xs text-gray-400">
            Make sure that student scores are entered and saved for the calculations to run correctly.
          </p>
        </div>
      </div>
    )
  }

  const calculations = useMemo(() => {
    const res = calculateAllAttainments(
      students,
      marks,
      assessments,
      coMapping,
      targetPassMarks,
      kpiCO,
      kpiPO,
      metadataMap
    )
    console.log("DEBUG Calculations Input:", { students, marks, assessments, targetPassMarks, kpiCO, kpiPO, metadataMap });
    console.log("DEBUG Calculations Result:", res);
    return res;
  }, [students, marks, assessments, coMapping, targetPassMarks, kpiCO, kpiPO, metadataMap])

  const coMarkAllocations = useMemo(() => {
    return getCOMarkAllocations(assessments, metadataMap)
  }, [assessments, metadataMap])

  // Get active COs and POs based on current markings
  const activeCOs = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => `CO${i + 1}`).filter(
      (co) => (coMarkAllocations[co] || 0) > 0
    )
  }, [coMarkAllocations])

  const activePOs = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => `PO${i + 1}`).filter((po) => {
      return activeCOs.some((co) => coMapping?.[co]?.[po] === 1 || coMapping?.[co]?.[po] === '1')
    })
  }, [activeCOs, coMapping])

  // Flattened assessment list for marksheet and summaries
  const allAssessments = useMemo(() => {
    const list = []
    if (assessments.cts) {
      assessments.cts.forEach((a) => list.push({ ...a, type: 'cts' }))
    }
    if (assessments.presentation) {
      list.push({ ...assessments.presentation, name: 'Presentation', type: 'presentation' })
    }
    if (assessments.assignments) {
      assessments.assignments.forEach((a) => list.push({ ...a, type: 'assignments' }))
    }
    if (assessments.attendance) {
      list.push({ ...assessments.attendance, name: 'Attendance', type: 'attendance' })
    }
    if (assessments.performance) {
      list.push({ ...assessments.performance, name: 'Performance', type: 'performance' })
    }
    if (assessments.midTerm) {
      assessments.midTerm.forEach((a) => list.push({ ...a, type: 'midTerm' }))
    }
    if (assessments.final) {
      assessments.final.forEach((a) => list.push({ ...a, type: 'final' }))
    }
    return list
  }, [assessments])

  // Total Max Marks of the Course
  const totalMaxMarks = useMemo(() => {
    return allAssessments.reduce((sum, a) => sum + (parseFloat(a.maxMarks) || 0), 0)
  }, [allAssessments])

  // Fetch individual student obtained mark helper
  const getStudentAssessmentMark = (student, assessment) => {
    const aId = assessment._id ? assessment._id.toString() : ''
    const studentDbId = student._id ? student._id.toString() : ''
    const studentId = student.id

    let sMarks = null
    if (studentDbId && marks[studentDbId]?.[aId]) {
      sMarks = marks[studentDbId][aId]
    } else if (marks[studentId]?.[aId]) {
      sMarks = marks[studentId][aId]
    } else {
      const key = `${assessment.type}_${assessment.name}`
      return marks[studentId]?.[key] ?? 0
    }

    if (!sMarks) return 0
    return sMarks.totalMark ?? sMarks.marks ?? 0
  }

  // Calculate sum of marks obtained per student
  const studentTotalMarks = useMemo(() => {
    const totals = {}
    students.forEach((student) => {
      let obtained = 0
      allAssessments.forEach((a) => {
        obtained += parseFloat(getStudentAssessmentMark(student, a) || 0)
      })
      totals[student.id] = obtained
    })
    return totals
  }, [students, allAssessments, marks])

  // Calculate Student Ranks
  const studentRanks = useMemo(() => {
    const sorted = students
      .map((s) => {
        const obtained = studentTotalMarks[s.id] || 0
        const percentage = totalMaxMarks > 0 ? (obtained / totalMaxMarks) * 100 : 0
        return { id: s.id, percentage }
      })
      .sort((a, b) => b.percentage - a.percentage)

    const ranks = {}
    let currentRank = 1
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].percentage < sorted[i - 1].percentage) {
        currentRank = i + 1
      }
      ranks[sorted[i].id] = currentRank
    }
    return ranks
  }, [students, studentTotalMarks, totalMaxMarks])

  // Cohort statistics
  const batchMetrics = useMemo(() => {
    if (students.length === 0) return {}

    let totalScorePct = 0
    let highestPct = -1
    let highestStudent = null
    let lowestPct = 999
    let lowestStudent = null
    let passedCount = 0
    let totalGP = 0

    students.forEach((s) => {
      const obtained = studentTotalMarks[s.id] || 0
      const pct = totalMaxMarks > 0 ? (obtained / totalMaxMarks) * 100 : 0
      totalScorePct += pct

      const { gp } = getGradeAndGP(pct)
      totalGP += gp

      if (pct >= targetPassMarks) {
        passedCount++
      }

      if (pct > highestPct) {
        highestPct = pct
        highestStudent = s
      }
      if (pct < lowestPct) {
        lowestPct = pct
        lowestStudent = s
      }
    })

    return {
      enrollment: students.length,
      averagePercentage: totalScorePct / students.length,
      averageGPA: totalGP / students.length,
      highest: highestStudent ? { id: highestStudent.id, name: highestStudent.name, percentage: highestPct } : null,
      lowest: lowestStudent ? { id: lowestStudent.id, name: lowestStudent.name, percentage: lowestPct } : null,
      passRate: (passedCount / students.length) * 100,
    }
  }, [students, studentTotalMarks, totalMaxMarks, targetPassMarks])

  // Grade distribution
  const gradeDistributionData = useMemo(() => {
    const counts = { 'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0 }
    students.forEach((s) => {
      const obtained = studentTotalMarks[s.id] || 0
      const pct = totalMaxMarks > 0 ? (obtained / totalMaxMarks) * 100 : 0
      const { grade } = getGradeAndGP(pct)
      if (counts[grade] !== undefined) {
        counts[grade]++
      }
    })
    return Object.keys(counts).map((grade) => ({
      name: grade,
      Count: counts[grade],
    }))
  }, [students, studentTotalMarks, totalMaxMarks])

  // Assessment contribution weighting
  const assessmentContributionData = useMemo(() => {
    const totals = {
      'Class Tests': 0,
      'Mid Term': 0,
      'Term Final': 0,
      'Assignments': 0,
      'Other': 0,
    }
    allAssessments.forEach((a) => {
      const maxM = parseFloat(a.maxMarks) || 0
      if (a.type === 'cts') totals['Class Tests'] += maxM
      else if (a.type === 'midTerm') totals['Mid Term'] += maxM
      else if (a.type === 'final') totals['Term Final'] += maxM
      else if (a.type === 'assignments') totals['Assignments'] += maxM
      else totals['Other'] += maxM
    })
    return Object.keys(totals)
      .map((key) => ({ name: key, value: totals[key] }))
      .filter((d) => d.value > 0)
  }, [allAssessments])

  // Top 3 student results
  const topPerformers = useMemo(() => {
    return students
      .map((s) => {
        const obtained = studentTotalMarks[s.id] || 0
        const percentage = totalMaxMarks > 0 ? (obtained / totalMaxMarks) * 100 : 0
        const { grade, gp } = getGradeAndGP(percentage)
        return { id: s.id, name: s.name, obtained, percentage, grade, gp, rank: studentRanks[s.id] }
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3)
  }, [students, studentTotalMarks, totalMaxMarks, studentRanks])

  // Low-performing student list (overall < kpiCO, or weak in specific COs)
  const lowKPIStudents = useMemo(() => {
    return students
      .map((s) => {
        const obtained = studentTotalMarks[s.id] || 0
        const percentage = totalMaxMarks > 0 ? (obtained / totalMaxMarks) * 100 : 0
        const { grade, gp } = getGradeAndGP(percentage)

        const weakCOs = []
        activeCOs.forEach((coKey) => {
          const coScore = calculations.studentCOs[s.id]?.[coKey] || 0
          if (coScore < kpiCO) {
            weakCOs.push({ co: coKey, score: coScore })
          }
        })
        return { id: s.id, name: s.name, obtained, percentage, grade, gp, weakCOs }
      })
      .filter((s) => s.percentage < kpiCO || s.weakCOs.length > 0)
      .sort((a, b) => a.percentage - b.percentage)
  }, [students, studentTotalMarks, totalMaxMarks, calculations.studentCOs, activeCOs, kpiCO])

  const coAttainedCount = useMemo(() => {
    return activeCOs.filter(co => (calculations.coAttainment[co]?.kpiPercentage || 0) >= kpiCO).length
  }, [activeCOs, calculations.coAttainment, kpiCO])

  const poAttainedCount = useMemo(() => {
    return activePOs.filter(po => (calculations.poAttainment[po]?.kpiPercentage || 0) >= kpiPO).length
  }, [activePOs, calculations.poAttainment, kpiPO])

  const assessmentStats = useMemo(() => {
    return allAssessments.map(a => {
      const marksList = students.map(s => getStudentAssessmentMark(s, a))
      const maxMarks = parseFloat(a.maxMarks) || 0
      const count = marksList.length
      const avg = count > 0 ? marksList.reduce((sum, val) => sum + val, 0) / count : 0
      const highest = count > 0 ? Math.max(...marksList) : 0
      const lowest = count > 0 ? Math.min(...marksList) : 0

      const highestScorersList = count > 0
        ? students
          .filter(s => getStudentAssessmentMark(s, a) === highest)
          .map(s => s.name)
        : []

      const lowestScorersList = count > 0
        ? students
          .filter(s => getStudentAssessmentMark(s, a) === lowest)
          .map(s => s.name)
        : []

      const highestScorers = formatScorerNames(highestScorersList, a.name, true)
      const lowestScorers = formatScorerNames(lowestScorersList, a.name, false)

      return {
        id: a._id?.toString() || a.name,
        name: a.name,
        maxMarks,
        average: avg,
        highest,
        lowest,
        highestScorers,
        lowestScorers
      }
    })
  }, [allAssessments, students, marks])

  const totalStats = useMemo(() => {
    const totalsList = Object.values(studentTotalMarks)
    const count = totalsList.length
    const avg = count > 0 ? totalsList.reduce((sum, val) => sum + val, 0) / count : 0
    const highest = count > 0 ? Math.max(...totalsList) : 0
    const lowest = count > 0 ? Math.min(...totalsList) : 0

    const highestScorersList = count > 0
      ? students
        .filter(s => studentTotalMarks[s.id] === highest)
        .map(s => s.name)
      : []

    const lowestScorersList = count > 0
      ? students
        .filter(s => studentTotalMarks[s.id] === lowest)
        .map(s => s.name)
      : []

    const highestScorers = formatScorerNames(highestScorersList, 'Total Course Mark', true)
    const lowestScorers = formatScorerNames(lowestScorersList, 'Total Course Mark', false)

    return {
      maxMarks: totalMaxMarks,
      average: avg,
      highest,
      lowest,
      highestScorers,
      lowestScorers
    }
  }, [students, studentTotalMarks, totalMaxMarks])

  const performanceDistributionData = useMemo(() => {
    const ranges = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      '50-59': 0,
      '40-49': 0,
      '<40': 0
    }
    students.forEach(s => {
      const obtained = studentTotalMarks[s.id] || 0
      const pct = totalMaxMarks > 0 ? (obtained / totalMaxMarks) * 100 : 0
      if (pct >= 90) ranges['90-100']++
      else if (pct >= 80) ranges['80-89']++
      else if (pct >= 70) ranges['70-79']++
      else if (pct >= 60) ranges['60-69']++
      else if (pct >= 50) ranges['50-59']++
      else if (pct >= 40) ranges['40-49']++
      else ranges['<40']++
    })
    return Object.keys(ranges).map(key => ({
      name: key,
      'No. of Students': ranges[key]
    }))
  }, [students, studentTotalMarks, totalMaxMarks])

  const marksheetColumns = useMemo(() => {
    const cols = []

    // CTs
    const cts = allAssessments.filter(a => a.type === 'cts')
    cts.forEach(a => {
      cols.push({
        id: a._id?.toString() || `cts_${a.name}`,
        name: a.name,
        parent: 'CT',
        assessment: a,
        isQuestion: false,
        co: a.co,
        maxMarks: parseFloat(a.maxMarks) || 0
      })
    })

    // Others
    const others = allAssessments.filter(a => ['assignments', 'presentation', 'attendance', 'performance'].includes(a.type))
    others.forEach(a => {
      cols.push({
        id: a._id?.toString() || `${a.type}_${a.name}`,
        name: a.name === 'Presentation' ? 'Present.' : a.name === 'Assignment' ? 'Assign.' : a.name,
        parent: 'Others',
        assessment: a,
        isQuestion: false,
        co: a.co,
        maxMarks: parseFloat(a.maxMarks) || 0
      })
    })

    // Mid Term
    const midTerms = allAssessments.filter(a => a.type === 'midTerm')
    midTerms.forEach(a => {
      const questions = metadataMap[a._id?.toString()]
      if (questions && questions.length > 0) {
        questions.forEach(q => {
          cols.push({
            id: `${a._id}_q_${q.questionNumber}`,
            name: `Q${q.questionNumber}`,
            parent: 'Mid Term',
            assessment: a,
            isQuestion: true,
            questionNumber: q.questionNumber,
            co: q.co,
            maxMarks: parseFloat(q.maxMarks) || 0
          })
        })
      } else {
        cols.push({
          id: a._id?.toString() || `mid_${a.name}`,
          name: a.name,
          parent: 'Mid Term',
          assessment: a,
          isQuestion: false,
          co: a.co,
          maxMarks: parseFloat(a.maxMarks) || 0
        })
      }
    })

    // Term Final
    const finals = allAssessments.filter(a => a.type === 'final')
    finals.forEach(a => {
      const questions = metadataMap[a._id?.toString()]
      if (questions && questions.length > 0) {
        questions.forEach(q => {
          cols.push({
            id: `${a._id}_q_${q.questionNumber}`,
            name: `Q${q.questionNumber}`,
            parent: 'Term Final',
            assessment: a,
            isQuestion: true,
            questionNumber: q.questionNumber,
            co: q.co,
            maxMarks: parseFloat(q.maxMarks) || 0
          })
        })
      } else {
        cols.push({
          id: a._id?.toString() || `final_${a.name}`,
          name: a.name,
          parent: 'Term Final',
          assessment: a,
          isQuestion: false,
          co: a.co,
          maxMarks: parseFloat(a.maxMarks) || 0
        })
      }
    })

    return cols
  }, [allAssessments, metadataMap])

  const parentHeaders = useMemo(() => {
    const groups = {
      'CT': 0,
      'Others': 0,
      'Mid Term': 0,
      'Term Final': 0
    }
    marksheetColumns.forEach(c => {
      if (groups[c.parent] !== undefined) {
        groups[c.parent]++
      }
    })
    return groups
  }, [marksheetColumns])

  const getMarksheetColumnMark = (student, col) => {
    const a = col.assessment
    const aId = a._id ? a._id.toString() : ''
    const studentDbId = student._id ? student._id.toString() : ''
    const studentId = student.id

    let sMarks = null
    if (studentDbId && marks[studentDbId]?.[aId]) {
      sMarks = marks[studentDbId][aId]
    } else if (marks[studentId]?.[aId]) {
      sMarks = marks[studentId][aId]
    } else {
      if (!col.isQuestion) {
        const key = `${a.type}_${a.name}`
        return marks[studentId]?.[key] ?? 0
      }
      return 0
    }

    if (!sMarks) return 0

    if (col.isQuestion) {
      return parseFloat(sMarks.questionMarks?.[col.questionNumber] ?? 0) || 0
    } else {
      return parseFloat(sMarks.totalMark ?? sMarks.marks ?? 0) || 0
    }
  }

  const topPerformersBatch = useMemo(() => {
    return students
      .map((s) => {
        const obtained = studentTotalMarks[s.id] || 0
        const percentage = totalMaxMarks > 0 ? (obtained / totalMaxMarks) * 100 : 0
        const { grade, gp } = getGradeAndGP(percentage)
        return { id: s.id, name: s.name, obtained, percentage, grade, gp, rank: studentRanks[s.id] }
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10)
  }, [students, studentTotalMarks, totalMaxMarks, studentRanks])

  const studentsNeedingImprovement = useMemo(() => {
    return students
      .map((s) => {
        const obtained = studentTotalMarks[s.id] || 0
        const percentage = totalMaxMarks > 0 ? (obtained / totalMaxMarks) * 100 : 0
        const weakCOs = []
        activeCOs.forEach(co => {
          const score = calculations.studentCOs[s.id]?.[co] || 0
          if (score < kpiCO) {
            weakCOs.push(co)
          }
        })
        return { id: s.id, name: s.name, obtained, percentage, weakCOs }
      })
      .filter(s => s.percentage < kpiCO || s.weakCOs.length > 0)
      .sort((a, b) => a.percentage - b.percentage)
  }, [students, studentTotalMarks, totalMaxMarks, calculations.studentCOs, activeCOs, kpiCO])

  // Pedagogical Action Recommendation Builder for weak COs
  const getCOPedagogicalRemediation = (coKey) => {
    const mapped = allAssessments.filter((a) => {
      const aId = a._id ? a._id.toString() : ''
      const questions = metadataMap[aId]
      if (questions && questions.length > 0) {
        return questions.some((q) => (q.co || '').replace(/\s+/g, '').toUpperCase() === coKey)
      }
      return (a.co || '').replace(/\s+/g, '').toUpperCase() === coKey
    })

    if (mapped.length === 0) {
      return {
        assessmentsText: 'No specific assessments mapped directly.',
        strategy: 'Incorporate basic reviews or extra practice exercises mapped to this CO.',
        advice: 'Create dedicated reading materials or mini-quizzes to assess conceptual gaps.',
      }
    }

    const assessmentNames = mapped
      .map((m) => `${m.name} (${m.type === 'cts' ? 'CT' : m.type === 'midTerm' ? 'Mid' : m.type === 'final' ? 'Final' : 'Assg'})`)
      .join(', ')

    const types = new Set(mapped.map((m) => m.type))
    let strategy = ''
    let advice = ''

    if (types.has('final') || types.has('midTerm')) {
      strategy = 'Conduct review workshops focusing on term-exam question styles and core concepts.'
      advice = 'Clarify key theories and structures of final/midterm questions.'
    } else if (types.has('cts')) {
      strategy = 'Deploy short recap quizzes, worksheets, or in-class interactive discussions.'
      advice = 'Identify specific misconceptions using quick-response feedback tasks.'
    } else if (types.has('assignments')) {
      strategy = 'Provide structured tutorial files, sample solutions, or guided office hours.'
      advice = 'Encourage hands-on problem practice and guide students through step-by-step solutions.'
    } else {
      strategy = 'Arrange additional lab session reviews, practical examples, or peer demonstrations.'
      advice = 'Provide structured self-check matrices and constructive peer-review worksheets.'
    }

    return {
      assessmentsText: assessmentNames,
      strategy,
      advice,
    }
  }

  // Generate Excel workbook (Summary + Calculations)
  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new()

    // Calculations Sheet
    const tableData = [
      ['COURSE INFORMATION'],
      ['Course Code', courseInfo?.courseCode || 'N/A'],
      ['Course Title', courseInfo?.courseTitle || 'N/A'],
      ...(courseInfo?.batchName ? [['Batch Name', courseInfo.batchName]] : []),
      ...(courseInfo?.semesterName ? [['Semester', courseInfo.semesterName]] : []),
      ...(courseInfo?.sectionName ? [['Section', courseInfo.sectionName]] : []),
      ['Generated on', new Date().toLocaleDateString()],
      [],
      ['Calculations of COs & POs'],
      [],
      [
        'Student ID',
        'Student Name',
        ...activeCOs,
        ...activePOs,
        'Total Obtained',
        'Overall %',
        'Grade',
      ],
      ...students.map((student) => {
        const obtained = studentTotalMarks[student.id] || 0
        const percentage = totalMaxMarks > 0 ? (obtained / totalMaxMarks) * 100 : 0
        const { grade } = getGradeAndGP(percentage)
        return [
          student.id,
          student.name,
          ...activeCOs.map((co) => (calculations.studentCOs[student.id]?.[co] || 0).toFixed(1)),
          ...activePOs.map((po) => {
            const val = calculations.studentPOs[student.id]?.[po] || 0
            return val > 0 ? val.toFixed(1) : '0.0'
          }),
          obtained.toFixed(1),
          `${percentage.toFixed(1)}%`,
          grade,
        ]
      }),
    ]

    const ws1 = XLSX.utils.aoa_to_sheet(tableData)
    ws1['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      ...Array(activeCOs.length + activePOs.length).fill({ wch: 8 }),
      { wch: 15 },
      { wch: 12 },
      { wch: 8 },
    ]
    XLSX.utils.book_append_sheet(wb, ws1, 'COs & POs Calculations')

    // Summary Sheet
    const summaryData = [
      ['OBE BATCH ATTAINMENT SUMMARY REPORT'],
      [],
      ['COURSE DETAILS'],
      ['Course Code', courseInfo?.courseCode || 'N/A'],
      ['Course Title', courseInfo?.courseTitle || 'N/A'],
      ['Teacher Name', courseInfo?.teacherName || 'N/A'],
      ['Generated on', new Date().toLocaleDateString()],
      [],
      ['SUMMARY METRICS'],
      ['Total Enrollment', batchMetrics.enrollment],
      ['Class Average %', `${batchMetrics.averagePercentage?.toFixed(1)}%`],
      ['Class Average GPA', batchMetrics.averageGPA?.toFixed(2)],
      ['Pass Rate', `${batchMetrics.passRate?.toFixed(1)}%`],
      ['Highest Score', `${batchMetrics.highest?.percentage.toFixed(1)}% (${batchMetrics.highest?.id})`],
      ['Lowest Score', `${batchMetrics.lowest?.percentage.toFixed(1)}% (${batchMetrics.lowest?.id})`],
      [],
      ['CO ATTAINMENT SUMMARY'],
      ['CO', `% Above Pass Marks (${targetPassMarks}%)`, `% Above KPI (${kpiCO}%)`],
      ...activeCOs.map((co) => {
        const coData = calculations.coAttainment[co]
        return [co, (coData?.passMarksPercentage || 0).toFixed(1), (coData?.kpiPercentage || 0).toFixed(1)]
      }),
      [],
      ['PO ATTAINMENT SUMMARY'],
      ['PO', `% Above Pass Marks (${targetPassMarks}%)`, `% Above KPI (${kpiPO}%)`],
      ...activePOs.map((po) => {
        const poData = calculations.poAttainment[po]
        return [po, (poData?.passMarksPercentage || 0).toFixed(1), (poData?.kpiPercentage || 0).toFixed(1)]
      }),
    ]

    const ws2 = XLSX.utils.aoa_to_sheet(summaryData)
    ws2['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 25 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary Report')

    const fileName = `OBE_Batch_Report_${courseInfo?.courseCode || 'Course'}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Capture Recharts element as base64 PNG helper
  const getChartImageBase64 = async (elementId) => {
    const element = document.getElementById(elementId)
    if (!element) return ''
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        logging: false,
        useCORS: true,
      })
      return canvas.toDataURL('image/png')
    } catch (err) {
      console.error('Error capturing chart image:', elementId, err)
      return ''
    }
  }

  // Construct Word Document Wrapper
  const generateWordDocumentHTMLString = (title, bodyContentHTML) => {
    return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333333; }
          .cover-page { border: 6px double #1a5f3f; padding: 40px; text-align: center; margin-bottom: 30px; }
          .university { font-size: 18pt; font-weight: bold; color: #1a5f3f; margin-bottom: 5px; }
          .department { font-size: 11pt; font-weight: bold; color: #666666; text-transform: uppercase; margin-bottom: 25px; }
          .report-title { font-size: 22pt; font-weight: 800; color: #1a5f3f; margin-bottom: 10px; text-transform: uppercase; }
          .details-table { width: 80%; margin: 30px auto; border-top: 2px solid #1a5f3f; border-bottom: 2px solid #1a5f3f; }
          .details-table td { border: none; padding: 6px; text-align: left; font-size: 10pt; }
          .details-table td.label { font-weight: bold; color: #1a5f3f; width: 35%; }
          .section-title { font-size: 14pt; font-bold: true; color: #1a5f3f; border-bottom: 2px solid #1a5f3f; padding-bottom: 4px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; }
          .summary-grid { width: 100%; margin-bottom: 20px; }
          .summary-card { background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 10px; text-align: center; }
          .summary-label { font-size: 8pt; font-weight: bold; color: #666666; text-transform: uppercase; }
          .summary-val { font-size: 14pt; font-weight: bold; color: #1a5f3f; margin-top: 5px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }
          table.data-table th { background-color: #1a5f3f; color: #ffffff; font-weight: bold; border: 1px solid #999999; padding: 6px; text-align: center; }
          table.data-table td { border: 1px solid #cccccc; padding: 6px; text-align: center; }
          table.data-table td.text-left { text-align: left; }
          .page-break { page-break-before: always; }
          .chart-box { text-align: center; margin: 25px 0; }
          .chart-img { max-width: 100%; height: auto; border: 1px solid #e2e8f0; }
          .badge-green { color: #1a5f3f; font-weight: bold; }
          .badge-red { color: #c53030; font-weight: bold; }
          .badge-yellow { color: #b7791f; font-weight: bold; }
        </style>
      </head>
      <body>
        ${bodyContentHTML}
      </body>
      </html>
    `
  }

  // Export Individual Student Report to Word
  const handleExportIndividualWord = async (studentId) => {
    const student = students.find((s) => s.id === studentId)
    if (!student) return

    const studentObtained = studentTotalMarks[studentId] || 0
    const studentPct = totalMaxMarks > 0 ? (studentObtained / totalMaxMarks) * 100 : 0
    const { grade, gp, desc } = getGradeAndGP(studentPct)
    const passStatus = studentPct >= targetPassMarks ? 'Pass' : 'Below Pass'
    const sRank = studentRanks[studentId] || 0

    // Capture charts
    const coChartBase64 = await getChartImageBase64(`student-co-bar-${studentId}`)
    const poChartBase64 = await getChartImageBase64(`student-po-bar-${studentId}`)

    // Marks table
    let marksRowsHTML = ''
    allAssessments.forEach((a) => {
      const mark = getStudentAssessmentMark(student, a)
      const maxM = parseFloat(a.maxMarks) || 0
      const pct = maxM > 0 ? (mark / maxM) * 100 : 0
      const status = pct >= targetPassMarks ? 'Pass' : 'Below Pass'
      marksRowsHTML += `
        <tr>
          <td class="text-left font-bold" style="text-transform: capitalize;">${a.type === 'cts' ? 'Class Test' : a.type === 'midTerm' ? 'Mid Term' : a.type === 'final' ? 'Term Final' : 'Assignment'}</td>
          <td class="text-left">${a.name}</td>
          <td>${a.co || 'N/A'}</td>
          <td>${maxM}</td>
          <td class="font-bold">${mark}</td>
          <td>${pct.toFixed(1)}%</td>
          <td class="${status === 'Pass' ? 'badge-green' : 'badge-red'}">${status}</td>
        </tr>
      `
    })

    // COs and POs tables
    let coRowsHTML = ''
    activeCOs.forEach((co) => {
      const score = calculations.studentCOs[studentId]?.[co] || 0
      const status = score >= kpiCO ? 'Met' : 'Below KPI'
      coRowsHTML += `
        <tr>
          <td class="font-bold">${co}</td>
          <td>${coMarkAllocations[co] || 0}</td>
          <td class="font-bold">${score.toFixed(1)}%</td>
          <td class="${score >= kpiCO ? 'badge-green' : 'badge-red'}">${status}</td>
        </tr>
      `
    })

    let poRowsHTML = ''
    activePOs.forEach((po) => {
      const score = calculations.studentPOs[studentId]?.[po] || 0
      const status = score >= kpiPO ? 'Met' : 'Below KPI'
      poRowsHTML += `
        <tr>
          <td class="font-bold">${po}</td>
          <td class="font-bold">${score.toFixed(1)}%</td>
          <td class="${score >= kpiPO ? 'badge-green' : 'badge-red'}">${status}</td>
        </tr>
      `
    })

    // Action plan
    let actionRowsHTML = ''
    activeCOs.forEach((coKey) => {
      const score = calculations.studentCOs[studentId]?.[coKey] || 0
      if (score < kpiCO) {
        const remediation = getCOPedagogicalRemediation(coKey)
        actionRowsHTML += `
          <tr>
            <td class="font-bold">${coKey}</td>
            <td>${score.toFixed(1)}%</td>
            <td class="text-left">${remediation.assessmentsText}</td>
            <td class="text-left">${remediation.strategy}</td>
            <td class="text-left">${remediation.advice}</td>
          </tr>
        `
      }
    })

    if (!actionRowsHTML) {
      actionRowsHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: #1a5f3f; font-weight: bold; padding: 12px;">
            Outstanding! Student has met the KPI targets for all course outcomes. No remediation action required.
          </td>
        </tr>
      `
    }

    const coverPageHTML = `
      <div class="cover-page">
        <div class="university">Bangladesh Army International University of Science & Technology</div>
        <div class="department">Department of Computer Science and Engineering</div>
        <div style="height: 15px;"></div>
        <div class="report-title">Individual Outcome Report</div>
        <div style="font-size: 12pt; font-weight: bold; color: #666;">STUDENT PERFORMANCE & OUTCOME ATTAINMENT ANALYSIS</div>
        <div style="height: 25px;"></div>
        <table class="details-table">
          <tr>
            <td class="label">Course Code & Title</td>
            <td>${courseInfo.courseCode || 'N/A'} - ${courseInfo.courseTitle || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Academic Session</td>
            <td>
              ${courseInfo.semesterName && courseInfo.academicYear && courseInfo.semesterName.includes(String(courseInfo.academicYear))
        ? courseInfo.semesterName
        : `${courseInfo.semesterName || 'N/A'}${courseInfo.academicYear ? ` (${courseInfo.academicYear})` : ''}`}
            </td>
          </tr>
          <tr>
            <td class="label">Batch & Section</td>
            <td>${courseInfo.batchName || 'N/A'} ${courseInfo.sectionName ? `(Sec: ${courseInfo.sectionName})` : ''}</td>
          </tr>
          <tr>
            <td class="label">Course Instructor</td>
            <td>${courseInfo.teacherName || 'N/A'} (${courseInfo.teacherEmail || 'N/A'})</td>
          </tr>
          <tr>
            <td class="label">Student Name</td>
            <td style="font-weight: bold; color: #1a5f3f;">${student.name}</td>
          </tr>
          <tr>
            <td class="label">Student ID / Roll</td>
            <td style="font-weight: bold; color: #1a5f3f;">${student.id}</td>
          </tr>
          <tr>
            <td class="label">Report Generated</td>
            <td>${new Date().toLocaleDateString()}</td>
          </tr>
        </table>
      </div>
      <div class="page-break"></div>
    `

    const bodyHTML = `
      ${coverPageHTML}
      <div class="section-title">1. Performance Summary</div>
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Marks Obtained</div>
              <div class="summary-val">${studentObtained.toFixed(1)} / ${totalMaxMarks}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Overall Percentage</div>
              <div class="summary-val">${studentPct.toFixed(1)}%</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Grade & GPA</div>
              <div class="summary-val">${grade} (${gp.toFixed(2)})</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Class Rank</div>
              <div class="summary-val">Rank ${sRank} / ${students.length}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Pass/Fail Status</div>
              <div class="summary-val ${passStatus === 'Pass' ? 'badge-green' : 'badge-red'}">${passStatus}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Remediation Status</div>
              <div class="summary-val ${actionRowsHTML.includes('Outstanding') ? 'badge-green' : 'badge-yellow'}">
                ${actionRowsHTML.includes('Outstanding') ? 'None Required' : 'Support Advised'}
              </div>
            </div>
          </td>
        </tr>
      </table>

      <div class="section-title">2. Detailed Assessment Sheet</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Assessment Title</th>
            <th>CO</th>
            <th>Max Marks</th>
            <th>Obtained</th>
            <th>Percentage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${marksRowsHTML}
        </tbody>
      </table>

      <div class="page-break"></div>

      <div class="section-title">3. Course Outcome (CO) Attainment</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Outcome (CO)</th>
            <th>Allocated Marks</th>
            <th>Student Score</th>
            <th>KPI Target Met (>=${kpiCO}%)</th>
          </tr>
        </thead>
        <tbody>
          ${coRowsHTML}
        </tbody>
      </table>

      ${coChartBase64 ? `
      <div class="chart-box">
        <p style="font-weight: bold; color: #1a5f3f; margin-bottom: 5px;">CO Attainment Chart</p>
        <img class="chart-img" src="${coChartBase64}" alt="CO Chart" />
      </div>
      ` : ''}

      <div class="page-break"></div>

      <div class="section-title">4. Program Outcome (PO) Attainment</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Outcome (PO)</th>
            <th>Student Attainment</th>
            <th>KPI Target Met (>=${kpiPO}%)</th>
          </tr>
        </thead>
        <tbody>
          ${poRowsHTML}
        </tbody>
      </table>

      ${poChartBase64 ? `
      <div class="chart-box">
        <p style="font-weight: bold; color: #1a5f3f; margin-bottom: 5px;">PO Attainment Chart</p>
        <img class="chart-img" src="${poChartBase64}" alt="PO Chart" />
      </div>
      ` : ''}

      <div class="page-break"></div>

      <div class="section-title">5. Targeted Improvement Action Plan</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Weak CO</th>
            <th>Attainment</th>
            <th>Mapped Components</th>
            <th>Suggested Reinforcement Strategy</th>
            <th>Pedagogical Remediation Advice</th>
          </tr>
        </thead>
        <tbody>
          ${actionRowsHTML}
        </tbody>
      </table>
    `

    const docHTML = generateWordDocumentHTMLString(`OBE Individual Report - ${student.id}`, bodyHTML)
    const blob = new Blob(['\ufeff' + docHTML], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `OBE_Individual_Report_${student.id}_${courseInfo.courseCode || 'Course'}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export Overall Batch Report to Word
  const handleExportBatchWord = async () => {
    // Capture charts
    const distImg = await getChartImageBase64('grade-dist-chart')
    const perfImg = await getChartImageBase64('perf-dist-chart')
    const weightImg = await getChartImageBase64('assess-weight-chart')
    const coImg = await getChartImageBase64('batch-co-chart')
    const poImg = await getChartImageBase64('batch-po-chart')
    const gaugeImg = await getChartImageBase64('overall-perf-gauge')

    // Marksheet table rows
    let marksheetRowsHTML = ''
    students.forEach((student, idx) => {
      const totalScore = studentTotalMarks[student.id] || 0
      const pct = totalMaxMarks > 0 ? (totalScore / totalMaxMarks) * 100 : 0
      const { grade, gp } = getGradeAndGP(pct)
      const rank = studentRanks[student.id]

      let assessmentsCellsHTML = ''
      marksheetColumns.forEach((col) => {
        assessmentsCellsHTML += `<td>${getMarksheetColumnMark(student, col)}</td>`
      })

      let coCellsHTML = ''
      activeCOs.forEach((co) => {
        const val = calculations.studentCOs[student.id]?.[co] || 0
        coCellsHTML += `<td style="font-weight: bold;">${val.toFixed(1)}%</td>`
      })

      let poCellsHTML = ''
      activePOs.forEach((po) => {
        const val = calculations.studentPOs[student.id]?.[po] || 0
        poCellsHTML += `<td>${val.toFixed(1)}%</td>`
      })

      marksheetRowsHTML += `
        <tr>
          <td>${idx + 1}</td>
          <td class="font-bold">${student.id}</td>
          <td class="text-left font-bold" style="white-space: nowrap;">${student.name}</td>
          ${assessmentsCellsHTML}
          <td class="font-bold">${totalScore.toFixed(1)}</td>
          <td class="font-bold">${pct.toFixed(1)}%</td>
          <td class="font-bold">${grade}</td>
          <td>${gp.toFixed(2)}</td>
          <td class="font-bold">${rank}</td>
          ${coCellsHTML}
          ${poCellsHTML}
        </tr>
      `
    })

    // Assessment stats table rows
    let assessSummaryRowsHTML = ''
    assessmentStats.forEach((stat) => {
      assessSummaryRowsHTML += `
        <tr>
          <td class="text-left font-bold">${stat.name}</td>
          <td>${stat.maxMarks}</td>
          <td class="font-bold">${stat.average.toFixed(2)}</td>
          <td>${stat.highest}</td>
          <td style="color: #1a5f3f; font-weight: normal;">${stat.highestScorers}</td>
          <td>${stat.lowest}</td>
          <td style="color: #9b2c2c; font-weight: normal;">${stat.lowestScorers}</td>
        </tr>
      `
    })

    // Top 10 performers rows
    let topRowsHTML = ''
    topPerformersBatch.forEach((s) => {
      topRowsHTML += `
        <tr>
          <td class="font-bold">Rank ${s.rank}</td>
          <td class="font-bold">${s.id}</td>
          <td class="text-left">${s.name}</td>
          <td class="font-bold text-green">${s.percentage.toFixed(1)}%</td>
          <td class="font-bold">${s.grade}</td>
          <td>${s.gp.toFixed(2)}</td>
        </tr>
      `
    })

    // Low KPI student rows
    let lowRowsHTML = ''
    studentsNeedingImprovement.forEach((s) => {
      const weakCOList = s.weakCOs.join(', ')
      lowRowsHTML += `
        <tr>
          <td class="font-bold">${s.id}</td>
          <td class="text-left">${s.name}</td>
          <td class="font-bold text-red">${s.percentage.toFixed(1)}%</td>
          <td class="text-left font-bold" style="color: #c53030;">${weakCOList || 'N/A'}</td>
        </tr>
      `
    })

    if (studentsNeedingImprovement.length === 0) {
      lowRowsHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: #1a5f3f; font-weight: bold; padding: 12px;">
            All students are successfully above the KPI threshold.
          </td>
        </tr>
      `
    }

    // Pedagogical recommendations
    let remediationRowsHTML = ''
    activeCOs.forEach((coKey) => {
      const coData = calculations.coAttainment[coKey]
      const attainmentVal = coData?.kpiPercentage || 0
      if (attainmentVal < kpiCO) {
        const rem = getCOPedagogicalRemediation(coKey)
        remediationRowsHTML += `
          <tr>
            <td class="font-bold">${coKey}</td>
            <td class="font-bold text-red">${attainmentVal.toFixed(1)}%</td>
            <td class="text-left">${rem.strategy}</td>
            <td class="text-left">${rem.advice}</td>
          </tr>
        `
      }
    })

    if (!remediationRowsHTML) {
      remediationRowsHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: #1a5f3f; font-weight: bold; padding: 12px;">
            All Course Outcomes met the KPI Target percentage class-wide! No remediation required.
          </td>
        </tr>
      `
    }

    // Course Outcomes Table rows
    let coTableRowsHTML = ''
    activeCOs.forEach((co) => {
      const attainmentVal = calculations.coAttainment[co]?.kpiPercentage || 0
      const isMet = attainmentVal >= kpiCO
      coTableRowsHTML += `
        <tr>
          <td class="font-bold">${co}</td>
          <td class="font-bold">${attainmentVal.toFixed(1)}%</td>
          <td>${kpiCO}%</td>
          <td class="${isMet ? 'badge-green' : 'badge-yellow'} font-bold">${isMet ? 'KPI Met' : 'Below Target'}</td>
        </tr>
      `
    })

    // Program Outcomes Table rows
    let poTableRowsHTML = ''
    activePOs.forEach((po) => {
      const attainmentVal = calculations.poAttainment[po]?.kpiPercentage || 0
      const isMet = attainmentVal >= kpiPO
      poTableRowsHTML += `
        <tr>
          <td class="font-bold">${po}</td>
          <td class="font-bold">${attainmentVal.toFixed(1)}%</td>
          <td>${kpiPO}%</td>
          <td class="${isMet ? 'badge-green' : 'badge-yellow'} font-bold">${isMet ? 'KPI Met' : 'Below Target'}</td>
        </tr>
      `
    })

    // Marksheet Headers
    const marksheetHeadersHTML = marksheetColumns
      .map((col) => `<th>${col.name}<br/><span style="font-size: 7.5pt; font-weight: normal;">(${col.co || ''})</span></th>`)
      .join('')

    const coHeadersHTML = activeCOs.map((co) => `<th>${co}</th>`).join('')
    const poHeadersHTML = activePOs.map((po) => `<th>${po}</th>`).join('')

    const coverPageHTML = `
      <div class="cover-page">
        <div class="university">Bangladesh Army International University of Science & Technology</div>
        <div class="department">Department of Computer Science and Engineering</div>
        <div style="height: 25px;"></div>
        <div class="report-title">OBE COURSE REPORT</div>
        <div style="font-size: 13pt; font-weight: bold; color: #1a5f3f; text-transform: uppercase; letter-spacing: 1px;">COHORT PERFORMANCE & OBE ATTAINMENT ANALYSIS</div>
        <div style="height: 35px;"></div>
        <table class="details-table">
          <tr>
            <td class="label">Course Code & Title</td>
            <td>${courseInfo.courseCode || 'N/A'} - ${courseInfo.courseTitle || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Academic Session</td>
            <td>
              ${courseInfo.semesterName && courseInfo.academicYear && courseInfo.semesterName.includes(String(courseInfo.academicYear))
        ? courseInfo.semesterName
        : `${courseInfo.semesterName || 'N/A'}${courseInfo.academicYear ? ` (${courseInfo.academicYear})` : ''}`}
            </td>
          </tr>
          <tr>
            <td class="label">Batch & Section</td>
            <td>${courseInfo.batchName || 'N/A'} ${courseInfo.sectionName ? `(Sec: ${courseInfo.sectionName})` : ''}</td>
          </tr>
          <tr>
            <td class="label">Course Instructor</td>
            <td>${courseInfo.teacherName || 'N/A'} (${courseInfo.teacherEmail || 'N/A'})</td>
          </tr>
          <tr>
            <td class="label">Total Enrollment</td>
            <td>${students.length} Students</td>
          </tr>
          <tr>
            <td class="label">Report Generated</td>
            <td>${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
      <div class="page-break"></div>
    `

    const bodyHTML = `
      ${coverPageHTML}
      
      <div class="section-title">2. Course Information</div>
      <table class="data-table text-left">
        <tr>
          <td class="font-bold" style="background-color: #f7fafc; width: 30%;">Course Code</td>
          <td>${courseInfo.courseCode || 'N/A'}</td>
        </tr>
        <tr>
          <td class="font-bold" style="background-color: #f7fafc;">Course Title</td>
          <td>${courseInfo.courseTitle || 'N/A'}</td>
        </tr>
        <tr>
          <td class="font-bold" style="background-color: #f7fafc;">Batch & Section</td>
          <td>${courseInfo.batchName || 'N/A'} ${courseInfo.sectionName ? `(Sec: ${courseInfo.sectionName})` : ''}</td>
        </tr>
        <tr>
          <td class="font-bold" style="background-color: #f7fafc;">Instructor Name</td>
          <td>${courseInfo.teacherName || 'N/A'}</td>
        </tr>
      </table>

      <div class="section-title">3. Quick Statistics</div>
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Total Students</div>
              <div class="summary-val">${students.length}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Class Average %</div>
              <div class="summary-val">${batchMetrics.averagePercentage?.toFixed(1)}%</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Class Avg GPA</div>
              <div class="summary-val">${batchMetrics.averageGPA?.toFixed(2)}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Pass Rate</div>
              <div class="summary-val text-green">${batchMetrics.passRate?.toFixed(1)}%</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Highest Percentage</div>
              <div class="summary-val">${batchMetrics.highest?.percentage.toFixed(1)}%</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Lowest Percentage</div>
              <div class="summary-val text-red">${batchMetrics.lowest?.percentage.toFixed(1)}%</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">COs Attained</div>
              <div class="summary-val">${coAttainedCount} / ${activeCOs.length}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">POs Attained</div>
              <div class="summary-val">${poAttainedCount} / ${activePOs.length}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Overall pass mark</div>
              <div class="summary-val">${targetPassMarks}%</div>
            </div>
          </td>
        </tr>
      </table>

      <div class="page-break"></div>

      <div class="section-title">4. Assessment Summary</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Assessment Name</th>
            <th>Max Marks</th>
            <th>Class Average</th>
            <th>Highest Mark</th>
            <th>Highest Scorer</th>
            <th>Lowest Mark</th>
            <th>Lowest Scorer</th>
          </tr>
        </thead>
        <tbody>
          ${assessSummaryRowsHTML}
          <tr style="background-color: #f7fafc; font-weight: bold;">
            <td>Total Course Mark</td>
            <td>${totalStats.maxMarks}</td>
            <td>${totalStats.average.toFixed(2)}</td>
            <td>${totalStats.highest.toFixed(1)}</td>
            <td style="color: #1a5f3f; font-weight: normal;">${totalStats.highestScorers}</td>
            <td>${totalStats.lowest.toFixed(1)}</td>
            <td style="color: #9b2c2c; font-weight: normal;">${totalStats.lowestScorers}</td>
          </tr>
        </tbody>
      </table>

      <div class="page-break"></div>

      <div class="section-title">5. Complete Student Mark Sheet</div>
      <table class="data-table" style="font-size: 7.5pt; table-layout: auto;">
        <thead>
          <tr style="background-color: #1a5f3f; color: #ffffff;">
            <th rowspan="2">No.</th>
            <th rowspan="2">ID</th>
            <th rowspan="2">Name</th>
            <th colspan="${marksheetColumns.length}">Assessment Breakdown Marks</th>
            <th rowspan="2">Total Marks</th>
            <th rowspan="2">Percentage</th>
            <th rowspan="2">Grade</th>
            <th rowspan="2">GPA</th>
            <th rowspan="2">Rank</th>
            <th colspan="${activeCOs.length}">CO Attainment %</th>
            <th colspan="${activePOs.length}">PO Attainment %</th>
          </tr>
          <tr style="background-color: #1a5f3f; color: #ffffff;">
            ${marksheetHeadersHTML}
            ${coHeadersHTML}
            ${poHeadersHTML}
          </tr>
        </thead>
        <tbody>
          ${marksheetRowsHTML}
        </tbody>
      </table>

      <div class="page-break"></div>

      <div class="section-title">6. Grade Distribution</div>
      ${distImg ? `
      <div class="chart-box">
        <img class="chart-img" src="${distImg}" alt="Grade Distribution" />
      </div>
      ` : '<p style="font-style: italic;">No chart data captured.</p>'}

      <div class="section-title">7. Performance Distribution</div>
      ${perfImg ? `
      <div class="chart-box">
        <img class="chart-img" src="${perfImg}" alt="Performance Distribution" />
      </div>
      ` : '<p style="font-style: italic;">No chart data captured.</p>'}

      <div class="section-title">8. Assessment Contribution</div>
      ${weightImg ? `
      <div class="chart-box">
        <img class="chart-img" src="${weightImg}" alt="Assessment Contribution" />
      </div>
      ` : '<p style="font-style: italic;">No chart data captured.</p>'}

      <div class="page-break"></div>

      <div class="section-title">9. Overall Performance (Gauge)</div>
      ${gaugeImg ? `
      <div class="chart-box">
        <img class="chart-img" src="${gaugeImg}" alt="Overall Performance Gauge" style="max-width: 320px;" />
      </div>
      ` : '<p style="font-style: italic;">No gauge captured.</p>'}

      <div class="section-title">10. Course Outcome (CO) Attainment</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Course Outcome</th>
            <th>Average Attainment %</th>
            <th>KPI Target %</th>
            <th>Attainment Status</th>
          </tr>
        </thead>
        <tbody>
          ${coTableRowsHTML}
        </tbody>
      </table>
      ${coImg ? `
      <div class="chart-box">
        <img class="chart-img" src="${coImg}" alt="CO Attainment Chart" />
      </div>
      ` : ''}

      <div class="page-break"></div>

      <div class="section-title">11. Program Outcome (PO) Attainment</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Program Outcome</th>
            <th>Average Attainment %</th>
            <th>KPI Target %</th>
            <th>Attainment Status</th>
          </tr>
        </thead>
        <tbody>
          ${poTableRowsHTML}
        </tbody>
      </table>
      ${poImg ? `
      <div class="chart-box">
        <img class="chart-img" src="${poImg}" alt="PO Attainment Chart" />
      </div>
      ` : ''}

      <div class="page-break"></div>

      <div class="section-title">12. Top 10 Students</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Overall Percentage</th>
            <th>Grade</th>
            <th>GPA</th>
          </tr>
        </thead>
        <tbody>
          ${topRowsHTML}
        </tbody>
      </table>

      <div class="section-title">13. Students Needing Improvement</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Overall Percentage</th>
            <th>Weak CO Deficit Outcomes</th>
          </tr>
        </thead>
        <tbody>
          ${lowRowsHTML}
        </tbody>
      </table>

      <div class="page-break"></div>

      <div class="section-title">14. KPI Summary</div>
      <table class="data-table" style="width: 100%;">
        <tr style="background-color: #f7fafc;">
          <th style="width: 33%;">Pass Threshold</th>
          <th style="width: 33%;">CO KPI Target</th>
          <th style="width: 33%;">PO KPI Target</th>
        </tr>
        <tr>
          <td style="font-size: 14pt; font-weight: bold;">${targetPassMarks}%</td>
          <td style="font-size: 14pt; font-weight: bold; color: #1a5f3f;">${kpiCO}%</td>
          <td style="font-size: 14pt; font-weight: bold; color: #2c5282;">${kpiPO}%</td>
        </tr>
      </table>

      <div class="section-title">15. Automatic Observations</div>
      <ul style="line-height: 1.6; font-size: 10pt;">
        <li>Overall cohort size is <strong>${students.length} students</strong> with an average performance score of <strong>${batchMetrics.averagePercentage?.toFixed(2)}%</strong>.</li>
        <li>The class-wide overall pass rate achieved is <strong>${batchMetrics.passRate?.toFixed(2)}%</strong>.</li>
        <li>A total of <strong>${coAttainedCount} out of ${activeCOs.length} Course Outcomes</strong> successfully met their class attainment target (KPI: ${kpiCO}%).</li>
        <li>A total of <strong>${poAttainedCount} out of ${activePOs.length} Program Outcomes</strong> met the program mapping KPI threshold (KPI: ${kpiPO}%).</li>
        <li>The highest marks percentage scored by a student is <strong>${batchMetrics.highest?.percentage.toFixed(1)}%</strong>, whereas the lowest is <strong>${batchMetrics.lowest?.percentage.toFixed(1)}%</strong>.</li>
      </ul>

      <div class="section-title">16. Recommendations</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Deficit Outcome</th>
            <th>Class Attainment</th>
            <th>Suggested Pedagogical Strategy</th>
            <th>Syllabus Reinforcement Advice</th>
          </tr>
        </thead>
        <tbody>
          ${remediationRowsHTML}
        </tbody>
      </table>

      <div class="section-title">17. Teacher's Reflection</div>
      <div style="border: 1px solid #ccc; padding: 15px; background-color: #fcfcfc; min-height: 120px; font-style: italic;">
        ${teacherReflection ? teacherReflection.replace(/\n/g, '<br/>') : 'No reflection notes provided by the instructor.'}
      </div>

      <div class="page-break"></div>

      <div class="section-title">18. Signature & Approvals</div>
      <div style="margin-top: 50px;">
        <table style="width: 100%; border: none; margin-top: 30px;">
          <tr>
            <td style="width: 45%; border: none; border-top: 1px solid #333; text-align: center; padding-top: 8px; font-weight: bold;">
              Course Instructor / Teacher Signature
            </td>
            <td style="width: 10%; border: none;"></td>
            <td style="width: 45%; border: none; border-top: 1px solid #333; text-align: center; padding-top: 8px; font-weight: bold;">
              Head of Department / Program Director Signature
            </td>
          </tr>
          <tr>
            <td style="border: none; text-align: center; font-size: 8pt; color: #777;">Date: ________________________</td>
            <td style="border: none;"></td>
            <td style="border: none; text-align: center; font-size: 8pt; color: #777;">Date: ________________________</td>
          </tr>
        </table>
      </div>
    `

    const docHTML = generateWordDocumentHTMLString('OBE Batch Attainment Report', bodyHTML)
    const blob = new Blob(['\ufeff' + docHTML], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `OBE_Batch_Report_${courseInfo.courseCode || 'Course'}_${courseInfo.batchName || 'Batch'}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Dynamic Printing Style CSS wrapper */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body, html {
            background-color: #f8fafc !important;
            color: #1e293b !important;
            font-family: 'Segoe UI', Arial, sans-serif !important;
            font-size: 11px !important;
          }
          nav, sidebar, header, .no-print, button, select, .tabs-container {
            display: none !important;
          }
          /* Reset container margins/padding and layouts outside reports */
          .profile-avatar-container, main > div > .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          div.max-w-7xl {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-report-container {
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          /* Preserve layout structures (grids) */
          .grid {
            display: grid !important;
          }
          .lg:grid-cols-5 {
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          }
          .lg:col-span-3 {
            grid-column: span 3 / span 3 !important;
          }
          .lg:col-span-2 {
            grid-column: span 2 / span 2 !important;
          }
          .lg:grid-cols-12 {
            display: grid !important;
            grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
          }
          .lg:col-span-8 {
            grid-column: span 8 / span 8 !important;
          }
          .lg:col-span-4 {
            grid-column: span 4 / span 4 !important;
          }
          .lg:grid-cols-3 {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .lg:grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .md:grid-cols-5, .lg:grid-cols-9 {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            margin-bottom: 10px !important;
          }

          /* Clean cover page display on page 1 without page breaks */
          #batch-report-cover {
            display: block !important;
            margin-bottom: 20px !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Enforce standard cell padding & tables styling in print */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          th, td {
            font-size: 10px !important;
          }

          /* Scale charting vectors to fit inside standard printable bounds correctly */
          .recharts-responsive-container {
            width: 100% !important;
            height: 250px !important;
            max-height: 250px !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      `}</style>

      {/* Header Panel */}
      <div className="bg-gradient-to-br from-white via-green-50/30 to-blue-50/30 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border-2 border-green-200 no-print">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-green-800 via-green-600 to-blue-700 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-green-700 animate-pulse" />
              Automated OBE Reports
            </h1>
            <p className="text-gray-700 mt-2 font-semibold text-lg">
              {courseInfo?.courseCode || 'Course'} - {courseInfo?.courseTitle || 'Title'}
              {courseInfo?.batchName && ` | Batch: ${courseInfo.batchName}`}
              {courseInfo?.sectionName && ` | Section: ${courseInfo.sectionName}`}
              {courseInfo?.semesterName && ` | Semester: ${courseInfo.semesterName}`}
            </p>
          </div>
          {viewMode !== 'allDetails' && (
            <div className="flex flex-wrap gap-2 md:justify-end">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold transition-colors duration-200 shadow-sm"
              >
                <Printer size={16} />
                <span>Print Report</span>
              </button>

              {viewMode !== 'compare' && (
                <>
                  <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors duration-200 shadow-sm"
                  >
                    <Download size={16} />
                    <span>Download Excel</span>
                  </button>
                  {viewMode === 'batch' && (
                    <button
                      onClick={handleExportBatchWord}
                      className="flex items-center gap-2 px-3.5 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-semibold transition-colors duration-200 shadow-sm"
                    >
                      <Download size={16} />
                      <span>Export Word Report</span>
                    </button>
                  )}
                  {viewMode === 'individual' && selectedStudentId && (
                    <button
                      onClick={() => handleExportIndividualWord(selectedStudentId)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-semibold transition-colors duration-200 shadow-sm"
                    >
                      <Download size={16} />
                      <span>Export Word Report</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 border-b-2 border-green-200 tabs-container mt-6">
          {[
            { id: 'overview', label: 'Course Overview' },
            { id: 'batch', label: 'CO/PO Attainment (Batch)' },
            { id: 'individual', label: 'Student Analysis' },
            { id: 'compare', label: 'Comparative Analysis' },
            { id: 'allDetails', label: 'Mapping Details' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`px-5 py-3 font-bold transition-all duration-300 rounded-t-lg -mb-[2px] ${viewMode === tab.id
                ? 'border-b-4 border-green-700 text-green-800 bg-green-50'
                : 'text-gray-500 hover:text-green-700 hover:bg-green-50/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Report Container */}
      <div className="print-report-container space-y-8">

        {/* VIEW 1: Overview Tab */}
        {viewMode === 'overview' && (
          <>
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div id="co-attainment-chart" className="lg:col-span-3 bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent uppercase tracking-wider">
                    Course Outcomes (COs) Attainment
                  </h2>
                  <button
                    onClick={() => downloadChartAsJPG('co-attainment-chart', 'CO_Attainment')}
                    className="flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md no-print"
                    title="Download chart"
                  >
                    <Download size={14} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart
                    data={Array.from({ length: 12 }, (_, i) => {
                      const co = `CO${i + 1}`
                      return {
                        name: co,
                        [`Above Pass Marks (${targetPassMarks}%)`]: calculations.coAttainment[co]?.passMarksPercentage || 0,
                        [`Above KPI (${kpiCO}%)`]: calculations.coAttainment[co]?.kpiPercentage || 0,
                      }
                    })}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorPassMarks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightBlue} stopOpacity={0.9} />
                        <stop offset="95%" stopColor={UNIVERSITY_COLORS.accent} stopOpacity={0.9} />
                      </linearGradient>
                      <linearGradient id="colorKPI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightGold} stopOpacity={0.9} />
                        <stop offset="95%" stopColor={UNIVERSITY_COLORS.secondary} stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} />
                    <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold' } }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #1a5f3f', borderRadius: '8px' }} formatter={(value) => [`${parseFloat(value).toFixed(1)}%`, '']} labelFormatter={(label) => `${label}`} />
                    <Bar dataKey={`Above Pass Marks (${targetPassMarks}%)`} fill="url(#colorPassMarks)" radius={[8, 8, 0, 0]} stroke={UNIVERSITY_COLORS.accent} strokeWidth={1} />
                    <Bar dataKey={`Above KPI (${kpiCO}%)`} fill="url(#colorKPI)" radius={[8, 8, 0, 0]} stroke={UNIVERSITY_COLORS.secondary} strokeWidth={1} />
                    <Legend wrapperStyle={{ paddingTop: '16px' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Student Distribution */}
              <div id="co-distribution-chart" className="lg:col-span-2 bg-gradient-to-br from-white to-orange-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-orange-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-orange-800 to-orange-600 bg-clip-text text-transparent uppercase tracking-wider">
                    CO Student Distribution
                  </h2>
                  <button
                    onClick={() => downloadChartAsJPG('co-distribution-chart', 'CO_Distribution')}
                    className="flex items-center justify-center p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-md no-print"
                    title="Download chart"
                  >
                    <Download size={14} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart
                    data={(() => {
                      return Array.from({ length: 12 }, (_, i) => {
                        const co = `CO${i + 1}`
                        let below40 = 0
                        let between40_79 = 0
                        let above80 = 0
                        const hasData = students.some((s) => (calculations.studentCOs[s.id]?.[co] || 0) > 0)
                        if (!hasData) return null

                        students.forEach((s) => {
                          const score = calculations.studentCOs[s.id]?.[co] || 0
                          if (score > 0 && score < 40) below40++
                          else if (score >= 40 && score < 80) between40_79++
                          else if (score >= 80) above80++
                        })
                        const total = students.length
                        return {
                          name: co,
                          'Below 40%': Math.round((below40 / total) * 100),
                          '40–79%': Math.round((between40_79 / total) * 100),
                          '≥80%': Math.round((above80 / total) * 100),
                        }
                      }).filter(Boolean)
                    })()}
                    margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} />
                    <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} label={{ value: '% of Students', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold' } }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #1a5f3f', borderRadius: '8px' }} formatter={(value) => `${Math.round(value)}%`} />
                    <Legend wrapperStyle={{ paddingTop: '12px' }} />
                    <Bar dataKey="Below 40%" stackId="a" fill="#ef4444" />
                    <Bar dataKey="40–79%" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="≥80%" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PO Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div id="po-bar-chart" className="lg:col-span-3 bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider">
                    Program Outcomes (POs) Attainment
                  </h2>
                  <button
                    onClick={() => downloadChartAsJPG('po-bar-chart', 'PO_Attainment_Bar')}
                    className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md no-print"
                    title="Download chart"
                  >
                    <Download size={14} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart
                    data={Array.from({ length: 12 }, (_, i) => {
                      const po = `PO${i + 1}`
                      return {
                        name: po,
                        [`Above Pass Marks (${targetPassMarks}%)`]: calculations.poAttainment[po]?.passMarksPercentage || 0,
                        [`Above KPI (${kpiPO}%)`]: calculations.poAttainment[po]?.kpiPercentage || 0,
                      }
                    })}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorPOPassMarks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightBlue} stopOpacity={0.9} />
                        <stop offset="95%" stopColor={UNIVERSITY_COLORS.accent} stopOpacity={0.9} />
                      </linearGradient>
                      <linearGradient id="colorPOKPI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightGold} stopOpacity={0.9} />
                        <stop offset="95%" stopColor={UNIVERSITY_COLORS.secondary} stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} />
                    <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold' } }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #1a5f3f', borderRadius: '8px' }} formatter={(value) => `${parseFloat(value).toFixed(1)}%`} />
                    <Bar dataKey={`Above Pass Marks (${targetPassMarks}%)`} fill="url(#colorPOPassMarks)" radius={[8, 8, 0, 0]} stroke={UNIVERSITY_COLORS.accent} strokeWidth={1} />
                    <Bar dataKey={`Above KPI (${kpiPO}%)`} fill="url(#colorPOKPI)" radius={[8, 8, 0, 0]} stroke={UNIVERSITY_COLORS.secondary} strokeWidth={1} />
                    <Legend wrapperStyle={{ paddingTop: '16px' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* PO Contribution */}
              <div id="po-contribution-chart" className="lg:col-span-2 bg-gradient-to-br from-white to-purple-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-purple-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent uppercase tracking-wider">
                    PO Contribution from COs
                  </h2>
                  <button
                    onClick={() => downloadChartAsJPG('po-contribution-chart', 'PO_Contribution')}
                    className="flex items-center justify-center p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md no-print"
                    title="Download chart"
                  >
                    <Download size={14} />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    layout="vertical"
                    barSize={20}
                    data={(() => {
                      const poData = []
                      for (let po = 1; po <= 12; po++) {
                        const poKey = `PO${po}`
                        const entry = { name: poKey }
                        let hasCO = false
                        for (let co = 1; co <= 12; co++) {
                          const coKey = `CO${co}`
                          if (coMapping?.[coKey]?.[poKey] === 1) {
                            entry[`${coKey} (KPI)`] = calculations.coAttainment[coKey]?.kpiPercentage || 0
                            hasCO = true
                          }
                        }
                        if (hasCO) poData.push(entry)
                      }
                      return poData
                    })()}
                    margin={{ top: 20, right: 30, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis type="number" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #6b21a8', borderRadius: '8px' }} formatter={(value, name) => [`${parseFloat(value).toFixed(1)}%`, name]} />
                    <Legend wrapperStyle={{ paddingTop: '12px' }} />
                    {Array.from({ length: 12 }, (_, i) => {
                      const coKey = `CO${i + 1}`
                      const hasMapping = Array.from({ length: 12 }, (_, j) => coMapping?.[coKey]?.[`PO${j + 1}`] === 1).some(Boolean)
                      if (!hasMapping) return null
                      const baseColor = COLORS[i % COLORS.length]
                      return <Bar key={`${coKey}-kpi`} dataKey={`${coKey} (KPI)`} fill={baseColor} radius={[0, 4, 4, 0]} />
                    }).filter(Boolean)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Side-by-side Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
                <h3 className="text-xl font-bold text-green-900 mb-3 border-b-2 border-green-800 pb-1 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-700" />
                  Course Outcomes (COs) Attainment
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white text-sm">
                        <th className="px-4 py-3 text-left font-bold border border-green-900">CO</th>
                        <th className="px-4 py-3 text-center font-bold border border-green-900">% Above Pass Marks ({targetPassMarks}%)</th>
                        <th className="px-4 py-3 text-center font-bold border border-green-900">% Above KPI ({kpiCO}%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCOs.map((co) => {
                        const coData = calculations.coAttainment[co]
                        return (
                          <tr key={co} className="hover:bg-green-50/50 transition-colors">
                            <td className="px-4 py-2.5 text-sm font-bold text-gray-800 border border-gray-200 bg-white">{co}</td>
                            <td className="px-4 py-2.5 text-sm text-center border border-gray-200 bg-white font-semibold text-blue-700">{(coData?.passMarksPercentage || 0).toFixed(1)}%</td>
                            <td className={`px-4 py-2.5 text-sm text-center border border-gray-200 font-bold ${coData?.kpiPercentage >= kpiCO ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>{(coData?.kpiPercentage || 0).toFixed(1)}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
                <h3 className="text-xl font-bold text-green-900 mb-3 border-b-2 border-green-800 pb-1 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-700" />
                  Program Outcomes (POs) Attainment
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white text-sm">
                        <th className="px-4 py-3 text-left font-bold border border-green-900">PO</th>
                        <th className="px-4 py-3 text-center font-bold border border-green-900">% Above Pass Marks ({targetPassMarks}%)</th>
                        <th className="px-4 py-3 text-center font-bold border border-green-900">% Above KPI ({kpiPO}%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePOs.map((po) => {
                        const poData = calculations.poAttainment[po]
                        return (
                          <tr key={po} className="hover:bg-green-50/50 transition-colors">
                            <td className="px-4 py-2.5 text-sm font-bold text-gray-800 border border-gray-200 bg-white">{po}</td>
                            <td className="px-4 py-2.5 text-sm text-center border border-gray-200 bg-white font-semibold text-blue-700">{(poData?.passMarksPercentage || 0).toFixed(1)}%</td>
                            <td className={`px-4 py-2.5 text-sm text-center border border-gray-200 font-bold ${poData?.kpiPercentage >= kpiPO ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>{(poData?.kpiPercentage || 0).toFixed(1)}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* CO Attainment Heatmap */}
            <div id="co-heatmap-chart" className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
              <h2 className="text-xl font-bold bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                CO Attainment Heatmap
              </h2>
              <div className={`overflow-x-auto ${students.length > 20 ? 'max-h-[600px] overflow-y-auto shadow-inner' : ''}`}>
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white">
                      <th className="px-3 py-3 text-left font-bold border border-green-900 sticky left-0 bg-green-700 z-20 w-[180px]">Student ID / Roll</th>
                      <th className="px-3 py-3 text-left font-bold border border-green-900 sticky left-[180px] bg-green-700 z-20 w-[200px]">Student Name</th>
                      {activeCOs.map((co) => (
                        <th key={co} className="px-2 py-3 text-center font-bold border border-green-900">{co}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-green-50/30 transition-colors">
                        <td className="px-3 py-2 font-bold text-gray-700 border border-gray-200 sticky left-0 bg-white z-10 w-[180px]">{student.id}</td>
                        <td className="px-3 py-2 font-semibold text-gray-700 border border-gray-200 sticky left-[180px] bg-white z-10 w-[200px] truncate">{student.name}</td>
                        {activeCOs.map((co) => {
                          const score = calculations.studentCOs[student.id]?.[co] || 0
                          let bgColor = 'bg-gray-100 text-gray-400'
                          if (score < targetPassMarks) bgColor = 'bg-red-400 text-white font-bold'
                          else if (score < kpiCO) bgColor = 'bg-yellow-300 text-gray-800 font-bold'
                          else bgColor = 'bg-green-500 text-white font-bold'

                          return (
                            <td key={co} className={`px-2 py-2 text-center border border-gray-200 ${bgColor}`}>
                              {score.toFixed(1)}%
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-4 justify-center mt-4 pt-3 border-t border-gray-200 text-xs font-semibold">
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-red-400"></div><span className="text-gray-600">{'<'} {targetPassMarks}% (Below Pass)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-yellow-300"></div><span className="text-gray-600">{targetPassMarks}%–{kpiCO - 1}% (Between Target)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-green-500"></div><span className="text-gray-600">≥ {kpiCO}% (KPI Met)</span></div>
              </div>
            </div>

            {/* PO Attainment Heatmap */}
            <div id="po-heatmap-chart" className="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-blue-105 mt-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                PO Attainment Heatmap
              </h2>
              <div className={`overflow-x-auto ${students.length > 20 ? 'max-h-[600px] overflow-y-auto shadow-inner' : ''}`}>
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-blue-700 to-blue-800 text-white">
                      <th className="px-3 py-3 text-left font-bold border border-blue-900 sticky left-0 bg-blue-700 z-20 w-[180px]">Student ID / Roll</th>
                      <th className="px-3 py-3 text-left font-bold border border-blue-900 sticky left-[180px] bg-blue-700 z-20 w-[200px]">Student Name</th>
                      {activePOs.map((po) => (
                        <th key={po} className="px-2 py-3 text-center font-bold border border-blue-900">{po}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-3 py-2 font-bold text-gray-700 border border-gray-200 sticky left-0 bg-white z-10 w-[180px]">{student.id}</td>
                        <td className="px-3 py-2 font-semibold text-gray-700 border border-gray-200 sticky left-[180px] bg-white z-10 w-[200px] truncate">{student.name}</td>
                        {activePOs.map((po) => {
                          const score = calculations.studentPOs[student.id]?.[po] || 0
                          let bgColor = 'bg-gray-100 text-gray-400'
                          if (score < targetPassMarks) bgColor = 'bg-red-400 text-white font-bold'
                          else if (score < kpiPO) bgColor = 'bg-yellow-300 text-gray-800 font-bold'
                          else bgColor = 'bg-green-500 text-white font-bold'

                          return (
                            <td key={po} className={`px-2 py-2 text-center border border-gray-200 ${bgColor}`}>
                              {score.toFixed(1)}%
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-4 justify-center mt-4 pt-3 border-t border-gray-200 text-xs font-semibold">
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-red-400"></div><span className="text-gray-600">{'<'} {targetPassMarks}% (Below Pass)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-yellow-300"></div><span className="text-gray-600">{targetPassMarks}%–{kpiPO - 1}% (Between Target)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-green-500"></div><span className="text-gray-600">≥ {kpiPO}% (KPI Met)</span></div>
              </div>
            </div>
          </>
        )}
        {/* VIEW 2: Individual Student Report */}
        {viewMode === 'individual' && (
          <div className="space-y-6">
            {/* Main Grid: Left (col-span-8) and Right (col-span-4) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* LEFT COLUMN: Student Selector & Mark Sheet details */}
              <div className="lg:col-span-8 space-y-6">

                {/* Student Selector Card */}
                <div className="bg-white rounded-2xl shadow-md p-5 border border-green-100 no-print">
                  <div className="w-full">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                      Select Student
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-700 font-bold text-sm shadow-sm"
                    >
                      <option value="">Select student roll number...</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.id} - {student.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!selectedStudentId && (
                  <div className="bg-white rounded-2xl shadow-md p-8 text-center border border-gray-200">
                    <Users className="w-12 h-12 text-green-600 mx-auto mb-3 opacity-60" />
                    <p className="text-gray-500 font-bold text-lg">Please select a student to view their marksheet and outcome attainment details.</p>
                  </div>
                )}

                {selectedStudentId && (
                  (() => {
                    const student = students.find((s) => s.id === selectedStudentId)
                    if (!student) return null

                    const sTotal = studentTotalMarks[selectedStudentId] || 0
                    const sPct = totalMaxMarks > 0 ? (sTotal / totalMaxMarks) * 100 : 0
                    const { grade, gp } = getGradeAndGP(sPct)
                    const passStatus = sPct >= targetPassMarks ? 'Pass' : 'Below Pass'
                    const rank = studentRanks[selectedStudentId]

                    // Sum values for Mid Term and Term Final
                    const midTermMax = marksheetColumns.filter(c => c.parent === 'Mid Term').reduce((sum, c) => sum + c.maxMarks, 0)
                    const termFinalMax = marksheetColumns.filter(c => c.parent === 'Term Final').reduce((sum, c) => sum + c.maxMarks, 0)

                    return (
                      /* 1. Student Mark Sheet Details Panel */
                      <div className="bg-white rounded-2xl shadow-md p-6 border border-green-100 space-y-6">
                        <div className="border-b border-gray-100 pb-4">
                          <h3 className="text-lg font-black text-green-900 flex items-center gap-2 uppercase tracking-wider">
                            <FileText className="w-5 h-5 text-green-700" />
                            Student Analysis
                          </h3>
                        </div>

                        {/* Profile Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-xs">
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="font-bold text-gray-400">Student ID</span>
                            <span className="font-extrabold text-gray-800">{student.id}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="font-bold text-gray-400">Course Code</span>
                            <span className="font-extrabold text-gray-800">{courseInfo.courseCode || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="font-bold text-gray-400">Student Name</span>
                            <span className="font-extrabold text-gray-800">{student.name}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="font-bold text-gray-400">Course Title</span>
                            <span className="font-extrabold text-gray-800">{courseInfo.courseTitle || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="font-bold text-gray-400">Batch</span>
                            <span className="font-extrabold text-gray-800">{courseInfo.batchName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="font-bold text-gray-400">Credit Hours</span>
                            <span className="font-extrabold text-gray-800">{courseInfo.creditHours || '3 Credits'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="font-bold text-gray-400">Section</span>
                            <span className="font-extrabold text-gray-800">{courseInfo.sectionName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-gray-100">
                            <span className="font-bold text-gray-400">Teacher</span>
                            <span className="font-extrabold text-gray-800">{courseInfo.teacherName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between py-1 md:col-span-2">
                            <span className="font-bold text-gray-400">Academic Session</span>
                            <span className="font-extrabold text-gray-800">{courseInfo.semesterName || 'N/A'} ({courseInfo.academicYear || ''})</span>
                          </div>
                        </div>

                        {/* Dynamic Assessment Matrix Table */}
                        <div className="overflow-x-auto border border-gray-200 rounded-xl">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead>
                              <tr className="bg-gray-100 text-gray-700 font-bold">
                                <th rowSpan="2" className="px-3 py-2 border-b border-r border-gray-200 align-middle">Assessment</th>
                                {parentHeaders['CT'] > 0 && (
                                  <th colSpan={parentHeaders['CT']} className="px-2 py-1.5 border-b border-r border-gray-200 bg-green-50 text-green-800 text-center">CT</th>
                                )}
                                {parentHeaders['Others'] > 0 && (
                                  <th colSpan={parentHeaders['Others']} className="px-2 py-1.5 border-b border-r border-gray-200 bg-blue-50 text-blue-800 text-center">Others</th>
                                )}
                                {parentHeaders['Mid Term'] > 0 && (
                                  <th colSpan={parentHeaders['Mid Term']} className="px-2 py-1.5 border-b border-r border-gray-200 bg-yellow-50 text-yellow-800 text-center">Mid Term ({midTermMax})</th>
                                )}
                                {parentHeaders['Term Final'] > 0 && (
                                  <th colSpan={parentHeaders['Term Final']} className="px-2 py-1.5 border-b border-r border-gray-200 bg-purple-50 text-purple-800 text-center">Term Final ({termFinalMax})</th>
                                )}
                                <th rowSpan="2" className="px-3 py-2 border-b border-gray-200 text-center align-middle bg-gray-50 text-gray-800">Total ({totalMaxMarks})</th>
                              </tr>
                              <tr className="bg-gray-50/50 text-gray-500 font-semibold">
                                {marksheetColumns.map((col) => (
                                  <th key={col.id} className="px-2 py-1.5 border-b border-r border-gray-200 text-center">
                                    {col.name} {!(col.parent === 'Mid Term' || col.parent === 'Term Final') && `(${col.maxMarks})`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {/* Row 1: Maximum Marks */}
                              <tr className="border-b border-gray-200 hover:bg-gray-50/30">
                                <td className="px-3 py-2 border-r border-gray-200 font-bold bg-gray-50 text-gray-600">Maximum Marks</td>
                                {marksheetColumns.map((col) => (
                                  <td key={col.id} className="px-2 py-2 border-r border-gray-200 text-center text-gray-500 font-medium">
                                    {col.maxMarks}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center font-bold bg-gray-50 text-gray-600">{totalMaxMarks}</td>
                              </tr>
                              {/* Row 2: CO Mapping */}
                              <tr className="border-b border-gray-200 hover:bg-gray-50/30">
                                <td className="px-3 py-2 border-r border-gray-200 font-bold bg-gray-50 text-gray-600">CO Mapping</td>
                                {marksheetColumns.map((col) => (
                                  <td key={col.id} className="px-2 py-2 border-r border-gray-200 text-center text-indigo-700 font-bold">
                                    {col.co || '-'}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center font-bold bg-gray-50 text-gray-400">-</td>
                              </tr>
                              {/* Row 3: Obtained Marks */}
                              <tr className="border-b border-gray-200 hover:bg-gray-50/30">
                                <td className="px-3 py-2 border-r border-gray-200 font-bold bg-gray-50 text-gray-600">Obtained Marks</td>
                                {marksheetColumns.map((col) => (
                                  <td key={col.id} className="px-2 py-2 border-r border-gray-200 text-center font-black text-gray-800">
                                    {getMarksheetColumnMark(student, col).toFixed(1)}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center font-extrabold bg-green-50 text-green-800">{sTotal.toFixed(1)}</td>
                              </tr>
                              {/* Row 4: Percentage */}
                              <tr className="hover:bg-gray-50/30">
                                <td className="px-3 py-2 border-r border-gray-200 font-bold bg-gray-50 text-gray-600">Percentage (%)</td>
                                {marksheetColumns.map((col) => {
                                  const mark = getMarksheetColumnMark(student, col)
                                  const pct = col.maxMarks > 0 ? (mark / col.maxMarks) * 100 : 0
                                  return (
                                    <td key={col.id} className="px-2 py-2 border-r border-gray-200 text-center text-gray-500 font-semibold">
                                      {pct.toFixed(1)}%
                                    </td>
                                  )
                                })}
                                <td className="px-3 py-2 text-center font-black bg-green-50 text-green-800">{sPct.toFixed(2)}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Summary Mini Cards inside Student Mark Sheet Panel */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                          <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Obtained Marks</p>
                            <p className="text-sm font-extrabold text-gray-800 mt-1">{sTotal.toFixed(1)} / {totalMaxMarks}</p>
                          </div>
                          <div className="bg-green-50/50 border border-green-100 p-3 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Overall Percentage</p>
                            <p className="text-sm font-black text-green-700 mt-1">{sPct.toFixed(2)}%</p>
                          </div>
                          <div className="bg-yellow-50/50 border border-yellow-100 p-3 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">Letter Grade</p>
                            <p className="text-sm font-black text-yellow-700 mt-1">{grade}</p>
                          </div>
                          <div className="bg-green-50/50 border border-green-100 p-3 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Grade Point</p>
                            <p className="text-sm font-black text-green-700 mt-1">{gp.toFixed(2)}</p>
                          </div>
                          <div className={`border p-3 rounded-xl text-center col-span-2 md:col-span-1 ${passStatus === 'Pass' ? 'bg-green-100/50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wider">Pass / Fail</p>
                            <p className="text-sm font-black mt-1">{passStatus}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                )}

              </div>

              {/* RIGHT COLUMN: Performance summary, Pie chart distribution, Export actions, Recent reports */}
              <div className="lg:col-span-4 space-y-6">

                {selectedStudentId && (
                  (() => {
                    const student = students.find((s) => s.id === selectedStudentId)
                    if (!student) return null

                    const sTotal = studentTotalMarks[selectedStudentId] || 0
                    const sPct = totalMaxMarks > 0 ? (sTotal / totalMaxMarks) * 100 : 0
                    const { grade, gp } = getGradeAndGP(sPct)
                    const passStatus = sPct >= targetPassMarks ? 'Pass' : 'Below Pass'
                    const rank = studentRanks[selectedStudentId]

                    // Calculate class pie distribution dynamically
                    const classDistribution = (() => {
                      const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 }
                      students.forEach((s) => {
                        const obtained = studentTotalMarks[s.id] || 0
                        const pct = totalMaxMarks > 0 ? (obtained / totalMaxMarks) * 100 : 0
                        if (pct >= 80) dist.A++
                        else if (pct >= 70) dist.B++
                        else if (pct >= 60) dist.C++
                        else if (pct >= 50) dist.D++
                        else dist.F++
                      })
                      const total = students.length || 1
                      return [
                        { name: 'A (80-100%)', value: dist.A, pct: (dist.A / total) * 100, color: '#10b981' },
                        { name: 'B (70-79%)', value: dist.B, pct: (dist.B / total) * 100, color: '#eab308' },
                        { name: 'C (60-69%)', value: dist.C, pct: (dist.C / total) * 100, color: '#3b82f6' },
                        { name: 'D (50-59%)', value: dist.D, pct: (dist.D / total) * 100, color: '#f97316' },
                        { name: 'F (<50%)', value: dist.F, pct: (dist.F / total) * 100, color: '#ef4444' },
                      ]
                    })()

                    return (
                      <div className="space-y-6">

                        {/* 2. Performance Summary Panel */}
                        <div className="bg-white rounded-2xl shadow-md p-5 border border-green-100 space-y-4">
                          <h4 className="text-sm font-black text-green-955 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-2.5">
                            <TrendingUp className="w-4 h-4 text-green-700" />
                            Performance Summary
                          </h4>
                          <div className="space-y-3 text-xs font-semibold text-gray-700">
                            <div className="flex justify-between py-1 border-b border-gray-50">
                              <span>Total Assessments</span>
                              <span className="font-extrabold text-gray-800">{allAssessments.length}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                              <span>Total Marks</span>
                              <span className="font-extrabold text-gray-800">{totalMaxMarks}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                              <span>Marks Obtained</span>
                              <span className="font-extrabold text-gray-800">{sTotal.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                              <span>Overall Percentage</span>
                              <span className="font-extrabold text-green-700">{sPct.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                              <span>Class Rank</span>
                              <span className="font-extrabold text-gray-800">{rank} / {students.length}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                              <span>Grade</span>
                              <span className="font-extrabold text-yellow-600">{grade} ({gp.toFixed(2)})</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span>Pass Status</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${passStatus === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {passStatus}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 3. Performance Distribution (Class) Pie Chart Panel */}
                        <div className="bg-white rounded-2xl shadow-md p-5 border border-green-100 space-y-4">
                          <h4 className="text-sm font-black text-green-955 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-2.5">
                            <Users className="w-4 h-4 text-green-700" />
                            Performance Distribution (Class)
                          </h4>

                          <div className="relative flex justify-center items-center h-44">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={classDistribution}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {classDistribution.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute text-center">
                              <p className="text-xl font-black text-gray-800">{students.length}</p>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Students</p>
                            </div>
                          </div>

                          {/* Custom Legend */}
                          <div className="space-y-1.5 pt-2 border-t border-gray-50 text-[11px] font-bold text-gray-600">
                            {classDistribution.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                  <span>{item.name}</span>
                                </div>
                                <span className="text-gray-800 font-extrabold">{item.value} ({item.pct.toFixed(1)}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )
                  })()
                )}

              </div>

            </div>

            {/* FULL-WIDTH SECTION: CO & PO Attainment Panels */}
            {selectedStudentId && (
              (() => {
                const student = students.find((s) => s.id === selectedStudentId)
                if (!student) return null

                // compute coChartData
                const coChartData = activeCOs.map((co) => {
                  const coMax = coMarkAllocations[co] || 0
                  let coObtained = 0
                  marksheetColumns.forEach((col) => {
                    if ((col.co || '').replace(/\s+/g, '').toUpperCase() === co) {
                      coObtained += getMarksheetColumnMark(student, col)
                    }
                  })
                  const pct = coMax > 0 ? (coObtained / coMax) * 100 : 0
                  return {
                    name: co,
                    Attainment: parseFloat(pct.toFixed(2)),
                    color: pct >= kpiCO ? '#1a5f3f' : '#ef4444'
                  }
                })

                const attainedCOCount = activeCOs.filter((co) => {
                  const coMax = coMarkAllocations[co] || 0
                  let coObtained = 0
                  marksheetColumns.forEach((col) => {
                    if ((col.co || '').replace(/\s+/g, '').toUpperCase() === co) {
                      coObtained += getMarksheetColumnMark(student, col)
                    }
                  })
                  const pct = coMax > 0 ? (coObtained / coMax) * 100 : 0
                  return pct >= kpiCO
                }).length
                const totalCOCount = activeCOs.length
                const coRatio = totalCOCount > 0 ? (attainedCOCount / totalCOCount) * 100 : 0

                // compute poChartData
                const poChartData = activePOs.map((po) => {
                  const pct = calculations.studentPOs[selectedStudentId]?.[po] || 0
                  return {
                    name: po,
                    Attainment: parseFloat(pct.toFixed(2)),
                    color: pct >= kpiPO ? '#2c5282' : '#ef4444'
                  }
                })

                const attainedPOCount = activePOs.filter((po) => {
                  const pct = calculations.studentPOs[selectedStudentId]?.[po] || 0
                  return pct >= kpiPO
                }).length
                const totalPOCount = activePOs.length
                const poRatio = totalPOCount > 0 ? (attainedPOCount / totalPOCount) * 100 : 0

                return (
                  <div className="space-y-6 mt-6">
                    {/* 2. Course Outcome (CO) Attainment Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      <div className="lg:col-span-8 bg-white rounded-2xl shadow-md p-6 border border-green-100 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-black text-green-900 flex items-center gap-2 uppercase tracking-wide">
                              <Target className="w-5 h-5 text-green-700" />
                              Course Outcome (CO) Attainment - This Student
                            </h3>
                          </div>

                          <div className="overflow-x-auto border border-gray-200 rounded-xl mt-4">
                            <table className="w-full border-collapse text-left text-xs">
                              <thead>
                                <tr className="bg-gray-100 text-gray-700 font-bold uppercase">
                                  <th className="px-4 py-2 border-b border-gray-200">CO</th>
                                  <th className="px-4 py-2 border-b border-gray-200">Description</th>
                                  <th className="px-4 py-2 border-b border-gray-200 text-center">Total Obtained</th>
                                  <th className="px-4 py-2 border-b border-gray-200 text-center">Max Marks</th>
                                  <th className="px-4 py-2 border-b border-gray-200 text-center">Percentage (%)</th>
                                  <th className="px-4 py-2 border-b border-gray-200 text-center">KPI Target</th>
                                  <th className="px-4 py-2 border-b border-gray-200 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeCOs.map((co) => {
                                  const coMax = coMarkAllocations[co] || 0
                                  let coObtained = 0
                                  marksheetColumns.forEach((col) => {
                                    if ((col.co || '').replace(/\s+/g, '').toUpperCase() === co) {
                                      coObtained += getMarksheetColumnMark(student, col)
                                    }
                                  })

                                  const pct = coMax > 0 ? (coObtained / coMax) * 100 : 0
                                  const isMet = pct >= kpiCO

                                  return (
                                    <tr key={co} className="border-b border-gray-100 hover:bg-gray-50/50">
                                      <td className="px-4 py-2.5 font-bold text-green-900 border-r border-gray-100">{co}</td>
                                      <td className="px-4 py-2.5 text-gray-600 font-medium">{getCODescription(co)}</td>
                                      <td className="px-4 py-2.5 text-center font-bold text-gray-700">{coObtained.toFixed(1)} / {coMax}</td>
                                      <td className="px-4 py-2.5 text-center text-gray-500 font-semibold">{coMax}</td>
                                      <td className="px-4 py-2.5 text-center font-bold text-gray-800">{pct.toFixed(2)}%</td>
                                      <td className="px-4 py-2.5 text-center text-gray-500 font-semibold">{kpiCO}%</td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {isMet ? 'Attained' : 'Not Attained'}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <p className="text-xs font-black text-green-800 bg-green-50/50 p-2.5 rounded-xl border border-green-100">
                          COs Attained: {attainedCOCount} / {totalCOCount} ({coRatio.toFixed(2)}%)
                        </p>
                      </div>

                      <div className="lg:col-span-4 bg-white rounded-2xl shadow-md p-6 border border-green-100 flex flex-col justify-between">
                        <h3 className="text-sm font-black text-green-900 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-3 mb-4">
                          <TrendingUp className="w-5 h-5 text-green-700" />
                          CO Attainment Visualization
                        </h3>
                        <div className="flex-1 flex items-center justify-center min-h-[250px]">
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={coChartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                              <XAxis dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} />
                              <YAxis domain={[0, 100]} tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} />
                              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                              <Bar dataKey="Attainment" radius={[4, 4, 0, 0]}>
                                {coChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                              <ReferenceLine y={kpiCO} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Target (${kpiCO}%)`, position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* 3. Program Outcome (PO) Attainment Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      <div className="lg:col-span-8 bg-white rounded-2xl shadow-md p-6 border border-blue-100 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-lg font-black text-blue-900 flex items-center gap-2 uppercase tracking-wide">
                              <Award className="w-5 h-5 text-blue-755" />
                              Program Outcome (PO) Attainment - This Student
                            </h3>
                          </div>

                          <div className="overflow-x-auto border border-gray-200 rounded-xl mt-4">
                            <table className="w-full border-collapse text-left text-xs">
                              <thead>
                                <tr className="bg-gray-100 text-gray-700 font-bold uppercase">
                                  <th className="px-4 py-2 border-b border-gray-200">PO</th>
                                  <th className="px-4 py-2 border-b border-gray-200">Description</th>
                                  <th className="px-4 py-2 border-b border-gray-200 text-center">Weighted Percentage (%)</th>
                                  <th className="px-4 py-2 border-b border-gray-200 text-center">KPI Target (%)</th>
                                  <th className="px-4 py-2 border-b border-gray-200 text-center">Attainment Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activePOs.map((po) => {
                                  const pct = calculations.studentPOs[selectedStudentId]?.[po] || 0
                                  const isMet = pct >= kpiPO

                                  return (
                                    <tr key={po} className="border-b border-gray-100 hover:bg-gray-50/50">
                                      <td className="px-4 py-2.5 font-bold text-blue-900 border-r border-gray-100">{po}</td>
                                      <td className="px-4 py-2.5 text-gray-600 font-medium">{getPODescription(po)}</td>
                                      <td className="px-4 py-2.5 text-center font-bold text-gray-800">{pct.toFixed(2)}%</td>
                                      <td className="px-4 py-2.5 text-center text-gray-500 font-semibold">{kpiPO}%</td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {isMet ? 'Attained' : 'Not Attained'}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <p className="text-xs font-black text-green-800 bg-green-50/50 p-2.5 rounded-xl border border-green-100">
                          POs Attained: {attainedPOCount} / {totalPOCount} ({poRatio.toFixed(2)}%)
                        </p>
                      </div>

                      <div className="lg:col-span-4 bg-white rounded-2xl shadow-md p-6 border border-blue-100 flex flex-col justify-between">
                        <h3 className="text-sm font-black text-blue-900 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-3 mb-4">
                          <TrendingUp className="w-5 h-5 text-blue-755" />
                          PO Attainment Visualization
                        </h3>
                        <div className="flex-1 flex items-center justify-center min-h-[250px]">
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={poChartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                              <XAxis dataKey="name" tick={{ fill: '#2c5282', fontWeight: 'bold' }} />
                              <YAxis domain={[0, 100]} tick={{ fill: '#2c5282', fontWeight: 'bold' }} />
                              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                              <Bar dataKey="Attainment" radius={[4, 4, 0, 0]}>
                                {poChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                              <ReferenceLine y={kpiPO} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Target (${kpiPO}%)`, position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Hidden charts container to capture image during Word exports */}
                    <div className="hidden">
                      <div id={`student-co-bar-${selectedStudentId}`}>
                        <BarChart width={500} height={300} data={activeCOs.map(co => ({ name: co, value: calculations.studentCOs[selectedStudentId]?.[co] || 0 }))}>
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <Bar dataKey="value" fill="#1a5f3f" />
                        </BarChart>
                      </div>
                      <div id={`student-po-bar-${selectedStudentId}`}>
                        <BarChart width={500} height={300} data={activePOs.map(po => ({ name: po, value: calculations.studentPOs[selectedStudentId]?.[po] || 0 }))}>
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <Bar dataKey="value" fill="#2c5282" />
                        </BarChart>
                      </div>
                    </div>

                  </div>
                )
              })()
            )}
          </div>
        )}

        {/* VIEW 3: Overall Batch Report */}
        {viewMode === 'batch' && (
          <div className="space-y-8">

            {/* SECTION 1: Cover Page */}
            <div id="batch-report-cover">
              <ReportCoverPage
                title="OBE COURSE REPORT"
                courseInfo={courseInfo}
                targetPassMarks={targetPassMarks}
                kpiCO={kpiCO}
                kpiPO={kpiPO}
              />
            </div>

            {/* SECTION 2: Course Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <h3 className="text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide">
                2. Course Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm font-semibold text-gray-700">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Course Code</span>
                  <span className="text-green-950 font-bold">{courseInfo.courseCode || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 gap-4">
                  <span className="text-gray-500">Course Title</span>
                  <span className="text-green-950 font-bold text-right break-words text-xs sm:text-sm md:text-base" title={courseInfo.courseTitle}>{courseInfo.courseTitle || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Batch & Section</span>
                  <span className="text-gray-900 font-bold">{courseInfo.batchName || 'N/A'} {courseInfo.sectionName ? `(Sec: ${courseInfo.sectionName})` : ''}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Academic Session</span>
                  <span className="text-gray-900 font-bold">{courseInfo.semesterName || 'N/A'} {courseInfo.academicYear ? `(${courseInfo.academicYear})` : ''}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Credit Hours</span>
                  <span className="text-gray-900 font-bold">{courseInfo.creditHours || '3 Credits'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Course Instructor</span>
                  <span className="text-gray-900 font-bold">{courseInfo.teacherName || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Total Enrollment</span>
                  <span className="text-gray-900 font-bold">{students.length} Students</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Total Assessments</span>
                  <span className="text-gray-900 font-bold">{allAssessments.length}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 md:col-span-2">
                  <span className="text-gray-500">Report Generated On</span>
                  <span className="text-gray-600 font-medium">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: Quick Statistics */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100 page-break">
              <h3 className="text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide">
                3. Quick Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4">
                <div className="bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Students</p>
                  <p className="text-lg font-extrabold text-green-800 mt-1">{students.length}</p>
                </div>
                <div className="bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Assessments</p>
                  <p className="text-lg font-extrabold text-green-800 mt-1">{allAssessments.length}</p>
                </div>
                <div className="bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Avg Marks</p>
                  <p className="text-lg font-extrabold text-green-800 mt-1">{batchMetrics.averagePercentage?.toFixed(1)}%</p>
                </div>
                <div className="bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Highest</p>
                  <p className="text-sm font-black text-green-800 mt-2 truncate" title={batchMetrics.highest?.name}>{batchMetrics.highest?.percentage.toFixed(1)}%</p>
                </div>
                <div className="bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Lowest</p>
                  <p className="text-sm font-black text-red-700 mt-2 truncate" title={batchMetrics.lowest?.name}>{batchMetrics.lowest?.percentage.toFixed(1)}%</p>
                </div>
                <div className="bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Pass Rate</p>
                  <p className="text-lg font-extrabold text-green-800 mt-1">{batchMetrics.passRate?.toFixed(1)}%</p>
                </div>
                <div className="bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">COs Attained</p>
                  <p className="text-lg font-extrabold text-green-800 mt-1">{coAttainedCount} / {activeCOs.length}</p>
                </div>
                <div className="bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">POs Attained</p>
                  <p className="text-lg font-extrabold text-green-800 mt-1">{poAttainedCount} / {activePOs.length}</p>
                </div>
                <div className="bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Overall %</p>
                  <p className="text-lg font-extrabold text-green-800 mt-1">{batchMetrics.averagePercentage?.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* SECTION 4: Assessment Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <h3 className="text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide">
                4. Assessment Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-semibold">
                  <thead>
                    <tr className="bg-green-600 text-white text-[10px] uppercase tracking-wider">
                      <th className="px-4 py-3 border border-green-800">Assessment Name</th>
                      <th className="px-4 py-3 border border-green-800 text-center">Max Marks</th>
                      <th className="px-4 py-3 border border-green-800 text-center">Class Average</th>
                      <th className="px-4 py-3 border border-green-800 text-center">Highest Mark</th>
                      <th className="px-4 py-3 border border-green-800 text-center">Highest Scorer</th>
                      <th className="px-4 py-3 border border-green-800 text-center">Lowest Mark</th>
                      <th className="px-4 py-3 border border-green-800 text-center">Lowest Scorer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessmentStats.map((stat) => (
                      <tr key={stat.id} className="hover:bg-green-50/40 border-b border-gray-200">
                        <td className="px-4 py-2 text-gray-800 font-bold">{stat.name}</td>
                        <td className="px-4 py-2 text-center text-gray-600 font-bold">{stat.maxMarks}</td>
                        <td className="px-4 py-2 text-center text-green-800 font-black">{stat.average.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center text-gray-800">{stat.highest}</td>
                        <td className="px-4 py-2 text-center text-green-800 font-normal">{stat.highestScorers}</td>
                        <td className="px-4 py-2 text-center text-gray-800">{stat.lowest}</td>
                        <td className="px-4 py-2 text-center text-red-700 font-normal">{stat.lowestScorers}</td>
                      </tr>
                    ))}
                    <tr className="bg-green-50 font-black text-green-950">
                      <td className="px-4 py-2.5 border-t border-green-800">Total Course Mark</td>
                      <td className="px-4 py-2.5 text-center border-t border-green-800">{totalStats.maxMarks}</td>
                      <td className="px-4 py-2.5 text-center text-green-905 border-t border-green-800">{totalStats.average.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center border-t border-green-800">{totalStats.highest.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-center text-green-900 border-t border-green-800 font-normal">{totalStats.highestScorers}</td>
                      <td className="px-4 py-2.5 text-center border-t border-green-800">{totalStats.lowest.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-center text-red-800 border-t border-green-800 font-normal">{totalStats.lowestScorers}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* CHARTS GRID 1: Sections 5, 6 & 7 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 page-break">
              {/* SECTION 5: Grade Distribution */}
              <div id="grade-dist-chart" className="bg-white rounded-2xl shadow-md p-5 border border-green-100">
                <h3 className="text-md font-bold text-green-950 mb-3 uppercase tracking-wide">
                  5. Grade Distribution
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={gradeDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`${value} Students`, 'Count']} />
                    <Bar dataKey="Count" fill="#1a5f3f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* SECTION 6: Performance Distribution */}
              <div id="perf-dist-chart" className="bg-white rounded-2xl shadow-md p-5 border border-green-100">
                <h3 className="text-md font-bold text-green-950 mb-3 uppercase tracking-wide">
                  6. Performance Distribution
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={performanceDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`${value} Students`, 'Count']} />
                    <Bar dataKey="No. of Students" fill="#319795" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* SECTION 7: Assessment Contribution */}
              <div id="assess-weight-chart" className="bg-white rounded-2xl shadow-md p-5 border border-green-100">
                <h3 className="text-md font-bold text-green-950 mb-3 uppercase tracking-wide">
                  7. Assessment Contribution
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={assessmentContributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={(entry) => entry.name}
                    >
                      {assessmentContributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} Marks`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SECTION 8: Overall Performance Gauge */}
            <div id="overall-perf-gauge" className="bg-white rounded-2xl shadow-lg p-6 border border-green-100 page-break">
              <h3 className="text-lg font-black text-green-950 mb-3 uppercase tracking-wide">
                8. Overall Performance (Gauge)
              </h3>
              <div className="flex justify-center items-center py-4">
                <SemiCircleGauge value={batchMetrics.averagePercentage || 0} />
              </div>
            </div>

            {/* SECTION 9: Course Outcome (CO) Attainment */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <h3 className="text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide">
                9. Course Outcome (CO) Attainment
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs font-semibold">
                    <thead>
                      <tr className="bg-green-600 text-white text-[10px] uppercase">
                        <th className="px-4 py-2.5 border border-green-800">Outcome</th>
                        <th className="px-4 py-2.5 border border-green-800 text-center">Avg Attainment</th>
                        <th className="px-4 py-2.5 border border-green-800 text-center">KPI Target</th>
                        <th className="px-4 py-2.5 border border-green-800 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCOs.map((co) => {
                        const attainmentVal = calculations.coAttainment[co]?.kpiPercentage || 0
                        const isMet = attainmentVal >= kpiCO
                        return (
                          <tr key={co} className="hover:bg-green-50/30 border-b border-gray-200">
                            <td className="px-4 py-2 font-bold text-gray-800">{co}</td>
                            <td className="px-4 py-2 text-center text-green-950 font-black">{attainmentVal.toFixed(1)}%</td>
                            <td className="px-4 py-2 text-center text-gray-600 font-bold">{kpiCO}%</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${isMet ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {isMet ? 'KPI Met' : 'Below Target'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div id="batch-co-chart">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={activeCOs.map((co) => ({ name: co, Attainment: calculations.coAttainment[co]?.kpiPercentage || 0 }))} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 10 }} />
                      <Tooltip formatter={(v) => `${parseFloat(v).toFixed(1)}%`} />
                      <ReferenceLine y={kpiCO} stroke="#22c55e" strokeDasharray="5 5" label={{ value: `KPI ${kpiCO}%`, fill: '#22c55e', fontSize: 9, position: 'top' }} />
                      <Bar dataKey="Attainment" fill="#319795" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* SECTION 10: Program Outcome (PO) Attainment */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 page-break">
              <h3 className="text-lg font-black text-blue-950 mb-4 border-b-2 border-blue-800 pb-1.5 uppercase tracking-wide">
                10. Program Outcome (PO) Attainment
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs font-semibold">
                    <thead>
                      <tr className="bg-blue-600 text-white text-[10px] uppercase">
                        <th className="px-4 py-2.5 border border-blue-800">Outcome</th>
                        <th className="px-4 py-2.5 border border-blue-800 text-center">Avg Attainment</th>
                        <th className="px-4 py-2.5 border border-blue-800 text-center">KPI Target</th>
                        <th className="px-4 py-2.5 border border-blue-800 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePOs.map((po) => {
                        const attainmentVal = calculations.poAttainment[po]?.kpiPercentage || 0
                        const isMet = attainmentVal >= kpiPO
                        return (
                          <tr key={po} className="hover:bg-blue-50/30 border-b border-gray-200">
                            <td className="px-4 py-2 font-bold text-gray-800">{po}</td>
                            <td className="px-4 py-2 text-center text-blue-950 font-black">{attainmentVal.toFixed(1)}%</td>
                            <td className="px-4 py-2 text-center text-gray-600 font-bold">{kpiPO}%</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${isMet ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {isMet ? 'KPI Met' : 'Below Target'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div id="batch-po-chart">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart layout="vertical" data={activePOs.map((po) => ({ name: po, Attainment: calculations.poAttainment[po]?.kpiPercentage || 0 }))} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: '#2c5282', fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#2c5282', fontWeight: 'bold', fontSize: 10 }} width={40} />
                      <Tooltip formatter={(v) => `${parseFloat(v).toFixed(1)}%`} />
                      <ReferenceLine x={kpiPO} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `KPI ${kpiPO}%`, fill: '#3b82f6', fontSize: 9, position: 'insideTopLeft' }} />
                      <Bar dataKey="Attainment" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* SECTIONS 11 & 12: Student Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block">
              {/* SECTION 11: Top 10 Students */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
                <h3 className="text-md font-black text-green-950 mb-3 border-b border-green-200 pb-1 uppercase tracking-wide flex items-center gap-1.5">
                  <Award className="w-5 h-5 text-green-700" />
                  11. Top 10 Students
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs font-semibold">
                    <thead>
                      <tr className="bg-green-50 text-green-800 text-[10px] uppercase">
                        <th className="px-3 py-2 border border-gray-200 text-center font-bold">Rank</th>
                        <th className="px-3 py-2 border border-gray-200 text-left font-bold">Student ID</th>
                        <th className="px-3 py-2 border border-gray-200 text-left font-bold">Name</th>
                        <th className="px-3 py-2 border border-gray-200 text-center font-bold">Percentage</th>
                        <th className="px-3 py-2 border border-gray-200 text-center font-bold">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPerformersBatch.map((s) => (
                        <tr key={s.id} className="hover:bg-green-50/30">
                          <td className="px-3 py-1.5 border border-gray-200 text-center font-bold text-green-700">Rank {s.rank}</td>
                          <td className="px-3 py-1.5 border border-gray-200 font-bold text-gray-800">{s.id}</td>
                          <td className="px-3 py-1.5 border border-gray-200 text-gray-700">{s.name}</td>
                          <td className="px-3 py-1.5 border border-gray-200 text-center font-black text-green-800">{s.percentage.toFixed(1)}%</td>
                          <td className="px-3 py-1.5 border border-gray-200 text-center font-bold text-gray-800">{s.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 12: Students Needing Improvement */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-100 page-break">
                <h3 className="text-md font-black text-red-950 mb-3 border-b border-red-200 pb-1 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  12. Students Needing Improvement
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs font-semibold">
                    <thead>
                      <tr className="bg-red-50 text-red-800 text-[10px] uppercase">
                        <th className="px-3 py-2 border border-red-200 text-left font-bold">Student ID</th>
                        <th className="px-3 py-2 border border-red-200 text-left font-bold">Name</th>
                        <th className="px-3 py-2 border border-red-200 text-center font-bold">Overall %</th>
                        <th className="px-3 py-2 border border-red-200 text-left font-bold">Weak CO(s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsNeedingImprovement.map((s) => {
                        const weakCOList = s.weakCOs.join(', ')
                        return (
                          <tr key={s.id} className="hover:bg-red-50/20">
                            <td className="px-3 py-1.5 border border-red-100 font-bold text-gray-800">{s.id}</td>
                            <td className="px-3 py-1.5 border border-red-100 text-gray-700">{s.name}</td>
                            <td className="px-3 py-1.5 border border-red-100 text-center font-black text-red-600">{s.percentage.toFixed(1)}%</td>
                            <td className="px-3 py-1.5 border border-red-100 text-left text-[10px] font-bold text-red-700">{weakCOList || 'N/A'}</td>
                          </tr>
                        )
                      })}
                      {studentsNeedingImprovement.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center py-4 font-bold text-green-700 bg-green-50/50">
                            All students are successfully above the KPI threshold.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SECTION 13: KPI Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <h3 className="text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide">
                13. KPI Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center font-semibold">
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pass Threshold</p>
                  <p className="text-2xl font-black text-gray-800 mt-2">{targetPassMarks}%</p>
                </div>
                <div className="bg-green-50/30 border border-green-100 p-4 rounded-xl">
                  <p className="text-xs text-green-700 font-bold uppercase tracking-wider">CO KPI Target</p>
                  <p className="text-2xl font-black text-green-900 mt-2">{kpiCO}%</p>
                </div>
                <div className="bg-blue-50/30 border border-blue-100 p-4 rounded-xl">
                  <p className="text-xs text-blue-700 font-bold uppercase tracking-wider">PO KPI Target</p>
                  <p className="text-2xl font-black text-blue-900 mt-2">{kpiPO}%</p>
                </div>
              </div>
            </div>

            {/* SECTION 14: Automatic Observations */}
            <div className="bg-gradient-to-br from-white to-green-50/50 rounded-2xl shadow-lg p-6 border border-green-100">
              <h3 className="text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide">
                14. Automatic Observations (System Generated)
              </h3>
              <ul className="list-disc pl-5 space-y-2.5 text-sm font-semibold text-gray-700">
                <li>Overall cohort size is <strong className="text-green-800">{students.length} students</strong> with an average performance score of <strong className="text-green-800">{batchMetrics.averagePercentage?.toFixed(2)}%</strong>.</li>
                <li>The class-wide overall pass rate achieved is <strong className="text-green-800">{batchMetrics.passRate?.toFixed(2)}%</strong>.</li>
                <li>
                  A total of <strong className="text-green-800">{coAttainedCount} out of {activeCOs.length} Course Outcomes</strong> successfully met their class attainment target (KPI: {kpiCO}%).
                  {coAttainedCount < activeCOs.length && (
                    <span> outcomes needing review: <strong className="text-red-700">{activeCOs.filter(co => (calculations.coAttainment[co]?.kpiPercentage || 0) < kpiCO).join(', ')}</strong>.</span>
                  )}
                </li>
                <li>A total of <strong className="text-green-800">{poAttainedCount} out of {activePOs.length} Program Outcomes</strong> met the program mapping KPI threshold (KPI: {kpiPO}%).</li>
                <li>The highest marks percentage scored by a student is <strong className="text-green-800">{batchMetrics.highest?.percentage.toFixed(1)}%</strong>, whereas the lowest is <strong className="text-red-600">{batchMetrics.lowest?.percentage.toFixed(1)}%</strong>.</li>
              </ul>
            </div>

            {/* SECTION 15: Recommendations */}
            <div className="bg-gradient-to-br from-white to-green-50/50 rounded-2xl shadow-lg p-6 border border-green-100 page-break">
              <h3 className="text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide">
                15. Recommendations (System Generated)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-green-600 text-white uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3 border border-green-800 text-left font-bold">Deficit Outcome</th>
                      <th className="px-4 py-3 border border-green-800 text-center font-bold">Attainment</th>
                      <th className="px-4 py-3 border border-green-800 text-left font-bold">Pedagogical strategy</th>
                      <th className="px-4 py-3 border border-green-800 text-left font-bold">Syllabus reinforcement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCOs.map((coKey) => {
                      const attainmentVal = calculations.coAttainment[coKey]?.kpiPercentage || 0
                      if (attainmentVal >= kpiCO) return null

                      const rem = getCOPedagogicalRemediation(coKey)
                      return (
                        <tr key={coKey} className="hover:bg-red-50/20 border-b border-gray-200">
                          <td className="px-4 py-2.5 border border-gray-200 font-bold text-red-700 text-sm">{coKey}</td>
                          <td className="px-4 py-2.5 border border-gray-200 text-center font-black text-red-800 text-sm">{attainmentVal.toFixed(1)}%</td>
                          <td className="px-4 py-2.5 border border-gray-200 text-gray-700 font-semibold">{rem.strategy}</td>
                          <td className="px-4 py-2.5 border border-gray-200 text-gray-700 font-medium">{rem.advice}</td>
                        </tr>
                      )
                    })}
                    {activeCOs.every((coKey) => (calculations.coAttainment[coKey]?.kpiPercentage || 0) >= kpiCO) && (
                      <tr>
                        <td colSpan="4" className="text-center py-4 font-bold text-green-700 bg-green-50/50">
                          Class-wide KPI targets met for all Course Outcomes. No pedagogical remediation required.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 16: Teacher's Reflection */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <h3 className="text-lg font-black text-green-950 mb-3 uppercase tracking-wide">
                16. Teacher's Reflection (Editable before export)
              </h3>
              <div className="no-print">
                <textarea
                  className="w-full h-32 p-3 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 font-bold text-gray-700 placeholder-gray-400 bg-gray-50/30"
                  placeholder="Enter course reflections, pedagogical adjustments, and custom action plans for this batch here..."
                  value={teacherReflection}
                  onChange={(e) => setTeacherReflection(e.target.value)}
                />
              </div>
              {teacherReflection && (
                <div className="hidden print:block bg-green-50/50 border-l-4 border-green-800 p-4 rounded-r-xl mt-2">
                  <p className="text-[10px] font-black text-green-800 uppercase tracking-widest">Faculty Review comments & Remarks</p>
                  <p className="text-sm font-semibold text-gray-800 mt-1 italic whitespace-pre-wrap">{teacherReflection}</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 4: Compare Students */}
        {viewMode === 'compare' && (
          (() => {
            const getComparisonData = () => {
              if (selectedCompareStudents.length === 0) return []

              const comparisonData = Array.from({ length: 12 }, (_, i) => {
                const co = `CO${i + 1}`
                const dataPoint = { name: co }

                selectedCompareStudents.forEach((studentId) => {
                  const student = students.find((s) => s.id === studentId)
                  if (student) {
                    dataPoint[student.name] = calculations.studentCOs[studentId]?.[co] || 0
                  }
                })

                return dataPoint
              })

              return comparisonData
            }

            return (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100 no-print">
                  <label className="block text-sm font-semibold text-green-700 mb-2">
                    Select Students to Compare (Multiple Selection)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border-2 border-green-200 rounded-xl p-4 bg-white/50">
                    {students.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-2 p-2 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompareStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCompareStudents([...selectedCompareStudents, student.id])
                            } else {
                              setSelectedCompareStudents(selectedCompareStudents.filter((id) => id !== student.id))
                            }
                          }}
                          className="rounded text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700 font-medium">
                          {student.id} - {student.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedCompareStudents.length > 0 && (
                  <div className="space-y-6">
                    <div id="comparison-line-chart" className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
                          Student Comparison - Line Chart
                        </h2>
                        <button
                          onClick={() => downloadChartAsJPG('comparison-line-chart', 'Student_Comparison_Line')}
                          className="flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                          title="Download chart"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                      <div>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={getComparisonData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <defs>
                              {selectedCompareStudents.map((studentId, index) => {
                                const student = students.find((s) => s.id === studentId)
                                const color = COLORS[index % COLORS.length]
                                return (
                                  <linearGradient key={`lineGradient-${studentId}`} id={`lineGradient-${studentId}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                                    <stop offset="100%" stopColor={color} stopOpacity={1} />
                                  </linearGradient>
                                )
                              })}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                              axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                              tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                              axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                              label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold' } }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '2px solid #1a5f3f',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                              }}
                              formatter={(value) => `${parseFloat(value).toFixed(1)}%`}
                            />
                            <Legend
                              wrapperStyle={{ paddingTop: '20px' }}
                            />
                            {selectedCompareStudents.map((studentId, index) => {
                              const student = students.find((s) => s.id === studentId)
                              return (
                                <Line
                                  key={studentId}
                                  type="monotone"
                                  dataKey={student.name}
                                  stroke={COLORS[index % COLORS.length]}
                                  strokeWidth={3}
                                  dot={{ fill: COLORS[index % COLORS.length], r: 5, strokeWidth: 2, stroke: '#fff' }}
                                  activeDot={{ r: 7 }}
                                />
                              )
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div id="comparison-area-chart" className="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-blue-100">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                          Student Comparison - Area Chart
                        </h2>
                        <button
                          onClick={() => downloadChartAsJPG('comparison-area-chart', 'Student_Comparison_Area')}
                          className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                          title="Download chart"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                      <div>
                        <ResponsiveContainer width="100%" height={400}>
                          <AreaChart data={getComparisonData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <defs>
                              {selectedCompareStudents.map((studentId, index) => {
                                const color = COLORS[index % COLORS.length]
                                return (
                                  <linearGradient key={`areaGradient-${studentId}`} id={`areaGradient-${studentId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                                  </linearGradient>
                                )
                              })}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                              axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                            />
                            <YAxis
                              domain={[0, 100]}
                              ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                              tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                              axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                              label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold' } }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '2px solid #1a5f3f',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                              }}
                              formatter={(value) => `${parseFloat(value).toFixed(1)}%`}
                            />
                            <Legend
                              wrapperStyle={{ paddingTop: '20px' }}
                            />
                            {selectedCompareStudents.map((studentId, index) => {
                              const student = students.find((s) => s.id === studentId)
                              return (
                                <Area
                                  key={studentId}
                                  type="monotone"
                                  dataKey={student.name}
                                  stroke={COLORS[index % COLORS.length]}
                                  strokeWidth={2}
                                  fill={`url(#areaGradient-${studentId})`}
                                  fillOpacity={0.6}
                                />
                              )
                            })}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()
        )}

        {/* VIEW 5: Mapping Details Tab */}
        {viewMode === 'allDetails' && (
          <div className="space-y-6">

            {/* Mapping row */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
              <div className="lg:col-span-4 bg-white rounded-2xl shadow-xl p-6 border border-green-100">
                <h2 className="text-xl font-bold bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                  Marks Allocations for COs
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                        <th className="px-4 py-3 text-center font-bold border border-green-800">CO</th>
                        <th className="px-4 py-3 text-center font-bold border border-green-800">Total Allocated Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCOs.map((co) => (
                        <tr key={co} className="hover:bg-green-50/50">
                          <td className="px-4 py-2.5 text-sm font-bold text-gray-800 border border-gray-200 text-center bg-white">{co}</td>
                          <td className="px-4 py-2.5 text-sm text-center text-gray-700 border border-gray-200 bg-white font-bold">{coMarkAllocations[co] || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white rounded-2xl shadow-xl p-6 border border-purple-100">
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent uppercase tracking-wider mb-4">
                  COs to POs Mapping Matrix
                </h2>
                <div className="overflow-x-auto">
                  <table className="border-collapse mx-auto text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                        <th className="px-3 py-3 text-center font-bold border border-purple-800">CO</th>
                        {activePOs.map((po) => (
                          <th key={po} className="px-2 py-3 text-center font-bold border border-purple-800">{po}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeCOs.map((co) => (
                        <tr key={co} className="hover:bg-purple-50/40">
                          <td className="px-3 py-2.5 font-bold text-gray-800 border border-gray-300 text-center bg-white">{co}</td>
                          {activePOs.map((po) => {
                            const isMapped = coMapping?.[co]?.[po] === 1 || coMapping?.[co]?.[po] === '1'
                            return (
                              <td
                                key={po}
                                className={`px-2 py-2.5 text-center border border-gray-300 font-black ${isMapped ? 'bg-green-200 text-green-900' : 'bg-gray-50 text-gray-400'
                                  }`}
                              >
                                {isMapped ? '✓' : '-'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Questions to COs mapping list */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100">
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-800 to-blue-700 bg-clip-text text-transparent uppercase tracking-wider mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-indigo-700" />
                Questions to COs Mapping Allocation
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white text-xs font-bold uppercase">
                      <th className="px-6 py-3 text-left border-b border-indigo-800">Assessment Component</th>
                      <th className="px-6 py-3 text-center border-b border-indigo-800">Mapped Outcome (CO)</th>
                      <th className="px-6 py-3 text-center border-b border-indigo-800">Max Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const categories = [
                        { id: 'cts', label: 'Class Tests (CT)', items: assessments.cts || [], color: 'bg-indigo-50 text-indigo-800 font-bold' },
                        { id: 'midTerm', label: 'Mid Term Exam', items: assessments.midTerm || [], color: 'bg-blue-50 text-blue-800 font-bold' },
                        { id: 'final', label: 'Term Final Exam', items: assessments.final || [], color: 'bg-cyan-50 text-cyan-800 font-bold' },
                        { id: 'assignments', label: 'Assignments', items: assessments.assignments || [], color: 'bg-emerald-50 text-emerald-800 font-bold' },
                        { id: 'others', label: 'Other Evaluations', items: [] },
                      ]

                      if (assessments.presentation) categories[4].items.push({ ...assessments.presentation, name: 'Presentation' })
                      if (assessments.attendance) categories[4].items.push({ ...assessments.attendance, name: 'Attendance' })
                      if (assessments.performance) categories[4].items.push({ ...assessments.performance, name: 'Performance' })

                      return categories.map((cat) => {
                        if (cat.items.length === 0) return null
                        return (
                          <React.Fragment key={cat.id}>
                            <tr className={cat.color}>
                              <td colSpan={3} className="px-6 py-2 text-sm border-b border-indigo-100">{cat.label}</td>
                            </tr>
                            {cat.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-indigo-50/20 border-b border-indigo-50">
                                <td className="px-10 py-2.5 text-sm text-gray-700 font-semibold">{item.name}</td>
                                <td className="px-6 py-2.5 text-center text-sm"><span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">{item.co || 'N/A'}</span></td>
                                <td className="px-6 py-2.5 text-center text-sm font-bold text-gray-600">{item.maxMarks}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const SemiCircleGauge = ({ value }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[260px] relative">
      <svg width="240" height="130" viewBox="0 0 240 120" className="overflow-visible">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        {/* Background Track */}
        <path
          d="M20 120 A 100 100 0 0 1 220 120"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* Colored Gradient Track */}
        <path
          d="M20 120 A 100 100 0 0 1 220 120"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray="314.16"
          strokeDashoffset={314.16 - (314.16 * (value / 100))}
        />
        {/* Needle */}
        <g transform="translate(120, 120)">
          <line
            x1="0"
            y1="0"
            x2="-80"
            y2="0"
            stroke="#1f2937"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${value * 1.8})`}
          />
          <circle cx="0" cy="0" r="8" fill="#1f2937" />
        </g>
      </svg>
      <div className="text-center mt-4">
        <span className="text-3xl font-black text-gray-800">{value.toFixed(1)}%</span>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Overall Batch Performance</p>
      </div>
    </div>
  )
}

// Cover Page Component for HTML/Word exports and screen layouts
const ReportCoverPage = ({ title, courseInfo, targetPassMarks, kpiCO, kpiPO, student = null }) => {
  return (
    <div className="bg-white border-[6px] border-double border-green-800 p-8 rounded-2xl shadow-xl text-center space-y-6 max-w-4xl mx-auto my-8 print:my-0 print:border-green-800">
      <div className="space-y-1">
        <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-green-950 tracking-wider break-words uppercase">
          Bangladesh Army International University of Science & Technology
        </h2>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Department of Computer Science and Engineering
        </p>
      </div>

      <div className="w-20 h-1 bg-yellow-500 mx-auto my-3"></div>

      <div className="space-y-2">
        <h1 className="text-3.5xl font-black text-green-900 uppercase leading-snug break-words">
          {title}
        </h1>
        <p className="text-sm font-bold text-gray-600">
          Outcome Based Education (OBE) Assessment Report
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto border-t border-b border-green-800 py-5 text-left font-medium text-gray-700 bg-green-50/10 px-6 rounded-xl">
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Course Code</p>
          <p className="text-green-900 break-words text-xs sm:text-sm md:text-base font-bold">{courseInfo.courseCode || 'N/A'}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Course Title</p>
          <p className="text-green-900 break-words whitespace-normal text-xs sm:text-sm md:text-base font-bold" title={courseInfo.courseTitle}>{courseInfo.courseTitle || 'N/A'}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Batch & Section</p>
          <p className="text-gray-800 break-words text-xs sm:text-sm md:text-base font-bold">
            {courseInfo.batchName || 'N/A'} {courseInfo.sectionName ? `(Sec: ${courseInfo.sectionName})` : ''}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Academic Session</p>
          <p className="text-gray-800 break-words text-xs sm:text-sm md:text-base font-bold">
            {courseInfo.semesterName && courseInfo.academicYear && courseInfo.semesterName.includes(String(courseInfo.academicYear))
              ? courseInfo.semesterName
              : `${courseInfo.semesterName || 'N/A'}${courseInfo.academicYear ? ` (${courseInfo.academicYear})` : ''}`}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Course Instructor</p>
          <p className="text-gray-800 break-words text-xs sm:text-sm md:text-base font-bold">{courseInfo.teacherName || 'N/A'}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Generation Date</p>
          <p className="text-gray-800 break-words text-xs sm:text-sm md:text-base font-bold">{new Date().toLocaleDateString()}</p>
        </div>
        {student && (
          <div className="col-span-2 border-t border-green-200 pt-3 mt-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Student Profile</p>
            <p className="text-green-900 break-words text-xs sm:text-sm md:text-base font-black">
              {student.name} ({student.id})
            </p>
          </div>
        )}
      </div>

      <div className="pt-2 text-[10px] text-gray-500 font-bold space-x-4">
        <span>Target Pass Marks: <strong>{targetPassMarks}%</strong></span>
        <span>CO KPI Target: <strong>{kpiCO}%</strong></span>
        <span>PO KPI Target: <strong>{kpiPO}%</strong></span>
      </div>
    </div>
  )
}

export default ComprehensiveReports
