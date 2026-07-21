import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import StudentLongitudinalPO from './models/StudentLongitudinalPO.js';
import PORecommendation from './models/PORecommendation.js';

dotenv.config();

async function checkCollections() {
  await connectDB();

  const count1 = await StudentLongitudinalPO.countDocuments();
  const count2 = await PORecommendation.countDocuments();

  console.log(`Documents in 'studentlongitudinalpos' collection: ${count1}`);
  console.log(`Documents in 'porecommendations' collection: ${count2}`);

  const sample1 = await StudentLongitudinalPO.findOne();
  console.log('Sample in studentlongitudinalpos:', sample1 ? sample1.studentName : 'None');

  const sample2 = await PORecommendation.findOne();
  console.log('Sample in porecommendations:', sample2 ? sample2.studentIdStr : 'None');

  process.exit(0);
}

checkCollections();
