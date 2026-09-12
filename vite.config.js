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
})
