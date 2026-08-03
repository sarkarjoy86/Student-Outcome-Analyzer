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
import { syncCourseOfferingStudentsLongitudinalPO } from './poRecommendationRoutes.js'

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

    // Separate standard assessments vs extra CTs
    const nonExtraAssessments = assessments.filter(a => !(a.type === 'cts' && a.isExtraCT))
    nonExtraAssessments.forEach(a => {
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

      // 1. Calculate non-CT assessments
      const nonCtAsmts = assessments.filter(a => a.type !== 'cts')
      nonCtAsmts.forEach(a => {
        const aId = a._id.toString()
        const sMarks = marksMap[sId]?.[aId]
        if (!sMarks) return

        const questions = metadataMap[aId]
        if (questions && questions.length > 0) {
          questions.forEach(q => {
            const coKey = (q.co || '').replace(/\s+/g, '').toUpperCase()
            if (coKey && coKey !== 'NONE' && coKey !== '') {
              const qMarkObj = sMarks.questionMarks?.find(qm => qm.questionNumber === q.questionNumber)
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

      // 2. Calculate CT assessments with Best CT pairing (Standard CT vs Extra CT)
      const ctAsmts = assessments.filter(a => a.type === 'cts')
      const stdCTs = ctAsmts.filter(a => !a.isExtraCT)
      stdCTs.forEach(stdCT => {
        const stdId = stdCT._id.toString()
        const extraList = ctAsmts.filter(a => a.isExtraCT && (a.parentCTId?.toString() === stdId || a.parentCTName === stdCT.name))
        const pairedGroup = [stdCT, ...extraList]

        const stdQuestions = metadataMap[stdId] || []
        if (stdQuestions.length > 0) {
          stdQuestions.forEach(q => {
            const coKey = (q.co || '').replace(/\s+/g, '').toUpperCase()
            if (coKey && coKey !== 'NONE' && coKey !== '') {
              const questionMarks = pairedGroup.map(asmt => {
                const asmtId = asmt._id.toString()
                const sMarks = marksMap[sId]?.[asmtId]
                if (!sMarks) return 0
                const qObj = sMarks.questionMarks?.find(qm => qm.questionNumber === q.questionNumber)
                return qObj ? (qObj.mark || 0) : (sMarks.totalMark || 0)
              })
              const bestQMark = Math.max(0, ...questionMarks)
              coObtainedMarks[coKey] += bestQMark
            }
          })
        } else {
          const coKey = (stdCT.co || '').replace(/\s+/g, '').toUpperCase()
          if (coKey && coKey !== 'NONE' && coKey !== '') {
            const slotMarks = pairedGroup.map(asmt => {
              const asmtId = asmt._id.toString()
              const sMarks = marksMap[sId]?.[asmtId]
              return sMarks ? (sMarks.totalMark || 0) : 0
            })
            const bestSlotMark = Math.max(0, ...slotMarks)
            coObtainedMarks[coKey] += bestSlotMark
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
        { coAttainments: poMap[poKey] },
        { upsert: true }
      )
    }
  } catch (err) {
    console.error('Error in recalculateAttainments:', err)
  }
}

// Helper to sync MID & FINAL assessments across sister offerings of the same course & batch
async function syncSisterMidFinal(sourceOfferingId, type, action, payload = {}) {
  try {
    if (!['midTerm', 'final'].includes(type)) return;

    const sourceOffering = await CourseOffering.findById(sourceOfferingId);
    if (!sourceOffering) return;

    const filter = {
      course: sourceOffering.course,
      batch: sourceOffering.batch,
      _id: { $ne: sourceOffering._id }
    };
    if (sourceOffering.semester) {
      filter.semester = sourceOffering.semester;
    }

    const sisterOfferings = await CourseOffering.find(filter);
    if (sisterOfferings.length === 0) return;

    for (const sister of sisterOfferings) {
      if (action === 'CREATE' || action === 'UPDATE') {
        let sisterAsmt = await Assessment.findOne({ courseOffering: sister._id, type });
        if (!sisterAsmt) {
          sisterAsmt = await Assessment.create({
            courseOffering: sister._id,
            type,
            name: payload.name || (type === 'midTerm' ? 'Mid Term' : 'Final'),
            maxMarks: payload.maxMarks || 50,
            co: payload.co || '',
            numQuestions: payload.numQuestions || 0,
            examDuration: payload.examDuration || '',
            deadline: payload.deadline || null,
            status: payload.status || 'Draft'
          });
        } else {
          if (payload.maxMarks !== undefined) sisterAsmt.maxMarks = payload.maxMarks;
          if (payload.numQuestions !== undefined) sisterAsmt.numQuestions = payload.numQuestions;
          if (payload.examDuration !== undefined) sisterAsmt.examDuration = payload.examDuration;
          if (payload.status !== undefined) sisterAsmt.status = payload.status;
          if (payload.co !== undefined) sisterAsmt.co = payload.co;
          if (payload.name !== undefined) sisterAsmt.name = payload.name;
          if (payload.deadline !== undefined) sisterAsmt.deadline = payload.deadline;
          await sisterAsmt.save();
        }

        if (payload.questions && Array.isArray(payload.questions)) {
          await QuestionMetadata.findOneAndUpdate(
            { assessment: sisterAsmt._id },
            {
              courseOffering: sister._id,
              questions: payload.questions
            },
            { upsert: true, returnDocument: 'after' }
          );
        }

        if (payload.content !== undefined) {
          await QuestionPaper.findOneAndUpdate(
            { assessment: sisterAsmt._id },
            {
              courseOffering: sister._id,
              content: payload.content || '',
              createdBy: payload.createdBy || null
            },
            { upsert: true, returnDocument: 'after' }
          );
        }

        recalculateAttainments(sister._id);
      } else if (action === 'DELETE') {
        const sisterAsmt = await Assessment.findOne({ courseOffering: sister._id, type });
        if (sisterAsmt) {
          await Assessment.findByIdAndDelete(sisterAsmt._id);
          await QuestionPaper.deleteOne({ assessment: sisterAsmt._id });
          await QuestionMetadata.deleteOne({ assessment: sisterAsmt._id });
          recalculateAttainments(sister._id);
        }
      }
    }
  } catch (err) {
    console.error('Error syncing sister MID/FINAL assessments:', err);
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
    const { type, maxMarks, numQuestions, examDuration, co, deadline, isExtraCT, parentCTName, parentCTId } = req.body

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

    // Enforce single instance per course offering for non-multiple assessment types
    const singleInstanceTypes = ['midTerm', 'final', 'attendance', 'performance', 'presentation']
    if (singleInstanceTypes.includes(type) && existing.length > 0) {
      return res.status(400).json({ message: `${baseName} has already been created for this course offering. Only one ${baseName} is allowed.` })
    }

    let name = req.body.name || ''
    let parentId = parentCTId || null
    let targetParentName = parentCTName || ''
    let inheritedCO = co || ''

    if (type === 'cts' && isExtraCT) {
      let parentAsmt = null
      if (parentId) {
        parentAsmt = await Assessment.findById(parentId)
      } else if (targetParentName) {
        parentAsmt = await Assessment.findOne({ courseOffering: offeringId, type: 'cts', name: targetParentName })
      }

      if (parentAsmt) {
        parentId = parentAsmt._id
        targetParentName = parentAsmt.name
        inheritedCO = parentAsmt.co || inheritedCO
      }

      const offeringDoc = await CourseOffering.findById(offeringId).populate('course')
      const credits = offeringDoc?.course?.creditHours || 3
      const standardCTCount = Math.max(1, Math.floor(credits))
      name = `Extra CT (CT-${standardCTCount + 1})`
    } else if (!name) {
      if (type === 'cts' || type === 'assignments' || existing.length > 0) {
        name = `${baseName}-${existing.length + 1}`
      } else {
        name = baseName
      }
    }

    const assessment = await Assessment.create({
      courseOffering: offeringId,
      type,
      name,
      maxMarks,
      co: inheritedCO,
      numQuestions: numQuestions || 0,
      examDuration: examDuration || '',
      deadline: deadline || null,
      isExtraCT: Boolean(isExtraCT),
      parentCTName: targetParentName,
      parentCTId: parentId,
      status: 'Draft'
    })

    // If parent assessment has metadata questions, copy metadata questions for extra CT
    if (type === 'cts' && isExtraCT && parentId) {
      const parentMeta = await QuestionMetadata.findOne({ assessment: parentId })
      if (parentMeta && parentMeta.questions && parentMeta.questions.length > 0) {
        await QuestionMetadata.create({
          assessment: assessment._id,
          courseOffering: offeringId,
          questions: parentMeta.questions.map(q => ({
            questionNumber: q.questionNumber,
            maxMarks: q.maxMarks,
            co: q.co,
            bloom: q.bloom || ''
          }))
        })
      }
    } else if (numQuestions > 0) {
      const questions = []
      for (let i = 1; i <= numQuestions; i++) {
        questions.push({
          questionNumber: `Q${i}`,
          maxMarks: Math.floor(maxMarks / numQuestions),
          co: inheritedCO || 'NONE'
        })
      }
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

    if (['midTerm', 'final'].includes(type)) {
      const meta = await QuestionMetadata.findOne({ assessment: assessment._id })
      await syncSisterMidFinal(offeringId, type, 'CREATE', {
        name: assessment.name,
        maxMarks: assessment.maxMarks,
        co: assessment.co,
        numQuestions: assessment.numQuestions,
        examDuration: assessment.examDuration,
        deadline: assessment.deadline,
        status: assessment.status,
        questions: meta ? meta.questions : []
      })
    }

    await logActivity(offeringId, req.user._id, 'Assessment Created', `Created ${name} (${type})`)
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

    if (['midTerm', 'final'].includes(assessment.type)) {
      const meta = await QuestionMetadata.findOne({ assessment: assessment._id })
      await syncSisterMidFinal(assessment.courseOffering, assessment.type, 'UPDATE', {
        name: assessment.name,
        maxMarks: assessment.maxMarks,
        co: assessment.co,
        numQuestions: assessment.numQuestions,
        examDuration: assessment.examDuration,
        deadline: assessment.deadline,
        status: assessment.status,
        questions: meta ? meta.questions : []
      })
    }

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

    if (['midTerm', 'final'].includes(assessment.type)) {
      await syncSisterMidFinal(offeringId, assessment.type, 'DELETE')
    }

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

      // Sync aggregated COs and status back to Assessment model
      const validCOs = Array.from(new Set(
        questions
          .map(q => q.co)
          .filter(c => c && c !== 'NONE' && c !== '')
      ))

      if (validCOs.length > 0) {
        assessment.co = validCOs.join(', ')
        assessment.status = 'Published'
      }
      if (questions.length > 0) {
        assessment.numQuestions = questions.length
      }

      await assessment.save()
      recalculateAttainments(assessment.courseOffering)
    }

    if (['midTerm', 'final'].includes(assessment.type)) {
      await syncSisterMidFinal(assessment.courseOffering, assessment.type, 'UPDATE', {
        name: assessment.name,
        maxMarks: assessment.maxMarks,
        co: assessment.co,
        numQuestions: assessment.numQuestions,
        examDuration: assessment.examDuration,
        deadline: assessment.deadline,
        status: assessment.status,
        content: content || '',
        questions: Array.isArray(questions) ? questions : [],
        createdBy: req.user._id
      })
    }

    await logActivity(assessment.courseOffering, req.user._id, 'Question Paper Updated', `Saved/Updated question paper and metadata for: ${assessment.name}`)
    res.status(200).json({ message: 'Question paper and metadata saved successfully.', assessment })
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

    const formattedAssessments = assessments.map(a => {
      const docObj = a.toObject ? a.toObject() : { ...a }
      if (!docObj.createdAt && a._id && typeof a._id.getTimestamp === 'function') {
        docObj.createdAt = a._id.getTimestamp()
      }
      return docObj
    })

    res.status(200).json({
      students,
      assessments: formattedAssessments,
      metadata: metadataMap,
      marks: marksMap
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching marks spreadsheet data', error: error.message })
  }
})

// 10b. Get combined batch marks spreadsheet data for all sections of the same course & batch
router.get('/teacher/course-offerings/:id/combined-batch-spreadsheet', requireAuth, async (req, res) => {
  try {
    const primaryOfferingId = req.params.id
    const primaryOffering = await CourseOffering.findById(primaryOfferingId)
      .populate('course')
      .populate('batch')
      .populate('semester')
      .populate('teacher', 'fullName email')

    if (!primaryOffering) {
      return res.status(404).json({ message: 'Course offering not found' })
    }

    const filter = {
      course: primaryOffering.course._id || primaryOffering.course,
      batch: primaryOffering.batch._id || primaryOffering.batch
    }
    if (primaryOffering.semester) {
      filter.semester = primaryOffering.semester._id || primaryOffering.semester
    }

    const sisterOfferings = await CourseOffering.find(filter)
      .populate('teacher', 'fullName email')
      .sort({ section: 1 })

    const sisterOfferingIds = sisterOfferings.map(s => s._id)
    const sectionNames = sisterOfferings.map(s => s.section).filter(Boolean)

    const primaryAssessments = await Assessment.find({ courseOffering: primaryOfferingId })
    const primaryMetadataList = await QuestionMetadata.find({ courseOffering: primaryOfferingId })
    
    const metadataMap = {}
    primaryMetadataList.forEach(m => {
      metadataMap[m.assessment.toString()] = m.questions
    })

    const allOfferingsAssessments = await Assessment.find({ courseOffering: { $in: sisterOfferingIds } })
    
    const asmtIdMap = {}
    allOfferingsAssessments.forEach(a => {
      const aId = a._id.toString()
      if (a.courseOffering.toString() === primaryOfferingId.toString()) {
        asmtIdMap[aId] = aId
      } else {
        const match = primaryAssessments.find(p => p.type === a.type && (p.name === a.name || p.type === 'midTerm' || p.type === 'final'))
        if (match) {
          asmtIdMap[aId] = match._id.toString()
        } else {
          const typeMatch = primaryAssessments.find(p => p.type === a.type)
          if (typeMatch) {
            asmtIdMap[aId] = typeMatch._id.toString()
          } else {
            asmtIdMap[aId] = aId
          }
        }
      }
    })

    const allStudentsMap = new Map()

    for (const sister of sisterOfferings) {
      const sectionDoc = sister.batch && sister.section
        ? await Section.findOne({ batchId: sister.batch._id || sister.batch, sectionName: sister.section })
        : null
      const sectionId = sectionDoc ? sectionDoc._id : null

      const enrollments = await Enrollment.find({ courseOffering: sister._id }).populate('student')
      let sisterStudents = enrollments
        .filter((e) => e.student && (!sectionId || (e.student.sectionId && e.student.sectionId.toString() === sectionId.toString())))
        .map((e) => ({
          _id: e.student._id,
          id: e.student.studentId,
          name: e.student.name,
          section: sister.section || 'A'
        }))

      if (sisterStudents.length === 0 && sister.batch) {
        const query = { batchId: sister.batch._id || sister.batch }
        if (sectionId) query.sectionId = sectionId
        const dbStudents = await Student.find(query)
        sisterStudents = dbStudents.map(s => ({
          _id: s._id,
          id: s.studentId,
          name: s.name,
          section: sister.section || 'A'
        }))
      }

      sisterStudents.forEach(st => {
        const sKey = st._id.toString()
        if (!allStudentsMap.has(sKey)) {
          allStudentsMap.set(sKey, st)
        }
      })
    }

    const studentsList = Array.from(allStudentsMap.values()).sort((a, b) => {
      const numA = parseInt((a.id || '').toString().replace(/^\D+/g, ''), 10) || 0
      const numB = parseInt((b.id || '').toString().replace(/^\D+/g, ''), 10) || 0
      return numA - numB
    })

    const allMarks = await StudentMarks.find({ courseOffering: { $in: sisterOfferingIds } })
    const marksMap = {}

    allMarks.forEach(m => {
      const sId = m.student.toString()
      const origAId = m.assessment.toString()
      const targetAId = asmtIdMap[origAId] || origAId

      if (!marksMap[sId]) marksMap[sId] = {}

      const qMarksObj = {}
      if (m.questionMarks) {
        m.questionMarks.forEach(qm => {
          qMarksObj[qm.questionNumber] = qm.mark
        })
      }

      marksMap[sId][targetAId] = {
        questionMarks: qMarksObj,
        totalMark: m.totalMark || 0
      }
    })

    const formattedAssessments = primaryAssessments.map(a => {
      const docObj = a.toObject ? a.toObject() : { ...a }
      if (!docObj.createdAt && a._id && typeof a._id.getTimestamp === 'function') {
        docObj.createdAt = a._id.getTimestamp()
      }
      return docObj
    })

    res.status(200).json({
      students: studentsList,
      assessments: formattedAssessments,
      metadata: metadataMap,
      marks: marksMap,
      sections: sectionNames,
      offeringCount: sisterOfferings.length
    })
  } catch (error) {
    res.status(500).json({ message: 'Error fetching combined batch spreadsheet data', error: error.message })
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

    // Trigger longitudinal PO database update for allocated course students only
    syncCourseOfferingStudentsLongitudinalPO(offeringId, 60).catch(err => console.error("PO sync error after marks save:", err));

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
