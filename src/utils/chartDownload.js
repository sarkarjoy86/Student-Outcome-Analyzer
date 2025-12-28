/**
 * Utility function to download charts as high-quality JPG images with all details
 * Captures the entire container including title, legend, and chart
 * @param {string} containerId - The ID of the container element (includes title, chart, and legend)
 * @param {string} filename - The filename for the downloaded image (without extension)
 */
export const downloadChartAsJPG = (containerId, filename = 'chart') => {
  try {
    // Find the complete container (includes title, chart, legend, and all details)
    const container = document.getElementById(containerId)
    if (!container) {
      console.error('Container not found:', containerId)
      return
    }

    // Use html2canvas library to capture entire component with styling
    if (window.html2canvas) {
      // Clone container styles
      const clonedContainer = container.cloneNode(true)
      
      // Create temporary wrapper
      const tempWrapper = document.createElement('div')
      tempWrapper.style.position = 'absolute'
      tempWrapper.style.left = '-9999px'
      tempWrapper.style.backgroundColor = 'white'
      tempWrapper.style.padding = '20px'
      
      // Get computed style from original
      const containerRect = container.getBoundingClientRect()
      tempWrapper.style.width = containerRect.width + 'px'
      
      tempWrapper.appendChild(clonedContainer)
      document.body.appendChild(tempWrapper)

      // Capture with html2canvas for complete rendering
      window.html2canvas(tempWrapper, {
        backgroundColor: '#ffffff',
        scale: 2,
        allowTaint: true,
        useCORS: true,
        logging: false,
        margin: 10
      }).then((canvas) => {
        downloadCanvasAsJPG(canvas, filename)
        document.body.removeChild(tempWrapper)
      }).catch((error) => {
        console.error('html2canvas error:', error)
        // Fallback to SVG-only method
        document.body.removeChild(tempWrapper)
        downloadSVGOnlyFallback(container, filename)
      })
    } else {
      // Fallback if html2canvas is not available
      downloadSVGOnlyFallback(container, filename)
    }
  } catch (error) {
    console.error('Error downloading chart:', error)
  }
}

/**
 * Fallback method that captures only SVG but with white background
 */
const downloadSVGOnlyFallback = (container, filename) => {
  try {
    // Find SVG elements
    const svgElement = container.querySelector('svg')
    if (!svgElement) {
      console.error('No SVG found in container')
      return
    }

    // Clone the SVG
    const clonedSvg = svgElement.cloneNode(true)
    
    // Get dimensions
    const rect = svgElement.getBoundingClientRect()
    const width = rect.width || 800
    const height = rect.height || 600
    
    clonedSvg.setAttribute('width', width)
    clonedSvg.setAttribute('height', height)
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    
    // Add white background
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.setAttribute('width', '100%')
    bgRect.setAttribute('height', '100%')
    bgRect.setAttribute('fill', 'white')
    bgRect.setAttribute('z-index', '-1')
    clonedSvg.insertBefore(bgRect, clonedSvg.firstChild)
    
    // Serialize SVG
    const svgData = new XMLSerializer().serializeToString(clonedSvg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    
    // Create image and convert to canvas
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const scale = 2
      
      canvas.width = width * scale
      canvas.height = height * scale
      
      // Draw white background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw image
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      
      // Download
      downloadCanvasAsJPG(canvas, filename)
      URL.revokeObjectURL(svgUrl)
    }
    
    img.onerror = () => {
      console.error('Error loading SVG image')
      URL.revokeObjectURL(svgUrl)
    }
    
    img.src = svgUrl
  } catch (error) {
    console.error('Error in SVG fallback:', error)
  }
}

/**
 * Convert canvas to JPG blob and trigger download
 */
const downloadCanvasAsJPG = (canvas, filename) => {
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      console.error('Failed to create blob from canvas')
    }
  }, 'image/jpeg', 0.95) // High quality JPG (95%)
}
