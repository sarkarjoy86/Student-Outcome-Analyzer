import 'dotenv/config';
import { connectDB } from '../server/lib/db.js';
import Batch from '../server/models/Batch.js';
import Section from '../server/models/Section.js';
import Student from '../server/models/Student.js';

const studentList = [
  { studentId: "822310205101057", name: "Somaia Mostafa Mim" },
  { studentId: "1118084", name: "Ummul Fabiha Binta" },
  { studentId: "1119002", name: "Khandoker Fariya Afroje Naba" },
  { studentId: "1119003", name: "Md Najmus Sakib Rahatul" },
  { studentId: "1119004", name: "Nesar Uddin Ifag" },
  { studentId: "1119005", name: "Musheu Hakim Firoz" },
  { studentId: "1119006", name: "Sabrina Rahman Tisha" },
  { studentId: "1119007", name: "Rayhan Alam Towhid" },
  { studentId: "1119009", name: "Salbina Nishat Suchi" },
  { studentId: "1119010", name: "Kazi Mahfuz Islam" },
  { studentId: "1119013", name: "Shedratul Muntaha Maisha" },
  { studentId: "1119016", name: "Sumiya Tasmi" },
  { studentId: "1119017", name: "Anika Bushra Lubna" },
  { studentId: "1119018", name: "Jannatul Ferdous" },
  { studentId: "1119022", name: "Mosa Nusrat Jahan Ema" },
  { studentId: "1119025", name: "Robiul Hasan Rayhan" },
  { studentId: "1119026", name: "Jahidul Alam Fahim" },
  { studentId: "1119027", name: "Sabera Subhani Himu" },
  { studentId: "1119028", name: "Faria Islam" },
  { studentId: "1119031", name: "Sharmin Jahan Tisha" },
  { studentId: "1119034", name: "Arfin Hoque Mim" },
  { studentId: "1119036", name: "Safa Rahman" },
  { studentId: "1119037", name: "Md. Rahique Osman" },
  { studentId: "1119039", name: "Tanbin Ahamed Bhuyan" },
  { studentId: "1119041", name: "Ankur Paul" },
  { studentId: "1119042", name: "Kazi Abdun Nur Tusher" },
  { studentId: "1119044", name: "Mimi Akter" },
  { studentId: "1119045", name: "Shanjida Akter" },
  { studentId: "1119046", name: "Israt Jahan Tonwi" },
  { studentId: "1119047", name: "Nowshin Jeba Himi" },
  { studentId: "1119048", name: "Md. Tanvir Hossain" },
  { studentId: "1119050", name: "Shahidul Islam" },
];

async function seed() {
  console.log(`Starting to seed ${studentList.length} students into Batch 19 Section A...`);
  await connectDB();

  // Find Batch 19
  const batch19 = await Batch.findOne({ $or: [{ batchName: "19" }, { name: "19" }] });
  if (!batch19) {
    throw new Error("Batch 19 not found in database!");
  }
  console.log(`Found Batch 19 (ID: ${batch19._id})`);

  // Find Section A of Batch 19
  const sectionA = await Section.findOne({ batchId: batch19._id, sectionName: "A" });
  if (!sectionA) {
    throw new Error("Section A not found for Batch 19!");
  }
  console.log(`Found Section A (ID: ${sectionA._id})`);

  let addedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < studentList.length; i++) {
    const s = studentList[i];
    const existing = await Student.findOne({ studentId: s.studentId });
    if (existing) {
      existing.studentName = s.name;
      existing.batchId = batch19._id;
      existing.sectionId = sectionA._id;
      await existing.save();
      updatedCount++;
      console.log(`[${i + 1}/${studentList.length}] Updated: ${s.studentId} - ${s.name}`);
    } else {
      await Student.create({
        studentId: s.studentId,
        studentName: s.name,
        batchId: batch19._id,
        sectionId: sectionA._id,
      });
      addedCount++;
      console.log(`[${i + 1}/${studentList.length}] Created: ${s.studentId} - ${s.name}`);
    }
  }

  // Verification
  const total = await Student.countDocuments({ batchId: batch19._id, sectionId: sectionA._id });
  console.log(`\nDone! Created: ${addedCount}, Updated: ${updatedCount}. Total in Batch 19 Sec A: ${total}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
