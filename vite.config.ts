import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    // GitHub Pages serves this project from /kathonng/, while Vercel, Netlify
    // and Cloudflare Pages normally serve it from the domain root. Override
    // VITE_BASE_PATH in the deployment environment when the app is not hosted
    // under /kathonng/.
    base: env.VITE_BASE_PATH || '/',
    server: {
      watch: {
        // Visual-check artifacts (browser profiles, screenshots) live in the
        // project directory. Without this the watcher reloads the page whenever
        // the browser touches its profile cache.
        ignored: ['**/.visual-check/**'],
      },
    },
    build: {
      // `three` core is roughly 740 kB minified because React Three Fiber calls
      // `extend(THREE)` at runtime, which enumerates the whole namespace and
      // keeps every export alive. Splitting the scene, React Three
      // Fiber/Drei and Supabase into cacheable chunks keeps the initial shell
      // small; the limit covers that one core chunk instead of fragmenting
      // Three.js internals into brittle modules.
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // Vite 8 bundles with Rolldown. The Rollup-compatible `manualChunks`
          // spelling pulls the whole dependency tree of a matched module into
          // that chunk, which merges `three` into the React Three chunk and
          // defeats the split. Rolldown's native `codeSplitting.groups` API is
          // used instead, with `includeDependenciesRecursively: false` so each
          // heavy dependency keeps its own cacheable chunk.
          codeSplitting: {
            groups: [
              {
                name: 'three',
                test: /node_modules[\\/]three[\\/]/,
                priority: 30,
                includeDependenciesRecursively: false,
              },
              {
                name: 'react-three',
                test: /node_modules[\\/](@react-three[\\/]|three-stdlib[\\/])/,
                priority: 20,
                includeDependenciesRecursively: false,
              },
              {
                name: 'supabase',
                test: /node_modules[\\/]@supabase[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
  }
})
