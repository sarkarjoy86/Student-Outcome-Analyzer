import React, { useState, useMemo, useEffect } from 'react'
import {
  FileText,
  Download,
  Edit3,
  Check,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Cpu,
  Bot,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
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
  reportScope = 'section',
  assessments = null,
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

  const courseTitle = courseInfo.courseTitle || courseInfo.courseName || 'Object-Oriented Programming Language'
  const courseCode = courseInfo.courseCode || 'CSE 213'
  const teacherName = courseInfo.teacherName || 'MD. Saad Bin Kamal'
  const teacherDesignation = courseInfo.teacherDesignation || 'Lecturer'
  const semesterName = courseInfo.semesterName || 'Spring'
  const academicYear = courseInfo.academicYear || String(new Date().getFullYear())
  const levelText = courseInfo.level || (courseCode.match(/\d+/) ? courseCode.match(/\d+/)[0][0] : '2')
  const termText = courseInfo.term || (courseCode.match(/\d+/) && courseCode.match(/\d+/)[0][1] === '2' ? 'II' : 'I')
  const groupText = courseInfo.group || ''
  const sectionText = reportScope === 'combined'
    ? 'A & B'
    : (courseInfo.rawSectionName || courseInfo.sectionName || 'A')

  const cacheKey = `SWOT_CACHE_${courseCode.replace(/[^a-zA-Z0-9_-]/g, '_')}_${sectionText.replace(/[^a-zA-Z0-9_-]/g, '_')}`

  // Domain knowledge helper for deep technical fallback
  const getSubjectDomain = (title) => {
    const lower = (title || '').toLowerCase()
    if (lower.includes('image') || lower.includes('dip')) {
      return {
        domain: 'Digital Image Processing',
        skill: 'Spatial and Frequency Domain Processing',
        topics: 'spatial-domain enhancement, frequency transforms, morphological segmentation, restoration filters, and CNN feature extraction',
        strengths: [
          'Practical lab exercises on spatial filtering and pixel transformations enabled students to master digital image enhancement techniques.',
          'High competency in Fourier frequency domain filtering and restoration modeling supported student achievement in analytical outcomes.'
        ],
        weaknesses: [
          'Moderate attainment in frequency-domain transform theory and complex morphological filtering indicates need for more scaffolded exercises.',
          'Students require deeper hands-on practice in multi-scale image segmentation and convolutional hyperparameter tuning.'
        ],
        opportunities: [
          'Integrate hands-on computer vision mini-projects utilizing OpenCV and PyTorch for real-time edge detection and image classification.',
          'Apply project-based learning to bridge theoretical Fourier analysis with practical noise cancellation problems.'
        ],
        recommendations: [
          'Introduce dedicated challenge-based laboratory sessions on frequency-domain filtering and inverse filtering techniques.',
          'Incorporate step-by-step comparative case studies between spatial and frequency domain operations in Midterm review.',
          'Encourage open-source image processing repository contributions to enhance practical portfolio readiness.'
        ],
        threats: [
          'Rapid evolution in deep learning architectures may outpace traditional mathematical image processing if practical implementations are not regularly updated.',
          'Heavy reliance on pre-built libraries without solid mathematical grounding in discrete convolution and Fourier transforms.'
        ]
      }
    }
    if (lower.includes('object') || lower.includes('oop') || lower.includes('c++') || lower.includes('java')) {
      return {
        domain: 'Object-Oriented Programming',
        skill: 'Modular Software Architecture',
        topics: 'encapsulation, inheritance, polymorphism, dynamic memory allocation, C++ templates, exception handling, and STL optimizations',
        strengths: [
          'Structured programming assignments and lab sessions allowed students to effectively master inheritance and dynamic polymorphism.',
          'High attainment in translating real-world domain requirements into robust, modular class hierarchies and reusable components.'
        ],
        weaknesses: [
          'Lower KPI attainment in advanced memory management (pointers, dynamic memory deallocation) and generic template programming.',
          'Students struggle with complex exception handling hierarchies and standard template library (STL) performance trade-offs.'
        ],
        opportunities: [
          'Introduce competitive coding problem sets and paired code reviews to reinforce dynamic pointer mechanics and memory safety.',
          'Leverage strong teamwork outcomes (PO9) to implement multi-tier software projects using version control (Git).'
        ],
        recommendations: [
          'Incorporate 2–3 challenge-based labs focusing exclusively on pointer arithmetic, dynamic memory management, and RAII principles.',
          'Conduct structured debugging workshops using Valgrind or modern IDE sanitizers to diagnose memory leaks.',
          'Reinforce object design patterns (Factory, Singleton, Observer) through incremental semester-long project milestones.'
        ],
        threats: [
          'Skill gap in manual resource allocation may affect student confidence when transitioning to systems-level engineering roles.',
          'Over-reliance on syntax memorization rather than deep object-oriented conceptual abstraction.'
        ]
      }
    }
    if (lower.includes('algorithm')) {
      return {
        domain: 'Algorithm Design & Analysis',
        skill: 'Computational Complexity and Algorithmic Optimization',
        topics: 'asymptotic complexity, divide-and-conquer, dynamic programming, greedy methods, and graph algorithms',
        strengths: [
          'Rigorous mathematical formulation and step-by-step tracing developed strong foundational skills in asymptotic complexity analysis.',
          'High attainment in divide-and-conquer strategies and fundamental graph traversal implementations.'
        ],
        weaknesses: [
          'Lower KPI achievement in dynamic programming state formulation, memoization tables, and NP-complete reduction proofs.',
          'Students encounter difficulty identifying optimal substructure and overlapping subproblems in non-standard scenarios.'
        ],
        opportunities: [
          'Utilize automated online judge platforms for real-time benchmarking of time and space complexity.',
          'Organize algorithm visualization workshops to illustrate dynamic programming state transitions visually.'
        ],
        recommendations: [
          'Schedule targeted problem-solving tutorials on recurrence relation solving and recurrence trees.',
          'Provide incremental practice problems categorized into basic, intermediate, and advanced dynamic programming categories.',
          'Integrate real-world optimization case studies (e.g. network routing, scheduling) into assessment tasks.'
        ],
        threats: [
          'Gap in advanced algorithmic intuition can impact competitive programming placement and technical interview readiness.',
          'Tendency to memorize standard algorithms without adapting them to novel problem variations.'
        ]
      }
    }
    if (lower.includes('data structure')) {
      return {
        domain: 'Data Structures',
        skill: 'Abstract Data Type Implementation',
        topics: 'trees, balanced AVL structures, heaps, hash tables, and graph representations',
        strengths: [
          'Extensive lab work on linked lists, stacks, and queues provided solid physical memory visualization.',
          'Strong attainment in binary search tree operations and fundamental data structure selection.'
        ],
        weaknesses: [
          'Comparative difficulty in balanced tree rotations (AVL/Red-Black) and hash table collision resolution trade-offs.',
          'Sub-optimal selection of data structures for complex, multi-constraint computational tasks.'
        ],
        opportunities: [
          'Implement visual animation tools for tree rotations and heap adjustments during lectures.',
          'Engage students in data structure performance benchmarking on large real-world datasets.'
        ],
        recommendations: [
          'Add dedicated lab sessions for balancing tree rotations and heap construction from scratch.',
          'Incorporate practical assignments comparing hash tables with balanced trees under heavy collision scenarios.',
          'Provide automated test suites with hidden test cases to validate edge cases (empty structures, duplicate keys).'
        ],
        threats: [
          'Superficial understanding of internal memory layouts may hinder mastery of high-performance database or compiler systems.'
        ]
      }
    }
    if (lower.includes('database') || lower.includes('dbms')) {
      return {
        domain: 'Database Management Systems',
        skill: 'Relational Modeling and Query Optimization',
        topics: 'normalization, relational algebra, SQL optimization, indexing, and ACID transaction protocols',
        strengths: [
          'Strong practical proficiency in entity-relationship (ER) modeling and multi-table relational schema design.',
          'High success rate in formulating complex SQL queries involving aggregations, joins, and nested subqueries.'
        ],
        weaknesses: [
          'Lower KPI achievement in 3NF and BCNF normalization decomposition proofs and multi-valued dependencies.',
          'Struggles with concurrency control protocols (two-phase locking) and transaction isolation levels under deadlock scenarios.'
        ],
        opportunities: [
          'Build end-to-end database-backed web applications to experience practical connection pooling and transaction rollbacks.',
          'Expose students to modern distributed database systems and NoSQL architectures alongside relational foundations.'
        ],
        recommendations: [
          'Introduce stepwise normalization worksheets with real-world anomalous schema examples.',
          'Integrate query execution plan profiling in MySQL/PostgreSQL labs to demonstrate index optimization.',
          'Conduct hands-on deadlock simulation exercises in lab environments.'
        ],
        threats: [
          'Lack of transaction management depth can lead to data integrity vulnerabilities in commercial production environments.'
        ]
      }
    }
    if (lower.includes('network') || lower.includes('communication')) {
      return {
        domain: 'Data Communications & Networking',
        skill: 'Protocol Engineering and Network Configuration',
        topics: 'OSI/TCP-IP architectures, packet routing algorithms, socket programming, flow control, and error correction codes',
        strengths: [
          'Comprehensive understanding of layered network models, addressing schemes, and subnetting calculations.',
          'Effective packet analysis skills using Wireshark to inspect transport and application layer protocol headers.'
        ],
        weaknesses: [
          'Lower attainment in physical layer signal-to-noise ratio (SNR) calculations and Shannon channel capacity proofs.',
          'Difficulty in implementing multi-threaded socket server architectures with robust error recovery.'
        ],
        opportunities: [
          'Utilize Cisco Packet Tracer and NS3 for complex multi-router topology simulation and routing table inspection.',
          'Engage students with modern cloud networking and software-defined networking (SDN) paradigms.'
        ],
        recommendations: [
          'Schedule supplemental tutorial sessions for mathematical communications derivations and Fourier bandwidth analysis.',
          'Incorporate pair-programming labs dedicated to TCP/UDP socket programming and sliding window protocol implementation.',
          'Organize industry guest sessions on modern enterprise network security and IPv6 migration.'
        ],
        threats: [
          'Rapid virtualization of networking stacks requires continuous updating beyond traditional physical hardware models.'
        ]
      }
    }
    return {
      domain: courseTitle,
      skill: `${courseTitle} Competency`,
      topics: 'fundamental theoretical models, analytical problem formulation, practical implementation, and modern tool applications',
      strengths: [
        'Structured curriculum delivery and formative assessments enabled students to build robust foundational knowledge in core syllabus competencies.',
        'High attainment in translating theoretical principles into systematic computational solutions.'
      ],
      weaknesses: [
        'Lower KPI attainment in advanced specialized topics and multi-step complex engineering problem formulations.',
        'Students require additional guidance in handling open-ended design constraints and boundary conditions.'
      ],
      opportunities: [
        'Leverage collaborative learning strategies to tackle complex, multidisciplinary capstone-level problems.',
        'Integrate modern industry-standard software tools and automated evaluation suites.'
      ],
      recommendations: [
        'Introduce challenge-based laboratory exercises progressing from basic to advanced complexity.',
        'Conduct targeted tutorial review sessions before major midterm and semester final assessments.',
        'Incorporate peer code review and collaborative project milestones.'
      ],
      threats: [
        'Curricular gaps in advanced topic exposure may impact student competitiveness in specialized technical domains.'
      ]
    }
  }

  const subjectInfo = useMemo(() => getSubjectDomain(courseTitle), [courseTitle])

  // Default introductory paragraph based on teacher's official standard template
  const defaultIntroduction = useMemo(() => {
    return `The SWOT analysis of ${courseTitle} is prepared based on the direct measurement of Course Outcomes (COs) and Program Outcomes (POs) attainment. The analysis evaluates students' performance, identifies key strengths and areas requiring improvement, and highlights opportunities and potential challenges for enhancing the overall learning outcomes of the course. The attainment results indicate students' strong achievement in fundamental concepts, analytical skills, and ${subjectInfo.topics}, while also providing insights into areas where additional practical exposure and learning support can further improve competency development.`
  }, [courseTitle, subjectInfo.topics])

  // Fallback calculated data using real mathematically computed CO/PO attainments
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
        title: `Hands-on Laboratory Coding Drills on ${subjectInfo.skill} (${lowestCO?.code || 'CO2'})`,
        bullets: [
          `Introduce 2–3 challenge-based programming labs focusing specifically on ${subjectInfo.topics} to bridge the gap between pass mark and KPI attainment.`,
          `Use stepwise problem-solving exercises (foundational concepts → intermediate implementation → advanced design challenges).`,
          `Encourage practice through online coding platforms and interactive competitive problem sets.`
        ]
      },
      {
        title: `Analytical Question Design on ${subjectInfo.domain} in Class Tests & Midterms`,
        bullets: [
          `Structure Class Test (CT) and Midterm examination questions with progressive cognitive levels testing analytical problem decomposition in ${subjectInfo.domain}.`,
          `Provide detailed question rubrics to help students self-diagnose conceptual and implementation errors in ${subjectInfo.topics} early in the semester.`,
          `Incorporate brief coding demonstrations and live syntax traces during theory lectures.`
        ]
      },
      {
        title: `Targeted Problem-Solving Clinics on Challenging ${subjectInfo.domain} Topics`,
        bullets: [
          `Organize targeted remedial workshops for students scoring below the ${kpiCO}% KPI benchmark in challenging ${subjectInfo.domain} modules.`,
          `Pair struggling students with high-achieving peers during laboratory exercises to foster collaborative learning and active debugging.`
        ]
      },
      {
        title: `Industry-Standard Tool Adoption & Profiling for ${courseTitle}`,
        bullets: [
          `Integrate industry-standard development workflows, version control (Git), and automated testing suites into ${courseTitle} project deliverables.`,
          `Introduce runtime profiling, memory checking, and debugging tools tailored to ${subjectInfo.domain} to elevate students' code hygiene.`
        ]
      },
      {
        title: `Curricular Alignment of ${courseCode} Design Modules with Capstone Projects`,
        bullets: [
          `Align course design projects with capstone-level problem formulations to cultivate long-term engineering maturity.`,
          `Conduct mid-semester feedback reviews to adjust pedagogical pacing and practical laboratory exercises dynamically.`
        ]
      }
    ]

    const threats = [
      {
        title: `Unbalanced Outcome Distribution in ${courseTitle} Curriculum`,
        bullets: [
          `High instructional focus on primary outcomes (${activePOs.slice(0, 3).join(', ') || 'PO1, PO2'}) may lead to reduced attention toward broader attributes such as engineering ethics, environmental sustainability, and modern tool evaluation.`,
          `Mitigation: Intentionally incorporate modular assignments addressing sustainability and professional ethics into the ${courseTitle} syllabus.`
        ]
      },
      {
        title: `Advanced ${subjectInfo.skill} Gap Impeding Downstream Coursework & Industry Placement`,
        bullets: [
          `Moderate KPI attainment in advanced topics (${lowestCO?.code || 'CO2'}) suggests some students may lack confidence when applying ${subjectInfo.topics} in complex real-world software.`,
          `Solution: Provide scaffolded coding tutorials and open-source project contributions to solidify advanced competencies.`
        ]
      },
      {
        title: `Risk of Rote Syntax Memorization over Deep ${subjectInfo.domain} Problem Solving`,
        bullets: [
          `Students may lean toward memorizing coding syntax or library calls rather than mastering core computational problem-solving and architectural abstraction in ${subjectInfo.domain}.`,
          `Mitigation: Formulate assessment questions requiring novel problem decomposition rather than standard textbook examples.`
        ]
      }
    ]

    const conclusion = `The course demonstrates excellent performance in practical application (${topCO1?.code || 'CO4'}/${getMappedPOs(topCO1?.code)[0] || 'PO2'}), teamwork development (${topCO2?.code || 'CO3'}/${getMappedPOs(topCO2?.code)[0] || 'PO9'}), and foundational ${subjectInfo.domain.toLowerCase()} (${topCO3?.code || 'CO1'}/${getMappedPOs(topCO3?.code)[0] || 'PO1'}). However, advanced ${subjectInfo.skill.toLowerCase()} (${lowestCO?.code || 'CO2'}) show comparatively lower KPI attainment, indicating the need for additional hands-on exercises and challenge-based learning. Expanding the assessment of additional program outcomes will further strengthen the course's alignment with program objectives and accreditation expectations. Continuous improvement through practical programming tasks and real-world applications will enhance both student competency and industry readiness.`

    return {
      introduction: defaultIntroduction,
      strengths,
      weaknesses,
      opportunities,
      recommendations,
      threats,
      conclusion,
      aiSource: 'fallback'
    }
  }, [calculations, activeCOs, activePOs, coMarkAllocations, coMapping, targetPassMarks, kpiCO, kpiPO, coDescriptions, poDescriptions, courseTitle, courseCode, defaultIntroduction, subjectInfo])

  // Component States
  const [swotData, setSwotData] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiSource, setAiSource] = useState('cached')
  const [saveSuccess, setSaveSuccess] = useState(false)

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
            if (!parsed.introduction) {
              parsed.introduction = defaultIntroduction
            }
            setSwotData(parsed)
            setAiSource(parsed.aiSource || 'cached')
            setGeneratingAI(false)
            return
          }
        } catch (e) {
          console.warn('Failed to parse cached SWOT data:', e)
        }
      }
    } else {
      try {
        localStorage.removeItem(cacheKey)
      } catch (e) {}
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || localStorage.getItem('OBE_GEMINI_API_KEY') || ''
    
    setGeneratingAI(true)
    try {
      const sessionText = `${semesterName} ${academicYear}`

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

      // Only include teacher custom draft if user explicitly has custom-added points in edit mode AND NOT forceRegenerate
      const hasCustomPoints = swotData && Object.values(swotData).some(val => Array.isArray(val) && val.some(item => item.title?.toLowerCase().includes('custom')))
      const teacherDraftContext = (hasCustomPoints && !forceRegenerate) ? `
TEACHER'S CUSTOM ADDED NOTES:
The teacher added these custom notes. Preserve and polish them:
${JSON.stringify(swotData, null, 2)}
` : ''

      const promptText = `System Role: You are a Senior Academic OBE Accreditation Consultant and CSE University Professor at Bangladesh Army International University of Science and Technology (BAIUST), Cumilla.
Your task is to write a deeply course-specific, highly professional, non-generic SWOT Analysis report for an Outcome-Based Education (OBE) course file submission.

CRITICAL RULE ON TITLES & HEADINGS:
- ABSOLUTELY NEVER USE GENERIC, FIXED, OR BOILERPLATE TITLES (such as "Bloom's Taxonomy Alignment", "Targeted Remedial Support", "Mandatory Tool Adoption", "Longitudinal CQI Review", "Technical Skill Gap Impeding Advanced Courses", etc.)!
- EVERY single title in Strengths, Weaknesses, Opportunities, Recommendations, and Threats MUST be uniquely customized and explicitly named after the concrete technical concepts of "${courseTitle}" (${courseCode})!
- For example:
  * For Algorithms: Titles MUST be like "Dynamic Programming & Memoization Laboratory Drills (CO2)", "Graph Traversal & Shortest-Path Assessment Questions in Midterm", "Asymptotic Runtime Complexity Profiling with Online Judges", "NP-Completeness and Reduction Proof Tutorials", etc.
  * For Object-Oriented Programming: Titles MUST be like "Dynamic Memory Allocation & Pointer Safety Workshops (CO2)", "Polymorphic Architecture & Design Patterns in Midterm Assessments", "RAII and Valgrind Memory Leak Profiling Integration", "C++ Template Metaprogramming Remedial Clinics", etc.
  * For Digital Image Processing: Titles MUST be like "Spatial Convolution & 2D Filtering Laboratory Modules (CO2)", "Fourier Frequency-Domain Transform Assessment in Class Tests", "Morphological Segmentation & Feature Extraction Tutorials", "OpenCV & Python Computer Vision Toolchain Adoption", etc.
- No two courses should EVER have the same title or phrasing. Everything must be 100% domain-tailored to "${courseTitle}".

DETAILED SECTION INSTRUCTIONS:
1. "introduction": Write an original, dynamic, non-templated academic introduction (130-180 words) specifically for ${courseTitle} (${courseCode}), Level ${levelText}, Term ${termText}, Section ${sectionText}. Synthesize the real Course Outcomes (COs) and Program Outcomes (POs) direct measurement results (pass mark threshold ${targetPassMarks}% and KPI ${kpiCO}%). Explain how this analysis evaluates student performance across fundamental principles and specialized engineering topics (${subjectInfo.topics}), identifies instructional strengths and critical gap areas, and outlines an evidence-based roadmap for continuous quality improvement (CQI). Write natural, eloquent, varied academic prose—do NOT repeat a rigid template sentence; paraphrase and craft a distinctive introduction tailored to this course and cohort. Every time this is regenerated, write a freshly phrased variation!

2. "strengths": Generate at least 3 to 4 comprehensive, multi-bullet points analyzing the highest attained COs/POs, citing exact percentages, practical engineering applications, foundational concepts, and collaborative learning. Name each title after the exact course topic and outcome code!

3. "weaknesses": Generate at least 2 to 3 detailed gap-analysis points focusing on the lowest attained COs/POs, identifying challenging syllabus topics (e.g., dynamic memory, pointers, recursion, frequency-domain filtering, algorithmic proofs) where students struggled to exceed the ${kpiCO}% KPI benchmark. Name each title after the exact difficult course topic!

4. "opportunities": Generate at least 3 to 4 forward-looking pedagogical opportunities (e.g., project-based learning, challenge coding labs, peer reviews, tool integration like Git/sanitizers/Wireshark/simulation, modern curriculum alignment).

5. "recommendations": Generate at least 4 to 5 actionable, detailed Continuous Quality Improvement (CQI) points. Categorize them into:
   - Laboratory & Hands-on Coding Enhancements (challenge-based labs on specific course topics, stepwise difficulty progression)
   - Assessment & Question Design Refinement (aligning Class Tests, Midterm, and Semester Final questions to analytical problem decomposition in specific topics)
   - Remedial Tutorials & Guided Problem-Solving Sessions on difficult course modules for struggling students
   - Tool & Modern Framework Integration (version control, automated grading, debugging profilers specific to this subject)
   - Continuous Formative Feedback & Lecture Demonstrations
   DO NOT provide only 1 recommendation; provide at least 4-5 rich, detailed points! ALL TITLES MUST BE COURSE-SPECIFIC!

6. "threats": Generate at least 2 to 3 detailed risk and mitigation points (e.g., skill gap in specific topics affecting advanced coursework/industry readiness, risk of superficial syntax learning vs algorithmic depth, unbalanced assessment focus across all 12 POs). ALL TITLES MUST BE COURSE-SPECIFIC!

7. "conclusion": Write a comprehensive concluding paragraph (100-150 words) synthesizing the entire SWOT evaluation and defining clear CQI milestones for ${courseTitle}.

Course Details:
- Course Code: ${courseCode}
- Course Title: ${courseTitle}
- Department: Department of Computer Science and Engineering
- Institution: BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST), CUMILLA
- Academic Session: ${sessionText}
- Level: ${levelText}, Term: ${termText}, Section: ${sectionText}
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
  "introduction": "Comprehensive academic introduction paragraph analyzing outcome attainment in ${courseTitle}...",
  "strengths": [
    {
      "title": "[Insert Specific Course Skill/Topic 1] Practical Application ([CO Code], [PO Code])",
      "bullets": [
        "X% of students exceed the ${targetPassMarks}% pass mark and Y% exceed the ${kpiCO}% KPI in applying [specific course subject concepts] to solve real-life problems ([CO_code]).",
        "X% > ${targetPassMarks}% and Y% > ${kpiPO}% in [specific PO description].",
        "Implication: The course strongly supports students' ability to translate theoretical [course title] concepts into practical problem-solving skills, which aligns well with industry expectations."
      ]
    },
    {
      "title": "[Insert Specific Course Group Task/Lab Topic 2] Collaborative Teamwork Attributes ([CO Code], PO9)",
      "bullets": [
        "X% of students exceed KPI in collaborative group assignments and lab deliverables in [specific course topic].",
        "Implication: Structured pair programming and group projects effectively cultivate professional engineering teamwork."
      ]
    },
    {
      "title": "Rigorous Theoretical Grounding in [Insert Specific Course Core Foundation] ([CO Code], PO1)",
      "bullets": [
        "X% of students demonstrate high attainment in core theoretical principles and foundational analysis.",
        "Alignment: Solid conceptual grounding facilitates subsequent technical courses."
      ]
    }
  ],
  "weaknesses": [
    {
      "title": "Cognitive Bottlenecks in [Insert Specific Difficult Syllabus Topic] ([Lowest CO])",
      "bullets": [
        "X% of students exceed pass mark, but only Y% exceed KPI for solving complex problems using advanced [specific syllabus features].",
        "Gap: Students struggle with deeper cognitive understanding of [list 2-3 specific topics]."
      ]
    },
    {
      "title": "Unassessed Competency Scope in [Insert Unassessed Course Domain Areas] (${unassessedPOsText})",
      "bullets": [
        "Certain program outcomes (e.g. ${unassessedPOsText}) were not directly measured in this course offering.",
        "Risk: Unbalanced assessment focus may narrow student awareness of environmental, ethical, or project finance constraints."
      ]
    }
  ],
  "opportunities": [
    {
      "title": "Leverage Strong Hands-on Performance in [High CO] to Reinforce [Low CO Topic]",
      "bullets": [
        "The strong performance in hands-on application suggests that active learning strategies are highly effective. These can be extended to reinforce weaker theoretical areas in [specific topic]."
      ]
    },
    {
      "title": "Integration of Industry-Standard [Insert Course-Specific Framework/Toolchain] Workflows",
      "bullets": [
        "Introduce version control (Git) and industry testing frameworks into regular coursework to bridge academic exercises with commercial software practices."
      ]
    },
    {
      "title": "Peer-Led Code Reviews and [Insert Course-Specific Domain] Problem-Solving Sprints",
      "bullets": [
        "Capitalize on high teamwork scores by implementing structured peer review sessions and competitive programming sprints."
      ]
    }
  ],
  "recommendations": [
    {
      "title": "Hands-on Laboratory Coding Drills on [Insert Specific Course Topic 1] ([Lowest CO])",
      "bullets": [
        "Design 2–3 challenge-oriented laboratory exercises focusing specifically on [challenging topic].",
        "Adopt a three-tier difficulty progression (foundational verification → intermediate application → open-ended design)."
      ]
    },
    {
      "title": "Analytical Question Design on [Insert Specific Course Topic 2] in CTs & Midterm",
      "bullets": [
        "Structure formative Class Tests to include higher-order cognitive questions (analysis, evaluation) testing problem decomposition in [specific topic].",
        "Provide detailed question rubrics and model solutions immediately following assessments to accelerate learning feedback."
      ]
    },
    {
      "title": "Targeted Remedial Clinics on Complex [Insert Specific Difficult Topic 3]",
      "bullets": [
        "Offer supplemental tutorial hours for students falling below the ${kpiCO}% KPI benchmark in [topic] prior to the semester final exam.",
        "Incorporate live code tracing and step-by-step problem decomposition during lectures."
      ]
    },
    {
      "title": "Mandatory Adoption of [Insert Course-Specific Tool, e.g. Profiler/Online Judge/Simulator]",
      "bullets": [
        "Require students to utilize automated test suites and runtime tools relevant to [course subject] to eliminate common bugs early."
      ]
    },
    {
      "title": "Curricular Alignment of [Course Title] Modules with Capstone Engineering Projects",
      "bullets": [
        "Review attainment trends annually across sections to refine prerequisite sequencing and prepare students for capstone project complexities."
      ]
    }
  ],
  "threats": [
    {
      "title": "Unresolved Skill Gap in [Insert Specific Advanced Topic] Impeding Higher-Level Courses",
      "bullets": [
        "A shortfall in mastering [specific advanced concepts] may hinder performance in subsequent higher-level courses and capstone projects.",
        "Mitigation: Implement scaffolded prerequisite review modules at the start of downstream courses."
      ]
    },
    {
      "title": "Risk of Rote Syntax Memorization over Deep [Insert Course Subject] Problem Solving",
      "bullets": [
        "Students may rely on superficial memorization or AI code generation without understanding underlying architectural/algorithmic principles in [course subject].",
        "Mitigation: Design examinations requiring handwritten problem decomposition, architectural diagrams, and verbal defense."
      ]
    },
    {
      "title": "Curricular Disconnect from Contemporary [Insert Course Subject] Industry Toolchains",
      "bullets": [
        "Traditional textbook examples in [course subject] risk becoming obsolete if not continuously updated with modern frameworks and paradigms.",
        "Mitigation: Regularly consult industry advisory panels and update course problem sets."
      ]
    }
  ],
  "conclusion": "Comprehensive, professional academic paragraph synthesizing strengths, gaps, and CQI roadmap specifically for ${courseTitle} (${courseCode})."
}`

      let rawOutput = ''

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
        console.warn('Backend SWOT AI Proxy unavailable, attempting direct client fetch:', proxyErr.message)
      }

      if (!rawOutput && apiKey) {
        const clientEndpoints = [
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${encodeURIComponent(apiKey)}`
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
            console.warn('Client fetch endpoint error:', cErr.message)
          }
        }
      }

      if (!rawOutput) {
        throw new Error('Unable to connect to Gemini AI service. Using authentic calculations fallback.')
      }

      const cleanedText = rawOutput.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsedJSON = JSON.parse(cleanedText)

      if (parsedJSON.strengths && parsedJSON.weaknesses && parsedJSON.conclusion) {
        const fullData = {
          ...parsedJSON,
          introduction: parsedJSON.introduction || defaultIntroduction,
          aiSource: 'gemini'
        }
        setSwotData(fullData)
        setAiSource('gemini')
        try {
          localStorage.setItem(cacheKey, JSON.stringify(fullData))
        } catch (e) {
          console.warn('LocalStorage save failed:', e)
        }
      } else {
        throw new Error('Invalid JSON layout from Gemini')
      }
    } catch (err) {
      console.warn('Gemini AI SWOT Fetch Error, using authentic calculations:', err.message)
      setSwotData(fallbackCalculatedData)
      setAiSource('fallback')
      try {
        localStorage.setItem(cacheKey, JSON.stringify(fallbackCalculatedData))
      } catch (e) {}
    } finally {
      setGeneratingAI(false)
    }
  }

  useEffect(() => {
    fetchGeminiSWOT(false)
  }, [courseInfo.courseCode, courseInfo.courseTitle, sectionText])

  const handleResetToAuto = () => {
    fetchGeminiSWOT(true)
  }

  const handleSaveEdits = () => {
    if (!currentSWOT) return
    try {
      localStorage.setItem(cacheKey, JSON.stringify(currentSWOT))
      setSaveSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      console.error('Failed to save SWOT report:', e)
    }
  }

  // Mutators for editing
  const updateIntroduction = (val) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    copy.introduction = val
    setSwotData(copy)
  }

  const updateSectionItem = (sectionKey, itemIdx, field, val) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (copy[sectionKey] && copy[sectionKey][itemIdx]) {
      copy[sectionKey][itemIdx][field] = val
      setSwotData(copy)
    }
  }

  const updateBullet = (sectionKey, itemIdx, bulletIdx, val) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (copy[sectionKey] && copy[sectionKey][itemIdx] && copy[sectionKey][itemIdx].bullets) {
      copy[sectionKey][itemIdx].bullets[bulletIdx] = val
      setSwotData(copy)
    }
  }

  const addSectionItem = (sectionKey) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (!copy[sectionKey]) copy[sectionKey] = []
    copy[sectionKey].push({
      title: `Custom ${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} Point`,
      bullets: [`Enter custom teacher note or topic for ${courseTitle}...`]
    })
    setSwotData(copy)
  }

  const deleteSectionItem = (sectionKey, itemIdx) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (copy[sectionKey] && copy[sectionKey].length > itemIdx) {
      copy[sectionKey].splice(itemIdx, 1)
      setSwotData(copy)
    }
  }

  const addBulletToItem = (sectionKey, itemIdx) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (copy[sectionKey] && copy[sectionKey][itemIdx]) {
      if (!copy[sectionKey][itemIdx].bullets) copy[sectionKey][itemIdx].bullets = []
      copy[sectionKey][itemIdx].bullets.push('Enter additional detail or note...')
      setSwotData(copy)
    }
  }

  const deleteBulletFromItem = (sectionKey, itemIdx, bulletIdx) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    if (copy[sectionKey] && copy[sectionKey][itemIdx] && copy[sectionKey][itemIdx].bullets) {
      copy[sectionKey][itemIdx].bullets.splice(bulletIdx, 1)
      setSwotData(copy)
    }
  }

  const updateConclusion = (val) => {
    const copy = JSON.parse(JSON.stringify(currentSWOT))
    copy.conclusion = val
    setSwotData(copy)
  }

  // Export to Microsoft Word (.doc) matching official BAIUST standard format
  const handleExportWord = () => {
    const sections = [
      { num: '1', key: 'strengths', title: 'Strengths' },
      { num: '2', key: 'weaknesses', title: 'Weaknesses' },
      { num: '3', key: 'opportunities', title: 'Opportunities' },
      { num: '4', key: 'recommendations', title: 'Recommendations' },
      { num: '5', key: 'threats', title: 'Threats' }
    ]

    let sectionsHtml = ''
    sections.forEach((sec) => {
      const items = currentSWOT[sec.key] || []
      sectionsHtml += `
        <p style="font-family:'Times New Roman',Times,serif; font-size:12pt; font-weight:bold; color:#000000; margin:14pt 0 4pt 0; mso-pagination:widow-orphan; page-break-after:avoid;">
          ${sec.num}. ${sec.title}
        </p>
      `

      items.forEach((item, idx) => {
        sectionsHtml += `
          <p style="font-family:'Times New Roman',Times,serif; font-size:11.5pt; font-weight:bold; color:#000000; margin:6pt 0 2pt 20pt; text-indent:-20pt; mso-pagination:widow-orphan; page-break-after:avoid;">
            ${toRoman(idx + 1)}. ${item.title}
          </p>
        `
        ;(item.bullets || []).forEach((bullet) => {
          sectionsHtml += `
            <p style="font-family:'Times New Roman',Times,serif; font-size:11pt; font-weight:normal; color:#000000; margin:2pt 0 3pt 38pt; text-indent:-16pt; line-height:1.25; text-align:justify; mso-pagination:widow-orphan;">
              <span style="font-family:Symbol; mso-ascii-font-family:Symbol; font-size:10pt;">&#183;</span>&#160;&#160;${bullet}
            </p>
          `
        })
      })
    })

    const introText = currentSWOT.introduction || defaultIntroduction
    const conclusionText = currentSWOT.conclusion || fallbackCalculatedData.conclusion

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns:v='urn:schemas-microsoft-com:vml'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>SWOT Analysis Report - ${courseCode}</title>
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
            size: 210mm 297mm; /* A4 */
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
            font-size: 11.5pt;
            line-height: 1.25;
            color: #000000;
            margin: 0;
            padding: 0;
          }
          p, div, td, th, span {
            font-family: 'Times New Roman', Times, serif;
          }
          p.MsoFooter, div.MsoFooter {
            margin: 0;
            font-family: 'Times New Roman', Times, serif;
            font-size: 9pt;
            color: #555555;
            text-align: center;
          }
          #hrdftrtbl, table#hrdftrtbl {
            margin: 0in 0in 0in 9in;
            width: 1px;
            height: 1px;
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <div class="Section1">
          <!-- Institutional Header -->
          <div style="text-align:center; margin-bottom:8pt;">
            ${BAIUST_LOGO ? `<p style="text-align:center; margin:0 0 4pt 0;"><img src="${BAIUST_LOGO}" width="60" height="60" style="width:48pt; height:48pt; margin:0 auto; display:block;" alt="BAIUST Logo" /></p>` : ''}
            <h2 style="font-size:12.5pt; font-weight:bold; margin-bottom:2pt; text-align:center;">
              বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা
            </h2>
            <h3 style="font-size:11pt; font-weight:bold; margin-bottom:4pt; text-transform:uppercase; text-align:center;">
              BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE &amp; TECHNOLOGY (BAIUST), CUMILLA
            </h3>
            <h1 style="font-size:12.5pt; font-weight:bold; text-align:center; margin-top:6pt; margin-bottom:8pt;">
              SWOT Analysis
            </h1>
          </div>

          <!-- Metadata Table (Standard 4-Row Compact Layout) -->
          <table align="center" border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; width:100%; margin-bottom:12pt; font-size:10pt; font-family:'Times New Roman',Times,serif;">
            <tr>
              <td style="border:1px solid #000; width:30%; padding:3pt 6pt;"><b>Course Code &nbsp;:</b> ${courseCode}</td>
              <td colspan="2" style="border:1px solid #000; width:70%; padding:3pt 6pt;"><b>Course Title &nbsp;:</b> ${courseTitle}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000; width:30%; padding:3pt 6pt;"><b>Level &nbsp;:</b> ${levelText}</td>
              <td style="border:1px solid #000; width:35%; padding:3pt 6pt;"><b>Term &nbsp;:</b> ${termText}</td>
              <td style="border:1px solid #000; width:35%; padding:3pt 6pt;"><b>Section &nbsp;:</b> ${sectionText}</td>
            </tr>
            <tr>
              <td style="border:1px solid #000; width:30%; padding:3pt 6pt;"><b>Group &nbsp;:</b> ${groupText}</td>
              <td style="border:1px solid #000; width:35%; padding:3pt 6pt;"><b>Semester &nbsp;:</b> ${semesterName}</td>
              <td style="border:1px solid #000; width:35%; padding:3pt 6pt;"><b>Year &nbsp;:</b> ${academicYear}</td>
            </tr>
            <tr>
              <td colspan="2" style="border:1px solid #000; width:65%; padding:3pt 6pt;"><b>Instructor &nbsp;:</b> ${teacherName}${teacherDesignation ? ', ' + teacherDesignation : ''}</td>
              <td style="border:1px solid #000; width:35%; padding:3pt 6pt;"><b>Signature &nbsp;:</b> ____________________</td>
            </tr>
          </table>

          <!-- Introduction Section -->
          <p style="font-family:'Times New Roman',Times,serif; font-size:11.5pt; font-weight:bold; color:#000000; margin:12pt 0 4pt 0; mso-pagination:widow-orphan; page-break-after:avoid;">
            Introduction
          </p>
          <p style="font-family:'Times New Roman',Times,serif; font-size:11pt; font-weight:normal; color:#000000; margin:3pt 0 10pt 0; line-height:1.3; text-align:justify; mso-pagination:widow-orphan;">
            ${introText}
          </p>

          <!-- SWOT Analysis Heading -->
          <p style="font-family:'Times New Roman',Times,serif; font-size:12pt; font-weight:bold; color:#000000; margin:14pt 0 6pt 0; mso-pagination:widow-orphan; page-break-after:avoid;">
            SWOT Analysis
          </p>

          <!-- 5 SWOT Sections -->
          ${sectionsHtml}

          <!-- Conclusion Section -->
          <p style="font-family:'Times New Roman',Times,serif; font-size:11.5pt; font-weight:bold; color:#000000; margin:16pt 0 4pt 0; mso-pagination:widow-orphan; page-break-after:avoid;">
            Conclusion
          </p>
          <p style="font-family:'Times New Roman',Times,serif; font-size:11pt; font-weight:normal; color:#000000; margin:3pt 0 12pt 0; line-height:1.3; text-align:justify; mso-pagination:widow-orphan;">
            ${conclusionText}
          </p>
        </div>

        <!-- Word Running Footer -->
        <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="mso-element:footer" id="f1">
                <table border="0" cellspacing="0" cellpadding="0" style="width:100%; border:none; border-top:0.5pt solid #cccccc; padding-top:4pt; font-family:'Times New Roman',Times,serif; font-size:9pt; color:#444444;">
                  <tr>
                    <td style="border:none; text-align:left; font-size:9pt; color:#444444; padding:0;">
                      <p class="MsoFooter" style="text-align:left; margin:0;">
                        SWOT Analysis Report &bull; ${courseCode} (${sectionText})
                      </p>
                    </td>
                    <td style="border:none; text-align:right; font-size:9pt; color:#444444; padding:0;">
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
    const downloadFileName = `SWOT_Analysis_${safeCourseCode}_${sectionText.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadFileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Helper to render editable/viewable section
  const renderSection = (sectionKey, sectionTitle, sectionNumber) => {
    const items = currentSWOT[sectionKey] || []

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-black font-serif">{sectionNumber}. {sectionTitle}</h4>
          {isEditing && (
            <button
              onClick={() => addSectionItem(sectionKey)}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-all no-print shadow-xs"
              title={`Add new point under ${sectionTitle}`}
            >
              <Plus size={12} />
              <span>Add Point</span>
            </button>
          )}
        </div>
        <div className="space-y-2.5 pl-3">
          {items.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="font-bold flex items-center gap-2 text-xs font-serif">
                <span className="shrink-0">{toRoman(idx + 1)}.</span>
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateSectionItem(sectionKey, idx, 'title', e.target.value)}
                      className="w-full border-b border-emerald-400 font-bold px-1.5 py-0.5 outline-none text-xs font-serif bg-amber-50/40 rounded-t"
                      placeholder="Point title..."
                    />
                    <button
                      onClick={() => deleteSectionItem(sectionKey, idx)}
                      className="text-red-500 hover:text-red-700 p-0.5 rounded transition-all shrink-0 no-print"
                      title="Delete this point"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <span>{item.title}</span>
                )}
              </div>

              {/* Bullets */}
              <div className="pl-4 space-y-1">
                {(item.bullets || []).map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2 text-xs text-black font-serif leading-relaxed">
                    <span className="shrink-0 text-black text-sm leading-none mt-0.5">&bull;</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <textarea
                          value={bullet}
                          onChange={(e) => updateBullet(sectionKey, idx, bIdx, e.target.value)}
                          className="w-full border border-gray-300 rounded p-1 text-xs font-serif outline-none bg-amber-50/20 focus:border-emerald-500 leading-normal"
                          rows={2}
                        />
                        <button
                          onClick={() => deleteBulletFromItem(sectionKey, idx, bIdx)}
                          className="text-red-400 hover:text-red-600 p-0.5 shrink-0 no-print"
                          title="Delete bullet"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-justify">{bullet}</span>
                    )}
                  </div>
                ))}

                {isEditing && (
                  <button
                    onClick={() => addBulletToItem(sectionKey, idx)}
                    className="text-2xs text-emerald-700 font-bold hover:underline pl-3 pt-0.5 flex items-center gap-1 no-print"
                  >
                    <Plus size={10} /> Add detail note
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-200/80 overflow-hidden no-print">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-800 border border-emerald-200 shrink-0">
              <Bot size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  SWOT Analysis Report
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
                Course-Oriented SWOT Report &bull; <span className="font-bold text-gray-800">{courseCode}</span> ({courseTitle}) &bull; Section: <span className="font-bold text-gray-800">{sectionText}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {isEditing ? (
              <button
                onClick={handleSaveEdits}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Check size={14} />
                <span>Save Changes</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold border border-gray-300 transition-all"
              >
                <Edit3 size={14} />
                <span>Edit Report</span>
              </button>
            )}

            <button
              onClick={handleResetToAuto}
              disabled={generatingAI}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold border border-gray-300 transition-all disabled:opacity-50"
              title="Regenerate SWOT report using Gemini AI"
            >
              <RotateCcw size={14} className={generatingAI ? 'animate-spin' : ''} />
              <span>Regenerate</span>
            </button>

            <button
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Download size={14} />
              <span>Export Word (.doc)</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="px-5 py-2 bg-emerald-50 border-t border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check size={14} /> Changes saved successfully!
          </div>
        )}
      </div>

      {/* Main Document Preview Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-12 max-w-4xl mx-auto printable-swot-document" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        
        {/* BAIUST Official Header */}
        <div className="text-center space-y-1 mb-6">
          <div className="flex justify-center mb-2">
            <img src={BAIUST_LOGO} alt="BAIUST Logo" className="h-16 w-auto object-contain" />
          </div>
          <div className="text-sm sm:text-base font-bold text-black leading-tight">
            বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা
          </div>
          <div className="text-xs sm:text-sm font-bold text-black tracking-tight uppercase">
            BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE &amp; TECHNOLOGY (BAIUST), CUMILLA
          </div>
          <div className="text-sm font-bold text-black tracking-wider uppercase mt-3">
            SWOT Analysis
          </div>
        </div>

        {/* Metadata Table (Teacher's Standard 4-Row Layout matching image) */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-black text-xs font-serif">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-bold w-1/3">
                  Course Code &nbsp;: &nbsp;<span className="font-normal">{courseCode}</span>
                </td>
                <td className="border border-black p-2 font-bold w-2/3" colSpan={2}>
                  Course Title &nbsp;: &nbsp;<span className="font-normal">{courseTitle}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold w-1/3">
                  Level &nbsp;: &nbsp;<span className="font-normal">{levelText}</span>
                </td>
                <td className="border border-black p-2 font-bold w-1/3">
                  Term &nbsp;: &nbsp;<span className="font-normal">{termText}</span>
                </td>
                <td className="border border-black p-2 font-bold w-1/3">
                  Section &nbsp;: &nbsp;<span className="font-normal">{sectionText}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold w-1/3">
                  Group &nbsp;: &nbsp;<span className="font-normal">{groupText}</span>
                </td>
                <td className="border border-black p-2 font-bold w-1/3">
                  Semester &nbsp;: &nbsp;<span className="font-normal">{semesterName}</span>
                </td>
                <td className="border border-black p-2 font-bold w-1/3">
                  Year &nbsp;: &nbsp;<span className="font-normal">{academicYear}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold" colSpan={2}>
                  Instructor &nbsp;: &nbsp;<span className="font-normal">{teacherName}{teacherDesignation ? `, ${teacherDesignation}` : ''}</span>
                </td>
                <td className="border border-black p-2 font-bold">
                  Signature &nbsp;: &nbsp;<span className="font-normal">________________________</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sections or Inline Loading Skeleton */}
        {generatingAI ? (
          <div className="py-10 space-y-6 font-sans no-print">
            <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm">
              <RefreshCw size={16} className="animate-spin" />
              <span>Analyzing outcomes & generating AI SWOT Report for {courseCode}...</span>
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
          <div className="space-y-6 text-sm text-black leading-relaxed font-serif">
            {/* Introduction Section */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-black font-serif">Introduction</h4>
              {isEditing ? (
                <textarea
                  value={currentSWOT.introduction || defaultIntroduction}
                  onChange={(e) => updateIntroduction(e.target.value)}
                  className="w-full border border-emerald-400 rounded-lg p-3 text-xs font-serif outline-none leading-relaxed bg-amber-50/20 focus:border-emerald-500"
                  rows={4}
                  placeholder="Introduction paragraph explaining attainment measurement and learning objectives..."
                />
              ) : (
                <p className="text-xs text-justify font-normal leading-relaxed text-gray-900">
                  {currentSWOT.introduction || defaultIntroduction}
                </p>
              )}
            </div>

            {/* SWOT Analysis Heading */}
            <div className="pt-1">
              <h4 className="text-sm font-bold text-black font-serif">SWOT Analysis</h4>
            </div>

            {/* 5 SWOT Sections */}
            {renderSection('strengths', 'Strengths', 1)}
            {renderSection('weaknesses', 'Weaknesses', 2)}
            {renderSection('opportunities', 'Opportunities', 3)}
            {renderSection('recommendations', 'Recommendations', 4)}
            {renderSection('threats', 'Threats', 5)}

            {/* Conclusion Section */}
            <div className="pt-2 space-y-2">
              <h4 className="text-sm font-bold text-black font-serif">Conclusion</h4>
              {isEditing ? (
                <textarea
                  value={currentSWOT.conclusion || fallbackCalculatedData.conclusion}
                  onChange={(e) => updateConclusion(e.target.value)}
                  className="w-full border border-emerald-400 rounded-lg p-3 text-xs font-serif outline-none leading-relaxed bg-amber-50/20 focus:border-emerald-500"
                  rows={4}
                  placeholder="Comprehensive conclusion summarizing overall attainment and continuous improvement..."
                />
              ) : (
                <p className="text-xs text-justify font-normal leading-relaxed text-gray-900">
                  {currentSWOT.conclusion || fallbackCalculatedData.conclusion}
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
