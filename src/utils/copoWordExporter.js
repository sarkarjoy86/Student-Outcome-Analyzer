import html2canvas from 'html2canvas'

/**
 * Exports the "Direct Measurements of COs & POs" report as a Microsoft Word (.doc) document.
 * Matches the official institutional layout with green branding, CO/PO measurement tables,
 * embedded bar chart graphics, instructor signature section, and 1-page fit.
 */
export async function exportCOPOWordReport({
  courseInfo = {},
  calculations = {},
  targetPassMarks = 40,
  kpiCO = 50,
  kpiPO = 50,
  reportScope = 'combined',
}) {
  // Capture charts from the Course Overview DOM
  const captureChart = async (wrapperId, fallbackId) => {
    const el = document.getElementById(wrapperId) || document.getElementById(fallbackId)
    if (!el) return ''
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      })
      return canvas.toDataURL('image/png')
    } catch (err) {
      console.warn('Error capturing chart for Word export:', wrapperId, err)
      return ''
    }
  }

  // 1. Capture Bar Charts
  const coChartImg = await captureChart('co-overview-chart-wrapper', 'co-attainment-chart')
  const poChartImg = await captureChart('po-overview-chart-wrapper', 'po-bar-chart')

  // 2. Prepare Metadata
  const courseCode = courseInfo?.courseCode || 'CSE 443'
  const courseTitle = courseInfo?.courseTitle || 'Digital Image Processing'
  const department = courseInfo?.department || 'Computer Science and Engineering'
  const departmentShort = courseInfo?.departmentShort || (department.toLowerCase().includes('computer science') ? 'CSE' : department)
  const academicYear = courseInfo?.academicYear || courseInfo?.level || '4'
  const semester = courseInfo?.semesterName || 'II'

  let section = 'A & B'
  if (reportScope !== 'combined') {
    section = courseInfo?.rawSectionName || courseInfo?.sectionName || 'A'
  } else {
    if (courseInfo?.rawSectionName && courseInfo.rawSectionName.includes('&')) {
      section = courseInfo.rawSectionName
    } else if (courseInfo?.sectionName && courseInfo.sectionName.includes('&')) {
      section = courseInfo.sectionName
    } else if (courseInfo?.batchSections && Array.isArray(courseInfo.batchSections)) {
      section = courseInfo.batchSections.join(' & ')
    } else {
      section = 'A & B'
    }
  }

  const now = new Date()
  const exportDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
  const instructorName = courseInfo?.teacherName || 'Md. Saad Bin Kamal'

  // 3. Generate CO Data Columns (CO1 to CO12)
  const coHeadersHTML = Array.from({ length: 12 }, (_, i) => `<th style="border:1px solid #000; padding:2pt 1pt; text-align:center; font-weight:bold; font-size:8pt; background-color:#ffffff;">CO${i + 1}</th>`).join('')

  const coPassMarksCellsHTML = Array.from({ length: 12 }, (_, i) => {
    const coKey = `CO${i + 1}`
    const val = calculations?.coAttainment?.[coKey]?.passMarksPercentage || 0
    return `<td style="border:1px solid #000; padding:2pt 1pt; text-align:center; font-weight:bold; font-size:8pt; color:#dc2626; background-color:#ffffff;">${val.toFixed(1)}</td>`
  }).join('')

  const coKPICellsHTML = Array.from({ length: 12 }, (_, i) => {
    const coKey = `CO${i + 1}`
    const val = calculations?.coAttainment?.[coKey]?.kpiPercentage || 0
    return `<td style="border:1px solid #000; padding:2pt 1pt; text-align:center; font-weight:bold; font-size:8pt; color:#000000; background-color:#4ade80;">${val.toFixed(1)}</td>`
  }).join('')

  // 4. Generate PO Data Columns (PO1 to PO12)
  const poHeadersHTML = Array.from({ length: 12 }, (_, i) => `<th style="border:1px solid #000; padding:2pt 1pt; text-align:center; font-weight:bold; font-size:8pt; background-color:#ffffff;">PO${i + 1}</th>`).join('')

  const poPassMarksCellsHTML = Array.from({ length: 12 }, (_, i) => {
    const poKey = `PO${i + 1}`
    const val = calculations?.poAttainment?.[poKey]?.passMarksPercentage || 0
    return `<td style="border:1px solid #000; padding:2pt 1pt; text-align:center; font-weight:bold; font-size:8pt; color:#dc2626; background-color:#ffffff;">${val.toFixed(1)}</td>`
  }).join('')

  const poKPICellsHTML = Array.from({ length: 12 }, (_, i) => {
    const poKey = `PO${i + 1}`
    const val = calculations?.poAttainment?.[poKey]?.kpiPercentage || 0
    return `<td style="border:1px solid #000; padding:2pt 1pt; text-align:center; font-weight:bold; font-size:8pt; color:#000000; background-color:#4ade80;">${val.toFixed(1)}</td>`
  }).join('')

  // 5. Construct Word-Compatible Document HTML
  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Direct Measurements of COs &amp; POs - ${courseCode}</title>
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
          margin: 0.25in 0.35in 0.25in 0.35in;
          mso-header-margin: 0.15in;
          mso-footer-margin: 0.15in;
        }
        div.Section1 {
          page: Section1;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 9.5pt;
          color: #000000;
          line-height: 1.15;
          padding: 0;
          margin: 0;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        .banner {
          background-color: #166534;
          color: #ffffff;
          font-weight: bold;
          text-align: center;
          font-size: 10.5pt;
          letter-spacing: 0.5pt;
          text-transform: uppercase;
          padding: 3.5pt 0;
          margin-top: 4pt;
          margin-bottom: 2pt;
        }
        .chart-box {
          text-align: center;
          margin: 2pt 0 4pt 0;
          width: 100%;
        }
        .chart-img {
          width: 535pt;
          max-width: 100%;
          max-height: 195pt;
          height: auto;
          display: block;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- Document Title -->
        <div style="text-align:center; margin-bottom:6pt;">
          <div style="font-size:11pt; font-weight:normal; color:#222222; margin-bottom:1pt;">Report</div>
          <div style="font-size:16pt; font-weight:bold; color:#166534; letter-spacing:0.3pt;">Direct Measurements of COs &amp; POs</div>
        </div>

        <!-- Metadata Table with dotted borders matching official template -->
        <table style="width:100%; border-collapse:collapse; border:1px dotted #555555; margin-bottom:5pt; font-size:9pt;">
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; width:20%; padding:1.5pt 4pt; color:#1d4ed8;">Course Code:</td>
            <td style="border:1px dotted #555555; font-weight:bold; width:80%; padding:1.5pt 4pt;">${courseCode}</td>
          </tr>
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; padding:1.5pt 4pt; color:#1d4ed8;">Course Title:</td>
            <td style="border:1px dotted #555555; font-weight:bold; padding:1.5pt 4pt;">${courseTitle}</td>
          </tr>
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; padding:1.5pt 4pt; color:#1d4ed8;">Department:</td>
            <td style="border:1px dotted #555555; font-weight:bold; padding:1.5pt 4pt;">${department}</td>
          </tr>
          <tr>
            <td colspan="2" style="border:1px dotted #555555; height:3pt; padding:0;"></td>
          </tr>
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; padding:1.5pt 4pt; color:#1d4ed8;">Academic Year</td>
            <td style="border:1px dotted #555555; font-weight:bold; padding:1.5pt 4pt;">${academicYear}</td>
          </tr>
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; padding:1.5pt 4pt; color:#1d4ed8;">Semester</td>
            <td style="border:1px dotted #555555; font-weight:bold; padding:1.5pt 4pt;">${semester}</td>
          </tr>
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; padding:1.5pt 4pt; color:#1d4ed8;">Section</td>
            <td style="border:1px dotted #555555; font-weight:bold; padding:1.5pt 4pt;">${section}</td>
          </tr>
        </table>

        <!-- COURSE OUTCOMES (COs) SECTION -->
        <div class="banner">COURSE OUTCOMES (COs)</div>

        <!-- COs Table -->
        <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:2pt; font-size:7.5pt;">
          <thead>
            <tr>
              <th style="border:1px solid #000; width:28%; padding:2pt 3pt; text-align:right; background-color:#ffffff;"></th>
              ${coHeadersHTML}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #000; padding:2pt 3pt; text-align:right; font-weight:normal; background-color:#ffffff; white-space:nowrap;">
                % of Students above the Target Pass Marks ${targetPassMarks}%
              </td>
              ${coPassMarksCellsHTML}
            </tr>
            <tr style="background-color:#4ade80;">
              <td style="border:1px solid #000; padding:2pt 3pt; text-align:right; font-weight:normal; background-color:#4ade80; white-space:nowrap;">
                % of Students above the KPI of ${kpiCO}%
              </td>
              ${coKPICellsHTML}
            </tr>
          </tbody>
        </table>

        <!-- CO Attainment Bar Chart -->
        ${coChartImg ? `<div class="chart-box"><img src="${coChartImg}" class="chart-img" alt="Course Outcomes Attainment Chart" /></div>` : ''}

        <!-- PROGRAM OUTCOMES (POs) SECTION -->
        <div class="banner">PROGRAM OUTCOMES (POs)</div>

        <!-- POs Table -->
        <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:2pt; font-size:7.5pt;">
          <thead>
            <tr>
              <th style="border:1px solid #000; width:28%; padding:2pt 3pt; text-align:right; background-color:#ffffff;"></th>
              ${poHeadersHTML}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #000; padding:2pt 3pt; text-align:right; font-weight:normal; background-color:#ffffff; white-space:nowrap;">
                % of Students above the Pass Marks ${targetPassMarks}%
              </td>
              ${poPassMarksCellsHTML}
            </tr>
            <tr style="background-color:#4ade80;">
              <td style="border:1px solid #000; padding:2pt 3pt; text-align:right; font-weight:normal; background-color:#4ade80; white-space:nowrap;">
                % of Students above the KPI of ${kpiPO}%
              </td>
              ${poKPICellsHTML}
            </tr>
          </tbody>
        </table>

        <!-- PO Attainment Bar Chart -->
        ${poChartImg ? `<div class="chart-box"><img src="${poChartImg}" class="chart-img" alt="Program Outcomes Attainment Chart" /></div>` : ''}

        <!-- Submitted by & Signature Section -->
        <div style="margin-top:4pt; margin-bottom:1pt;">
          <div style="color:#b91c1c; font-weight:bold; font-size:9.5pt; line-height:1.2;">Submitted by:</div>
          <div style="font-size:8.5pt; font-weight:normal; margin-bottom:2pt; margin-left:15pt;">(Signature)</div>
        </div>

        <!-- Yellow Instructor Table -->
        <table style="width:100%; border-collapse:collapse; border:1px solid #000; background-color:#ffff00; font-size:8pt; margin-bottom:4pt;">
          <tr>
            <td style="border:1px solid #000; width:22%; font-weight:bold; padding:1.5pt 4pt; text-align:right;">Name of the Instructor:</td>
            <td style="border:1px solid #000; padding:1.5pt 4pt; text-align:center; font-weight:bold;">${instructorName}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000; font-weight:bold; padding:1.5pt 4pt; text-align:right;">Department:</td>
            <td style="border:1px solid #000; padding:1.5pt 4pt; text-align:center; font-weight:bold;">${departmentShort}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000; font-weight:bold; padding:1.5pt 4pt; text-align:right;">Date:</td>
            <td style="border:1px solid #000; padding:1.5pt 4pt; text-align:center; font-weight:bold;">${exportDate}</td>
          </tr>
        </table>

        <!-- Page 1 label -->
        <div style="text-align:center; font-size:8.5pt; color:#222222; margin-top:2pt;">Page 1</div>
      </div>
    </body>
    </html>
  `

  // 6. Trigger File Download
  const blob = new Blob(['\ufeff' + wordHtml], {
    type: 'application/msword;charset=utf-8',
  })

  const safeCourseCode = (courseCode || 'Course').trim().replace(/[^a-zA-Z0-9_-]/g, '_')
  const downloadFileName = `CO_PO_Direct_Measurements_Report_${safeCourseCode}.doc`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = downloadFileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
