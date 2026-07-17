import { useState, useEffect } from 'react'
import { apiService } from '../../services/apiService'
import { 
  Plus, Trash2, ArrowUp, ArrowDown, Share2, BarChart2, 
  Trash, Edit2, Calendar, FileText, Clipboard, Check, X, Eye
} from 'lucide-react'
import EvaluationAnalytics from './EvaluationAnalytics'

const EDIT_SECTIONS = [
  { key: "Section 1", title: "SECTION 1 : LEARNING OUTCOMES & STUDENT ACHIEVEMENT" },
  { key: "Section 2", title: "SECTION 2 : COURSE CONTENT & DELIVERY" },
  { key: "Section 3", title: "SECTION 3 : INSTRUCTOR EVALUATION" },
  { key: "Section 4", title: "SECTION 4 : COURSE ASSESSMENT & WORKLOAD" },
  { key: "Section 5", title: "SECTION 5 : OUTCOME ACHIEVEMENTS BY THE COURSE" }
];

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

const SECTION_ORDER = {
  "Section 1": 1,
  "Section 2": 2,
  "Section 3": 3,
  "Section 4": 4,
  "Section 5": 5
};

const sortQuestions = (questions) => {
  return [...questions]
    .sort((a, b) => {
      const orderA = SECTION_ORDER[a.section] || 1;
      const orderB = SECTION_ORDER[b.section] || 1;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.order || 0) - (b.order || 0);
    })
    .map((q, idx) => ({
      ...q,
      order: idx + 1
    }));
};

