/**
 * Continuous Quality Improvement (CQI) Microsoft Word Export Service
 * Compliant with BAETE Accreditation Manual (Criteria 3, 4, 9) and Washington Accord Protocols.
 *
 * Implements high-fidelity, editable Microsoft Word (.doc) exports:
 * - Native Microsoft Word XML format opening instantly in MS Word, WPS Office, and Google Docs
 * - Fully editable tables, cells, bullet points, and signatures
 * - Native OpenType Bengali typography (Nirmala UI, Kalpurush, Vrinda) without raster smearing
 * - Official BAIUST institutional branding, green banners, and dual-authority sign-off blocks
 * - Native Word running footer with dynamic page numbers (Page X of Y)
 * - Strict academic grammar (e.g., 'course syllabus' instead of 'syllabi')
 */

import { BAIUST_LOGO } from '../components/marks/baiustLogo';

function cleanWordText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\bRevise course syllabi\b/gi, 'Revise course syllabus')
    .replace(/\bcourse syllabi\b/gi, 'course syllabus')
    .replace(/\bunseen course syllabi\b/gi, 'unseen course syllabuses')
    .replace(/\bsyllabi\b/gi, 'course syllabus')
    .replace(/\bthe the\b/gi, 'the')
    .replace(/\ba a\b/gi, 'a')
    .replace(/\bbench-marked\b/gi, 'benchmarked')
    .replace(/\bBloom levels\b/gi, "Bloom's Taxonomy levels")
    .replace(/\bBlooms Taxonomy\b/gi, "Bloom's Taxonomy");
}

