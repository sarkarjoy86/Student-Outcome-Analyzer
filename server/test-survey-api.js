import http from 'http';
import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './lib/db.js';
import './models/Course.js';
import './models/Batch.js';
import './models/AcademicSession.js';
import './models/User.js';
import './models/Student.js';
import './models/Survey.js';
import './models/SurveyResponse.js';
import Enrollment from './models/Enrollment.js';
import Student from './models/Student.js';

// Helper to make async HTTP requests
async function makeRequest(url, method = 'GET', body = null, headers = {}) {
  const parsedUrl = new URL(url);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 5000,
    path: parsedUrl.pathname + parsedUrl.search,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
  }

  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSurveyTests() {
  let log = '=======================================\n';
  log += 'COURSE SURVEY END-TO-END API TEST RUN\n';
  log += '=======================================\n\n';

  const correctOfferingId = '6a43f67bed35b548e7685504';
  const baseUrl = 'http://127.0.0.1:5000/api';
  
  const adminHeaders = {
    'x-admin-email': 'admin@gmail.com',
    'x-admin-password': 'Admin@123'
  };

  // Connect to retrieve or seed enrolled student
  await connectDB();
  log += 'Step 0: Dynamically resolving enrolled student in MongoDB\n';
  let enrolledStudent = null;
  const existingEnrollment = await Enrollment.findOne({ courseOffering: correctOfferingId }).populate('student');
  
  if (existingEnrollment?.student) {
    enrolledStudent = existingEnrollment.student;
    log += `Found existing enrolled student ID: ${enrolledStudent.studentId}\n\n`;
  } else {
    // Find any student, enroll them
    const anyStudent = await Student.findOne();
    if (anyStudent) {
      enrolledStudent = anyStudent;
      await Enrollment.create({
        student: anyStudent._id,
        courseOffering: new mongoose.Types.ObjectId(correctOfferingId)
      });
      log += `No existing enrolled student. Enrolled mock student ID: ${enrolledStudent.studentId}\n\n`;
    } else {
      log += `CRITICAL: No students found in database to execute verification!\n\n`;
    }
  }

  if (!enrolledStudent) {
    log += 'Aborting test run due to missing validation student.\n';
    console.log(log);
    mongoose.disconnect();
    return;
  }

  // 1. Check if survey exists
  log += 'Step 1: Check Survey Configuration by Offering ID\n';
  const r1 = await makeRequest(`${baseUrl}/surveys/offering/${correctOfferingId}`, 'GET', null, adminHeaders);
  log += `Status: ${r1.status}\n`;
  log += `Survey Found: ${r1.data?.survey ? 'Yes' : 'No'}\n\n`;

  let survey = r1.data?.survey;

  // 2. If it does not exist, create it
  if (!survey) {
    log += 'Step 2: Create Course Survey Configuration Template\n';
    const payload = {
      courseOfferingId: correctOfferingId,
      title: 'Test Course Survey - CSE 441',
      description: 'API automated verification survey template.',
      openDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // yesterday
      closeDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0] // 7 days from now
    };
    
    // Create survey mock teacher session
    const r2 = await makeRequest(`${baseUrl}/surveys`, 'POST', payload, adminHeaders);
    log += `Status: ${r2.status}\n`;
    if (r2.status === 201 || r2.status === 200) {
      log += `Created Survey ID: ${r2.data?.survey?._id}\n`;
      survey = r2.data?.survey;
    } else {
      log += `Failed to create survey: ${JSON.stringify(r2.data)}\n`;
    }
    log += '\n';
  }

  if (survey) {
    // 3. Publish the survey if Draft
    if (survey.status === 'Draft') {
      log += 'Step 3: Publish Course Survey\n';
      const r3 = await makeRequest(`${baseUrl}/surveys/${survey._id}/publish`, 'POST', null, adminHeaders);
      log += `Status: ${r3.status}\n`;
      log += `Published Survey ID: ${r3.data?.survey?.surveyId}\n`;
      log += `Public Sharing URL: ${r3.data?.survey?.publicLink}\n\n`;
      survey = r3.data?.survey || survey;
    } else {
      log += 'Step 3: Survey is already published. Skipping...\n\n';
    }

    // Delete existing response for clean run
    const SurveyResponse = mongoose.model('SurveyResponse');
    await SurveyResponse.deleteMany({ surveyId: survey._id, studentId: enrolledStudent._id });

    // 4. Submit student survey response
    log += 'Step 4: Submit Student Survey Feedback Response\n';
    const responsePayload = {
      studentId: enrolledStudent.studentId, // resolved ID
      ratings: {
        '0': 5,
        '1': 4,
        '2': 5,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 4,
        '7': 5,
        '8': 4,
        '9': 3,
        '10': 5,
        '11': 4,
        '12': 5,
        '13': 4,
        '14': 3,
        '15': 5,
        '16': 4,
        '17': 5,
        '18': 4,
        '19': 3,
        '20': 5,
        '21': 4,
        '22': 5,
        '23': 4,
        '24': 3,
        '25': 5
      },
      comments: {
        learned: 'The continuous assessment mapping and hands-on labs.',
        improved: 'Include more real-world industrial case studies.',
        additionalComments: 'Very structured and helpful course.'
      }
    };

    // Public submit endpoint does NOT need auth headers
    const r4 = await makeRequest(`${baseUrl}/public/surveys/${survey._id}/submit`, 'POST', responsePayload);
    log += `Status: ${r4.status}\n`;
    if (r4.status === 201) {
      log += `Successfully submitted survey response!\n`;
    } else {
      log += `Submission Result: ${r4.data?.message || JSON.stringify(r4.data)}\n`;
    }
    log += '\n';

    // 5. Submit response again using same student ID (should fail duplicate submission safeguard)
    log += 'Step 5: Attempt Duplicate Submission Safeguard Verification\n';
    const r5 = await makeRequest(`${baseUrl}/public/surveys/${survey._id}/submit`, 'POST', responsePayload);
    log += `Status: ${r5.status} (Expected: 400)\n`;
    log += `Response Message: ${r5.data?.message}\n\n`;

    // 6. Fetch Analytics Calculations
    log += 'Step 6: Fetch Survey Analytics Data & Calculations\n';
    const r6 = await makeRequest(`${baseUrl}/surveys/${survey._id}/analytics`, 'GET', null, adminHeaders);
    log += `Status: ${r6.status}\n`;
    log += `Total Responses Processed: ${r6.data?.responses?.length || 0}\n`;
    if (r6.data?.survey?.questions && r6.data?.responses) {
      log += 'Section Attainment Averages:\n';
      // Calculate averages locally in test verify logic
      const surveyQuestions = r6.data.survey.questions;
      const responses = r6.data.responses;
      
      const sectionsMap = {};
      surveyQuestions.forEach((q, idx) => {
        const sec = q.section;
        if (!sectionsMap[sec]) sectionsMap[sec] = { total: 0, count: 0 };
        
        responses.forEach(resp => {
          const rating = resp.ratings?.[String(idx)] || resp.ratings?.[q.text];
          if (rating) {
            sectionsMap[sec].total += Number(rating);
            sectionsMap[sec].count += 1;
          }
        });
      });

      Object.entries(sectionsMap).forEach(([sec, data]) => {
        const avg = data.count > 0 ? data.total / data.count : 0;
        log += ` - ${sec}: ${avg.toFixed(2)} / 5.00 (from ${data.count} answers)\n`;
      });
    }
    log += '\n';
  }

  log += '=======================================\n';
  log += 'TEST EXECUTION COMPLETE\n';
  log += '=======================================\n';

  console.log(log);
  fs.writeFileSync('C:/Users/sarka/.gemini/antigravity/brain/b6fda638-548c-4124-acd5-f32c7c6dcbad/survey-test-results.txt', log, 'utf8');

  mongoose.disconnect();
}

runSurveyTests();
