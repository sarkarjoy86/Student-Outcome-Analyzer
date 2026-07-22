import express from "express";
import { requireAuth } from "../middleware/auth.js";
import AcademicSession from "../models/AcademicSession.js";
import Course from "../models/Course.js";
import CourseOutcome from "../models/CourseOutcome.js";
import ProgramOutcome from "../models/ProgramOutcome.js";
import Batch from "../models/Batch.js";
import Section from "../models/Section.js";
import CourseOffering from "../models/CourseOffering.js";
import Student from "../models/Student.js";
import Enrollment from "../models/Enrollment.js";
import Assessment from "../models/Assessment.js";
import User from "../models/User.js";
import StudentMarks from "../models/StudentMarks.js";
import QuestionMetadata from "../models/QuestionMetadata.js";
import COAttainment from "../models/COAttainment.js";
import POAttainment from "../models/POAttainment.js";
import { syncAllStudentsLongitudinalPO } from "./poRecommendationRoutes.js";
import { logActivity } from "../utils/activityLogger.js";

const router = express.Router();

// ==========================================
// ACADEMIC SESSION ROUTES
// ==========================================

// Get all academic sessions
router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const sessions = await AcademicSession.find().sort({
      academicYear: -1,
      semesterName: 1,
    });
    res.status(200).json({ sessions });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching sessions", error: error.message });
  }
});

// Create academic session
router.post("/sessions", requireAuth, async (req, res) => {
  try {
    const { semesterName, academicYear, status = "active" } = req.body;
    if (!semesterName || !academicYear) {
      return res
        .status(400)
        .json({ message: "Semester name and Academic Year are required." });
    }

    const session = await AcademicSession.create({
      semesterName: semesterName.trim(),
      academicYear: parseInt(academicYear),
      status,
    });

    res
      .status(201)
      .json({ message: "Academic session created successfully.", session });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating session", error: error.message });
  }
});

// Update academic session
router.put("/sessions/:id", requireAuth, async (req, res) => {
  try {
    const { semesterName, academicYear, status } = req.body;
    const updateData = {};
    if (semesterName !== undefined) updateData.semesterName = semesterName.trim();
    if (academicYear !== undefined) updateData.academicYear = parseInt(academicYear);
    if (status !== undefined) updateData.status = status;

    const session = await AcademicSession.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after' }
    );

    if (!session) {
      return res.status(404).json({ message: "Academic session not found." });
    }

    res.status(200).json({ message: "Academic session updated successfully.", session });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating session", error: error.message });
  }
});

// ==========================================
// COURSE ROUTES
// ==========================================

// Get all courses
router.get("/courses", requireAuth, async (req, res) => {
  try {
    const courses = await Course.find().sort({ courseCode: 1 });
    res.status(200).json({ courses });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching courses", error: error.message });
  }
});

// Create course
router.post("/courses", requireAuth, async (req, res) => {
  try {
    const {
      courseCode,
      courseName,
      creditHours = 3,
      department,
      numCOs = 4,
      level = "1",
      term = "I",
    } = req.body;
    if (!courseCode || !courseName || !department) {
      return res.status(400).json({
        message: "Course Code, Course Name, and Department are required.",
      });
    }

    const cleanCode = courseCode.trim().toUpperCase();
    let course = await Course.findOne({ courseCode: cleanCode });
    if (course) {
      return res
        .status(200)
        .json({ message: "Course already exists.", course });
    }

    course = await Course.create({
      courseCode: cleanCode,
      courseName: courseName.trim(),
      creditHours: parseFloat(creditHours),
      department: department.trim(),
      numCOs: parseInt(numCOs),
      level: String(level || "1").trim(),
      term: String(term || "I").trim(),
    });

    res.status(201).json({ message: "Course created successfully.", course });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating course", error: error.message });
  }
});

// Update course
router.put("/courses/:id", requireAuth, async (req, res) => {
  try {
    const { courseCode, courseName, creditHours, department, numCOs, level, term } =
      req.body;
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      {
        courseCode: courseCode?.trim().toUpperCase(),
        courseName: courseName?.trim(),
        creditHours: parseFloat(creditHours) || 3,
        department: department?.trim(),
        numCOs: parseInt(numCOs) || 4,
        ...(level !== undefined && { level: String(level).trim() }),
        ...(term !== undefined && { term: String(term).trim() }),
      },
      { returnDocument: 'after' },
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found." });
    }

    res
      .status(200)
      .json({ message: "Course updated successfully.", course: updatedCourse });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating course", error: error.message });
  }
});

// Delete course
router.delete("/courses/:id", requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const offerings = await CourseOffering.find({ course: course._id });
    const offeringIds = offerings.map(o => o._id);

    await Enrollment.deleteMany({ courseOffering: { $in: offeringIds } });
    await Assessment.deleteMany({ courseOffering: { $in: offeringIds } });
    await StudentMarks.deleteMany({ courseOffering: { $in: offeringIds } });
    await QuestionMetadata.deleteMany({ courseOffering: { $in: offeringIds } });
    await COAttainment.deleteMany({ courseOffering: { $in: offeringIds } });
    await POAttainment.deleteMany({ courseOffering: { $in: offeringIds } });

    await CourseOutcome.deleteMany({ course: course._id });
    await CourseOffering.deleteMany({ course: course._id });
    await Course.findByIdAndDelete(course._id);

    // Auto-recalculate student longitudinal PO attainments so deleted course contribution is subtracted
    syncAllStudentsLongitudinalPO(60).catch(err => console.error("PO sync after course delete error:", err));

    res.status(200).json({ message: "Course deleted successfully." });
  } catch (error) {
    console.error("Error in DELETE /courses/:id:", error);
    res.status(500).json({ message: "Error deleting course", error: error.message });
  }
});

// Course outcomes routes
router.get("/courses/:courseId/co", requireAuth, async (req, res) => {
  try {
    const outcomes = await CourseOutcome.find({
      course: req.params.courseId,
    });
    outcomes.sort((a, b) => {
      const aNum = parseInt(a.code.replace(/^\D+/g, ""), 10) || 0;
      const bNum = parseInt(b.code.replace(/^\D+/g, ""), 10) || 0;
      return aNum - bNum;
    });
    res.status(200).json({ outcomes });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching course outcomes",
      error: error.message,
    });
  }
});

