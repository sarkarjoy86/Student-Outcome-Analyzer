import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import CourseOffering from '../models/CourseOffering.js'
import Assessment from '../models/Assessment.js'
import QuestionPaper from '../models/QuestionPaper.js'
import QuestionMetadata from '../models/QuestionMetadata.js'
import StudentMarks from '../models/StudentMarks.js'
import COAttainment from '../models/COAttainment.js'
import POAttainment from '../models/POAttainment.js'
import Student from '../models/Student.js'
import Enrollment from '../models/Enrollment.js'
import Section from '../models/Section.js'
import mongoose from 'mongoose'
import RecentActivity from '../models/RecentActivity.js'
import { logActivity } from '../utils/activityLogger.js'
import { syncAllStudentsLongitudinalPO } from './poRecommendationRoutes.js'

const router = express.Router()

// Helper function to recalculate attainments
async function recalculateAttainments(offeringId) {
  try {
    const offering = await CourseOffering.findById(offeringId).populate('course')
    if (!offering) return

    // Normalize CO-PO mapping keys (strip spaces and uppercase)
    const rawCoMapping = offering?.course?.coPoMapping || {}
    const coMapping = {}
    Object.keys(rawCoMapping).forEach(coK => {
      const normCo = coK.replace(/\s+/g, '').toUpperCase()
      coMapping[normCo] = {}
      if (rawCoMapping[coK] && typeof rawCoMapping[coK] === 'object') {
        Object.keys(rawCoMapping[coK]).forEach(poK => {
          const normPo = poK.replace(/\s+/g, '').toUpperCase()
          coMapping[normCo][normPo] = rawCoMapping[coK][poK]
        })
      }
    })

    const targetPassMarks = offering.targetPassMarks || 40
    const kpiCO = offering.kpiCO || 50
    const kpiPO = offering.kpiPO || 50

    const enrollments = await Enrollment.find({ courseOffering: offeringId }).populate('student')
    const sectionDoc = offering && offering.batch
      ? await Section.findOne({ batchId: offering.batch, sectionName: offering.section })
      : null
    const sectionId = sectionDoc ? sectionDoc._id : null

    const students = enrollments
      .filter(e => e.student && (!sectionId || (e.student.sectionId && e.student.sectionId.toString() === sectionId.toString())))
      .map(e => e.student)
    if (students.length === 0) return

    const assessments = await Assessment.find({ courseOffering: offeringId })

    const metadataList = await QuestionMetadata.find({ courseOffering: offeringId })
    const metadataMap = {}
    metadataList.forEach(m => {
      metadataMap[m.assessment.toString()] = m.questions
    })

    const allMarks = await StudentMarks.find({ courseOffering: offeringId })
    const marksMap = {}
    allMarks.forEach(m => {
      const sId = m.student.toString()
      const aId = m.assessment.toString()
      if (!marksMap[sId]) marksMap[sId] = {}
      marksMap[sId][aId] = {
        questionMarks: m.questionMarks || [],
        totalMark: m.totalMark || 0
      }
    })

    const coMaxMarks = {}
    for (let i = 1; i <= 12; i++) coMaxMarks[`CO${i}`] = 0

    assessments.forEach(a => {
      const aId = a._id.toString()
      const questions = metadataMap[aId]
      if (questions && questions.length > 0) {
        questions.forEach(q => {
          const coKey = (q.co || '').replace(/\s+/g, '').toUpperCase()
          if (coKey && coKey !== 'NONE' && coKey !== '') {
            coMaxMarks[coKey] = (coMaxMarks[coKey] || 0) + (q.maxMarks || 0)
          }
        })
      } else {
        const coKey = (a.co || '').replace(/\s+/g, '').toUpperCase()
        if (coKey && coKey !== 'NONE' && coKey !== '') {
          coMaxMarks[coKey] = (coMaxMarks[coKey] || 0) + (a.maxMarks || 0)
        }
      }
    })

    const studentCOs = {}
    students.forEach(student => {
      const sId = student._id.toString()
      studentCOs[sId] = {}

      const coObtainedMarks = {}
      for (let i = 1; i <= 12; i++) coObtainedMarks[`CO${i}`] = 0

      assessments.forEach(a => {
        const aId = a._id.toString()
        const sMarks = marksMap[sId]?.[aId]
        if (!sMarks) return

        const questions = metadataMap[aId]
        if (questions && questions.length > 0) {
          questions.forEach(q => {
            const coKey = (q.co || '').replace(/\s+/g, '').toUpperCase()
            if (coKey && coKey !== 'NONE' && coKey !== '') {
              const qMarkObj = sMarks.questionMarks.find(qm => qm.questionNumber === q.questionNumber)
              const obtainedMark = qMarkObj ? (qMarkObj.mark || 0) : 0
              coObtainedMarks[coKey] += obtainedMark
            }
          })
        } else {
          const coKey = (a.co || '').replace(/\s+/g, '').toUpperCase()
          if (coKey && coKey !== 'NONE' && coKey !== '') {
            coObtainedMarks[coKey] += sMarks.totalMark || 0
          }
        }
      })

      for (let i = 1; i <= 12; i++) {
        const coKey = `CO${i}`
        const max = coMaxMarks[coKey]
        studentCOs[sId][coKey] = max > 0 ? (coObtainedMarks[coKey] / max) * 100 : 0
      }
    })

    const coAttainmentResults = {}
    for (let i = 1; i <= 12; i++) {
      const coKey = `CO${i}`
      let passCount = 0
      let kpiCount = 0

      students.forEach(student => {
        const sId = student._id.toString()
        const pct = studentCOs[sId][coKey] || 0
        if (pct >= targetPassMarks) passCount++
        if (pct >= kpiCO) kpiCount++
      })

      const totalStudents = students.length
      const passMarksPercentage = totalStudents > 0 ? (passCount / totalStudents) * 100 : 0
      const kpiPercentage = totalStudents > 0 ? (kpiCount / totalStudents) * 100 : 0
      const attained = kpiPercentage >= kpiCO

      coAttainmentResults[coKey] = { passMarksPercentage, kpiPercentage, attained }

      await COAttainment.findOneAndUpdate(
        { courseOffering: offeringId, co: coKey },
        { passMarksPercentage, kpiPercentage, attained, updatedAt: new Date() },
        { upsert: true, returnDocument: 'after' }
      )
    }

    for (let j = 1; j <= 12; j++) {
      const poKey = `PO${j}`
      const relatedCOs = []
      for (let i = 1; i <= 12; i++) {
        const coKey = `CO${i}`
        if (coMapping[coKey] && coMapping[coKey][poKey] === 1) {
          relatedCOs.push(coKey)
        }
      }

      let passMarksPercentage = 0
      let kpiPercentage = 0

      if (relatedCOs.length > 0) {
        let maxPass = 0
        let maxKpi = 0
        relatedCOs.forEach(coKey => {
          const res = coAttainmentResults[coKey]
          if (res) {
            if (res.passMarksPercentage > maxPass) maxPass = res.passMarksPercentage
            if (res.kpiPercentage > maxKpi) maxKpi = res.kpiPercentage
          }
        })
        passMarksPercentage = maxPass
        kpiPercentage = maxKpi
      }

      const attained = kpiPercentage >= kpiPO

      await POAttainment.findOneAndUpdate(
        { courseOffering: offeringId, po: poKey },
        { passMarksPercentage, kpiPercentage, attained, updatedAt: new Date() },
        { upsert: true, returnDocument: 'after' }
      )
    }
  } catch (err) {
    console.error('Error recalculating attainments:', err.message)
  }
}

