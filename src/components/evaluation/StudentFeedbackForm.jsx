import { useState, useEffect } from 'react'
import { apiService } from '../../services/apiService'
import { CheckCircle, AlertCircle, Loader2, Send } from 'lucide-react'

const RATING_LABELS = ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor']
const RATING_VALUES = {
  'Excellent': 5,
  'Good': 4,
  'Average': 3,
  'Poor': 2,
  'Very Poor': 1
}

const SECTIONS = [
  "SECTION 1 : LEARNING OUTCOMES & STUDENT ACHIEVEMENT",
  "SECTION 2 : COURSE CONTENT & DELIVERY",
  "SECTION 3 : INSTRUCTOR EVALUATION",
  "SECTION 4 : COURSE ASSESSMENT & WORKLOAD",
  "SECTION 5 : OUTCOME ACHIEVEMENTS BY THE COURSE"
]

function getSectionIndex(qText) {
  const text = qText.toLowerCase();
  
  if (text.includes("outcome") || text.includes("learning") || text.includes("knowledge") || text.includes("skill") || text.includes("solve") || text.includes("solving") || text.includes("achievement")) {
    return 0;
  }
  if (text.includes("material") || text.includes("syllabus") || text.includes("lecture") || text.includes("resource") || text.includes("example") || text.includes("laboratory") || text.includes("delivery")) {
    return 1;
  }
  if (text.includes("explain") || text.includes("teacher") || text.includes("instructor") || text.includes("encourage") || text.includes("participation") || text.includes("classroom") || text.includes("teaching") || text.includes("communication") || text.includes("class management") || text.includes("performance")) {
    return 2;
  }
  if (text.includes("assessment") || text.includes("test") || text.includes("assignment") || text.includes("final exam") || text.includes("fair") || text.includes("workload") || text.includes("grading") || text.includes("quiz")) {
    return 3;
  }
  return 4;
}