router.post("/courses/:courseId/co", requireAuth, async (req, res) => {
  try {
    const { code, description } = req.body;
    if (!code || !description) {
      return res
        .status(400)
        .json({ message: "CO code and description are required." });
    }

    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const outcome = await CourseOutcome.create({
      course: course._id,
      code: code.trim(),
      description: description.trim(),
    });
    res.status(201).json({ message: "CO created successfully.", outcome });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating CO", error: error.message });
  }
});

router.put("/courses/:courseId/co/:id", requireAuth, async (req, res) => {
  try {
    const { code, description } = req.body;
    const outcome = await CourseOutcome.findOneAndUpdate(
      { _id: req.params.id, course: req.params.courseId },
      { code: code?.trim(), description: description?.trim() },
      { returnDocument: 'after' },
    );

    if (!outcome) {
      return res.status(404).json({ message: "CO not found." });
    }

    res.status(200).json({ message: "CO updated successfully.", outcome });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating CO", error: error.message });
  }
});

router.delete("/courses/:courseId/co/:id", requireAuth, async (req, res) => {
  try {
    await CourseOutcome.findOneAndDelete({
      _id: req.params.id,
      course: req.params.courseId,
    });
    res.status(200).json({ message: "CO deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting CO", error: error.message });
  }
});

// Program outcomes routes
router.get("/program-outcomes", requireAuth, async (req, res) => {
  try {
    const programOutcomes = await ProgramOutcome.find();
    programOutcomes.sort((a, b) => {
      const aNum = parseInt(a.code.replace(/^\D+/g, ""), 10) || 0;
      const bNum = parseInt(b.code.replace(/^\D+/g, ""), 10) || 0;
      return aNum - bNum;
    });
    res.status(200).json({ programOutcomes });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching program outcomes",
      error: error.message,
    });
  }
});

router.post("/program-outcomes", requireAuth, async (req, res) => {
  try {
    const { code, description } = req.body;
    if (!code || !description) {
      return res
        .status(400)
        .json({ message: "PO code and description are required." });
    }

    const outcome = await ProgramOutcome.create({
      code: code.trim(),
      description: description.trim(),
    });
    res
      .status(201)
      .json({ message: "PO created successfully.", programOutcome: outcome });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating PO", error: error.message });
  }
});

router.put("/program-outcomes/:id", requireAuth, async (req, res) => {
  try {
    const { code, description } = req.body;
    const outcome = await ProgramOutcome.findByIdAndUpdate(
      req.params.id,
      { code: code?.trim(), description: description?.trim() },
      { returnDocument: 'after' },
    );

    if (!outcome) {
      return res.status(404).json({ message: "PO not found." });
    }

    res
      .status(200)
      .json({ message: "PO updated successfully.", programOutcome: outcome });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating PO", error: error.message });
  }
});

router.delete("/program-outcomes/:id", requireAuth, async (req, res) => {
  try {
    await ProgramOutcome.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "PO deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting PO", error: error.message });
  }
});

// CO-PO mapping routes
router.get(
  "/courses/:courseId/co-po-mapping",
  requireAuth,
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found." });
      }
      res.status(200).json({ coPoMapping: course.coPoMapping || {} });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching CO-PO mapping",
        error: error.message,
      });
    }
  },
);

router.put(
  "/courses/:courseId/co-po-mapping",
  requireAuth,
  async (req, res) => {
    try {
      const { coPoMapping } = req.body;
      const updatedCourse = await Course.findByIdAndUpdate(
        req.params.courseId,
        { coPoMapping: coPoMapping || {} },
        { returnDocument: 'after' },
      );

      if (!updatedCourse) {
        return res.status(404).json({ message: "Course not found." });
      }

      res.status(200).json({
        message: "CO-PO mapping updated successfully.",
        course: updatedCourse,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error updating CO-PO mapping",
        error: error.message,
      });
    }
  },
);

// Batch routes
router.get("/batches", requireAuth, async (req, res) => {
  try {
    const batches = await Batch.find().sort({ batchName: 1 });
    res.status(200).json({ batches });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching batches", error: error.message });
  }
});

router.post("/batches", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Batch name is required." });
    }

    const batch = await Batch.create({ batchName: name.trim() });
    res.status(201).json({ message: "Batch created successfully.", batch });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating batch", error: error.message });
  }
});

router.put("/batches/:id", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { batchName: name?.trim() },
      { returnDocument: 'after' },
    );
    if (!batch) {
      return res.status(404).json({ message: "Batch not found." });
    }
    res.status(200).json({ message: "Batch updated successfully.", batch });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating batch", error: error.message });
  }
});

router.delete("/batches/:id", requireAuth, async (req, res) => {
  try {
    await Student.updateMany(
      { batchId: req.params.id },
      { $set: { batchId: null, sectionId: null } },
    );
    await Section.deleteMany({ batchId: req.params.id });
    await Batch.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Batch deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting batch", error: error.message });
  }
});

// ==========================================
// SECTION ROUTES
// ==========================================

// Get sections of a batch
router.get("/batches/:batchId/sections", requireAuth, async (req, res) => {
  try {
    const sections = await Section.find({ batchId: req.params.batchId }).sort({ sectionName: 1 });
    res.status(200).json({ sections });
  } catch (error) {
    res.status(500).json({ message: "Error fetching sections", error: error.message });
  }
});

// Create a section for a batch
router.post("/batches/:batchId/sections", requireAuth, async (req, res) => {
  try {
    const { sectionName } = req.body;
    if (!sectionName) {
      return res.status(400).json({ message: "Section name is required." });
    }

    const batch = await Batch.findById(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found." });
    }

    // Check if section already exists in this batch
    const existing = await Section.findOne({ batchId: req.params.batchId, sectionName: sectionName.trim() });
    if (existing) {
      return res.status(400).json({ message: "Section already exists in this batch." });
    }

    const section = await Section.create({
      batchId: req.params.batchId,
      sectionName: sectionName.trim()
    });

    res.status(201).json({ message: "Section created successfully.", section });
  } catch (error) {
    res.status(500).json({ message: "Error creating section", error: error.message });
  }
});

// Update a section name
router.put("/batches/:batchId/sections/:sectionId", requireAuth, async (req, res) => {
  try {
    const { sectionName } = req.body;
    if (!sectionName) {
      return res.status(400).json({ message: "Section name is required." });
    }

    const existing = await Section.findOne({
      batchId: req.params.batchId,
      sectionName: sectionName.trim(),
      _id: { $ne: req.params.sectionId }
    });
    if (existing) {
      return res.status(400).json({ message: "Section name already exists in this batch." });
    }

    const section = await Section.findByIdAndUpdate(
      req.params.sectionId,
      { sectionName: sectionName.trim() },
      { returnDocument: 'after' }
    );

    if (!section) {
      return res.status(404).json({ message: "Section not found." });
    }

    res.status(200).json({ message: "Section updated successfully.", section });
  } catch (error) {
    res.status(500).json({ message: "Error updating section", error: error.message });
  }
});

// Delete a section
router.delete("/batches/:batchId/sections/:sectionId", requireAuth, async (req, res) => {
  try {
    // Clear sectionId in students under this section
    await Student.updateMany(
      { batchId: req.params.batchId, sectionId: req.params.sectionId },
      { $set: { sectionId: null } }
    );
    await Section.findByIdAndDelete(req.params.sectionId);
    res.status(200).json({ message: "Section deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting section", error: error.message });
  }
});

// ==========================================
// SECTION STUDENTS ROUTES
// ==========================================

// Get students for a specific section
router.get("/batches/:batchId/sections/:sectionId/students", requireAuth, async (req, res) => {
  try {
    const students = await Student.find({
      batchId: req.params.batchId,
      sectionId: req.params.sectionId
    }).sort({ studentId: 1 });
    res.status(200).json({ students });
  } catch (error) {
    res.status(500).json({ message: "Error fetching section students", error: error.message });
  }
});

// Add student to a specific section
router.post("/batches/:batchId/sections/:sectionId/students", requireAuth, async (req, res) => {
  try {
    const { studentId, name } = req.body;
    if (!studentId || !name) {
      return res.status(400).json({ message: "Student ID and name are required." });
    }

    const batch = await Batch.findById(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found." });
    }

    const section = await Section.findOne({ _id: req.params.sectionId, batchId: req.params.batchId });
    if (!section) {
      return res.status(404).json({ message: "Section not found in this batch." });
    }

    let student = await Student.findOne({ studentId: studentId.trim() });
    if (!student) {
      student = await Student.create({
        studentId: studentId.trim(),
        studentName: name.trim(),
        batchId: batch._id,
        sectionId: section._id
      });
    } else {
      student.studentName = name.trim();
      student.batchId = batch._id;
      student.sectionId = section._id;
      await student.save();
    }

    res.status(201).json({ message: "Student added to section successfully.", student });
  } catch (error) {
    res.status(500).json({ message: "Error adding student to section", error: error.message });
  }
});

// Update student in a specific section
router.put("/batches/:batchId/sections/:sectionId/students/:studentId", requireAuth, async (req, res) => {
  try {
    const { name, studentId } = req.body;

    if (studentId) {
      const tempId = studentId.trim();
      const existingStudent = await Student.findOne({ studentId: tempId });
      if (existingStudent && existingStudent._id.toString() !== req.params.studentId) {
        return res.status(400).json({ message: "Student ID is already taken by another student." });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.studentName = name.trim();
    if (studentId !== undefined) updateData.studentId = studentId.trim();

    const student = await Student.findOneAndUpdate(
      { _id: req.params.studentId, batchId: req.params.batchId, sectionId: req.params.sectionId },
      updateData,
      { returnDocument: 'after' }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found in this section." });
    }

    res.status(200).json({ message: "Student updated successfully.", student });
  } catch (error) {
    res.status(500).json({ message: "Error updating student", error: error.message });
  }
});

// Delete student from section
router.delete("/batches/:batchId/sections/:sectionId/students/:studentId", requireAuth, async (req, res) => {
  try {
    const student = await Student.findOne({
      _id: req.params.studentId,
      batchId: req.params.batchId,
      sectionId: req.params.sectionId
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found in this section." });
    }
    student.batchId = null;
    student.sectionId = null;
    await student.save();
    res.status(200).json({ message: "Student removed from section successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error removing student from section", error: error.message });
  }
});

// Legacy Batch students routes (updated to query batchId field)
router.get("/batches/:batchId/students", requireAuth, async (req, res) => {
  try {
    const students = await Student.find({ batchId: req.params.batchId }).sort({
      studentId: 1,
    });
    res.status(200).json({ students });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching batch students", error: error.message });
  }
});

router.post("/batches/:batchId/students", requireAuth, async (req, res) => {
  try {
    const { studentId, name } = req.body;
    if (!studentId || !name) {
      return res
        .status(400)
        .json({ message: "Student ID and name are required." });
    }

    const batch = await Batch.findById(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found." });
    }

    let student = await Student.findOne({ studentId: studentId.trim() });
    if (!student) {
      student = await Student.create({
        studentId: studentId.trim(),
        studentName: name.trim(),
        batchId: batch._id,
      });
    } else {
      student.studentName = name.trim();
      student.batchId = batch._id;
      await student.save();
    }

    res
      .status(201)
      .json({ message: "Student added to batch successfully.", student });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding student to batch", error: error.message });
  }
});

router.put(
  "/batches/:batchId/students/:studentId",
  requireAuth,
  async (req, res) => {
    try {
      const { name, studentId } = req.body;

      if (studentId) {
        const tempId = studentId.trim();
        const existingStudent = await Student.findOne({ studentId: tempId });
        if (existingStudent && existingStudent._id.toString() !== req.params.studentId) {
          return res
            .status(400)
            .json({ message: "Student ID is already taken by another student." });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.studentName = name.trim();
      if (studentId !== undefined) updateData.studentId = studentId.trim();

      const student = await Student.findOneAndUpdate(
        { _id: req.params.studentId, batchId: req.params.batchId },
        updateData,
        { returnDocument: 'after' },
      );

      if (!student) {
        return res
          .status(404)
          .json({ message: "Student not found in this batch." });
      }

      res
        .status(200)
        .json({ message: "Student updated successfully.", student });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error updating student", error: error.message });
    }
  },
);

router.delete(
  "/batches/:batchId/students/:studentId",
  requireAuth,
  async (req, res) => {
    try {
      const student = await Student.findOne({
        _id: req.params.studentId,
        batchId: req.params.batchId,
      });
      if (!student) {
        return res
          .status(404)
          .json({ message: "Student not found in this batch." });
      }
      student.batchId = null;
      student.sectionId = null;
      await student.save();
      res
        .status(200)
        .json({ message: "Student removed from batch successfully." });
    } catch (error) {
      res.status(500).json({
        message: "Error removing student from batch",
        error: error.message,
      });
    }
  },
);

// ==========================================
// COURSE OFFERING ROUTES
// ==========================================

// Get offerings for logged in teacher or all for admin
router.get("/course-offerings", requireAuth, async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { teacher: req.user._id };
    const offerings = await CourseOffering.find(filter)
      .populate("course")
      .populate("batch")
      .populate("semester")
      .populate("teacher", "fullName email")
      .sort({ createdAt: -1 });
    res.status(200).json({ offerings });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching course offerings",
      error: error.message,
    });
  }
});

// Get offering detail
router.get("/course-offerings/:id", requireAuth, async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id)
      .populate("course")
      .populate("batch")
      .populate("semester")
      .populate("teacher", "fullName email");
    if (!offering) {
      return res.status(404).json({ message: "Course offering not found." });
    }
    res.status(200).json({ offering });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching course offering",
      error: error.message,
    });
  }
});

