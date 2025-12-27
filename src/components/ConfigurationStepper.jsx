import { useState, useEffect } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import MarksEntry from './MarksEntry'

const ConfigurationStepper = ({
  students,
  onConfigurationComplete,
  existingConfig,
  existingMarks,
}) => {
  const [step, setStep] = useState(1)
  const [examType, setExamType] = useState(existingConfig.examType || '')
  const [numQuestions, setNumQuestions] = useState(
    existingConfig.questions.length || 1
  )
  const [questions, setQuestions] = useState(
    existingConfig.questions.length > 0
      ? existingConfig.questions
      : [
          {
            name: 'Q1',
            co: 'CO1',
            maxMarks: 10,
          },
        ]
  )

  useEffect(() => {
    if (numQuestions !== questions.length) {
      const newQuestions = []
      for (let i = 0; i < numQuestions; i++) {
        if (questions[i]) {
          newQuestions.push(questions[i])
        } else {
          newQuestions.push({
            name: `Q${i + 1}`,
            co: 'CO1',
            maxMarks: 10,
          })
        }
      }
      setQuestions(newQuestions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numQuestions])

  const updateQuestion = (index, field, value) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const handleStep1Complete = () => {
    if (examType) {
      setStep(2)
    }
  }

  const handleStep2Complete = () => {
    // Validate all questions have CO and maxMarks
    const isValid = questions.every(
      (q) => q.co && q.maxMarks > 0 && q.name.trim() !== ''
    )
    if (isValid) {
      setStep(3)
    }
  }

  const handleMarksComplete = (marks) => {
    const config = {
      examType,
      questions,
    }
    onConfigurationComplete(config, marks)
  }

  const steps = [
    { number: 1, title: 'Exam Selection', completed: step > 1 },
    { number: 2, title: 'Question Mapping', completed: step > 2 },
    { number: 3, title: 'Marks Entry', completed: false },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step >= s.number
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s.completed || step > s.number ? (
                    <CheckCircle2 size={24} />
                  ) : (
                    <Circle size={24} />
                  )}
                </div>
                <span className="mt-2 text-sm font-medium text-gray-700">
                  {s.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    step > s.number ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Exam Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Select Exam Type
              </h2>
              <p className="text-gray-600">
                Choose the type of examination you are configuring
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Class Test (CT)', 'Midterm', 'Final Exam'].map((type) => (
                <button
                  key={type}
                  onClick={() => setExamType(type)}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    examType === type
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-lg text-gray-800">
                    {type}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleStep1Complete}
              disabled={!examType}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Continue to Question Mapping
            </button>
          </div>
        )}

        {/* Step 2: Question Mapping */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Question Mapping
              </h2>
              <p className="text-gray-600">
                Configure questions and map them to Course Outcomes (COs)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Number of Questions/Items
              </label>
              <input
                type="number"
                min="1"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
              {questions.map((question, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Question Name
                    </label>
                    <input
                      type="text"
                      value={question.name}
                      onChange={(e) =>
                        updateQuestion(index, 'name', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., Q1, CT1-A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      CO Mapping
                    </label>
                    <select
                      value={question.co}
                      onChange={(e) =>
                        updateQuestion(index, 'co', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="CO1">CO1</option>
                      <option value="CO2">CO2</option>
                      <option value="CO3">CO3</option>
                      <option value="CO4">CO4</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Max Marks
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={question.maxMarks}
                      onChange={(e) =>
                        updateQuestion(
                          index,
                          'maxMarks',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Back
              </button>
              <button
                onClick={handleStep2Complete}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
              >
                Continue to Marks Entry
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Marks Entry */}
        {step === 3 && (
          <MarksEntry
            students={students}
            questions={questions}
            examType={examType}
            existingMarks={existingMarks}
            onComplete={handleMarksComplete}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  )
}

export default ConfigurationStepper
