import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Two apps in one repo: the trading control PWA (/) and Matrix Leaf (/tobacco/).
export default defineConfig({
  plugins: [react()],
  base: '/matrix-breaker-empire/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        tobacco: resolve(import.meta.dirname, 'tobacco/index.html'),
      },
    },
  },
})
