import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/kathonng/',
  server: {
    watch: {
      // Visual-check artifacts (browser profiles, screenshots) live in the
      // project directory. Without this the watcher reloads the page whenever
      // the browser touches its profile cache.
      ignored: ['**/.visual-check/**'],
    },
  },
})
