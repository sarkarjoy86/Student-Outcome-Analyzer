import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ComprehensiveExcelUpload from './components/ComprehensiveExcelUpload'
import COPOMapping from './components/COPOMapping'
import KPIConfig from './components/KPIConfig'
import ComprehensiveReports from './components/ComprehensiveReports'
import Results from './components/Results'
import { saveData, loadData, updateData } from './services/localStorageService'

function App() {
  const [currentStep, setCurrentStep] = useState('upload')
  const [students, setStudents] = useState([])
  const [courseInfo, setCourseInfo] = useState(null)
  const [coMapping, setCoMapping] = useState(null)
  const [assessments, setAssessments] = useState(null)
  const [marksData, setMarksData] = useState({})
  const [kpiConfig, setKpiConfig] = useState({
    targetPassMarks: 40,
    kpiCO: 50,
    kpiPO: 50,
  })

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = loadData()
    if (savedData) {
      setStudents(savedData.students || [])
      setCourseInfo(savedData.courseInfo || null)
      setCoMapping(savedData.coMapping || null)
      setAssessments(savedData.assessments || null)
      setMarksData(savedData.marks || {})
      setKpiConfig(savedData.kpiConfig || {
        targetPassMarks: 40,
        kpiCO: 50,
        kpiPO: 50,
      })
      
      // Determine current step
      if (savedData.coMapping && savedData.kpiConfig) {
        setCurrentStep('reports')
      } else if (savedData.coMapping) {
        setCurrentStep('kpi')
      } else if (savedData.assessments && savedData.students) {
        setCurrentStep('coMapping')
      }
    }
  }, [])

  const handleExcelDataExtracted = (data) => {
    setStudents(data.students || [])
    setAssessments(data.assessments || null)
    setMarksData(data.marks || {})
    setCourseInfo(data.courseInfo || null)
    setCurrentStep('coMapping')
    
    // Save to localStorage
    saveData({
      students: data.students,
      assessments: data.assessments,
      marks: data.marks,
      courseInfo: data.courseInfo,
    })
  }

  const handleCoMappingComplete = (mapping) => {
    setCoMapping(mapping)
    setCurrentStep('kpi')
    
    // Save to localStorage
    updateData({
      coMapping: mapping,
    })
  }

  const handleKpiComplete = (config) => {
    setKpiConfig(config)
    setCurrentStep('reports')
    
    // Save to localStorage
    updateData({
      kpiConfig: config,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-100">
      <div className="flex">
        <Sidebar currentStep={currentStep} setCurrentStep={setCurrentStep} />
        <main className="flex-1 p-8">
          {currentStep === 'upload' && (
            <ComprehensiveExcelUpload onDataExtracted={handleExcelDataExtracted} />
          )}
          {currentStep === 'coMapping' && (
            <COPOMapping
              onComplete={handleCoMappingComplete}
              existingMapping={coMapping}
            />
          )}
          {currentStep === 'kpi' && (
            <KPIConfig
              onComplete={handleKpiComplete}
              existingConfig={kpiConfig}
            />
          )}
          {currentStep === 'reports' && (
            <ComprehensiveReports
              students={students}
              marks={marksData}
              assessments={assessments}
              coMapping={coMapping}
              courseInfo={courseInfo}
              targetPassMarks={kpiConfig.targetPassMarks}
              kpiCO={kpiConfig.kpiCO}
              kpiPO={kpiConfig.kpiPO}
            />
          )}
          {currentStep === 'allDetails' && (
            <ComprehensiveReports
              students={students}
              marks={marksData}
              assessments={assessments}
              coMapping={coMapping}
              courseInfo={courseInfo}
              targetPassMarks={kpiConfig.targetPassMarks}
              kpiCO={kpiConfig.kpiCO}
              kpiPO={kpiConfig.kpiPO}
              initialViewMode="allDetails"
            />
          )}
          {currentStep === 'results' && (
            <Results
              students={students}
              marks={marksData}
              assessments={assessments}
              courseInfo={courseInfo}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
