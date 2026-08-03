import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiService } from "../services/apiService";

const AuthContext = createContext(null);
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_SESSION_KEY = "obe-admin-session";
const AUTH_TOKEN_KEY = "obe-auth-token";

const DEFAULT_PROD_API_URL = "https://student-outcome-analyzer-api.onrender.com";

function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined" && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1")) {
    return DEFAULT_PROD_API_URL;
  }
  return "";
}

const API_BASE = getApiBaseUrl();

function parseErrorMessage(error, fallback) {
  if (error?.responseMessage) return error.responseMessage;
  if (error?.message) return error.message;
  return fallback;
}

function normalizeEmail(email = "") {
  return String(email)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setStoredToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

async function apiRequest(path, options = {}) {
  const { headers, ...rest } = options;
  const token = getStoredToken();
  const authHeaders = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { 
      "Content-Type": "application/json", 
      ...authHeaders,
      ...(headers || {}) 
    },
    ...rest,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Request failed.");
    error.responseMessage = data.message;
    throw error;
  }

  return data;
}

function getAdminHeaders() {
  return {
    "x-admin-email": ADMIN_EMAIL,
    "x-admin-password": ADMIN_PASSWORD,
  };
}

function isAdminSessionActive() {
  return localStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

function setAdminSession(active) {
  if (active) {
    localStorage.setItem(ADMIN_SESSION_KEY, "true");
  } else {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!message.text) return undefined;
    const timer = setTimeout(() => setMessage({ type: "", text: "" }), 2800);
    return () => clearTimeout(timer);
  }, [message]);

  const setSuccess = (text) => setMessage({ type: "success", text });
  const setError = (text) => setMessage({ type: "error", text });

  const loadAdminUsers = async () => {
    const data = await apiRequest("/api/auth/admin/users", {
      headers: getAdminHeaders(),
    });
    setUsers(data.users || []);
  };

  const refreshAuth = async () => {
    setAuthLoading(true);
    try {
      if (isAdminSessionActive()) {
        setUser({
          id: "admin-local",
          fullName: "System Admin",
          email: ADMIN_EMAIL,
          role: "admin",
        });
        await loadAdminUsers();
        return;
      }

      // Check if we have a stored token
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setUsers([]);
        return;
      }

      // Verify token is still valid by calling /me
      try {
        const me = await apiRequest("/api/auth/me");
        setUser(me.user || null);
        setUsers([]);
      } catch {
        // Token is invalid or expired, clear it
        setStoredToken(null);
        setUser(null);
        setUsers([]);
      }
    } catch {
      setUser(null);
      setUsers([]);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const [isEditingActive, setIsEditingActive] = useState(false);

  // Heartbeat & Idle Auto-Logout logic
  useEffect(() => {
    if (!user) return undefined;

    const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
    let idleTimer = null;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      // Disable auto-logout timer completely while user is actively editing marks or question paper
      if (isEditingActive) return;

      idleTimer = setTimeout(() => {
        logout();
        setError("You have been automatically logged out due to inactivity.");
      }, IDLE_TIMEOUT_MS);
    };

    resetIdleTimer();

    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleUserActivity = () => {
      resetIdleTimer();
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Heartbeat every 10s (if visible OR if active work is in progress)
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === "visible" || isEditingActive) {
        if (user.role !== "admin" && getStoredToken()) {
          apiRequest("/api/auth/heartbeat", { method: "POST" }).catch(() => {});
        }
      }
    }, 10000);

    // Initial heartbeat on mount
    if (user.role !== "admin" && getStoredToken()) {
      apiRequest("/api/auth/heartbeat", { method: "POST" }).catch(() => {});
    }

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      clearInterval(heartbeatInterval);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [user, isEditingActive]);

  const login = async (payload) => {
    setActionLoading(true);
    try {
      const normalizedEmail = normalizeEmail(payload.email);
      if (
        normalizedEmail === ADMIN_EMAIL &&
        payload.password === ADMIN_PASSWORD
      ) {
        setAdminSession(true);
        setStoredToken(null);
        setUser({
          id: "admin-local",
          fullName: "System Admin",
          email: ADMIN_EMAIL,
          role: "admin",
        });
        await loadAdminUsers();
        setSuccess("Admin login successful.");
        return;
      }
      setAdminSession(false);
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          password: payload.password,
        }),
      });

      // Store token from response for cross-domain auth
      if (data.token) {
        setStoredToken(data.token);
      }

      setUser(data.user || null);
      setUsers([]);
      setSuccess("Login successful.");
    } catch (error) {
      setError(parseErrorMessage(error, "Login failed."));
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const logout = async () => {
    setActionLoading(true);
    try {
      if (isAdminSessionActive()) {
        setAdminSession(false);
      } else {
        try {
          await apiRequest("/api/auth/logout", { method: "POST" });
        } catch {
          // Ignore logout API errors — we clear locally regardless
        }
      }
      setStoredToken(null);
      setUser(null);
      setUsers([]);
      apiService.clearCache();
      setSuccess("Logged out successfully.");
    } catch (error) {
      setError(parseErrorMessage(error, "Logout failed."));
    } finally {
      setActionLoading(false);
    }
  };

  const changePassword = async ({ oldPassword = "", newPassword = "" }) => {
    setActionLoading(true);
    try {
      const data = await apiRequest("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      setSuccess(data.message || "Password changed successfully.");
      return data;
    } catch (error) {
      setError(parseErrorMessage(error, "Password change failed."));
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const createUser = async ({ email = "", password = "", fullName = "" }) => {
    setActionLoading(true);
    try {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) throw new Error("Email is required.");
      
      const data = await apiRequest("/api/auth/admin/users", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: normalizedEmail,
          password,
        }),
      });
      
      setSuccess(data.message || "User created successfully.");
      
      try {
        await loadAdminUsers();
      } catch (loadError) {
        console.error("User created but failed to refresh list:", loadError);
      }
      
      return data.user;
    } catch (error) {
      setError(parseErrorMessage(error, "Failed to create user."));
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const adminResetPassword = async ({ email = "", newPassword = "" }) => {
    setActionLoading(true);
    try {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) throw new Error("Email is required.");
      const data = await apiRequest("/api/auth/admin/users/reset-password", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ email: normalizedEmail, newPassword }),
      });
      await loadAdminUsers();
      setSuccess(data.message || "User password updated successfully.");
      return data;
    } catch (error) {
      setError(parseErrorMessage(error, "Password reset failed."));
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    setActionLoading(true);
    try {
      const data = await apiRequest(`/api/auth/admin/users/${userId}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      await loadAdminUsers();
      setSuccess(data.message || "Teacher deleted successfully.");
      return data;
    } catch (error) {
      setError(parseErrorMessage(error, "Failed to delete teacher."));
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      users,
      authLoading,
      actionLoading,
      message,
      isEditingActive,
      setIsEditingActive,
      login,
      logout,
      changePassword,
      createUser,
      deleteUser,
      adminResetPassword,
      refreshAuth,
      loadAdminUsers,
      adminCredentials: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    }),
    [user, users, authLoading, actionLoading, message, isEditingActive],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
