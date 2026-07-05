import mongoose from 'mongoose'

const poAttainmentSchema = new mongoose.Schema({
  courseOffering: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering',
    required: true
  },
  po: {
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

poAttainmentSchema.index({ courseOffering: 1, po: 1 }, { unique: true })

export default mongoose.models.POAttainment || mongoose.model('POAttainment', poAttainmentSchema)
