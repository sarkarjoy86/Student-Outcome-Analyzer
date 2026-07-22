import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      unique: true,
      trim: true, // e.g. "CSE 213"
    },
    courseName: {
      type: String,
      required: true,
      trim: true, // e.g. "Object Oriented Programming"
    },
    creditHours: {
      type: Number,
      required: true,
      default: 3,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    numCOs: {
      type: Number,
      required: true,
      default: 4,
    },
    level: {
      type: String,
      default: "1",
      trim: true,
    },
    term: {
      type: String,
      default: "I",
      trim: true,
    },
    coPoMapping: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false },
);

export default mongoose.models.Course || mongoose.model("Course", courseSchema);
