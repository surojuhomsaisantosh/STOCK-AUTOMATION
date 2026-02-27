import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist'
  },
  server: {
    proxy: {
      '/sb-proxy': {
        target: 'https://vfhwuncpzbsjegmedvjr.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sb-proxy/, ''),
        secure: true
      }
    }
  }
})