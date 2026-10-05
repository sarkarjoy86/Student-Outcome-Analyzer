import mongoose from 'mongoose'

const archivedQuestionBankSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  courseCodeKey: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true
  },
  normalizedName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  semester: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true
  },
  assessmentType: {
    type: String,
    required: true,
    trim: true,
    enum: ['midTerm', 'final', 'cts', 'assignment', 'other'],
    index: true
  },
  assessmentName: {
    type: String,
    required: true,
    trim: true
  },
  questions: [{
    sl: Number,
    text: String
  }],
  numQuestions: {
    type: Number,
    default: 0
  },
  content: {
    type: String,
    default: ''
  },
  rawText: {
    type: String,
    default: ''
  },
  isArchivedDataset: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false,
  timestamps: true
})

// Compound index for fast lookup by code or semester
archivedQuestionBankSchema.index({ courseCodeKey: 1, semester: 1, assessmentType: 1 })

export default mongoose.models.ArchivedQuestionBank || mongoose.model('ArchivedQuestionBank', archivedQuestionBankSchema)
