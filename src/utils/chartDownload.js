import html2canvas from 'html2canvas'

/**
 * Utility function to download charts as high-quality JPG images with all details
 * Captures the entire container including title, legend, and chart
 * @param {string} containerId - The ID of the container element (includes title, chart, and legend)
 * @param {string} filename - The filename for the downloaded image (without extension)
 */
/**
 * Universal sanitization function for chart containers before html2canvas capture.
 * Solves:
 * 1. Collapsed whitespace between words (html2canvas drops spaces with Google Fonts / Inter).
 *    -> Replaces all normal spaces in text nodes (outside SVG) with non-breaking spaces (\u00A0).
 * 2. Floating / misaligned legend color squares.
 *    -> Converts both Recharts legends (.recharts-legend-item) and custom survey rating legends
 *       into inline text glyphs (■) on the EXACT same text baseline as the label, ensuring 100% inline alignment.
 * 3. Removes buttons and removes box-shadow / border artifacts.
 */
export const sanitizeChartClone = (clonedContainer, originalContainer) => {
  // 1. Remove download / action buttons
  clonedContainer.querySelectorAll('button').forEach((btn) => btn.remove())

  // 2. Set clean container styles and clean font metrics
  clonedContainer.style.border = 'none'
  clonedContainer.style.outline = 'none'
  clonedContainer.style.boxShadow = 'none'
  clonedContainer.style.borderRadius = '0px'
  clonedContainer.style.padding = '16px'
  clonedContainer.style.backgroundColor = '#ffffff'
  clonedContainer.style.fontFamily = 'Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  clonedContainer.style.fontFeatureSettings = '"liga" 0'
  clonedContainer.style.fontVariantLigatures = 'none'
  clonedContainer.style.letterSpacing = '0.4px'

  // 3. Fix Title styling: prevent font-black (900) and heavy strokes from smearing/sticking letters together in html2canvas
  const titleElements = clonedContainer.querySelectorAll('h1, h2, h3, h4, p.uppercase, .text-xl, .text-lg, .uppercase, [class*="font-black"], [class*="font-extrabold"]')
  titleElements.forEach((el) => {
    if (el.className && typeof el.className === 'string') {
      el.className = el.className
        .replace(/bg-gradient-to-\w+/g, '')
        .replace(/from-\w+-\d+/g, '')
        .replace(/to-\w+-\d+/g, '')
        .replace(/bg-clip-text/g, '')
        .replace(/text-transparent/g, '')
        .replace(/font-black/g, 'font-bold')
        .replace(/font-extrabold/g, 'font-bold')
    }
    el.style.fontFamily = 'Arial, "Segoe UI", Roboto, sans-serif'
    el.style.fontWeight = '700'
    el.style.letterSpacing = '1px'
    el.style.lineHeight = '1.4'
    if (!el.style.color || el.style.color === 'transparent') {
      el.style.color = '#1f2937'
    }
  })

  // Style subtitle paragraphs specifically so criteria text has clear spacing and high readability
  const subtitleElements = clonedContainer.querySelectorAll('p')
  subtitleElements.forEach((el) => {
    if (el.textContent && el.textContent.includes('Please rate')) {
      el.style.fontWeight = '500'
      el.style.letterSpacing = '0.4px'
      el.style.color = '#374151'
      el.style.fontSize = '11px'
      el.style.marginTop = '3px'
      el.style.marginBottom = '6px'
    }
  })

  // 4. Fix Recharts Legend (.recharts-legend-wrapper)
  const legendItems = clonedContainer.querySelectorAll('.recharts-legend-item')
  const defaultLegend = clonedContainer.querySelector('.recharts-default-legend')
  const legendWrapper = clonedContainer.querySelector('.recharts-legend-wrapper')

  if (legendItems.length > 0) {
    const itemsData = []
    legendItems.forEach((item) => {
      const svg = item.querySelector('svg')
      let color = '#2563eb'
      const itemText = (item.textContent || '').trim()
      const itemTextLower = itemText.toLowerCase()

      if (svg) {
        const path = svg.querySelector('path, rect, polygon, circle, line')
        let fill = ''
        if (path) {
          const f = path.getAttribute('fill') || path.style.fill || ''
          const s = path.getAttribute('stroke') || path.style.stroke || ''
          fill = f && f !== 'none' ? f : s
        }

        if (itemTextLower.includes('below') && itemTextLower.includes('40')) {
          color = '#ef4444'
        } else if (itemTextLower.includes('40–79') || itemTextLower.includes('40-79')) {
          color = '#f59e0b'
        } else if (itemTextLower.includes('80')) {
          color = '#22c55e'
        } else if (fill.includes('KPI') || fill.includes('kpi') || itemTextLower.includes('kpi')) {
          color = '#eab308'
        } else if (fill.includes('Pass') || fill.includes('pass') || itemTextLower.includes('pass')) {
          color = '#2563eb'
        } else if (fill.startsWith('url(')) {
          const match = fill.match(/url\(#([^)]+)\)/)
          if (match) {
            const grad = originalContainer.querySelector(`#${match[1]}`) || clonedContainer.querySelector(`#${match[1]}`)
            const stop = grad?.querySelector('stop')
            if (stop) color = stop.getAttribute('stop-color') || stop.style.stopColor || color
          }
        } else if (fill && fill !== 'none') {
          color = fill
        }
      } else {
        if (itemTextLower.includes('below') && itemTextLower.includes('40')) color = '#ef4444'
        else if (itemTextLower.includes('40–79') || itemTextLower.includes('40-79')) color = '#f59e0b'
        else if (itemTextLower.includes('80')) color = '#22c55e'
        else if (itemTextLower.includes('kpi')) color = '#eab308'
        else if (itemTextLower.includes('pass')) color = '#2563eb'
      }

      itemsData.push({ color, text: itemText })
    })

    // Construct pure inline legend where ■ and text sit on the EXACT SAME BASELINE
    const newLegendContainer = document.createElement('div')
    newLegendContainer.style.width = '100%'
    newLegendContainer.style.textAlign = 'center'
    newLegendContainer.style.margin = '0 auto'
    newLegendContainer.style.padding = '6px 0'
    newLegendContainer.style.lineHeight = 'normal'

    itemsData.forEach((data) => {
      const itemSpan = document.createElement('span')
      itemSpan.style.display = 'inline-block'
      itemSpan.style.verticalAlign = 'middle'
      itemSpan.style.margin = '3px 14px'
      itemSpan.style.whiteSpace = 'nowrap'
      itemSpan.style.fontFamily = 'Arial, sans-serif'
      itemSpan.style.fontSize = '12px'
      itemSpan.style.fontWeight = '600'
      itemSpan.style.color = '#1f2937'

      // The solid square glyph ■ sits on the exact font baseline
      const boxSpan = document.createElement('span')
      boxSpan.style.color = data.color
      boxSpan.style.fontSize = '13px'
      boxSpan.style.lineHeight = '1'
      boxSpan.style.verticalAlign = 'baseline'
      boxSpan.textContent = '■'

      const textSpan = document.createElement('span')
      textSpan.style.verticalAlign = 'baseline'
      textSpan.style.marginLeft = '5px'
      textSpan.textContent = data.text.replace(/\s+/g, '\u00A0')

      itemSpan.appendChild(boxSpan)
      itemSpan.appendChild(textSpan)
      newLegendContainer.appendChild(itemSpan)
    })

    if (defaultLegend) {
      defaultLegend.parentNode.replaceChild(newLegendContainer, defaultLegend)
    } else if (legendWrapper) {
      legendWrapper.innerHTML = ''
      legendWrapper.appendChild(newLegendContainer)
    }

    if (legendWrapper) {
      legendWrapper.style.width = '100%'
      legendWrapper.style.textAlign = 'center'
      legendWrapper.style.display = 'block'
      legendWrapper.style.height = 'auto'
      legendWrapper.style.lineHeight = 'normal'
    }
  }

  // 5. Fix Custom Survey Rating Legends (e.g. headers in SurveyAnalysis and StudentFeedbackReport)
  const customLegendContainers = clonedContainer.querySelectorAll('.flex.flex-wrap, .flex.items-center')
  customLegendContainers.forEach((container) => {
    // Check if this container has rating items with inner colored badge spans
    const ratingSpans = Array.from(container.children).filter((child) => {
      return child.querySelector && child.querySelector('span.rounded-xs, span.bg-blue-600, span.bg-red-600, span.bg-amber-500, span.bg-emerald-600, span.bg-purple-600, span.w-3, span.w-2\\.5, [class*="bg-"]')
    })

    if (ratingSpans.length >= 2) {
      container.style.display = 'block'
      container.style.textAlign = 'center'
      container.style.padding = '6px 0'
      container.style.margin = '4px auto 10px auto'

      ratingSpans.forEach((item) => {
        const badge = item.querySelector('span')
        let color = '#2563eb'
        if (badge) {
          const bg = window.getComputedStyle(badge).backgroundColor
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            color = bg
          } else if (badge.className.includes('blue')) color = '#2563eb'
          else if (badge.className.includes('red')) color = '#ef4444'
          else if (badge.className.includes('amber') || badge.className.includes('yellow')) color = '#f59e0b'
          else if (badge.className.includes('emerald') || badge.className.includes('green')) color = '#10b981'
          else if (badge.className.includes('purple')) color = '#9333ea'
        }

        const rawText = item.textContent.trim()
        const cleanText = rawText.replace(/\s+/g, '\u00A0')

        item.style.display = 'inline-block'
        item.style.verticalAlign = 'middle'
        item.style.margin = '3px 10px'
        item.style.whiteSpace = 'nowrap'
        item.style.fontFamily = 'Arial, sans-serif'
        item.style.fontSize = '11px'
        item.style.fontWeight = 'bold'
        item.style.color = color

        item.innerHTML = `<span style="color:${color}; font-size:13px; line-height:1; vertical-align:baseline;">■</span><span style="vertical-align:baseline; margin-left:4px;">${cleanText}</span>`
      })
    }
  })

  // 6. TreeWalker: Replace all regular spaces in ALL non-SVG text nodes with \u00A0
  // This completely eliminates html2canvas space collapsing for titles, subtitles, criteria, and labels!
  const walker = document.createTreeWalker(clonedContainer, NodeFilter.SHOW_TEXT, null, false)
  let node
  while ((node = walker.nextNode())) {
    if (node.parentElement && node.parentElement.closest('svg')) continue
    if (node.nodeValue && node.nodeValue.includes(' ')) {
      node.nodeValue = node.nodeValue.replace(/ +/g, '\u00A0')
    }
  }
}

/**
 * Capture any chart container to a high-quality HTML5 Canvas with perfect font and legend sanitization.
 */
export const captureElementToCanvas = async (container) => {
  if (!container) return null
  const h2c = window.html2canvas || html2canvas
  if (!h2c) return null

  // Ensure fonts are ready
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready
    } catch (e) {}
  }

  const clonedContainer = container.cloneNode(true)
  sanitizeChartClone(clonedContainer, container)

  const tempWrapper = document.createElement('div')
  tempWrapper.style.position = 'absolute'
  tempWrapper.style.left = '-9999px'
  tempWrapper.style.top = '0px'
  tempWrapper.style.backgroundColor = '#ffffff'
  tempWrapper.style.padding = '0px'
  tempWrapper.style.border = 'none'
  tempWrapper.style.boxShadow = 'none'
  tempWrapper.style.zoom = '1'

  const originalWidth = container.offsetWidth || container.getBoundingClientRect().width
  tempWrapper.style.width = originalWidth + 'px'

  tempWrapper.appendChild(clonedContainer)
  document.body.appendChild(tempWrapper)

  const prevBodyZoom = document.body.style.zoom
  document.body.style.zoom = '1'

  try {
    const canvas = await h2c(tempWrapper, {
      backgroundColor: '#ffffff',
      scale: 2.5,
      allowTaint: true,
      useCORS: true,
      logging: false,
      margin: 0,
      imageTimeout: 0,
    })
    return canvas
  } finally {
    document.body.style.zoom = prevBodyZoom || ''
    if (tempWrapper.parentNode) {
      document.body.removeChild(tempWrapper)
    }
  }
}

/**
 * Utility function to download charts as high-quality JPG images with all details
 * Captures the entire container including title, legend, and chart
 * @param {string} containerId - The ID of the container element (includes title, chart, and legend)
 * @param {string} filename - The filename for the downloaded image (without extension)
 */
export const downloadChartAsJPG = async (containerId, filename = 'chart') => {
  try {
    const container = document.getElementById(containerId)
    if (!container) {
      console.error('Container not found:', containerId)
      return
    }

    const canvas = await captureElementToCanvas(container)
    if (canvas) {
      downloadCanvasAsJPG(canvas, filename)
    } else {
      downloadSVGOnlyFallback(container, filename)
    }
  } catch (error) {
    console.error('Error downloading chart with canvas, falling back to SVG:', error)
    const container = document.getElementById(containerId)
    if (container) {
      downloadSVGOnlyFallback(container, filename)
    }
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
