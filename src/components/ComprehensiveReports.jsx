import React, { useState, Fragment } from 'react'
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
  ReferenceLine,
} from 'recharts'
import { Download, Users, TrendingUp, BookOpen, Target, FileText, Layout, Award } from 'lucide-react'
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
  const coMarkAllocations = getCOMarkAllocations(assessments)

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

  // Get individual student CO data (only COs with data)
  const getStudentCOData = (studentId) => {
    return Array.from({ length: 12 }, (_, i) => {
      const co = `CO${i + 1}`
      return {
        name: co,
        value: calculations.studentCOs[studentId]?.[co] || 0,
      }
    }).filter(d => d.value > 0)
  }

  // Get individual student PO data (only POs with data)
  const getStudentPOData = (studentId) => {
    return Array.from({ length: 12 }, (_, i) => {
      const po = `PO${i + 1}`
      return {
        name: po,
        value: calculations.studentPOs[studentId]?.[po] || 0,
      }
    }).filter(d => d.value > 0)
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
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            title="Download Report"
          >
            <Download size={20} />
            <span>Download Report</span>
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 border-b-2 border-green-200">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-6 py-3 font-semibold transition-all duration-300 rounded-t-lg ${viewMode === 'overview'
              ? 'border-b-4 border-green-600 text-green-700 bg-green-50'
              : 'text-gray-600 hover:text-green-600 hover:bg-green-50/50'
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-6 py-3 font-semibold transition-all duration-300 rounded-t-lg ${viewMode === 'individual'
              ? 'border-b-4 border-green-600 text-green-700 bg-green-50'
              : 'text-gray-600 hover:text-green-600 hover:bg-green-50/50'
              }`}
          >
            Individual Student
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-6 py-3 font-semibold transition-all duration-300 rounded-t-lg ${viewMode === 'compare'
              ? 'border-b-4 border-green-600 text-green-700 bg-green-50'
              : 'text-gray-600 hover:text-green-600 hover:bg-green-50/50'
              }`}
          >
            Compare Students
          </button>
        </div>
      </div>

      {
        viewMode === 'overview' && (
          <>
            {/* Row 1: CO Bar Chart (60%) + CO Student Distribution (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div id="co-attainment-chart" className="lg:col-span-3 bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">COURSE OUTCOMES (COs)</h2>
                  <button onClick={() => downloadChartAsJPG('co-attainment-chart', 'CO_Attainment')} className="flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md" title="Download chart"><Download size={16} /></button>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={coChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorPassMarks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightBlue} stopOpacity={0.9} />
                          <stop offset="95%" stopColor={UNIVERSITY_COLORS.accent} stopOpacity={0.9} />
                        </linearGradient>
                        <linearGradient id="colorKPI" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightGold} stopOpacity={0.9} />
                          <stop offset="95%" stopColor={UNIVERSITY_COLORS.secondary} stopOpacity={0.9} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} />
                      <YAxis domain={[0, 100]} ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]} tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold' } }} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #1a5f3f', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value) => [`${parseFloat(value).toFixed(1)}%`, '']} labelFormatter={(label) => `${label}`} />
                      <Bar dataKey={`Above Pass Marks (${targetPassMarks}%)`} fill="url(#colorPassMarks)" radius={[8, 8, 0, 0]} stroke={UNIVERSITY_COLORS.accent} strokeWidth={1} label={{ position: 'insideTop', fill: '#FFFFFF', fontSize: 10, fontWeight: 'bold', angle: -90, offset: 20, formatter: (v) => v > 0 ? `${parseFloat(v).toFixed(1)}%` : '' }} />
                      <Bar dataKey={`Above KPI (${kpiCO}%)`} fill="url(#colorKPI)" radius={[8, 8, 0, 0]} stroke={UNIVERSITY_COLORS.secondary} strokeWidth={1} label={{ position: 'insideTop', fill: '#000000', fontSize: 10, fontWeight: 'bold', angle: -90, offset: 20, formatter: (v) => v > 0 ? `${parseFloat(v).toFixed(1)}%` : '' }} />
                      <Legend wrapperStyle={{ paddingTop: '16px' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* CO Student Distribution - Stacked Bar Chart */}
              <div id="co-distribution-chart" className="lg:col-span-2 bg-gradient-to-br from-white to-orange-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-orange-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-orange-700 to-orange-500 bg-clip-text text-transparent">CO Student Distribution</h2>
                  <button onClick={() => downloadChartAsJPG('co-distribution-chart', 'CO_Distribution')} className="flex items-center justify-center p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-md" title="Download chart"><Download size={16} /></button>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={(() => { return Array.from({ length: 12 }, (_, i) => { const co = `CO${i + 1}`; let below40 = 0, between40_79 = 0, above80 = 0; const hasData = students.some(s => (calculations.studentCOs[s.id]?.[co] || 0) > 0); if (!hasData) return null; students.forEach(s => { const score = calculations.studentCOs[s.id]?.[co] || 0; if (score > 0 && score < 40) below40++; else if (score >= 40 && score < 80) between40_79++; else if (score >= 80) above80++; }); const total = students.length; return { name: co, 'Below 40%': Math.round((below40 / total) * 100), '40\u201379%': Math.round((between40_79 / total) * 100), '\u226580%': Math.round((above80 / total) * 100) }; }).filter(Boolean); })()} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 11 }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} />
                      <YAxis domain={[0, 100]} ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]} tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 10 }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} label={{ value: '% of Students', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold', fontSize: 11 } }} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #1a5f3f', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value) => `${Math.round(value)}%`} />
                      <Legend wrapperStyle={{ paddingTop: '12px' }} />
                      <Bar dataKey="Below 40%" stackId="a" fill="#ef4444" />
                      <Bar dataKey={'40\u201379%'} stackId="a" fill="#f59e0b" />
                      <Bar dataKey={'\u226580%'} stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Row 2: PO Bar Chart (60%) + PO Contribution Chart (40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div id="po-bar-chart" className="lg:col-span-3 bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">PROGRAM OUTCOMES (POs)</h2>
                  <button onClick={() => downloadChartAsJPG('po-bar-chart', 'PO_Attainment_Bar')} className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md" title="Download chart"><Download size={16} /></button>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={poChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorPOPassMarks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightBlue} stopOpacity={0.9} />
                          <stop offset="95%" stopColor={UNIVERSITY_COLORS.accent} stopOpacity={0.9} />
                        </linearGradient>
                        <linearGradient id="colorPOKPI" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={UNIVERSITY_COLORS.lightGold} stopOpacity={0.9} />
                          <stop offset="95%" stopColor={UNIVERSITY_COLORS.secondary} stopOpacity={0.9} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} />
                      <YAxis domain={[0, 100]} ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]} tick={{ fill: '#1a5f3f', fontWeight: 'bold' }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#1a5f3f', style: { fontWeight: 'bold' } }} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #1a5f3f', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value) => `${parseFloat(value).toFixed(1)}%`} labelFormatter={(label) => `${label}`} />
                      <Bar dataKey={`Above Pass Marks (${targetPassMarks}%)`} fill="url(#colorPOPassMarks)" radius={[8, 8, 0, 0]} stroke={UNIVERSITY_COLORS.accent} strokeWidth={1} label={{ position: 'insideTop', fill: '#FFFFFF', fontSize: 10, fontWeight: 'bold', angle: -90, offset: 20, formatter: (v) => v > 0 ? `${parseFloat(v).toFixed(1)}%` : '' }} />
                      <Bar dataKey={`Above KPI (${kpiPO}%)`} fill="url(#colorPOKPI)" radius={[8, 8, 0, 0]} stroke={UNIVERSITY_COLORS.secondary} strokeWidth={1} label={{ position: 'insideTop', fill: '#000000', fontSize: 10, fontWeight: 'bold', angle: -90, offset: 20, formatter: (v) => v > 0 ? `${parseFloat(v).toFixed(1)}%` : '' }} />
                      <Legend wrapperStyle={{ paddingTop: '16px' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* PO Contribution Chart - Grouped w/ Pass Marks & KPI */}
              <div id="po-contribution-chart" className="lg:col-span-2 bg-gradient-to-br from-white to-purple-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-purple-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent">PO Contribution from COs</h2>
                  <button onClick={() => downloadChartAsJPG('po-contribution-chart', 'PO_Contribution')} className="flex items-center justify-center p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md" title="Download chart"><Download size={16} /></button>
                </div>
                <div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart layout="vertical" barSize={20} data={(() => { const poData = []; for (let po = 1; po <= 12; po++) { const poKey = `PO${po}`; const entry = { name: poKey }; let hasCO = false; for (let co = 1; co <= 12; co++) { const coKey = `CO${co}`; if (coMapping?.[coKey]?.[poKey] === 1) { entry[`${coKey} (Pass)`] = calculations.coAttainment[coKey]?.passMarksPercentage || 0; entry[`${coKey} (KPI)`] = calculations.coAttainment[coKey]?.kpiPercentage || 0; hasCO = true; } } if (hasCO) poData.push(entry); } return poData; })()} margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis type="number" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 11 }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} label={{ value: 'Attainment (%)', position: 'insideBottom', offset: -2, fill: '#1a5f3f', style: { fontWeight: 'bold', fontSize: 12 } }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 12 }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} width={50} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #6b21a8', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} formatter={(value, name) => [`${parseFloat(value).toFixed(1)}%`, name]} />
                      <Legend wrapperStyle={{ paddingTop: '12px' }} />
                      {Array.from({ length: 12 }, (_, i) => { const coKey = `CO${i + 1}`; const hasMapping = Array.from({ length: 12 }, (_, j) => coMapping?.[coKey]?.[`PO${j + 1}`] === 1).some(Boolean); if (!hasMapping) return null; const baseColor = COLORS[i % COLORS.length]; return [<Bar key={`${coKey}-pass`} dataKey={`${coKey} (Pass)`} fill={baseColor} fillOpacity={0.5} radius={[0, 4, 4, 0]} stroke={baseColor} strokeWidth={1} />, <Bar key={`${coKey}-kpi`} dataKey={`${coKey} (KPI)`} fill={baseColor} radius={[0, 4, 4, 0]} />]; }).flat().filter(Boolean)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Summary Tables - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Course Outcomes (COs)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse shadow-md">
                    <thead>
                      <tr className="bg-gradient-to-r from-green-600 to-green-700">
                        <th className="px-4 py-4 text-left text-sm font-bold text-white border border-green-800">CO</th>
                        <th className="px-4 py-4 text-center text-sm font-bold text-white border border-green-800">% Above Pass Marks ({targetPassMarks}%)</th>
                        <th className="px-4 py-4 text-center text-sm font-bold text-white border border-green-800">% Above KPI ({kpiCO}%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 12 }, (_, i) => { const co = `CO${i + 1}`; const coData = calculations.coAttainment[co]; return (<tr key={co} className="hover:bg-green-50 transition-colors"><td className="px-4 py-3 text-sm font-semibold text-gray-800 border border-gray-300 bg-white">{co}</td><td className={`px-4 py-3 text-sm text-center border border-gray-300 ${coData?.passMarksPercentage > 0 ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-white text-gray-400'}`}>{(coData?.passMarksPercentage || 0).toFixed(1)}%</td><td className={`px-4 py-3 text-sm text-center border border-gray-300 ${coData?.kpiPercentage > 0 ? 'bg-green-200 text-green-900 font-bold' : 'bg-white text-gray-400'}`}>{(coData?.kpiPercentage || 0).toFixed(1)}%</td></tr>); })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Program Outcomes (POs)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse shadow-md">
                    <thead>
                      <tr className="bg-gradient-to-r from-green-600 to-green-700">
                        <th className="px-4 py-4 text-left text-sm font-bold text-white border border-green-800">PO</th>
                        <th className="px-4 py-4 text-center text-sm font-bold text-white border border-green-800">% Above Pass Marks ({targetPassMarks}%)</th>
                        <th className="px-4 py-4 text-center text-sm font-bold text-white border border-green-800">% Above KPI ({kpiPO}%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 12 }, (_, i) => { const po = `PO${i + 1}`; const poData = calculations.poAttainment[po]; return (<tr key={po} className="hover:bg-green-50 transition-colors"><td className="px-4 py-3 text-sm font-semibold text-gray-800 border border-gray-300 bg-white">{po}</td><td className={`px-4 py-3 text-sm text-center border border-gray-300 ${poData?.passMarksPercentage > 0 ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-white text-gray-400'}`}>{(poData?.passMarksPercentage || 0).toFixed(1)}%</td><td className={`px-4 py-3 text-sm text-center border border-gray-300 ${poData?.kpiPercentage > 0 ? 'bg-green-200 text-green-900 font-bold' : 'bg-white text-gray-400'}`}>{(poData?.kpiPercentage || 0).toFixed(1)}%</td></tr>); })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* CO Attainment Heatmap - Full Width */}
            <div id="co-heatmap-chart" className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">CO Attainment Heatmap</h2>

              </div>
              <div className={`overflow-x-hidden ${students.length > 20 ? 'max-h-[600px] overflow-y-auto' : ''}`}>
                <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-green-600 to-green-700">
                      <th className="px-2 py-2 text-white font-bold border border-green-800 sticky left-0 bg-green-700 z-20" style={{ width: '180px' }}>Student</th>
                      {Array.from({ length: 12 }, (_, i) => (<th key={`CO${i + 1}`} className="px-1 py-2 text-white font-bold border border-green-800">CO{i + 1}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-2 py-1.5 font-semibold text-gray-700 border border-gray-300 sticky left-0 bg-white z-10 whitespace-nowrap" style={{ width: '180px' }}>
                          {student.id}
                        </td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const co = `CO${i + 1}`;
                          const score = calculations.studentCOs[student.id]?.[co] || 0;
                          const hasData = coMarkAllocations[co] > 0;

                          let bgColor = 'bg-gray-100 text-gray-400';
                          if (hasData) {
                            if (score < targetPassMarks) bgColor = 'bg-red-400 text-white';
                            else if (score < kpiCO) bgColor = 'bg-yellow-300 text-gray-800';
                            else bgColor = 'bg-green-500 text-white';
                          }

                          return (
                            <td key={co} className={`px-1 py-1.5 text-center font-semibold border border-gray-200 ${bgColor}`}>
                              {hasData ? score.toFixed(1) : '0.0'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-4 justify-center mt-3 pt-3 border-t border-gray-200 text-xs font-semibold">
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-red-400"></div><span className="text-gray-600">{'<'} {targetPassMarks}% (Below Pass)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-yellow-300"></div><span className="text-gray-600">{targetPassMarks}%{'\u2013'}{kpiCO - 1}% (Between)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-green-500"></div><span className="text-gray-600">{'\u2265'} {kpiCO}% (KPI Met)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-gray-100 border"></div><span className="text-gray-600">No Data</span></div>
              </div>
            </div>
          </>
        )
      }

      {
        viewMode === 'individual' && (
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
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent mb-6">
                          {student.name} ({student.id})
                        </h2>

                        {/* Row 1: Horizontal Bar Charts with Threshold Lines */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                          {/* CO Horizontal Bar Chart */}
                          <div id={`student-co-bar-${studentId}`} className="bg-white rounded-xl shadow-md p-5 border border-green-100">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-bold text-green-700">CO Attainment</h3>
                              <button onClick={() => downloadChartAsJPG(`student-co-bar-${studentId}`, `CO_Bar_${student.id}`)} className="flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md" title="Download chart"><Download size={14} /></button>
                            </div>
                            <ResponsiveContainer width="100%" height={Math.max(200, coData.length * 40 + 60)}>
                              <BarChart layout="vertical" data={coData} margin={{ top: 40, right: 40, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                                <XAxis type="number" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fill: '#374151', fontSize: 11 }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#1a5f3f', fontWeight: 'bold', fontSize: 12 }} axisLine={{ stroke: '#1a5f3f', strokeWidth: 2 }} width={45} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #1a5f3f', borderRadius: '8px' }} formatter={(value) => [`${parseFloat(value).toFixed(1)}%`, 'Attainment']} />
                                <ReferenceLine x={targetPassMarks} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ value: `Pass ${targetPassMarks}%`, position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                                <ReferenceLine x={kpiCO} stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" label={{ value: `KPI ${kpiCO}%`, position: 'top', fill: '#22c55e', fontSize: 10, fontWeight: 'bold' }} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: 'insideRight', fill: '#FFFFFF', fontSize: 11, fontWeight: 'bold', offset: 10, formatter: (v) => `${v.toFixed(1)}%` }}>
                                  {coData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.value >= kpiCO ? '#22c55e' : entry.value >= targetPassMarks ? '#f59e0b' : '#ef4444'} />))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                            <div className="flex items-center gap-4 justify-center mt-2 text-xs font-semibold">
                              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500"></div><span className="text-gray-500">Below Pass</span></div>
                              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500"></div><span className="text-gray-500">Pass Mark</span></div>
                              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500"></div><span className="text-gray-500">KPI Met</span></div>
                            </div>
                          </div>

                          {/* PO Horizontal Bar Chart */}
                          <div id={`student-po-bar-${studentId}`} className="bg-white rounded-xl shadow-md p-5 border border-blue-100">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-bold text-blue-700">PO Attainment</h3>
                              <button onClick={() => downloadChartAsJPG(`student-po-bar-${studentId}`, `PO_Bar_${student.id}`)} className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md" title="Download chart"><Download size={14} /></button>
                            </div>
                            <ResponsiveContainer width="100%" height={Math.max(200, poData.length * 40 + 60)}>
                              <BarChart layout="vertical" data={poData} margin={{ top: 40, right: 40, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                                <XAxis type="number" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fill: '#374151', fontSize: 11 }} axisLine={{ stroke: '#2c5282', strokeWidth: 2 }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#2c5282', fontWeight: 'bold', fontSize: 12 }} axisLine={{ stroke: '#2c5282', strokeWidth: 2 }} width={45} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #2c5282', borderRadius: '8px' }} formatter={(value) => [`${parseFloat(value).toFixed(1)}%`, 'Attainment']} />
                                <ReferenceLine x={targetPassMarks} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ value: `Pass ${targetPassMarks}%`, position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                                <ReferenceLine x={kpiPO} stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" label={{ value: `KPI ${kpiPO}%`, position: 'top', fill: '#22c55e', fontSize: 10, fontWeight: 'bold' }} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: 'insideRight', fill: '#FFFFFF', fontSize: 11, fontWeight: 'bold', offset: 10, formatter: (v) => `${v.toFixed(1)}%` }}>
                                  {poData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.value >= kpiPO ? '#3b82f6' : entry.value >= targetPassMarks ? '#f59e0b' : '#ef4444'} />))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                            <div className="flex items-center gap-4 justify-center mt-2 text-xs font-semibold">
                              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500"></div><span className="text-gray-500">Below Pass</span></div>
                              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500"></div><span className="text-gray-500">Pass Mark</span></div>
                              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500"></div><span className="text-gray-500">KPI Met</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Pie Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* CO Pie Chart */}
                          <div id={`student-co-pie-${studentId}`} className="bg-white rounded-xl shadow-md p-5 border border-green-100">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-bold text-green-700">CO Distribution</h3>
                              <button onClick={() => downloadChartAsJPG(`student-co-pie-${studentId}`, `CO_Pie_${student.id}`)} className="flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md" title="Download chart"><Download size={14} /></button>
                            </div>
                            <ResponsiveContainer width="100%" height={350}>
                              <PieChart>
                                <Pie data={coData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} label={(entry) => `${entry.value.toFixed(1)}`}>
                                  {coData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                </Pie>
                                <Tooltip formatter={(value) => `${parseFloat(value).toFixed(1)}%`} />
                                <Legend wrapperStyle={{ paddingTop: '16px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* PO Pie Chart */}
                          <div id={`student-po-pie-${studentId}`} className="bg-white rounded-xl shadow-md p-5 border border-blue-100">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-bold text-blue-700">PO Distribution</h3>
                              <button onClick={() => downloadChartAsJPG(`student-po-pie-${studentId}`, `PO_Pie_${student.id}`)} className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md" title="Download chart"><Download size={14} /></button>
                            </div>
                            <ResponsiveContainer width="100%" height={350}>
                              <PieChart>
                                <Pie data={poData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} label={(entry) => `${entry.value.toFixed(1)}`}>
                                  {poData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />))}
                                </Pie>
                                <Tooltip formatter={(value) => `${parseFloat(value).toFixed(1)}%`} />
                                <Legend wrapperStyle={{ paddingTop: '16px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )
      }

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
                    className="flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                    title="Download chart"
                  >
                    <Download size={16} />
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
                              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                              <stop offset="100%" stopColor={color} stopOpacity={1} />
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
                        ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
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
                    className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    title="Download chart"
                  >
                    <Download size={16} />
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
                              <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                              <stop offset="95%" stopColor={color} stopOpacity={0.1} />
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
                        ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
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
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
            {/* CO Mark Allocations */}
            <div className="lg:col-span-4 bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent mb-4">
                Marks Allocations for Different COs
              </h2>
              <div className="flex justify-center">
                <div className="overflow-x-auto w-full">
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
            <div className="lg:col-span-6 bg-gradient-to-br from-white to-purple-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-purple-100">
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
                                className={`px-2 py-3 text-sm text-center border border-gray-300 ${isMapped
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
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-blue-500 bg-clip-text text-transparent mb-6 flex items-center gap-3">
              <Target className="w-7 h-7 text-indigo-600" />
              Questions to COs Mapping
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-indigo-100 shadow-xl bg-white/50 backdrop-blur-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white">
                    <th className="px-6 py-2 text-left text-xs font-bold uppercase tracking-wider border-b border-indigo-800 rounded-tl-2xl">
                      Assessment / Question
                    </th>
                    <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-indigo-800">
                      Mapped CO
                    </th>
                    <th className="px-6 py-2 text-center text-xs font-bold uppercase tracking-wider border-b border-indigo-800 rounded-tr-2xl">
                      Max Marks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50">
                  {(() => {
                    const categories = [
                      { id: 'cts', label: 'Class Tests (CT)', icon: <BookOpen className="w-4 h-4" />, items: assessments.cts, color: 'bg-indigo-50 text-indigo-700' },
                      { id: 'midTerm', label: 'Mid Term Examination', icon: <FileText className="w-4 h-4" />, items: assessments.midTerm, color: 'bg-blue-50 text-blue-700' },
                      { id: 'final', label: 'Term Final Examination', icon: <Layout className="w-4 h-4" />, items: assessments.final, color: 'bg-cyan-50 text-cyan-700' },
                      { id: 'assignments', label: 'Assignments', icon: <FileText className="w-4 h-4" />, items: assessments.assignments, color: 'bg-emerald-50 text-emerald-700' },
                      { id: 'others', label: 'Other Assessments', icon: <Award className="w-4 h-4" />, items: [] },
                    ]

                    // Handle other single-instance assessments
                    if (assessments.presentation) categories[4].items.push({ ...assessments.presentation, name: 'Presentation' });
                    if (assessments.attendance) categories[4].items.push({ ...assessments.attendance, name: 'Attendance' });
                    if (assessments.performance) {
                      const perfCO = assessments.performance.co || 'N/A';
                      categories[4].items.push({ ...assessments.performance, name: 'Performance', co: perfCO });
                    }

                    return categories.map(cat => {
                      if (cat.items.length === 0) return null;
                      return (
                        <React.Fragment key={cat.id}>
                          <tr className={`${cat.color} font-bold`}>
                            <td colSpan={3} className="px-6 py-1.5 text-sm flex items-center gap-2">
                              {cat.icon}
                              {cat.label}
                            </td>
                          </tr>
                          {cat.items.map((q, idx) => (
                            <tr key={`${cat.id}_${q.name}_${idx}`} className="hover:bg-indigo-50/30 transition-colors group">
                              <td className="px-10 py-1.5 text-sm font-medium text-gray-700 group-hover:text-indigo-700">
                                {q.name}
                              </td>
                              <td className="px-6 py-1.5 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  {q.co || 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-1.5 text-center text-sm font-bold text-gray-600">
                                {q.maxMarks || 0}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Marks Table */}
          <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent mb-4">
              Marks Obtained by the Students
            </h2>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-gray-200 rounded-xl shadow-inner bg-white">
              <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
                <thead className="sticky top-0 z-30">
                  {/* Row 1: Super-Group Headers */}
                  {(() => {
                    const assessmentCount =
                      assessments.cts.length +
                      (assessments.presentation ? 1 : 0) +
                      assessments.assignments.length +
                      (assessments.attendance ? 1 : 0) +
                      (assessments.performance ? 1 : 0);
                    const midCount = assessments.midTerm.length;
                    const finalCount = assessments.final.length;

                    return (
                      <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white text-sm uppercase tracking-wider">
                        <th colSpan={3} className="px-4 py-2 border border-green-900 sticky left-0 bg-green-700 z-40 text-left min-w-[370px] max-w-[370px]">
                          Student Information
                        </th>
                        {assessmentCount > 0 && (
                          <th colSpan={assessmentCount} className="px-4 py-2 border border-green-900 bg-green-800 text-center">
                            Assessment (60)
                          </th>
                        )}
                        {midCount > 0 && (
                          <th colSpan={midCount} className="px-4 py-2 border border-green-900 bg-green-700 text-center">
                            Mid Term (90)
                          </th>
                        )}
                        {finalCount > 0 && (
                          <th colSpan={finalCount} className="px-4 py-2 border border-green-900 bg-green-800 text-center">
                            Term Final (150)
                          </th>
                        )}
                      </tr>
                    )
                  })()}
                  {/* Row 2: Sub-headers */}
                  <tr className="bg-green-50 text-green-800 border-b border-gray-300">
                    <th className="px-2 py-3 text-left text-sm font-bold border border-gray-300 sticky left-0 bg-green-50 z-40 min-w-[50px] max-w-[50px] w-[50px]">
                      No.
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold border border-gray-300 sticky left-[50px] bg-green-50 z-40 min-w-[120px] max-w-[120px] w-[120px]">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold border border-gray-300 sticky left-[170px] bg-green-50 z-40 min-w-[200px] max-w-[200px] w-[200px]">
                      Name
                    </th>
                    {(() => {
                      const list = []
                      assessments.cts.forEach(a => list.push({ ...a, type: 'cts' }))
                      if (assessments.presentation) list.push({ ...assessments.presentation, name: 'Presentation', type: 'presentation' })
                      assessments.assignments.forEach(a => list.push({ ...a, type: 'assignments' }))
                      if (assessments.attendance) list.push({ ...assessments.attendance, name: 'Attendance', type: 'attendance' })
                      if (assessments.performance) list.push({ ...assessments.performance, name: 'Performance', type: 'performance' })
                      assessments.midTerm.forEach(a => list.push({ ...a, type: 'midTerm' }))
                      assessments.final.forEach(a => list.push({ ...a, type: 'final' }))

                      return list.map((a) => (
                        <th key={`${a.type}_${a.name}`} className="px-2 py-3 text-center text-sm font-bold border border-gray-300 min-w-[90px] bg-green-50">
                          <div>{a.name}</div>
                          {a.co && <div className="text-[10px] text-green-600 font-medium">({a.co})</div>}
                        </th>
                      ))
                    })()}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student, idx) => {
                    const list = []
                    assessments.cts.forEach(a => list.push({ ...a, type: 'cts' }))
                    if (assessments.presentation) list.push({ ...assessments.presentation, name: 'Presentation', type: 'presentation' })
                    assessments.assignments.forEach(a => list.push({ ...a, type: 'assignments' }))
                    if (assessments.attendance) list.push({ ...assessments.attendance, name: 'Attendance', type: 'attendance' })
                    if (assessments.performance) list.push({ ...assessments.performance, name: 'Performance', type: 'performance' })
                    assessments.midTerm.forEach(a => list.push({ ...a, type: 'midTerm' }))
                    assessments.final.forEach(a => list.push({ ...a, type: 'final' }))

                    return (
                      <tr key={student.id} className="hover:bg-green-50/50 transition-colors group">
                        <td className="px-2 py-2 text-sm text-gray-700 font-medium border border-gray-200 sticky left-0 bg-white group-hover:bg-green-50/50 z-20 min-w-[50px] max-w-[50px] w-[50px] text-center">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 font-bold border border-gray-200 sticky left-[50px] bg-white group-hover:bg-green-50/50 z-20 min-w-[120px] max-w-[120px] w-[120px]">
                          {student.id}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 border border-gray-200 sticky left-[170px] bg-white group-hover:bg-green-50/50 z-20 min-w-[200px] max-w-[200px] w-[200px] whitespace-nowrap overflow-hidden text-ellipsis shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          {student.name}
                        </td>
                        {list.map((a) => {
                          const key = `${a.type}_${a.name}`
                          const mark = marks[student.id]?.[key] || 0
                          return (
                            <td key={key} className="px-2 py-2 text-sm text-center text-gray-700 border border-gray-200 bg-white">
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


        </div>
      )}
    </div>
  )
}

export default ComprehensiveReports

