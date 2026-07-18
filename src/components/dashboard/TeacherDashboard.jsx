import { useState, useEffect, useMemo } from 'react'
import { apiService } from '../../services/apiService'
import {
  BookOpen,
  Users,
  ClipboardList,
  FolderOpen,
  CheckSquare,
  Network,
  Award,
  BarChart3,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
  Save,
  Loader2,
  Copy,
  Eye,
  FileDown,
  Printer,
  Download,
  AlertCircle,
  MessageSquare,
  Calendar
} from 'lucide-react'
import QuestionPaperEditor from '../marks/QuestionPaperEditor'
import ComprehensiveReports from '../reports/ComprehensiveReports'
import CourseSurvey from '../survey/CourseSurvey'

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

const PO_COLORS = {
  PO1: 'bg-orange-200',
  PO2: 'bg-purple-200',
  PO3: 'bg-green-700',
  PO4: 'bg-orange-300',
  PO5: 'bg-purple-700',
  PO6: 'bg-blue-700',
  PO7: 'bg-green-300',
  PO8: 'bg-red-200',
  PO9: 'bg-teal-200',
  PO10: 'bg-orange-500',
  PO11: 'bg-blue-200',
  PO12: 'bg-purple-800',
}

const PO_TEXT_COLORS = {
  PO1: 'text-gray-800',
  PO2: 'text-gray-800',
  PO3: 'text-white',
  PO4: 'text-gray-800',
  PO5: 'text-white',
  PO6: 'text-white',
  PO7: 'text-gray-800',
  PO8: 'text-gray-800',
  PO9: 'text-gray-800',
  PO10: 'text-white',
  PO11: 'text-gray-800',
  PO12: 'text-white',
}

const getQBankGroupName = (paper) => {
  const name = paper?.assessment?.name || ''
  if (/^ct[- ]?\d+/i.test(name) || name.toLowerCase() === 'cts' || paper?.assessment?.type === 'cts') {
    return 'CTs'
  }
  return name
}

const getQBankSessionName = (paper) => {
  const sem = paper?.courseOffering?.semester
  if (!sem) return ''
  const name = sem.semesterName || ''
  const year = sem.academicYear || paper.courseOffering?.academicYear || ''
  if (year && !name.includes(String(year))) {
    return `${name} ${year}`
  }
  return name
}

