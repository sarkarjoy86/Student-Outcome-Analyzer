import { useState, useRef, useCallback, useEffect } from "react";
import { apiService } from "../../services/apiService";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Search,
  Loader2,
  FileCheck,
  Users,
  RotateCcw,
  TableProperties,
  Sparkles,
} from "lucide-react";

// ─── Validation Status Tag ─────────────────────────────────────────────────
function StatusTag({ status }) {
  const cfg = {
    valid: {
      label: "✓ Valid",
      cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    duplicate: {
      label: "⚠ Duplicate",
      cls: "bg-amber-100 text-amber-700 border-amber-200",
    },
    already_exists: {
      label: "⊘ Already Exists",
      cls: "bg-slate-100 text-slate-600 border-slate-200",
    },
    incomplete: {
      label: "✎ Incomplete",
      cls: "bg-orange-100 text-orange-700 border-orange-200",
    },
  };
  const c = cfg[status] || cfg.valid;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.cls} whitespace-nowrap`}
    >
      {c.label}
    </span>
  );
}

// ─── Main Modal Component ──────────────────────────────────────────────────
export default function ExcelImportModal({
  batchId,
  sectionId,
  batchName,
  sectionName,
  existingStudentIds = [],
  onSuccess,
  onClose,
}) {
  useBodyScrollLock(true, onClose);

  const [step, setStep] = useState("upload"); // upload | parsing | preview | saving | done
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parseResult, setParseResult] = useState(null);
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveResult, setSaveResult] = useState(null);
  const fileInputRef = useRef(null);

  const filteredRows = rows.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.student_id.toLowerCase().includes(q) ||
      r.student_name.toLowerCase().includes(q)
    );
  });

  const selectedCount = rows.filter((r) => r.selected).length;
  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => r.selected);

  const buildRows = useCallback(
    (students) => {
      const existingSet = new Set(
        existingStudentIds.map((id) => String(id).toUpperCase())
      );
      const seenIds = new Set();
      return students.map((s, idx) => {
        const normalId = String(s.student_id || "").trim().toUpperCase();
        let status = "valid";
        let defaultSelected = true;
        if (existingSet.has(normalId)) {
          status = "already_exists";
          defaultSelected = false;
        } else if (seenIds.has(normalId)) {
          status = "duplicate";
          defaultSelected = false;
        } else if (!s.student_name || !s.student_name.trim()) {
          status = "incomplete";
        }
        if (normalId) seenIds.add(normalId);
        return {
          _key: `${normalId}_${idx}`,
          student_id: s.student_id || "",
          student_name: s.student_name || "",
          status,
          selected: defaultSelected,
        };
      });
    },
    [existingStudentIds]
  );

  const processFile = async (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      setParseError("Unsupported file type. Please upload a .xlsx, .xls, or .csv file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setParseError("File is too large. Maximum allowed size is 10MB.");
      return;
    }
    setParseError("");
    setStep("parsing");
    try {
      const result = await apiService.parseExcelStudents(file);
      setParseResult(result);
      setRows(buildRows(result.students));
      setStep("preview");
    } catch (err) {
      setParseError(
        err.message ||
          "Could not find valid Student ID/Name patterns in the file."
      );
      setStep("upload");
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
    },
    []
  );

  const updateRow = (key, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        const updated = { ...r, [field]: value };
        const existingSet = new Set(existingStudentIds.map((id) => String(id).toUpperCase()));
        const normalId = String(updated.student_id || "").trim().toUpperCase();
        if (existingSet.has(normalId)) updated.status = "already_exists";
        else if (!updated.student_name?.trim()) updated.status = "incomplete";
        else updated.status = "valid";
        return updated;
      })
    );
  };

  const toggleRow = (key) =>
    setRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, selected: !r.selected } : r))
    );

  const toggleAllFiltered = () => {
    const filteredKeys = new Set(filteredRows.map((r) => r._key));
    setRows((prev) =>
      prev.map((r) =>
        filteredKeys.has(r._key)
          ? { ...r, selected: !allFilteredSelected }
          : r
      )
    );
  };

  const handleConfirmSave = async () => {
    const toSave = rows
      .filter((r) => r.selected && r.status !== "already_exists")
      .map((r) => ({
        student_id: r.student_id.trim(),
        student_name: r.student_name.trim(),
      }));
    if (toSave.length === 0) {
      setParseError("No students selected for import.");
      return;
    }
    setStep("saving");
    try {
      const result = await apiService.bulkImportSectionStudents(batchId, sectionId, toSave);
      setSaveResult(result);
      setStep("done");
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setParseError(err.message || "Bulk save failed. Please try again.");
      setStep("preview");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setParseError("");
    setParseResult(null);
    setRows([]);
    setSearchQuery("");
    setSaveResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const STEPS = [
    { key: "upload", label: "Upload", icon: Upload },
    { key: "parsing", label: "Parsing", icon: Loader2 },
    { key: "preview", label: "Preview", icon: TableProperties },
    { key: "done", label: "Done", icon: CheckCircle },
  ];

  const stepOrder = STEPS.map((s) => s.key);
  const currentStepIdx = stepOrder.indexOf(step === "saving" ? "done" : step);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(3,7,18,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full overflow-hidden flex flex-col animate-fade-in-up"
        style={{
          maxWidth: step === "preview" ? "960px" : "560px",
          maxHeight: "90vh",
          transition: "max-width 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-7 py-5 bg-gradient-to-r from-emerald-700 via-green-700 to-teal-800 rounded-t-3xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                Intelligent Excel Import
              </h2>
              <p className="text-emerald-100 text-xs mt-0.5">
                Batch: <span className="font-semibold text-white">{batchName}</span>
                {" · "}Section:{" "}
                <span className="font-semibold text-white">{sectionName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Step Indicator ── */}
        <div className="flex items-center gap-0 px-7 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          {STEPS.map((s, i) => {
            const isActive = step === s.key || (step === "saving" && s.key === "preview");
            const isComplete = stepOrder.indexOf(s.key) < currentStepIdx;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-700 text-white shadow-sm"
                      : isComplete
                      ? "text-emerald-600"
                      : "text-gray-400"
                  }`}
                >
                  <Icon
                    size={12}
                    className={
                      (isActive && s.key === "parsing") ||
                      (step === "saving" && s.key === "preview")
                        ? "animate-spin"
                        : ""
                    }
                  />
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-6 mx-1 rounded-full transition-colors ${
                      isComplete ? "bg-emerald-300" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* UPLOAD */}
          {step === "upload" && (
            <div className="p-7 space-y-5">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group ${
                  dragActive
                    ? "border-emerald-500 bg-emerald-50/60 scale-[1.01]"
                    : "border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/30"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && processFile(e.target.files[0])
                  }
                />
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all ${
                    dragActive
                      ? "bg-emerald-100"
                      : "bg-gray-100 group-hover:bg-emerald-100"
                  }`}
                >
                  <FileSpreadsheet
                    size={32}
                    className={`transition-colors ${
                      dragActive
                        ? "text-emerald-700"
                        : "text-gray-400 group-hover:text-emerald-600"
                    }`}
                  />
                </div>
                <p className="text-gray-800 font-semibold text-base mb-1">
                  {dragActive
                    ? "Release to upload..."
                    : "Drag & drop your Excel file here"}
                </p>
                <p className="text-gray-400 text-sm mb-3">or click to browse</p>
                <div className="flex justify-center gap-2">
                  {[".xlsx", ".xls", ".csv"].map((ext) => (
                    <span
                      key={ext}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-500 shadow-sm"
                    >
                      {ext}
                    </span>
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-3">
                  Maximum file size: 10MB
                </p>
              </div>

              {parseError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span className="text-sm font-medium">{parseError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    icon: Sparkles,
                    title: "AI-Powered Detection",
                    desc: "Auto-detects student IDs and names from any layout",
                    bg: "bg-violet-50",
                    border: "border-violet-100",
                    color: "text-violet-500",
                  },
                  {
                    icon: TableProperties,
                    title: "Multi-Sheet Scan",
                    desc: "Reads all sheets simultaneously and deduplicates",
                    bg: "bg-indigo-50",
                    border: "border-indigo-100",
                    color: "text-indigo-500",
                  },
                  {
                    icon: FileCheck,
                    title: "Preview & Edit",
                    desc: "Review results and correct any errors before saving",
                    bg: "bg-emerald-50",
                    border: "border-emerald-100",
                    color: "text-emerald-500",
                  },
                ].map((c) => (
                  <div
                    key={c.title}
                    className={`p-4 rounded-xl ${c.bg} border ${c.border}`}
                  >
                    <c.icon size={16} className={`${c.color} mb-2`} />
                    <p className="text-xs font-bold text-gray-700 mb-0.5">
                      {c.title}
                    </p>
                    <p className="text-xs text-gray-500">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PARSING */}
          {step === "parsing" && (
            <div className="p-12 flex flex-col items-center justify-center gap-5 min-h-[280px]">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <FileSpreadsheet size={36} className="text-violet-500" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center shadow-lg">
                  <Loader2 size={16} className="text-white animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-800 font-bold text-base">
                  Parsing Excel File...
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Intelligently scanning all sheets for student records
                </p>
              </div>
              <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-pulse"
                  style={{ width: "65%" }}
                />
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {step === "preview" && (
            <div className="flex flex-col" style={{ minHeight: "400px" }}>
              {/* Summary Banner */}
              {parseResult && (
                <div className="mx-6 mt-5 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <FileCheck size={18} className="text-violet-600" />
                      <span className="font-bold text-gray-800 text-sm">
                        Found {parseResult.total_scanned} Records
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {rows.filter((r) => r.status === "valid").length} Valid
                      </span>
                      <span className="flex items-center gap-1.5 text-orange-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                        {rows.filter((r) => r.status === "incomplete").length}{" "}
                        Incomplete
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                        {rows.filter((r) => r.status === "already_exists").length}{" "}
                        Already Exists
                      </span>
                      {parseResult.sheet_results?.length > 0 && (
                        <span className="text-gray-400 border-l border-gray-200 pl-3">
                          Sheets:{" "}
                          {parseResult.sheet_results.map((s) => s.sheet).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Controls Bar */}
              <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-100 mt-3">
                <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID or name..."
                    className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleAllFiltered}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    {allFilteredSelected ? "Deselect All" : "Select All"}
                  </button>
                  <button
                    onClick={() =>
                      setRows((prev) =>
                        prev.map((r) => ({ ...r, selected: false }))
                      )
                    }
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Clear All
                  </button>
                </div>
                <span className="text-xs text-gray-500 font-medium ml-auto">
                  {selectedCount} of {rows.length} selected
                </span>
              </div>

              {parseError && (
                <div className="mx-6 mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={15} className="shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Table */}
              <div className="overflow-auto px-6 pb-2" style={{ maxHeight: "420px" }}>
                <table className="w-full text-sm border-collapse min-w-[580px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-3 px-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected && filteredRows.length > 0}
                          onChange={toggleAllFiltered}
                          className="rounded border-gray-300 text-violet-600 cursor-pointer w-4 h-4"
                        />
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-2/5">
                        Student ID
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="py-3 px-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center py-10 text-gray-400 text-sm italic"
                        >
                          No matching records found.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr
                          key={row._key}
                          className={`group transition-colors ${
                            row.selected
                              ? "bg-violet-50/50 hover:bg-violet-50"
                              : "hover:bg-gray-50/70"
                          } ${
                            row.status === "already_exists" ? "opacity-55" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => toggleRow(row._key)}
                              disabled={row.status === "already_exists"}
                              className="rounded border-gray-300 text-violet-600 cursor-pointer w-4 h-4 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.student_id}
                              onChange={(e) =>
                                updateRow(row._key, "student_id", e.target.value)
                              }
                              className="w-full border border-transparent group-hover:border-gray-200 focus:border-violet-400 focus:ring-1 focus:ring-violet-200 px-2 py-1 rounded-lg text-sm font-mono font-semibold text-gray-800 bg-transparent focus:bg-white outline-none transition-all"
                              placeholder="Student ID"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.student_name}
                              onChange={(e) =>
                                updateRow(row._key, "student_name", e.target.value)
                              }
                              className="w-full border border-transparent group-hover:border-gray-200 focus:border-violet-400 focus:ring-1 focus:ring-violet-200 px-2 py-1 rounded-lg text-sm text-gray-700 bg-transparent focus:bg-white outline-none transition-all"
                              placeholder="Student Name (required)"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <StatusTag status={row.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SAVING */}
          {step === "saving" && (
            <div className="p-12 flex flex-col items-center justify-center gap-5 min-h-[280px]">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center">
                  <Users size={36} className="text-indigo-500" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <Loader2 size={16} className="text-white animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-800 font-bold text-base">
                  Saving {selectedCount} Students...
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Inserting records into the database
                </p>
              </div>
            </div>
          )}

          {/* DONE */}
          {step === "done" && saveResult && (
            <div className="p-8 flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={40} className="text-emerald-500" />
              </div>
              <div className="text-center">
                <h3 className="text-gray-800 font-bold text-xl">
                  Import Successful!
                </h3>
                <p className="text-gray-500 text-sm mt-1">{saveResult.message}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                {[
                  {
                    value: saveResult.inserted_count,
                    label: "Inserted",
                    bg: "bg-emerald-50",
                    border: "border-emerald-100",
                    color: "text-emerald-600",
                  },
                  {
                    value: saveResult.updated_count,
                    label: "Updated",
                    bg: "bg-blue-50",
                    border: "border-blue-100",
                    color: "text-blue-600",
                  },
                  {
                    value: saveResult.skipped_count,
                    label: "Skipped",
                    bg: "bg-amber-50",
                    border: "border-amber-100",
                    color: "text-amber-600",
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    className={`p-4 ${c.bg} border ${c.border} rounded-xl text-center`}
                  >
                    <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
                    <p className={`text-xs ${c.color} font-semibold mt-0.5`}>
                      {c.label}
                    </p>
                  </div>
                ))}
              </div>

              {saveResult.skipped?.length > 0 && (
                <div className="w-full max-w-sm p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <p className="font-bold mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Skipped Records
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {saveResult.skipped.map((s, i) => (
                      <div key={i} className="flex justify-between gap-2">
                        <span className="font-mono truncate">{s.student_id || "—"}</span>
                        <span className="text-amber-600 shrink-0">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all"
                >
                  <RotateCcw size={14} />
                  Import More
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:from-emerald-700 hover:to-green-800 transition-all"
                >
                  <CheckCircle size={14} />
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Actions (preview only) ── */}
        {step === "preview" && (
          <div className="flex items-center justify-between px-7 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl flex-shrink-0">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-white transition-all"
            >
              <RotateCcw size={14} />
              Upload Different File
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {selectedCount} student{selectedCount !== 1 ? "s" : ""} will be
                imported
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:from-emerald-700 hover:to-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Users size={15} />
                Confirm &amp; Save ({selectedCount})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
