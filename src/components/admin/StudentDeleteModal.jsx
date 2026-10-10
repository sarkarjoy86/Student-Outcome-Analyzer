import React, { useState, useEffect } from "react";
import { Trash2, Archive, AlertTriangle, ShieldCheck, X, Loader2, CheckCircle2 } from "lucide-react";
import { apiService } from "../../services/apiService";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

export default function StudentDeleteModal({
  isOpen,
  onClose,
  student, // single student object, OR null if bulk
  selectedStudentIds = [], // for bulk delete
  currentBatch,
  currentSection,
  onSuccess,
}) {
  const isBulk = !student && selectedStudentIds.length > 0;
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [academicSummary, setAcademicSummary] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useBodyScrollLock(isOpen, !submitting ? onClose : null);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setAcademicSummary(null);

    if (!isBulk && student?._id) {
      setLoadingSummary(true);
      apiService
        .getStudentAcademicSummary(student._id)
        .then((data) => setAcademicSummary(data))
        .catch((err) => console.warn("Could not fetch academic summary:", err))
        .finally(() => setLoadingSummary(false));
    }
  }, [isOpen, student, isBulk]);

  if (!isOpen) return null;

  const handleDelete = async (mode) => {
    setSubmitting(true);
    setError("");
    try {
      if (isBulk) {
        const res = await apiService.bulkDeleteSectionStudents(
          currentBatch._id,
          currentSection._id,
          selectedStudentIds,
          mode
        );
        if (onSuccess) onSuccess(res.message || "Students processed successfully.");
      } else {
        const res = await apiService.deleteSectionStudent(
          currentBatch._id,
          currentSection._id,
          student._id,
          mode
        );
        if (onSuccess) onSuccess(res.message || "Student processed successfully.");
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to complete removal action.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasHistory = academicSummary?.hasHistory;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-150 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 text-white flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-md border border-white/20 shadow-xs">
              <Trash2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                {isBulk ? "Bulk Remove Students" : "Remove Student from Section"}
              </h2>
              <p className="text-xs text-rose-150 font-medium">
                {isBulk
                  ? `Select removal policy for ${selectedStudentIds.length} student(s)`
                  : `${student?.studentName || student?.name} (${student?.studentId})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-xl text-rose-200 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-medium">
              <AlertTriangle size={16} className="flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {loadingSummary ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 size={24} className="animate-spin text-purple-600" />
              <p className="text-xs font-semibold">Checking academic history & completed courses...</p>
            </div>
          ) : (
            <>
              {/* If Single Student with History */}
              {!isBulk && hasHistory && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                    <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
                    <span>Academic Coursework History Detected</span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    This student has <strong>{academicSummary.marksCount} assessment records</strong> across{" "}
                    <strong>{academicSummary.enrollmentsCount} courses</strong>. Deleting all records permanently would
                    distort historical teacher grade sheets and CO-PO attainment calculations from past semesters.
                  </p>
                </div>
              )}

              {/* If Single Student with NO History */}
              {!isBulk && !hasHistory && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700">
                  <p className="font-semibold text-gray-800">
                    No completed coursework or assessment marks were found for this student.
                  </p>
                  <p className="text-gray-500 mt-1">
                    This student can be completely removed from the database without affecting any academic attainment reports.
                  </p>
                </div>
              )}

              {/* If Bulk Mode Notice */}
              {isBulk && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-gray-900">
                    You have selected {selectedStudentIds.length} student(s) from Section {currentSection?.sectionName} (Batch {currentBatch?.name}).
                  </p>
                  <p className="text-gray-500">
                    Choose whether to safeguard historical records or force purge completely.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-1">
                {/* Option 1: Archive / Smart Remove */}
                <button
                  type="button"
                  onClick={() => handleDelete("archive")}
                  disabled={submitting}
                  className="w-full text-left p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/70 transition-all flex items-start gap-3.5 group cursor-pointer disabled:opacity-50"
                >
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-emerald-900">
                        Remove from Section & Archive History
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-md">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                      Removes student from active section rosters. Past completed courses, teacher grades, and CO-PO attainment statistics remain 100% safe and intact.
                    </p>
                  </div>
                </button>

                {/* Option 2: Force Purge (Permanent Delete) */}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      hasHistory &&
                      !window.confirm(
                        "WARNING: This student has real coursework marks. Permanently deleting will purge all their marks and may change past CO-PO attainment results. Proceed anyway?"
                      )
                    ) {
                      return;
                    }
                    handleDelete("purge");
                  }}
                  disabled={submitting}
                  className="w-full text-left p-4 rounded-2xl border border-red-200 bg-white hover:bg-red-50/50 transition-all flex items-start gap-3.5 group cursor-pointer disabled:opacity-50"
                >
                  <div className="p-2 bg-red-100 text-red-650 rounded-xl group-hover:scale-105 transition-transform flex-shrink-0 mt-0.5">
                    <Trash2 size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-red-700">
                      Force Permanent Purge (Delete from Database)
                    </span>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Completely erases the student and all associated records from MongoDB. Use only for accidental entries or test data.
                    </p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Footer cancel */}
          <div className="pt-2 flex justify-end border-t border-gray-150">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
