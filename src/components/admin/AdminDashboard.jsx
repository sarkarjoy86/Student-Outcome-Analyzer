import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/apiService";
import {
  Calendar,
  UserPlus,
  ShieldAlert,
  LogOut,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Layers,
  Users,
  ClipboardList,
  Network,
  Trash2,
  Edit2,
  Save,
  X,
} from "lucide-react";

export default function AdminDashboard() {
  const {
    users,
    createUser,
    deleteUser,
    adminResetPassword,
    logout,
    actionLoading,
    message,
  } = useAuth();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("adminActiveTab") || "users";
  });

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem("adminActiveTab", activeTab);
    }
  }, [activeTab]);

  const [newUserForm, setNewUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [resetForm, setResetForm] = useState({
    email: "",
    newPassword: "",
  });

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({
    semesterName: "Spring",
    academicYear: new Date().getFullYear(),
    status: "active",
  });
  const [sessionError, setSessionError] = useState("");
  const [sessionSuccess, setSessionSuccess] = useState("");
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingSessionStatus, setEditingSessionStatus] = useState("");

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseForm, setCourseForm] = useState({
    courseCode: "",
    courseName: "",
    creditHours: "3",
    department: "",
    numCOs: "4",
  });
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseOutcomes, setCourseOutcomes] = useState([]);
  const [courseOutcomeForm, setCourseOutcomeForm] = useState({
    code: "",
    description: "",
  });
  const [editingCourseOutcomeId, setEditingCourseOutcomeId] = useState(null);
  const [courseMapping, setCourseMapping] = useState({});

  const [programOutcomes, setProgramOutcomes] = useState([]);
  const [programOutcomeForm, setProgramOutcomeForm] = useState({
    code: "",
    description: "",
  });
  const [editingProgramOutcomeId, setEditingProgramOutcomeId] = useState(null);

  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchForm, setBatchForm] = useState({ name: "" });
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [studentForm, setStudentForm] = useState({ studentId: "", name: "" });
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editStudentForm, setEditStudentForm] = useState({ studentId: "", name: "" });

  const [offerings, setOfferings] = useState([]);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [offeringForm, setOfferingForm] = useState({
    courseId: "",
    batchId: "",
    teacherId: "",
    semesterId: "",
    section: "",
    academicYear: new Date().getFullYear(),
  });
  const [editingOfferingId, setEditingOfferingId] = useState(null);

  useEffect(() => {
    if (activeTab === "sessions") {
      fetchSessions();
    }
    if (activeTab === "courses") {
      fetchCourses();
    }
    if (activeTab === "programOutcomes") {
      fetchProgramOutcomes();
    }
    if (activeTab === "batches") {
      fetchBatches();
    }
    if (activeTab === "courseOfferings") {
      fetchOfferings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseDetails(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    setSessionError("");
    try {
      const data = await apiService.getSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      setSessionError(err.message || "Failed to load academic sessions.");
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchCourses = async () => {
    setCoursesLoading(true);
    try {
      const data = await apiService.getCourses();
      setCourses(data.courses || []);
      if (!selectedCourse && (data.courses || []).length > 0) {
        setSelectedCourse(data.courses[0]);
      }
    } catch (err) {
      alert(err.message || "Failed to load courses.");
    } finally {
      setCoursesLoading(false);
    }
  };

  const loadCourseDetails = async (course) => {
    try {
      const [outcomesRes, mappingRes] = await Promise.all([
        apiService.getCourseOutcomes(course._id),
        apiService.getCourseCoPoMapping(course._id),
      ]);
      setCourseOutcomes(outcomesRes.outcomes || []);
      setCourseMapping(mappingRes.coPoMapping || {});
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProgramOutcomes = async () => {
    try {
      const data = await apiService.getProgramOutcomes();
      setProgramOutcomes(data.programOutcomes || []);
    } catch (err) {
      alert(err.message || "Failed to load program outcomes.");
    }
  };

  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      const data = await apiService.getBatches();
      const fetchedBatches = data.batches || [];
      setBatches(fetchedBatches);

      let targetBatchId = selectedBatchId;
      if (!targetBatchId && fetchedBatches.length > 0) {
        targetBatchId = fetchedBatches[0]._id;
        setSelectedBatchId(targetBatchId);
      }

      if (targetBatchId) {
        await fetchBatchStudents(targetBatchId);
      }
    } catch (err) {
      alert(err.message || "Failed to load batches.");
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchBatchStudents = async (batchId) => {
    try {
      const data = await apiService.getBatchStudents(batchId);
      setBatchStudents(data.students || []);
    } catch (err) {
      alert(err.message || "Failed to load batch students.");
    }
  };

  const fetchOfferings = async () => {
    setOfferingsLoading(true);
    try {
      const [offeringsData, coursesData, batchesData, sessionsData] =
        await Promise.all([
          apiService.getCourseOfferings(),
          apiService.getCourses(),
          apiService.getBatches(),
          apiService.getSessions(),
        ]);
      setOfferings(offeringsData.offerings || []);
      if (courses.length === 0) {
        setCourses(coursesData.courses || []);
      }
      if (batches.length === 0) {
        setBatches(batchesData.batches || []);
      }
      setSessions(sessionsData.sessions || []);
    } catch (err) {
      alert(err.message || "Failed to load course offerings.");
    } finally {
      setOfferingsLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSessionForm.semesterName.trim() || !newSessionForm.academicYear) {
      alert("Please fill all academic session fields.");
      return;
    }
    setSessionError("");
    setSessionSuccess("");
    try {
      await apiService.createSession({
        semesterName: newSessionForm.semesterName.trim(),
        academicYear: parseInt(newSessionForm.academicYear),
        status: newSessionForm.status,
      });
      setNewSessionForm({
        semesterName: "Spring",
        academicYear: new Date().getFullYear(),
        status: "active",
      });
      setSessionSuccess("Academic session created successfully!");
      fetchSessions();
    } catch (err) {
      setSessionError(err.message || "Failed to create academic session.");
    }
  };

  const handleUpdateSessionStatus = async (sessionId) => {
    try {
      setSessionError("");
      setSessionSuccess("");
      await apiService.updateSession(sessionId, { status: editingSessionStatus });
      setEditingSessionId(null);
      setSessionSuccess("Session status updated successfully!");
      fetchSessions();
    } catch (err) {
      setSessionError(err.message || "Failed to update session status.");
    }
  };

  const isCreateFormValid = () => {
    const fullName = newUserForm.fullName.trim();
    const rawEmail = newUserForm.email;
    const password = newUserForm.password.trim();
    const email = rawEmail.trim().toLowerCase();

    return (
      fullName &&
      email &&
      password.length >= 6 &&
      email.includes("@") &&
      email.includes(".")
    );
  };

  const isResetFormValid = () =>
    resetForm.email && resetForm.newPassword.trim();

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (!isCreateFormValid()) {
      alert(
        "Please fill all fields correctly. Password must be at least 6 characters.",
      );
      return;
    }

    try {
      const { fullName, email, password } = newUserForm;
      await createUser({
        fullName: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
      });
      setNewUserForm({ fullName: "", email: "", password: "" });
    } catch (error) {
      console.error("Failed to create user");
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!resetForm.email || !resetForm.newPassword.trim()) {
      alert("Please select a user and enter a new password.");
      return;
    }
    try {
      await adminResetPassword(resetForm);
      setResetForm({ email: "", newPassword: "" });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteTeacher = async (userId, fullName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete teacher "${fullName}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteUser(userId);
    } catch (error) {
      console.error("Failed to delete teacher:", error);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (
      !courseForm.courseCode.trim() ||
      !courseForm.courseName.trim() ||
      !courseForm.department.trim()
    ) {
      alert("Please fill all required course fields.");
      return;
    }

    try {
      await apiService.createCourse({
        courseCode: courseForm.courseCode.trim(),
        courseName: courseForm.courseName.trim(),
        creditHours: parseFloat(courseForm.creditHours) || 3,
        department: courseForm.department.trim(),
        numCOs: parseInt(courseForm.numCOs) || 4,
      });
      setCourseForm({
        courseCode: "",
        courseName: "",
        creditHours: "3",
        department: "",
        numCOs: "4",
      });
      fetchCourses();
      alert("Course created successfully.");
    } catch (err) {
      alert(err.message || "Failed to create course.");
    }
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!editingCourseId) return;
    try {
      await apiService.updateCourse(editingCourseId, {
        courseCode: courseForm.courseCode.trim(),
        courseName: courseForm.courseName.trim(),
        creditHours: parseFloat(courseForm.creditHours) || 3,
        department: courseForm.department.trim(),
        numCOs: parseInt(courseForm.numCOs) || 4,
      });
      setEditingCourseId(null);
      setCourseForm({
        courseCode: "",
        courseName: "",
        creditHours: "3",
        department: "",
        numCOs: "4",
      });
      fetchCourses();
      alert("Course updated successfully.");
    } catch (err) {
      alert(err.message || "Failed to update course.");
    }
  };

  const startEditCourse = (course) => {
    setEditingCourseId(course._id);
    setCourseForm({
      courseCode: course.courseCode,
      courseName: course.courseName,
      creditHours: String(course.creditHours || 3),
      department: course.department,
      numCOs: String(course.numCOs || 4),
    });
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Delete this course and all associated COs?")) return;
    try {
      await apiService.deleteCourse(courseId);
      if (selectedCourse?._id === courseId) {
        setSelectedCourse(null);
        setCourseOutcomes([]);
      }
      fetchCourses();
    } catch (err) {
      alert(err.message || "Failed to delete course.");
    }
  };

  const handleCreateCourseOutcome = async (e) => {
    e.preventDefault();
    if (!selectedCourse) return;
    try {
      if (editingCourseOutcomeId) {
        await apiService.updateCourseOutcome(
          selectedCourse._id,
          editingCourseOutcomeId,
          courseOutcomeForm,
        );
      } else {
        await apiService.createCourseOutcome(
          selectedCourse._id,
          courseOutcomeForm,
        );
      }
      setCourseOutcomeForm({ code: "", description: "" });
      setEditingCourseOutcomeId(null);
      loadCourseDetails(selectedCourse);
    } catch (err) {
      alert(err.message || "Failed to save CO.");
    }
  };

  const startEditOutcome = (outcome) => {
    setEditingCourseOutcomeId(outcome._id);
    setCourseOutcomeForm({
      code: outcome.code,
      description: outcome.description,
    });
  };

  const handleDeleteOutcome = async (outcomeId) => {
    if (!selectedCourse) return;
    try {
      await apiService.deleteCourseOutcome(selectedCourse._id, outcomeId);
      loadCourseDetails(selectedCourse);
    } catch (err) {
      alert(err.message || "Failed to delete CO.");
    }
  };

  const handleSaveCourseMapping = async () => {
    if (!selectedCourse) return;
    try {
      await apiService.updateCourseCoPoMapping(
        selectedCourse._id,
        courseMapping,
      );
      alert("CO-PO mapping saved successfully.");
    } catch (err) {
      alert(err.message || "Failed to save mapping.");
    }
  };

  const handleCreateProgramOutcome = async (e) => {
    e.preventDefault();
    try {
      if (editingProgramOutcomeId) {
        await apiService.updateProgramOutcome(
          editingProgramOutcomeId,
          programOutcomeForm,
        );
      } else {
        await apiService.createProgramOutcome(programOutcomeForm);
      }
      setProgramOutcomeForm({ code: "", description: "" });
      setEditingProgramOutcomeId(null);
      fetchProgramOutcomes();
    } catch (err) {
      alert(err.message || "Failed to save program outcome.");
    }
  };

  const startEditProgramOutcome = (po) => {
    setEditingProgramOutcomeId(po._id);
    setProgramOutcomeForm({ code: po.code, description: po.description });
  };

  const handleDeleteProgramOutcome = async (poId) => {
    try {
      await apiService.deleteProgramOutcome(poId);
      fetchProgramOutcomes();
    } catch (err) {
      alert(err.message || "Failed to delete program outcome.");
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.name.trim()) {
      alert("Batch name is required.");
      return;
    }
    try {
      if (editingBatchId) {
        await apiService.updateBatch(editingBatchId, {
          name: batchForm.name.trim(),
        });
      } else {
        await apiService.createBatch({ name: batchForm.name.trim() });
      }
      setBatchForm({ name: "" });
      setEditingBatchId(null);
      fetchBatches();
    } catch (err) {
      alert(err.message || "Failed to save batch.");
    }
  };

  const startEditBatch = (batch) => {
    setEditingBatchId(batch._id);
    setBatchForm({ name: batch.name });
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm("Delete this batch?")) return;
    try {
      await apiService.deleteBatch(batchId);
      if (selectedBatchId === batchId) {
        setSelectedBatchId(null);
        setBatchStudents([]);
      }
      fetchBatches();
    } catch (err) {
      alert(err.message || "Failed to delete batch.");
    }
  };

  const handleSelectBatch = async (batchId) => {
    setSelectedBatchId(batchId);
    await fetchBatchStudents(batchId);
  };

  const handleAddStudentToBatch = async (e) => {
    e.preventDefault();
    if (
      !selectedBatchId ||
      !studentForm.studentId.trim() ||
      !studentForm.name.trim()
    ) {
      alert("Please fill both student ID and name.");
      return;
    }
    try {
      await apiService.addBatchStudent(selectedBatchId, {
        studentId: studentForm.studentId.trim(),
        name: studentForm.name.trim(),
      });
      setStudentForm({ studentId: "", name: "" });
      fetchBatchStudents(selectedBatchId);
    } catch (err) {
      alert(err.message || "Failed to add student.");
    }
  };

  const handleDeleteBatchStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student from the batch?")) return;
    if (!selectedBatchId) return;
    try {
      await apiService.deleteBatchStudent(selectedBatchId, studentId);
      fetchBatchStudents(selectedBatchId);
    } catch (err) {
      alert(err.message || "Failed to remove student.");
    }
  };

  const startEditStudent = (student) => {
    setEditingStudentId(student._id);
    setEditStudentForm({ studentId: student.studentId, name: student.name });
  };

  const handleUpdateBatchStudent = async (studentId) => {
    if (!selectedBatchId || !editStudentForm.studentId.trim() || !editStudentForm.name.trim()) {
      alert("Please fill both student ID and name.");
      return;
    }
    try {
      await apiService.updateBatchStudent(selectedBatchId, studentId, {
        studentId: editStudentForm.studentId.trim(),
        name: editStudentForm.name.trim(),
      });
      setEditingStudentId(null);
      setEditStudentForm({ studentId: "", name: "" });
      fetchBatchStudents(selectedBatchId);
    } catch (err) {
      alert(err.message || "Failed to update student.");
    }
  };

  const handleCreateOffering = async (e) => {
    e.preventDefault();
    if (
      !offeringForm.courseId ||
      !offeringForm.batchId ||
      !offeringForm.teacherId ||
      !offeringForm.semesterId ||
      !offeringForm.section.trim() ||
      !offeringForm.academicYear
    ) {
      alert("Please fill all course offering fields.");
      return;
    }
    try {
      const payload = {
        courseId: offeringForm.courseId,
        batchId: offeringForm.batchId,
        teacherId: offeringForm.teacherId,
        semesterId: offeringForm.semesterId,
        section: offeringForm.section.trim(),
        academicYear: parseInt(offeringForm.academicYear, 10),
      };

      if (
        !payload.courseId ||
        !payload.batchId ||
        !payload.teacherId ||
        !payload.semesterId
      ) {
        alert("Please select a course, batch, teacher, and session.");
        return;
      }

      if (editingOfferingId) {
        await apiService.updateCourseOffering(editingOfferingId, payload);
        alert("Course offering updated successfully.");
        setEditingOfferingId(null);
      } else {
        await apiService.createCourseOffering(payload);
        alert("Course offering created successfully.");
      }

      setOfferingForm({
        courseId: "",
        batchId: "",
        teacherId: "",
        semesterId: "",
        section: "",
        academicYear: new Date().getFullYear(),
      });
      fetchOfferings();
    } catch (err) {
      alert(err.message || "Failed to save course offering.");
    }
  };

  const startEditOffering = (offering) => {
    setEditingOfferingId(offering._id);
    setOfferingForm({
      courseId: offering.course?._id || "",
      batchId: offering.batch?._id || "",
      teacherId: offering.teacher?._id || "",
      semesterId: offering.semester?._id || "",
      section: offering.section || "",
      academicYear: offering.academicYear || new Date().getFullYear(),
    });
  };

  const handleDeleteOffering = async (offeringId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this course offering? This will also delete all associated enrollments, assessments, and marks."
      )
    ) {
      return;
    }
    try {
      await apiService.deleteCourseOffering(offeringId);
      fetchOfferings();
      alert("Course offering deleted successfully.");
    } catch (err) {
      alert(err.message || "Failed to delete course offering.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-blue-50/20 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200/50 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              OBE Admin Panel
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage master data, course offerings, and teacher accounts
            </p>
          </div>
          <button
            onClick={logout}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-8 bg-gray-200/50 p-1.5 rounded-xl border border-gray-300/30">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${activeTab === "users" ? "bg-white text-blue-700 shadow-md" : "text-gray-600 hover:text-gray-800"}`}
          >
            <UserPlus size={16} />
            Manage Teachers
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${activeTab === "sessions" ? "bg-white text-blue-700 shadow-md" : "text-gray-600 hover:text-gray-800"}`}
          >
            <Calendar size={16} />
            Sessions
          </button>
          <button
            onClick={() => setActiveTab("courses")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${activeTab === "courses" ? "bg-white text-blue-700 shadow-md" : "text-gray-600 hover:text-gray-800"}`}
          >
            <BookOpen size={16} />
            Course Management
          </button>
          <button
            onClick={() => setActiveTab("programOutcomes")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${activeTab === "programOutcomes" ? "bg-white text-blue-700 shadow-md" : "text-gray-600 hover:text-gray-800"}`}
          >
            <Layers size={16} />
            PO Management
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${activeTab === "batches" ? "bg-white text-blue-700 shadow-md" : "text-gray-600 hover:text-gray-800"}`}
          >
            <Users size={16} />
            Batch Management
          </button>
          <button
            onClick={() => setActiveTab("courseOfferings")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${activeTab === "courseOfferings" ? "bg-white text-blue-700 shadow-md" : "text-gray-600 hover:text-gray-800"}`}
          >
            <ClipboardList size={16} />
            Course Offering
          </button>
        </div>

        {activeTab === "users" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                  <UserPlus className="text-blue-600" />
                  Create New Teacher Account
                </h2>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newUserForm.fullName}
                      onChange={(e) =>
                        setNewUserForm({
                          ...newUserForm,
                          fullName: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                      placeholder="Dr. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) =>
                        setNewUserForm({
                          ...newUserForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                      placeholder="teacher@university.edu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Initial Password
                    </label>
                    <input
                      type="password"
                      value={newUserForm.password}
                      onChange={(e) =>
                        setNewUserForm({
                          ...newUserForm,
                          password: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!isCreateFormValid() || actionLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {actionLoading ? "Creating..." : "Create Teacher"}
                  </button>
                </form>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                  <ShieldAlert className="text-amber-500" />
                  Reset Teacher Password
                </h2>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Select Teacher Account
                    </label>
                    <select
                      value={resetForm.email}
                      onChange={(e) =>
                        setResetForm({ ...resetForm, email: e.target.value })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    >
                      <option value="">Select a teacher</option>
                      {users
                        .filter((u) => u.role !== "admin")
                        .map((u) => (
                          <option key={u.email} value={u.email}>
                            {u.fullName} ({u.email})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={resetForm.newPassword}
                      onChange={(e) =>
                        setResetForm({
                          ...resetForm,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!isResetFormValid() || actionLoading}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {actionLoading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">
                Registered Teacher Accounts
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600 text-sm font-semibold">
                      <th className="text-left py-3 px-4">Full Name</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-6 text-gray-500 italic"
                        >
                          No teachers registered yet.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr
                          key={u.email}
                          className="hover:bg-gray-50/50 text-gray-700"
                        >
                          <td className="py-3.5 px-4 font-medium">
                            {u.fullName}
                          </td>
                          <td className="py-3.5 px-4">{u.email}</td>
                          <td className="py-3.5 px-4 text-center">
                            {u.role === "admin" ? (
                              <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-1 rounded-full font-bold">
                                Admin
                              </span>
                            ) : u.isLoggedIn ? (
                              <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-bold">
                                Online
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold">
                                Offline
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {u.role !== "admin" && (
                              <button
                                onClick={() =>
                                  handleDeleteTeacher(u.id, u.fullName)
                                }
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-red-200 hover:border-red-300"
                                title={`Delete ${u.fullName}`}
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150 md:col-span-1">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                  <Calendar className="text-blue-600" />
                  Add Academic Session
                </h2>
                <form onSubmit={handleCreateSession} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Semester
                    </label>
                    <select
                      value={newSessionForm.semesterName}
                      onChange={(e) =>
                        setNewSessionForm({
                          ...newSessionForm,
                          semesterName: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50 font-medium"
                      required
                    >
                      <option value="Spring">Spring</option>
                      <option value="Fall">Fall</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Academic Year
                    </label>
                    <input
                      type="number"
                      value={newSessionForm.academicYear}
                      onChange={(e) =>
                        setNewSessionForm({
                          ...newSessionForm,
                          academicYear: parseInt(e.target.value) || "",
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50 font-medium"
                      placeholder="e.g., 2025"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={newSessionForm.status}
                      onChange={(e) =>
                        setNewSessionForm({
                          ...newSessionForm,
                          status: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50 font-medium"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 mt-2"
                  >
                    <Plus size={18} />
                    Add Session
                  </button>
                </form>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150 md:col-span-2">
                <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">
                  Academic Sessions List
                </h2>
                {sessionsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="border-b bg-gray-50 text-gray-600 text-sm font-semibold">
                          <th className="text-left py-3 px-4">Semester</th>
                          <th className="text-left py-3 px-4">Academic Year</th>
                          <th className="text-center py-3 px-4">Status</th>
                          <th className="text-right py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sessions.length === 0 ? (
                          <tr>
                            <td
                              colSpan="4"
                              className="text-center py-6 text-gray-500 italic"
                            >
                              No academic sessions configured yet.
                            </td>
                          </tr>
                        ) : (
                          sessions.map((session) => (
                            <tr
                              key={session._id}
                              className="hover:bg-gray-50/50 text-gray-700"
                            >
                              <td className="py-3.5 px-4 font-semibold text-indigo-900">
                                {session.semesterName}
                              </td>
                              <td className="py-3.5 px-4 font-medium">
                                {session.academicYear}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {editingSessionId === session._id ? (
                                  <select
                                    value={editingSessionStatus}
                                    onChange={(e) => setEditingSessionStatus(e.target.value)}
                                    className="border border-gray-300 px-2 py-1 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-xs font-semibold"
                                  >
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="inactive">Inactive</option>
                                  </select>
                                ) : session.status === "active" ? (
                                  <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold inline-flex items-center gap-1">
                                    <CheckCircle size={12} /> Active
                                  </span>
                                ) : session.status === "completed" ? (
                                  <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-bold inline-flex items-center gap-1">
                                    <CheckCircle size={12} /> Completed
                                  </span>
                                ) : (
                                  <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full font-bold inline-flex items-center gap-1">
                                    <XCircle size={12} /> Inactive
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {editingSessionId === session._id ? (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => handleUpdateSessionStatus(session._id)}
                                      className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Save status"
                                    >
                                      <Save size={16} />
                                    </button>
                                    <button
                                      onClick={() => setEditingSessionId(null)}
                                      className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingSessionId(session._id);
                                      setEditingSessionStatus(session.status);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit status"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "courses" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                  <BookOpen className="text-green-600" />
                  {editingCourseId ? "Edit Course" : "Create Course"}
                </h2>
                <form
                  onSubmit={
                    editingCourseId ? handleUpdateCourse : handleCreateCourse
                  }
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Course Code
                    </label>
                    <input
                      type="text"
                      value={courseForm.courseCode}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          courseCode: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50"
                      placeholder="CSE221"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Course Name
                    </label>
                    <input
                      type="text"
                      value={courseForm.courseName}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          courseName: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50"
                      placeholder="Object Oriented Programming"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Credit Hours
                      </label>
                      <input
                        type="number"
                        value={courseForm.creditHours}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            creditHours: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        No. of COs
                      </label>
                      <input
                        type="number"
                        value={courseForm.numCOs}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            numCOs: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={courseForm.department}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          department: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50"
                      placeholder="CSE"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {editingCourseId ? "Update Course" : "Create Course"}
                  </button>
                </form>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
                <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">
                  Course List
                </h2>
                {coursesLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courses.length === 0 ? (
                      <p className="text-gray-500 italic">No courses yet.</p>
                    ) : (
                      courses.map((course) => (
                        <div
                          key={course._id}
                          className="border rounded-xl p-4 hover:bg-green-50/40 transition-all"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <p className="font-bold text-gray-800">
                                {course.courseCode}
                              </p>
                              <p className="text-sm text-gray-600">
                                {course.courseName}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {course.department} • {course.creditHours}{" "}
                                Credits • {course.numCOs} COs
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditCourse(course)}
                                className="text-sm text-blue-600 font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCourse(course._id)}
                                className="text-sm text-red-600 font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => setSelectedCourse(course)}
                              className="text-sm bg-gray-100 px-3 py-1.5 rounded-lg font-semibold"
                            >
                              Manage COs
                            </button>
                            <button
                              onClick={() => setSelectedCourse(course)}
                              className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-semibold"
                            >
                              Map CO-PO
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedCourse && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">
                    Manage COs for {selectedCourse.courseCode}
                  </h3>
                  <form
                    onSubmit={handleCreateCourseOutcome}
                    className="space-y-4 mb-6"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        CO Code
                      </label>
                      <input
                        type="text"
                        value={courseOutcomeForm.code}
                        onChange={(e) =>
                          setCourseOutcomeForm({
                            ...courseOutcomeForm,
                            code: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50"
                        placeholder="CO1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={courseOutcomeForm.description}
                        onChange={(e) =>
                          setCourseOutcomeForm({
                            ...courseOutcomeForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50/50"
                        placeholder="Understand object-oriented principles"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold shadow-lg"
                    >
                      {editingCourseOutcomeId ? "Update CO" : "Add CO"}
                    </button>
                  </form>
                  <div className="space-y-3">
                    {courseOutcomes.length === 0 ? (
                      <p className="text-gray-500 italic">
                        No COs defined yet.
                      </p>
                    ) : (
                      courseOutcomes.map((outcome) => (
                        <div
                          key={outcome._id}
                          className="flex items-center justify-between border rounded-lg p-3"
                        >
                          <div>
                            <p className="font-semibold text-gray-800">
                              {outcome.code}
                            </p>
                            <p className="text-sm text-gray-600">
                              {outcome.description}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditOutcome(outcome)}
                              className="text-sm text-blue-600 font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteOutcome(outcome._id)}
                              className="text-sm text-red-600 font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">
                    CO-PO Mapping for {selectedCourse.courseCode}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="py-2 px-3 text-left">CO</th>
                          {programOutcomes.map((po) => (
                            <th key={po._id} className="py-2 px-3 text-left">
                              {po.code}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {courseOutcomes.map((co) => (
                          <tr key={co._id} className="border-t">
                            <td className="py-2 px-3 font-semibold">
                              {co.code}
                            </td>
                            {programOutcomes.map((po) => (
                              <td
                                key={`${co._id}-${po._id}`}
                                className="py-2 px-3"
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    courseMapping[co.code]?.[po.code],
                                  )}
                                  onChange={(e) => {
                                    const next = { ...courseMapping };
                                    const row = { ...(next[co.code] || {}) };
                                    row[po.code] = e.target.checked ? 1 : 0;
                                    next[co.code] = row;
                                    setCourseMapping(next);
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={handleSaveCourseMapping}
                    className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-semibold"
                  >
                    Save CO-PO Mapping
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "programOutcomes" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                <Layers className="text-indigo-600" />
                {editingProgramOutcomeId
                  ? "Edit Program Outcome"
                  : "Create Program Outcome"}
              </h2>
              <form onSubmit={handleCreateProgramOutcome} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    PO Code
                  </label>
                  <input
                    type="text"
                    value={programOutcomeForm.code}
                    onChange={(e) =>
                      setProgramOutcomeForm({
                        ...programOutcomeForm,
                        code: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50"
                    placeholder="PO1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={programOutcomeForm.description}
                    onChange={(e) =>
                      setProgramOutcomeForm({
                        ...programOutcomeForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50/50"
                    placeholder="Engineering knowledge"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-semibold"
                >
                  {editingProgramOutcomeId ? "Update PO" : "Create PO"}
                </button>
              </form>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">
                Program Outcomes
              </h2>
              <div className="space-y-3">
                {programOutcomes.length === 0 ? (
                  <p className="text-gray-500 italic">No POs yet.</p>
                ) : (
                  programOutcomes.map((po) => (
                    <div
                      key={po._id}
                      className="flex items-center justify-between border rounded-lg p-3"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{po.code}</p>
                        <p className="text-sm text-gray-600">
                          {po.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditProgramOutcome(po)}
                          className="text-sm text-blue-600 font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProgramOutcome(po._id)}
                          className="text-sm text-red-600 font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "batches" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Batch List & Add Batch */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-150">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-3">
                  <Users className="text-purple-600" />
                  {editingBatchId ? "Edit Batch" : "Create Batch"}
                </h2>
                <form onSubmit={handleCreateBatch} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Batch Name
                    </label>
                    <input
                      type="text"
                      value={batchForm.name}
                      onChange={(e) => setBatchForm({ name: e.target.value })}
                      className="w-full border border-gray-300 px-4 py-2 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50/50 font-medium"
                      placeholder="Batch 61"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white py-2.5 rounded-xl font-semibold shadow-md active:scale-[0.98] transition-all"
                    >
                      {editingBatchId ? "Update" : "Create"}
                    </button>
                    {editingBatchId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBatchId(null);
                          setBatchForm({ name: "" });
                        }}
                        className="px-4 text-sm font-semibold text-gray-500 hover:text-gray-750 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl border transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Batches List */}
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-150">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h3 className="font-bold text-gray-800 text-lg">
                    Batches ({batches.length})
                  </h3>
                </div>
                <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                  {batches.length === 0 ? (
                    <p className="text-gray-500 italic py-4 text-center">No batches created yet.</p>
                  ) : (
                    batches.map((batch) => {
                      const isSelected = selectedBatchId === batch._id;
                      return (
                        <div
                          key={batch._id}
                          onClick={() => handleSelectBatch(batch._id)}
                          className={`flex items-center justify-between border rounded-xl p-3 cursor-pointer transition-all duration-200 ${isSelected
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md shadow-purple-100"
                            : "bg-white hover:bg-purple-50/50 border-gray-200 text-gray-700"
                            }`}
                        >
                          <span className="font-semibold">{batch.name}</span>
                          <div className="flex gap-1.5 onClick-prevent" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => startEditBatch(batch)}
                              className={`p-1.5 rounded-lg transition-colors ${isSelected
                                ? "hover:bg-white/20 text-purple-100 hover:text-white"
                                : "hover:bg-blue-50 text-gray-400 hover:text-blue-600 border border-transparent hover:border-blue-100"
                                }`}
                              title="Edit Batch Name"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteBatch(batch._id)}
                              className={`p-1.5 rounded-lg transition-colors ${isSelected
                                ? "hover:bg-white/20 text-purple-100 hover:text-white"
                                : "hover:bg-red-50 text-gray-400 hover:text-red-650 border border-transparent hover:border-red-100"
                                }`}
                              title="Delete Batch"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Student List & Add Student */}
            <div className="lg:col-span-2">
              {selectedBatchId ? (
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Manage Students
                    </h2>
                    <p className="text-purple-600 font-semibold text-sm mt-1">
                      Batch: {batches.find((b) => b._id === selectedBatchId)?.name || "Loading..."}
                    </p>
                  </div>

                  {/* Add Student inline form */}
                  <form
                    onSubmit={handleAddStudentToBatch}
                    className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/60"
                  >
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm">Add Student to Batch</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Student ID
                        </label>
                        <input
                          type="text"
                          value={studentForm.studentId}
                          onChange={(e) =>
                            setStudentForm({
                              ...studentForm,
                              studentId: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                          placeholder="e.g. 201-15-13492"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Student Name
                        </label>
                        <input
                          type="text"
                          value={studentForm.name}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, name: e.target.value })
                          }
                          className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                          placeholder="e.g. Joy Sarkar"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="md:col-span-1 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-[0.98]"
                      >
                        Add Student
                      </button>
                    </div>
                  </form>

                  {/* Students Table */}
                  <div className="overflow-x-auto border border-gray-150 rounded-xl">
                    <table className="w-full table-auto min-w-[500px]">
                      <thead>
                        <tr className="border-b bg-gray-50/70 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                          <th className="text-left py-3 px-4 w-1/3">Student ID</th>
                          <th className="text-left py-3 px-4 w-5/12">Student Name</th>
                          <th className="text-center py-3 px-4 w-3/12">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 text-sm">
                        {batchStudents.length === 0 ? (
                          <tr>
                            <td
                              colSpan="3"
                              className="text-center py-8 text-gray-500 italic"
                            >
                              No students registered in this batch yet.
                            </td>
                          </tr>
                        ) : (
                          batchStudents.map((student) => {
                            const isEditing = editingStudentId === student._id;
                            return (
                              <tr key={student._id} className="hover:bg-gray-50/30">
                                <td className="py-3 px-4">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editStudentForm.studentId}
                                      onChange={(e) =>
                                        setEditStudentForm({
                                          ...editStudentForm,
                                          studentId: e.target.value,
                                        })
                                      }
                                      className="w-full border border-purple-300 focus:border-purple-500 px-2 py-1 rounded text-sm outline-none focus:ring-1 focus:ring-purple-500"
                                      required
                                    />
                                  ) : (
                                    <span className="font-semibold text-gray-800">
                                      {student.studentId}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editStudentForm.name}
                                      onChange={(e) =>
                                        setEditStudentForm({
                                          ...editStudentForm,
                                          name: e.target.value,
                                        })
                                      }
                                      className="w-full border border-purple-300 focus:border-purple-500 px-2 py-1 rounded text-sm outline-none focus:ring-1 focus:ring-purple-500"
                                      required
                                    />
                                  ) : (
                                    <span className="text-gray-700">{student.name}</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {isEditing ? (
                                    <div className="flex justify-center gap-1.5">
                                      <button
                                        onClick={() => handleUpdateBatchStudent(student._id)}
                                        className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 px-2.5 py-1 rounded-lg text-xs font-semibold border border-green-200 transition-all shadow-sm"
                                        title="Save Student Details"
                                      >
                                        <Save size={12} />
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingStudentId(null)}
                                        className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-200 transition-all shadow-sm"
                                        title="Cancel editing"
                                      >
                                        <X size={12} />
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center gap-1.5">
                                      <button
                                        onClick={() => startEditStudent(student)}
                                        className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-200 transition-all shadow-sm"
                                        title="Edit Student Details"
                                      >
                                        <Edit2 size={12} />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteBatchStudent(student._id)}
                                        className="inline-flex items-center gap-1 bg-red-55/70 hover:bg-red-100 text-red-650 px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-200 transition-all shadow-sm"
                                        title="Remove Student from Batch"
                                      >
                                        <Trash2 size={12} />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl shadow-xl border border-gray-150 min-h-[300px]">
                  <Users className="text-gray-300 mb-4" size={48} />
                  <h3 className="text-lg font-bold text-gray-700">No Batch Selected</h3>
                  <p className="text-gray-400 text-sm mt-1 max-w-sm">
                    Select a batch from the list on the left to manage the registered students and update details.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "courseOfferings" && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                <ClipboardList className="text-orange-600" />
                {editingOfferingId ? "Edit Course Offering" : "Create Course Offering"}
              </h2>
              <form
                onSubmit={handleCreateOffering}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Course
                  </label>
                  <select
                    value={offeringForm.courseId}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        courseId: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl"
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.courseCode} - {course.courseName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Batch
                  </label>
                  <select
                    value={offeringForm.batchId}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        batchId: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl"
                  >
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Teacher
                  </label>
                  <select
                    value={offeringForm.teacherId}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        teacherId: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl"
                  >
                    <option value="">Select teacher</option>
                    {users
                      .filter((u) => u.role !== "admin")
                      .map((user) => (
                        <option key={user.id || user._id || user.email} value={user.id || user._id}>
                          {user.fullName}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Session
                  </label>
                  <select
                    value={offeringForm.semesterId}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        semesterId: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl"
                  >
                    <option value="">Select session</option>
                    {sessions.map((session) => (
                      <option key={session._id} value={session._id}>
                        {session.semesterName} ({session.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={offeringForm.section}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        section: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl"
                    placeholder="A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="number"
                    value={offeringForm.academicYear}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        academicYear: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    {editingOfferingId ? "Update Course Offering" : "Save Course Offering"}
                  </button>
                  {editingOfferingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOfferingId(null);
                        setOfferingForm({
                          courseId: "",
                          batchId: "",
                          teacherId: "",
                          semesterId: "",
                          section: "",
                          academicYear: new Date().getFullYear(),
                        });
                      }}
                      className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold border transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">
                Existing Course Offerings
              </h2>
              {offeringsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-3">
                  {offerings.length === 0 ? (
                    <p className="text-gray-500 italic">
                      No offerings created yet.
                    </p>
                  ) : (
                    offerings.map((offering) => (
                      <div key={offering._id} className="border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50/50 transition-all">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {offering.course?.courseCode} -{" "}
                            {offering.course?.courseName}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Batch: {offering.batch?.name} • Teacher:{" "}
                            {offering.teacher?.fullName || "Unassigned"} •
                            Section: {offering.section} • Year:{" "}
                            {offering.academicYear}
                          </p>
                        </div>
                        <div className="flex gap-2 self-end md:self-center">
                          <button
                            onClick={() => startEditOffering(offering)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-bold border border-blue-200 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteOffering(offering._id)}
                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-bold border border-red-200 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {message.text && (
          <div
            className={`mt-6 p-4 rounded-xl flex items-center gap-3 shadow-md font-medium border ${message.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}
          >
            {message.type === "error" ? (
              <AlertCircle size={20} />
            ) : (
              <CheckCircle size={20} />
            )}
            {message.text}
          </div>
        )}
        {sessionError && (
          <div className="mt-6 p-4 rounded-xl flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 shadow-md font-medium">
            <AlertCircle size={20} />
            {sessionError}
          </div>
        )}
        {sessionSuccess && (
          <div className="mt-6 p-4 rounded-xl flex items-center gap-3 bg-green-50 text-green-700 border border-green-200 shadow-md font-medium">
            <CheckCircle size={20} />
            {sessionSuccess}
          </div>
        )}
      </div>
    </div>
  );
}
