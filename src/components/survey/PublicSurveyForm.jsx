import { useState, useEffect, useMemo } from 'react'
import { apiService } from '../../services/apiService'
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

// Ratings mapping labels
const RATING_LABELS = ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor']

export default function PublicSurveyForm({ evaluationId, onBackToHome }) {
  const [survey, setSurvey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0) // 0 = Cover/ID entry, 1..N = Question sections, N+1 = Comments section
  const [studentId, setStudentId] = useState('')
  const [ratings, setRatings] = useState({})
  
  // Unified open ended comments state supporting custom attributes
  const [comments, setComments] = useState({
    learned: '',
    improved: '',
    additionalComments: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadPublicSurvey()
  }, [evaluationId])

  const loadPublicSurvey = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiService.getPublicSurvey(evaluationId)
      if (res.survey) {
        setSurvey(res.survey)
      } else {
        setError('This survey form could not be found.')
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'This survey form is closed or could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  // Pre-process questions by section (Section 1-5 only for rating scale grids)
  const sections = useMemo(() => {
    if (!survey?.questions) return []
    const sectionNames = Array.from(new Set(survey.questions.map(q => q.section)))
    // Filter out Section 6 for rating scale grids (since Section 6 gets rendered as custom text questions)
    const ratingSections = sectionNames.filter(name => name !== 'Section 6')
    return ratingSections.map(name => {
      const qs = survey.questions.filter(q => q.section === name)
      return {
        name,
        questions: qs
      }
    })
  }, [survey])

  // Custom Section 6 questions
  const customSection6Questions = useMemo(() => {
    if (!survey?.questions) return []
    return survey.questions.filter(q => q.section === 'Section 6')
  }, [survey])

  const totalPages = sections.length + 2 // Page 0: Cover/ID, N pages: Grids, Page N+1: Comments (Section 6)

  // Deadline Expiry check
  const isDeadlineExceeded = useMemo(() => {
    if (!survey?.closeDate) return false
    const deadline = new Date(survey.closeDate)
    const today = new Date()
    const dDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())
    const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return tDate > dDate
  }, [survey])

  const validate = () => {
    const errs = {}

    if (page === 0) {
      if (!studentId.trim()) {
        errs.studentId = 'Student ID is required to verify your enrollment.'
      }
    }

    if (page >= 1 && page <= sections.length) {
      const currentSection = sections[page - 1]
      currentSection.questions.forEach(q => {
        if (!ratings[q.text]) {
          errs[q.text] = 'This is a required question.'
        }
      })
    }

    if (page === totalPages - 1) {
      if (!comments.learned?.trim()) {
        errs.learned = 'This is a required comment.'
      }
      if (!comments.improved?.trim()) {
        errs.improved = 'This is a required comment.'
      }
      if (!comments.additionalComments?.trim()) {
        errs.additionalComments = 'This is a required comment.'
      }
      customSection6Questions.forEach(q => {
        if (!comments[q.text]?.trim()) {
          errs[q.text] = 'This comment question is required.'
        }
      })
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = async () => {
    if (page === 0) {
      if (isDeadlineExceeded) {
        setError('This survey form is closed and no longer accepting response entries.')
        return
      }
      if (!studentId.trim()) {
        setErrors({ studentId: 'Student ID is required.' })
        return
      }
      setSubmitting(true)
      setError('')
      try {
        await apiService.verifyStudent(survey._id || evaluationId, studentId)
        setErrors({})
        setPage(1)
        window.scrollTo(0, 0)
      } catch (err) {
        console.error(err)
        setError(err.message || 'Verification failed. Please verify your Student ID and course enrollment.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (validate()) {
      setPage(prev => Math.min(prev + 1, totalPages - 1))
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    setError('')
    setPage(prev => Math.max(prev - 1, 0))
    window.scrollTo(0, 0)
  }

  const handleRatingChange = (qText, val) => {
    setRatings(prev => ({
      ...prev,
      [qText]: val
    }))
    if (errors[qText]) {
      setErrors(prev => {
        const c = { ...prev }
        delete c[qText]
        return c
      })
    }
  }

  const handleCommentChange = (key, text) => {
    setComments(prev => ({
      ...prev,
      [key]: text
    }))
    if (errors[key]) {
      setErrors(prev => {
        const c = { ...prev }
        delete c[key]
        return c
      })
    }
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSubmitting(true)
    setError('')
    try {
      // Structure dynamic ratings Map by question index
      const mappedRatings = {}
      survey.questions.forEach((q, idx) => {
        if (ratings[q.text] !== undefined) {
          mappedRatings[String(idx)] = ratings[q.text]
        }
      })

      const payload = {
        ratings: mappedRatings,
        comments,
        studentId: studentId.trim()
      }

      await apiService.submitSurveyResponse(survey.surveyId || survey._id, payload)
      setSubmitted(true)
      handleClearForm()
      setPage(0)
    } catch (err) {
      console.error(err)
      setError(err.message || 'An error occurred while submitting your feedback survey.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClearForm = () => {
    setRatings({})
    setComments({
      learned: '',
      improved: '',
      additionalComments: ''
    })
    setStudentId('')
    setErrors({})
    setError('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eff2f0] flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <Loader2 className="animate-spin text-[#047857] mx-auto" size={36} />
          <p className="text-sm text-gray-500 font-medium">Loading survey form...</p>
        </div>
      </div>
    )
  }

  if (error && page === 0 && !survey) {
    return (
      <div className="min-h-screen bg-[#eff2f0] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full border border-gray-200 rounded-lg p-6 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Form Error</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={onBackToHome}
            className="w-full py-2 bg-[#047857] hover:bg-[#035f44] text-white rounded text-xs font-bold transition-all shadow-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#eff2f0] flex items-center justify-center p-4 font-sans text-gray-800">
        <div className="bg-white max-w-xl w-full text-center space-y-6 py-12 px-6 rounded-lg shadow-sm border border-gray-200">
          <div className="w-14 h-14 rounded-full bg-[#effaf6] border border-[#047857] flex items-center justify-center mx-auto text-[#047857]">
            <CheckCircle size={30} />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Your response has been recorded.</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              Thank you for completing the Student Course Survey. Your feedback is confidential and will be used for continuous improvement.
            </p>
          </div>
          <div className="pt-4">
            <button
              onClick={() => { setSubmitted(false); handleClearForm() }}
              className="text-sm text-[#047857] hover:underline font-bold underline cursor-pointer focus:outline-none"
            >
              Submit another response
            </button>
          </div>
        </div>
      </div>
    )
  }

  const offering = survey.courseOfferingId
  const course = offering?.course
  const teacher = offering?.teacher

  return (
    <div className="min-h-screen bg-[#eff2f0] py-6 px-4 text-gray-800 flex flex-col items-center animate-in fade-in duration-150" style={{ fontFamily: "'Roboto', 'Segoe UI', Arial, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
      `}</style>
      <div className="w-full max-w-2xl space-y-4">

        {/* 1. Header image banner */}
        <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <img 
            src="/survey_banner.png" 
            alt="Survey Header Banner" 
            className="w-full h-32 md:h-40 object-cover object-center"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* 2. Form Summary Card (on all pages) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm border-t-[10px] border-t-[#047857] space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              STUDENT COURSE SURVEY FORM
            </h1>
            <p className="text-xs text-gray-400 italic">
              (Based on Washington Accord Guidelines)
            </p>
          </div>

          {/* Bold teacher/course info matching SS3 */}
          <div className="space-y-1.5 pt-3.5 text-xs text-gray-950 border-t border-gray-150 leading-relaxed font-bold">
            <p>Instructor Name: <span className="text-gray-900 font-extrabold">{teacher?.fullName || 'N/A'}</span></p>
            <p>Course Title: <span className="text-gray-900 font-extrabold">{course?.courseName || 'N/A'}</span></p>
            <p>Course Code: <span className="text-gray-900 font-extrabold">{course?.courseCode}, Section-{offering?.section}</span></p>
            <p>Batch: <span className="text-gray-900 font-extrabold">{offering?.batch?.name ? offering.batch.name.replace(/^batch\s*/i, '') : 'N/A'}</span></p>
          </div>
        </div>

        {/* Required Asterisk Marker */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm text-sm">
          <span className="text-[#c94a29]">* Indicates required question</span>
        </div>

        {/* Error Alert panel */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-700 shadow-sm flex items-center gap-2 font-medium">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Page 0: Student ID Verification Card with Expiry Block */}
        {page === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm border-l-[6px] border-l-[#047857] space-y-4">
            {isDeadlineExceeded ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-700 font-medium flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-red-600 shrink-0" />
                <div>
                  <p className="font-bold">Submission Deadline Passed</p>
                  <p className="text-[11px] text-red-600/90 mt-0.5">
                    The close date ({survey?.closeDate ? (new Date(survey.closeDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + ', ' + new Date(survey.closeDate).getFullYear()) : 'Expired'}) has exceeded. This form no longer accepts responses.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="text-base font-medium text-gray-900">
                  Student Information <span className="text-[#c94a29]">*</span>
                </h3>
                <p className="text-xs text-gray-400">Please provide your full Student ID</p>
              </div>
            )}
            
            <div className="space-y-2 pt-2">
              <input
                type="text"
                value={studentId}
                disabled={submitting || isDeadlineExceeded}
                onChange={e => {
                  setStudentId(e.target.value)
                  if (errors.studentId) setErrors(prev => { const c = {...prev}; delete c.studentId; return c })
                }}
                placeholder={isDeadlineExceeded ? "Form is closed." : "Your student ID"}
                className={`w-full border-b ${errors.studentId ? 'border-red-500' : 'border-gray-300 focus:border-[#047857]'} bg-transparent py-1.5 text-gray-950 focus:outline-none transition-all text-sm ${isDeadlineExceeded ? 'cursor-not-allowed opacity-50' : 'font-medium'}`}
              />
              {errors.studentId && <p className="text-red-500 text-[11px] mt-1.5">{errors.studentId}</p>}
            </div>
          </div>
        )}

        {/* Pages 1..N: Ratings Sections */}
        {page >= 1 && page <= sections.length && (() => {
          const currentSection = sections[page - 1]
          const isSection5 = currentSection.name.toLowerCase().includes('section 5') || currentSection.name.toLowerCase().includes('outcome achievements')
          
          const ratingHeaders = isSection5 
            ? ['10- Excellent', '08- Very Good', '06- Good', '04- Average', '02- Below Average']
            : ['1', '2', '3', '4', '5']
            
          const ratingValues = isSection5 
            ? [5, 4, 3, 2, 1]
            : [1, 2, 3, 4, 5]

          return (
            <div className="space-y-4">
              {/* Category green header bar */}
              <div className="bg-[#047857] text-white py-2 px-4 rounded-lg font-medium text-xs shadow-sm tracking-wide uppercase">
                {currentSection.name.toUpperCase()} <span className="text-red-350">*</span>
              </div>

              {/* Instructions Banner */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm text-xs text-gray-500 italic leading-relaxed">
                {isSection5 
                  ? "(Please rate the course outcomes achievement levels on a scale from 02 to 10.)"
                  : "(Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.)"}
              </div>
              
              {/* Question list card block */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
                <div className="space-y-6">
                  {/* Headers */}
                  <div className="hidden sm:grid grid-cols-12 items-center border-b border-gray-200 pb-3 text-[10px] text-gray-500 uppercase tracking-widest gap-2">
                    <div className={isSection5 ? "col-span-5" : "col-span-7"}>Criteria</div>
                    <div className={`${isSection5 ? "col-span-7" : "col-span-5"} grid grid-cols-5 text-center`}>
                      {ratingHeaders.map((header, idx) => (
                        <div key={idx} className="px-0.5 leading-tight break-words text-[9px] font-semibold text-emerald-800">
                          {header}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-gray-100">
                    {currentSection.questions.map((q, qIdx) => {
                      const globalIdx = survey.questions.findIndex(item => item.text === q.text)
                      const ratingError = !!errors[q.text]
                      return (
                        <div
                          key={qIdx}
                          className={`grid grid-cols-1 sm:grid-cols-12 items-center py-4 gap-4 ${
                            ratingError ? 'bg-red-50/20 border-l-4 border-l-red-500 pl-2' : ''
                          }`}
                        >
                          <div className={isSection5 ? "col-span-12 sm:col-span-5" : "col-span-12 sm:col-span-7"}>
                            <p className="text-sm text-gray-800 leading-relaxed font-normal">
                              <span className="font-semibold text-emerald-700">Q{globalIdx + 1}.</span> {q.text}
                            </p>
                            {ratingError && <p className="text-red-650 text-[10px] mt-1 font-semibold">This is a required question</p>}
                          </div>

                          <div className={`${isSection5 ? "col-span-12 sm:col-span-7" : "col-span-12 sm:col-span-5"} grid grid-cols-5 text-center items-center`}>
                            {ratingValues.map((val, i) => (
                              <label key={i} className="flex flex-col sm:flex-row items-center justify-center cursor-pointer py-1 group">
                                <input
                                  type="radio"
                                  name={q.text}
                                  value={val}
                                  checked={ratings[q.text] === val}
                                  onChange={() => handleRatingChange(q.text, val)}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  ratings[q.text] === val
                                    ? 'border-[#047857] bg-emerald-50/50'
                                    : 'border-gray-300 bg-white group-hover:border-[#047857]'
                                }`}>
                                  {ratings[q.text] === val && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#047857]" />
                                  )}
                                </div>
                                <span className="sm:hidden text-[9px] text-gray-400 mt-1 leading-tight break-words max-w-[50px]">
                                  {ratingHeaders[i]}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Page N+1: Comments/Suggestions section (supporting both default 3 and custom ones) */}
        {page === totalPages - 1 && (
          <div className="space-y-4">
            
            {/* Header bar */}
            <div className="bg-[#047857] text-white py-2 px-4 rounded-lg font-medium text-xs shadow-sm uppercase tracking-wide">
              SECTION 6: STUDENT FEEDBACK (Open-Ended Questions)
            </div>

            {/* Default Comment Card 1 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-gray-900 block leading-relaxed">
                1. What aspects of this course were most valuable to your learning experience? <span className="text-[#c94a29]">*</span>
              </label>
              <textarea
                value={comments.learned}
                onChange={e => handleCommentChange('learned', e.target.value)}
                placeholder="Write your suggestions here..."
                rows={1}
                className="w-full border-b border-gray-300 focus:border-[#047857] bg-transparent py-2 text-sm focus:outline-none resize-none pt-4 text-gray-900 outline-none"
                style={{ minHeight: '40px' }}
              />
              {errors.learned && <p className="text-red-500 text-[11px] mt-1">{errors.learned}</p>}
            </div>

            {/* Default Comment Card 2 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-gray-900 block leading-relaxed">
                2. What improvements would you suggest for this course? <span className="text-[#c94a29]">*</span>
              </label>
              <textarea
                value={comments.improved}
                onChange={e => handleCommentChange('improved', e.target.value)}
                placeholder="Write your suggestions here..."
                rows={1}
                className="w-full border-b border-gray-300 focus:border-[#047857] bg-transparent py-2 text-sm focus:outline-none resize-none pt-4 text-gray-900 outline-none"
                style={{ minHeight: '40px' }}
              />
              {errors.improved && <p className="text-red-500 text-[11px] mt-1">{errors.improved}</p>}
            </div>

            {/* Default Comment Card 3 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-gray-900 block leading-relaxed">
                3. Additional comments or suggestions. <span className="text-[#c94a29]">*</span>
              </label>
              <textarea
                value={comments.additionalComments}
                onChange={e => handleCommentChange('additionalComments', e.target.value)}
                placeholder="Write your suggestions here..."
                rows={1}
                className="w-full border-b border-gray-300 focus:border-[#047857] bg-transparent py-2 text-sm focus:outline-none resize-none pt-4 text-gray-900 outline-none"
                style={{ minHeight: '40px' }}
              />
              {errors.additionalComments && <p className="text-red-500 text-[11px] mt-1">{errors.additionalComments}</p>}
            </div>

            {/* Custom Teacher-Added Comments Prompt Cards */}
            {customSection6Questions.map((q, filteredIdx) => (
              <div key={q.text} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-3">
                <label className="text-sm font-semibold text-gray-900 block leading-relaxed">
                  {filteredIdx + 4}. {q.text} <span className="text-[#c94a29]">*</span>
                </label>
                <textarea
                  value={comments[q.text] || ''}
                  onChange={e => handleCommentChange(q.text, e.target.value)}
                  placeholder="Write your response here..."
                  rows={2}
                  className="w-full border-b border-gray-300 focus:border-[#047857] bg-transparent py-2 text-sm focus:outline-none resize-none pt-2 text-gray-900 outline-none"
                  style={{ minHeight: '50px' }}
                />
                {errors[q.text] && <p className="text-red-500 text-[11px] mt-1">{errors[q.text]}</p>}
              </div>
            ))}

            {/* Instructions block */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-2">
              <div className="text-xs text-gray-500 leading-relaxed">
                <p className="text-sm font-medium text-gray-800 mb-2">Instructions Checklists:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-gray-500">
                  <li>Please fill in the survey elements honestly to help future students.</li>
                  <li>Your answers remain fully anonymous and separated from grade assessments.</li>
                  {survey?.closeDate && (
                    <li className="font-semibold text-red-600">
                      Close Date: {(() => {
                        try {
                          return new Date(survey.closeDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + ', ' + new Date(survey.closeDate).getFullYear();
                        } catch {
                          return survey.closeDate;
                        }
                      })()}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions panel */}
        <div className="flex items-center justify-between pt-4 mt-6">
          <div className="flex gap-4">
            {page > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="px-6 py-2 border border-gray-350 text-gray-700 bg-white rounded text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm focus:outline-none cursor-pointer"
              >
                Back
              </button>
            )}
            
            {page < totalPages - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting || (page === 0 && isDeadlineExceeded)}
                className={`px-6 py-2 bg-[#047857] hover:bg-[#035f44] text-white rounded text-sm font-semibold transition-colors shadow-sm focus:outline-none inline-flex items-center gap-2 cursor-pointer ${
                  page === 0 && isDeadlineExceeded ? 'opacity-55 cursor-not-allowed' : ''
                }`}
              >
                {submitting && <Loader2 className="animate-spin" size={14} />}
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-6 py-2 bg-[#047857] hover:bg-[#035f44] border border-transparent text-white rounded text-sm font-semibold transition-all shadow-md disabled:bg-gray-400 focus:outline-none inline-flex items-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 className="animate-spin" size={14} />}
                Submit
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleClearForm}
            className="text-sm text-[#047857] hover:underline font-semibold focus:outline-none cursor-pointer"
          >
            Clear form
          </button>
        </div>

        {/* Slide navigation counter */}
        {page > 0 && (
          <div className="text-center text-xs text-gray-400 font-semibold mt-4">
            Page {page + 1} of {totalPages}
          </div>
        )}

      </div>
    </div>
  )
}
