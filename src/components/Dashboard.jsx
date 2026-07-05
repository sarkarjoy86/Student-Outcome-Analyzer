import { useState, useEffect } from 'react'
import { apiService } from '../services/apiService'
import { BookOpen, Users, ChevronRight, AlertCircle, RefreshCw, GraduationCap } from 'lucide-react'

export default function Dashboard({ onSelectOffering }) {
  const [offerings, setOfferings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiService.getTeacherCourseOfferings()
      setOfferings(data.offerings || [])
    } catch (err) {
      setError(err.message || 'Failed to load assigned course offerings.')
    } finally {
      setLoading(false)
    }
  }

  // Group offerings by semesterName
  const groupedOfferings = offerings.reduce((groups, offering) => {
    const sessionName = offering.semester?.semesterName || 'Other Sessions';
    if (!groups[sessionName]) {
      groups[sessionName] = [];
    }
    groups[sessionName].push(offering);
    return groups;
  }, {});

  const sessionOrder = Object.keys(groupedOfferings).sort((a, b) => {
    const yearA = parseInt(a.match(/\d+/)?.[0] || 0);
    const yearB = parseInt(b.match(/\d+/)?.[0] || 0);
    if (yearA !== yearB) {
      return yearB - yearA;
    }
    const getSeasonPriority = (name) => {
      const lower = name.toLowerCase();
      if (lower.includes('fall') || lower.includes('autumn')) return 3;
      if (lower.includes('summer')) return 2;
      if (lower.includes('spring')) return 1;
      return 0;
    };
    return getSeasonPriority(b) - getSeasonPriority(a);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/10 to-blue-50/10 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-white to-green-50/20 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-green-200/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-green-800 via-green-600 to-blue-700 bg-clip-text text-transparent">
              My Course Offerings
            </h1>
            <p className="text-gray-600 mt-2 text-lg font-medium">
              Select one of your assigned course offerings to manage student assessments, marks entry, and CO-PO attainment.
            </p>
          </div>
          <button
            onClick={fetchInitialData}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl transition-all font-semibold border border-green-200"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl flex items-center gap-3 bg-red-50 text-red-700 border border-red-200 shadow-sm font-medium">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Offerings List grouped by Session */}
        <div className="space-y-12">
          {offerings.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-300 text-center space-y-4 max-w-2xl mx-auto">
              <Users size={48} className="mx-auto text-gray-400" />
              <p className="text-gray-500 font-medium text-lg">
                No course offerings have been assigned to you.
              </p>
              <p className="text-sm text-gray-400">
                Please contact the Administrator to assign your Course Offerings.
              </p>
            </div>
          ) : (
            sessionOrder.map((sessionName) => (
              <div key={sessionName} className="space-y-6">
                <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-3 border-b pb-3 border-gray-200">
                  <BookOpen size={24} className="text-green-700 font-semibold" />
                  {sessionName}
                  <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">
                    {groupedOfferings[sessionName].length} {groupedOfferings[sessionName].length === 1 ? 'Offering' : 'Offerings'}
                  </span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedOfferings[sessionName].map((offering) => (
                    <div
                      key={offering._id}
                      onClick={() => onSelectOffering(offering)}
                      className="bg-white hover:bg-gradient-to-br hover:from-white hover:to-green-50/20 p-6 rounded-2xl shadow-md hover:shadow-xl border border-gray-200/60 hover:border-green-300 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-extrabold uppercase">
                            {offering.semester?.semesterName}
                          </span>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-extrabold uppercase">
                            Section {offering.section}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 group-hover:text-green-800 transition-colors">
                            {offering.course?.courseCode}
                          </h3>
                          <p className="text-gray-600 text-sm font-semibold truncate">
                            {offering.course?.courseName}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-gray-500 font-semibold border-t border-gray-50">
                          <div>Batch: <span className="font-bold text-gray-700">{offering.batch?.name || 'N/A'}</span></div>
                          <div>Academic Year: <span className="font-bold text-gray-700">{offering.academicYear || 'N/A'}</span></div>
                          <div>Credits: <span className="font-bold text-gray-700">{offering.course?.creditHours} Credits</span></div>
                          <div className="flex items-center gap-1">
                            <GraduationCap size={12} className="text-green-600" />
                            Students: <span className="font-bold text-gray-700">{offering.studentCount ?? 0}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end text-sm font-bold text-green-700">
                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Open Classroom</span>
                          <ChevronRight size={16} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
