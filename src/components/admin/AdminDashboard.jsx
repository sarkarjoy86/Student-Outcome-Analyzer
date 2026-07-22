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
  Check,
  GitMerge,
  Sparkles,
  CheckSquare,
  ChevronUp,
  ChevronDown,
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
    loadAdminUsers,
  } = useAuth();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("adminActiveTab") || "users";
  });

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem("adminActiveTab", activeTab);
    }
    if (activeTab === "users" && loadAdminUsers) {
      loadAdminUsers();
      const interval = setInterval(() => {
        loadAdminUsers();
      }, 5000);
      return () => clearInterval(interval);
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
    department: "CSE",
    numCOs: "4",
    level: "1",
    term: "I",
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

  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [sectionForm, setSectionForm] = useState({ sectionName: "" });
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [offeringSections, setOfferingSections] = useState([]);

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
      fetchProgramOutcomes();
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
      if (programOutcomes.length === 0) {
        fetchProgramOutcomes();
      }
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
        await fetchSections(targetBatchId);
      } else {
        setSections([]);
        setSelectedSectionId(null);
        setBatchStudents([]);
      }
    } catch (err) {
      alert(err.message || "Failed to load batches.");
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchSections = async (batchId) => {
    setSectionsLoading(true);
    try {
      const data = await apiService.getSections(batchId);
      const fetchedSections = data.sections || [];
      setSections(fetchedSections);

      let targetSectionId = selectedSectionId;
      if (!fetchedSections.some(s => s._id === targetSectionId)) {
        targetSectionId = fetchedSections.length > 0 ? fetchedSections[0]._id : null;
      }
      setSelectedSectionId(targetSectionId);

      if (targetSectionId) {
        await fetchSectionStudents(batchId, targetSectionId);
      } else {
        setBatchStudents([]);
      }
    } catch (err) {
      alert(err.message || "Failed to load sections.");
    } finally {
      setSectionsLoading(false);
    }
  };

  const fetchSectionStudents = async (batchId, sectionId) => {
    try {
      const data = await apiService.getSectionStudents(batchId, sectionId);
      setBatchStudents(data.students || []);
    } catch (err) {
      alert(err.message || "Failed to load section students.");
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
        level: courseForm.level || "1",
        term: courseForm.term || "I",
      });
      setCourseForm({
        courseCode: "",
        courseName: "",
        creditHours: "3",
        department: "CSE",
        numCOs: "4",
        level: "1",
        term: "I",
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
      const updatedNumCOs = parseInt(courseForm.numCOs) || 4;
      await apiService.updateCourse(editingCourseId, {
        courseCode: courseForm.courseCode.trim(),
        courseName: courseForm.courseName.trim(),
        creditHours: parseFloat(courseForm.creditHours) || 3,
        department: courseForm.department.trim(),
        numCOs: updatedNumCOs,
        level: courseForm.level || "1",
        term: courseForm.term || "I",
      });
      if (selectedCourse?._id === editingCourseId) {
        setSelectedCourse((prev) =>
          prev
            ? {
                ...prev,
                courseCode: courseForm.courseCode.trim(),
                courseName: courseForm.courseName.trim(),
                creditHours: parseFloat(courseForm.creditHours) || 3,
                department: courseForm.department.trim(),
                numCOs: updatedNumCOs,
                level: courseForm.level || "1",
                term: courseForm.term || "I",
              }
            : prev,
        );
      }
      setEditingCourseId(null);
      setCourseForm({
        courseCode: "",
        courseName: "",
        creditHours: "3",
        department: "CSE",
        numCOs: "4",
        level: "1",
        term: "I",
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
      department: course.department || "CSE",
      numCOs: String(course.numCOs || 4),
      level: String(course.level || "1"),
      term: String(course.term || "I"),
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

    const maxAllowedCOs = Number(selectedCourse.numCOs) || 4;
    if (!editingCourseOutcomeId && courseOutcomes.length >= maxAllowedCOs) {
      alert(
        `Maximum CO limit reached (${maxAllowedCOs} COs configured for this course). Please update "NO. OF COS" under Edit Master Course to add more outcomes.`
      );
      return;
    }

    try {
      const defaultCode =
        courseOutcomeForm.code ||
        `CO${Math.min(maxAllowedCOs, courseOutcomes.length + 1)}`;
      const payload = {
        ...courseOutcomeForm,
        code: defaultCode,
      };
      if (editingCourseOutcomeId) {
        await apiService.updateCourseOutcome(
          selectedCourse._id,
          editingCourseOutcomeId,
          payload,
        );
      } else {
        await apiService.createCourseOutcome(
          selectedCourse._id,
          payload,
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
    await fetchSections(batchId);
  };

  const handleSelectSection = async (sectionId) => {
    setSelectedSectionId(sectionId);
    await fetchSectionStudents(selectedBatchId, sectionId);
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!selectedBatchId || !sectionForm.sectionName.trim()) {
      alert("Section name is required.");
      return;
    }
    try {
      await apiService.createSection(selectedBatchId, {
        sectionName: sectionForm.sectionName.trim(),
      });
      setSectionForm({ sectionName: "" });
      await fetchSections(selectedBatchId);
    } catch (err) {
      alert(err.message || "Failed to create section.");
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm("Are you sure you want to delete this section? All students in this section will be cleared of their section assignment.")) return;
    try {
      await apiService.deleteSection(selectedBatchId, sectionId);
      await fetchSections(selectedBatchId);
    } catch (err) {
      alert(err.message || "Failed to delete section.");
    }
  };

  const handleAddStudentToBatch = async (e) => {
    e.preventDefault();
    if (
      !selectedBatchId ||
      !selectedSectionId ||
      !studentForm.studentId.trim() ||
      !studentForm.name.trim()
    ) {
      alert("Please select a section and fill both student ID and name.");
      return;
    }
    try {
      await apiService.addSectionStudent(selectedBatchId, selectedSectionId, {
        studentId: studentForm.studentId.trim(),
        name: studentForm.name.trim(),
      });
      setStudentForm({ studentId: "", name: "" });
      await fetchSectionStudents(selectedBatchId, selectedSectionId);
    } catch (err) {
      alert(err.message || "Failed to add student.");
    }
  };

  const handleDeleteBatchStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student from the section?")) return;
    if (!selectedBatchId || !selectedSectionId) return;
    try {
      await apiService.deleteSectionStudent(selectedBatchId, selectedSectionId, studentId);
      await fetchSectionStudents(selectedBatchId, selectedSectionId);
    } catch (err) {
      alert(err.message || "Failed to remove student.");
    }
  };

  const startEditStudent = (student) => {
    setEditingStudentId(student._id);
    setEditStudentForm({ studentId: student.studentId, name: student.name });
  };

  const handleUpdateBatchStudent = async (studentId) => {
    if (!selectedBatchId || !selectedSectionId || !editStudentForm.studentId.trim() || !editStudentForm.name.trim()) {
      alert("Please fill both student ID and name.");
      return;
    }
    try {
      await apiService.updateSectionStudent(selectedBatchId, selectedSectionId, studentId, {
        studentId: editStudentForm.studentId.trim(),
        name: editStudentForm.name.trim(),
      });
      setEditingStudentId(null);
      setEditStudentForm({ studentId: "", name: "" });
      await fetchSectionStudents(selectedBatchId, selectedSectionId);
    } catch (err) {
      alert(err.message || "Failed to update student.");
    }
  };

  const handleBatchChangeInOffering = async (batchId) => {
    setOfferingForm((prev) => ({
      ...prev,
      batchId: batchId,
      section: "",
    }));
    if (batchId) {
      try {
        const data = await apiService.getSections(batchId);
        setOfferingSections(data.sections || []);
      } catch (err) {
        console.error("Failed to load sections for batch:", err);
        setOfferingSections([]);
      }
    } else {
      setOfferingSections([]);
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
      setOfferingSections([]);
      fetchOfferings();
    } catch (err) {
      alert(err.message || "Failed to save course offering.");
    }
  };

  const startEditOffering = async (offering) => {
    setEditingOfferingId(offering._id);
    setOfferingForm({
      courseId: offering.course?._id || "",
      batchId: offering.batch?._id || "",
      teacherId: offering.teacher?._id || "",
      semesterId: offering.semester?._id || "",
      section: offering.section || "",
      academicYear: offering.academicYear || new Date().getFullYear(),
    });
    if (offering.batch?._id) {
      try {
        const data = await apiService.getSections(offering.batch._id);
        setOfferingSections(data.sections || []);
      } catch (err) {
        console.error("Failed to load sections for batch:", err);
        setOfferingSections([]);
      }
    } else {
      setOfferingSections([]);
    }
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
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Teacher Accounts</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{users.filter((u) => u.role !== "admin").length}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                  <Users size={20} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Currently Online</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {users.filter((u) => u.role !== "admin" && u.isLoggedIn).length}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Offline Accounts</p>
                  <p className="text-2xl font-black text-slate-500 mt-1">
                    {users.filter((u) => u.role !== "admin" && !u.isLoggedIn).length}
                  </p>
                </div>
                <div className="p-3 bg-gray-100 text-gray-500 rounded-xl">
                  <UserPlus size={20} />
                </div>
              </div>
            </div>

            {/* Forms Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Create Teacher Form Card */}
              <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 border-b border-gray-150 pb-4 mb-6">
                  <div className="p-2.5 bg-blue-100/80 text-blue-800 rounded-xl">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">
                      Create Teacher Account
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">Provision new faculty credentials</p>
                  </div>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
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
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs font-semibold bg-gray-50/30"
                      placeholder="e.g. Dr. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
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
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs font-semibold bg-gray-50/30"
                      placeholder="teacher@university.edu"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
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
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs font-semibold bg-gray-50/30"
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!isCreateFormValid() || actionLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
                  >
                    <UserPlus size={15} />
                    {actionLoading ? "Creating..." : "Create Teacher Account"}
                  </button>
                </form>
              </div>

              {/* Reset Password Form Card */}
              <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 border-b border-gray-150 pb-4 mb-6">
                  <div className="p-2.5 bg-amber-100/80 text-amber-800 rounded-xl">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">
                      Reset Teacher Password
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">Update credentials for an existing account</p>
                  </div>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Select Teacher Account
                    </label>
                    <select
                      value={resetForm.email}
                      onChange={(e) =>
                        setResetForm({ ...resetForm, email: e.target.value })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none text-xs font-semibold bg-gray-50/30"
                    >
                      <option value="">Select a teacher account</option>
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
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
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none text-xs font-semibold bg-gray-50/30"
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!isResetFormValid() || actionLoading}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert size={15} />
                    {actionLoading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>

            {/* Registered Teachers Table */}
            <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Registered Faculty Accounts
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Live login status updates automatically every 5 seconds</p>
                </div>
                <button
                  onClick={() => loadAdminUsers && loadAdminUsers()}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold border border-gray-200 transition"
                >
                  Refresh Live Status
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs font-semibold text-gray-700">
                  <thead>
                    <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                      <th className="text-left py-3 px-4">Faculty Member</th>
                      <th className="text-left py-3 px-4">Email Address</th>
                      <th className="text-center py-3 px-4">Live Status</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-8 text-gray-400 italic"
                        >
                          No teacher accounts registered yet.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr
                          key={u.email}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            {u.fullName}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-gray-600">{u.email}</td>
                          <td className="py-3.5 px-4 text-center">
                            {u.role === "admin" ? (
                              <span className="bg-purple-100 text-purple-800 text-[11px] px-3 py-1 rounded-full font-black inline-flex items-center gap-1 border border-purple-200">
                                Admin
                              </span>
                            ) : u.isLoggedIn ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[11px] px-3 py-1 rounded-full font-black inline-flex items-center gap-1.5 border border-emerald-300">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Online
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-500 text-[11px] px-3 py-1 rounded-full font-bold inline-flex items-center gap-1.5 border border-gray-200">
                                <span className="h-2 w-2 rounded-full bg-gray-400"></span>
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
                                className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-red-200"
                                title={`Delete ${u.fullName}`}
                              >
                                <Trash2 size={13} />
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
                      <option value="Summer">Summer</option>
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
                          academicYear: Number(e.target.value),
                        })
                      }
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50 font-medium"
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
                    disabled={actionLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {actionLoading ? "Saving..." : "Add Session"}
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Card */}
              <div className="lg:col-span-5 bg-white p-7 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 border-b border-gray-150 pb-4 mb-6">
                  <div className="p-2.5 bg-emerald-100/80 text-emerald-800 rounded-xl">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">
                      {editingCourseId ? "Edit Master Course" : "Create Master Course"}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">Configure course metadata and credit hours</p>
                  </div>
                </div>

                <form
                  onSubmit={
                    editingCourseId ? handleUpdateCourse : handleCreateCourse
                  }
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
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
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-xs font-semibold bg-gray-50/30"
                      placeholder="e.g. CSE 213"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Course Title
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
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-xs font-semibold bg-gray-50/30"
                      placeholder="e.g. Object Oriented Programming Language"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                        Credit Hours
                      </label>
                      <select
                        value={courseForm.creditHours}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            creditHours: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-xs font-extrabold bg-white shadow-2xs"
                      >
                        <option value="1">1.0 Credit</option>
                        <option value="1.5">1.5 Credits</option>
                        <option value="2">2.0 Credits</option>
                        <option value="3">3.0 Credits</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                        No. of COs
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={courseForm.numCOs}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
                            setCourseForm({
                              ...courseForm,
                              numCOs: String(val),
                            });
                          }}
                          className="w-full border border-gray-300 pl-3.5 pr-8 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-xs font-extrabold bg-white shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="absolute right-1 flex flex-col border-l border-gray-200 pl-0.5 pr-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const curr = parseInt(courseForm.numCOs) || 4;
                              setCourseForm({
                                ...courseForm,
                                numCOs: String(Math.min(12, curr + 1)),
                              });
                            }}
                            className="p-0.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition active:scale-90"
                            title="Increase CO count (+1)"
                          >
                            <ChevronUp size={13} strokeWidth={3} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const curr = parseInt(courseForm.numCOs) || 4;
                              setCourseForm({
                                ...courseForm,
                                numCOs: String(Math.max(1, curr - 1)),
                              });
                            }}
                            className="p-0.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition active:scale-90"
                            title="Decrease CO count (-1)"
                          >
                            <ChevronDown size={13} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Level & Term Dropdowns */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                        Level
                      </label>
                      <select
                        value={courseForm.level || "1"}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            level: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-xs font-extrabold bg-white shadow-2xs"
                      >
                        <option value="1">Level 1</option>
                        <option value="2">Level 2</option>
                        <option value="3">Level 3</option>
                        <option value="4">Level 4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                        Term
                      </label>
                      <select
                        value={courseForm.term || "I"}
                        onChange={(e) =>
                          setCourseForm({
                            ...courseForm,
                            term: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-xs font-extrabold bg-white shadow-2xs"
                      >
                        <option value="I">Term I</option>
                        <option value="II">Term II</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Department / Offering Body
                    </label>
                    <select
                      value={courseForm.department || "CSE"}
                      onChange={(e) =>
                        setCourseForm({
                          ...courseForm,
                          department: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 px-3.5 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-xs font-extrabold bg-white shadow-2xs"
                    >
                      <option value="CSE">CSE (Computer Science & Engineering)</option>
                      <option value="EEE">EEE (Electrical & Electronic Engineering)</option>
                      <option value="CE">CE (Civil Engineering)</option>
                      <option value="BBA">BBA (Business Administration)</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {editingCourseId ? <Save size={15} /> : <Plus size={15} />}
                      {editingCourseId ? "Update Course" : "Create Course"}
                    </button>
                    {editingCourseId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCourseId(null);
                          setCourseForm({ courseCode: "", courseName: "", creditHours: 3, numCOs: 4, department: "CSE" });
                        }}
                        className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Course List */}
              <div className="lg:col-span-7 bg-white p-7 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">
                      Master Course Directory
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">Select a course below to manage its COs and CO-PO allocation matrix</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                    {courses.length} Active Courses
                  </span>
                </div>

                {coursesLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {courses.length === 0 ? (
                      <p className="text-gray-400 italic text-xs py-6 text-center">No master courses created yet.</p>
                    ) : (
                      courses.map((course) => {
                        const isSelected = selectedCourse?._id === course._id;
                        return (
                          <div
                            key={course._id}
                            className={`p-4 rounded-xl transition-all border ${
                              isSelected
                                ? "bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm"
                                : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-gray-900 text-sm">{course.courseCode}</span>
                                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">
                                    {course.department || 'CSE'}
                                  </span>
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                    {course.creditHours} Credits
                                  </span>
                                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                    L-{course.level || '1'} T-{course.term || 'I'}
                                  </span>
                                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                    {course.numCOs || 4} COs
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-gray-600 mt-1">
                                  {course.courseName}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  onClick={() => setSelectedCourse(course)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1 border ${
                                    isSelected
                                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200"
                                  }`}
                                >
                                  <Layers size={13} />
                                  Manage COs
                                </button>

                                <button
                                  onClick={() => setSelectedCourse(course)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1 border ${
                                    isSelected
                                      ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                                      : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200"
                                  }`}
                                >
                                  <Network size={13} />
                                  Map CO-PO
                                </button>

                                <button
                                  onClick={() => startEditCourse(course)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-200"
                                  title="Edit Course"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCourse(course._id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                                  title="Delete Course"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Course CO & CO-PO Allocation Matrix */}
            {selectedCourse && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pt-4 border-t border-gray-200">
                {/* CO Management Card */}
                <div className="xl:col-span-5 bg-white p-7 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between space-y-6">
                  <div className="space-y-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between border-b border-gray-150 pb-4 shrink-0">
                      <div>
                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                          <Layers className="text-emerald-700" size={18} />
                          Course Outcomes (COs)
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">For <span className="font-bold text-gray-800">{selectedCourse.courseCode} — {selectedCourse.courseName}</span></p>
                      </div>
                    </div>

                    {(() => {
                      const maxAllowedCOs = Number(selectedCourse.numCOs) || 4;
                      const isMaxCOsReached = !editingCourseOutcomeId && courseOutcomes.length >= maxAllowedCOs;
                      const totalOptions = Math.max(maxAllowedCOs, 12);
                      const availableOptions = Array.from({ length: totalOptions }, (_, i) => `CO${i + 1}`);

                      return (
                        <form
                          onSubmit={handleCreateCourseOutcome}
                          className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-3 shrink-0"
                        >
                          <div className="flex flex-col sm:flex-row gap-3 items-start">
                            <div className="w-full sm:w-1/3">
                              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                                CO SELECTION
                              </label>
                              <select
                                value={
                                  courseOutcomeForm.code ||
                                  `CO${Math.min(maxAllowedCOs, courseOutcomes.length + 1)}`
                                }
                                onChange={(e) =>
                                  setCourseOutcomeForm({
                                    ...courseOutcomeForm,
                                    code: e.target.value,
                                  })
                                }
                                disabled={isMaxCOsReached}
                                className="w-full border border-gray-300 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-xs font-extrabold bg-white shadow-xs disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                {availableOptions.map((coCode) => (
                                  <option key={coCode} value={coCode}>
                                    {coCode}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="w-full sm:w-2/3">
                              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                                DESCRIPTION
                              </label>
                              <textarea
                                rows={3}
                                value={courseOutcomeForm.description}
                                onChange={(e) =>
                                  setCourseOutcomeForm({
                                    ...courseOutcomeForm,
                                    description: e.target.value,
                                  })
                                }
                                disabled={isMaxCOsReached}
                                className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-xs font-semibold bg-white resize-y min-h-[75px] disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                placeholder={
                                  isMaxCOsReached
                                    ? `Limit reached (${courseOutcomes.length}/${maxAllowedCOs} COs). Update "NO. OF COS" above to add more.`
                                    : "Outcome description"
                                }
                              />
                            </div>
                          </div>

                          {isMaxCOsReached && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-bold shadow-xs">
                              <AlertCircle size={16} className="text-amber-600 shrink-0" />
                              <span>
                                Maximum limit reached ({courseOutcomes.length}/{maxAllowedCOs} COs). Please update <strong>"NO. OF COS"</strong> under Edit Master Course to add more outcomes.
                              </span>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={isMaxCOsReached || actionLoading}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                              {editingCourseOutcomeId ? <Save size={14} /> : <Plus size={14} />}
                              {editingCourseOutcomeId ? "Update Outcome" : "Add Outcome"}
                            </button>
                            {editingCourseOutcomeId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCourseOutcomeId(null);
                                  setCourseOutcomeForm({ code: "", description: "" });
                                }}
                                className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-xs transition"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </form>
                      );
                    })()}

                    <div className="space-y-2.5 flex-1 min-h-[300px] max-h-[580px] overflow-y-auto pr-1">
                      {courseOutcomes.length === 0 ? (
                        <p className="text-gray-400 italic text-xs py-4 text-center">No outcomes defined for this course yet.</p>
                      ) : (
                        courseOutcomes.map((outcome) => (
                          <div
                            key={outcome._id}
                            className="flex items-center justify-between border border-gray-200 rounded-xl p-3.5 hover:bg-gray-50/80 transition"
                          >
                            <div className="flex items-center gap-3">
                              <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-emerald-200">
                                {outcome.code}
                              </span>
                              <p className="text-xs font-medium text-gray-800">
                                {outcome.description}
                              </p>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => startEditOutcome(outcome)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit CO"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteOutcome(outcome._id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete CO"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* CO-PO Allocation Matrix Card */}
                {(() => {
                  const DEFAULT_PO_NAMES = {
                    PO1: "Engineering knowledge",
                    PO2: "Problem analysis",
                    PO3: "Design/development of solutions",
                    PO4: "Investigation",
                    PO5: "Modern tool usage",
                    PO6: "The engineer and society",
                    PO7: "Environment & sustainability",
                    PO8: "Ethics",
                    PO9: "Individual work and teamwork",
                    PO10: "Communication",
                    PO11: "Project management and finance",
                    PO12: "Life-long learning",
                  };

                  const displayPOs =
                    programOutcomes.length > 0
                      ? programOutcomes
                      : Array.from({ length: 12 }, (_, i) => {
                          const code = `PO${i + 1}`;
                          return {
                            _id: `po-fallback-${i + 1}`,
                            code,
                            description: DEFAULT_PO_NAMES[code] || `Program Outcome ${i + 1}`,
                          };
                        });

                  return (
                    <div className="xl:col-span-7 bg-white p-7 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                      <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                        <div>
                          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                            <Network className="text-indigo-600" size={18} />
                            CO-PO Allocation Matrix
                          </h3>
                          <p className="text-xs text-gray-500 font-medium">Click cells to toggle alignment between COs and POs for <span className="font-bold text-gray-800">{selectedCourse.courseCode}</span></p>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-xs font-semibold">
                          <thead>
                            <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-700 font-extrabold uppercase">
                              <th className="py-3 px-3 text-left bg-gray-200/50">CO Code</th>
                              {displayPOs.map((po) => (
                                <th key={po._id} className="py-3 px-2 text-center" title={po.description}>
                                  {po.code}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {courseOutcomes.map((co) => (
                              <tr key={co._id} className="hover:bg-gray-50/50">
                                <td className="py-3 px-3 font-extrabold text-emerald-800 bg-emerald-50/30 border-r border-gray-200">
                                  {co.code}
                                </td>
                                {displayPOs.map((po) => {
                                  const isMapped = Boolean(courseMapping[co.code]?.[po.code]);
                                  return (
                                    <td
                                      key={`${co._id}-${po._id}`}
                                      className="py-2 px-1.5 text-center"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = { ...courseMapping };
                                          const row = { ...(next[co.code] || {}) };
                                          row[po.code] = isMapped ? 0 : 1;
                                          next[co.code] = row;
                                          setCourseMapping(next);
                                        }}
                                        className={`w-full py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-0.5 ${
                                          isMapped
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ring-1 ring-emerald-600/30"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-400 border border-slate-200/60"
                                        }`}
                                        title={`${co.code} -> ${po.code}: ${isMapped ? 'Mapped (1)' : 'Unmapped (0)'}`}
                                      >
                                        {isMapped ? (
                                          <>
                                            <Check size={12} strokeWidth={3} />
                                            <span>1</span>
                                          </>
                                        ) : (
                                          <span>0</span>
                                        )}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                            {courseOutcomes.length === 0 && (
                              <tr>
                                <td colSpan={displayPOs.length + 1} className="py-6 text-center text-gray-400 italic text-xs">
                                  Please add Course Outcomes (COs) on the left first to enable mapping matrix.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleSaveCourseMapping}
                          disabled={actionLoading}
                          className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white py-2.5 px-6 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          <Save size={15} />
                          Save CO-PO Allocation Matrix
                        </button>
                      </div>

                      {/* Program Outcomes (POs) Reference & Details Section */}
                      <div className="pt-6 border-t border-gray-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                              <BookOpen size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                Program Outcomes (POs) Details & Reference
                              </h4>
                              <p className="text-xs text-gray-500 font-medium">
                                Quick description guide for mapping COs to POs
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                            {displayPOs.length} POs Available
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                          {displayPOs.map((po) => (
                            <div
                              key={po._id || po.code}
                              className="p-3 bg-gradient-to-br from-slate-50 to-indigo-50/20 hover:to-indigo-50/40 border border-gray-200 hover:border-indigo-300 rounded-xl transition-all shadow-xs group flex items-start gap-2.5"
                            >
                              <span className="bg-indigo-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shrink-0 shadow-2xs group-hover:bg-indigo-700 transition-colors">
                                {po.code}
                              </span>
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-gray-800 group-hover:text-indigo-950 leading-snug">
                                  {po.description || `Program Outcome ${po.code}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === "programOutcomes" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Create PO Form */}
            <div className="lg:col-span-5 bg-white p-7 rounded-2xl shadow-sm border border-gray-200 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-150 pb-4">
                <div className="p-2.5 bg-indigo-100/80 text-indigo-800 rounded-xl">
                  <Layers size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    {editingProgramOutcomeId ? "Edit Program Outcome" : "Create Program Outcome"}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Define program outcome standards (PO1–PO12)</p>
                </div>
              </div>

              <form onSubmit={handleCreateProgramOutcome} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
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
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none text-xs font-extrabold bg-gray-50/30"
                    placeholder="e.g. PO1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
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
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none text-xs font-semibold bg-gray-50/30"
                    placeholder="e.g. Engineering Knowledge"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {editingProgramOutcomeId ? <Save size={15} /> : <Plus size={15} />}
                    {editingProgramOutcomeId ? "Update Program Outcome" : "Create Program Outcome"}
                  </button>
                  {editingProgramOutcomeId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProgramOutcomeId(null);
                        setProgramOutcomeForm({ code: "", description: "" });
                      }}
                      className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* PO List */}
            <div className="lg:col-span-7 bg-white p-7 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Program Outcomes (PO1–PO12) Directory
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Master list of degree program attainment metrics</p>
                </div>
                <span className="bg-indigo-50 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200">
                  {programOutcomes.length} POs Defined
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {programOutcomes.length === 0 ? (
                  <p className="text-gray-400 italic text-xs py-6 text-center">No Program Outcomes created yet.</p>
                ) : (
                  programOutcomes.map((po) => (
                    <div
                      key={po._id}
                      className="flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-xs transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="bg-indigo-100 text-indigo-900 font-black text-xs px-3 py-1.5 rounded-lg border border-indigo-200 min-w-[50px] text-center">
                          {po.code}
                        </span>
                        <p className="text-xs font-bold text-gray-800">
                          {po.description}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => startEditProgramOutcome(po)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-200"
                          title="Edit PO"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProgramOutcome(po._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                          title="Delete PO"
                        >
                          <Trash2 size={14} />
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
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
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

              {/* Sections for Selected Batch */}
              {selectedBatchId && (
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-150">
                  <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h3 className="font-bold text-gray-800 text-lg">
                      Sections ({sections.length})
                    </h3>
                  </div>

                  {/* Add Section inline form */}
                  <form onSubmit={handleCreateSection} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={sectionForm.sectionName}
                      onChange={(e) => setSectionForm({ sectionName: e.target.value })}
                      placeholder="e.g. A"
                      className="flex-1 border border-gray-300 px-3 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-[0.98]"
                    >
                      + Add
                    </button>
                  </form>

                  {/* Sections List */}
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {sectionsLoading ? (
                      <p className="text-gray-500 italic py-2 text-center text-sm">Loading sections...</p>
                    ) : sections.length === 0 ? (
                      <p className="text-gray-500 italic py-2 text-center text-sm">No sections created yet.</p>
                    ) : (
                      sections.map((section) => {
                        const isSelected = selectedSectionId === section._id;
                        return (
                          <div
                            key={section._id}
                            onClick={() => handleSelectSection(section._id)}
                            className={`flex items-center justify-between border rounded-xl p-2.5 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? "bg-purple-50 border-purple-300 text-purple-700 shadow-sm font-medium"
                                : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                            }`}
                          >
                            <span className="font-semibold text-sm">Section {section.sectionName}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSection(section._id);
                              }}
                              className="p-1 rounded-lg text-gray-400 hover:text-red-650 hover:bg-red-50 transition-colors"
                              title="Delete Section"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Student List & Add Student */}
            <div className="lg:col-span-2">
              {selectedBatchId && selectedSectionId ? (
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-150 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Manage Students
                    </h2>
                    <div className="flex gap-4 mt-1">
                      <p className="text-purple-600 font-semibold text-sm">
                        Batch: {batches.find((b) => b._id === selectedBatchId)?.name || "Loading..."}
                      </p>
                      <p className="text-indigo-600 font-semibold text-sm">
                        Section: {sections.find((s) => s._id === selectedSectionId)?.sectionName || ""}
                      </p>
                      <p className="text-indigo-600 font-semibold text-sm">
                        Total Students: {batchStudents.length}
                      </p>
                    </div>
                  </div>

                  {/* Add Student inline form */}
                  <form
                    onSubmit={handleAddStudentToBatch}
                    className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/60"
                  >
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm">Add Student to Section</h3>
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
                              No students registered in this section yet.
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
                                        title="Remove Student from Section"
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
              ) : selectedBatchId ? (
                <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl shadow-xl border border-gray-150 min-h-[300px]">
                  <Users className="text-gray-300 mb-4" size={48} />
                  <h3 className="text-lg font-bold text-gray-700">No Section Selected</h3>
                  <p className="text-gray-400 text-sm mt-1 max-w-sm">
                    Create and select a section under this batch in the left panel to manage its students.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl shadow-xl border border-gray-150 min-h-[300px]">
                  <Users className="text-gray-300 mb-4" size={48} />
                  <h3 className="text-lg font-bold text-gray-700">No Batch Selected</h3>
                  <p className="text-gray-400 text-sm mt-1 max-w-sm">
                    Select a batch from the list on the left to manage the registered sections and students.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "courseOfferings" && (
          <div className="space-y-8">
            {/* Create/Edit Course Offering Card */}
            <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-200 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-150 pb-4">
                <div className="p-2.5 bg-orange-100/80 text-orange-800 rounded-xl">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    {editingOfferingId ? "Edit Course Offering" : "Create Course Offering"}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Assign a master course to a batch, section, and instructor for a specific session</p>
                </div>
              </div>

              <form
                onSubmit={handleCreateOffering}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                    Master Course
                  </label>
                  <select
                    value={offeringForm.courseId}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        courseId: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 outline-none text-xs font-semibold bg-gray-50/30"
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.courseCode} — {course.courseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                    Batch
                  </label>
                  <select
                    value={offeringForm.batchId}
                    onChange={(e) => handleBatchChangeInOffering(e.target.value)}
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 outline-none text-xs font-semibold bg-gray-50/30"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                    Assigned Instructor
                  </label>
                  <select
                    value={offeringForm.teacherId}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        teacherId: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 outline-none text-xs font-semibold bg-gray-50/30"
                  >
                    <option value="">Select teacher</option>
                    {users
                      .filter((u) => u.role !== "admin")
                      .map((user) => (
                        <option key={user.id || user._id || user.email} value={user.id || user._id}>
                          {user.fullName} ({user.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                    Academic Session
                  </label>
                  <select
                    value={offeringForm.semesterId}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        semesterId: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 outline-none text-xs font-semibold bg-gray-50/30"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                    Section
                  </label>
                  <select
                    value={offeringForm.section}
                    onChange={(e) =>
                      setOfferingForm({
                        ...offeringForm,
                        section: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 outline-none text-xs font-semibold bg-white"
                    required
                  >
                    <option value="">Select section</option>
                    {offeringSections.map((sec) => (
                      <option key={sec._id} value={sec.sectionName}>
                        Section {sec.sectionName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
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
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 outline-none text-xs font-semibold bg-gray-50/30"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3 flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {editingOfferingId ? <Save size={15} /> : <Plus size={15} />}
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
                        setOfferingSections([]);
                      }}
                      className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Existing Course Offerings Directory */}
            <div className="bg-white p-7 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Active Course Offerings
                  </h2>
                  <p className="text-xs text-gray-500 font-medium font-semibold">Configured offerings for student enrollment and assessment</p>
                </div>
                <span className="bg-orange-50 text-orange-800 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
                  {offerings.length} Active Offerings
                </span>
              </div>

              {offeringsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-3">
                  {offerings.length === 0 ? (
                    <p className="text-gray-400 italic text-xs py-6 text-center">
                      No course offerings created yet.
                    </p>
                  ) : (
                    offerings.map((offering) => (
                      <div
                        key={offering._id}
                        className="p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-xs transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-gray-900 text-sm">
                              {offering.course?.courseCode}
                            </span>
                            <span className="text-xs font-semibold text-gray-700">
                              — {offering.course?.courseName}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-purple-100 text-purple-900 text-xs font-black px-3 py-1 rounded-lg border border-purple-200 shadow-2xs">
                              Batch: {offering.batch?.name || 'N/A'} • Sec {offering.section}
                            </span>
                            <span className="bg-blue-100 text-blue-900 text-xs font-black px-3 py-1 rounded-lg border border-blue-200 shadow-2xs">
                              Teacher: {offering.teacher?.fullName || "Unassigned"}
                            </span>
                            <span className="bg-emerald-100 text-emerald-900 text-xs font-black px-3 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                              {offering.semester?.semesterName || 'Session'} ({offering.academicYear})
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 self-end md:self-center">
                          <button
                            onClick={() => startEditOffering(offering)}
                            className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 transition"
                            title="Edit Offering"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteOffering(offering._id)}
                            className="p-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-200 transition"
                            title="Delete Offering"
                          >
                            <Trash2 size={14} />
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
