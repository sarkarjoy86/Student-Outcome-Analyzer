import mongoose from "mongoose";

const copoRequestSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherName: {
      type: String,
      required: true,
      trim: true,
    },
    teacherEmail: {
      type: String,
      trim: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    courseCode: {
      type: String,
      trim: true,
    },
    courseName: {
      type: String,
      trim: true,
    },
    courseOffering: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseOffering",
      default: null,
    },
    // 'edit_mapping' | 'add_co' | 'add_co_with_mapping'
    requestType: {
      type: String,
      enum: ["edit_mapping", "add_co", "add_co_with_mapping"],
      required: true,
    },
    // The full proposed coPoMapping object (snapshot of the entire table after edits)
    proposedMapping: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // The original coPoMapping at time of request (for diff comparison)
    originalMapping: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // New COs proposed by the teacher
    proposedCOs: [
      {
        code: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],
    // Modified descriptions of existing COs
    editedCOs: [
      {
        code: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],
    // CO codes marked for deletion
    deletedCOs: [
      { type: String, trim: true },
    ],
    // Human-readable summary of changes
    changesSummary: {
      type: String,
      default: "",
    },
    // 'pending' | 'in_review' | 'approved' | 'rejected'
    status: {
      type: String,
      enum: ["pending", "in_review", "approved", "rejected"],
      default: "pending",
    },
    // Admin's comment on approval/rejection
    adminNote: {
      type: String,
      default: "",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
  },
  { versionKey: false, timestamps: false }
);

// Index for efficient querying
copoRequestSchema.index({ status: 1, submittedAt: -1 });
copoRequestSchema.index({ teacher: 1, course: 1, status: 1 });

export default mongoose.models.COPORequest ||
  mongoose.model("COPORequest", copoRequestSchema, "copo_requests");
