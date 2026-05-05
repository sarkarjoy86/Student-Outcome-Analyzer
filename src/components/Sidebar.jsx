import { Upload, Network, Target, BarChart3, Table2, Award, BookOpen } from 'lucide-react'

const Sidebar = ({ currentStep, setCurrentStep }) => {
  const menuItems = [
    { id: 'upload', label: 'Upload Excel', icon: Upload, color: 'from-green-500 to-green-600' },
    { id: 'coMapping', label: 'CO-PO Mapping', icon: Network, color: 'from-blue-500 to-blue-600' },
    { id: 'kpi', label: 'KPI Config', icon: Target, color: 'from-purple-500 to-purple-600' },
    { id: 'reports', label: 'Reports', icon: BarChart3, color: 'from-orange-500 to-orange-600' },
    { id: 'allDetails', label: 'All Details', icon: Table2, color: 'from-teal-500 to-teal-600' },
    { id: 'results', label: 'Results', icon: Award, color: 'from-yellow-500 to-yellow-600' },
  ]

  return (
    <aside className="relative z-10 w-64 bg-gradient-to-br from-green-50/90 via-white to-blue-50/90 backdrop-blur-lg shadow-xl border-r-2 border-green-200 min-h-screen p-6">
      <div className="mb-8 pb-6 border-b-2 border-green-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center shadow-md">
            <BookOpen size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-700 via-green-600 to-blue-600 bg-clip-text text-transparent">
            OBE System
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1 font-medium pl-1">Outcome Attainment Tracker</p>
      </div>

      <nav className="space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentStep === item.id
          // Disable steps that require previous steps to be completed
          const stepOrder = ['upload', 'coMapping', 'kpi', 'reports', 'allDetails', 'results']
          const currentIndex = stepOrder.indexOf(currentStep)
          const itemIndex = stepOrder.indexOf(item.id)
          const isDisabled = itemIndex > currentIndex + 1

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && setCurrentStep(item.id)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                  ? `bg-gradient-to-r ${item.color} text-white font-semibold shadow-lg transform scale-[1.02]`
                  : isDisabled
                    ? 'text-gray-300 cursor-not-allowed opacity-50'
                    : 'text-gray-600 hover:bg-green-50 hover:text-green-700 hover:shadow-sm hover:translate-x-1'
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isActive
                  ? 'bg-white/20'
                  : isDisabled
                    ? 'bg-gray-100'
                    : 'bg-green-100 group-hover:bg-green-200'
                }`}>
                <Icon size={16} className={isActive ? 'text-white' : isDisabled ? 'text-gray-300' : 'text-green-700'} />
              </div>
              <span className="text-sm">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-8 pt-6 border-t-2 border-green-100">
        <p className="text-xs text-gray-400 text-center font-medium">
          Complete steps in order
        </p>
        <div className="flex justify-center gap-1 mt-2">
          {['upload', 'coMapping', 'kpi', 'reports', 'allDetails', 'results'].map((step, i) => {
            const stepOrder = ['upload', 'coMapping', 'kpi', 'reports', 'allDetails', 'results']
            const currentIndex = stepOrder.indexOf(currentStep)
            const isCompleted = i < currentIndex
            const isCurrent = i === currentIndex
            return (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${isCurrent ? 'bg-green-500 w-4' : isCompleted ? 'bg-green-300' : 'bg-gray-200'
                  }`}
              />
            )
          })}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