// Create course offering
router.post("/course-offerings", requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const {
      courseId,
      semesterId,
      section,
      batchId,
      teacherId,
      academicYear,
      course,
      batch,
      teacher,
      semester,
      year,
    } = payload;

    const selectedCourse = courseId || course;
    const selectedBatch = batchId || batch;
    const selectedTeacher =
      teacherId || teacher || (req.user.role === "admin" ? null : req.user._id);
    const selectedSemester = semesterId || semester;
    const selectedSection = section?.trim();
    let selectedAcademicYear = academicYear ?? year;

    if (!selectedCourse) {
      return res.status(400).json({ message: "Course is required." });
    }

    if (!selectedSemester) {
      return res.status(400).json({ message: "Session is required." });
    }

    if (!selectedSection) {
      return res.status(400).json({ message: "Section is required." });
    }

    const courseDoc = await Course.findById(selectedCourse);
    if (!courseDoc) {
      return res.status(404).json({ message: "Course not found." });
    }

    const semesterDoc = await AcademicSession.findById(selectedSemester);
    if (!semesterDoc) {
      return res.status(404).json({ message: "Academic session not found." });
    }

    if (!selectedAcademicYear && semesterDoc) {
      selectedAcademicYear = semesterDoc.academicYear;
    }

    if (!selectedAcademicYear) {
      return res.status(400).json({ message: "Academic year is required." });
    }

    const isAdminOffering = req.user.role === "admin";

    if (isAdminOffering) {
      if (!selectedBatch) {
        return res.status(400).json({ message: "Batch is required." });
      }

      if (!selectedTeacher) {
        return res.status(400).json({ message: "Teacher is required." });
      }

      const teacherDoc = await User.findById(selectedTeacher);
      if (!teacherDoc) {
        return res.status(404).json({ message: "Teacher not found." });
      }

      const batchDoc = await Batch.findById(selectedBatch);
      if (!batchDoc) {
        return res.status(404).json({ message: "Batch not found." });
      }

      const existing = await CourseOffering.findOne({
        course: selectedCourse,
        batch: selectedBatch,
        teacher: selectedTeacher,
        semester: selectedSemester,
        section: selectedSection,
        academicYear: parseInt(selectedAcademicYear, 10),
      });

      if (existing) {
        const populated = await CourseOffering.findById(existing._id)
          .populate("course")
          .populate("batch")
          .populate("semester")
          .populate("teacher", "fullName email");
        return res.status(200).json({
          message: "Course offering already exists.",
          offering: populated,
        });
      }

      const newOffering = await CourseOffering.create({
        course: selectedCourse,
        batch: selectedBatch,
        teacher: selectedTeacher,
        semester: selectedSemester,
        section: selectedSection,
        academicYear: parseInt(selectedAcademicYear, 10),
        coPoMapping: courseDoc.coPoMapping || {},
      });

      const populated = await CourseOffering.findById(newOffering._id)
        .populate("course")
        .populate("batch")
        .populate("semester")
        .populate("teacher", "fullName email");
      return res.status(201).json({
        message: "Course offering created successfully.",
        offering: populated,
      });
    }

    const existing = await CourseOffering.findOne({
      course: selectedCourse,
      semester: selectedSemester,
      section: selectedSection,
      teacher: req.user._id,
    });

    if (existing) {
      const populated = await CourseOffering.findById(existing._id)
        .populate("course")
        .populate("semester");
      return res.status(200).json({
        message: "Course offering already exists.",
        offering: populated,
      });
    }

    const newOffering = await CourseOffering.create({
      course: selectedCourse,
      semester: selectedSemester,
      section: selectedSection,
      teacher: req.user._id,
      academicYear: selectedAcademicYear ? parseInt(selectedAcademicYear, 10) : undefined,
      coPoMapping: courseDoc.coPoMapping || {},
    });

    const populated = await CourseOffering.findById(newOffering._id)
      .populate("course")
      .populate("semester");

    return res.status(201).json({
      message: "Course offering created successfully.",
      offering: populated,
    });
  } catch (error) {
    console.error("Error in POST /course-offerings:", error);
    res.status(500).json({
      message: "Error creating course offering",
      error: error.message,
    });
  }
});

