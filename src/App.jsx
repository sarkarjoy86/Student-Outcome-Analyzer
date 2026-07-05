import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import StudentManagement from "./components/StudentManagement";
import COPOMapping from "./components/COPOMapping";
import AssessmentConfig from "./components/AssessmentConfig";
import ComprehensiveMarksEntry from "./components/ComprehensiveMarksEntry";
import KPIConfig from "./components/KPIConfig";
import ComprehensiveReports from "./components/ComprehensiveReports";
import Results from "./components/Results";
import AuthCard from "./components/auth/AuthCard";
import ProfileAvatar from "./components/ProfileAvatar";
import AdminDashboard from "./components/admin/AdminDashboard";
import { useAuth } from "./context/AuthContext";
import { apiService } from "./services/apiService";
import TeacherDashboard from "./components/TeacherDashboard";

function App() {
  const { user, authLoading, message } = useAuth();
  const [selectedOffering, setSelectedOffering] = useState(() => {
    try {
      const saved = localStorage.getItem("selectedOffering");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [currentStep, setCurrentStep] = useState("students");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      localStorage.removeItem("selectedOffering");
      localStorage.removeItem("teacherActiveTab");
      localStorage.removeItem("adminActiveTab");
    } else if (selectedOffering) {
      if (user.role === "admin") {
        setSelectedOffering(null);
        localStorage.removeItem("selectedOffering");
      } else {
        const userId = user.id || user._id;
        const teacherId = selectedOffering.teacher?._id || selectedOffering.teacher;
        if (teacherId && userId && teacherId !== userId) {
          setSelectedOffering(null);
          localStorage.removeItem("selectedOffering");
        }
      }
    }
  }, [user, authLoading, selectedOffering]);

  // Offering active state loaded from database
  const [students, setStudents] = useState([]);
  const [courseInfo, setCourseInfo] = useState(null);
  const [coMapping, setCoMapping] = useState(null);
  const [assessments, setAssessments] = useState(null);
  const [marksData, setMarksData] = useState({});
  const [kpiConfig, setKpiConfig] = useState({
    targetPassMarks: 40,
    kpiCO: 50,
    kpiPO: 50,
  });

  // Load all data for selected course offering
  const handleSelectOffering = (offering) => {
    setSelectedOffering(offering);
    if (offering) {
      localStorage.setItem("selectedOffering", JSON.stringify(offering));
    } else {
      localStorage.removeItem("selectedOffering");
    }
  };

  const handleStudentsComplete = async () => {
    // Refresh student list and go to co-po mapping
    if (selectedOffering) {
      const data = await apiService.getEnrolledStudents(selectedOffering._id);
      setStudents(data.students || []);
    }
    setCurrentStep("coMapping");
  };

  const handleCoMappingComplete = async (mapping) => {
    try {
      await apiService.updateCoPoMapping(selectedOffering._id, mapping);
      setCoMapping(mapping);
      setCurrentStep("assessmentSetup");
    } catch (err) {
      alert("Failed to save CO-PO Mapping: " + err.message);
    }
  };

  const handleAssessmentSetupComplete = async (updatedAssessments) => {
    try {
      const data = await apiService.saveAssessments(
        selectedOffering._id,
        updatedAssessments,
      );
      setAssessments(data.assessments);
      setCurrentStep("marksEntry");
    } catch (err) {
      alert("Failed to save assessment configuration: " + err.message);
    }
  };

  const handleMarksComplete = async (updatedMarks) => {
    try {
      // Validate marks structure
      if (!updatedMarks || typeof updatedMarks !== "object") {
        throw new Error("Marks data is invalid.");
      }

      const studentIds = Object.keys(updatedMarks);
      if (studentIds.length === 0) {
        throw new Error("No student marks data provided.");
      }

      let totalMarkEntries = 0;
      for (const marks of Object.values(updatedMarks)) {
        if (marks && typeof marks === "object") {
          totalMarkEntries += Object.keys(marks).length;
        }
      }

      if (totalMarkEntries === 0) {
        throw new Error(
          "No marks have been entered. Please enter at least some marks before saving.",
        );
      }

      console.log("Saving marks:", {
        students: studentIds.length,
        totalMarkEntries,
        sample: updatedMarks[studentIds[0]],
      });

      await apiService.saveMarks(selectedOffering._id, updatedMarks);
      setMarksData(updatedMarks);
      setCurrentStep("kpi");
    } catch (err) {
      console.error("Marks save error:", err);
      alert("Failed to save marks: " + err.message);
    }
  };

  const handleKpiComplete = async (config) => {
    try {
      await apiService.updateKpiConfig(selectedOffering._id, config);
      setKpiConfig(config);
      setCurrentStep("reports");
    } catch (err) {
      alert("Failed to save KPI config: " + err.message);
    }
  };

  const renderActiveStep = () => {
    switch (currentStep) {
      case "students":
        return (
          <StudentManagement
            offering={selectedOffering}
            onComplete={handleStudentsComplete}
          />
        );
      case "coMapping":
        return (
          <COPOMapping
            onComplete={handleCoMappingComplete}
            existingMapping={coMapping}
          />
        );
      case "assessmentSetup":
        return (
          <AssessmentConfig
            onComplete={handleAssessmentSetupComplete}
            existingConfig={assessments}
          />
        );
      case "marksEntry":
        return (
          <ComprehensiveMarksEntry
            students={students}
            assessments={assessments}
            existingMarks={marksData}
            onBack={() => setCurrentStep("assessmentSetup")}
            onComplete={handleMarksComplete}
          />
        );
      case "kpi":
        return (
          <KPIConfig
            onComplete={handleKpiComplete}
            existingConfig={kpiConfig}
          />
        );
      case "reports":
        return (
          <ComprehensiveReports
            students={students}
            marks={marksData}
            assessments={assessments}
            coMapping={coMapping}
            courseInfo={courseInfo}
            targetPassMarks={kpiConfig.targetPassMarks}
            kpiCO={kpiConfig.kpiCO}
            kpiPO={kpiConfig.kpiPO}
          />
        );
      case "allDetails":
        return (
          <ComprehensiveReports
            students={students}
            marks={marksData}
            assessments={assessments}
            coMapping={coMapping}
            courseInfo={courseInfo}
            targetPassMarks={kpiConfig.targetPassMarks}
            kpiCO={kpiConfig.kpiCO}
            kpiPO={kpiConfig.kpiPO}
            initialViewMode="allDetails"
          />
        );
      case "results":
        return (
          <Results
            students={students}
            marks={marksData}
            assessments={assessments}
            courseInfo={courseInfo}
          />
        );
      default:
        return <div>Invalid Step</div>;
    }
  };

  const renderDashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-100">
      <ProfileAvatar />
      {selectedOffering ? (
        <main className="p-8">
          <TeacherDashboard
            offering={selectedOffering}
            onBackToDashboard={() => {
              setSelectedOffering(null);
              localStorage.removeItem("selectedOffering");
              localStorage.removeItem("teacherActiveTab");
            }}
            user={user}
          />
        </main>
      ) : (
        <Dashboard onSelectOffering={handleSelectOffering} />
      )}
    </div>
  );

  if (authLoading) {
    return (
      <div className="animated-bg flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-300 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-page-wrapper">
        <AuthCard />
        {message.text ? (
          <div
            className={`absolute bottom-6 rounded-lg px-4 py-2 text-sm ${
              message.type === "error"
                ? "bg-red-500/20 text-red-100"
                : "bg-emerald-500/20 text-emerald-100"
            }`}
          >
            {message.text}
          </div>
        ) : null}
      </div>
    );
  }

  if (user.role === "admin") {
    return <AdminDashboard />;
  }

  return renderDashboard();
}

export default App;
