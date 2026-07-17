import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, Save, Edit, RotateCcw, Plus, Trash2, Calendar, Lock, Unlock, Eye, Sparkles, Loader2, AlertTriangle } from 'lucide-react'
import { apiService } from '../../services/apiService'

export default function SurveyManagement({ offering, onViewAnalytics }) {
  const offeringId = offering._id
  const [survey, setSurvey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [openDate, setOpenDate] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [questions, setQuestions] = useState([])
  const [editing, setEditing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [responsesCount, setResponsesCount] = useState(0)
  const [hasCustomQuestions, setHasCustomQuestions] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    loadSurvey()
  }, [offeringId])

  const DEFAULT_COUNT = 26

  const loadSurvey = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiService.getSurveys(offeringId)
      if (res.survey) {
        setSurvey(res.survey)
        setTitle(res.survey.title)
        setDescription(res.survey.description || '')
        setOpenDate(res.survey.openDate ? new Date(res.survey.openDate).toISOString().split('T')[0] : '')
        setCloseDate(res.survey.closeDate ? new Date(res.survey.closeDate).toISOString().split('T')[0] : '')
        setQuestions(res.survey.questions || [])
        setHasCustomQuestions((res.survey.questions || []).length > DEFAULT_COUNT)

        try {
          const analytics = await apiService.getSurveyAnalytics(res.survey._id)
          setResponsesCount(analytics.responses?.length || 0)
        } catch (err) {
          console.error("Failed to load survey responses count:", err)
        }
      } else {
        setSurvey(null)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load course survey configuration.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    setLoading(true)
    setError('')
    try {
      const now = new Date()
      // Default to last day of current month for closeDate
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const formattedCloseDate = currentMonthEnd.toISOString().split('T')[0]

      const payload = {
        courseOfferingId: offeringId,
        title: `Course Survey - ${offering.course?.courseCode || ''} ${offering.course?.courseName || ''}`,
        openDate: now.toISOString().split('T')[0],
        closeDate: formattedCloseDate,
        description: 'Dear Student, please take a few moments to fill out this survey. Your feedback is highly valuable for improving the quality of our academic courses.'
      }

      await apiService.createSurvey(payload)
      await loadSurvey()
    } catch (err) {
      console.error(err)
      setError('Failed to create survey template.')
      setLoading(false)
    }
  }

  const getDynamicPublicLink = () => {
    const id = survey?.surveyId || survey?._id
    if (!id) return ''
    const base = window.location.origin + window.location.pathname
    const cleanBase = base.endsWith('/') ? base : base + '/'
    return `${cleanBase}?feedbackId=${id}`
  }

  const handleCopyLink = async () => {
    const link = getDynamicPublicLink()
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDateChange = (val) => {
    if (!val) {
      setCloseDate('')
      return
    }
    const d = new Date(val)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const year = lastDay.getFullYear()
    const month = String(lastDay.getMonth() + 1).padStart(2, '0')
    const day = String(lastDay.getDate()).padStart(2, '0')
    setCloseDate(`${year}-${month}-${day}`)
  }

  const handleSave = async () => {
    setError('')
    try {
      const payload = {
        title,
        description,
        openDate,
        closeDate,
        questions
      }
      await apiService.updateSurvey(survey._id, payload)
      setEditing(false)
      loadSurvey()
    } catch (err) {
      console.error(err)
      setError('Failed to save survey changes.')
    }
  }

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this survey? Once published, questions cannot be changed.')) {
      return
    }
    setPublishing(true)
    setError('')
    try {
      await apiService.publishSurvey(survey._id)
      loadSurvey()
    } catch (err) {
      console.error(err)
      setError('Failed to publish course survey.')
    } finally {
      setPublishing(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError('')
    try {
      await apiService.deleteSurvey(survey._id)
      setSurvey(null)
      setShowDeleteConfirm(false)
    } catch (err) {
      console.error(err)
      setError('Failed to delete course survey.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset to default 26 questions? All custom questions added by you will be permanently removed.')) {
      return
    }
    setError('')
    try {
      const res = await apiService.resetSurveyDefaults(survey._id)
      if (res.survey) {
        setSurvey(res.survey)
        setQuestions(res.survey.questions || [])
        setHasCustomQuestions(false)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to reset survey to defaults.')
    }
  }

  const handleQuestionEdit = (qIdx, newText) => {
    setQuestions(prev => {
      const list = [...prev]
      list[qIdx] = { ...list[qIdx], text: newText }
      return list
    })
  }

  const handleCoMappingEdit = (qIdx, newCo) => {
    setQuestions(prev => {
      const list = [...prev]
      list[qIdx] = { ...list[qIdx], coMapping: newCo }
      return list
    })
  }

  const handleAddQuestion = (sectionName) => {
    setQuestions(prev => {
      const maxOrder = prev.reduce((max, q) => Math.max(max, q.order || 0), 0)
      const newQuestion = {
        text: '',
        section: sectionName,
        coMapping: sectionName === 'Section 5' ? 'CO1' : '',
        order: maxOrder + 1
      }
      return [...prev, newQuestion]
    })
  }

  const handleRemoveQuestion = (qIdx) => {
    setQuestions(prev => {
      const list = [...prev]
      list.splice(qIdx, 1)
      return list
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <Loader2 className="animate-spin text-emerald-600 mb-2 inline-block" size={40} />
        <p className="text-gray-500 text-sm">Loading survey configuration...</p>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center max-w-xl mx-auto space-y-6">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
          <Calendar size={32} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">No Course Survey Configured</h3>
          <p className="text-sm text-gray-500 mt-2">
            Set up a Course Survey for {offering.course?.courseCode} section {offering.section} to collect Washington Accord outcomes feedback from students.
          </p>
        </div>
        {error && <p className="text-xs text-red-650">{error}</p>}
        <button
          onClick={handleCreateTemplate}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-md transition-all text-sm inline-flex items-center gap-1.5"
        >
          <Sparkles size={16} />
          Create Survey Template
        </button>
      </div>
    )
  }

  const SECTIONS = [
    { title: 'SECTION 1: LEARNING OUTCOMES & STUDENT ACHIEVEMENT', key: 'Section 1', subtitle: '(Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.)' },
    { title: 'SECTION 2: CONTENT & DELIVERY', key: 'Section 2', subtitle: '(Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.)' },
    { title: 'SECTION 3: INSTRUCTOR PERFORMANCE', key: 'Section 3', subtitle: '(Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.)' },
    { title: 'SECTION 4: WORKLOAD & ASSESSMENTS', key: 'Section 4', subtitle: '(Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.)' },
    { title: 'SECTION 5: OUTCOME ACHIEVEMENTS BY THE COURSE', key: 'Section 5', subtitle: '(Please rate the course outcomes achievement levels on a scale from 02 to 10.)' },
  ]

  const surveyClosed = new Date(survey.closeDate) < new Date()

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Main Info Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-150 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800">{survey.title}</h2>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${
              survey.status === 'Published'
                ? surveyClosed
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              {survey.status === 'Published' ? (surveyClosed ? 'Closed' : 'Active') : 'Draft'}
            </span>
          </div>
          <p className="text-xs text-gray-400">{survey.surveyId || 'DRAFT SURVEY ID'}</p>
          <p className="text-sm text-gray-600 max-w-2xl">{survey.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {survey.status === 'Published' && (
            <button
              onClick={() => onViewAnalytics(survey._id)}
              className="px-4 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl font-medium transition-all text-xs inline-flex items-center gap-1.5"
            >
              <Eye size={14} />
              View Analytics
            </button>
          )}

          {survey.status === 'Draft' && (
            <button
              disabled={publishing}
              onClick={handlePublish}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-md transition-all text-xs inline-flex items-center gap-1.5"
            >
              <Lock size={14} />
              Publish Survey
            </button>
          )}

          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-200 animate-in fade-in duration-150">
              <span className="text-[11px] font-semibold text-red-700">Delete all responses & survey?</span>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium border border-red-200 transition-all text-xs inline-flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Delete Survey
            </button>
          )}
        </div>
      </div>

      {/* Public Link Sharing Panel */}
      {survey.status === 'Published' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              Public Link Sharing Panel
            </h3>
            <span className="text-[11px] px-3 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              {responsesCount} Response{responsesCount !== 1 ? 's' : ''} Received
            </span>
          </div>

          <p className="text-xs text-gray-500">
            Share this link with students so they can fill out the survey anonymously. No login is required.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-xs text-gray-700 truncate select-all">
              {getDynamicPublicLink() || 'No link generated.'}
            </div>
            
            <button
              onClick={handleCopyLink}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-sm shadow-sm transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {survey.qrCode && (() => {
            const dynamicLink = getDynamicPublicLink()
            const dynamicQr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dynamicLink)}`
            return (
              <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                <img 
                  src={dynamicQr} 
                  alt="Survey QR Code" 
                  className="w-20 h-20 border p-1 bg-white rounded-lg"
                />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-800">QR Code Access</p>
                  <p className="text-[11px] text-gray-400 max-w-md">Students can scan this QR code with their mobile devices or tablets to open and complete the questionnaire class-wide.</p>
                  <a 
                    href={dynamicQr} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs text-emerald-700 hover:underline font-medium inline-block"
                  >
                    Open QR Image Link
                  </a>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Submission Deadline Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-gray-800">
            Submission Deadline
          </h3>
          <p className="text-xs text-gray-500">
            Set a date. The survey form will automatically block submissions after this date. (Snaps to month end)
          </p>
        </div>
        
        <div>
          {editing ? (
            <input
              type="date"
              value={closeDate}
              onChange={e => handleDateChange(e.target.value)}
              className="px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
            />
          ) : (
            <span className="text-xs px-3.5 py-1.5 rounded-lg font-medium bg-neutral-100 text-gray-700 border border-gray-200">
              {closeDate ? new Date(closeDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline set'}
            </span>
          )}
        </div>
      </div>

      {/* Survey Question Bank */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-base font-semibold text-gray-800">
            Survey Question Bank ({questions.length} Questions)
          </h3>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                {hasCustomQuestions && (
                  <button
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-300 transition-all"
                  >
                    <RotateCcw size={13} />
                    Reset to Defaults
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
                >
                  <Save size={14} />
                  Save Changes
                </button>
              </>
            ) : (
              <>
                {hasCustomQuestions && (
                  <button
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-300 transition-all"
                  >
                    <RotateCcw size={13} />
                    Reset to Defaults
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-600 transition-all"
                >
                  <Edit size={14} className="text-emerald-700" />
                  Edit Settings & Questions
                </button>
              </>
            )}
          </div>
        </div>

        {/* Remarks description block */}
        {!editing && (
          <div className="space-y-1.5">
            <label className="text-[11px] text-gray-400 uppercase tracking-wider block font-semibold">Remarks Guideline / Description</label>
            <div className="text-sm text-gray-650 bg-gray-50 border border-gray-150 p-3 rounded-xl font-normal leading-relaxed">
              {description || 'No instruction guideline provided.'}
            </div>
          </div>
        )}

        {/* Dynamic Sections rendering */}
        {SECTIONS.map((sec) => {
          const isSection5 = sec.key === 'Section 5'
          const ratingHeaders = isSection5 
            ? ['10- Excellent', '08- Very Good', '06- Good', '04- Average', '02- Below Average']
            : ['1', '2', '3', '4', '5']

          // Compute question list with original indices for editing
          const allWithIndex = questions.map((q, idx) => ({ ...q, originalIndex: idx }))
          const currentQuestions = allWithIndex.filter(q => q.section === sec.key)

          return (
            <div key={sec.key} className="space-y-3 pt-1">
              {/* Green section title bar */}
              <div className="bg-[#047857] text-white px-4 py-2.5 rounded-lg text-xs flex justify-between items-center shadow-sm uppercase tracking-wide">
                <span className="font-semibold">{sec.title}</span>
                {editing && survey.status === 'Draft' && (
                  <button
                    onClick={() => handleAddQuestion(sec.key)}
                    className="flex items-center gap-1 text-[10px] px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-md font-semibold transition-all text-white border border-white/20"
                  >
                    <Plus size={12} />
                    Add Question
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 italic px-1">{sec.subtitle}</p>
 
              {/* Questionnaire Preview or Editors */}
              {editing ? (
                <div className="space-y-2">
                  {/* Column headers for edit mode */}
                  <div className="hidden md:grid grid-cols-12 items-center text-[10px] text-gray-400 uppercase tracking-wider pb-1 px-1">
                    <div className={isSection5 ? "col-span-6" : "col-span-7"}>Criteria</div>
                    <div className={`${isSection5 ? "col-span-6" : "col-span-5"} grid grid-cols-5 text-center`}>
                      {ratingHeaders.map((hdr, idx) => (
                        <div key={idx} className="text-[#047857] font-bold">{hdr}</div>
                      ))}
                    </div>
                  </div>

                  {currentQuestions.map((q, filteredIdx) => (
                    <div key={q.originalIndex} className="grid grid-cols-1 md:grid-cols-12 items-center py-2.5 gap-3 border-b border-gray-100">
                      <div className={isSection5 ? "col-span-12 md:col-span-6" : "col-span-12 md:col-span-7"}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">
                            Q{filteredIdx + 1}.
                          </span>
                          
                          {/* Rich High-Contrast Row Input Container */}
                          <div className="flex-1 flex items-center gap-2">
                            {survey.status === 'Draft' ? (
                              <input
                                type="text"
                                value={q.text}
                                onChange={e => handleQuestionEdit(q.originalIndex, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-normal bg-white"
                                placeholder={`Enter question criteria...`}
                              />
                            ) : (
                              <span className="text-sm text-gray-800 font-normal">{q.text}</span>
                            )}

                            {isSection5 && (
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded uppercase">CO:</span>
                                {survey.status === 'Draft' ? (
                                  <select
                                    value={q.coMapping}
                                    onChange={e => handleCoMappingEdit(q.originalIndex, e.target.value)}
                                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 outline-none focus:border-emerald-600 bg-white cursor-pointer"
                                  >
                                    <option value="CO1">CO1</option>
                                    <option value="CO2">CO2</option>
                                    <option value="CO3">CO3</option>
                                    <option value="CO4">CO4</option>
                                    <option value="CO5">CO5</option>
                                    <option value="CO6">CO6</option>
                                  </select>
                                ) : (
                                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded">
                                    {q.coMapping || 'CO1'}
                                  </span>
                                )}
                              </div>
                            )}

                            {survey.status === 'Draft' && (
                              <button
                                onClick={() => handleRemoveQuestion(q.originalIndex)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-all shadow-sm shrink-0"
                                title="Remove Question"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={`${isSection5 ? "col-span-12 md:col-span-6" : "col-span-12 md:col-span-5"} grid grid-cols-5 text-center`}>
                        {[1,2,3,4,5].map((_, i) => (
                          <div key={i} className="flex justify-center items-center">
                            <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-200 bg-transparent" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Read-Only Preview Grid with Disabled Radios */
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden p-4">
                  {/* Table headers */}
                  <div className="hidden md:grid grid-cols-12 items-center border-b border-gray-200 pb-3 text-[10px] text-gray-400 uppercase tracking-wider">
                    <div className={isSection5 ? "col-span-5" : "col-span-7"}>Evaluation Criteria</div>
                    <div className={`${isSection5 ? "col-span-7" : "col-span-5"} grid grid-cols-5 text-center`}>
                      {ratingHeaders.map((hdr, idx) => (
                        <div key={idx} className="text-[10px] leading-tight px-1 text-gray-400 break-words font-semibold">
                          {hdr}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {currentQuestions.map((q, qIdx) => (
                      <div key={q.originalIndex || qIdx} className="grid grid-cols-1 md:grid-cols-12 items-center py-3 gap-4">
                        <div className={isSection5 ? "col-span-12 md:col-span-5" : "col-span-12 md:col-span-7"}>
                          <p className="text-sm text-gray-800 font-normal">
                            <span className="text-emerald-700 font-semibold">Q{qIdx + 1}.</span>{' '}
                            {q.text}
                            {q.coMapping && <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 ml-1.5">{q.coMapping}</span>}
                          </p>
                        </div>
                        <div className={`${isSection5 ? "col-span-12 md:col-span-7" : "col-span-12 md:col-span-5"} grid grid-cols-5 text-center`}>
                          {[1,2,3,4,5].map((_, i) => (
                            <div key={i} className="flex justify-center items-center">
                              <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-200 bg-transparent cursor-not-allowed" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Dynamic Customizable Section 6 Comment promts block */}
        <div className="space-y-3 pt-2 mt-4">
          <div className="bg-[#047857] text-white px-4 py-2.5 rounded-lg text-xs flex justify-between items-center shadow-sm uppercase tracking-wide">
            <span className="font-bold">SECTION 6: STUDENT FEEDBACK (Open-Ended Questions)</span>
            {editing && survey.status === 'Draft' && (
              <button
                onClick={() => handleAddQuestion('Section 6')}
                className="flex items-center gap-1 text-[10px] px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-md font-semibold transition-all text-white border border-white/20"
              >
                <Plus size={12} />
                Add Question
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400 italic px-1">These text fields allow students to write custom opinions, feedback, or suggestions.</p>

          <div className="bg-white border border-gray-150 rounded-xl p-5 space-y-4">
            {/* Standard static comment questions */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-700 block">1. What aspects of this course were most valuable to your learning experience? <span className="text-xs text-gray-400 font-normal">(Default Question)</span></span>
              <textarea disabled placeholder="Student learning comments area will accept up to 500 characters..." rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs cursor-not-allowed resize-none" />
            </div>
            
            <div className="space-y-1.5 border-t border-gray-100 pt-3">
              <span className="text-xs font-semibold text-gray-700 block">2. What improvements would you suggest for this course? <span className="text-xs text-gray-400 font-normal">(Default Question)</span></span>
              <textarea disabled placeholder="Student improvements comments area will accept up to 500 characters..." rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs cursor-not-allowed resize-none" />
            </div>

            <div className="space-y-1.5 border-t border-gray-100 pt-3">
              <span className="text-xs font-semibold text-gray-700 block">3. Additional comments or suggestions. <span className="text-xs text-gray-400 font-normal">(Default Question)</span></span>
              <textarea disabled placeholder="Additional remarks comments area will accept up to 500 characters..." rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs cursor-not-allowed resize-none" />
            </div>

            {/* Custom dynamically added Section 6 question prompts */}
            {questions.filter(q => q.section === 'Section 6').map((q, filteredIdx) => {
              const globalIndex = questions.findIndex(item => item === q)
              return (
                <div key={globalIndex} className="space-y-2 border-t border-gray-100 pt-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800">
                      Custom Open Question #{filteredIdx + 4}:
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {editing && survey.status === 'Draft' ? (
                      <input
                        type="text"
                        value={q.text}
                        onChange={e => handleQuestionEdit(globalIndex, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-normal bg-white"
                        placeholder="Enter custom open question title criteria (e.g. What topics did you find most challenging?)..."
                      />
                    ) : (
                      <span className="text-sm font-semibold text-gray-700 block leading-relaxed">{q.text || '(Empty question criteria)'}</span>
                    )}

                    {editing && survey.status === 'Draft' && (
                      <button
                        onClick={() => handleRemoveQuestion(globalIndex)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-all shadow-sm shrink-0"
                        title="Remove Question"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <textarea 
                    disabled 
                    placeholder="Student feedback response comments input area..." 
                    rows={3} 
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-lg p-2.5 text-xs cursor-not-allowed resize-none" 
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
