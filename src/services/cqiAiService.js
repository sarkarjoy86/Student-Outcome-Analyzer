/**
 * BAETE CQI (Continuous Quality Improvement) AI Service
 * Adheres to BAETE Accreditation Manual (Criterion 3, 4, 9) and Washington Accord Graduate Attributes.
 * Provides AI-driven analysis for:
 * 1. Course-Level CQI & Closing-the-Loop Action Report (ComprehensiveReports)
 * 2. Program/Batch-Level CQI Remediation & Faculty Review Meeting Report (PORecommendationMatrix)
 */

const STANDARD_PO_NAMES = {
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
};

const WA_CLUSTERS = [
  { short: 'Technical', pos: ['PO1', 'PO2', 'PO3', 'PO4'], desc: 'Knowledge, Analysis, Design & Investigation' },
  { short: 'Modern Practice', pos: ['PO5', 'PO6', 'PO7', 'PO8'], desc: 'Tools, Society, Environment & Ethics' },
  { short: 'Professional', pos: ['PO9', 'PO10', 'PO11', 'PO12'], desc: 'Teamwork, Communication, Management & Lifelong Learning' },
];

/**
 * Computes strictly sequential academic semester progression for closing-the-loop:
 * Rule:
 * Spring YYYY -> Fall YYYY
 * Fall YYYY   -> Spring (YYYY + 1)
 */
export function getNextSemester(semName = '', academicYear = '') {
  const sem = (semName || '').trim();
  let yr = parseInt(String(academicYear).replace(/\D/g, ''), 10);
  if (isNaN(yr) || yr < 2000) {
    const m = sem.match(/(\d{4})/);
    if (m) yr = parseInt(m[1], 10);
    else yr = new Date().getFullYear();
  }

  if (/spring/i.test(sem)) {
    return `Fall ${yr}`;
  } else if (/fall|autumn/i.test(sem)) {
    return `Spring ${yr + 1}`;
  } else if (/summer/i.test(sem)) {
    return `Fall ${yr}`;
  }
  return `Fall ${yr}`;
}

/**
 * Universal Gemini API call handler with backend proxy and direct client fallback.
 */
