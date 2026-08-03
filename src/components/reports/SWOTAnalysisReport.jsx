import React, { useState, useMemo, useEffect } from 'react'
import {
  FileText,
  Printer,
  Download,
  Edit3,
  Check,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Cpu,
  Bot,
  Plus,
  Trash2
} from 'lucide-react'
import { BAIUST_LOGO } from '../marks/baiustLogo'

const SWOTAnalysisReport = ({
  courseInfo = {},
  calculations = {},
  coMarkAllocations = {},
  activeCOs = [],
  activePOs = [],
  coMapping = {},
  targetPassMarks = 40,
  kpiCO = 50,
  kpiPO = 50,
  dbCourseOutcomes = [],
  dbProgramOutcomes = [],
  coDescriptions = {},
  poDescriptions = {},
}) => {
  // Helper to format Roman numerals for items
  const toRoman = (num) => {
    const map = [
      [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
    ]
    let result = ''
    for (const [val, letter] of map) {
      while (num >= val) {
        result += letter
        num -= val
      }
    }
    return result
  }

  const courseTitle = courseInfo.courseTitle || 'Object Oriented Programming Language'
  const courseCode = courseInfo.courseCode || 'CSE 213'
  const cacheKey = `SWOT_CACHE_${courseCode}_${courseTitle}`

  // Extract domain keywords for fallback
  const getSubjectDomain = (title) => {
    const lower = title.toLowerCase()
    if (lower.includes('algorithm')) return { domain: 'Algorithm Design', skill: 'Algorithmic Problem Solving', topics: 'dynamic programming, greedy strategies, and graph algorithms' }
    if (lower.includes('object oriented') || lower.includes('oop') || lower.includes('c++')) return { domain: 'OOP Concepts', skill: 'Advanced C++ Skills', topics: 'templates, exception handling, and dynamic memory management' }
    if (lower.includes('database') || lower.includes('dbms')) return { domain: 'Database Modeling', skill: 'SQL & Database Optimization', topics: 'normalization, SQL queries, and transaction management' }
    if (lower.includes('data structure')) return { domain: 'Data Structures', skill: 'Data Structure Implementation', topics: 'trees, graphs, hashing, and complexity analysis' }
    if (lower.includes('software') || lower.includes('engineering')) return { domain: 'Software Engineering', skill: 'Software Design & Architecture', topics: 'design patterns, UML modeling, and version control' }
    return { domain: 'Course Core Competencies', skill: 'Advanced Technical Skills', topics: 'complex problem solving and advanced analytical techniques' }
  }

  const subjectInfo = getSubjectDomain(courseTitle)

  // Fallback calculated data
  const fallbackCalculatedData = useMemo(() => {
    const coAttainments = calculations?.coAttainment || {}
    const poAttainments = calculations?.poAttainment || {}

    const strongCOs = activeCOs
      .map(co => ({
        code: co,
        passPct: coAttainments[co]?.passMarksPercentage || 0,
        kpiPct: coAttainments[co]?.kpiPercentage || 0,
        desc: coDescriptions[co] || `Course Outcome ${co}`
      }))
      .sort((a, b) => b.kpiPct - a.kpiPct)

    const weakCOs = activeCOs
      .map(co => ({
        code: co,
        passPct: coAttainments[co]?.passMarksPercentage || 0,
        kpiPct: coAttainments[co]?.kpiPercentage || 0,
        desc: coDescriptions[co] || `Course Outcome ${co}`
      }))
      .filter(c => (coMarkAllocations[c.code] || 0) > 0)
      .sort((a, b) => a.kpiPct - b.kpiPct)

    const allCOList = Array.from({ length: 12 }, (_, i) => `CO${i + 1}`)
    const allPOList = Array.from({ length: 12 }, (_, i) => `PO${i + 1}`)

    const unassessedCOs = allCOList.filter(co => !activeCOs.includes(co) || (coMarkAllocations[co] || 0) === 0)
    const unassessedPOs = allPOList.filter(po => !activePOs.includes(po))

    const getMappedPOs = (coCode) => {
      return activePOs.filter(po => coMapping?.[coCode]?.[po] === 1 || coMapping?.[coCode]?.[po] === '1')
    }

    const strengths = []
    const topCO1 = strongCOs[0]
    const topCO2 = strongCOs[1] || strongCOs[0]
    const topCO3 = strongCOs[2] || strongCOs[1] || strongCOs[0]

    if (topCO1) {
      const mappedPOs = getMappedPOs(topCO1.code)
      const poStr = mappedPOs.length > 0 ? mappedPOs.join(', ') : 'PO1, PO2'
      strengths.push({
        title: `Outstanding Practical Application (${topCO1.code}, ${poStr})`,
        bullets: [
          `${topCO1.passPct.toFixed(1)}% of students exceed the ${targetPassMarks}% pass mark and ${topCO1.kpiPct.toFixed(1)}% exceed the ${kpiCO}% KPI in applying ${courseTitle.toLowerCase()} concepts to solve real-life problems (${topCO1.code}).`,
          `Attainment in mapped program outcomes (${poStr}) demonstrates strong analytical and application capabilities.`,
          `Implication: The course strongly supports students' ability to translate theoretical ${courseTitle.toLowerCase()} concepts into practical problem-solving skills, which aligns well with industry expectations.`
        ]
      })
    }

    if (topCO2 && topCO2.code !== topCO1?.code) {
      const mappedPOs = getMappedPOs(topCO2.code)
      const poStr = mappedPOs.length > 0 ? mappedPOs.join(', ') : 'PO9'
      strengths.push({
        title: `Excellent Teamwork and Collaboration (${topCO2.code}, ${poStr})`,
        bullets: [
          `${topCO2.passPct.toFixed(1)}% of students exceed both ${targetPassMarks}% pass mark and ${kpiCO}% KPI in teamwork and collaborative activities (${topCO2.code}).`,
          `High attainment in ${poStr} demonstrates strong development of teamwork skills.`,
          `Implication: Group assignments, presentations, and collaborative programming activities effectively foster professional teamwork skills among students.`
        ]
      })
    }

    if (topCO3 && topCO3.code !== topCO1?.code && topCO3.code !== topCO2?.code) {
      const mappedPOs = getMappedPOs(topCO3.code)
      const poStr = mappedPOs.length > 0 ? mappedPOs.join(', ') : 'PO1'
      strengths.push({
        title: `Strong Foundation in Core ${subjectInfo.domain} (${topCO3.code}, ${poStr})`,
        bullets: [
          `${topCO3.passPct.toFixed(1)}% > ${targetPassMarks}% and ${topCO3.kpiPct.toFixed(1)}% > ${kpiCO}% in understanding fundamental ${courseTitle.toLowerCase()} principles (${topCO3.code}).`,
          `Attainment in engineering knowledge (${poStr}) is high.`,
          `Alignment: The course successfully establishes strong foundational knowledge consistent with program learning expectations.`
        ]
      })
    }

    const weaknesses = []
    const lowestCO = weakCOs.find(c => c.kpiPct < kpiCO) || weakCOs[weakCOs.length - 1]

    if (lowestCO) {
      weaknesses.push({
        title: `Moderate ${subjectInfo.skill} Proficiency (${lowestCO.code})`,
        bullets: [
          `${lowestCO.passPct.toFixed(1)}% of students exceed the ${targetPassMarks}% pass mark, but only ${lowestCO.kpiPct.toFixed(1)}% exceed the ${kpiCO}% KPI for solving programming problems using ${subjectInfo.topics} (${lowestCO.code}).`,
          `Gap: Although most students meet the minimum requirement, many struggle with deeper understanding of advanced features such as ${subjectInfo.topics}.`
        ]
      })
    }

    if (unassessedCOs.length > 0 || unassessedPOs.length > 0) {
      const coText = unassessedCOs.length > 0 ? `${unassessedCOs[0]}–${unassessedCOs[unassessedCOs.length - 1]}` : 'CO5-CO12'
      const poText = unassessedPOs.length > 0 ? `${unassessedPOs[0]}–${unassessedPOs[unassessedPOs.length - 1]}` : 'PO3-PO12'
      weaknesses.push({
        title: `Limited Coverage of Additional COs and POs`,
        bullets: [
          `${coText} and ${poText} show 0% attainment, indicating that these outcomes were not assessed in this course.`,
          `Risk: Lack of assessment for some program outcomes may reduce the overall balance of outcome evaluation within the course.`
        ]
      })
    }

    const opportunities = [
      {
        title: `Leverage ${topCO1?.code || 'CO4'} and ${getMappedPOs(topCO1?.code)[0] || 'PO2'} Success`,
        bullets: [
          `The strong attainment in real-life application and problem-solving suggests that practical teaching strategies are highly effective.`,
          `These strategies (e.g., project-based learning, real-life programming examples) can be applied to improve ${lowestCO?.code || 'CO2'} performance in ${subjectInfo.topics}.`
        ]
      },
      {
        title: `Enhance ${subjectInfo.skill}`,
        bullets: [
          `Introduce mini programming projects and debugging exercises focusing on ${subjectInfo.topics}.`,
          `Practical coding sessions may increase KPI attainment in ${lowestCO?.code || 'CO2'}.`
        ]
      },
      {
        title: `Strengthen Collaborative Learning`,
        bullets: [
          `Since teamwork outcomes show excellent performance, introducing peer evaluation and pair programming activities can further enhance collaborative learning experiences.`
        ]
      }
    ]

    const recommendations = [
      {
        title: `Improve ${lowestCO?.code || 'CO2'} Attainment (${subjectInfo.skill})`,
        bullets: [
          `Introduce 2–3 challenge-based programming labs focusing on ${subjectInfo.topics}.`,
          `Use stepwise problem-solving exercises (basic → intermediate → advanced).`,
          `Encourage practice through online coding platforms.`
        ]
      },
      {
        title: `Expand Outcome Coverage`,
        bullets: [
          `Integrate small activities that contribute to additional program outcomes such as:`,
          `• Ethical considerations in software development`,
          `• Documentation and software version control.`
        ]
      },
      {
        title: `Continuous Concept Reinforcement`,
        bullets: [
          `Incorporate short quizzes and coding demonstrations during lectures to reinforce important ${courseTitle.toLowerCase()} concepts.`
        ]
      }
    ]

    const threats = [
      {
        title: `Overemphasis on Limited Outcomes`,
        bullets: [
          `High focus on CO1–CO4 and PO1, PO2, PO9 may result in limited exposure to other program outcomes.`,
          `Mitigation: Future course design should integrate activities covering additional POs such as ethics, modern tools, and professional responsibility.`
        ]
      },
      {
        title: `Advanced Skill Gap Affecting Industry Readiness`,
        bullets: [
          `Moderate KPI attainment in ${lowestCO?.code || 'CO2'} suggests some students may lack confidence in implementing ${subjectInfo.topics}.`,
          `Solution: Encourage more hands-on coding practice and project-based assignments.`
        ]
      }
    ]

    const conclusion = `The course demonstrates excellent performance in practical application (${topCO1?.code || 'CO4'}/${getMappedPOs(topCO1?.code)[0] || 'PO2'}), teamwork development (${topCO2?.code || 'CO3'}/${getMappedPOs(topCO2?.code)[0] || 'PO9'}), and foundational ${subjectInfo.domain.toLowerCase()} (${topCO3?.code || 'CO1'}/${getMappedPOs(topCO3?.code)[0] || 'PO1'}). However, advanced ${subjectInfo.skill.toLowerCase()} (${lowestCO?.code || 'CO2'}) show comparatively lower KPI attainment, indicating the need for additional hands-on exercises and challenge-based learning. Expanding the assessment of additional program outcomes will further strengthen the course's alignment with program objectives and accreditation expectations. Continuous improvement through practical programming tasks and real-world applications will enhance both student competency and industry readiness.`

    return {
      strengths,
      weaknesses,
      opportunities,
      recommendations,
      threats,
      conclusion
    }
  }, [calculations, activeCOs, activePOs, coMarkAllocations, coMapping, targetPassMarks, kpiCO, kpiPO, coDescriptions, poDescriptions, courseTitle, courseCode])

  // Component States
  const [swotData, setSwotData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiSource, setAiSource] = useState('gemini')

  const currentSWOT = swotData || fallbackCalculatedData

  // Function to call Gemini AI API (or read from cache)
  const fetchGeminiSWOT = async (forceRegenerate = false) => {
    // 1. Check localStorage cache first unless forceRegenerate is true
    if (!forceRegenerate) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed?.strengths && parsed?.weaknesses && parsed?.conclusion) {
            setSwotData(parsed)
            setAiSource('gemini')
            setGeneratingAI(false)
            return
          }
        } catch (e) {
          console.warn('Failed to parse cached SWOT data:', e)
        }
      }
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || localStorage.getItem('OBE_GEMINI_API_KEY') || ''
    
    setGeneratingAI(true)
    try {
      const sessionText = courseInfo.semesterName && courseInfo.academicYear
        ? (courseInfo.semesterName.includes(String(courseInfo.academicYear)) ? courseInfo.semesterName : `${courseInfo.semesterName} ${courseInfo.academicYear}`)
        : 'Spring 2026'

      const coDetailsList = activeCOs.map(co => ({
        code: co,
        description: coDescriptions[co] || `Course Outcome ${co}`,
        passPercentage: (calculations?.coAttainment?.[co]?.passMarksPercentage || 0).toFixed(1) + '%',
        kpiPercentage: (calculations?.coAttainment?.[co]?.kpiPercentage || 0).toFixed(1) + '%',
        attained: (calculations?.coAttainment?.[co]?.kpiPercentage || 0) >= kpiCO
      }))

      const poDetailsList = activePOs.map(po => ({
        code: po,
        description: poDescriptions[po] || `Program Outcome ${po}`,
        passPercentage: (calculations?.poAttainment?.[po]?.passMarksPercentage || 0).toFixed(1) + '%',
        kpiPercentage: (calculations?.poAttainment?.[po]?.kpiPercentage || 0).toFixed(1) + '%',
        attained: (calculations?.poAttainment?.[po]?.kpiPercentage || 0) >= kpiPO
      }))

      const allCOList = Array.from({ length: 12 }, (_, i) => `CO${i + 1}`)
      const allPOList = Array.from({ length: 12 }, (_, i) => `PO${i + 1}`)
      const unassessedCOsText = allCOList.filter(co => !activeCOs.includes(co) || (coMarkAllocations[co] || 0) === 0).join(', ') || 'None'
      const unassessedPOsText = allPOList.filter(po => !activePOs.includes(po)).join(', ') || 'None'

      // Include teacher's custom edits / added points into prompt if regenerating
      const teacherDraftContext = swotData ? `
TEACHER'S CURRENT DRAFT & CUSTOM ADDED NOTES (IMPORTANT):
The teacher may have added custom points, notes, or new topics. You MUST preserve and include all custom points added by the teacher, but rewrite their phrasing into highly academic, professional, course-oriented prose:
${JSON.stringify(swotData, null, 2)}
` : ''

      const promptText = `System Role: You are a Senior Academic OBE Accreditation Consultant and CSE University Professor.
Your task is to write a deeply course-specific, highly professional, non-generic SWOT Analysis report for an Outcome-Based Education (OBE) course file submission at Bangladesh Army International University of Science and Technology (BAIUST), Cumilla.

CRITICAL INSTRUCTIONS:
1. Customize every single bullet point, title, gap analysis, recommendation, threat, and solution to the EXACT subject matter of "${courseTitle}" (${courseCode}) using domain-specific technical terminology (e.g. for Object Oriented Programming: inheritance, polymorphism, C++ templates, exception handling, dynamic memory; for Algorithms: divide & conquer, greedy strategies, dynamic programming, asymptotic complexity, graph algorithms; etc.).
2. TEACHER CUSTOM INPUT RULE: ${teacherDraftContext ? 'Preserve and incorporate all teacher-added custom points and bullet notes from the provided Teacher Draft below, but polish and rewrite every item into professional academic prose.' : 'Generate a complete, course-oriented academic report.'}

${teacherDraftContext}

Course Details:
- Course Code: ${courseCode}
- Course Title: ${courseTitle}
- Department: Department of Computer Science and Engineering
- Institution: BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST), CUMILLA
- Academic Session: ${sessionText}
- Pass Mark Threshold: ${targetPassMarks}%
- CO KPI Target Threshold: ${kpiCO}%
- PO KPI Target Threshold: ${kpiPO}%

Course Outcomes (CO) & Attainments with Descriptions:
${JSON.stringify(coDetailsList, null, 2)}

Program Outcomes (PO) & Attainments with Descriptions:
${JSON.stringify(poDetailsList, null, 2)}

Active CO-PO Mappings:
${JSON.stringify(coMapping, null, 2)}

Unassessed Outcomes:
- Unassessed COs: ${unassessedCOsText}
- Unassessed POs: ${unassessedPOsText}

REQUIRED DOCUMENT STRUCTURE (JSON output):
Return ONLY a valid JSON object (no markdown backticks, no code fence wrapper) matching this EXACT schema:

{
  "strengths": [
    {
      "title": "Course-specific strength title with CO/PO codes, e.g. Outstanding Practical Application (CO4, PO2)",
      "bullets": [
        "X% of students exceed the ${targetPassMarks}% pass mark and Y% exceed the ${kpiCO}% KPI in applying [specific course subject concepts] to solve real-life problems ([CO_code]).",
        "X% > ${targetPassMarks}% and Y% > ${kpiPO}% in [specific PO description].",
        "Implication: The course strongly supports students' ability to translate theoretical [course title] concepts into practical problem-solving skills, which aligns well with industry expectations."
      ]
    }
  ],
  "weaknesses": [
    {
      "title": "Course-specific weak topic title, e.g. Moderate Advanced Programming Proficiency (CO2)",
      "bullets": [
        "X% of students exceed the ${targetPassMarks}% pass mark, but only Y% exceed the ${kpiCO}% KPI for solving programming problems using advanced [specific course features].",
        "Gap: Although most students meet the minimum requirement, many struggle with deeper understanding of advanced features such as [list 2-3 specific topics]."
      ]
    }
  ],
  "opportunities": [
    {
      "title": "Leverage [High CO] and [High PO] Success",
      "bullets": [
        "The strong attainment in real-life application and problem-solving suggests that practical teaching strategies are highly effective. These strategies can be applied to improve [Low CO] performance in advanced [subject area]."
      ]
    }
  ],
  "recommendations": [
    {
      "title": "Improve [Low CO] Attainment (Advanced [Subject Skill])",
      "bullets": [
        "Introduce 2–3 challenge-based programming labs focusing on advanced [subject] features.",
        "Use stepwise problem-solving exercises (basic → intermediate → advanced).",
        "Encourage practice through online coding platforms."
      ]
    }
  ],
  "threats": [
    {
      "title": "Overemphasis on Limited Outcomes",
      "bullets": [
        "High focus on primary COs/POs may result in limited exposure to other program outcomes.",
        "Mitigation: Future course design should integrate activities covering additional POs."
      ]
    }
  ],
  "conclusion": "A single, highly professional academic paragraph summarizing strengths, weak areas, and continuous improvement recommendations specifically for ${courseTitle} (${courseCode})."
}`

      let rawOutput = ''

      try {
        const token = localStorage.getItem('token')
        const backendRes = await fetch('/api/ai/swot-generate', {
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
        console.warn('Backend SWOT AI Proxy unavailable, attempting direct client fetch:', proxyErr.message)
      }

      if (!rawOutput && apiKey) {
        const clientEndpoints = [
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
        ]

        for (const url of clientEndpoints) {
          try {
            const clientRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
            console.warn('Client fetch endpoint error:', cErr.message)
          }
        }
      }

      if (!rawOutput) {
        throw new Error('Unable to connect to Gemini AI service. Please check API key.')
      }

      const cleanedText = rawOutput.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsedJSON = JSON.parse(cleanedText)

      if (parsedJSON.strengths && parsedJSON.weaknesses && parsedJSON.conclusion) {
        setSwotData(parsedJSON)
        setAiSource('gemini')
        try {
          localStorage.setItem(cacheKey, JSON.stringify(parsedJSON))
        } catch (e) {
          console.warn('LocalStorage save failed:', e)
        }
      } else {
        throw new Error('Invalid JSON layout from Gemini')
      }
    } catch (err) {
      console.warn('Gemini AI SWOT Fetch Error:', err.message)
      setSwotData(fallbackCalculatedData)
      setAiSource('calculated')
    } finally {
      setGeneratingAI(false)
    }
  }

  useEffect(() => {
    fetchGeminiSWOT(false)
  }, [courseInfo.courseCode, courseInfo.courseTitle])

  const handleResetToAuto = () => {
    fetchGeminiSWOT(true)
  }

  // Edit Handlers (Add, Update, Delete for items and bullets)
  const updateSectionItem = (sectionKey, itemIdx, field, val) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (field === 'title') {
      copy[sectionKey][itemIdx].title = val
    } else if (field === 'bullet') {
      copy[sectionKey][itemIdx].bullets[val[0]] = val[1]
    }
    setSwotData(copy)
    try {
      localStorage.setItem(cacheKey, JSON.stringify(copy))
    } catch (e) {}
  }

  const addSectionItem = (sectionKey) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (!copy[sectionKey]) copy[sectionKey] = []
    copy[sectionKey].push({
      title: `Custom ${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} Point`,
      bullets: [`Enter custom teacher note or topic for ${courseTitle}...`]
    })
    setSwotData(copy)
    try {
      localStorage.setItem(cacheKey, JSON.stringify(copy))
    } catch (e) {}
  }

  const deleteSectionItem = (sectionKey, itemIdx) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (copy[sectionKey] && copy[sectionKey].length > itemIdx) {
      copy[sectionKey].splice(itemIdx, 1)
      setSwotData(copy)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(copy))
      } catch (e) {}
    }
  }

  const addBulletToItem = (sectionKey, itemIdx) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (copy[sectionKey] && copy[sectionKey][itemIdx]) {
      if (!copy[sectionKey][itemIdx].bullets) copy[sectionKey][itemIdx].bullets = []
      copy[sectionKey][itemIdx].bullets.push('Enter additional detail or note...')
      setSwotData(copy)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(copy))
      } catch (e) {}
    }
  }

  const deleteBulletFromItem = (sectionKey, itemIdx, bulletIdx) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (copy[sectionKey] && copy[sectionKey][itemIdx] && copy[sectionKey][itemIdx].bullets) {
      copy[sectionKey][itemIdx].bullets.splice(bulletIdx, 1)
      setSwotData(copy)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(copy))
      } catch (e) {}
    }
  }

  const updateConclusion = (val) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    copy.conclusion = val
    setSwotData(copy)
    try {
      localStorage.setItem(cacheKey, JSON.stringify(copy))
    } catch (e) {}
  }

  const handlePrintPDF = () => {
    window.print()
  }

  const handleExportWord = () => {
    const sessionText = courseInfo.semesterName && courseInfo.academicYear
      ? (courseInfo.semesterName.includes(String(courseInfo.academicYear)) ? courseInfo.semesterName : `${courseInfo.semesterName} ${courseInfo.academicYear}`)
      : 'Spring 2026'

    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>SWOT Analysis Report</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; margin: 40px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; }
          .header-table td { border: none !important; padding: 2px; }
          .uni-name-bn { font-size: 14pt; font-weight: bold; color: #000; }
          .uni-name-en { font-size: 11pt; font-weight: bold; color: #000; }
          .dept-name { font-size: 11pt; font-weight: bold; }
          .meta-line { font-size: 11pt; font-weight: bold; margin-top: 4px; }
          .doc-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 10px; text-align: center; text-decoration: underline; }
          h3 { font-size: 12pt; font-weight: bold; margin-top: 16px; margin-bottom: 8px; }
          ol { margin-left: 20px; padding-left: 0; }
          li { margin-bottom: 8px; list-style-type: lower-roman; font-weight: bold; }
          ul { margin-left: 20px; padding-left: 0; font-weight: normal; }
          ul li { list-style-type: disc; margin-bottom: 4px; font-weight: normal; }
          .conclusion { margin-top: 16px; text-align: justify; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <img src="${BAIUST_LOGO}" width="60" height="60" alt="Logo" /><br/>
              <div class="uni-name-bn">বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি, কুমিল্লা</div>
              <div class="uni-name-en">BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST), CUMILLA</div>
              <div class="dept-name">Department of Computer Science and Engineering</div>
              <div class="meta-line">${sessionText}</div>
              <div class="meta-line">Course Code: ${courseCode}</div>
              <div class="meta-line">Course Title: ${courseTitle}</div>
            </td>
          </tr>
        </table>

        <div class="doc-title">SWOT Analysis</div>

        <h3>1. Strengths</h3>
        <ol>
          ${currentSWOT.strengths.map(item => `
            <li>
              <strong>${item.title}</strong>
              <ul>
                ${item.bullets.map(b => `<li>${b}</li>`).join('')}
              </ul>
            </li>
          `).join('')}
        </ol>

        <h3>2. Weaknesses</h3>
        <ol>
          ${currentSWOT.weaknesses.map(item => `
            <li>
              <strong>${item.title}</strong>
              <ul>
                ${item.bullets.map(b => `<li>${b}</li>`).join('')}
              </ul>
            </li>
          `).join('')}
        </ol>

        <h3>3. Opportunities</h3>
        <ol>
          ${currentSWOT.opportunities.map(item => `
            <li>
              <strong>${item.title}</strong>
              <ul>
                ${item.bullets.map(b => `<li>${b}</li>`).join('')}
              </ul>
            </li>
          `).join('')}
        </ol>

        <h3>4. Recommendations</h3>
        <ol>
          ${currentSWOT.recommendations.map(item => `
            <li>
              <strong>${item.title}</strong>
              <ul>
                ${item.bullets.map(b => `<li>${b}</li>`).join('')}
              </ul>
            </li>
          `).join('')}
        </ol>

        <h3>5. Threats</h3>
        <ol>
          ${currentSWOT.threats.map(item => `
            <li>
              <strong>${item.title}</strong>
              <ul>
                ${item.bullets.map(b => `<li>${b}</li>`).join('')}
              </ul>
            </li>
          `).join('')}
        </ol>

        <h3>Conclusion</h3>
        <p class="conclusion">${currentSWOT.conclusion}</p>
      </body>
      </html>
    `

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SWOT_Analysis_${courseCode}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const sessionText = courseInfo.semesterName && courseInfo.academicYear
    ? (courseInfo.semesterName.includes(String(courseInfo.academicYear)) ? courseInfo.semesterName : `${courseInfo.semesterName} ${courseInfo.academicYear}`)
    : 'Spring 2026'

  // Helper to render editable/viewable section
  const renderSection = (sectionKey, sectionTitle, sectionNumber) => {
    const items = currentSWOT[sectionKey] || []

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-extrabold text-black">{sectionNumber}. {sectionTitle}</h4>
          {isEditing && (
            <button
              onClick={() => addSectionItem(sectionKey)}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-all no-print shadow-sm"
              title={`Add new point under ${sectionTitle}`}
            >
              <Plus size={13} />
              <span>Add Point</span>
            </button>
          )}
        </div>
        <div className="space-y-3 pl-4">
          {items.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span className="flex-shrink-0">{toRoman(idx + 1)}.</span>
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateSectionItem(sectionKey, idx, 'title', e.target.value)}
                      className="w-full border-b border-gray-400 font-bold px-1.5 py-0.5 outline-none text-sm font-serif bg-amber-50/40 rounded-t"
                      placeholder="Point title..."
                    />
                    <button
                      onClick={() => deleteSectionItem(sectionKey, idx)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all no-print flex-shrink-0"
                      title="Delete entire point"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <span>{item.title}</span>
                )}
              </div>
              <ul className="list-disc pl-8 space-y-1 text-xs">
                {(item.bullets || []).map((bullet, bIdx) => (
                  <li key={bIdx}>
                    {isEditing ? (
                      <div className="flex items-start gap-2 w-full">
                        <textarea
                          value={bullet}
                          onChange={(e) => updateSectionItem(sectionKey, idx, 'bullet', [bIdx, e.target.value])}
                          className="w-full border border-gray-300 rounded p-1.5 text-xs font-serif outline-none focus:border-emerald-500 bg-amber-50/20"
                          rows={2}
                          placeholder="Bullet detail note..."
                        />
                        <button
                          onClick={() => deleteBulletFromItem(sectionKey, idx, bIdx)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all no-print flex-shrink-0 mt-1"
                          title="Delete bullet point"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <span>{bullet}</span>
                    )}
                  </li>
                ))}
              </ul>
              {isEditing && (
                <div className="pl-8 pt-1 no-print">
                  <button
                    onClick={() => addBulletToItem(sectionKey, idx)}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-emerald-50"
                  >
                    <Plus size={11} />
                    <span>Add Bullet</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar (No-Print) */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl shadow-sm">
            <Bot size={22} className={generatingAI ? 'animate-spin' : ''} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-800">Automated SWOT Analysis</h3>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              Course-Oriented SWOT Report for {courseCode} - {courseTitle}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              isEditing ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
          >
            {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
            <span>{isEditing ? 'Done Editing' : 'Edit Report'}</span>
          </button>

          <button
            onClick={handleResetToAuto}
            disabled={generatingAI}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold border transition-all disabled:opacity-50"
            title="Regenerate & AI-polish report (incorporates teacher custom notes)"
          >
            <RotateCcw size={14} className={generatingAI ? 'animate-spin' : ''} />
            <span>Regenerate</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            <Printer size={14} />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={handleExportWord}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            <Download size={14} />
            <span>Export Word</span>
          </button>
        </div>
      </div>

      {/* Main Document Preview Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-12 max-w-4xl mx-auto printable-swot-document" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        
        {/* BAIUST Official Header */}
        <div className="text-center space-y-1 mb-8">
          <div className="flex justify-center mb-2">
            <img src={BAIUST_LOGO} alt="BAIUST Logo" className="h-16 w-auto object-contain" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-black leading-tight">
            বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি, কুমিল্লা
          </div>
          <div className="text-xs sm:text-sm font-bold text-black tracking-tight">
            BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST), CUMILLA
          </div>
          <div className="text-xs font-bold text-black">
            Department of Computer Science and Engineering
          </div>
          <div className="text-xs font-bold text-black mt-1">
            {sessionText}
          </div>
          <div className="text-xs font-bold text-black">
            Course Code: {courseCode}
          </div>
          <div className="text-xs font-bold text-black">
            Course Title: {courseTitle}
          </div>
          <div className="text-sm font-black text-black tracking-wider uppercase mt-4 underline">
            SWOT Analysis
          </div>
        </div>

        {/* Sections or Inline Loading Skeleton */}
        {generatingAI ? (
          <div className="py-10 space-y-6 font-sans no-print">
            <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm">
              <RefreshCw size={16} className="animate-spin" />
              <span>Generating & Polishing AI SWOT Report for {courseCode}...</span>
            </div>
            <div className="space-y-4 max-w-2xl mx-auto opacity-70">
              <div className="h-4 bg-emerald-100 rounded w-1/3 animate-pulse"></div>
              <div className="h-3 bg-gray-150 rounded w-full animate-pulse"></div>
              <div className="h-3 bg-gray-150 rounded w-5/6 animate-pulse"></div>
              <div className="h-4 bg-emerald-100 rounded w-1/4 animate-pulse pt-3"></div>
              <div className="h-3 bg-gray-150 rounded w-11/12 animate-pulse"></div>
              <div className="h-3 bg-gray-150 rounded w-4/5 animate-pulse"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-sm text-black leading-relaxed">
            {renderSection('strengths', 'Strengths', 1)}
            {renderSection('weaknesses', 'Weaknesses', 2)}
            {renderSection('opportunities', 'Opportunities', 3)}
            {renderSection('recommendations', 'Recommendations', 4)}
            {renderSection('threats', 'Threats', 5)}

            {/* Conclusion */}
            <div className="pt-2">
              <h4 className="text-base font-extrabold text-black mb-1">Conclusion</h4>
              {isEditing ? (
                <textarea
                  value={currentSWOT.conclusion}
                  onChange={(e) => updateConclusion(e.target.value)}
                  className="w-full border rounded p-2 text-xs font-serif outline-none leading-relaxed bg-amber-50/20 focus:border-emerald-500"
                  rows={4}
                  placeholder="Conclusion paragraph..."
                />
              ) : (
                <p className="text-xs text-justify font-normal leading-relaxed">
                  {currentSWOT.conclusion}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SWOTAnalysisReport
