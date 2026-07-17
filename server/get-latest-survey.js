import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './lib/db.js';
import Survey from './models/Survey.js';

async function main() {
  await connectDB();
  const survey = await Survey.findOne().sort({ createdAt: -1 });
  if (survey) {
    console.log('SURVEY_ID:', survey._id.toString());
    console.log('SURVEY_STATUS:', survey.status);
    console.log('SURVEY_URL_ID:', survey.surveyId);
  } else {
    console.log('NO SURVEY FOUND');
  }
  mongoose.disconnect();
}

main();
