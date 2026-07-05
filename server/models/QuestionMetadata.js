import mongoose from 'mongoose'

const questionMetadataSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
    unique: true
  },
  courseOffering: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering',
    required: true
  },
  questions: [{
    questionNumber: {
      type: String,
      required: true
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 0
    },
    co: {
      type: String,
      default: 'NONE'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false })

export default mongoose.models.QuestionMetadata || mongoose.model('QuestionMetadata', questionMetadataSchema)
