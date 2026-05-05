import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { connectDB } from "../lib/db.js";
import {
  clearAuthCookie,
  setAuthCookie,
  signAuthToken,
  getTokenFromRequest,
  verifyAuthToken,
} from "../utils/auth.js";

const router = express.Router();

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Admin@123";

function isAdminCredentials(email = "", password = "") {
  return (
    email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD
  );
}

function normalizeEmail(email = "") {
  return String(email)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function isValidEmailFormat(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function requireAdminRequest(req, res) {
  const email = req.headers["x-admin-email"];
  const password = req.headers["x-admin-password"];
  if (!isAdminCredentials(email, password)) {
    res.status(403).json({ message: "Admin credentials are required." });
    return false;
  }
  return true;
}

async function ensureDatabase(res) {
  try {
    await connectDB();
    return true;
  } catch {
    res.status(503).json({
      message:
        "Database is currently unavailable. Check MongoDB Atlas network access/whitelist and try again.",
    });
    return false;
  }
}

router.post("/signup", async (req, res) => {
  const dbReady = await ensureDatabase(res);
  if (!dbReady) return;

  try {
    const {
      fullName = "",
      email = "",
      password = "",
      confirmPassword = "",
    } = req.body || {};

    if (!fullName.trim())
      return res.status(400).json({ message: "Full name is required." });
    if (!normalizeEmail(email))
      return res.status(400).json({ message: "Email is required." });
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password and confirm password do not match." });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      hashedPassword,
    });

    const token = signAuthToken({ userId: createdUser._id.toString() });
    setAuthCookie(res, token);

    return res.status(201).json({
      message: "Sign up successful.",
      token,
      user: {
        id: createdUser._id,
        fullName: createdUser.fullName,
        email: createdUser.email,
        createdAt: createdUser.createdAt,
      },
    });
  } catch {
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  const dbReady = await ensureDatabase(res);
  if (!dbReady) return;

  try {
    const { email = "", password = "" } = req.body || {};

    if (!normalizeEmail(email))
      return res.status(400).json({ message: "Email is required." });
    if (!password)
      return res.status(400).json({ message: "Password is required." });

    const normalizedEmail = normalizeEmail(email);
    if (isAdminCredentials(normalizedEmail, password)) {
      clearAuthCookie(res);
      return res.status(200).json({
        message: "Admin login successful.",
        token: null,
        user: {
          id: "admin-local",
          fullName: "System Admin",
          email: ADMIN_EMAIL,
          role: "admin",
          createdAt: null,
          isLoggedIn: true,
          lastLoginAt: new Date(),
        },
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const passwordMatches = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatches)
      return res.status(401).json({ message: "Invalid credentials." });

    user.isLoggedIn = true;
    user.lastLoginAt = new Date();
    await user.save();

    const token = signAuthToken({ userId: user._id.toString() });
    setAuthCookie(res, token);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isLoggedIn: user.isLoggedIn,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  } catch {
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  const dbReady = await ensureDatabase(res);
  if (!dbReady) return;
  try {
    await User.findByIdAndUpdate(req.user._id, { isLoggedIn: false });
    clearAuthCookie(res);
    return res.status(200).json({ message: "Logged out successfully." });
  } catch {
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.get("/status", (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(200).json({ authenticated: false });

    verifyAuthToken(token);
    return res.status(200).json({ authenticated: true });
  } catch {
    return res.status(200).json({ authenticated: false });
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role || "user",
      isLoggedIn: req.user.isLoggedIn || false,
      lastLoginAt: req.user.lastLoginAt || null,
      createdAt: req.user.createdAt,
    },
  });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const dbReady = await ensureDatabase(res);
  if (!dbReady) return;

  try {
    const { oldPassword = "", newPassword = "" } = req.body || {};

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required." });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const oldPasswordMatches = await bcrypt.compare(
      oldPassword,
      user.hashedPassword,
    );
    if (!oldPasswordMatches) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.hashedPassword = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch {
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.get("/admin/users", async (req, res) => {
  const dbReady = await ensureDatabase(res);
  if (!dbReady) return;
  if (!requireAdminRequest(req, res)) return;
  try {
    const users = await User.find({})
      .select("_id fullName email role isLoggedIn lastLoginAt createdAt")
      .sort({ createdAt: -1 });
    console.log("Fetched users count:", users.length);
    return res.status(200).json({
      users: users.map((item) => ({
        id: item._id,
        fullName: item.fullName,
        email: item.email,
        role: item.role || "user",
        isLoggedIn: item.isLoggedIn || false,
        lastLoginAt: item.lastLoginAt || null,
        createdAt: item.createdAt,
      })),
    });
  } catch {
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

router.post("/admin/users", async (req, res) => {
  const dbReady = await ensureDatabase(res);
  if (!dbReady) return;
  if (!requireAdminRequest(req, res)) return;
  
  try {
    const { fullName = "", email = "", password = "" } = req.body || {};
    
    if (!fullName.trim()) {
      return res.status(400).json({ message: "Full name is required." });
    }
    
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required." });
    }
    
    if (!isValidEmailFormat(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address format." });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }
    
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered." });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      hashedPassword,
    });
    
    return res.status(201).json({
      message: "User created successfully.",
      user: {
        id: createdUser._id,
        fullName: createdUser.fullName,
        email: createdUser.email,
        createdAt: createdUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in admin create user:", error);
    return res.status(500).json({ message: "Internal server error. Please try again later." });
  }
});

router.post("/admin/users/reset-password", async (req, res) => {
  const dbReady = await ensureDatabase(res);
  if (!dbReady) return;
  if (!requireAdminRequest(req, res)) return;
  try {
    const { email = "", newPassword = "" } = req.body || {};
    if (!normalizeEmail(email))
      return res.status(400).json({ message: "Email is required." });
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }
    const normalizedEmail = normalizeEmail(email);
    const targetUser = await User.findOne({ email: normalizedEmail });
    if (!targetUser)
      return res.status(404).json({ message: "User not found." });
    targetUser.hashedPassword = await bcrypt.hash(newPassword, 10);
    await targetUser.save();
    return res
      .status(200)
      .json({ message: "User password updated successfully." });
  } catch {
    return res.status(500).json({ message: "Server error. Please try again." });
  }
});

export default router;
