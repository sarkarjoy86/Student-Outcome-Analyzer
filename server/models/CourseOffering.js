import mongoose from "mongoose";

const courseOfferingSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      default: null,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    academicYear: {
      type: Number,
      default: null,
    },
    coPoMapping: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    targetPassMarks: {
      type: Number,
      default: 40,
    },
    kpiCO: {
      type: Number,
      default: 50,
    },
    kpiPO: {
      type: Number,
      default: 50,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false },
);

export default mongoose.models.CourseOffering ||
  mongoose.model("CourseOffering", courseOfferingSchema);
