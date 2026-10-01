/**
 * Continuous Quality Improvement (CQI) PDF & Document Export Service
 * Compliant with BAETE Accreditation Manual (Criteria 3, 4, 9) and Washington Accord Protocols.
 *
 * Implements direct institutional PDF download:
 * - Direct silent PDF download straight to user disk via jsPDF & html2canvas
 * - No browser system print dialog, zero browser URL footers or date headers
 * - OpenType Bengali font rendering (Nirmala UI, Kalpurush, Vrinda) with clean letter kerning
 * - Dynamic single-page / dual-page structured A4 layouts with zero vacant whitespace
 * - Symmetrical metadata grids, benchmarks banner, and proportional tables
 * - Official BAIUST institutional branding and dual-authority sign-off blocks
 */

import { BAIUST_LOGO } from '../components/marks/baiustLogo';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Base styling applied to isolated A4 PDF pages
const BASE_PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: 'Segoe UI', Arial, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    font-size: 8.5pt;
    line-height: 1.35;
    color: #111827;
    background-color: #ffffff;
    padding: 0;
    margin: 0;
  }
  .cqi-page-sheet {
    width: 794px;
    min-height: 1122px;
    box-sizing: border-box;
    background-color: #ffffff;
    padding: 26px 36px 20px 36px;
    margin: 0 auto;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .cqi-page-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .bengali-font {
    font-family: 'Kalpurush', 'Siyam Rupali', 'SolaimanLipi', 'Nirmala UI', 'Vrinda', Arial, sans-serif;
  }
  .header-block {
    text-align: center;
    margin-bottom: 8px;
    border-bottom: 2px solid #15803d;
    padding-bottom: 6px;
  }
  .logo-img {
    width: 48px;
    height: 48px;
    object-fit: contain;
    margin: 0 auto 3px auto;
    display: block;
  }
  .uni-title-bn {
    font-family: 'Kalpurush', 'SolaimanLipi', 'Nirmala UI', 'Vrinda', Arial, sans-serif;
    font-size: 11.5pt;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
    margin-bottom: 1px;
  }
  .uni-title-en {
    font-size: 9.5pt;
    font-weight: 800;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 1px;
  }
  .dept-title {
    font-size: 8.5pt;
    font-weight: 700;
    color: #374151;
    margin-bottom: 4px;
  }
  .report-main-title {
    font-size: 11pt;
    font-weight: 900;
    color: #14532d;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin: 2px 0 2px 0;
  }
  .report-protocol-badge {
    font-size: 7.5pt;
    font-weight: 700;
    color: #15803d;
  }
  .page-running-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1.5px solid #15803d;
    padding-bottom: 4px;
    margin-bottom: 10px;
    font-size: 7.5pt;
    font-weight: 700;
    color: #334155;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .page-running-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #cbd5e1;
    padding-top: 5px;
    margin-top: 10px;
    font-size: 7.5pt;
    color: #64748b;
    font-weight: 600;
  }
  /* Metadata table */
  .meta-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-size: 8pt;
    border: 1px solid #334155;
  }
  .meta-table td {
    border: 1px solid #334155;
    padding: 3.5px 7px;
    vertical-align: middle;
  }
  .meta-table td.lbl {
    font-weight: 700;
    background-color: #f1f5f9;
    color: #1e293b;
    width: 20%;
  }
  .meta-table td.val {
    font-weight: 600;
    color: #0f172a;
    width: 30%;
  }
  /* Benchmarks card */
  .benchmarks-bar {
    background-color: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 4px;
    padding: 4px 8px;
    margin-bottom: 8px;
    font-size: 8pt;
    color: #14532d;
    font-weight: 500;
  }
  .benchmarks-bar strong {
    font-weight: 800;
  }
  /* Section headers */
  .section-h4 {
    font-size: 9pt;
    font-weight: 800;
    color: #0f172a;
    text-transform: uppercase;
    border-bottom: 1.5px solid #15803d;
    padding-bottom: 2px;
    margin: 8px 0 5px 0;
    letter-spacing: 0.2px;
  }
  .section-p {
    font-size: 8pt;
    line-height: 1.4;
    color: #1f2937;
    margin-bottom: 6px;
    text-align: justify;
  }
  /* Tables */
  .report-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-size: 8pt;
    table-layout: fixed;
  }
  .report-table th {
    background-color: #15803d;
    color: #ffffff;
    font-weight: 700;
    padding: 4px 6px;
    border: 1px solid #14532d;
    text-align: left;
    font-size: 8pt;
  }
  .report-table th.center, .report-table td.center {
    text-align: center;
  }
  .report-table td {
    border: 1px solid #cbd5e1;
    padding: 3.5px 5px;
    vertical-align: top;
    line-height: 1.3;
    word-break: break-word;
  }
  .report-table tr:nth-child(even) {
    background-color: #f8fafc;
  }
  /* Badges */
  .badge-gap {
    display: inline-block;
    background-color: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
    border-radius: 3px;
    padding: 1px 4px;
    font-weight: 800;
    font-size: 7pt;
  }
  .badge-deficit {
    display: inline-block;
    background-color: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fca5a5;
    border-radius: 3px;
    padding: 1px 4px;
    font-weight: 800;
    font-size: 7pt;
  }
  .badge-attained {
    display: inline-block;
    background-color: #dcfce7;
    color: #15803d;
    border: 1px solid #86efac;
    border-radius: 3px;
    padding: 1px 4px;
    font-weight: 800;
    font-size: 7pt;
  }
  /* Discussion Minutes Box */
  .notes-box {
    background-color: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 6px 10px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 7.5pt;
    line-height: 1.35;
    white-space: pre-wrap;
    margin-bottom: 8px;
    color: #1e293b;
  }
  /* Signature footer */
  .sig-table {
    width: 100%;
    margin-top: 18px;
    border-collapse: collapse;
  }
  .sig-table td {
    width: 50%;
    text-align: center;
    vertical-align: bottom;
    border: none;
    padding: 0 16px;
  }
  .sig-bar {
    width: 170px;
    border-bottom: 1.2px solid #0f172a;
    margin: 0 auto 4px auto;
  }
  .sig-title {
    font-size: 8pt;
    font-weight: 800;
    color: #0f172a;
  }
  .sig-sub {
    font-size: 7pt;
    color: #64748b;
  }
