import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import html2canvas from 'html2canvas'
import { AuthProvider } from './context/AuthContext.jsx'

import { registerLicense } from '@syncfusion/ej2-base'

// Register Syncfusion trial license key
registerLicense('Ngo9BigBOggjHTQxAR8/V1JHaF1cXmhOYVppR2NbeU5zflVOalxUVBYiSV9jS3hTcUVhWHpeeHRQRWVYUU91XA==')

// Make html2canvas available globally for chart download functionality
window.html2canvas = html2canvas

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