function triggerWordDownload(wordHtml, downloadFileName) {
  const blob = new Blob(['\ufeff' + wordHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadFileName.endsWith('.doc') ? downloadFileName : `${downloadFileName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports Course-Level CQI Action Plan as a Microsoft Word (.doc) document
 */
export function exportCourseCQIWord({
  courseCode = 'Course',
  courseTitle = 'Course Title',
  semesterName = 'Semester',
  academicYear = '2026',
  sectionName = 'A',
  nextTerm = 'Subsequent Semester',
  targetPassMarks = 40,
  kpiCO = 50,
  kpiPO = 50,
  cqiData = null,
  customNotes = '',
  allAttained = undefined,
}) {
  const cleanCode = courseCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanSem = `${semesterName}_${academicYear}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const downloadFileName = `${cleanCode}_CQI_Action_Plan_${cleanSem}.doc`;

  const isAllAttained = allAttained !== undefined
    ? Boolean(allAttained)
    : (cqiData?.allAttained !== undefined ? Boolean(cqiData.allAttained) : false);

  const sec1Title = isAllAttained
    ? '1. EXECUTIVE EVALUATION & CONTINUOUS ENHANCEMENT ANALYSIS'
    : '1. EXECUTIVE EVALUATION & ROOT CAUSE ANALYSIS (RCA)';

  const sec1Sublabel = isAllAttained
    ? 'IDENTIFIED COMPREHENSION BOTTLENECKS / ENHANCEMENT AREAS:'
    : 'IDENTIFIED CONTRIBUTING FACTORS / ROOT CAUSES:';

  const summary = cleanWordText(cqiData?.summary || 'Outcome-based assessment audit completed against BAETE benchmarks.');
  const rootCauses = (cqiData?.rootCauses || []).map(cleanWordText);
  const remediations = (cqiData?.remediations || []).map((r) => ({
    code: r.code,
    title: cleanWordText(r.title),
    action: cleanWordText(r.action),
  }));
  const actionPlan = (cqiData?.actionPlanForNextSemester || []).map(cleanWordText);
  const targetText = cleanWordText(cqiData?.closingTheLoopTarget || `Achieve target threshold in ${nextTerm}.`);
  const minutes = cleanWordText(customNotes || cqiData?.meetingMinutesDraft || 'Pedagogical deliberations completed and approved by Course Assessment Committee.');

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Course CQI Action Plan - ${courseCode}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt; /* A4 */
          margin: 0.4in 0.5in 0.4in 0.5in;
          mso-header-margin: 0.2in;
          mso-footer-margin: 0.2in;
          mso-footer: f1;
        }
        div.Section1 {
          page: Section1;
        }
        table#hrdftrtbl {
          margin: 0in 0in 0in 900in;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        body {
          font-family: 'Segoe UI', Arial, 'Times New Roman', sans-serif;
          font-size: 8.5pt;
          color: #111827;
          line-height: 1.35;
          padding: 0;
          margin: 0;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        .banner {
          background-color: #15803d;
          color: #ffffff;
          font-weight: bold;
          text-align: center;
          font-size: 11pt;
          letter-spacing: 0.4pt;
          text-transform: uppercase;
          padding: 3pt 0;
          margin-top: 4pt;
          margin-bottom: 2pt;
        }
        .sec-h4 {
          font-size: 9pt;
          font-weight: bold;
          color: #0f172a;
          text-transform: uppercase;
          border-bottom: 1.5pt solid #15803d;
          padding-bottom: 2pt;
          margin-top: 8pt;
          margin-bottom: 4pt;
        }
        .meta-table {
          width: 100%;
          border: 1pt solid #334155;
          margin-bottom: 6pt;
          font-size: 8pt;
        }
        .meta-table td {
          border: 1pt solid #334155;
          padding: 3pt 5pt;
          vertical-align: middle;
        }
        .meta-table td.lbl {
          font-weight: bold;
          background-color: #f1f5f9;
          color: #1e293b;
          width: 22%;
        }
        .meta-table td.val {
          color: #0f172a;
          width: 28%;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6pt;
          font-size: 8pt;
        }
        .report-table th {
          background-color: #15803d;
          color: #ffffff;
          font-weight: bold;
          padding: 3.5pt 5pt;
          border: 1pt solid #14532d;
          text-align: left;
          font-size: 8pt;
        }
        .report-table td {
          border: 1pt solid #cbd5e1;
          padding: 3pt 5pt;
          vertical-align: top;
          line-height: 1.3;
        }
        .notes-box {
          background-color: #f8fafc;
          border: 1pt solid #cbd5e1;
          padding: 5pt 7pt;
          font-family: 'Courier New', Courier, monospace;
          font-size: 7.5pt;
          line-height: 1.3;
          margin-bottom: 6pt;
          color: #1e293b;
        }
        .sig-table {
          width: 100%;
          margin-top: 18pt;
          border: none;
          page-break-inside: avoid;
        }
        .sig-table td {
          border: none;
          width: 50%;
          text-align: center;
          vertical-align: bottom;
          padding: 0 10pt;
        }
        .sig-bar {
          width: 160pt;
          border-bottom: 1.2pt solid #0f172a;
          margin: 0 auto 3pt auto;
        }
        p.MsoFooter {
          margin: 0;
          font-size: 7.5pt;
          color: #64748b;
          font-family: 'Segoe UI', Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- Official Institutional Header -->
        <table style="width:100%; border:none; margin-bottom:4pt;">
          <tr>
            <td style="border:none; text-align:center;">
              ${BAIUST_LOGO ? `<img src="${BAIUST_LOGO}" width="50" height="50" style="width:40pt; height:40pt; margin:0 auto 2pt auto;" alt="BAIUST Logo" /><br>` : ''}
              <div style="font-family:'Kalpurush','Nirmala UI','Vrinda',sans-serif; font-size:12pt; font-weight:bold; color:#0f172a;">
                বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা
              </div>
              <div style="font-size:10pt; font-weight:bold; color:#0f172a; text-transform:uppercase; letter-spacing:0.4pt;">
                Bangladesh Army International University of Science &amp; Technology (BAIUST), Cumilla
              </div>
              <div style="font-size:8.5pt; font-weight:bold; color:#374151; margin-top:1pt;">
                Department of Computer Science and Engineering
              </div>
            </td>
          </tr>
        </table>

        <!-- Title Banner -->
        <div class="banner">Course Continuous Quality Improvement (CQI) Action Plan</div>
        <div style="text-align:center; font-size:7.5pt; font-weight:bold; color:#15803d; margin-bottom:6pt;">
          BAETE Accreditation Criteria 3 &amp; 9 — Outcome Closing-the-Loop Protocol
        </div>

        <!-- Metadata Table -->
        <table class="meta-table">
          <tr>
            <td class="lbl">Course Code</td>
            <td class="val">: <strong>${courseCode}</strong></td>
            <td class="lbl">Course Title</td>
            <td class="val">: <strong>${courseTitle}</strong></td>
          </tr>
          <tr>
            <td class="lbl">Semester &amp; Year</td>
            <td class="val">: ${semesterName} ${academicYear}</td>
            <td class="lbl">Section / Cohort</td>
            <td class="val">: Section ${sectionName}</td>
          </tr>
          <tr>
            <td class="lbl">Subsequent Target</td>
            <td class="val">: <strong style="color:#15803d;">${nextTerm} (Loop Closure)</strong></td>
            <td class="lbl">Evaluation Date</td>
            <td class="val">: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
        </table>

        <!-- Benchmarks Banner -->
        <table style="width:100%; border:1pt solid #86efac; background-color:#f0fdf4; margin-bottom:6pt;">
          <tr>
            <td style="border:none; padding:3pt 6pt; font-size:8pt; color:#14532d;">
              <strong>Assessment Benchmarks:</strong> Pass Mark &ge; <strong>${targetPassMarks}%</strong> &nbsp;|&nbsp;
              Course Outcome KPI &ge; <strong>${kpiCO}%</strong> &nbsp;|&nbsp;
              Program Outcome KPI &ge; <strong>${kpiPO}%</strong>
            </td>
          </tr>
        </table>

        <!-- Section 1: Executive Summary & RCA / Continuous Enhancement -->
        <div class="sec-h4">${sec1Title}</div>
        <p style="font-size:8pt; line-height:1.35; margin-bottom:4pt; text-align:justify;">${summary}</p>
        ${
          rootCauses.length > 0
            ? `<div style="font-size:7.5pt; font-weight:bold; color:#14532d; text-transform:uppercase; margin:4pt 0 2pt 0; letter-spacing:0.3pt;">${sec1Sublabel}</div>
               <ul style="margin:2pt 0 4pt 16pt; font-size:8pt; line-height:1.35; color:#374151;">
                ${rootCauses.map((rc) => `<li style="margin-bottom:2pt;">${rc}</li>`).join('')}
              </ul>`
            : ''
        }

        <!-- Section 2: Targeted Pedagogical Remediations -->
        <div class="sec-h4">2. Targeted Pedagogical Remediations &amp; Interventions (BAETE Criterion 9)</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width:12%; text-align:center;">Outcome</th>
              <th style="width:28%;">Remedial Module / Focus</th>
              <th style="width:60%;">Pedagogical Remediation &amp; Corrective Action</th>
            </tr>
          </thead>
          <tbody>
            ${remediations
              .map(
                (rem) => `<tr>
                  <td style="text-align:center; font-weight:bold;">${rem.code}</td>
                  <td style="font-weight:bold;">${rem.title}</td>
                  <td>${rem.action}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>

        <!-- Section 3: Action Directives for Next Offering -->
        <div class="sec-h4">3. Action Directives for Next Offering (${nextTerm})</div>
        <ol style="margin:2pt 0 4pt 16pt; font-size:8pt; line-height:1.35; color:#1f2937;">
          ${actionPlan.map((act) => `<li style="margin-bottom:2pt;">${act}</li>`).join('')}
        </ol>

        <!-- Section 4: Closing-the-Loop Target -->
        <div class="sec-h4">4. Closing-the-Loop Target &amp; Verification</div>
        <table style="width:100%; border:1pt solid #cbd5e1; background-color:#f8fafc; margin-bottom:6pt;">
          <tr>
            <td style="border:none; padding:4pt 6pt; font-size:8pt; color:#0f172a;">
              <strong>Target Milestone:</strong> ${targetText}
            </td>
          </tr>
        </table>

        <!-- Section 5: CAC Review Minutes -->
        <div class="sec-h4">5. Course Assessment Committee (CAC) Review &amp; Pedagogical Discussion Minutes</div>
        <div class="notes-box">${minutes}</div>

        <!-- Dual Signature Section -->
        <table class="sig-table">
          <tr>
            <td>
              <div class="sig-bar"></div>
              <div style="font-size:8pt; font-weight:bold; color:#0f172a;">Course Instructor</div>
              <div style="font-size:7pt; color:#64748b;">Department of Computer Science &amp; Engineering</div>
            </td>
            <td>
              <div class="sig-bar"></div>
              <div style="font-size:8pt; font-weight:bold; color:#0f172a;">Head of Department / Convener</div>
              <div style="font-size:7pt; color:#64748b;">Course Assessment Committee (CAC) &amp; OBE Cell</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Word Running Footer -->
      <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <div style="mso-element:footer" id="f1">
              <table border="0" cellspacing="0" cellpadding="0" style="width:100%; border:none; border-top:0.5pt solid #cbd5e1; padding-top:2pt;">
                <tr>
                  <td style="border:none; text-align:left;">
                    <p class="MsoFooter">
                      Course CQI Closing-the-Loop Protocol &bull; Department of CSE, BAIUST &bull; ${courseCode} (${sectionName})
                    </p>
                  </td>
                  <td style="border:none; text-align:right;">
                    <p class="MsoFooter">
                      Page <!--[if supportFields]><span style='mso-element:field-begin'></span>PAGE <span style='mso-element:field-separator'></span><![endif]-->1<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]--> of <!--[if supportFields]><span style='mso-element:field-begin'></span>NUMPAGES <span style='mso-element:field-separator'></span><![endif]-->1<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->
                    </p>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  triggerWordDownload(wordHtml, downloadFileName);
}

/**
 * Exports Batch-Level CQI Faculty Review & Action Report as a Microsoft Word (.doc) document
 */
export function exportBatchCQIWord({
  batchId = 'Batch',
  section = 'ALL',
  threshold = 50,
  completedCoursesCount = 0,
  cqiReport = null,
  meetingNotes = '',
}) {
  const displayBatch =
    typeof batchId === 'object' && batchId !== null
      ? batchId.name || batchId.batchNum || batchId.id || 'Current Batch'
      : String(batchId || 'Current Batch');

  const cleanBatch = String(displayBatch).replace(/[^a-zA-Z0-9_-]/g, '_');
  const downloadFileName = `Batch_${cleanBatch}_Sec_${section}_BAETE_CQI_Faculty_Report.doc`;

  // Safely extract from facultyMeetingReport or cqiReport
  const r = cqiReport?.facultyMeetingReport || cqiReport || {};
  const meta = r?.meetingMetadata || r?.meta || cqiReport?.meta || {};

  const summary = cleanWordText(
    r.executiveSummary ||
      `Comprehensive longitudinal review of direct program outcome attainment against BAETE standards for Batch ${displayBatch} (${section === 'ALL' ? 'All Sections' : `Section ${section}`}). Evaluated across ${completedCoursesCount} completed courses.`
  );

  const rootCauses = (r.rootCauseAnalysis && r.rootCauseAnalysis.length > 0)
    ? r.rootCauseAnalysis.map(rc => ({
        cluster: cleanWordText(rc.cluster),
        finding: cleanWordText(rc.finding),
        action: cleanWordText(rc.action),
      }))
    : [
        { cluster: 'Technical Foundations (PO1–PO4)', finding: 'Strong theoretical comprehension and algorithmic problem-solving across core courses.', action: 'Maintain rigorous assessment standards while introducing complex engineering design problems.' },
        { cluster: 'Modern Engineering Practice (PO5–PO8)', finding: 'Deficit observed in modern tool utilization and professional ethics assessment instruments.', action: 'Mandate modern software/hardware tool rubrics in lab courses and integrate engineering ethics case studies.' },
        { cluster: 'Professional & Lifelong Skills (PO9–PO12)', finding: 'Variance in professional communication and teamwork deliverables across sections.', action: 'Incorporate multi-disciplinary team projects and formal technical report rubrics to close the attainment gap.' }
      ];

  const curriculumPlan = (r.curriculumRealignmentPlan || []).map(cr => ({
    po: cr.po,
    name: cr.name || '',
    status: cr.status || 'Curriculum Deficiency',
    recommendation: cleanWordText(cr.recommendation),
  }));

  const timeline = (r.closingTheLoopTimeline && r.closingTheLoopTimeline.length > 0)
    ? r.closingTheLoopTimeline.map(tl => ({
        phase: cleanWordText(tl.phase),
        milestone: cleanWordText(tl.milestone),
        responsible: cleanWordText(tl.responsible),
      }))
    : [
        { phase: 'Immediate (Next Semester)', milestone: 'Revise course syllabus, lab manuals, and assessment rubrics to integrate missing PO mappings.', responsible: 'Course Instructors & Lab Coordinators' },
        { phase: 'Mid-Term Audit', milestone: 'Conduct departmental spot-checks on mid-term assessment papers to verify active measurement of deficit POs.', responsible: 'Departmental CQI Committee' },
        { phase: 'Terminal Loop Closure', milestone: `Compile post-semester attainment data for Batch ${displayBatch}, verify closure of gaps against the ${threshold}% benchmark, and submit final compliance report to IQAC and BAETE.`, responsible: 'Head of Department & OBE Committee' }
      ];

  const minutesText = cleanWordText(meetingNotes || r.officialMinutesText || 'Meeting deliberations completed and recorded by the faculty review committee.');

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>BAETE CQI Faculty Review - Batch ${displayBatch}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt; /* A4 */
          margin: 0.4in 0.5in 0.4in 0.5in;
          mso-header-margin: 0.2in;
          mso-footer-margin: 0.2in;
          mso-footer: f1;
        }
        div.Section1 {
          page: Section1;
        }
        table#hrdftrtbl {
          margin: 0in 0in 0in 900in;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        body {
          font-family: 'Segoe UI', Arial, 'Times New Roman', sans-serif;
          font-size: 8.5pt;
          color: #111827;
          line-height: 1.35;
          padding: 0;
          margin: 0;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        .banner {
          background-color: #15803d;
          color: #ffffff;
          font-weight: bold;
          text-align: center;
          font-size: 11pt;
          letter-spacing: 0.4pt;
          text-transform: uppercase;
          padding: 3pt 0;
          margin-top: 4pt;
          margin-bottom: 2pt;
        }
        .sec-h4 {
          font-size: 9pt;
          font-weight: bold;
          color: #0f172a;
          text-transform: uppercase;
          border-bottom: 1.5pt solid #15803d;
          padding-bottom: 2pt;
          margin-top: 8pt;
          margin-bottom: 4pt;
        }
        .meta-table {
          width: 100%;
          border: 1pt solid #334155;
          margin-bottom: 6pt;
          font-size: 8pt;
        }
        .meta-table td {
          border: 1pt solid #334155;
          padding: 3pt 5pt;
          vertical-align: middle;
        }
        .meta-table td.lbl {
          font-weight: bold;
          background-color: #f1f5f9;
          color: #1e293b;
          width: 22%;
        }
        .meta-table td.val {
          color: #0f172a;
          width: 28%;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6pt;
          font-size: 8pt;
        }
        .report-table th {
          background-color: #15803d;
          color: #ffffff;
          font-weight: bold;
          padding: 3.5pt 5pt;
          border: 1pt solid #14532d;
          text-align: left;
          font-size: 8pt;
        }
        .report-table td {
          border: 1pt solid #cbd5e1;
          padding: 3pt 5pt;
          vertical-align: top;
          line-height: 1.3;
        }
        .notes-box {
          background-color: #f8fafc;
          border: 1pt solid #cbd5e1;
          padding: 5pt 7pt;
          font-family: 'Courier New', Courier, monospace;
          font-size: 7.5pt;
          line-height: 1.3;
          margin-bottom: 6pt;
          color: #1e293b;
        }
        .sig-table {
          width: 100%;
          margin-top: 18pt;
          border: none;
          page-break-inside: avoid;
        }
        .sig-table td {
          border: none;
          width: 50%;
          text-align: center;
          vertical-align: bottom;
          padding: 0 10pt;
        }
        .sig-bar {
          width: 160pt;
          border-bottom: 1.2pt solid #0f172a;
          margin: 0 auto 3pt auto;
        }
        p.MsoFooter {
          margin: 0;
          font-size: 7.5pt;
          color: #64748b;
          font-family: 'Segoe UI', Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- Official Institutional Header -->
        <table style="width:100%; border:none; margin-bottom:4pt;">
          <tr>
            <td style="border:none; text-align:center;">
              ${BAIUST_LOGO ? `<img src="${BAIUST_LOGO}" width="50" height="50" style="width:40pt; height:40pt; margin:0 auto 2pt auto;" alt="BAIUST Logo" /><br>` : ''}
              <div style="font-family:'Kalpurush','Nirmala UI','Vrinda',sans-serif; font-size:12pt; font-weight:bold; color:#0f172a;">
                বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা
              </div>
              <div style="font-size:10pt; font-weight:bold; color:#0f172a; text-transform:uppercase; letter-spacing:0.4pt;">
                Bangladesh Army International University of Science &amp; Technology (BAIUST), Cumilla
              </div>
              <div style="font-size:8.5pt; font-weight:bold; color:#374151; margin-top:1pt;">
                Department of Computer Science and Engineering
              </div>
            </td>
          </tr>
        </table>

        <!-- Title Banner -->
        <div class="banner">BAETE Continuous Quality Improvement (CQI) Faculty Review &amp; Action Report</div>
        <div style="text-align:center; font-size:7.5pt; font-weight:bold; color:#15803d; margin-bottom:6pt;">
          BAETE Criteria 3 &amp; 9 — Washington Accord Program Outcomes Closing-the-Loop Protocol
        </div>

        <!-- Metadata Table -->
        <table class="meta-table">
          <tr>
            <td class="lbl">Committee</td>
            <td class="val">: <strong>${meta.committee || 'DAC / CAC'}</strong></td>
            <td class="lbl">Batch / Section</td>
            <td class="val">: <strong>Batch ${displayBatch} (${section === 'ALL' ? 'All Sections' : `Sec ${section}`})</strong></td>
          </tr>
          <tr>
            <td class="lbl">Threshold Benchmark</td>
            <td class="val">: <strong style="color:#15803d;">${threshold}% Target</strong></td>
            <td class="lbl">Courses Evaluated</td>
            <td class="val">: ${completedCoursesCount} Courses Basket</td>
          </tr>
          <tr>
            <td class="lbl">Review Date</td>
            <td class="val" colspan="3">: ${meta.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
        </table>

        <!-- Section 1: Executive Summary -->
        <div class="sec-h4">1. Executive Summary &amp; Attainment Synthesis</div>
        <p style="font-size:8pt; line-height:1.35; margin-bottom:4pt; text-align:justify;">${summary}</p>

        <!-- Section 2: RCA by WA Clusters -->
        <div class="sec-h4">2. Root Cause Analysis (RCA) by Washington Accord Clusters</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width:25%;">WA Cluster</th>
              <th style="width:35%;">Identified Gaps / Findings</th>
              <th style="width:40%;">Remedial Pedagogical Action</th>
            </tr>
          </thead>
          <tbody>
            ${rootCauses
              .map(
                (rc) => `<tr>
                  <td><strong>${rc.cluster}</strong></td>
                  <td>${rc.finding}</td>
                  <td>${rc.action}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>

        <!-- Section 3: Curriculum Realignment Roadmap (if unmapped POs) -->
        ${
          curriculumPlan.length > 0
            ? `<div class="sec-h4">3. Curriculum Realignment Roadmap (Unmapped POs / 0% Attainment - Criterion 4)</div>
               <table class="report-table">
                 <thead>
                   <tr>
                     <th style="width:12%; text-align:center;">PO Code</th>
                     <th style="width:28%;">Competency / Status</th>
                     <th style="width:60%;">Curriculum Mapping Directives &amp; Core Course Allocations</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${curriculumPlan
                     .map(
                       (cr) => `<tr>
                         <td style="text-align:center;"><strong>${cr.po}</strong></td>
                         <td style="color:#b91c1c; font-weight:bold;">${cr.name ? `${cr.name} (${cr.status})` : cr.status}</td>
                         <td>${cr.recommendation}</td>
                       </tr>`
                     )
                     .join('')}
                 </tbody>
               </table>`
            : ''
        }

        <!-- Section 4: Timeline & Responsibilities -->
        <div class="sec-h4">4. Closing-the-Loop Implementation Timeline &amp; Responsibilities</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width:28%;">Implementation Phase</th>
              <th style="width:45%;">Target Milestone / Deliverable</th>
              <th style="width:27%;">Responsible Body</th>
            </tr>
          </thead>
          <tbody>
            ${timeline
              .map(
                (tl) => `<tr>
                  <td><strong>${tl.phase}</strong></td>
                  <td>${tl.milestone}</td>
                  <td style="color:#15803d; font-weight:bold;">${tl.responsible}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>

        <!-- Section 5: Faculty Minutes & Discussion Notes -->
        <div class="sec-h4">5. Departmental Meeting Minutes &amp; Faculty Discussion Notes</div>
        <div class="notes-box">${minutesText}</div>

        <!-- Dual Signature Section -->
        <table class="sig-table">
          <tr>
            <td>
              <div class="sig-bar"></div>
              <div style="font-size:8pt; font-weight:bold; color:#0f172a;">Convener / Member Secretary</div>
              <div style="font-size:7pt; color:#64748b;">Course Assessment Committee (CAC)</div>
            </td>
            <td>
              <div class="sig-bar"></div>
              <div style="font-size:8pt; font-weight:bold; color:#0f172a;">Head of Department</div>
              <div style="font-size:7pt; color:#64748b;">Departmental Academic Committee (DAC) &amp; Central OBE Cell</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Word Running Footer -->
      <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <div style="mso-element:footer" id="f1">
              <table border="0" cellspacing="0" cellpadding="0" style="width:100%; border:none; border-top:0.5pt solid #cbd5e1; padding-top:2pt;">
                <tr>
                  <td style="border:none; text-align:left;">
                    <p class="MsoFooter">
                      BAETE Criteria 3 &amp; 9 Protocol &bull; Department of CSE, BAIUST &bull; Batch ${displayBatch} (${section})
                    </p>
                  </td>
                  <td style="border:none; text-align:right;">
                    <p class="MsoFooter">
                      Page <!--[if supportFields]><span style='mso-element:field-begin'></span>PAGE <span style='mso-element:field-separator'></span><![endif]-->1<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]--> of <!--[if supportFields]><span style='mso-element:field-begin'></span>NUMPAGES <span style='mso-element:field-separator'></span><![endif]-->1<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->
                    </p>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  triggerWordDownload(wordHtml, downloadFileName);
}
