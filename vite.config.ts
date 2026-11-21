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
                // React Three Fiber and its runtime support packages have to
                // stay in one chunk. The web Canvas imports `its-fine`
                // (FiberProvider) and `react-use-measure`; if those fall into
                // the lazy scene chunk while the Canvas itself lives in this
                // chunk, the two chunks import each other and the build
                // contains a cycle.
                //
                // `@babel/runtime/helpers/esm/extends` is included for the same
                // reason: Drei imports it, and Rolldown otherwise places the
                // shared helper in the lazy scene chunk. That makes the scene
                // chunk import Drei and Drei import the helper back from the
                // scene chunk, which is a circular import between chunks.
                name: 'react-three',
                test: /node_modules[\\/](@react-three[\\/]|three-stdlib[\\/]|its-fine[\\/]|react-use-measure[\\/]|suspend-react[\\/]|zustand[\\/]|use-sync-external-store[\\/]|@babel[\\/]runtime[\\/]helpers[\\/]esm[\\/]extends\.js)/,
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