// 1. Get Teacher's Course Offerings with calculated student count
router.get('/teacher/course-offerings', requireAuth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { teacher: req.user._id }
    const offerings = await CourseOffering.find(filter)
      .populate('course')
      .populate('batch')
      .populate('semester')
      .populate('teacher', 'fullName email')
      .sort({ createdAt: -1 })

    const offeringsWithCounts = await Promise.all(offerings.map(async (offering) => {
      const sectionDoc = offering.batch && offering.section
        ? await Section.findOne({ batchId: offering.batch._id, sectionName: offering.section })
        : null
      const sectionId = sectionDoc ? sectionDoc._id : null

      const enrollments = await Enrollment.find({ courseOffering: offering._id }).populate('student')
      const validEnrollments = enrollments.filter(e => e.student && (!sectionId || (e.student.sectionId && e.student.sectionId.toString() === sectionId.toString())))

      let studentCount = validEnrollments.length
      if (studentCount === 0 && offering.batch) {
        const query = { batchId: offering.batch._id }
        if (sectionId) {
          query.sectionId = sectionId
        }
        studentCount = await Student.countDocuments(query)
      }
      return {
        ...offering.toObject(),
        studentCount
      }
    }))

    res.status(200).json({ offerings: offeringsWithCounts })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching course offerings', error: error.message })
  }
})

