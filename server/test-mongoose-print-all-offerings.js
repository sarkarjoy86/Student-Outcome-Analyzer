import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from './lib/db.js';
import fs from 'fs';

// Import correct models
import './models/Course.js';
import './models/Batch.js';
import './models/AcademicSession.js';
import './models/User.js';
import CourseOffering from './models/CourseOffering.js';

async function runFind() {
  try {
    await connectDB();
    const offerings = await CourseOffering.find().populate('course batch');
    let out = 'Offerings found:\n';
    offerings.forEach(o => {
      out += `ID: ${o._id.toString()} | Course: ${o.course?.courseCode} - ${o.course?.courseName} | Section: ${o.section} | Batch: ${o.batch?.name || o.batch?.batchName}\n`;
    });
    fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/all-offerings.txt', out, 'utf8');
    console.log('Done, wrote results to all-offerings.txt');
  } catch (err) {
    console.error('Error finding CourseOfferings:', err);
  } finally {
    mongoose.disconnect();
  }
}

runFind();
