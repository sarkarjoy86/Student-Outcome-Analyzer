import { useState, useEffect } from 'react'
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'

const PO_NAMES = {
  PO1: 'Engineering knowledge',
  PO2: 'Problem analysis',
  PO3: 'Design/development of solutions',
  PO4: 'Investigation',
  PO5: 'Modern tool usage',
  PO6: 'The engineer and society',
  PO7: 'Environment & sustainability',
  PO8: 'Ethics',
  PO9: 'Individual work and teamwork',
  PO10: 'Communication',
  PO11: 'Project management and finance',
  PO12: 'Life-long learning',
}

const PO_COLORS = {
  PO1: 'bg-orange-200',
  PO2: 'bg-purple-200',
  PO3: 'bg-green-700',
  PO4: 'bg-orange-300',
  PO5: 'bg-purple-700',
  PO6: 'bg-blue-700',
  PO7: 'bg-green-300',
  PO8: 'bg-red-200',
  PO9: 'bg-teal-200',
  PO10: 'bg-orange-500',
  PO11: 'bg-blue-200',
  PO12: 'bg-purple-800',
}

const COPOMapping = ({ onComplete, existingMapping }) => {
  const [mapping, setMapping] = useState(() => {
    if (existingMapping) {
      return existingMapping
    }
    // Initialize 12x12 matrix
    const initialMapping = {}
    for (let co = 1; co <= 12; co++) {
      initialMapping[`CO${co}`] = {}
      for (let po = 1; po <= 12; po++) {
        initialMapping[`CO${co}`][`PO${po}`] = 0
      }
    }
    return initialMapping
  })

  const [totals, setTotals] = useState(() => {
    const totals = {}
    for (let po = 1; po <= 12; po++) {
      totals[`PO${po}`] = 0
    }
    return totals
  })

  useEffect(() => {
    // Calculate totals for each PO
    const newTotals = {}
    for (let po = 1; po <= 12; po++) {
      const poKey = `PO${po}`
      let total = 0
      for (let co = 1; co <= 12; co++) {
        const coKey = `CO${co}`
        if (mapping[coKey] && mapping[coKey][poKey] === 1) {
          total++
        }
      }
      newTotals[poKey] = total
    }
    setTotals(newTotals)
  }, [mapping])

  const toggleMapping = (co, po) => {
    setMapping((prev) => ({
      ...prev,
      [co]: {
        ...prev[co],
        [po]: prev[co][po] === 1 ? 0 : 1,
      },
    }))
  }

  const handleSubmit = () => {
    onComplete(mapping)
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Mapping of COs with POs
          </h2>
          <p className="text-gray-600">
            Click on cells to map Course Outcomes (COs) to Program Outcomes (POs)
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <table className="w-full border-collapse">
              <thead>
                {/* PO Names Row */}
                <tr>
                  <th className="sticky left-0 bg-white z-30 border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700">
                    CO \ PO
                  </th>
                  {Array.from({ length: 12 }, (_, i) => {
                    const po = `PO${i + 1}`
                    return (
                      <th
                        key={po}
                        className={`border border-gray-300 px-2 py-2 text-xs font-semibold text-white ${PO_COLORS[po]}`}
                      >
                        {PO_NAMES[po]}
                      </th>
                    )
                  })}
                </tr>
                {/* PO Numbers Row */}
                <tr>
                  <th className="sticky left-0 bg-gray-50 z-30 border border-gray-300 px-2 py-2 text-sm font-semibold text-gray-700">
                    &nbsp;
                  </th>
                  {Array.from({ length: 12 }, (_, i) => {
                    const po = `PO${i + 1}`
                    return (
                      <th
                        key={po}
                        className="border border-gray-300 px-2 py-2 text-sm font-semibold text-gray-700 bg-gray-50"
                      >
                        {po}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => {
                  const co = `CO${i + 1}`
                  return (
                    <tr key={co}>
                      <td className="sticky left-0 bg-blue-50 z-20 border border-gray-300 px-4 py-3 text-sm font-semibold text-blue-700">
                        {co}
                      </td>
                      {Array.from({ length: 12 }, (_, j) => {
                        const po = `PO${j + 1}`
                        const isMapped = mapping[co] && mapping[co][po] === 1
                        return (
                          <td
                            key={po}
                            onClick={() => toggleMapping(co, po)}
                            className={`border border-gray-300 px-4 py-3 text-center cursor-pointer transition-colors ${
                              isMapped
                                ? 'bg-green-400 hover:bg-green-500'
                                : 'bg-yellow-50 hover:bg-yellow-100'
                            }`}
                          >
                            {isMapped ? '1' : ''}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {/* Totals Row */}
                <tr className="bg-gray-100">
                  <td className="sticky left-0 bg-gray-200 z-20 border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700">
                    Total
                  </td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const po = `PO${i + 1}`
                    return (
                      <td
                        key={po}
                        className="border border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-700"
                      >
                        {totals[po] || 0}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
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
            Continue to Assessment Configuration
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default COPOMapping

