import express from 'express';
import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import Section from '../models/Section.js';
import Enrollment from '../models/Enrollment.js';
import CourseOffering from '../models/CourseOffering.js';
import Course from '../models/Course.js';
import AcademicSession from '../models/AcademicSession.js';
import Assessment from '../models/Assessment.js';
import QuestionMetadata from '../models/QuestionMetadata.js';
import StudentMarks from '../models/StudentMarks.js';
import StudentLongitudinalPO from '../models/StudentLongitudinalPO.js';
import PORecommendation from '../models/PORecommendation.js';

const router = express.Router();

const norm = (str) => (str || '').toString().toUpperCase().replace(/\s+/g, '');

const PO_DEFINITIONS = {
  PO1: 'Engineering knowledge',
  PO2: 'Problem analysis',
  PO3: 'Design/development of solutions',
  PO4: 'Investigation',
  PO5: 'Modern tool usage',
  PO6: 'The engineer and society',
  PO7: 'Environment & sustainability',
  PO8: 'Ethics',
  PO9: 'Individual work and teamwork',
  PO10: 'Communication',
  PO11: 'Project management and finance',
  PO12: 'Life-long learning',
};

const getGradeAndGP = (percentage) => {
  if (percentage >= 80) return { grade: 'A+', gp: 4.00 };
  if (percentage >= 75) return { grade: 'A', gp: 3.75 };
  if (percentage >= 70) return { grade: 'A-', gp: 3.50 };
  if (percentage >= 65) return { grade: 'B+', gp: 3.25 };
  if (percentage >= 60) return { grade: 'B', gp: 3.00 };
  if (percentage >= 55) return { grade: 'B-', gp: 2.75 };
  if (percentage >= 50) return { grade: 'C+', gp: 2.50 };
  if (percentage >= 45) return { grade: 'C', gp: 2.25 };
  if (percentage >= 40) return { grade: 'D', gp: 2.00 };
  return { grade: 'F', gp: 0.00 };
};

/**
 * Calculate longitudinal PO aggregation & CGPA for a student and save to StudentLongitudinalPO collection
 */
