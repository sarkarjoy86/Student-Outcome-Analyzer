import { useState, useEffect, useRef } from 'react'
import { apiService } from '../services/apiService'
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
import { ArrowLeft, Save, FileDown, Printer, Loader2, AlertCircle } from 'lucide-react'
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
  const [bloomLevels, setBloomLevels] = useState({}) // questionNumber -> bloom level (local only)

  const [examDuration, setExamDuration] = useState(assessment.examDuration || '')
  const [numQuestions, setNumQuestions] = useState(assessment.numQuestions || 0)
  const [level, setLevel] = useState(assessment.level || '')
  const [term, setTerm] = useState(assessment.term || '')

  const BLOOM_OPTIONS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']

  const rteRef = useRef(null)

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
      setEditorValue(res.content || '<p>Write your questions here...</p>')

      const currentAssessment = res.assessment || assessment
      setExamDuration(currentAssessment.examDuration || '')
      setNumQuestions(currentAssessment.numQuestions || 0)
      setLevel(currentAssessment.level || '')
      setTerm(currentAssessment.term || '')

      // If questions are not initialized, generate array based on assessment.numQuestions
      const qList = res.questions || []
      const finalQs = []

      const targetNum = currentAssessment.numQuestions || 0
      for (let i = 1; i <= targetNum; i++) {
        const qNum = `Q${i}`
        const existing = qList.find(q => q.questionNumber === qNum)
        if (existing) {
          finalQs.push({
            questionNumber: qNum,
            maxMarks: existing.maxMarks ?? 0,
            co: existing.co || 'NONE'
          })
        } else {
          // Default division of marks
          const defaultMax = Math.floor(currentAssessment.maxMarks / (targetNum || 1))
          finalQs.push({
            questionNumber: qNum,
            maxMarks: i === targetNum ? defaultMax + (currentAssessment.maxMarks % (targetNum || 1)) : defaultMax,
            co: 'NONE'
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

    setQuestions(prev => {
      const updated = [...prev]
      if (updated.length < val) {
        // Add new questions
        for (let i = updated.length + 1; i <= val; i++) {
          const qNum = `Q${i}`
          const defaultMax = Math.floor(assessment.maxMarks / (val || 1))
          updated.push({
            questionNumber: qNum,
            maxMarks: i === val ? defaultMax + (assessment.maxMarks % (val || 1)) : defaultMax,
            co: 'NONE'
          })
        }
      } else if (updated.length > val) {
        // Truncate
        updated.splice(val)
      }
      return updated
    })
  }

  const handleBloomChange = (questionNumber, value) => {
    setBloomLevels(prev => ({ ...prev, [questionNumber]: value }))
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
    // Validate max marks allocation sum
    const totalAllocated = questions.reduce((sum, q) => sum + (q.maxMarks || 0), 0)
    if (questions.length > 0 && totalAllocated !== assessment.maxMarks) {
      if (!window.confirm(`Warning: The total allocated marks for all questions is ${totalAllocated}, but the assessment's total is ${assessment.maxMarks}. Do you want to save anyway?`)) {
        return
      }
    }

    setSaving(true)
    try {
      // 1. Update Assessment fields (examDuration, numQuestions, level, term)
      await apiService.updateAssessment(assessment._id, {
        examDuration,
        numQuestions,
        level,
        term
      })

      // 2. Save Question Paper content and metadata questions
      const currentContent = rteRef.current ? rteRef.current.value : editorValue
      await apiService.saveQuestionPaper(assessment._id, {
        content: currentContent,
        questions
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

    // Build Class Test line: "Class Test: CT-1, Section: A, Semester: Spring 2026"
    const semesterFull = academicYear ? `${semesterName} ${academicYear}` : semesterName
    const ctParts = []
    if (assessmentName) ctParts.push(`Class Test: ${assessmentName}`)
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
        const bloom = bloomLevels[q.questionNumber] || ''
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
              Question Paper Editor: {assessment.name}
            </h1>
          </div>
          <p className="text-sm text-gray-500 font-semibold pl-9">
            Manage, format, map, and export question papers.
          </p>
        </div>

        <div className="flex items-center gap-2 pl-9 md:pl-0">
          <button
            onClick={savePaper}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Paper'}
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
                  <input
                    type="text"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-bold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Term</label>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-bold text-gray-800"
                  />
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
                <input
                  type="number"
                  min="0"
                  value={numQuestions}
                  onChange={(e) => handleNumQuestionsChange(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50/50 font-bold text-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Question wise CO Mapping Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-150 p-6 space-y-4">
            <h3 className="text-lg font-extrabold text-gray-800 border-b pb-3 font-sans">Question wise CO Mapping</h3>
            <p className="text-xs text-gray-500 font-semibold mb-4">Map each question to its marks, CO, and Bloom's Taxonomy level.</p>

            {questions.length === 0 ? (
              <p className="text-sm text-gray-500 font-semibold text-center py-6">No questions configured. Set the number of questions in assessment settings above.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div key={q.questionNumber} className="border p-4 rounded-xl space-y-3 bg-gray-50/30">
                    <div className="flex justify-between items-center border-b pb-1.5">
                      <span className="font-extrabold text-gray-800">{q.questionNumber}</span>
                      {q.co && q.co !== 'NONE' && bloomLevels[q.questionNumber] && (
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          [{q.co}→{bloomLevels[q.questionNumber]}]
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
                        <label className="block font-bold text-gray-600 mb-1">Mapped CO</label>
                        <select
                          value={q.co}
                          onChange={(e) => handleMetadataChange(idx, 'co', e.target.value)}
                          className="w-full border border-gray-300 px-2 py-1.5 rounded-lg bg-white font-semibold"
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
                          value={bloomLevels[q.questionNumber] || ''}
                          onChange={(e) => handleBloomChange(q.questionNumber, e.target.value)}
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
