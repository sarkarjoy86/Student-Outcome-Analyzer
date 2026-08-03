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

async function resolveSurveyForOffering(offeringId) {
  if (!offeringId) return null;
  let surveyDoc = await Survey.findOne({ courseOfferingId: offeringId });
  if (surveyDoc) return surveyDoc;

  const offering = await CourseOffering.findById(offeringId);
  if (!offering || !offering.teacher) return null;

  const sisterFilter = {
    course: offering.course,
    batch: offering.batch,
    teacher: offering.teacher,
    _id: { $ne: offering._id }
  };
  if (offering.semester) sisterFilter.semester = offering.semester;

  const sisterOfferings = await CourseOffering.find(sisterFilter);
  if (sisterOfferings.length === 0) return null;

  const sisterOfferingIds = sisterOfferings.map(s => s._id);
  surveyDoc = await Survey.findOne({ courseOfferingId: { $in: sisterOfferingIds } });
  return surveyDoc;
}

// 1. Get survey config for a specific course offering
router.get('/surveys/offering/:offeringId', requireAuth, async (req, res) => {
  try {
    const { offeringId } = req.params
    const surveyDoc = await resolveSurveyForOffering(offeringId)
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

    // Check if a survey already exists for this course offering or a same-teacher sister offering
    let surveyDoc = await resolveSurveyForOffering(courseOfferingId)
    if (surveyDoc) {
      const survey = await getCombinedSurvey(surveyDoc)
      return res.status(200).json({ message: 'A survey already exists for this course offering and teacher.', survey })
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
      surveyDoc.closeDate = new Date(closeDate)
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
      return res.status(400).json({ message: `This survey is not open yet. It will open on ${(() => { const d = new Date(surveyDoc.openDate); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + ', ' + d.getFullYear(); })()}.` })
    }


    const survey = await getCombinedSurvey(surveyDoc)
    res.status(200).json({ survey })
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving survey details', error: error.message })
  }
})

async function checkStudentSurveyAccess(student, primaryOffering) {
  if (!primaryOffering) return false;
  
  const directEnrolled = await Enrollment.findOne({ student: student._id, courseOffering: primaryOffering._id });
  if (directEnrolled) return true;

  if (!primaryOffering.batch || !primaryOffering.teacher) return false;

  const CourseOfferingModel = mongoose.model('CourseOffering');
  const SectionModel = mongoose.model('Section');

  const sameTeacherFilter = {
    course: primaryOffering.course?._id || primaryOffering.course,
    batch: primaryOffering.batch?._id || primaryOffering.batch,
    teacher: primaryOffering.teacher?._id || primaryOffering.teacher
  };
  if (primaryOffering.semester) {
    sameTeacherFilter.semester = primaryOffering.semester?._id || primaryOffering.semester;
  }

  const sameTeacherOfferings = await CourseOfferingModel.find(sameTeacherFilter);
  const offeringIds = sameTeacherOfferings.map(o => o._id);

  const sisterEnrolled = await Enrollment.findOne({
    student: student._id,
    courseOffering: { $in: offeringIds }
  });
  if (sisterEnrolled) return true;

  if (student.batchId && student.batchId.toString() === (primaryOffering.batch._id || primaryOffering.batch).toString()) {
    for (const off of sameTeacherOfferings) {
      const sectionDoc = await SectionModel.findOne({ batchId: off.batch, sectionName: off.section });
      const sectionId = sectionDoc ? sectionDoc._id : null;
      if (!sectionId || (student.sectionId && student.sectionId.toString() === sectionId.toString())) {
        return true;
      }
    }
  }

  return false;
}

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
    const closeDate = new Date(surveyDoc.closeDate)
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const deadlineDate = new Date(closeDate.getFullYear(), closeDate.getMonth(), closeDate.getDate())
    if (todayDate > deadlineDate) {
      return res.status(400).json({ message: 'This survey is closed. The submission deadline has passed.' })
    }

    // Resolve Student by manually entered Student ID
    const student = await Student.findOne({ studentId: studentId.trim() }).populate('batchId sectionId')
    if (!student) {
      return res.status(400).json({ message: `Student profile not found for Student ID "${studentId}".` })
    }

    // Validate Student Enrollment across same-teacher offerings
    const primaryOffering = await mongoose.model('CourseOffering').findById(surveyDoc.courseOfferingId);
    const hasAccess = await checkStudentSurveyAccess(student, primaryOffering);

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
    const closeDate = new Date(surveyDoc.closeDate)
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const deadlineDate = new Date(closeDate.getFullYear(), closeDate.getMonth(), closeDate.getDate())
    
    const openDate = new Date(surveyDoc.openDate)
    const openDateZero = new Date(openDate.getFullYear(), openDate.getMonth(), openDate.getDate())
    
    if (todayDate < openDateZero || todayDate > deadlineDate) {
      return res.status(400).json({ message: 'This survey is not open for submission.' })
    }

    // Resolve Student by studentId string
    const student = await Student.findOne({ studentId: studentId.trim() }).populate('batchId sectionId')
    if (!student) {
      return res.status(400).json({ message: `Student profile not found for Student ID "${studentId}".` })
    }

    // Validate Student Enrollment across same-teacher offerings
    const primaryOffering = await mongoose.model('CourseOffering').findById(surveyDoc.courseOfferingId);
    const hasAccess = await checkStudentSurveyAccess(student, primaryOffering);

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

    // Get total enrolled students across all sections taught by this teacher for this course & batch
    const offering = surveyDoc.courseOfferingId
    let totalStudents = 0

    if (offering && offering.batch && offering.teacher) {
      const CourseOfferingModel = mongoose.model('CourseOffering')
      const SectionModel = mongoose.model('Section')

      const sameTeacherFilter = {
        course: offering.course?._id || offering.course,
        batch: offering.batch?._id || offering.batch,
        teacher: offering.teacher?._id || offering.teacher
      }
      if (offering.semester) {
        sameTeacherFilter.semester = offering.semester?._id || offering.semester
      }

      const sameTeacherOfferings = await CourseOfferingModel.find(sameTeacherFilter)
      const offeringIds = sameTeacherOfferings.map(o => o._id)

      const enrollments = await Enrollment.find({ courseOffering: { $in: offeringIds } })
      totalStudents = enrollments.length

      if (totalStudents === 0 && offering.batch) {
        for (const off of sameTeacherOfferings) {
          const sectionDoc = await SectionModel.findOne({ batchId: off.batch, sectionName: off.section })
          const sectionId = sectionDoc ? sectionDoc._id : null
          const query = { batchId: off.batch }
          if (sectionId) query.sectionId = sectionId
          const count = await Student.countDocuments(query)
          totalStudents += count
        }
      }
    } else {
      const enrollments = await Enrollment.find({ courseOffering: offering._id })
      totalStudents = enrollments.length
    }

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
