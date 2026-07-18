import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import Evaluation from '../models/Evaluation.js'
import Question from '../models/Question.js'
import Response from '../models/Response.js'
import Student from '../models/Student.js'
import Enrollment from '../models/Enrollment.js'
import CourseOffering from '../models/CourseOffering.js'
import Section from '../models/Section.js'

const router = express.Router()

const SECTION_KEYS = [
  "Section 1",
  "Section 2",
  "Section 3",
  "Section 4",
  "Section 5"
];

function getSectionIndex(qText) {
  const text = qText.toLowerCase();
  
  if (text.includes("outcome") || text.includes("learning") || text.includes("knowledge") || text.includes("skill") || text.includes("solve") || text.includes("solving") || text.includes("achievement")) {
    return 0;
  }
  if (text.includes("material") || text.includes("syllabus") || text.includes("lecture") || text.includes("resource") || text.includes("example") || text.includes("laboratory") || text.includes("delivery")) {
    return 1;
  }
  if (text.includes("explain") || text.includes("teacher") || text.includes("instructor") || text.includes("encourage") || text.includes("participation") || text.includes("classroom") || text.includes("teaching") || text.includes("communication") || text.includes("class management") || text.includes("performance")) {
    return 2;
  }
  if (text.includes("assessment") || text.includes("test") || text.includes("assignment") || text.includes("final exam") || text.includes("fair") || text.includes("workload") || text.includes("grading") || text.includes("quiz")) {
    return 3;
  }
  return 4;
}

function sortBackendQuestions(questions) {
  return [...questions].sort((a, b) => {
    const idxA = SECTION_KEYS.indexOf(a.section);
    const idxB = SECTION_KEYS.indexOf(b.section);
    if (idxA !== idxB) {
      return idxA - idxB;
    }
    return (a.order || 0) - (b.order || 0);
  }).map((q, index) => ({
    text: q.text,
    section: q.section,
    order: index + 1
  }));
}

async function resolveStudentFromUser(reqUser) {
  const userEmail = reqUser.email
  const userFullName = reqUser.fullName

  // 1. Try match where student email matches user email
  if (userEmail) {
    const student = await Student.findOne({
      email: userEmail.trim().toLowerCase()
    }).populate('batchId sectionId')
    if (student) return student
  }

  // 2. Try exact name match (case-insensitive)
  if (userFullName) {
    const student = await Student.findOne({
      studentName: { $regex: new RegExp("^" + userFullName + "$", "i") }
    }).populate('batchId sectionId')
    if (student) return student
  }

  // 3. Try to match by studentId parsed from userEmail
  if (userEmail) {
    const emailLocalPart = userEmail.split('@')[0]
    const match = emailLocalPart.match(/\d+[\d-]*/)
    if (match) {
      const student = await Student.findOne({ studentId: match[0] }).populate('batchId sectionId')
      if (student) return student
    }
  }

  // 4. Try fuzzy name match (studentName contains all words in userFullName, or vice-versa)
  if (userFullName) {
    const tokens = userFullName.trim().toLowerCase().split(/\s+/).filter(t => t.length > 2)
    if (tokens.length > 0) {
      const conditions = tokens.map(token => ({
        studentName: { $regex: new RegExp(token, 'i') }
      }))
      const student = await Student.findOne({ $and: conditions }).populate('batchId sectionId')
      if (student) return student
    }
  }

  // 5. Fallback: match by first token of userFullName
  if (userFullName) {
    const firstToken = userFullName.trim().split(/\s+/)[0]
    if (firstToken && firstToken.length > 2) {
      const student = await Student.findOne({
        studentName: { $regex: new RegExp(firstToken, 'i') }
      }).populate('batchId sectionId')
      if (student) return student
    }
  }

  // 6. Fallback: match by email local part keywords if name matches
  if (userEmail) {
    const emailLocal = userEmail.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim().toLowerCase()
    const emailTokens = emailLocal.split(/\s+/).filter(t => t.length > 2)
    if (emailTokens.length > 0) {
      const conditions = emailTokens.map(token => ({
        studentName: { $regex: new RegExp(token, 'i') }
      }))
      const student = await Student.findOne({ $and: conditions }).populate('batchId sectionId')
      if (student) return student
    }
  }

  return null
}

