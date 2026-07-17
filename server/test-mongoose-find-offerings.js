import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from './lib/db.js';

// Import correct models
import './models/Course.js';
import './models/Batch.js';
import './models/AcademicSession.js';
import './models/User.js';
import CourseOffering from './models/CourseOffering.js';

async function runFind() {
  try {
    await connectDB();
    console.log('Connected to DB');
    const offering = await CourseOffering.findOne().populate('course batch');
    if (offering) {
      console.log('Found course offering ID:', offering._id.toString());
      console.log('Course details:', {
        courseCode: offering.course?.courseCode,
        courseName: offering.course?.courseName,
        section: offering.section
      });
    } else {
      console.log('No CourseOfferings found in DB.');
    }
  } catch (err) {
    console.error('Error finding CourseOfferings:', err);
  } finally {
    mongoose.disconnect();
  }
}

runFind();
