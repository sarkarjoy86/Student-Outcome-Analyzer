import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'd:/Codes With Joy/Capstone Project Main Folder/Capstone Project Updated x4/.env' });

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  fullName: String
});

const User = mongoose.model('User', userSchema, 'users');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({ role: 'teacher' });
    console.log("Teachers:");
    users.forEach(u => console.log(`- Name: ${u.fullName}, Email: ${u.email}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