const DEFAULT_QUESTIONS = [
  "The course helped me acquire the intended learning outcomes.",
  "I gained significant new knowledge and skills from this course.",
  "The teacher explained the concepts clearly.",
  "Course materials were helpful.",
  "Assessment methods were fair.",
  "The teacher encouraged participation.",
  "The classroom environment was positive.",
  "Laboratory sessions were useful.",
  "Overall I am satisfied with this course."
]

// 1. Get all evaluations for a specific course offering
router.get('/evaluations/offering/:offeringId', requireAuth, async (req, res) => {
  try {
    const { offeringId } = req.params
    const evaluations = await Evaluation.find({ courseOfferingId: offeringId }).sort({ createdAt: -1 })
    res.status(200).json({ evaluations })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching evaluations', error: error.message })
  }
})

// 2. Create a new evaluation form
router.post('/evaluations', requireAuth, async (req, res) => {
  try {
    const { courseOfferingId, title, openDate, closeDate, description } = req.body
    
    if (!courseOfferingId || !title || !openDate || !closeDate) {
      return res.status(400).json({ message: 'Course offering, title, open date, and close date are required.' })
    }

    const offering = await CourseOffering.findById(courseOfferingId)
    if (!offering) {
      return res.status(404).json({ message: 'Course offering not found' })
    }

    // Set default questions
    const rawQuestions = DEFAULT_QUESTIONS.map((text, index) => ({
      text,
      section: SECTION_KEYS[getSectionIndex(text)],
      order: index + 1
    }))
    const questions = sortBackendQuestions(rawQuestions)

    // Temporary evaluationId, will be generated properly on publish
    const tempId = `TEMP-${Date.now()}`

    const evaluation = await Evaluation.create({
      courseOfferingId,
      teacherId: req.user._id,
      evaluationId: tempId,
      title,
      description: description || '',
      questions,
      openDate,
      closeDate,
      status: 'Draft'
    })

    // Also populate Question collection for schema compliance
    const questionDocs = questions.map(q => ({
      evaluationId: evaluation._id,
      text: q.text,
      section: q.section,
      order: q.order
    }))
    await Question.insertMany(questionDocs)

    res.status(201).json({ message: 'Evaluation created successfully.', evaluation })
  } catch (error) {
    res.status(500).json({ message: 'Error creating evaluation', error: error.message })
  }
})

// 3. Update evaluation details and questions
router.put('/evaluations/:id', requireAuth, async (req, res) => {
  try {
    const { title, openDate, closeDate, description, questions } = req.body
    const evaluation = await Evaluation.findById(req.params.id)
    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' })
    }

    // Prevent editing published evaluations unless they are draft
    // Actually teachers can edit description or dates or questions, but let's allow it
    if (title) evaluation.title = title
    if (openDate) evaluation.openDate = openDate
    if (closeDate) evaluation.closeDate = closeDate
    if (description !== undefined) evaluation.description = description
    
    if (Array.isArray(questions)) {
      const mappedQuestions = questions.map((q, idx) => ({
        text: q.text,
        section: q.section || SECTION_KEYS[getSectionIndex(q.text)],
        order: idx + 1
      }))
      evaluation.questions = sortBackendQuestions(mappedQuestions)

      // Sync with Question collection
      await Question.deleteMany({ evaluationId: evaluation._id })
      const qDocs = evaluation.questions.map(q => ({
        evaluationId: evaluation._id,
        text: q.text,
        section: q.section,
        order: q.order
      }))
      await Question.insertMany(qDocs)
    }

    await evaluation.save()
    res.status(200).json({ message: 'Evaluation updated successfully.', evaluation })
  } catch (error) {
    res.status(500).json({ message: 'Error updating evaluation', error: error.message })
  }
})