// 2. Get enrolled students (with auto-enrollment from batch if empty)
router.get('/teacher/course-offerings/:id/students', requireAuth, async (req, res) => {
  try {
    const offeringId = req.params.id
    const offering = await CourseOffering.findById(offeringId)
    if (!offering) {
      return res.status(404).json({ message: 'Course offering not found' })
    }

    const sectionDoc = offering.batch
      ? await Section.findOne({ batchId: offering.batch, sectionName: offering.section })
      : null
    const sectionId = sectionDoc ? sectionDoc._id : null

    let enrollments = []

    if (offering.batch) {
      const studentsInSection = await Student.find({
        batchId: offering.batch,
        sectionId: sectionId
      })
      for (const student of studentsInSection) {
        await Enrollment.findOneAndUpdate(
          { student: student._id, courseOffering: offeringId },
          {},
          { upsert: true, returnDocument: 'after' }
        )
      }

      if (sectionId) {
        const existingEnrollments = await Enrollment.find({ courseOffering: offeringId }).populate('student')
        for (const e of existingEnrollments) {
          if (e.student && (!e.student.sectionId || e.student.sectionId.toString() !== sectionId.toString())) {
            await Enrollment.deleteOne({ _id: e._id })
          }
        }
      }

      enrollments = await Enrollment.find({ courseOffering: offeringId }).populate('student')
    } else {
      enrollments = await Enrollment.find({ courseOffering: offeringId }).populate('student')
    }

    const students = enrollments
      .filter((e) => e.student && (!sectionId || (e.student.sectionId && e.student.sectionId.toString() === sectionId.toString())))
      .map((e) => ({
        _id: e.student._id,
        id: e.student.studentId,
        name: e.student.name,
      }))
      .sort((a, b) => {
        const numA = parseInt((a.id || '').toString().replace(/^\D+/g, ''), 10) || 0
        const numB = parseInt((b.id || '').toString().replace(/^\D+/g, ''), 10) || 0
        return numA - numB
      })

    res.status(200).json({ students })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching offering students', error: error.message })
  }
})

// 3. Create single assessment with auto-generated name
router.post('/teacher/course-offerings/:id/assessments', requireAuth, async (req, res) => {
  try {
    const offeringId = req.params.id
    const { type, maxMarks, numQuestions, examDuration, co, deadline } = req.body

    if (!type || maxMarks === undefined) {
      return res.status(400).json({ message: 'Type and Max Marks are required.' })
    }

    const existing = await Assessment.find({ courseOffering: offeringId, type })

    let baseName = ''
    if (type === 'cts') baseName = 'CT'
    else if (type === 'assignments') baseName = 'Assignment'
    else if (type === 'midTerm') baseName = 'Mid Term'
    else if (type === 'final') baseName = 'Final'
    else if (type === 'attendance') baseName = 'Attendance'
    else if (type === 'presentation') baseName = 'Presentation'
    else if (type === 'performance') baseName = 'Performance'
    else baseName = 'Assessment'

    let name = ''
    if (type === 'cts' || type === 'assignments' || existing.length > 0) {
      name = `${baseName}-${existing.length + 1}`
    } else {
      name = baseName
    }

    const assessment = await Assessment.create({
      courseOffering: offeringId,
      type,
      name,
      maxMarks,
      co: co || '',
      numQuestions: numQuestions || 0,
      examDuration: examDuration || '',
      deadline: deadline || null,
      status: 'Draft'
    })

    // If numQuestions > 0, initialize QuestionMetadata automatically
    if (numQuestions > 0) {
      const questions = []
      for (let i = 1; i <= numQuestions; i++) {
        questions.push({
          questionNumber: `Q${i}`,
          maxMarks: Math.floor(maxMarks / numQuestions),
          co: co || 'NONE'
        })
      }
      // adjust last question marks if division is not exact
      const allocatedTotal = questions.reduce((sum, q) => sum + q.maxMarks, 0)
      if (allocatedTotal !== maxMarks && questions.length > 0) {
        questions[questions.length - 1].maxMarks += (maxMarks - allocatedTotal)
      }

      await QuestionMetadata.create({
        assessment: assessment._id,
        courseOffering: offeringId,
        questions
      })
    }

    await logActivity(offeringId, req.user._id, 'Assessment Created', `Created assessment: ${name} (Max Marks: ${maxMarks})`)
    res.status(201).json({ message: 'Assessment created successfully.', assessment })
  } catch (error) {
    res.status(500).json({ message: 'Error creating assessment', error: error.message })
  }
})

