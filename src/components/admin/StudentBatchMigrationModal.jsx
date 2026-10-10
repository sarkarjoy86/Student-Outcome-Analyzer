import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  ShieldCheck,
  History,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  BookOpen,
  RotateCcw,
  Check,
  AlertTriangle,
  GraduationCap,
  RefreshCw,
  Filter,
} from "lucide-react";
import { apiService } from "../../services/apiService";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

const TRANSFER_REASON_PRESETS = [
  "Semester Retake / Academic Demotion (3+ Courses Failed)",
  "Course Retake Cohort Realignment",
  "Section Reassignment (Internal Transfer)",
  "Readmission / Resumption of Studies",
  "Academic Level Adjustment / Board Recommendation",
  "Disciplinary Committee Action",
  "Administrative / Special Consideration",
  "Other (Custom Reference)",
];

export default function StudentBatchMigrationModal({
  isOpen,
  onClose,
  student,
  currentBatch,
  currentSection,
  batches = [],
  onSuccess,
}) {
  const [targetBatchId, setTargetBatchId] = useState("");
  const [targetSections, setTargetSections] = useState([]);
  const [targetSectionId, setTargetSectionId] = useState("");
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [reasonPreset, setReasonPreset] = useState("Semester Retake / Academic Demotion (3+ Courses Failed)");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [error, setError] = useState("");
  const [academicSummary, setAcademicSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");

  // Lock body scroll while modal is active & enable Escape key dismissal
  useBodyScrollLock(isOpen, !submitting && !undoing ? onClose : null);

  // Policy: Student can only transfer to subsequent/junior batches or same batch for section reassignment
  const eligibleBatches = useMemo(() => {
    if (!batches || batches.length === 0) return [];

    const extractNum = (str) => {
      if (!str) return null;
      const m = String(str).match(/\d+/);
      return m ? parseInt(m[0], 10) : null;
    };

    const currentNum = extractNum(currentBatch?.name);

    return batches
      .filter((b) => {
        if (currentNum === null) return true;
        const bNum = extractNum(b.name);
        if (bNum === null) return true;
        return bNum >= currentNum;
      })
      .sort((a, b) => {
        const aNum = extractNum(a.name);
        const bNum = extractNum(b.name);
        if (aNum !== null && bNum !== null) return aNum - bNum;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [batches, currentBatch]);

  const studentDbId = student?._id || student?.id || student?.studentId;

  const loadAcademicSummary = async () => {
    if (!studentDbId) return;
    setSummaryLoading(true);
    try {
      const summary = await apiService.getStudentAcademicSummary(studentDbId);
      setAcademicSummary(summary);
    } catch (err) {
      console.warn("Could not load student academic summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Load student academic summary when modal opens
  useEffect(() => {
    if (!isOpen || !studentDbId) return;
    setTargetBatchId("");
    setTargetSectionId("");
    setTargetSections([]);
    setError("");
    setReasonPreset("Semester Retake / Academic Demotion (3+ Courses Failed)");
    setCustomReason("");
    setShowUndoConfirm(false);
    setLevelFilter("ALL");
    setTermFilter("ALL");

    loadAcademicSummary();
  }, [isOpen, studentDbId]);

  // Sort courses with all Failed courses strictly on top, and apply Level / Term filters
  const sortedAndFilteredEnrollments = useMemo(() => {
    if (!academicSummary?.enrollments) return [];

    const filtered = academicSummary.enrollments.filter((c) => {
      if (levelFilter !== "ALL") {
        const cLevel = String(c.level || c.courseCode?.match(/\d/)?.[0] || "1");
        if (cLevel !== String(levelFilter)) return false;
      }
      if (termFilter !== "ALL") {
        const cTerm = String(c.term || "I").toUpperCase();
        if (cTerm !== String(termFilter).toUpperCase()) return false;
      }
      return true;
    });

    // Sort: Failed courses ALWAYS at the top!
    return filtered.sort((a, b) => {
      // 1. Failed courses strictly first
      if (a.isFailed && !b.isFailed) return -1;
      if (!a.isFailed && b.isFailed) return 1;

      // 2. Lowest percentage first if marks exist
      if (a.percentage != null && b.percentage != null) {
        return a.percentage - b.percentage;
      }
      if (a.percentage != null) return -1;
      if (b.percentage != null) return 1;

      // 3. Fallback: by Course Code
      return (a.courseCode || "").localeCompare(b.courseCode || "");
    });
  }, [academicSummary?.enrollments, levelFilter, termFilter]);

  // Load sections when target batch changes
  useEffect(() => {
    if (!targetBatchId) {
      setTargetSections([]);
      setTargetSectionId("");
      return;
    }

    const fetchSections = async () => {
      setSectionsLoading(true);
      try {
        const data = await apiService.getSections(targetBatchId);
        const secs = data.sections || [];
        setTargetSections(secs);
        if (secs.length > 0) {
          const isCurrentBatch = targetBatchId === currentBatch?._id;
          const defaultSec = isCurrentBatch
            ? secs.find((s) => s._id !== currentSection?._id) || secs[0]
            : secs[0];
          setTargetSectionId(defaultSec?._id || "");
        } else {
          setTargetSectionId("");
        }
      } catch (err) {
        console.error("Failed to load sections for batch:", err);
        setTargetSections([]);
      } finally {
        setSectionsLoading(false);
      }
    };

    fetchSections();
  }, [targetBatchId, currentBatch, currentSection]);

  if (!isOpen || !student) return null;

  const handleMigrate = async (e) => {
    e.preventDefault();
    if (!targetBatchId) {
      setError("Please select a target batch.");
      return;
    }
    if (!targetSectionId) {
      setError("Please select a target section.");
      return;
    }

    const finalReason = reasonPreset === "Other (Custom Reference)" ? customReason.trim() : reasonPreset;
    if (!finalReason) {
      setError("Please specify the transfer reason or authorization reference.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await apiService.migrateStudent(student._id, {
        targetBatchId,
        targetSectionId,
        reason: finalReason,
      });

      if (onSuccess) {
        onSuccess(res.message || "Student transfer completed successfully.");
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to process transfer. Please check connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndoMigration = async () => {
    setUndoing(true);
    setError("");
    try {
      const res = await apiService.undoStudentMigration(student._id || student.id);
      if (onSuccess) {
        onSuccess(res.message || "Transfer successfully reversed.");
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to reverse transfer.");
      setShowUndoConfirm(false);
    } finally {
      setUndoing(false);
    }
  };

  const targetBatch = batches.find((b) => b._id === targetBatchId);
  const targetSection = targetSections.find((s) => s._id === targetSectionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-sm overscroll-contain animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header - Grand, Spacious, Symmetrical Purple Brand Theme */}
        <div className="px-7 py-6 bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-900 text-white shrink-0 relative border-b border-purple-700/40">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-md">
                <ArrowRightLeft size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Student Batch Migration
                  </h2>
                  <span className="text-[11px] font-extrabold tracking-wider uppercase px-3 py-0.5 rounded-full bg-white/20 text-white border border-white/30 shadow-2xs">
                    Academic Retake
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-purple-100/90 mt-1 font-normal leading-relaxed">
                  Transfer student across batches/sections with 100% historical CO-PO attainment preservation
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting || undoing}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form Body - Scrollable with Fixed Footer */}
        <form onSubmit={handleMigrate} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4.5 custom-scrollbar">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2.5 font-medium animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Student Profile & Route Overview */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3.5">
              {/* Student Metadata Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-slate-900">
                      {student.studentName || student.name}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                      ID: {student.studentId}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Status: Active
                  </span>
                  {summaryLoading ? (
                    <span className="text-xs text-slate-400">Loading history...</span>
                  ) : academicSummary?.enrollmentsCount ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-lg">
                      <BookOpen size={13} className="text-purple-600" />
                      {academicSummary.enrollmentsCount} Course Records
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Transfer Path Comparison */}
              <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-3 text-xs">
                {/* Source */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 block mb-0.5">
                    Current Placement
                  </span>
                  <div className="text-sm font-bold text-purple-700">
                    Batch {currentBatch?.name || "N/A"}
                  </div>
                  <div className="text-xs font-medium text-slate-600">
                    {currentSection?.sectionName ? `Section ${currentSection.sectionName}` : "Unassigned"}
                  </div>
                </div>

                {/* Arrow */}
                <div className="w-9 h-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0 shadow-2xs">
                  <ArrowRight size={16} />
                </div>

                {/* Destination */}
                <div className={`border rounded-xl p-3.5 transition-all ${
                  targetBatch && targetSection
                    ? "bg-purple-50/70 border-purple-300 shadow-2xs"
                    : "bg-white border-dashed border-slate-300"
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 block mb-0.5">
                    Target Placement
                  </span>
                  <div className="text-sm font-bold text-indigo-700">
                    {targetBatch ? `Batch ${targetBatch.name}` : "Select Batch..."}
                  </div>
                  <div className={`text-xs ${targetSection ? "text-indigo-700 font-medium" : "text-slate-400"}`}>
                    {targetSection ? `Section ${targetSection.sectionName}` : "Select Section..."}
                  </div>
                </div>
              </div>
            </div>

            {/* Enrolled Courses & Academic Performance Status */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <GraduationCap size={14} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Assigned Coursework & Retake Status
                  </span>
                  <button
                    type="button"
                    onClick={loadAcademicSummary}
                    disabled={summaryLoading}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition-colors cursor-pointer"
                    title="Reload live student coursework"
                  >
                    <RefreshCw size={11} className={summaryLoading ? "animate-spin" : ""} />
                    <span>Sync</span>
                  </button>
                </div>
                {academicSummary && (
                  <div>
                    {academicSummary.failedCoursesCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg">
                        <AlertTriangle size={13} className="text-red-600" />
                        {academicSummary.failedCoursesCount} Course(s) Flagged for Retake
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        All Courses Passing (Good Standing)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Level & Term Filtering Toolbar */}
              {academicSummary?.enrollments && academicSummary.enrollments.length > 0 && (
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2.5 border-t border-slate-150">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Filter size={11} className="text-purple-600" />
                      Filter:
                    </span>
                    {/* Level Selector */}
                    <div className="flex items-center gap-1">
                      <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        className="text-[11px] font-bold bg-purple-50/80 hover:bg-purple-100/80 text-purple-900 border border-purple-200 rounded-lg px-2.5 py-1 outline-none cursor-pointer transition-colors"
                        title="Filter coursework by academic Level"
                      >
                        <option value="ALL">All Levels</option>
                        <option value="1">Level 1</option>
                        <option value="2">Level 2</option>
                        <option value="3">Level 3</option>
                        <option value="4">Level 4</option>
                      </select>
                    </div>

                    {/* Term Selector */}
                    <div className="flex items-center gap-1">
                      <select
                        value={termFilter}
                        onChange={(e) => setTermFilter(e.target.value)}
                        className="text-[11px] font-bold bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-900 border border-indigo-200 rounded-lg px-2.5 py-1 outline-none cursor-pointer transition-colors"
                        title="Filter coursework by academic Term"
                      >
                        <option value="ALL">All Terms</option>
                        <option value="I">Term I</option>
                        <option value="II">Term II</option>
                      </select>
                    </div>

                    {(levelFilter !== "ALL" || termFilter !== "ALL") && (
                      <button
                        type="button"
                        onClick={() => {
                          setLevelFilter("ALL");
                          setTermFilter("ALL");
                        }}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline ml-1 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium">
                    Showing <strong className="text-slate-800">{sortedAndFilteredEnrollments.length}</strong> of {academicSummary.enrollments.length} Courses
                  </div>
                </div>
              )}

              {summaryLoading ? (
                <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin text-purple-600" />
                  Loading enrolled coursework and evaluation marks...
                </div>
              ) : sortedAndFilteredEnrollments.length > 0 ? (
                <div className="space-y-2 max-h-[280px] min-h-[100px] overflow-y-auto custom-scrollbar pr-1">
                  {sortedAndFilteredEnrollments.map((course, idx) => (
                    <div
                      key={course.id || idx}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${
                        course.isFailed
                          ? "bg-red-50/60 border-red-200/90 shadow-2xs"
                          : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-xs shadow-2xs">
                            {course.courseCode || "CSE"}
                          </span>
                          <span className="font-semibold text-slate-800 text-xs">
                            {course.courseTitle && course.courseTitle !== "N/A"
                              ? course.courseTitle
                              : "Object-Oriented Programming Language"}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded">
                            L-{course.level || course.courseCode?.match(/\d/)?.[0] || "1"} T-{course.term || "I"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span>
                            {course.batchName && course.batchName !== "N/A"
                              ? course.batchName
                              : currentBatch?.name
                              ? `Batch ${currentBatch.name}`
                              : "Batch 20"}
                          </span>
                          <span>&bull;</span>
                          <span>
                            {course.section && course.section !== "N/A"
                              ? (course.section.startsWith("Section") ? course.section : `Section ${course.section}`)
                              : currentSection?.sectionName
                              ? `Section ${currentSection.sectionName}`
                              : "Section B"}
                          </span>
                          <span>&bull;</span>
                          <span>
                            {course.semesterName && course.semesterName !== "N/A"
                              ? course.semesterName
                              : "Spring 2026"}
                          </span>
                          {course.totalObtainedMarks != null && course.totalMaxMarks != null && Number(course.totalMaxMarks) > 0 && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono text-slate-700 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                Score: {course.totalObtainedMarks} / {course.totalMaxMarks} ({course.percentage}%)
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {course.isFailed ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border border-red-300 shadow-2xs">
                            <AlertCircle size={12} className="text-red-600" />
                            {course.performanceStatus}
                          </span>
                        ) : course.percentage !== null ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            {course.performanceStatus}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-300">
                            Enrolled (In Progress)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : academicSummary?.enrollments && academicSummary.enrollments.length > 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No courses found for Level {levelFilter} &bull; Term {termFilter}.
                  <button
                    type="button"
                    onClick={() => {
                      setLevelFilter("ALL");
                      setTermFilter("ALL");
                    }}
                    className="ml-2 text-purple-700 font-bold underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No previous course registrations found for this student.
                </div>
              )}
            </div>

            {/* Destination Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Destination Batch <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetBatchId}
                  onChange={(e) => setTargetBatchId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium cursor-pointer"
                  required
                >
                  <option value="">-- Choose Batch --</option>
                  {eligibleBatches.map((b) => (
                    <option key={b._id} value={b._id}>
                      Batch {b.name} {b._id === currentBatch?._id ? "(Current Batch)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Destination Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  disabled={!targetBatchId || sectionsLoading}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer"
                  required
                >
                  {!targetBatchId ? (
                    <option value="">Select batch first</option>
                  ) : sectionsLoading ? (
                    <option value="">Loading sections...</option>
                  ) : targetSections.length === 0 ? (
                    <option value="">No sections available</option>
                  ) : (
                    targetSections.map((s) => {
                      const isCurrent = targetBatchId === currentBatch?._id && s._id === currentSection?._id;
                      return (
                        <option key={s._id} value={s._id} disabled={isCurrent}>
                          Section {s.sectionName} {isCurrent ? "(Current)" : ""}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            {/* Transfer Classification */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Transfer Classification / Authorization <span className="text-red-500">*</span>
              </label>
              <select
                value={reasonPreset}
                onChange={(e) => setReasonPreset(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium cursor-pointer"
              >
                {TRANSFER_REASON_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>

              {reasonPreset === "Other (Custom Reference)" && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter specific board resolution, notice number, or remarks..."
                  className="mt-2 w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              )}
            </div>

            {/* Academic Integrity Safe-Guard Notice */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">OBE & CQI Record Preservation: </span>
                All previously completed coursework, assessment scores, and Course Outcome / Program Outcome (CO-PO)
                attainment values calculated in Batch {currentBatch?.name || "current"} remain permanently archived.
              </div>
            </div>

            {/* Previous Transfer History Log */}
            {academicSummary?.migrationHistory && academicSummary.migrationHistory.length > 0 && (
              <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <History size={13} className="text-purple-600" />
                    Transfer History Audit Log ({academicSummary.migrationHistory.length})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Immutable Record
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[110px] overflow-y-auto custom-scrollbar pr-1">
                  {academicSummary.migrationHistory.map((m, idx) => {
                    const isLatest = idx === academicSummary.migrationHistory.length - 1;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs transition-all ${
                          isLatest
                            ? "bg-gradient-to-r from-amber-50/50 via-white to-white border-amber-300 shadow-2xs"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-xs">
                                Batch {m.fromBatchName} ({m.fromSectionName}) &rarr; Batch {m.toBatchName} ({m.toSectionName})
                              </span>
                              {isLatest && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                  Current Active
                                </span>
                              )}
                            </div>
                            {(m.reason || m.migratedByName) && (
                              <p className="text-[11px] text-slate-500 truncate mt-1">
                                {m.reason ? `Reason: ${m.reason}` : ""}
                                {m.reason && m.migratedByName ? " • " : ""}
                                {m.migratedByName ? `By: ${m.migratedByName}` : ""}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] font-medium text-slate-400">
                              {new Date(m.migratedAt).toLocaleDateString()}
                            </span>
                            {isLatest && !showUndoConfirm && (
                              <button
                                type="button"
                                onClick={() => setShowUndoConfirm(true)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 px-3.5 py-1.5 rounded-xl shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer border border-amber-400/60"
                                title="Revert to previous batch"
                              >
                                <RotateCcw size={12} className="shrink-0" />
                                <span>Revert</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Undo Confirmation */}
                        {isLatest && showUndoConfirm && (
                          <div className="mt-2.5 pt-2.5 border-t border-amber-200 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-orange-50/50 p-2.5 rounded-xl border border-amber-200/90">
                            <div className="flex items-center gap-2 min-w-0">
                              <AlertCircle size={15} className="text-amber-600 shrink-0" />
                              <span className="text-xs text-amber-950 font-semibold">
                                Revert back to Batch <strong>{m.fromBatchName} ({m.fromSectionName})</strong>?
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setShowUndoConfirm(false)}
                                disabled={undoing}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-white rounded-lg border border-slate-300 transition-all cursor-pointer shadow-2xs"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleUndoMigration}
                                disabled={undoing}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                              >
                                {undoing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Confirm Revert
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions - Spacious, Balanced & Perfectly Centered */}
          <div className="px-7 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
            <span className="text-xs text-slate-500 hidden sm:inline font-medium">
              Changes take effect immediately on academic rosters.
            </span>
            <div className="flex items-center justify-end gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting || undoing}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || undoing || !targetBatchId || !targetSectionId}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-purple-300/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[160px]"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin shrink-0" />
                    <span>Processing Transfer...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={14} className="shrink-0" />
                    <span>Confirm Transfer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
