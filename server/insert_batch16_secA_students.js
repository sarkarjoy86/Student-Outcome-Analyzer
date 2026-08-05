import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import Batch from './models/Batch.js';
import Section from './models/Section.js';
import Student from './models/Student.js';
import mongoose from 'mongoose';

dotenv.config();

const studentsData = [
  { studentId: "822220105101003", studentName: "Foysal Ahamed" },
  { studentId: "822220105101004", studentName: "Muttakin Ahmed" },
  { studentId: "822220105101008", studentName: "Mohammed Akib Kamal" },
  { studentId: "822220105101009", studentName: "Md. Shafin Ahammad Hredoy" },
  { studentId: "822220105101011", studentName: "Md. Ifthakhar Alam Shams" },
  { studentId: "822220105101013", studentName: "Md. Jishan Haydar" },
  { studentId: "822220105101017", studentName: "Mostafa Main Uddin" },
  { studentId: "822220105101018", studentName: "Md. Zakirun Noby" },
  { studentId: "822220105101019", studentName: "Md. Raphid Bin Azad" },
  { studentId: "822220105101020", studentName: "Md. Tahsin Azad Shaikat" },
  { studentId: "822220105101024", studentName: "Md. Rakibul Hassan" },
  { studentId: "822220105101032", studentName: "Md. Irfanul Islam Rohan" },
  { studentId: "822220105101033", studentName: "Mafid Bin Mizan" },
  { studentId: "822220105101035", studentName: "Tanjid Rahman" },
  { studentId: "822220105101041", studentName: "Md. Al-Amin Bhuiyan" },
  { studentId: "822220105101042", studentName: "Mohammad Sakibul Hasan" },
  { studentId: "822220105101043", studentName: "Md Nasim Mahamud Jabed" },
  { studentId: "822220105101046", studentName: "Md. Shakibul Islam Tamim" },
  { studentId: "822220105101049", studentName: "Md.Tasrifur Rahman" },
  { studentId: "822220205101001", studentName: "Jannatul Tabassum Nahar" },
  { studentId: "822220205101002", studentName: "Faria Islam" },
  { studentId: "822220205101005", studentName: "Afruja Mazumder" },
  { studentId: "822220205101006", studentName: "Saima Sharmin" },
  { studentId: "822220205101007", studentName: "Afrin Sultana" },
  { studentId: "822220205101010", studentName: "Farjana Amin Riya" },
  { studentId: "822220205101012", studentName: "Sumiya Akter Eti" },
  { studentId: "822220205101016", studentName: "Syeda Eashfi Sakima Insha" },
  { studentId: "822220205101022", studentName: "Dipa Barua" },
  { studentId: "822220205101023", studentName: "Jannatul Rabaya Ruba" },
  { studentId: "822220205101025", studentName: "Tamanna Akter" },
  { studentId: "822220205101026", studentName: "Puja Banik" },
  { studentId: "822220205101027", studentName: "Umme Salma Momo" },
  { studentId: "822220205101028", studentName: "Sabikun Nahar Nova" },
  { studentId: "822220205101029", studentName: "Afra Rahman" },
  { studentId: "822220205101031", studentName: "Ummay Ayesha Rahman Mily" },
  { studentId: "822220205101036", studentName: "Nipa Akhter" },
  { studentId: "822220205101038", studentName: "Roksana Alam" },
  { studentId: "822220205101039", studentName: "Nishat Tasnim" },
  { studentId: "822220205101040", studentName: "Nosrat Jahan Mohima" },
  { studentId: "822220205101045", studentName: "Most.Sumaiya Akter" },
  { studentId: "822220205101047", studentName: "Mashrat Alam Mahi" },
  { studentId: "822220205101050", studentName: "Nishat Sima Chowdhury Nishat" }
];

async function insertStudents() {
  await connectDB();
  console.log("Connected to Database.");

  // Find Batch 16
  let batch = await Batch.findOne({ batchName: "16" });
  if (!batch) {
    batch = await Batch.findOne({ batchName: /16/ });
  }

  if (!batch) {
    throw new Error("Batch 16 not found!");
  }
  console.log(`Found Batch: ${batch.batchName} (${batch._id})`);

  // Find Section A under Batch 16
  let section = await Section.findOne({ batchId: batch._id, sectionName: "A" });
  if (!section) {
    section = await Section.findOne({ batchId: batch._id, sectionName: /A/i });
  }

  if (!section) {
    throw new Error("Section A for Batch 16 not found!");
  }
  console.log(`Found Section: ${section.sectionName} (${section._id})`);

  let addedCount = 0;
  let updatedCount = 0;

  for (const s of studentsData) {
    const filter = { studentId: s.studentId };
    const update = {
      $set: {
        studentId: s.studentId,
        studentName: s.studentName,
        batchId: batch._id,
        sectionId: section._id,
        email: ''
      }
    };

    const res = await Student.updateOne(filter, update, { upsert: true });
    if (res.upsertedCount > 0) {
      addedCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(`Successfully processed ${studentsData.length} students!`);
  console.log(`Newly inserted: ${addedCount}`);
  console.log(`Updated existing: ${updatedCount}`);

  await mongoose.disconnect();
}

insertStudents().catch(err => {
  console.error("Error inserting students:", err);
  process.exit(1);
});
