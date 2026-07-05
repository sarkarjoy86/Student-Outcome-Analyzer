import mongoose from "mongoose";

const programOutcomeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false },
);

export default mongoose.models.ProgramOutcome ||
  mongoose.model("ProgramOutcome", programOutcomeSchema);
