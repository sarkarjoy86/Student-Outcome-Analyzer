import { useState, useEffect } from 'react'
import { ClipboardList, BarChart3, Loader2 } from 'lucide-react'
import SurveyManagement from './SurveyManagement'
import SurveyAnalysis from './SurveyAnalysis'
import { apiService } from '../../services/apiService'

export default function CourseSurvey({ offering }) {
  const [subTab, setSubTab] = useState('management')
  const [surveyId, setSurveyId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSurveyId()
  }, [offering._id])

  const fetchSurveyId = async () => {
    setLoading(true)
    try {
      const res = await apiService.getSurveys(offering._id)
      if (res.survey) {
        setSurveyId(res.survey._id)
      } else {
        setSurveyId(null)
      }
    } catch (err) {
      console.error('Failed to pre-check survey existence:', err)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'management', label: 'Survey Management', icon: ClipboardList },
    { id: 'analysis', label: 'Survey Analysis & Report', icon: BarChart3 },
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <Loader2 className="animate-spin text-emerald-600 mb-2 inline-block" size={32} />
        <p className="text-gray-500 font-semibold text-sm">Initializing Course Survey module...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 via-emerald-50/20 to-teal-50/20 rounded-2xl shadow-lg border border-green-200 p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center shadow-md">
            <ClipboardList className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-green-800 to-emerald-700 bg-clip-text text-transparent">
              Student Course Survey
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              {offering.course?.courseCode} — {offering.course?.courseName} | Based on Washington Accord Guidelines
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 bg-white rounded-xl shadow-md border border-gray-150 p-1.5 font-sans">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSubTab(tab.id)
                fetchSurveyId() // refresh survey existence state
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                  : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {subTab === 'management' && (
        <SurveyManagement 
          offering={offering} 
          onViewAnalytics={(id) => {
            setSurveyId(id)
            setSubTab('analysis')
          }} 
        />
      )}
      {subTab === 'analysis' && (
        surveyId ? (
          <SurveyAnalysis 
            surveyId={surveyId} 
            onBack={() => setSubTab('management')} 
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-250 p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600 border border-amber-100">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">No Active Analytics</h3>
              <p className="text-xs text-gray-500 mt-2">
                A course survey must be created and published before analytics can be loaded.
              </p>
            </div>
            <button
              onClick={() => setSubTab('management')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              Go to Survey Management
            </button>
          </div>
        )
      )}
    </div>
  )
}