export default function CourseEvaluationManager({ offering, user }) {
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // View states: 'list', 'create', 'edit', 'analytics'
  const [viewState, setViewState] = useState('list')
  const [activeEvaluationId, setActiveEvaluationId] = useState(null)
  
  // Publishing modal state
  const [publishModal, setPublishModal] = useState(null) // evaluation data if open
  const [copied, setCopied] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    openDate: '',
    closeDate: '',
    description: '',
    questions: []
  })

  useEffect(() => {
    loadEvaluations()
  }, [offering._id])

  const loadEvaluations = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiService.getEvaluations(offering._id)
      setEvaluations(res.evaluations)
    } catch (err) {
      console.error(err)
      setError('Failed to load course evaluations.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Pre-populate default questions
    const defaults = [
      { text: "The course helped me acquire the intended learning outcomes.", section: "Section 1", order: 1 },
      { text: "I gained significant new knowledge and skills from this course.", section: "Section 1", order: 2 },
      { text: "The teacher explained the concepts clearly.", section: "Section 3", order: 3 },
      { text: "Course materials were helpful.", section: "Section 2", order: 4 },
      { text: "Assessment methods were fair.", section: "Section 4", order: 5 },
      { text: "The teacher encouraged participation.", section: "Section 3", order: 6 },
      { text: "The classroom environment was positive.", section: "Section 3", order: 7 },
      { text: "Laboratory sessions were useful.", section: "Section 2", order: 8 },
      { text: "Overall I am satisfied with this course.", section: "Section 5", order: 9 }
    ]

    setFormData({
      title: `${offering?.course?.courseName || 'Course'} Evaluation`,
      openDate: today,
      closeDate: nextWeek,
      description: 'Please provide your honest feedback regarding this course and instructor. Your answers are valuable for quality improvement.',
      questions: sortQuestions(defaults)
    })
    setViewState('create')
  }

  const handleOpenEdit = (evalDoc) => {
    const questionsWithSection = (evalDoc.questions || []).map(q => ({
      ...q,
      section: q.section || EDIT_SECTIONS[getSectionIndex(q.text)].key
    }))
    setFormData({
      title: evalDoc.title,
      openDate: evalDoc.openDate ? new Date(evalDoc.openDate).toISOString().split('T')[0] : '',
      closeDate: evalDoc.closeDate ? new Date(evalDoc.closeDate).toISOString().split('T')[0] : '',
      description: evalDoc.description || '',
      questions: sortQuestions(questionsWithSection)
    })
    setActiveEvaluationId(evalDoc._id)
    setViewState('edit')
  }

  // Question handlers
  const handleAddQuestion = () => {
    setFormData(prev => {
      const newQuestion = { text: '', section: 'Section 1', order: prev.questions.length + 1 }
      return {
        ...prev,
        questions: sortQuestions([...prev.questions, newQuestion])
      }
    })
  }

  const handleAddQuestionInSection = (sectionKey) => {
    setFormData(prev => {
      const newQuestion = { text: '', section: sectionKey, order: prev.questions.length + 1 }
      return {
        ...prev,
        questions: sortQuestions([...prev.questions, newQuestion])
      }
    })
  }

  const handleRemoveQuestion = (idx) => {
    setFormData(prev => {
      const filtered = prev.questions.filter((_, i) => i !== idx)
      return {
        ...prev,
        questions: sortQuestions(filtered)
      }
    })
  }

  const handleUpdateQuestion = (idx, text) => {
    setFormData(prev => {
      const updated = [...prev.questions]
      updated[idx] = { ...updated[idx], text }
      return { ...prev, questions: updated }
    })
  }

  const handleMoveQuestion = (idx, direction) => {
    setFormData(prev => {
      const questions = [...prev.questions]
      const currentQ = questions[idx]
      if (!currentQ) return prev
      const sectionKey = currentQ.section
      
      const sectionQIndices = questions
        .map((q, i) => ({ q, i }))
        .filter(item => item.q.section === sectionKey)
        .map(item => item.i)
        
      const localIndex = sectionQIndices.indexOf(idx)
      if (localIndex === -1) return prev
      
      let targetLocalIndex = localIndex
      if (direction === 'up' && localIndex > 0) {
        targetLocalIndex = localIndex - 1
      } else if (direction === 'down' && localIndex < sectionQIndices.length - 1) {
        targetLocalIndex = localIndex + 1
      }
      
      if (targetLocalIndex !== localIndex) {
        const targetIdx = sectionQIndices[targetLocalIndex]
        const temp = questions[idx]
        questions[idx] = questions[targetIdx]
        questions[targetIdx] = temp
        
        const updated = questions.map((q, i) => ({ ...q, order: i + 1 }))
        return { ...prev, questions: updated }
      }
      
      return prev
    })
  }

  // Save form handler
  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please provide a title.')
      return
    }
    if (!formData.openDate || !formData.closeDate) {
      alert('Open and close dates are required.')
      return
    }
    if (new Date(formData.openDate) > new Date(formData.closeDate)) {
      alert('Close date must be after open date.')
      return
    }
    const emptyQ = formData.questions.some(q => !q.text.trim())
    if (emptyQ) {
      alert('Please fill in all question fields or delete empty ones.')
      return
    }

    try {
      if (viewState === 'create') {
        await apiService.createEvaluation({
          courseOfferingId: offering._id,
          title: formData.title.trim(),
          openDate: formData.openDate,
          closeDate: formData.closeDate,
          description: formData.description.trim(),
          questions: formData.questions
        })
      } else {
        await apiService.updateEvaluation(activeEvaluationId, {
          title: formData.title.trim(),
          openDate: formData.openDate,
          closeDate: formData.closeDate,
          description: formData.description.trim(),
          questions: formData.questions
        })
      }
      setViewState('list')
      loadEvaluations()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to save evaluation.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this evaluation? All student responses will be permanently removed.')) {
      return
    }
    try {
      await apiService.deleteEvaluation(id)
      loadEvaluations()
    } catch (err) {
      console.error(err)
      alert('Failed to delete evaluation.')
    }
  }

  const handlePublish = async (id) => {
    try {
      const res = await apiService.publishEvaluation(id)
      setPublishModal(res.evaluation)
      loadEvaluations()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to publish evaluation.')
    }
  }

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (viewState === 'analytics') {
    return (
      <EvaluationAnalytics 
        evaluationId={activeEvaluationId} 
        onBack={() => {
          setActiveEvaluationId(null)
          setViewState('list')
          loadEvaluations()
        }} 
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Student Course Evaluation</h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Manage feedback surveys and view dynamic reports.
          </p>
        </div>
        {viewState === 'list' && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm text-sm"
          >
            <Plus size={16} />
            Create Evaluation
          </button>
        )}
      </div>

      {viewState === 'list' && (
        <>
          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              <p className="text-gray-500 mt-2 font-semibold">Loading evaluations...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 font-semibold text-sm">
              {error}
            </div>
          ) : evaluations.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center space-y-4">
              <div className="inline-flex p-4 bg-emerald-50 rounded-full text-emerald-600 border border-emerald-100">
                <FileText size={40} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">No evaluations found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                  You haven't created any course evaluation forms for this offering yet. Click the button above to design one.
                </p>
              </div>
              <button
                onClick={handleOpenCreate}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm text-sm"
              >
                Create First Evaluation
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/75 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Timeline</th>
                      <th className="px-6 py-4 text-center">Questions</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm font-semibold text-gray-700">
                    {evaluations.map((evalDoc) => {
                      const isOpen = new Date() >= new Date(evalDoc.openDate) && new Date() <= new Date(evalDoc.closeDate)
                      const isDraft = evalDoc.status === 'Draft'
                      
                      return (
                        <tr key={evalDoc._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-800">{evalDoc.title}</p>
                            {evalDoc.evaluationId && (
                              <p className="text-xs text-gray-400 font-bold mt-0.5">{evalDoc.evaluationId}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isDraft 
                                ? 'bg-amber-100 text-amber-800' 
                                : isOpen 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {isDraft ? 'Draft' : isOpen ? 'Active/Open' : 'Closed'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                              <Calendar size={13} />
                              <span>
                                {new Date(evalDoc.openDate).toLocaleDateString()} - {new Date(evalDoc.closeDate).toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500">
                            {evalDoc.questions?.length || 0}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isDraft ? (
                                <>
                                  <button
                                    onClick={() => handlePublish(evalDoc._id)}
                                    title="Publish Survey"
                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100"
                                  >
                                    <Share2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEdit(evalDoc)}
                                    title="Edit Survey"
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setActiveEvaluationId(evalDoc._id)
                                      setViewState('analytics')
                                    }}
                                    title="View Analytics & Report"
                                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-100"
                                  >
                                    <BarChart2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => setPublishModal(evalDoc)}
                                    title="View QR Code & Public Link"
                                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDelete(evalDoc._id)}
                                title="Delete Survey"
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {(viewState === 'create' || viewState === 'edit') && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h3 className="text-lg font-bold text-gray-800 border-b pb-2">
            {viewState === 'create' ? 'Create Evaluation Survey' : 'Edit Evaluation Survey'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Evaluation Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Course Evaluation Survey"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Open Date *</label>
                <input
                  type="date"
                  required
                  value={formData.openDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, openDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Close Date *</label>
                <input
                  type="date"
                  required
                  value={formData.closeDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, closeDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Description / Instructions</label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Provide guidelines for students..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-semibold"
            />
          </div>

          {/* Survey Questions Section */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-gray-800 border-b pb-2">Survey Questions By Section</h4>

            <div className="space-y-4">
              {EDIT_SECTIONS.map((sec) => {
                const questionsInSec = formData.questions.filter(q => q.section === sec.key);
                
                return (
                  <div key={sec.key} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    {/* Section Header */}
                    <div className="bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 flex justify-between items-center uppercase tracking-wide">
                      <span>{sec.title}</span>
                      <button
                        type="button"
                        onClick={() => handleAddQuestionInSection(sec.key)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-md text-[11px] font-bold transition-all border border-white/20"
                      >
                        <Plus size={12} />
                        Add Question
                      </button>
                    </div>
                    
                    {/* Section Body */}
                    <div className="p-4 space-y-3">
                      {questionsInSec.map((q, localIdx) => {
                        const originalIdx = formData.questions.findIndex(item => item === q);
                        if (originalIdx === -1) return null;
                        
                        return (
                          <div key={originalIdx} className="flex gap-2 items-center bg-gray-50/75 p-3 rounded-xl border border-gray-150">
                            <span className="text-xs font-bold text-gray-400 w-5 text-center">{originalIdx + 1}</span>
                            <input
                              type="text"
                              value={q.text}
                              onChange={(e) => handleUpdateQuestion(originalIdx, e.target.value)}
                              placeholder="Enter rating question text"
                              className="flex-1 px-3 py-2 rounded-lg border border-gray-250 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-semibold"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                disabled={localIdx === 0}
                                onClick={() => handleMoveQuestion(originalIdx, 'up')}
                                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded hover:bg-gray-200/50"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={localIdx === questionsInSec.length - 1}
                                onClick={() => handleMoveQuestion(originalIdx, 'down')}
                                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded hover:bg-gray-200/50"
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(originalIdx)}
                                className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 border border-transparent hover:border-red-100"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                      {questionsInSec.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No questions in this section yet.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md text-sm"
            >
              {viewState === 'create' ? 'Create Evaluation' : 'Update Evaluation'}
            </button>
            <button
              onClick={() => {
                setActiveEvaluationId(null)
                setViewState('list')
              }}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Publish Details Modal */}
      {publishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-100 p-6 space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Evaluation Published!</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                  ID: {publishModal.evaluationId}
                </p>
              </div>
              <button
                onClick={() => setPublishModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {(() => {
              const getDynamicPublicLink = () => {
                const id = publishModal.evaluationId || publishModal._id
                if (!id) return ''
                const base = window.location.origin + window.location.pathname
                const cleanBase = base.endsWith('/') ? base : base + '/'
                return `${cleanBase}?feedbackId=${id}`
              }
              const dynamicLink = getDynamicPublicLink()
              const dynamicQr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dynamicLink)}`

              return (
                <>
                  <div className="flex flex-col items-center bg-gray-50/50 rounded-xl p-4 border border-gray-200">
                    <img
                      src={dynamicQr}
                      alt="QR Code"
                      className="w-48 h-48 border border-white rounded-lg shadow-sm"
                    />
                    <span className="text-[11px] text-gray-400 font-bold uppercase mt-2">
                      Print QR Code for student access
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500">Student Access Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={dynamicLink}
                        className="flex-1 bg-gray-50 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 focus:outline-none"
                      />
                      <button
                        onClick={() => handleCopyLink(dynamicLink)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        {copied ? <Check size={14} /> : <Clipboard size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </>
              )
            })()}

            <div className="flex gap-4 text-xs font-bold text-gray-500 border-t pt-4">
              <p>Opens: <span className="text-gray-800">{new Date(publishModal.openDate).toLocaleDateString()}</span></p>
              <p>Closes: <span className="text-gray-800">{new Date(publishModal.closeDate).toLocaleDateString()}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
