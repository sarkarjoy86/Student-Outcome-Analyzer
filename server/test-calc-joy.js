import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import Student from './models/Student.js';
import Enrollment from './models/Enrollment.js';
import CourseOffering from './models/CourseOffering.js';
import Course from './models/Course.js';
import AcademicSession from './models/AcademicSession.js';
import Assessment from './models/Assessment.js';
import QuestionMetadata from './models/QuestionMetadata.js';
import StudentMarks from './models/StudentMarks.js';

dotenv.config();

const norm = (str) => (str || '').toString().toUpperCase().replace(/\s+/g, '');

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

async function testCalcJoy() {
  await connectDB();

  const student = await Student.findOne({ studentName: /Joy Sarkar/i });
  console.log('Student:', student.studentName, student.studentId);

  const enrollments = await Enrollment.find({ student: student._id }).populate({
    path: 'courseOffering',
    populate: [{ path: 'course' }, { path: 'semester' }]
  });

  const poWeightedSums = {};
  const poCreditSums = {};
  for (let i = 1; i <= 12; i++) {
    poWeightedSums[`PO${i}`] = 0;
    poCreditSums[`PO${i}`] = 0;
  }

  let totalCreditPoints = 0;
  let totalAttemptedCredits = 0;

  for (const en of enrollments) {
    const off = en.courseOffering;
    if (!off || !off.course) continue;

    const course = off.course;
    const credits = parseFloat(course.creditHours) || 3;
    const assessments = await Assessment.find({ courseOffering: off._id });
    if (assessments.length === 0) continue;

    const aIds = assessments.map(a => a._id);
    const metadataDocs = await QuestionMetadata.find({ assessment: { $in: aIds } });
    const metadataMap = {};
    metadataDocs.forEach(m => {
      metadataMap[m.assessment.toString()] = m.questions || [];
    });

    const marksDocs = await StudentMarks.find({ student: student._id, courseOffering: off._id });
    const marksMap = {};
    marksDocs.forEach(m => {
      marksMap[m.assessment.toString()] = m;
    });

    // 1. Course CO Attainments
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

    // 2. Course PO Mapping
    const coPoMapping = off.coPoMapping || course.coPoMapping || {};
    const coursePOs = {};

    for (let p = 1; p <= 12; p++) {
      const targetPO = `PO${p}`;
      const mappedCOKeys = [];

      Object.keys(coPoMapping).forEach(rawCoKey => {
        const normCo = norm(rawCoKey);
        const poMap = coPoMapping[rawCoKey] || {};
        Object.keys(poMap).forEach(rawPoKey => {
          if (norm(rawPoKey) === targetPO && (poMap[rawPoKey] === 1 || poMap[rawPoKey] === true)) {
            mappedCOKeys.push(normCo);
          }
        });
      });

      if (mappedCOKeys.length > 0) {
        let maxCoAttainment = 0;
        mappedCOKeys.forEach(coK => {
          if (courseCOs[coK] > maxCoAttainment) {
            maxCoAttainment = courseCOs[coK];
          }
        });
        coursePOs[targetPO] = maxCoAttainment;

        poWeightedSums[targetPO] += maxCoAttainment * credits;
        poCreditSums[targetPO] += credits;
      } else {
        coursePOs[targetPO] = 0;
      }
    }

    console.log(`\nCourse: ${course.courseCode} (${credits} cr)`);
    console.log(`  - CO Attainments:`, courseCOs);
    console.log(`  - PO Attainments:`, coursePOs);
  }

  console.log(`\n========================================`);
  console.log(`LONGITUDINAL PO ATTAINMENTS FOR JOY SARKAR:`);
  for (let p = 1; p <= 12; p++) {
    const targetPO = `PO${p}`;
    const w = poCreditSums[targetPO];
    const score = w > 0 ? (poWeightedSums[targetPO] / w) : 0;
    console.log(`  - ${targetPO}: ${score.toFixed(2)}% (Weighted across ${w} credits)`);
  }

  process.exit(0);
}

testCalcJoy();