export default function TeacherDashboard({ offering: propOffering, onBackToDashboard, user }) {
  const [offering, setOffering] = useState(propOffering)

  useEffect(() => {
    setOffering(propOffering)
  }, [propOffering])

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("teacherActiveTab") || "overview";
  });

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem("teacherActiveTab", activeTab);
    }
  }, [activeTab]);
  const [students, setStudents] = useState([])
  const [assessments, setAssessments] = useState([])
  const [qBankPapers, setQBankPapers] = useState([])

  // Marks Entry Spreadsheet States
  const [marksSpreadsheetData, setMarksSpreadsheetData] = useState({
    students: [],
    assessments: [],
    metadata: {},
    marks: {}
  })
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [tempMarks, setTempMarks] = useState({}) // studentId -> questionNumber -> mark

  // CO-PO Mapping States
  const [coMapping, setCoMapping] = useState({})
  const [dbCourseOutcomes, setDbCourseOutcomes] = useState([])
  const [dbProgramOutcomes, setDbProgramOutcomes] = useState([])
 
  // Attainment States
  const [attainmentData, setAttainmentData] = useState({
    coAttainments: [],
    poAttainments: [],
    kpiConfig: { targetPassMarks: 40, kpiCO: 50, kpiPO: 50 }
  })
  const [kpiInput, setKpiInput] = useState({ targetPassMarks: 40, kpiCO: 50, kpiPO: 50 })
 
  // Question Paper Editor State
  const [activeAssessmentForPaper, setActiveAssessmentForPaper] = useState(null)

  // Question Bank Drill-down Path State
  const [qBankPath, setQBankPath] = useState({ type: null, session: null, section: null })

  // Modals & UI States
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreviewPaper, setShowPreviewPaper] = useState(null) // holds paper doc
  const [newAssessment, setNewAssessment] = useState({
    type: 'cts',
    maxMarks: 10,
    numQuestions: 1,
    examDuration: '1 Hour',
    co: 'CO1'
  })

  // Recent activity logs
  const [activities, setActivities] = useState([])
  const [activityFilter, setActivityFilter] = useState('today')
  const [expandedActivities, setExpandedActivities] = useState({})

  const filteredActivities = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    return activities.filter(act => {
      if (activityFilter === 'all') return true
      if (!act.createdAt) return true
      const actDate = new Date(act.createdAt)
      const actDateStart = new Date(actDate)
      actDateStart.setHours(0, 0, 0, 0)

      const diffTime = todayStart - actDateStart
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

      if (activityFilter === 'today') {
        return diffDays === 0
      }
      if (activityFilter === 'yesterday') {
        return diffDays === 1 || diffDays === 2
      }
      if (activityFilter === '1week') {
        return diffDays >= 3 && diffDays <= 9
      }
      if (activityFilter === '15days') {
        return diffDays >= 10 && diffDays <= 24
      }
      if (activityFilter === '1month') {
        return diffDays >= 25 && diffDays <= 54
      }
      if (activityFilter === 'older') {
        return diffDays >= 55
      }
      return true
    })
  }, [activities, activityFilter])

  const groupedActivities = useMemo(() => {
    const groups = {}
    filteredActivities.forEach(act => {
      const action = (act.action || '').trim().toLowerCase()
      let label = 'Activity'
      if (action.includes('survey')) label = 'Survey'
      else if (action.includes('marks')) label = 'Marks'
      else if (action.includes('assessment')) label = 'Assessment'
      else if (action.includes('paper') || action.includes('question')) label = 'Paper'
      else if (action.includes('mapping') || action.includes('kpi')) label = 'Config'

      if (!groups[label]) {
        groups[label] = {
          category: label,
          items: []
        }
      }
      groups[label].items.push(act)
    })
    return Object.values(groups)
  }, [filteredActivities])

  useEffect(() => {
    setQBankPath({ type: null, session: null, section: null })
    loadAllData()
  }, [propOffering])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // 0. Fetch latest offering details
      const offeringRes = await apiService.getCourseOffering(propOffering._id)
      const currentOffering = offeringRes.offering || propOffering
      setOffering(currentOffering)

      // 1. Fetch Students
      const studentRes = await apiService.getTeacherStudents(currentOffering._id)
      setStudents(studentRes.students || [])

      // 2. Fetch Assessments
      const assessmentsRes = await apiService.getAssessments(currentOffering._id)
      // Resolve structured assessments from general array (filter out any that do not have an _id)
      const flatAssessments = [
        ...(assessmentsRes.assessments?.cts || []),
        ...(assessmentsRes.assessments?.midTerm || []),
        ...(assessmentsRes.assessments?.final || []),
        ...(assessmentsRes.assessments?.assignments || []),
      ].filter(a => a && a._id)

      if (assessmentsRes.assessments?.attendance && assessmentsRes.assessments.attendance._id) {
        flatAssessments.push(assessmentsRes.assessments.attendance)
      }
      if (assessmentsRes.assessments?.performance && assessmentsRes.assessments.performance._id) {
        flatAssessments.push(assessmentsRes.assessments.performance)
      }
      if (assessmentsRes.assessments?.presentation && assessmentsRes.assessments.presentation._id) {
        flatAssessments.push(assessmentsRes.assessments.presentation)
      }

      setAssessments(flatAssessments)

      // 3. Fetch CO-PO Mapping from Course Master Mapping (Read-Only)
      const rawMapping = currentOffering.course?.coPoMapping || {}
      const normalizedCoMapping = {}
      Object.keys(rawMapping).forEach(coKey => {
        const normCo = coKey.replace(/\s+/g, '').toUpperCase()
        normalizedCoMapping[normCo] = {}
        if (rawMapping[coKey] && typeof rawMapping[coKey] === 'object') {
          Object.keys(rawMapping[coKey]).forEach(poKey => {
            const normPo = poKey.replace(/\s+/g, '').toUpperCase()
            normalizedCoMapping[normCo][normPo] = rawMapping[coKey][poKey]
          })
        }
      })
      setCoMapping(normalizedCoMapping)

      // 4. Fetch Attainment Data
      const attainmentRes = await apiService.getAttainmentData(offering._id)
      setAttainmentData(attainmentRes)
      setKpiInput(attainmentRes.kpiConfig)

      // 5. Fetch Question Bank (Filtered by current Course ID)
      const qBankRes = await apiService.getQuestionBank(offering.course?._id)
      setQBankPapers(qBankRes.papers || [])
 
      // 6. Fetch database CO-PO descriptions
      try {
        const coRes = await apiService.getCourseOutcomes(offering.course?._id)
        setDbCourseOutcomes(coRes.outcomes || coRes || [])
      } catch (err) {
        console.error('Failed to load course outcomes from database:', err)
      }
 
      try {
        const poRes = await apiService.getProgramOutcomes()
        setDbProgramOutcomes(poRes.programOutcomes || poRes || [])
      } catch (err) {
        console.error('Failed to load program outcomes from database:', err)
      }
 
      // 7. Fetch recent activities from database
      try {
        const actRes = await apiService.getRecentActivities(offering._id)
        if (actRes && actRes.activities) {
          const formattedActs = actRes.activities.map(act => {
            const diffMs = Date.now() - new Date(act.createdAt).getTime()
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMins / 60)
            const diffDays = Math.floor(diffHours / 24)

            let relativeTime = 'Just now'
            if (diffDays > 0) {
              relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
            } else if (diffHours > 0) {
              relativeTime = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
            } else if (diffMins > 0) {
              relativeTime = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
            }

            return {
              id: act._id,
              msg: act.description,
              time: relativeTime,
              createdAt: act.createdAt,
              action: act.action
            }
          })
          setActivities(formattedActs)
        } else {
          setActivities([])
        }
      } catch (err) {
        console.error('Failed to load recent activities from database:', err)
        setActivities([
          { id: 1, msg: `Course Dashboard opened for ${offering.course?.courseCode}`, time: 'Just now' }
        ])
      }

    } catch (err) {
      console.error(err)
      alert('Error loading dashboard data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetActivities = async () => {
    if (!window.confirm('Are you sure you want to clear all recent activity logs for this course? This action cannot be undone.')) {
      return
    }
    try {
      await apiService.resetRecentActivities(offering._id)
      setActivities([])
    } catch (err) {
      console.error(err)
      alert('Failed to reset course activity logs: ' + err.message)
    }
  }

  // Load spreadsheet marks data when Marks Entry, Reports, or Students tab is opened
  useEffect(() => {
    if (activeTab === 'marksEntry' || activeTab === 'reports' || activeTab === 'students') {
      loadMarksSpreadsheet()
    }
  }, [activeTab])

  const loadMarksSpreadsheet = async () => {
    try {
      const res = await apiService.getMarksSpreadsheet(offering._id)
      setMarksSpreadsheetData(res)
      if (res.assessments && res.assessments.length > 0) {
        // Default to first assessment if not selected
        const defaultId = selectedAssessmentId || res.assessments[0]._id
        setSelectedAssessmentId(defaultId)
        initializeTempMarks(res.marks, defaultId, res.metadata[defaultId], res.students)
      }
    } catch (err) {
      alert('Failed to load marks spreadsheet: ' + err.message)
    }
  }

  const initializeTempMarks = (marksMap, assessmentId, questions = [], studentsList = []) => {
    const temp = {}
    studentsList.forEach(s => {
      const sId = s._id
      temp[sId] = {}
      const existing = marksMap[sId]?.[assessmentId]

      if (questions && questions.length > 0) {
        questions.forEach(q => {
          temp[sId][q.questionNumber] = existing?.questionMarks?.[q.questionNumber] ?? ''
        })
      } else {
        temp[sId]['marks'] = existing?.totalMark ?? ''
      }
    })
    setTempMarks(temp)
  }

  const handleAssessmentChange = (id) => {
    setSelectedAssessmentId(id)
    initializeTempMarks(
      marksSpreadsheetData.marks,
      id,
      marksSpreadsheetData.metadata[id],
      marksSpreadsheetData.students
    )
  }

  const handleSpreadsheetMarkChange = (studentId, key, val, maxVal) => {
    if (val !== '' && (isNaN(val) || parseFloat(val) < 0 || parseFloat(val) > maxVal)) {
      return // invalid
    }
    setTempMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [key]: val
      }
    }))
  }

  const saveSpreadsheetMarks = async () => {
    setSaving(true)
    try {
      const questions = marksSpreadsheetData.metadata[selectedAssessmentId] || []
      const payload = marksSpreadsheetData.students.map(s => {
        const sId = s._id
        const studentTemp = tempMarks[sId] || {}

        let totalMark = 0
        const questionMarks = {}

        if (questions && questions.length > 0) {
          questions.forEach(q => {
            const markVal = parseFloat(studentTemp[q.questionNumber]) || 0
            questionMarks[q.questionNumber] = markVal
            totalMark += markVal
          })
        } else {
          totalMark = parseFloat(studentTemp['marks']) || 0
        }

        return {
          studentId: sId,
          questionMarks,
          totalMark
        }
      })

      await apiService.saveMarksSpreadsheet(offering._id, {
        assessmentId: selectedAssessmentId,
        marks: payload
      })

      alert('Marks saved and attainments calculated successfully!')
      loadAllData() // refresh assessments & attainment tables
      loadMarksSpreadsheet() // refresh database marks
    } catch (err) {
      alert('Failed to save marks: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Create assessment
  const handleCreateAssessment = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await apiService.createAssessment(offering._id, newAssessment)
      alert('Assessment created successfully.')
      setShowCreateDialog(false)
      loadAllData()
    } catch (err) {
      alert('Failed to create assessment: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Delete assessment
  const handleDeleteAssessment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assessment? All associated question papers, metadata, and student marks will be lost.')) {
      return
    }
    try {
      await apiService.deleteAssessment(id)
      alert('Assessment deleted successfully.')
      loadAllData()
    } catch (err) {
      alert('Failed to delete assessment: ' + err.message)
    }
  }

  // Save modified KPI configuration
  const saveKpiConfig = async () => {
    setSaving(true)
    try {
      await apiService.updateKpiConfig(offering._id, kpiInput)
      alert('KPI Thresholds updated successfully!')
      loadAllData()
    } catch (err) {
      alert('Failed to update KPIs: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Duplicate paper from bank
  const handleDuplicatePaper = async (paperId) => {
    try {
      await apiService.duplicateQuestionPaper(paperId, offering._id)
      alert('Question paper duplicated into your current offering successfully! Check the Assessments tab.')
      loadAllData()
    } catch (err) {
      alert('Failed to duplicate paper: ' + err.message)
    }
  }

  // Client-side export to Word
  const exportToWord = (htmlContent, fileName = 'question_paper.doc') => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><title>Question Paper</title><style>" +
      "body { font-family: 'Times New Roman', Times, serif; padding: 20px; }" +
      "table { border-collapse: collapse; width: 100%; }" +
      "th, td { border: 1px solid black; padding: 8px; text-align: left; }" +
      "</style></head><body>"
    const footer = "</body></html>"
    const sourceHTML = header + htmlContent + footer

    const blob = new Blob(['\ufeff' + sourceHTML], {
      type: 'application/msword'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Client side export to PDF / Print
  const handlePrint = (htmlContent) => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Question Paper</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.6; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            .header-table { border: none !important; margin-bottom: 20px; }
            .header-table td { border: none !important; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // If question paper editor is open, render it instead of the dashboard
  if (activeAssessmentForPaper) {
    return (
      <QuestionPaperEditor
        assessment={activeAssessmentForPaper}
        offering={offering}
        onBack={() => {
          setActiveAssessmentForPaper(null)
          loadAllData()
        }}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Course Header */}
      <div className="no-print bg-gradient-to-br from-white via-green-50/20 to-blue-50/20 rounded-2xl shadow-xl p-6 border border-green-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="p-2 hover:bg-green-50 rounded-lg text-green-700 transition-colors border border-green-100"
              title="Back to Offerings"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-2xl font-extrabold text-gray-800">
              {offering.course?.courseCode} — {offering.course?.courseName}
            </h1>
          </div>
          <p className="text-gray-500 font-semibold pl-9">
            Batch {offering.batch?.name || 'N/A'} • Section {offering.section} • {offering.semester?.semesterName} ({offering.academicYear})
          </p>
        </div>
        <div className="flex items-center gap-2 pl-9 md:pl-0">
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-3 py-1.5 rounded-lg font-bold">
            {offering.course?.creditHours} Credits
          </span>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1.5 rounded-lg font-bold">
            {students.length} Students
          </span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="no-print bg-white rounded-xl shadow-md border border-gray-150 p-2 flex flex-wrap gap-1">
        {[
          { id: 'overview', label: 'Course Overview', icon: BookOpen },
          { id: 'coMapping', label: 'CO-PO Mapping', icon: Network },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'assessments', label: 'Assessments', icon: ClipboardList },
          { id: 'questionBank', label: 'Question Bank', icon: FolderOpen },
          { id: 'marksEntry', label: 'Marks Entry', icon: CheckSquare },
          { id: 'attainment', label: 'Attainment', icon: Award },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
          { id: 'evaluation', label: 'Course Survey', icon: MessageSquare },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${isActive
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-md border p-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-green-700" size={36} />
          <p className="text-gray-500 font-semibold">Loading tab content...</p>
        </div>
      ) : (
        <div className="transition-all duration-300">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Course Info Cards */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
                  <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3">Course Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 font-semibold">Course Code</p>
                      <p className="text-gray-800 font-bold">{offering.course?.courseCode}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Course Name</p>
                      <p className="text-gray-800 font-bold">{offering.course?.courseName}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Credit Hours</p>
                      <p className="text-gray-800 font-bold">{offering.course?.creditHours} Credits</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Department</p>
                      <p className="text-gray-800 font-bold">{offering.course?.department}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Assigned Teacher</p>
                      <p className="text-gray-800 font-bold">{offering.teacher?.fullName || 'Not Assigned'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Academic Session</p>
                      <p className="text-gray-800 font-bold">{offering.semester?.semesterName} ({offering.academicYear})</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
                  <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3">Assessment Summary</h3>
                  {assessments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No assessments configured yet. Create one in the Assessments tab.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-b text-gray-400 font-semibold">
                            <th className="py-2">Assessment Name</th>
                            <th className="py-2">Type</th>
                            <th className="py-2">Max Marks</th>
                            <th className="py-2">Questions</th>
                            <th className="py-2">Duration</th>
                            <th className="py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-gray-700 font-medium">
                          {assessments.map(a => (
                            <tr key={a._id}>
                              <td className="py-3 font-bold text-gray-800">{a.name}</td>
                              <td className="py-3 capitalize">{a.type}</td>
                              <td className="py-3">{a.maxMarks}</td>
                              <td className="py-3">{a.numQuestions || 0}</td>
                              <td className="py-3">{a.examDuration || 'N/A'}</td>
                              <td className="py-3">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${a.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {a.status || 'Draft'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right panel: Recent Activities */}
              <div className="lg:col-span-1 relative min-h-[385px] lg:min-h-0">
                <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 lg:absolute lg:inset-0 flex flex-col lg:h-auto h-full gap-4">
                  {(() => {
                    const getActivityIconAndColor = (actionType) => {
                      const action = (actionType || '').trim().toLowerCase()
                      if (action.includes('survey')) {
                        return { bg: 'bg-emerald-50 border-emerald-250 text-emerald-700', label: 'Survey' }
                      }
                      if (action.includes('marks')) {
                        return { bg: 'bg-teal-50 border-teal-250 text-teal-700', label: 'Marks' }
                      }
                      if (action.includes('assessment')) {
                        return { bg: 'bg-blue-50 border-blue-250 text-blue-700', label: 'Assessment' }
                      }
                      if (action.includes('paper') || action.includes('question')) {
                        return { bg: 'bg-indigo-50 border-indigo-250 text-indigo-700', label: 'Paper' }
                      }
                      if (action.includes('mapping') || action.includes('kpi')) {
                        return { bg: 'bg-amber-50 border-amber-250 text-amber-700', label: 'Config' }
                      }
                      return { bg: 'bg-gray-50 border-gray-250 text-gray-600', label: 'Activity' }
                    }

                    return (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-2">
                          <h3 className="text-base font-extrabold text-gray-800">Recent Activities</h3>
                          <select
                            value={activityFilter}
                            onChange={(e) => setActivityFilter(e.target.value)}
                            className="text-[11px] bg-gray-50 border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold select-none cursor-pointer"
                          >
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday (Day 1 - 2)</option>
                            <option value="1week">1 Week (Day 3 - 9)</option>
                            <option value="15days">15 Days (Day 10 - 24)</option>
                            <option value="1month">1 Month (Day 25 - 54)</option>
                            <option value="older">Older (Day 55+)</option>
                            <option value="all">All</option>
                          </select>
                        </div>

                        <div 
                          className="overflow-y-auto pr-1 space-y-4 flex-1 lg:max-h-none max-h-[385px]" 
                          style={{ 
                            scrollbarWidth: 'thin', 
                            scrollbarColor: '#10b981 transparent' 
                          }}
                        >
                          {groupedActivities.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-xs text-gray-400 italic">No recent activities found.</p>
                            </div>
                          ) : (
                            <div className="space-y-4 pt-1">
                              {groupedActivities.map((group) => {
                                const isExpanded = expandedActivities[group.category] !== false
                                const badge = getActivityIconAndColor(group.category)

                                return (
                                  <div key={group.category} className="space-y-2">
                                    {/* Category header (Clickable to toggle) */}
                                    <div 
                                      onClick={() => setExpandedActivities(prev => ({ ...prev, [group.category]: !isExpanded }))}
                                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-xl border border-gray-150 transition-colors select-none"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-extrabold border shadow-sm ${badge.bg}`}>
                                          {badge.label[0]}
                                        </span>
                                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                          {group.category} Modules
                                        </span>
                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.25 rounded-md font-extrabold">
                                          {group.items.length}
                                        </span>
                                      </div>
                                      <div>
                                        <ChevronRight 
                                          size={14} 
                                          className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-95' : ''}`} 
                                        />
                                      </div>
                                    </div>

                                    {/* Sub-Timeline of Module activities */}
                                    {isExpanded && (
                                      <div className="relative border-l border-dotted border-gray-300 ml-[23px] pl-4 mt-2 mb-3 space-y-4">
                                        {group.items.map((act) => (
                                          <div key={act.id} className="relative select-none text-[11px] leading-relaxed">
                                            {/* Sub timeline bullet dot */}
                                            <span className="absolute -left-[19px] top-[5px] h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            
                                            <div className="text-gray-700 font-medium break-words">
                                              {act.msg}
                                            </div>
                                            
                                            <div className="text-[9px] text-gray-400 mt-0.5 font-semibold flex items-center gap-1">
                                              <Calendar size={8} className="text-gray-300" />
                                              <span>{act.time}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Reset button at the bottom */}
                        <div className="pt-3 border-t border-gray-100 flex justify-end">
                          <button
                            onClick={handleResetActivities}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-red-55 transition-colors cursor-pointer select-none"
                          >
                            <Trash2 size={11} />
                            Reset Course Activities
                          </button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              {(() => {
                // Grade helper
                const getGradeAndGP = (percentage) => {
                  if (percentage >= 80) return { grade: 'A+', gp: 4.00 }
                  if (percentage >= 75) return { grade: 'A', gp: 3.75 }
                  if (percentage >= 70) return { grade: 'A-', gp: 3.50 }
                  if (percentage >= 65) return { grade: 'B+', gp: 3.25 }
                  if (percentage >= 60) return { grade: 'B', gp: 3.00 }
                  if (percentage >= 55) return { grade: 'B-', gp: 2.75 }
                  if (percentage >= 50) return { grade: 'C+', gp: 2.50 }
                  if (percentage >= 45) return { grade: 'C', gp: 2.25 }
                  if (percentage >= 40) return { grade: 'D', gp: 2.00 }
                  return { grade: 'F', gp: 0.00 }
                }

                // Build structured assessments
                const cts = assessments.filter(a => a.type === 'cts')
                const midTerm = assessments.filter(a => a.type === 'midTerm')
                const finals = assessments.filter(a => a.type === 'final')
                const assigns = assessments.filter(a => a.type === 'assignments')
                const attendance = assessments.find(a => a.type === 'attendance')
                const performance = assessments.find(a => a.type === 'performance')
                const presentation = assessments.find(a => a.type === 'presentation')

                // Flattened assessment list (matching ComprehensiveReports order)
                const allAsmts = []
                cts.forEach(a => allAsmts.push({ ...a, type: 'cts' }))
                if (presentation) allAsmts.push({ ...presentation, name: 'Presentation', type: 'presentation' })
                assigns.forEach(a => allAsmts.push({ ...a, type: 'assignments' }))
                if (attendance) allAsmts.push({ ...attendance, name: 'Attendance', type: 'attendance' })
                if (performance) allAsmts.push({ ...performance, name: 'Performance', type: 'performance' })
                midTerm.forEach(a => allAsmts.push({ ...a, type: 'midTerm' }))
                finals.forEach(a => allAsmts.push({ ...a, type: 'final' }))

                if (students.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 text-center py-12 text-gray-500 font-semibold">
                      No students currently enrolled in this course offering.
                    </div>
                  )
                }

                const meta = marksSpreadsheetData.metadata || {}
                const mks = marksSpreadsheetData.marks || {}

                // Build marksheet columns
                const cols = []
                // CTs
                allAsmts.filter(a => a.type === 'cts').forEach(a => {
                  cols.push({ id: a._id?.toString() || `cts_${a.name}`, name: a.name, parent: 'CT', assessment: a, isQuestion: false, co: a.co, maxMarks: parseFloat(a.maxMarks) || 0 })
                })
                // Others
                allAsmts.filter(a => ['assignments', 'presentation', 'attendance', 'performance'].includes(a.type)).forEach(a => {
                  cols.push({ id: a._id?.toString() || `${a.type}_${a.name}`, name: a.name === 'Presentation' ? 'Present.' : a.name === 'Assignment' ? 'Assign.' : a.name, parent: 'Others', assessment: a, isQuestion: false, co: a.co, maxMarks: parseFloat(a.maxMarks) || 0 })
                })
                // Mid Term
                allAsmts.filter(a => a.type === 'midTerm').forEach(a => {
                  const questions = meta[a._id?.toString()]
                  if (questions && questions.length > 0) {
                    questions.forEach(q => { cols.push({ id: `${a._id}_q_${q.questionNumber}`, name: `Q${q.questionNumber}`, parent: 'Mid Term', assessment: a, isQuestion: true, questionNumber: q.questionNumber, co: q.co, maxMarks: parseFloat(q.maxMarks) || 0 }) })
                  } else {
                    cols.push({ id: a._id?.toString() || `mid_${a.name}`, name: a.name, parent: 'Mid Term', assessment: a, isQuestion: false, co: a.co, maxMarks: parseFloat(a.maxMarks) || 0 })
                  }
                })
                // Term Final
                allAsmts.filter(a => a.type === 'final').forEach(a => {
                  const questions = meta[a._id?.toString()]
                  if (questions && questions.length > 0) {
                    questions.forEach(q => { cols.push({ id: `${a._id}_q_${q.questionNumber}`, name: `Q${q.questionNumber}`, parent: 'Term Final', assessment: a, isQuestion: true, questionNumber: q.questionNumber, co: q.co, maxMarks: parseFloat(q.maxMarks) || 0 }) })
                  } else {
                    cols.push({ id: a._id?.toString() || `final_${a.name}`, name: a.name, parent: 'Term Final', assessment: a, isQuestion: false, co: a.co, maxMarks: parseFloat(a.maxMarks) || 0 })
                  }
                })

                // Parent header col-spans
                const parentHeaders = { 'CT': 0, 'Others': 0, 'Mid Term': 0, 'Term Final': 0 }
                cols.forEach(c => { if (parentHeaders[c.parent] !== undefined) parentHeaders[c.parent]++ })

                // Total max marks
                const totalMax = allAsmts.reduce((sum, a) => sum + (parseFloat(a.maxMarks) || 0), 0)

                // Helper to get a student's mark for a specific column
                const getColMark = (student, col) => {
                  const a = col.assessment
                  const aId = a._id ? a._id.toString() : ''
                  const studentDbId = student._id ? student._id.toString() : ''
                  const studentId = student.id
                  let sMarks = null
                  if (studentDbId && mks[studentDbId]?.[aId]) sMarks = mks[studentDbId][aId]
                  else if (mks[studentId]?.[aId]) sMarks = mks[studentId][aId]
                  else {
                    if (!col.isQuestion) { const key = `${a.type}_${a.name}`; return mks[studentId]?.[key] ?? 0 }
                    return 0
                  }
                  if (!sMarks) return 0
                  if (col.isQuestion) return parseFloat(sMarks.questionMarks?.[col.questionNumber] ?? 0) || 0
                  return parseFloat(sMarks.totalMark ?? sMarks.marks ?? 0) || 0
                }

                // Helper to get a student's total assessment mark
                const getStudentAssessmentMark = (student, assessment) => {
                  const aId = assessment._id ? assessment._id.toString() : ''
                  const studentDbId = student._id ? student._id.toString() : ''
                  const studentId = student.id
                  let sMarks = null
                  if (studentDbId && mks[studentDbId]?.[aId]) sMarks = mks[studentDbId][aId]
                  else if (mks[studentId]?.[aId]) sMarks = mks[studentId][aId]
                  else { const key = `${assessment.type}_${assessment.name}`; return mks[studentId]?.[key] ?? 0 }
                  if (!sMarks) return 0
                  return sMarks.totalMark ?? sMarks.marks ?? 0
                }

                // Compute student totals
                const studentTotals = {}
                students.forEach(s => {
                  let obtained = 0
                  allAsmts.forEach(a => { obtained += parseFloat(getStudentAssessmentMark(s, a) || 0) })
                  studentTotals[s.id] = obtained
                })

                // Compute column averages and batch average GPA
                let totalGP = 0
                students.forEach(s => {
                  const pct = totalMax > 0 ? (studentTotals[s.id] / totalMax) * 100 : 0
                  totalGP += getGradeAndGP(pct).gp
                })
                const avgGPA = students.length > 0 ? totalGP / students.length : 0
                const totalAvg = students.length > 0 ? Object.values(studentTotals).reduce((s, v) => s + v, 0) / students.length : 0

                // Check if any assessment or marks data exists
                const hasAssessments = allAsmts.length > 0
                const hasMarks = Object.keys(mks).length > 0

                const renderTableBody = () => {
                  const sortedStudents = [...students].sort((a, b) => {
                    const numA = parseInt((a.id || '').toString().replace(/^\D+/g, ''), 10) || 0
                    const numB = parseInt((b.id || '').toString().replace(/^\D+/g, ''), 10) || 0
                    return numA - numB
                  })

                  if (!hasAssessments || !hasMarks) {
                    return sortedStudents.map(student => (
                      <tr key={student._id || student.id} className="hover:bg-green-50/30 group">
                        <td className="px-3 py-3 border border-gray-200 font-bold sticky left-0 bg-white group-hover:bg-green-50/20 z-20 w-[120px]">{student.id}</td>
                        <td className="px-3 py-3 border border-gray-200 font-semibold text-gray-700">{student.name}</td>
                        <td className="px-3 py-3 border border-gray-200 text-center text-gray-400 italic font-semibold">No assessments/marks entered yet.</td>
                      </tr>
                    ))
                  }

                  return sortedStudents.map(student => {
                    const totalScore = studentTotals[student.id] || 0
                    const pct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0
                    const { grade, gp } = getGradeAndGP(pct)
                    const isPassed = pct >= (attainmentData.kpiConfig?.targetPassMarks || 40)
                    return (
                      <tr key={student._id || student.id} className="hover:bg-green-50/30 group">
                        <td className="px-3 py-2 border border-gray-200 font-bold sticky left-0 bg-white group-hover:bg-green-50/20 z-20 w-[120px]">{student.id}</td>
                        <td className="px-3 py-2 border border-gray-200 font-semibold sticky left-[120px] bg-white group-hover:bg-green-50/20 z-20 w-[160px] truncate shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{student.name}</td>
                        {cols.map(col => (
                          <td key={col.id} className="px-2 py-2 border border-gray-200 text-center font-medium text-gray-700">
                            {getColMark(student, col)}
                          </td>
                        ))}
                        <td className="px-3 py-2 border border-gray-200 text-center font-black text-green-950 bg-green-50/20">{totalScore.toFixed(1)}</td>
                        <td className="px-3 py-2 border border-gray-200 text-center font-black text-gray-800">{grade}</td>
                        <td className="px-3 py-2 border border-gray-200 text-center text-gray-600 font-bold">{gp.toFixed(2)}</td>
                        <td className="px-3 py-2 border border-gray-200 text-center text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-bold shadow-sm ${isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {isPassed ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                }

                return (
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
                    <h3 className="text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide">
                      Students Assessment Details
                    </h3>
                    <div className="overflow-x-auto max-h-[600px] border border-gray-200 rounded-xl bg-white shadow-inner">
                      <table className="w-full border-collapse text-xs text-left" style={{ tableLayout: 'auto' }}>
                        <thead className="sticky top-0 z-30">
                          {hasAssessments && hasMarks ? (
                            <>
                              <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white text-[10px] uppercase">
                                <th colSpan="2" className="px-3 py-3 border border-green-900 sticky left-0 bg-green-800 z-40 text-left">Student Info</th>
                                {parentHeaders['CT'] > 0 && <th colSpan={parentHeaders['CT']} className="px-2 py-3 border border-green-900 bg-green-700 text-center">CT</th>}
                                {parentHeaders['Others'] > 0 && <th colSpan={parentHeaders['Others']} className="px-2 py-3 border border-green-900 bg-green-600 text-center">Others</th>}
                                {parentHeaders['Mid Term'] > 0 && <th colSpan={parentHeaders['Mid Term']} className="px-2 py-3 border border-green-900 bg-green-700 text-center">Mid Term</th>}
                                {parentHeaders['Term Final'] > 0 && <th colSpan={parentHeaders['Term Final']} className="px-2 py-3 border border-green-900 bg-green-600 text-center">Term-Final</th>}
                                <th colSpan="4" className="px-3 py-3 border border-green-900 bg-green-800 text-center">Overall Results</th>
                              </tr>
                              <tr className="bg-green-50 text-green-800 border-b border-gray-300 font-bold text-[10px]">
                                <th className="px-3 py-3 border border-gray-300 sticky left-0 bg-green-50 z-40 w-[120px]">Roll ID</th>
                                <th className="px-3 py-3 border border-gray-300 sticky left-[120px] bg-green-50 z-40 w-[160px] truncate shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Student Name</th>
                                {cols.map(col => (
                                  <th key={col.id} className="px-2 py-3 border border-gray-300 min-w-[70px] text-center bg-green-50">
                                    <div>{col.name}</div>
                                    {col.co && <div className="text-[8px] text-green-700">({col.co})</div>}
                                    <div className="text-[7px] text-gray-400">Max: {col.maxMarks}</div>
                                  </th>
                                ))}
                                <th className="px-3 py-3 border border-gray-300 min-w-[80px] bg-green-100 text-green-900 text-center">Total ({totalMax})</th>
                                <th className="px-3 py-3 border border-gray-300 min-w-[60px] bg-green-100 text-green-900 text-center">Grade</th>
                                <th className="px-3 py-3 border border-gray-300 min-w-[60px] bg-green-100 text-green-900 text-center">CGPA</th>
                                <th className="px-3 py-3 border border-gray-300 min-w-[70px] bg-green-100 text-green-900 text-center">Pass/Fail</th>
                              </tr>
                            </>
                          ) : (
                            <tr className="bg-green-700 text-white text-[10px] uppercase font-bold">
                              <th className="px-3 py-3 border border-green-800 w-[120px]">Roll ID</th>
                              <th className="px-3 py-3 border border-green-800">Student Name</th>
                              <th className="px-3 py-3 border border-green-800 text-center">Status</th>
                            </tr>
                          )}
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {renderTableBody()}
                          {hasAssessments && hasMarks && (
                            <tr className="bg-green-50 font-black text-green-950 text-xs">
                              <td colSpan="2" className="px-3 py-2.5 border-t border-green-800 sticky left-0 bg-green-50 z-20">Class Average</td>
                              {cols.map(col => {
                                const marksList = students.map(s => getColMark(s, col))
                                const avg = marksList.length > 0 ? marksList.reduce((sum, val) => sum + val, 0) / marksList.length : 0
                                return (
                                  <td key={col.id} className="px-2 py-2.5 border border-gray-200 text-center text-green-900">
                                    {avg.toFixed(1)}
                                  </td>
                                )
                              })}
                              <td className="px-3 py-2.5 border border-gray-200 text-center text-green-900 bg-green-100/50">{totalAvg.toFixed(1)}</td>
                              <td colSpan="3" className="px-3 py-2.5 border border-gray-200 text-center text-green-900">
                                Avg GPA: {avgGPA.toFixed(2)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* TAB 3: ASSESSMENTS */}
          {activeTab === 'assessments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-extrabold text-gray-800">Assessments Management</h2>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all font-bold shadow-md hover:shadow-lg"
                >
                  <Plus size={16} />
                  Create Assessment
                </button>
              </div>

              {assessments.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center text-gray-500">
                  No assessments configured yet. Click "Create Assessment" to begin.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assessments.map(a => (
                    <div key={a._id} className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="text-lg font-bold text-gray-800">{a.name}</h3>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${a.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {a.status || 'Draft'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 font-semibold">
                          <div>Type: <span className="font-bold text-gray-800 capitalize">{a.type}</span></div>
                          <div>Max Marks: <span className="font-bold text-gray-800">{a.maxMarks}</span></div>
                          <div>Questions: <span className="font-bold text-gray-800">{a.numQuestions || 0}</span></div>
                          <div>Duration: <span className="font-bold text-gray-800">{a.examDuration || 'N/A'}</span></div>
                          {a.co && <div className="col-span-2">Mapped CO: <span className="font-bold text-blue-700">{a.co}</span></div>}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <button
                          onClick={() => setActiveAssessmentForPaper(a)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all"
                        >
                          <Edit size={14} />
                          Open Q.Paper
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDeleteAssessment(a._id)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg border border-transparent hover:border-red-200 transition-all"
                            title="Delete Assessment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create Assessment Dialog Modal */}
              {showCreateDialog && (
                <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl border max-w-md w-full p-6 space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 border-b pb-3">Create New Assessment</h3>
                    <form onSubmit={handleCreateAssessment} className="space-y-4 text-sm">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Assessment Type</label>
                        <select
                          value={newAssessment.type}
                          onChange={(e) => setNewAssessment({ ...newAssessment, type: e.target.value })}
                          className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-semibold"
                        >
                          <option value="cts">Class Test (CT)</option>
                          <option value="midTerm">Mid Term Examination</option>
                          <option value="final">Final Examination</option>
                          <option value="assignments">Assignment</option>
                          <option value="attendance">Attendance</option>
                          <option value="performance">Class Performance</option>
                          <option value="presentation">Presentation</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Total Marks</label>
                          <input
                            type="number"
                            min="1"
                            value={newAssessment.maxMarks}
                            onChange={(e) => setNewAssessment({ ...newAssessment, maxMarks: parseInt(e.target.value) || 0 })}
                            className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-semibold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Number of Questions</label>
                          <input
                            type="number"
                            min="0"
                            value={newAssessment.numQuestions}
                            onChange={(e) => setNewAssessment({ ...newAssessment, numQuestions: parseInt(e.target.value) || 0 })}
                            className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-semibold"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Exam Duration</label>
                        <input
                          type="text"
                          value={newAssessment.examDuration}
                          onChange={(e) => setNewAssessment({ ...newAssessment, examDuration: e.target.value })}
                          placeholder="e.g. 1.5 Hours"
                          className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Target CO (Default Mapping)</label>
                        <select
                          value={newAssessment.co}
                          onChange={(e) => setNewAssessment({ ...newAssessment, co: e.target.value })}
                          className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-semibold"
                        >
                          {Array.from({ length: 12 }, (_, i) => {
                            const coVal = `CO${i + 1}`
                            return <option key={coVal} value={coVal}>{coVal}</option>
                          })}
                          <option value="NONE">NONE</option>
                        </select>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
                        >
                          {saving ? 'Creating...' : 'Create'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateDialog(false)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold border transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUESTION BANK */}
          {activeTab === 'questionBank' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-xl font-extrabold text-gray-800 font-sans">Stored Question Papers</h2>
                <p className="text-sm text-gray-500 font-semibold">Search and reuse question papers</p>
              </div>

              {/* Breadcrumb Navigation */}
              {qBankPapers.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500 font-semibold mb-6 bg-gray-50 p-4 rounded-xl border border-gray-150">
                  <button
                    onClick={() => setQBankPath({ type: null, session: null, section: null })}
                    className="text-green-700 hover:text-green-800 hover:underline transition-colors flex items-center gap-1"
                  >
                    <FolderOpen size={14} />
                    Question Bank
                  </button>

                  {qBankPath.type && (
                    <>
                      <ChevronRight size={14} className="text-gray-400" />
                      <button
                        onClick={() => setQBankPath({ ...qBankPath, session: null, section: null })}
                        className="text-green-700 hover:text-green-800 hover:underline transition-colors"
                      >
                        {qBankPath.type}
                      </button>
                    </>
                  )}

                  {qBankPath.session && (
                    <>
                      <ChevronRight size={14} className="text-gray-400" />
                      <button
                        onClick={() => setQBankPath({ ...qBankPath, section: null })}
                        className="text-green-700 hover:text-green-800 hover:underline transition-colors"
                      >
                        {qBankPath.session}
                      </button>
                    </>
                  )}

                  {qBankPath.section && (
                    <>
                      <ChevronRight size={14} className="text-gray-400" />
                      <span className="text-gray-800">Section {qBankPath.section}</span>
                    </>
                  )}
                </div>
              )}

              {qBankPapers.length === 0 ? (
                <div className="bg-white rounded-2xl border p-12 text-center text-gray-500 font-semibold shadow-sm">
                  No question papers found for this course in the question bank.
                </div>
              ) : (
                <div>
                  {/* LEVEL 1: Select Assessment Name */}
                  {!qBankPath.type && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[...new Set(qBankPapers.map(p => getQBankGroupName(p)).filter(Boolean))]
                        .sort()
                        .map(name => (
                          <div
                            key={name}
                            onClick={() => setQBankPath({ type: name, session: null, section: null })}
                            className="bg-white hover:bg-green-50/10 cursor-pointer p-6 rounded-2xl border-2 border-gray-150 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-green-50 text-green-700 rounded-xl group-hover:bg-green-100 transition-colors">
                                <ClipboardList size={22} />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-gray-800 group-hover:text-green-700 transition-colors">{name}</h4>
                                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Click to view sessions</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] bg-green-105 text-green-850 font-bold px-2.5 py-0.5 rounded-full border border-green-200">
                                {qBankPapers.filter(p => getQBankGroupName(p) === name).length}
                              </span>
                              <ChevronRight size={16} className="text-gray-400 group-hover:text-green-600 transition-colors" />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* LEVEL 2: Select Session */}
                  {qBankPath.type && !qBankPath.session && (() => {
                    const papersForType = qBankPapers.filter(p => getQBankGroupName(p) === qBankPath.type)
                    const uniqueSessions = [...new Set(papersForType.map(p => getQBankSessionName(p)).filter(Boolean))].sort()
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {uniqueSessions.map(sessionName => (
                          <div
                            key={sessionName}
                            onClick={() => setQBankPath({ ...qBankPath, session: sessionName })}
                            className="bg-white hover:bg-blue-50/10 cursor-pointer p-6 rounded-2xl border-2 border-gray-150 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl group-hover:bg-blue-100 transition-colors">
                                <BookOpen size={22} />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{sessionName}</h4>
                                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Click to view sections</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] bg-blue-105 text-blue-850 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                                {papersForType.filter(p => getQBankSessionName(p) === sessionName).length}
                              </span>
                              <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* LEVEL 3: Select Section */}
                  {qBankPath.type && qBankPath.session && !qBankPath.section && (() => {
                    const papersForSession = qBankPapers.filter(
                      p => getQBankGroupName(p) === qBankPath.type &&
                        getQBankSessionName(p) === qBankPath.session
                    )
                    const uniqueSections = [...new Set(papersForSession.map(p => p.courseOffering?.section).filter(Boolean))].sort()
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {uniqueSections.map(sectionName => (
                          <div
                            key={sectionName}
                            onClick={() => setQBankPath({ ...qBankPath, section: sectionName })}
                            className="bg-white hover:bg-purple-50/10 cursor-pointer p-6 rounded-2xl border-2 border-gray-150 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-purple-50 text-purple-700 rounded-xl group-hover:bg-purple-100 transition-colors">
                                <Users size={22} />
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-gray-800 group-hover:text-purple-700 transition-colors">Section {sectionName}</h4>
                                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Click to view papers</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] bg-purple-105 text-purple-850 font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                                {papersForSession.filter(p => p.courseOffering?.section === sectionName).length}
                              </span>
                              <ChevronRight size={16} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* LEVEL 4: Render individual papers */}
                  {qBankPath.type && qBankPath.session && qBankPath.section && (() => {
                    const finalPapers = qBankPapers.filter(
                      p => getQBankGroupName(p) === qBankPath.type &&
                        getQBankSessionName(p) === qBankPath.session &&
                        p.courseOffering?.section === qBankPath.section
                    )
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {finalPapers.map(paper => {
                          const isOwn = paper.createdBy?._id === user.id
                          return (
                            <div key={paper._id} className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                  <div>
                                    <h3 className="text-lg font-bold text-gray-800">{paper.assessment?.name}</h3>
                                    <p className="text-xs text-gray-400 font-semibold">Course Code: {paper.courseOffering?.course?.courseCode}</p>
                                  </div>
                                  <span className="text-xs bg-green-150 text-green-800 border border-green-200 font-bold px-2 py-0.5 rounded-full capitalize">
                                    {paper.assessment?.type}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 font-semibold">
                                  <div>Teacher: <span className="font-bold text-gray-800">{paper.courseOffering?.teacher?.fullName || 'System'}</span></div>
                                  <div>Semester: <span className="font-bold text-gray-800">{getQBankSessionName(paper)}</span></div>
                                  <div>Max Marks: <span className="font-bold text-gray-800">{paper.assessment?.maxMarks}</span></div>
                                  <div>Questions: <span className="font-bold text-gray-800">{paper.assessment?.numQuestions || 0}</span></div>
                                </div>
                              </div>

                              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-between">
                                <button
                                  onClick={() => setShowPreviewPaper(paper)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border text-gray-700 rounded-lg text-xs font-bold transition-all"
                                >
                                  <Eye size={12} />
                                  Preview
                                </button>

                                <button
                                  onClick={() => exportToWord(paper.content, `${paper.assessment?.name || 'QP'}.doc`)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all"
                                >
                                  <FileDown size={12} />
                                  Word
                                </button>

                                <button
                                  onClick={() => handlePrint(paper.content)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition-all"
                                >
                                  <Printer size={12} />
                                  Print
                                </button>

                                {isOwn && (
                                  <button
                                    onClick={() => setActiveAssessmentForPaper(paper.assessment)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100 rounded-lg text-xs font-bold transition-all"
                                  >
                                    <Edit size={12} />
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Preview Modal */}
              {showPreviewPaper && (
                <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl border max-w-4xl w-full max-h-[85vh] flex flex-col p-6 space-y-4">
                    <div className="flex justify-between items-center border-b pb-3">
                      <h3 className="text-xl font-bold text-gray-800">
                        Preview: {showPreviewPaper.assessment?.name}
                      </h3>
                      <button
                        onClick={() => setShowPreviewPaper(null)}
                        className="text-gray-500 hover:text-gray-700 font-extrabold text-lg"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto border rounded-xl p-6 bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      <div dangerouslySetInnerHTML={{ __html: showPreviewPaper.content }} />
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t">
                      <button
                        onClick={() => exportToWord(showPreviewPaper.content, `${showPreviewPaper.assessment?.name || 'QP'}.doc`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md"
                      >
                        <FileDown size={14} />
                        Export Word
                      </button>
                      <button
                        onClick={() => handlePrint(showPreviewPaper.content)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md"
                      >
                        <Printer size={14} />
                        Print / Save PDF
                      </button>
                      <button
                        onClick={() => setShowPreviewPaper(null)}
                        className="px-4 py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold border"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MARKS ENTRY (SPREADSHEET UI) */}
          {activeTab === 'marksEntry' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800">OBE Marks Sheet Spreadsheet</h3>
                  <p className="text-xs text-gray-500 mt-1 font-semibold">Spreadsheet-style entry. Total calculates dynamically on the fly.</p>
                </div>

                {marksSpreadsheetData.assessments && marksSpreadsheetData.assessments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Selected Assessment:</label>
                    <select
                      value={selectedAssessmentId}
                      onChange={(e) => handleAssessmentChange(e.target.value)}
                      className="border border-gray-300 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 font-semibold text-sm"
                    >
                      {marksSpreadsheetData.assessments.map(a => (
                        <option key={a._id} value={a._id}>{a.name} ({a.type})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {marksSpreadsheetData.assessments?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No assessments configured yet. Create one in the Assessments tab.
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const assessment = marksSpreadsheetData.assessments.find(a => a._id === selectedAssessmentId)
                    const questions = marksSpreadsheetData.metadata[selectedAssessmentId] || []
                    const studentList = [...(marksSpreadsheetData.students || [])].sort((a, b) => {
                      const numA = parseInt((a.id || '').toString().replace(/^\D+/g, ''), 10) || 0
                      const numB = parseInt((b.id || '').toString().replace(/^\D+/g, ''), 10) || 0
                      return numA - numB
                    })

                    if (!assessment) return null

                    const hasQuestions = questions && questions.length > 0

                    return (
                      <div className="space-y-4">
                        <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-[500px]">
                          <table className="w-full border-collapse text-sm text-left">
                            <thead className="bg-green-50/80 sticky top-0 z-10 border-b">
                              <tr>
                                <th className="px-4 py-3 border-r font-bold text-gray-700 min-w-[120px]">Student ID</th>
                                <th className="px-4 py-3 border-r font-bold text-gray-700 min-w-[200px]">Student Name</th>
                                {hasQuestions ? (
                                  questions.map(q => (
                                    <th key={q.questionNumber} className="px-4 py-3 border-r font-bold text-gray-700 text-center min-w-[90px]">
                                      <div>{q.questionNumber}</div>
                                      <div className="text-[10px] text-gray-500 font-semibold">Max: {q.maxMarks} • {q.co}</div>
                                    </th>
                                  ))
                                ) : (
                                  <th className="px-4 py-3 border-r font-bold text-gray-700 text-center min-w-[100px]">
                                    <div>Marks</div>
                                    <div className="text-[10px] text-gray-500 font-semibold">Max: {assessment.maxMarks}</div>
                                  </th>
                                )}
                                <th className="px-4 py-3 font-bold text-gray-700 text-center min-w-[90px]">Total Marks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y font-semibold text-gray-700">
                              {studentList.map(s => {
                                const sId = s._id
                                const sMarks = tempMarks[sId] || {}

                                // Calculate total
                                let sum = 0
                                if (hasQuestions) {
                                  questions.forEach(q => {
                                    sum += parseFloat(sMarks[q.questionNumber]) || 0
                                  })
                                } else {
                                  sum = parseFloat(sMarks['marks']) || 0
                                }

                                return (
                                  <tr key={sId} className="hover:bg-green-50/10">
                                    <td className="px-4 py-2 border-r font-mono text-gray-800 bg-white">{s.id}</td>
                                    <td className="px-4 py-2 border-r bg-white">{s.name}</td>
                                    {hasQuestions ? (
                                      questions.map(q => {
                                        const val = sMarks[q.questionNumber] ?? ''
                                        return (
                                          <td key={q.questionNumber} className="px-2 py-1.5 border-r text-center">
                                            <input
                                              type="number"
                                              step="0.5"
                                              min="0"
                                              max={q.maxMarks}
                                              value={val}
                                              onChange={(e) => handleSpreadsheetMarkChange(sId, q.questionNumber, e.target.value, q.maxMarks)}
                                              className="w-16 border rounded px-1.5 py-1 text-center font-bold focus:ring-1 focus:ring-green-500 outline-none text-xs"
                                              placeholder="0"
                                            />
                                          </td>
                                        )
                                      })
                                    ) : (
                                      <td className="px-2 py-1.5 border-r text-center">
                                        <input
                                          type="number"
                                          step="0.5"
                                          min="0"
                                          max={assessment.maxMarks}
                                          value={sMarks['marks'] ?? ''}
                                          onChange={(e) => handleSpreadsheetMarkChange(sId, 'marks', e.target.value, assessment.maxMarks)}
                                          className="w-16 border rounded px-1.5 py-1 text-center font-bold focus:ring-1 focus:ring-green-500 outline-none text-xs"
                                          placeholder="0"
                                        />
                                      </td>
                                    )}
                                    <td className="px-4 py-2 text-center text-gray-800 font-extrabold bg-gray-50/50">
                                      {sum.toFixed(1)} / {assessment.maxMarks}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={saveSpreadsheetMarks}
                            disabled={saving}
                            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-all font-bold shadow-md hover:shadow-lg disabled:opacity-50"
                          >
                            <Save size={18} />
                            {saving ? 'Saving Marks...' : 'Save Spreadsheet Marks'}
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CO-PO MAPPING */}
          {activeTab === 'coMapping' && (() => {
            const coListSorted = Array.from({ length: 12 }, (_, i) => `CO${i + 1}`)
            const poListSorted = Array.from({ length: 12 }, (_, i) => `PO${i + 1}`)

            return (
              <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-6">
                <div className="text-center border-b pb-4">
                  <h3 className="text-xl font-extrabold text-gray-800">Course Outcome (CO) - Program Outcome (PO) Mapping</h3>
                  <p className="text-sm text-gray-500 mt-1 font-semibold">This mapping is allocated to this course by the Administrator and is read-only.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 text-xs font-bold text-gray-600 border-b">
                        <th className="border p-3 min-w-[90px] text-gray-700 bg-gray-100 font-extrabold text-sm">CO \\ PO</th>
                        {poListSorted.map((poNum) => {
                          const dbPoDescription = dbProgramOutcomes.find(p => p.code.replace(/\s+/g, '').toUpperCase() === poNum)?.description || PO_NAMES[poNum]
                          const colorClass = PO_COLORS[poNum] || 'bg-gray-50'
                          const textColorClass = PO_TEXT_COLORS[poNum] || 'text-gray-700'
                          return (
                            <th
                              key={poNum}
                              className={`border p-2 text-center min-w-[95px] ${colorClass} ${textColorClass}`}
                              title={dbPoDescription}
                            >
                              <div className="font-black text-[11px] mb-0.5">{poNum}</div>
                              <div className="text-[9px] font-semibold leading-snug break-words max-w-[90px] mx-auto opacity-95">
                                {dbPoDescription}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {coListSorted.map((coNum) => {
                        return (
                          <tr key={coNum} className="hover:bg-green-50/20">
                            <td className="border px-4 py-2.5 font-bold text-blue-700 bg-blue-50/30">{coNum}</td>
                            {poListSorted.map((poNum) => {
                              const isMapped = coMapping[coNum]?.[poNum] === 1
                              return (
                                <td
                                  key={poNum}
                                  className={`border p-2 text-center cursor-default transition-all duration-150 select-none ${isMapped
                                    ? 'bg-green-500 text-white font-extrabold shadow-inner'
                                    : 'bg-yellow-50/50 text-transparent'
                                    }`}
                                >
                                  {isMapped ? '✓' : ''}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}

                      {/* Totals Row */}
                      <tr className="bg-gray-150/70 border-t-2 border-gray-300">
                        <td className="border px-4 py-3 font-extrabold text-gray-700 bg-gray-200 text-sm">Total</td>
                        {poListSorted.map((poNum) => {
                          let total = 0
                          coListSorted.forEach((coNum) => {
                            if (coMapping[coNum]?.[poNum] === 1) {
                              total++
                            }
                          })
                          return (
                            <td
                              key={poNum}
                              className="border p-2 text-center font-extrabold text-gray-800 bg-gray-100/50 text-sm"
                            >
                              {total}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Outcomes Details Section from Database */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t pt-6 mt-8">
                  {/* CO Details */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-extrabold text-gray-800 flex items-center gap-2 border-b pb-2">
                      <span className="p-1 px-2.5 text-[10px] bg-blue-100 text-blue-700 rounded-md font-black">CO</span>
                      Course Outcomes (CO) Details
                    </h4>
                    {dbCourseOutcomes.length === 0 ? (
                      <p className="text-sm text-gray-400 font-semibold italic">No Course Outcomes loaded from the database for this course.</p>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                        {dbCourseOutcomes.map((co) => (
                          <div key={co._id || co.code} className="p-3.5 bg-gray-50/30 hover:bg-blue-50/20 border border-gray-150 rounded-xl transition-all duration-200">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-black text-blue-700 text-sm bg-blue-50/50 px-2 py-0.5 rounded-md">{co.code}</span>
                            </div>
                            <p className="text-xs text-gray-600 font-medium leading-relaxed">{co.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PO Details */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-extrabold text-gray-800 flex items-center gap-2 border-b pb-2">
                      <span className="p-1 px-2.5 text-[10px] bg-green-100 text-green-700 rounded-md font-black">PO</span>
                      Mapped Program Outcomes (PO) Details
                    </h4>
                    {(() => {
                      const mappedPoKeys = new Set()
                      Object.keys(coMapping).forEach((coCode) => {
                        // Filter to only look at COs actually defined for the course (in dbCourseOutcomes)
                        if (dbCourseOutcomes.length > 0) {
                          const hasCoInDb = dbCourseOutcomes.some(
                            (c) => c.code.replace(/\s+/g, '').toUpperCase() === coCode
                          )
                          if (!hasCoInDb) return
                        }

                        Object.keys(coMapping[coCode] || {}).forEach((poCode) => {
                          if (coMapping[coCode][poCode] === 1) {
                            mappedPoKeys.add(poCode)
                          }
                        })
                      })

                      // Order mapped PO keys numerically
                      const sortedPoKeys = Array.from(mappedPoKeys).sort((a, b) => {
                        const numA = parseInt(a.replace(/^\D+/g, ''), 10) || 0
                        const numB = parseInt(b.replace(/^\D+/g, ''), 10) || 0
                        return numA - numB
                      })

                      if (sortedPoKeys.length === 0) {
                        return (
                          <p className="text-sm text-gray-400 font-semibold italic">No Program Outcomes are currently mapped.</p>
                        )
                      }

                      return (
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                          {sortedPoKeys.map((poKey) => {
                            const dbPo = dbProgramOutcomes.find((po) => po.code === poKey)
                            const poDesc = dbPo?.description || PO_NAMES[poKey] || 'N/A'
                            return (
                              <div key={poKey} className="p-3.5 bg-gray-50/30 hover:bg-green-50/20 border border-gray-150 rounded-xl transition-all duration-200">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="font-black text-green-700 text-sm bg-green-50/50 px-2 py-0.5 rounded-md">{poKey}</span>
                                </div>
                                <p className="text-xs text-gray-600 font-medium leading-relaxed">{poDesc}</p>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* TAB 7: ATTAINMENT */}
          {activeTab === 'attainment' && (() => {
            const mappedPoKeysForAttainment = new Set()
            Object.keys(coMapping).forEach((coCode) => {
              if (dbCourseOutcomes.length > 0) {
                const hasCoInDb = dbCourseOutcomes.some(
                  (c) => c.code.replace(/\s+/g, '').toUpperCase() === coCode
                )
                if (!hasCoInDb) return
              }
              Object.keys(coMapping[coCode] || {}).forEach((poCode) => {
                if (coMapping[coCode][poCode] === 1) {
                  mappedPoKeysForAttainment.add(poCode)
                }
              })
            })

            return (
              <div className="space-y-6">
                {/* Threshold configurations */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
                  <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3">KPI Attainment Thresholds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Target Pass Marks (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={kpiInput.targetPassMarks}
                        onChange={(e) => setKpiInput({ ...kpiInput, targetPassMarks: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">CO Attainment Target KPI (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={kpiInput.kpiCO}
                        onChange={(e) => setKpiInput({ ...kpiInput, kpiCO: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">PO Attainment Target KPI (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={kpiInput.kpiPO}
                        onChange={(e) => setKpiInput({ ...kpiInput, kpiPO: parseInt(e.target.value) || 0 })}
                        className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 font-semibold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={saveKpiConfig}
                      disabled={saving}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold shadow-md disabled:opacity-50"
                    >
                      <Save size={16} />
                      {saving ? 'Saving Thresholds...' : 'Save Thresholds'}
                    </button>
                  </div>
                </div>

                {/* CO/PO attainments side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* CO Attainment */}
                  <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
                    <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3">CO Attainment Status</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm text-left">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="px-4 py-2 border-r font-bold text-gray-700">CO</th>
                            <th className="px-4 py-2 border-r font-bold text-gray-700 text-center">Above Pass Marks ({attainmentData.kpiConfig?.targetPassMarks}%)</th>
                            <th className="px-4 py-2 border-r font-bold text-gray-700 text-center">KPI Target ({attainmentData.kpiConfig?.kpiCO}%)</th>
                            <th className="px-4 py-2 font-bold text-gray-700 text-center">Attainment Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-semibold text-gray-700">
                          {attainmentData.coAttainments && attainmentData.coAttainments.length > 0 ? (
                            [...attainmentData.coAttainments]
                              .filter(co => {
                                // If database outcomes are empty, display all as fallback
                                if (dbCourseOutcomes.length === 0) return true
                                const normCo = co.co.replace(/\s+/g, '').toUpperCase()
                                return dbCourseOutcomes.some(c => c.code.replace(/\s+/g, '').toUpperCase() === normCo)
                              })
                              .sort((a, b) => {
                                const numA = parseInt(a.co.replace(/^\D+/g, ''), 10) || 0
                                const numB = parseInt(b.co.replace(/^\D+/g, ''), 10) || 0
                                return numA - numB
                              })
                              .map(co => (
                                <tr key={co.co}>
                                  <td className="px-4 py-3 border-r font-bold text-blue-700">{co.co}</td>
                                  <td className="px-4 py-3 border-r text-center">{(co.passMarksPercentage || 0).toFixed(1)}%</td>
                                  <td className="px-4 py-3 border-r text-center">{(co.kpiPercentage || 0).toFixed(1)}%</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm ${co.attained ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                      {co.attained ? 'Attained' : 'Not Attained'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="text-center py-6 text-gray-500 font-semibold">No attainment data found. Run a marks sheet update first.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PO Attainment */}
                  <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
                    <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3">PO Attainment Status</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm text-left">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="px-4 py-2 border-r font-bold text-gray-700">PO</th>
                            <th className="px-4 py-2 border-r font-bold text-gray-700 text-center">Above Pass Marks ({attainmentData.kpiConfig?.targetPassMarks}%)</th>
                            <th className="px-4 py-2 border-r font-bold text-gray-700 text-center">KPI Target ({attainmentData.kpiConfig?.kpiPO}%)</th>
                            <th className="px-4 py-2 font-bold text-gray-700 text-center">Attainment Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-semibold text-gray-700">
                          {attainmentData.poAttainments && attainmentData.poAttainments.length > 0 ? (
                            [...attainmentData.poAttainments]
                              .filter(po => {
                                // If no mapped keys are computed, display all as fallback
                                if (mappedPoKeysForAttainment.size === 0) return true
                                const normPo = po.po.replace(/\s+/g, '').toUpperCase()
                                return mappedPoKeysForAttainment.has(normPo)
                              })
                              .sort((a, b) => {
                                const numA = parseInt(a.po.replace(/^\D+/g, ''), 10) || 0
                                const numB = parseInt(b.po.replace(/^\D+/g, ''), 10) || 0
                                return numA - numB
                              })
                              .map(po => (
                                <tr key={po.po}>
                                  <td className="px-4 py-3 border-r font-bold text-purple-700" title={PO_NAMES[po.po]}>{po.po}</td>
                                  <td className="px-4 py-3 border-r text-center">{(po.passMarksPercentage || 0).toFixed(1)}%</td>
                                  <td className="px-4 py-3 border-r text-center">{(po.kpiPercentage || 0).toFixed(1)}%</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm ${po.attained ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                      {po.attained ? 'Attained' : 'Not Attained'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="text-center py-6 text-gray-500 font-semibold">No attainment data found. Map outcomes and save marks first.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* TAB 8: REPORTS */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6">
              {(() => {
                // Reconstruct assets structure for reports
                const cts = assessments.filter(a => a.type === 'cts')
                const midTerm = assessments.filter(a => a.type === 'midTerm')
                const final = assessments.filter(a => a.type === 'final')
                const assignments = assessments.filter(a => a.type === 'assignments')
                const attendance = assessments.find(a => a.type === 'attendance')
                const performance = assessments.find(a => a.type === 'performance')
                const presentation = assessments.find(a => a.type === 'presentation')

                const structuredAssessments = {
                  cts,
                  midTerm,
                  final,
                  assignments,
                  attendance,
                  performance,
                  presentation
                }

                if (!marksSpreadsheetData.marks) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                      <p className="mt-4 text-gray-600 font-medium">Loading report calculations...</p>
                    </div>
                  )
                }

                return (
                  <ComprehensiveReports
                    students={students.map(s => ({ id: s.id, name: s.name, _id: s._id }))}
                    marks={marksSpreadsheetData.marks || {}}
                    assessments={structuredAssessments}
                    coMapping={coMapping}
                    courseInfo={{
                      ...offering.course,
                      courseTitle: offering.course?.courseName,
                      teacherName: offering.teacher?.fullName,
                      teacherEmail: offering.teacher?.email,
                      batchName: offering.batch?.name || offering.batch?.batchName || 'N/A',
                      semesterName: offering.semester?.semesterName,
                      sectionName: offering.section,
                      academicYear: offering.academicYear || offering.semester?.academicYear,
                    }}
                    targetPassMarks={attainmentData.kpiConfig?.targetPassMarks}
                    kpiCO={attainmentData.kpiConfig?.kpiCO}
                    kpiPO={attainmentData.kpiConfig?.kpiPO}
                    metadataMap={marksSpreadsheetData.metadata || {}}
                    dbCourseOutcomes={dbCourseOutcomes}
                    dbProgramOutcomes={dbProgramOutcomes}
                  />
                )
              })()}
            </div>
          )}

          {/* TAB 9: COURSE SURVEY */}
          {activeTab === 'evaluation' && (
            <CourseSurvey offering={offering} />
          )}
        </div>
      )}
    </div>
  )
}
