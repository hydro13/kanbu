import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Check if HTTPS certificates exist
const certsPath = path.resolve(__dirname, '../../certs')
const httpsConfig = fs.existsSync(path.join(certsPath, 'localhost+4.pem'))
  ? {
      key: fs.readFileSync(path.join(certsPath, 'localhost+4-key.pem')),
      cert: fs.readFileSync(path.join(certsPath, 'localhost+4.pem')),
    }
  : undefined

// API target - always HTTP, API runs on HTTP for Vite proxy compatibility
const apiTarget = 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Listen on all interfaces (0.0.0.0) for Tailscale access
    allowedHosts: true, // Allow all hosts (dev server accessible via any hostname)
    https: httpsConfig, // Use HTTPS if certificates are available
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/trpc': {
        target: apiTarget,
        changeOrigin: true,
      },
      // Note: /uploads is served directly from public/uploads symlink → API uploads folder
      // Proxy Socket.io through Vite to avoid mixed content issues
      '/socket.io': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
