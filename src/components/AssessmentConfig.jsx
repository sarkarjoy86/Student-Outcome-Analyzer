import { useState } from 'react'
import { Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react'

const AssessmentConfig = ({ onComplete, existingConfig }) => {
  const [assessments, setAssessments] = useState(
    existingConfig || {
      cts: [],
      midTerm: [],
      final: [],
      assignments: [],
      attendance: { maxMarks: 10, co: '' },
      performance: { maxMarks: 10, co: '' },
    }
  )

  const addAssessment = (type) => {
    const newItem = {
      name: '',
      maxMarks: 0,
      co: '',
    }
    setAssessments((prev) => ({
      ...prev,
      [type]: [...prev[type], newItem],
    }))
  }

  const removeAssessment = (type, index) => {
    setAssessments((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }))
  }

  const updateAssessment = (type, index, field, value) => {
    setAssessments((prev) => {
      const updated = [...prev[type]]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, [type]: updated }
    })
  }

  const updateSpecialAssessment = (type, field, value) => {
    setAssessments((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }))
  }

  const handleSubmit = () => {
    // Validate all assessments have name, maxMarks, and CO
    const isValid =
      assessments.cts.every((a) => a.name && a.maxMarks > 0 && a.co) &&
      assessments.midTerm.every((a) => a.name && a.maxMarks > 0 && a.co) &&
      assessments.final.every((a) => a.name && a.maxMarks > 0 && a.co) &&
      assessments.assignments.every((a) => a.name && a.maxMarks > 0 && a.co) &&
      assessments.attendance.maxMarks > 0 &&
      assessments.performance.maxMarks > 0

    if (isValid) {
      onComplete(assessments)
    } else {
      alert('Please fill in all assessment details (name, max marks, and CO)')
    }
  }

  const renderAssessmentSection = (type, title, items) => (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <button
          onClick={() => addAssessment(type)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
        >
          <Plus size={16} />
          Add {title === 'Assignments' ? 'Assignment' : 'Question'}
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-white p-4 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-center"
          >
            <input
              type="text"
              value={item.name}
              onChange={(e) => updateAssessment(type, index, 'name', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder={`${title === 'Assignments' ? 'Assignment' : 'Question'} name`}
            />
            <input
              type="number"
              min="1"
              value={item.maxMarks}
              onChange={(e) =>
                updateAssessment(type, index, 'maxMarks', parseFloat(e.target.value) || 0)
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Max Marks"
            />
            <select
              value={item.co}
              onChange={(e) => updateAssessment(type, index, 'co', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select CO</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={`CO${i + 1}`} value={`CO${i + 1}`}>
                  CO{i + 1}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeAssessment(type, index)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <Trash2 size={16} />
              Remove
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-gray-500 text-sm italic">No {title.toLowerCase()} added yet</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Assessment Configuration
          </h2>
          <p className="text-gray-600">
            Configure all assessment types and map them to Course Outcomes (COs)
          </p>
        </div>

        <div className="space-y-6">
          {renderAssessmentSection('cts', 'Class Tests (CTs)', assessments.cts)}
          {renderAssessmentSection('midTerm', 'Mid Term', assessments.midTerm)}
          {renderAssessmentSection('final', 'Term Final', assessments.final)}
          {renderAssessmentSection('assignments', 'Assignments', assessments.assignments)}

          {/* Attendance and Performance */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Other Assessments
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Attendance
                </label>
                <div className="space-y-3">
                  <input
                    type="number"
                    min="1"
                    value={assessments.attendance.maxMarks}
                    onChange={(e) =>
                      updateSpecialAssessment(
                        'attendance',
                        'maxMarks',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Max Marks"
                  />
                  <select
                    value={assessments.attendance.co}
                    onChange={(e) =>
                      updateSpecialAssessment('attendance', 'co', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select CO (Optional)</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={`CO${i + 1}`} value={`CO${i + 1}`}>
                        CO{i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Performance
                </label>
                <div className="space-y-3">
                  <input
                    type="number"
                    min="1"
                    value={assessments.performance.maxMarks}
                    onChange={(e) =>
                      updateSpecialAssessment(
                        'performance',
                        'maxMarks',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Max Marks"
                  />
                  <select
                    value={assessments.performance.co}
                    onChange={(e) =>
                      updateSpecialAssessment('performance', 'co', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select CO</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={`CO${i + 1}`} value={`CO${i + 1}`}>
                        CO{i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Continue to Marks Entry
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssessmentConfig

