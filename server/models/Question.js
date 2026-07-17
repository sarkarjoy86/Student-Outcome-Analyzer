import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
  evaluationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evaluation',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    required: true,
    default: 'Section 1'
  },
  order: {
    type: Number,
    required: true
  }
}, { versionKey: false })

export default mongoose.models.Question || mongoose.model('Question', questionSchema)