`;

/**
 * Universal helper to clean awkward words like 'syllabi' and grammar quirks in document strings
 */
function cleanReportText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\bRevise course syllabi\b/gi, 'Revise course syllabus')
    .replace(/\bcourse syllabi\b/gi, 'course syllabus')
    .replace(/\bsyllabi\b/gi, 'course syllabus')
    .replace(/\bthe the\b/gi, 'the')
    .replace(/\ba a\b/gi, 'a')
    .replace(/\bbench-marked\b/gi, 'benchmarked')
    .replace(/\bBloom levels\b/gi, "Bloom's Taxonomy levels");
}

/**
 * Renders HTML into an isolated off-screen frame and directly downloads as a pristine PDF
 * without opening the system/browser print dialog and without browser URL/date headers.
 *
 * @param {string} htmlContent - Full HTML document string with .cqi-page-sheet elements
 * @param {string} exportFileName - Desired file name without extension
 */
export async function downloadDirectPDFFromHTML(htmlContent, exportFileName = 'CQI_Report') {
  return new Promise(async (resolve, reject) => {
    // 1. Create invisible iframe inside viewport for accurate font metrics & ClearType
    const iframe = document.createElement('iframe');
    iframe.title = exportFileName;
    iframe.style.position = 'fixed';
    iframe.style.left = '0';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.height = '1122px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-99999';
    iframe.style.opacity = '0.01'; // slight opacity allows browser layout & font rasterization
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // 2. Wait for fonts & images
      try {
        if (iframeDoc.fonts && iframeDoc.fonts.ready) {
          await iframeDoc.fonts.ready;
        }
      } catch (e) {}

      const images = Array.from(iframeDoc.querySelectorAll('img'));
      if (images.length > 0) {
        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((res) => {
              img.onload = res;
              img.onerror = res;
            });
          })
        );
      }

      // Small delay for browser layout settlement
      await new Promise((r) => setTimeout(r, 220));

      // 3. Find page sheets
      const pageElements = iframeDoc.querySelectorAll('.cqi-page-sheet');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      if (pageElements && pageElements.length > 0) {
        for (let i = 0; i < pageElements.length; i++) {
          const pageEl = pageElements[i];
          const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            windowWidth: 794,
            logging: false,
            imageTimeout: 15000,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          if (i > 0) {
            pdf.addPage('a4', 'p');
          }
          const pageHeightMm = (canvas.height / canvas.width) * 210;
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, Math.min(297, pageHeightMm), undefined, 'FAST');
        }
      } else {
        // Fallback for single body capture
        const canvas = await html2canvas(iframeDoc.body, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 794,
          windowWidth: 794,
          logging: false,
          imageTimeout: 15000,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pageHeightMm = (canvas.height / canvas.width) * 210;
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, Math.min(297, pageHeightMm), undefined, 'FAST');
      }

      // 4. Trigger direct file download
      pdf.save(`${exportFileName}.pdf`);
      resolve(true);
    } catch (err) {
      console.error('[CQIPdfExportService] Direct PDF download failed:', err);
      reject(err);
    } finally {
      // 5. Clean up iframe
      setTimeout(() => {
        try {
          if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        } catch (e) {}
      }, 500);
    }
  });
}

/**
 * Backward compatibility alias for printOrSaveCQIPdf
 */
export function printOrSaveCQIPdf(htmlContent, exportFileName = 'CQI_Report') {
  return downloadDirectPDFFromHTML(htmlContent, exportFileName);
}

/**
 * Generates and directly downloads Course-Level CQI Action Plan PDF
 * High density, single-page A4 institutional dossier
 */
export async function exportCourseCQIPDF({
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
  const exportFileName = `${cleanCode}_CQI_Action_Plan_${cleanSem}`;

  const isAllAttained = allAttained !== undefined
    ? Boolean(allAttained)
    : (cqiData?.allAttained !== undefined ? Boolean(cqiData.allAttained) : false);

  const sec1Title = isAllAttained
    ? '1. EXECUTIVE EVALUATION & CONTINUOUS ENHANCEMENT ANALYSIS'
    : '1. EXECUTIVE EVALUATION & ROOT CAUSE ANALYSIS (RCA)';

  const sec1Sublabel = isAllAttained
    ? 'IDENTIFIED COMPREHENSION BOTTLENECKS / ENHANCEMENT AREAS:'
    : 'IDENTIFIED CONTRIBUTING FACTORS / ROOT CAUSES:';

  const summary = cleanReportText(cqiData?.summary || 'Outcome-based assessment audit completed against BAETE benchmarks.');
  const rootCauses = (cqiData?.rootCauses || []).map(cleanReportText);
  const remediations = (cqiData?.remediations || []).map((r) => ({
    code: r.code,
    title: cleanReportText(r.title),
    action: cleanReportText(r.action),
  }));
  const actionPlan = (cqiData?.actionPlanForNextSemester || []).map(cleanReportText);
  const targetText = cleanReportText(cqiData?.closingTheLoopTarget || `Achieve target threshold in ${nextTerm}.`);
  const minutes = cleanReportText(customNotes || cqiData?.meetingMinutesDraft || 'Pedagogical deliberations completed and approved by Course Assessment Committee.');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${exportFileName}</title>
  <style>${BASE_PRINT_STYLES}</style>
</head>
<body>
  <!-- ════ SINGLE COMPLETE A4 COURSE CQI DOSSIER ════ -->
  <div class="cqi-page-sheet">
    <div class="cqi-page-content">
      <div class="header-block">
        ${BAIUST_LOGO ? `<img src="${BAIUST_LOGO}" alt="BAIUST Logo" class="logo-img" />` : ''}
        <div class="uni-title-bn">বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা</div>
        <div class="uni-title-en">Bangladesh Army International University of Science &amp; Technology (BAIUST), Cumilla</div>
        <div class="dept-title">Department of Computer Science and Engineering</div>
        <div class="report-main-title">Course Continuous Quality Improvement (CQI) Action Plan</div>
        <div class="report-protocol-badge">BAETE Accreditation Criteria 3 &amp; 9 — Outcome Closing-the-Loop Protocol</div>
      </div>

      <table class="meta-table">
        <tbody>
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
        </tbody>
      </table>

      <div class="benchmarks-bar">
        <strong>Assessment Benchmarks:</strong> Pass Mark ≥ <strong>${targetPassMarks}%</strong> &nbsp;|&nbsp; 
        Course Outcome KPI ≥ <strong>${kpiCO}%</strong> &nbsp;|&nbsp; 
        Program Outcome KPI ≥ <strong>${kpiPO}%</strong>
      </div>

      <!-- Section 1: Executive Summary & RCA / Continuous Enhancement -->
      <div class="section-h4">${sec1Title}</div>
      <p class="section-p">${summary}</p>
      ${
        rootCauses.length > 0
          ? `<div style="font-size:7.5pt; font-weight:bold; color:#14532d; text-transform:uppercase; margin:4px 0 2px 0;">${sec1Sublabel}</div>
             <ul style="margin: 2px 0 5px 16px; font-size: 8pt; line-height: 1.35; color: #374151;">
              ${rootCauses.map((rc) => `<li style="margin-bottom: 2px;">${rc}</li>`).join('')}
            </ul>`
          : ''
      }

      <div class="section-h4">2. Targeted Pedagogical Remediations &amp; Interventions (BAETE Criterion 9)</div>
      <table class="report-table">
        <thead>
          <tr>
            <th class="center" style="width: 12%;">Outcome</th>
            <th style="width: 28%;">Remedial Module / Focus</th>
            <th style="width: 60%;">Pedagogical Remediation &amp; Corrective Action</th>
          </tr>
        </thead>
        <tbody>
          ${remediations
            .map(
              (rem) => `<tr>
                <td class="center"><strong>${rem.code}</strong></td>
                <td><strong>${rem.title}</strong></td>
                <td>${rem.action}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>

      <div class="section-h4">3. Action Directives for Next Offering (${nextTerm})</div>
      <ol style="margin: 2px 0 6px 16px; font-size: 8pt; line-height: 1.35; color: #1f2937;">
        ${actionPlan.map((act) => `<li style="margin-bottom: 2px;">${act}</li>`).join('')}
      </ol>

      <div class="section-h4">4. Closing-the-Loop Target &amp; Verification</div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:4px 8px; margin-bottom:6px; font-size:8pt;">
        <strong style="color:#0f172a;">Target Milestone:</strong> ${targetText}
      </div>

      <div class="section-h4">5. Course Assessment Committee (CAC) Review &amp; Pedagogical Discussion Minutes</div>
      <div class="notes-box">${minutes}</div>
    </div>

    <div>
      <table class="sig-table">
        <tbody>
          <tr>
            <td>
              <div class="sig-bar"></div>
              <div class="sig-title">Course Instructor</div>
              <div class="sig-sub">Department of Computer Science &amp; Engineering</div>
            </td>
            <td>
              <div class="sig-bar"></div>
              <div class="sig-title">Head of Department / Convener</div>
              <div class="sig-sub">Course Assessment Committee (CAC) &amp; OBE Cell</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="page-running-footer">
        <span>BAETE Accreditation Criteria 3 &amp; 9 — Course Quality Dossier</span>
        <span>Department of CSE, BAIUST &nbsp;|&nbsp; Page 1 of 1</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  await downloadDirectPDFFromHTML(html, exportFileName);
}

