import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batchName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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

batchSchema.virtual("name").get(function () {
  return this.batchName;
}).set(function (val) {
  this.batchName = val;
});

export default mongoose.models.Batch || mongoose.model("Batch", batchSchema);
