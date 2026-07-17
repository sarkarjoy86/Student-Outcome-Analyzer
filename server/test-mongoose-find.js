import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from './lib/db.js';
import Section from './models/Section.js';
import fs from 'fs';

async function runTest() {
  try {
    await connectDB();
    console.log('Connected to DB');
    const sections = await Section.find({ batchId: new mongoose.Types.ObjectId("6a43f3c3ed35b548e76854fe") });
    fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/mongoose-find-result.txt', `Success! Sections: ${JSON.stringify(sections)}`, 'utf8');
  } catch (err) {
    fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/mongoose-find-result.txt', `Error: ${err.message}\nStack: ${err.stack}`, 'utf8');
  }
}

runTest();
