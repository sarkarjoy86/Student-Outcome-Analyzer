import mongoose from 'mongoose'

const surveyResponseSchema = new mongoose.Schema({
  surveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
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
    trim: true
  },
  ratings: {
    type: Map,
    of: Number, // Maps question text/id to rating number (1-5 or 2-10)
    required: true
  },
  comments: {
    type: Map,
    of: String, // Maps comment question text/key to student comment string
    default: {}
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false })

export default mongoose.models.SurveyResponse || mongoose.model('SurveyResponse', surveyResponseSchema)
