import mongoose from 'mongoose'

const surveyCustomQuestionSchema = new mongoose.Schema({
  surveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
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
    enum: ['Section 1', 'Section 2', 'Section 3', 'Section 4', 'Section 5']
  },
  coMapping: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    required: true
  }
}, { versionKey: false })

export default mongoose.models.SurveyCustomQuestion || mongoose.model('SurveyCustomQuestion', surveyCustomQuestionSchema)