export async function calculateAndSyncStudentPO(studentIdOrDbId, targetThreshold = 60) {
  let student = null;
  if (mongoose.Types.ObjectId.isValid(studentIdOrDbId)) {
    student = await Student.findById(studentIdOrDbId).populate('batchId sectionId');
  }
  if (!student) {
    student = await Student.findOne({ studentId: studentIdOrDbId }).populate('batchId sectionId');
  }

  if (!student) {
    throw new Error(`Student ${studentIdOrDbId} not found.`);
  }

  const studentDbId = student._id;
  const studentIdStr = student.studentId || student.id;

  // Find all enrollments for this student
  const enrollments = await Enrollment.find({ student: studentDbId })
    .populate({
      path: 'courseOffering',
      populate: [
        { path: 'course' },
        { path: 'semester' },
        { path: 'batch' }
      ]
    });

  const completedCourses = [];
  const poWeightedSums = {};
  const poCreditSums = {};
  const poCourseCounts = {};

  for (let i = 1; i <= 12; i++) {
    const poKey = `PO${i}`;
    poWeightedSums[poKey] = 0;
    poCreditSums[poKey] = 0;
    poCourseCounts[poKey] = 0;
  }

  let totalCreditPoints = 0; // Sum of (GP * Credits)
  let totalAttemptedCredits = 0;

  for (const enrollment of enrollments) {
    const offering = enrollment.courseOffering;
    if (!offering || !offering.course) continue;

    const course = offering.course;
    const courseCode = course.courseCode || 'N/A';
    const courseTitle = course.courseName || 'N/A';
    const creditHours = parseFloat(course.creditHours) || 3;

    // Fetch assessments for this course offering
    const assessments = await Assessment.find({ courseOffering: offering._id });
    if (!assessments || assessments.length === 0) continue;

    const assessmentIds = assessments.map(a => a._id);

    // Fetch question metadata
    const metadataDocs = await QuestionMetadata.find({ assessment: { $in: assessmentIds } });
    const metadataMap = {};
    metadataDocs.forEach(doc => {
      metadataMap[doc.assessment.toString()] = doc.questions || [];
    });

    // Fetch student marks for this offering
    const studentMarksDocs = await StudentMarks.find({
      student: studentDbId,
      courseOffering: offering._id
    });

    if (!studentMarksDocs || studentMarksDocs.length === 0) continue; // Skip offerings with no student marks recorded

    const marksMap = {};
    studentMarksDocs.forEach(m => {
      marksMap[m.assessment.toString()] = m;
    });

    // Calculate CO1..CO12 attainments for this student in this course
    const courseCOs = {};
    for (let c = 1; c <= 12; c++) {
      const targetCO = `CO${c}`;
      let totalCOMax = 0;
      let totalCOObtained = 0;

      assessments.forEach(a => {
        const aId = a._id.toString();
        const questions = metadataMap[aId];
        const sMarkDoc = marksMap[aId];

        if (questions && questions.length > 0) {
          questions.forEach(q => {
            if (norm(q.co) === targetCO) {
              totalCOMax += parseFloat(q.maxMarks) || 0;
              if (sMarkDoc && sMarkDoc.questionMarks) {
                const qM = sMarkDoc.questionMarks.find(qm => qm.questionNumber === q.questionNumber);
                if (qM) {
                  totalCOObtained += parseFloat(qM.mark || 0) || 0;
                }
              }
            }
          });
        } else {
          if (norm(a.co) === targetCO) {
            totalCOMax += parseFloat(a.maxMarks) || 0;
            if (sMarkDoc) {
              totalCOObtained += parseFloat(sMarkDoc.totalMark || 0) || 0;
            }
          }
        }
      });

      courseCOs[targetCO] = totalCOMax > 0 ? (totalCOObtained / totalCOMax) * 100 : 0;
    }

    // Calculate Course Overall Grade
    let courseObtainedTotal = 0;
    let courseMaxTotal = 0;
    assessments.forEach(a => {
      const aId = a._id.toString();
      courseMaxTotal += parseFloat(a.maxMarks) || 0;
      const sMarkDoc = marksMap[aId];
      if (sMarkDoc) {
        courseObtainedTotal += parseFloat(sMarkDoc.totalMark || 0) || 0;
      }
    });

    const coursePercentage = courseMaxTotal > 0 ? (courseObtainedTotal / courseMaxTotal) * 100 : 0;
    const { grade, gp } = getGradeAndGP(coursePercentage);

    totalCreditPoints += gp * creditHours;
    totalAttemptedCredits += creditHours;

    // Deep-merge CO-PO mappings from master course and course offering
    const mergedMapping = {};
    const masterMap = course.coPoMapping || {};
    Object.keys(masterMap).forEach(co => {
      const normCo = norm(co);
      if (!mergedMapping[normCo]) mergedMapping[normCo] = {};
      const poMap = masterMap[co] || {};
      Object.keys(poMap).forEach(po => {
        if (poMap[po] === 1 || poMap[po] === true) {
          mergedMapping[normCo][norm(po)] = 1;
        }
      });
    });

    const offMap = offering.coPoMapping || {};
    Object.keys(offMap).forEach(co => {
      const normCo = norm(co);
      if (!mergedMapping[normCo]) mergedMapping[normCo] = {};
      const poMap = offMap[co] || {};
      Object.keys(poMap).forEach(po => {
        if (poMap[po] === 1 || poMap[po] === true) {
          mergedMapping[normCo][norm(po)] = 1;
        }
      });
    });

    const coursePOs = {};
    for (let p = 1; p <= 12; p++) {
      const targetPO = `PO${p}`;
      const mappedCOKeys = [];

      Object.keys(mergedMapping).forEach(normCo => {
        const poMap = mergedMapping[normCo] || {};
        if (poMap[targetPO] === 1) {
          mappedCOKeys.push(normCo);
        }
      });

      if (mappedCOKeys.length > 0) {
        let maxCoAttainment = 0;
        mappedCOKeys.forEach(coK => {
          if (courseCOs[coK] > maxCoAttainment) {
            maxCoAttainment = courseCOs[coK];
          }
        });
        coursePOs[targetPO] = Math.round(maxCoAttainment * 10) / 10;

        poWeightedSums[targetPO] += maxCoAttainment * creditHours;
        poCreditSums[targetPO] += creditHours;
        poCourseCounts[targetPO] += 1;
      } else {
        coursePOs[targetPO] = 0;
      }
    }

    completedCourses.push({
      courseOfferingId: offering._id,
      courseCode,
      courseTitle,
      creditHours,
      semester: offering.semester?.semesterName || 'N/A',
      academicYear: offering.academicYear || offering.semester?.academicYear || 'N/A',
      obtainedMarks: Math.round(courseObtainedTotal * 10) / 10,
      maxMarks: Math.round(courseMaxTotal * 10) / 10,
      percentage: Math.round(coursePercentage * 10) / 10,
      letterGrade: grade,
      gradePoint: gp,
      poAttainments: coursePOs,
    });
  }

  // CGPA Calculation
  const cgpa = totalAttemptedCredits > 0 ? Math.round((totalCreditPoints / totalAttemptedCredits) * 100) / 100 : 0;

  // Calculate Longitudinal PO1-PO12 Attainment across entire program
  const longitudinalPOs = [];
  const weakPOs = [];
  const poMap = new Map();
  let sumPOAttainment = 0;

  for (let p = 1; p <= 12; p++) {
    const poKey = `PO${p}`;
    const weight = poCreditSums[poKey];
    const attainmentScore = weight > 0 ? Math.round((poWeightedSums[poKey] / weight) * 10) / 10 : 0;

    sumPOAttainment += attainmentScore;
    poMap.set(poKey, attainmentScore);

    const isPassed = attainmentScore >= targetThreshold;

    const poObj = {
      po: poKey,
      name: PO_DEFINITIONS[poKey],
      attainment: attainmentScore,
      threshold: targetThreshold,
      isPassed,
      mappedCredits: weight,
      evaluatedCoursesCount: poCourseCounts[poKey],
    };

    longitudinalPOs.push(poObj);

    if (!isPassed) {
      weakPOs.push({
        po: poKey,
        attainment: attainmentScore,
        description: PO_DEFINITIONS[poKey],
        gapPercentage: Math.round((targetThreshold - attainmentScore) * 10) / 10,
      });
    }
  }

  const overallPoAttainment = Math.round((sumPOAttainment / 12) * 10) / 10;

  // Recommendation Status Logic
  let recommendationStatus = '';
  let badgeColor = '';

  if (cgpa >= 3.50 && weakPOs.length === 0) {
    recommendationStatus = 'Eligible for Recommendation';
    badgeColor = 'green';
  } else if (cgpa >= 3.50 && weakPOs.length > 0) {
    recommendationStatus = 'Not Recommended (PO Gap Detected)';
    badgeColor = 'red';
  } else if (cgpa < 3.50 && weakPOs.length === 0) {
    recommendationStatus = 'Conditional (Low CGPA)';
    badgeColor = 'yellow';
  } else {
    recommendationStatus = 'Ineligible (Low CGPA & PO Gaps)';
    badgeColor = 'red';
  }

  // Composite Recommendation Eligibility Score (0–100)
  const cgpaNormalized = (cgpa / 4.0) * 100;
  let recommendationScore = (0.60 * overallPoAttainment) + (0.40 * cgpaNormalized) - (weakPOs.length * 5);
  recommendationScore = Math.max(0, Math.min(100, Math.round(recommendationScore * 10) / 10));

  // Preserve existing faculty notes if record exists
  const existingRecord = await StudentLongitudinalPO.findOne({ student: studentDbId });
  const facultyNotes = existingRecord?.facultyNotes || '';

  // Upsert into StudentLongitudinalPO collection
  const record = await StudentLongitudinalPO.findOneAndUpdate(
    { student: studentDbId },
    {
      student: studentDbId,
      studentId: studentIdStr,
      studentName: student.studentName || student.name,
      email: student.email || '',
      batch: student.batchId?.batchName || 'N/A',
      section: student.sectionId?.sectionName || 'N/A',
      threshold: targetThreshold,
      cgpa,
      totalAttemptedCredits,
      overallPoAttainment,
      recommendationScore,
      recommendationStatus,
      badgeColor,
      weakPOCount: weakPOs.length,
      weakPOs,
      poAttainments: poMap,
      longitudinalPOs,
      completedCourses,
      completedCoursesCount: completedCourses.length,
      facultyNotes,
      lastCalculatedAt: new Date(),
    },
    { upsert: true, returnDocument: 'after' }
  );

  // Also upsert into PORecommendation collection (porecommendations in MongoDB)
  await PORecommendation.findOneAndUpdate(
    { student: studentDbId },
    {
      student: studentDbId,
      studentIdStr,
      threshold: targetThreshold,
      cgpa,
      overallPoAttainment,
      recommendationScore,
      status: recommendationStatus,
      weakPOs,
      poAttainments: poMap,
      facultyNotes,
      updatedAt: new Date(),
    },
    { upsert: true, returnDocument: 'after' }
  );

  return record;
}

