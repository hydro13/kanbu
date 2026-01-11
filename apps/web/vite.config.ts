import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// API target - HTTPS with self-signed certificate
const apiTarget = 'https://127.0.0.1:3001'

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
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err.message);
          });
        },
      },
      '/trpc': {
        target: apiTarget,
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err.message);
          });
        },
      },
      '/socket.io': {
        target: apiTarget,
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        ws: true,
      },
      // Note: /uploads is served directly from public/uploads symlink → API uploads folder
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
