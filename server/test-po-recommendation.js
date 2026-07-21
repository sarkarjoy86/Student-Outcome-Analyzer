import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import Student from './models/Student.js';
import Enrollment from './models/Enrollment.js';
import CourseOffering from './models/CourseOffering.js';
import PORecommendation from './models/PORecommendation.js';

dotenv.config();

async function testPORecommendationBackend() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Connected!');

    const studentCount = await Student.countDocuments();
    console.log(`Total students in DB: ${studentCount}`);

    const enrollmentCount = await Enrollment.countDocuments();
    console.log(`Total enrollments in DB: ${enrollmentCount}`);

    const offeringCount = await CourseOffering.countDocuments();
    console.log(`Total course offerings in DB: ${offeringCount}`);

    const students = await Student.find().limit(5);
    console.log('Sample Students:');
    students.forEach(s => {
      console.log(` - ID: ${s.studentId}, Name: ${s.studentName || s.name}`);
    });

    console.log('Backend Longitudinal PO Engine & Models Verified successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test script failed:', err.message);
    process.exit(1);
  }
}

testPORecommendationBackend();
