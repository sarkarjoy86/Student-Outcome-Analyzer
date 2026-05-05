import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

const MarksEntry = ({
  students,
  questions,
  examType,
  existingMarks,
  onComplete,
  onBack,
}) => {
  const [marks, setMarks] = useState(() => {
    if (existingMarks && Object.keys(existingMarks).length > 0) {
      return existingMarks
    }
    return {}
  })

  useEffect(() => {
    // Initialize or update marks structure when students or questions change
    const updatedMarks = { ...marks }
    let hasChanges = false

    students.forEach((student) => {
      if (!updatedMarks[student.id]) {
        updatedMarks[student.id] = {}
        hasChanges = true
      }
      questions.forEach((q) => {
        if (!(q.name in updatedMarks[student.id])) {
          updatedMarks[student.id][q.name] = ''
          hasChanges = true
        }
      })
    })

    if (hasChanges) {
      setMarks(updatedMarks)
    }
  }, [students, questions]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateMark = (studentId, questionName, value) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [questionName]: value === '' ? '' : parseFloat(value) || 0,
      },
    }))
  }

  const handleComplete = () => {
    onComplete(marks)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Marks Entry</h2>
        <p className="text-gray-600">
          Enter marks for each student and question. You can type directly into
          the cells.
        </p>
      </div>

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
                {questions.map((q) => (
                  <th
                    key={q.name}
                    className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200 min-w-[120px]"
                  >
                    <div>{q.name}</div>
                    <div className="text-xs text-gray-500">
                      {q.co} (Max: {q.maxMarks})
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
                  {questions.map((q) => {
                    const value = marks[student.id]?.[q.name] ?? ''
                    return (
                      <td key={q.name} className="px-2 py-2 border-r border-gray-100">
                        <input
                          type="number"
                          min="0"
                          max={q.maxMarks}
                          step="0.5"
                          value={value}
                          onChange={(e) =>
                            updateMark(student.id, q.name, e.target.value)
                          }
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

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
        >
          <CheckCircle2 size={20} />
          Complete Configuration & View Results
        </button>
      </div>
    </div>
  )
}

export default MarksEntry