// 4. Edit assessment details
router.put('/teacher/assessments/:id', requireAuth, async (req, res) => {
  try {
    const { maxMarks, numQuestions, examDuration, status, co, name, level, term, deadline } = req.body
    const assessment = await Assessment.findById(req.params.id)
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found.' })
    }

    if (maxMarks !== undefined) assessment.maxMarks = maxMarks
    if (numQuestions !== undefined) {
      const prevNum = assessment.numQuestions
      assessment.numQuestions = numQuestions

      // Sync QuestionMetadata questions length
      if (numQuestions > 0) {
        let meta = await QuestionMetadata.findOne({ assessment: assessment._id })
        if (!meta) {
          const questions = []
          for (let i = 1; i <= numQuestions; i++) {
            questions.push({ questionNumber: `Q${i}`, maxMarks: Math.floor((maxMarks || assessment.maxMarks) / numQuestions), co: co || 'NONE' })
          }
          await QuestionMetadata.create({
            assessment: assessment._id,
            courseOffering: assessment.courseOffering,
            questions
          })
        } else {
          // Adjust array length
          const currentQuestions = meta.questions || []
          if (currentQuestions.length < numQuestions) {
            for (let i = currentQuestions.length + 1; i <= numQuestions; i++) {
              currentQuestions.push({ questionNumber: `Q${i}`, maxMarks: 0, co: 'NONE' })
            }
          } else if (currentQuestions.length > numQuestions) {
            currentQuestions.splice(numQuestions)
          }
          meta.questions = currentQuestions
          await meta.save()
        }
      }
    }
    if (examDuration !== undefined) assessment.examDuration = examDuration
    if (status !== undefined) assessment.status = status
    if (co !== undefined) assessment.co = co
    if (name !== undefined) assessment.name = name
    if (level !== undefined) assessment.level = level
    if (term !== undefined) assessment.term = term
    if (deadline !== undefined) assessment.deadline = deadline

    await assessment.save()

    // Recalculate attainments in background
    recalculateAttainments(assessment.courseOffering)

    await logActivity(assessment.courseOffering, req.user._id, 'Assessment Updated', `Updated details for assessment: ${assessment.name}`)
    res.status(200).json({ message: 'Assessment updated successfully.', assessment })
  } catch (error) {
    res.status(500).json({ message: 'Error updating assessment', error: error.message })
  }
})

// 5. Delete assessment
router.delete('/teacher/assessments/:id', requireAuth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id)
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found.' })
    }

    const offeringId = assessment.courseOffering

    await Assessment.findByIdAndDelete(req.params.id)
    await QuestionPaper.deleteOne({ assessment: req.params.id })
    await QuestionMetadata.deleteOne({ assessment: req.params.id })
    await StudentMarks.deleteMany({ assessment: req.params.id })

    // Recalculate attainments
    recalculateAttainments(offeringId)

    await logActivity(offeringId, req.user._id, 'Assessment Deleted', `Deleted assessment: ${assessment.name}`)
    res.status(200).json({ message: 'Assessment and all associated data deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting assessment', error: error.message })
  }
})

