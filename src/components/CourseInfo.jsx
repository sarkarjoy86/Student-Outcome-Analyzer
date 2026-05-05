import { useState } from 'react'
import { BookOpen, ArrowRight } from 'lucide-react'

const CourseInfo = ({ onComplete, existingData }) => {
  const [courseInfo, setCourseInfo] = useState(
    existingData || {
      courseCode: '',
      courseTitle: '',
      department: '',
      academicYear: '',
      semester: '',
      section: '',
    }
  )

  const handleChange = (field, value) => {
    setCourseInfo((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    // Validate all fields
    const isValid = Object.values(courseInfo).every((value) => value.trim() !== '')
    if (isValid) {
      onComplete(courseInfo)
    } else {
      alert('Please fill in all fields')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <BookOpen className="mx-auto mb-4 text-indigo-500" size={48} />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Course Related Information
          </h2>
          <p className="text-gray-600">
            Please enter information in all fields below
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Course Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={courseInfo.courseCode}
                onChange={(e) => handleChange('courseCode', e.target.value)}
                className="w-full px-4 py-3 border-2 border-dotted border-gray-300 rounded-lg bg-yellow-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., CSE 213"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Course Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={courseInfo.courseTitle}
                onChange={(e) => handleChange('courseTitle', e.target.value)}
                className="w-full px-4 py-3 border-2 border-dotted border-gray-300 rounded-lg bg-yellow-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Object Oriented Programming Language"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={courseInfo.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className="w-full px-4 py-3 border-2 border-dotted border-gray-300 rounded-lg bg-yellow-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Computer Science and Engineering"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={courseInfo.academicYear}
                onChange={(e) => handleChange('academicYear', e.target.value)}
                className="w-full px-4 py-3 border-2 border-dotted border-gray-300 rounded-lg bg-yellow-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Semester <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="2"
                value={courseInfo.semester}
                onChange={(e) => handleChange('semester', e.target.value)}
                className="w-full px-4 py-3 border-2 border-dotted border-gray-300 rounded-lg bg-yellow-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 1"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Section <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={courseInfo.section}
                onChange={(e) => handleChange('section', e.target.value)}
                className="w-full px-4 py-3 border-2 border-dotted border-gray-300 rounded-lg bg-yellow-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., A"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Continue to CO-PO Mapping
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CourseInfo

