import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['onyx-reelz.com', 'www.onyx-reelz.com'],
    hmr: {
      protocol: 'wss',
      host: 'onyx-reelz.com',
      clientPort: 443,
      path: 'vite-hmr'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['onyx-reelz.com', 'www.onyx-reelz.com']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
