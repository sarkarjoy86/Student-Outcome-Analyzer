import { useState, useEffect, useRef } from 'react'
import { apiService } from '../../services/apiService'
import { 
  ArrowLeft, FileText, Loader2, Download, Search, 
  MessageSquare, User, Check, Eye, HelpCircle, Printer
} from 'lucide-react'
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts'

const RATING_COLORS = ['#059669', '#10b981', '#f59e0b', '#f97316', '#ef4444']
const RATING_LABELS = ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor']
const SCALE_POINTS = [5, 4, 3, 2, 1]

export default function EvaluationAnalytics({ evaluationId, onBack }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Selected student response modal state
  const [selectedResponse, setSelectedResponse] = useState(null)

  useEffect(() => {
    loadAnalytics()
  }, [evaluationId])

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiService.getEvaluationAnalytics(evaluationId)
      setData(res)
    } catch (err) {
      console.error(err)
      setError('Failed to load evaluation analytics.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <Loader2 className="animate-spin text-emerald-600 mb-2 inline-block" size={40} />
        <p className="text-gray-500 font-semibold">Generating analytics...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 font-semibold text-sm">
        {error || 'Data could not be loaded.'}
        <button onClick={onBack} className="block mt-2 text-xs underline font-bold">Go Back</button>
      </div>
    )
  }

  const { evaluation, responses, totalStudents } = data
  const offering = evaluation.courseOfferingId
  const course = offering?.course
  const teacher = offering?.teacher
  const semester = offering?.semester

  const totalResponses = responses.length
  const responseRate = totalStudents > 0 ? ((totalResponses / totalStudents) * 100).toFixed(1) : '0.0'
  const pendingResponses = Math.max(0, totalStudents - totalResponses)

  // 1. Calculate overall metrics
  let totalRatingSum = 0
  let totalRatingCount = 0
  
  // Distribution of all ratings
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  
  // Question-wise scores
  const questionScores = evaluation.questions.map((q, idx) => {
    return {
      text: q.text,
      index: idx + 1,
      sum: 0,
      count: 0,
      dist: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    }
  })

  responses.forEach(resp => {
    evaluation.questions.forEach((q, idx) => {
      // Find rating for this question index/order
      const rating = resp.ratings.get ? resp.ratings.get(String(idx)) : resp.ratings[String(idx)]
      if (rating !== undefined && rating !== null) {
        const val = Number(rating)
        totalRatingSum += val
        totalRatingCount++
        ratingCounts[val] = (ratingCounts[val] || 0) + 1
        
        questionScores[idx].sum += val
        questionScores[idx].count++
        questionScores[idx].dist[val] = (questionScores[idx].dist[val] || 0) + 1
      }
    })
  })

  const averageRating = totalRatingCount > 0 ? (totalRatingSum / totalRatingCount).toFixed(2) : '0.00'
  // Overall Satisfaction (e.g. Percentage of ratings >= 4)
  const positiveRatingsCount = ratingCounts[5] + ratingCounts[4]
  const overallSatisfaction = totalRatingCount > 0 ? ((positiveRatingsCount / totalRatingCount) * 100).toFixed(1) : '0.0'

  // 2. Prepare charts data
  // Rating distribution Pie chart
  const pieChartData = RATING_LABELS.map((label, idx) => {
    const val = SCALE_POINTS[idx]
    return {
      name: label,
      value: ratingCounts[val] || 0
    }
  })

  // Average score per question Bar chart
  const barChartData = questionScores.map(qs => ({
    name: `Q${qs.index}`,
    Score: qs.count > 0 ? Number((qs.sum / qs.count).toFixed(2)) : 0,
    fullText: qs.text
  }))

  // Timeline Line chart
  const timelineDataMap = {}
  responses.forEach(resp => {
    const dateStr = new Date(resp.submittedAt).toLocaleDateString()
    timelineDataMap[dateStr] = (timelineDataMap[dateStr] || 0) + 1
  })
  const lineChartData = Object.keys(timelineDataMap).map(date => ({
    date,
    Submissions: timelineDataMap[date]
  })).sort((a,b) => new Date(a.date) - new Date(b.date))

  // Completion Donut chart
  const donutChartData = [
    { name: 'Completed', value: totalResponses, color: '#10b981' },
    { name: 'Pending', value: pendingResponses, color: '#e2e8f0' }
  ]

  // Radar chart of average attributes
  const radarChartData = questionScores.map(qs => ({
    subject: `Q${qs.index}`,
    Score: qs.count > 0 ? Number((qs.sum / qs.count).toFixed(2)) : 0,
    fullMark: 5
  }))

  // 3. Smart Comments / Suggestions analysis
  // Collect comments
  const learnedComments = responses.map(r => r.comments?.learned).filter(Boolean)
  const improvedComments = responses.map(r => r.comments?.improved).filter(Boolean)
  const suggestionsComments = responses.map(r => r.comments?.suggestions).filter(Boolean)

  const extractCommonKeywords = (commentList) => {
    const stopWords = new Set(['the', 'and', 'a', 'to', 'of', 'in', 'is', 'it', 'for', 'this', 'that', 'with', 'on', 'was', 'as', 'but', 'are', 'be', 'should', 'more', 'have', 'very', 'were'])
    const freq = {}
    commentList.forEach(c => {
      const words = c.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/)
      words.forEach(w => {
        if (w.length > 3 && !stopWords.has(w)) {
          freq[w] = (freq[w] || 0) + 1
        }
      })
    })
    return Object.keys(freq)
      .map(word => ({ word, count: freq[word] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  const commonLearned = extractCommonKeywords(learnedComments)
  const commonImproved = extractCommonKeywords(improvedComments)
  const commonSuggestions = extractCommonKeywords(suggestionsComments)

  // Filter individual responses by search term
  const filteredResponses = responses.filter(r => {
    const sId = r.studentId?.studentId || ''
    const email = r.email || ''
    const sName = r.studentName || ''
    const matchStr = `${sId} ${email} ${sName}`.toLowerCase()
    return matchStr.includes(searchTerm.toLowerCase())
  })

  // 4. Professional Word Report Downloader
  const handleDownloadWordReport = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' ` +
      `xmlns:w='urn:schemas-microsoft-com:office:word' ` +
      `xmlns='http://www.w3.org/TR/REC-html40'>` +
      `<head><title>Course Evaluation Report</title><style>` +
      `body { font-family: 'Times New Roman', Times, serif; padding: 24px; font-size: 11pt; line-height: 1.5; color: #333333; }` +
      `h1 { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 5px; color: #111827; }` +
      `h2 { font-size: 13pt; font-weight: bold; border-bottom: 2px solid #059669; padding-bottom: 3px; margin-top: 25px; margin-bottom: 10px; color: #0f766e; }` +
      `h3 { font-size: 11pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; color: #374151; }` +
      `table { border-collapse: collapse; width: 100%; margin: 15px 0; }` +
      `th { border: 1px solid #999999; padding: 8px; text-align: left; background-color: #f3f4f6; font-weight: bold; font-size: 10pt; }` +
      `td { border: 1px solid #999999; padding: 8px; text-align: left; font-size: 10pt; }` +
      `.summary-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; margin-bottom: 15px; border-radius: 6px; }` +
      `.summary-box p { margin: 4px 0; }` +
      `.signature-section { margin-top: 50px; width: 100%; }` +
      `.signature-table { border: none !important; width: 100%; }` +
      `.signature-table td { border: none !important; padding: 20px 0; text-align: center; width: 50%; }` +
      `ol, ul { margin-top: 5px; padding-left: 20px; }` +
      `li { margin-bottom: 5px; }` +
      `</style></head><body>`
    
    const footer = `</body></html>`

    // Generate Question Details rows
    const tableRows = questionScores.map(qs => {
      const avg = qs.count > 0 ? (qs.sum / qs.count).toFixed(2) : '0.00'
      const distPct = {}
      SCALE_POINTS.forEach(val => {
        const count = qs.dist[val] || 0
        distPct[val] = qs.count > 0 ? ((count / qs.count) * 100).toFixed(1) : '0.0'
      })

      // Interpret rating value
      let interpretation = 'Average'
      const numAvg = Number(avg)
      if (numAvg >= 4.5) interpretation = 'Excellent'
      else if (numAvg >= 4.0) interpretation = 'Good'
      else if (numAvg >= 3.0) interpretation = 'Average'
      else if (numAvg >= 2.0) interpretation = 'Poor'
      else interpretation = 'Very Poor'

      return `<tr>
        <td>Q${qs.index}</td>
        <td>${qs.text}</td>
        <td>${distPct[5]}%</td>
        <td>${distPct[4]}%</td>
        <td>${distPct[3]}%</td>
        <td>${distPct[2]}%</td>
        <td>${distPct[1]}%</td>
        <td style="font-weight: bold; background-color: #f9fafb;">${avg}</td>
        <td>${interpretation}</td>
      </tr>`
    }).join('')

    // Generate Comments Lists
    const listComments = (comments) => {
      if (comments.length === 0) return '<li>No comments provided</li>'
      return comments.map(c => `<li>${c}</li>`).join('')
    }

    const htmlContent = `
      <h1>DEPARTMENT OF ${course?.department?.toUpperCase() || 'COMPUTER SCIENCE & ENGINEERING'}</h1>
      <p style="text-align: center; font-size: 10pt; margin-top: 0; color: #4b5563;">OBE Course Evaluation & Feedback Report</p>
      <hr style="border: 0; border-top: 2px solid #e5e7eb; margin: 10px 0;" />

      <h2>I. Course & Instructor Information</h2>
      <table>
        <tr>
          <td style="font-weight: bold; width: 25%; background-color: #f9fafb;">Course Code/Name:</td>
          <td>${course?.courseCode} — ${course?.courseName}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f9fafb;">Course Instructor:</td>
          <td>${teacher?.fullName || 'N/A'}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f9fafb;">Batch & Section:</td>
          <td>Batch ${offering?.batch?.name} • Section ${offering?.section}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f9fafb;">Academic Semester:</td>
          <td>${semester?.semesterName} (${offering?.academicYear})</td>
        </tr>
      </table>

      <h2>II. Executive Summary</h2>
      <div class="summary-box">
        <p><b>Total Students Enrolled:</b> ${totalStudents}</p>
        <p><b>Total Feedback Submissions:</b> ${totalResponses} / ${totalStudents} (${responseRate}%)</p>
        <p><b>Overall Course Quality Score:</b> ${averageRating} / 5.00</p>
        <p><b>Overall Course Satisfaction Meter:</b> ${overallSatisfaction}%</p>
      </div>

      <h2>III. Questions-wise Evaluation Ratings</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 6%;">No.</th>
            <th style="width: 44%;">Evaluation Attribute (Question)</th>
            <th style="width: 8%;">Excellent</th>
            <th style="width: 8%;">Good</th>
            <th style="width: 8%;">Average</th>
            <th style="width: 8%;">Poor</th>
            <th style="width: 8%;">V. Poor</th>
            <th style="width: 10%;">Mean</th>
            <th style="width: 10%;">Result</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <h2>IV. Open-ended Comments & Feedback Analysis</h2>
      
      <h3>1. What did you learn from this course?</h3>
      <ul>
        ${listComments(learnedComments.slice(0, 15))}
      </ul>

      <h3>2. What aspects of the course can be improved?</h3>
      <ul>
        ${listComments(improvedComments.slice(0, 15))}
      </ul>

      <h3>3. Additional suggestions / remarks:</h3>
      <ul>
        ${listComments(suggestionsComments.slice(0, 15))}
      </ul>

      <h2>V. Reflection, Action Plan, & Endorsements</h2>
      <p style="color: #6b7280; font-style: italic; margin-bottom: 25px;">
        To be filled by the instructor to address any issues raised in Section IV:
      </p>
      <div style="border: 1px dashed #d1d5db; height: 100px; padding: 10px; margin-bottom: 20px; background-color: #fafafa;">
        Instructor Reflection & Planned Actions:
      </div>

      <div class="signature-section">
        <table class="signature-table">
          <tr>
            <td>
              <p>_____________________________________</p>
              <p><b>Course Instructor Signature</b></p>
              <p>Date: ____/____/________</p>
            </td>
            <td>
              <p>_____________________________________</p>
              <p><b>Head of Department Signature</b></p>
              <p>Date: ____/____/________</p>
            </td>
          </tr>
        </table>
      </div>
    `

    const blob = new Blob(['\ufeff' + header + htmlContent + footer], {
      type: 'application/msword'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Course_Evaluation_${course?.courseCode || 'Report'}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          /* Hide interactive components */
          aside,
          header,
          nav,
          .no-print,
          .profile-avatar-container,
          .profile-avatar-btn,
          .profile-dropdown-wrapper,
          button,
          select,
          input {
            display: none !important;
          }
          
          /* Full page layout reset */
          body, html {
            background: white !important;
            color: black !important;
            padding: 10px !important;
            margin: 0 !important;
            font-size: 11px !important;
          }
          
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Cards printing styling */
          .bg-white {
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            margin-bottom: 20px !important;
          }
          
          /* Grid structure layout for printing - using flex to prevent overlap */
          .grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
            width: 100% !important;
          }
          .grid > div {
            width: 100% !important;
            margin-bottom: 0 !important;
            page-break-inside: avoid !important;
          }
          
          /* Force charts wrappers to maintain clean, non-zero height constraints */
          .h-64 {
            height: 280px !important;
            min-height: 280px !important;
            display: block !important;
            position: relative !important;
          }
          
          /* Ensure SVGs inside Recharts render perfectly without overflow */
          .recharts-responsive-container {
            height: 100% !important;
            min-height: 260px !important;
            page-break-inside: avoid !important;
          }
          .recharts-surface {
            max-width: 100% !important;
            max-height: 100% !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="no-print p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Survey Analytics</h2>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-0.5">
              {course?.courseCode} • {course?.courseName} • Section {offering?.section}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm text-sm"
          >
            <Printer size={16} />
            Print Report
          </button>
          <button
            onClick={handleDownloadWordReport}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm text-sm"
          >
            <Download size={16} />
            Download Word Report
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Responses</p>
          <p className="text-2xl font-black text-gray-800">
            {totalResponses} <span className="text-xs font-semibold text-gray-400">/ {totalStudents}</span>
          </p>
          <p className="text-[10px] text-emerald-600 font-bold">
            {responseRate}% Submission Rate
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Average Rating</p>
          <p className="text-2xl font-black text-gray-800">{averageRating} <span className="text-xs font-semibold text-gray-400">/ 5.0</span></p>
          <p className="text-[10px] text-gray-400 font-bold">Overall mean score</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Course Satisfaction</p>
          <p className="text-2xl font-black text-emerald-600">{overallSatisfaction}%</p>
          <p className="text-[10px] text-gray-400 font-bold">Ratings of Excellent or Good</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Feedback</p>
          <p className="text-2xl font-black text-amber-500">{pendingResponses}</p>
          <p className="text-[10px] text-gray-400 font-bold">Students yet to submit</p>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart: Rating Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">Overall Rating Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            {totalResponses > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RATING_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} ratings`, 'Count']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 italic">No ratings data yet.</p>
            )}
          </div>
        </div>

        {/* Bar Chart: Average Rating per Question */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">Average Rating per Question</h3>
          <div className="h-64">
            {totalResponses > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis type="number" domain={[0, 5]} stroke="#9ca3af" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} width={30} />
                  <Tooltip formatter={(value) => [`${value} / 5.0`, 'Average Rating']} />
                  <Bar dataKey="Score" radius={[0, 4, 4, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Score >= 4.0 ? '#10b981' : entry.Score >= 3.0 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 italic flex items-center justify-center h-full">No score data yet.</p>
            )}
          </div>
        </div>

        {/* Radar Chart: Attribute Comparison */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">Course Attribute Strengths</h3>
          <div className="h-64 flex items-center justify-center">
            {totalResponses > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" stroke="#6b7280" fontSize={11} />
                  <Radar name="Score" dataKey="Score" stroke="#059669" fill="#10b981" fillOpacity={0.4} />
                  <Tooltip formatter={(value) => [value, 'Rating']} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 italic">No comparative data yet.</p>
            )}
          </div>
        </div>

        {/* Timeline Chart: Responses trend */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">Submission Trend</h3>
          <div className="h-64">
            {totalResponses > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Submissions" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 italic flex items-center justify-center h-full">No trend data yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Heat Map / Question Breakdown Table Grid */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">Question Breakdown Grid</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-gray-700">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                <th className="px-4 py-3">Question Text</th>
                <th className="px-4 py-3 text-center">Excellent (5)</th>
                <th className="px-4 py-3 text-center">Good (4)</th>
                <th className="px-4 py-3 text-center">Average (3)</th>
                <th className="px-4 py-3 text-center">Poor (2)</th>
                <th className="px-4 py-3 text-center">Very Poor (1)</th>
                <th className="px-4 py-3 text-center">Mean</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questionScores.map((qs) => {
                const avg = qs.count > 0 ? (qs.sum / qs.count).toFixed(2) : '0.00'
                const distPct = {}
                SCALE_POINTS.forEach(val => {
                  const count = qs.dist[val] || 0
                  distPct[val] = qs.count > 0 ? ((count / qs.count) * 100).toFixed(0) : '0'
                })

                return (
                  <tr key={qs.index} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-bold text-gray-800 max-w-sm">
                      {qs.index}. {qs.text}
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-700 bg-emerald-50/20">{distPct[5]}%</td>
                    <td className="px-4 py-3 text-center text-teal-700 bg-teal-50/20">{distPct[4]}%</td>
                    <td className="px-4 py-3 text-center text-amber-700 bg-amber-50/20">{distPct[3]}%</td>
                    <td className="px-4 py-3 text-center text-orange-700 bg-orange-50/20">{distPct[2]}%</td>
                    <td className="px-4 py-3 text-center text-red-700 bg-red-50/20">{distPct[1]}%</td>
                    <td className="px-4 py-3 text-center font-black bg-gray-50 text-sm">{avg}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Smart Keyword Suggestion Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Learned */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <MessageSquare size={16} className="text-emerald-600" />
            Top Learning Outcomes
          </h3>
          <div className="space-y-2">
            {commonLearned.length > 0 ? commonLearned.map((kw, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold border border-gray-150">
                <span className="text-gray-700">"{kw.word}"</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">{kw.count} mentions</span>
              </div>
            )) : (
              <p className="text-xs text-gray-400 italic">No learning comments analysed.</p>
            )}
          </div>
        </div>

        {/* Improved */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <MessageSquare size={16} className="text-orange-500" />
            Areas for Improvement
          </h3>
          <div className="space-y-2">
            {commonImproved.length > 0 ? commonImproved.map((kw, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold border border-gray-150">
                <span className="text-gray-700">"{kw.word}"</span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">{kw.count} mentions</span>
              </div>
            )) : (
              <p className="text-xs text-gray-400 italic">No improvement comments analysed.</p>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <MessageSquare size={16} className="text-blue-500" />
            Common Suggestions
          </h3>
          <div className="space-y-2">
            {commonSuggestions.length > 0 ? commonSuggestions.map((kw, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold border border-gray-150">
                <span className="text-gray-700">"{kw.word}"</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">{kw.count} mentions</span>
              </div>
            )) : (
              <p className="text-xs text-gray-400 italic">No suggestion comments analysed.</p>
            )}
          </div>
        </div>
      </div>

      {/* Individual Responses Database */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Responses Database</h3>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">Search and view details of individual student submissions</p>
          </div>
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by student ID or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-semibold"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-semibold text-gray-700">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Submission Date</th>
                <th className="px-6 py-4 text-center">Avg Rating</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredResponses.map((r) => {
                // Compute individual average
                let indSum = 0
                let indCount = 0
                evaluation.questions.forEach((_, idx) => {
                  const rating = r.ratings.get ? r.ratings.get(String(idx)) : r.ratings[String(idx)]
                  if (rating !== undefined && rating !== null) {
                    indSum += Number(rating)
                    indCount++
                  }
                })
                const indAvg = indCount > 0 ? (indSum / indCount).toFixed(2) : '0.00'

                return (
                  <tr key={r._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 rounded-full text-gray-500">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{r.studentName || 'Anonymous'}</p>
                          <p className="text-xs text-gray-400 font-bold">{r.studentId?.studentId || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                      {r.email}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-bold">
                      {new Date(r.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center font-black">
                      {indAvg}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedResponse(r)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all border border-gray-200 inline-flex items-center gap-1"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredResponses.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400 italic">
                    No submissions match search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Response Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-gray-100 p-6 space-y-6 animate-in fade-in duration-200 overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {selectedResponse.studentName || 'Anonymous Student'}
                </h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">
                  ID: {selectedResponse.studentId?.studentId || 'N/A'} • {selectedResponse.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedResponse(null)}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-250 text-gray-500 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>

            {/* Ratings Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ratings Breakdown</h4>
              <div className="space-y-2.5">
                {evaluation.questions.map((q, idx) => {
                  const rating = selectedResponse.ratings.get ? selectedResponse.ratings.get(String(idx)) : selectedResponse.ratings[String(idx)]
                  return (
                    <div key={idx} className="flex justify-between items-center text-xs border-b pb-2">
                      <span className="text-gray-700 font-semibold max-w-lg">
                        {idx + 1}. {q.text}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        rating === 5 ? 'bg-green-100 text-green-800' :
                        rating === 4 ? 'bg-teal-100 text-teal-800' :
                        rating === 3 ? 'bg-amber-100 text-amber-800' :
                        rating === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {rating ? RATING_LABELS[5 - rating] : 'N/A'} ({rating})
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Open comments */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Comments</h4>
              
              <div className="space-y-3">
                <div className="bg-gray-50 p-3.5 rounded-xl border">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    What did you learn from this course?
                  </p>
                  <p className="text-sm font-semibold text-gray-700 whitespace-pre-wrap">
                    {selectedResponse.comments?.learned || '—'}
                  </p>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-xl border">
                  <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider mb-1">
                    What can be improved?
                  </p>
                  <p className="text-sm font-semibold text-gray-700 whitespace-pre-wrap">
                    {selectedResponse.comments?.improved || '—'}
                  </p>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-xl border">
                  <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                    Any additional suggestions?
                  </p>
                  <p className="text-sm font-semibold text-gray-700 whitespace-pre-wrap">
                    {selectedResponse.comments?.suggestions || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
