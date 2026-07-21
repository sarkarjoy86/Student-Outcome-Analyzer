import { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { downloadChartAsJPG } from '../../utils/chartDownload';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Download,
  Search,
  MessageSquare,
  User,
  Check,
  Eye,
  HelpCircle,
  Printer,
  ChevronDown,
  ChevronUp,
  Table,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';

const RATING_COLORS_1_5 = {
  1: '#2563eb', // Blue (1 = Strongly Disagree)
  2: '#dc2626', // Red (2 = Disagree)
  3: '#f59e0b', // Orange (3 = Neutral)
  4: '#16a34a', // Green (4 = Agree)
  5: '#9333ea', // Purple (5 = Strongly Agree)
};

const RATING_COLORS_SEC5 = {
  '10- Excellent': '#2563eb',
  '08- Very Good': '#dc2626',
  '06- Good': '#f59e0b',
  '04- Average': '#16a34a',
  '02- Below Average': '#9333ea',
};

const BROWN_BAR_COLOR = '#b45309';

const SCALE_POINTS = [5, 4, 3, 2, 1];
const RATING_LABELS = ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'];

export default function SurveyAnalysis({ surveyId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponse, setSelectedResponse] = useState(null);

  // Accordion toggle states (collapsed by default to keep page compact)
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [showResponsesDb, setShowResponsesDb] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [surveyId]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiService.getSurveyAnalytics(surveyId);
      setData(res);
    } catch (err) {
      console.error(err);
      setError('Failed to load survey analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <Loader2 className="animate-spin text-emerald-600 mb-2 inline-block" size={40} />
        <p className="text-gray-500 font-semibold">Generating analytics report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 font-semibold text-sm">
        {error || 'Data could not be loaded.'}
        <button onClick={onBack} className="block mt-2 text-xs underline font-bold">Go Back</button>
      </div>
    );
  }

  const { survey, responses, totalStudents } = data;
  const offering = survey.courseOfferingId;
  const course = offering?.course;
  const teacher = offering?.teacher;
  const semester = offering?.semester;

  const totalResponses = responses.length;
  const responseRate = totalStudents > 0 ? ((totalResponses / totalStudents) * 100).toFixed(1) : '0.0';
  const pendingResponses = Math.max(0, totalStudents - totalResponses);

  // Map-safe comment getter helper
  const getCommentVal = (resp, key) => {
    if (!resp?.comments) return '';
    if (resp.comments.get && typeof resp.comments.get === 'function') {
      return resp.comments.get(key) || '';
    }
    return resp.comments[key] || '';
  };

  // 1. Calculate question-wise distribution scores
  let totalRatingSum = 0;
  let totalRatingCount = 0;
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const questionScores = (survey.questions || []).map((q, idx) => {
    const orderNum = q.order || idx + 1;
    let sectionName = q.section;
    if (!sectionName) {
      if (orderNum <= 5) sectionName = 'Section 1';
      else if (orderNum <= 10) sectionName = 'Section 2';
      else if (orderNum <= 15) sectionName = 'Section 3';
      else if (orderNum <= 20) sectionName = 'Section 4';
      else if (orderNum <= 26) sectionName = 'Section 5';
      else sectionName = 'Section 6';
    }

    return {
      id: q._id || idx,
      text: q.text,
      index: orderNum,
      section: sectionName,
      sum: 0,
      count: 0,
      dist: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  });

  responses.forEach((resp) => {
    survey.questions.forEach((q, idx) => {
      const rating = resp.ratings?.get ? resp.ratings.get(String(idx)) : resp.ratings?.[String(idx)];
      if (rating !== undefined && rating !== null) {
        const val = Number(rating);
        totalRatingSum += val;
        totalRatingCount++;
        ratingCounts[val] = (ratingCounts[val] || 0) + 1;

        questionScores[idx].sum += val;
        questionScores[idx].count++;
        questionScores[idx].dist[val] = (questionScores[idx].dist[val] || 0) + 1;
      }
    });
  });

  const averageRating = totalRatingCount > 0 ? (totalRatingSum / totalRatingCount).toFixed(2) : '0.00';
  const positiveRatingsCount = ratingCounts[5] + ratingCounts[4];
  const overallSatisfaction = totalRatingCount > 0 ? ((positiveRatingsCount / totalRatingCount) * 100).toFixed(1) : '0.0';

  // 2. Prepare Radar & Timeline Chart Data
  const radarChartData = questionScores.map((qs) => ({
    subject: `Q${qs.index}`,
    Score: qs.count > 0 ? Number((qs.sum / qs.count).toFixed(2)) : 0,
    fullMark: 5,
  }));

  const timelineDataMap = {};
  responses.forEach((resp) => {
    const dateObj = new Date(resp.submittedAt);
    const dateStr =
      dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + dateObj.getFullYear();
    timelineDataMap[dateStr] = (timelineDataMap[dateStr] || 0) + 1;
  });
  const lineChartData = Object.keys(timelineDataMap)
    .map((date) => ({
      date,
      Submissions: timelineDataMap[date],
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Helper to construct Recharts BarChart data for Sections 1–4
  const buildSectionChartData = (secName) => {
    const qs = questionScores.filter((q) => q.section === secName);
    return qs.map((q) => {
      const qCode = `Q${q.index}`;
      const shortText = q.text.length > 25 ? q.text.substring(0, 25) + '...' : q.text;
      return {
        qCode,
        label: `${qCode}. ${shortText}`,
        fullText: `${qCode}. ${q.text}`,
        1: q.dist[1] || 0,
        2: q.dist[2] || 0,
        3: q.dist[3] || 0,
        4: q.dist[4] || 0,
        5: q.dist[5] || 0,
      };
    });
  };

  // Helper to construct Recharts BarChart data for Section 5
  const buildSection5ChartData = () => {
    const qs = questionScores.filter((q) => q.section === 'Section 5');
    return qs.map((q) => {
      const qCode = `Q${q.index}`;
      const shortText = q.text.length > 20 ? q.text.substring(0, 20) + '...' : q.text;
      return {
        qCode,
        label: `${qCode}. ${shortText}`,
        fullText: `${qCode}. ${q.text}`,
        '10- Excellent': q.dist[5] || 0,
        '08- Very Good': q.dist[4] || 0,
        '06- Good': q.dist[3] || 0,
        '04- Average': q.dist[2] || 0,
        '02- Below Average': q.dist[1] || 0,
      };
    });
  };

  // Extract open-ended feedback for Section 6
  const learnedComments = responses.map((r) => getCommentVal(r, 'learned')).filter(Boolean);
  const improvedComments = responses.map((r) => getCommentVal(r, 'improved')).filter(Boolean);
  const additionalComments = responses
    .map((r) => getCommentVal(r, 'additionalComments') || getCommentVal(r, 'suggestions'))
    .filter(Boolean);

  const buildOpenEndedFrequencyData = (commentList) => {
    if (commentList.length === 0) return [];
    const categoryCounts = {};

    commentList.forEach((c) => {
      let trimmed = c.trim();
      if (!trimmed) return;

      let category = trimmed;
      const lower = trimmed.toLowerCase();
      if (lower.includes('c++') || lower.includes('basic') || lower.includes('syntax')) category = 'Basic C++ Language / Concepts';
      else if (lower.includes('problem') || lower.includes('practice') || lower.includes('daily')) category = 'Daily practice & problem solving';
      else if (lower.includes('explanation') || lower.includes('clear')) category = 'Clear explanations & slides';
      else if (lower.includes('oop') || lower.includes('object')) category = 'Strong focus on OOP concepts';
      else if (lower.includes('project') || lower.includes('interactive') || lower.includes('lab')) category = 'More interactive sessions & projects';
      else if (lower.includes('no comment') || lower.includes('no suggestion') || lower.includes('nothing') || lower.includes('none') || lower.includes('no')) category = 'No suggestions / No comments';
      else if (lower.includes('good') || lower.includes('overall') || lower.includes('well') || lower.includes('yes')) category = 'Overall course structure was good';
      else {
        category = trimmed.length > 35 ? trimmed.substring(0, 35) + '...' : trimmed;
      }

      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return Object.keys(categoryCounts)
      .map((cat) => ({
        category: cat.length > 25 ? cat.substring(0, 25) + '...' : cat,
        fullCategory: cat,
        count: categoryCounts[cat],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const learnedChartData = buildOpenEndedFrequencyData(learnedComments);
  const improvedChartData = buildOpenEndedFrequencyData(improvedComments);
  const additionalChartData = buildOpenEndedFrequencyData(additionalComments);

  const renderCustomBarTopLabel = (props, totalRespCount) => {
    const { x, y, width, value } = props;
    if (!value || value === 0) return null;
    const pct = totalRespCount > 0 ? ((value / totalRespCount) * 100).toFixed(1) : '0.0';
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill="#374151"
        textAnchor="middle"
        fontSize={10}
        fontWeight="bold"
      >
        {`${value} (${pct}%)`}
      </text>
    );
  };

  const filteredResponses = responses.filter((r) => {
    const commentsObj = r.comments || {};
    let matchParts = [];
    if (commentsObj.get && typeof commentsObj.get === 'function') {
      if (typeof commentsObj.entries === 'function') {
        for (let [key, val] of commentsObj.entries()) {
          if (val) matchParts.push(val);
        }
      } else {
        ['learned', 'improved', 'additionalComments', 'suggestions'].forEach((k) => {
          const val = commentsObj.get(k);
          if (val) matchParts.push(val);
        });
      }
    } else {
      Object.keys(commentsObj).forEach((k) => {
        const val = commentsObj[k];
        if (val) matchParts.push(val);
      });
    }
    const matchStr = matchParts.join(' ').toLowerCase();
    return matchStr.includes(searchTerm.toLowerCase());
  });

  // Download Word Report
  const handleDownloadWordReport = () => {
    const header =
      `<html xmlns:o='urn:schemas-microsoft-com:office:office' ` +
      `xmlns:w='urn:schemas-microsoft-com:office:word' ` +
      `xmlns='http://www.w3.org/TR/REC-html40'>` +
      `<head><title>Course Survey Report</title><style>` +
      `body { font-family: 'Arial', sans-serif; padding: 24px; font-size: 11pt; line-height: 1.5; color: #333333; }` +
      `h1 { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 5px; color: #047857; }` +
      `h2 { font-size: 13pt; font-weight: bold; border-bottom: 2px solid #059669; padding-bottom: 3px; margin-top: 25px; margin-bottom: 10px; color: #065f46; }` +
      `table { border-collapse: collapse; width: 100%; margin: 15px 0; }` +
      `th { border: 1px solid #d1d5db; padding: 8px; text-align: left; background-color: #ecfdf5; font-weight: bold; font-size: 10pt; color: #065f46; }` +
      `td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 10pt; }` +
      `.summary-box { background-color: #f0fdf4; border: 1px solid #a7f3d0; padding: 12px; margin-bottom: 15px; border-radius: 6px; }` +
      `</style></head><body>`;

    const footer = `</body></html>`;

    const tableRows = questionScores
      .map((qs) => {
        const avg = qs.count > 0 ? (qs.sum / qs.count).toFixed(2) : '0.00';
        return `<tr>
        <td>Q${qs.index}</td>
        <td>${qs.text}</td>
        <td>${qs.dist[5] || 0}</td>
        <td>${qs.dist[4] || 0}</td>
        <td>${qs.dist[3] || 0}</td>
        <td>${qs.dist[2] || 0}</td>
        <td>${qs.dist[1] || 0}</td>
        <td style="font-weight: bold; background-color: #f9fafb;">${avg}</td>
      </tr>`;
      })
      .join('');

    const htmlContent = `
      <h1>DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING</h1>
      <p style="text-align: center; font-size: 10pt; margin-top: 0; color: #4b5563; font-weight: bold;">OBE Student Course Survey Evaluation Report</p>
      <hr />
      <h2>I. Course & Instructor Information</h2>
      <table>
        <tr><td><b>Course:</b></td><td>${course?.courseCode} — ${course?.courseName}</td></tr>
        <tr><td><b>Instructor:</b></td><td>${teacher?.fullName || 'N/A'}</td></tr>
        <tr><td><b>Batch & Section:</b></td><td>Batch ${offering?.batch?.name} • Section ${offering?.section}</td></tr>
      </table>
      <h2>II. Executive Summary</h2>
      <div class="summary-box">
        <p><b>Total Responses:</b> ${totalResponses} / ${totalStudents} (${responseRate}%)</p>
        <p><b>Average Rating:</b> ${averageRating} / 5.00</p>
      </div>
      <h2>III. Survey Ratings Summary</h2>
      <table>
        <thead>
          <tr><th>No.</th><th>Criteria</th><th>5</th><th>4</th><th>3</th><th>2</th><th>1</th><th>Mean</th></tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;

    const blob = new Blob(['\ufeff' + header + htmlContent + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Course_Survey_${course?.courseCode || 'Report'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sec1Data = buildSectionChartData('Section 1');
  const sec2Data = buildSectionChartData('Section 2');
  const sec3Data = buildSectionChartData('Section 3');
  const sec4Data = buildSectionChartData('Section 4');
  const sec5Data = buildSection5ChartData();

  return (
    <div className="space-y-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .printable-report { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* Header Actions Bar (No-print) */}
      <div className="no-print bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Student Course Survey Analysis & Report</h2>
            <p className="text-xs text-green-800 font-bold uppercase tracking-wider mt-0.5">
              {course?.courseCode} • {course?.courseName} • Section {offering?.section} • ({totalResponses} Submissions)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 hover:bg-green-900 text-white rounded-xl font-bold text-xs shadow-md transition"
          >
            <Printer size={15} />
            Print Survey Report
          </button>
          <button
            onClick={handleDownloadWordReport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition"
          >
            <Download size={15} />
            Download Word (.doc)
          </button>
        </div>
      </div>

      {/* Executive Summary Stats */}
      <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase">Submissions</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalResponses} <span className="text-xs text-gray-400">/ {totalStudents}</span></p>
          <p className="text-xs font-bold text-emerald-700 mt-1">{responseRate}% Response Rate</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase">Average Rating</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{averageRating} <span className="text-xs text-gray-400">/ 5.00</span></p>
          <p className="text-xs font-bold text-gray-500 mt-1">Overall Mean Score</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase">Course Satisfaction</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{overallSatisfaction}%</p>
          <p className="text-xs font-bold text-gray-500 mt-1">Agree & Strongly Agree</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-xs font-bold text-gray-500 uppercase">Pending Feedback</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{pendingResponses}</p>
          <p className="text-xs font-bold text-gray-500 mt-1">Students Yet to Submit</p>
        </div>
      </div>

      {/* 2 ANALYTICS MODULES SIDE-BY-SIDE (BEFORE SECTION GRAPHS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: COURSE ATTRIBUTE STRENGTHS (Radar Chart) */}
        <div id="survey-chart-radar" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
              COURSE ATTRIBUTE STRENGTHS
            </h3>
            <button
              onClick={() => downloadChartAsJPG('survey-chart-radar', 'Course_Attribute_Strengths')}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition active:scale-95 no-print"
              title="Download Graph Image"
            >
              <Download size={14} />
            </button>
          </div>
          <div className="h-72 flex items-center justify-center pt-2">
            {totalResponses > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" stroke="#4b5563" fontSize={10} fontWeight={700} />
                  <Radar name="Rating Score" dataKey="Score" stroke="#047857" fill="#10b981" fillOpacity={0.4} />
                  <Tooltip formatter={(value) => [`${value} / 5.0`, 'Rating Score']} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 italic">No survey submission data available yet.</p>
            )}
          </div>
        </div>

        {/* Module 2: SUBMISSION TREND (Line Chart) */}
        <div id="survey-chart-trend" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
              SUBMISSION TREND
            </h3>
            <button
              onClick={() => downloadChartAsJPG('survey-chart-trend', 'Submission_Trend')}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition active:scale-95 no-print"
              title="Download Graph Image"
            >
              <Download size={14} />
            </button>
          </div>
          <div className="h-72 pt-2">
            {totalResponses > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 15, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} fontWeight={600} />
                  <YAxis stroke="#9ca3af" fontSize={11} allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} submissions`, 'Submissions']} />
                  <Line
                    type="monotone"
                    dataKey="Submissions"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 italic flex items-center justify-center h-full">No timeline submission data available yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* 6 SECTIONS OF SURVEY ANALYSIS REPORT */}
      <div className="space-y-8 printable-report">

        {/* SECTION 1: LEARNING OUTCOMES & STUDENT ACHIEVEMENT */}
        <div id="survey-chart-sec1" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-wide uppercase">
                SECTION 1: LEARNING OUTCOMES & STUDENT ACHIEVEMENT
              </h3>
              <p className="text-xs text-gray-600 font-semibold mt-0.5">
                (Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.) Criteria
              </p>
            </div>
            <button
              onClick={() => downloadChartAsJPG('survey-chart-sec1', 'Section1_Learning_Outcomes_Distribution')}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition active:scale-95 no-print flex-shrink-0"
              title="Download Section 1 Graph"
            >
              <Download size={14} />
            </button>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sec1Data} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="qCode" tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(val, name) => [`${val} students`, RATING_LABELS[5 - Number(name)] || `Rating ${name}`]}
                  labelFormatter={(label, items) => items?.[0]?.payload?.fullText || label}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
                <Legend verticalAlign="top" align="left" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 700 }} />
                <Bar dataKey="1" fill={RATING_COLORS_1_5[1]} name="1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="2" fill={RATING_COLORS_1_5[2]} name="2" radius={[3, 3, 0, 0]} />
                <Bar dataKey="3" fill={RATING_COLORS_1_5[3]} name="3" radius={[3, 3, 0, 0]} />
                <Bar dataKey="4" fill={RATING_COLORS_1_5[4]} name="4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="5" fill={RATING_COLORS_1_5[5]} name="5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 2: COURSE CONTENT & DELIVERY */}
        <div id="survey-chart-sec2" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-wide uppercase">
                SECTION 2: COURSE CONTENT & DELIVERY
              </h3>
              <p className="text-xs text-gray-600 font-semibold mt-0.5">
                (Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.) Criteria
              </p>
            </div>
            <button
              onClick={() => downloadChartAsJPG('survey-chart-sec2', 'Section2_Course_Content_Delivery')}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition active:scale-95 no-print flex-shrink-0"
              title="Download Section 2 Graph"
            >
              <Download size={14} />
            </button>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sec2Data} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="qCode" tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(val, name) => [`${val} students`, RATING_LABELS[5 - Number(name)] || `Rating ${name}`]}
                  labelFormatter={(label, items) => items?.[0]?.payload?.fullText || label}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
                <Legend verticalAlign="top" align="left" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 700 }} />
                <Bar dataKey="1" fill={RATING_COLORS_1_5[1]} name="1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="2" fill={RATING_COLORS_1_5[2]} name="2" radius={[3, 3, 0, 0]} />
                <Bar dataKey="3" fill={RATING_COLORS_1_5[3]} name="3" radius={[3, 3, 0, 0]} />
                <Bar dataKey="4" fill={RATING_COLORS_1_5[4]} name="4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="5" fill={RATING_COLORS_1_5[5]} name="5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 3: INSTRUCTOR EVALUATION */}
        <div id="survey-chart-sec3" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-wide uppercase">
                SECTION 3: INSTRUCTOR EVALUATION
              </h3>
              <p className="text-xs text-gray-600 font-semibold mt-0.5">
                (Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.) Criteria
              </p>
            </div>
            <button
              onClick={() => downloadChartAsJPG('survey-chart-sec3', 'Section3_Instructor_Evaluation')}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition active:scale-95 no-print flex-shrink-0"
              title="Download Section 3 Graph"
            >
              <Download size={14} />
            </button>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sec3Data} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="qCode" tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(val, name) => [`${val} students`, RATING_LABELS[5 - Number(name)] || `Rating ${name}`]}
                  labelFormatter={(label, items) => items?.[0]?.payload?.fullText || label}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
                <Legend verticalAlign="top" align="left" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 700 }} />
                <Bar dataKey="1" fill={RATING_COLORS_1_5[1]} name="1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="2" fill={RATING_COLORS_1_5[2]} name="2" radius={[3, 3, 0, 0]} />
                <Bar dataKey="3" fill={RATING_COLORS_1_5[3]} name="3" radius={[3, 3, 0, 0]} />
                <Bar dataKey="4" fill={RATING_COLORS_1_5[4]} name="4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="5" fill={RATING_COLORS_1_5[5]} name="5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 4: COURSE ASSESSMENT & WORKLOAD */}
        <div id="survey-chart-sec4" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-wide uppercase">
                SECTION 4: COURSE ASSESSMENT & WORKLOAD
              </h3>
              <p className="text-xs text-gray-600 font-semibold mt-0.5">
                (Please rate the following on a scale from 1 to 5, where 1 = Strongly Disagree and 5 = Strongly Agree.) Criteria
              </p>
            </div>
            <button
              onClick={() => downloadChartAsJPG('survey-chart-sec4', 'Section4_Course_Assessment_Workload')}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition active:scale-95 no-print flex-shrink-0"
              title="Download Section 4 Graph"
            >
              <Download size={14} />
            </button>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sec4Data} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="qCode" tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(val, name) => [`${val} students`, RATING_LABELS[5 - Number(name)] || `Rating ${name}`]}
                  labelFormatter={(label, items) => items?.[0]?.payload?.fullText || label}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
                <Legend verticalAlign="top" align="left" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 700 }} />
                <Bar dataKey="1" fill={RATING_COLORS_1_5[1]} name="1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="2" fill={RATING_COLORS_1_5[2]} name="2" radius={[3, 3, 0, 0]} />
                <Bar dataKey="3" fill={RATING_COLORS_1_5[3]} name="3" radius={[3, 3, 0, 0]} />
                <Bar dataKey="4" fill={RATING_COLORS_1_5[4]} name="4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="5" fill={RATING_COLORS_1_5[5]} name="5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 5: OUTCOME ACHIEVEMENTS BY THE COURSE */}
        <div id="survey-chart-sec5" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-wide uppercase">
                SECTION 5: OUTCOME ACHIEVEMENTS BY THE COURSE
              </h3>
              <p className="text-xs text-gray-600 font-semibold mt-0.5">Criteria</p>
            </div>
            <button
              onClick={() => downloadChartAsJPG('survey-chart-sec5', 'Section5_Outcome_Achievements')}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition active:scale-95 no-print flex-shrink-0"
              title="Download Section 5 Graph"
            >
              <Download size={14} />
            </button>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sec5Data} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="qCode" tick={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(val, name) => [`${val} students`, name]}
                  labelFormatter={(label, items) => items?.[0]?.payload?.fullText || label}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
                <Legend verticalAlign="top" align="left" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 700 }} />
                <Bar dataKey="10- Excellent" fill={RATING_COLORS_SEC5['10- Excellent']} name="10- Excellent" radius={[3, 3, 0, 0]} />
                <Bar dataKey="08- Very Good" fill={RATING_COLORS_SEC5['08- Very Good']} name="08- Very Good" radius={[3, 3, 0, 0]} />
                <Bar dataKey="06- Good" fill={RATING_COLORS_SEC5['06- Good']} name="06- Good" radius={[3, 3, 0, 0]} />
                <Bar dataKey="04- Average" fill={RATING_COLORS_SEC5['04- Average']} name="04- Average" radius={[3, 3, 0, 0]} />
                <Bar dataKey="02- Below Average" fill={RATING_COLORS_SEC5['02- Below Average']} name="02- Below Average" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 6: STUDENT FEEDBACK (Open-Ended Questions) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-8">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-wide uppercase">
              SECTION 6: STUDENT FEEDBACK (Open-Ended Questions)
            </h3>
          </div>

          {/* Sub-question 1 */}
          <div id="survey-chart-sec6-q1" className="space-y-2 border-b border-gray-100 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-gray-800">
                  1. What aspects of this course were most valuable to your learning experience?
                </h4>
                <p className="text-xs text-gray-500 font-semibold">{learnedComments.length} responses</p>
              </div>
              <button
                onClick={() => downloadChartAsJPG('survey-chart-sec6-q1', 'Section6_Q1_Valuable_Aspects')}
                className="p-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg shadow-sm transition active:scale-95 no-print flex-shrink-0"
                title="Download Graph Image"
              >
                <Download size={14} />
              </button>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={learnedChartData} margin={{ top: 25, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fontWeight: 700, fill: '#4b5563' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip labelFormatter={(l, items) => items?.[0]?.payload?.fullCategory || l} />
                  <Bar
                    dataKey="count"
                    fill={BROWN_BAR_COLOR}
                    radius={[4, 4, 0, 0]}
                    label={(props) => renderCustomBarTopLabel(props, learnedComments.length)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub-question 2 */}
          <div id="survey-chart-sec6-q2" className="space-y-2 border-b border-gray-100 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-gray-800">
                  2. What improvements would you suggest for this course?
                </h4>
                <p className="text-xs text-gray-500 font-semibold">{improvedComments.length} responses</p>
              </div>
              <button
                onClick={() => downloadChartAsJPG('survey-chart-sec6-q2', 'Section6_Q2_Suggested_Improvements')}
                className="p-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg shadow-sm transition active:scale-95 no-print flex-shrink-0"
                title="Download Graph Image"
              >
                <Download size={14} />
              </button>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={improvedChartData} margin={{ top: 25, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fontWeight: 700, fill: '#4b5563' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip labelFormatter={(l, items) => items?.[0]?.payload?.fullCategory || l} />
                  <Bar
                    dataKey="count"
                    fill={BROWN_BAR_COLOR}
                    radius={[4, 4, 0, 0]}
                    label={(props) => renderCustomBarTopLabel(props, improvedComments.length)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub-question 3 */}
          <div id="survey-chart-sec6-q3" className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-gray-800">
                  3. Additional comments or suggestions:
                </h4>
                <p className="text-xs text-gray-500 font-semibold">{additionalComments.length} responses</p>
              </div>
              <button
                onClick={() => downloadChartAsJPG('survey-chart-sec6-q3', 'Section6_Q3_Additional_Comments')}
                className="p-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg shadow-sm transition active:scale-95 no-print flex-shrink-0"
                title="Download Graph Image"
              >
                <Download size={14} />
              </button>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={additionalChartData} margin={{ top: 25, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fontWeight: 700, fill: '#4b5563' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip labelFormatter={(l, items) => items?.[0]?.payload?.fullCategory || l} />
                  <Bar
                    dataKey="count"
                    fill={BROWN_BAR_COLOR}
                    radius={[4, 4, 0, 0]}
                    label={(props) => renderCustomBarTopLabel(props, additionalComments.length)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* COLLAPSIBLE ACCORDION 1: QUESTION BREAKDOWN GRID */}
      <div className="no-print bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowQuestionGrid(!showQuestionGrid)}
          className="w-full p-5 bg-gray-50/80 hover:bg-gray-100/80 transition flex items-center justify-between border-b border-gray-200 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Table size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                QUESTION BREAKDOWN GRID
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {showQuestionGrid ? 'Click to collapse question rating breakdown grid' : 'Click to expand question rating breakdown grid'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {showQuestionGrid ? 'Expanded' : 'Collapsed'}
            </span>
            {showQuestionGrid ? <ChevronUp className="text-gray-500" size={20} /> : <ChevronDown className="text-gray-500" size={20} />}
          </div>
        </button>

        {showQuestionGrid && (
          <div className="p-6 space-y-4 animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold text-gray-700">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
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
                    const avg = qs.count > 0 ? (qs.sum / qs.count).toFixed(2) : '0.00';
                    const distPct = {};
                    SCALE_POINTS.forEach((val) => {
                      const count = qs.dist[val] || 0;
                      distPct[val] = qs.count > 0 ? ((count / qs.count) * 100).toFixed(0) : '0';
                    });

                    return (
                      <tr key={qs.index} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-semibold text-gray-800 max-w-sm">
                          {qs.index}. {qs.text}
                        </td>
                        <td className="px-4 py-3 text-center text-emerald-700 font-bold bg-emerald-50/20">{distPct[5]}%</td>
                        <td className="px-4 py-3 text-center text-emerald-600 font-bold bg-emerald-50/10">{distPct[4]}%</td>
                        <td className="px-4 py-3 text-center text-amber-700 font-bold bg-amber-50/20">{distPct[3]}%</td>
                        <td className="px-4 py-3 text-center text-orange-700 font-bold bg-orange-50/20">{distPct[2]}%</td>
                        <td className="px-4 py-3 text-center text-red-700 font-bold bg-red-50/20">{distPct[1]}%</td>
                        <td className="px-4 py-3 text-center font-black bg-gray-50 text-xs text-gray-900">{avg}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* COLLAPSIBLE ACCORDION 2: RESPONSES DATABASE */}
      <div className="no-print bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowResponsesDb(!showResponsesDb)}
          className="w-full p-5 bg-gray-50/80 hover:bg-gray-100/80 transition flex items-center justify-between border-b border-gray-200 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <Database size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                RESPONSES DATABASE
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Search and view details of individual student submissions ({totalResponses} Submissions)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              {showResponsesDb ? 'Expanded' : 'Collapsed'}
            </span>
            {showResponsesDb ? <ChevronUp className="text-gray-500" size={20} /> : <ChevronDown className="text-gray-500" size={20} />}
          </div>
        </button>

        {showResponsesDb && (
          <div className="p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by comment text..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-semibold text-gray-700">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Response</th>
                    <th className="px-6 py-3">Submission Date</th>
                    <th className="px-6 py-3 text-center">Avg Rating</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResponses.map((r) => {
                    let indSum = 0;
                    let indCount = 0;
                    survey.questions.forEach((_, idx) => {
                      const rating = r.ratings?.get ? r.ratings.get(String(idx)) : r.ratings?.[String(idx)];
                      if (rating !== undefined && rating !== null) {
                        indSum += Number(rating);
                        indCount++;
                      }
                    });
                    const indAvg = indCount > 0 ? (indSum / indCount).toFixed(2) : '0.00';
                    const responseIndex = responses.findIndex((resp) => resp._id === r._id) + 1;

                    return (
                      <tr key={r._id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gray-100 rounded-full text-gray-500">
                              <User size={14} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 text-xs">Response #{responseIndex}</p>
                              <p className="text-[10px] text-gray-400 font-bold">Confidential Survey Response</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-bold">
                          {(() => {
                            const dateObj = new Date(r.submittedAt);
                            return (
                              dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) +
                              ', ' +
                              dateObj.getFullYear()
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center font-black text-xs text-gray-900">{indAvg}</td>
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
                    );
                  })}
                  {filteredResponses.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-400 italic text-xs">
                        No submissions match search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Response Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-gray-100 p-6 space-y-6 animate-in fade-in duration-200 overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Response Details — Response #{responses.findIndex((x) => x._id === selectedResponse._id) + 1}
                </h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">
                  Submitted: {(() => { const dateObj = new Date(selectedResponse.submittedAt); return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + ', ' + dateObj.getFullYear(); })()} • Confidential Survey Response
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
              <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Ratings Breakdown</h4>
              <div className="space-y-2.5">
                {survey.questions.map((q, idx) => {
                  const rating = selectedResponse.ratings?.get ? selectedResponse.ratings.get(String(idx)) : selectedResponse.ratings?.[String(idx)];
                  return (
                    <div key={idx} className="flex justify-between items-center text-xs border-b pb-2">
                      <span className="text-gray-700 font-semibold max-w-lg">
                        {idx + 1}. {q.text}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        rating === 5 ? 'bg-emerald-100 text-emerald-800' :
                        rating === 4 ? 'bg-teal-100 text-teal-800' :
                        rating === 3 ? 'bg-amber-100 text-amber-800' :
                        rating === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {rating ? RATING_LABELS[5 - rating] : 'N/A'} ({rating})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COMMENTS SECTION */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                COMMENTS
              </h4>

              <div className="space-y-3">
                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 shadow-xs">
                  <p className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                    WHAT ASPECTS OF THIS COURSE WERE MOST VALUABLE TO YOUR LEARNING EXPERIENCE?
                  </p>
                  <p className="text-sm font-semibold text-gray-800 whitespace-pre-wrap">
                    {getCommentVal(selectedResponse, 'learned') || '—'}
                  </p>
                </div>

                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 shadow-xs">
                  <p className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                    WHAT IMPROVEMENTS WOULD YOU SUGGEST FOR THIS COURSE?
                  </p>
                  <p className="text-sm font-semibold text-gray-800 whitespace-pre-wrap">
                    {getCommentVal(selectedResponse, 'improved') || '—'}
                  </p>
                </div>

                <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 shadow-xs">
                  <p className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider mb-1">
                    ADDITIONAL COMMENTS OR SUGGESTIONS?
                  </p>
                  <p className="text-sm font-semibold text-gray-800 whitespace-pre-wrap">
                    {getCommentVal(selectedResponse, 'additionalComments') || getCommentVal(selectedResponse, 'suggestions') || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
