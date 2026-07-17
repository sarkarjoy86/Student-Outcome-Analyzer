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
