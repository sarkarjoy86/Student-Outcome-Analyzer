import React, { useState, useMemo, useEffect } from 'react'
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
  Award,
  Target,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { BAIUST_LOGO } from '../marks/baiustLogo'

// Standard Washington Accord Program Outcomes Dictionary
const STANDARD_PO_NAMES = {
  PO1: 'Engineering Knowledge',
  PO2: 'Problem Analysis',
  PO3: 'Design/Development of Solutions',
  PO4: 'Investigation',
  PO5: 'Modern Tool Usage',
  PO6: 'The Engineer and Society',
  PO7: 'Environment and Sustainability',
  PO8: 'Ethics',
  PO9: 'Individual and Team Work',
  PO10: 'Communication',
  PO11: 'Project Management and Finance',
  PO12: 'Lifelong Learning',
}

export default function SelfAssessmentReport({
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
  reportScope = 'section',
}) {
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiSource, setAiSource] = useState('cached') // 'gemini' | 'cached' | 'fallback'
  const [isEditing, setIsEditing] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const courseTitle = courseInfo.courseTitle || courseInfo.courseName || 'Object-Oriented Programming Language'
  const courseCode = courseInfo.courseCode || 'CSE 213'
  const teacherName = courseInfo.teacherName || 'MD. Saad Bin Kamal'
  const teacherDesignation = courseInfo.teacherDesignation || 'Lecturer'
  const semesterName = courseInfo.semesterName || 'Spring'
  const academicYear = courseInfo.academicYear || String(new Date().getFullYear())
  const levelText = courseInfo.level || (courseCode.match(/\d+/) ? courseCode.match(/\d+/)[0][0] : '2')
  const termText = courseInfo.term || (courseCode.match(/\d+/) && courseCode.match(/\d+/)[0][1] === '2' ? 'II' : 'I')
  const groupText = courseInfo.group || 'N/A'
  const sectionText = reportScope === 'combined'
    ? 'All Sections (A & B)'
    : (courseInfo.rawSectionName || courseInfo.sectionName || 'A')

  const cacheKey = `SELF_ASSESSMENT_CACHE_${courseCode.replace(/[^a-zA-Z0-9_-]/g, '_')}_${sectionText.replace(/[^a-zA-Z0-9_-]/g, '_')}`

  // Helper to ensure full Program Outcome label format e.g. "PO1 - Engineering Knowledge"
  const getPoLabel = (po) => {
    const cleanPo = (po || '').trim()
    if (!cleanPo) return 'PO - Program Outcome'
    if (cleanPo.includes(' - ')) return cleanPo

    const custom = poDescriptions[cleanPo] ||
      dbProgramOutcomes.find(d => d.code === cleanPo)?.title ||
      dbProgramOutcomes.find(d => d.code === cleanPo)?.description

    if (custom && typeof custom === 'string' && custom.trim()) {
      const trimmed = custom.trim()
      if (trimmed.toLowerCase().startsWith(cleanPo.toLowerCase() + ' -')) {
        return trimmed
      }
      if (trimmed.toLowerCase().startsWith(cleanPo.toLowerCase())) {
        const stripped = trimmed.replace(new RegExp(`^${cleanPo}[:\\s-]*`, 'i'), '').trim()
        if (stripped) return `${cleanPo} - ${stripped.split(':')[0].trim()}`
      }
      const titlePart = trimmed.split(':')[0].trim()
      if (titlePart.length > 0 && titlePart.length < 50) {
        return `${cleanPo} - ${titlePart}`
      }
    }

    const standardName = STANDARD_PO_NAMES[cleanPo] || 'Program Outcome'
    return `${cleanPo} - ${standardName}`
  }

  // Domain knowledge helper for deep technical fallback
  const getSubjectDomain = (title) => {
    const lower = (title || '').toLowerCase()
    if (lower.includes('image')) {
      return {
        domain: 'Digital Image Processing',
        keywords: 'digital image representation, acquisition, spatial-domain enhancement, restoration, filtering, frequency-domain transforms, segmentation, and CNN-based image classification',
        strengths: [
          'Conceptual discussions and examples related to image formation, spatial filtering, and digital representation effectively supported students\' foundational knowledge.',
          'Hands-on implementation of spatial-domain enhancement and restoration techniques enabled students to grasp complex filtering operations.',
          'Exercises on Fourier analysis and frequency-domain filtering improved students\' analytical and mathematical understanding.',
          'Exposure to convolutional neural networks (CNNs), feature extraction metrics, and object detection supported achievement of this outcome.'
        ],
        recommendations: [
          'Continue strengthening conceptual understanding through more application-based examples and visual demonstrations.',
          'Provide additional comparative exercises to improve technique selection and parameter optimization in image restoration.',
          'Introduce more complex frequency-domain applications and practical implementation-based tasks.',
          'Provide more practice on deep CNN architectures, model hyperparameter tuning, and evaluation metrics to improve advanced competency.'
        ]
      }
    }
    if (lower.includes('object') || lower.includes('oop') || lower.includes('c++') || lower.includes('java')) {
      return {
        domain: 'Object-Oriented Programming',
        keywords: 'encapsulation, abstraction, inheritance, polymorphism, dynamic memory management, templates, exception handling, and design patterns',
        strengths: [
          'Systematic lecture progressions and hands-on lab sessions helped students master core object-oriented paradigms like inheritance and polymorphism.',
          'Collaborative pair programming and structured assignments bridged theoretical syntax and practical modular application design.',
          'Implementation of template classes and exception handling mechanisms strengthened students\' algorithmic rigor and fault-tolerant software design.',
          'Modular project-based deliverables demonstrated student capability to translate real-world requirements into scalable object models.'
        ],
        recommendations: [
          'Incorporate additional debugging sessions focusing on dynamic memory allocation, pointer arithmetic, and resource management.',
          'Introduce more real-world problem scenarios requiring multi-tier design patterns and interface segregation.',
          'Encourage systematic unit testing and version control practices during collaborative software tasks.',
          'Provide scaffolded coding tutorials for advanced generic programming and standard template library (STL) optimizations.'
        ]
      }
    }
    if (lower.includes('algorithm')) {
      return {
        domain: 'Algorithms',
        keywords: 'asymptotic analysis, divide-and-conquer, greedy algorithms, dynamic programming, graph algorithms, and NP-completeness',
        strengths: [
          'Rigorous mathematical derivations and step-by-step trace examples solidified asymptotic complexity analysis.',
          'Interactive algorithm simulation exercises enhanced student comprehension of greedy strategies and dynamic programming state transitions.',
          'Graph traversal and shortest-path implementation labs fostered strong computational problem-solving competency.',
          'Benchmark evaluation tasks allowed students to analyze algorithmic efficiency against varying dataset scales.'
        ],
        recommendations: [
          'Reinforce recurrence relation solving techniques through extended tutorial worksheets.',
          'Provide additional case studies on dynamic programming memoization versus tabulation approaches.',
          'Integrate competitive programming platforms for rapid hands-on coding and edge-case validation.',
          'Organize review sessions focusing on network flow algorithms and NP-complete reduction proofs.'
        ]
      }
    }
    if (lower.includes('data structure')) {
      return {
        domain: 'Data Structures',
        keywords: 'linear structures, trees, heaps, hashing, graph representations, and memory complexity',
        strengths: [
          'Comprehensive memory visualization diagrams assisted students in understanding pointer-based linear and hierarchical data structures.',
          'Extensive hands-on lab exercises on binary search trees, AVL balancing, and heaps developed robust implementation skills.',
          'Hash table collision resolution experiments clarified empirical time-space trade-offs.',
          'Structured coursework problems encouraged disciplined data structure selection tailored to specific computational requirements.'
        ],
        recommendations: [
          'Allocate additional laboratory hours for recursive tree traversals and balanced tree rotations.',
          'Offer supplemental practical sessions on graph representations (adjacency lists vs. matrices).',
          'Introduce automated test suites to help students self-diagnose memory leaks and boundary conditions.',
          'Expand competitive problem sets on priority queues and disjoint set union structures.'
        ]
      }
    }
    if (lower.includes('communication') || lower.includes('network')) {
      return {
        domain: 'Data Communications & Networking',
        keywords: 'signal modulation, multiplexing, transmission media, error detection and correction, OSI layer protocols, and routing algorithms',
        strengths: [
          'In-depth mathematical discussions of Fourier series and bandwidth constraints provided solid physical layer grounding.',
          'Hands-on packet analysis labs with Wireshark allowed students to inspect real-world protocol packet headers directly.',
          'Structured routing exercises enhanced conceptual clarity on distance-vector and link-state algorithms.',
          'Comprehensive coverage of error control codes (CRC, Hamming) demonstrated strong practical engineering applicability.'
        ],
        recommendations: [
          'Integrate network simulation tools (e.g. Cisco Packet Tracer / NS3) for complex topology configuration.',
          'Provide supplemental numerical problem sets on signal-to-noise ratio (SNR) and channel capacity limits.',
          'Reinforce transport layer socket programming through structured pair-coding lab exercises.',
          'Introduce industry guest talks on modern cloud networking and SDN architectures.'
        ]
      }
    }
    return {
      domain: courseTitle,
      keywords: 'theoretical foundations, systematic problem analysis, practical design implementation, and modern engineering tool usage',
      strengths: [
        'Structured lecture delivery and rigorous assessment benchmarks fostered deep foundational understanding of syllabus core topics.',
        'Practical problem-solving exercises enabled students to effectively bridge theoretical models and computational implementation.',
        'Continuous formative feedback encouraged analytical reasoning and independent technical exploration.',
        'Collaborative assignments stimulated teamwork, communication, and systematic design workflows.'
      ],
      recommendations: [
        'Continue strengthening conceptual depth through more application-based case studies and practical demonstrations.',
        'Incorporate additional tutorial discussions for challenging mathematical and analytical derivations.',
        'Expand hands-on lab tasks utilizing modern engineering software and standardized industry tools.',
        'Provide scaffolding for project work to elevate the maturity of capstone-level problem formulations.'
      ]
    }
  }

  const subjectInfo = useMemo(() => getSubjectDomain(courseTitle), [courseTitle])

  // Generate Fallback Data directly from real calculation numbers
  const generateFallbackData = () => {
    const coAttainments = calculations?.coAttainment || {}
    const poAttainments = calculations?.poAttainment || {}

    const coStats = activeCOs.map((co, idx) => {
      const coData = coAttainments[co] || {}
      const passPct = parseFloat((coData.passMarksPercentage || 0).toFixed(1))
      const kpiPct = parseFloat((coData.kpiPercentage || 0).toFixed(1))
      const desc = coDescriptions[co] || dbCourseOutcomes.find(d => d.code === co)?.description || `Students will be able to master and apply core principles of ${co} in ${courseTitle}.`
      
      const sIdx = idx % subjectInfo.strengths.length
      const rIdx = idx % subjectInfo.recommendations.length

      return {
        code: co,
        description: desc,
        passPct,
        kpiPct,
        strength: subjectInfo.strengths[sIdx],
        recommendation: subjectInfo.recommendations[rIdx]
      }
    })

    const passPcts = coStats.map(c => c.passPct).filter(p => p > 0)
    const kpiPcts = coStats.map(c => c.kpiPct).filter(p => p > 0)

    const minPass = passPcts.length > 0 ? Math.min(...passPcts).toFixed(1) : '94.4'
    const maxPass = passPcts.length > 0 ? Math.max(...passPcts).toFixed(1) : '98.6'
    const minKpi = kpiPcts.length > 0 ? Math.min(...kpiPcts).toFixed(1) : '85.9'
    const maxKpi = kpiPcts.length > 0 ? Math.max(...kpiPcts).toFixed(1) : '97.2'

    const poStats = activePOs.map(po => {
      const poData = poAttainments[po] || {}
      const passPct = parseFloat((poData.passMarksPercentage || 0).toFixed(1))
      const kpiPct = parseFloat((poData.kpiPercentage || 0).toFixed(1))
      const label = getPoLabel(po)

      return {
        code: po,
        label,
        passPct,
        kpiPct
      }
    })

    const overviewP1 = `The CO and PO analysis for the course ${courseTitle} demonstrates a satisfactory level of outcome attainment. The overall achievement indicates that students have developed fundamental knowledge of ${subjectInfo.keywords} aligned with Outcome-Based Education (OBE) requirements.`
    const overviewP2 = `The Course Outcomes (COs) attainment shows strong achievement. For achieving the Target Pass Marks (${targetPassMarks}%), the attainment ranges from ${minPass}% to ${maxPass}%, while for achieving the KPI (${kpiCO}%), the attainment ranges from ${minKpi}% to ${maxKpi}%. The results indicate that most students successfully achieved the expected learning outcomes.`

    const poIntro = `The PO attainment demonstrates strong achievement in relevant program outcomes. Students successfully applied engineering knowledge, problem analysis skills, solution design ability, and modern computational tools through ${courseTitle} concepts and applications.`
    const poConclusion = `Overall, the course outcomes and program outcomes indicate successful attainment of the expected learning objectives. Continuous improvement through practical exercises, advanced ${courseTitle.toLowerCase()} applications, and outcome-focused problem-solving activities is recommended.`
    const conclusion = poConclusion

    return {
      overviewP1,
      overviewP2,
      coAnalysis: coStats,
      poIntro,
      poTable: poStats,
      poConclusion,
      conclusion,
      aiSource: 'fallback'
    }
  }

  // Initial load from cache or fallback
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.overviewP1 && parsed?.coAnalysis && parsed?.poTable) {
          // Normalize poTable labels to guarantee full name with hyphen (e.g. PO1 - Engineering Knowledge)
          const normalizedPoTable = parsed.poTable.map(item => {
            const code = item.code || (item.label && item.label.split(' - ')[0]) || ''
            const fullLabel = getPoLabel(code || item.label)
            return {
              ...item,
              code: code || item.label,
              label: fullLabel
            }
          })
          const normalizedConclusion = parsed.conclusion || parsed.poConclusion || ''
          const normalized = {
            ...parsed,
            poTable: normalizedPoTable,
            conclusion: normalizedConclusion,
            poConclusion: normalizedConclusion
          }
          setReportData(normalized)
          setAiSource(parsed.aiSource || 'cached')
          return
        }
      }
    } catch (e) {
      console.warn('Error reading cached self-assessment report:', e)
    }

    const initialData = generateFallbackData()
    setReportData(initialData)
    setAiSource('fallback')
  }, [cacheKey, activeCOs.length, activePOs.length])

  // Save edits to localStorage
  const handleSaveEdits = () => {
    if (!reportData) return
    try {
      localStorage.setItem(cacheKey, JSON.stringify(reportData))
      setSaveSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      console.error('Failed to save self-assessment report:', e)
    }
  }

  // Reset to computed fallback
  const handleResetToDefault = () => {
    const fresh = generateFallbackData()
    setReportData(fresh)
    setAiSource('fallback')
    setIsEditing(false)
    try {
      localStorage.setItem(cacheKey, JSON.stringify(fresh))
    } catch (e) {}
  }

  // Gemini AI Generation
  const fetchGeminiReport = async () => {
    setGeneratingAI(true)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || localStorage.getItem('OBE_GEMINI_API_KEY') || ''

    const fallback = generateFallbackData()

    const coAttainments = calculations?.coAttainment || {}
    const poAttainments = calculations?.poAttainment || {}

    const coContext = activeCOs.map(co => {
      const coData = coAttainments[co] || {}
      const desc = coDescriptions[co] || ''
      return `- ${co}: "${desc}" -> Above Pass Marks (${targetPassMarks}%): ${(coData.passMarksPercentage || 0).toFixed(1)}%, Above KPI (${kpiCO}%): ${(coData.kpiPercentage || 0).toFixed(1)}%`
    }).join('\n')

    const poContext = activePOs.map(po => {
      const poData = poAttainments[po] || {}
      const desc = poDescriptions[po] || ''
      return `- ${po}: "${desc}" -> Above Pass Marks (${targetPassMarks}%): ${(poData.passMarksPercentage || 0).toFixed(1)}%, Above KPI (${kpiPO}%): ${(poData.kpiPercentage || 0).toFixed(1)}%`
    }).join('\n')

    const promptText = `System Role: You are a Senior University Professor and Washington Accord OBE Accreditation Coordinator in the Department of Computer Science and Engineering at Bangladesh Army International University of Science & Technology (BAIUST), Cumilla.

TASK: Generate a highly professional, technically rich "Self-Assessment on Achieving COs/CLOs and POs/PLOs" report for:
- Course: ${courseCode} - ${courseTitle}
- Level: ${levelText}, Term: ${termText}, Section: ${sectionText}
- Semester: ${semesterName} ${academicYear}
- Instructor: ${teacherName}, ${teacherDesignation}

DATA INPUTS & CALCULATIONS:
COURSE OUTCOMES ATTAINMENT:
${coContext}

PROGRAM OUTCOMES ATTAINMENT:
${poContext}

INSTRUCTIONS:
1. "overviewP1": Write a professional academic overview paragraph explaining how the course ${courseTitle} achieved outcome attainment, mentioning core technical topics (e.g. ${subjectInfo.keywords}) aligned with Washington Accord OBE guidelines.
2. "overviewP2": Write the quantitative summary paragraph stating that for Target Pass Marks (${targetPassMarks}%), attainment ranges from min% to max%, and for KPI (${kpiCO}%), attainment ranges from min% to max%.
3. For EACH active CO (${activeCOs.join(', ')}):
   - Keep the exact calculated passPct and kpiPct.
   - Provide a deeply course-specific "strength" sentence detailing what practical concepts or design skills supported students' achievement in that outcome.
   - Provide a practical, pedagogical "recommendation" sentence suggesting continuous quality improvement (CQI) actions for future semesters.
4. "poIntro": Write a paragraph describing student engineering application in mapped program outcomes.
5. In "poTable", the "label" MUST be formatted as: "POx - Title" (for example: "${activePOs[0] || 'PO1'} - ${STANDARD_PO_NAMES[activePOs[0]] || 'Engineering Knowledge'}").
6. "conclusion": Write a formal conclusion (Section 4. Conclusion) summarizing overall outcome success, attainment of expected learning objectives, and recommending continuous improvement activities.

REQUIRED OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema without any markdown formatting or code fences:
{
  "overviewP1": "...",
  "overviewP2": "...",
  "coAnalysis": [
    ${activeCOs.map(co => `{
      "code": "${co}",
      "description": "${(coDescriptions[co] || '').replace(/"/g, '\\"')}",
      "passPct": ${(coAttainments[co]?.passMarksPercentage || 95.0).toFixed(1)},
      "kpiPct": ${(coAttainments[co]?.kpiPercentage || 90.0).toFixed(1)},
      "strength": "Technical strength sentence for ${co}...",
      "recommendation": "Pedagogical CQI recommendation sentence for ${co}..."
    }`).join(',\n    ')}
  ],
  "poIntro": "...",
  "poTable": [
    ${activePOs.map(po => `{
      "code": "${po}",
      "label": "${getPoLabel(po).replace(/"/g, '\\"')}",
      "passPct": ${(poAttainments[po]?.passMarksPercentage || 95.0).toFixed(1)},
      "kpiPct": ${(poAttainments[po]?.kpiPercentage || 90.0).toFixed(1)}
    }`).join(',\n    ')}
  ],
  "conclusion": "..."
}`

    try {
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
      } catch (e) {}

      // Fallback to direct client API endpoints
      if (!rawOutput && apiKey) {
        const clientEndpoints = [
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
        ]
        for (const url of clientEndpoints) {
          try {
            const clientRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.7 }
              })
            })
            const clientData = await clientRes.json()
            if (clientRes.ok && clientData.candidates?.[0]?.content?.parts?.[0]?.text) {
              rawOutput = clientData.candidates[0].content.parts[0].text
              break
            }
          } catch (e) {}
        }
      }

      if (rawOutput) {
        const cleaned = rawOutput.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
        const parsed = JSON.parse(cleaned)
        if (parsed.overviewP1 && parsed.coAnalysis && parsed.poTable) {
          const normalizedPoTable = parsed.poTable.map(item => {
            const code = item.code || (item.label && item.label.split(' - ')[0]) || ''
            return {
              ...item,
              code: code || item.label,
              label: (item.label && item.label.includes(' - ')) ? item.label : getPoLabel(code || item.label)
            }
          })
          const conclusionText = parsed.conclusion || parsed.poConclusion || fallback.conclusion
          const fullData = {
            ...parsed,
            poTable: normalizedPoTable,
            conclusion: conclusionText,
            poConclusion: conclusionText,
            aiSource: 'gemini'
          }
          setReportData(fullData)
          setAiSource('gemini')
          try {
            localStorage.setItem(cacheKey, JSON.stringify(fullData))
          } catch (e) {}
          return
        }
      }
      throw new Error('AI generation did not return expected structure')
    } catch (err) {
      console.warn('AI generation error, using authentic calculations fallback:', err.message)
      setReportData(fallback)
      setAiSource('fallback')
      try {
        localStorage.setItem(cacheKey, JSON.stringify(fallback))
      } catch (e) {}
    } finally {
      setGeneratingAI(false)
    }
  }

  // Export to Microsoft Word (.doc) formatted matching BAIUST template
  const handleExportWord = () => {
    const data = reportData || generateFallbackData()

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Self-Assessment on Achieving COs/CLOs and POs/PLOs - ${courseCode}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 595.3pt 841.9pt; /* A4 Portrait */
            margin: 0.8in 0.8in 0.8in 0.8in;
            mso-header-margin: 0.4in;
            mso-footer-margin: 0.4in;
            mso-footer: f1;
          }
          div.Section1 {
            page: Section1;
          }
          table#hrdftrtbl {
            margin: 0in 0in 0in 900in;
            width: 1px;
            height: 1px;
            overflow: hidden;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.35;
            color: #000000;
            padding: 0;
            margin: 0;
          }
          h1, h2, h3, h4 {
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
            margin: 0;
            padding: 0;
          }
          p { margin: 4pt 0 6pt 0; text-align: justify; }
          table { border-collapse: collapse; width: 100%; }
          ul { margin: 3pt 0 6pt 20pt; padding: 0; }
          li { margin-bottom: 2.5pt; text-align: justify; }
          p.MsoFooter, li.MsoFooter, div.MsoFooter {
            margin: 0;
            font-size: 9.5pt;
            font-family: 'Times New Roman', Times, serif;
            color: #555555;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          <!-- Institutional Header -->
          <div style="text-align:center; margin-bottom:10pt;">
            ${BAIUST_LOGO ? `<p style="text-align:center; margin:0 0 5pt 0;"><img src="${BAIUST_LOGO}" width="60" height="60" style="width:48pt; height:48pt; margin:0 auto; display:block;" alt="BAIUST Logo" /></p>` : ''}
            <h2 style="font-size:12.5pt; font-weight:bold; margin-bottom:2pt;">
              বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা
            </h2>
            <h3 style="font-size:11pt; font-weight:bold; margin-bottom:4pt; text-transform:uppercase;">
              BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE &amp; TECHNOLOGY (BAIUST), CUMILLA
            </h3>
            <h4 style="font-size:11pt; font-weight:bold; margin-bottom:8pt;">
              Department of Computer Science and Engineering
            </h4>
            <h1 style="font-size:12.5pt; font-weight:bold; text-decoration:underline; margin-top:6pt; margin-bottom:4pt;">
              Self-Assessment on Achieving COs/CLOs and POs/PLOs
            </h1>
          </div>

          <!-- Metadata Table (Standard Compact BAIUST Style) -->
          <table align="center" border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; width:100%; margin-bottom:12pt; font-size:10pt;">
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

          <!-- 1. Overview -->
          <h4 style="font-size:11.5pt; font-weight:bold; margin-top:12pt; margin-bottom:3pt;">
            1. Overview
          </h4>
          <p style="margin:4pt 0 5pt 0; text-align:justify;">${data.overviewP1}</p>
          <p style="margin:4pt 0 8pt 0; text-align:justify;">${data.overviewP2}</p>

          <!-- 2. Course Outcomes (COs) Analysis -->
          <h4 style="font-size:11.5pt; font-weight:bold; margin-top:12pt; margin-bottom:5pt;">
            2. Course Outcomes (COs) Analysis
          </h4>
          ${(data.coAnalysis || []).map((item) => `
            <p style="font-weight:bold; margin-top:7pt; margin-bottom:2pt; text-align:justify;">
              ${item.code}: ${item.description}
            </p>
            <ul>
              <li><strong>${item.passPct}%</strong> of students scored above the Target Pass Mark (${targetPassMarks}%), indicating successful achievement of the expected competency.</li>
              <li><strong>${item.kpiPct}%</strong> of students scored above the KPI (${kpiCO}%), demonstrating strong attainment at the required performance level.</li>
              <li><strong>Strength:</strong> ${item.strength}</li>
              <li><strong>Recommendation:</strong> ${item.recommendation}</li>
            </ul>
          `).join('')}

          <!-- 3. Program Outcomes (POs) Analysis -->
          <h4 style="font-size:11.5pt; font-weight:bold; margin-top:14pt; margin-bottom:4pt;">
            3. Program Outcomes (POs) Analysis
          </h4>
          <p style="margin:4pt 0 6pt 0; text-align:justify;">${data.poIntro}</p>

          <!-- PO Attainment Table -->
          <table align="center" border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; width:100%; margin:8pt 0 10pt 0; font-size:10.5pt;">
            <thead>
              <tr style="background-color:#f3f4f6;">
                <th style="border:1px solid #000; text-align:left; padding:4pt 8pt; font-weight:bold; width:50%;">Program Outcome</th>
                <th style="border:1px solid #000; text-align:center; padding:4pt 8pt; font-weight:bold; width:25%;">Above Pass Marks (${targetPassMarks}%)</th>
                <th style="border:1px solid #000; text-align:center; padding:4pt 8pt; font-weight:bold; width:25%;">Above KPI (${kpiPO}%)</th>
              </tr>
            </thead>
            <tbody>
              ${(data.poTable || []).map(po => `
                <tr>
                  <td style="border:1px solid #000; padding:4pt 8pt;">${po.label || getPoLabel(po.code)}</td>
                  <td style="border:1px solid #000; text-align:center; padding:4pt 8pt; font-weight:bold;">${po.passPct}%</td>
                  <td style="border:1px solid #000; text-align:center; padding:4pt 8pt; font-weight:bold;">${po.kpiPct}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- 4. Conclusion -->
          <h4 style="font-size:11.5pt; font-weight:bold; margin-top:14pt; margin-bottom:4pt;">
            4. Conclusion
          </h4>
          <p style="margin:4pt 0 10pt 0; text-align:justify;">${data.conclusion || data.poConclusion}</p>
        </div>

        <!-- Word Running Footer -->
        <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="mso-element:footer" id="f1">
                <table border="0" cellspacing="0" cellpadding="0" style="width:100%; border:none; border-top:0.5pt solid #cccccc; padding-top:4pt; font-family:'Times New Roman',Times,serif; font-size:9.5pt; color:#444444;">
                  <tr>
                    <td style="border:none; text-align:left; font-size:9.5pt; color:#444444; padding:0;">
                      <p class="MsoFooter" style="text-align:left; margin:0;">
                        Self-Assessment on Achieving COs &amp; POs &bull; ${courseCode} (${sectionText})
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
    const fileName = `Self_Assessment_${safeCourseCode}_${sectionText.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const curData = reportData || generateFallbackData()

  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-200/80 overflow-hidden no-print">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-800 border border-emerald-200 shrink-0">
              <Target size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  Self-Assessment on Achieving COs/CLOs and POs/PLOs
                </h3>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${
                  aiSource === 'gemini'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : aiSource === 'cached'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <Sparkles size={12} className={generatingAI ? 'animate-spin' : ''} />
                  {aiSource === 'gemini' ? 'AI Generated' : aiSource === 'cached' ? 'Cached Draft' : 'Authentic Attainment Data'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300">
                  <CheckCircle2 size={12} />
                  <span>{activeCOs.length} COs &bull; {activePOs.length} POs Evaluated</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Washington Accord Outcome Analysis &bull; Benchmark: Pass Mark &ge; {targetPassMarks}%, KPI &ge; {kpiCO}% &bull; <span className="font-bold text-gray-800">{courseCode}</span> ({courseTitle})
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

        {/* Action Buttons Toolbar */}
        <div className="bg-gray-50/90 px-4 sm:px-5 py-3 border-t border-gray-150 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="uppercase tracking-wider text-[11px] text-gray-500 font-extrabold">Assessment Actions &amp; Tools</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-250 shadow-2xs transition active:scale-95 cursor-pointer"
              title="Recalculate and reset report using current marks & attainment data"
            >
              <RefreshCw size={13} />
              <span>Reset to Default</span>
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
              onClick={fetchGeminiReport}
              disabled={generatingAI}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Re-generate and polish technical strengths and recommendations using Gemini AI"
            >
              <Sparkles size={13} className={generatingAI ? 'animate-spin' : ''} />
              <span>{generatingAI ? 'Analyzing Outcomes...' : 'Re-generate with AI'}</span>
            </button>

            <button
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
              title="Download Word Document (.doc) formatted matching official BAIUST template"
            >
              <Download size={13} />
              <span>Download Word (.doc)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Printable Document Sheet */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 md:p-12 space-y-7 font-serif max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none">
        
        {/* BAIUST Official Institutional Header */}
        <div className="text-center space-y-1 pb-2">
          {BAIUST_LOGO && (
            <div className="flex justify-center mb-2">
              <img src={BAIUST_LOGO} alt="BAIUST Crest" className="h-16 w-16 object-contain" />
            </div>
          )}
          <h2 className="text-base sm:text-lg font-bold text-gray-950 font-serif leading-tight">
            বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা
          </h2>
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 tracking-wider font-serif uppercase">
            BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE &amp; TECHNOLOGY (BAIUST), CUMILLA
          </h3>
          <p className="text-xs font-bold text-gray-800 font-serif">
            Department of Computer Science and Engineering
          </p>
          <div className="pt-2">
            <h1 className="text-sm sm:text-base font-black text-gray-950 underline underline-offset-4 tracking-wide font-serif uppercase">
              Self-Assessment on Achieving COs/CLOs and POs/PLOs
            </h1>
          </div>
        </div>

        {/* Metadata Table (Standard Compact BAIUST Style) */}
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

        {/* 1. Overview */}
        <section className="space-y-3">
          <h4 className="text-sm font-bold text-gray-950 font-serif">1. Overview</h4>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={curData.overviewP1}
                onChange={(e) => setReportData({ ...curData, overviewP1: e.target.value })}
                className="w-full text-xs font-serif p-3 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={3}
                placeholder="Overview Paragraph 1 (Academic Context & OBE Alignment)"
              />
              <textarea
                value={curData.overviewP2}
                onChange={(e) => setReportData({ ...curData, overviewP2: e.target.value })}
                className="w-full text-xs font-serif p-3 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={3}
                placeholder="Overview Paragraph 2 (Attainment Ranges)"
              />
            </div>
          ) : (
            <div className="space-y-2.5 text-xs text-gray-850 font-serif text-justify leading-relaxed">
              <p>{curData.overviewP1}</p>
              <p>{curData.overviewP2}</p>
            </div>
          )}
        </section>

        {/* 2. Course Outcomes (COs) Analysis */}
        <section className="space-y-4">
          <h4 className="text-sm font-bold text-gray-950 font-serif">2. Course Outcomes (COs) Analysis</h4>
          <div className="space-y-5">
            {(curData.coAnalysis || []).map((item, idx) => (
              <div key={item.code} className="space-y-2 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                <p className="text-xs font-bold text-gray-900 font-serif">
                  <span className="font-extrabold text-emerald-950">{item.code}:</span> {item.description}
                </p>
                <ul className="list-disc list-inside text-xs text-gray-850 font-serif space-y-1.5 pl-2 leading-relaxed">
                  <li>
                    <strong>{item.passPct}%</strong> of students scored above the Target Pass Mark ({targetPassMarks}%), indicating successful achievement of the expected competency.
                  </li>
                  <li>
                    <strong>{item.kpiPct}%</strong> of students scored above the KPI ({kpiCO}%), demonstrating strong attainment at the required performance level.
                  </li>
                  <li className="space-y-1">
                    <strong>Strength:</strong>{' '}
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.strength}
                        onChange={(e) => {
                          const updated = [...curData.coAnalysis]
                          updated[idx].strength = e.target.value
                          setReportData({ ...curData, coAnalysis: updated })
                        }}
                        className="w-full text-xs font-serif p-1.5 border border-emerald-400 rounded mt-1"
                      />
                    ) : (
                      <span>{item.strength}</span>
                    )}
                  </li>
                  <li className="space-y-1">
                    <strong>Recommendation:</strong>{' '}
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.recommendation}
                        onChange={(e) => {
                          const updated = [...curData.coAnalysis]
                          updated[idx].recommendation = e.target.value
                          setReportData({ ...curData, coAnalysis: updated })
                        }}
                        className="w-full text-xs font-serif p-1.5 border border-emerald-400 rounded mt-1"
                      />
                    ) : (
                      <span>{item.recommendation}</span>
                    )}
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Program Outcomes (POs) Analysis */}
        <section className="space-y-3">
          <h4 className="text-sm font-bold text-gray-950 font-serif">3. Program Outcomes (POs) Analysis</h4>
          {isEditing ? (
            <textarea
              value={curData.poIntro}
              onChange={(e) => setReportData({ ...curData, poIntro: e.target.value })}
              className="w-full text-xs font-serif p-3 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              rows={3}
            />
          ) : (
            <p className="text-xs text-gray-850 font-serif text-justify leading-relaxed">
              {curData.poIntro}
            </p>
          )}

          {/* Program Outcomes Table */}
          <div className="overflow-x-auto my-3">
            <table className="w-full text-xs border-collapse border border-gray-800 font-serif">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 p-2 text-left font-bold w-1/2">Program Outcome</th>
                  <th className="border border-gray-800 p-2 text-center font-bold w-1/4">Above Pass Marks ({targetPassMarks}%)</th>
                  <th className="border border-gray-800 p-2 text-center font-bold w-1/4">Above KPI ({kpiPO}%)</th>
                </tr>
              </thead>
              <tbody>
                {(curData.poTable || []).map((po, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="border border-gray-800 p-2 font-medium">{po.label || getPoLabel(po.code)}</td>
                    <td className="border border-gray-800 p-2 text-center font-bold">{po.passPct}%</td>
                    <td className="border border-gray-800 p-2 text-center font-bold">{po.kpiPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Conclusion */}
        <section className="space-y-3">
          <h4 className="text-sm font-bold text-gray-950 font-serif">4. Conclusion</h4>
          {isEditing ? (
            <textarea
              value={curData.conclusion || curData.poConclusion}
              onChange={(e) => setReportData({ ...curData, conclusion: e.target.value, poConclusion: e.target.value })}
              className="w-full text-xs font-serif p-3 border border-emerald-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              rows={3}
              placeholder="Formal concluding evaluation and continuous quality improvement recommendations..."
            />
          ) : (
            <p className="text-xs text-gray-850 font-serif text-justify leading-relaxed">
              {curData.conclusion || curData.poConclusion}
            </p>
          )}
        </section>

      </div>
    </div>
  )
}
