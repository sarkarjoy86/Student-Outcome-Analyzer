import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    sectionName: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

// Ensure unique section name per batch
sectionSchema.index({ batchId: 1, sectionName: 1 }, { unique: true });

export default mongoose.models.Section || mongoose.model("Section", sectionSchema);