// 6. Get question paper and metadata for an assessment
router.get('/teacher/assessments/:id/question-paper', requireAuth, async (req, res) => {
  try {
    const assessmentId = req.params.id
    const assessment = await Assessment.findById(assessmentId)
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found.' })
    }

    const paper = await QuestionPaper.findOne({ assessment: assessmentId })
    const meta = await QuestionMetadata.findOne({ assessment: assessmentId })

    const questions = []
    if (meta && meta.questions && meta.questions.length > 0) {
      questions.push(...meta.questions)
    } else {
      for (let i = 1; i <= (assessment.numQuestions || 0); i++) {
        questions.push({
          questionNumber: `Q${i}`,
          maxMarks: 0,
          co: 'NONE'
        })
      }
    }

    res.status(200).json({
      content: paper ? paper.content : '',
      questions,
      assessment
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching question paper data', error: error.message })
  }
})

// 7. Save question paper and metadata
router.post('/teacher/assessments/:id/question-paper', requireAuth, async (req, res) => {
  try {
    const assessmentId = req.params.id
    const { content, questions } = req.body

    const assessment = await Assessment.findById(assessmentId)
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found.' })
    }

    // Save/update QuestionPaper
    await QuestionPaper.findOneAndUpdate(
      { assessment: assessmentId },
      {
        courseOffering: assessment.courseOffering,
        content: content || '',
        createdBy: req.user._id
      },
      { upsert: true, returnDocument: 'after' }
    )

    // Save/update QuestionMetadata
    if (Array.isArray(questions)) {
      await QuestionMetadata.findOneAndUpdate(
        { assessment: assessmentId },
        {
          courseOffering: assessment.courseOffering,
          questions
        },
        { upsert: true, returnDocument: 'after' }
      )
    }

    await logActivity(assessment.courseOffering, req.user._id, 'Question Paper Updated', `Saved/Updated question paper and metadata for: ${assessment.name}`)
    res.status(200).json({ message: 'Question paper and metadata saved successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error saving question paper data', error: error.message })
  }
})

// 8. Get all question papers in Question Bank (with optional courseId filtering)
router.get('/teacher/question-bank', requireAuth, async (req, res) => {
  try {
    const filter = {}
    if (req.query.courseId) {
      const offerings = await CourseOffering.find({ course: req.query.courseId })
      const offeringIds = offerings.map(o => o._id)
      filter.courseOffering = { $in: offeringIds }
    }

    const papers = await QuestionPaper.find(filter)
      .populate({
        path: 'assessment',
        model: 'Assessment'
      })
      .populate({
        path: 'courseOffering',
        model: 'CourseOffering',
        populate: [
          { path: 'course' },
          { path: 'batch' },
          { path: 'semester' },
          { path: 'teacher', select: 'fullName email' }
        ]
      })
      .populate('createdBy', 'fullName email')

    // Filter out deleted assessments
    const activePapers = papers.filter(p => p.assessment && p.courseOffering)
    res.status(200).json({ papers: activePapers })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching question bank', error: error.message })
  }
})

