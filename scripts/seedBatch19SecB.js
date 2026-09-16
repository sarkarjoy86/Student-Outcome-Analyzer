import 'dotenv/config';
import { connectDB } from '../server/lib/db.js';
import Batch from '../server/models/Batch.js';
import Section from '../server/models/Section.js';
import Student from '../server/models/Student.js';

const studentList = [
  // SL 33 & 34
  { sl: 33, studentId: "822220105101064", name: "Ashiqur Rahman Mozumder" },
  { sl: 34, studentId: "822220205101021", name: "Nikita Sen Singha" },

  // SL 35 & 36 skipped (Retake students)

  // SL 37 to 58
  { sl: 37, studentId: "1118096", name: "A. N. S. Masum Pamir" },
  { sl: 38, studentId: "1119052", name: "Sadia Akter Moyna" },
  { sl: 39, studentId: "1119054", name: "Syed Azmain Hossain Adib" },
  { sl: 40, studentId: "1119060", name: "Tasriba Jerin Subah" },
  { sl: 41, studentId: "1119064", name: "Reyana" },
  { sl: 42, studentId: "1119065", name: "Md. Rabiul Alam" },
  { sl: 43, studentId: "1119068", name: "Sumaiya Akter" },
  { sl: 44, studentId: "1119069", name: "Tanjila Ahmed" },
  { sl: 45, studentId: "1119072", name: "Utsha Datta" },
  { sl: 46, studentId: "1119074", name: "Md. Ishtiyaq alam" },
  { sl: 47, studentId: "1119081", name: "Samiya Binta Akbar" },
  { sl: 48, studentId: "1119082", name: "Pranay Majumdar" },
  { sl: 49, studentId: "1119083", name: "Ankan Debnath" },
  { sl: 50, studentId: "1119084", name: "Tultul" },
  { sl: 51, studentId: "1119085", name: "Maliha Hossain" },
  { sl: 52, studentId: "1119086", name: "Kazi Din Mohammod Emon" },
  { sl: 53, studentId: "1119088", name: "M. Sadi Hasan Fahim" },
  { sl: 54, studentId: "1119089", name: "Faisal Ahmed Bhuiyan" },
  { sl: 55, studentId: "1119091", name: "Tamanna Akter" },
  { sl: 56, studentId: "1119092", name: "Sadia Zaman Urmi Mozumder" },
  { sl: 57, studentId: "1119096", name: "Farhan Shariar Mahi" },
  { sl: 58, studentId: "1119097", name: "Nafeeza Noor" },
];

async function seed() {
  console.log(`Starting to seed ${studentList.length} students into Batch 19 Section B...`);
  await connectDB();

  // Find Batch 19
  const batch19 = await Batch.findOne({ $or: [{ batchName: "19" }, { name: "19" }] });
  if (!batch19) {
    throw new Error("Batch 19 not found in database!");
  }
  console.log(`Found Batch 19 (ID: ${batch19._id})`);

  // Find Section B of Batch 19
  const sectionB = await Section.findOne({ batchId: batch19._id, sectionName: "B" });
  if (!sectionB) {
    throw new Error("Section B not found for Batch 19!");
  }
  console.log(`Found Section B (ID: ${sectionB._id})`);

  let addedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < studentList.length; i++) {
    const s = studentList[i];
    const existing = await Student.findOne({ studentId: s.studentId });
    if (existing) {
      existing.studentName = s.name;
      existing.batchId = batch19._id;
      existing.sectionId = sectionB._id;
      await existing.save();
      updatedCount++;
      console.log(`[${i + 1}/${studentList.length}] (SL ${s.sl}) Updated: ${s.studentId} - ${s.name}`);
    } else {
      await Student.create({
        studentId: s.studentId,
        studentName: s.name,
        batchId: batch19._id,
        sectionId: sectionB._id,
      });
      addedCount++;
      console.log(`[${i + 1}/${studentList.length}] (SL ${s.sl}) Created: ${s.studentId} - ${s.name}`);
    }
  }

  // Verification
  const total = await Student.countDocuments({ batchId: batch19._id, sectionId: sectionB._id });
  console.log(`\nDone! Created: ${addedCount}, Updated: ${updatedCount}. Total in Batch 19 Sec B: ${total}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
