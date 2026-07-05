import { useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import { parseComprehensiveExcel } from "../utils/excelParser";
import {
  Upload,
  FileSpreadsheet,
  UserPlus,
  ArrowRight,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function StudentManagement({ offering, onComplete }) {
  const [activeTab, setActiveTab] = useState("manual");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Manual Form
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");

  // Excel Upload
  const [dragActive, setDragActive] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [offering._id]);

  const fetchStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiService.getEnrolledStudents(offering._id);
      setStudents(data.students || []);
    } catch (err) {
      setError(err.message || "Failed to load enrolled students.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!studentId.trim() || !studentName.trim()) {
      alert("Please fill both student ID and name.");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiService.addStudent(offering._id, {
        studentId: studentId.trim(),
        name: studentName.trim(),
      });
      setStudentId("");
      setStudentName("");
      setSuccess("Student added and enrolled successfully!");
      // Refresh list
      fetchStudents();
    } catch (err) {
      setError(err.message || "Failed to add student.");
    } finally {
      setActionLoading(false);
    }
  };

  // Excel Drag/Drop functions
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
  };

  const processExcelFile = async (file) => {
    setError("");
    setSuccess("");
    setActionLoading(true);
    setExtractedData(null);
    setExcelFile(file);

    try {
      const data = await parseComprehensiveExcel(file);
      if (!data || !data.students || data.students.length === 0) {
        throw new Error(
          "No student data found in the Excel workbook. Make sure the file contains a column with Student ID and Name.",
        );
      }
      setExtractedData(data);
      const itemCount =
        data.assessments && Object.keys(data.assessments).length > 0
          ? " with assessments"
          : "";
      const marksCount =
        data.marks && Object.keys(data.marks).length > 0 ? " and marks" : "";
      setSuccess(
        `Extracted ${data.students.length} students${itemCount}${marksCount} from Excel.`,
      );
    } catch (err) {
      console.error("Excel parsing error:", err);
      setError(
        err.message ||
          "Failed to parse Excel file. Check the file format and try again.",
      );
      setExcelFile(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyImport = async () => {
    if (!extractedData) return;
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      // 1. Import and Enroll Students
      const importResult = await apiService.importStudents(
        offering._id,
        extractedData.students,
      );
      if (importResult.warnings && importResult.warnings.length > 0) {
        console.warn("Import warnings:", importResult.warnings);
      }

      // 2. If Assessments exist in Excel, save them
      if (
        extractedData.assessments &&
        Object.keys(extractedData.assessments).length > 0
      ) {
        try {
          await apiService.saveAssessments(
            offering._id,
            extractedData.assessments,
          );
        } catch (assessErr) {
          console.warn("Failed to save assessments:", assessErr.message);
        }
      }

      // 3. If Marks exist in Excel, save them
      if (extractedData.marks && Object.keys(extractedData.marks).length > 0) {
        try {
          await apiService.saveMarks(offering._id, extractedData.marks);
        } catch (marksErr) {
          console.warn("Failed to save marks:", marksErr.message);
        }
      }

      setSuccess(
        "Excel data imported successfully! Students, assessments, and marks populated.",
      );
      setExtractedData(null);
      setExcelFile(null);

      // Fetch fresh students
      await fetchStudents();

      // Auto transition to next step (CO-PO Mapping)
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to apply imported data.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Course Title & Details */}
      <div className="bg-gradient-to-br from-white to-green-50/20 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-2 border-green-200">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent">
          Student & Enrollment Management
        </h2>
        <p className="text-gray-700 mt-2 font-semibold text-lg">
          {offering.course?.courseCode} - {offering.course?.courseName} |
          Semester: {offering.semester?.semesterName} | Section:{" "}
          {offering.section}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-green-200">
        <button
          onClick={() => {
            setActiveTab("manual");
            setError("");
            setSuccess("");
          }}
          className={`px-6 py-3 font-semibold transition-all duration-300 rounded-t-lg ${
            activeTab === "manual"
              ? "border-b-4 border-green-600 text-green-700 bg-green-50"
              : "text-gray-600 hover:text-green-600 hover:bg-green-50/50"
          }`}
        >
          Manual Student Entry
        </button>
        <button
          onClick={() => {
            setActiveTab("excel");
            setError("");
            setSuccess("");
          }}
          className={`px-6 py-3 font-semibold transition-all duration-300 rounded-t-lg ${
            activeTab === "excel"
              ? "border-b-4 border-green-600 text-green-700 bg-green-50"
              : "text-gray-600 hover:text-green-600 hover:bg-green-50/50"
          }`}
        >
          Import from Excel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Entry Panel (Manual or Excel) */}
        <div className="lg:col-span-1 space-y-6">
          {activeTab === "manual" ? (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-3">
                <UserPlus className="text-green-700" />
                Add Student Manually
              </h3>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 201-15-13492"
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Student Name
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Joy Sarkar"
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50 font-medium"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {actionLoading ? "Enrolling..." : "Enroll Student"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-3">
                <FileSpreadsheet className="text-green-700" />
                Upload Spreadsheet
              </h3>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragActive
                    ? "border-green-500 bg-green-50/30"
                    : "border-gray-300 hover:border-green-400"
                }`}
              >
                <input
                  type="file"
                  id="excel-file-upload"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="excel-file-upload"
                  className="cursor-pointer space-y-4 block"
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div>
                    <span className="text-green-700 font-bold">
                      Upload a file
                    </span>{" "}
                    or drag & drop
                    <p className="text-xs text-gray-400 mt-1">
                      XLSX, XLS files up to 10MB
                    </p>
                  </div>
                </label>
              </div>

              {excelFile && (
                <div className="mt-4 p-3 bg-gray-50 border rounded-xl flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-700 truncate">
                    {excelFile.name}
                  </span>
                  <button
                    onClick={() => {
                      setExcelFile(null);
                      setExtractedData(null);
                    }}
                    className="text-red-600 hover:text-red-800 font-bold"
                  >
                    Clear
                  </button>
                </div>
              )}

              {extractedData && (
                <button
                  onClick={handleApplyImport}
                  disabled={actionLoading}
                  className="w-full mt-4 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? "Applying Import..." : "Apply Excel Import"}
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 shadow-sm font-medium">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl flex items-center gap-3 bg-green-50 text-green-700 border border-green-200 shadow-sm font-medium">
              <CheckCircle size={20} />
              {success}
            </div>
          )}
        </div>

        {/* Enrolled Students Table (Right 2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-800">
              Enrolled Students ({students.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12 bg-white rounded-2xl border">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border text-center text-gray-500 italic">
              No students enrolled in this offering yet. Enter them manually or
              upload an Excel sheet.
            </div>
          ) : (
            <div className="bg-white border rounded-2xl shadow-md overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-green-50 sticky top-0 z-15">
                    <tr className="border-b">
                      <th className="px-6 py-4 text-left text-sm font-bold text-green-800">
                        Student ID
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-green-800">
                        Full Name
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[...students]
                      .sort((a, b) => {
                        const numA = parseInt((a.id || '').toString().replace(/^\D+/g, ''), 10) || 0
                        const numB = parseInt((b.id || '').toString().replace(/^\D+/g, ''), 10) || 0
                        return numA - numB
                      })
                      .map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                            {student.id}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                            {student.name}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {students.length > 0 && (
            <div className="flex justify-end pt-4">
              <button
                onClick={onComplete}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-102"
              >
                Continue to CO-PO Mapping
                <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