// 4. Delete an evaluation and associated items
router.delete('/evaluations/:id', requireAuth, async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id)
    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' })
    }

    await Evaluation.findByIdAndDelete(req.params.id)
    await Question.deleteMany({ evaluationId: req.params.id })
    await Response.deleteMany({ evaluationId: req.params.id })

    res.status(200).json({ message: 'Evaluation and all associated responses deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting evaluation', error: error.message })
  }
})

// 5. Publish evaluation: Generate unique ID, public URL, QR code, and set status to Published
router.post('/evaluations/:id/publish', requireAuth, async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id).populate({
      path: 'courseOfferingId',
      populate: ['course', 'batch', 'semester']
    })
    
    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' })
    }

    const offering = evaluation.courseOfferingId
    const courseCode = offering?.course?.courseCode || 'COURSE'
    
    // Generate Evaluation ID e.g. EV-CSE421-2026-001
    // Let's count existing published evaluations to append index
    const publishedCount = await Evaluation.countDocuments({ status: 'Published' })
    const academicYear = offering?.academicYear || new Date().getFullYear()
    const indexStr = String(publishedCount + 1).padStart(3, '0')
    const finalEvaluationId = `EV-${courseCode}-${academicYear}-${indexStr}`

    // Construct public link
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    const publicLink = `${clientUrl}?feedbackId=${finalEvaluationId}`

    // QR Code API
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicLink)}`

    evaluation.evaluationId = finalEvaluationId
    evaluation.publicLink = publicLink
    evaluation.qrCode = qrCode
    evaluation.status = 'Published'

    await evaluation.save()

    res.status(200).json({ message: 'Evaluation published successfully.', evaluation })
  } catch (error) {
    res.status(500).json({ message: 'Error publishing evaluation', error: error.message })
  }
})

// 6. Public: Retrieve questions and course details for students (Accepts evaluationId or _id)
router.get('/public/evaluations/:id', async (req, res) => {
  try {
    const { id } = req.params
    // Find by evaluationId first, then by mongo _id
    let evaluation = await Evaluation.findOne({ evaluationId: id }).populate({
      path: 'courseOfferingId',
      populate: ['course', 'batch', 'semester', 'teacher']
    })

    if (!evaluation) {
      evaluation = await Evaluation.findById(id).populate({
        path: 'courseOfferingId',
        populate: ['course', 'batch', 'semester', 'teacher']
      })
    }

    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation form not found.' })
    }

    if (evaluation.status !== 'Published') {
      return res.status(400).json({ message: 'This evaluation has not been published yet.' })
    }

    // Check if evaluation is active based on dates
    const now = new Date()
    if (now < new Date(evaluation.openDate)) {
      return res.status(400).json({ message: `This evaluation is not open yet. It will open on ${(() => { const d = new Date(evaluation.openDate); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + ', ' + d.getFullYear(); })()}.` })
    }
    if (now > new Date(evaluation.closeDate)) {
      return res.status(400).json({ message: 'This evaluation is closed.' })
    }

    res.status(200).json({ 
      evaluation,
      student: null,
      alreadySubmitted: false
    })
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving evaluation form', error: error.message })
  }
})

// 7. Public: Submit feedback response (Accepts evaluationId or _id)
router.post('/public/evaluations/:id/submit', async (req, res) => {
  try {
    const { id } = req.params
    const { ratings, comments, studentId } = req.body

    if (!ratings) {
      return res.status(400).json({ message: 'Ratings are required.' })
    }
    if (!studentId || !studentId.trim()) {
      return res.status(400).json({ message: 'Student ID is required.' })
    }

    // Find evaluation
    let evaluation = await Evaluation.findOne({ evaluationId: id }).populate({
      path: 'courseOfferingId',
      populate: ['course', 'batch', 'semester']
    })

    if (!evaluation) {
      evaluation = await Evaluation.findById(id).populate({
        path: 'courseOfferingId',
        populate: ['course', 'batch', 'semester']
      })
    }

    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' })
    }

    // Validate date range
    const now = new Date()
    if (now < new Date(evaluation.openDate) || now > new Date(evaluation.closeDate)) {
      return res.status(400).json({ message: 'This evaluation is not open for submission.' })
    }

    // Resolve Student by manually entered Student ID
    const student = await Student.findOne({ studentId: studentId.trim() }).populate('batchId sectionId')
    if (!student) {
      return res.status(400).json({ message: `Student profile not found for Student ID "${studentId}".` })
    }

    // Validate Student Enrollment
    const enrolled = await Enrollment.findOne({ student: student._id, courseOffering: evaluation.courseOfferingId._id })
    let hasAccess = !!enrolled

    if (!hasAccess && evaluation.courseOfferingId.batch) {
      const sectionDoc = await Section.findOne({ 
        batchId: evaluation.courseOfferingId.batch, 
        sectionName: evaluation.courseOfferingId.section 
      })
      const sectionId = sectionDoc ? sectionDoc._id : null
      
      const studentInSection = student.batchId?.toString() === evaluation.courseOfferingId.batch.toString() &&
                               (!sectionId || (student.sectionId && student.sectionId.toString() === sectionId.toString()))
      
      if (studentInSection) {
        await Enrollment.create({ student: student._id, courseOffering: evaluation.courseOfferingId._id })
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return res.status(400).json({ message: 'You are not enrolled in this course offering.' })
    }

    // Check duplicate submission
    const existingResponse = await Response.findOne({ evaluationId: evaluation._id, studentId: student._id })
    if (existingResponse) {
      return res.status(400).json({ message: 'You have already submitted a response for this evaluation.' })
    }

    // Construct ratingsGrouped map
    const ratingsGrouped = new Map()
    SECTION_KEYS.forEach(key => ratingsGrouped.set(key, []))

    evaluation.questions.forEach((q, idx) => {
      const ratingVal = ratings[String(idx)] !== undefined ? Number(ratings[String(idx)]) : Number(ratings[q.text])
      if (!isNaN(ratingVal)) {
        const secIdx = getSectionIndex(q.text)
        const secKey = SECTION_KEYS[secIdx]
        ratingsGrouped.get(secKey).push({
          questionText: q.text,
          rating: ratingVal,
          originalIndex: idx
        })
      }
    })

    // Create Response
    const responseDoc = await Response.create({
      evaluationId: evaluation._id,
      studentId: student._id,
      studentName: student.studentName,
      email: student.email || `${student.studentId}@student.obe.edu`,
      ratings,
      ratingsGrouped,
      comments: {
        learned: comments?.learned || '',
        enjoyed: comments?.enjoyed || '',
        difficult: comments?.difficult || '',
        improved: comments?.improved || '',
        teacherSuggestions: comments?.teacherSuggestions || '',
        deptSuggestions: comments?.deptSuggestions || '',
        additionalComments: comments?.additionalComments || '',
        suggestions: comments?.suggestions || comments?.teacherSuggestions || ''
      }
    })

    res.status(201).json({ message: 'Feedback submitted successfully. Thank you!', response: responseDoc })
  } catch (error) {
    res.status(500).json({ message: 'Error submitting feedback', error: error.message })
  }
})

// 8. Get analytics and responses for a specific evaluation (Authenticated, teachers/admins)
router.get('/evaluations/:id/analytics', requireAuth, async (req, res) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id).populate({
      path: 'courseOfferingId',
      populate: ['course', 'batch', 'semester', 'teacher']
    })
    
    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' })
    }

    // Fetch all responses
    const responses = await Response.find({ evaluationId: evaluation._id }).populate('studentId')

    // Get total enrolled students
    const offering = evaluation.courseOfferingId
    const sectionDoc = offering.batch && offering.section
      ? await Section.findOne({ batchId: offering.batch, sectionName: offering.section })
      : null
    const sectionId = sectionDoc ? sectionDoc._id : null

    const enrollments = await Enrollment.find({ courseOffering: offering._id })
    const totalStudents = enrollments.length // count of enrolled students

    res.status(200).json({
      evaluation,
      responses,
      totalStudents
    })
  } catch (error) {
    res.status(500).json({ message: 'Error loading analytics', error: error.message })
  }
})

export default router
