import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import Student from './models/Student.js';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
  await connectDB();
  const students = await Student.find({}, 'studentId studentName batchId sectionId');
  console.log("All student IDs:", students.map(s => s.studentId));
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