/**
 * Generates and directly downloads Batch-Level CQI Faculty Review PDF
 * High density, 2-page structured A4 institutional report
 */
export async function exportBatchCQIPDF({
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
  const exportFileName = `Batch_${cleanBatch}_Sec_${section}_BAETE_CQI_Faculty_Report`;

  // Safely extract from facultyMeetingReport or cqiReport
  const r = cqiReport?.facultyMeetingReport || cqiReport || {};
  const meta = r?.meetingMetadata || r?.meta || cqiReport?.meta || {};

  const summary = cleanReportText(
    r.executiveSummary ||
      `Comprehensive longitudinal review of direct program outcome attainment against BAETE standards for Batch ${displayBatch} (${section === 'ALL' ? 'All Sections' : `Section ${section}`}). Evaluated across ${completedCoursesCount} completed courses.`
  );

  const rootCauses = (r.rootCauseAnalysis && r.rootCauseAnalysis.length > 0)
    ? r.rootCauseAnalysis.map(rc => ({
        cluster: cleanReportText(rc.cluster),
        finding: cleanReportText(rc.finding),
        action: cleanReportText(rc.action),
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
    recommendation: cleanReportText(cr.recommendation),
  }));

  const timeline = (r.closingTheLoopTimeline && r.closingTheLoopTimeline.length > 0)
    ? r.closingTheLoopTimeline.map(tl => ({
        phase: cleanReportText(tl.phase),
        milestone: cleanReportText(tl.milestone),
        responsible: cleanReportText(tl.responsible),
      }))
    : [
        { phase: 'Immediate (Next Semester)', milestone: 'Revise course syllabus, lab manuals, and assessment rubrics to integrate missing PO mappings.', responsible: 'Course Instructors & Lab Coordinators' },
        { phase: 'Mid-Term Audit', milestone: 'Conduct departmental spot-checks on mid-term assessment papers to verify active measurement of deficit POs.', responsible: 'Departmental CQI Committee' },
        { phase: 'Terminal Loop Closure', milestone: `Compile post-semester attainment data for Batch ${displayBatch}, verify closure of gaps against the ${threshold}% benchmark, and submit final compliance report to IQAC and BAETE.`, responsible: 'Head of Department & OBE Committee' }
      ];

  const minutesText = cleanReportText(meetingNotes || r.officialMinutesText || 'Meeting deliberations completed and recorded by the faculty review committee.');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${exportFileName}</title>
  <style>${BASE_PRINT_STYLES}</style>
</head>
<body>
  <!-- ════ PAGE 1: SYNTHESIS, RCA & CURRICULUM REALIGNMENT ════ -->
  <div class="cqi-page-sheet">
    <div class="cqi-page-content">
      <div class="header-block">
        ${BAIUST_LOGO ? `<img src="${BAIUST_LOGO}" alt="BAIUST Logo" class="logo-img" />` : ''}
        <div class="uni-title-bn">বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা</div>
        <div class="uni-title-en">Bangladesh Army International University of Science &amp; Technology (BAIUST), Cumilla</div>
        <div class="dept-title">Department of Computer Science and Engineering</div>
        <div class="report-main-title">BAETE Continuous Quality Improvement (CQI) Faculty Review &amp; Action Report</div>
        <div class="report-protocol-badge">BAETE Criteria 3 &amp; 9 — Washington Accord Program Outcomes Closing-the-Loop Protocol</div>
      </div>

      <table class="meta-table">
        <tbody>
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
        </tbody>
      </table>

      <div class="section-h4">1. Executive Summary &amp; Attainment Synthesis</div>
      <p class="section-p">${summary}</p>

      <div class="section-h4">2. Root Cause Analysis (RCA) by Washington Accord Clusters</div>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 25%;">WA Cluster</th>
            <th style="width: 35%;">Identified Gaps / Findings</th>
            <th style="width: 40%;">Remedial Pedagogical Action</th>
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

      ${
        curriculumPlan.length > 0
          ? `<div class="section-h4">3. Curriculum Realignment Roadmap (Unmapped POs / 0% Attainment - Criterion 4)</div>
             <table class="report-table">
               <thead>
                 <tr>
                   <th class="center" style="width: 12%;">PO Code</th>
                   <th style="width: 28%;">Competency / Status</th>
                   <th style="width: 60%;">Curriculum Mapping Directives &amp; Core Course Allocations</th>
                 </tr>
               </thead>
               <tbody>
                 ${curriculumPlan
                   .map(
                     (cr) => `<tr>
                       <td class="center"><strong>${cr.po}</strong></td>
                       <td><span class="badge-deficit">${cr.name ? `${cr.name} (${cr.status})` : cr.status}</span></td>
                       <td>${cr.recommendation}</td>
                     </tr>`
                   )
                   .join('')}
               </tbody>
             </table>`
          : ''
      }
    </div>

    <div class="page-running-footer">
      <span>BAETE Continuous Quality Improvement (CQI) Protocol • Department of CSE, BAIUST</span>
      <span>Page 1 of 2</span>
    </div>
  </div>

  <!-- ════ PAGE 2: TIMELINE, FACULTY MINUTES & DUAL SIGN-OFF ════ -->
  <div class="cqi-page-sheet">
    <div class="cqi-page-content">
      <div class="page-running-header">
        <span>Department of Computer Science and Engineering, BAIUST</span>
        <span>BAETE CQI Faculty Action Report (Batch ${displayBatch}) &nbsp;|&nbsp; Page 2 of 2</span>
      </div>

      <div class="section-h4" style="margin-top: 4px;">4. Closing-the-Loop Implementation Timeline &amp; Responsibilities</div>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 28%;">Implementation Phase</th>
            <th style="width: 45%;">Target Milestone / Deliverable</th>
            <th style="width: 27%;">Responsible Body</th>
          </tr>
        </thead>
        <tbody>
          ${timeline
            .map(
              (tl) => `<tr>
                <td><strong>${tl.phase}</strong></td>
                <td>${tl.milestone}</td>
                <td style="color:#15803d; font-weight:700;">${tl.responsible}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>

      <div class="section-h4">5. Departmental Meeting Minutes &amp; Faculty Discussion Notes</div>
      <div class="notes-box">${minutesText}</div>
    </div>

    <div>
      <table class="sig-table">
        <tbody>
          <tr>
            <td>
              <div class="sig-bar"></div>
              <div class="sig-title">Convener / Member Secretary</div>
              <div class="sig-sub">Course Assessment Committee (CAC)</div>
            </td>
            <td>
              <div class="sig-bar"></div>
              <div class="sig-title">Head of Department</div>
              <div class="sig-sub">Departmental Academic Committee (DAC) &amp; Central OBE Cell</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="page-running-footer">
        <span>BAETE Criteria 3 &amp; 9 — Washington Accord Accreditation Dossier</span>
        <span>Department of CSE, BAIUST &nbsp;|&nbsp; Page 2 of 2</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  await downloadDirectPDFFromHTML(html, exportFileName);
}
