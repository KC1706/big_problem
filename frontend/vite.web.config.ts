import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Browser-only dev server for the renderer — used to pixel-diff the HUD against
// the design oracle (design_export/src) in Chrome. The renderer guards the
// Electron-only `window.bridgeApi`, so it runs fine without the main process.
export default defineConfig({
  root: 'src/renderer',
  resolve: { alias: { '@': resolve(__dirname, 'src/renderer/src') } },
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5199, strictPort: true },
})
