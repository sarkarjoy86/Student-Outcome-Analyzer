import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Download,
  Edit3,
  Check,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Award,
  ArrowLeft,
  Loader2,
  Info,
  CheckCircle2,
  AlertCircle,
  Users
} from 'lucide-react'
import { apiService } from '../../services/apiService'
import { BAIUST_LOGO } from '../marks/baiustLogo'

export default function CourseEvaluationByTeacher({
  offering,
  surveyId,
  courseOutcomes: propCOs = [],
  programOutcomes: propPOs = [],
  coMapping = {},
  onBack,
}) {
  const [loading, setLoading] = useState(true)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiSource, setAiSource] = useState('cached') // 'gemini' | 'cached' | 'fallback'
  const [isEditing, setIsEditing] = useState(false)
  const [evalData, setEvalData] = useState(null)
  const [surveyAnalytics, setSurveyAnalytics] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [dbCourseOutcomes, setDbCourseOutcomes] = useState(propCOs || [])
  const [dbProgramOutcomes, setDbProgramOutcomes] = useState(propPOs || [])

  useEffect(() => {
    if (propCOs && propCOs.length > 0) setDbCourseOutcomes(propCOs)
    if (propPOs && propPOs.length > 0) setDbProgramOutcomes(propPOs)

    const fetchOutcomes = async () => {
      const courseId = offering?.course?._id || offering?.course
      if (courseId && (!propCOs || propCOs.length === 0)) {
        try {
          const res = await apiService.getCourseOutcomes(courseId)
          if (res?.outcomes) setDbCourseOutcomes(res.outcomes)
        } catch (e) {}
      }
      if (!propPOs || propPOs.length === 0) {
        try {
          const pRes = await apiService.getProgramOutcomes()
          if (Array.isArray(pRes)) setDbProgramOutcomes(pRes)
          else if (pRes?.outcomes) setDbProgramOutcomes(pRes.outcomes)
        } catch (e) {}
      }
    }
    fetchOutcomes()
  }, [offering?.course, propCOs, propPOs])

  const course = offering?.course || {}
  const courseCode = course.courseCode || 'CSE 321'
  const courseTitle = course.courseName || 'Data Communications'
  const teacher = offering?.teacher || {}
  const teacherName = teacher.fullName || teacher.name || 'Instructor'
  const teacherDesignation = teacher.designation || 'Lecturer / Assistant Professor'
  
  // Safe field resolvers for metadata (prevents React child object errors)
  const semObj = offering?.semester && typeof offering.semester === 'object' ? offering.semester : null
  const semesterName = semObj?.semesterName || semObj?.name || (typeof offering?.semester === 'string' ? offering.semester : '') || (typeof offering?.semesterName === 'string' ? offering.semesterName : 'Fall')
  const academicYear = semObj?.academicYear || semObj?.year || (typeof offering?.academicYear === 'string' || typeof offering?.academicYear === 'number' ? String(offering.academicYear) : String(new Date().getFullYear()))

  const codeNum = ((courseCode || '').match(/\d+/) || ['321'])[0]
  const levelText = offering?.batch?.level ? String(offering.batch.level) : (offering?.level ? String(offering.level) : (codeNum[0] ? `${codeNum[0]}` : '3'))
  const termNum = codeNum[1] ? (parseInt(codeNum[1], 10) > 1 ? 'II' : 'I') : 'I'
  const termText = offering?.batch?.term ? String(offering.batch.term) : (offering?.term ? (offering.term === 1 ? 'I' : offering.term === 2 ? 'II' : String(offering.term)) : termNum)
  const groupText = typeof offering?.group === 'string' ? offering.group : 'N/A'

  const allSecs = offering?.allSections || []
  let sectionText = 'A'
  if (Array.isArray(allSecs) && allSecs.length > 1) {
    const cleanList = Array.from(new Set(allSecs.map(s => (typeof s === 'string' ? s : s?.name || '').replace(/^(section|sec)[\s-_]*/i, '').trim().toUpperCase()))).filter(Boolean)
    if (cleanList.length === 2) {
      sectionText = `${cleanList[0]} & ${cleanList[1]}`
    } else if (cleanList.length > 2) {
      sectionText = cleanList.join(', ')
    }
  } else if (typeof offering?.section === 'string') {
    sectionText = offering.section.replace(/^(section|sec)[\s-_]*/i, '').trim().toUpperCase() || 'A'
  }

  const cacheKey = `COURSE_EVALUATION_CACHE_${courseCode.replace(/\s+/g, '_')}_${offering?._id || 'DEFAULT'}`

  // Domain-specific keywords for deep fallback content
  const getSubjectDomain = (title) => {
    const lower = (title || '').toLowerCase()
    if (lower.includes('image') || lower.includes('dip') || lower.includes('vision')) {
      return {
        domain: 'Digital Image Processing',
        keywords: 'image enhancement, spatial filtering, morphological operations, Fourier transforms, and image segmentation',
        topics: 'segmentation algorithms, frequency domain filtering, and real-world image datasets',
        practical: 'practical OpenCV/MATLAB exercises, image feature extraction, and real-world image datasets',
        tools: 'MATLAB, Python OpenCV, and image analysis toolboxes'
      }
    }
    if (lower.includes('data comm') || lower.includes('communication') || lower.includes('telecom')) {
      return {
        domain: 'Data Communications',
        keywords: 'data transmission, modulation techniques, signal encoding, multiplexing, and error detection',
        topics: 'digital and analog modulation, transmission media, constellation diagrams, and packet switching',
        practical: 'numerical transmission calculations, signal analysis exercises, and simulation tools',
        tools: 'simulation software, signal analysis tools, and Wireshark'
      }
    }
    if (lower.includes('network') || lower.includes('networking')) {
      return {
        domain: 'Computer Networks',
        keywords: 'OSI layers, TCP/IP protocol suite, routing algorithms, socket programming, and subnetting',
        topics: 'routing protocols (OSPF, BGP), congestion control, and transport layer handshakes',
        practical: 'Cisco Packet Tracer topologies, network packet analysis, and socket programming',
        tools: 'Cisco Packet Tracer, Wireshark, and Linux network utilities'
      }
    }
    if (lower.includes('algorithm')) {
      return {
        domain: 'Algorithms',
        keywords: 'asymptotic complexity, divide and conquer, greedy strategies, dynamic programming, and graph traversals',
        topics: 'graph theory algorithms, dynamic programming formulations, and NP-completeness',
        practical: 'stepwise algorithmic problem-solving labs, complexity benchmarking, and competitive programming problems',
        tools: 'C++ STL, algorithmic visualizers, and online judge platforms'
      }
    }
    if (lower.includes('object oriented') || lower.includes('oop') || lower.includes('c++')) {
      return {
        domain: 'Object Oriented Programming',
        keywords: 'encapsulation, inheritance, polymorphism, templates, exception handling, and memory management',
        topics: 'design patterns, operator overloading, generic templates, and multi-threaded programming',
        practical: 'interactive coding assignments, class hierarchy designs, and mini desktop software development',
        tools: 'Modern C++ compilers, CLion/Visual Studio, and Valgrind'
      }
    }
    if (lower.includes('database') || lower.includes('dbms')) {
      return {
        domain: 'Database Systems',
        keywords: 'relational algebra, ER modeling, SQL schema design, normalization (1NF-BCNF), and transaction ACID properties',
        topics: 'indexing techniques, query optimization, concurrency control, and stored procedures',
        practical: 'real-world database modeling projects, SQL query challenges, and indexing optimization',
        tools: 'PostgreSQL, MySQL Workbench, and Oracle DB'
      }
    }
    return {
      domain: title || 'Core Engineering Course',
      keywords: 'core theoretical concepts, problem-solving methodologies, analytical modeling, and practical implementations',
      topics: 'advanced theoretical principles, system design, and practical troubleshooting',
      practical: 'structured practical exercises, numerical problem-solving, and laboratory walkthroughs',
      tools: 'specialized engineering software, analytical simulation tools, and reference documentation'
    }
  }

  const domainInfo = useMemo(() => getSubjectDomain(courseTitle), [courseTitle])

  // Initial calculation / default fallback data generator
  // Initial calculation / authentic survey data processor
  const generateFallbackData = (analyticsData = null) => {
    const totalResponses = analyticsData?.responses?.length || 0
    const hasResponses = totalResponses > 0

    // Determine real rating averages if available
    const getAvg = (qIdx, maxScale = 5) => {
      if (!hasResponses) return 'N/A'
      if (!analyticsData?.questionScores || !analyticsData.questionScores[qIdx]) return 'N/A'
      const qs = analyticsData.questionScores[qIdx]
      if (!qs.count || qs.count === 0) return 'N/A'
      return `${(qs.sum / qs.count).toFixed(2)} / ${maxScale}`
    }

    const sec1Ratings = [
      { aspect: 'Clearly stated learning outcomes', rating: getAvg(0, 5) },
      { aspect: 'Problem-solving skill development', rating: getAvg(1, 5) },
      { aspect: 'Application of engineering principles', rating: getAvg(2, 5) },
      { aspect: 'Teamwork and collaboration skills', rating: getAvg(3, 5) },
      { aspect: 'Ethical and professional responsibility', rating: getAvg(4, 5) }
    ]

    const sec2Ratings = [
      { aspect: 'Course content relevance and structure', rating: getAvg(5, 5) },
      { aspect: 'Balance between theory and practical applications', rating: getAvg(6, 5) },
      { aspect: 'Usefulness of assignments and practical activities', rating: getAvg(7, 5) },
      { aspect: 'Real-world problem and application integration', rating: getAvg(8, 5) },
      { aspect: 'Helpfulness of laboratory/tutorial sessions', rating: getAvg(9, 5) }
    ]

    const sec3Ratings = [
      { aspect: 'Clear communication of concepts', rating: getAvg(10, 5) },
      { aspect: 'Responsiveness and support for students', rating: getAvg(11, 5) },
      { aspect: 'Encouraging critical thinking and innovation', rating: getAvg(12, 5) },
      { aspect: 'Useful feedback on assignments', rating: getAvg(13, 5) },
      { aspect: 'Positive and engaging classroom environment', rating: getAvg(14, 5) }
    ]

    const sec4Ratings = [
      { aspect: 'Fairness and transparency of grading', rating: getAvg(15, 5) },
      { aspect: 'Appropriateness of workload', rating: getAvg(16, 5) },
      { aspect: 'Alignment of exams/assessments with course content', rating: getAvg(17, 5) },
      { aspect: 'Development of communication and transferable skills', rating: getAvg(18, 5) },
      { aspect: 'Support for lifelong learning and professional development', rating: getAvg(19, 5) }
    ]

    const sec5Ratings = [
      { aspect: 'Handling or application of core knowledge (Science & Math)', rating: getAvg(20, 10) },
      { aspect: 'Research and analytical capability', rating: getAvg(21, 10) },
      { aspect: 'Ability to address or solve relevant problems / Modern tools', rating: getAvg(22, 10) },
      { aspect: 'Professional ethics and social responsibility', rating: getAvg(23, 10) },
      { aspect: 'Teamwork, communication, and project management skills', rating: getAvg(24, 10) },
      { aspect: 'Lifelong learning capability', rating: getAvg(25, 10) }
    ]

    let overviewText = ''
    if (hasResponses) {
      let totalRatingSum = 0
      let totalRatingCount = 0
      analyticsData?.questionScores?.forEach(qs => {
        totalRatingSum += qs.sum
        totalRatingCount += qs.count
      })
      const overallMean = totalRatingCount > 0 ? (totalRatingSum / totalRatingCount).toFixed(2) : '0.00'
      overviewText = `The course evaluation data reflects authentic feedback from ${totalResponses} student respondent(s) regarding the ${courseTitle} (${courseCode}) course. Across the surveyed OBE criteria, the overall student mean rating is ${overallMean} out of 5.00. The feedback confirms meaningful student engagement and learning outcome achievement, supported by structured lectures, problem-solving tutorials, and continuous assessments.`
    } else {
      overviewText = `No student feedback submissions have been recorded for this course survey yet (0 student submissions received). Quantitative survey ratings and student comments are marked as N/A until students submit their survey responses. The instructional objectives, resource planning, and academic goals below represent the instructor's baseline course delivery framework for ${courseTitle} (${courseCode}).`
    }

    // Extract real student comments if available
    const extractedPositive = []
    const extractedImprovement = []
    if (hasResponses && analyticsData?.responses) {
      analyticsData.responses.forEach(resp => {
        const cObj = resp.comments || {}
        const getVal = (k) => (cObj.get && typeof cObj.get === 'function') ? cObj.get(k) : cObj[k]
        
        const learned = getVal('learned') || getVal('feedback1')
        if (learned && typeof learned === 'string' && learned.trim()) {
          extractedPositive.push(learned.trim())
        }
        const improved = getVal('improved') || getVal('feedback2')
        if (improved && typeof improved === 'string' && improved.trim()) {
          extractedImprovement.push(improved.trim())
        }
        const addComments = getVal('additionalComments') || getVal('feedback3')
        if (addComments && typeof addComments === 'string' && addComments.trim()) {
          extractedPositive.push(addComments.trim())
        }
      })
    }

    return {
      submissionCount: totalResponses,
      overview: overviewText,
      
      strengths: {
        learningOutcomes: {
          table: sec1Ratings,
          reflection: hasResponses 
            ? `The structured lectures, guided problem-solving sessions, and collaborative activities supported students in achieving the course learning outcomes effectively. Students demonstrated strong conceptual understanding of ${domainInfo.domain} principles and their practical engineering applications.`
            : `Course delivery was organized to align all instructional modules with the approved Course Learning Outcomes (CLOs) for ${courseTitle}. Assessment instruments and classroom tutorials were structured to reinforce core ${domainInfo.domain} concepts.`
        },
        courseContent: {
          table: sec2Ratings,
          reflection: hasResponses
            ? `The integration of real-world ${domainInfo.domain} examples, numerical problem-solving, and practical demonstrations helped students better understand theoretical concepts. Maintaining this balance between theory and application is essential for student engagement and industrial readiness.`
            : `The syllabus content was structured to provide a balanced treatment of fundamental theory and engineering applications. Practical case studies and laboratory exercises were designed to supplement theoretical lectures.`
        },
        instructorEvaluation: {
          table: sec3Ratings,
          reflection: hasResponses
            ? `Interactive lectures, active student participation, and prompt feedback contributed to a positive and engaging classroom environment and enhanced student understanding throughout the semester.`
            : `Class sessions were conducted using interactive pedagogical techniques, encouraging student questions, discussion, and continuous academic mentoring.`
        },
        assessmentWorkload: {
          table: sec4Ratings,
          reflection: hasResponses
            ? `The evaluation methods, including class tests, assignments, and semester examinations, were well aligned with the Course Learning Outcomes (CLOs) and allowed students to demonstrate learning fairly and effectively.`
            : `Assessments including continuous class tests, assignments, and mid-term evaluations were mapped directly to CLOs and Bloom's taxonomy levels to evaluate student competency objectively.`
        }
      },

      outcomeAchievement: {
        table: sec5Ratings,
        narrative: hasResponses
          ? `Outcome-based qualitative responses from ${totalResponses} student(s) show clear attainment across core knowledge application, research capability, modern tools usage, and professional ethics, confirming that course outcomes were successfully achieved in accordance with OBE guidelines.`
          : `Student outcome achievement ratings are currently pending survey submissions from enrolled students (0 responses received). Quantitative attainment scores will be computed upon survey completion.`
      },

      openEndedSummary: {
        positiveRemarks: extractedPositive.length > 0
          ? extractedPositive.slice(0, 5)
          : hasResponses
            ? [`Students engaged actively with ${domainInfo.domain} principles.`]
            : ['Awaiting student survey submissions...'],
        suggestedImprovements: extractedImprovement.length > 0
          ? extractedImprovement.slice(0, 5)
          : hasResponses
            ? ['Continue expanding real-world problem sets and interactive exercises.']
            : ['Awaiting student survey submissions...'],
        reflection: hasResponses
          ? `Student feedback highlights genuine engagement with course topics. Feedback will be incorporated into continuous quality improvement (CQI) for ${courseTitle}.`
          : `No student open-ended remarks are available yet because 0 responses have been submitted.`
      },

      objectivesAchievement: [
        {
          title: `Understanding of ${domainInfo.domain} Principles`,
          detail: `Students were guided through core theoretical principles, including ${domainInfo.keywords}.`
        },
        {
          title: 'Application of Theory',
          detail: `Through assignments, problem-solving sessions, and practical examples, theoretical principles were connected to real-world engineering scenarios.`
        },
        {
          title: 'Development of Analytical Skills',
          detail: `Students enhanced their problem-solving, reasoning, and analytical abilities through numerical exercises, case studies, and structured demonstrations.`
        },
        {
          title: 'Active Participation',
          detail: `Lectures and tutorials encouraged collaborative problem-solving and structured engagement with course topics.`
        }
      ],

      studentPerformance: [
        {
          title: 'Class Participation',
          detail: 'Interactive discussions and conceptual problem-solving were integrated into lecture sessions.'
        },
        {
          title: 'Understanding of Course Topics',
          detail: `Instruction focused on ensuring conceptual depth and solid foundational grasp of ${domainInfo.domain} concepts.`
        },
        {
          title: 'Assignment Quality',
          detail: 'Assignments were evaluated based on logical problem-solving methodology, analytical rigor, and conceptual comprehension.'
        }
      ],

      teachingResources: [
        {
          title: 'Classroom Facilities',
          detail: 'Suitable lecture halls and teaching aids facilitated interactive and effective learning.'
        },
        {
          title: 'Laboratory/Software Tools',
          detail: `${domainInfo.tools} and reference materials enhanced comprehension of key technical concepts.`
        },
        {
          title: 'Learning Materials',
          detail: 'Lecture slides, reference textbooks, problem sets, and example calculations supported independent learning and understanding.'
        },
        {
          title: 'Demonstrations and Guidance',
          detail: 'Step-by-step walkthroughs of complex topics helped students apply theory to practical examples.'
        }
      ],

      teachingChallenges: [
        {
          title: 'Variation in prior knowledge',
          detail: `Some students required extra support and foundational reviews to grasp complex ${domainInfo.domain} topics.`
        },
        {
          title: 'Limited time for deeper exploration',
          detail: 'Some advanced topics required more detailed discussions or practical examples than regular lecture time permitted.'
        },
        {
          title: 'Student engagement',
          detail: 'While most students were active, a few required additional encouragement and guided motivation for active participation.'
        }
      ],

      actionPlan: [
        {
          area: 'Practical exposure',
          action: `Include more numerical and real-world ${domainInfo.domain} examples and hands-on laboratory exercises.`
        },
        {
          area: 'Student engagement',
          action: 'Add interactive problem-solving, in-class discussions, and active peer collaboration sessions.'
        },
        {
          area: 'Concept reinforcement',
          action: 'Provide additional tutorial sessions, practice worksheets, and consultation hours for complex topics.'
        },
        {
          area: 'Motivation & guidance',
          action: `Incorporate career-oriented discussions and industry application trends related to ${domainInfo.domain}.`
        }
      ],

      recommendations: [
        'Integrate more practical examples and real-world case studies to complement theory.',
        'Include interactive problem-solving sessions for numerical and conceptual reinforcement.',
        `Encourage students to work on mini-research or analytical assignments related to ${domainInfo.domain}.`,
        'Provide optional advanced topics such as emerging technologies and modern industry practices.',
        'Organize seminars or guest lectures from industry experts to increase awareness of practical applications.'
      ],

      conclusion: hasResponses
        ? `The survey analysis confirms that the ${courseTitle} (${courseCode}) course was delivered effectively with student participation. Feedback from ${totalResponses} respondent(s) will be used to further refine course materials, strengthen practical understanding, and ensure continuous quality improvement (CQI).`
        : `The baseline evaluation framework for ${courseTitle} (${courseCode}) establishes clear instructional alignment with OBE outcomes. Once student survey submissions are received, full quantitative feedback will be reviewed to support continuous quality improvement (CQI) in future semesters.`
    }
  }

  // Fetch Survey Analytics on mount
  useEffect(() => {
    loadSurveyData()
  }, [surveyId])

  const loadSurveyData = async () => {
    setLoading(true)
    let analytics = null
    try {
      if (surveyId) {
        const res = await apiService.getSurveyAnalytics(surveyId)
        if (res && res.survey) {
          // Process question scores
          const questionScores = (res.survey.questions || []).map((q, idx) => ({
            text: q.text,
            sum: 0,
            count: 0
          }))
          ;(res.responses || []).forEach(resp => {
            res.survey.questions.forEach((q, idx) => {
              const rating = resp.ratings?.get ? resp.ratings.get(String(idx)) : resp.ratings?.[String(idx)]
              if (rating !== undefined && rating !== null) {
                const val = Number(rating)
                questionScores[idx].sum += val
                questionScores[idx].count++
              }
            })
          })
          analytics = { ...res, questionScores }
          setSurveyAnalytics(analytics)
        }
      }
    } catch (err) {
      console.warn('Failed to load survey analytics for evaluation report:', err)
    }

    // Check localStorage cache
    const totalRespCount = analytics?.responses?.length || 0
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        // Check if cache is stale or contains old hardcoded fake 4.64 values
        const containsOldFake = parsed?.strengths?.learningOutcomes?.table?.some(
          r => r.rating === '4.64 / 5' || r.rating === '4.50 / 5'
        )
        const isCountMismatch = parsed?.submissionCount !== undefined && parsed.submissionCount !== totalRespCount

        if (!containsOldFake && !isCountMismatch && parsed?.overview && parsed?.strengths && parsed?.conclusion) {
          setEvalData(parsed)
          setAiSource(parsed.aiSource || 'cached')
          setLoading(false)
          return
        } else {
          // Clear stale cache
          localStorage.removeItem(cacheKey)
        }
      } catch (e) {
        console.warn('Failed to parse cached evaluation data:', e)
      }
    }

    // If no cache, initialize with calculated/authentic fallback
    const initialFallback = generateFallbackData(analytics)
    setEvalData(initialFallback)
    setAiSource('fallback')
    setLoading(false)
  }

  // Generate / Regenerate with Gemini AI
  const fetchGeminiEvaluation = async (forceRegenerate = false) => {
    const totalResponses = surveyAnalytics?.responses?.length || 0

    if (!forceRegenerate) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          const containsOldFake = parsed?.strengths?.learningOutcomes?.table?.some(
            r => r.rating === '4.64 / 5' || r.rating === '4.50 / 5'
          )
          const isCountMismatch = parsed?.submissionCount !== undefined && parsed.submissionCount !== totalResponses
          if (!containsOldFake && !isCountMismatch && parsed?.overview && parsed?.strengths && parsed?.conclusion) {
            setEvalData(parsed)
            setAiSource(parsed.aiSource || 'cached')
            return
          }
        } catch (e) {}
      }
    }

    setGeneratingAI(true)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || localStorage.getItem('OBE_GEMINI_API_KEY') || ''

    try {
      // Gather real survey ratings and open comments
      const ratingsSummary = []
      if (surveyAnalytics?.survey?.questions && surveyAnalytics?.questionScores) {
        surveyAnalytics.survey.questions.forEach((q, idx) => {
          const qs = surveyAnalytics.questionScores[idx]
          const maxScale = idx >= 20 ? 10 : 5
          const avg = (qs && qs.count > 0) ? `${(qs.sum / qs.count).toFixed(2)} / ${maxScale}` : 'N/A'
          ratingsSummary.push(`Q${idx + 1}: ${q.text} -> Average Rating: ${avg}`)
        })
      }

      const openComments = []
      if (surveyAnalytics?.responses) {
        surveyAnalytics.responses.forEach(resp => {
          const cObj = resp.comments || {}
          const getVal = (k) => (cObj.get && typeof cObj.get === 'function') ? cObj.get(k) : cObj[k]
          const l = getVal('learned') || getVal('feedback1')
          if (l && typeof l === 'string' && l.trim()) openComments.push(`[Valuable]: ${l.trim()}`)
          const imp = getVal('improved') || getVal('feedback2')
          if (imp && typeof imp === 'string' && imp.trim()) openComments.push(`[Suggested Improvement]: ${imp.trim()}`)
          const add = getVal('additionalComments') || getVal('feedback3')
          if (add && typeof add === 'string' && add.trim()) openComments.push(`[General Comment]: ${add.trim()}`)
        })
      }

      // Context of teacher's existing draft notes
      const teacherDraftContext = evalData ? `
TEACHER'S CURRENT DRAFT & CUSTOM NOTES:
${JSON.stringify(evalData, null, 2)}
` : ''

      const dataPresenceNotice = totalResponses > 0
        ? `AUTHENTIC SURVEY DATA AVAILABLE:
- Total Student Submissions: ${totalResponses}
- Question-by-Question Calculated Averages:
${ratingsSummary.join('\n')}

REAL STUDENT OPEN-ENDED FEEDBACK:
${openComments.length > 0 ? openComments.join('\n') : 'No open comments were written by respondents.'}

CRITICAL: Use the EXACT calculated ratings provided above for each question in the tables. Synthesize the real student comments above into positive remarks and suggested improvements.`
        : `CRITICAL SURVEY STATUS NOTICE:
- Total Student Submissions: 0 (Zero responses submitted yet).
- In ALL rating tables, you MUST set the "rating" field strictly to "N/A" (e.g. "N/A"). DO NOT invent fake numbers.
- In "overview", explicitly state that 0 student survey responses have been recorded yet, and that quantitative ratings are pending student completion.
- In "openEndedSummary", note that student open remarks are awaiting survey submission.
- Focus the academic reflections, objectives achievement, teaching challenges, action plan, and recommendations on the instructor's pedagogical preparation, course syllabus delivery, and continuous improvement framework for "${courseTitle}" (${courseCode}).`

      const coSection = dbCourseOutcomes && dbCourseOutcomes.length > 0
        ? `COURSE OUTCOMES (CLOs):\n${dbCourseOutcomes.map(co => `- ${co.code}: ${co.description || co.title || ''} ${coMapping?.[co.code] ? `(Mapped to: ${Object.keys(coMapping[co.code]).filter(p => coMapping[co.code][p] > 0).join(', ')})` : ''}`).join('\n')}`
        : `COURSE OUTCOMES (CLOs):\n- CO1 to CO4 covering theoretical foundations, engineering problem analysis, and practical implementation for ${courseTitle}.`

      const poSection = dbProgramOutcomes && dbProgramOutcomes.length > 0
        ? `PROGRAM OUTCOMES (Washington Accord OBE):\n${dbProgramOutcomes.map(po => `- ${po.code}: ${po.title || po.description || ''}`).join('\n')}`
        : `PROGRAM OUTCOMES (Washington Accord OBE):\n- PO1 (Engineering Knowledge), PO2 (Problem Analysis), PO3 (Design/Development of Solutions), PO5 (Modern Tool Usage), PO9 (Individual & Team Work), PO10 (Communication), PO12 (Life-long Learning)`

      const promptText = `System Role: You are a Senior Academic OBE Accreditation Evaluator and CSE University Professor at Bangladesh Army International University of Science and Technology (BAIUST), Cumilla.
Your task is to generate a comprehensive, deeply course-specific, highly professional "Course Evaluation by Teacher (in view of feedback from the students)" report for:
- Course Code: ${courseCode}
- Course Title: ${courseTitle}
- Level: ${levelText}, Term: ${termText}, Section: ${sectionText}
- Semester: ${semesterName} ${academicYear}
- Instructor: ${teacherName}, ${teacherDesignation}
- Institution: Bangladesh Army International University of Science and Technology (BAIUST), Cumilla
- Department: Department of Computer Science and Engineering

${coSection}

${poSection}

${dataPresenceNotice}

CRITICAL INSTRUCTIONS:
1. Deep Technical Specificity: Ensure EVERY reflection, objective achievement, performance evaluation, teaching resources, teaching challenge, CQI action plan, and recommendation is deeply customized to "${courseTitle}" (${courseCode}) using authentic technical terminology (e.g. for Image Processing: filtering, transforms, morphological operations, segmentation; for Data Communications: signal modulation, multiplexing, error detection, constellation diagrams; for OOP: polymorphism, templates, memory management; for Algorithms: greedy algorithms, dynamic programming, recurrence relations, asymptotic bounds; etc.).
2. Seamless CO-PO & Washington Accord Alignment: Connect student feedback ratings directly with the course's active COs (CLOs) and mapped POs. Discuss how student evaluations demonstrate CLO mastery and where instructional adjustments are required to improve PO attainment in the next cycle.
3. Adhere strictly to the Washington Accord OBE evaluation guidelines.
${teacherDraftContext}

REQUIRED OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown backticks, no code fence, no text outside JSON) matching this EXACT schema:
{
  "overview": "Comprehensive academic overview paragraph analyzing student survey feedback, response rates, and general sentiments.",
  "strengths": {
    "learningOutcomes": {
      "table": [
        { "aspect": "Clearly stated learning outcomes", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[0]?.count ? (surveyAnalytics.questionScores[0].sum / surveyAnalytics.questionScores[0].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Problem-solving skill development", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[1]?.count ? (surveyAnalytics.questionScores[1].sum / surveyAnalytics.questionScores[1].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Application of engineering principles", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[2]?.count ? (surveyAnalytics.questionScores[2].sum / surveyAnalytics.questionScores[2].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Teamwork and collaboration skills", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[3]?.count ? (surveyAnalytics.questionScores[3].sum / surveyAnalytics.questionScores[3].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Ethical and professional responsibility", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[4]?.count ? (surveyAnalytics.questionScores[4].sum / surveyAnalytics.questionScores[4].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" }
      ],
      "reflection": "Detailed academic teaching reflection on learning outcomes achievement specifically for ${courseTitle}."
    },
    "courseContent": {
      "table": [
        { "aspect": "Course content relevance and structure", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[5]?.count ? (surveyAnalytics.questionScores[5].sum / surveyAnalytics.questionScores[5].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Balance between theory and practical applications", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[6]?.count ? (surveyAnalytics.questionScores[6].sum / surveyAnalytics.questionScores[6].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Usefulness of assignments and practical activities", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[7]?.count ? (surveyAnalytics.questionScores[7].sum / surveyAnalytics.questionScores[7].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Real-world problem and application integration", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[8]?.count ? (surveyAnalytics.questionScores[8].sum / surveyAnalytics.questionScores[8].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Helpfulness of laboratory/tutorial sessions", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[9]?.count ? (surveyAnalytics.questionScores[9].sum / surveyAnalytics.questionScores[9].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" }
      ],
      "reflection": "Teaching reflection on course content relevance, theory-practice balance, and practical applications in ${courseTitle}."
    },
    "instructorEvaluation": {
      "table": [
        { "aspect": "Clear communication of concepts", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[10]?.count ? (surveyAnalytics.questionScores[10].sum / surveyAnalytics.questionScores[10].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Responsiveness and support for students", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[11]?.count ? (surveyAnalytics.questionScores[11].sum / surveyAnalytics.questionScores[11].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Encouragement of critical thinking and innovation", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[12]?.count ? (surveyAnalytics.questionScores[12].sum / surveyAnalytics.questionScores[12].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Useful feedback on assignments", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[13]?.count ? (surveyAnalytics.questionScores[13].sum / surveyAnalytics.questionScores[13].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Positive and engaging classroom environment", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[14]?.count ? (surveyAnalytics.questionScores[14].sum / surveyAnalytics.questionScores[14].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" }
      ],
      "reflection": "Teaching reflection on instructor-student engagement, interactive lectures, and pedagogical methods."
    },
    "assessmentWorkload": {
      "table": [
        { "aspect": "Fairness and transparency of grading", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[15]?.count ? (surveyAnalytics.questionScores[15].sum / surveyAnalytics.questionScores[15].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Appropriateness of workload", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[16]?.count ? (surveyAnalytics.questionScores[16].sum / surveyAnalytics.questionScores[16].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Alignment of exams/assessments with course content", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[17]?.count ? (surveyAnalytics.questionScores[17].sum / surveyAnalytics.questionScores[17].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Development of communication and transferable skills", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[18]?.count ? (surveyAnalytics.questionScores[18].sum / surveyAnalytics.questionScores[18].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" },
        { "aspect": "Support for lifelong learning and professional development", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[19]?.count ? (surveyAnalytics.questionScores[19].sum / surveyAnalytics.questionScores[19].count).toFixed(2) + ' / 5' : 'N/A') : 'N/A'}" }
      ],
      "reflection": "Teaching reflection on evaluation fairness, CLO alignment, and workload appropriateness."
    }
  },
  "outcomeAchievement": {
    "table": [
      { "aspect": "Handling or application of core knowledge (Science & Math)", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[20]?.count ? (surveyAnalytics.questionScores[20].sum / surveyAnalytics.questionScores[20].count).toFixed(2) + ' / 10' : 'N/A') : 'N/A'}" },
      { "aspect": "Research and analytical capability", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[21]?.count ? (surveyAnalytics.questionScores[21].sum / surveyAnalytics.questionScores[21].count).toFixed(2) + ' / 10' : 'N/A') : 'N/A'}" },
      { "aspect": "Ability to address or solve relevant problems / Modern tools", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[22]?.count ? (surveyAnalytics.questionScores[22].sum / surveyAnalytics.questionScores[22].count).toFixed(2) + ' / 10' : 'N/A') : 'N/A'}" },
      { "aspect": "Professional ethics and social responsibility", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[23]?.count ? (surveyAnalytics.questionScores[23].sum / surveyAnalytics.questionScores[23].count).toFixed(2) + ' / 10' : 'N/A') : 'N/A'}" },
      { "aspect": "Teamwork, communication, and project management skills", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[24]?.count ? (surveyAnalytics.questionScores[24].sum / surveyAnalytics.questionScores[24].count).toFixed(2) + ' / 10' : 'N/A') : 'N/A'}" },
      { "aspect": "Lifelong learning capability", "rating": "${totalResponses > 0 ? (surveyAnalytics?.questionScores?.[25]?.count ? (surveyAnalytics.questionScores[25].sum / surveyAnalytics.questionScores[25].count).toFixed(2) + ' / 10' : 'N/A') : 'N/A'}" }
    ],
    "narrative": "Detailed outcome achievement narrative explaining student attainment across the 6 Washington Accord areas for ${courseTitle}."
  },
  "openEndedSummary": {
    "positiveRemarks": [
      "Bullet 1 of positive student remarks tailored to ${courseTitle}",
      "Bullet 2 of positive student remarks",
      "Bullet 3 of positive student remarks"
    ],
    "suggestedImprovements": [
      "Bullet 1 of student suggested improvements",
      "Bullet 2 of student suggested improvements"
    ],
    "reflection": "Instructor reflection addressing student open-ended feedback and planned pedagogical adjustments."
  },
  "objectivesAchievement": [
    { "title": "Understanding of [Course Domain] Principles", "detail": "Specific breakdown of concept understanding for ${courseTitle}." },
    { "title": "Application of Theory", "detail": "How students applied theory to practical scenarios." },
    { "title": "Development of Analytical Skills", "detail": "How analytical and problem-solving skills developed." },
    { "title": "Active Participation", "detail": "Class participation and collaborative engagement." }
  ],
  "studentPerformance": [
    { "title": "Class Participation", "detail": "Evaluation of student engagement and discussion participation." },
    { "title": "Understanding of Course Topics", "detail": "Comprehension of course topics and conceptual depth." },
    { "title": "Assignment Quality", "detail": "Quality and logical rigor demonstrated in student assignments." }
  ],
  "teachingResources": [
    { "title": "Classroom Facilities", "detail": "Suitable lecture halls and teaching aids." },
    { "title": "Laboratory/Software Tools", "detail": "Specific software tools and simulation environments utilized." },
    { "title": "Learning Materials", "detail": "Slides, textbooks, worksheets, and online references." },
    { "title": "Demonstrations and Guidance", "detail": "Practical demonstrations and stepwise problem walkthroughs." }
  ],
  "teachingChallenges": [
    { "title": "Variation in prior knowledge", "detail": "Challenge and planned tutorial remedies." },
    { "title": "Limited time for deeper exploration", "detail": "Pacing challenge and supplementary resources." },
    { "title": "Student engagement", "detail": "Engagement levels and interactive motivating techniques." }
  ],
  "actionPlan": [
    { "area": "Practical exposure", "action": "Specific proposed CQI action for ${courseTitle}." },
    { "area": "Student engagement", "action": "Specific proposed CQI action for student engagement." },
    { "area": "Concept reinforcement", "action": "Specific proposed CQI action for complex topics." },
    { "area": "Motivation & guidance", "action": "Specific proposed CQI action for career and industry alignment." }
  ],
  "recommendations": [
    "Course-specific recommendation 1 for ${courseTitle}",
    "Course-specific recommendation 2",
    "Course-specific recommendation 3",
    "Course-specific recommendation 4",
    "Course-specific recommendation 5"
  ],
  "conclusion": "Formal academic concluding statement summarizing overall effectiveness, student satisfaction, and commitment to continuous quality improvement (CQI) for ${courseTitle} (${courseCode})."
}`

      let rawOutput = ''

      // Attempt backend proxy first
      try {
        const token = localStorage.getItem('obe-auth-token')
        const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
        const apiBase = isProduction ? 'https://student-outcome-analyzer-api.onrender.com' : ''
        const backendRes = await fetch(`${apiBase}/api/ai/swot-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ promptText })
        })
        const backendData = await backendRes.json()
        if (backendRes.ok && backendData.success && backendData.content) {
          rawOutput = backendData.content
        }
      } catch (proxyErr) {
        console.warn('Backend proxy unavailable, trying direct Gemini API:', proxyErr.message)
      }

      // Direct client fetch fallback
      if (!rawOutput && apiKey) {
        const clientEndpoints = [
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`
        ]

        for (const url of clientEndpoints) {
          try {
            const clientRes = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.85 }
              })
            })
            const clientData = await clientRes.json()
            if (clientRes.ok && clientData.candidates?.[0]?.content?.parts?.[0]?.text) {
              rawOutput = clientData.candidates[0].content.parts[0].text
              break
            }
          } catch (cErr) {
            console.warn('Direct client endpoint error:', cErr.message)
          }
        }
      }

      if (!rawOutput) {
        throw new Error('No response from AI generation endpoints')
      }

      const cleanedText = rawOutput.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsedJSON = JSON.parse(cleanedText)

      if (parsedJSON.overview && parsedJSON.strengths && parsedJSON.conclusion) {
        const fullData = { ...parsedJSON, submissionCount: totalResponses, aiSource: 'gemini' }
        setEvalData(fullData)
        setAiSource('gemini')
        try {
          localStorage.setItem(cacheKey, JSON.stringify(fullData))
        } catch (e) {
          console.warn('Failed to save to localStorage:', e)
        }
      } else {
        throw new Error('Invalid JSON structure received from AI')
      }
    } catch (err) {
      console.warn('AI generation error:', err.message)
      if (!evalData) {
        const fallback = generateFallbackData(surveyAnalytics)
        setEvalData(fallback)
        setAiSource('fallback')
      }
    } finally {
      setGeneratingAI(false)
    }
  }

  // Save manual edits to localStorage
  const handleSaveEdits = () => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(evalData))
      setSaveSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      console.error('Failed to save edits to localStorage:', e)
    }
  }

  // Export to Microsoft Word (.doc) formatted matching BAIUST template
  const handleExportWord = () => {
    if (!evalData) return

    const formatTableRows = (rows = []) => {
      return rows.map((r, i) => `
        <tr style="background-color: ${i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};">
          <td style="border: 1px solid #000000; padding: 5px 8px; font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000000;">
            ${r.aspect || r.area || ''}
          </td>
          <td align="center" style="border: 1px solid #000000; padding: 5px 8px; font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000000; text-align: center; font-weight: bold; width: 140px;">
            ${r.rating || r.action || ''}
          </td>
        </tr>
      `).join('')
    }

    const formatActionPlanRows = (rows = []) => {
      return rows.map((r, i) => `
        <tr style="background-color: ${i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'};">
          <td style="border: 1px solid #000000; padding: 5px 8px; font-family: 'Times New Roman', Times, serif; font-size: 11pt; font-weight: bold; color: #000000; width: 180px;">
            ${r.area || ''}
          </td>
          <td style="border: 1px solid #000000; padding: 5px 8px; font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000000; text-align: justify;">
            ${r.action || ''}
          </td>
        </tr>
      `).join('')
    }

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns:v='urn:schemas-microsoft-com:vml'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Course Evaluation by Teacher - ${courseCode}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
            <w:ValidateAgainstSchemas/>
            <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
            <w:IgnoreMixedContent>false</w:IgnoreMixedContent>
            <w:AlwaysShowPlaceholderText>false</w:AlwaysShowPlaceholderText>
            <w:Compatibility>
              <w:BreakWrappedTables/>
              <w:SnapToGridInCell/>
              <w:WrapTextWithPunct/>
              <w:UseAsianBreakRules/>
              <w:DontGrowAutofit/>
            </w:Compatibility>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 210mm 297mm; /* A4 Portrait */
            margin: 20mm 20mm 20mm 20mm;
            mso-header-margin: 10mm;
            mso-footer-margin: 10mm;
            mso-footer: f1;
          }
          div.Section1 {
            page: Section1;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.25;
            color: #000000;
            margin: 0;
            padding: 0;
          }
          p, div, td, th, span {
            font-family: 'Times New Roman', Times, serif;
          }
          h1, h2, h3, h4 {
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
            margin: 10pt 0 4pt 0;
            page-break-after: avoid;
          }
          p.MsoFooter, div.MsoFooter {
            margin: 0;
            font-family: 'Times New Roman', Times, serif;
            font-size: 9pt;
            color: #555555;
            text-align: center;
          }
          #hrdftrtbl, table#hrdftrtbl {
            margin: 0in 0in 0in 900in;
            width: 1px;
            height: 1px;
            overflow: hidden;
          }
          table.meta-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000000;
            margin: 8pt 0 14pt 0;
            font-size: 10pt;
            font-family: 'Times New Roman', Times, serif;
          }
          table.meta-table td {
            border: 1px solid #000000;
            padding: 3pt 6pt;
            font-size: 10pt;
            line-height: 1.25;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            border: 1pt solid #000000;
            margin: 4pt 0 8pt 0;
          }
          table.data-table th {
            border: 1pt solid #000000;
            padding: 5pt 8pt;
            background-color: #F2F2F2;
            font-weight: bold;
            font-size: 11pt;
          }
          table.data-table td {
            border: 1pt solid #000000;
            padding: 4pt 8pt;
            font-size: 10.5pt;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          <!-- Institutional Header -->
          <table border="0" cellspacing="0" cellpadding="0" style="width:100%; border:none; margin-bottom:6pt;">
            <tr>
              <td align="center" style="border:none; text-align:center;">
                <img src="${BAIUST_LOGO}" width="60" height="60" alt="BAIUST" style="display:block; margin:0 auto 4pt auto; width:60px; height:60px;" /><br/>
                <p style="font-size:13pt; font-weight:bold; margin:2pt 0; text-align:center;">
                  বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা
                </p>
                <p style="font-size:11pt; font-weight:bold; margin:2pt 0; text-align:center; text-transform:uppercase;">
                  BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE &amp; TECHNOLOGY (BAIUST), CUMILLA
                </p>
                <p style="font-size:11pt; font-weight:bold; margin:2pt 0; text-align:center;">
                  Department of Computer Science and Engineering
                </p>
                <p style="font-size:12.5pt; font-weight:bold; margin:6pt 0 1pt 0; text-align:center;">
                  Course Evaluation by Teacher
                </p>
                <p style="font-size:10pt; font-style:italic; margin:0 0 8pt 0; text-align:center;">
                  (in view of feedback from the students)
                </p>
              </td>
            </tr>
          </table>

          <!-- Meta Table -->
          <table class="meta-table" align="center" border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; width:100%; margin-bottom:14pt; font-size:10pt;">
            <tr>
              <td style="border:1px solid #000; width:14%; font-weight:bold;">Course Code</td>
              <td style="border:1px solid #000; width:36%;">: ${courseCode}</td>
              <td style="border:1px solid #000; width:15%; font-weight:bold;">Course Title</td>
              <td style="border:1px solid #000; width:35%;">: ${courseTitle}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000; font-weight:bold;">Level</td>
              <td style="border:1px solid #000;">: ${levelText}</td>
              <td style="border:1px solid #000; font-weight:bold;">Term</td>
              <td style="border:1px solid #000;">: ${termText} &nbsp;&nbsp;&nbsp;&nbsp; <b>Section :</b> ${sectionText}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000; font-weight:bold;">Group</td>
              <td style="border:1px solid #000;">: ${groupText}</td>
              <td style="border:1px solid #000; font-weight:bold;">Semester</td>
              <td style="border:1px solid #000;">: ${semesterName} &nbsp;&nbsp;&nbsp;&nbsp; <b>Year :</b> ${academicYear}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000; font-weight:bold;">Instructor</td>
              <td colspan="2" style="border:1px solid #000;">: ${teacherName}, ${teacherDesignation}</td>
              <td style="border:1px solid #000; text-align:left; padding:3pt 6pt; white-space:nowrap;">Signature : ________________________</td>
            </tr>
          </table>

          <!-- 1. Overview of Student Feedback -->
          <p style="font-size:12pt; font-weight:bold; margin:12pt 0 4pt 0;">1. Overview of Student Feedback</p>
          <p style="font-size:11pt; margin:0 0 10pt 0; text-align:justify; line-height:1.3;">
            ${evalData.overview}
          </p>

          <!-- 2. Strengths Identified from the Survey -->
          <p style="font-size:12pt; font-weight:bold; margin:12pt 0 4pt 0;">2. Strengths Identified from the Survey</p>
          
          <!-- a) Learning Outcomes and Student Achievement -->
          <p style="font-size:11.5pt; font-weight:bold; margin:8pt 0 4pt 0;">a) Learning Outcomes and Student Achievement</p>
          <table class="data-table">
            <thead>
              <tr>
                <th align="left" style="text-align:left;">Aspect</th>
                <th align="center" style="text-align:center; width:130px;">Average Rating</th>
              </tr>
            </thead>
            <tbody>
              ${formatTableRows(evalData.strengths?.learningOutcomes?.table)}
            </tbody>
          </table>
          <p style="font-size:11pt; font-weight:bold; margin:4pt 0 2pt 0;">Teaching Reflection</p>
          <p style="font-size:10.5pt; margin:0 0 10pt 0; text-align:justify; line-height:1.3;">
            ${evalData.strengths?.learningOutcomes?.reflection || ''}
          </p>

          <!-- b) Course Content and Delivery -->
          <p style="font-size:11.5pt; font-weight:bold; margin:10pt 0 4pt 0;">b) Course Content and Delivery Evaluation</p>
          <table class="data-table">
            <thead>
              <tr>
                <th align="left" style="text-align:left;">Aspect</th>
                <th align="center" style="text-align:center; width:130px;">Average Rating</th>
              </tr>
            </thead>
            <tbody>
              ${formatTableRows(evalData.strengths?.courseContent?.table)}
            </tbody>
          </table>
          <p style="font-size:11pt; font-weight:bold; margin:4pt 0 2pt 0;">Teaching Reflection</p>
          <p style="font-size:10.5pt; margin:0 0 10pt 0; text-align:justify; line-height:1.3;">
            ${evalData.strengths?.courseContent?.reflection || ''}
          </p>

          <!-- c) Instructor Evaluation -->
          <p style="font-size:11.5pt; font-weight:bold; margin:10pt 0 4pt 0;">c) Instructor Evaluation</p>
          <table class="data-table">
            <thead>
              <tr>
                <th align="left" style="text-align:left;">Aspect</th>
                <th align="center" style="text-align:center; width:130px;">Average Rating</th>
              </tr>
            </thead>
            <tbody>
              ${formatTableRows(evalData.strengths?.instructorEvaluation?.table)}
            </tbody>
          </table>
          <p style="font-size:11pt; font-weight:bold; margin:4pt 0 2pt 0;">Teaching Reflection</p>
          <p style="font-size:10.5pt; margin:0 0 10pt 0; text-align:justify; line-height:1.3;">
            ${evalData.strengths?.instructorEvaluation?.reflection || ''}
          </p>

          <!-- d) Assessment and Workload Evaluation -->
          <p style="font-size:11.5pt; font-weight:bold; margin:10pt 0 4pt 0;">d) Assessment and Workload Evaluation</p>
          <table class="data-table">
            <thead>
              <tr>
                <th align="left" style="text-align:left;">Aspect</th>
                <th align="center" style="text-align:center; width:130px;">Average Rating</th>
              </tr>
            </thead>
            <tbody>
              ${formatTableRows(evalData.strengths?.assessmentWorkload?.table)}
            </tbody>
          </table>
          <p style="font-size:11pt; font-weight:bold; margin:4pt 0 2pt 0;">Teaching Reflection</p>
          <p style="font-size:10.5pt; margin:0 0 10pt 0; text-align:justify; line-height:1.3;">
            ${evalData.strengths?.assessmentWorkload?.reflection || ''}
          </p>

          <!-- 3. Outcome Achievement (Section 5) -->
          <p style="font-size:12pt; font-weight:bold; margin:14pt 0 4pt 0;">3. Outcome Achievement (Section 5)</p>
          <table class="data-table">
            <thead>
              <tr>
                <th align="left" style="text-align:left;">Aspect</th>
                <th align="center" style="text-align:center; width:130px;">Average Rating</th>
              </tr>
            </thead>
            <tbody>
              ${formatTableRows(evalData.outcomeAchievement?.table)}
            </tbody>
          </table>
          <p style="font-size:10.5pt; margin:4pt 0 10pt 0; text-align:justify; line-height:1.3;">
            ${evalData.outcomeAchievement?.narrative || ''}
          </p>

          <!-- 4. Student Open-Ended Feedback Summary -->
          <p style="font-size:12pt; font-weight:bold; margin:14pt 0 4pt 0;">4. Student Open-Ended Feedback Summary</p>
          <p style="font-size:11pt; font-weight:bold; margin:4pt 0 2pt 0;">Common Positive Remarks:</p>
          ${(evalData.openEndedSummary?.positiveRemarks || []).map(r => `
            <p style="font-size:10.5pt; margin:2pt 0 2pt 18pt; text-indent:-12pt;">
              <span style="font-family:Symbol;">&#183;</span>&#160;&#160;"${r.replace(/^["']|["']$/g, '')}"
            </p>
          `).join('')}

          <p style="font-size:11pt; font-weight:bold; margin:6pt 0 2pt 0;">Suggested Improvements:</p>
          ${(evalData.openEndedSummary?.suggestedImprovements || []).map(r => `
            <p style="font-size:10.5pt; margin:2pt 0 2pt 18pt; text-indent:-12pt;">
              <span style="font-family:Symbol;">&#183;</span>&#160;&#160;${r}
            </p>
          `).join('')}

          <p style="font-size:11pt; font-weight:bold; margin:6pt 0 2pt 0;">Teaching Reflection:</p>
          <p style="font-size:10.5pt; margin:0 0 10pt 0; text-align:justify; line-height:1.3;">
            ${evalData.openEndedSummary?.reflection || ''}
          </p>

          <!-- 5. Course Objectives Achievement -->
          <p style="font-size:12pt; font-weight:bold; margin:14pt 0 4pt 0;">5. Course Objectives Achievement</p>
          <p style="font-size:11pt; margin:0 0 4pt 0; text-align:justify;">
            Based on lecture observations, assessments, and student feedback, the objectives of the <b>${courseTitle}</b> Theory course were successfully achieved:
          </p>
          ${(evalData.objectivesAchievement || []).map(item => `
            <p style="font-size:10.5pt; margin:3pt 0 3pt 18pt; text-indent:-12pt; text-align:justify; line-height:1.3;">
              <span style="font-family:Symbol;">&#183;</span>&#160;&#160;<b>${item.title}:</b> ${item.detail}
            </p>
          `).join('')}
          <p style="font-size:10.5pt; margin:4pt 0 10pt 0;">
            Overall, the course effectively supported the achievement of learning objectives and CLOs.
          </p>

          <!-- 6. Student Performance -->
          <p style="font-size:12pt; font-weight:bold; margin:14pt 0 4pt 0;">6. Student Performance</p>
          <p style="font-size:11pt; margin:0 0 4pt 0; text-align:justify;">
            Student performance was evaluated based on class participation, understanding of theoretical concepts, assignments, and project/problem-solving performance:
          </p>
          ${(evalData.studentPerformance || []).map(item => `
            <p style="font-size:10.5pt; margin:3pt 0 3pt 18pt; text-indent:-12pt; text-align:justify; line-height:1.3;">
              <span style="font-family:Symbol;">&#183;</span>&#160;&#160;<b>${item.title}:</b> ${item.detail}
            </p>
          `).join('')}
          <p style="font-size:10.5pt; margin:4pt 0 10pt 0;">
            Overall, student performance indicates successful acquisition of theoretical knowledge and analytical skills in ${courseTitle}.
          </p>

          <!-- 7. Teaching Resources -->
          <p style="font-size:12pt; font-weight:bold; margin:14pt 0 4pt 0;">7. Teaching Resources</p>
          <p style="font-size:11pt; margin:0 0 4pt 0; text-align:justify;">
            The availability of appropriate resources contributed significantly to effective course delivery:
          </p>
          ${(evalData.teachingResources || []).map(item => `
            <p style="font-size:10.5pt; margin:3pt 0 3pt 18pt; text-indent:-12pt; text-align:justify; line-height:1.3;">
              <span style="font-family:Symbol;">&#183;</span>&#160;&#160;<b>${item.title}:</b> ${item.detail}
            </p>
          `).join('')}

          <!-- 8. Teaching Challenges Observed -->
          <p style="font-size:12pt; font-weight:bold; margin:14pt 0 4pt 0;">8. Teaching Challenges Observed</p>
          <p style="font-size:11pt; margin:0 0 4pt 0; text-align:justify;">
            During the course, some challenges were noted:
          </p>
          ${(evalData.teachingChallenges || []).map(item => `
            <p style="font-size:10.5pt; margin:3pt 0 3pt 18pt; text-indent:-12pt; text-align:justify; line-height:1.3;">
              <span style="font-family:Symbol;">&#183;</span>&#160;&#160;<b>${item.title}:</b> ${item.detail}
            </p>
          `).join('')}
          <p style="font-size:10.5pt; margin:4pt 0 10pt 0; text-align:justify;">
            Planned solutions include additional tutorial sessions, example problem sets, and interactive in-class discussions.
          </p>

          <!-- 9. Areas for Improvement and Action Plan -->
          <p style="font-size:12pt; font-weight:bold; margin:14pt 0 4pt 0;">9. Areas for Improvement and Action Plan</p>
          <p style="font-size:11pt; margin:0 0 4pt 0; text-align:justify;">
            In line with CQI principles, the following actions are planned:
          </p>
          <table class="data-table">
            <thead>
              <tr>
                <th align="left" style="text-align:left; width:170px;">Identified Area</th>
                <th align="left" style="text-align:left;">Proposed Action</th>
              </tr>
            </thead>
            <tbody>
              ${formatActionPlanRows(evalData.actionPlan)}
            </tbody>
          </table>

          <!-- 10. Recommendations for Future Course Enhancement -->
          <p style="font-size:12pt; font-weight:bold; margin:14pt 0 4pt 0;">10. Recommendations for Future Course Enhancement</p>
          <p style="font-size:11pt; margin:0 0 4pt 0; text-align:justify;">
            To further improve the course effectiveness:
          </p>
          ${(evalData.recommendations || []).map(rec => `
            <p style="font-size:10.5pt; margin:3pt 0 3pt 18pt; text-indent:-12pt; text-align:justify; line-height:1.3;">
              <span style="font-family:Symbol;">&#183;</span>&#160;&#160;${rec}
            </p>
          `).join('')}
          <p style="font-size:10.5pt; margin:4pt 0 10pt 0;">
            These enhancements will strengthen conceptual understanding, analytical skills, and student engagement.
          </p>

          <!-- 11. Conclusion -->
          <p style="font-size:12pt; font-weight:bold; margin:14pt 0 4pt 0;">11. Conclusion</p>
          <p style="font-size:11pt; margin:0 0 14pt 0; text-align:justify; line-height:1.35;">
            ${evalData.conclusion}
          </p>
        </div>

        <!-- Word Running Footer (Assigned to Section1 via mso-footer: f1) -->
        <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="mso-element:footer" id="f1">
                <table border="0" cellspacing="0" cellpadding="0" style="width:100%; border:none; border-top:0.5pt solid #cccccc; padding-top:4pt; font-family:'Times New Roman',Times,serif; font-size:9.5pt; color:#444444;">
                  <tr>
                    <td style="border:none; text-align:left; font-size:9.5pt; color:#444444; padding:0;">
                      <p class="MsoFooter" style="text-align:left; margin:0;">
                        Course Evaluation by Teacher &bull; ${courseCode} (${sectionText})
                      </p>
                    </td>
                    <td style="border:none; text-align:right; font-size:9.5pt; color:#444444; padding:0;">
                      <p class="MsoFooter" style="text-align:right; margin:0;">
                        Page <!--[if supportFields]><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'> </span>PAGE <span style='mso-element:field-separator'></span><![endif]--><span style='mso-field-code:" PAGE "'><span style='mso-no-proof:yes'>1</span></span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]--> of <!--[if supportFields]><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'> </span>NUMPAGES <span style='mso-element:field-separator'></span><![endif]--><span style='mso-field-code:" NUMPAGES "'><span style='mso-no-proof:yes'>1</span></span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    const blob = new Blob(['\ufeff' + wordHtml], {
      type: 'application/msword;charset=utf-8'
    })
    const safeCourseCode = (courseCode || 'Course').trim().replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `Course_Evaluation_by_Teacher_${safeCourseCode}_${sectionText}.doc`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <Loader2 className="animate-spin text-emerald-600 mb-2 inline-block" size={36} />
        <p className="text-gray-500 font-semibold text-sm">Loading Course Evaluation data...</p>
      </div>
    )
  }

  if (!evalData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center space-y-4">
        <AlertCircle size={36} className="text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-gray-800">Evaluation Data Unavailable</h3>
        <p className="text-xs text-gray-500">Please create and collect survey feedback first, or click to initialize.</p>
        <button
          onClick={() => fetchGeminiEvaluation(true)}
          className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow hover:bg-emerald-700 transition"
        >
          Initialize Report
        </button>
      </div>
    )
  }

  const totalSubmissions = surveyAnalytics?.responses?.length || 0

  const handleSyncSurveyRatings = async () => {
    setLoading(true)
    try {
      if (surveyId) {
        const res = await apiService.getSurveyAnalytics(surveyId)
        if (res && res.survey) {
          const questionScores = (res.survey.questions || []).map((q, idx) => ({
            text: q.text,
            sum: 0,
            count: 0
          }))
          ;(res.responses || []).forEach(resp => {
            res.survey.questions.forEach((q, idx) => {
              const rating = resp.ratings?.get ? resp.ratings.get(String(idx)) : resp.ratings?.[String(idx)]
              if (rating !== undefined && rating !== null) {
                const val = Number(rating)
                questionScores[idx].sum += val
                questionScores[idx].count++
              }
            })
          })
          const freshAnalytics = { ...res, questionScores }
          setSurveyAnalytics(freshAnalytics)
          const updatedData = generateFallbackData(freshAnalytics)
          setEvalData(updatedData)
          setAiSource('fallback')
          localStorage.removeItem(cacheKey)
        }
      }
    } catch (e) {
      console.warn('Sync failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action & Control Header */}
      <div className="no-print bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Top Tier: Title, Badges & Context */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors shadow-2xs shrink-0 cursor-pointer"
              title="Back to Survey Management"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  Course Evaluation by Teacher
                </h3>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${
                  aiSource === 'gemini'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : aiSource === 'cached'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <Sparkles size={12} className={generatingAI ? 'animate-spin' : ''} />
                  {aiSource === 'gemini' ? 'Gemini AI Generated' : aiSource === 'cached' ? 'Cached Draft' : 'Authentic Survey Data'}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${
                  totalSubmissions === 0
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}>
                  <Users size={12} />
                  {totalSubmissions === 0 ? '0 Submissions (Pending Feedback)' : `${totalSubmissions} Submissions Received`}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">
                (in view of feedback from the students) • Washington Accord OBE Compliant • <span className="font-bold text-gray-800">{courseCode}</span> ({courseTitle})
              </p>
            </div>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs shrink-0 animate-fadeIn self-start md:self-center">
              <CheckCircle2 size={15} />
              <span>Changes Saved!</span>
            </div>
          )}
        </div>

        {/* Bottom Tier Toolbar: Action Buttons in dedicated strip */}
        <div className="bg-gray-50/90 px-4 sm:px-5 py-3 border-t border-gray-150 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="uppercase tracking-wider text-[11px] text-gray-500 font-extrabold">Report Actions &amp; Tools</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSyncSurveyRatings}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-250 shadow-2xs transition active:scale-95 cursor-pointer"
              title="Recalculate report ratings directly from latest survey submissions"
            >
              <RefreshCw size={13} />
              <span>Sync Survey Ratings</span>
            </button>

            {isEditing ? (
              <button
                onClick={handleSaveEdits}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <Check size={14} />
                <span>Save Changes</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-250 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <Edit3 size={13} />
                <span>Edit Report</span>
              </button>
            )}

            <button
              onClick={() => fetchGeminiEvaluation(true)}
              disabled={generatingAI}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Re-generate and rewrite report using Gemini AI based on survey analysis"
            >
              <Sparkles size={13} className={generatingAI ? 'animate-spin' : ''} />
              <span>{generatingAI ? 'Analyzing & Writing...' : 'Re-generate with AI'}</span>
            </button>

            <button
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
              title="Download Word Document formatted for Course File submission"
            >
              <Download size={13} />
              <span>Download Word (.doc)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 0 Submissions Notice Banner */}
      {totalSubmissions === 0 && (
        <div className="no-print bg-amber-50/90 border-l-4 border-amber-500 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-amber-950">Awaiting Student Survey Submissions</span>
              <span className="bg-amber-200/80 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">0 Submissions Recorded</span>
            </div>
            <p className="leading-relaxed text-amber-850">
              Students have not yet submitted feedback for this course survey. As a result, all survey ratings in the report are correctly displayed as <strong>N/A</strong>. Once students submit their feedback in the Survey Form, real calculated averages and comments will be automatically calculated and reflected here.
            </p>
          </div>
        </div>
      )}

      {/* Main Printable Document Layout */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 md:p-12 space-y-8 font-serif max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none">
        
        {/* BAIUST Header */}
        <div className="text-center space-y-1.5 border-b border-gray-300 pb-5">
          <img src={BAIUST_LOGO} alt="BAIUST Logo" className="w-16 h-16 mx-auto object-contain mb-2" />
          <h2 className="text-lg md:text-xl font-bold text-gray-900 font-serif leading-tight">
            বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা
          </h2>
          <h3 className="text-sm md:text-base font-bold text-gray-800 tracking-wide font-serif uppercase">
            BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE &amp; TECHNOLOGY (BAIUST), CUMILLA
          </h3>
          <p className="text-xs md:text-sm font-semibold text-gray-700 font-serif">
            Department of Computer Science and Engineering
          </p>
          <div className="pt-2">
            <h1 className="text-base md:text-lg font-black text-gray-950 underline underline-offset-4 tracking-wide font-serif uppercase">
              Course Evaluation by Teacher
            </h1>
            <p className="text-xs font-medium text-gray-600 italic">
              (in view of feedback from the students)
            </p>
          </div>
        </div>

        {/* Course Info Meta Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-gray-800 font-serif">
            <tbody>
              <tr>
                <td className="border border-gray-800 p-2 font-bold w-24 bg-gray-50/60">Course Code</td>
                <td className="border border-gray-800 p-2 font-bold w-44">: {courseCode}</td>
                <td className="border border-gray-800 p-2 font-bold w-24 bg-gray-50/60">Course Title</td>
                <td className="border border-gray-800 p-2 font-bold">: {courseTitle}</td>
              </tr>
              <tr>
                <td className="border border-gray-800 p-2 font-bold bg-gray-50/60">Level</td>
                <td className="border border-gray-800 p-2">: {levelText}</td>
                <td className="border border-gray-800 p-2 font-bold bg-gray-50/60">Term</td>
                <td className="border border-gray-800 p-2">
                  <div className="flex justify-between items-center pr-4">
                    <span>: {termText}</span>
                    <span><b className="mr-1">Section :</b> {sectionText}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-800 p-2 font-bold bg-gray-50/60">Group</td>
                <td className="border border-gray-800 p-2">: {groupText}</td>
                <td className="border border-gray-800 p-2 font-bold bg-gray-50/60">Semester</td>
                <td className="border border-gray-800 p-2">
                  <div className="flex justify-between items-center pr-4">
                    <span>: {semesterName}</span>
                    <span><b className="mr-1">Year :</b> {academicYear}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-800 p-2 font-bold bg-gray-50/60">Instructor</td>
                <td colSpan="2" className="border border-gray-800 p-2 font-semibold">
                  : {teacherName}, {teacherDesignation}
                </td>
                <td className="border border-gray-800 p-2 text-left pl-3 font-semibold">
                  Signature : ________________________
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sections or Inline Loading Skeleton */}
        {generatingAI ? (
          <div className="py-12 space-y-6 font-sans no-print text-center">
            <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm">
              <RefreshCw size={18} className="animate-spin" />
              <span>Generating & Polishing AI Course Evaluation Report for {courseCode}...</span>
            </div>
            <p className="text-xs text-gray-500 font-medium max-w-md mx-auto">
              Synthesizing Washington Accord outcome reflections, survey feedback distributions, and pedagogical CQI recommendations...
            </p>
            <div className="space-y-4 max-w-2xl mx-auto opacity-70 pt-2">
              <div className="h-4 bg-emerald-100 rounded w-1/3 mx-auto animate-pulse"></div>
              <div className="h-3 bg-gray-150 rounded w-full animate-pulse"></div>
              <div className="h-3 bg-gray-150 rounded w-5/6 mx-auto animate-pulse"></div>
              <div className="h-4 bg-emerald-100 rounded w-1/4 mx-auto animate-pulse pt-3"></div>
              <div className="h-3 bg-gray-150 rounded w-11/12 mx-auto animate-pulse"></div>
              <div className="h-3 bg-gray-150 rounded w-4/5 mx-auto animate-pulse"></div>
            </div>
          </div>
        ) : (
          <>
        {/* 1. Overview of Student Feedback */}
        <section className="space-y-2">
          <h4 className="text-sm font-bold text-gray-950 font-serif">1. Overview of Student Feedback</h4>
          {isEditing ? (
            <textarea
              value={evalData.overview}
              onChange={(e) => setEvalData({ ...evalData, overview: e.target.value })}
              className="w-full text-xs font-serif p-3 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              rows={4}
            />
          ) : (
            <p className="text-xs text-gray-800 font-serif text-justify leading-relaxed">
              {evalData.overview}
            </p>
          )}
        </section>

        {/* 2. Strengths Identified from the Survey */}
        <section className="space-y-6">
          <h4 className="text-sm font-bold text-gray-950 font-serif">2. Strengths Identified from the Survey</h4>

          {/* a) Learning Outcomes and Student Achievement */}
          <div className="space-y-2 pl-2">
            <h5 className="text-xs font-bold text-gray-900 font-serif">a) Learning Outcomes and Student Achievement</h5>
            <table className="w-full text-xs border-collapse border border-gray-800 font-serif">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 p-1.5 text-left font-bold">Aspect</th>
                  <th className="border border-gray-800 p-1.5 text-center font-bold w-32">Average Rating</th>
                </tr>
              </thead>
              <tbody>
                {(evalData.strengths?.learningOutcomes?.table || []).map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                    <td className="border border-gray-800 p-1.5">{row.aspect}</td>
                    <td className="border border-gray-800 p-1.5 text-center font-bold">{row.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pt-1">
              <p className="text-xs font-bold text-gray-900 font-serif">Teaching Reflection</p>
              {isEditing ? (
                <textarea
                  value={evalData.strengths?.learningOutcomes?.reflection || ''}
                  onChange={(e) => {
                    const copy = { ...evalData }
                    copy.strengths.learningOutcomes.reflection = e.target.value
                    setEvalData(copy)
                  }}
                  className="w-full text-xs font-serif p-2.5 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                  rows={2}
                />
              ) : (
                <p className="text-xs text-gray-800 font-serif text-justify leading-relaxed mt-0.5">
                  {evalData.strengths?.learningOutcomes?.reflection}
                </p>
              )}
            </div>
          </div>

          {/* b) Course Content and Delivery Evaluation */}
          <div className="space-y-2 pl-2">
            <h5 className="text-xs font-bold text-gray-900 font-serif">b) Course Content and Delivery Evaluation</h5>
            <table className="w-full text-xs border-collapse border border-gray-800 font-serif">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 p-1.5 text-left font-bold">Aspect</th>
                  <th className="border border-gray-800 p-1.5 text-center font-bold w-32">Average Rating</th>
                </tr>
              </thead>
              <tbody>
                {(evalData.strengths?.courseContent?.table || []).map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                    <td className="border border-gray-800 p-1.5">{row.aspect}</td>
                    <td className="border border-gray-800 p-1.5 text-center font-bold">{row.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pt-1">
              <p className="text-xs font-bold text-gray-900 font-serif">Teaching Reflection</p>
              {isEditing ? (
                <textarea
                  value={evalData.strengths?.courseContent?.reflection || ''}
                  onChange={(e) => {
                    const copy = { ...evalData }
                    copy.strengths.courseContent.reflection = e.target.value
                    setEvalData(copy)
                  }}
                  className="w-full text-xs font-serif p-2.5 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                  rows={2}
                />
              ) : (
                <p className="text-xs text-gray-800 font-serif text-justify leading-relaxed mt-0.5">
                  {evalData.strengths?.courseContent?.reflection}
                </p>
              )}
            </div>
          </div>

          {/* c) Instructor Evaluation */}
          <div className="space-y-2 pl-2">
            <h5 className="text-xs font-bold text-gray-900 font-serif">c) Instructor Evaluation</h5>
            <table className="w-full text-xs border-collapse border border-gray-800 font-serif">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 p-1.5 text-left font-bold">Aspect</th>
                  <th className="border border-gray-800 p-1.5 text-center font-bold w-32">Average Rating</th>
                </tr>
              </thead>
              <tbody>
                {(evalData.strengths?.instructorEvaluation?.table || []).map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                    <td className="border border-gray-800 p-1.5">{row.aspect}</td>
                    <td className="border border-gray-800 p-1.5 text-center font-bold">{row.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pt-1">
              <p className="text-xs font-bold text-gray-900 font-serif">Teaching Reflection</p>
              {isEditing ? (
                <textarea
                  value={evalData.strengths?.instructorEvaluation?.reflection || ''}
                  onChange={(e) => {
                    const copy = { ...evalData }
                    copy.strengths.instructorEvaluation.reflection = e.target.value
                    setEvalData(copy)
                  }}
                  className="w-full text-xs font-serif p-2.5 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                  rows={2}
                />
              ) : (
                <p className="text-xs text-gray-800 font-serif text-justify leading-relaxed mt-0.5">
                  {evalData.strengths?.instructorEvaluation?.reflection}
                </p>
              )}
            </div>
          </div>

          {/* d) Assessment and Workload Evaluation */}
          <div className="space-y-2 pl-2">
            <h5 className="text-xs font-bold text-gray-900 font-serif">d) Assessment and Workload Evaluation</h5>
            <table className="w-full text-xs border-collapse border border-gray-800 font-serif">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 p-1.5 text-left font-bold">Aspect</th>
                  <th className="border border-gray-800 p-1.5 text-center font-bold w-32">Average Rating</th>
                </tr>
              </thead>
              <tbody>
                {(evalData.strengths?.assessmentWorkload?.table || []).map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                    <td className="border border-gray-800 p-1.5">{row.aspect}</td>
                    <td className="border border-gray-800 p-1.5 text-center font-bold">{row.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pt-1">
              <p className="text-xs font-bold text-gray-900 font-serif">Teaching Reflection</p>
              {isEditing ? (
                <textarea
                  value={evalData.strengths?.assessmentWorkload?.reflection || ''}
                  onChange={(e) => {
                    const copy = { ...evalData }
                    copy.strengths.assessmentWorkload.reflection = e.target.value
                    setEvalData(copy)
                  }}
                  className="w-full text-xs font-serif p-2.5 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                  rows={2}
                />
              ) : (
                <p className="text-xs text-gray-800 font-serif text-justify leading-relaxed mt-0.5">
                  {evalData.strengths?.assessmentWorkload?.reflection}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 3. Outcome Achievement (Section 5) */}
        <section className="space-y-2">
          <h4 className="text-sm font-bold text-gray-950 font-serif">3. Outcome Achievement (Section 5)</h4>
          <table className="w-full text-xs border-collapse border border-gray-800 font-serif">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-800 p-1.5 text-left font-bold">Aspect</th>
                <th className="border border-gray-800 p-1.5 text-center font-bold w-32">Average Rating</th>
              </tr>
            </thead>
            <tbody>
              {(evalData.outcomeAchievement?.table || []).map((row, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                  <td className="border border-gray-800 p-1.5">{row.aspect}</td>
                  <td className="border border-gray-800 p-1.5 text-center font-bold">{row.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {isEditing ? (
            <textarea
              value={evalData.outcomeAchievement?.narrative || ''}
              onChange={(e) => {
                const copy = { ...evalData }
                copy.outcomeAchievement.narrative = e.target.value
                setEvalData(copy)
              }}
              className="w-full text-xs font-serif p-2.5 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-2"
              rows={3}
            />
          ) : (
            <p className="text-xs text-gray-800 font-serif text-justify leading-relaxed pt-1">
              {evalData.outcomeAchievement?.narrative}
            </p>
          )}
        </section>

        {/* 4. Student Open-Ended Feedback Summary */}
        <section className="space-y-3">
          <h4 className="text-sm font-bold text-gray-950 font-serif">4. Student Open-Ended Feedback Summary</h4>
          
          <div>
            <p className="text-xs font-bold text-gray-900 font-serif mb-1">Common Positive Remarks:</p>
            <ul className="list-disc pl-6 space-y-1 text-xs text-gray-800 font-serif">
              {(evalData.openEndedSummary?.positiveRemarks || []).map((remark, idx) => (
                <li key={idx}>"{remark.replace(/^["']|["']$/g, '')}"</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-900 font-serif mb-1">Suggested Improvements:</p>
            <ul className="list-disc pl-6 space-y-1 text-xs text-gray-800 font-serif">
              {(evalData.openEndedSummary?.suggestedImprovements || []).map((sug, idx) => (
                <li key={idx}>{sug}</li>
              ))}
            </ul>
          </div>

          <div className="pt-1">
            <p className="text-xs font-bold text-gray-900 font-serif">Teaching Reflection:</p>
            {isEditing ? (
              <textarea
                value={evalData.openEndedSummary?.reflection || ''}
                onChange={(e) => {
                  const copy = { ...evalData }
                  copy.openEndedSummary.reflection = e.target.value
                  setEvalData(copy)
                }}
                className="w-full text-xs font-serif p-2.5 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                rows={2}
              />
            ) : (
              <p className="text-xs text-gray-800 font-serif text-justify leading-relaxed mt-0.5">
                {evalData.openEndedSummary?.reflection}
              </p>
            )}
          </div>
        </section>

        {/* 5. Course Objectives Achievement */}
        <section className="space-y-2">
          <h4 className="text-sm font-bold text-gray-950 font-serif">5. Course Objectives Achievement</h4>
          <p className="text-xs text-gray-800 font-serif text-justify">
            Based on lecture observations, assessments, and student feedback, the objectives of the <b>{courseTitle}</b> Theory course were successfully achieved:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-xs text-gray-800 font-serif">
            {(evalData.objectivesAchievement || []).map((item, idx) => (
              <li key={idx} className="text-justify leading-relaxed">
                <b>{item.title}:</b> {item.detail}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-800 font-serif pt-1">
            Overall, the course effectively supported the achievement of learning objectives and CLOs.
          </p>
        </section>

        {/* 6. Student Performance */}
        <section className="space-y-2">
          <h4 className="text-sm font-bold text-gray-950 font-serif">6. Student Performance</h4>
          <p className="text-xs text-gray-800 font-serif text-justify">
            Student performance was evaluated based on class participation, understanding of theoretical concepts, assignments, and project/problem-solving performance:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-xs text-gray-800 font-serif">
            {(evalData.studentPerformance || []).map((item, idx) => (
              <li key={idx} className="text-justify leading-relaxed">
                <b>{item.title}:</b> {item.detail}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-800 font-serif pt-1">
            Overall, student performance indicates successful acquisition of theoretical knowledge and analytical skills in {courseTitle}.
          </p>
        </section>

        {/* 7. Teaching Resources */}
        <section className="space-y-2">
          <h4 className="text-sm font-bold text-gray-950 font-serif">7. Teaching Resources</h4>
          <p className="text-xs text-gray-800 font-serif text-justify">
            The availability of appropriate resources contributed significantly to effective course delivery:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-xs text-gray-800 font-serif">
            {(evalData.teachingResources || []).map((item, idx) => (
              <li key={idx} className="text-justify leading-relaxed">
                <b>{item.title}:</b> {item.detail}
              </li>
            ))}
          </ul>
        </section>

        {/* 8. Teaching Challenges Observed */}
        <section className="space-y-2">
          <h4 className="text-sm font-bold text-gray-950 font-serif">8. Teaching Challenges Observed</h4>
          <p className="text-xs text-gray-800 font-serif text-justify">
            During the course, some challenges were noted:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-xs text-gray-800 font-serif">
            {(evalData.teachingChallenges || []).map((item, idx) => (
              <li key={idx} className="text-justify leading-relaxed">
                <b>{item.title}:</b> {item.detail}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-800 font-serif pt-1 text-justify">
            Planned solutions include additional tutorial sessions, example problem sets, and interactive in-class discussions.
          </p>
        </section>

        {/* 9. Areas for Improvement and Action Plan */}
        <section className="space-y-2">
          <h4 className="text-sm font-bold text-gray-950 font-serif">9. Areas for Improvement and Action Plan</h4>
          <p className="text-xs text-gray-800 font-serif text-justify">
            In line with CQI principles, the following actions are planned:
          </p>
          <table className="w-full text-xs border-collapse border border-gray-800 font-serif">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-800 p-1.5 text-left font-bold w-44">Identified Area</th>
                <th className="border border-gray-800 p-1.5 text-left font-bold">Proposed Action</th>
              </tr>
            </thead>
            <tbody>
              {(evalData.actionPlan || []).map((row, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50/60' : ''}>
                  <td className="border border-gray-800 p-1.5 font-bold">{row.area}</td>
                  <td className="border border-gray-800 p-1.5">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.action}
                        onChange={(e) => {
                          const copy = { ...evalData }
                          copy.actionPlan[idx].action = e.target.value
                          setEvalData(copy)
                        }}
                        className="w-full text-xs font-serif p-1 border border-emerald-400 rounded focus:outline-none"
                      />
                    ) : (
                      row.action
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 10. Recommendations for Future Course Enhancement */}
        <section className="space-y-2">
          <h4 className="text-sm font-bold text-gray-950 font-serif">10. Recommendations for Future Course Enhancement</h4>
          <p className="text-xs text-gray-800 font-serif text-justify">
            To further improve the course effectiveness:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-xs text-gray-800 font-serif">
            {(evalData.recommendations || []).map((rec, idx) => (
              <li key={idx} className="text-justify leading-relaxed">
                {rec}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-800 font-serif pt-1">
            These enhancements will strengthen conceptual understanding, analytical skills, and student engagement.
          </p>
        </section>

        {/* 11. Conclusion */}
        <section className="space-y-2">
          <h4 className="text-sm font-bold text-gray-950 font-serif">11. Conclusion</h4>
          {isEditing ? (
            <textarea
              value={evalData.conclusion}
              onChange={(e) => setEvalData({ ...evalData, conclusion: e.target.value })}
              className="w-full text-xs font-serif p-3 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              rows={4}
            />
          ) : (
            <p className="text-xs text-gray-800 font-serif text-justify leading-relaxed">
              {evalData.conclusion}
            </p>
          )}
        </section>
        </>
        )}

      </div>
    </div>
  )
}
