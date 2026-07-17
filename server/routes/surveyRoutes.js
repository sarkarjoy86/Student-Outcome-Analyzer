import express from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import Survey from '../models/Survey.js'
import SurveyCustomQuestion from '../models/SurveyCustomQuestion.js'
import SurveyResponse from '../models/SurveyResponse.js'
import Student from '../models/Student.js'
import Enrollment from '../models/Enrollment.js'
import CourseOffering from '../models/CourseOffering.js'
import Section from '../models/Section.js'
import { logActivity } from '../utils/activityLogger.js'

const router = express.Router()

const DEFAULT_SURVEY_QUESTIONS = [
  // Section 1
  { text: 'The course clearly stated learning outcomes.', section: 'Section 1', order: 1 },
  { text: 'The course helped develop my problem-solving skills.', section: 'Section 1', order: 2 },
  { text: 'I was able to apply engineering principles effectively.', section: 'Section 1', order: 3 },
  { text: 'The course improved my teamwork and collaboration skills.', section: 'Section 1', order: 4 },
  { text: 'The course emphasized ethical and professional responsibility.', section: 'Section 1', order: 5 },
  // Section 2
  { text: 'The course content was relevant and well-structured.', section: 'Section 2', order: 6 },
  { text: 'The balance between theory and practical applications was appropriate.', section: 'Section 2', order: 7 },
  { text: 'The assignments and projects were useful for understanding the material.', section: 'Section 2', order: 8 },
  { text: 'The course used modern engineering problems effectively.', section: 'Section 2', order: 9 },
  { text: 'The laboratory/tutorial sessions were helpful in reinforcing concepts.', section: 'Section 2', order: 10 },
  // Section 3
  { text: 'The instructor communicated concepts clearly.', section: 'Section 3', order: 11 },
  { text: 'The instructor was responsive to questions and concerns.', section: 'Section 3', order: 12 },
  { text: 'The instructor encouraged critical thinking and innovation.', section: 'Section 3', order: 13 },
  { text: 'The instructor provided useful feedback on assignments.', section: 'Section 3', order: 14 },
  { text: 'The instructor maintained a positive and engaging classroom environment.', section: 'Section 3', order: 15 },
  // Section 4
  { text: 'The grading and evaluation methods were fair and transparent.', section: 'Section 4', order: 16 },
  { text: 'The course workload was appropriate for the credit hours.', section: 'Section 4', order: 17 },
  { text: 'The exams and assessments reflected the course content.', section: 'Section 4', order: 18 },
  { text: 'The course helped in developing my communication skills.', section: 'Section 4', order: 19 },
  { text: 'The course supported lifelong learning and professional development.', section: 'Section 4', order: 20 },
  // Section 5
  { text: 'Hand on application scope on basic science and math', section: 'Section 5', coMapping: 'CO1', order: 21 },
  { text: 'Research and analytic capacity to design a long term solution to a practical problem', section: 'Section 5', coMapping: 'CO2', order: 22 },
  { text: 'Possibilities to use modern hardware and software to solve complex engineering challenges', section: 'Section 5', coMapping: 'CO3', order: 23 },
  { text: 'Scope of practicing social relevance and ethics with professionalism', section: 'Section 5', coMapping: 'CO4', order: 24 },
  { text: 'Chances of teamwork with effective communication skills, financial and project management skill', section: 'Section 5', coMapping: 'CO5', order: 25 },
  { text: 'Scope of achieving lifelong learning through the course', section: 'Section 5', coMapping: 'CO6', order: 26 }
]

// Helper function to return combined survey with custom questions
async function getCombinedSurvey(surveyDoc) {
  if (!surveyDoc) return null;
  const customQuestions = await SurveyCustomQuestion.find({ surveyId: surveyDoc._id }).sort({ order: 1 })
  const survey = surveyDoc.toObject()
  survey.questions = [...DEFAULT_SURVEY_QUESTIONS, ...customQuestions.map(q => ({
    text: q.text,
    section: q.section,
    coMapping: q.coMapping,
    order: q.order
  }))]
  return survey
}

// 1. Get survey config for a specific course offering
router.get('/surveys/offering/:offeringId', requireAuth, async (req, res) => {
  try {
    const { offeringId } = req.params
    const surveyDoc = await Survey.findOne({ courseOfferingId: offeringId })
    if (!surveyDoc) {
      return res.status(200).json({ survey: null })
    }
    const survey = await getCombinedSurvey(surveyDoc)
    res.status(200).json({ survey })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching survey config', error: error.message })
  }
})

