import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  plugins: [react(), tailwindcss(), glsl()],
  server: {
    port: 5173,
    proxy: {
      '/ace-step': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ace-step/, ''),
      },
    },
  },
})
