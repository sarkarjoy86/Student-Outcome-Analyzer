import { useState, useEffect, useMemo } from 'react'
import { apiService } from '../../services/apiService'
import { BookOpen, Users, ChevronRight, AlertCircle, RefreshCw, GraduationCap, Filter, Loader2, ArrowLeft, Layers } from 'lucide-react'
 
export default function Dashboard({ onSelectOffering }) {
  const [offerings, setOfferings] = useState([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('current') // 'current' | 'completed' | 'all'
  const [selectedTerm, setSelectedTerm] = useState('ALL') // 'ALL' | 'Spring' | 'Fall' | 'Summer'
  const [selectedYear, setSelectedYear] = useState('ALL') // 'ALL' | '2026' | '2025' | ...
  const [selectedCourseGroup, setSelectedCourseGroup] = useState(null)
 
  useEffect(() => {
    fetchInitialData()
  }, [])
 
  const fetchInitialData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiService.getTeacherCourseOfferings()
      setOfferings(data.offerings || [])
    } catch (err) {
      setError(err.message || 'Failed to load assigned course offerings.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const startTime = Date.now()
    try {
      const data = await apiService.getTeacherCourseOfferings()
      setOfferings(data.offerings || [])
    } catch (err) {
      setError(err.message || 'Failed to load assigned course offerings.')
    } finally {
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 1000 - elapsedTime)
      setTimeout(() => {
        setIsRefreshing(false)
      }, remainingTime)
    }
  }

  // Extract currently active semester info
  const activeOfferings = offerings.filter((o) => o.semester?.status === 'active');
  const activeTerm = activeOfferings[0]?.semester?.semesterName
    ? activeOfferings[0].semester.semesterName.charAt(0).toUpperCase() + activeOfferings[0].semester.semesterName.slice(1).toLowerCase()
    : 'Spring';
  const activeYear = activeOfferings[0]?.academicYear || activeOfferings[0]?.semester?.academicYear || 2026;
  const isCurrent = semesterFilter === 'current';

  // Dynamically extract available years and terms for Completed and All scopes
  const availableYears = Array.from(
    new Set(
      offerings
        .filter((o) => semesterFilter === 'all' || o.semester?.status !== 'active')
        .map((o) => o.academicYear || o.semester?.academicYear)
        .filter(Boolean)
    )
  ).sort((a, b) => b - a)

  const availableTerms = Array.from(
    new Set(
      offerings
        .filter((o) => semesterFilter === 'all' || o.semester?.status !== 'active')
        .map((o) => {
          const raw = o.semester?.semesterName
          if (!raw) return null
          return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
        })
        .filter(Boolean)
    )
  ).sort()
 
  // Filtering logic: In Current Semesters, it strictly locks to active offerings. In Completed or All, allows custom Term/Year filtering.
  const filteredOfferings = offerings.filter((offering) => {
    const isSemActive = offering.semester?.status === 'active';
    
    // Status Filter (Current vs Completed vs All)
    if (isCurrent) return isSemActive;
    if (semesterFilter === 'completed' && isSemActive) return false;

    // Term Filter (Spring, Fall, Summer, etc.)
    if (selectedTerm !== 'ALL') {
      const termName = (offering.semester?.semesterName || '').toLowerCase()
      if (termName !== selectedTerm.toLowerCase()) return false
    }

    // Academic Year Filter (2026, 2025, etc.)
    if (selectedYear !== 'ALL') {
      const year = String(offering.academicYear || offering.semester?.academicYear || '')
      if (year !== String(selectedYear)) return false
    }

    return true
  });
 
  // Group filtered offerings by semesterName + academicYear
  const groupedOfferings = filteredOfferings.reduce((groups, offering) => {
    const semName = offering.semester?.semesterName || 'Other';
    // Format e.g., "SPRING" -> "Spring"
    const formattedSemName = semName.charAt(0).toUpperCase() + semName.slice(1).toLowerCase();
    const year = offering.academicYear || offering.semester?.academicYear || '';
    const sessionName = year ? `${formattedSemName} (${year})` : formattedSemName;
 
    if (!groups[sessionName]) {
      groups[sessionName] = [];
    }
    groups[sessionName].push(offering);
    return groups;
  }, {});

  // Group offerings inside each session by unique Course + Batch, aggregating sections and students
  const groupedCoursesBySession = useMemo(() => {
    const result = {};

    Object.entries(groupedOfferings).forEach(([sessionName, sectionOfferings]) => {
      const courseMap = new Map();

      sectionOfferings.forEach((offering) => {
        const courseId = offering.course?.courseCode || offering.course?._id || 'UNKNOWN';
        const batchName = offering.batch?.name || 'N/A';
        const groupKey = `${courseId}_${batchName}`;

        if (!courseMap.has(groupKey)) {
          courseMap.set(groupKey, {
            groupKey,
            sessionName,
            semesterId: offering.semester?._id || offering.semester?.semesterName,
            semesterName: offering.semester?.semesterName || 'SEMESTER',
            courseCode: offering.course?.courseCode || 'N/A',
            courseName: offering.course?.courseName || offering.course?.title || '',
            creditHours: offering.course?.creditHours,
            level: offering.course?.level || '1',
            term: offering.course?.term || 'I',
            batchName: batchName,
            batch: offering.batch,
            course: offering.course,
            sections: [],
            totalStudents: 0
          });
        }

        const group = courseMap.get(groupKey);
        group.sections.push(offering);
        group.totalStudents += (offering.studentCount ?? 0);
      });

      // Sort sections alphabetically: Section A, Section B, Section C...
      courseMap.forEach((grp) => {
        grp.sections.sort((a, b) => String(a.section || '').localeCompare(String(b.section || '')));
      });

      result[sessionName] = Array.from(courseMap.values());
    });

    return result;
  }, [groupedOfferings]);

  const handleSelectCourseGroup = (courseGroup) => {
    setSelectedCourseGroup(courseGroup);
    const url = new URL(window.location.href);
    url.searchParams.set("course", courseGroup.courseCode);
    if (courseGroup.batchName && courseGroup.batchName !== 'N/A') {
      url.searchParams.set("batch", courseGroup.batchName);
    }
    url.searchParams.delete("offering");
    url.searchParams.delete("tab");
    url.searchParams.delete("paper");
    window.history.pushState(
      {
        view: "course_group",
        groupKey: courseGroup.groupKey,
        courseCode: courseGroup.courseCode,
        batchName: courseGroup.batchName,
      },
      "",
      url.toString()
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToAllCourses = () => {
    setSelectedCourseGroup(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("course");
    url.searchParams.delete("batch");
    url.searchParams.delete("offering");
    url.searchParams.delete("tab");
    url.searchParams.delete("paper");
    window.history.pushState({ view: "dashboard" }, "", url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Synchronize browser history (Browser Back/Forward, Mouse 3/4, Alt+Left) and URL query parameters
  useEffect(() => {
    const handlePopState = (e) => {
      const state = e.state;
      const params = new URLSearchParams(window.location.search);
      const courseCode = params.get("course");
      const batchName = params.get("batch");

      if (state?.view === "course_group" || (courseCode && (!state || state.view !== "dashboard"))) {
        let found = null;
        Object.values(groupedCoursesBySession).forEach((courseList) => {
          const match = courseList.find((c) => {
            if (state?.groupKey && c.groupKey === state.groupKey) return true;
            if (courseCode && c.courseCode.toLowerCase() === courseCode.toLowerCase()) {
              if (!batchName || c.batchName === batchName) return true;
            }
            return false;
          });
          if (match) found = match;
        });
        if (found) {
          setSelectedCourseGroup(found);
          return;
        }
      }

      // Navigated back to dashboard / all courses
      setSelectedCourseGroup(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [groupedCoursesBySession]);

  // Initial load or session refresh sync with URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const courseCode = params.get("course");
    const batchName = params.get("batch");
    const state = window.history.state;

    if (courseCode || state?.view === "course_group") {
      let found = null;
      Object.values(groupedCoursesBySession).forEach((courseList) => {
        const match = courseList.find((c) => {
          if (state?.groupKey && c.groupKey === state.groupKey) return true;
          if (courseCode && c.courseCode.toLowerCase() === courseCode.toLowerCase()) {
            if (!batchName || c.batchName === batchName) return true;
          }
          return false;
        });
        if (match) found = match;
      });
      if (found) {
        setSelectedCourseGroup(found);
      }
    } else if (!courseCode && (!state || state.view === "dashboard") && selectedCourseGroup) {
      setSelectedCourseGroup(null);
    }
  }, [groupedCoursesBySession]);

  const uniqueFilteredCoursesCount = useMemo(() => {
    return Object.values(groupedCoursesBySession).reduce((sum, list) => sum + list.length, 0);
  }, [groupedCoursesBySession]);

  const totalUniqueCoursesCount = useMemo(() => {
    const set = new Set(offerings.map((o) => `${o.course?.courseCode || o.course?._id}_${o.batch?.name || ''}`));
    return set.size;
  }, [offerings]);
 
  const sessionOrder = Object.keys(groupedCoursesBySession).sort((a, b) => {
    const yearA = parseInt(a.match(/\d+/)?.[0] || 0);
    const yearB = parseInt(b.match(/\d+/)?.[0] || 0);
    if (yearA !== yearB) {
      return yearB - yearA;
    }
    const getSeasonPriority = (name) => {
      const lower = name.toLowerCase();
      if (lower.includes('fall') || lower.includes('autumn')) return 3;
      if (lower.includes('summer')) return 2;
      if (lower.includes('spring')) return 1;
      return 0;
    };
    return getSeasonPriority(b) - getSeasonPriority(a);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/10 to-blue-50/10 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {error && (
          <div className="p-4 rounded-xl flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 shadow-sm font-medium">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
 
        {/* Conditional View: 1. Drill-down Section Selection View (My Courses Header HIDDEN) OR 2. Main Courses Landing View */}
        {selectedCourseGroup ? (
          /* Smooth Professional Drill-Down Section Selection View */
          <div className="space-y-6 animate-fadeIn">
            {/* Top Navigation & Session Info */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToAllCourses}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-green-50 text-gray-700 hover:text-green-800 rounded-xl border border-gray-200 hover:border-green-300 shadow-xs hover:shadow-sm font-bold text-xs transition-all cursor-pointer group"
              >
                <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform text-green-700" />
                <span>Back to All Courses</span>
              </button>

              <span className="text-xs font-semibold text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
                Session: <strong className="text-gray-700">{selectedCourseGroup.sessionName}</strong>
              </span>
            </div>

            {/* Selected Course Context Header Card (Acts as the primary heading in this view) */}
            <div className="bg-gradient-to-br from-white via-white to-green-50/30 p-6 md:p-7 rounded-2xl shadow-md border border-green-200/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-extrabold uppercase">
                      {selectedCourseGroup.semesterName}
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide">
                      {selectedCourseGroup.sections.length} {selectedCourseGroup.sections.length === 1 ? 'Section' : 'Sections'}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 pt-1">
                    {selectedCourseGroup.courseCode} — {selectedCourseGroup.courseName}
                  </h2>
                  <p className="text-gray-500 text-xs md:text-sm font-medium">
                    Choose a section below to enter the classroom and manage assessments, marks entry, and CO-PO attainment.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-100 text-xs text-gray-600 font-semibold">
                <div>Batch: <span className="font-bold text-gray-800">{selectedCourseGroup.batchName}</span></div>
                <div className="text-gray-300">•</div>
                <div>Level & Term: <span className="font-bold text-purple-800">L-{selectedCourseGroup.level}, T-{selectedCourseGroup.term}</span></div>
                <div className="text-gray-300">•</div>
                <div>Credits: <span className="font-bold text-gray-800">{selectedCourseGroup.creditHours} Credits</span></div>
                <div className="text-gray-300">•</div>
                <div className="flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-green-600" />
                  <span>Total Enrolled: <strong className="text-gray-800">{selectedCourseGroup.totalStudents} Students</strong></span>
                </div>
              </div>
            </div>

            {/* Sections Grid - Renders the individual section cards with their Open Classroom actions */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Users size={18} className="text-green-700" />
                Available Sections
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedCourseGroup.sections.map((offering) => (
                  <div
                    key={offering._id}
                    onClick={() => onSelectOffering(offering)}
                    onMouseEnter={() => {
                      import('../marks/QuestionPaperEditor').catch(() => {})
                    }}
                    className="bg-white hover:bg-gradient-to-br hover:from-white hover:to-green-50/20 p-6 rounded-2xl shadow-md hover:shadow-xl border border-gray-200/60 hover:border-green-300 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-extrabold uppercase">
                          {offering.semester?.semesterName || 'SEMESTER'}
                        </span>
                        <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide">
                          Section {offering.section || 'A'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-800 transition-colors">
                          {offering.course?.courseCode}
                        </h3>
                        <p className="text-gray-600 text-sm font-semibold truncate">
                          {offering.course?.courseName}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-gray-500 font-semibold border-t border-gray-50">
                        <div>Batch: <span className="font-bold text-gray-700">{offering.batch?.name || 'N/A'}</span></div>
                        <div>Level & Term: <span className="font-bold text-purple-800">L-{offering.course?.level || '1'}, T-{offering.course?.term || 'I'}</span></div>
                        <div>Credits: <span className="font-bold text-gray-700">{offering.course?.creditHours} Credits</span></div>
                        <div className="flex items-center gap-1">
                          <GraduationCap size={12} className="text-green-600" />
                          Students: <span className="font-bold text-gray-700">{offering.studentCount ?? 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end text-sm font-bold text-green-700">
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Open Classroom</span>
                        <ChevronRight size={16} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Main Landing View: "My Courses" Header Card + Grouped Course Cards List */
          <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-br from-white via-white to-green-50/20 backdrop-blur-lg p-6 md:p-7 rounded-2xl shadow-xl border border-green-200/50 space-y-5">
              {/* Top Row: Title, Subtitle, and Compact Refresh Button */}
              <div className="flex flex-row justify-between items-start gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-green-800 via-green-600 to-blue-700 bg-clip-text text-transparent">
                    My Courses
                  </h1>
                  <p className="text-gray-600 text-sm md:text-base font-medium">
                    Select one of your assigned courses to manage student assessments, marks entry, and CO-PO attainment.
                  </p>
                </div>

                {/* Compact Refresh Button (Upper Row) */}
                <div className="shrink-0 pt-0.5">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || loading}
                    title="Refresh Courses"
                    className="p-2 md:p-2.5 bg-white hover:bg-green-50 text-gray-600 hover:text-green-800 rounded-xl border border-gray-200 hover:border-green-300 shadow-xs hover:shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center cursor-pointer group"
                    aria-label="Refresh"
                  >
                    <RefreshCw size={16} className={`text-green-600 group-hover:rotate-180 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Bottom Row: All 3 Filters in a Single Compact Line */}
              <div className="pt-3 border-t border-green-100/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Semester Scope Filter */}
                  <div className="flex items-center gap-1.5 bg-green-50/80 px-3 py-1.5 rounded-xl border border-green-200 text-green-900 text-xs font-bold shadow-xs">
                    <Filter size={13} className="text-green-700 shrink-0" />
                    <span className="text-green-700 font-bold">Semesters:</span>
                    <select
                      value={semesterFilter}
                      onChange={(e) => {
                        const val = e.target.value
                        setSemesterFilter(val)
                        if (val === 'current') {
                          setSelectedTerm('ALL')
                          setSelectedYear('ALL')
                        }
                      }}
                      className="bg-transparent text-xs font-extrabold text-green-900 focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="current">Current Semesters</option>
                      <option value="completed">Completed Semesters</option>
                      <option value="all">All Semesters</option>
                    </select>
                  </div>

                  {/* Term Filter (Locked to active semester in Current Semesters, interactive otherwise) */}
                  <div
                    className={`flex items-center gap-1.5 bg-green-50/80 px-3 py-1.5 rounded-xl border border-green-200 text-green-900 text-xs font-bold shadow-xs transition-all ${
                      isCurrent ? 'cursor-default select-none' : 'focus-within:ring-2 focus-within:ring-green-400/40'
                    }`}
                  >
                    <span className="text-green-700 font-bold">Term:</span>
                    <select
                      value={isCurrent ? activeTerm : selectedTerm}
                      disabled={isCurrent}
                      onChange={(e) => setSelectedTerm(e.target.value)}
                      className={`bg-transparent text-xs font-extrabold text-green-900 focus:outline-none pr-1 ${
                        isCurrent ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      {isCurrent ? (
                        <option value={activeTerm}>{activeTerm}</option>
                      ) : (
                        <>
                          <option value="ALL">All Terms</option>
                          {availableTerms.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Year Filter (Locked to active semester in Current Semesters, interactive otherwise) */}
                  <div
                    className={`flex items-center gap-1.5 bg-green-50/80 px-3 py-1.5 rounded-xl border border-green-200 text-green-900 text-xs font-bold shadow-xs transition-all ${
                      isCurrent ? 'cursor-default select-none' : 'focus-within:ring-2 focus-within:ring-green-400/40'
                    }`}
                  >
                    <span className="text-green-700 font-bold">Year:</span>
                    <select
                      value={isCurrent ? String(activeYear) : selectedYear}
                      disabled={isCurrent}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className={`bg-transparent text-xs font-extrabold text-green-900 focus:outline-none pr-1 ${
                        isCurrent ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      {isCurrent ? (
                        <option value={String(activeYear)}>{activeYear}</option>
                      ) : (
                        <>
                          <option value="ALL">All Years</option>
                          {availableYears.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Reset filter shortcut if active in Completed or All Semesters */}
                  {!isCurrent && (selectedTerm !== 'ALL' || selectedYear !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTerm('ALL')
                        setSelectedYear('ALL')
                      }}
                      className="text-[11px] font-bold text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Reset Term and Year filters to All"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Courses Count Badge */}
                <div className="text-xs font-bold text-gray-500">
                  Showing <span className="text-green-800 font-extrabold">{uniqueFilteredCoursesCount}</span> of {totalUniqueCoursesCount} Courses
                </div>
              </div>
            </div>

            {/* Minimal Professional Refresh Loading Badge */}
            {isRefreshing && (
              <div className="flex items-center justify-center animate-fadeIn py-1">
                <div className="inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-green-200 shadow-sm text-green-900 text-xs font-bold transition-all">
                  <Loader2 size={14} className="animate-spin text-green-600" />
                  <span>Refreshing courses...</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                  </span>
                </div>
              </div>
            )}

            {/* Main Landing View: Grouped Course Cards List */}
            <div className="space-y-12">
              {offerings.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-300 text-center space-y-4 max-w-2xl mx-auto">
                  <Users size={48} className="mx-auto text-gray-400" />
                  <p className="text-gray-500 font-medium text-lg">
                    No courses have been assigned to you.
                  </p>
                  <p className="text-sm text-gray-400">
                    Please contact the Administrator to assign your courses.
                  </p>
                </div>
              ) : filteredOfferings.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-4 max-w-2xl mx-auto shadow-md">
                  <Users size={48} className="mx-auto text-gray-400" />
                  <p className="text-gray-600 font-bold text-lg">
                    No courses match the selected filter.
                  </p>
                  <p className="text-sm text-gray-400 font-medium">
                    Try switching Term / Year or choosing <strong className="text-green-700">"Current Semesters"</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSemesterFilter('current')
                      setSelectedTerm('ALL')
                      setSelectedYear('ALL')
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                sessionOrder.map((sessionName) => {
                  const coursesInSession = groupedCoursesBySession[sessionName] || [];
                  if (coursesInSession.length === 0) return null;

                  return (
                    <div key={sessionName} className="space-y-6">
                      <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3 border-b pb-3 border-gray-200">
                        <BookOpen size={24} className="text-green-700 font-semibold" />
                        {sessionName}
                        <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">
                          {coursesInSession.length} {coursesInSession.length === 1 ? 'Course' : 'Courses'}
                        </span>
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {coursesInSession.map((courseGroup) => (
                          <div
                            key={courseGroup.groupKey}
                            onClick={() => handleSelectCourseGroup(courseGroup)}
                            className="bg-white hover:bg-gradient-to-br hover:from-white hover:to-green-50/20 p-6 rounded-2xl shadow-md hover:shadow-xl border border-gray-200/60 hover:border-green-300 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-extrabold uppercase">
                                  {courseGroup.semesterName}
                                </span>
                                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide">
                                  {courseGroup.sections.length} {courseGroup.sections.length === 1 ? 'Section' : 'Sections'}
                                </span>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-800 transition-colors">
                                  {courseGroup.courseCode}
                                </h3>
                                <p className="text-gray-600 text-sm font-semibold truncate">
                                  {courseGroup.courseName}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-gray-500 font-semibold border-t border-gray-50">
                                <div>Batch: <span className="font-bold text-gray-700">{courseGroup.batchName}</span></div>
                                <div>Level & Term: <span className="font-bold text-purple-800">L-{courseGroup.level}, T-{courseGroup.term}</span></div>
                                <div>Credits: <span className="font-bold text-gray-700">{courseGroup.creditHours} Credits</span></div>
                                <div className="flex items-center gap-1">
                                  <GraduationCap size={12} className="text-green-600" />
                                  Students: <span className="font-bold text-gray-700">{courseGroup.totalStudents}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end text-sm font-bold text-green-700">
                              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                <span>Open Course</span>
                                <ChevronRight size={16} />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
