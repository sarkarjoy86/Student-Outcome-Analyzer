import dns from 'dns';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

async function exportCollections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'obisystem' });
    console.log('Connected to MongoDB successfully.');
    const db = mongoose.connection.db;
    const outDir = path.join(process.cwd(), 'data', 'exported_collections');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const collections = ['coattainments', 'poattainments', 'courseofferings', 'courses'];
    for (const colName of collections) {
      const docs = await db.collection(colName).find({}).toArray();
      const filePath = path.join(outDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
      console.log(`Exported ${docs.length} docs to ${filePath}`);
    }

    // Inspect one sample from coattainments and poattainments
    const sampleCO = await db.collection('coattainments').findOne({});
    const samplePO = await db.collection('poattainments').findOne({});
    console.log('Sample CO Attainment:', JSON.stringify(sampleCO));
    console.log('Sample PO Attainment:', JSON.stringify(samplePO));

    await mongoose.disconnect();
    console.log('Done export.');
  } catch (err) {
    console.error('Export failed:', err);
    process.exit(1);
  }
}

exportCollections();
