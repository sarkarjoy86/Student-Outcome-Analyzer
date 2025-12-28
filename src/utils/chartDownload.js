/**
 * Utility function to download charts as high-quality JPG images
 * @param {string} chartId - The ID of the chart container element
 * @param {string} filename - The filename for the downloaded image
 */
export const downloadChartAsJPG = (chartId, filename = 'chart') => {
  try {
    // Find the chart container
    const chartContainer = document.getElementById(chartId)
    if (!chartContainer) {
      console.error('Chart container not found:', chartId)
      return
    }

    // Find the SVG element within the container
    const svgElement = chartContainer.querySelector('svg')
    if (!svgElement) {
      console.error('SVG element not found in container:', chartId)
      return
    }

    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true)
    
    // Get the bounding rect
    const svgRect = svgElement.getBoundingClientRect()
    const width = svgRect.width || parseInt(svgElement.getAttribute('width')) || 800
    const height = svgRect.height || parseInt(svgElement.getAttribute('height')) || 600
    
    // Set SVG attributes for export
    clonedSvg.setAttribute('width', width)
    clonedSvg.setAttribute('height', height)
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    
    // Add white background rectangle
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.setAttribute('width', '100%')
    bgRect.setAttribute('height', '100%')
    bgRect.setAttribute('fill', 'white')
    clonedSvg.insertBefore(bgRect, clonedSvg.firstChild)
    
    // Serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(clonedSvg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    
    // Create an image element
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Set canvas dimensions (high quality - 2x for better resolution)
      const scale = 2
      canvas.width = width * scale
      canvas.height = height * scale
      
      // Fill white background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Convert to JPG with high quality
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
      
      URL.revokeObjectURL(svgUrl)
    }
    
    img.onerror = (error) => {
      console.error('Error loading SVG image:', error)
      URL.revokeObjectURL(svgUrl)
    }
    
    img.src = svgUrl
  } catch (error) {
    console.error('Error downloading chart:', error)
  }
}

