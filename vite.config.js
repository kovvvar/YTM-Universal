import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/*.py', '**/__pycache__/**'],
    },
    proxy: {
      '/search': 'http://localhost:5000',
      '/download': 'http://localhost:5000',
    }
  }
})
