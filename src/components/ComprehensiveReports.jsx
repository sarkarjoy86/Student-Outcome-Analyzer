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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts'
import { Download, Users, TrendingUp } from 'lucide-react'
import * as XLSX from 'xlsx'
import { calculateAllAttainments, getCOMarkAllocations } from '../utils/comprehensiveCalculations'
import { downloadChartAsJPG } from '../utils/chartDownload'

// University color scheme: Green, Gold/Yellow, Blue
const UNIVERSITY_COLORS = {
  primary: '#1a5f3f', // Dark green
  secondary: '#d4af37', // Gold
  accent: '#2c5282', // Blue
  lightGreen: '#48bb78',
  lightGold: '#f6e05e',
  lightBlue: '#4299e1',
}

const COLORS = [
  UNIVERSITY_COLORS.primary,
  UNIVERSITY_COLORS.secondary,
  UNIVERSITY_COLORS.accent,
  UNIVERSITY_COLORS.lightGreen,
  UNIVERSITY_COLORS.lightGold,
  UNIVERSITY_COLORS.lightBlue,
  '#4f46e5',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
]

// Custom Legend Component to show color indicators
const ColorLegend = ({ items }) => {
  return (
    <div className="flex flex-wrap gap-4 justify-center mt-4 pt-4 border-t border-gray-200">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm font-medium text-gray-700">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

const ComprehensiveReports = ({
  students = [],
  marks = {},
  assessments = null,
  coMapping = null,
  courseInfo = {},
  targetPassMarks = 40,
  kpiCO = 50,
  kpiPO = 50,
  initialViewMode = 'overview',
}) => {
  const [selectedStudents, setSelectedStudents] = useState([])
  const [viewMode, setViewMode] = useState(initialViewMode)

  // Safety check
  if (!assessments || !coMapping || students.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Incomplete Configuration
          </h2>
          <p className="text-gray-600">
            Please complete all previous steps (Course Info, CO-PO Mapping, Assessments, and Marks Entry) before viewing reports.
          </p>
        </div>
      </div>
    )
  }

  const calculations = calculateAllAttainments(
    students,
    marks,
    assessments,
    coMapping,
    targetPassMarks,
    kpiCO,
    kpiPO
  )

  // Prepare CO chart data with dynamic labels
  const coChartData = Array.from({ length: 12 }, (_, i) => {
    const co = `CO${i + 1}`
    return {
      name: co,
      [`Above Pass Marks (${targetPassMarks}%)`]: calculations.coAttainment[co]?.passMarksPercentage || 0,
      [`Above KPI (${kpiCO}%)`]: calculations.coAttainment[co]?.kpiPercentage || 0,
    }
  })

  // Prepare PO chart data with dynamic labels
  const poChartData = Array.from({ length: 12 }, (_, i) => {
    const po = `PO${i + 1}`
    return {
      name: po,
      [`Above Pass Marks (${targetPassMarks}%)`]: calculations.poAttainment[po]?.passMarksPercentage || 0,
      [`Above KPI (${kpiPO}%)`]: calculations.poAttainment[po]?.kpiPercentage || 0,
    }
  })

  // Prepare PO radar data
  const poRadarData = Array.from({ length: 12 }, (_, i) => {
    const po = `PO${i + 1}`
    return {
      subject: po,
      value: calculations.poAttainment[po]?.kpiPercentage || 0,
      fullMark: 100,
    }
  })

  // Get individual student CO data
  const getStudentCOData = (studentId) => {
    return Array.from({ length: 12 }, (_, i) => {
      const co = `CO${i + 1}`
      return {
        name: co,
        value: calculations.studentCOs[studentId]?.[co] || 0,
      }
    })
  }

  // Get individual student PO data
  const getStudentPOData = (studentId) => {
    return Array.from({ length: 12 }, (_, i) => {
      const po = `PO${i + 1}`
      return {
        name: po,
        value: calculations.studentPOs[studentId]?.[po] || 0,
      }
    })
  }

  // Comparison data for selected students
  const getComparisonData = () => {
    if (selectedStudents.length === 0) return []
    
    const comparisonData = Array.from({ length: 12 }, (_, i) => {
      const co = `CO${i + 1}`
      const dataPoint = { name: co }
      
      selectedStudents.forEach((studentId) => {
        const student = students.find((s) => s.id === studentId)
        if (student) {
          dataPoint[student.name] = calculations.studentCOs[studentId]?.[co] || 0
        }
      })
      
      return dataPoint
    })
    
    return comparisonData
  }

  const handleDownload = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new()

    // Prepare Calculations of COs & POs table data with header info and student names
    const tableData = [
      ['COURSE INFORMATION'],
      ['Course Code', courseInfo?.courseCode || 'N/A'],
      ['Course Title', courseInfo?.courseTitle || 'N/A'],
      ...(courseInfo?.level ? [['Level', courseInfo.level]] : []),
      ...(courseInfo?.term ? [['Term', courseInfo.term]] : []),
      ...(courseInfo?.section ? [['Section', courseInfo.section]] : []),
      ['Generated on', new Date().toLocaleDateString()],
      [],
      ['Calculations of COs & POs'],
      [],
      ['Student ID', 'Student Name', ...Array.from({ length: 12 }, (_, i) => `CO${i + 1}`), ...Array.from({ length: 12 }, (_, i) => `PO${i + 1}`)],
      ...students.map((student) => [
        student.id,
        student.name,
        ...Array.from({ length: 12 }, (_, i) => {
          const co = `CO${i + 1}`
          return (calculations.studentCOs[student.id]?.[co] || 0).toFixed(1)
        }),
        ...Array.from({ length: 12 }, (_, i) => {
          const po = `PO${i + 1}`
          const value = calculations.studentPOs[student.id]?.[po] || 0
          return value > 0 ? value.toFixed(1) : '0.0'
        }),
      ]),
    ]

    // Create worksheet for Calculations table
    const ws1 = XLSX.utils.aoa_to_sheet(tableData)
    
    // Style the header row
    ws1['!rows'] = [{ hpt: 20 }, { hpt: 15 }, { hpt: 15 }, { hpt: 15 }, { hpt: 10 }, { hpt: 20 }, { hpt: 10 }, { hpt: 25 }]
    ws1['!cols'] = [
      { wch: 15 }, // Student ID column
      { wch: 30 }, // Student Name column
      ...Array(12).fill({ wch: 10 }), // CO columns
      ...Array(12).fill({ wch: 10 }), // PO columns
    ]

    XLSX.utils.book_append_sheet(wb, ws1, 'COs & POs Calculations')

    // Create summary worksheet with enhanced styling
    const summaryData = [
      ['OBE ATTAINMENT REPORT'],
      [],
      ['COURSE INFORMATION'],
      ['Course Code', courseInfo?.courseCode || 'N/A'],
      ['Course Title', courseInfo?.courseTitle || 'N/A'],
      ['Generated on', new Date().toLocaleDateString()],
      [],
      ['SUMMARY STATISTICS'],
      ['Total Students', students.length],
      ['Target Pass Marks', `${targetPassMarks}%`],
      ['KPI CO', `${kpiCO}%`],
      ['KPI PO', `${kpiPO}%`],
      [],
      ['CO ATTAINMENT SUMMARY'],
      ['CO', `% Above Pass Marks (${targetPassMarks}%)`, `% Above KPI (${kpiCO}%)`],
      ...Array.from({ length: 12 }, (_, i) => {
        const co = `CO${i + 1}`
        const coData = calculations.coAttainment[co]
        return [
          co,
          (coData?.passMarksPercentage || 0).toFixed(1),
          (coData?.kpiPercentage || 0).toFixed(1),
        ]
      }),
      [],
      ['PO ATTAINMENT SUMMARY'],
      ['PO', `% Above Pass Marks (${targetPassMarks}%)`, `% Above KPI (${kpiPO}%)`],
      ...Array.from({ length: 12 }, (_, i) => {
        const po = `PO${i + 1}`
        const poData = calculations.poAttainment[po]
        return [
          po,
          (poData?.passMarksPercentage || 0).toFixed(1),
          (poData?.kpiPercentage || 0).toFixed(1),
        ]
      }),
    ]

    const ws2 = XLSX.utils.aoa_to_sheet(summaryData)
    ws2['!rows'] = [{ hpt: 25 }, { hpt: 10 }, { hpt: 20 }, { hpt: 15 }, { hpt: 15 }, { hpt: 15 }, { hpt: 10 }, { hpt: 20 }]
    ws2['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 25 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

    // Write the file
    const fileName = `OBE_Report_${courseInfo?.courseCode || 'Course'}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-white via-green-50/30 to-blue-50/30 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border-2 border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-700 via-green-600 to-blue-600 bg-clip-text text-transparent">
              Comprehensive Reports
            </h1>
            <p className="text-gray-700 mt-2 font-semibold text-lg">
              {courseInfo?.courseCode || 'Course'} - {courseInfo?.courseTitle || 'Title'}
              {courseInfo?.level && ` | Level: ${courseInfo.level}`}
              {courseInfo?.term && ` | Term: ${courseInfo.term}`}
              {courseInfo?.section && ` | Section: ${courseInfo.section}`}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Download size={20} />
            Download Report
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 border-b-2 border-green-200">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-6 py-3 font-semibold transition-all duration-300 rounded-t-lg ${
              viewMode === 'overview'
                ? 'border-b-4 border-green-600 text-green-700 bg-green-50'
                : 'text-gray-600 hover:text-green-600 hover:bg-green-50/50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-6 py-3 font-semibold transition-all duration-300 rounded-t-lg ${
              viewMode === 'individual'
                ? 'border-b-4 border-green-600 text-green-700 bg-green-50'
                : 'text-gray-600 hover:text-green-600 hover:bg-green-50/50'
            }`}
          >
            Individual Student
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-6 py-3 font-semibold transition-all duration-300 rounded-t-lg ${
              viewMode === 'compare'
                ? 'border-b-4 border-green-600 text-green-700 bg-green-50'
                : 'text-gray-600 hover:text-green-600 hover:bg-green-50/50'
            }`}
          >
            Compare Students
          </button>
        </div>
      </div>

      {viewMode === 'overview' && (
        <>
          {/* CO Attainment Chart - Enhanced */}
          <div id="co-attainment-chart" className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
                COURSE OUTCOMES (COs)
              </h2>
              <button
                onClick={() => downloadChartAsJPG('co-attainment-chart', 'CO_Attainment')}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-md"
              >
                <Download size={16} />
                Download
              </button>
            </div>
            <div>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={coChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPassMarks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightBlue} stopOpacity={0.9}/>
                    <stop offset="95%" stopColor={UNIVERSITY_COLORS.accent} stopOpacity={0.9}/>
                  </linearGradient>
                  <linearGradient id="colorKPI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightGold} stopOpacity={0.9}/>
                    <stop offset="95%" stopColor={UNIVERSITY_COLORS.secondary} stopOpacity={0.9}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                  axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                  axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                  label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold' } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '2px solid #1a5f3f',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => [`${parseFloat(value).toFixed(1)}%`, '']}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar 
                  dataKey={`Above Pass Marks (${targetPassMarks}%)`}
                  fill="url(#colorPassMarks)" 
                  radius={[8, 8, 0, 0]}
                  stroke={UNIVERSITY_COLORS.accent}
                  strokeWidth={1}
                />
                <Bar 
                  dataKey={`Above KPI (${kpiCO}%)`}
                  fill="url(#colorKPI)" 
                  radius={[8, 8, 0, 0]}
                  stroke={UNIVERSITY_COLORS.secondary}
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
            <ColorLegend 
              items={[
                { label: `Above Pass Marks (${targetPassMarks}%)`, color: UNIVERSITY_COLORS.lightBlue },
                { label: `Above KPI (${kpiCO}%)`, color: UNIVERSITY_COLORS.lightGold }
              ]}
            />
            </div>
          </div>

          {/* PO Attainment Charts - Enhanced */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div id="po-bar-chart" className="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                  PROGRAM OUTCOMES (POs)
                </h2>
                <button
                  onClick={() => downloadChartAsJPG('po-bar-chart', 'PO_Attainment_Bar')}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
              <div>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={poChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPOPassMarks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightBlue} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={UNIVERSITY_COLORS.accent} stopOpacity={0.9}/>
                    </linearGradient>
                    <linearGradient id="colorPOKPI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightGold} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={UNIVERSITY_COLORS.secondary} stopOpacity={0.9}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                    axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                    axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '2px solid #1a5f3f',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value) => `${parseFloat(value).toFixed(1)}%`}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar 
                    dataKey={`Above Pass Marks (${targetPassMarks}%)`}
                    fill="url(#colorPOPassMarks)" 
                    radius={[8, 8, 0, 0]}
                    stroke={UNIVERSITY_COLORS.accent}
                    strokeWidth={1}
                  />
                  <Bar 
                    dataKey={`Above KPI (${kpiPO}%)`}
                    fill="url(#colorPOKPI)" 
                    radius={[8, 8, 0, 0]}
                    stroke={UNIVERSITY_COLORS.secondary}
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
              <ColorLegend 
                items={[
                  { label: `Above Pass Marks (${targetPassMarks}%)`, color: UNIVERSITY_COLORS.lightBlue },
                  { label: `Above KPI (${kpiPO}%)`, color: UNIVERSITY_COLORS.lightGold }
                ]}
              />
              </div>
            </div>

            <div id="po-radar-chart" className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
                  PO Attainment Distribution (Radar Chart)
                </h2>
                <button
                  onClick={() => downloadChartAsJPG('po-radar-chart', 'PO_Attainment_Radar')}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-md"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
              <div>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={poRadarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                  />
                  <Radar
                    name="PO Attainment"
                    dataKey="value"
                    stroke={UNIVERSITY_COLORS.primary}
                    fill={UNIVERSITY_COLORS.primary}
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '2px solid #1a5f3f',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value) => `${parseFloat(value).toFixed(1)}%`}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Summary Tables - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CO Summary */}
            <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Course Outcomes (COs)</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse shadow-md">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-600 to-green-700">
                      <th className="px-4 py-4 text-left text-sm font-bold text-white border border-green-800">
                        CO
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-bold text-white border border-green-800">
                        % Above Pass Marks ({targetPassMarks}%)
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-bold text-white border border-green-800">
                        % Above KPI ({kpiCO}%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => {
                      const co = `CO${i + 1}`
                      const coData = calculations.coAttainment[co]
                      return (
                        <tr key={co} className="hover:bg-green-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800 border border-gray-300 bg-white">
                            {co}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-center border border-gray-300 bg-white ${
                              coData?.passMarksPercentage > 0 ? 'text-blue-700 font-bold' : 'text-gray-600'
                            }`}
                          >
                            {coData?.passMarksPercentage.toFixed(1) || 0.0}%
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-center border border-gray-300 ${
                              coData?.kpiPercentage > 0
                                ? 'bg-green-200 text-green-900 font-bold'
                                : 'bg-white text-gray-600'
                            }`}
                          >
                            {coData?.kpiPercentage.toFixed(1) || 0.0}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PO Summary */}
            <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">Program Outcomes (POs)</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse shadow-md">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-600 to-green-700">
                      <th className="px-4 py-4 text-left text-sm font-bold text-white border border-green-800">
                        PO
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-bold text-white border border-green-800">
                        % Above Pass Marks ({targetPassMarks}%)
                      </th>
                      <th className="px-4 py-4 text-center text-sm font-bold text-white border border-green-800">
                        % Above KPI ({kpiPO}%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => {
                      const po = `PO${i + 1}`
                      const poData = calculations.poAttainment[po]
                      return (
                        <tr key={po} className="hover:bg-green-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800 border border-gray-300 bg-white">
                            {po}
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-center border border-gray-300 bg-white ${
                              poData?.passMarksPercentage > 0 ? 'text-blue-700 font-bold' : 'text-gray-600'
                            }`}
                          >
                            {poData?.passMarksPercentage.toFixed(1) || 0.0}%
                          </td>
                          <td
                            className={`px-4 py-3 text-sm text-center border border-gray-300 ${
                              poData?.kpiPercentage > 0
                                ? 'bg-green-200 text-green-900 font-bold'
                                : 'bg-white text-gray-600'
                            }`}
                          >
                            {poData?.kpiPercentage.toFixed(1) || 0.0}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === 'individual' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
            <label className="block text-sm font-semibold text-green-700 mb-2">
              Select Student
            </label>
            <select
              onChange={(e) => {
                const studentId = e.target.value
                if (studentId) {
                  setSelectedStudents([studentId])
                }
              }}
              className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-700 font-medium"
            >
              <option value="">Select a student...</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.id} - {student.name}
                </option>
              ))}
            </select>
          </div>

          {selectedStudents.length > 0 && (
            <>
              {selectedStudents.map((studentId) => {
                const student = students.find((s) => s.id === studentId)
                const coData = getStudentCOData(studentId)
                const poData = getStudentPOData(studentId)
                
                return (
                  <div key={studentId} className="space-y-6">
                    <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent mb-4">
                        {student.name} ({student.id})
                      </h2>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div id={`co-pie-${studentId}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xl font-semibold text-gray-700">CO Attainment</h3>
                            <button
                              onClick={() => downloadChartAsJPG(`co-pie-${studentId}`, `CO_Attainment_${student.name.replace(/\s+/g, '_')}`)}
                              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-md"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                          <div>
                            <ResponsiveContainer width="100%" height={450}>
                              <PieChart>
                                <Pie
                                  data={coData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="45%"
                                  outerRadius={80}
                                  label={(entry) => `${entry.value.toFixed(1)}`}
                                >
                                  {coData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${parseFloat(value).toFixed(1)}%`} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        <div id={`po-radar-${studentId}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xl font-semibold text-gray-700">PO Attainment</h3>
                            <button
                              onClick={() => downloadChartAsJPG(`po-radar-${studentId}`, `PO_Attainment_${student.name.replace(/\s+/g, '_')}`)}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                          <div>
                            <ResponsiveContainer width="100%" height={350}>
                              <RadarChart data={poData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="name" />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                <Radar
                                  name="PO Attainment"
                                  dataKey="value"
                                  stroke="#4f46e5"
                                  fill="#4f46e5"
                                  fillOpacity={0.6}
                                />
                                <Tooltip />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {viewMode === 'compare' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
            <label className="block text-sm font-semibold text-green-700 mb-2">
              Select Students to Compare (Multiple Selection)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border-2 border-green-200 rounded-xl p-4 bg-white/50">
              {students.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-2 p-2 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents([...selectedStudents, student.id])
                      } else {
                        setSelectedStudents(selectedStudents.filter((id) => id !== student.id))
                      }
                    }}
                    className="rounded text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    {student.id} - {student.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {selectedStudents.length > 0 && (
            <div className="space-y-6">
              <div id="comparison-line-chart" className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
                    Student Comparison - Line Chart
                  </h2>
                  <button
                    onClick={() => downloadChartAsJPG('comparison-line-chart', 'Student_Comparison_Line')}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-md"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={getComparisonData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      {selectedStudents.map((studentId, index) => {
                        const student = students.find((s) => s.id === studentId)
                        const color = COLORS[index % COLORS.length]
                        return (
                          <linearGradient key={`lineGradient-${studentId}`} id={`lineGradient-${studentId}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                            <stop offset="100%" stopColor={color} stopOpacity={1}/>
                          </linearGradient>
                        )
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                      axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                      axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                      label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold' } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '2px solid #1a5f3f',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value) => `${parseFloat(value).toFixed(1)}%`}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                    {selectedStudents.map((studentId, index) => {
                      const student = students.find((s) => s.id === studentId)
                      return (
                        <Line
                          key={studentId}
                          type="monotone"
                          dataKey={student.name}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={3}
                          dot={{ fill: COLORS[index % COLORS.length], r: 5, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 7 }}
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
                </div>
              </div>

              <div id="comparison-area-chart" className="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                    Student Comparison - Area Chart
                  </h2>
                  <button
                    onClick={() => downloadChartAsJPG('comparison-area-chart', 'Student_Comparison_Area')}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={getComparisonData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      {selectedStudents.map((studentId, index) => {
                        const color = COLORS[index % COLORS.length]
                        return (
                          <linearGradient key={`areaGradient-${studentId}`} id={`areaGradient-${studentId}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                          </linearGradient>
                        )
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                      axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: '#1a5f3f', fontWeight: 'bold' }}
                      axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }}
                      label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold' } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '2px solid #1a5f3f',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value) => `${parseFloat(value).toFixed(1)}%`}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                    {selectedStudents.map((studentId, index) => {
                      const student = students.find((s) => s.id === studentId)
                      return (
                        <Area
                          key={studentId}
                          type="monotone"
                          dataKey={student.name}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          fill={`url(#areaGradient-${studentId})`}
                          fillOpacity={0.6}
                        />
                      )
                    })}
                  </AreaChart>
                </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'allDetails' && (
        <div className="space-y-6">
          {/* CO Mark Allocations and COs to POs Mapping - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CO Mark Allocations */}
            <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent mb-4">
                Marks Allocations for Different COs
              </h2>
              <div className="flex justify-center">
                <div className="overflow-x-auto max-w-md">
                  <table className="w-full border-collapse shadow-md">
                    <thead>
                      <tr className="bg-gradient-to-r from-green-600 to-green-700">
                        <th className="px-6 py-4 text-center text-sm font-bold text-white border border-green-800">
                          CO
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-white border border-green-800">
                          Total Marks
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 12 }, (_, i) => {
                        const co = `CO${i + 1}`
                        const totalMarks = getCOMarkAllocations(assessments)[co] || 0
                        return (
                          <tr key={co} className="hover:bg-green-50 transition-colors">
                            <td className="px-6 py-3 text-sm font-semibold text-gray-800 border border-gray-300 text-center bg-white">
                              {co}
                            </td>
                            <td className="px-6 py-3 text-sm text-center text-gray-700 border border-gray-300 bg-white font-medium">
                              {totalMarks}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* COs to POs Mapping Table */}
            <div className="bg-gradient-to-br from-white to-purple-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-purple-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent mb-4">
                COs to POs Mapping
              </h2>
              <div className="overflow-x-auto">
                <table className="border-collapse shadow-md mx-auto">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-600 to-purple-700">
                      <th className="px-4 py-4 text-center text-sm font-bold text-white border border-purple-800">
                        CO
                      </th>
                      {Array.from({ length: 12 }, (_, i) => (
                        <th
                          key={`PO${i + 1}`}
                          className="px-2 py-4 text-center text-xs font-bold text-white border border-purple-800"
                        >
                          PO{i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => {
                      const co = `CO${i + 1}`
                      return (
                        <tr key={co} className="hover:bg-purple-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-gray-800 border border-gray-300 bg-white text-center">
                            {co}
                          </td>
                          {Array.from({ length: 12 }, (_, j) => {
                            const po = `PO${j + 1}`
                            const isMapped = coMapping?.[co]?.[po] === 1 || coMapping?.[co]?.[po] === '1'
                            return (
                              <td
                                key={po}
                                className={`px-2 py-3 text-sm text-center border border-gray-300 ${
                                  isMapped
                                    ? 'bg-green-200 text-green-800 font-bold'
                                    : 'bg-gray-50 text-gray-400'
                                }`}
                              >
                                {isMapped ? '✓' : '-'}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Questions to COs Mapping Table */}
          <div className="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-blue-100">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent mb-4">
              Questions to COs Mapping
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse shadow-md">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
                    <th className="px-6 py-4 text-left text-sm font-bold text-white border border-blue-800">
                      Question
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white border border-blue-800">
                      Assessment Type
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white border border-blue-800">
                      CO
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white border border-blue-800">
                      Total Marks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allQuestions = []
                    assessments.cts.forEach(a => allQuestions.push({ ...a, type: 'Class Test' }))
                    assessments.midTerm.forEach(a => allQuestions.push({ ...a, type: 'Mid Term' }))
                    assessments.final.forEach(a => allQuestions.push({ ...a, type: 'Final' }))
                    assessments.assignments.forEach(a => allQuestions.push({ ...a, type: 'Assignment' }))
                    if (assessments.attendance) allQuestions.push({ ...assessments.attendance, name: 'Attendance', type: 'Attendance' })
                    if (assessments.performance) {
                      // Ensure Performance is assigned to CO2
                      const performanceCO = assessments.performance.co || 'CO2'
                      allQuestions.push({ ...assessments.performance, name: 'Performance', type: 'Performance', co: performanceCO })
                    }
                    
                    return allQuestions.map((q, idx) => (
                      <tr key={`${q.type}_${q.name}_${idx}`} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-3 text-sm font-semibold text-gray-800 border border-gray-300 bg-white">
                          {q.name}
                        </td>
                        <td className="px-6 py-3 text-sm text-center text-gray-700 border border-gray-300 bg-white">
                          {q.type}
                        </td>
                        <td className="px-6 py-3 text-sm text-center text-gray-700 border border-gray-300 bg-white font-medium">
                          {q.co || 'N/A'}
                        </td>
                        <td className="px-6 py-3 text-sm text-center text-gray-700 border border-gray-300 bg-white font-medium">
                          {q.maxMarks || 0}
                        </td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Marks Table */}
          <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent mb-4">
              Assessment Marks Obtained by the Students
            </h2>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gradient-to-r from-green-100 to-green-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 sticky left-0 bg-gradient-to-r from-green-100 to-green-50 z-20">
                      No.
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 sticky left-[60px] bg-gradient-to-r from-green-100 to-green-50 z-20">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 sticky left-[180px] bg-gradient-to-r from-green-100 to-green-50 z-20 min-w-[200px]">
                      Name
                    </th>
                    {(() => {
                      const allAssessments = []
                      assessments.cts.forEach(a => allAssessments.push({ ...a, type: 'cts' }))
                      assessments.midTerm.forEach(a => allAssessments.push({ ...a, type: 'midTerm' }))
                      assessments.final.forEach(a => allAssessments.push({ ...a, type: 'final' }))
                      assessments.assignments.forEach(a => allAssessments.push({ ...a, type: 'assignments' }))
                      if (assessments.attendance) allAssessments.push({ ...assessments.attendance, name: 'Attendance', type: 'attendance' })
                      if (assessments.performance) {
                        // Ensure Performance is assigned to CO2
                        const performanceCO = assessments.performance.co || 'CO2'
                        allAssessments.push({ ...assessments.performance, name: 'Performance', type: 'performance', co: performanceCO })
                      }
                      return allAssessments.map((a, idx) => (
                        <th
                          key={`${a.type}_${a.name}`}
                          className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 min-w-[100px]"
                        >
                          <div className="text-center">{a.name}</div>
                          <div className="text-xs text-gray-500 text-center">({a.co || ''})</div>
                        </th>
                      ))
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const allAssessments = []
                    assessments.cts.forEach(a => allAssessments.push({ ...a, type: 'cts' }))
                    assessments.midTerm.forEach(a => allAssessments.push({ ...a, type: 'midTerm' }))
                    assessments.final.forEach(a => allAssessments.push({ ...a, type: 'final' }))
                    assessments.assignments.forEach(a => allAssessments.push({ ...a, type: 'assignments' }))
                    if (assessments.attendance) allAssessments.push({ ...assessments.attendance, name: 'Attendance', type: 'attendance' })
                    if (assessments.performance) {
                      // Ensure Performance is assigned to CO2
                      const performanceCO = assessments.performance.co || 'CO2'
                      allAssessments.push({ ...assessments.performance, name: 'Performance', type: 'performance', co: performanceCO })
                    }
                    
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium border border-gray-200 sticky left-0 bg-white z-10">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border border-gray-200 sticky left-[60px] bg-white z-10">
                          {student.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border border-gray-200 sticky left-[180px] bg-white z-10">
                          {student.name}
                        </td>
                        {allAssessments.map((a) => {
                          const key = `${a.type}_${a.name}`
                          const mark = marks[student.id]?.[key] || 0
                          return (
                            <td key={key} className="px-4 py-3 text-sm text-center text-gray-700 border border-gray-200">
                              {mark}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Student CO and PO Calculations */}
          <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent mb-4">
              Calculations of COs & POs
            </h2>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gradient-to-r from-green-100 to-green-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border border-gray-200 sticky left-0 bg-gradient-to-r from-green-100 to-green-50 z-20">
                      Student ID
                    </th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th
                        key={`CO${i + 1}`}
                        className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 min-w-[80px]"
                      >
                        CO{i + 1}
                      </th>
                    ))}
                    {Array.from({ length: 12 }, (_, i) => (
                      <th
                        key={`PO${i + 1}`}
                        className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border border-gray-200 min-w-[80px]"
                      >
                        PO{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium border border-gray-200 sticky left-0 bg-white z-10">
                        {student.id}
                      </td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const co = `CO${i + 1}`
                        const value = calculations.studentCOs[student.id]?.[co] || 0
                        return (
                          <td
                            key={co}
                            className="px-4 py-3 text-sm text-center text-gray-700 border border-gray-200"
                          >
                            {value.toFixed(1)}
                          </td>
                        )
                      })}
                      {Array.from({ length: 12 }, (_, i) => {
                        const po = `PO${i + 1}`
                        const value = calculations.studentPOs[student.id]?.[po] || 0
                        return (
                          <td
                            key={po}
                            className="px-4 py-3 text-sm text-center text-gray-700 border border-gray-200"
                          >
                            {value > 0 ? value.toFixed(1) : '0.0'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComprehensiveReports

