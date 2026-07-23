import express from "express";
import { requireAuth } from "../middleware/auth.js";
import COPORequest from "../models/COPORequest.js";
import Course from "../models/Course.js";
import CourseOutcome from "../models/CourseOutcome.js";
import CourseOffering from "../models/CourseOffering.js";
import { logActivity } from "../utils/activityLogger.js";

const router = express.Router();

// ==========================================
// TEACHER ENDPOINTS
// ==========================================

// POST /api/copo-requests — Submit a new CO-PO change request (Teacher)
router.post("/copo-requests", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role === "admin") {
      return res.status(403).json({ message: "Only teachers can submit CO-PO requests." });
    }

    const {
      courseId,
      courseOfferingId,
      courseCode,
      courseName,
      requestType,
      proposedMapping,
      originalMapping,
      proposedCOs,
      editedCOs,
      deletedCOs,
      changesSummary,
    } = req.body;

    if (!courseId || !requestType) {
      return res.status(400).json({ message: "courseId and requestType are required." });
    }

    // Check if teacher already has an active (pending/in_review) request for this course
    const existingActive = await COPORequest.findOne({
      teacher: user._id,
      course: courseId,
      status: { $in: ["pending", "in_review"] },
    });

    if (existingActive) {
      return res.status(409).json({
        message: "You already have an active request for this course. Please wait for it to be resolved before submitting a new one.",
        existingRequest: existingActive,
      });
    }

    const request = await COPORequest.create({
      teacher: user._id,
      teacherName: user.fullName,
      teacherEmail: user.email,
      course: courseId,
      courseCode: courseCode || "",
      courseName: courseName || "",
      courseOffering: courseOfferingId || null,
      requestType,
      proposedMapping: proposedMapping || null,
      originalMapping: originalMapping || null,
      proposedCOs: proposedCOs || [],
      editedCOs: editedCOs || [],
      deletedCOs: deletedCOs || [],
      changesSummary: changesSummary || "",
      status: "pending",
      submittedAt: new Date(),
    });

    // Log to Recent Activity
    let offeringId = courseOfferingId;
    if (!offeringId) {
      const foundOffering = await CourseOffering.findOne({ course: courseId, teacher: user._id });
      if (foundOffering) offeringId = foundOffering._id;
    }
    if (offeringId) {
      await logActivity(
        offeringId,
        user._id,
        "SUBMIT_COPO_REQUEST",
        `Submitted CO-PO modification request for ${courseCode || "course"} (${changesSummary || "CO-PO edit"}). Status: Pending Admin Review.`
      );
    }

    res.status(201).json({
      message: "CO-PO change request submitted successfully. Admin will review it.",
      request,
    });
  } catch (error) {
    console.error("Error creating CO-PO request:", error);
    res.status(500).json({ message: "Failed to submit request.", error: error.message });
  }
});

// GET /api/copo-requests/my — Get all active requests by the logged-in teacher (excluding dismissed)
router.get("/copo-requests/my", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user._id === "admin-local") {
      return res.status(403).json({ message: "This endpoint is for teachers." });
    }

    const { courseId, status } = req.query;
    const filter = { teacher: user._id, dismissedByTeacher: { $ne: true } };
    if (courseId) filter.course = courseId;
    if (status) filter.status = status;

    const requests = await COPORequest.find(filter)
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({ requests });
  } catch (error) {
    console.error("Error fetching teacher requests:", error);
    res.status(500).json({ message: "Failed to fetch requests.", error: error.message });
  }
});

// PUT /api/copo-requests/:id/dismiss — Dismiss request notification dynamically in MongoDB (Teacher)
router.put("/copo-requests/:id/dismiss", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const request = await COPORequest.findOneAndUpdate(
      { _id: id, teacher: user._id },
      { dismissedByTeacher: true },
      { new: true }
    );
    if (!request) {
      return res.status(404).json({ message: "Request not found or access denied." });
    }
    res.status(200).json({ success: true, message: "Notification dismissed successfully in database." });
  } catch (error) {
    console.error("Error dismissing request:", error);
    res.status(500).json({ message: "Failed to dismiss request.", error: error.message });
  }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// GET /api/copo-requests/count — Get count of pending requests (for badge)
router.get("/copo-requests/count", requireAuth, async (req, res) => {
  try {
    const pending = await COPORequest.countDocuments({ status: "pending" });
    const inReview = await COPORequest.countDocuments({ status: "in_review" });

    res.status(200).json({
      pending,
      inReview,
      total: pending + inReview,
    });
  } catch (error) {
    console.error("Error counting requests:", error);
    res.status(500).json({ message: "Failed to count requests.", error: error.message });
  }
});

// GET /api/copo-requests/history — Get full history (admin)
router.get("/copo-requests/history", requireAuth, async (req, res) => {
  try {
    const { status, courseId, teacherId, startDate, endDate, limit = 50 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (courseId) filter.course = courseId;
    if (teacherId) filter.teacher = teacherId;
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) filter.submittedAt.$gte = new Date(startDate);
      if (endDate) filter.submittedAt.$lte = new Date(endDate);
    }

    const requests = await COPORequest.find(filter)
      .sort({ submittedAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({ requests });
  } catch (error) {
    console.error("Error fetching request history:", error);
    res.status(500).json({ message: "Failed to fetch history.", error: error.message });
  }
});

// GET /api/copo-requests — Get all requests (admin, with filters)
router.get("/copo-requests", requireAuth, async (req, res) => {
  try {
    const { status, courseId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (courseId) filter.course = courseId;

    const requests = await COPORequest.find(filter)
      .sort({ submittedAt: -1 })
      .lean();

    res.status(200).json({ requests });
  } catch (error) {
    console.error("Error fetching all requests:", error);
    res.status(500).json({ message: "Failed to fetch requests.", error: error.message });
  }
});

// PUT /api/copo-requests/:id/status — Update request status (admin)
router.put("/copo-requests/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!status || !["pending", "in_review", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be: pending, in_review, approved, or rejected." });
    }

    const request = await COPORequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Update the request status
    request.status = status;
    if (adminNote !== undefined) request.adminNote = adminNote;
    if (status === "approved" || status === "rejected") {
      request.reviewedAt = new Date();
      request.reviewedBy = req.user?.fullName || req.user?.email || "Admin";
    }
    if (status === "in_review" && !request.reviewedAt) {
      request.reviewedAt = new Date();
      request.reviewedBy = req.user?.fullName || req.user?.email || "Admin";
    }

    await request.save();

    // Log to Recent Activity
    let offeringId = request.courseOffering;
    if (!offeringId) {
      const foundOffering = await CourseOffering.findOne({ course: request.course, teacher: request.teacher });
      if (foundOffering) offeringId = foundOffering._id;
    }
    if (offeringId) {
      const statusLabel = status === "approved" ? "Approved 🎉" : status === "rejected" ? "Rejected ❌" : "Marked In Review 💬";
      await logActivity(
        offeringId,
        request.teacher,
        `COPO_REQUEST_${status.toUpperCase()}`,
        `CO-PO request for ${request.courseCode || "course"} was ${statusLabel} by Admin. ${adminNote ? `Admin Note: "${adminNote}"` : ""}`
      );
    }

    // If APPROVED: apply changes to the Course database
    if (status === "approved") {
      try {
        // 1. Delete COs marked for deletion
        if (request.deletedCOs && request.deletedCOs.length > 0) {
          await CourseOutcome.deleteMany({
            course: request.course,
            code: { $in: request.deletedCOs },
          });
        }

        // 2. Create new CourseOutcome documents if proposedCOs exist
        if (request.proposedCOs && request.proposedCOs.length > 0) {
          for (const co of request.proposedCOs) {
            const existing = await CourseOutcome.findOne({
              course: request.course,
              code: co.code,
            });
            if (!existing) {
              await CourseOutcome.create({
                course: request.course,
                code: co.code,
                description: co.description,
              });
            }
          }
        }

        // 3. Update descriptions for editedCOs if present
        if (request.editedCOs && request.editedCOs.length > 0) {
          for (const co of request.editedCOs) {
            await CourseOutcome.findOneAndUpdate(
              { course: request.course, code: co.code },
              { description: co.description }
            );
          }
        }

        // 4. Update Course.coPoMapping
        if (request.proposedMapping) {
          const finalMapping = { ...request.proposedMapping };
          // Ensure deleted COs are stripped from mapping
          if (request.deletedCOs && request.deletedCOs.length > 0) {
            request.deletedCOs.forEach(delCode => {
              delete finalMapping[delCode];
            });
          }

          const courseDoc = await Course.findById(request.course);
          if (courseDoc) {
            courseDoc.coPoMapping = finalMapping;
            courseDoc.markModified("coPoMapping");
            await courseDoc.save();
          }
        }

        // 5. Update total numCOs on the course
        const totalCOs = await CourseOutcome.countDocuments({ course: request.course });
        await Course.findByIdAndUpdate(request.course, { numCOs: totalCOs });

      } catch (applyError) {
        console.error("Error applying approved changes:", applyError);
        request.status = "in_review";
        request.adminNote = (request.adminNote || "") + " [System: Failed to apply changes. Please try again.]";
        await request.save();
        return res.status(500).json({
          message: "Request was approved but changes could not be applied. Status reverted to in_review.",
          error: applyError.message,
        });
      }
    }

    res.status(200).json({
      message: `Request status updated to '${status}' successfully.${status === "approved" ? " Changes have been applied to the course database." : ""}`,
      request,
    });
  } catch (error) {
    console.error("Error updating request status:", error);
    res.status(500).json({ message: "Failed to update request status.", error: error.message });
  }
});

export default router;
