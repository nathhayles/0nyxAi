import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// /srv/onyx/shared — constants shared with the backend (see audioConstants.js).
// Lives outside this project's own root, so Vite needs an explicit fs.allow
// entry plus an alias to resolve imports into it.
const sharedDir = path.resolve(__dirname, '../../../shared')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': sharedDir },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['onyx-reelz.com', 'www.onyx-reelz.com'],
    fs: { allow: ['.', sharedDir] },
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
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor';
          if (id.includes('node_modules/')) return 'vendor';
        },
      },
    },
  },
})
