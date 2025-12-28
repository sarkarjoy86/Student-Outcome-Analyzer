import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import html2canvas from 'html2canvas'

// Make html2canvas available globally for chart download functionality
window.html2canvas = html2canvas

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