// 9. Duplicate an existing question paper to target course offering
router.post('/teacher/question-bank/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const sourcePaper = await QuestionPaper.findById(req.params.id).populate('assessment')
    if (!sourcePaper || !sourcePaper.assessment) {
      return res.status(404).json({ message: 'Source question paper not found.' })
    }

    const { targetCourseOfferingId } = req.body
    if (!targetCourseOfferingId) {
      return res.status(400).json({ message: 'Target Course Offering ID is required.' })
    }

    const targetOffering = await CourseOffering.findById(targetCourseOfferingId)
    if (!targetOffering) {
      return res.status(404).json({ message: 'Target course offering not found.' })
    }

    const sourceAssessment = sourcePaper.assessment
    const existing = await Assessment.find({ courseOffering: targetCourseOfferingId, type: sourceAssessment.type })

    let name = `${sourceAssessment.name} (Copy)`
    if (existing.length > 0) {
      name = `${sourceAssessment.name} (Copy - ${existing.length + 1})`
    }

    // 1. Create duplicated assessment
    const duplicatedAssessment = await Assessment.create({
      courseOffering: targetCourseOfferingId,
      type: sourceAssessment.type,
      name,
      maxMarks: sourceAssessment.maxMarks,
      co: sourceAssessment.co || '',
      numQuestions: sourceAssessment.numQuestions || 0,
      examDuration: sourceAssessment.examDuration || '',
      status: 'Draft'
    })

    // 2. Create duplicated question paper
    await QuestionPaper.create({
      assessment: duplicatedAssessment._id,
      courseOffering: targetCourseOfferingId,
      content: sourcePaper.content || '',
      createdBy: req.user._id
    })

    // 3. Duplicate QuestionMetadata if exists
    const sourceMeta = await QuestionMetadata.findOne({ assessment: sourceAssessment._id })
    if (sourceMeta && sourceMeta.questions) {
      const duplicatedQuestions = sourceMeta.questions.map(q => ({
        questionNumber: q.questionNumber,
        maxMarks: q.maxMarks,
        co: q.co
      }))
      await QuestionMetadata.create({
        assessment: duplicatedAssessment._id,
        courseOffering: targetCourseOfferingId,
        questions: duplicatedQuestions
      })
    }

    await logActivity(targetCourseOfferingId, req.user._id, 'Question Paper Duplicated', `Duplicated assessment and paper to create: ${name}`)
    res.status(201).json({ message: 'Question paper duplicated successfully.', assessment: duplicatedAssessment })
  } catch (error) {
    res.status(500).json({ message: 'Error duplicating question paper', error: error.message })
  }
})

