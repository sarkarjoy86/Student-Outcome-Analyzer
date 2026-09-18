import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import html2canvas from 'html2canvas'
import { AuthProvider } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

import { registerLicense } from '@syncfusion/ej2-base'

// Register Syncfusion trial license key
registerLicense('Ngo9BigBOggjHTQxAR8/V1JAaF5cX2pCd1p/TH5YfUNzdUVEY1ZUTXxaS1ZhSXxVdkJhXn5ccXxURWhVWE19XEY=')

// Make html2canvas available globally for chart download functionality
window.html2canvas = html2canvas

// Automatic recovery from stale asset chunk hashes after new production deployments
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