async function callGeminiApi(promptText) {
  const apiKey = (
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') ||
    localStorage.getItem('OBE_GEMINI_API_KEY') ||
    ''
  ).trim();

  let rawOutput = '';

  // 1. Try Backend Proxy
  try {
    const token = localStorage.getItem('obe-auth-token');
    const isProduction =
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1');
    const apiBase = isProduction ? 'https://student-outcome-analyzer-api.onrender.com' : '';
    const res = await fetch(`${apiBase}/api/ai/swot-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ promptText }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.content) {
        rawOutput = data.content;
      }
    }
  } catch (proxyErr) {
    console.warn('[CQI-AI] Backend proxy unavailable, attempting direct client fallback:', proxyErr.message);
  }

  // 2. Direct Client Fallback if API key present
  if (!rawOutput && apiKey) {
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(apiKey)}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
    ];

    for (const url of endpoints) {
      try {
        const clientRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.75, maxOutputTokens: 2500 },
          }),
        });
        const clientData = await clientRes.json();
        if (clientRes.ok && clientData.candidates?.[0]?.content?.parts?.[0]?.text) {
          rawOutput = clientData.candidates[0].content.parts[0].text;
          break;
        }
      } catch (err) {
        console.warn('[CQI-AI] Direct client endpoint failed:', err.message);
      }
    }
  }

  if (!rawOutput) {
    throw new Error('No AI response received from backend proxy or direct Gemini endpoints.');
  }

  const cleaned = rawOutput
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  return sanitizeAcademicGrammar(parsed);
}

/**
 * Universal grammar, spelling, and academic accreditation terminology sanitizer.
 * Cleans colloquialisms, replaces non-standard/archaic plurals (e.g. 'syllabi' -> 'course syllabus'),
 * fixes duplicate words, and standardizes Bloom's taxonomy & BAETE terms.
 */
export function sanitizeAcademicGrammar(value) {
  if (typeof value === 'string') {
    return value
      .replace(/\bRevise course syllabi\b/gi, 'Revise course syllabus')
      .replace(/\bcourse syllabi\b/gi, 'course syllabus')
      .replace(/\bunseen course syllabi\b/gi, 'unseen course syllabuses')
      .replace(/\bsyllabi\b/gi, 'course syllabus')
      .replace(/\bthe the\b/gi, 'the')
      .replace(/\ba a\b/gi, 'a')
      .replace(/\ban an\b/gi, 'an')
      .replace(/\bbench-marked\b/gi, 'benchmarked')
      .replace(/\bbench-mark\b/gi, 'benchmark')
      .replace(/\bBloom levels\b/gi, "Bloom's Taxonomy levels")
      .replace(/\bBlooms Taxonomy\b/gi, "Bloom's Taxonomy");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeAcademicGrammar);
  }
  if (value !== null && typeof value === 'object') {
    const res = {};
    for (const k of Object.keys(value)) {
      res[k] = sanitizeAcademicGrammar(value[k]);
    }
    return res;
  }
  return value;
}

/**
 * =======================================================================
 * PART 1: COURSE-LEVEL CQI REPORT GENERATION (ComprehensiveReports)
 * BAETE Criterion 9.2 Course Review Report & CQI File
 * =======================================================================
 */
export async function generateCourseLevelCQI({
  offeringId = 'default',
  courseCode = 'Course',
  courseTitle = 'Course Title',
  semesterName = 'Semester',
  academicYear = '',
  sectionName = 'A',
  targetPassMarks = 40,
  kpiCO = 50,
  kpiPO = 50,
  activeCOs = [],
  activePOs = [],
  calculations = {},
  coDescriptions = {},
  poDescriptions = {},
  forceRegenerate = false,
  customTeacherNotes = '',
}) {
  const cacheKey = `BAETE_COURSE_CQI_${offeringId}_${courseCode}_${targetPassMarks}_${kpiCO}_${kpiPO}_v3`;

  if (!forceRegenerate) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.summary && parsed?.remediations) {
          return { ...parsed, aiSource: parsed.aiSource || 'cached' };
        }
      }
    } catch (e) {
      console.warn('[CQI-AI] Error reading course CQI cache:', e);
    }
  }

  // Pre-calculate attainment gaps for prompt
  const coAttainments = calculations?.coAttainment || {};
  const poAttainments = calculations?.poAttainment || {};

  const coBreakdown = activeCOs.map(co => {
    const data = coAttainments[co] || {};
    const passPct = Math.round((data.passMarksPercentage || 0) * 10) / 10;
    const kpiPct = Math.round((data.kpiPercentage || 0) * 10) / 10;
    const desc = coDescriptions[co] || '';
    const gap = Math.round((kpiCO - kpiPct) * 10) / 10;
    return { co, desc, passPct, kpiPct, gap, isMet: kpiPct >= kpiCO };
  });

  const poBreakdown = activePOs.map(po => {
    const data = poAttainments[po] || {};
    const passPct = Math.round((data.passMarksPercentage || 0) * 10) / 10;
    const kpiPct = Math.round((data.kpiPercentage || 0) * 10) / 10;
    const desc = poDescriptions[po] || STANDARD_PO_NAMES[po] || '';
    const gap = Math.round((kpiPO - kpiPct) * 10) / 10;
    return { po, desc, passPct, kpiPct, gap, isMet: kpiPct >= kpiPO };
  });

  const unassessedCOs = Array.from({ length: 6 }, (_, i) => `CO${i + 1}`).filter(c => !activeCOs.includes(c));
  const unassessedPOs = Array.from({ length: 12 }, (_, i) => `PO${i + 1}`).filter(p => !activePOs.includes(p));
  const nextTerm = getNextSemester(semesterName, academicYear);

  // Scenario check: Scenario A (Deficit) vs Scenario B (All Attained)
  const weakCOs = coBreakdown.filter(c => !c.isMet);
  const weakPOs = poBreakdown.filter(p => !p.isMet);
  const allAttained = weakCOs.length === 0 && weakPOs.length === 0;

  const sortedActiveCOs = [...coBreakdown].sort((a, b) => a.kpiPct - b.kpiPct);
  const lowestCO = sortedActiveCOs[0];

  const scenarioGuidance = allAttained
    ? `ATTAINMENT STATUS: SCENARIO B (PROACTIVE / HIGH-PERFORMING CASE - ALL OUTCOMES ATTAINED)
- All evaluated COs and POs met or surpassed their KPI benchmarks (${kpiCO}% for COs, ${kpiPO}% for POs).
- MANDATORY TONE & VOCABULARY RESTRICTION: DO NOT use harsh words like "deficit", "failure", "unmet", or "root cause of failure".
- Frame the analysis under Proactive Continuous Quality Improvement and Continuous Enhancement.
- In "rootCauses" (which maps to Section 1 sub-label "IDENTIFIED COMPREHENSION BOTTLENECKS / ENHANCEMENT AREAS:"), highlight relative comprehension bottlenecks (e.g., identifying why an outcome among the attained outcomes like ${lowestCO ? `${lowestCO.co} at ${lowestCO.kpiPct}%` : 'CO2 at 79.3%'} was slightly lower than other COs at 100%) and examine challenging conceptual topics that required disproportionate student effort.
- In "remediations" and "actionPlanForNextSemester", propose proactive pedagogical enhancements, advanced industry-aligned complex engineering problem modules (WP1-WP4), and honors-level problem decomposition to elevate future benchmark targets beyond current baselines.`
    : `ATTAINMENT STATUS: SCENARIO A (DEFICIT CASE - AT LEAST ONE OUTCOME UNMET)
- At least one CO or PO failed to meet target KPI benchmarks (${kpiCO}% for COs, ${kpiPO}% for POs). Deficit outcomes: ${[...weakCOs.map(c => `${c.co} (${c.kpiPct}%)`), ...weakPOs.map(p => `${p.po} (${p.kpiPct}%)`)].join(', ')}.
- Perform an evidence-based Root Cause Analysis (RCA) focusing strictly on why specific COs/POs failed to meet target thresholds (e.g. cognitive taxonomy mismatch, insufficient lab drill hours, theoretical abstraction, assessment ambiguity).
- Propose concrete, corrective pedagogical remediations, rubric realignments, and remedial clinic hours to close the loop in ${nextTerm}.`;

  const promptText = `System Role: You are a Senior Academic OBE Accreditation Consultant and BAETE Program Evaluator at Bangladesh Army International University of Science and Technology (BAIUST), Cumilla.
TASK: Generate an official BAETE Criterion 9.2 "Course Continuous Quality Improvement (CQI) Action Plan & Closing-the-Loop Report" for:
- Course: ${courseCode} - ${courseTitle}
- Current Semester: ${semesterName} ${academicYear}, Section: ${sectionName}
- Subsequent Re-Assessment Semester: ${nextTerm} (CRITICAL: University semester sequence is strictly Spring YYYY -> Fall YYYY -> Spring YYYY+1. Current is ${semesterName} ${academicYear}, so next is STRICTLY ${nextTerm}. Do not jump years!)
- Assessment Benchmarks: Target Pass Mark = ${targetPassMarks}%, Course KPI = ${kpiCO}%, Program KPI = ${kpiPO}%

${scenarioGuidance}

CURRENT ATTAINMENT DATA:
Course Outcomes (COs):
${coBreakdown.map(c => `- ${c.co} (${c.desc}): Pass Rate=${c.passPct}%, KPI Attainment=${c.kpiPct}% (Status: ${c.isMet ? 'MET' : `DEFICIT -${c.gap}%`})`).join('\n')}
${unassessedCOs.length > 0 ? `Unassessed / Zero COs in syllabus: ${unassessedCOs.join(', ')}` : ''}

Program Outcomes (POs) Mapped to this Course:
${poBreakdown.map(p => `- ${p.po} (${p.desc}): Pass Rate=${p.passPct}%, KPI Attainment=${p.kpiPct}% (Status: ${p.isMet ? 'MET' : `DEFICIT -${p.gap}%`})`).join('\n')}
${unassessedPOs.length > 0 ? `POs Not Mapped to this Course: ${unassessedPOs.join(', ')}` : ''}

${customTeacherNotes ? `TEACHER'S RECENT OBSERVATIONS / DRAFT NOTES:\n${customTeacherNotes}\n` : ''}

REQUIREMENTS FOR BAETE CRITERION 9 COMPLIANCE:
1. "summary": A concise academic executive summary (80-120 words) analyzing whether this offering successfully closed the learning loop. ${allAttained ? 'Highlight cognitive strengths and state proactive enhancement strategies to elevate future performance.' : 'Identify key cognitive strengths and deficit bottlenecks requiring targeted corrective action.'}
2. "rootCauses": Array of 2-3 specific bullet points. ${allAttained ? 'Highlight relative comprehension bottlenecks or opportunities for continuous pedagogical enhancement (DO NOT mention "failure" or "deficit").' : 'Explain specific root causes for why students struggled with the lowest COs/POs (e.g. cognitive taxonomy mismatch, insufficient lab drill hours, theoretical abstraction, assessment ambiguity).'}
3. "remediations": Array of actionable pedagogical interventions. ${allAttained ? 'Propose continuous enrichment modules for the outcomes with relative room for growth to sustain high achievement and elevate future targets.' : 'For every CO or PO that fell below the KPI threshold (or had 0% attainment), provide targeted remediation.'}
   - "code": Outcome identifier (e.g. "CO5" or "PO10")
   - "title": Specific technical intervention title tailored to "${courseTitle}"
   - "action": 2-3 lines of high-impact pedagogical remediation or enhancement (e.g., rubrics redesign, tutorial problem sessions, hands-on tool practicals, revised midterm question decomposition).
   - "category": One of ["Assessment Refinement", "Laboratory/Tool Practice", "Pedagogical Delivery", "Remedial Clinics"]
4. "actionPlanForNextSemester": Exactly 3-4 bullet-point operational commitments the course instructor must implement in the next offering (${nextTerm}) to close the loop.
5. "closingTheLoopTarget": Expected quantitative attainment target for the next offering specifically in ${nextTerm} (e.g., "${allAttained ? `Aim to elevate cohort benchmark to ≥ ${Math.min(kpiCO + 5, 85)}% in ${nextTerm} through advanced design rubric integration` : `Aim to elevate student attainment to ≥ 70% in ${nextTerm} through dedicated lab rubric integration`}").
6. "meetingMinutesDraft": A short template text of Course Assessment Committee (CAC) discussion minutes for ${courseCode} in ${nextTerm} that the teacher can print, edit, or file.

OUTPUT FORMAT: Return ONLY a valid JSON object matching this structure without markdown code blocks:
{
  "summary": "...",
  "rootCauses": ["...", "..."],
  "remediations": [
    {
      "code": "CO5",
      "title": "...",
      "action": "...",
      "category": "Laboratory/Tool Practice"
    }
  ],
  "actionPlanForNextSemester": ["...", "..."],
  "closingTheLoopTarget": "...",
  "meetingMinutesDraft": "..."
}`;

  try {
    const aiResult = await callGeminiApi(promptText);
    const enriched = {
      ...aiResult,
      aiSource: 'gemini',
      generatedAt: new Date().toISOString(),
      courseCode,
      courseTitle,
      semester: `${semesterName} ${academicYear}`,
      thresholds: { targetPassMarks, kpiCO, kpiPO },
      allAttained,
      section1Title: allAttained
        ? '1. EXECUTIVE EVALUATION & CONTINUOUS ENHANCEMENT ANALYSIS'
        : '1. EXECUTIVE EVALUATION & ROOT CAUSE ANALYSIS (RCA)',
      section1Sublabel: allAttained
        ? 'IDENTIFIED COMPREHENSION BOTTLENECKS / ENHANCEMENT AREAS:'
        : 'IDENTIFIED CONTRIBUTING FACTORS / ROOT CAUSES:',
    };
    try {
      localStorage.setItem(cacheKey, JSON.stringify(enriched));
    } catch (e) {
      console.warn('[CQI-AI] Failed saving course CQI to localStorage:', e);
    }
    return enriched;
  } catch (err) {
    console.warn('[CQI-AI] Gemini call failed, generating academic heuristic fallback:', err.message);
    const fallback = generateCourseCQIFallback({
      courseCode,
      courseTitle,
      semesterName,
      academicYear,
      sectionName,
      targetPassMarks,
      kpiCO,
      kpiPO,
      coBreakdown,
      poBreakdown,
      unassessedCOs,
      unassessedPOs,
    });
    try {
      localStorage.setItem(cacheKey, JSON.stringify(fallback));
    } catch (e) {}
    return fallback;
  }
}

/**
 * Heuristic fallback for Course-Level CQI (strictly academic, BAETE-compliant).
 */
function generateCourseCQIFallback({
  courseCode,
  courseTitle,
  semesterName,
  academicYear,
  sectionName,
  targetPassMarks,
  kpiCO,
  kpiPO,
  coBreakdown,
  poBreakdown,
  unassessedCOs,
  unassessedPOs,
}) {
  const weakCOs = coBreakdown.filter(c => !c.isMet);
  const weakPOs = poBreakdown.filter(p => !p.isMet);
  const allAttained = weakCOs.length === 0 && weakPOs.length === 0;
  const nextTerm = getNextSemester(semesterName, academicYear);

  const sortedCOs = [...coBreakdown].sort((a, b) => a.kpiPct - b.kpiPct);
  const lowestAttainedCO = sortedCOs[0];

  const remediations = [];

  if (allAttained) {
    const focusCode = lowestAttainedCO ? lowestAttainedCO.co : 'Continuous Excellence';
    const focusPct = lowestAttainedCO ? `${lowestAttainedCO.kpiPct}%` : 'the benchmark';
    remediations.push({
      code: focusCode,
      title: `Advanced Competency Enrichment for ${courseTitle}`,
      action: `All evaluated outcomes surpassed the ${kpiCO}% benchmark (with ${focusCode} attaining ${focusPct}). Introduce industry-aligned complex engineering problem modules (WP1-WP4) and enhanced open-ended design problems to elevate future cohort attainment targets in ${nextTerm}.`,
      category: 'Pedagogical Delivery',
    });
  } else {
    weakCOs.forEach(c => {
      remediations.push({
        code: c.co,
        title: `${c.co} Remedial Pedagogy for ${courseTitle}`,
        action: c.kpiPct === 0
          ? `Outcome ${c.co} was not formally assessed or attained 0%. Integrate structured formative class tests and map distinct problem-solving rubrics in upcoming midterm and final examinations.`
          : `Student attainment (${c.kpiPct}%) lagged by ${c.gap}% behind the ${kpiCO}% KPI. Conduct two specialized tutorial clinics on core analytical topics and introduce step-by-step problem decomposition exercises.`,
        category: c.kpiPct === 0 ? 'Assessment Refinement' : 'Remedial Clinics',
      });
    });

    weakPOs.forEach(p => {
      remediations.push({
        code: p.po,
        title: `${p.po} (${p.desc}) Reinforcement Plan`,
        action: p.kpiPct === 0
          ? `${p.po} attained 0% in this offering. Restructure course assignment deliverables to incorporate ${p.desc.toLowerCase()} components with explicit rubric scoring.`
          : `Attainment reached ${p.kpiPct}% vs ${kpiPO}% benchmark. Introduce peer-evaluated collaborative assignments and require mini-design case studies demonstrating ${p.desc.toLowerCase()}.`,
        category: 'Pedagogical Delivery',
      });
    });
  }

  const summary = allAttained
    ? `Continuous Quality Improvement (CQI) assessment for ${courseCode} (${courseTitle}) conducted for ${semesterName} ${academicYear} across Section ${sectionName}. The evaluation benchmarked Course Outcomes against a ${kpiCO}% KPI and Program Outcomes against ${kpiPO}%. All evaluated outcomes successfully met or exceeded established performance criteria, demonstrating solid conceptual comprehension. Proactive continuous enhancement strategies have been formulated to sustain achievement and elevate future performance benchmarks.`
    : `Continuous Quality Improvement (CQI) assessment for ${courseCode} (${courseTitle}) conducted for ${semesterName} ${academicYear} across Section ${sectionName}. The evaluation benchmarked Course Outcomes against a ${kpiCO}% KPI and Program Outcomes against ${kpiPO}%. Identified ${weakCOs.length} deficit CO(s) and ${weakPOs.length} deficit PO(s) requiring targeted pedagogical and rubric remediation to close the loop.`;

  const rootCauses = allAttained
    ? [
        lowestAttainedCO
          ? `Relative cognitive variation observed in ${lowestAttainedCO.co} (${lowestAttainedCO.kpiPct}%) due to multi-step analytical complexity compared to foundational modules.`
          : 'Minor variance in analytical problem decomposition across complex problem sets compared to standard descriptive questions.',
        'Sustained cognitive engagement achieved through structured continuous assessments, with scope for deeper hands-on tool practicals.',
        'High overall comprehension across summative assessments, with opportunities to introduce honors-level complex engineering problem (WP1-WP4) challenges.',
      ]
    : [
        weakCOs.length > 0 ? 'Higher cognitive demand in terminal exam questions without sufficient formative scaffolding during regular lectures.' : 'Sustained cognitive engagement through continuous laboratory assignments.',
        weakPOs.length > 0 ? 'Lack of explicit grading criteria and student awareness regarding mapped Washington Accord professional competencies.' : "Balanced question distribution mapped effectively across Bloom's Taxonomy levels.",
        'Time constraints in completing advanced syllabus units before summative evaluation periods.',
      ];

  const actionPlanForNextSemester = allAttained
    ? [
        `Integrate advanced complex engineering problem modules (WP1-WP4) into ${courseCode} assignments during ${nextTerm}.`,
        `Introduce open-ended design challenges and industry case studies to elevate student mastery beyond baseline benchmarks.`,
        `Refine assessment rubrics to reward higher-order synthesis and innovative analytical design in ${nextTerm}.`,
        `Maintain continuous formative feedback loops to sustain 100% attainment across all active outcomes.`,
      ]
    : [
        `Incorporate explicit Bloom's Taxonomy aligned rubrics for all assessments in ${courseCode} during ${nextTerm}.`,
        `Schedule mandatory remedial problem-solving tutorials before midterm and final examinations in ${nextTerm}.`,
        'Mandate hands-on software/tool laboratory components with progressive difficulty levels.',
        'Review question difficulty index during Course Assessment Committee (CAC) pre-moderation.',
      ];

  const closingTheLoopTarget = allAttained
    ? `Target to sustain ≥ ${kpiCO}% attainment while elevating higher-order design competency to ≥ ${Math.min(kpiCO + 5, 85)}% in the subsequent offering of ${courseCode} in ${nextTerm}.`
    : `Target minimum 70% student attainment across all evaluated outcomes in the subsequent offering of ${courseCode} in ${nextTerm}.`;

  const minutesAgreed = allAttained
    ? `3. Action Agreed: Course teacher will integrate advanced complex problem modules (WP1-WP4) and maintain high engagement rubrics.\n4. Verification: Cohort performance will be evaluated at the conclusion of ${nextTerm} offering to sustain exemplary outcome attainment.`
    : `3. Action Agreed: Course teacher will revise formative question rubrics and conduct targeted tutorial drills.\n4. Verification: Attainment will be re-audited at the conclusion of ${nextTerm} offering to ensure loop closure.`;

  return sanitizeAcademicGrammar({
    summary,
    rootCauses,
    remediations,
    actionPlanForNextSemester,
    closingTheLoopTarget,
    meetingMinutesDraft: `MINUTES OF COURSE CQI REVIEW MEETING - DEPARTMENT OF CSE\nCourse: ${courseCode} (${courseTitle})\nSemester: ${semesterName} ${academicYear} | Section: ${sectionName}\nNext Target Semester: ${nextTerm}\n\n1. Review of Attainment: The committee reviewed direct attainment scores. Target KPI was set at ${kpiCO}%.\n2. Attainment Status: ${allAttained ? 'All evaluated outcomes met or exceeded the KPI benchmark.' : `Outcomes requiring remediation: ${[...weakCOs.map(c => c.co), ...weakPOs.map(p => p.po)].join(', ') || 'None'}.`}\n${minutesAgreed}`,
    aiSource: 'heuristic',
    generatedAt: new Date().toISOString(),
    courseCode,
    courseTitle,
    semester: `${semesterName} ${academicYear}`,
    thresholds: { targetPassMarks, kpiCO, kpiPO },
    allAttained,
    section1Title: allAttained
      ? '1. EXECUTIVE EVALUATION & CONTINUOUS ENHANCEMENT ANALYSIS'
      : '1. EXECUTIVE EVALUATION & ROOT CAUSE ANALYSIS (RCA)',
    section1Sublabel: allAttained
      ? 'IDENTIFIED COMPREHENSION BOTTLENECKS / ENHANCEMENT AREAS:'
      : 'IDENTIFIED CONTRIBUTING FACTORS / ROOT CAUSES:',
  });
}

/**
 * ===============================================================================
 * PART 2: PROGRAM / BATCH CQI MATRIX & FACULTY MEETING REPORT
 * BAETE Criterion 3 (POs) & Criterion 9 (Closing the Loop)
 * =======================================================================
 */
export async function generateBatchLevelCQI({
  batchId = 'Batch',
  section = 'ALL',
  threshold = 50,
  batchChartData = [],
  clusterStats = [],
  completedCourses = [],
  forceRegenerate = false,
  customMeetingNotes = '',
}) {
  const cacheKey = `BAETE_BATCH_CQI_${batchId}_${section}_${threshold}_v2`;

  if (!forceRegenerate) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.poRemediations && parsed?.facultyMeetingReport) {
          return { ...parsed, aiSource: parsed.aiSource || 'cached' };
        }
      }
    } catch (e) {
      console.warn('[CQI-AI] Error reading batch CQI cache:', e);
    }
  }

  // Separate deficit POs (< threshold) and unmapped POs (0% / unmapped)
  const deficitPOs = batchChartData.filter(d => d.avgAttainment > 0 && d.avgAttainment < threshold);
  const zeroPOs = batchChartData.filter(d => d.avgAttainment === 0);
  const attainedPOs = batchChartData.filter(d => d.avgAttainment >= threshold);

  const coursesSummary = completedCourses.slice(0, 15).map(c =>
    `${c.courseCode} (${c.courseTitle || ''}, Cr:${c.creditHours || 3}, AvgPO:${c.avgPO || 0}%)`
  ).join('; ');

  const promptText = `System Role: You are the Chief Accreditation Consultant and Chair of the Continuous Quality Improvement (CQI) & OBE Committee at Department of Computer Science & Engineering, Bangladesh Army International University of Science and Technology (BAIUST), Cumilla.
TASK: Generate an official BAETE Criterion 3 & Criterion 9 Continuous Quality Improvement (CQI) Action Plan and Departmental Faculty Review Meeting Report for:
- Batch / Cohort: ${batchId} (Section: ${section})
- Washington Accord Accreditation Standard: Benchmark Threshold = ${threshold}% Attainment
- Completed Courses in Analysis: ${completedCourses.length} courses (${coursesSummary})

BATCH PO ATTAINMENT AUDIT:
1. Deficit POs (Attempted but below ${threshold}% threshold):
${deficitPOs.length > 0 ? deficitPOs.map(p => `- ${p.po} (${STANDARD_PO_NAMES[p.po]}): Mean Attainment = ${p.avgAttainment}%, Pass Rate = ${p.passRate}%, Gap = -${(threshold - p.avgAttainment).toFixed(1)}%`).join('\n') : 'None'}

2. Unmapped / Zero Attainment POs (Completely missing or 0% in evaluated courses):
${zeroPOs.length > 0 ? zeroPOs.map(p => `- ${p.po} (${STANDARD_PO_NAMES[p.po]}): 0% Attainment (Curriculum Mapping Deficiency)`).join('\n') : 'None'}

3. Attained POs (≥ ${threshold}%):
${attainedPOs.map(p => `- ${p.po} (${STANDARD_PO_NAMES[p.po]}): ${p.avgAttainment}% (Pass Rate: ${p.passRate}%)`).join('\n')}

Washington Accord Competency Clusters:
${clusterStats.map(c => `- ${c.short} Cluster: ${c.avgAttainment}% (${c.avgAttainment >= threshold ? 'Attained' : 'Deficit'})`).join('\n')}

${customMeetingNotes ? `FACULTY MEETING DISCUSSION MINUTES / NOTES INPUT:\n${customMeetingNotes}\n` : ''}

CRITICAL BAETE GUIDELINES:
- For Deficit POs: Provide concise, high-impact pedagogical remediations (strictly 2 to 3 lines per PO) identifying how course instructors should adapt delivery, lab rubrics, and assessments.
- For Zero/Unmapped POs: Identify them as "Curriculum Gaps". State specifically which core/elective courses (e.g., Software Engineering Lab, Capstone Project I & II, Microprocessors, Numerical Analysis, Engineering Ethics) they MUST be allocated to in upcoming semesters to meet Washington Accord requirements.
- Produce an official, beautifully articulated "BAETE CQI Faculty Review & Action Report" containing:
  1. Executive Summary & Root Cause Analysis (RCA)
  2. Course-Level Action Directives
  3. Curriculum Realignment Roadmap for Unmapped POs
  4. Closing-the-Loop Implementation Timeline & Faculty Responsibilities

OUTPUT FORMAT: Return ONLY a valid JSON object matching this schema without markdown code blocks:
{
  "poRemediations": {
    ${batchChartData.map(p => `"${p.po}": {
      "po": "${p.po}",
      "name": "${STANDARD_PO_NAMES[p.po]}",
      "isZero": ${p.avgAttainment === 0},
      "avgAttainment": ${p.avgAttainment},
      "passRate": ${p.passRate},
      "gap": ${p.avgAttainment < threshold ? (threshold - p.avgAttainment).toFixed(1) : 0},
      "remediation": "Concise 2-3 lines of pedagogical remediation or curriculum allocation roadmap...",
      "allocatedCourses": ["Suggested Course 1", "Suggested Course 2"]
    }`).join(',\n    ')}
  },
  "facultyMeetingReport": {
    "title": "BAETE Continuous Quality Improvement (CQI) Faculty Review & Action Report",
    "meetingMetadata": {
      "committee": "Departmental Academic Committee (DAC) & Course Assessment Committee (CAC)",
      "batch": "${batchId}",
      "section": "${section}",
      "threshold": "${threshold}%",
      "date": "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}",
      "coursesEvaluatedCount": ${completedCourses.length}
    },
    "executiveSummary": "...",
    "rootCauseAnalysis": [
      { "cluster": "Technical Foundations", "finding": "...", "action": "..." },
      { "cluster": "Modern Engineering Practice", "finding": "...", "action": "..." },
      { "cluster": "Professional & Lifelong Skills", "finding": "...", "action": "..." }
    ],
    "curriculumRealignmentPlan": [
      { "po": "PO5", "status": "Curriculum Gap", "recommendation": "..." }
    ],
    "closingTheLoopTimeline": [
      { "phase": "Immediate (Next Semester)", "milestone": "...", "responsible": "Course Instructors & Lab Coordinators" },
      { "phase": "Mid-Term Audit", "milestone": "...", "responsible": "Departmental CQI Committee" },
      { "phase": "Terminal Loop Closure", "milestone": "...", "responsible": "Head of Department & OBE Committee" }
    ],
    "officialMinutesText": "..."
  }
}`;

  try {
    const aiResult = await callGeminiApi(promptText);
    const enriched = {
      ...aiResult,
      aiSource: 'gemini',
      generatedAt: new Date().toISOString(),
      batchId,
      section,
      threshold,
    };
    try {
      localStorage.setItem(cacheKey, JSON.stringify(enriched));
    } catch (e) {
      console.warn('[CQI-AI] Failed saving batch CQI to localStorage:', e);
    }
    return enriched;
  } catch (err) {
    console.warn('[CQI-AI] Gemini batch call failed, generating academic heuristic fallback:', err.message);
    const fallback = generateBatchCQIFallback({
      batchId,
      section,
      threshold,
      batchChartData,
      clusterStats,
      completedCourses,
      deficitPOs,
      zeroPOs,
      attainedPOs,
    });
    try {
      localStorage.setItem(cacheKey, JSON.stringify(fallback));
    } catch (e) {}
    return fallback;
  }
}

