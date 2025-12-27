import { useState } from 'react'
import { Target, ArrowRight, ArrowLeft } from 'lucide-react'

const KPIConfig = ({ onComplete, existingConfig }) => {
  const [kpiConfig, setKpiConfig] = useState(
    existingConfig || {
      targetPassMarks: 40,
      kpiCO: 50,
      kpiPO: 50,
    }
  )

  const handleChange = (field, value) => {
    setKpiConfig((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }))
  }

  const handleSubmit = () => {
    if (
      kpiConfig.targetPassMarks > 0 &&
      kpiConfig.kpiCO > 0 &&
      kpiConfig.kpiPO > 0
    ) {
      onComplete(kpiConfig)
    } else {
      alert('Please enter valid values for all fields')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <Target className="mx-auto mb-4 text-indigo-500" size={48} />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Key Performance Indicators (KPIs)
          </h2>
          <p className="text-gray-600">
            Set target pass marks and KPIs for COs and POs
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              General Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  No. of Students
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                  value="Calculated automatically"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Pass Marks (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={kpiConfig.targetPassMarks}
                  onChange={(e) => handleChange('targetPassMarks', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-dotted border-red-300 rounded-lg bg-red-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="40"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Key Performance Indicator (KPI)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  KPI for COs (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={kpiConfig.kpiCO}
                  onChange={(e) => handleChange('kpiCO', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-dotted border-red-300 rounded-lg bg-red-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  KPI for POs (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={kpiConfig.kpiPO}
                  onChange={(e) => handleChange('kpiPO', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-dotted border-red-300 rounded-lg bg-red-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="50"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Continue to Reports
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KPIConfig

