/* eslint-disable no-unused-vars */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group deeply nested react dependencies into a single react-vendor chunk
            if (
              id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'react-vendor';
            }
            if (id.includes('react-router-dom') || id.includes('@remix-run')) {
              return '@react-router';
            }
            if (id.includes('supabase') || id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-vendor';
            }
            if (id.includes('lucide-react') || id.includes('react-icons')) {
              return 'icons-vendor';
            }
            if (id.includes('recharts') || id.includes('d3') || id.includes('lodash')) {
              return 'charts-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/sb-proxy': {
        target: 'https://vfhwuncpzbsjegmedvjr.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sb-proxy/, ''),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Edge Functions need the exact Authorization header unchanged
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
        }
      }
    }
  }
})