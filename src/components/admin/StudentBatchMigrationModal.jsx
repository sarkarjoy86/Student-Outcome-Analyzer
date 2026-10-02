import React, { useState, useEffect, useMemo } from "react";
import { GitFork, ArrowRight, ShieldCheck, History, AlertCircle, X, CheckCircle2, Loader2, BookOpen } from "lucide-react";
import { apiService } from "../../services/apiService";

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
  const [reasonPreset, setReasonPreset] = useState("Semester Retake (Fell Behind 3+ Courses)");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [academicSummary, setAcademicSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Academic Retake Policy: A student can only migrate to subsequent/junior batches
  // (or stay in current batch for section reassignment). Senior/earlier batches (e.g. 16, 17, 18, 19 < 20) are excluded.
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
        // If current batch cannot be resolved numerically, show all
        if (currentNum === null) return true;
        const bNum = extractNum(b.name);
        if (bNum === null) return true;
        // Only allow current batch (for section transfer) and junior/subsequent batches
        return bNum >= currentNum;
      })
      .sort((a, b) => {
        const aNum = extractNum(a.name);
        const bNum = extractNum(b.name);
        if (aNum !== null && bNum !== null) return aNum - bNum;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [batches, currentBatch]);

  // Load student academic summary when modal opens
  useEffect(() => {
    if (!isOpen || !student?._id) return;
    setTargetBatchId("");
    setTargetSectionId("");
    setTargetSections([]);
    setError("");
    setReasonPreset("Semester Retake (Fell Behind 3+ Courses)");
    setCustomReason("");

    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const summary = await apiService.getStudentAcademicSummary(student._id);
        setAcademicSummary(summary);
      } catch (err) {
        console.warn("Could not load student academic summary:", err);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummary();
  }, [isOpen, student]);

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
          // If current batch is selected, prefer selecting a different section
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

    const finalReason = reasonPreset === "Other / Custom" ? customReason.trim() : reasonPreset;
    if (!finalReason) {
      setError("Please specify the migration reason.");
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
        onSuccess(res.message || "Student migrated successfully.");
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to migrate student.");
    } finally {
      setSubmitting(false);
    }
  };

  const targetBatch = batches.find((b) => b._id === targetBatchId);
  const targetSection = targetSections.find((s) => s._id === targetSectionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-150 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 text-white flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-md border border-white/20 shadow-xs">
              <GitFork size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Student Batch Migration
                <span className="text-[11px] font-bold px-2 py-0.5 bg-white/20 text-white rounded-full uppercase tracking-wider">
                  Academic Retake
                </span>
              </h2>
              <p className="text-xs text-purple-150 font-medium">
                Transfer student across batches/sections with 100% historical CO-PO attainment preservation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleMigrate} className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Student Profile Snapshot */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Student Name & ID</p>
                <p className="text-base font-black text-gray-900 mt-0.5">
                  {student.studentName || student.name}{" "}
                  <span className="text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md ml-1 font-mono">
                    {student.studentId}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  Status: Active
                </span>
                {summaryLoading ? (
                  <span className="text-xs text-gray-400">Loading history...</span>
                ) : (
                  academicSummary && (
                    <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg flex items-center gap-1">
                      <BookOpen size={13} />
                      {academicSummary.enrollmentsCount} Course Records
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Current vs Target Flow */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-1">
              <div className="flex-1 bg-white p-3 rounded-xl border border-gray-200 text-center">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Current Position</p>
                <p className="text-sm font-bold text-purple-700 mt-0.5">
                  Batch: {currentBatch?.name || "N/A"}
                </p>
                <p className="text-xs font-semibold text-gray-600">
                  Section: {currentSection?.sectionName ? `Section ${currentSection.sectionName}` : "Unassigned"}
                </p>
              </div>

              <div className="p-2 bg-purple-100 text-purple-700 rounded-full flex-shrink-0">
                <ArrowRight size={16} />
              </div>

              <div className="flex-1 bg-white p-3 rounded-xl border border-purple-200 text-center shadow-xs">
                <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">Target Position</p>
                <p className="text-sm font-bold text-indigo-700 mt-0.5">
                  {targetBatch ? `Batch: ${targetBatch.name}` : "Select Batch..."}
                </p>
                <p className="text-xs font-semibold text-indigo-600">
                  {targetSection ? `Section ${targetSection.sectionName}` : "Select Section..."}
                </p>
              </div>
            </div>
          </div>

          {/* Target Batch & Section Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Target Batch <span className="text-red-500">*</span>
              </label>
              <select
                value={targetBatchId}
                onChange={(e) => setTargetBatchId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 font-medium cursor-pointer"
                required
              >
                <option value="">-- Choose Target Batch --</option>
                {eligibleBatches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} {b._id === currentBatch?._id ? "(Current Batch)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Target Section <span className="text-red-500">*</span>
              </label>
              <select
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                disabled={!targetBatchId || sectionsLoading}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer"
                required
              >
                {!targetBatchId ? (
                  <option value="">Select a batch first</option>
                ) : sectionsLoading ? (
                  <option value="">Loading sections...</option>
                ) : targetSections.length === 0 ? (
                  <option value="">No sections found in this batch</option>
                ) : (
                  targetSections.map((s) => {
                    const isCurrent = targetBatchId === currentBatch?._id && s._id === currentSection?._id;
                    return (
                      <option key={s._id} value={s._id} disabled={isCurrent}>
                        Section {s.sectionName} {isCurrent ? "(Current Section)" : ""}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          {/* Migration Reason */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Reason for Migration <span className="text-red-500">*</span>
            </label>
            <select
              value={reasonPreset}
              onChange={(e) => setReasonPreset(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 font-medium cursor-pointer mb-2"
            >
              <option value="Semester Retake (Fell Behind 3+ Courses)">
                Semester Retake (Fell Behind 3+ Courses / Demoted to Junior Batch)
              </option>
              <option value="Course Retake Reassignment">Course Retake Reassignment</option>
              <option value="Academic Level / Year Adjustment">Academic Level / Year Adjustment</option>
              <option value="Section Transfer (Same Batch)">Section Transfer (Same Batch)</option>
              <option value="Disciplinary Action: Unfair Means in Examination (Demoted to Junior Batch)">
                Disciplinary Action: Unfair Means in Examination (Demoted to Junior Batch)
              </option>
              <option value="Examination Disciplinary Committee (EDC) Penalty / Suspension">
                Examination Disciplinary Committee (EDC) Penalty / Suspension
              </option>
              <option value="Academic Misconduct / Cheating in Exam Penalty">
                Academic Misconduct / Cheating in Exam Penalty
              </option>
              <option value="Readmission / Resumed Studies">Readmission / Resumed Studies</option>
              <option value="Other / Custom">Other / Custom Reason</option>
            </select>

            {reasonPreset === "Other / Custom" && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter specific migration reason or academic board reference..."
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            )}
          </div>

          {/* Academic Integrity Safe-Guard Notice */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
              <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
              <span>OBE & CQI Historical Integrity Safeguard</span>
            </div>
            <p className="text-emerald-700 leading-relaxed pl-6">
              All courses completed with the old batch ({currentBatch?.name || "Current"}), assessment marks, and
              Course Outcome (CO) & Program Outcome (PO) calculations are <strong>strictly preserved</strong>.
              The student will automatically be listed under the new batch ({targetBatch?.name || "Target"}) for future course enrollments and graduation tracking.
            </p>
          </div>

          {/* Previous Migration History if any */}
          {academicSummary?.migrationHistory && academicSummary.migrationHistory.length > 0 && (
            <div className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50/50">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-2">
                <History size={14} className="text-purple-600" />
                Previous Migration Log ({academicSummary.migrationHistory.length})
              </p>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto custom-scrollbar pr-1">
                {academicSummary.migrationHistory.map((m, idx) => (
                  <div key={idx} className="text-[11px] text-gray-600 bg-white p-2 rounded-lg border border-gray-200 flex justify-between items-center">
                    <span>
                      From <strong>{m.fromBatchName} ({m.fromSectionName})</strong> &rarr; To <strong>{m.toBatchName} ({m.toSectionName})</strong>
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(m.migratedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-150">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !targetBatchId || !targetSectionId}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Migrating Student...
                </>
              ) : (
                <>
                  <GitFork size={14} />
                  Confirm Migration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
