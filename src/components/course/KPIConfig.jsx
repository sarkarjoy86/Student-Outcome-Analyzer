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
      <div className="bg-gradient-to-br from-white via-green-50/30 to-blue-50/30 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border-2 border-green-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Target className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-700 via-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Key Performance Indicators (KPIs)
          </h2>
          <p className="text-gray-600 font-medium">
            Set target pass marks and KPIs for COs and POs
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-50 to-blue-50/50 rounded-xl p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              General Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  No. of Students
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                  value="Calculated automatically"
                />
              </div>
              <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-700">
                    Target Pass Marks (%) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-base font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {kpiConfig.targetPassMarks}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={kpiConfig.targetPassMarks}
                  onChange={(e) => handleChange('targetPassMarks', e.target.value)}
                  className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50/50 to-green-50/50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
              Key Performance Indicator (KPI)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-700">
                    KPI for COs (%) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-base font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {kpiConfig.kpiCO}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={kpiConfig.kpiCO}
                  onChange={(e) => handleChange('kpiCO', e.target.value)}
                  className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-700">
                    KPI for POs (%) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-base font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {kpiConfig.kpiPO}%
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={kpiConfig.kpiPO}
                  onChange={(e) => handleChange('kpiPO', e.target.value)}
                  className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold hover:border-gray-400"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.01]"
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
