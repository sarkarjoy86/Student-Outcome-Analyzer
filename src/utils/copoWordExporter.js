import html2canvas from 'html2canvas'
import { sanitizeChartClone } from './chartDownload'

/**
 * Exports the "Direct Measurements of COs & POs" report as a Microsoft Word (.doc) document.
 * Matches the official institutional layout with green branding, compact metadata table,
 * properly aligned and proportioned bar charts with built-in clean legends,
 * narrower teacher signature table with dedicated white signature row, and guaranteed 1-page fit.
 */
export async function exportCOPOWordReport({
  courseInfo = {},
  calculations = {},
  targetPassMarks = 40,
  kpiCO = 50,
  kpiPO = 50,
  reportScope = 'combined',
}) {
  // Capture charts cleanly using an off-screen clone so live DOM is untouched
  const captureChart = async (wrapperId, fallbackContainerId) => {
    let container = document.getElementById(wrapperId)
    if (!container && fallbackContainerId) {
      container = document.getElementById(fallbackContainerId)
    }
    if (!container) return ''
    try {
      // Clone container to preserve exact layout and avoid touching live DOM
      const cloned = container.cloneNode(true)

      // Remove ALL buttons, toggles, and .no-print elements
      cloned.querySelectorAll('button, .no-print, [role="switch"]').forEach((btn) => btn.remove())

      // If cloned contains any card header or title row, remove it completely so no title or button artifacts exist
      const headerRow = cloned.querySelector('.flex.justify-between, [class*="justify-between"], h2')
      if (headerRow) {
        const topHeader = headerRow.closest('[class*="mb-"]') || headerRow
        topHeader.remove()
      }

      // Sanitize the clone (including converting Recharts legend to crisp, colored text glyphs ■)
      sanitizeChartClone(cloned, container)

      // Remove card borders/shadows/background for clean white export
      cloned.style.border = 'none'
      cloned.style.outline = 'none'
      cloned.style.boxShadow = 'none'
      cloned.style.borderRadius = '0px'
      cloned.style.padding = '0px'
      cloned.style.margin = '0px'
      cloned.style.backgroundColor = '#ffffff'

      const tempWrapper = document.createElement('div')
      tempWrapper.style.position = 'absolute'
      tempWrapper.style.left = '-9999px'
      tempWrapper.style.top = '0px'
      tempWrapper.style.backgroundColor = '#ffffff'
      tempWrapper.style.padding = '0px'
      tempWrapper.style.margin = '0px'

      const containerRect = container.getBoundingClientRect()
      const originalWidth = containerRect.width || 700
      tempWrapper.style.width = originalWidth + 'px'

      tempWrapper.appendChild(cloned)
      document.body.appendChild(tempWrapper)

      const h2c = window.html2canvas || html2canvas
      const canvas = await h2c(tempWrapper, {
        backgroundColor: '#ffffff',
        scale: 2.5,
        logging: false,
        useCORS: true,
        imageTimeout: 0,
      })

      document.body.removeChild(tempWrapper)

      return canvas.toDataURL('image/png')
    } catch (err) {
      console.warn('Error capturing chart for Word export:', wrapperId, err)
      return ''
    }
  }

  // 1. Capture Bar Charts cleanly (prefer chart wrapper with SVG + Legend, zero buttons)
  const coChartImg = (await captureChart('co-overview-chart-wrapper', 'co-attainment-chart'))
  const poChartImg = (await captureChart('po-overview-chart-wrapper', 'po-bar-chart'))

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

  // 3. Generate CO Data Columns (CO1 to CO12) - compact height
  const coHeadersHTML = Array.from({ length: 12 }, (_, i) => `<th style="border:1px solid #000; padding:0.4pt 1pt; text-align:center; font-weight:bold; font-size:6.8pt; line-height:1.0; background-color:#ffffff;">CO${i + 1}</th>`).join('')

  const coPassMarksCellsHTML = Array.from({ length: 12 }, (_, i) => {
    const coKey = `CO${i + 1}`
    const val = calculations?.coAttainment?.[coKey]?.passMarksPercentage || 0
    return `<td style="border:1px solid #000; padding:0.4pt 1pt; text-align:center; font-weight:bold; font-size:6.8pt; line-height:1.0; color:#dc2626; background-color:#ffffff;">${val.toFixed(1)}</td>`
  }).join('')

  const coKPICellsHTML = Array.from({ length: 12 }, (_, i) => {
    const coKey = `CO${i + 1}`
    const val = calculations?.coAttainment?.[coKey]?.kpiPercentage || 0
    return `<td style="border:1px solid #000; padding:0.4pt 1pt; text-align:center; font-weight:bold; font-size:6.8pt; line-height:1.0; color:#000000; background-color:#4ade80;">${val.toFixed(1)}</td>`
  }).join('')

  // 4. Generate PO Data Columns (PO1 to PO12) - compact height
  const poHeadersHTML = Array.from({ length: 12 }, (_, i) => `<th style="border:1px solid #000; padding:0.4pt 1pt; text-align:center; font-weight:bold; font-size:6.8pt; line-height:1.0; background-color:#ffffff;">PO${i + 1}</th>`).join('')

  const poPassMarksCellsHTML = Array.from({ length: 12 }, (_, i) => {
    const poKey = `PO${i + 1}`
    const val = calculations?.poAttainment?.[poKey]?.passMarksPercentage || 0
    return `<td style="border:1px solid #000; padding:0.4pt 1pt; text-align:center; font-weight:bold; font-size:6.8pt; line-height:1.0; color:#dc2626; background-color:#ffffff;">${val.toFixed(1)}</td>`
  }).join('')

  const poKPICellsHTML = Array.from({ length: 12 }, (_, i) => {
    const poKey = `PO${i + 1}`
    const val = calculations?.poAttainment?.[poKey]?.kpiPercentage || 0
    return `<td style="border:1px solid #000; padding:0.4pt 1pt; text-align:center; font-weight:bold; font-size:6.8pt; line-height:1.0; color:#000000; background-color:#4ade80;">${val.toFixed(1)}</td>`
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
          margin: 0.15in 0.35in 0.15in 0.35in;
          mso-header-margin: 0.1in;
          mso-footer-margin: 0.1in;
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
          font-family: 'Times New Roman', Times, serif;
          font-size: 8pt;
          color: #000000;
          line-height: 1.05;
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
          font-size: 8.5pt;
          letter-spacing: 0.5pt;
          text-transform: uppercase;
          padding: 1.5pt 0;
          margin-top: 2pt;
          margin-bottom: 1pt;
        }
        p.MsoFooter, li.MsoFooter, div.MsoFooter {
          margin: 0in;
          margin-bottom: .0001pt;
          mso-pagination: widow-orphan;
          font-size: 8pt;
          font-family: 'Times New Roman', Times, serif;
          color: #444444;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- Document Title -->
        <div style="text-align:center; margin-bottom:2pt;">
          <div style="font-size:9pt; font-weight:normal; color:#333333; margin-bottom:0.5pt;">Report</div>
          <div style="font-size:13pt; font-weight:bold; color:#166534; letter-spacing:0.3pt;">Direct Measurements of COs &amp; POs</div>
        </div>

        <!-- Metadata Table with dotted borders matching official template - compact height -->
        <table style="width:100%; border-collapse:collapse; border:1px dotted #555555; margin-bottom:2pt; font-size:7pt; line-height:1.05;">
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; width:16%; padding:0.5pt 3pt; color:#1d4ed8;">Course Code:</td>
            <td style="border:1px dotted #555555; font-weight:bold; width:84%; padding:0.5pt 3pt;">${courseCode}</td>
          </tr>
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; padding:0.5pt 3pt; color:#1d4ed8;">Course Title:</td>
            <td style="border:1px dotted #555555; font-weight:bold; padding:0.5pt 3pt;">${courseTitle}</td>
          </tr>
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; padding:0.5pt 3pt; color:#1d4ed8;">Department:</td>
            <td style="border:1px dotted #555555; font-weight:bold; padding:0.5pt 3pt;">${department}</td>
          </tr>
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; padding:0.5pt 3pt; color:#1d4ed8;">Academic Year:</td>
            <td style="border:1px dotted #555555; font-weight:bold; padding:0.5pt 3pt;">${academicYear}</td>
          </tr>
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; padding:0.5pt 3pt; color:#1d4ed8;">Semester:</td>
            <td style="border:1px dotted #555555; font-weight:bold; padding:0.5pt 3pt;">${semester}</td>
          </tr>
          <tr>
            <td style="border:1px dotted #555555; font-weight:bold; padding:0.5pt 3pt; color:#1d4ed8;">Section:</td>
            <td style="border:1px dotted #555555; font-weight:bold; padding:0.5pt 3pt;">${section}</td>
          </tr>
        </table>

        <!-- COURSE OUTCOMES (COs) SECTION -->
        <div class="banner">COURSE OUTCOMES (COs)</div>

        <!-- COs Table -->
        <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:1.5pt; font-size:6.8pt; line-height:1.05;">
          <thead>
            <tr>
              <th style="border:1px solid #000; width:28%; padding:0.5pt 2.5pt; text-align:right; background-color:#ffffff;"></th>
              ${coHeadersHTML}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #000; padding:0.5pt 2.5pt; text-align:right; font-weight:normal; background-color:#ffffff; white-space:nowrap;">
                % of Students above the Target Pass Marks ${targetPassMarks}%
              </td>
              ${coPassMarksCellsHTML}
            </tr>
            <tr style="background-color:#4ade80;">
              <td style="border:1px solid #000; padding:0.5pt 2.5pt; text-align:right; font-weight:normal; background-color:#4ade80; white-space:nowrap;">
                % of Students above the KPI of ${kpiCO}%
              </td>
              ${coKPICellsHTML}
            </tr>
          </tbody>
        </table>

        <!-- CO Attainment Bar Chart (Table-isolated to prevent any overlap with table above) -->
        ${coChartImg ? `
          <table style="width:100%; border-collapse:collapse; border:none; margin:0 auto 2pt auto;">
            <tr>
              <td style="border:none; text-align:center; padding:0;">
                <img src="${coChartImg}" width="430" style="width:430pt; max-width:100%; height:auto; display:block; margin:0 auto; border:none;" alt="Course Outcomes Attainment Chart" />
              </td>
            </tr>
          </table>
        ` : ''}

        <!-- PROGRAM OUTCOMES (POs) SECTION -->
        <div class="banner">PROGRAM OUTCOMES (POs)</div>

        <!-- POs Table -->
        <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:1.5pt; font-size:6.8pt; line-height:1.05;">
          <thead>
            <tr>
              <th style="border:1px solid #000; width:28%; padding:0.5pt 2.5pt; text-align:right; background-color:#ffffff;"></th>
              ${poHeadersHTML}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #000; padding:0.5pt 2.5pt; text-align:right; font-weight:normal; background-color:#ffffff; white-space:nowrap;">
                % of Students above the Pass Marks ${targetPassMarks}%
              </td>
              ${poPassMarksCellsHTML}
            </tr>
            <tr style="background-color:#4ade80;">
              <td style="border:1px solid #000; padding:0.5pt 2.5pt; text-align:right; font-weight:normal; background-color:#4ade80; white-space:nowrap;">
                % of Students above the KPI of ${kpiPO}%
              </td>
              ${poKPICellsHTML}
            </tr>
          </tbody>
        </table>

        <!-- PO Attainment Bar Chart (Table-isolated to prevent any overlap with table above) -->
        ${poChartImg ? `
          <table style="width:100%; border-collapse:collapse; border:none; margin:0 auto 2pt auto;">
            <tr>
              <td style="border:none; text-align:center; padding:0;">
                <img src="${poChartImg}" width="430" style="width:430pt; max-width:100%; height:auto; display:block; margin:0 auto; border:none;" alt="Program Outcomes Attainment Chart" />
              </td>
            </tr>
          </table>
        ` : ''}

        <!-- Submitted by & Signature Section -->
        <div style="margin-top:1pt; margin-bottom:0.5pt;">
          <div style="color:#b91c1c; font-weight:bold; font-size:7.5pt; line-height:1.0;">Submitted by:</div>
        </div>

        <!-- Instructor Table with Dedicated White Signature Row (Width: 70% to match request) -->
        <table style="width:70%; border-collapse:collapse; border:1px solid #000; font-size:6.5pt; line-height:1.0; margin-bottom:1pt; page-break-inside:avoid;">
          <tr style="background-color:#ffffff; page-break-inside:avoid;">
            <td style="border:1px solid #000; width:28%; font-weight:bold; padding:0.3pt 3pt; text-align:right; background-color:#ffffff; color:#000000;">(Signature):</td>
            <td style="border:1px solid #000; padding:0.3pt 3pt; text-align:center; background-color:#ffffff; height:10pt;">&nbsp;</td>
          </tr>
          <tr style="background-color:#ffff00; page-break-inside:avoid;">
            <td style="border:1px solid #000; width:28%; font-weight:bold; padding:0.3pt 3pt; text-align:right; background-color:#ffff00;">Name of the Instructor:</td>
            <td style="border:1px solid #000; padding:0.3pt 3pt; text-align:center; font-weight:bold; background-color:#ffff00;">${instructorName}</td>
          </tr>
          <tr style="background-color:#ffff00; page-break-inside:avoid;">
            <td style="border:1px solid #000; font-weight:bold; padding:0.3pt 3pt; text-align:right; background-color:#ffff00;">Department:</td>
            <td style="border:1px solid #000; padding:0.3pt 3pt; text-align:center; font-weight:bold; background-color:#ffff00;">${departmentShort}</td>
          </tr>
          <tr style="background-color:#ffff00; page-break-inside:avoid;">
            <td style="border:1px solid #000; font-weight:bold; padding:0.3pt 3pt; text-align:right; background-color:#ffff00;">Date:</td>
            <td style="border:1px solid #000; padding:0.3pt 3pt; text-align:center; font-weight:bold; background-color:#ffff00;">${exportDate}</td>
          </tr>
        </table>
      </div>

      <!-- Word Running Footer (Assigned to Section1 via mso-footer: f1) -->
      <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <div style="mso-element:footer" id="f1">
              <table border="0" cellspacing="0" cellpadding="0" style="width:100%; border:none; border-top:0.5pt solid #cccccc; padding-top:2pt; font-family:'Times New Roman',Times,serif; font-size:8pt; color:#444444;">
                <tr>
                  <td style="border:none; text-align:left; font-size:8pt; color:#444444; padding:0;">
                    <p class="MsoFooter" style="text-align:left; margin:0;">
                      CO-PO Direct Report &bull; ${courseCode} (${section})
                    </p>
                  </td>
                  <td style="border:none; text-align:right; font-size:8pt; color:#444444; padding:0;">
                    <p class="MsoFooter" style="text-align:right; margin:0;">
                      Page <!--[if supportFields]><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'> </span>PAGE <span style='mso-element:field-separator'></span><![endif]--><span style='mso-field-code:" PAGE "'><span style='mso-no-proof:yes'>1</span></span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]--> of <!--[if supportFields]><span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'> </span>NUMPAGES <span style='mso-element:field-separator'></span><![endif]--><span style='mso-field-code:" NUMPAGES "'><span style='mso-no-proof:yes'>1</span></span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->
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
