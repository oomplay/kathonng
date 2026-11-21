/**
 * Helpers for assets that are copied verbatim from `public/` into the build.
 *
 * GitHub Pages serves this project from `/kathonng/`, while other hosts serve
 * it from `/`. A root-absolute URL such as `/models/temple.glb` bypasses the
 * configured Vite base and therefore 404s on GitHub Pages. Every public asset
 * URL must be resolved through these helpers instead.
 */

/** The deployment base without its trailing slash (`''` or `/kathonng`). */
export const publicAssetBase = import.meta.env.BASE_URL.replace(/\/$/, '')

/**
 * Resolves a path inside `public/` against the configured deployment base.
 *
 * @param path - Public-relative path without a leading slash, e.g. `models/x.glb`
 * @param base - Optional base override, primarily for tests
 */
export function publicAssetUrl(path: string, base: string = publicAssetBase): string {
  const normalizedPath = path.replace(/^\/+/, '')
  return `${base.replace(/\/+$/, '')}/${normalizedPath}`
}

/** Resolves a GLB file from `public/models/` against the deployment base. */
export function modelAssetUrl(fileName: string, base: string = publicAssetBase): string {
  return publicAssetUrl(`models/${fileName}`, base)
}