/**
 * Bulk Sync All Students into StudentLongitudinalPO collection
 */
export async function syncAllStudentsLongitudinalPO(targetThreshold = 60) {
  const students = await Student.find().populate('batchId sectionId');
  let count = 0;
  
  const batchSize = 10;
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);
    await Promise.all(batch.map(async (s) => {
      try {
        await calculateAndSyncStudentPO(s._id, targetThreshold);
        count++;
      } catch (err) {
        console.error(`Failed to sync PO for student ${s.studentId}:`, err.message);
      }
    }));
  }
  return count;
}

/**
 * Sync Only Allocated Students of a Specific Course Offering into StudentLongitudinalPO collection
 */
export async function syncCourseOfferingStudentsLongitudinalPO(offeringId, targetThreshold = 60) {
  if (!offeringId || !mongoose.Types.ObjectId.isValid(offeringId)) return 0;

  const offering = await CourseOffering.findById(offeringId);
  if (!offering) return 0;

  let studentIds = [];
  const batchId = offering.batch;
  const sectionName = offering.section;
  const sectionDoc = await Section.findOne({ batchId, sectionName });

  if (sectionDoc) {
    const studentsInSection = await Student.find({ batchId, sectionId: sectionDoc._id }).select('_id');
    studentIds = studentsInSection.map(s => s._id.toString());
  }

  if (studentIds.length === 0) {
    const enrollments = await Enrollment.find({ courseOffering: offeringId }).select('student');
    studentIds = Array.from(new Set(enrollments.map(e => e.student.toString())));
  }

  if (studentIds.length === 0) return 0;

  let count = 0;
  await Promise.all(studentIds.map(async (sId) => {
    try {
      await calculateAndSyncStudentPO(sId, targetThreshold);
      count++;
    } catch (err) {
      console.error(`Failed to sync PO for student ${sId}:`, err.message);
    }
  }));

  console.log(`Synchronized longitudinal PO records for ${count} allocated students of course offering.`);
  return count;
}

