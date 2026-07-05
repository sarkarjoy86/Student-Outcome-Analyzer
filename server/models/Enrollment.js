import mongoose from 'mongoose'

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  courseOffering: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false })

// Ensure a student can only be enrolled in a course offering once
enrollmentSchema.index({ student: 1, courseOffering: 1 }, { unique: true })

export default mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema)
