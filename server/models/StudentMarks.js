import mongoose from 'mongoose'

const studentMarksSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },
  courseOffering: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering',
    required: true
  },
  questionMarks: [{
    questionNumber: {
      type: String,
      required: true
    },
    mark: {
      type: Number,
      default: 0
    }
  }],
  totalMark: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false })

studentMarksSchema.index({ student: 1, assessment: 1 }, { unique: true })

export default mongoose.models.StudentMarks || mongoose.model('StudentMarks', studentMarksSchema)
