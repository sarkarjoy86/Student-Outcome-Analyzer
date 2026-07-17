import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'd:/Codes With Joy/Capstone Project Main Folder/Capstone Project Updated x6/.env' });

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'obisystem';
  let log = '';
  
  log += `Connecting to URI: ${uri}\n`;
  log += `Database Name: ${dbName}\n`;

  try {
    await mongoose.connect(uri, { dbName });
    log += 'MongoDB connection SUCCESS!\n';
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    log += 'Collections in database:\n';
    collections.forEach(col => {
      log += ` - ${col.name}\n`;
    });
    
    await mongoose.connection.close();
  } catch (err) {
    log += `MongoDB connection FAILED: ${err.message}\n`;
    log += `Stack: ${err.stack}\n`;
  }
  
  fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/db-error-utf8.txt', log, 'utf8');
}

testConnection();
