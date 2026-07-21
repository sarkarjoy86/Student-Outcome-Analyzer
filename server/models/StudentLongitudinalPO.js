import mongoose from 'mongoose';

const studentLongitudinalPOSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true,
  },
  studentId: {
    type: String,
    required: true,
    index: true,
  },
  studentName: {
    type: String,
    default: '',
  },
  email: {
    type: String,
    default: '',
  },
  batch: {
    type: String,
    default: 'N/A',
  },
  section: {
    type: String,
    default: 'N/A',
  },
  threshold: {
    type: Number,
    default: 60,
  },
  cgpa: {
    type: Number,
    default: 0,
  },
  totalAttemptedCredits: {
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
  recommendationStatus: {
    type: String,
    enum: [
      'Eligible for Recommendation',
      'Not Recommended (PO Gap Detected)',
      'Conditional (Low CGPA)',
      'Ineligible (Low CGPA & PO Gaps)',
    ],
    default: 'Ineligible (Low CGPA & PO Gaps)',
  },
  badgeColor: {
    type: String,
    default: 'red',
  },
  weakPOCount: {
    type: Number,
    default: 0,
  },
  weakPOs: [{
    po: String,
    attainment: Number,
    description: String,
    gapPercentage: Number,
  }],
  poAttainments: {
    type: Map,
    of: Number,
    default: {},
  },
  longitudinalPOs: [{
    po: String,
    name: String,
    attainment: Number,
    threshold: Number,
    isPassed: Boolean,
    mappedCredits: Number,
    evaluatedCoursesCount: Number,
  }],
  completedCourses: [{
    courseOfferingId: mongoose.Schema.Types.ObjectId,
    courseCode: String,
    courseTitle: String,
    creditHours: Number,
    semester: String,
    academicYear: String,
    obtainedMarks: Number,
    maxMarks: Number,
    percentage: Number,
    letterGrade: String,
    gradePoint: Number,
    poAttainments: mongoose.Schema.Types.Mixed,
  }],
  completedCoursesCount: {
    type: Number,
    default: 0,
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
  lastCalculatedAt: {
    type: Date,
    default: Date.now,
  },
}, { versionKey: false });

export default mongoose.models.StudentLongitudinalPO || mongoose.model('StudentLongitudinalPO', studentLongitudinalPOSchema);