// 10. Get question-wise student marks for spreadsheet
router.get('/teacher/course-offerings/:id/marks-spreadsheet', requireAuth, async (req, res) => {
  try {
    const offeringId = req.params.id
    const offering = await CourseOffering.findById(offeringId)
    if (!offering) {
      return res.status(404).json({ message: 'Course offering not found' })
    }

    const sectionDoc = offering.batch
      ? await Section.findOne({ batchId: offering.batch, sectionName: offering.section })
      : null
    const sectionId = sectionDoc ? sectionDoc._id : null

    // Fetch assessments
    const assessments = await Assessment.find({ courseOffering: offeringId })

    // Fetch question metadata
    const metadataList = await QuestionMetadata.find({ courseOffering: offeringId })
    const metadataMap = {}
    metadataList.forEach(m => {
      metadataMap[m.assessment.toString()] = m.questions
    })

    // Fetch enrolled students
    const enrollments = await Enrollment.find({ courseOffering: offeringId }).populate('student')
    const students = enrollments
      .filter((e) => e.student && (!sectionId || (e.student.sectionId && e.student.sectionId.toString() === sectionId.toString())))
      .map((e) => ({
        _id: e.student._id,
        id: e.student.studentId,
        name: e.student.name,
      }))
      .sort((a, b) => {
        const numA = parseInt((a.id || '').toString().replace(/^\D+/g, ''), 10) || 0
        const numB = parseInt((b.id || '').toString().replace(/^\D+/g, ''), 10) || 0
        return numA - numB
      })

    // Fetch student marks
    const allMarks = await StudentMarks.find({ courseOffering: offeringId })
    const marksMap = {}
    allMarks.forEach(m => {
      const sId = m.student.toString()
      const aId = m.assessment.toString()
      if (!marksMap[sId]) marksMap[sId] = {}

      const qMarksObj = {}
      if (m.questionMarks) {
        m.questionMarks.forEach(qm => {
          qMarksObj[qm.questionNumber] = qm.mark
        })
      }

      marksMap[sId][aId] = {
        questionMarks: qMarksObj,
        totalMark: m.totalMark || 0
      }
    })

    res.status(200).json({
      students,
      assessments,
      metadata: metadataMap,
      marks: marksMap
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching marks spreadsheet data', error: error.message })
  }
})

// 11. Save question-wise marks for an assessment and trigger attainment calculation
router.post('/teacher/course-offerings/:id/marks-spreadsheet', requireAuth, async (req, res) => {
  try {
    const offeringId = req.params.id
    const { assessmentId, marks } = req.body // marks is array of { studentId, questionMarks: { Q1: X, Q2: Y }, totalMark }

    if (!assessmentId || !Array.isArray(marks)) {
      return res.status(400).json({ message: 'Assessment ID and marks list are required.' })
    }

    const assessment = await Assessment.findById(assessmentId)
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found.' })
    }

    // Save marks
    for (const item of marks) {
      const { studentId, questionMarks = {}, totalMark = 0, isEmpty = false } = item

      if (isEmpty) {
        // Delete the student marks document if it exists to keep it unentered / blank
        await StudentMarks.deleteOne({ student: studentId, assessment: assessmentId, courseOffering: offeringId })
        continue
      }

      const qMarksArray = []
      Object.keys(questionMarks).forEach(qNum => {
        const val = questionMarks[qNum]
        if (val !== null && val !== undefined && val !== '') {
          qMarksArray.push({
            questionNumber: qNum,
            mark: Number(val)
          })
        }
      })

      await StudentMarks.findOneAndUpdate(
        { student: studentId, assessment: assessmentId, courseOffering: offeringId },
        {
          questionMarks: qMarksArray,
          totalMark: Number(totalMark) || 0
        },
        { upsert: true, returnDocument: 'after' }
      )
    }

    // Update assessment status to Evaluated if not already
    if (assessment.status !== 'Evaluated') {
      assessment.status = 'Evaluated'
      await assessment.save()
    }

    // Trigger attainment calculation
    await recalculateAttainments(offeringId)

    // Trigger longitudinal PO database update for all students
    syncAllStudentsLongitudinalPO(60).catch(err => console.error("PO sync error after marks save:", err));

    await logActivity(offeringId, req.user._id, 'Marks Saved', `Entered/Updated student marks for assessment: ${assessment.name}`)
    res.status(200).json({ message: 'Marks saved and attainments calculated successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error saving marks', error: error.message })
  }
})

// 12. Fetch calculated CO & PO Attainments for display
router.get('/teacher/course-offerings/:id/attainment-data', requireAuth, async (req, res) => {
  try {
    const offeringId = req.params.id
    const coAttainmentsRaw = await COAttainment.find({ courseOffering: offeringId })
    const poAttainmentsRaw = await POAttainment.find({ courseOffering: offeringId })
    const offering = await CourseOffering.findById(offeringId)

    const coAttainments = coAttainmentsRaw.sort((a, b) => {
      const numA = parseInt((a.co || '').replace(/^\D+/g, ''), 10) || 0
      const numB = parseInt((b.co || '').replace(/^\D+/g, ''), 10) || 0
      return numA - numB
    })

    const poAttainments = poAttainmentsRaw.sort((a, b) => {
      const numA = parseInt((a.po || '').replace(/^\D+/g, ''), 10) || 0
      const numB = parseInt((b.po || '').replace(/^\D+/g, ''), 10) || 0
      return numA - numB
    })

    res.status(200).json({
      coAttainments,
      poAttainments,
      kpiConfig: {
        targetPassMarks: offering?.targetPassMarks || 40,
        kpiCO: offering?.kpiCO || 50,
        kpiPO: offering?.kpiPO || 50
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attainment results', error: error.message })
  }
})

// 13. Get recent activities for a course offering
router.get('/teacher/course-offerings/:id/activities', requireAuth, async (req, res) => {
  try {
    const activities = await RecentActivity.find({ courseOfferingId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(100)
    res.status(200).json({ activities })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent activities', error: error.message })
  }
})

// 14. Clear all recent activities for a course offering
router.delete('/teacher/course-offerings/:id/activities', requireAuth, async (req, res) => {
  try {
    await RecentActivity.deleteMany({ courseOfferingId: req.params.id })
    res.status(200).json({ message: 'Recent activities cleared successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error clearing recent activities', error: error.message })
  }
})

export default router
