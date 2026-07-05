import mongoose from 'mongoose'

const academicSessionSchema = new mongoose.Schema({
  semesterName: {
    type: String,
    required: true, // e.g. "Spring 2025"
    trim: true
  },
  academicYear: {
    type: Number,
    required: true // e.g. 2025
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false })

export default mongoose.models.AcademicSession || mongoose.model('AcademicSession', academicSessionSchema)
