import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from './lib/db.js';
import CourseOffering from './models/CourseOffering.js';

async function test() {
  try {
    await connectDB();
    const offering = await CourseOffering.findById('6a5a0afc94f02c3404861cb7');
    console.log('Result of finding by direct ID:', offering);
  } catch (err) {
    console.error('Error querying:', err);
  } finally {
    mongoose.disconnect();
  }
}
test();
