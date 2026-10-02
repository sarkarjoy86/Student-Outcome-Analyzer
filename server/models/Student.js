import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true, // e.g. "201-15-13492"
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
    email: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived", "migrated"],
      default: "active",
      index: true,
    },
    migrationHistory: [
      {
        fromBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
        fromSectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
        toBatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
        toSectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
        fromBatchName: { type: String, default: "" },
        fromSectionName: { type: String, default: "" },
        toBatchName: { type: String, default: "" },
        toSectionName: { type: String, default: "" },
        reason: { type: String, default: "Semester Retake / Batch Migration" },
        migratedAt: { type: Date, default: Date.now },
        migratedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

studentSchema.virtual("name").get(function () {
  return this.studentName;
}).set(function (val) {
  this.studentName = val;
});

studentSchema.virtual("batch").get(function () {
  return this.batchId;
}).set(function (val) {
  this.batchId = val;
});

export default mongoose.models.Student ||
  mongoose.model("Student", studentSchema);
