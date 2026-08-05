import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import Student from './models/Student.js';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
  await connectDB();
  const count = await Student.countDocuments({
    batchId: '6a43f3c3ed35b548e76854fe',
    sectionId: '6a59ff3594f02c3404861c95'
  });
  console.log(`Current students in Batch 16 Section A: ${count}`);

  const sample = await Student.find({
    batchId: '6a43f3c3ed35b548e76854fe',
    sectionId: '6a59ff3594f02c3404861c95'
  }).limit(5);
  console.log("Sample students:", sample);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
