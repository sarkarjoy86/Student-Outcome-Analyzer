import mongoose from 'mongoose'

const assessmentSchema = new mongoose.Schema({
  courseOffering: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering',
    required: true
  },
  type: {
    type: String,
    enum: ['cts', 'midTerm', 'final', 'assignments', 'attendance', 'performance', 'presentation'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 0
  },
  co: {
    type: String,
    trim: true,
    default: '' // Can be empty if no CO is mapped yet (e.g. for Others, or before mapping)
  },
  numQuestions: {
    type: Number,
    default: 0
  },
  examDuration: {
    type: String,
    default: ''
  },
  deadline: {
    type: Date,
    default: null
  },
  level: {
    type: String,
    default: ''
  },
  term: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Evaluated'],
    default: 'Draft'
  },
  isExtraCT: {
    type: Boolean,
    default: false
  },
  parentCTName: {
    type: String,
    trim: true,
    default: ''
  },
  parentCTId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false })

export default mongoose.models.Assessment || mongoose.model('Assessment', assessmentSchema)