/**
 * GET /api/po-recommendation/students
 * Get pre-calculated student longitudinal PO summary list directly from MongoDB collection
 */
router.get('/po-recommendation/students', async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold) || 60;
    const { offeringId, teacherId } = req.query;

    let targetStudentIds = null;

    if (offeringId && mongoose.Types.ObjectId.isValid(offeringId)) {
      const offering = await CourseOffering.findById(offeringId);
      if (offering) {
        const batchId = offering.batch;
        const sectionName = offering.section;
        const sectionDoc = await Section.findOne({ batchId, sectionName });
        const queryFilter = {};
        if (batchId) queryFilter.batchId = batchId;
        if (sectionDoc) queryFilter.sectionId = sectionDoc._id;

        const studentsInSection = await Student.find(queryFilter);
        for (const s of studentsInSection) {
          await Enrollment.findOneAndUpdate(
            { student: s._id, courseOffering: offeringId },
            {},
            { upsert: true }
          );
        }

        if (studentsInSection.length > 0) {
          targetStudentIds = studentsInSection.map(s => s._id.toString());
        } else {
          const enrollments = await Enrollment.find({ courseOffering: offeringId }).select('student');
          targetStudentIds = enrollments.map(e => e.student.toString());
        }
      } else {
        const enrollments = await Enrollment.find({ courseOffering: offeringId }).select('student');
        targetStudentIds = enrollments.map(e => e.student.toString());
      }
    } else if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      const teacherOfferings = await CourseOffering.find({ teacher: teacherId }).select('_id');
      const offeringIds = teacherOfferings.map(o => o._id);
      const enrollments = await Enrollment.find({ courseOffering: { $in: offeringIds } }).select('student');
      targetStudentIds = Array.from(new Set(enrollments.map(e => e.student.toString())));
    }

    // Convert targetStudentIds to Mongoose ObjectIds for 100% accurate MongoDB matching
    const query = {};
    if (targetStudentIds !== null) {
      const objectIds = targetStudentIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      query.student = { $in: objectIds };
    }

    // 1. Fetch pre-calculated longitudinal PO records instantly
    let records = await StudentLongitudinalPO.find(query).sort({ studentId: 1 });

    // 2. Parallelize sync for missing students or on explicit refresh parameter
    if (targetStudentIds !== null) {
      const existingStudentIdSet = new Set(records.map(r => r.student.toString()));
      const missingStudentIds = targetStudentIds.filter(id => !existingStudentIdSet.has(id.toString()));

      if (missingStudentIds.length > 0 || req.query.refresh === 'true') {
        const syncTargets = req.query.refresh === 'true' ? targetStudentIds : missingStudentIds;
        await Promise.all(
          syncTargets.map(sId =>
            calculateAndSyncStudentPO(sId, threshold).catch(err =>
              console.error(`Sync error for student ${sId}:`, err.message)
            )
          )
        );
        records = await StudentLongitudinalPO.find(query).sort({ studentId: 1 });
      }
    } else if (records.length === 0 || req.query.refresh === 'true') {
      await syncAllStudentsLongitudinalPO(threshold);
      records = await StudentLongitudinalPO.find(query).sort({ studentId: 1 });
    }

    const summaries = records.map(r => ({
      id: r.student,
      studentId: r.studentId,
      studentName: r.studentName,
      cgpa: r.cgpa,
      overallPoAttainment: r.overallPoAttainment,
      recommendationScore: r.recommendationScore,
      recommendationStatus: r.recommendationStatus,
      badgeColor: r.badgeColor,
      weakPOCount: r.weakPOCount,
      completedCoursesCount: r.completedCoursesCount,
      lastCalculatedAt: r.lastCalculatedAt,
    }));

    res.status(200).json({ ok: true, threshold, students: summaries });
  } catch (error) {
    console.error('Error fetching PO recommendation students:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

/**
 * GET /api/po-recommendation/student/:studentId
 * Get comprehensive longitudinal PO aggregation record for a specific student
 */
router.get('/po-recommendation/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const threshold = parseFloat(req.query.threshold) || 60;
    const recalculate = req.query.recalculate === 'true';

    let student = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId).populate('batchId sectionId');
    }
    if (!student) {
      student = await Student.findOne({ studentId }).populate('batchId sectionId');
    }

    if (!student) {
      return res.status(404).json({ ok: false, message: 'Student not found.' });
    }

    // Always calculate live longitudinal PO aggregation dynamically to ensure up-to-date real-time metrics
    const record = await calculateAndSyncStudentPO(student._id, threshold);

    res.status(200).json({
      ok: true,
      student: {
        id: student._id,
        studentId: student.studentId,
        studentName: student.studentName || student.name,
        email: student.email || '',
        batch: student.batchId?.batchName || record.batch || 'N/A',
        section: student.sectionId?.sectionName || record.section || 'N/A',
      },
      threshold: record.threshold,
      cgpa: record.cgpa,
      totalAttemptedCredits: record.totalAttemptedCredits,
      overallPoAttainment: record.overallPoAttainment,
      recommendationScore: record.recommendationScore,
      recommendationStatus: record.recommendationStatus,
      badgeColor: record.badgeColor,
      weakPOs: record.weakPOs,
      longitudinalPOs: record.longitudinalPOs,
      completedCourses: record.completedCourses,
      facultyNotes: record.facultyNotes || '',
      updatedAt: record.lastCalculatedAt,
    });
  } catch (error) {
    console.error('Error fetching student longitudinal PO profile:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

/**
 * POST /api/po-recommendation/sync-all
 * Triggers bulk recalculation & synchronization for all students in MongoDB
 */
router.post('/po-recommendation/sync-all', async (req, res) => {
  try {
    const threshold = parseFloat(req.body.threshold) || 60;
    const syncedCount = await syncAllStudentsLongitudinalPO(threshold);

    res.status(200).json({
      ok: true,
      message: `Successfully synchronized longitudinal PO attainment for ${syncedCount} students.`,
      syncedCount,
    });
  } catch (error) {
    console.error('Error syncing all students PO:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

/**
 * POST /api/po-recommendation/save
 * Save teacher notes and recommendation record in MongoDB
 */
router.post('/po-recommendation/save', async (req, res) => {
  try {
    const { studentId, threshold = 60, facultyNotes = '' } = req.body;

    let student = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId);
    }
    if (!student) {
      student = await Student.findOne({ studentId });
    }

    if (!student) {
      return res.status(404).json({ ok: false, message: 'Student not found.' });
    }

    const record = await calculateAndSyncStudentPO(student._id, threshold);
    record.facultyNotes = facultyNotes;
    await record.save();

    res.status(200).json({
      ok: true,
      message: 'Faculty recommendation record saved successfully.',
      recommendation: record,
    });
  } catch (error) {
    console.error('Error saving faculty recommendation:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});

export default router;
