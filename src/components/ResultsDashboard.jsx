import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
} from 'recharts'
import { Download, Edit } from 'lucide-react'
import { calculateAllAttainments } from '../utils/calculations'
import MarksEntry from './MarksEntry'

const ResultsDashboard = ({
  students,
  examConfig,
  marksData,
  onMarksUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false)

  const calculations = calculateAllAttainments(
    students,
    examConfig.questions,
    marksData
  )

  // Prepare data for CO Bar Chart
  const coChartData = [
    {
      name: 'CO1',
      attainment: calculations.coAttainment.CO1.percentage.toFixed(2),
      value: parseFloat(calculations.coAttainment.CO1.percentage.toFixed(2)),
    },
    {
      name: 'CO2',
      attainment: calculations.coAttainment.CO2.percentage.toFixed(2),
      value: parseFloat(calculations.coAttainment.CO2.percentage.toFixed(2)),
    },
    {
      name: 'CO3',
      attainment: calculations.coAttainment.CO3.percentage.toFixed(2),
      value: parseFloat(calculations.coAttainment.CO3.percentage.toFixed(2)),
    },
    {
      name: 'CO4',
      attainment: calculations.coAttainment.CO4.percentage.toFixed(2),
      value: parseFloat(calculations.coAttainment.CO4.percentage.toFixed(2)),
    },
  ]

  // Prepare data for PO Chart
  const poChartData = Object.keys(calculations.poAttainment).map((po) => ({
    po: po,
    name: calculations.poAttainment[po].name,
    value: parseFloat(
      calculations.poAttainment[po].percentage.toFixed(2)
    ),
  }))

  // Prepare PO Radar data
  const poRadarData = [
    {
      subject: 'PO1',
      value: calculations.poAttainment.PO1?.percentage.toFixed(2) || 0,
      fullMark: 100,
    },
    {
      subject: 'PO2',
      value: calculations.poAttainment.PO2?.percentage.toFixed(2) || 0,
      fullMark: 100,
    },
    {
      subject: 'PO9',
      value: calculations.poAttainment.PO9?.percentage.toFixed(2) || 0,
      fullMark: 100,
    },
  ]

  const handleDownload = () => {
    // Create summary data for export
    const summaryData = {
      examType: examConfig.examType,
      totalStudents: students.length,
      coAttainment: Object.keys(calculations.coAttainment).map((co) => ({
        co,
        percentage: calculations.coAttainment[co].percentage.toFixed(2),
        attainedCount: calculations.coAttainment[co].attainedCount,
        totalStudents: calculations.coAttainment[co].totalStudents,
      })),
      poAttainment: Object.keys(calculations.poAttainment).map((po) => ({
        po,
        name: calculations.poAttainment[po].name,
        percentage: calculations.poAttainment[po].percentage.toFixed(2),
      })),
    }

    // Convert to JSON string for download
    const dataStr = JSON.stringify(summaryData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `OBE_Attainment_Report_${examConfig.examType}_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleMarksUpdateComplete = (updatedMarks) => {
    onMarksUpdate(updatedMarks)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <MarksEntry
        students={students}
        questions={examConfig.questions}
        examType={examConfig.examType}
        existingMarks={marksData}
        onComplete={handleMarksUpdateComplete}
        onBack={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Results Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              {examConfig.examType} - Course Outcome Attainment Analysis
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
            >
              <Edit size={18} />
              Edit Marks
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              <Download size={18} />
              Download Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-semibold">
              Total Students
            </div>
            <div className="text-2xl font-bold text-blue-800">
              {students.length}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-semibold">
              KPI Threshold
            </div>
            <div className="text-2xl font-bold text-green-800">50%</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-semibold">
              Department Goal
            </div>
            <div className="text-2xl font-bold text-purple-800">80%</div>
          </div>
        </div>
      </div>

      {/* CO Attainment Chart */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          CO Attainment (Class Level)
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={coChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip
              formatter={(value) => [`${value}%`, 'Attainment']}
              labelFormatter={(label) => `${label}`}
            />
            <Legend />
            <Bar dataKey="value" fill="#4f46e5" name="Attainment %" />
            <ReferenceLine
              y={calculations.constants.departmentGoal}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: 'Department Goal (80%)', position: 'top' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* PO Attainment Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PO Bar Chart */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            PO Attainment (Bar Chart)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={poChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="po" />
              <YAxis domain={[0, 100]} />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Attainment']}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.name || label
                }
              />
              <Legend />
              <Bar dataKey="value" fill="#10b981" name="Attainment %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PO Radar Chart */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            PO Attainment (Radar Chart)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={poRadarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="PO Attainment"
                dataKey="value"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Attainment Summary
        </h2>

        {/* CO Summary */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">
            Course Outcomes (COs)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border border-gray-200">
                    CO
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200">
                    Attainment %
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200">
                    Students Attained
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200">
                    Total Students
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {['CO1', 'CO2', 'CO3', 'CO4'].map((co) => {
                  const coData = calculations.coAttainment[co]
                  const status =
                    coData.percentage >= calculations.constants.departmentGoal
                      ? '✅ Meets Goal'
                      : coData.percentage >= calculations.constants.kpiThreshold
                      ? '⚠️ Below Goal'
                      : '❌ Needs Improvement'
                  return (
                    <tr key={co} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 border border-gray-200">
                        {co}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700 border border-gray-200">
                        {coData.percentage.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700 border border-gray-200">
                        {coData.attainedCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700 border border-gray-200">
                        {coData.totalStudents}
                      </td>
                      <td className="px-4 py-3 text-sm text-center border border-gray-200">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            coData.percentage >=
                            calculations.constants.departmentGoal
                              ? 'bg-green-100 text-green-800'
                              : coData.percentage >=
                                calculations.constants.kpiThreshold
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* PO Summary */}
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-3">
            Program Outcomes (POs)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border border-gray-200">
                    PO
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border border-gray-200">
                    Description
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200">
                    Attainment %
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border border-gray-200">
                    Related COs
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(calculations.poAttainment)
                  .sort()
                  .map((po) => {
                    const poData = calculations.poAttainment[po]
                    const status =
                      poData.percentage >= calculations.constants.departmentGoal
                        ? '✅ Meets Goal'
                        : poData.percentage >=
                          calculations.constants.kpiThreshold
                        ? '⚠️ Below Goal'
                        : '❌ Needs Improvement'
                    return (
                      <tr key={po} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-700 border border-gray-200">
                          {po}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border border-gray-200">
                          {poData.name.split(' - ')[1]}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700 border border-gray-200">
                          {poData.percentage.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border border-gray-200">
                          {poData.cos.join(', ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-center border border-gray-200">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              poData.percentage >=
                              calculations.constants.departmentGoal
                                ? 'bg-green-100 text-green-800'
                                : poData.percentage >=
                                  calculations.constants.kpiThreshold
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResultsDashboard
