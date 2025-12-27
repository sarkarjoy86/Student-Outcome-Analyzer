import { useState } from 'react'
import { Upload, FileSpreadsheet, ArrowRight, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { parseComprehensiveExcel } from '../utils/excelParser'

const ComprehensiveExcelUpload = ({ onDataExtracted }) => {
  const [dragActive, setDragActive] = useState(false)
  const [extractedData, setExtractedData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [level, setLevel] = useState('')
  const [term, setTerm] = useState('')
  const [section, setSection] = useState('')

  const processFile = async (file) => {
    setError('')
    setLoading(true)
    setExtractedData(null)

    try {
      const data = await parseComprehensiveExcel(file)
      
      // Validate extracted data
      if (!data.students || data.students.length === 0) {
        throw new Error('No student data found in the Excel file')
      }
      
      if (!data.assessments) {
        throw new Error('Could not extract assessment configuration from the Excel file')
      }

      setExtractedData(data)
      
      // Save to localStorage immediately
      localStorage.setItem('obe_extracted_data', JSON.stringify(data))
    } catch (err) {
      setError(err.message || 'Error processing file')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const handleContinue = () => {
    if (extractedData) {
      // Add course info to extracted data
      const dataWithCourseInfo = {
        ...extractedData,
        courseInfo: {
          courseCode: courseCode.trim(),
          courseTitle: courseTitle.trim(),
          level: level.trim() || null,
          term: term.trim() || null,
          section: section.trim() || null,
        },
      }
      onDataExtracted(dataWithCourseInfo)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Upload Student Marks Excel File
          </h2>
          <p className="text-gray-600">
            Upload an Excel file containing student information, marks, and assessment configuration
          </p>
        </div>

        {!extractedData ? (
          <>
            {/* Course Information Input */}
            <div className="mb-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Course Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Course Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="e.g., CSE 101"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-700 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Course Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g., Introduction to Computer Science"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-700 font-medium"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Level <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    placeholder="e.g., Level 4"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-700 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Term <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="e.g., Fall 2024"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-700 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Section <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g., Section A"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-700 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-green-400'
              } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="mx-auto mb-4 text-green-600" size={64} />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {loading ? 'Processing file...' : 'Drag and drop your Excel file here'}
              </p>
              {!loading && (
                <>
                  <p className="text-gray-500 mb-4">or</p>
                  <label className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg cursor-pointer hover:from-green-700 hover:to-green-800 transition-colors shadow-lg hover:shadow-xl">
                    <Upload className="mr-2" size={20} />
                    Browse Files
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={handleChange}
                    />
                  </label>
                </>
              )}
              <p className="text-sm text-gray-400 mt-4">
                Supports .xlsx and .xls files with student marks and assessment configuration
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="text-green-600 mt-1" size={24} />
                <div className="flex-1">
                  <p className="font-semibold text-green-800">
                    Successfully extracted data from Excel file
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-green-700">
                    <p>• {extractedData.students.length} students found</p>
                    <p>• {extractedData.assessments.cts.length} Class Test(s)</p>
                    <p>• {extractedData.assessments.midTerm.length} Mid Term question(s)</p>
                    <p>• {extractedData.assessments.final.length} Final question(s)</p>
                    <p>• {extractedData.assessments.assignments.length} Assignment(s)</p>
                    <p>• Marks data extracted for all assessments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview extracted data */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Extracted Data Preview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Students:</span>{' '}
                  <span className="text-gray-600">{extractedData.students.length}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Assessment Columns:</span>{' '}
                  <span className="text-gray-600">
                    {Object.keys(extractedData.marks[extractedData.students[0]?.id] || {}).length}
                  </span>
                </div>
              </div>
              
              {extractedData.courseInfo?.courseCode && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="font-medium text-gray-700">Course Code:</span>{' '}
                  <span className="text-gray-600">{extractedData.courseInfo.courseCode}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleContinue}
              disabled={!courseCode.trim() || !courseTitle.trim()}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-semibold ${
                !courseCode.trim() || !courseTitle.trim()
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl'
              }`}
            >
              Continue to CO-PO Mapping
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-1" size={20} />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                Please ensure your Excel file contains:
                <br />
                • Assessment configuration table in upper rows (Assessment Type, Max Marks, CO)
                <br />
                • Student data table with ID, Name, and marks columns
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ComprehensiveExcelUpload

