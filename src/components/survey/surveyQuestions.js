// Master Survey Question Bank — Washington Accord Compliant
// 26 questions across 6 sections

export const SURVEY_SECTIONS = [
  {
    id: 'section1',
    title: 'SECTION 1: LEARNING OUTCOMES & STUDENT ACHIEVEMENT',
    subtitle: '(Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.)',
    scaleType: 'likert5',
    scaleLabels: ['1', '2', '3', '4', '5'],
    scaleDescriptions: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    questions: [
      { id: 'q1', text: 'The course clearly stated learning outcomes.' },
      { id: 'q2', text: 'The course helped develop my problem-solving skills.' },
      { id: 'q3', text: 'I was able to apply engineering principles effectively.' },
      { id: 'q4', text: 'The course improved my teamwork and collaboration skills.' },
      { id: 'q5', text: 'The course emphasized ethical and professional responsibility.' },
    ]
  },
  {
    id: 'section2',
    title: 'SECTION 2: COURSE CONTENT & DELIVERY',
    subtitle: '(Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.)',
    scaleType: 'likert5',
    scaleLabels: ['1', '2', '3', '4', '5'],
    scaleDescriptions: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    questions: [
      { id: 'q6', text: 'The course content was relevant and well-structured.' },
      { id: 'q7', text: 'The balance between theory and practical applications was appropriate.' },
      { id: 'q8', text: 'The assignments and projects were useful for understanding the material.' },
      { id: 'q9', text: 'The course used modern engineering problems effectively.' },
      { id: 'q10', text: 'The laboratory/tutorial sessions were helpful in reinforcing concepts.' },
    ]
  },
  {
    id: 'section3',
    title: 'SECTION 3: INSTRUCTOR EVALUATION',
    subtitle: '(Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.)',
    scaleType: 'likert5',
    scaleLabels: ['1', '2', '3', '4', '5'],
    scaleDescriptions: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    questions: [
      { id: 'q11', text: 'The instructor communicated concepts clearly.' },
      { id: 'q12', text: 'The instructor was responsive to questions and concerns.' },
      { id: 'q13', text: 'The instructor encouraged critical thinking and innovation.' },
      { id: 'q14', text: 'The instructor provided useful feedback on assignments.' },
      { id: 'q15', text: 'The instructor maintained a positive and engaging classroom environment.' },
    ]
  },
  {
    id: 'section4',
    title: 'SECTION 4: COURSE ASSESSMENT & WORKLOAD',
    subtitle: '(Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.)',
    scaleType: 'likert5',
    scaleLabels: ['1', '2', '3', '4', '5'],
    scaleDescriptions: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    questions: [
      { id: 'q16', text: 'The grading and evaluation methods were fair and transparent.' },
      { id: 'q17', text: 'The course workload was appropriate for the credit hours.' },
      { id: 'q18', text: 'The exams and assessments reflected the course content.' },
      { id: 'q19', text: 'The course helped in developing my communication skills.' },
      { id: 'q20', text: 'The course supported lifelong learning and professional development.' },
    ]
  },
  {
    id: 'section5',
    title: 'SECTION 5: OUTCOME ACHIEVEMENTS BY THE COURSE',
    subtitle: '',
    scaleType: 'outcome5',
    scaleLabels: ['10- Excellent', '08- Very Good', '06- Good', '04- Average', '02- Below Average'],
    scaleValues: [10, 8, 6, 4, 2],
    questions: [
      { id: 'q21', text: 'Hand on application scope on basic science and math', coMapping: 'CO1' },
      { id: 'q22', text: 'Research and analytic capacity to design a long term solution to a practical problem', coMapping: 'CO2' },
      { id: 'q23', text: 'Possibilities to use modern hardware and software to solve complex engineering challenges', coMapping: 'CO3' },
      { id: 'q24', text: 'Scope of practicing social relevance and ethics with professionalism', coMapping: 'CO4' },
      { id: 'q25', text: 'Chances of teamwork with effective communication skills, financial and project management skill', coMapping: 'CO5' },
      { id: 'q26', text: 'Scope of achieving lifelong learning through the course', coMapping: 'CO6' },
    ]
  },
  {
    id: 'section6',
    title: 'SECTION 6: STUDENT FEEDBACK (Open-Ended Questions)',
    subtitle: '',
    scaleType: 'openEnded',
    questions: [
      { id: 'feedback1', text: 'What aspects of this course were most valuable to your learning experience?' },
      { id: 'feedback2', text: 'What improvements would you suggest for this course?' },
      { id: 'feedback3', text: 'Additional comments or suggestions.' },
    ]
  }
]

// Helper: get rating questions from arbitrary sections config
export const getRatingQuestionsFromConfig = (sections) => {
  return (sections || SURVEY_SECTIONS)
    .filter(s => s.scaleType !== 'openEnded')
    .flatMap(s => s.questions)
}

// Helper: get Likert questions from arbitrary sections config
export const getLikertQuestionsFromConfig = (sections) => {
  return (sections || SURVEY_SECTIONS)
    .filter(s => s.scaleType === 'likert5')
    .flatMap(s => s.questions)
}

// Helper: get Outcome questions from arbitrary sections config
export const getOutcomeQuestionsFromConfig = (sections) => {
  return (sections || SURVEY_SECTIONS)
    .filter(s => s.scaleType === 'outcome5')
    .flatMap(s => s.questions)
}

// Helper: get all rating questions (Q1-Q26)
export const getRatingQuestions = () => {
  return SURVEY_SECTIONS
    .filter(s => s.scaleType !== 'openEnded')
    .flatMap(s => s.questions)
}

// Helper: get Likert questions only (Q1-Q20)
export const getLikertQuestions = () => {
  return SURVEY_SECTIONS
    .filter(s => s.scaleType === 'likert5')
    .flatMap(s => s.questions)
}

// Helper: get Outcome questions only (Q21-Q26)
export const getOutcomeQuestions = () => {
  return SURVEY_SECTIONS
    .filter(s => s.scaleType === 'outcome5')
    .flatMap(s => s.questions)
}

// localStorage helpers
// Returns { sections, deadline: string | null }
export const getSurveyConfig = (offeringId) => {
  try {
    const raw = localStorage.getItem(`survey_config_${offeringId}`)
    if (!raw) return { sections: SURVEY_SECTIONS, deadline: null }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return { sections: parsed, deadline: null }
    }
    return {
      sections: parsed.sections || SURVEY_SECTIONS,
      deadline: parsed.deadline || null
    }
  } catch {
    return { sections: SURVEY_SECTIONS, deadline: null }
  }
}

export const saveSurveyConfig = (offeringId, config) => {
  // config should be { sections, deadline }
  localStorage.setItem(`survey_config_${offeringId}`, JSON.stringify(config))
}

export const getSurveyResponses = (offeringId) => {
  try {
    const raw = localStorage.getItem(`survey_responses_${offeringId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export const addSurveyResponse = (offeringId, response) => {
  const existing = getSurveyResponses(offeringId)
  existing.push({
    ...response,
    courseId: offeringId,
    timestamp: new Date().toISOString()
  })
  localStorage.setItem(`survey_responses_${offeringId}`, JSON.stringify(existing))
}
