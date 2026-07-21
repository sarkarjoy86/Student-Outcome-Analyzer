import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import Student from './models/Student.js';
import Enrollment from './models/Enrollment.js';
import CourseOffering from './models/CourseOffering.js';
import Course from './models/Course.js';
import AcademicSession from './models/AcademicSession.js';

dotenv.config();

const norm = (str) => (str || '').toString().toUpperCase().replace(/\s+/g, '');

async function testMerge() {
  await connectDB();

  const student = await Student.findOne({ studentName: /Joy Sarkar/i });
  const enrollments = await Enrollment.find({ student: student._id }).populate({
    path: 'courseOffering',
    populate: [{ path: 'course' }, { path: 'semester' }]
  });

  for (const en of enrollments) {
    const off = en.courseOffering;
    if (!off || !off.course) continue;

    console.log(`\nCourse: ${off.course.courseCode} - ${off.course.courseName}`);
    console.log(` Offering coPoMapping:`, JSON.stringify(off.coPoMapping || {}));
    console.log(` Master course coPoMapping:`, JSON.stringify(off.course.coPoMapping || {}));

    const merged = { ...(off.course.coPoMapping || {}), ...(off.coPoMapping || {}) };
    console.log(` Merged coPoMapping:`, JSON.stringify(merged));

    // Check mapped POs
    const mappedPOs = new Set();
    Object.keys(merged).forEach(rawCo => {
      const poMap = merged[rawCo] || {};
      Object.keys(poMap).forEach(rawPo => {
        if (poMap[rawPo] === 1 || poMap[rawPo] === true) {
          mappedPOs.add(norm(rawPo));
        }
      });
    });
    console.log(` Mapped POs for this course:`, Array.from(mappedPOs));
  }

  process.exit(0);
}

testMerge();
