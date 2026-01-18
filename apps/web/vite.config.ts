import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if HTTPS certificates exist (mkcert)
const certsPath = path.resolve(__dirname, '../../certs');
const certFile = path.join(certsPath, 'localhost+4.pem');
const keyFile = path.join(certsPath, 'localhost+4-key.pem');

const httpsConfig =
  fs.existsSync(certFile) && fs.existsSync(keyFile)
    ? {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile),
      }
    : undefined;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    https: httpsConfig,
    proxy: {
      '/api': {
        target: 'https://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/trpc': {
        target: 'https://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
