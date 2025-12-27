import { useState, useEffect } from 'react'
import { Save, ArrowLeft } from 'lucide-react'

const ComprehensiveMarksEntry = ({
  students,
  assessments,
  onComplete,
  onBack,
  existingMarks,
}) => {
  const [marks, setMarks] = useState(() => {
    if (existingMarks && Object.keys(existingMarks).length > 0) {
      return existingMarks
    }
    return {}
  })

  const [activeTab, setActiveTab] = useState('cts')

  useEffect(() => {
    // Initialize marks structure
    const updatedMarks = { ...marks }
    let hasChanges = false

    students.forEach((student) => {
      if (!updatedMarks[student.id]) {
        updatedMarks[student.id] = {}
        hasChanges = true
      }

      // Initialize all assessment marks
      const allAssessments = [
        ...(assessments.cts || []).map((a) => ({ ...a, type: 'cts' })),
        ...(assessments.midTerm || []).map((a) => ({ ...a, type: 'midTerm' })),
        ...(assessments.final || []).map((a) => ({ ...a, type: 'final' })),
        ...(assessments.assignments || []).map((a) => ({ ...a, type: 'assignments' })),
      ]
      
      if (assessments.attendance) {
        allAssessments.push({ ...assessments.attendance, name: 'Attendance', type: 'attendance' })
      }
      if (assessments.performance) {
        allAssessments.push({ ...assessments.performance, name: 'Performance', type: 'performance' })
      }

      allAssessments.forEach((assessment) => {
        const key = `${assessment.type}_${assessment.name}`
        if (!(key in updatedMarks[student.id])) {
          updatedMarks[student.id][key] = ''
          hasChanges = true
        }
      })
    })

    if (hasChanges) {
      setMarks(updatedMarks)
    }
  }, [students, assessments])

  const updateMark = (studentId, key, value) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [key]: value === '' ? '' : parseFloat(value) || 0,
      },
    }))
  }

  const getAssessmentList = (type) => {
    if (type === 'cts') return assessments?.cts || []
    if (type === 'midTerm') return assessments?.midTerm || []
    if (type === 'final') return assessments?.final || []
    if (type === 'assignments') return assessments?.assignments || []
    if (type === 'attendance' && assessments?.attendance)
      return [{ ...assessments.attendance, name: 'Attendance' }]
    if (type === 'performance' && assessments?.performance)
      return [{ ...assessments.performance, name: 'Performance' }]
    return []
  }

  const renderMarksTable = (type) => {
    const assessmentList = getAssessmentList(type)
    if (assessmentList.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No {type === 'cts' ? 'Class Tests' : type === 'midTerm' ? 'Mid Term' : type === 'final' ? 'Final' : type === 'assignments' ? 'Assignments' : type} configured yet
        </div>
      )
    }

    return (
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="bg-indigo-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 sticky left-0 bg-indigo-50 z-20">
                  Student ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 sticky left-[150px] bg-indigo-50 z-20 min-w-[200px]">
                  Name
                </th>
                {assessmentList.map((assessment) => (
                  <th
                    key={assessment.name}
                    className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200 min-w-[120px]"
                  >
                    <div>{assessment.name}</div>
                    <div className="text-xs text-gray-500">
                      {assessment.co} (Max: {assessment.maxMarks})
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium border-r border-gray-200 sticky left-0 bg-white z-10">
                    {student.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 sticky left-[150px] bg-white z-10">
                    {student.name}
                  </td>
                  {assessmentList.map((assessment) => {
                    const key = `${type}_${assessment.name}`
                    const value = marks[student.id]?.[key] ?? ''
                    return (
                      <td key={assessment.name} className="px-2 py-2 border-r border-gray-100">
                        <input
                          type="number"
                          min="0"
                          max={assessment.maxMarks}
                          step="0.5"
                          value={value}
                          onChange={(e) => updateMark(student.id, key, e.target.value)}
                          className="w-full px-2 py-1 text-center text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'cts', label: 'Class Tests', count: assessments?.cts?.length || 0 },
    { id: 'midTerm', label: 'Mid Term', count: assessments?.midTerm?.length || 0 },
    { id: 'final', label: 'Final', count: assessments?.final?.length || 0 },
    { id: 'assignments', label: 'Assignments', count: assessments?.assignments?.length || 0 },
    { id: 'attendance', label: 'Attendance', count: assessments?.attendance ? 1 : 0 },
    { id: 'performance', label: 'Performance', count: assessments?.performance ? 1 : 0 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Marks Entry</h2>
        <p className="text-gray-600">
          Enter marks for each student by assessment type. You can save and continue later.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Marks Table */}
      {renderMarksTable(activeTab)}

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <button
          onClick={() => onComplete(marks)}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
        >
          <Save size={20} />
          Save & Continue to Calculations
        </button>
      </div>
    </div>
  )
}

export default ComprehensiveMarksEntry

