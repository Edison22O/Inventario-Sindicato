import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    watch: {
      usePolling: true,
    },
    host: true, // Needed for docker
    allowedHosts: true, // Allow ngrok and localtunnel hosts
    strictPort: true,
    port: 3000,
  }
})