// 2. Create a new draft survey config for a course offering
router.post('/surveys', requireAuth, async (req, res) => {
  try {
    const { courseOfferingId, title, openDate, closeDate, description } = req.body

    if (!courseOfferingId || !title || !openDate || !closeDate) {
      return res.status(400).json({ message: 'Course offering, title, open date, and close date are required.' })
    }

    const offering = await CourseOffering.findById(courseOfferingId)
    if (!offering) {
      return res.status(404).json({ message: 'Course offering not found' })
    }

    // Check if a survey already exists for this course offering
    let surveyDoc = await Survey.findOne({ courseOfferingId })
    if (surveyDoc) {
      return res.status(400).json({ message: 'A survey already exists for this course offering.' })
    }

    const tempId = `SRV-TEMP-${Date.now()}`

    // Calculate the last day of the corresponding month for closeDate
    let finalCloseDate = closeDate
    if (closeDate) {
      const d = new Date(closeDate)
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      finalCloseDate = lastDay
    }

    surveyDoc = await Survey.create({
      courseOfferingId,
      teacherId: req.user._id === 'admin-local' ? new mongoose.Types.ObjectId() : req.user._id,
      surveyId: tempId,
      title,
      description: description || '',
      openDate,
      closeDate: finalCloseDate,
      status: 'Draft'
    })

    const survey = await getCombinedSurvey(surveyDoc)
    await logActivity(courseOfferingId, req.user._id, 'Survey Created', `Created course survey: "${title}"`)
    res.status(201).json({ message: 'Survey created successfully.', survey })
  } catch (error) {
    res.status(500).json({ message: 'Error creating survey config', error: error.message })
  }
})

// 3. Update survey config details and questions
router.put('/surveys/:id', requireAuth, async (req, res) => {
  try {
    const { title, openDate, closeDate, description, questions } = req.body
    const surveyDoc = await Survey.findById(req.params.id)
    if (!surveyDoc) {
      return res.status(404).json({ message: 'Survey not found' })
    }

    if (title) surveyDoc.title = title
    if (openDate) surveyDoc.openDate = openDate
    if (closeDate) {
      const d = new Date(closeDate)
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      surveyDoc.closeDate = lastDay
    }
    if (description !== undefined) surveyDoc.description = description
    
    await surveyDoc.save()

    if (Array.isArray(questions)) {
      // Find custom questions
      const baseTexts = new Set(DEFAULT_SURVEY_QUESTIONS.map(q => q.text.toLowerCase().trim()))
      const customQsInput = questions.filter(q => q.text && !baseTexts.has(q.text.toLowerCase().trim()))

      // Clean existing custom questions
      await SurveyCustomQuestion.deleteMany({ surveyId: surveyDoc._id })

      // Insert new custom questions
      if (customQsInput.length > 0) {
        const customModels = customQsInput.map((q, idx) => ({
          surveyId: surveyDoc._id,
          text: q.text,
          section: q.section || 'Section 1',
          coMapping: q.coMapping || '',
          order: DEFAULT_SURVEY_QUESTIONS.length + 1 + idx
        }))
        await SurveyCustomQuestion.insertMany(customModels)
      }
    }

    const survey = await getCombinedSurvey(surveyDoc)
    await logActivity(surveyDoc.courseOfferingId, req.user._id, 'Survey Updated', `Updated course survey: "${surveyDoc.title}"`)
    res.status(200).json({ message: 'Survey updated successfully.', survey })
  } catch (error) {
    res.status(500).json({ message: 'Error updating survey config', error: error.message })
  }
})

// 3b. Reset survey to defaults - delete all custom questions
router.post('/surveys/:id/reset-defaults', requireAuth, async (req, res) => {
  try {
    const surveyDoc = await Survey.findById(req.params.id)
    if (!surveyDoc) {
      return res.status(404).json({ message: 'Survey not found' })
    }
    await SurveyCustomQuestion.deleteMany({ surveyId: surveyDoc._id })
    const survey = await getCombinedSurvey(surveyDoc)
    await logActivity(surveyDoc.courseOfferingId, req.user._id, 'Survey Reset', `Reset survey to defaults for: "${surveyDoc.title}"`)
    res.status(200).json({ message: 'Survey reset to defaults.', survey })
  } catch (error) {
    res.status(500).json({ message: 'Error resetting survey', error: error.message })
  }
})

