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

async function debugJoy() {
  await connectDB();

  // Find Joy Sarkar
  const student = await Student.findOne({ studentName: /Joy Sarkar/i });
  console.log('Student found:', student);

  if (!student) {
    console.log('Joy Sarkar not found');
    process.exit(0);
  }

  // Find enrollments
  const enrollments = await Enrollment.find({ student: student._id }).populate({
    path: 'courseOffering',
    populate: [{ path: 'course' }, { path: 'semester' }]
  });

  console.log(`Found ${enrollments.length} enrollments for ${student.studentName}`);

  for (const en of enrollments) {
    const off = en.courseOffering;
    if (!off) {
      console.log('Enrollment has no course offering!');
      continue;
    }
    console.log(`\n========================================`);
    console.log(`Course Offering ID: ${off._id}`);
    console.log(`Course: ${off.course?.courseCode} - ${off.course?.courseName}`);
    console.log(`coPoMapping on Offering:`, JSON.stringify(off.coPoMapping || {}));
    console.log(`coPoMapping on Course Master:`, JSON.stringify(off.course?.coPoMapping || {}));

    const assessments = await Assessment.find({ courseOffering: off._id });
    console.log(`Assessments count: ${assessments.length}`);
    assessments.forEach(a => {
      console.log(`  - Assessment ID: ${a._id}, name: ${a.name}, type: ${a.type}, maxMarks: ${a.maxMarks}, co: "${a.co}"`);
    });

    const aIds = assessments.map(a => a._id);
    const metadataDocs = await QuestionMetadata.find({ assessment: { $in: aIds } });
    console.log(`Metadata docs count: ${metadataDocs.length}`);
    metadataDocs.forEach(m => {
      console.log(`  - Metadata for assessment ${m.assessment}: questions =`, JSON.stringify(m.questions));
    });

    const marksDocs = await StudentMarks.find({ student: student._id, courseOffering: off._id });
    console.log(`Marks docs count: ${marksDocs.length}`);
    marksDocs.forEach(m => {
      console.log(`  - Mark for assessment ${m.assessment}: totalMark = ${m.totalMark}, questionMarks =`, JSON.stringify(m.questionMarks));
    });
  }

  process.exit(0);
}

debugJoy();
