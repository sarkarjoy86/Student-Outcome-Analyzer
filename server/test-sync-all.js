import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import StudentLongitudinalPO from './models/StudentLongitudinalPO.js';
import { syncAllStudentsLongitudinalPO } from './routes/poRecommendationRoutes.js';

dotenv.config();

async function testSync() {
  console.log('Connecting to MongoDB...');
  await connectDB();

  console.log('Syncing all students into StudentLongitudinalPO collection...');
  const count = await syncAllStudentsLongitudinalPO(60);
  console.log(`Synced ${count} students successfully!`);

  const joyRecord = await StudentLongitudinalPO.findOne({ studentId: '0822220105101086' });
  console.log('\n========================================');
  console.log('JOY SARKAR LONGITUDINAL PO RECORD FROM MONGO DB:');
  console.log(` - Student ID: ${joyRecord.studentId}`);
  console.log(` - Student Name: ${joyRecord.studentName}`);
  console.log(` - CGPA: ${joyRecord.cgpa.toFixed(2)}`);
  console.log(` - Overall PO Attainment: ${joyRecord.overallPoAttainment}%`);
  console.log(` - Recommendation Score: ${joyRecord.recommendationScore} / 100`);
  console.log(` - Recommendation Status: ${joyRecord.recommendationStatus}`);
  console.log(` - Completed Courses Count: ${joyRecord.completedCoursesCount}`);
  console.log(` - Weak PO Count (<60%): ${joyRecord.weakPOCount}`);
  console.log(` - PO1: ${joyRecord.poAttainments.get('PO1')}%`);
  console.log(` - PO2: ${joyRecord.poAttainments.get('PO2')}%`);
  console.log(` - PO9: ${joyRecord.poAttainments.get('PO9')}%`);

  process.exit(0);
}

testSync();