// Update course offering
router.put("/course-offerings/:id", requireAuth, async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) {
      return res.status(404).json({ message: "Course offering not found." });
    }

    if (req.user.role !== "admin" && offering.teacher?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized to update this course offering." });
    }

    const payload = req.body || {};
    const {
      courseId,
      semesterId,
      section,
      batchId,
      teacherId,
      academicYear,
      course,
      batch,
      teacher,
      semester,
      year,
    } = payload;

    const selectedCourse = courseId || course || offering.course;
    const selectedSemester = semesterId || semester || offering.semester;
    const selectedSection = (section !== undefined ? section : offering.section)?.trim();
    let selectedAcademicYear = academicYear ?? year;

    if (!selectedCourse) {
      return res.status(400).json({ message: "Course is required." });
    }
    if (!selectedSemester) {
      return res.status(400).json({ message: "Session is required." });
    }
    if (!selectedSection) {
      return res.status(400).json({ message: "Section is required." });
    }

    const courseDoc = await Course.findById(selectedCourse);
    if (!courseDoc) {
      return res.status(404).json({ message: "Course not found." });
    }

    const semesterDoc = await AcademicSession.findById(selectedSemester);
    if (!semesterDoc) {
      return res.status(404).json({ message: "Academic session not found." });
    }

    if (!selectedAcademicYear) {
      selectedAcademicYear = semesterDoc.academicYear || offering.academicYear;
    }

    if (req.user.role === "admin") {
      const selectedBatch = batchId || batch || offering.batch;
      const selectedTeacher = teacherId || teacher || offering.teacher;

      if (!selectedBatch) {
        return res.status(400).json({ message: "Batch is required." });
      }
      if (!selectedTeacher) {
        return res.status(400).json({ message: "Teacher is required." });
      }

      const teacherDoc = await User.findById(selectedTeacher);
      if (!teacherDoc) {
        return res.status(404).json({ message: "Teacher not found." });
      }

      const batchDoc = await Batch.findById(selectedBatch);
      if (!batchDoc) {
        return res.status(404).json({ message: "Batch not found." });
      }

      offering.batch = selectedBatch;
      offering.teacher = selectedTeacher;
    }

    offering.course = selectedCourse;
    offering.semester = selectedSemester;
    offering.section = selectedSection;
    offering.academicYear = selectedAcademicYear ? parseInt(selectedAcademicYear, 10) : offering.academicYear;

    await offering.save();

    const populated = await CourseOffering.findById(offering._id)
      .populate("course")
      .populate("batch")
      .populate("semester")
      .populate("teacher", "fullName email");

    res.status(200).json({
      message: "Course offering updated successfully.",
      offering: populated,
    });
  } catch (error) {
    console.error("Error in PUT /course-offerings/:id:", error);
    res.status(500).json({
      message: "Error updating course offering",
      error: error.message,
    });
  }
});

// Delete course offering
router.delete("/course-offerings/:id", requireAuth, async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) {
      return res.status(404).json({ message: "Course offering not found." });
    }

    if (req.user.role !== "admin" && offering.teacher?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this course offering." });
    }

    await Enrollment.deleteMany({ courseOffering: offering._id });
    await Assessment.deleteMany({ courseOffering: offering._id });
    await StudentMarks.deleteMany({ courseOffering: offering._id });
    await QuestionMetadata.deleteMany({ courseOffering: offering._id });
    await COAttainment.deleteMany({ courseOffering: offering._id });
    await POAttainment.deleteMany({ courseOffering: offering._id });

    await CourseOffering.findByIdAndDelete(offering._id);

    // Auto-recalculate student longitudinal PO attainments so deleted course contribution is subtracted
    syncAllStudentsLongitudinalPO(60).catch(err => console.error("PO sync after course offering delete error:", err));

    res.status(200).json({ message: "Course offering deleted successfully." });
  } catch (error) {
    console.error("Error in DELETE /course-offerings/:id:", error);
    res.status(500).json({
      message: "Error deleting course offering",
      error: error.message,
    });
  }
});

// Update CO-PO Mapping
router.put(
  "/course-offerings/:id/copomapping",
  requireAuth,
  async (req, res) => {
    try {
      const { coPoMapping } = req.body;
      const offering = await CourseOffering.findOneAndUpdate(
        { _id: req.params.id, teacher: req.user._id },
        { coPoMapping },
        { returnDocument: 'after' },
      );
      if (!offering) {
        return res
          .status(404)
          .json({ message: "Course offering not found or unauthorized." });
      }
      await logActivity(req.params.id, req.user._id, 'CO-PO Mapping Updated', `Updated CO-PO mapping matrix`)
      res
        .status(200)
        .json({ message: "CO-PO Mapping updated successfully.", offering });
    } catch (error) {
      res.status(500).json({
        message: "Error updating CO-PO mapping",
        error: error.message,
      });
    }
  },
);

// Update KPI
router.put("/course-offerings/:id/kpi", requireAuth, async (req, res) => {
  try {
    const { targetPassMarks, kpiCO, kpiPO } = req.body;
    const offering = await CourseOffering.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { targetPassMarks, kpiCO, kpiPO },
      { returnDocument: 'after' },
    );
    if (!offering) {
      return res
        .status(404)
        .json({ message: "Course offering not found or unauthorized." });
    }
    await logActivity(req.params.id, req.user._id, 'KPI Config Updated', `Updated KPI config targets`)
    res
      .status(200)
      .json({ message: "KPI configuration updated successfully.", offering });
  } catch (error) {
    res.status(500).json({
      message: "Error updating KPI configuration",
      error: error.message,
    });
  }
});

// ==========================================
// STUDENT & ENROLLMENT ROUTES
// ==========================================

// Get enrolled students
router.get("/course-offerings/:id/students", requireAuth, async (req, res) => {
  try {
    const offering = await CourseOffering.findById(req.params.id);
    const sectionDoc = offering && offering.batch
      ? await Section.findOne({ batchId: offering.batch, sectionName: offering.section })
      : null;
    const sectionId = sectionDoc ? sectionDoc._id : null;

    const enrollments = await Enrollment.find({
      courseOffering: req.params.id,
    }).populate("student");
    const students = enrollments
      .filter((e) => e.student && (!sectionId || (e.student.sectionId && e.student.sectionId.toString() === sectionId.toString())))
      .map((e) => ({
        _id: e.student._id,
        id: e.student.studentId,
        name: e.student.name,
      }));
    res.status(200).json({ students });
  } catch (error) {
    console.error("Error fetching enrolled students:", error.message);
    res.status(500).json({
      message: "Error fetching enrolled students",
      error: error.message,
    });
  }
});

