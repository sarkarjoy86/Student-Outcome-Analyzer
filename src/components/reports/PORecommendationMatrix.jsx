import React, { useState, useEffect, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Printer,
  User,
  GraduationCap,
  Save,
  TrendingUp,
  RefreshCw,
  ShieldAlert,
  Loader2,
  BookOpen,
  Check,
} from 'lucide-react';
import { apiService } from '../../services/apiService';

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
};

export default function PORecommendationMatrix({ offering = null, initialStudentList = [] }) {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [threshold, setThreshold] = useState(60);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [facultyNotes, setFacultyNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Load student summaries for current scope (course offering / teacher)
  useEffect(() => {
    loadStudents();
  }, [threshold, offering]);

  const loadStudents = async (autoSelectFirst = true) => {
    setLoading(true);
    try {
      const offeringId = offering?._id || '';
      const teacherId = offering?.teacher?._id || offering?.teacher || '';
      const res = await apiService.getPORecommendationStudents(threshold, offeringId, teacherId);
      let fetchedStudents = res?.students || [];

      // Merge initialStudentList if provided and not already present
      if (initialStudentList && initialStudentList.length > 0) {
        const existingIds = new Set(fetchedStudents.map(s => String(s.id || s.studentId)));
        initialStudentList.forEach(init => {
          const initId = String(init._id || init.id || init.studentId);
          if (!existingIds.has(initId)) {
            fetchedStudents.push({
              id: init._id || init.id,
              studentId: init.studentId || init.id,
              studentName: init.name || init.studentName,
              cgpa: 0,
              overallPoAttainment: 0,
              recommendationScore: 0,
              recommendationStatus: 'Pending',
              badgeColor: 'gray',
              weakPOCount: 0,
              completedCoursesCount: 0,
            });
          }
        });
      }

      setStudents(fetchedStudents);
      if (autoSelectFirst && fetchedStudents.length > 0) {
        const defaultStudent =
          fetchedStudents.find(s => (s.studentName || '').toLowerCase().includes('joy sarkar')) ||
          fetchedStudents[0];
        setSelectedStudentId(defaultStudent.id || defaultStudent.studentId);
      }
    } catch (err) {
      console.error('Failed to load PO recommendation students:', err);
      if (initialStudentList && initialStudentList.length > 0) {
        const fallbackStudents = initialStudentList.map(init => ({
          id: init._id || init.id,
          studentId: init.studentId || init.id,
          studentName: init.name || init.studentName,
          cgpa: 0,
          overallPoAttainment: 0,
          recommendationScore: 0,
          recommendationStatus: 'Pending',
          badgeColor: 'gray',
        }));
        setStudents(fallbackStudents);
        if (autoSelectFirst && fallbackStudents.length > 0) {
          setSelectedStudentId(fallbackStudents[0].id || fallbackStudents[0].studentId);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtered students dropdown & search results
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const q = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        (s.studentName || '').toLowerCase().includes(q) ||
        (s.studentId || '').toLowerCase().includes(q)
    );
  }, [students, searchTerm]);

  // Auto-sync selected student when search results update
  useEffect(() => {
    if (searchTerm.trim() && filteredStudents.length > 0) {
      const currentSelected = filteredStudents.find(
        (s) => (s.id || s.studentId) === selectedStudentId
      );
      if (!currentSelected) {
        const topMatch = filteredStudents[0];
        setSelectedStudentId(topMatch.id || topMatch.studentId);
      }
    }
  }, [searchTerm, filteredStudents]);

  // Load selected student's longitudinal profile from StudentLongitudinalPO collection
  useEffect(() => {
    if (selectedStudentId) {
      loadStudentProfile(selectedStudentId, threshold);
    }
  }, [selectedStudentId, threshold]);

  const loadStudentProfile = async (sId, thresh) => {
    setProfileLoading(true);
    try {
      const data = await apiService.getStudentPORecommendation(sId, thresh);
      setStudentProfile(data);
      setFacultyNotes(data.facultyNotes || '');
    } catch (err) {
      console.error('Failed to load student longitudinal PO profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Trigger Bulk Recalculation & Sync for all students
  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await apiService.syncAllPORecommendations(threshold);
      setToastMsg(`Successfully updated longitudinal PO attainments for ${res.syncedCount || 'all'} students!`);
      await loadStudents(false);
      if (selectedStudentId) {
        await loadStudentProfile(selectedStudentId, threshold);
      }
      setTimeout(() => setToastMsg(''), 5000);
    } catch (err) {
      alert('Failed to sync all student PO records: ' + err.message);
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSelectStudent = (s) => {
    const sId = s.id || s.studentId;
    setSelectedStudentId(sId);
    setSearchTerm('');
    setShowSearchDropdown(false);
  };

  // Handle saving faculty notes
  const handleSaveNotes = async () => {
    if (!studentProfile) return;
    setSavingNotes(true);
    try {
      const res = await apiService.savePORecommendation({
        studentId: studentProfile.student.id || studentProfile.student.studentId,
        threshold,
        facultyNotes,
      });
      if (res.ok) {
        setToastMsg('Faculty recommendation notes saved to database successfully!');
        setTimeout(() => setToastMsg(''), 4000);
      }
    } catch (err) {
      alert('Failed to save faculty recommendation notes: ' + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // Export PO Attainment Transcript (PDF) / Print
  const handlePrintPDF = () => {
    window.print();
  };

  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Eligible for Recommendation':
        return {
          bg: 'bg-emerald-100 border-emerald-300 text-emerald-900',
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />,
          titleColor: 'text-emerald-800',
        };
      case 'Not Recommended (PO Gap Detected)':
        return {
          bg: 'bg-red-100 border-red-300 text-red-900',
          icon: <ShieldAlert className="w-8 h-8 text-red-600 flex-shrink-0" />,
          titleColor: 'text-red-800',
        };
      case 'Conditional (Low CGPA)':
        return {
          bg: 'bg-amber-100 border-amber-300 text-amber-900',
          icon: <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />,
          titleColor: 'text-amber-800',
        };
      default:
        return {
          bg: 'bg-rose-100 border-rose-300 text-rose-900',
          icon: <XCircle className="w-8 h-8 text-rose-600 flex-shrink-0" />,
          titleColor: 'text-rose-800',
        };
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    if (!studentProfile || !studentProfile.longitudinalPOs) return [];
    return studentProfile.longitudinalPOs.map((p) => ({
      po: p.po,
      name: PO_NAMES[p.po] || p.po,
      attainment: p.attainment,
      threshold: p.threshold,
      isPassed: p.isPassed,
    }));
  }, [studentProfile]);

  return (
    <div className="space-y-6">
      {/* Toast message banner */}
      {toastMsg && (
        <div className="no-print bg-emerald-700 text-white p-4 rounded-xl shadow-lg flex items-center justify-between font-bold text-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            {toastMsg}
          </div>
          <button onClick={() => setToastMsg('')} className="text-white/80 hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {/* Header Controls (No-print) */}
      <div className="no-print bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
              <Award className="w-6 h-6 text-green-700 flex-shrink-0" />
              PO Recommendation System
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              {offering ? (
                <>Showing allocated students for course: <strong className="text-green-800 font-extrabold">{offering.course?.courseCode} - {offering.course?.courseName}</strong> ({students.length} enrolled)</>
              ) : (
                <>Aggregates Program Outcome (PO1–PO12) attainment across all completed courses in the student's entire Bachelor's program.</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-auto">
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm text-xs transition duration-200 active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
              {syncingAll ? 'Recalculating...' : 'Sync & Recalculate All'}
            </button>

            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 text-white font-bold px-3.5 py-1.5 rounded-lg shadow-sm text-xs transition duration-200 active:scale-95 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Export PO Transcript (PDF)
            </button>
          </div>
        </div>

        {/* Student Selector & Threshold Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Input with Interactive Dropdown */}
          <div className="md:col-span-4 relative">
            <label className="block text-xs font-bold text-gray-700 mb-1">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search ID or Name (Press Enter to select)..."
                value={searchTerm}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredStudents.length > 0) {
                    handleSelectStudent(filteredStudents[0]);
                  }
                }}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium"
              />
            </div>

            {/* Live Search Suggestions Popup */}
            {showSearchDropdown && searchTerm.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <div className="p-3 text-xs text-gray-500 font-medium">No matching students</div>
                ) : (
                  filteredStudents.map((s) => (
                    <div
                      key={s.id || s.studentId}
                      onClick={() => handleSelectStudent(s)}
                      className="p-2.5 hover:bg-green-50 cursor-pointer flex items-center justify-between transition"
                    >
                      <div>
                        <div className="text-xs font-extrabold text-gray-900">{s.studentId} - {s.studentName}</div>
                        <div className="text-[11px] text-gray-500">CGPA: {(s.cgpa || 0).toFixed(2)} | PO Avg: {s.overallPoAttainment || 0}%</div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {s.recommendationStatus || 'Pending'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Dropdown Select */}
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-gray-700 mb-1">Select Student Profile ({filteredStudents.length} Students)</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full py-2 px-3 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              {filteredStudents.length === 0 ? (
                <option value="">No matching students found</option>
              ) : (
                filteredStudents.map((s) => (
                  <option key={s.id || s.studentId} value={s.id || s.studentId}>
                    {s.studentId} - {s.studentName} | CGPA: {(s.cgpa || 0).toFixed(2)} | PO Avg: {s.overallPoAttainment || 0}% | [{s.recommendationStatus || 'Pending'}]
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Threshold Tuning */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              PO Target Threshold: <span className="text-green-700 font-extrabold">{threshold}%</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-green-700 cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-500">{threshold}%</span>
            </div>
          </div>
        </div>
      </div>

      {profileLoading ? (
        <div className="bg-white p-12 rounded-2xl shadow-md flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-green-700 w-12 h-12 mb-4" />
          <p className="text-gray-700 font-bold text-lg">Fetching Pre-calculated Longitudinal PO Profile...</p>
          <p className="text-xs text-gray-500 mt-1">Reading dedicated StudentLongitudinalPO collection from MongoDB</p>
        </div>
      ) : !studentProfile ? (
        <div className="bg-white p-8 rounded-2xl shadow-md text-center text-gray-500 font-medium">
          Select a student to inspect their Faculty Recommendation Eligibility Profile.
        </div>
      ) : (
        <div className="space-y-6 printable-area">
          {/* Printable Official Header */}
          <div className="hidden print:block text-center border-b-2 border-green-800 pb-4 mb-6">
            <h1 className="text-2xl font-black text-green-900 tracking-wide uppercase">
              Faculty Recommendation & PO Attainment Transcript
            </h1>
            <p className="text-sm font-bold text-gray-700 mt-1">
              Longitudinal Program Outcome Evaluation • Bachelor of Science Degree
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Issued on: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Student Banner Card */}
          <div className="bg-gradient-to-r from-gray-900 via-green-950 to-gray-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg border-2 border-green-300/30">
                  <User className="w-9 h-9 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{studentProfile.student.studentName}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-green-200 font-medium">
                    <span>ID: <strong className="text-white">{studentProfile.student.studentId}</strong></span>
                    <span>•</span>
                    <span>Batch: <strong className="text-white">{studentProfile.student.batch}</strong></span>
                    <span>•</span>
                    <span>Section: <strong className="text-white">{studentProfile.student.section}</strong></span>
                    <span>•</span>
                    <span>Completed Courses: <strong className="text-white">{studentProfile.completedCourses ? studentProfile.completedCourses.length : 0}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center">
                  <div className="text-xs text-green-300 font-bold uppercase tracking-wider">CGPA</div>
                  <div className="text-2xl font-black text-amber-300">{studentProfile.cgpa ? studentProfile.cgpa.toFixed(2) : '0.00'}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-center">
                  <div className="text-xs text-green-300 font-bold uppercase tracking-wider">Overall PO</div>
                  <div className="text-2xl font-black text-emerald-300">{studentProfile.overallPoAttainment || 0}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: CGPA */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cumulative GPA</span>
                <GraduationCap className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900">{studentProfile.cgpa ? studentProfile.cgpa.toFixed(2) : '0.00'}</span>
                <span className="text-xs text-gray-500 font-semibold">/ 4.00</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-bold">
                {studentProfile.cgpa >= 3.5 ? (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> High CGPA (≥ 3.50)
                  </span>
                ) : (
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Below 3.50 Threshold
                  </span>
                )}
              </div>
            </div>

            {/* Metric 2: Overall PO Attainment */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall PO Avg</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900">{studentProfile.overallPoAttainment || 0}%</span>
              </div>
              <div className="mt-2 text-xs font-semibold text-gray-600">
                Across 12 Program Outcomes
              </div>
            </div>

            {/* Metric 3: Weak PO Gaps */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">PO Gaps (&lt;{threshold}%)</span>
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-3xl font-black ${studentProfile.weakPOs && studentProfile.weakPOs.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {studentProfile.weakPOs ? studentProfile.weakPOs.length : 0}
                </span>
                <span className="text-xs text-gray-500 font-semibold">/ 12 POs weak</span>
              </div>
              <div className="mt-2 text-xs font-bold">
                {!studentProfile.weakPOs || studentProfile.weakPOs.length === 0 ? (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    All Mapped POs Satisfied
                  </span>
                ) : (
                  <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                    {studentProfile.weakPOs.length} Weak PO Competenc{studentProfile.weakPOs.length === 1 ? 'y' : 'ies'}
                  </span>
                )}
              </div>
            </div>

            {/* Metric 4: Faculty Recommendation Score */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recommendation Score</span>
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900">{studentProfile.recommendationScore || 0}</span>
                <span className="text-xs text-gray-500 font-semibold">/ 100</span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${studentProfile.recommendationScore || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation Status Badge Banner */}
          {(() => {
            const badge = getBadgeStyle(studentProfile.recommendationStatus);
            return (
              <div className={`p-6 rounded-2xl border-2 shadow-md ${badge.bg} flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                <div className="flex items-start gap-4">
                  {badge.icon}
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-widest text-gray-600">
                      Faculty Recommendation Eligibility Status
                    </div>
                    <h4 className={`text-2xl font-black ${badge.titleColor} mt-0.5`}>
                      {studentProfile.recommendationStatus}
                    </h4>
                    <p className="text-sm font-medium mt-1 text-gray-800">
                      {studentProfile.recommendationStatus === 'Eligible for Recommendation' &&
                        'Student has demonstrated exceptional longitudinal attainment in all 12 Program Outcomes (≥60%) and maintains a high CGPA (≥3.50). Fully eligible for teacher recommendation.'}
                      {studentProfile.recommendationStatus === 'Not Recommended (PO Gap Detected)' &&
                        'RULE ENFORCED: Although student has a high CGPA (≥3.50), teacher recommendation is restricted due to Program Outcome competency gaps below target threshold.'}
                      {studentProfile.recommendationStatus === 'Conditional (Low CGPA)' &&
                        'Student meets PO competency thresholds across all mapped outcomes, but CGPA is below 3.50. Faculty review recommended before issuance.'}
                      {studentProfile.recommendationStatus === 'Ineligible (Low CGPA & PO Gaps)' &&
                        'Student does not meet the minimum CGPA requirement (3.50) and exhibits Program Outcome competency gaps.'}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-xl text-center border border-gray-300">
                  <span className="text-xs font-bold text-gray-600 block">Required Criteria</span>
                  <span className="text-xs font-extrabold text-gray-900">CGPA ≥ 3.50 & All POs ≥ {threshold}%</span>
                </div>
              </div>
            );
          })()}

          {/* Weak PO Competencies Alert Box (Highlighted in Red if gaps exist) */}
          {studentProfile.weakPOs && studentProfile.weakPOs.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-6 h-6 text-red-600" />
                <h4 className="text-lg font-black text-red-900">
                  Critical Program Outcome (PO) Gaps Detected ({studentProfile.weakPOs.length})
                </h4>
              </div>
              <p className="text-xs text-red-800 font-medium mb-4">
                The following Program Outcomes fall below the required minimum threshold of <strong className="font-extrabold">{threshold}%</strong> attainment. These competency gaps prevent auto-granting of a teacher recommendation:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {studentProfile.weakPOs.map((w) => (
                  <div key={w.po} className="bg-white border border-red-200 rounded-xl p-3.5 shadow-xs flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0">
                      {w.po}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-extrabold text-gray-900 truncate">{w.description}</div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg font-black text-red-600">{w.attainment}%</span>
                        <span className="text-xs font-bold text-gray-400">Target: {threshold}%</span>
                      </div>
                      <div className="text-[11px] font-extrabold text-red-700 mt-0.5">
                        Deficit: -{w.gapPercentage}% gap
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual PO Radar & Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Radar Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-black text-gray-900">PO Competency Profile (Radar)</h4>
                  <p className="text-xs text-gray-500">Student attainment vs {threshold}% target threshold across PO1–PO12</p>
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="po" tick={{ fill: '#374151', fontSize: 11, fontWeight: 700 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#9ca3af" />
                    <Radar
                      name="Student PO Attainment (%)"
                      dataKey="attainment"
                      stroke="#16a34a"
                      fill="#22c55e"
                      fillOpacity={0.4}
                    />
                    <Radar
                      name="Threshold (60%)"
                      dataKey="threshold"
                      stroke="#dc2626"
                      fill="#ef4444"
                      fillOpacity={0.1}
                      strokeDasharray="4 4"
                    />
                    <Tooltip
                      formatter={(val, name) => [`${val}%`, name]}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 600 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Bar Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-black text-gray-900">PO1–PO12 Attainment Breakdown</h4>
                  <p className="text-xs text-gray-500">Color-coded attainment scores (Green ≥ {threshold}%, Red &lt; {threshold}%)</p>
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="po" tick={{ fontSize: 11, fontWeight: 700, fill: '#4b5563' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, 'Attainment']}
                      labelFormatter={(label) => `${label}: ${PO_NAMES[label] || label}`}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                    />
                    <ReferenceLine y={threshold} stroke="#dc2626" strokeDasharray="4 4" label={{ value: `Threshold (${threshold}%)`, fill: '#dc2626', fontSize: 11, fontWeight: 700, position: 'top' }} />
                    <Bar dataKey="attainment" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.attainment >= threshold ? '#16a34a' : '#dc2626'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Program Outcome Detailed Table (PO1 to PO12) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-gray-900">PO1–PO12 Longitudinal Attainment Summary</h4>
                <p className="text-xs text-gray-500">Credit-weighted average across all completed course offerings</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100/70 text-gray-700 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">PO Code</th>
                    <th className="py-3 px-4">Outcome Competency Description</th>
                    <th className="py-3 px-4 text-center">Mapped Credits</th>
                    <th className="py-3 px-4 text-center">Evaluated Courses</th>
                    <th className="py-3 px-4 text-right">Student Attainment (%)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {studentProfile.longitudinalPOs && studentProfile.longitudinalPOs.map((p) => (
                    <tr key={p.po} className={p.isPassed ? 'hover:bg-gray-50' : 'bg-red-50/50 hover:bg-red-50'}>
                      <td className="py-3 px-4 font-black text-gray-900">{p.po}</td>
                      <td className="py-3 px-4 text-gray-800 font-semibold">{p.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-600">{p.mappedCredits || 0} credits</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-600">{p.evaluatedCoursesCount || 0} courses</td>
                      <td className="py-3 px-4 text-right font-black text-base">
                        <span className={p.isPassed ? 'text-emerald-700' : 'text-red-600'}>
                          {p.attainment}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.isPassed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800">
                            <XCircle className="w-3.5 h-3.5" /> Gap (-{(p.threshold - p.attainment).toFixed(1)}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Completed Courses Transcript Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-gray-900">Completed Courses & Grade Breakdown</h4>
                <p className="text-xs text-gray-500">Student course records used in longitudinal aggregation</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100/70 text-gray-700 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Course Title</th>
                    <th className="py-3 px-4 text-center">Semester</th>
                    <th className="py-3 px-4 text-center">Credits</th>
                    <th className="py-3 px-4 text-right">Marks (%)</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4 text-center">Grade Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {studentProfile.completedCourses && studentProfile.completedCourses.map((c, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-black text-green-800">{c.courseCode}</td>
                      <td className="py-3 px-4 text-gray-900 font-semibold">{c.courseTitle}</td>
                      <td className="py-3 px-4 text-center text-gray-600 font-bold">{c.semester}</td>
                      <td className="py-3 px-4 text-center font-bold">{c.creditHours}</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-800">{c.percentage}%</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-gray-100 text-gray-800 border border-gray-300">
                          {c.letterGrade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-amber-700">{(c.gradePoint || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Faculty Evaluation Notes & Save (No-print) */}
          <div className="no-print bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-700" />
                Faculty Endorsement & Review Remarks
              </h4>
            </div>

            <textarea
              rows={3}
              placeholder="Enter faculty endorsement notes, qualitative review, or recommendation remarks..."
              value={facultyNotes}
              onChange={(e) => setFacultyNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />

            <div className="flex justify-end">
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingNotes ? 'Saving...' : 'Save Recommendation Remarks'}
              </button>
            </div>
          </div>

          {/* Printable Official Signature & Sign-off Block */}
          <div className="hidden print:block border-t-2 border-gray-300 pt-8 mt-12">
            <div className="grid grid-cols-2 gap-12 text-center text-xs font-bold text-gray-800">
              <div>
                <div className="border-b border-gray-400 pb-1 mb-1 font-semibold text-gray-600">
                  {studentProfile.facultyNotes ? `Faculty Remarks: "${studentProfile.facultyNotes}"` : '___________________________________________'}
                </div>
                <p className="mt-8 font-black uppercase text-gray-900">Faculty Academic Evaluator</p>
                <p className="text-[10px] text-gray-500">Department of Computer Science & Engineering</p>
              </div>

              <div>
                <div className="border-b border-gray-400 pb-1 mb-1 font-semibold text-gray-600">
                  Status: <strong className="uppercase text-green-900">{studentProfile.recommendationStatus}</strong>
                </div>
                <p className="mt-8 font-black uppercase text-gray-900">Head of Department / Program Director</p>
                <p className="text-[10px] text-gray-500">Outcome-Based Education (OBE) Board</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
