import dotenv from 'dotenv'
dotenv.config()

import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import xlsx from 'xlsx'
import { connectDB } from '../server/lib/db.js'

import ArchivedQuestionBank from '../server/models/ArchivedQuestionBank.js'
import {
  normalizeCourseCode,
  normalizeCourseTitle,
  extractCleanCourseTitle
} from '../server/utils/courseMatcher.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const EXCEL_FILES = [
  path.join(__dirname, '../data/qs/OBE_Questions_Fall_2024.xlsx'),
  path.join(__dirname, '../data/qs/OBE_Questions_Spring_2025.xlsx'),
  path.join(__dirname, '../data/qs/OBE_Questions_Fall_2025.xlsx')
]

function formatAssessmentType(rawType = '') {
  const lower = rawType.toLowerCase().trim()
  if (lower.includes('mid')) return { type: 'midTerm', name: 'Mid Term' }
  if (lower.includes('final')) return { type: 'final', name: 'Final' }
  if (lower.includes('class test') || lower.includes('ct')) return { type: 'cts', name: 'Class Test' }
  return { type: 'other', name: rawType.trim() }
}

function generatePaperHtml(courseCode, courseName, assessmentName, fullSemester, questions) {
  const marksPerQ = assessmentName === 'Mid Term' ? 4 : (assessmentName === 'Final' ? 10 : 5)

  let rowsHtml = ''
  questions.forEach((q, idx) => {
    const qNum = idx + 1
    rowsHtml += `
      <tr>
        <td class="col-qnum-cell" style="border:1px solid #000;padding:6px 8px;font-weight:bold;vertical-align:top;width:28px;text-align:left;">${qNum}.</td>
        <td class="col-content-cell" style="border:1px solid #000;padding:6px 10px;vertical-align:top;line-height:1.45;">${q.text}</td>
        <td class="col-marks-cell" style="border:1px solid #000;padding:6px 8px;text-align:right;font-weight:bold;vertical-align:top;width:50px;">[${marksPerQ}]</td>
      </tr>
    `
  })

  return `
    <div class="obe-exam-paper-container" style="font-family:'Times New Roman',Times,serif;font-size:12pt;color:#111;line-height:1.4;max-width:850px;margin:0 auto;padding:12px;">
      <div style="text-align:center;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:10px;">
        <h2 style="margin:0 0 4px 0;font-size:15pt;font-weight:bold;letter-spacing:0.5px;">BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY</h2>
        <h3 style="margin:0 0 4px 0;font-size:13pt;font-weight:bold;">DEPARTMENT OF COMPUTER SCIENCE &amp; ENGINEERING</h3>
        <p style="margin:2px 0;font-size:12pt;font-weight:bold;">${courseCode}: ${courseName}</p>
        <p style="margin:2px 0;font-size:11pt;font-weight:600;">${assessmentName} Examination — ${fullSemester}</p>
      </div>
      <table class="obe-paper-structure-table" style="width:100%;border-collapse:collapse;border:1px solid #000;table-layout:fixed;margin-top:8px;">
        <colgroup>
          <col style="width:28px;" />
          <col style="width:auto;" />
          <col style="width:50px;" />
        </colgroup>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `.trim()
}

async function runSeed() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment.')
    process.exit(1)
  }

  console.log('🔄 Connecting to MongoDB via connectDB()...')
  await connectDB()
  console.log('✓ Connected successfully to MongoDB.')

  const paperMap = new Map()
  let totalRawQuestions = 0

  for (const filePath of EXCEL_FILES) {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found: ${filePath}`)
      continue
    }

    console.log(`📖 Reading ${path.basename(filePath)}...`)
    const workbook = xlsx.readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(sheet)
    totalRawQuestions += rows.length

    for (const r of rows) {
      const rawCode = String(r['Course Code'] || '').trim()
      const rawName = String(r['Course Name'] || '').trim()
      const sem = String(r['Semester'] || '').trim()
      const yr = String(r['Year'] || '').trim()
      const rawAsmt = String(r['Assessment Type'] || '').trim()
      const qText = String(r['Question'] || '').trim()

      if (!rawCode || !qText) continue

      const codeKey = normalizeCourseCode(rawCode)
      const cleanName = extractCleanCourseTitle(rawName) || rawName
      const { type: asmtType, name: asmtName } = formatAssessmentType(rawAsmt)
      const fullSemester = `${sem} ${yr}`.trim()

      const groupKey = `${codeKey}__${fullSemester}__${asmtType}`

      if (!paperMap.has(groupKey)) {
        paperMap.set(groupKey, {
          courseCode: rawCode.replace(/\s+/g, ' ').toUpperCase(),
          courseCodeKey: codeKey,
          courseName: cleanName,
          normalizedName: normalizeCourseTitle(cleanName),
          semester: fullSemester,
          academicYear: yr,
          assessmentType: asmtType,
          assessmentName: asmtName,
          questions: []
        })
      }

      paperMap.get(groupKey).questions.push({
        sl: paperMap.get(groupKey).questions.length + 1,
        text: qText
      })
    }
  }

  console.log(`\n📊 Grouped ${totalRawQuestions} questions into ${paperMap.size} distinct examination papers.`)

  let upsertCount = 0
  for (const [key, paperData] of paperMap.entries()) {
    const rawText = paperData.questions.map(q => `${q.sl}. ${q.text}`).join('\n\n')
    const htmlContent = generatePaperHtml(
      paperData.courseCode,
      paperData.courseName,
      paperData.assessmentName,
      paperData.semester,
      paperData.questions
    )

    await ArchivedQuestionBank.findOneAndUpdate(
      {
        courseCodeKey: paperData.courseCodeKey,
        semester: paperData.semester,
        assessmentType: paperData.assessmentType
      },
      {
        $set: {
          courseCode: paperData.courseCode,
          courseCodeKey: paperData.courseCodeKey,
          courseName: paperData.courseName,
          normalizedName: paperData.normalizedName,
          semester: paperData.semester,
          academicYear: paperData.academicYear,
          assessmentType: paperData.assessmentType,
          assessmentName: paperData.assessmentName,
          questions: paperData.questions,
          numQuestions: paperData.questions.length,
          content: htmlContent,
          rawText: rawText,
          isArchivedDataset: true
        }
      },
      { upsert: true, new: true }
    )

    upsertCount++
    if (upsertCount % 25 === 0 || upsertCount === paperMap.size) {
      console.log(`✓ Processed & Upserted ${upsertCount}/${paperMap.size} papers...`)
    }
  }

  console.log(`\n🎉 INGESTION COMPLETE!`)
  console.log(`- Total Excel Questions Processed: ${totalRawQuestions}`)
  console.log(`- Total Archived Papers Created/Updated: ${upsertCount}`)
  console.log(`- Database Collection: ArchivedQuestionBank`)

  console.log('✓ Ingestion complete. Exiting.')
  process.exit(0)
}

runSeed().catch(err => {
  console.error('❌ Error seeding question archives:', err)
  process.exit(1)
})
