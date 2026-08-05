import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import Student from './models/Student.js';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
  await connectDB();
  const sample = await Student.find({}).limit(5);
  console.log("Total students in DB:", await Student.countDocuments({}));
  console.log("Sample existing students:", sample);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
