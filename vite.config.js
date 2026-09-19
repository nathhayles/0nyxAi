import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// shared/ — constants also used by the backend (backend/routes/render.js
// imports the same file at shared/audioConstants.js relative to its own
// repo root). Vendored INTO this repo (see shared/audioConstants.js) rather
// than resolved from an external sibling directory -- it used to point at
// /srv/onyx/shared via '../../../shared', a folder that was never committed
// to any repo and only existed by hand on one server, so every fresh clone
// (confirmed: this exact error on the Mac Mini setting up Capacitor, and on
// this server the night before) failed to resolve it. The two copies (here
// and backend/shared/audioConstants.js) must be kept in sync by hand since
// there's no real monorepo linking them -- small, rarely-changed file, so
// this is an acceptable tradeoff against the previous silent external
// dependency.
const sharedDir = path.resolve(__dirname, './shared')

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
