import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/public/images/menu-generated/**', '**/artifacts/**'],
    },
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787' },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom')
            ) {
              return 'react-vendor'
            }
            if (id.includes('framer-motion')) {
              return 'motion'
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase'
            }
          }
        },
      },
    },
  },
})
