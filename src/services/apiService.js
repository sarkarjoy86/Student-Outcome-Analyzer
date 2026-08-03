const DEFAULT_PROD_API_URL = "https://student-outcome-analyzer-api.onrender.com";

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined" && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1")) {
    return DEFAULT_PROD_API_URL;
  }
  return "";
}

const API_BASE = getApiBaseUrl();
const ADMIN_SESSION_KEY = "obe-admin-session";
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Admin@123";

function getAdminHeaders() {
  if (localStorage.getItem(ADMIN_SESSION_KEY) === "true") {
    return {
      "x-admin-email": ADMIN_EMAIL,
      "x-admin-password": ADMIN_PASSWORD,
    };
  }
  return {};
}

function getHeaders() {
  const token = localStorage.getItem("obe-auth-token");
  const headers = {
    "Content-Type": "application/json",
    ...getAdminHeaders(),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Session-level API Cache (lasts until logout, mutations, or tab/browser close)
const sessionCache = new Map();

function getSessionCachedItem(key) {
  if (sessionCache.has(key)) return sessionCache.get(key);
  try {
    const stored = sessionStorage.getItem(`obe_cache_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      sessionCache.set(key, parsed);
      return parsed;
    }
  } catch (e) {}
  return null;
}

function setSessionCachedItem(key, value) {
  sessionCache.set(key, value);
  try {
    sessionStorage.setItem(`obe_cache_${key}`, JSON.stringify(value));
  } catch (e) {}
}

export function clearApiCache() {
  sessionCache.clear();
  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("obe_cache_")) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {}
}

function getDefaultOptions() {
  return {
    headers: getHeaders(),
    credentials: "include",
  };
}

async function fetchWithDefaults(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  // Return cached GET response if available and not explicitly skipped
  if (method === "GET" && !options.skipCache) {
    const cachedData = getSessionCachedItem(url);
    if (cachedData) {
      return {
        ok: true,
        _isCached: true,
        json: async () => JSON.parse(JSON.stringify(cachedData)),
      };
    }
  }

  const defaultOptions = getDefaultOptions();
  const res = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  });

  if (method !== "GET") {
    // Invalidate cache on write operations (POST, PUT, DELETE, PATCH)
    clearApiCache();
  } else {
    res._cachedUrl = url;
  }

  return res;
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "API request failed.");
    error.response = data;
    throw error;
  }
  if (response._cachedUrl && !response._isCached) {
    setSessionCachedItem(response._cachedUrl, data);
  }
  return data;
}

export const apiService = {
  clearCache: clearApiCache,
  // Academic Sessions
  async getSessions() {
    const res = await fetchWithDefaults(`${API_BASE}/api/sessions`);
    return handleResponse(res);
  },

  async createSession(payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/sessions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateSession(sessionId, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Courses
  async getCourses() {
    const res = await fetchWithDefaults(`${API_BASE}/api/courses`);
    return handleResponse(res);
  },

  async createCourse(payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/courses`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateCourse(courseId, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/courses/${courseId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteCourse(courseId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/courses/${courseId}`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },

  async getCourseOutcomes(courseId) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/courses/${courseId}/co`,
    );
    return handleResponse(res);
  },

  async createCourseOutcome(courseId, payload) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/courses/${courseId}/co`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return handleResponse(res);
  },

  async updateCourseOutcome(courseId, outcomeId, payload) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/courses/${courseId}/co/${outcomeId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
    return handleResponse(res);
  },

  async deleteCourseOutcome(courseId, outcomeId) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/courses/${courseId}/co/${outcomeId}`,
      {
        method: "DELETE",
      },
    );
    return handleResponse(res);
  },

  async getProgramOutcomes() {
    const res = await fetchWithDefaults(`${API_BASE}/api/program-outcomes`);
    return handleResponse(res);
  },

  async createProgramOutcome(payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/program-outcomes`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateProgramOutcome(programOutcomeId, payload) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/program-outcomes/${programOutcomeId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
    return handleResponse(res);
  },

  async deleteProgramOutcome(programOutcomeId) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/program-outcomes/${programOutcomeId}`,
      {
        method: "DELETE",
      },
    );
    return handleResponse(res);
  },

  async getCourseCoPoMapping(courseId) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/courses/${courseId}/co-po-mapping`,
    );
    return handleResponse(res);
  },

  async updateCourseCoPoMapping(courseId, coPoMapping) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/courses/${courseId}/co-po-mapping`,
      {
        method: "PUT",
        body: JSON.stringify({ coPoMapping }),
      },
    );
    return handleResponse(res);
  },

  async getBatches() {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches`);
    return handleResponse(res);
  },

  async createBatch(payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateBatch(batchId, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches/${batchId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteBatch(batchId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches/${batchId}`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },

  async getBatchStudents(batchId) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/batches/${batchId}/students`,
    );
    return handleResponse(res);
  },

  async addBatchStudent(batchId, payload) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/batches/${batchId}/students`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return handleResponse(res);
  },

  async updateBatchStudent(batchId, studentId, payload) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/batches/${batchId}/students/${studentId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
    return handleResponse(res);
  },

  async deleteBatchStudent(batchId, studentId) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/batches/${batchId}/students/${studentId}`,
      {
        method: "DELETE",
      },
    );
    return handleResponse(res);
  },

  // Course Offerings
  async getCourseOfferings() {
    const res = await fetchWithDefaults(`${API_BASE}/api/course-offerings`);
    return handleResponse(res);
  },

  async getCourseOffering(id) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${id}`,
    );
    return handleResponse(res);
  },

  async createCourseOffering(payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/course-offerings`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateCourseOffering(id, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/course-offerings/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteCourseOffering(id) {
    const res = await fetchWithDefaults(`${API_BASE}/api/course-offerings/${id}`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },

  async updateCoPoMapping(offeringId, coPoMapping) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${offeringId}/copomapping`,
      {
        method: "PUT",
        body: JSON.stringify({ coPoMapping }),
      },
    );
    return handleResponse(res);
  },

  async updateKpiConfig(offeringId, kpiConfig) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${offeringId}/kpi`,
      {
        method: "PUT",
        body: JSON.stringify(kpiConfig),
      },
    );
    return handleResponse(res);
  },

  // Students & Enrollments
  async getEnrolledStudents(offeringId) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${offeringId}/students`,
    );
    return handleResponse(res);
  },

  async addStudent(offeringId, studentData) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${offeringId}/students`,
      {
        method: "POST",
        body: JSON.stringify(studentData),
      },
    );
    return handleResponse(res);
  },

  async importStudents(offeringId, students) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${offeringId}/students/import`,
      {
        method: "POST",
        body: JSON.stringify({ students }),
      },
    );
    return handleResponse(res);
  },

  // Assessments
  async getAssessments(offeringId) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${offeringId}/assessments`,
    );
    return handleResponse(res);
  },

  async saveAssessments(offeringId, assessments) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${offeringId}/assessments`,
      {
        method: "POST",
        body: JSON.stringify({ assessments }),
      },
    );
    return handleResponse(res);
  },

  // Marks
  async getMarks(offeringId) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${offeringId}/marks`,
    );
    return handleResponse(res);
  },

  async saveMarks(offeringId, marks) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${offeringId}/marks`,
      {
        method: "POST",
        body: JSON.stringify({ marks }),
      },
    );
    return handleResponse(res);
  },

  // Report Data
  async getReportData(offeringId) {
    const res = await fetchWithDefaults(
      `${API_BASE}/api/course-offerings/${offeringId}/report-data`,
    );
    return handleResponse(res);
  },

  // Teacher Module Specific Endpoints
  async getTeacherCourseOfferings() {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/course-offerings`);
    return handleResponse(res);
  },

  async getTeacherStudents(offeringId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/course-offerings/${offeringId}/students`);
    return handleResponse(res);
  },

  async createAssessment(offeringId, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/course-offerings/${offeringId}/assessments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateAssessment(id, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/assessments/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteAssessment(id) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/assessments/${id}`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },

  async getQuestionPaper(assessmentId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/assessments/${assessmentId}/question-paper`);
    return handleResponse(res);
  },

  async saveQuestionPaper(assessmentId, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/assessments/${assessmentId}/question-paper`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getQuestionBank(courseId) {
    const url = courseId
      ? `${API_BASE}/api/teacher/question-bank?courseId=${courseId}`
      : `${API_BASE}/api/teacher/question-bank`;
    const res = await fetchWithDefaults(url);
    return handleResponse(res);
  },

  async duplicateQuestionPaper(id, targetCourseOfferingId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/question-bank/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ targetCourseOfferingId }),
    });
    return handleResponse(res);
  },

  async getMarksSpreadsheet(offeringId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/course-offerings/${offeringId}/marks-spreadsheet`);
    return handleResponse(res);
  },

  async getCombinedBatchSpreadsheet(offeringId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/course-offerings/${offeringId}/combined-batch-spreadsheet`);
    return handleResponse(res);
  },

  async saveMarksSpreadsheet(offeringId, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/course-offerings/${offeringId}/marks-spreadsheet`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getAttainmentData(offeringId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/course-offerings/${offeringId}/attainment-data`);
    return handleResponse(res);
  },

  async getSections(batchId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches/${batchId}/sections`);
    return handleResponse(res);
  },

  async createSection(batchId, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches/${batchId}/sections`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteSection(batchId, sectionId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches/${batchId}/sections/${sectionId}`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },

  async getSectionStudents(batchId, sectionId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches/${batchId}/sections/${sectionId}/students`);
    return handleResponse(res);
  },

  async addSectionStudent(batchId, sectionId, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches/${batchId}/sections/${sectionId}/students`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateSectionStudent(batchId, sectionId, studentId, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches/${batchId}/sections/${sectionId}/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteSectionStudent(batchId, sectionId, studentId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/batches/${batchId}/sections/${sectionId}/students/${studentId}`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },

  // Student Course Survey Endpoints
  async getSurveys(offeringId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/surveys/offering/${offeringId}`);
    return handleResponse(res);
  },

  async createSurvey(payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/surveys`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateSurvey(id, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/surveys/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteSurvey(id) {
    const res = await fetchWithDefaults(`${API_BASE}/api/surveys/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },

  async publishSurvey(id) {
    const res = await fetchWithDefaults(`${API_BASE}/api/surveys/${encodeURIComponent(id)}/publish`, {
      method: "POST",
    });
    return handleResponse(res);
  },

  async resetSurveyDefaults(id) {
    const res = await fetchWithDefaults(`${API_BASE}/api/surveys/${encodeURIComponent(id)}/reset-defaults`, {
      method: "POST",
    });
    return handleResponse(res);
  },

  async getPublicSurvey(id) {
    const res = await fetchWithDefaults(`${API_BASE}/api/public/surveys/${encodeURIComponent(id)}`);
    return handleResponse(res);
  },

  async verifyStudent(id, studentId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/public/surveys/${encodeURIComponent(id)}/verify-student`, {
      method: "POST",
      body: JSON.stringify({ studentId }),
    });
    return handleResponse(res);
  },

  async submitSurveyResponse(id, payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/public/surveys/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getSurveyAnalytics(id) {
    const res = await fetchWithDefaults(`${API_BASE}/api/surveys/${encodeURIComponent(id)}/analytics`);
    return handleResponse(res);
  },

  async getRecentActivities(offeringId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/course-offerings/${offeringId}/activities`);
    return handleResponse(res);
  },

  async resetRecentActivities(offeringId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/teacher/course-offerings/${offeringId}/activities`, {
      method: "DELETE"
    });
    return handleResponse(res);
  },

  // PO Recommendation Matrix API
  async getPORecommendationStudents(threshold = 60, offeringId = "", teacherId = "", refresh = false) {
    let url = `${API_BASE}/api/po-recommendation/students?threshold=${threshold}${refresh ? '&refresh=true' : ''}`;
    if (offeringId) url += `&offeringId=${encodeURIComponent(offeringId)}`;
    if (teacherId) url += `&teacherId=${encodeURIComponent(teacherId)}`;
    const res = await fetchWithDefaults(url);
    return handleResponse(res);
  },

  async getStudentPORecommendation(studentId, threshold = 60) {
    const res = await fetchWithDefaults(`${API_BASE}/api/po-recommendation/student/${encodeURIComponent(studentId)}?threshold=${threshold}&recalculate=true`);
    return handleResponse(res);
  },

  async savePORecommendation(payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/po-recommendation/save`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async syncAllPORecommendations(threshold = 60) {
    const res = await fetchWithDefaults(`${API_BASE}/api/po-recommendation/sync-all`, {
      method: "POST",
      body: JSON.stringify({ threshold }),
    });
    return handleResponse(res);
  },

  // =============================================
  // CO-PO Request/Approval Workflow
  // =============================================

  async submitCOPORequest(payload) {
    const res = await fetchWithDefaults(`${API_BASE}/api/copo-requests`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getMyCOPORequests(courseId) {
    let url = `${API_BASE}/api/copo-requests/my`;
    if (courseId) url += `?courseId=${encodeURIComponent(courseId)}`;
    const res = await fetchWithDefaults(url);
    return handleResponse(res);
  },

  async getAllCOPORequests(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.courseId) params.append("courseId", filters.courseId);
    const qs = params.toString();
    const res = await fetchWithDefaults(`${API_BASE}/api/copo-requests${qs ? `?${qs}` : ""}`);
    return handleResponse(res);
  },

  async getCOPORequestCount() {
    const res = await fetchWithDefaults(`${API_BASE}/api/copo-requests/count`);
    return handleResponse(res);
  },

  async updateCOPORequestStatus(requestId, status, adminNote = "") {
    const res = await fetchWithDefaults(`${API_BASE}/api/copo-requests/${requestId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, adminNote }),
    });
    return handleResponse(res);
  },

  async dismissCOPORequest(requestId) {
    const res = await fetchWithDefaults(`${API_BASE}/api/copo-requests/${requestId}/dismiss`, {
      method: "PUT",
    });
    return handleResponse(res);
  },

  async getCOPORequestHistory(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.courseId) params.append("courseId", filters.courseId);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.limit) params.append("limit", filters.limit);
    const qs = params.toString();
    const res = await fetchWithDefaults(`${API_BASE}/api/copo-requests/history${qs ? `?${qs}` : ""}`);
    return handleResponse(res);
  },
};
