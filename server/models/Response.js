import mongoose from 'mongoose'

const responseSchema = new mongoose.Schema({
  evaluationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Evaluation',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  ratings: {
    type: Map,
    of: Number, // Maps question index or text to rating number (1-5)
    required: true
  },
  comments: {
    learned: { type: String, default: '' },
    enjoyed: { type: String, default: '' },
    difficult: { type: String, default: '' },
    improved: { type: String, default: '' },
    teacherSuggestions: { type: String, default: '' },
    deptSuggestions: { type: String, default: '' },
    additionalComments: { type: String, default: '' },
    suggestions: { type: String, default: '' }
  },
  ratingsGrouped: {
    type: Map,
    of: [{
      questionText: { type: String },
      rating: { type: Number },
      originalIndex: { type: Number }
    }]
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false })

export default mongoose.models.Response || mongoose.model('Response', responseSchema)
