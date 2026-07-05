import mongoose from 'mongoose'

const marksSchema = new mongoose.Schema({
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
  mark: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false })

// Ensure that a student has only one mark entry per assessment
marksSchema.index({ student: 1, assessment: 1 }, { unique: true })

export default mongoose.models.Marks || mongoose.model('Marks', marksSchema)
