import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import Survey from './models/Survey.js';
import SurveyResponse from './models/SurveyResponse.js';

async function checkSurveyDb() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'obisystem';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName });
    console.log('Connected to MongoDB.');

    const surveys = await Survey.find({});
    console.log(`--- SURVEYS FOUND (${surveys.length}) ---`);
    surveys.forEach(s => {
      console.log(`ID: ${s._id}, surveyId: ${s.surveyId}, title: ${s.title}, courseOfferingId: ${s.courseOfferingId}`);
    });

    const responses = await SurveyResponse.find({}).populate('studentId');
    console.log(`\n--- SURVEY RESPONSES FOUND (${responses.length}) ---`);
    responses.forEach((r, idx) => {
      console.log(`#${idx + 1}: ID: ${r._id}, surveyId: ${r.surveyId}, student: ${r.studentId?.studentId || r.studentId}, submittedAt: ${r.submittedAt}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error inspecting survey DB:', error);
    process.exit(1);
  }
}

checkSurveyDb();
