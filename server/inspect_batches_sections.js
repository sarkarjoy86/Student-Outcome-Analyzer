import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import Batch from './models/Batch.js';
import Section from './models/Section.js';
import Student from './models/Student.js';
import mongoose from 'mongoose';

dotenv.config();

async function run() {
  await connectDB();
  console.log("Connected to DB");

  const batches = await Batch.find({});
  console.log("--- BATCHES ---");
  console.log(batches);

  const sections = await Section.find({}).populate('batchId');
  console.log("--- SECTIONS ---");
  console.log(sections);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
