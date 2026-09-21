import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        compact: true,
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: false,
    watch: {
      ignored: ['**/ml-service/**', '**/.venv/**', '**/dist/**', '**/data/**'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') return;
            console.error('Proxy error:', err);
          });
        },
      },
    },
  },
  base: '/Student-Outcome-Analyzer/',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/@syncfusion')) {
            return 'vendor-syncfusion'
          }
          if (id.includes('node_modules/katex')) {
            return 'vendor-katex'
          }
          if (id.includes('node_modules/html2canvas')) {
            return 'vendor-html2canvas'
          }
          if (id.includes('node_modules/mammoth')) {
            return 'vendor-mammoth'
          }
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdfjs'
          }
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx'
          }
        },
      },
    },
  },
})
