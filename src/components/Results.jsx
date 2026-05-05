import { useMemo } from 'react'
import { Award, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

/**
 * Calculate grade based on percentage
 * Grading Scale:
 * 80.0 and above: A+
 * 75.0 – 79.9: A
 * 70.0 – 74.9: A-
 * 65.0 – 69.9: B+
 * 60.0 – 64.9: B
 * 55.0 – 59.9: B-
 * 50.0 – 54.9: C+
 * 45.0 – 49.9: C
 * Below 45.0: F
 */
const calculateGrade = (percentage) => {
  if (percentage >= 80.0) return 'A+'
  if (percentage >= 75.0) return 'A'
  if (percentage >= 70.0) return 'A-'
  if (percentage >= 65.0) return 'B+'
  if (percentage >= 60.0) return 'B'
  if (percentage >= 55.0) return 'B-'
  if (percentage >= 50.0) return 'C+'
  if (percentage >= 45.0) return 'C'
  return 'F'
}

/**
 * Get grade color for styling
 */
const getGradeColor = (grade) => {
  const colors = {
    'A+': 'bg-green-600 text-white',
    'A': 'bg-green-500 text-white',
    'A-': 'bg-green-400 text-white',
    'B+': 'bg-blue-500 text-white',
    'B': 'bg-blue-400 text-white',
    'B-': 'bg-blue-300 text-gray-800',
    'C+': 'bg-yellow-400 text-gray-800',
    'C': 'bg-yellow-300 text-gray-800',
    'F': 'bg-red-500 text-white',
  }
  return colors[grade] || 'bg-gray-200 text-gray-800'
}

const Results = ({ students, marks, assessments, courseInfo }) => {
  // Calculate total marks and grades for each student
  const studentResults = useMemo(() => {
    if (!assessments || !students || !marks) return []

    // Get all assessments with their max marks (sum of ALL max marks from Excel)
    const allAssessments = []
    if (assessments.cts) {
      assessments.cts.forEach(a => allAssessments.push({ ...a, type: 'cts' }))
    }
    if (assessments.midTerm) {
      assessments.midTerm.forEach(a => allAssessments.push({ ...a, type: 'midTerm' }))
    }
    if (assessments.final) {
      assessments.final.forEach(a => allAssessments.push({ ...a, type: 'final' }))
    }
    if (assessments.assignments) {
      assessments.assignments.forEach(a => allAssessments.push({ ...a, type: 'assignments' }))
    }
    if (assessments.attendance) {
      allAssessments.push({ ...assessments.attendance, name: 'Attendance', type: 'attendance' })
    }
    if (assessments.performance) {
      allAssessments.push({ ...assessments.performance, name: 'Performance', type: 'performance' })
    }

    // Calculate total max marks by summing ALL assessment max marks from Excel
    const totalMaxMarks = allAssessments.reduce(
      (sum, a) => {
        const maxMark = parseFloat(a.maxMarks) || 0
        return sum + maxMark
      },
      0
    )

    // Calculate results for each student
    return students.map((student) => {
      // Calculate total obtained marks
      let totalObtainedMarks = 0
      
      allAssessments.forEach((assessment) => {
        const key = `${assessment.type}_${assessment.name}`
        const mark = parseFloat(marks[student.id]?.[key] || 0) || 0
        totalObtainedMarks += mark
      })

      // Calculate percentage
      const percentage = totalMaxMarks > 0 
        ? (totalObtainedMarks / totalMaxMarks) * 100 
        : 0

      // Calculate grade
      const grade = calculateGrade(percentage)

      return {
        ...student,
        totalObtainedMarks: totalObtainedMarks.toFixed(1),
        totalMaxMarks: totalMaxMarks.toFixed(1),
        percentage: percentage.toFixed(2),
        grade,
      }
    })
  }, [students, marks, assessments])


  // Download Results Report as Excel
  const handleDownloadResults = () => {
    if (!studentResults || studentResults.length === 0) return

    const wb = XLSX.utils.book_new()

    // Prepare results data
    const resultsData = [
      ['STUDENT RESULTS REPORT'],
      [],
      ['COURSE INFORMATION'],
      ['Course Code', courseInfo?.courseCode || 'N/A'],
      ['Course Title', courseInfo?.courseTitle || 'N/A'],
      ...(courseInfo?.level ? [['Level', courseInfo.level]] : []),
      ...(courseInfo?.term ? [['Term', courseInfo.term]] : []),
      ...(courseInfo?.semester ? [['Semester', courseInfo.semester]] : []),
      ...(courseInfo?.section ? [['Section', courseInfo.section]] : []),
      ['Generated on', new Date().toLocaleDateString()],
      [],
      ['STUDENT MARKS AND GRADES'],
      [],
      ['No.', 'Student ID', 'Student Name', 'Obtained Marks', 'Total Marks', 'Percentage (%)', 'Grade'],
      ...studentResults.map((student, idx) => [
        idx + 1,
        student.id,
        student.name,
        parseFloat(student.totalObtainedMarks),
        parseFloat(student.totalMaxMarks),
        parseFloat(student.percentage),
        student.grade,
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(resultsData)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // No.
      { wch: 15 }, // Student ID
      { wch: 30 }, // Student Name
      { wch: 15 }, // Obtained Marks
      { wch: 12 }, // Total Marks
      { wch: 15 }, // Percentage
      { wch: 10 }, // Grade
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Results')
    
    // Write the file
    const fileName = `Results_Report_${courseInfo?.courseCode || 'Course'}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Safety check
  if (!assessments || !students || students.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            No Data Available
          </h2>
          <p className="text-gray-600">
            Please complete all previous steps (Course Info, CO-PO Mapping, Assessments, and Marks Entry) before viewing results.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-white via-green-50/30 to-blue-50/30 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border-2 border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Award className="text-green-600" size={32} />
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-700 via-green-600 to-blue-600 bg-clip-text text-transparent">
                Student Results
              </h1>
              <p className="text-gray-700 mt-2 font-semibold text-lg">
                {courseInfo?.courseCode || 'Course'} - {courseInfo?.courseTitle || 'Title'}
                {courseInfo?.level && ` | Level: ${courseInfo.level}`}
                {courseInfo?.term && ` | Term: ${courseInfo.term}`}
                {courseInfo?.semester && ` | Semester: ${courseInfo.semester}`}
                {courseInfo?.section && ` | Section: ${courseInfo.section}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadResults}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            title="Download Results Report"
          >
            <Download size={20} />
            <span>Result Report</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent mb-4">
          Student Marks and Grades
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse shadow-md">
            <thead>
              <tr className="bg-gradient-to-r from-green-600 to-green-700">
                <th className="px-6 py-4 text-center text-sm font-bold text-white border border-green-800">
                  No.
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white border border-green-800">
                  Student ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-white border border-green-800">
                  Student Name
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-white border border-green-800">
                  Obtained Marks
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-white border border-green-800">
                  Total Marks
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-white border border-green-800">
                  Percentage (%)
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-white border border-green-800">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {studentResults.map((student, idx) => (
                <tr key={student.id} className="hover:bg-green-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-semibold text-gray-800 border border-gray-300 text-center bg-white">
                    {idx + 1}
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-800 border border-gray-300 bg-white">
                    {student.id}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700 border border-gray-300 bg-white">
                    {student.name}
                  </td>
                  <td className="px-6 py-3 text-sm text-center text-gray-700 border border-gray-300 bg-white font-medium">
                    {student.totalObtainedMarks}
                  </td>
                  <td className="px-6 py-3 text-sm text-center text-gray-700 border border-gray-300 bg-white font-medium">
                    {student.totalMaxMarks}
                  </td>
                  <td className="px-6 py-3 text-sm text-center text-gray-700 border border-gray-300 bg-white font-medium">
                    {student.percentage}%
                  </td>
                  <td className="px-6 py-3 text-center border border-gray-300">
                    <span className={`inline-block px-4 py-1 rounded-lg font-bold text-sm ${getGradeColor(student.grade)}`}>
                      {student.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Grading Scale Reference */}
        <div className="mt-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Grading Scale</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center">
              <div className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold mb-1">A+</div>
              <p className="text-xs text-gray-600">80.0 and above</p>
            </div>
            <div className="text-center">
              <div className="bg-green-500 text-white px-3 py-2 rounded-lg font-bold mb-1">A</div>
              <p className="text-xs text-gray-600">75.0 – 79.9</p>
            </div>
            <div className="text-center">
              <div className="bg-green-400 text-white px-3 py-2 rounded-lg font-bold mb-1">A-</div>
              <p className="text-xs text-gray-600">70.0 – 74.9</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-500 text-white px-3 py-2 rounded-lg font-bold mb-1">B+</div>
              <p className="text-xs text-gray-600">65.0 – 69.9</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-400 text-white px-3 py-2 rounded-lg font-bold mb-1">B</div>
              <p className="text-xs text-gray-600">60.0 – 64.9</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-300 text-gray-800 px-3 py-2 rounded-lg font-bold mb-1">B-</div>
              <p className="text-xs text-gray-600">55.0 – 59.9</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-400 text-gray-800 px-3 py-2 rounded-lg font-bold mb-1">C+</div>
              <p className="text-xs text-gray-600">50.0 – 54.9</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-300 text-gray-800 px-3 py-2 rounded-lg font-bold mb-1">C</div>
              <p className="text-xs text-gray-600">45.0 – 49.9</p>
            </div>
            <div className="text-center">
              <div className="bg-red-500 text-white px-3 py-2 rounded-lg font-bold mb-1">F</div>
              <p className="text-xs text-gray-600">Below 45.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Results

