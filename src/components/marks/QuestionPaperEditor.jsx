import { useState, useEffect, useRef } from 'react'
import { apiService } from '../../services/apiService'
import {
  HtmlEditor,
  Image,
  Inject,
  Link,
  QuickToolbar,
  RichTextEditorComponent,
  Toolbar,
  Table
} from '@syncfusion/ej2-react-richtexteditor'
import { ArrowLeft, Save, FileDown, Printer, Loader2, AlertCircle, Plus, Minus } from 'lucide-react'
import mammoth from 'mammoth'

// Syncfusion CSS imports
import '@syncfusion/ej2-base/styles/material.css'
import '@syncfusion/ej2-icons/styles/material.css'
import '@syncfusion/ej2-buttons/styles/material.css'
import '@syncfusion/ej2-splitbuttons/styles/material.css'
import '@syncfusion/ej2-inputs/styles/material.css'
import '@syncfusion/ej2-lists/styles/material.css'
import '@syncfusion/ej2-navigations/styles/material.css'
import '@syncfusion/ej2-popups/styles/material.css'
import '@syncfusion/ej2-richtexteditor/styles/material.css'

export default function QuestionPaperEditor({ assessment, offering, onBack }) {
  const [editorValue, setEditorValue] = useState('')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [availableCOs, setAvailableCOs] = useState([])
  const [coDetails, setCoDetails] = useState([]) // Full CO objects with code + description
  // Bloom levels are now stored directly in the questions array (q.bloom)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadingCount, setUploadingCount] = useState(0)
  const [showBlobWarning, setShowBlobWarning] = useState(false)

  const [examDuration, setExamDuration] = useState(assessment.examDuration || '')
  const [numQuestions, setNumQuestions] = useState(assessment.numQuestions || 0)
  const [level, setLevel] = useState(assessment.level || offering?.course?.level || '1')
  const [term, setTerm] = useState(assessment.term || offering?.course?.term || 'I')

  const BLOOM_OPTIONS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']

  const isExtraCT = Boolean(assessment.isExtraCT || (assessment.name && assessment.name.toLowerCase().startsWith('extra ct')))
  const matchedParent = assessment.name ? assessment.name.match(/\(([^)]+)\)/) : null
  const parentName = assessment.parentCTName || (matchedParent && matchedParent[1] ? matchedParent[1].replace(/^for\s+/i, '') : 'Target CT')

  const rteRef = useRef(null)
  const uploadingCountRef = useRef(0)

  useEffect(() => {
    loadPaperData()
  }, [assessment])

  const loadPaperData = async () => {
    setLoading(true)
    setError('')
    try {
      // Fetch available COs for this course (full objects with code + description)
      let cosList = []
      let cosFullList = []
      if (offering.course?._id || offering.course) {
        const courseId = offering.course?._id || offering.course
        try {
          const coRes = await apiService.getCourseOutcomes(courseId)
          if (coRes && coRes.outcomes && coRes.outcomes.length > 0) {
            cosList = coRes.outcomes.map(o => o.code)
            cosFullList = coRes.outcomes.map(o => ({ code: o.code, description: o.description || '' }))
          }
        } catch (coErr) {
          console.error("Failed to load course outcomes:", coErr)
        }
      }

      // Fallback to course.numCOs if no database outcomes are configured
      if (cosList.length === 0) {
        const numCOs = offering.course?.numCOs || 4
        cosList = Array.from({ length: numCOs }, (_, i) => `CO${i + 1}`)
        cosFullList = cosList.map(code => ({ code, description: '' }))
      }
      setAvailableCOs(cosList)
      setCoDetails(cosFullList)

      const res = await apiService.getQuestionPaper(assessment._id)
      const content = res.content || '<p>Write your questions here...</p>'
      setEditorValue(content)
      if (content.includes('src="blob:') || content.includes("src='blob:")) {
        setShowBlobWarning(true)
      } else {
        setShowBlobWarning(false)
      }

      const currentAssessment = res.assessment || assessment
      setExamDuration(currentAssessment.examDuration || '')
      setLevel(currentAssessment.level || offering.course?.level || '1')
      setTerm(currentAssessment.term || offering.course?.term || 'I')

      const isExtra = Boolean(currentAssessment.isExtraCT || (currentAssessment.name && currentAssessment.name.toLowerCase().startsWith('extra ct')))

      // If questions are not initialized, generate array based on assessment.numQuestions
      const qList = res.questions || []
      const finalQs = []

      // Auto-set default numQuestions for Mid (3) and Final (5) when first opening
      let targetNum = currentAssessment.numQuestions || 0
      if (targetNum === 0 && qList.length === 0) {
        if (currentAssessment.type === 'midTerm') {
          targetNum = 3
        } else if (currentAssessment.type === 'final') {
          targetNum = 5
        }
      }
      setNumQuestions(targetNum)

      for (let i = 1; i <= targetNum; i++) {
        const qNum = `Q${i}`
        const existing = qList.find(q => q.questionNumber === qNum)
        const defaultCO = isExtra ? (currentAssessment.co || 'NONE') : 'NONE'
        if (existing) {
          finalQs.push({
            questionNumber: qNum,
            maxMarks: existing.maxMarks ?? 0,
            co: isExtra ? defaultCO : (existing.co || 'NONE'),
            bloom: existing.bloom || ''
          })
        } else {
          // Default division of marks
          const defaultMax = Math.floor(currentAssessment.maxMarks / (targetNum || 1))
          finalQs.push({
            questionNumber: qNum,
            maxMarks: i === targetNum ? defaultMax + (currentAssessment.maxMarks % (targetNum || 1)) : defaultMax,
            co: defaultCO,
            bloom: ''
          })
        }
      }
      setQuestions(finalQs)
    } catch (err) {
      setError('Failed to load question paper data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNumQuestionsChange = (newVal) => {
    const val = Math.max(0, parseInt(newVal) || 0)
    setNumQuestions(val)

    const isExtra = Boolean(assessment.isExtraCT || (assessment.name && assessment.name.toLowerCase().startsWith('extra ct')))

    setQuestions(prev => {
      const updated = [...prev]
      const defaultCO = isExtra ? (assessment.co || 'NONE') : 'NONE'
      if (updated.length < val) {
        // Add new questions
        for (let i = updated.length + 1; i <= val; i++) {
          const qNum = `Q${i}`
          const defaultMax = Math.floor(assessment.maxMarks / (val || 1))
          updated.push({
            questionNumber: qNum,
            maxMarks: i === val ? defaultMax + (assessment.maxMarks % (val || 1)) : defaultMax,
            co: defaultCO,
            bloom: ''
          })
        }
      } else if (updated.length > val) {
        // Truncate
        updated.splice(val)
      }
      return updated
    })
  }

  const handleBloomChange = (idx, value) => {
    setQuestions(prev => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], bloom: value }
      return updated
    })
  }

  const handleMetadataChange = (index, key, value) => {
    setQuestions(prev => {
      const updated = [...prev]
      if (key === 'maxMarks') {
        updated[index] = {
          ...updated[index],
          [key]: parseInt(value) || 0
        }
      } else {
        updated[index] = {
          ...updated[index],
          [key]: value
        }
      }
      return updated
    })
  }

  const savePaper = async () => {
    // 1. Check if an image is currently uploading
    if (uploadingCount > 0) {
      alert('One or more images are still temporary. Please wait until image uploads complete.')
      return
    }

    // 2. Parse editor HTML and check for temporary image sources (blob:, data:image, localhost)
    const currentContent = rteRef.current ? rteRef.current.value : editorValue
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = currentContent || ''
    const imgs = tempDiv.querySelectorAll('img')
    let hasTemporaryImages = false
    let offendingSrc = ''
    for (let img of imgs) {
      const src = img.getAttribute('src') || ''
      if (src.startsWith('blob:') || src.startsWith('data:image') || src.includes('localhost')) {
        hasTemporaryImages = true
        offendingSrc = src
        break
      }
    }
    if (hasTemporaryImages) {
      alert(`One or more images are still temporary (${offendingSrc}). Please wait until image uploads complete.`)
      return
    }

    // Validate max marks allocation sum
    const totalAllocated = questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0)
    if (questions.length > 0 && totalAllocated !== assessment.maxMarks) {
      if (!window.confirm(`Warning: The total allocated marks for all questions is ${totalAllocated}, but the assessment's total is ${assessment.maxMarks}. Do you want to save anyway?`)) {
        return
      }
    }

    setSaving(true)
    try {
      const validCOs = Array.from(new Set(
        questions
          .map(q => q.co)
          .filter(c => c && c !== 'NONE' && c !== '')
      ))
      const aggregatedCO = validCOs.join(', ')

      // 1. Update Assessment fields (examDuration, numQuestions, level, term, co, status)
      await apiService.updateAssessment(assessment._id, {
        examDuration,
        numQuestions,
        level,
        term,
        co: aggregatedCO || assessment.co || '',
        status: validCOs.length > 0 ? 'Published' : assessment.status
      })

      // 2. Save Question Paper content and metadata questions (including bloom levels)
      await apiService.saveQuestionPaper(assessment._id, {
        content: currentContent,
        questions: questions.map(q => ({
          questionNumber: q.questionNumber,
          maxMarks: q.maxMarks,
          co: q.co,
          bloom: q.bloom || ''
        }))
      })
      alert('Question paper, metadata, and assessment settings saved successfully!')
      loadPaperData()
    } catch (err) {
      alert('Failed to save question paper: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Get pre-populated university header (CT format)
  const getHeaderHtml = () => {
    const deptName = offering.course?.department || 'Department of Computer Science and Engineering'
    const courseCode = offering.course?.courseCode || ''
    const courseTitle = offering.course?.courseName || ''
    const creditHours = offering.course?.creditHours || '3.0'
    const duration = examDuration || 'N/A'
    const fullMarks = assessment.maxMarks || 0
    const section = offering.section || ''
    const semesterName = offering.semester?.semesterName || ''
    const academicYear = offering.academicYear || ''
    const assessmentName = assessment.name || ''

    // Build Level/Term line
    const levelTermLine = (level && term) ? `Level ${level} Term ${term}` : (level ? `Level ${level}` : (term ? `Term ${term}` : ''))

    // Build assessment type label based on actual type
    let typeLabel = 'Assessment'
    const aType = assessment.type || ''
    if (aType === 'cts') typeLabel = 'Class Test'
    else if (aType === 'midTerm') typeLabel = 'Mid Term Exam'
    else if (aType === 'final') typeLabel = 'Final Exam'
    else if (aType === 'assignments') typeLabel = 'Assignment'
    else if (aType === 'presentation') typeLabel = 'Presentation'
    else if (aType === 'attendance') typeLabel = 'Attendance'
    else if (aType === 'performance') typeLabel = 'Performance'

    const semesterFull = academicYear ? `${semesterName} ${academicYear}` : semesterName
    const ctParts = []
    
    const creditsVal = parseFloat(offering.course?.creditHours || offering.course?.numCredits) || 3
    const standardCTCount = Math.max(1, Math.floor(creditsVal))
    const formattedAssessmentName = isExtraCT ? `Extra CT (CT-${standardCTCount + 1})` : assessmentName

    let typeName = ''
    if (aType === 'cts') {
      typeName = `Class Test: ${formattedAssessmentName}`
    } else if (aType === 'midTerm') {
      typeName = `Mid Term Examination`
    } else if (aType === 'final') {
      typeName = `Final Examination`
    } else {
      typeName = `${typeLabel}: ${formattedAssessmentName}`
    }
    
    if (typeName) ctParts.push(typeName)
    if (section) ctParts.push(`Section: ${section}`)
    if (semesterFull) ctParts.push(`Semester: ${semesterFull}`)
    const ctLine = ctParts.join(', ')

    return `
      <div style="text-align: center; font-family: 'Times New Roman', Times, serif; margin-bottom: 20px; line-height: 1.5; color: #000;">
        <p style="margin: 0; font-size: 16px; font-weight: bold;">${deptName}</p>
        ${levelTermLine ? `<p style="margin: 2px 0 0 0; font-size: 15px; font-weight: bold;">${levelTermLine}</p>` : ''}
        <p style="margin: 2px 0 0 0; font-size: 14px;">Course code: ${courseCode}</p>
        <p style="margin: 2px 0 0 0; font-size: 14px;">Course title: ${courseTitle}</p>
        <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold;">Credit Hour: ${creditHours}, Exam Duration: ${duration}, Full Marks: ${fullMarks}</p>
        ${ctLine ? `<p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold;">${ctLine}</p>` : ''}
        <hr style="border: none; border-top: 1.5px solid #000; margin-top: 10px;" />
      </div>
    `
  }

  // Generate CO description lines for print/export (shown before questions)
  const getCoDescriptionsHtml = () => {
    if (questions.length === 0) return ''

    // Collect unique COs used by questions
    const usedCOs = new Set()
    questions.forEach(q => {
      if (q.co && q.co !== 'NONE') usedCOs.add(q.co)
    })

    let html = ''
    // Sort COs and show description for each
    const sortedCOs = Array.from(usedCOs).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    )

    sortedCOs.forEach(coKey => {
      const coObj = coDetails.find(c => c.code === coKey)
      const coDesc = coObj?.description || ''
      if (coDesc) {
        html += `<p style="margin: 15px 0 8px 0; font-size: 14px; font-weight: bold; font-style: normal;">${coKey}: ${coDesc}</p>`
      }
    })

    return html
  }

  // Inject [CO→Bloom] tags and marks into each question's HTML for print/export
  const injectQuestionAnnotations = (htmlContent) => {
    if (questions.length === 0) return htmlContent

    // Use a temporary DOM element to parse and modify the HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = htmlContent

    // Find all list items (questions are typically in <li> elements)
    const listItems = tempDiv.querySelectorAll('li')

    listItems.forEach((li, idx) => {
      if (idx < questions.length) {
        const q = questions[idx]
        const co = q.co && q.co !== 'NONE' ? q.co : ''
        const bloom = q.bloom || ''
        const marks = q.maxMarks || 0

        // Build the annotation string
        let annotation = ''

        // Add [CO→Bloom] tag if both are set
        if (co && bloom) {
          annotation += ` <strong>[${co}\u2192${bloom}]</strong>`
        } else if (co) {
          annotation += ` <strong>[${co}]</strong>`
        }

        // Create marks span (right-aligned)
        const marksSpan = `<span style="float: right; font-weight: bold; font-size: 14px; margin-left: 15px;">${marks}</span>`

        // Prepend marks float to the beginning of li content, append annotation to the end
        li.innerHTML = marksSpan + li.innerHTML + annotation
      }
    })

    return tempDiv.innerHTML
  }

  // Print styles
  const getPrintStyles = () => {
    return `
      li {
        margin-bottom: 8px;
        text-align: justify;
      }
    `
  }

  // Word export
  const handleExportWord = () => {
    const currentContent = rteRef.current ? rteRef.current.value : editorValue
    const headerHtml = getHeaderHtml()
    const coDescriptions = getCoDescriptionsHtml()
    const annotatedContent = injectQuestionAnnotations(currentContent)
    const fullHtml = headerHtml + coDescriptions + annotatedContent

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><title>Question Paper</title><style>" +
      "body { font-family: 'Times New Roman', Times, serif; padding: 20px; }" +
      "table { border-collapse: collapse; width: 100%; }" +
      "th, td { border: 1px solid black; padding: 8px; text-align: left; }" +
      getPrintStyles() +
      "</style></head><body>"
    const footer = "</body></html>"
    const sourceHTML = header + fullHtml + footer

    const blob = new Blob(['\ufeff' + sourceHTML], {
      type: 'application/msword'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${assessment.name || 'question_paper'}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Print/PDF export
  const handlePrint = () => {
    const currentContent = rteRef.current ? rteRef.current.value : editorValue
    const headerHtml = getHeaderHtml()
    const coDescriptions = getCoDescriptionsHtml()
    const annotatedContent = injectQuestionAnnotations(currentContent)

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Question Paper</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.6; color: #000; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            ${getPrintStyles()}
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${headerHtml}
          ${coDescriptions}
          <div>${annotatedContent}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleCustomImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.docx'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer })
          if (rteRef.current) {
            rteRef.current.executeCommand('insertHTML', result.value)
          }
        } catch (err) {
          console.error('Error converting file:', err)
          alert('Failed to convert Word file: ' + err.message)
        }
      }
      reader.readAsArrayBuffer(file)
    }
    input.click()
  }

  const API_BASE = import.meta.env.VITE_API_URL || ''

  const insertImageSettings = {
    saveUrl: `${API_BASE}/api/upload/image`,
    path: 'https://'
  }

  const getNextImageName = (currentUploading) => {
    const courseCode = (offering?.course?.courseCode || 'COURSE').replace(/[^a-zA-Z0-9]/g, '');
    const assessmentName = (assessment?.name || 'ASSESSMENT').replace(/[^a-zA-Z0-9]/g, '');
    const year = offering?.academicYear || new Date().getFullYear();
    
    // Count existing img tags in current editor content
    const currentHtml = rteRef.current ? rteRef.current.value : editorValue;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml || '';
    const imgCount = tempDiv.querySelectorAll('img').length;
    
    return `${courseCode}_${assessmentName}_Q${imgCount + currentUploading + 1}_${year}`;
  };

  const onImageUploading = (args) => {
    // Count existing img tags in current editor content
    const currentHtml = rteRef.current ? rteRef.current.value : editorValue;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentHtml || '';
    const imgCount = tempDiv.querySelectorAll('img').length;

    if (imgCount + uploadingCountRef.current >= 10) {
      args.cancel = true;
      setUploadStatus('❌ Upload failed: A maximum of 10 images are allowed per question paper.');
      alert('A maximum of 10 images are allowed per question paper.');
      return;
    }

    uploadingCountRef.current += 1;
    setUploadingCount(uploadingCountRef.current);
    
    const token = localStorage.getItem('obe-auth-token')
    if (token && args.currentRequest) {
      args.currentRequest.setRequestHeader('Authorization', `Bearer ${token}`)
      
      const filename = getNextImageName(uploadingCountRef.current - 1)
      args.currentRequest.setRequestHeader('x-filename', filename)
    }

    const request = args.currentRequest
    if (request && request.upload) {
      request.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          const totalBlocks = 10
          const filled = Math.round((percent / 100) * totalBlocks)
          const empty = totalBlocks - filled
          const progressStr = '█'.repeat(filled) + '░'.repeat(empty)
          setUploadStatus(`Uploading image... ${progressStr} ${percent}%`)
        }
      }
    }
  }

  const onImageUploadSuccess = (args) => {
    uploadingCountRef.current = Math.max(0, uploadingCountRef.current - 1)
    const nextCount = uploadingCountRef.current
    setUploadingCount(nextCount)
    if (nextCount === 0) {
      setUploadStatus('✓ Image uploaded successfully.')
      setTimeout(() => setUploadStatus(''), 3000)
    }

    try {
      if (args.e && args.e.currentTarget && args.e.currentTarget.response) {
        const response = JSON.parse(args.e.currentTarget.response)
        let newUrl = ''
        if (response && response.success && response.url) {
          newUrl = response.url
        } else if (response && response.secureUrl) {
          newUrl = response.secureUrl
        }

        if (newUrl) {
          // Strip "https://" or "http://" prefix from the start of newUrl
          // because Syncfusion will prepend the "path" setting (which we set to 'https://')
          let relativeName = newUrl
          if (newUrl.startsWith('https://')) {
            relativeName = newUrl.substring(8)
          } else if (newUrl.startsWith('http://')) {
            relativeName = newUrl.substring(7)
          }
          
          // Set args.file.name to update the internal Syncfusion model natively
          if (args.file) {
            args.file.name = relativeName
          }
        }
      }
    } catch (err) {
      console.error('Error parsing image upload response:', err)
    }
  }

  const onImageUploadFailed = (args) => {
    uploadingCountRef.current = Math.max(0, uploadingCountRef.current - 1)
    const nextCount = uploadingCountRef.current
    setUploadingCount(nextCount)
    if (nextCount === 0) {
      setUploadStatus('❌ Upload failed.')
      setTimeout(() => setUploadStatus(''), 3000)
    }

    console.error('Image upload failed:', args)
    let message = 'Image upload failed. Please try again.'
    try {
      if (args.e && args.e.currentTarget && args.e.currentTarget.response) {
        const response = JSON.parse(args.e.currentTarget.response)
        if (response && response.message) {
          message = `Upload failed: ${response.message}`
          if (response.error) {
            message += `\n\nDetails: ${response.error}`
          }
        }
      }
    } catch (e) {}
    alert(message)
  }

  const onDialogOpen = (args) => {
    if (args.container) {
      const uploadInput = args.container.querySelector('.e-rte-upload-input');
      if (uploadInput && uploadInput.ej2_instances && uploadInput.ej2_instances[0]) {
        const uploaderInstance = uploadInput.ej2_instances[0];
        
        // Enable multiple file upload and set limit
        uploaderInstance.multiple = true;
        uploaderInstance.maxFilesCount = 10;
        uploaderInstance.filesLimit = 10;
        
        // Attach selected event handler to enforce the 10-image limit when selecting files
        uploaderInstance.selected = (selectArgs) => {
          const currentHtml = rteRef.current ? rteRef.current.value : editorValue;
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = currentHtml || '';
          const imgCount = tempDiv.querySelectorAll('img').length;
          
          const newFilesCount = selectArgs.filesData.length;
          if (imgCount + uploadingCountRef.current + newFilesCount > 10) {
            selectArgs.cancel = true;
            alert('A maximum of 10 images are allowed per question paper.');
          }
        };
      }
    }
  }

  const toolbarSettings = {
    items: [
      'Bold', 'Italic', 'Underline', 'StrikeThrough', 'SubScript', 'SuperScript', '|',
      'FontName', 'FontSize', 'FontColor', 'BackgroundColor',
      'LowerCase', 'UpperCase', '|',
      'Formats', 'Alignments', 'OrderedList', 'UnorderedList',
      'Outdent', 'Indent', '|',
      'CreateLink', 'Image', 'CreateTable', '|', 'ClearFormat', 'Print',
      'SourceCode', 'FullScreen', '|',
      {
        tooltipText: 'Import Word Document (.docx)',
        template: '<button class="e-tbar-btn e-control e-btn e-lib" id="import-word-btn" tabIndex="-1" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: none; background: transparent;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-up" style="display: inline-block; vertical-align: middle;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 12v6"/><path d="m9 15 3-3 3 3"/></svg></button>',
        click: handleCustomImportClick
      },
      '|', 'Undo', 'Redo'
    ]
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md border p-12 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-green-700" size={36} />
        <p className="text-gray-500 font-semibold">Loading Question Paper...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-white to-green-50/20 rounded-2xl shadow-md p-6 border border-green-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-green-50 rounded-lg text-green-700 transition-colors border border-green-150"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-2xl font-extrabold text-gray-800">
              Question Paper Editor: {isExtraCT ? `Extra CT (CT-${Math.max(1, Math.floor(parseFloat(offering.course?.creditHours) || 3)) + 1})` : assessment.name}
            </h1>
          </div>
          <p className="text-sm text-gray-500 font-semibold pl-9">
            Manage, format, map, and export question papers.
          </p>
        </div>

        <div className="flex items-center gap-2 pl-9 md:pl-0">
          <button
            onClick={savePaper}
            disabled={saving || uploadingCount > 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Paper</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportWord}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all"
          >
            <FileDown size={16} />
            Word
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md transition-all"
          >
            <Printer size={16} />
            Print/PDF
          </button>
        </div>
      </div>

      {showBlobWarning && (
        <div className="p-4 rounded-xl flex items-start gap-3 bg-amber-50 text-amber-800 border border-amber-200 shadow-sm font-medium">
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div>
            <span className="font-bold">Warning:</span> This question paper contains temporary image references. Please reinsert those images before saving.
          </div>
        </div>
      )}

      {uploadStatus && (
        <div className="p-4 rounded-xl flex items-center gap-3 bg-blue-50 text-blue-800 border border-blue-200 shadow-sm font-semibold">
          <Loader2 className={`shrink-0 ${uploadStatus.includes('✓') || uploadStatus.includes('❌') ? '' : 'animate-spin'}`} size={20} />
          <div className="font-mono text-sm">
            {uploadStatus}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 shadow-sm font-medium">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Syncfusion Editor Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Read only header layout */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">University Header Preview (Read-Only)</h3>
            <div
              className="border p-6 bg-gray-50/50 rounded-xl"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
              dangerouslySetInnerHTML={{ __html: getHeaderHtml() }}
            />
          </div>

          {/* Syncfusion Editor */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Question Paper Content</h3>
            <RichTextEditorComponent
              ref={rteRef}
              value={editorValue}
              toolbarSettings={toolbarSettings}
              insertImageSettings={insertImageSettings}
              imageUploading={onImageUploading}
              imageUploadSuccess={onImageUploadSuccess}
              imageUploadFailed={onImageUploadFailed}
              dialogOpen={onDialogOpen}
              height={450}
            >
              <Inject services={[Toolbar, HtmlEditor, Link, Image, QuickToolbar, Table]} />
            </RichTextEditorComponent>
          </div>
        </div>

        {/* Metadata Panel (Right side) */}
        <div className="space-y-6">
          {/* Assessment Settings Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3 font-sans">Assessment Settings</h3>
            <div className="space-y-4 text-xs font-semibold text-gray-600">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Level</label>
                  <select
                    value={level || '1'}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white font-extrabold text-gray-800 shadow-2xs"
                  >
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Term</label>
                  <select
                    value={term || 'I'}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white font-extrabold text-gray-800 shadow-2xs"
                  >
                    <option value="I">Term I</option>
                    <option value="II">Term II</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-600 mb-1">Exam Duration</label>
                <input
                  type="text"
                  value={examDuration}
                  onChange={(e) => setExamDuration(e.target.value)}
                  placeholder="e.g. 30 Minutes"
                  className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-bold text-gray-800"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-600 mb-1">Number of Questions</label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleNumQuestionsChange(Math.max(0, Number(numQuestions) - 1))}
                    disabled={Number(numQuestions) <= 0}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-l-xl border border-r-0 border-gray-300 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                    title="Decrease number of questions"
                  >
                    <Minus size={15} strokeWidth={2.5} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={numQuestions}
                    onChange={(e) => handleNumQuestionsChange(e.target.value)}
                    className="w-full border border-gray-300 py-2 text-center focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-extrabold text-gray-800 text-sm min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => handleNumQuestionsChange(Number(numQuestions) + 1)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-r-xl border border-l-0 border-emerald-600 transition flex items-center justify-center shrink-0"
                    title="Increase number of questions"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Question wise CO Mapping Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3 font-sans">Question wise CO Mapping</h3>
            {isExtraCT && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 flex items-center gap-2">
                <AlertCircle size={16} className="text-indigo-600 shrink-0" />
                <span>All questions for this Extra CT are auto-mapped to <strong>{assessment.co || 'Target CO'}</strong> (inherited from {parentName}). Question count and Bloom's levels remain fully customizable.</span>
              </div>
            )}
            <p className="text-xs text-gray-500 font-semibold mb-4">Map each question to its marks, CO, and Bloom's Taxonomy level.</p>

            {questions.length === 0 ? (
              <p className="text-sm text-gray-500 font-semibold text-center py-6">No questions configured. Set the number of questions in assessment settings above.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div key={q.questionNumber} className="border p-4 rounded-xl space-y-3 bg-gray-50/30">
                    <div className="flex justify-between items-center border-b pb-1.5">
                      <span className="font-extrabold text-gray-800">{q.questionNumber}</span>
                      {q.co && q.co !== 'NONE' && q.bloom && (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          [{q.co}→{q.bloom}]
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-gray-600 mb-1">Max Marks</label>
                        <input
                          type="number"
                          min="0"
                          value={q.maxMarks}
                          onChange={(e) => handleMetadataChange(idx, 'maxMarks', e.target.value)}
                          className="w-full border border-gray-300 px-2 py-1.5 rounded-lg bg-white font-semibold"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-bold text-gray-600">Mapped CO</label>
                          {isExtraCT && (
                            <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              Auto-Mapped
                            </span>
                          )}
                        </div>
                        <select
                          value={q.co}
                          disabled={isExtraCT}
                          onChange={(e) => !isExtraCT && handleMetadataChange(idx, 'co', e.target.value)}
                          className={`w-full border border-gray-300 px-2 py-1.5 rounded-lg font-semibold ${isExtraCT ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-dashed' : 'bg-white'}`}
                        >
                          {availableCOs.map(coVal => (
                            <option key={coVal} value={coVal}>{coVal}</option>
                          ))}
                          <option value="NONE">NONE</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-600 mb-1">Bloom's</label>
                        <select
                          value={q.bloom || ''}
                          onChange={(e) => handleBloomChange(idx, e.target.value)}
                          className="w-full border border-gray-300 px-2 py-1.5 rounded-lg bg-white font-semibold"
                        >
                          <option value="">—</option>
                          {BLOOM_OPTIONS.map(bl => (
                            <option key={bl} value={bl}>{bl}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <div className="flex justify-between items-center text-sm font-bold text-gray-700 bg-gray-50 p-3 rounded-lg border">
                <span>Total Allocated Marks:</span>
                <span className={questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0) === assessment.maxMarks ? 'text-green-700' : 'text-yellow-700'}>
                  {questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0)} / {assessment.maxMarks}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