// 4. Publish survey: Generate unique ID, public URL, QR code and set status to Published
router.post('/surveys/:id/publish', requireAuth, async (req, res) => {
  try {
    const surveyDoc = await Survey.findById(req.params.id).populate({
      path: 'courseOfferingId',
      populate: ['course', 'batch', 'semester']
    })

    if (!surveyDoc) {
      return res.status(404).json({ message: 'Survey not found' })
    }

    const offering = surveyDoc.courseOfferingId
    const courseCode = offering?.course?.courseCode || 'COURSE'
    
    const publishedCount = await Survey.countDocuments({ status: 'Published' })
    const academicYear = offering?.academicYear || new Date().getFullYear()
    const indexStr = String(publishedCount + 1).padStart(3, '0')
    const finalSurveyId = `SRV-${courseCode}-${academicYear}-${indexStr}`

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    const publicLink = `${clientUrl}?feedbackId=${finalSurveyId}`
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicLink)}`

    surveyDoc.surveyId = finalSurveyId
    surveyDoc.publicLink = publicLink
    surveyDoc.qrCode = qrCode
    surveyDoc.status = 'Published'

    await surveyDoc.save()

    const survey = await getCombinedSurvey(surveyDoc)
    await logActivity(surveyDoc.courseOfferingId, req.user._id, 'Survey Published', `Published course survey: "${surveyDoc.title}"`)
    res.status(200).json({ message: 'Survey published successfully.', survey })
  } catch (error) {
    res.status(500).json({ message: 'Error publishing survey', error: error.message })
  }
})

// 5. Delete survey config and all responses
router.delete('/surveys/:id', requireAuth, async (req, res) => {
  try {
    const surveyDoc = await Survey.findById(req.params.id)
    if (!surveyDoc) {
      return res.status(404).json({ message: 'Survey not found' })
    }

    await Survey.findByIdAndDelete(req.params.id)
    await SurveyCustomQuestion.deleteMany({ surveyId: req.params.id })
    await SurveyResponse.deleteMany({ surveyId: req.params.id })

    await logActivity(surveyDoc.courseOfferingId, req.user._id, 'Survey Deleted', `Deleted course survey: "${surveyDoc.title}"`)
    res.status(200).json({ message: 'Survey and all associated responses deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting survey', error: error.message })
  }
})

// 6. Public student route - Get survey details for feedback form
router.get('/public/surveys/:id', async (req, res) => {
  try {
    const { id } = req.params
    // Find by surveyId first, then by mongo _id
    let surveyDoc = await Survey.findOne({ surveyId: id }).populate({
      path: 'courseOfferingId',
      populate: ['course', 'batch', 'semester', 'teacher']
    })

    if (!surveyDoc) {
      surveyDoc = await Survey.findById(id).populate({
        path: 'courseOfferingId',
        populate: ['course', 'batch', 'semester', 'teacher']
      })
    }

    if (!surveyDoc) {
      return res.status(404).json({ message: 'Survey form not found.' })
    }

    if (surveyDoc.status !== 'Published') {
      return res.status(400).json({ message: 'This survey has not been published yet.' })
    }

    const now = new Date()
    if (now < new Date(surveyDoc.openDate)) {
      return res.status(400).json({ message: `This survey is not open yet. It will open on ${new Date(surveyDoc.openDate).toLocaleDateString()}.` })
    }
    if (now > new Date(surveyDoc.closeDate)) {
      return res.status(400).json({ message: 'This survey is closed.' })
    }

    const survey = await getCombinedSurvey(surveyDoc)
    res.status(200).json({ survey })
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving survey details', error: error.message })
  }
})

// 7. Public student route - Verify Student ID & Enrollment before starting survey
router.post('/public/surveys/:id/verify-student', async (req, res) => {
  try {
    const { id } = req.params
    const { studentId } = req.body

    if (!studentId || !studentId.trim()) {
      return res.status(400).json({ message: 'Student ID is required.' })
    }

    // Find survey
    let surveyDoc = await Survey.findOne({ surveyId: id })
    if (!surveyDoc) {
      surveyDoc = await Survey.findById(id)
    }

    if (!surveyDoc) {
      return res.status(404).json({ message: 'Survey not found.' })
    }

    const now = new Date()
    if (now > new Date(surveyDoc.closeDate)) {
      return res.status(400).json({ message: 'This survey is closed. The submission deadline has passed.' })
    }

    // Resolve Student by manually entered Student ID
    const student = await Student.findOne({ studentId: studentId.trim() }).populate('batchId sectionId')
    if (!student) {
      return res.status(400).json({ message: `Student profile not found for Student ID "${studentId}".` })
    }

    // Validate Student Enrollment
    const enrolled = await Enrollment.findOne({ student: student._id, courseOffering: surveyDoc.courseOfferingId })
    let hasAccess = !!enrolled

    if (!hasAccess && surveyDoc.courseOfferingId) {
      // Fallback matching
      const CourseOffering = mongoose.model('CourseOffering')
      const Section = mongoose.model('Section')
      const offering = await CourseOffering.findById(surveyDoc.courseOfferingId)
      if (offering && offering.batch) {
        const sectionDoc = await Section.findOne({ 
          batchId: offering.batch, 
          sectionName: offering.section 
        })
        const sectionId = sectionDoc ? sectionDoc._id : null
        
        const studentInSection = student.batchId?.toString() === offering.batch.toString() &&
                                 (!sectionId || (student.sectionId && student.sectionId.toString() === sectionId.toString()))
        
        if (studentInSection) {
          hasAccess = true
        }
      }
    }

    if (!hasAccess) {
      return res.status(400).json({ message: 'You are not enrolled in this course offering.' })
    }

    // Check duplicate submission
    const existingResponse = await SurveyResponse.findOne({ surveyId: surveyDoc._id, studentId: student._id })
    if (existingResponse) {
      return res.status(400).json({ message: 'You have already submitted a response for this survey.' })
    }

    res.status(200).json({ success: true, message: 'Student enrollment verified.' })
  } catch (error) {
    res.status(500).json({ message: 'Error verifying student ID', error: error.message })
  }
})

// 8. Public student route - Submit survey feedback response
router.post('/public/surveys/:id/submit', async (req, res) => {
  try {
    const { id } = req.params
    const { ratings, comments, studentId } = req.body

    if (!ratings) {
      return res.status(400).json({ message: 'Ratings are required.' })
    }
    if (!studentId || !studentId.trim()) {
      return res.status(400).json({ message: 'Student ID is required.' })
    }

    // Find survey
    let surveyDoc = await Survey.findOne({ surveyId: id })
    if (!surveyDoc) {
      surveyDoc = await Survey.findById(id)
    }

    if (!surveyDoc) {
      return res.status(404).json({ message: 'Survey not found' })
    }

    const now = new Date()
    if (now < new Date(surveyDoc.openDate) || now > new Date(surveyDoc.closeDate)) {
      return res.status(400).json({ message: 'This survey is not open for submission.' })
    }

    // Resolve Student by studentId string
    const student = await Student.findOne({ studentId: studentId.trim() }).populate('batchId sectionId')
    if (!student) {
      return res.status(400).json({ message: `Student profile not found for Student ID "${studentId}".` })
    }

    // Validate Student Enrollment
    const enrolled = await Enrollment.findOne({ student: student._id, courseOffering: surveyDoc.courseOfferingId })
    let hasAccess = !!enrolled

    if (!hasAccess && surveyDoc.courseOfferingId) {
      const CourseOffering = mongoose.model('CourseOffering')
      const Section = mongoose.model('Section')
      const offering = await CourseOffering.findById(surveyDoc.courseOfferingId)
      if (offering && offering.batch) {
        const sectionDoc = await Section.findOne({ 
            batchId: offering.batch, 
            sectionName: offering.section 
          })
        const sectionId = sectionDoc ? sectionDoc._id : null
        
        const studentInSection = student.batchId?.toString() === offering.batch.toString() &&
                                 (!sectionId || (student.sectionId && student.sectionId.toString() === sectionId.toString()))
        
        if (studentInSection) {
          hasAccess = true
        }
      }
    }

    if (!hasAccess) {
      return res.status(400).json({ message: 'You are not enrolled in this course offering.' })
    }

    // Check duplicate submission
    const existingResponse = await SurveyResponse.findOne({ surveyId: surveyDoc._id, studentId: student._id })
    if (existingResponse) {
      return res.status(400).json({ message: 'You have already submitted a response for this survey.' })
    }

    // Create Survey Response Anonymously (exclude name and email)
    const responseDoc = await SurveyResponse.create({
      surveyId: surveyDoc._id,
      studentId: student._id,
      ratings,
      comments: comments || {}
    })

    res.status(201).json({ message: 'Survey response submitted successfully. Thank you!', response: responseDoc })
  } catch (error) {
    res.status(500).json({ message: 'Error submitting survey response', error: error.message })
  }
})

// 8. Get survey analytics (Authenticated, teachers/admins)
router.get('/surveys/:id/analytics', requireAuth, async (req, res) => {
  try {
    const surveyDoc = await Survey.findById(req.params.id).populate({
      path: 'courseOfferingId',
      populate: ['course', 'batch', 'semester', 'teacher']
    })
    
    if (!surveyDoc) {
      return res.status(404).json({ message: 'Survey not found' })
    }

    const survey = await getCombinedSurvey(surveyDoc)

    // Fetch all responses
    const responses = await SurveyResponse.find({ surveyId: surveyDoc._id }).populate('studentId')

    // Get total enrolled students
    const offering = surveyDoc.courseOfferingId
    const enrollments = await Enrollment.find({ courseOffering: offering._id })
    const totalStudents = enrollments.length

    res.status(200).json({
      survey,
      responses,
      totalStudents
    })
  } catch (error) {
    res.status(500).json({ message: 'Error loading survey analytics', error: error.message })
  }
})

export default router
