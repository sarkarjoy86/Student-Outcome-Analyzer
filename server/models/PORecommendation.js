import mongoose from 'mongoose';

const poRecommendationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  studentIdStr: {
    type: String,
    required: true,
    index: true,
  },
  threshold: {
    type: Number,
    default: 60, // Minimum PO attainment threshold percentage
  },
  cgpa: {
    type: Number,
    default: 0,
  },
  overallPoAttainment: {
    type: Number,
    default: 0,
  },
  recommendationScore: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: [
      'Eligible for Recommendation',
      'Not Recommended (PO Gap Detected)',
      'Conditional (Low CGPA)',
      'Ineligible (Low CGPA & PO Gaps)',
    ],
    default: 'Ineligible (Low CGPA & PO Gaps)',
  },
  weakPOs: [{
    po: String,
    attainment: Number,
    description: String,
  }],
  poAttainments: {
    type: Map,
    of: Number,
    default: {},
  },
  facultyNotes: {
    type: String,
    default: '',
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { versionKey: false });

poRecommendationSchema.index({ student: 1 }, { unique: true });

export default mongoose.models.PORecommendation || mongoose.model('PORecommendation', poRecommendationSchema);
