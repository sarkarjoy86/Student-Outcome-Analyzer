import { useState, useEffect, lazy, Suspense } from "react";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./components/dashboard/Dashboard";
import StudentManagement from "./components/students/StudentManagement";
import COPOMapping from "./components/course/COPOMapping";
import AssessmentConfig from "./components/course/AssessmentConfig";
import ComprehensiveMarksEntry from "./components/marks/ComprehensiveMarksEntry";
import KPIConfig from "./components/course/KPIConfig";
import ComprehensiveReports from "./components/reports/ComprehensiveReports";
import Results from "./components/reports/Results";
import AuthCard from "./components/auth/AuthCard";
import ProfileAvatar from "./components/layout/ProfileAvatar";
import { useAuth } from "./context/AuthContext";
import { apiService } from "./services/apiService";

const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));
const TeacherDashboard = lazy(() => import("./components/dashboard/TeacherDashboard"));
const PublicSurveyForm = lazy(() => import("./components/survey/PublicSurveyForm"));


function App() {
  const { user, authLoading, message } = useAuth();
  
  // Intercept student feedback submission URLs
  const [feedbackEvaluationId, setFeedbackEvaluationId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const feedbackId = params.get("feedbackId") || params.get("evaluationId");
    if (feedbackId) return feedbackId;
    
    const pathParts = window.location.pathname.split('/');
    const feedbackIndex = pathParts.indexOf('feedback');
    if (feedbackIndex !== -1 && pathParts[feedbackIndex + 1]) {
      return pathParts[feedbackIndex + 1];
    }
    return null;
  });

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

  // Synchronize Browser History & Hardware Navigation (Mouse Back/Forward, Alt+Arrows, Backspace)
  useEffect(() => {
    if (authLoading || !user || user.role === "admin") return;

    // Ensure baseline history state is populated
    if (!window.history.state) {
      const params = new URLSearchParams(window.location.search);
      const urlOfferingId = params.get("offering");
      const urlTab = params.get("tab") || "overview";
      const urlPaper = params.get("paper");

      if (urlOfferingId && selectedOffering && (selectedOffering._id === urlOfferingId || selectedOffering.id === urlOfferingId)) {
        window.history.replaceState(
          {
            view: urlPaper ? "paper" : "offering",
            offeringId: urlOfferingId,
            tab: urlTab,
            paperId: urlPaper || null,
          },
          "",
          window.location.href
        );
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete("offering");
        url.searchParams.delete("tab");
        url.searchParams.delete("paper");
        window.history.replaceState({ view: "dashboard" }, "", url.toString());
      }
    }

    const handlePopState = (e) => {
      const state = e.state;
      const params = new URLSearchParams(window.location.search);
      const urlOfferingId = state?.offeringId || params.get("offering");

      if (!urlOfferingId || state?.view === "dashboard") {
        // Navigated back to offerings dashboard
        setSelectedOffering(null);
        localStorage.removeItem("selectedOffering");
        localStorage.removeItem("teacherActiveTab");
      } else if (urlOfferingId) {
        // Navigated forward/back to an offering
        if (!selectedOffering || (selectedOffering._id !== urlOfferingId && selectedOffering.id !== urlOfferingId)) {
          try {
            const saved = localStorage.getItem("selectedOffering");
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed._id === urlOfferingId || parsed.id === urlOfferingId) {
                setSelectedOffering(parsed);
              }
            }
          } catch (err) {}
        }
      }
    };

    // Hardware Mouse Button 3 (Back) & 4 (Forward) support
    const handleMouseUp = (e) => {
      if (e.button === 3) {
        // Mouse Back button
        e.preventDefault();
        window.history.back();
      } else if (e.button === 4) {
        // Mouse Forward button
        e.preventDefault();
        window.history.forward();
      }
    };

    // Keyboard Backspace outside text inputs
    const handleKeyDown = (e) => {
      if (e.key === "Backspace") {
        const active = document.activeElement;
        const isEditable = active && (
          active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable ||
          active.closest?.('[contenteditable="true"]') ||
          active.closest?.('.e-rte-content')
        );
        if (!isEditable) {
          e.preventDefault();
          window.history.back();
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [authLoading, user, selectedOffering]);

  // Load all data for selected course offering
  const handleSelectOffering = (offering, pushHistory = true) => {
    setSelectedOffering(offering);
    if (offering) {
      localStorage.setItem("selectedOffering", JSON.stringify(offering));
      if (pushHistory) {
        const url = new URL(window.location.href);
        url.searchParams.set("offering", offering._id);
        const currentTab = localStorage.getItem("teacherActiveTab") || "overview";
        url.searchParams.set("tab", currentTab);
        url.searchParams.delete("paper");
        window.history.pushState(
          {
            view: "offering",
            offeringId: offering._id,
            tab: currentTab,
            paperId: null,
          },
          "",
          url.toString()
        );
      }
    } else {
      localStorage.removeItem("selectedOffering");
      localStorage.removeItem("teacherActiveTab");
      if (pushHistory) {
        const url = new URL(window.location.href);
        url.searchParams.delete("offering");
        url.searchParams.delete("tab");
        url.searchParams.delete("paper");
        window.history.pushState({ view: "dashboard" }, "", url.toString());
      }
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
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
              <p className="text-gray-600 font-bold text-base">Loading Course Dashboard...</p>
            </div>
          }>
            <TeacherDashboard
              offering={selectedOffering}
              onBackToDashboard={() => handleSelectOffering(null)}
              user={user}
            />
          </Suspense>
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

  if (feedbackEvaluationId) {
    return (
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      }>
        <PublicSurveyForm
          evaluationId={feedbackEvaluationId}
          user={user}
          onBackToHome={() => {
            const url = new URL(window.location.origin + window.location.pathname);
            window.history.replaceState({}, '', url.toString());
            setFeedbackEvaluationId(null);
          }}
        />
      </Suspense>
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
    return (
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }>
        <AdminDashboard />
      </Suspense>
    );
  }

  return renderDashboard();
}

export default App;
