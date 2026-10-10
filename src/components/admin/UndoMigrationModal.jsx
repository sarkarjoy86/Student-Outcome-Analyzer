import React, { useState } from "react";
import { RotateCcw, ArrowRight, ShieldCheck, AlertCircle, X, CheckCircle2, Loader2, GitFork, Undo2 } from "lucide-react";
import { apiService } from "../../services/apiService";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

export default function UndoMigrationModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useBodyScrollLock(isOpen, !submitting ? onClose : null);

  if (!isOpen || !student) return null;

  const history = student.migrationHistory || [];
  const latestMigration = history.length > 0 ? history[history.length - 1] : null;

  if (!latestMigration) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-150 p-6 text-center">
          <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
          <h3 className="text-base font-bold text-gray-800 mb-1">No Migration Record Found</h3>
          <p className="text-xs text-gray-500 mb-4">
            This student does not have any active migration history that can be undone.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleConfirmUndo = async () => {
    setSubmitting(true);
    setError("");

    try {
      const res = await apiService.undoStudentMigration(student._id || student.id);
      if (onSuccess) {
        onSuccess(
          res.message ||
            `Successfully reverted ${student.studentName || student.name} back to Batch ${latestMigration.fromBatchName} (${latestMigration.fromSectionName}).`
        );
      }
      onClose();
    } catch (err) {
      setError(err.message || "Failed to undo migration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-150 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white relative">
          <button
            onClick={onClose}
            disabled={submitting}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs shadow-inner">
              <RotateCcw size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Undo Student Migration</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/25 text-white tracking-wider">
                  Rollback
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Revert accidental migration and restore previous batch assignment
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Student Profile Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-800">
                  {student.studentName || student.name}
                </p>
                <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                  ID: {student.studentId}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <GitFork size={10} />
                Migrated Student
              </span>
            </div>
          </div>

          {/* Restoration Comparison Card */}
          <div className="border border-amber-200 bg-amber-50/50 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-2.5">
              Batch Assignment Rollback Path
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Current (To be undone) */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 block mb-1">
                  Current Location (Mistake)
                </span>
                <p className="text-xs font-bold text-gray-700 line-through decoration-red-400">
                  Batch {latestMigration.toBatchName}
                </p>
                <p className="text-[11px] text-gray-500 line-through decoration-red-400">
                  Section: {latestMigration.toSectionName}
                </p>
              </div>

              {/* Reverting back to */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-emerald-700 block mb-1 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  Restoring Back To
                </span>
                <p className="text-xs font-bold text-emerald-900">
                  Batch {latestMigration.fromBatchName}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Section: {latestMigration.fromSectionName}
                </p>
              </div>
            </div>

            {/* Migration Context Metadata */}
            <div className="mt-3 pt-3 border-t border-amber-200/60 text-[11px] text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Recorded Reason:</span>
                <span className="font-semibold text-gray-700">{latestMigration.reason || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Migrated At:</span>
                <span className="font-semibold text-gray-700">
                  {latestMigration.migratedAt ? new Date(latestMigration.migratedAt).toLocaleString() : "N/A"}
                </span>
              </div>
              {latestMigration.migratedByName && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Migrated By:</span>
                  <span className="font-semibold text-gray-700">{latestMigration.migratedByName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Academic Preservation Guarantee */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-gray-600">
              <span className="font-bold text-gray-800">100% History Preservation: </span>
              Undoing this migration only reassigns the student's active batch/section back to their previous batch.
              No assessment marks, coursework evaluations, or historical CO-PO attainment will be removed or altered.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-150 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmUndo}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md shadow-amber-200 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Undoing Migration...
              </>
            ) : (
              <>
                <RotateCcw size={14} />
                Confirm & Revert to Previous Batch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