// Add manual student and enroll
router.post("/course-offerings/:id/students", requireAuth, async (req, res) => {
  try {
    const { studentId, name } = req.body;
    if (!studentId || !name) {
      return res
        .status(400)
        .json({ message: "Student ID and Name are required." });
    }

    const offering = await CourseOffering.findById(req.params.id);
    if (!offering) {
      return res.status(404).json({ message: "Course offering not found." });
    }

    const sectionDoc = offering.batch
      ? await Section.findOne({ batchId: offering.batch, sectionName: offering.section })
      : null;

    const cleanId = studentId.trim();
    let student = await Student.findOne({ studentId: cleanId });
    if (!student) {
      student = await Student.create({
        studentId: cleanId,
        studentName: name.trim(),
        batchId: offering.batch,
        sectionId: sectionDoc ? sectionDoc._id : null
      });
    } else {
      // update name if changed
      student.studentName = name.trim();
      if (!student.batchId) student.batchId = offering.batch;
      if (!student.sectionId && sectionDoc) student.sectionId = sectionDoc._id;
      await student.save();
    }

    // Enroll
    let enrollment = await Enrollment.findOne({
      student: student._id,
      courseOffering: req.params.id,
    });
    if (!enrollment) {
      enrollment = await Enrollment.create({
        student: student._id,
        courseOffering: req.params.id,
      });
    }

    res.status(201).json({
      message: "Student enrolled successfully.",
      student: { _id: student._id, id: student.studentId, name: student.name },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error enrolling student", error: error.message });
  }
});

// Bulk import/enroll students
router.post(
  "/course-offerings/:id/students/import",
  requireAuth,
  async (req, res) => {
    try {
      const { students } = req.body; // array of { id, name }
      if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ message: "Students list is required." });
      }

      const offering = await CourseOffering.findById(req.params.id);
      if (!offering) {
        return res.status(404).json({ message: "Course offering not found." });
      }
      const sectionDoc = offering.batch
        ? await Section.findOne({ batchId: offering.batch, sectionName: offering.section })
        : null;

      const enrolledStudents = [];
      const errors = [];

      for (const item of students) {
        try {
          if (!item.id || !item.name) {
            errors.push(`Skipped: Student must have both id and name`);
            continue;
          }
          const cleanId = String(item.id).trim();
          const cleanName = String(item.name).trim();

          let student = await Student.findOne({ studentId: cleanId });
          if (!student) {
            student = await Student.create({
              studentId: cleanId,
              studentName: cleanName,
              batchId: offering.batch,
              sectionId: sectionDoc ? sectionDoc._id : null
            });
          } else {
            student.studentName = cleanName;
            if (!student.batchId) student.batchId = offering.batch;
            if (!student.sectionId && sectionDoc) student.sectionId = sectionDoc._id;
            await student.save();
          }

          let enrollment = await Enrollment.findOne({
            student: student._id,
            courseOffering: req.params.id,
          });
          if (!enrollment) {
            await Enrollment.create({
              student: student._id,
              courseOffering: req.params.id,
            });
          }

          enrolledStudents.push({
            _id: student._id,
            id: student.studentId,
            name: student.name,
          });
        } catch (itemError) {
          console.error(
            "Error importing individual student:",
            itemError.message,
          );
          errors.push(`Student ${item.id}: ${itemError.message}`);
        }
      }

      if (enrolledStudents.length === 0) {
        return res
          .status(400)
          .json({ message: "No students could be imported.", errors });
      }

      res.status(200).json({
        message: `${enrolledStudents.length} students enrolled successfully.`,
        students: enrolledStudents,
        ...(errors.length > 0 && { warnings: errors }),
      });
    } catch (error) {
      console.error("Error importing students:", error.message);
      res
        .status(500)
        .json({ message: "Error importing students", error: error.message });
    }
  },
);

// ==========================================
// ASSESSMENT ROUTES
// ==========================================

// Get assessments grouped by type
router.get(
  "/course-offerings/:id/assessments",
  requireAuth,
  async (req, res) => {
    try {
      const dbAssessments = await Assessment.find({
        courseOffering: req.params.id,
      });

      // Group assessments by type
      const assessments = {
        cts: [],
        midTerm: [],
        final: [],
        assignments: [],
        attendance: null,
        performance: null,
        presentation: null,
      };

      dbAssessments.forEach((a) => {
        const isExtra = Boolean(a.isExtraCT || (a.name && a.name.toLowerCase().startsWith('extra ct')));
        let parentName = a.parentCTName || '';
        if (isExtra && !parentName && a.name) {
          const match = a.name.match(/\(([^)]+)\)/);
          if (match && match[1]) {
            parentName = match[1].replace(/^for\s+/i, '');
          }
        }

        const item = {
          _id: a._id,
          name: a.name,
          maxMarks: a.maxMarks,
          co: a.co,
          type: a.type,
          numQuestions: a.numQuestions,
          examDuration: a.examDuration,
          status: a.status,
          deadline: a.deadline,
          isExtraCT: isExtra,
          parentCTName: parentName,
          parentCTId: a.parentCTId,
          createdAt: a.createdAt || (a._id && typeof a._id.getTimestamp === 'function' ? a._id.getTimestamp() : new Date())
        };
        if (["cts", "midTerm", "final", "assignments"].includes(a.type)) {
          assessments[a.type].push(item);
        } else {
          assessments[a.type] = item;
        }
      });

      // If special assessments don't exist, we send defaults (or frontend can handle it)
      if (!assessments.attendance)
        assessments.attendance = { maxMarks: 10, co: "" };
      if (!assessments.performance)
        assessments.performance = { maxMarks: 10, co: "" };
      if (!assessments.presentation)
        assessments.presentation = { maxMarks: 10, co: "" };

      res.status(200).json({ assessments });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching assessments", error: error.message });
    }
  },
);