/**
 * Heuristic fallback for Program/Batch-Level CQI (high academic standard).
 */
function generateBatchCQIFallback({
  batchId,
  section,
  threshold,
  batchChartData,
  clusterStats,
  completedCourses,
  deficitPOs,
  zeroPOs,
  attainedPOs,
}) {
  const poRemediations = {};

  const ALLOCATIONS = {
    PO1: ['Data Structures & Algorithms', 'Discrete Mathematics', 'Electrical Circuits'],
    PO2: ['Design & Analysis of Algorithms', 'Theory of Computation', 'Database Management Systems'],
    PO3: ['Software Engineering', 'System Analysis & Design', 'Capstone Design Project I & II'],
    PO4: ['Operating Systems Lab', 'Computer Networks Lab', 'Advanced Research Practicum'],
    PO5: ['Software Development Lab (IDEs, Git)', 'VLSI Simulation Lab (ModelSim)', 'Mobile App Studio'],
    PO6: ['Cyber Law & Professional Ethics', 'Artificial Intelligence & Society', 'Engineering Economics'],
    PO7: ['Green Computing', 'Environmental Studies', 'Renewable Energy Systems'],
    PO8: ['Engineering Ethics', 'Research Methodology & Publication Ethics', 'Industrial Attachment'],
    PO9: ['Object-Oriented Programming Project', 'Capstone Project Phase I', 'Competitive Hackathons'],
    PO10: ['Technical Report Writing & Presentation', 'Senior Design Colloquium', 'Oral Defense'],
    PO11: ['Engineering Project Management', 'Software Project Management', 'Entrepreneurship Practicum'],
    PO12: ['Independent Study & Literature Review', 'Emerging Technology Seminars', 'MOOC Certifications'],
  };

  batchChartData.forEach(p => {
    const isZero = p.avgAttainment === 0;
    const isDeficit = p.avgAttainment < threshold;
    const gap = Math.round((threshold - p.avgAttainment) * 10) / 10;
    const name = STANDARD_PO_NAMES[p.po] || p.po;

    let remediationText = '';
    if (isZero) {
      remediationText = `Curriculum Gap: ${p.po} (${name}) has 0% attainment in the selected course basket. Immediately allocate this outcome to core engineering labs (${ALLOCATIONS[p.po]?.slice(0, 2).join(', ')}) with explicit assessment rubrics to fulfill Washington Accord graduation requirements.`;
    } else if (isDeficit) {
      remediationText = `Performance deficit detected with ${p.avgAttainment}% average (-${gap}% gap below ${threshold}% threshold). Course instructors must revise formative assessment rubrics, mandate hands-on case studies, and organize guided problem-solving clinics in mapped courses.`;
    } else {
      remediationText = `Target benchmark achieved (${p.avgAttainment}%). Maintain continuous quality improvement through complex engineering problem (WP1-WP7) integration in advanced electives.`;
    }

    poRemediations[p.po] = {
      po: p.po,
      name,
      isZero,
      avgAttainment: p.avgAttainment,
      passRate: p.passRate,
      gap: isDeficit ? gap : 0,
      remediation: remediationText,
      allocatedCourses: ALLOCATIONS[p.po] || [],
    };
  });

  return sanitizeAcademicGrammar({
    poRemediations,
    facultyMeetingReport: {
      title: 'BAETE Continuous Quality Improvement (CQI) Faculty Review & Action Report',
      meetingMetadata: {
        committee: 'Departmental Academic Committee (DAC) & Course Assessment Committee (CAC)',
        batch: String(batchId),
        section: String(section),
        threshold: `${threshold}%`,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        coursesEvaluatedCount: completedCourses.length,
      },
      executiveSummary: `The Departmental CQI review convened to evaluate cumulative Washington Accord Program Outcome attainments for Batch ${batchId} (Section: ${section}) across ${completedCourses.length} completed courses against a ${threshold}% criterion threshold. Out of 12 outcomes, ${attainedPOs.length} achieved the benchmark while ${deficitPOs.length + zeroPOs.length} outcome(s) require proactive pedagogical and curricular intervention to ensure compliance with BAETE Criterion 3 & 9.`,
      rootCauseAnalysis: [
        {
          cluster: 'Technical Foundations (PO1–PO4)',
          finding: 'Students demonstrate adequate theoretical recall but show shortfall in open-ended investigation and synthesis.',
          action: 'Introduce project-based learning with iterative rubric evaluation in 3rd and 4th year core courses.',
        },
        {
          cluster: 'Modern Engineering Practice (PO5–PO8)',
          finding: zeroPOs.some(z => ['PO5', 'PO6', 'PO7', 'PO8'].includes(z.po))
            ? 'Curriculum gaps identified where modern tool and ethics components were omitted from direct course assessments.'
            : 'Moderate attainment; requires stronger integration of industry simulation tools.',
          action: 'Formally map PO5 and PO8 into laboratory rubrics and capstone evaluation matrices.',
        },
        {
          cluster: 'Professional Skills (PO9–PO12)',
          finding: 'Soft skills and project finance show variance across sections due to subjective evaluation.',
          action: 'Standardize multi-criteria peer evaluation forms and mandate project management Gantt charts.',
        },
      ],
      curriculumRealignmentPlan: zeroPOs.map(z => ({
        po: z.po,
        name: STANDARD_PO_NAMES[z.po],
        status: 'Curriculum Deficiency',
        recommendation: `Allocate to upcoming curriculum modules: ${(ALLOCATIONS[z.po] || []).join(', ')}.`,
      })),
      closingTheLoopTimeline: [
        {
          phase: 'Phase 1: Course File & Rubric Alignment (Weeks 1–4)',
          milestone: 'Instructors update course outlines with explicit CO-PO mapping and tool rubrics.',
          responsible: 'Course Instructors & Module Coordinators',
        },
        {
          phase: 'Phase 2: Mid-Semester Formative Audit (Week 8)',
          milestone: 'Evaluate student quiz/lab performance; organize tutorial support for at-risk cohorts.',
          responsible: 'Course Assessment Committee (CAC)',
        },
        {
          phase: 'Phase 3: Final Loop Closure Audit (Week 16)',
          milestone: 'Re-compute direct PO attainment and verify closure of identified deficit gaps.',
          responsible: 'Head of Department & Central OBE Cell',
        },
      ],
      officialMinutesText: `DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING\nBANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST)\n\nMINUTES OF BAETE CONTINUOUS QUALITY IMPROVEMENT (CQI) REVIEW MEETING\nBatch: ${batchId} | Section: ${section} | Date: ${new Date().toLocaleDateString()}\n\n1. AGENDA: Evaluation of 12 Program Outcomes (PO1–PO12) direct attainment against BAETE ${threshold}% benchmark.\n2. ATTAINMENT REVIEW: Evaluated across ${completedCourses.length} completed courses. Total Attained: ${attainedPOs.length} / 12 POs. Deficit POs: ${[...deficitPOs.map(d => d.po), ...zeroPOs.map(z => `${z.po} (0%)`)].join(', ') || 'None'}.\n3. ROOT CAUSE ANALYSIS: Deficits in technical tools and investigation stem from late curriculum mapping and unaligned terminal examination questions.\n4. ACTION PLAN & DIRECTIVES: Course coordinators are mandated to incorporate explicit rubrics for deficit outcomes. Zero-attainment POs must be mapped to upcoming laboratory and capstone offerings.\n5. CLOSING THE LOOP: The Departmental CQI Committee will conduct a mid-term verification to assess remediation effectiveness.`,
    },
    aiSource: 'heuristic',
    generatedAt: new Date().toISOString(),
    batchId,
    section,
    threshold,
  });
}
