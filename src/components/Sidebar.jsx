import { Upload, Network, Target, BarChart3 } from 'lucide-react'

const Sidebar = ({ currentStep, setCurrentStep }) => {
  const menuItems = [
    { id: 'upload', label: 'Upload Excel', icon: Upload },
    { id: 'coMapping', label: 'CO-PO Mapping', icon: Network },
    { id: 'kpi', label: 'KPI Config', icon: Target },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ]

  return (
    <aside className="w-64 bg-gradient-to-br from-green-50/90 via-white to-blue-50/90 backdrop-blur-lg shadow-xl border-r-2 border-green-200 min-h-screen p-6">
      <div className="mb-8 pb-6 border-b-2 border-green-200">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-700 via-green-600 to-blue-600 bg-clip-text text-transparent">
          OBE System
        </h1>
        <p className="text-sm text-gray-600 mt-2 font-medium">Attainment Tracker</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentStep === item.id || (item.id === 'reports' && currentStep === 'allDetails')
          // Disable steps that require previous steps to be completed
          const stepOrder = ['upload', 'coMapping', 'kpi', 'reports', 'allDetails']
          const currentIndex = stepOrder.indexOf(currentStep)
          const itemIndex = stepOrder.indexOf(item.id)
          const isDisabled = itemIndex > currentIndex + 1
          
          return (
            <div key={item.id}>
              <button
                onClick={() => !isDisabled && setCurrentStep(item.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-lg transform scale-105'
                    : isDisabled
                    ? 'text-gray-400 cursor-not-allowed opacity-50'
                    : 'text-gray-700 hover:bg-green-50 hover:text-green-700 hover:shadow-md'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
              {item.id === 'reports' && (
                <button
                  onClick={() => setCurrentStep('allDetails')}
                  className={`w-full flex items-center gap-3 px-4 py-2 ml-8 mt-2 rounded-xl transition-all duration-200 ${
                    currentStep === 'allDetails'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-lg'
                      : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  <BarChart3 size={18} />
                  <span className="text-sm">All Details</span>
                </button>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