// Save assessments (bulk update)
router.post(
  "/course-offerings/:id/assessments",
  requireAuth,
  async (req, res) => {
    try {
      const { assessments } = req.body; // structured assessments object
      if (!assessments) {
        return res
          .status(400)
          .json({ message: "Assessments configuration is required." });
      }

      const courseOfferingId = req.params.id;

      // We will save all assessments into the Assessment collection.
      // To do this reliably, we can delete the current assessments and recreate them,
      // but wait! If we delete assessments, we need to map old assessment IDs or names to preserve marks.
      // Let's write a reconciliation logic:
      // Fetch existing assessments first.
      const existingAssessments = await Assessment.find({
        courseOffering: courseOfferingId,
      });
      const existingMap = new Map(
        existingAssessments.map((a) => [`${a.type}_${a.name}`, a]),
      );

      const newAssessmentsToSave = [];

      // Parse arrays
      const types = ["cts", "midTerm", "final", "assignments"];
      types.forEach((t) => {
        if (Array.isArray(assessments[t])) {
          assessments[t].forEach((a) => {
            if (a.name) {
              newAssessmentsToSave.push({
                type: t,
                name: a.name.trim(),
                maxMarks: parseFloat(a.maxMarks) || 0,
                co: a.co ? a.co.trim() : "",
                deadline: a.deadline || ""
              });
            }
          });
        }
      });

      // Parse singular special assessments
      const specials = ["attendance", "performance", "presentation"];
      specials.forEach((s) => {
        if (assessments[s]) {
          newAssessmentsToSave.push({
            type: s,
            name: s.charAt(0).toUpperCase() + s.slice(1), // e.g. Attendance, Performance, Presentation
            maxMarks: parseFloat(assessments[s].maxMarks) || 0,
            co: assessments[s].co ? assessments[s].co.trim() : "",
            deadline: assessments[s].deadline || ""
          });
        }
      });

      const savedAssessments = [];
      const keepKeys = new Set();

      for (const item of newAssessmentsToSave) {
        const key = `${item.type}_${item.name}`;
        keepKeys.add(key);

        const existing = existingMap.get(key);
        if (existing) {
          // Update
          existing.maxMarks = item.maxMarks;
          existing.co = item.co;
          existing.deadline = item.deadline;
          await existing.save();
          savedAssessments.push(existing);
        } else {
          // Create
          const created = await Assessment.create({
            courseOffering: courseOfferingId,
            type: item.type,
            name: item.name,
            maxMarks: item.maxMarks,
            co: item.co,
            deadline: item.deadline
          });
          savedAssessments.push(created);
        }
      }

      // Delete assessments that were removed
      for (const [key, existing] of existingMap.entries()) {
        if (!keepKeys.has(key)) {
          // Remove associated marks first
          await Marks.deleteMany({ assessment: existing._id });
          // Delete assessment
          await Assessment.deleteOne({ _id: existing._id });
        }
      }

      // Respond with reconstructed object
      const finalAssessments = {
        cts: [],
        midTerm: [],
        final: [],
        assignments: [],
        attendance: null,
        performance: null,
        presentation: null,
      };

      savedAssessments.forEach((a) => {
        const item = {
          _id: a._id,
          name: a.name,
          maxMarks: a.maxMarks,
          co: a.co,
          deadline: a.deadline
        };
        if (types.includes(a.type)) {
          finalAssessments[a.type].push(item);
        } else {
          finalAssessments[a.type] = item;
        }
      });

      res.status(200).json({
        message: "Assessments updated successfully.",
        assessments: finalAssessments,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error saving assessments", error: error.message });
    }
  },
);

// Get marks for offering
router.get("/course-offerings/:id/marks", requireAuth, async (req, res) => {
  try {
    const courseOfferingId = req.params.id;

    const offering = await CourseOffering.findById(courseOfferingId);
    const sectionDoc = offering && offering.batch
      ? await Section.findOne({ batchId: offering.batch, sectionName: offering.section })
      : null;
    const sectionId = sectionDoc ? sectionDoc._id : null;

    // Fetch all enrollments to get student list
    const enrollments = await Enrollment.find({
      courseOffering: courseOfferingId,
    }).populate("student");
    const validEnrollments = enrollments.filter(
      (e) => e.student && (!sectionId || (e.student.sectionId && e.student.sectionId.toString() === sectionId.toString()))
    );

    const studentMap = new Map(
      validEnrollments.map((e) => [e.student._id.toString(), e.student.studentId]),
    );

    // Fetch all assessments for this offering
    const assessments = await Assessment.find({
      courseOffering: courseOfferingId,
    });
    const assessmentMap = new Map(
      assessments.map((a) => [a._id.toString(), a]),
    );

    // Fetch all marks
    const dbMarks = await Marks.find({ courseOffering: courseOfferingId });

    // Reconstruct marks: { [studentId]: { [assessmentType_assessmentName]: mark } }
    const marks = {};

    // Initialize structure for all enrolled students
    validEnrollments.forEach((e) => {
      marks[e.student.studentId] = {};
    });

    dbMarks.forEach((m) => {
      const studentId = studentMap.get(m.student.toString());
      const assessment = assessmentMap.get(m.assessment.toString());

      if (studentId && assessment) {
        const key = `${assessment.type}_${assessment.name}`;
        marks[studentId][key] = m.mark;
      }
    });

    res.status(200).json({ marks });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching marks", error: error.message });
  }
});

// Save marks (bulk update)
router.post("/course-offerings/:id/marks", requireAuth, async (req, res) => {
  try {
    const courseOfferingId = req.params.id;
    const { marks } = req.body; // payload is { [studentId]: { [assessmentType_assessmentName]: mark } }

    if (
      !marks ||
      typeof marks !== "object" ||
      Object.keys(marks).length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Marks payload is required and must not be empty." });
    }

    // Fetch assessments and students to map keys back to ObjectIds
    const assessments = await Assessment.find({
      courseOffering: courseOfferingId,
    });
    if (assessments.length === 0) {
      return res
        .status(400)
        .json({ message: "No assessments found for this course offering." });
    }

    const assessmentKeyMap = new Map(
      assessments.map((a) => [`${a.type}_${a.name}`, a]),
    );

    const offering = await CourseOffering.findById(courseOfferingId);
    const sectionDoc = offering && offering.batch
      ? await Section.findOne({ batchId: offering.batch, sectionName: offering.section })
      : null;
    const sectionId = sectionDoc ? sectionDoc._id : null;

    const enrollments = await Enrollment.find({
      courseOffering: courseOfferingId,
    }).populate("student");

    // Filter out null student references
    const validEnrollments = enrollments.filter(
      (e) => e.student && (!sectionId || (e.student.sectionId && e.student.sectionId.toString() === sectionId.toString()))
    );
    if (validEnrollments.length === 0) {
      return res
        .status(400)
        .json({ message: "No students enrolled in this course offering." });
    }

    const studentIdMap = new Map(
      validEnrollments.map((e) => [e.student.studentId, e.student]),
    );

    console.log("StudentIdMap keys:", Array.from(studentIdMap.keys()));
    console.log("Marks keys:", Object.keys(marks));

    const bulkOps = [];
    let processedCount = 0;
    let skippedCount = 0;

    for (const [studentId, studentMarks] of Object.entries(marks)) {
      const student = studentIdMap.get(studentId);
      if (!student) {
        console.warn(`Student ${studentId} not found in enrollment map`);
        skippedCount++;
        continue; // Skip if student not enrolled in this offering
      }

      if (!studentMarks || typeof studentMarks !== "object") {
        console.warn(`Invalid marks for student ${studentId}`);
        skippedCount++;
        continue;
      }

      for (const [key, markValue] of Object.entries(studentMarks)) {
        const assessment = assessmentKeyMap.get(key);
        if (!assessment) {
          console.warn(`Assessment ${key} not found for student ${studentId}`);
          continue; // Skip if assessment doesn't exist
        }

        const mark = markValue === "" ? 0 : parseFloat(markValue);
        if (isNaN(mark)) {
          console.warn(`Invalid mark value ${markValue} for assessment ${key}`);
          continue;
        }

        // Use updateOne with upsert to save or update marks
        bulkOps.push({
          updateOne: {
            filter: {
              student: student._id,
              assessment: assessment._id,
              courseOffering: courseOfferingId,
            },
            update: {
              $set: { mark },
            },
            upsert: true,
          },
        });
        processedCount++;
      }
    }

    if (bulkOps.length === 0) {
      return res.status(400).json({
        message:
          "No valid marks to save. Check student IDs and assessment names.",
        debug: { totalMarksRecords: Object.keys(marks).length, skippedCount },
      });
    }

    await Marks.bulkWrite(bulkOps);
    res.status(200).json({
      message: "Marks saved successfully.",
      saved: processedCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error("Error saving marks:", error);
    res
      .status(500)
      .json({ message: "Error saving marks", error: error.message });
  }
});

// ==========================================
// REPORTS & DATA SUMMARY ROUTE
// ==========================================

// Get complete report data (combined payload)
router.get(
  "/course-offerings/:id/report-data",
  requireAuth,
  async (req, res) => {
    try {
      const courseOfferingId = req.params.id;

      // 1. Fetch offering details
      const offering = await CourseOffering.findById(courseOfferingId)
        .populate("course")
        .populate("semester")
        .populate("batch")
        .populate("teacher", "fullName email");
      if (!offering) {
        return res.status(404).json({ message: "Course offering not found." });
      }

      // 2. Format courseInfo
      const courseInfo = {
        _id: offering.course._id,
        id: offering.course._id,
        courseCode: offering.course.courseCode,
        courseTitle: offering.course.courseName,
        department: offering.course.department,
        academicYear: offering.academicYear || offering.semester?.academicYear,
        semesterName: offering.semester?.semesterName,
        sectionName: offering.section,
        batchName: offering.batch?.batchName || offering.batch?.name,
        teacherName: offering.teacher?.fullName,
        teacherEmail: offering.teacher?.email,
      };

      const sectionDoc = offering.batch
        ? await Section.findOne({ batchId: offering.batch, sectionName: offering.section })
        : null;
      const sectionId = sectionDoc ? sectionDoc._id : null;

      // 3. Fetch students
      const enrollments = await Enrollment.find({
        courseOffering: courseOfferingId,
      }).populate("student");
      const students = enrollments
        .filter((e) => e.student && (!sectionId || (e.student.sectionId && e.student.sectionId.toString() === sectionId.toString())))
        .map((e) => ({
          _id: e.student._id,
          id: e.student.studentId,
          name: e.student.name,
        }));

      // 4. Fetch assessments
      const dbAssessments = await Assessment.find({
        courseOffering: courseOfferingId,
      });
      const assessments = {
        cts: [],
        midTerm: [],
        final: [],
        assignments: [],
        attendance: null,
        performance: null,
        presentation: null,
      };

      dbAssessments.forEach((a) => {
        const item = {
          _id: a._id,
          name: a.name,
          maxMarks: a.maxMarks,
          co: a.co,
        };
        if (["cts", "midTerm", "final", "assignments"].includes(a.type)) {
          assessments[a.type].push(item);
        } else {
          assessments[a.type] = item;
        }
      });

      if (!assessments.attendance)
        assessments.attendance = { maxMarks: 10, co: "" };
      if (!assessments.performance)
        assessments.performance = { maxMarks: 10, co: "" };
      if (!assessments.presentation)
        assessments.presentation = { maxMarks: 10, co: "" };

      // 5. Fetch marks
      const dbMarks = await Marks.find({ courseOffering: courseOfferingId });
      const studentMap = new Map(students.map((s) => [s._id.toString(), s.id]));
      const assessmentMap = new Map(
        dbAssessments.map((a) => [a._id.toString(), a]),
      );

      const marks = {};
      students.forEach((s) => {
        marks[s.id] = {};
      });

      dbMarks.forEach((m) => {
        const studentId = studentMap.get(m.student.toString());
        const assessment = assessmentMap.get(m.assessment.toString());
        if (studentId && assessment) {
          const key = `${assessment.type}_${assessment.name}`;
          marks[studentId][key] = m.mark;
        }
      });

      const rawMapping = offering.course?.coPoMapping || {};
      const normalizedCoMapping = {};
      Object.keys(rawMapping).forEach((coKey) => {
        const normCo = coKey.replace(/\s+/g, "").toUpperCase();
        normalizedCoMapping[normCo] = {};
        if (rawMapping[coKey] && typeof rawMapping[coKey] === "object") {
          Object.keys(rawMapping[coKey]).forEach((poKey) => {
            const normPo = poKey.replace(/\s+/g, "").toUpperCase();
            normalizedCoMapping[normCo][normPo] = rawMapping[coKey][poKey];
          });
        }
      });

      res.status(200).json({
        courseInfo,
        students,
        assessments,
        marks,
        coMapping: normalizedCoMapping,
        kpiConfig: {
          targetPassMarks: offering.targetPassMarks,
          kpiCO: offering.kpiCO,
          kpiPO: offering.kpiPO,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching report data", error: error.message });
    }
  },
);

export default router;
