import { useState, useEffect, useMemo, useCallback } from 'react'
import { apiService } from '../../services/apiService'
import { useAuth } from '../../context/AuthContext'
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
  AlertTriangle,
  MessageSquare,
  Calendar,
  Bell,
  CheckCircle2,
  Maximize2,
  Minimize2,
  User,
  GraduationCap,
  Layers,
  History,
  Clock,
  CheckCircle,
  XCircle,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import QuestionPaperEditor from '../marks/QuestionPaperEditor'
import ComprehensiveReports from '../reports/ComprehensiveReports'
import CourseSurvey from '../survey/CourseSurvey'
import PORecommendationMatrix from '../reports/PORecommendationMatrix'

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
  const { setIsEditingActive } = useAuth()
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
  const [activeAssessmentForPaper, setActiveAssessmentForPaper] = useState(null)

  // Prevent idle auto-logout while actively entering marks or working on a question paper
  useEffect(() => {
    if (setIsEditingActive) {
      if (activeTab === 'marksEntry' || activeAssessmentForPaper !== null) {
        setIsEditingActive(true)
      } else {
        setIsEditingActive(false)
      }
    }
    return () => {
      if (setIsEditingActive) setIsEditingActive(false)
    }
  }, [activeTab, activeAssessmentForPaper, setIsEditingActive])

  // Marks Entry Spreadsheet States
  const [marksSpreadsheetData, setMarksSpreadsheetData] = useState({
    students: [],
    assessments: [],
    metadata: {},
    marks: {}
  })
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [tempMarks, setTempMarks] = useState({}) // studentId -> questionNumber -> mark

  // Combined Batch Report States
  const [reportScope, setReportScope] = useState('section') // 'section' or 'combined'
  const [combinedBatchSpreadsheetData, setCombinedBatchSpreadsheetData] = useState(null)
  const [loadingCombinedBatch, setLoadingCombinedBatch] = useState(false)

  // CO-PO Mapping States
  const [coMapping, setCoMapping] = useState({})
  const [dbCourseOutcomes, setDbCourseOutcomes] = useState([])
  const [dbProgramOutcomes, setDbProgramOutcomes] = useState([])
  const [isEditingCoMapping, setIsEditingCoMapping] = useState(false)
  const [editableCoMapping, setEditableCoMapping] = useState({})
  const [proposedCOs, setProposedCOs] = useState([])
  const [editedCOs, setEditedCOs] = useState([])
  const [deletedCOs, setDeletedCOs] = useState([])
  const [editingCoCode, setEditingCoCode] = useState(null)
  const [editingCoDesc, setEditingCoDesc] = useState('')
  const [newCoForm, setNewCoForm] = useState({ code: '', description: '' })
  const [teacherRequests, setTeacherRequests] = useState([])
  const [selectedTeacherRequestId, setSelectedTeacherRequestId] = useState(null)
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // Compute available CO codes (CO1 to CO12) excluding already created or proposed COs
  const availableCoCodes = useMemo(() => {
    const allPossible = Array.from({ length: 12 }, (_, i) => `CO${i + 1}`)
    const existingSet = new Set([
      ...dbCourseOutcomes.map(c => c.code.replace(/\s+/g, '').toUpperCase()),
      ...proposedCOs.map(c => c.code.replace(/\s+/g, '').toUpperCase())
    ])
    // Remove items marked for deletion from existing set so they could potentially be re-added if needed
    deletedCOs.forEach(dCode => existingSet.delete(dCode))

    return allPossible.filter(code => !existingSet.has(code))
  }, [dbCourseOutcomes, proposedCOs, deletedCOs])

  // Automatically select first available CO code when available list changes
  useEffect(() => {
    if (availableCoCodes.length > 0 && (!newCoForm.code || !availableCoCodes.includes(newCoForm.code))) {
      setNewCoForm(prev => ({ ...prev, code: availableCoCodes[0] }))
    }
  }, [availableCoCodes])

  const fetchTeacherRequests = async () => {
    if (!offering?.course?._id) return
    try {
      const data = await apiService.getMyCOPORequests(offering.course._id)
      const reqs = data.requests || []
      setTeacherRequests(reqs)
      if (reqs.length > 0) {
        setSelectedTeacherRequestId(prev => {
          if (prev && reqs.some(r => r._id === prev)) return prev
          return reqs[0]._id
        })
      }
    } catch (err) {
      console.error('Failed to fetch teacher CO-PO requests:', err)
    }
  }

  const handleToggleEditMapping = () => {
    if (!isEditingCoMapping) {
      const cloned = JSON.parse(JSON.stringify(coMapping || {}))
      setEditableCoMapping(cloned)
      setProposedCOs([])
      setEditedCOs([])
      setDeletedCOs([])
      setEditingCoCode(null)
    }
    setIsEditingCoMapping(!isEditingCoMapping)
  }

  const handleCellClickInEditMode = (coKey, poKey) => {
    if (deletedCOs.includes(coKey)) return // Cannot map deleted COs

    const isDbCo = dbCourseOutcomes.some(c => c.code.replace(/\s+/g, '').toUpperCase() === coKey)
    const isProposedNew = proposedCOs.some(p => p.code === coKey)
    const hasExistingMapping = Object.values(coMapping[coKey] || {}).some(v => v === 1)
    const isCoActive = isDbCo || isProposedNew || hasExistingMapping

    if (!isCoActive) {
      alert(`Course Outcome ${coKey} has not been created for this course yet. Please use "Propose New Course Outcome (CO)" below to create ${coKey} before mapping it to POs.`)
      return
    }

    setEditableCoMapping(prev => {
      const currentVal = prev[coKey]?.[poKey] === 1 ? 1 : 0
      const newVal = currentVal === 1 ? 0 : 1
      return {
        ...prev,
        [coKey]: {
          ...(prev[coKey] || {}),
          [poKey]: newVal
        }
      }
    })
  }

  const handleAddProposedCO = (e) => {
    e.preventDefault()
    if (!newCoForm.description.trim()) {
      alert('Please enter a description for the new Course Outcome (CO).')
      return
    }
    const code = newCoForm.code || (availableCoCodes.length > 0 ? availableCoCodes[0] : `CO${dbCourseOutcomes.length + proposedCOs.length + 1}`)

    setProposedCOs(prev => [...prev, { code, description: newCoForm.description.trim() }])
    setNewCoForm({ code: availableCoCodes[1] || '', description: '' })
  }

  const handleRemoveProposedCO = (codeToRemove) => {
    setProposedCOs(prev => prev.filter(c => c.code !== codeToRemove))
    setEditableCoMapping(prev => {
      const next = { ...prev }
      delete next[codeToRemove]
      return next
    })
  }

  const handleMarkCoForDeletion = (coCode) => {
    if (!deletedCOs.includes(coCode)) {
      setDeletedCOs(prev => [...prev, coCode])
      setEditedCOs(prev => prev.filter(c => c.code !== coCode))
      setEditableCoMapping(prev => {
        const next = { ...prev }
        delete next[coCode]
        return next
      })
    }
  }

  const handleUnmarkCoForDeletion = (coCode) => {
    setDeletedCOs(prev => prev.filter(c => c !== coCode))
  }

  const handleSaveEditedCoDescription = (coCode) => {
    if (!editingCoDesc.trim()) return
    setEditedCOs(prev => {
      const filtered = prev.filter(c => c.code !== coCode)
      return [...filtered, { code: coCode, description: editingCoDesc.trim() }]
    })
    setEditingCoCode(null)
    setEditingCoDesc('')
  }

  const handleSubmitRequestToAdmin = async () => {
    if (!offering?.course?._id) return

    const activeReq = teacherRequests.find(r => r.status === 'pending' || r.status === 'in_review')
    if (activeReq) {
      alert(`You already have a request currently in progress (${activeReq.status.replace('_', ' ')}). Please wait for admin approval before submitting a new one.`)
      return
    }

    let hasMappingChanges = false
    const changes = []
    const coKeys = Array.from(new Set([...Object.keys(coMapping), ...Object.keys(editableCoMapping)]))
    coKeys.forEach(co => {
      if (deletedCOs.includes(co)) return
      Array.from({ length: 12 }, (_, i) => `PO${i + 1}`).forEach(po => {
        const oldV = coMapping[co]?.[po] === 1
        const newV = editableCoMapping[co]?.[po] === 1
        if (oldV !== newV) {
          hasMappingChanges = true
          changes.push(`${co}-${po}`)
        }
      })
    })

    const hasNewCOs = proposedCOs.length > 0
    const hasEditedCOs = editedCOs.length > 0
    const hasDeletedCOs = deletedCOs.length > 0

    if (!hasMappingChanges && !hasNewCOs && !hasEditedCOs && !hasDeletedCOs) {
      alert('No changes detected in mapping, CO descriptions, or new/deleted COs. Please make modifications before submitting.')
      return
    }

    let requestType = 'edit_mapping'
    if (hasNewCOs || hasEditedCOs || hasDeletedCOs) {
      requestType = 'add_co_with_mapping'
    }

    const summaryParts = []
    if (hasNewCOs) summaryParts.push(`Added ${proposedCOs.length} new CO(s)`)
    if (hasEditedCOs) summaryParts.push(`Updated ${editedCOs.length} CO description(s)`)
    if (hasDeletedCOs) summaryParts.push(`Deleted ${deletedCOs.length} CO(s)`)
    if (hasMappingChanges) summaryParts.push(`Modified ${changes.length} CO-PO mapping cell(s)`)

    const summaryText = summaryParts.join(' • ')

    setSubmittingRequest(true)
    try {
      await apiService.submitCOPORequest({
        courseId: offering.course._id,
        courseOfferingId: offering._id,
        courseCode: offering.course.courseCode,
        courseName: offering.course.courseName,
        requestType,
        proposedMapping: editableCoMapping,
        originalMapping: coMapping,
        proposedCOs,
        editedCOs,
        deletedCOs,
        changesSummary: summaryText,
      })
      alert('Your request has been submitted to the Admin & HOD for review!')
      setIsEditingCoMapping(false)
      setProposedCOs([])
      setEditedCOs([])
      setDeletedCOs([])
      fetchTeacherRequests()
      loadAllData()
    } catch (err) {
      alert(err.message || 'Failed to submit request to admin.')
    } finally {
      setSubmittingRequest(false)
    }
  }
 
  // Survey States for course reminders
  const [survey, setSurvey] = useState(null)
  const [surveyResponsesCount, setSurveyResponsesCount] = useState(0)

  // Helper to load all dismissed reminder IDs from localStorage
  const loadDismissedReminderIds = useCallback(() => {
    try {
      const globalSaved = localStorage.getItem('obe_dismissed_reminder_ids')
      const globalList = globalSaved ? JSON.parse(globalSaved) : []
      const courseKey = offering?._id ? `dismissed_reminders_${offering._id}` : null
      const courseSaved = courseKey ? localStorage.getItem(courseKey) : null
      const courseList = courseSaved ? JSON.parse(courseSaved) : []
      return Array.from(new Set([...globalList, ...courseList]))
    } catch (e) {
      return []
    }
  }, [offering?._id])

  // Dismissed Reminders State (Persisted permanently in localStorage)
  const [dismissedReminderIds, setDismissedReminderIds] = useState(() => loadDismissedReminderIds())
  const [animatingDismissIds, setAnimatingDismissIds] = useState([])

  // Re-sync dismissed reminders whenever course offering changes or loads
  useEffect(() => {
    setDismissedReminderIds(loadDismissedReminderIds())
  }, [offering?._id, loadDismissedReminderIds])

  const isReminderMandatory = useCallback((reminder) => {
    if (!reminder) return false
    const title = (reminder.title || '').toLowerCase()
    const type = reminder.type || ''

    // Non-deletable mandatory action items:
    // Pending Marks, Presentation Scheduled, Assignment Deadline, Course Survey is Open, Overdue items, Setup Assessments
    if (type === 'marks' || title.includes('pending marks')) return true
    if (title.includes('presentation scheduled')) return true
    if (title.includes('assignment deadline')) return true
    if (type === 'deadline_upcoming' || type === 'deadline_overdue' || title.includes('overdue')) return true
    if (title.includes('course survey is open') || (type === 'survey' && title.includes('open'))) return true
    if (type === 'assessment_missing') return true

    return false
  }, [])

  const handleDismissReminder = async (reminderId) => {
    setAnimatingDismissIds(prev => [...prev, reminderId])

    // If it's a CO-PO request notification, dismiss it dynamically in MongoDB database!
    if (reminderId.startsWith('copo_req_')) {
      const dbId = reminderId.replace('copo_req_', '')
      try {
        await apiService.dismissCOPORequest(dbId)
        fetchTeacherRequests()
      } catch (err) {
        console.error('Failed to dismiss request in database:', err)
      }
    }

    setTimeout(() => {
      setDismissedReminderIds(prev => {
        const updated = Array.from(new Set([...prev, reminderId]))
        try {
          localStorage.setItem('obe_dismissed_reminder_ids', JSON.stringify(updated))
          if (offering?._id) {
            localStorage.setItem(`dismissed_reminders_${offering._id}`, JSON.stringify(updated))
          }
        } catch (e) {}
        return updated
      })
      setAnimatingDismissIds(prev => prev.filter(id => id !== reminderId))
    }, 300)
  }

  // Attainment States
  const [attainmentData, setAttainmentData] = useState({
    coAttainments: [],
    poAttainments: [],
    kpiConfig: { targetPassMarks: 40, kpiCO: 50, kpiPO: 50 }
  })
  const [kpiInput, setKpiInput] = useState({ targetPassMarks: 40, kpiCO: 50, kpiPO: 50 })
 
  // Question Bank Drill-down Path State
  const [qBankPath, setQBankPath] = useState({ type: null, session: null, section: null })

  // Modals & UI States
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreviewPaper, setShowPreviewPaper] = useState(null) // holds paper doc
  const [isTableFullscreen, setIsTableFullscreen] = useState(false)
  const [marksEntryMode, setMarksEntryMode] = useState('perQuestion') // 'perQuestion' or 'total'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isTableFullscreen) {
        setIsTableFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTableFullscreen])
  const [newAssessment, setNewAssessment] = useState({
    type: 'cts',
    maxMarks: 10,
    durationValue: 30,
    durationUnit: 'Minutes',
    co: 'NONE',
    deadline: ''
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

  const getAssessmentStatus = useCallback((a) => {
    const activeAssessments = marksSpreadsheetData.assessments || []
    const studentsList = marksSpreadsheetData.students || []
    const metadataMap = marksSpreadsheetData.metadata || {}
    const marksMap = marksSpreadsheetData.marks || {}

    const questions = metadataMap[a._id] || []
    const hasQuestions = questions.length > 0

    let enteredCount = 0
    studentsList.forEach(s => {
      const sId = s._id
      const examMark = marksMap[sId]?.[a._id]
      if (examMark) {
        if (hasQuestions) {
          const allEntered = questions.every(q => {
            const m = examMark.questionMarks?.[q.questionNumber]
            return m !== undefined && m !== null && m !== ''
          })
          if (allEntered) enteredCount++
        } else {
          const m = examMark.totalMark
          if (m !== undefined && m !== null && m !== '') {
            enteredCount++
          }
        }
      }
    })

    const isFullyEntered = studentsList.length > 0 && enteredCount === studentsList.length
    if (isFullyEntered) {
      return 'Evaluated'
    }

    // Check if configuration matches maxMarks and all mapped to COs
    if (questions.length > 0) {
      const totalAllocated = questions.reduce((sum, q) => sum + (parseFloat(q.maxMarks) || 0), 0)
      const allQuestionsHaveCO = questions.every(q => q.co && q.co !== 'NONE' && q.co !== '')
      const hasAnyValidCO = questions.some(q => q.co && q.co !== 'NONE' && q.co !== '')
      if ((Math.abs(totalAllocated - a.maxMarks) < 0.01 && allQuestionsHaveCO) || hasAnyValidCO) {
        return 'Assigned'
      }
    }

    if (a.co && a.co !== 'NONE' && a.co !== '') {
      return 'Assigned'
    }

    if (a.status === 'Published') {
      return 'Assigned'
    }

    if (['attendance', 'presentation'].includes(a.type)) {
      return 'Assigned'
    }

    return 'Draft'
  }, [marksSpreadsheetData])

  const allRemindersList = useMemo(() => {
    const list = []

    // 1. Check Assessment Marks Completion
    const activeAssessments = marksSpreadsheetData.assessments || []
    const studentsList = marksSpreadsheetData.students || []
    const metadataMap = marksSpreadsheetData.metadata || {}
    const marksMap = marksSpreadsheetData.marks || {}

    // Add high-priority reminder if no assessments configured
    if (activeAssessments.length === 0) {
      list.push({
        type: 'assessment_missing',
        id: `assessment_missing_${offering._id}`,
        priority: 1, // High Priority
        title: 'Setup Course Assessments',
        text: 'No assessments configured yet. Create one to begin tracking student outcomes.',
        actionLabel: 'Create Assessment',
        actionTab: 'assessments'
      })
    }

    activeAssessments.forEach(a => {
      const questions = metadataMap[a._id] || []
      const hasQuestions = questions.length > 0

      let enteredCount = 0
      studentsList.forEach(s => {
        const sId = s._id
        const examMark = marksMap[sId]?.[a._id]
        if (examMark) {
          if (hasQuestions) {
            const allEntered = questions.every(q => {
              const m = examMark.questionMarks?.[q.questionNumber]
              return m !== undefined && m !== null && m !== ''
            })
            if (allEntered) enteredCount++
          } else {
            const m = examMark.totalMark
            if (m !== undefined && m !== null && m !== '') {
              enteredCount++
            }
          }
        }
      })

      const isComplete = studentsList.length > 0 && enteredCount === studentsList.length
      if (!isComplete) {
        let typeLabel = a.type
        if (a.type === 'cts') typeLabel = 'Class Test'
        else if (a.type === 'midTerm') typeLabel = 'Mid Term'
        else if (a.type === 'final') typeLabel = 'Final Exam'
        else if (a.type === 'assignments') typeLabel = 'Assignment'
        else if (a.type === 'presentation') typeLabel = 'Presentation'
        else if (a.type === 'attendance') typeLabel = 'Attendance'
        else if (a.type === 'performance') typeLabel = 'Performance'

        const creditsVal = parseFloat(offering?.course?.creditHours || offering?.course?.numCredits) || 3
        const standardCTCount = Math.max(1, Math.floor(creditsVal))
        const isExtra = Boolean(a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct')))
        const displayName = isExtra ? `Extra CT (CT-${standardCTCount + 1})` : a.name

        list.push({
          type: 'marks',
          id: `marks_pending_${a._id}`,
          priority: 1, // High Priority
          title: `Pending Marks: ${displayName}`,
          text: `Marks for ${typeLabel} (${displayName}) are not fully entered. (${enteredCount}/${studentsList.length} student marks recorded)`,
          actionLabel: 'Enter Marks',
          actionTab: 'marksEntry',
          actionAssessmentId: a._id
        })
      }
    })

    // 2. Check Course Surveys (Only active if assessments exist)
    if (activeAssessments.length > 0) {
      if (survey) {
        const now = new Date()
        const closeDate = new Date(survey.closeDate)
        const openDate = new Date(survey.openDate)
        const surveyClosed = closeDate < now
        const surveyOpened = openDate <= now && !surveyClosed

        const formattedCloseDate = closeDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + ', ' + closeDate.getFullYear()

        if (survey.status === 'Published' && surveyOpened) {
          const daysLeft = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          list.push({
            type: 'survey',
            id: `survey_active_${survey._id}`,
            priority: 2, // Medium Priority
            title: 'Course Survey is Open',
            text: `The active questionnaire is open and closes on ${formattedCloseDate} (${daysLeft} day${daysLeft > 0 ? (daysLeft > 1 ? 's' : '') : 's'} remaining). Submissions: ${surveyResponsesCount} student${surveyResponsesCount === 1 ? '' : 's'}.`,
            actionLabel: 'Manage Survey',
            actionTab: 'evaluation'
          })
        } else if (survey.status === 'Draft') {
          list.push({
            type: 'survey',
            id: `survey_draft_${survey._id}`,
            priority: 3, // Low Priority
            title: 'Draft Survey Configured',
            text: `A course feedback survey is structured but has not been published yet. Students cannot access drafts.`,
            actionLabel: 'Publish Survey',
            actionTab: 'evaluation'
          })
        }
      } else {
        list.push({
          type: 'survey',
          id: `survey_missing_${offering._id}`,
          priority: 3, // Low Priority
          title: 'Setup Course Survey',
          text: `No student feedback survey is configured for this offering.`,
          actionLabel: 'Configure Survey',
          actionTab: 'evaluation'
        })
      }
    }

    // 3. Check Deadlines
    activeAssessments.forEach(a => {
      if (a.type === 'assignments' || a.type === 'presentation') {
        if (a.deadline) {
          const now = new Date()
          const deadlineDate = new Date(a.deadline)
          const daysDiff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          const formattedDeadline = deadlineDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + ', ' + deadlineDate.getFullYear()

          if (daysDiff > 0) {
            list.push({
              type: 'deadline_upcoming',
              id: `deadline_up_${a._id}`,
              priority: daysDiff <= 3 ? 1 : 2, // High priority if <= 3 days left
              title: `${a.type === 'presentation' ? 'Presentation Scheduled' : 'Assignment Deadline'}`,
              text: `${a.name} is due/scheduled on ${formattedDeadline} (in ${daysDiff} day${daysDiff > 1 ? 's' : ''}).`,
              actionLabel: 'View Details',
              actionTab: 'assessments'
            })
          } else if (a.status !== 'Evaluated') {
            const daysAgo = Math.abs(daysDiff)
            list.push({
              type: 'deadline_overdue',
              id: `deadline_over_${a._id}`,
              priority: 1, // Critical Overdue
              title: `Overdue: ${a.name}`,
              text: `${a.name} deadline passed on ${formattedDeadline} (${daysAgo} day${daysAgo > 1 ? 's' : ''} ago) and is pending evaluation.`,
              actionLabel: 'Evaluate Now',
              actionTab: 'marksEntry',
              actionAssessmentId: a._id
            })
          }
        }
      }
    })

    // 4. CO-PO Request Notifications for Teacher Reminders
    if (teacherRequests && teacherRequests.length > 0) {
      teacherRequests.forEach(req => {
        const courseCode = offering.course?.courseCode || 'course'
        const reviewTime = req.reviewedAt ? new Date(req.reviewedAt).getTime() : 0
        const isRecentDecision = !reviewTime || (Date.now() - reviewTime < 14 * 24 * 3600 * 1000)

        if (req.status === 'pending') {
          list.push({
            type: 'copo_request_pending',
            id: `copo_req_${req._id}`,
            priority: 2,
            title: 'CO-PO Edit Request Pending Review',
            text: `Your request to modify CO-PO mapping/add COs for ${courseCode} has been submitted to the Admin and is pending approval.`,
            actionLabel: 'View Request Tracker',
            actionTab: 'coMapping'
          })
        } else if (req.status === 'in_review') {
          list.push({
            type: 'copo_request_review',
            id: `copo_req_${req._id}`,
            priority: 1,
            title: 'CO-PO Request In Review 💬',
            text: `Your CO-PO modification request for ${courseCode} is currently under review by Department Dean / HOD.`,
            actionLabel: 'Track Progress',
            actionTab: 'coMapping'
          })
        } else if (req.status === 'approved' && isRecentDecision) {
          list.push({
            type: 'copo_request_approved',
            id: `copo_req_${req._id}`,
            priority: 2,
            title: 'CO-PO Request Approved! 🎉',
            text: `Your requested CO-PO changes for ${courseCode} have been approved by Admin and updated in Course Database.`,
            actionLabel: 'View Mappings',
            actionTab: 'coMapping'
          })
        } else if (req.status === 'rejected' && isRecentDecision) {
          list.push({
            type: 'copo_request_rejected',
            id: `copo_req_${req._id}`,
            priority: 1,
            title: 'CO-PO Request Rejected ❌',
            text: `Your CO-PO edit request for ${courseCode} was rejected by Admin. ${req.adminNote ? `Admin Note: "${req.adminNote}"` : ''}`,
            actionLabel: 'View Details',
            actionTab: 'coMapping'
          })
        }
      })
    }

    // Sort: lower priority number denotes higher importance
    list.sort((x, y) => x.priority - y.priority)
    return list
  }, [marksSpreadsheetData, survey, surveyResponsesCount, offering, teacherRequests])

  const reminders = useMemo(() => {
    return allRemindersList.filter(r => !dismissedReminderIds.includes(r.id))
  }, [allRemindersList, dismissedReminderIds])

  const handleReminderAction = (reminder) => {
    setActiveTab(reminder.actionTab)
    if (reminder.actionAssessmentId) {
      setSelectedAssessmentId(reminder.actionAssessmentId)
      initializeTempMarks(
        marksSpreadsheetData.marks,
        reminder.actionAssessmentId,
        marksSpreadsheetData.metadata[reminder.actionAssessmentId],
        marksSpreadsheetData.students
      )
    }
  }

  useEffect(() => {
    setQBankPath({ type: null, session: null, section: null })
    loadAllData()
  }, [propOffering])

  const loadAllData = async () => {
    if (!students || students.length === 0) {
      setLoading(true)
    }
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

      // 7. Fetch survey config and response analytics
      try {
        const surveyRes = await apiService.getSurveys(currentOffering._id)
        if (surveyRes && surveyRes.survey) {
          setSurvey(surveyRes.survey)
          try {
            const analytics = await apiService.getSurveyAnalytics(surveyRes.survey._id)
            setSurveyResponsesCount(analytics.responses?.length || 0)
          } catch (err) {
            console.error('Failed to load survey responses count:', err)
            setSurveyResponsesCount(0)
          }
        } else {
          setSurvey(null)
          setSurveyResponsesCount(0)
        }
      } catch (err) {
        console.error('Failed to load survey config for reminders:', err)
        setSurvey(null)
        setSurveyResponsesCount(0)
      }

      // 8. Fetch marks spreadsheet data for completeness check
      try {
        const res = await apiService.getMarksSpreadsheet(currentOffering._id)
        setMarksSpreadsheetData(res)
        if (res.assessments && res.assessments.length > 0) {
          if (!selectedAssessmentId) {
            setSelectedAssessmentId(res.assessments[0]._id)
            initializeTempMarks(res.marks, res.assessments[0]._id, res.metadata[res.assessments[0]._id], res.students)
          }
        }
      } catch (err) {
        console.error('Failed to load marks spreadsheet for overview:', err)
      }

      // 9. Fetch CO-PO requests for teacher
      try {
        if (currentOffering?.course?._id) {
          const reqRes = await apiService.getMyCOPORequests(currentOffering.course._id)
          setTeacherRequests(reqRes.requests || [])
        }
      } catch (err) {
        console.error('Failed to load teacher CO-PO requests:', err)
      }
 
      // 10. Fetch recent activities from database
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
      console.error('Error loading dashboard data:', err);
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

  const [restoredDraftInfo, setRestoredDraftInfo] = useState(null)

  const getMarksDraftKey = useCallback((asmtId) => {
    if (!offering?._id || !asmtId) return null
    return `obe_marks_draft_${offering._id}_${asmtId}`
  }, [offering?._id])

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

    // Check for local unsaved marks draft
    const draftKey = getMarksDraftKey(assessmentId)
    if (draftKey) {
      try {
        const savedDraftRaw = localStorage.getItem(draftKey)
        if (savedDraftRaw) {
          const savedDraft = JSON.parse(savedDraftRaw)
          if (savedDraft && savedDraft.tempMarks && Object.keys(savedDraft.tempMarks).length > 0) {
            Object.keys(savedDraft.tempMarks).forEach(sId => {
              if (temp[sId]) {
                temp[sId] = { ...temp[sId], ...savedDraft.tempMarks[sId] }
              }
            })
            setRestoredDraftInfo({
              timestamp: savedDraft.timestamp ? new Date(savedDraft.timestamp).toLocaleTimeString() : 'recently',
              assessmentId
            })
          } else {
            setRestoredDraftInfo(null)
          }
        } else {
          setRestoredDraftInfo(null)
        }
      } catch (e) {
        console.error('Failed to load local marks draft:', e)
        setRestoredDraftInfo(null)
      }
    } else {
      setRestoredDraftInfo(null)
    }

    setTempMarks(temp)
  }

  // Persist unsaved tempMarks to localStorage as draft
  useEffect(() => {
    if (selectedAssessmentId && offering?._id && Object.keys(tempMarks).length > 0) {
      const draftKey = getMarksDraftKey(selectedAssessmentId)
      if (draftKey) {
        try {
          localStorage.setItem(draftKey, JSON.stringify({
            tempMarks,
            timestamp: Date.now()
          }))
        } catch (e) {}
      }
    }
  }, [tempMarks, selectedAssessmentId, offering?._id, getMarksDraftKey])

  const handleDiscardMarksDraft = () => {
    const draftKey = getMarksDraftKey(selectedAssessmentId)
    if (draftKey) {
      try { localStorage.removeItem(draftKey) } catch (e) {}
    }
    setRestoredDraftInfo(null)
    initializeTempMarks(
      marksSpreadsheetData.marks,
      selectedAssessmentId,
      marksSpreadsheetData.metadata[selectedAssessmentId],
      marksSpreadsheetData.students
    )
  }

  const autoSaveMarks = async () => {
    if (!selectedAssessmentId || !offering?._id || !tempMarks || Object.keys(tempMarks).length === 0) return
    try {
      const questions = marksSpreadsheetData.metadata[selectedAssessmentId] || []
      const selectedAsmt = (marksSpreadsheetData.assessments || []).find(a => a._id === selectedAssessmentId)
      const isCTWithUniformCO = selectedAsmt && selectedAsmt.type === 'cts' && questions.length > 0 &&
        new Set(questions.map(q => (q.co || 'NONE').toUpperCase().replace(/[\s-_]/g, ''))).size === 1
      const isTotalMode = marksEntryMode === 'total' && isCTWithUniformCO

      let hasEnteredAnyMark = false

      const payload = (marksSpreadsheetData.students || []).map(s => {
        const sId = s._id
        const studentTemp = tempMarks[sId] || {}
        let totalMark = 0
        const questionMarks = {}
        let isEmpty = true

        if (questions && questions.length > 0) {
          if (isTotalMode) {
            const totalVal = studentTemp['_ctTotal']
            if (totalVal !== undefined && totalVal !== null && totalVal !== '') {
              const enteredTotal = parseFloat(totalVal) || 0
              const totalMaxMarks = questions.reduce((sum, q) => sum + (parseFloat(q.maxMarks) || 0), 0)
              questions.forEach(q => {
                const qMax = parseFloat(q.maxMarks) || 0
                const proportion = totalMaxMarks > 0 ? qMax / totalMaxMarks : 1 / questions.length
                const distributed = Math.round((enteredTotal * proportion) * 2) / 2
                questionMarks[q.questionNumber] = distributed
                totalMark += distributed
              })
              const diff = enteredTotal - totalMark
              if (Math.abs(diff) > 0.01 && questions.length > 0) {
                const lastQ = questions[questions.length - 1].questionNumber
                questionMarks[lastQ] = (questionMarks[lastQ] || 0) + diff
                totalMark = enteredTotal
              }
              isEmpty = false
              hasEnteredAnyMark = true
            }
          } else {
            questions.forEach(q => {
              const val = studentTemp[q.questionNumber]
              if (val !== undefined && val !== null && val !== '') {
                const markVal = parseFloat(val) || 0
                questionMarks[q.questionNumber] = markVal
                totalMark += markVal
                isEmpty = false
                hasEnteredAnyMark = true
              }
            })
          }
        } else {
          const val = studentTemp['marks']
          if (val !== undefined && val !== null && val !== '') {
            totalMark = parseFloat(val) || 0
            isEmpty = false
            hasEnteredAnyMark = true
          }
        }

        return { studentId: sId, questionMarks, totalMark, isEmpty }
      })

      if (hasEnteredAnyMark) {
        await apiService.saveMarksSpreadsheet(offering._id, {
          assessmentId: selectedAssessmentId,
          marks: payload
        })
        const draftKey = getMarksDraftKey(selectedAssessmentId)
        if (draftKey) {
          try { localStorage.removeItem(draftKey) } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Auto-save marks failed silently:', e)
    }
  }

  const handleAssessmentChange = async (id) => {
    await autoSaveMarks()
    setSelectedAssessmentId(id)
    initializeTempMarks(
      marksSpreadsheetData.marks,
      id,
      marksSpreadsheetData.metadata[id],
      marksSpreadsheetData.students
    )
  }

  const handleSpreadsheetMarkChange = (studentId, key, val, maxVal, questionsList = []) => {
    if (val !== '' && (isNaN(val) || parseFloat(val) < 0 || parseFloat(val) > maxVal)) {
      return // invalid
    }
    setTempMarks(prev => {
      const studentPrev = prev[studentId] || {}
      if (key === '_ctTotal') {
        const newObj = { ...studentPrev, _ctTotal: val }
        if (questionsList && questionsList.length > 0) {
          if (val === '') {
            questionsList.forEach(q => { newObj[q.questionNumber] = '' })
          } else {
            const enteredTotal = parseFloat(val) || 0
            const totalMaxMarks = questionsList.reduce((sum, q) => sum + (parseFloat(q.maxMarks) || 0), 0)
            let accum = 0
            questionsList.forEach(q => {
              const qMax = parseFloat(q.maxMarks) || 0
              const proportion = totalMaxMarks > 0 ? qMax / totalMaxMarks : 1 / questionsList.length
              const distributed = Math.round((enteredTotal * proportion) * 2) / 2
              newObj[q.questionNumber] = distributed
              accum += distributed
            })
            const diff = enteredTotal - accum
            if (Math.abs(diff) > 0.01 && questionsList.length > 0) {
              const lastQ = questionsList[questionsList.length - 1].questionNumber
              newObj[lastQ] = Math.round(((newObj[lastQ] || 0) + diff) * 2) / 2
            }
          }
        }
        return { ...prev, [studentId]: newObj }
      } else {
        const newObj = { ...studentPrev, [key]: val }
        delete newObj._ctTotal
        return { ...prev, [studentId]: newObj }
      }
    })
  }

  const saveSpreadsheetMarks = async () => {
    setSaving(true)
    try {
      const questions = marksSpreadsheetData.metadata[selectedAssessmentId] || []
      const selectedAsmt = (marksSpreadsheetData.assessments || []).find(a => a._id === selectedAssessmentId)
      const isCTWithUniformCO = selectedAsmt && selectedAsmt.type === 'cts' && questions.length > 0 &&
        new Set(questions.map(q => (q.co || 'NONE').toUpperCase().replace(/[\s-_]/g, ''))).size === 1
      const isTotalMode = marksEntryMode === 'total' && isCTWithUniformCO

      const payload = marksSpreadsheetData.students.map(s => {
        const sId = s._id
        const studentTemp = tempMarks[sId] || {}

        let totalMark = 0
        const questionMarks = {}
        let isEmpty = true

        if (questions && questions.length > 0) {
          if (isTotalMode) {
            // Total mode: distribute the entered total proportionally across questions
            const totalVal = studentTemp['_ctTotal']
            if (totalVal !== undefined && totalVal !== null && totalVal !== '') {
              const enteredTotal = parseFloat(totalVal) || 0
              const totalMaxMarks = questions.reduce((sum, q) => sum + (parseFloat(q.maxMarks) || 0), 0)
              questions.forEach(q => {
                const qMax = parseFloat(q.maxMarks) || 0
                const proportion = totalMaxMarks > 0 ? qMax / totalMaxMarks : 1 / questions.length
                const distributed = Math.round((enteredTotal * proportion) * 2) / 2 // round to nearest 0.5
                questionMarks[q.questionNumber] = distributed
                totalMark += distributed
              })
              // Adjust rounding difference on last question
              const diff = enteredTotal - totalMark
              if (Math.abs(diff) > 0.01 && questions.length > 0) {
                const lastQ = questions[questions.length - 1].questionNumber
                questionMarks[lastQ] = (questionMarks[lastQ] || 0) + diff
                totalMark = enteredTotal
              }
              isEmpty = false
            }
          } else {
            // Per-question mode
            questions.forEach(q => {
              const val = studentTemp[q.questionNumber]
              if (val !== undefined && val !== null && val !== '') {
                const markVal = parseFloat(val) || 0
                questionMarks[q.questionNumber] = markVal
                totalMark += markVal
                isEmpty = false
              }
            })
          }
        } else {
          const val = studentTemp['marks']
          if (val !== undefined && val !== null && val !== '') {
            totalMark = parseFloat(val) || 0
            isEmpty = false
          }
        }

        return {
          studentId: sId,
          questionMarks,
          totalMark,
          isEmpty
        }
      })

      await apiService.saveMarksSpreadsheet(offering._id, {
        assessmentId: selectedAssessmentId,
        marks: payload
      })

      const draftKey = getMarksDraftKey(selectedAssessmentId)
      if (draftKey) {
        try { localStorage.removeItem(draftKey) } catch (e) {}
      }
      setRestoredDraftInfo(null)

      alert('Marks saved and attainments calculated successfully!')
      loadAllData() // refresh assessments & attainment tables
      loadMarksSpreadsheet() // refresh database marks
    } catch (err) {
      alert('Failed to save marks: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Build create assessment payload based on type
  const buildAssessmentPayload = () => {
    const { type, maxMarks, durationValue, durationUnit, co, deadline, isExtraCT, parentCTId, parentCTName } = newAssessment
    const payload = { type, maxMarks, isExtraCT, parentCTId, parentCTName }

    if (type === 'cts' || type === 'midTerm' || type === 'final') {
      // Duration as formatted string
      const val = parseInt(durationValue) || 0
      if (durationUnit === 'Hours') {
        payload.examDuration = val === 1 ? '1 Hour' : `${val} Hours`
      } else {
        payload.examDuration = `${val} Minutes`
      }
    } else if (type === 'assignments' || type === 'presentation') {
      payload.deadline = deadline || null
    } else if (type === 'attendance' || type === 'performance') {
      payload.co = co || 'NONE'
    }

    return payload
  }

  // Smart defaults when assessment type changes
  const handleAssessmentTypeChange = (type) => {
    const defaults = { type, maxMarks: newAssessment.maxMarks, isExtraCT: false, parentCTId: '', parentCTName: '' }
    const credits = parseFloat(offering?.course?.creditHours || offering?.course?.numCredits) || 3
    const standardCTCount = Math.max(1, Math.floor(credits))

    if (type === 'cts') {
      const existingCTs = assessments.filter(a => a.type === 'cts')
      const stdCTs = existingCTs.filter(a => !a.isExtraCT)
      if (stdCTs.length >= standardCTCount && stdCTs.length > 0) {
        const parent = stdCTs[0]
        Object.assign(defaults, {
          isExtraCT: true,
          parentCTId: parent._id,
          parentCTName: parent.name,
          maxMarks: parent.maxMarks || 10,
          durationValue: 30,
          durationUnit: 'Minutes',
          co: parent.co || 'NONE',
          deadline: ''
        })
      } else {
        Object.assign(defaults, { maxMarks: 10, durationValue: 30, durationUnit: 'Minutes', co: 'NONE', deadline: '' })
      }
    } else if (type === 'midTerm') {
      Object.assign(defaults, { maxMarks: Math.round(credits * 30), durationValue: 90, durationUnit: 'Minutes', co: 'NONE', deadline: '' })
    } else if (type === 'final') {
      Object.assign(defaults, { maxMarks: Math.round(credits * 50), durationValue: 3, durationUnit: 'Hours', co: 'NONE', deadline: '' })
    } else if (type === 'assignments' || type === 'presentation') {
      Object.assign(defaults, { maxMarks: 10, durationValue: 0, durationUnit: 'Minutes', co: 'NONE', deadline: '' })
    } else if (type === 'attendance' || type === 'performance') {
      Object.assign(defaults, { maxMarks: type === 'attendance' ? 5 : 10, durationValue: 0, durationUnit: 'Minutes', co: 'NONE', deadline: '' })
    }
    setNewAssessment(defaults)
  }

  const openCreateModal = () => {
    const existingTypes = {}
    assessments.forEach(a => { existingTypes[a.type] = true })

    // Check if total marks cap is already reached
    const credits = parseFloat(offering?.course?.creditHours || offering?.course?.numCredits) || 3
    const courseMax = credits === 2 ? 200 : 300
    const currentTotal = assessments
      .filter(a => !(a.type === 'cts' && (a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct')))))
      .reduce((sum, a) => sum + (parseFloat(a.maxMarks) || 0), 0)

    if (currentTotal >= courseMax) {
      // Only allow Extra CT creation when cap is reached
      const stdCTs = assessments.filter(a => a.type === 'cts' && !a.isExtraCT)
      const standardCTCount = Math.max(1, Math.floor(credits))
      if (stdCTs.length >= standardCTCount && stdCTs.length > 0) {
        // Allow Extra CT
        handleAssessmentTypeChange('cts')
        setShowCreateDialog(true)
        return
      }
      alert(`Total allocated marks (${currentTotal}/${courseMax}) have reached the maximum for this ${credits}-credit course. No more assessments can be created except Extra CTs.`)
      return
    }

    let typeToUse = newAssessment.type || 'cts'
    if (['midTerm', 'final', 'attendance', 'performance', 'presentation'].includes(typeToUse) && existingTypes[typeToUse]) {
      typeToUse = 'cts'
    }
    handleAssessmentTypeChange(typeToUse)
    setShowCreateDialog(true)
  }

  // Create assessment
  const handleCreateAssessment = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = buildAssessmentPayload()
      await apiService.createAssessment(offering._id, payload)
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
          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-3 py-1.5 rounded-lg font-bold">
            Level {offering.course?.level || '1'}, Term {offering.course?.term || 'I'}
          </span>
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
          { id: 'students', label: 'Student Table', icon: Users },
          { id: 'assessments', label: 'Assessments', icon: ClipboardList },
          { id: 'questionBank', label: 'Question Bank', icon: FolderOpen },
          { id: 'marksEntry', label: 'Marks Entry', icon: CheckSquare },
          { id: 'attainment', label: 'Attainment', icon: Award },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
          { id: 'poRecommendation', label: 'PO Recommendation', icon: Award },
          { id: 'evaluation', label: 'Course Survey', icon: MessageSquare },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (activeTab === 'marksEntry') {
                  autoSaveMarks()
                }
                setActiveTab(tab.id)
              }}
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
              {/* Course Details (Left, Row 1) */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
                  {/* Top Header */}
                  <div className="flex items-center justify-between border-b pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200/80 shadow-xs">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Course Details</h3>
                        <p className="text-xs text-gray-500 font-medium">Academic course specifications & instructor overview</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-100/80 text-emerald-950 border border-emerald-300/80 text-xs font-medium rounded-lg shadow-xs">
                        {offering.course?.courseCode}
                      </span>
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium rounded-lg flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        Active Session
                      </span>
                    </div>
                  </div>

                  {/* Course Title Banner */}
                  <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-xl p-4 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-emerald-950/20">
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">Course Name & Subject</div>
                      <h4 className="text-lg font-extrabold tracking-tight text-white">{offering.course?.courseName}</h4>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs">
                        <Award size={14} className="text-emerald-300" />
                        {offering.course?.creditHours} Credit Hours
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                        <Layers size={14} className="text-indigo-600 shrink-0" />
                        <span>Level & Term</span>
                      </div>
                      <p className="text-indigo-950 font-medium text-xs bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 inline-block">
                        Level {offering.course?.level || '1'}, Term {offering.course?.term || 'I'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                        <GraduationCap size={14} className="text-emerald-600 shrink-0" />
                        <span>Department</span>
                      </div>
                      <p className="text-emerald-950 font-medium text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                        Department of {offering.course?.department || 'CSE'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                        <User size={14} className="text-blue-600 shrink-0" />
                        <span>Assigned Instructor</span>
                      </div>
                      <p className="text-slate-900 font-bold text-xs truncate">
                        {offering.teacher?.fullName || 'Not Assigned'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                        <Calendar size={14} className="text-teal-600 shrink-0" />
                        <span>Academic Session</span>
                      </div>
                      <p className="text-slate-900 font-medium text-xs">
                        {offering.semester?.semesterName} ({offering.academicYear})
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                        <Users size={14} className="text-purple-600 shrink-0" />
                        <span>Batch / Section</span>
                      </div>
                      <p className="text-purple-950 font-medium text-xs bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 inline-block">
                        {offering.batch?.batchName || 'Batch'} {offering.section ? `- Sec ${offering.section}` : ''}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1 hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                        <CheckSquare size={14} className="text-amber-600 shrink-0" />
                        <span>Course Outcomes</span>
                      </div>
                      <p className="text-amber-950 font-medium text-xs bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
                        {offering.course?.numCOs || 4} Mapped COs
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Reminders (Right, Row 1) */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 flex flex-col h-full lg:max-h-[383px] space-y-4">
                  <div className="flex items-center justify-between border-b pb-3.5 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200/80 shadow-xs">
                        <Bell size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800 tracking-tight">Course Reminders</h3>
                        <p className="text-[11px] text-gray-500 font-medium">Pending tasks & action items</p>
                      </div>
                    </div>
                    {reminders.length > 0 ? (
                      <span className="bg-rose-100/90 text-rose-900 border border-rose-300 text-xs px-2.5 py-0.5 rounded-full font-medium shadow-xs">
                        {reminders.length} Pending
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="overflow-y-auto pr-1 space-y-3 flex-1 min-h-0 max-h-[260px]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#10b981 transparent' }}>
                    {reminders.length === 0 ? (
                      <div className="text-center py-8 bg-emerald-50/40 rounded-xl border border-emerald-100 p-4">
                        <CheckCircle2 className="text-emerald-600 mx-auto mb-2" size={28} />
                        <p className="text-xs text-emerald-900 font-extrabold">All Caught Up!</p>
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">No pending reminders for this course.</p>
                      </div>
                    ) : (
                      reminders.map((reminder) => {
                        const isMandatory = isReminderMandatory(reminder)
                        const isAnimating = animatingDismissIds.includes(reminder.id)

                        let borderStyle = 'border-l-4 border-l-blue-500 bg-blue-50/30 border-gray-150'
                        let iconBg = 'bg-blue-50 border-blue-200 text-blue-700'
                        if (reminder.priority === 1) {
                          borderStyle = 'border-l-4 border-l-rose-500 bg-rose-50/20 border-gray-150'
                          iconBg = 'bg-rose-50 border-rose-200 text-rose-700'
                        } else if (reminder.priority === 2) {
                          borderStyle = 'border-l-4 border-l-amber-500 bg-amber-50/20 border-gray-150'
                          iconBg = 'bg-amber-50 border-amber-200 text-amber-800'
                        }

                        return (
                          <div
                            key={reminder.id}
                            className={`p-3 rounded-xl border flex items-start gap-2.5 hover:shadow-xs transition-all duration-300 transform ${
                              isAnimating
                                ? 'opacity-0 -translate-x-full scale-90 max-h-0 py-0 margin-0 overflow-hidden'
                                : 'opacity-100 translate-x-0 scale-100'
                            } ${borderStyle}`}
                          >
                            <div className={`p-1.5 rounded-lg border shrink-0 ${iconBg}`}>
                              <AlertCircle size={15} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-1">
                                <p className="text-xs font-extrabold text-slate-900 truncate pr-1">{reminder.title}</p>
                                {!isMandatory ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDismissReminder(reminder.id)
                                    }}
                                    className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                                    title="Dismiss notification"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                ) : (
                                  <span
                                    title="Action Required: This reminder cannot be deleted until completed"
                                    className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0"
                                  >
                                    Required
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 font-medium leading-snug">{reminder.text}</p>
                              <button
                                onClick={() => handleReminderAction(reminder)}
                                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-extrabold flex items-center gap-1 mt-1 hover:underline outline-none group"
                              >
                                <span>{reminder.actionLabel}</span>
                                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Assessment Summary (Left, Row 2) */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4 h-full">
                  <div className="flex items-center justify-between border-b pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/80 shadow-xs">
                        <ClipboardList size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Assessment Summary</h3>
                        <p className="text-xs text-gray-500 font-medium">Evaluation modules, mark distributions, & execution status</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium rounded-lg shadow-xs">
                      {assessments.length} Configured Modules
                    </span>
                  </div>

                  {assessments.length === 0 ? (
                    <p className="text-gray-500 text-sm py-6 text-center italic font-semibold">No assessments configured yet. Create one in the Assessments tab.</p>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-2xs">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 text-slate-700 font-semibold uppercase text-[11px] border-b border-gray-200 tracking-wider">
                            <th className="py-3 px-3.5">Assessment Name</th>
                            <th className="py-3 px-3">Creation Date</th>
                            <th className="py-3 px-3 text-center">Max Marks</th>
                            <th className="py-3 px-3 text-center">Questions</th>
                            <th className="py-3 px-3">Duration / Deadline</th>
                            <th className="py-3 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-gray-700 font-medium">
                          {assessments.map(a => {
                            const creditsVal = parseFloat(offering?.course?.creditHours || offering?.course?.numCredits) || 3
                            const standardCTCount = Math.max(1, Math.floor(creditsVal))
                            const isExtra = Boolean(a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct')))
                            const displayName = isExtra ? `Extra CT (CT-${standardCTCount + 1})` : a.name

                            // Determine Creation Date
                            let dateObj = null
                            if (a.createdAt) {
                              const d = new Date(a.createdAt)
                              if (!isNaN(d.getTime())) dateObj = d
                            }

                            if (!dateObj && a._id) {
                              try {
                                const hex = a._id.toString().substring(0, 8)
                                const ts = parseInt(hex, 16) * 1000
                                if (!isNaN(ts) && ts > 0) dateObj = new Date(ts)
                              } catch (err) {}
                            }

                            if (!dateObj && Array.isArray(activities) && activities.length > 0) {
                              const aNameLower = (a.name || '').toLowerCase().trim()
                              const aTypeLower = (a.type || '').toLowerCase().trim()

                              const matchAct = activities.find(act => {
                                const details = (act.details || '').toLowerCase()
                                const action = (act.action || '').toLowerCase()
                                const isCreate = action.includes('created') || details.includes('created')
                                if (!isCreate) return false

                                if (isExtra && (details.includes('extra ct') || details.includes('extra'))) return true
                                if (aNameLower && details.includes(aNameLower)) return true
                                if (aTypeLower === 'cts' && (details.includes('class test') || details.includes('ct'))) return true
                                if (aTypeLower === 'midterm' && details.includes('mid')) return true
                                if (aTypeLower === 'final' && details.includes('final')) return true
                                if (aTypeLower === 'assignments' && details.includes('assign')) return true
                                if (aTypeLower === 'attendance' && details.includes('attend')) return true
                                if (aTypeLower === 'performance' && details.includes('perform')) return true
                                if (aTypeLower === 'presentation' && details.includes('present')) return true

                                return false
                              })

                              if (matchAct && matchAct.createdAt) {
                                const d = new Date(matchAct.createdAt)
                                if (!isNaN(d.getTime())) dateObj = d
                              }
                            }

                            const formattedCreationDate = dateObj
                              ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                              : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

                            return (
                              <tr key={a._id} className="hover:bg-emerald-50/30 transition-colors">
                                <td className="py-3 px-3.5 font-extrabold text-slate-900">{displayName}</td>
                                <td className="py-3 px-3 text-slate-600 font-semibold">{formattedCreationDate}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-200/80 font-black text-xs rounded-md">
                                    {a.maxMarks}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center font-extrabold text-slate-700">{a.numQuestions || 0}</td>
                                <td className="py-3 px-3 font-semibold text-slate-700">
                                  {['assignments', 'presentation'].includes(a.type)
                                    ? (a.deadline ? new Date(a.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A')
                                    : (a.examDuration || 'N/A')}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {(() => {
                                    const status = getAssessmentStatus(a)
                                    let badgeStyle = 'bg-amber-50 text-amber-800 border border-amber-200'
                                    if (status === 'Evaluated') badgeStyle = 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                    else if (status === 'Assigned') badgeStyle = 'bg-blue-50 text-blue-800 border border-blue-200'
                                    return (
                                      <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-medium tracking-tight shadow-2xs ${badgeStyle}`}>
                                        {status}
                                      </span>
                                    )
                                  })()}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Status Explanation Legend */}
                  <div className="mt-4 pt-3.5 border-t border-gray-150 text-xs font-semibold">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full text-gray-500">
                      <div className="flex items-start gap-2.5 bg-amber-50/40 p-2.5 rounded-xl border border-amber-200/60">
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md font-medium bg-amber-100 text-amber-900 border border-amber-300">
                          Draft
                        </span>
                        <span className="leading-snug font-medium text-slate-700 text-[11px]">
                          Assessment templates, marks division, or Course Outcome (CO) mappings are incomplete.
                        </span>
                      </div>

                      <div className="flex items-start gap-2.5 bg-blue-50/40 p-2.5 rounded-xl border border-blue-200/60">
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md font-medium bg-blue-100 text-blue-900 border border-blue-300">
                          Assigned
                        </span>
                        <span className="leading-snug font-medium text-slate-700 text-[11px]">
                          Templates and mappings are complete. Ready for evaluation, but marks entry is pending.
                        </span>
                      </div>

                      <div className="flex items-start gap-2.5 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-200/60">
                        <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md font-medium bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Evaluated
                        </span>
                        <span className="leading-snug font-medium text-slate-700 text-[11px]">
                          Evaluation is complete. Student marks have been fully entered and recorded.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right panel: Recent Activities (Right, Row 2) */}
              <div className="lg:col-span-1 lg:relative min-h-[350px]">
                <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 flex flex-col gap-4 h-full lg:absolute lg:inset-0">
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3.5 gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200/80">
                              <History size={16} />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 tracking-tight">Recent Activities</h3>
                          </div>
                          <select
                            value={activityFilter}
                            onChange={(e) => setActivityFilter(e.target.value)}
                            className="text-[11px] bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-extrabold cursor-pointer shadow-2xs"
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
                          className="overflow-y-auto pr-1 space-y-4 flex-1" 
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
                        <div className="pt-3 border-t border-gray-100 flex justify-end shrink-0">
                          <button
                            onClick={handleResetActivities}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer select-none border border-transparent hover:border-red-200"
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
                const credits = parseFloat(offering?.course?.creditHours || offering?.course?.numCredits) || 3
                const standardCTCount = Math.max(1, Math.floor(credits))
                const ctAsmts = allAsmts.filter(a => a.type === 'cts')
                const stdCTs = ctAsmts.filter(a => !a.isExtraCT && !(a.name && a.name.toLowerCase().startsWith('extra ct')))

                // CTs
                ctAsmts.forEach(a => {
                  const qMeta = meta[a._id?.toString()] || []
                  const mappedCO = a.co || Array.from(new Set(qMeta.map(q => q.co).filter(c => c && c !== 'NONE'))).join(', ')
                  const isExtra = Boolean(a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct')))
                  const displayName = isExtra ? `Extra CT (CT-${standardCTCount + 1})` : a.name
                  cols.push({
                    id: a._id?.toString() || `cts_${a.name}`,
                    name: displayName,
                    parent: 'CT',
                    assessment: a,
                    isQuestion: false,
                    co: mappedCO,
                    maxMarks: parseFloat(a.maxMarks) || 0
                  })
                })

                // Best CT Total summary column (Only added IF AND ONLY IF an Extra CT exists!)
                const hasExtraCT = ctAsmts.some(a => Boolean(a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct'))))
                if (hasExtraCT && ctAsmts.length > 0) {
                  const maxBestCTTotal = credits === 2 ? 20 : 30
                  cols.push({
                    id: 'best_ct_total',
                    name: 'Best CT Total',
                    parent: 'CT',
                    isBestCTTotal: true,
                    co: `BEST ${stdCTs.length || standardCTCount}`,
                    maxMarks: maxBestCTTotal
                  })
                }

                // Others
                allAsmts.filter(a => ['assignments', 'presentation', 'attendance', 'performance'].includes(a.type)).forEach(a => {
                  const qMeta = meta[a._id?.toString()] || []
                  const mappedCO = a.co || Array.from(new Set(qMeta.map(q => q.co).filter(c => c && c !== 'NONE'))).join(', ')
                  cols.push({ id: a._id?.toString() || `${a.type}_${a.name}`, name: a.name === 'Presentation' ? 'Present.' : a.name === 'Assignment' ? 'Assign.' : a.name, parent: 'Others', assessment: a, isQuestion: false, co: mappedCO, maxMarks: parseFloat(a.maxMarks) || 0 })
                })
                // Mid Term
                allAsmts.filter(a => a.type === 'midTerm').forEach(a => {
                  const questions = meta[a._id?.toString()]
                  if (questions && questions.length > 0) {
                    questions.forEach(q => {
                      const qName = (q.questionNumber || '').toString().startsWith('Q') ? q.questionNumber : `Q${q.questionNumber}`
                      cols.push({ id: `${a._id}_q_${q.questionNumber}`, name: qName, parent: 'Mid Term', assessment: a, isQuestion: true, questionNumber: q.questionNumber, co: q.co, maxMarks: parseFloat(q.maxMarks) || 0 })
                    })
                  } else {
                    cols.push({ id: a._id?.toString() || `mid_${a.name}`, name: a.name, parent: 'Mid Term', assessment: a, isQuestion: false, co: a.co, maxMarks: parseFloat(a.maxMarks) || 0 })
                  }
                })
                // Term Final
                allAsmts.filter(a => a.type === 'final').forEach(a => {
                  const questions = meta[a._id?.toString()]
                  if (questions && questions.length > 0) {
                    questions.forEach(q => {
                      const qName = (q.questionNumber || '').toString().startsWith('Q') ? q.questionNumber : `Q${q.questionNumber}`
                      cols.push({ id: `${a._id}_q_${q.questionNumber}`, name: qName, parent: 'Term Final', assessment: a, isQuestion: true, questionNumber: q.questionNumber, co: q.co, maxMarks: parseFloat(q.maxMarks) || 0 })
                    })
                  } else {
                    cols.push({ id: a._id?.toString() || `final_${a.name}`, name: a.name, parent: 'Term Final', assessment: a, isQuestion: false, co: a.co, maxMarks: parseFloat(a.maxMarks) || 0 })
                  }
                })

                // Parent header section max marks and col-spans
                const contMax = credits === 2 ? 40 : 60
                const midMax = credits === 2 ? 60 : 90
                const finalMax = credits === 2 ? 100 : 150
                const courseTotalMax = credits === 2 ? 200 : 300

                const contSpan = cols.filter(c => c.parent === 'CT' || c.parent === 'Others').length
                const midSpan = cols.filter(c => c.parent === 'Mid Term').length
                const finalSpan = cols.filter(c => c.parent === 'Term Final').length

                // Total max marks (Set strictly to standard course total: 300 for 3-credits, 200 for 2-credits)
                const totalMax = courseTotalMax

                // Helper to get a student's mark for a specific column
                const getColMark = (student, col) => {
                  if (col.isBestCTTotal) {
                    let bestSum = 0
                    const activeStdCTs = stdCTs.length > 0 ? stdCTs : ctAsmts.slice(0, standardCTCount)
                    activeStdCTs.forEach(stdCT => {
                      const stdId = stdCT._id ? stdCT._id.toString() : ''
                      const extraList = ctAsmts.filter(a => (a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct'))) && (a.parentCTId?.toString() === stdId || a.parentCTName === stdCT.name || true))
                      const pairedGroup = [stdCT, ...extraList]
                      const marks = pairedGroup.map(asmt => parseFloat(getStudentAssessmentMark(student, asmt) || 0))
                      bestSum += Math.max(0, ...marks)
                    })
                    return bestSum
                  }
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

                // Compute student totals taking Best CTs for paired CT slots
                const studentTotals = {}
                const nonCTs = allAsmts.filter(a => a.type !== 'cts')

                students.forEach(s => {
                  let obtained = 0
                  // Non-CT assessments
                  nonCTs.forEach(a => {
                    obtained += parseFloat(getStudentAssessmentMark(s, a) || 0)
                  })

                  // CT slots (Standard CT + Extra CT pair best mark)
                  stdCTs.forEach(stdCT => {
                    const stdId = stdCT._id ? stdCT._id.toString() : ''
                    const extraList = ctAsmts.filter(a => a.isExtraCT && (a.parentCTId?.toString() === stdId || a.parentCTName === stdCT.name))
                    const pairedGroup = [stdCT, ...extraList]
                    const marks = pairedGroup.map(asmt => parseFloat(getStudentAssessmentMark(s, asmt) || 0))
                    obtained += Math.max(0, ...marks)
                  })

                  studentTotals[s.id] = obtained
                })

                // Compute column averages and batch average GPA
                let totalGP = 0
                let passCount = 0
                students.forEach(s => {
                  const pct = totalMax > 0 ? (studentTotals[s.id] / totalMax) * 100 : 0
                  const { gp } = getGradeAndGP(pct)
                  totalGP += gp
                  if (pct >= (attainmentData.kpiConfig?.targetPassMarks || 40)) {
                    passCount++
                  }
                })
                const avgGPA = students.length > 0 ? totalGP / students.length : 0
                const passRatePct = students.length > 0 ? ((passCount / students.length) * 100).toFixed(0) : 0
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
                      <tr key={student._id || student.id} className="hover:bg-green-50/30 transition-colors">
                        <td className="px-3 py-2 border border-gray-200 font-bold sticky left-0 bg-white group-hover:bg-green-50/20 z-20 w-[135px] text-xs text-gray-900">{student.id}</td>
                        <td className="px-3 py-2 border border-gray-200 font-semibold text-gray-800 text-xs">{student.name}</td>
                        <td className="px-3 py-2 border border-gray-200 text-center text-gray-400 italic font-medium text-xs">No assessments/marks entered yet.</td>
                      </tr>
                    ))
                  }

                  return sortedStudents.map(student => {
                    const totalScore = studentTotals[student.id] || 0
                    const pct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0
                    const { grade, gp } = getGradeAndGP(pct)
                    const isPassed = pct >= (attainmentData.kpiConfig?.targetPassMarks || 40)
                    return (
                      <tr key={student._id || student.id} className="group transition-colors duration-150 hover:bg-emerald-50/40">
                        <td className="px-3 py-2 border border-gray-200 font-bold sticky left-0 bg-white group-hover:bg-[#ecfdf5] transition-colors duration-150 z-20 text-gray-900 text-xs w-[135px] min-w-[135px] whitespace-nowrap">{student.id}</td>
                        <td className="px-3 py-2 border border-gray-200 font-semibold text-gray-800 sticky left-[135px] bg-white group-hover:bg-[#ecfdf5] transition-colors duration-150 z-20 w-[170px] min-w-[170px] truncate shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] text-xs">{student.name}</td>
                        {cols.map(col => (
                          <td key={col.id} className={`px-2 py-2 border border-gray-200 text-center text-xs transition-colors duration-150 ${col.isBestCTTotal ? 'bg-emerald-50/70 group-hover:bg-emerald-100/90 font-bold text-emerald-950 border-x border-green-300' : 'font-normal text-gray-700 group-hover:bg-emerald-50/30'}`}>
                            {getColMark(student, col)}
                          </td>
                        ))}
                        <td className="px-3 py-2 border border-gray-200 text-center font-bold text-emerald-950 bg-green-50/40 group-hover:bg-emerald-100/70 transition-colors duration-150 text-xs">{totalScore.toFixed(1)}</td>
                        <td className="px-3 py-2 border border-gray-200 text-center font-bold text-emerald-950 bg-emerald-50/60 group-hover:bg-emerald-100/80 transition-colors duration-150 text-xs">{pct.toFixed(1)}</td>
                        <td className="px-3 py-2 border border-gray-200 text-center font-bold text-gray-800 group-hover:bg-emerald-50/30 transition-colors duration-150 text-xs">{grade}</td>
                        <td className="px-3 py-2 border border-gray-200 text-center font-semibold text-gray-700 group-hover:bg-emerald-50/30 transition-colors duration-150 text-xs">{gp.toFixed(2)}</td>
                        <td className="px-3 py-2 border border-gray-200 text-center group-hover:bg-emerald-50/30 transition-colors duration-150 text-xs">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {isPassed ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                }

                const renderTableMarkup = (isFullscreen = false) => (
                  <div className={`border border-gray-200 rounded-xl bg-white shadow-inner overflow-auto ${isFullscreen ? 'h-full w-full max-h-full' : 'max-h-[600px]'}`}>
                    <table className="w-full border-collapse text-left text-xs" style={{ tableLayout: 'auto' }}>
                      <thead className="sticky top-0 z-30">
                        {hasAssessments && hasMarks ? (
                          <>
                            <tr className="bg-gradient-to-r from-emerald-900 via-green-800 to-emerald-900 text-white text-xs uppercase font-bold tracking-wider shadow-sm">
                              <th colSpan="2" className="px-3.5 py-3 border border-emerald-950 sticky left-0 bg-emerald-950 z-40 text-left font-bold w-[305px]">Student Info</th>
                              {contSpan > 0 && (
                                <th colSpan={contSpan} className="px-2 py-3 border border-emerald-950 bg-emerald-800 text-center font-bold">
                                  Continuous Assessment ({contMax} Marks)
                                </th>
                              )}
                              {midSpan > 0 && (
                                <th colSpan={midSpan} className="px-2 py-3 border border-emerald-950 bg-green-700 text-center font-bold">
                                  Mid Term ({midMax} Marks)
                                </th>
                              )}
                              {finalSpan > 0 && (
                                <th colSpan={finalSpan} className="px-2 py-3 border border-emerald-950 bg-emerald-800 text-center font-bold">
                                  Term-Final ({finalMax} Marks)
                                </th>
                              )}
                              <th colSpan="5" className="px-3.5 py-3 border border-emerald-950 bg-emerald-950 text-center font-bold">
                                Overall Results
                              </th>
                            </tr>
                            <tr className="bg-green-50/90 text-green-950 border-b-2 border-green-800 font-bold text-xs">
                              <th className="px-3 py-2.5 border border-green-300 sticky left-0 bg-green-50 z-40 w-[135px] min-w-[135px] font-bold text-green-950">Roll ID</th>
                              <th className="px-3 py-2.5 border border-green-300 sticky left-[135px] bg-green-50 z-40 w-[170px] min-w-[170px] truncate font-bold text-green-950 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">Student Name</th>
                              {cols.map(col => (
                                <th key={col.id} className={`px-2 py-2.5 border border-green-300 min-w-[80px] text-center ${col.isBestCTTotal ? 'bg-green-100/90 text-green-950 font-bold' : 'bg-green-50/90'}`}>
                                  <div className="text-xs font-bold text-green-950 tracking-tight">{col.name}</div>
                                  {col.co && <div className="text-[10px] font-semibold text-green-700">({col.co})</div>}
                                  <div className="text-[9px] font-normal text-gray-500">Max: {col.maxMarks}</div>
                                </th>
                              ))}
                              <th className="px-3 py-2.5 border border-green-300 min-w-[80px] bg-green-100/90 text-green-950 text-center font-bold">Total ({totalMax})</th>
                              <th className="px-3 py-2.5 border border-green-300 min-w-[80px] bg-emerald-100/90 text-emerald-950 text-center font-bold">Total (100)</th>
                              <th className="px-3 py-2.5 border border-green-300 min-w-[60px] bg-green-100/90 text-green-950 text-center font-bold">Grade</th>
                              <th className="px-3 py-2.5 border border-green-300 min-w-[60px] bg-green-100/90 text-green-950 text-center font-bold">CGPA</th>
                              <th className="px-3 py-2.5 border border-green-300 min-w-[75px] bg-green-100/90 text-green-950 text-center font-bold">Pass/Fail</th>
                            </tr>
                          </>
                        ) : (
                          <tr className="bg-green-700 text-white text-xs font-bold uppercase">
                            <th className="px-3 py-3 border border-green-800 w-[135px]">Roll ID</th>
                            <th className="px-3 py-3 border border-green-800 w-[170px]">Student Name</th>
                            <th className="px-3 py-3 border border-green-800 text-center">Status</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {renderTableBody(isFullscreen)}
                        {hasAssessments && hasMarks && students.length > 0 && (
                          <tr className="bg-green-100/90 font-bold text-green-950 border-t-2 border-green-800">
                            <td colSpan="2" className="px-3 py-2.5 border border-green-300 font-bold sticky left-0 bg-green-100 text-green-950 z-20 text-xs w-[305px]">
                              Class Average
                            </td>
                            {cols.map(col => {
                              const marksList = students.map(s => getColMark(s, col))
                              const avg = marksList.length > 0 ? marksList.reduce((sum, val) => sum + val, 0) / marksList.length : 0
                              return (
                                <td key={col.id} className="px-2 py-2 border border-green-300 text-center text-xs font-bold text-green-950 bg-green-50">
                                  {avg.toFixed(1)}
                                </td>
                              )
                            })}
                            <td className="px-3 py-2 border border-green-300 text-center font-bold text-green-950 bg-green-100 text-xs">{totalAvg.toFixed(1)}</td>
                            <td className="px-3 py-2 border border-green-300 text-center font-bold text-emerald-950 bg-emerald-100 text-xs">{(totalMax > 0 ? (totalAvg / totalMax) * 100 : 0).toFixed(1)}</td>
                            <td className="px-3 py-2 border border-green-300 text-center font-bold text-gray-500 text-xs">-</td>
                            <td className="px-3 py-2 border border-green-300 text-center font-bold text-green-950 bg-green-100 text-xs">Avg GPA: {avgGPA.toFixed(2)}</td>
                            <td className="px-3 py-2 border border-green-300 text-center font-bold text-green-900 bg-green-100 text-xs">
                              <span className="px-2 py-0.5 rounded-full bg-green-200 text-green-900 text-xs font-bold">
                                {passRatePct}% Pass
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )

                return (
                  <>
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100 space-y-4">
                      <div className="flex items-center justify-between border-b-2 border-green-800 pb-2">
                        <h3 className="text-lg font-black text-green-950 uppercase tracking-wide">
                          Student Table
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsTableFullscreen(true)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-800 border border-green-300 rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer group"
                          title="View Student Table Fullscreen"
                        >
                          <Maximize2 size={14} className="group-hover:scale-110 transition-transform text-green-700" />
                          <span>Full Screen</span>
                        </button>
                      </div>
                      {renderTableMarkup(false)}
                    </div>

                    {/* Fullscreen Table Modal */}
                    {isTableFullscreen && (
                      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 sm:p-6 flex flex-col items-center justify-center animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full h-full flex flex-col p-5 space-y-4 overflow-hidden">
                          <div className="flex items-center justify-between border-b border-gray-200 pb-3 shrink-0">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-green-100 text-green-800 rounded-xl border border-green-200">
                                <Users size={22} />
                              </div>
                              <div>
                                <h3 className="text-lg font-black text-green-950 uppercase tracking-wide flex items-center gap-2">
                                  Student Table — Full Screen View
                                </h3>
                                <p className="text-xs text-gray-500 font-medium">
                                  Comprehensive marks overview for <span className="font-bold text-gray-800">{offering.course?.courseCode} — {offering.course?.courseName}</span>
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsTableFullscreen(false)}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer border border-slate-300"
                              title="Exit Full Screen (Esc)"
                            >
                              <Minimize2 size={16} />
                              <span>Exit Full Screen</span>
                            </button>
                          </div>

                          <div className="flex-1 min-h-0 w-full overflow-hidden">
                            {renderTableMarkup(true)}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
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
                  onClick={openCreateModal}
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
                  {assessments.map(a => {
                    const isExamType = ['cts', 'midTerm', 'final'].includes(a.type)
                    const isSubmissionType = ['assignments', 'presentation'].includes(a.type)
                    const isDirectMarksType = ['attendance', 'performance'].includes(a.type)
                    const isExtra = Boolean(a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct')))
                    const targetParentName = a.parentCTName || (a.name?.match(/\(([^)]+)\)/)?.[1]?.replace(/^for\s+/i, '') || '')
                    const creditsVal = parseFloat(offering?.course?.creditHours || offering?.course?.numCredits) || 3
                    const standardCTCount = Math.max(1, Math.floor(creditsVal))

                    return (
                      <div key={a._id} className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-gray-800">
                                {isExtra ? `Extra CT (CT-${standardCTCount + 1})` : a.name}
                              </h3>
                              {isExtra && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  Extra CT
                                </span>
                              )}
                            </div>
                            {(() => {
                              const status = getAssessmentStatus(a)
                              let badgeStyle = 'bg-yellow-50 text-yellow-750 border border-yellow-250'
                              if (status === 'Evaluated') badgeStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-250'
                              else if (status === 'Assigned') badgeStyle = 'bg-blue-50 text-blue-700 border border-blue-205'
                              return (
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${badgeStyle}`}>
                                  {status}
                                </span>
                              )
                            })()}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 font-semibold">
                            <div>Type: <span className="font-bold text-gray-800 capitalize">{a.type === 'cts' ? 'CT' : a.type === 'midTerm' ? 'Mid Term' : a.type === 'final' ? 'Final' : a.type === 'assignments' ? 'Assignment' : a.type}</span></div>
                            <div>Max Marks: <span className="font-bold text-gray-800">{a.maxMarks}</span></div>
                            {isExamType && (
                              <>
                                <div>Questions: <span className="font-bold text-gray-800">{a.numQuestions || 0}</span></div>
                                <div>Duration: <span className="font-bold text-gray-800">{a.examDuration || 'N/A'}</span></div>
                              </>
                            )}
                            {isSubmissionType && (
                              <div className="col-span-2">Deadline: <span className="font-bold text-orange-700">{a.deadline ? new Date(a.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not Set'}</span></div>
                            )}
                            {(() => {
                              const qMeta = (marksSpreadsheetData.metadata || {})[a._id] || []
                              const displayCO = a.co || Array.from(new Set(qMeta.map(q => q.co).filter(c => c && c !== 'NONE'))).join(', ')
                              if (displayCO && displayCO !== 'NONE' && displayCO !== '') {
                                return <div className="col-span-2">Mapped CO: <span className="font-bold text-blue-700">{displayCO}</span></div>
                              } else {
                                return <div className="col-span-2">Mapped CO: <span className="font-bold text-gray-400">None</span></div>
                              }
                            })()}
                            {isExtra && targetParentName && (
                              <div className="col-span-2 text-indigo-900 bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-indigo-200/80 font-bold flex items-center justify-between text-xs mt-1">
                                <span className="text-indigo-700 font-semibold">Mapped Target:</span>
                                <span className="font-extrabold text-indigo-950 bg-white px-2 py-0.5 rounded shadow-xs border border-indigo-200">{targetParentName}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                          {!isDirectMarksType ? (
                            <button
                              onClick={() => setActiveAssessmentForPaper(a)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all"
                            >
                              <Edit size={14} />
                              Open Q.Paper
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Marks entry only</span>
                          )}
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
                    )
                  })}
                </div>
              )}

              {/* Create Assessment Dialog Modal */}
              {showCreateDialog && (() => {
                const isExam = ['cts', 'midTerm', 'final'].includes(newAssessment.type)
                const isSubmission = ['assignments', 'presentation'].includes(newAssessment.type)
                const isDirectMarks = ['attendance', 'performance'].includes(newAssessment.type)
                // Get allocated COs for the course
                const courseCOs = dbCourseOutcomes.length > 0
                  ? dbCourseOutcomes.map(o => o.code)
                  : Array.from({ length: offering.course?.numCOs || 4 }, (_, i) => `CO${i + 1}`)

                const singleTypes = ['midTerm', 'final', 'attendance', 'performance', 'presentation']
                const existingTypes = {}
                assessments.forEach(a => { existingTypes[a.type] = true })
                const isTypeDisabled = singleTypes.includes(newAssessment.type) && existingTypes[newAssessment.type]

                return (
                  <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border max-w-md w-full p-6 space-y-6">
                      <h3 className="text-xl font-bold text-gray-800 border-b pb-3">Create New Assessment</h3>
                      <form onSubmit={handleCreateAssessment} className="space-y-4 text-sm">
                        {/* Assessment Type */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Assessment Type</label>
                          <select
                            value={newAssessment.type}
                            onChange={(e) => handleAssessmentTypeChange(e.target.value)}
                            className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-semibold"
                          >
                            <option value="cts">Class Test (CT)</option>
                            <option value="midTerm" disabled={Boolean(existingTypes['midTerm'])}>
                              Mid Term Examination {existingTypes['midTerm'] ? '(Already Created)' : ''}
                            </option>
                            <option value="final" disabled={Boolean(existingTypes['final'])}>
                              Final Examination {existingTypes['final'] ? '(Already Created)' : ''}
                            </option>
                            <option value="assignments">
                              Assignment (Multiple Allowed)
                            </option>
                            <option value="attendance" disabled={Boolean(existingTypes['attendance'])}>
                              Attendance {existingTypes['attendance'] ? '(Already Created)' : ''}
                            </option>
                            <option value="performance" disabled={Boolean(existingTypes['performance'])}>
                              Class Performance {existingTypes['performance'] ? '(Already Created)' : ''}
                            </option>
                            <option value="presentation" disabled={Boolean(existingTypes['presentation'])}>
                              Presentation {existingTypes['presentation'] ? '(Already Created)' : ''}
                            </option>
                          </select>
                          {isTypeDisabled && (
                            <p className="text-[11px] font-bold text-red-600 mt-1.5 bg-red-50 p-2 rounded-xl border border-red-200">
                              This assessment type has already been created for this course offering. Only 1 instance is allowed.
                            </p>
                          )}
                        </div>

                        {/* Category Mark Limit Validation System */}
                        {(() => {
                          const credits = parseFloat(offering?.course?.creditHours || offering?.course?.numCredits) || 3
                          const continuousLimit = credits === 2 ? 40 : 60
                          const midLimit = credits === 2 ? 60 : 90
                          const finalLimit = credits === 2 ? 100 : 150

                          const isContinuous = ['cts', 'assignments', 'attendance', 'presentation', 'performance'].includes(newAssessment.type)
                          const isMid = newAssessment.type === 'midTerm'
                          const isFinal = newAssessment.type === 'final'

                          const currentContinuous = assessments
                            .filter(a => !(a.type === 'cts' && (a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct')))) && ['cts', 'assignments', 'attendance', 'presentation', 'performance'].includes(a.type))
                            .reduce((sum, a) => sum + (parseFloat(a.maxMarks) || 0), 0)

                          const currentMid = assessments
                            .filter(a => a.type === 'midTerm')
                            .reduce((sum, a) => sum + (parseFloat(a.maxMarks) || 0), 0)

                          const currentFinal = assessments
                            .filter(a => a.type === 'final')
                            .reduce((sum, a) => sum + (parseFloat(a.maxMarks) || 0), 0)

                          let prospective = 0
                          let limit = 60
                          let catName = ''

                          if (isContinuous) {
                            const addedMarks = newAssessment.isExtraCT ? 0 : (parseFloat(newAssessment.maxMarks) || 0)
                            prospective = currentContinuous + addedMarks
                            limit = continuousLimit
                            catName = 'Continuous Assessments (CTs, Assignments, Attendance, Presentation, Performance)'
                          } else if (isMid) {
                            prospective = currentMid + (parseFloat(newAssessment.maxMarks) || 0)
                            limit = midLimit
                            catName = 'Mid Term Examination'
                          } else if (isFinal) {
                            prospective = currentFinal + (parseFloat(newAssessment.maxMarks) || 0)
                            limit = finalLimit
                            catName = 'Final Term Examination'
                          }

                          // Overall course total check
                          const courseMax = credits === 2 ? 200 : 300
                          const currentTotal = assessments
                            .filter(a => !(a.type === 'cts' && (a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct')))))
                            .reduce((sum, a) => sum + (parseFloat(a.maxMarks) || 0), 0)
                          const addedForTotal = newAssessment.isExtraCT ? 0 : (parseFloat(newAssessment.maxMarks) || 0)
                          const prospectiveTotal = currentTotal + addedForTotal
                          const isOverCourseMax = prospectiveTotal > courseMax && !newAssessment.isExtraCT

                          return (
                            <>
                              {prospective > limit && (
                                <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-1 text-xs text-amber-900 shadow-sm">
                                  <div className="flex items-center gap-2 font-black text-amber-950">
                                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                                    <span>Category Mark Limit Warning ({prospective} / {limit} Marks)</span>
                                  </div>
                                  <p className="text-[11px] font-semibold text-amber-900 leading-relaxed">
                                    Adding this assessment will set total marks for <strong>{catName}</strong> to <strong>{prospective} Marks</strong>, which exceeds the standard limit of <strong>{limit} Marks</strong> for a {credits}-credit course (Total: {courseMax} Marks).
                                  </p>
                                </div>
                              )}
                              {isOverCourseMax && (
                                <div className="p-3 bg-red-50 border-2 border-red-400 rounded-xl space-y-1 text-xs text-red-900 shadow-sm">
                                  <div className="flex items-center gap-2 font-black text-red-950">
                                    <AlertTriangle size={18} className="text-red-600 shrink-0" />
                                    <span>Course Total Marks Exceeded ({prospectiveTotal} / {courseMax} Marks)</span>
                                  </div>
                                  <p className="text-[11px] font-semibold text-red-900 leading-relaxed">
                                    Total allocated marks across all assessments would be <strong>{prospectiveTotal} Marks</strong>, exceeding the maximum of <strong>{courseMax} Marks</strong> for a {credits}-credit course. Reduce the marks for this assessment or existing assessments. Only Extra CTs (which replace, not add) are allowed.
                                  </p>
                                  <p className="text-[10px] font-bold text-red-800 mt-1">
                                    Currently allocated: {currentTotal} / {courseMax} Marks — Available: {Math.max(0, courseMax - currentTotal)} Marks
                                  </p>
                                </div>
                              )}
                            </>
                          )
                        })()}

                        {/* Extra CT Notice & Target CT Selection */}
                        {newAssessment.type === 'cts' && (() => {
                          const credits = parseFloat(offering?.course?.creditHours || offering?.course?.numCredits) || 3
                          const standardCTCount = Math.max(1, Math.floor(credits))
                          const existingCTs = assessments.filter(a => a.type === 'cts')
                          const stdCTs = existingCTs.filter(a => !a.isExtraCT)
                          const isExtra = newAssessment.isExtraCT || stdCTs.length >= standardCTCount

                          if (isExtra && stdCTs.length > 0) {
                            const currentParent = stdCTs.find(c => c._id === newAssessment.parentCTId) || stdCTs[0]
                            return (
                              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs">
                                <div className="flex items-center gap-2 font-bold text-indigo-900">
                                  <AlertCircle size={16} className="text-indigo-600 shrink-0" />
                                  <span>Standard CT Limit ({stdCTs.length}/{standardCTCount} CTs) Reached</span>
                                </div>
                                <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
                                  Creating an <strong>Extra CT</strong> mapped to a standard CT. The system will calculate the <strong>Best Mark</strong> between them for total marks and CO attainment.
                                </p>

                                <div>
                                  <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                                    Target Standard CT to Map With:
                                  </label>
                                  <select
                                    value={currentParent._id}
                                    onChange={(e) => {
                                      const sel = stdCTs.find(c => c._id === e.target.value) || stdCTs[0]
                                      setNewAssessment({
                                        ...newAssessment,
                                        isExtraCT: true,
                                        parentCTId: sel._id,
                                        parentCTName: sel.name,
                                        maxMarks: sel.maxMarks || 10,
                                        co: sel.co || 'NONE'
                                      })
                                    }}
                                    className="w-full border border-indigo-300 px-3 py-2 rounded-lg bg-white font-extrabold text-indigo-950 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                                  >
                                    {stdCTs.map(ct => (
                                      <option key={ct._id} value={ct._id}>
                                        {ct.name} (Max: {ct.maxMarks}{ct.co && ct.co !== 'NONE' ? `, CO: ${ct.co}` : ''})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="text-[10px] font-semibold text-indigo-800 bg-indigo-100/60 px-2 py-1 rounded">
                                  Extra CT Name: <span className="font-bold text-indigo-950">Extra CT (CT-${standardCTCount + 1})</span>
                                </div>
                              </div>
                            )
                          }
                          return null
                        })()}

                        {/* Total Marks — all types */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-gray-700">Total Marks</label>
                            {newAssessment.isExtraCT && (
                              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                Auto-Mapped ({newAssessment.parentCTName || 'Target CT'})
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            min="1"
                            value={newAssessment.maxMarks}
                            disabled={Boolean(newAssessment.isExtraCT)}
                            onChange={(e) => !newAssessment.isExtraCT && setNewAssessment({ ...newAssessment, maxMarks: parseInt(e.target.value) || 0 })}
                            className={`w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-semibold ${newAssessment.isExtraCT ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-dashed' : 'bg-gray-50/50'}`}
                            required
                          />
                          {newAssessment.isExtraCT && (
                            <p className="text-[10px] text-indigo-600 mt-1 font-semibold italic">
                              Total Marks are locked to match {newAssessment.parentCTName || 'the target standard CT'}'s max marks. Only exam duration can be modified.
                            </p>
                          )}
                        </div>

                        {/* Duration — CT / Mid / Final only */}
                        {isExam && (
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Exam Duration</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                value={newAssessment.durationValue}
                                onChange={(e) => setNewAssessment({ ...newAssessment, durationValue: parseInt(e.target.value) || 0 })}
                                className="flex-1 border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-semibold"
                                placeholder="Duration"
                              />
                              <select
                                value={newAssessment.durationUnit}
                                onChange={(e) => setNewAssessment({ ...newAssessment, durationUnit: e.target.value })}
                                className="w-28 border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-semibold"
                              >
                                <option value="Minutes">Minutes</option>
                                <option value="Hours">Hours</option>
                              </select>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">Questions & CO mapping are set in the Q.Paper Editor after creation.</p>
                          </div>
                        )}

                        {/* Deadline — Assignment / Presentation only */}
                        {isSubmission && (
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Submission Deadline</label>
                            <input
                              type="date"
                              value={newAssessment.deadline}
                              onChange={(e) => setNewAssessment({ ...newAssessment, deadline: e.target.value })}
                              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-semibold"
                            />
                          </div>
                        )}

                        {/* CO Mapped — Attendance / Performance only */}
                        {isDirectMarks && (
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Mapped CO</label>
                            <select
                              value={newAssessment.co}
                              onChange={(e) => setNewAssessment({ ...newAssessment, co: e.target.value })}
                              className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-semibold"
                            >
                              <option value="NONE">None</option>
                              {courseCOs.map(co => (
                                <option key={co} value={co}>{co}</option>
                              ))}
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">No question paper needed — only marks entry after creation.</p>
                          </div>
                        )}

                        {/* Compute course total for submit button disable logic */}
                        {(() => {
                          const credits = parseFloat(offering?.course?.creditHours || offering?.course?.numCredits) || 3
                          const courseMax = credits === 2 ? 200 : 300
                          const currentTotal = assessments
                            .filter(a => !(a.type === 'cts' && (a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct')))))
                            .reduce((sum, a) => sum + (parseFloat(a.maxMarks) || 0), 0)
                          const addedForTotal = newAssessment.isExtraCT ? 0 : (parseFloat(newAssessment.maxMarks) || 0)
                          const prospectiveTotal = currentTotal + addedForTotal
                          const isOverCourseMax = prospectiveTotal > courseMax && !newAssessment.isExtraCT
                          const isDisabled = saving || isTypeDisabled || isOverCourseMax

                          return (
                            <div className="flex gap-3 pt-2">
                              <button
                                type="submit"
                                disabled={isDisabled}
                                className={`flex-1 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 ${isOverCourseMax ? 'bg-red-400 cursor-not-allowed text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                title={isOverCourseMax ? `Total marks (${prospectiveTotal}) exceed course max (${courseMax})` : ''}
                              >
                                {saving ? 'Creating...' : isOverCourseMax ? `Exceeds ${courseMax} Marks Limit` : 'Create'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowCreateDialog(false)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold border transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          )
                        })()}
                      </form>
                    </div>
                  </div>
                )
              })()}
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
          {activeTab === 'marksEntry' && (() => {
            const assessments = marksSpreadsheetData.assessments || []
            const selectedAssessment = assessments.find(a => a._id === selectedAssessmentId)
            const questions = selectedAssessment ? (marksSpreadsheetData.metadata[selectedAssessmentId] || []) : []
            const studentList = [...(marksSpreadsheetData.students || [])].sort((a, b) => {
              const numA = parseInt((a.id || '').toString().replace(/^\D+/g, ''), 10) || 0
              const numB = parseInt((b.id || '').toString().replace(/^\D+/g, ''), 10) || 0
              return numA - numB
            })
            const hasQuestions = questions && questions.length > 0

            const fullyEnteredCount = selectedAssessment ? studentList.filter(s => {
              const sMarks = tempMarks[s._id] || {}
              if (hasQuestions) {
                const qEntered = questions.every(q => sMarks[q.questionNumber] !== undefined && sMarks[q.questionNumber] !== '')
                const totalEntered = sMarks['_ctTotal'] !== undefined && sMarks['_ctTotal'] !== ''
                const hasAnyQ = questions.some(q => sMarks[q.questionNumber] !== undefined && sMarks[q.questionNumber] !== '')
                return qEntered || totalEntered || hasAnyQ
              } else {
                return sMarks['marks'] !== undefined && sMarks['marks'] !== ''
              }
            }).length : 0

            return (
              <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-extrabold text-gray-800">OBE Marks Sheet Spreadsheet</h3>
                      {selectedAssessment && (
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border transition-colors ${fullyEnteredCount === studentList.length ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {fullyEnteredCount === studentList.length ? '✓ Fully Entered' : `⚠️ Entered: ${fullyEnteredCount}/${studentList.length} Students`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-semibold">Spreadsheet-style entry. Total calculates dynamically on the fly.</p>
                  </div>

                  {assessments.length > 0 && (
                    <div className="flex items-center gap-2">
                       <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Selected Assessment:</label>
                      <select
                        value={selectedAssessmentId}
                        onChange={(e) => handleAssessmentChange(e.target.value)}
                        className="border border-gray-300 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 font-semibold text-sm"
                      >
                        {assessments.map(a => (
                          <option key={a._id} value={a._id}>{a.name} ({a.type})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {restoredDraftInfo && restoredDraftInfo.assessmentId === selectedAssessmentId && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-amber-800 text-sm font-semibold shadow-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                      <span>Restored unsaved draft marks from your previous session ({restoredDraftInfo.timestamp}). Click <strong>Save Spreadsheet Marks</strong> when ready.</span>
                    </div>
                    <button onClick={handleDiscardMarksDraft} className="text-xs bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-lg text-amber-900 font-bold transition-colors">
                      Discard Draft
                    </button>
                  </div>
                )}

                {assessments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No assessments configured yet. Create one in the Assessments tab.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      if (!selectedAssessment) return null

                      // Detect if this CT has all questions mapped to the same CO
                      const isCT = selectedAssessment.type === 'cts'
                      const uniqueCOs = hasQuestions ? new Set(questions.map(q => (q.co || 'NONE').toUpperCase().replace(/[\s-_]/g, ''))) : new Set()
                      const allSameCO = isCT && hasQuestions && uniqueCOs.size === 1 && !uniqueCOs.has('NONE')
                      const hasDifferentCOs = isCT && hasQuestions && uniqueCOs.size > 1
                      const showModeToggle = isCT && hasQuestions
                      const effectiveMode = showModeToggle ? (allSameCO ? marksEntryMode : 'perQuestion') : 'perQuestion'
                      const isTotalMode = effectiveMode === 'total'
                      const sharedCO = allSameCO ? questions[0]?.co : null

                      return (
                        <div className="space-y-4">
                          {/* Entry Mode Toggle for CTs */}
                          {showModeToggle && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-green-200 rounded-xl">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-green-900">Entry Mode:</span>
                                <select
                                  value={effectiveMode}
                                  onChange={(e) => setMarksEntryMode(e.target.value)}
                                  disabled={hasDifferentCOs}
                                  className={`border px-3 py-1.5 rounded-lg text-xs font-bold outline-none transition-all ${
                                    hasDifferentCOs
                                      ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                                      : 'border-green-400 bg-white text-green-900 focus:ring-2 focus:ring-green-500 cursor-pointer'
                                  }`}
                                >
                                  <option value="perQuestion">Per Question (Q1, Q2...)</option>
                                  <option value="total" disabled={hasDifferentCOs}>Total Marks (Single Entry)</option>
                                </select>
                              </div>
                              {hasDifferentCOs && (
                                <div className="text-[11px] font-semibold leading-relaxed text-amber-700">
                                  ⚠️ Questions have different COs ({Array.from(uniqueCOs).join(', ')}) — per-question entry is required for accurate CO attainment.
                                </div>
                              )}
                            </div>
                          )}

                          <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-[500px]">
                            <table className="w-full border-collapse text-sm text-left">
                              <thead className="bg-green-50/80 sticky top-0 z-10 border-b">
                                <tr>
                                  <th className="px-4 py-3 border-r font-bold text-gray-700 min-w-[120px]">Student ID</th>
                                  <th className="px-4 py-3 border-r font-bold text-gray-700 min-w-[200px]">Student Name</th>
                                  {isTotalMode ? (
                                    <th className="px-4 py-3 border-r font-bold text-gray-700 text-center min-w-[90px]">
                                      <div>Total Marks</div>
                                      <div className="text-[10px] text-gray-500 font-semibold">Max: {selectedAssessment.maxMarks} • {sharedCO}</div>
                                    </th>
                                  ) : hasQuestions ? (
                                    questions.map(q => (
                                      <th key={q.questionNumber} className="px-4 py-3 border-r font-bold text-gray-700 text-center min-w-[90px]">
                                        <div>{q.questionNumber}</div>
                                        <div className="text-[10px] text-gray-500 font-semibold">Max: {q.maxMarks} • {q.co}</div>
                                      </th>
                                    ))
                                  ) : (
                                    <th className="px-4 py-3 border-r font-bold text-gray-700 text-center min-w-[100px]">
                                      <div>Marks</div>
                                      <div className="text-[10px] text-gray-500 font-semibold">Max: {selectedAssessment.maxMarks}</div>
                                    </th>
                                  )}
                                  <th className="px-4 py-3 font-bold text-gray-700 text-center min-w-[90px]">{isTotalMode ? 'Entered' : 'Total Marks'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y font-semibold text-gray-700">
                                {studentList.map(s => {
                                  const sId = s._id
                                  const sMarks = tempMarks[sId] || {}

                                  // Calculate total
                                  let sum = 0
                                  if (isTotalMode) {
                                    sum = parseFloat(sMarks['_ctTotal']) || 0
                                  } else if (hasQuestions) {
                                    questions.forEach(q => {
                                      sum += parseFloat(sMarks[q.questionNumber]) || 0
                                    })
                                  } else {
                                    sum = parseFloat(sMarks['marks']) || 0
                                  }

                                  return (
                                    <tr key={sId} className="hover:bg-green-50/10">
                                      <td className="px-4 py-2 border-r font-bold text-gray-900 bg-white">{s.id}</td>
                                      <td className="px-4 py-2 border-r bg-white">{s.name}</td>
                                      {isTotalMode ? (
                                        <td className="px-2 py-1.5 border-r text-center">
                                          {(() => {
                                            let displayTotal = sMarks['_ctTotal']
                                            if (displayTotal === undefined || displayTotal === '') {
                                              const hasAnyQ = questions.some(q => sMarks[q.questionNumber] !== undefined && sMarks[q.questionNumber] !== '')
                                              if (hasAnyQ) {
                                                displayTotal = questions.reduce((acc, q) => acc + (parseFloat(sMarks[q.questionNumber]) || 0), 0)
                                              } else {
                                                displayTotal = ''
                                              }
                                            }
                                            return (
                                              <input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max={selectedAssessment.maxMarks}
                                                value={displayTotal}
                                                onChange={(e) => handleSpreadsheetMarkChange(sId, '_ctTotal', e.target.value, parseFloat(selectedAssessment.maxMarks), questions)}
                                                onWheel={(e) => e.target.blur()}
                                                className="w-16 border rounded px-1.5 py-1 text-center font-bold focus:ring-1 focus:ring-green-500 outline-none text-xs"
                                                placeholder="0"
                                              />
                                            )
                                          })()}
                                        </td>
                                      ) : hasQuestions ? (
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
                                                onWheel={(e) => e.target.blur()}
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
                                            max={selectedAssessment.maxMarks}
                                            value={sMarks['marks'] ?? ''}
                                            onChange={(e) => handleSpreadsheetMarkChange(sId, 'marks', e.target.value, selectedAssessment.maxMarks)}
                                            onWheel={(e) => e.target.blur()}
                                            className="w-16 border rounded px-1.5 py-1 text-center font-bold focus:ring-1 focus:ring-green-500 outline-none text-xs"
                                            placeholder="0"
                                          />
                                        </td>
                                      )}
                                      <td className="px-4 py-2 text-center text-gray-800 font-extrabold bg-gray-50/50">
                                        {sum.toFixed(1)} / {selectedAssessment.maxMarks}
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
            )
          })()}

          {/* TAB 6: CO-PO MAPPING */}
          {activeTab === 'coMapping' && (() => {
            const coListSorted = Array.from({ length: 12 }, (_, i) => `CO${i + 1}`)
            const poListSorted = Array.from({ length: 12 }, (_, i) => `PO${i + 1}`)

            // Combine DB COs + proposed COs for display
            const allDisplayCOs = [...coListSorted]
            proposedCOs.forEach(p => {
              if (!allDisplayCOs.includes(p.code)) {
                allDisplayCOs.push(p.code)
              }
            })

            const activeRequest = teacherRequests.find(r => r.status === 'pending' || r.status === 'in_review')
            const latestResolvedRequest = teacherRequests.find(r => r.status === 'approved' || r.status === 'rejected')

            return (
              <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-6">
                {/* Header with Edit Toggle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-800">Course Outcome (CO) - Program Outcome (PO) Mapping</h3>
                    <p className="text-xs text-gray-500 mt-1 font-semibold">
                      {isEditingCoMapping
                        ? '✏️ Editing Mode: Toggle mapping cells or add new COs below. Changes require Admin & HOD approval.'
                        : 'This mapping is master-managed by the Department. You can propose edits or add new COs for Admin approval.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isEditingCoMapping ? (
                      <button
                        onClick={handleToggleEditMapping}
                        disabled={!!activeRequest}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                        title={activeRequest ? 'You have an active request in review. Please wait for resolution.' : 'Edit Mapping / Add CO'}
                      >
                        <Edit size={16} />
                        Propose Mappings / Add CO
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleToggleEditMapping}
                          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition"
                        >
                          Cancel Editing
                        </button>

                        <button
                          onClick={handleSubmitRequestToAdmin}
                          disabled={submittingRequest}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-extrabold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50"
                        >
                          {submittingRequest ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Submit Request to Admin
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* CO-PO Matrix Table */}
                <div className="w-full overflow-hidden space-y-3">
                  {isEditingCoMapping && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center justify-between">
                      <span>💡 <strong>Click cells to toggle mapping.</strong> Yellow highlighted cells indicate your unsaved changes. Program Outcomes (POs) are institutionally fixed.</span>
                      <span className="font-bold bg-amber-200 px-2 py-0.5 rounded-md">Editing Active</span>
                    </div>
                  )}

                  <table className="w-full border-collapse border border-gray-200 table-fixed">
                    <thead>
                      {/* PO Names Row */}
                      <tr className="bg-gray-50 text-xs font-bold text-gray-600 border-b">
                        <th className="border px-1 py-3.5 w-[65px] sm:w-[75px] text-gray-700 bg-gray-100 font-black text-xs sm:text-sm text-center align-middle">CO \\ PO</th>
                        {poListSorted.map((poNum) => {
                          const dbPoDescription = dbProgramOutcomes.find(p => p.code.replace(/\s+/g, '').toUpperCase() === poNum)?.description || PO_NAMES[poNum]
                          const colorClass = PO_COLORS[poNum] || 'bg-gray-50'
                          const textColorClass = PO_TEXT_COLORS[poNum] || 'text-gray-700'
                          return (
                            <th
                              key={poNum}
                              className={`border px-0.5 py-3 text-center align-middle ${colorClass} ${textColorClass}`}
                              title={dbPoDescription}
                            >
                              <div className="font-black text-xs sm:text-sm mb-1 uppercase tracking-tight">{poNum}</div>
                              <div className="text-[9px] sm:text-[10px] font-semibold leading-tight break-words text-center px-0.5 opacity-95">
                                {dbPoDescription}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {allDisplayCOs.map((coNum) => {
                        const isDbCo = dbCourseOutcomes.some(c => c.code.replace(/\s+/g, '').toUpperCase() === coNum)
                        const isProposedNew = proposedCOs.some(p => p.code === coNum)
                        const hasExistingMapping = Object.values(coMapping[coNum] || {}).some(v => v === 1)
                        const isCoActive = isDbCo || isProposedNew || hasExistingMapping
                        const isMarkedDeleted = deletedCOs.includes(coNum)

                        let coLabelClass = 'bg-blue-50/30 text-blue-700 font-bold'
                        if (isProposedNew) {
                          coLabelClass = 'bg-purple-100 text-purple-900 font-black'
                        } else if (isMarkedDeleted) {
                          coLabelClass = 'bg-red-100 text-red-700 font-black line-through'
                        } else if (!isCoActive) {
                          coLabelClass = 'bg-gray-100/60 text-gray-400 font-semibold'
                        }

                        return (
                          <tr key={coNum} className={`transition-colors ${!isCoActive ? 'opacity-50 bg-gray-50/50' : 'hover:bg-green-50/20'}`}>
                            <td className={`border px-1 py-2.5 sm:py-3 text-center text-xs sm:text-sm align-middle ${coLabelClass}`}>
                              {coNum}
                              {isProposedNew && <span className="block text-[9px] text-purple-700 font-extrabold">(New)</span>}
                              {isMarkedDeleted && <span className="block text-[9px] text-red-700 font-extrabold">(Deleted)</span>}
                              {!isCoActive && <span className="block text-[9px] text-gray-400 font-medium">(Unadded)</span>}
                            </td>
                            {poListSorted.map((poNum) => {
                              const activeMappingSource = isEditingCoMapping ? editableCoMapping : coMapping
                              const isMapped = activeMappingSource[coNum]?.[poNum] === 1

                              // Check if cell was modified in edit mode
                              const origVal = coMapping[coNum]?.[poNum] === 1
                              const isModified = isEditingCoMapping && (origVal !== isMapped)

                              let cellBg = isMapped ? 'bg-green-500 text-white font-black shadow-xs' : 'bg-yellow-50/50 text-transparent'
                              if (isEditingCoMapping) {
                                if (!isCoActive || isMarkedDeleted) {
                                  cellBg = 'bg-gray-100/40 text-gray-300 cursor-not-allowed select-none'
                                } else if (isModified) {
                                  cellBg = isMapped
                                    ? 'bg-amber-500 text-white font-black ring-2 ring-amber-400 shadow-md animate-pulse cursor-pointer'
                                    : 'bg-amber-100 text-amber-900 font-bold ring-2 ring-amber-300 cursor-pointer'
                                } else if (isMapped) {
                                  cellBg = 'bg-green-500 hover:bg-green-600 text-white font-black cursor-pointer'
                                } else {
                                  cellBg = 'bg-gray-50 hover:bg-gray-100 text-transparent cursor-pointer'
                                }
                              }

                              const cellTitle = !isCoActive
                                ? `Course Outcome ${coNum} is not created yet. Propose ${coNum} below to enable mapping.`
                                : isMarkedDeleted
                                ? `Course Outcome ${coNum} is marked for deletion.`
                                : isEditingCoMapping
                                ? `Click to ${isMapped ? 'unmap' : 'map'} ${coNum} to ${poNum}`
                                : ''

                              return (
                                <td
                                  key={poNum}
                                  onClick={() => isEditingCoMapping && isCoActive && !isMarkedDeleted && handleCellClickInEditMode(coNum, poNum)}
                                  className={`border px-1 py-2.5 sm:py-3 text-center align-middle transition-all duration-150 select-none text-xs sm:text-base ${cellBg}`}
                                  title={cellTitle}
                                >
                                  {isMapped ? (isModified ? '+ ✓' : '✓') : (isModified ? '- ✗' : '')}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}

                      {/* Totals Row */}
                      <tr className="bg-gray-150/70 border-t-2 border-gray-300">
                        <td className="border px-1 py-3 font-black text-gray-700 bg-gray-200 text-center text-xs sm:text-sm align-middle">Total</td>
                        {poListSorted.map((poNum) => {
                          let total = 0
                          const currentMap = isEditingCoMapping ? editableCoMapping : coMapping
                          allDisplayCOs.forEach((coNum) => {
                            if (currentMap[coNum]?.[poNum] === 1) {
                              total++
                            }
                          })
                          return (
                            <td
                              key={poNum}
                              className="border px-1 py-3 text-center align-middle font-black text-gray-800 bg-gray-100/50 text-xs sm:text-sm"
                            >
                              {total}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Active Request Status Stepper (Rendered below CO-PO Matrix Table) */}
                {teacherRequests.length > 0 && (() => {
                  const currentReq = teacherRequests.find(r => r._id === selectedTeacherRequestId) || teacherRequests[0]
                  return (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-blue-600" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                            Request Status Tracker
                          </h4>
                          {teacherRequests.length > 1 && (
                            <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                              {teacherRequests.length} Requests Total
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {teacherRequests.length > 1 && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-bold text-gray-600">Select Request:</label>
                              <select
                                value={currentReq._id}
                                onChange={(e) => setSelectedTeacherRequestId(e.target.value)}
                                className="border border-blue-300 bg-white text-blue-900 text-xs font-black px-3 py-1.5 rounded-xl shadow-2xs outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {teacherRequests.map((r, idx) => (
                                  <option key={r._id} value={r._id}>
                                    Request #{teacherRequests.length - idx}: {r.requestType === 'edit_mapping' ? 'Mapping Edit' : r.requestType === 'add_co' ? 'New CO' : 'New CO & Edit'} [{r.status.toUpperCase()}] ({new Date(r.submittedAt).toLocaleDateString()})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <span className="text-[11px] font-extrabold text-gray-500">
                            Course: {offering.course?.courseCode}
                          </span>
                        </div>
                      </div>

                      <div key={currentReq._id} className="space-y-3">
                        {/* Stepper Progress Bar */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs font-extrabold pt-1">
                          <div className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
                            currentReq.status === 'pending' || currentReq.status === 'in_review' || currentReq.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            <CheckCircle2 size={14} />
                            1. Submitted
                          </div>

                          <div className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
                            currentReq.status === 'in_review'
                              ? 'bg-blue-100 text-blue-900 border-blue-400 animate-pulse'
                              : currentReq.status === 'approved' || currentReq.status === 'rejected'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            <MessageSquare size={14} />
                            2. In Review (Dean/HOD)
                          </div>

                          <div className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
                            currentReq.status === 'approved'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                              : currentReq.status === 'rejected'
                              ? 'bg-red-600 text-white border-red-700 shadow-sm'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {currentReq.status === 'approved' ? <CheckCircle2 size={14} /> : currentReq.status === 'rejected' ? <AlertTriangle size={14} /> : null}
                            3. {currentReq.status === 'approved' ? 'Approved & DB Updated' : currentReq.status === 'rejected' ? 'Rejected' : 'Final Decision'}
                          </div>
                        </div>

                        {/* Request Details Info */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs space-y-2 font-medium shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-gray-600 border-b pb-2">
                            <span>Request Type: <strong>{currentReq.requestType === 'edit_mapping' ? 'CO-PO Mapping Edit' : currentReq.requestType === 'add_co' ? 'New CO Proposal' : 'New CO & Mapping Edit'}</strong></span>
                            <div className="flex flex-wrap items-center gap-3 text-[11px]">
                              <span className="font-semibold text-gray-500">📅 Submitted: {currentReq.submittedAt ? new Date(currentReq.submittedAt).toLocaleString() : 'N/A'}</span>
                              {currentReq.reviewedAt && (
                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                  ✓ {currentReq.status === 'approved' ? 'Approved Date' : currentReq.status === 'rejected' ? 'Rejected Date' : 'Decision Date'}: {new Date(currentReq.reviewedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {currentReq.changesSummary && (
                            <p className="text-gray-800 font-semibold">Summary of Changes: {currentReq.changesSummary}</p>
                          )}
                          {currentReq.adminNote && (
                            <div className="mt-2 p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-950 font-bold space-y-1">
                              <div className="flex items-center gap-1.5 text-blue-900">
                                <MessageSquare size={14} className="text-blue-600" />
                                <span>Admin Response & Feedback:</span>
                              </div>
                              <p className="text-xs text-blue-950 font-medium pl-5">"{currentReq.adminNote}"</p>
                              {currentReq.reviewedBy && (
                                <span className="block text-[10px] text-blue-700 font-bold pl-5 mt-1">
                                  — Decision recorded by {currentReq.reviewedBy} on {new Date(currentReq.reviewedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Proposed New CO Form (Visible in Edit Mode) */}
                {isEditingCoMapping && (
                  <div className="p-5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2">
                        <Plus size={16} />
                        Propose New Course Outcome (CO)
                      </h4>
                      <span className="text-[11px] font-semibold text-purple-700">
                        Add extra COs to this course proposal
                      </span>
                    </div>

                    <form onSubmit={handleAddProposedCO} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">CO Code (Select Unused)</label>
                        {availableCoCodes.length > 0 ? (
                          <select
                            value={newCoForm.code}
                            onChange={(e) => setNewCoForm({ ...newCoForm, code: e.target.value })}
                            className="w-full border border-purple-300 px-3 py-2 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-purple-500 bg-white text-purple-900"
                          >
                            {availableCoCodes.map((code) => (
                              <option key={code} value={code}>
                                {code}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="p-2 bg-purple-100 border border-purple-300 rounded-xl text-xs font-bold text-purple-700 text-center">
                            All 12 COs Created
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">CO Description / Learning Objective</label>
                        <input
                          type="text"
                          placeholder="e.g. Students will construct design patterns using Java & OOP principles..."
                          value={newCoForm.description}
                          onChange={(e) => setNewCoForm({ ...newCoForm, description: e.target.value })}
                          disabled={availableCoCodes.length === 0}
                          className="w-full border border-purple-300 px-3 py-2 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500 bg-white disabled:opacity-50"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={availableCoCodes.length === 0}
                          className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Plus size={14} />
                          Add CO to Proposal
                        </button>
                      </div>
                    </form>

                    {/* Proposed COs List */}
                    {proposedCOs.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-purple-200">
                        <p className="text-[11px] font-bold text-purple-900 uppercase">Proposed New COs in this Request:</p>
                        <div className="space-y-2">
                          {proposedCOs.map((pCo) => (
                            <div key={pCo.code} className="flex items-center justify-between bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md text-xs">{pCo.code}</span>
                                <span className="text-xs font-semibold text-gray-800">{pCo.description}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveProposedCO(pCo.code)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Remove CO"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Outcomes Details Section from Database */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t pt-6 mt-8">
                  {/* CO Details */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-extrabold text-gray-800 flex items-center justify-between border-b pb-2">
                      <span className="flex items-center gap-2">
                        <span className="p-1 px-2.5 text-[10px] bg-blue-100 text-blue-700 rounded-md font-black">CO</span>
                        Course Outcomes (CO) Details
                      </span>
                      {isEditingCoMapping && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          Editing & Deletion Mode
                        </span>
                      )}
                    </h4>
                    {dbCourseOutcomes.length === 0 && proposedCOs.length === 0 ? (
                      <p className="text-sm text-gray-400 font-semibold italic">No Course Outcomes loaded from the database for this course.</p>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {dbCourseOutcomes.map((co) => {
                          const isMarkedDeleted = deletedCOs.includes(co.code)
                          const editedObj = editedCOs.find(e => e.code === co.code)
                          const isEditingThis = editingCoCode === co.code

                          return (
                            <div
                              key={co._id || co.code}
                              className={`p-3.5 rounded-xl border transition-all duration-200 ${
                                isMarkedDeleted
                                  ? 'bg-red-50/70 border-red-300 opacity-80'
                                  : editedObj
                                  ? 'bg-amber-50/60 border-amber-300'
                                  : 'bg-gray-50/30 hover:bg-blue-50/20 border-gray-150'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`font-black text-sm px-2 py-0.5 rounded-md ${
                                    isMarkedDeleted ? 'bg-red-100 text-red-700 line-through' : 'bg-blue-50/50 text-blue-700'
                                  }`}>
                                    {co.code}
                                  </span>
                                  {isMarkedDeleted && (
                                    <span className="text-[10px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                      Marked for Deletion
                                    </span>
                                  )}
                                  {editedObj && !isMarkedDeleted && (
                                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                      Edited Description
                                    </span>
                                  )}
                                </div>

                                {isEditingCoMapping && (
                                  <div className="flex items-center gap-1.5">
                                    {isMarkedDeleted ? (
                                      <button
                                        type="button"
                                        onClick={() => handleUnmarkCoForDeletion(co.code)}
                                        className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs"
                                      >
                                        Undo Deletion
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingCoCode(co.code)
                                            setEditingCoDesc(editedObj ? editedObj.description : co.description)
                                          }}
                                          className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition border border-blue-200 bg-white"
                                          title="Edit Description"
                                        >
                                          <Edit size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMarkCoForDeletion(co.code)}
                                          className="p-1.5 text-red-700 hover:bg-red-100 rounded-lg transition border border-red-200 bg-white"
                                          title="Delete CO from Course"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>

                              {isEditingThis ? (
                                <div className="space-y-2 mt-2">
                                  <textarea
                                    rows={2}
                                    value={editingCoDesc}
                                    onChange={(e) => setEditingCoDesc(e.target.value)}
                                    className="w-full p-2.5 text-xs border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                                  />
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setEditingCoCode(null)}
                                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditedCoDescription(co.code)}
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-extrabold shadow-xs"
                                    >
                                      Save Description
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className={`text-xs font-medium leading-relaxed ${isMarkedDeleted ? 'text-red-600 line-through' : editedObj ? 'text-amber-900 font-semibold' : 'text-gray-600'}`}>
                                  {editedObj ? editedObj.description : co.description}
                                </p>
                              )}
                            </div>
                          )
                        })}

                        {proposedCOs.map((pCo) => (
                          <div key={pCo.code} className="p-3.5 bg-purple-50/40 border border-purple-200 rounded-xl transition-all duration-200">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-black text-purple-700 text-sm bg-purple-100 px-2 py-0.5 rounded-md">{pCo.code} (Proposed New)</span>
                            </div>
                            <p className="text-xs text-gray-700 font-semibold leading-relaxed">{pCo.description}</p>
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
                      const currentMap = isEditingCoMapping ? editableCoMapping : coMapping
                      Object.keys(currentMap).forEach((coCode) => {
                        Object.keys(currentMap[coCode] || {}).forEach((poCode) => {
                          if (currentMap[coCode][poCode] === 1) {
                            mappedPoKeys.add(poCode)
                          }
                        })
                      })

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
                if (reportScope === 'combined' && !combinedBatchSpreadsheetData && !loadingCombinedBatch) {
                  setLoadingCombinedBatch(true)
                  apiService.getCombinedBatchSpreadsheet(offering._id)
                    .then(res => {
                      setCombinedBatchSpreadsheetData(res)
                      setLoadingCombinedBatch(false)
                    })
                    .catch(err => {
                      console.error('Failed to load combined batch spreadsheet:', err)
                      setLoadingCombinedBatch(false)
                    })
                }

                if (reportScope === 'combined' && (loadingCombinedBatch || !combinedBatchSpreadsheetData)) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                      <p className="mt-4 text-emerald-800 font-bold text-lg">Generating Combined Batch Report...</p>
                      <p className="text-sm text-gray-500 font-semibold">Aggregating students and assessment marks across all sections</p>
                    </div>
                  )
                }

                const activeSpreadsheetData = reportScope === 'combined' && combinedBatchSpreadsheetData
                  ? combinedBatchSpreadsheetData
                  : marksSpreadsheetData

                const activeStudents = (activeSpreadsheetData.students || []).map(s => ({ id: s.id, name: s.name, _id: s._id, section: s.section }))
                const activeAssessmentsList = activeSpreadsheetData.assessments || assessments

                const cts = activeAssessmentsList.filter(a => a.type === 'cts')
                const midTerm = activeAssessmentsList.filter(a => a.type === 'midTerm')
                const final = activeAssessmentsList.filter(a => a.type === 'final')
                const assignments = activeAssessmentsList.filter(a => a.type === 'assignments')
                const attendance = activeAssessmentsList.find(a => a.type === 'attendance')
                const performance = activeAssessmentsList.find(a => a.type === 'performance')
                const presentation = activeAssessmentsList.find(a => a.type === 'presentation')

                const structuredAssessments = {
                  cts,
                  midTerm,
                  final,
                  assignments,
                  attendance,
                  performance,
                  presentation
                }

                if (!activeSpreadsheetData.marks) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                      <p className="mt-4 text-gray-600 font-medium">Loading report calculations...</p>
                    </div>
                  )
                }

                const sectionsList = activeSpreadsheetData.sections || [offering.section]
                const sectionDisplayName = reportScope === 'combined'
                  ? (sectionsList.length > 1 ? `All Sections (${sectionsList.join(', ')})` : `Section ${offering.section}`)
                  : offering.section

                return (
                  <ComprehensiveReports
                    students={activeStudents}
                    marks={activeSpreadsheetData.marks || {}}
                    assessments={structuredAssessments}
                    coMapping={coMapping}
                    courseInfo={{
                      ...offering.course,
                      courseTitle: offering.course?.courseName,
                      teacherName: offering.teacher?.fullName,
                      teacherEmail: offering.teacher?.email,
                      batchName: offering.batch?.name || offering.batch?.batchName || 'N/A',
                      semesterName: offering.semester?.semesterName,
                      sectionName: sectionDisplayName,
                      rawSectionName: offering.section,
                      academicYear: offering.academicYear || offering.semester?.academicYear,
                    }}
                    targetPassMarks={attainmentData.kpiConfig?.targetPassMarks}
                    kpiCO={attainmentData.kpiConfig?.kpiCO}
                    kpiPO={attainmentData.kpiConfig?.kpiPO}
                    metadataMap={activeSpreadsheetData.metadata || {}}
                    dbCourseOutcomes={dbCourseOutcomes}
                    dbProgramOutcomes={dbProgramOutcomes}
                    reportScope={reportScope}
                    onReportScopeChange={setReportScope}
                  />
                )
              })()}
            </div>
          )}

          {/* TAB 9: COURSE SURVEY */}
          {activeTab === 'evaluation' && (
            <CourseSurvey offering={offering} />
          )}

          {/* TAB 10: PO RECOMMENDATION */}
          {activeTab === 'poRecommendation' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6">
              <PORecommendationMatrix offering={offering} initialStudentList={students} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
