import { useState } from 'react'
import { Upload, FileSpreadsheet, Users, ArrowRight } from 'lucide-react'
import * as XLSX from 'xlsx'

const UploadComponent = ({ onStudentsUploaded }) => {
  const [dragActive, setDragActive] = useState(false)
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')

  const processFile = (file) => {
    setError('')
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)

        if (jsonData.length === 0) {
          setError('The file appears to be empty')
          return
        }

        // Extract Student ID and Name columns (case-insensitive matching)
        // First, identify column keys from the first row
        const firstRow = jsonData[0] || {}
        const allKeys = Object.keys(firstRow)
        
        // Find ID column - prioritize columns with 'id' or 'roll', exclude 'name'
        const idKey = allKeys.find(
          (key) => {
            const lowerKey = key.toLowerCase()
            return (
              (lowerKey.includes('id') && !lowerKey.includes('name')) ||
              lowerKey.includes('roll') ||
              (lowerKey.includes('student') && lowerKey.includes('id'))
            )
          }
        ) || allKeys.find((key) => key.toLowerCase().includes('student'))
        
        // Find Name column - must contain 'name', exclude ID-related columns
        const nameKey = allKeys.find(
          (key) => {
            const lowerKey = key.toLowerCase()
            return (
              lowerKey.includes('name') &&
              !lowerKey.includes('id') &&
              key !== idKey
            )
          }
        ) || allKeys.find(
          (key) => {
            const lowerKey = key.toLowerCase()
            return (
              lowerKey.includes('student') &&
              !lowerKey.includes('id') &&
              key !== idKey
            )
          }
        )
        
        const extractedStudents = jsonData.map((row, index) => {
          const id = idKey ? String(row[idKey] || '').trim() : `STUDENT-${index + 1}`
          const name = nameKey ? String(row[nameKey] || '').trim() : `Student ${index + 1}`

          return { id, name }
        })

        setStudents(extractedStudents)
      } catch (err) {
        setError(`Error processing file: ${err.message}`)
      }
    }

    reader.onerror = () => {
      setError('Error reading file')
    }

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file)reader.readAsArrayBuffer(file)
    } else if (file.name.endsWith('.csv')) {
      const csvReader = new FileReader()
      csvReader.onload = (e) => {
        try {
          const text = e.target.result
          const workbook = XLSX.read(text, { type: 'string' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet)

          if (jsonData.length === 0) {
            setError('The file appears to be empty')
            return
          }

          // Extract Student ID and Name columns (case-insensitive matching)
          // First, identify column keys from the first row
          const firstRow = jsonData[0] || {}
          const allKeys = Object.keys(firstRow)
          
          // Find ID column - prioritize columns with 'id' or 'roll', exclude 'name'
          const idKey = allKeys.find(
            (key) => {
              const lowerKey = key.toLowerCase()
              return (
                (lowerKey.includes('id') && !lowerKey.includes('name')) ||
                lowerKey.includes('roll') ||
                (lowerKey.includes('student') && lowerKey.includes('id'))
              )
            }
          ) || allKeys.find((key) => key.toLowerCase().includes('student'))
          
          // Find Name column - must contain 'name', exclude ID-related columns
          const nameKey = allKeys.find(
            (key) => {
              const lowerKey = key.toLowerCase()
              return (
                lowerKey.includes('name') &&
                !lowerKey.includes('id') &&
                key !== idKey
              )
            }
          ) || allKeys.find(
            (key) => {
              const lowerKey = key.toLowerCase()
              return (
                lowerKey.includes('student') &&
                !lowerKey.includes('id') &&
                key !== idKey
              )
            }
          )
          
          const extractedStudents = jsonData.map((row, index) => {
            const id = idKey ? String(row[idKey] || '').trim() : `STUDENT-${index + 1}`
            const name = nameKey ? String(row[nameKey] || '').trim() : `Student ${index + 1}`

            return { id, name }
          })

          setStudents(extractedStudents)
        } catch (err) {
          setError(`Error processing CSV: ${err.message}`)
        }
      }
      csvReader.onerror = () => {
        setError('Error reading CSV file')
      }
      csvReader.readAsText(file)
    } else {
      setError('Please upload a .xlsx, .xls, or .csv file')
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
    if (students.length > 0) {
      onStudentsUploaded(students)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Upload Student List
          </h2>
          <p className="text-gray-600">
            Upload an Excel or CSV file containing Student ID and Name columns
          </p>
        </div>

        {students.length === 0 ? (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 hover:border-indigo-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="mx-auto mb-4 text-indigo-500" size={64} />
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Drag and drop your file here
            </p>
            <p className="text-gray-500 mb-4">or</p>
            <label className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
              <Upload className="mr-2" size={20} />
              Browse Files
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleChange}
              />
            </label>
            <p className="text-sm text-gray-400 mt-4">
              Supports .xlsx, .xls, and .csv files
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <Users className="text-green-600" size={24} />
              <div>
                <p className="font-semibold text-green-800">
                  Successfully loaded {students.length} students
                </p>
                <p className="text-sm text-green-600">
                  Student ID and Name columns have been extracted
                </p>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Student ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Name
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {student.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {student.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Continue to Configuration
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadComponent
