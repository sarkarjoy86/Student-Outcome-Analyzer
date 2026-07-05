import mongoose from 'mongoose'

const coAttainmentSchema = new mongoose.Schema({
  courseOffering: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering',
    required: true
  },
  co: {
    type: String,
    required: true
  },
  passMarksPercentage: {
    type: Number,
    default: 0
  },
  kpiPercentage: {
    type: Number,
    default: 0
  },
  attained: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false })

coAttainmentSchema.index({ courseOffering: 1, co: 1 }, { unique: true })

export default mongoose.models.COAttainment || mongoose.model('COAttainment', coAttainmentSchema)