export default function StudentFeedbackForm({ evaluationId, user, onBackToHome }) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [student, setStudent] = useState(null)
  const [studentId, setStudentId] = useState('')
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Ratings: Index/Order -> value (5, 4, 3, 2, 1)
  const [ratings, setRatings] = useState({})
  // Open ended comments
  const [comments, setComments] = useState({
    learned: '',
    enjoyed: '',
    difficult: '',
    improved: '',
    teacherSuggestions: '',
    deptSuggestions: '',
    additionalComments: ''
  })

  useEffect(() => {
    loadEvaluation()
  }, [evaluationId])

  const loadEvaluation = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiService.getPublicEvaluation(evaluationId)
      setEvaluation(res.evaluation)
      setStudent(res.student)
      if (res.student && res.student.studentId) {
        setStudentId(res.student.studentId)
      }
      if (res.alreadySubmitted) {
        setAlreadySubmitted(true)
      }
      
      // Initialize ratings structure with blank values
      const initialRatings = {}
      res.evaluation.questions.forEach((_, idx) => {
        initialRatings[idx] = null
      })
      setRatings(initialRatings)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load evaluation form.')
    } finally {
      setLoading(false)
    }
  }

  const handleRatingChange = (qIndex, label) => {
    setRatings(prev => ({ ...prev, [qIndex]: RATING_VALUES[label] }))
    setError('')
  }

  const handleCommentChange = (field, value) => {
    setComments(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate Student ID
    if (!studentId.trim()) {
      setError('Please enter your Student ID.')
      return
    }

    // Validate all ratings are completed
    const missingRatings = Object.keys(ratings).some(key => ratings[key] === null)
    if (missingRatings) {
      setError('Please answer all evaluation rating questions.')
      return
    }

    setSubmitting(true)
    try {
      const formattedRatings = {}
      Object.keys(ratings).forEach(key => {
        formattedRatings[key] = ratings[key]
      })

      await apiService.submitFeedback(evaluationId, {
        studentId: studentId.trim(),
        ratings: formattedRatings,
        comments
      })
      
      setSuccess(true)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to submit feedback response.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <Loader2 className="animate-spin text-emerald-600 mb-2" size={40} />
        <p className="text-gray-500 font-semibold">Loading evaluation form...</p>
      </div>
    )
  }

  if (success || alreadySubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-green-200">
          <div className="inline-flex p-3 bg-green-50 rounded-full text-green-600 mb-4 border border-green-100">
            <CheckCircle size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {alreadySubmitted ? 'Already Submitted' : 'Thank You!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {alreadySubmitted 
              ? 'You have already submitted a response for this evaluation.'
              : 'Your feedback has been successfully submitted. Your response will help us improve the course quality.'
            }
          </p>
        </div>
      </div>
    )
  }

  if (error && !evaluation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-200">
          <div className="inline-flex p-3 bg-red-50 rounded-full text-red-600 mb-4 border border-red-100">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">{error}</p>
        </div>
      </div>
    )
  }

  const offering = evaluation.courseOfferingId
  const course = offering?.course
  const teacher = offering?.teacher
  const semester = offering?.semester

  // Group questions by section
  const groupedQuestions = [[], [], [], [], []];
  evaluation.questions.forEach((q, idx) => {
    const secIdx = getSectionIndex(q.text);
    groupedQuestions[secIdx].push({ q, idx });
  });

  // Calculate sequential global number for UI rendering
  const questionGlobalNumber = {};
  let currentNum = 1;
  groupedQuestions.forEach(questionsInSection => {
    questionsInSection.forEach(({ idx }) => {
      questionGlobalNumber[idx] = currentNum++;
    });
  });

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 flex justify-center">
      <div className="max-w-3xl w-full space-y-6">
        {/* University Logo & Header */}
        <div className="bg-white rounded-2xl shadow-md border-t-8 border-emerald-600 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-sm">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="12" fill="none" />
                <path d="M12 20 L20 12 L28 20 L20 28 Z" fill="white" opacity="0.9" />
                <circle cx="20" cy="20" r="4" fill="white" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-800">Course Evaluation & Feedback</h1>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {course?.department || 'OBE Platform'} Department
              </p>
            </div>
          </div>

          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 font-medium">
            <div>
              <p><span className="text-gray-400 font-semibold">Course:</span> {course?.courseCode} — {course?.courseName}</p>
              <p><span className="text-gray-400 font-semibold">Instructor:</span> {teacher?.fullName || 'Not Assigned'}</p>
            </div>
            <div>
              <p><span className="text-gray-400 font-semibold">Academic Session:</span> {semester?.semesterName} ({offering?.academicYear})</p>
              <p><span className="text-gray-400 font-semibold">Section/Batch:</span> Section {offering?.section} • Batch {offering?.batch?.name}</p>
            </div>
          </div>

          {evaluation.description && (
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 text-sm text-gray-700">
              <p className="font-semibold text-emerald-800 mb-1">Instructions:</p>
              <p className="whitespace-pre-line">{evaluation.description}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student ID Manual Entry Card */}
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
              <span>Student ID</span>
              <span className="text-red-500">*</span>
            </h3>
            <input
              type="text"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter your Student ID (e.g., 0822220105101065)"
              className="w-full max-w-md px-4 py-3 rounded-xl border border-gray-250 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-semibold transition-all shadow-sm"
            />
            <p className="text-xs text-gray-400 font-medium">Please enter your registered Student ID to submit this evaluation.</p>
          </div>
          {/* Step 2: Evaluation Questions (Grouped by Sections 1-5) */}
          {groupedQuestions.map((questionsInSection, secIdx) => {
            if (questionsInSection.length === 0) return null;
            return (
              <div key={secIdx} className="space-y-4">
                <div className="bg-emerald-800 text-white font-bold text-sm px-5 py-3 rounded-xl uppercase tracking-wider shadow-sm">
                  {SECTIONS[secIdx]}
                </div>
                <div className="bg-white rounded-2xl shadow-md p-6 space-y-6 divide-y divide-gray-100">
                  {questionsInSection.map(({ q, idx }, localIdx) => (
                    <div key={idx} className={`space-y-3 ${localIdx > 0 ? 'pt-6' : ''}`}>
                      <p className="text-sm font-bold text-gray-800">
                        {questionGlobalNumber[idx]}. {q.text}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 md:grid md:grid-cols-5 md:gap-4">
                        {RATING_LABELS.map(label => {
                          const isSelected = ratings[idx] === RATING_VALUES[label]
                          return (
                            <label
                              key={label}
                              className={`flex-1 min-w-[120px] md:min-w-0 flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-500/10'
                                  : 'border-gray-250 hover:bg-gray-50 text-gray-600'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${idx}`}
                                checked={isSelected}
                                onChange={() => handleRatingChange(idx, label)}
                                className="sr-only"
                              />
                              {label}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Section 6: Open-Ended Student Feedback */}
          <div className="space-y-4">
            <div className="bg-emerald-800 text-white font-bold text-sm px-5 py-3 rounded-xl uppercase tracking-wider shadow-sm">
              SECTION 6 : STUDENT FEEDBACK (OPEN-ENDED QUESTIONS)
            </div>
            <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  1. What did you learn from this course? (Optional)
                </label>
                <textarea
                  rows="3"
                  value={comments.learned}
                  onChange={(e) => handleCommentChange('learned', e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  2. Which topic did you enjoy most? (Optional)
                </label>
                <textarea
                  rows="3"
                  value={comments.enjoyed}
                  onChange={(e) => handleCommentChange('enjoyed', e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  3. Which topic was difficult? (Optional)
                </label>
                <textarea
                  rows="3"
                  value={comments.difficult}
                  onChange={(e) => handleCommentChange('difficult', e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  4. What should be improved? (Optional)
                </label>
                <textarea
                  rows="3"
                  value={comments.improved}
                  onChange={(e) => handleCommentChange('improved', e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  5. Suggestions for the teacher. (Optional)
                </label>
                <textarea
                  rows="3"
                  value={comments.teacherSuggestions}
                  onChange={(e) => handleCommentChange('teacherSuggestions', e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  6. Suggestions for the department. (Optional)
                </label>
                <textarea
                  rows="3"
                  value={comments.deptSuggestions}
                  onChange={(e) => handleCommentChange('deptSuggestions', e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  7. Additional comments. (Optional)
                </label>
                <textarea
                  rows="3"
                  value={comments.additionalComments}
                  onChange={(e) => handleCommentChange('additionalComments', e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Submitting Feedback...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Evaluation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
