import { describe, expect, it } from 'vitest'
import { modelAssetUrl, publicAssetBase, publicAssetUrl } from './assets'

describe('public asset URLs', () => {
  it('resolves a public path against the deployment base', () => {
    expect(publicAssetUrl('models/visitor.glb', '/kathonng')).toBe(
      '/kathonng/models/visitor.glb',
    )
  })

  it('keeps a root deployment at the domain root', () => {
    expect(publicAssetUrl('models/visitor.glb', '')).toBe('/models/visitor.glb')
    expect(publicAssetUrl('models/visitor.glb', '/')).toBe('/models/visitor.glb')
  })

  it('strips leading slashes from the public path', () => {
    expect(publicAssetUrl('/models/visitor.glb', '/kathonng')).toBe(
      '/kathonng/models/visitor.glb',
    )
    expect(publicAssetUrl('///models/visitor.glb', '/kathonng')).toBe(
      '/kathonng/models/visitor.glb',
    )
  })

  it('does not produce a double slash between base and path', () => {
    expect(publicAssetUrl('models/visitor.glb', '/kathonng/')).toBe(
      '/kathonng/models/visitor.glb',
    )
  })

  it('builds model URLs from public/models', () => {
    expect(modelAssetUrl('visitor.glb', '/kathonng')).toBe(
      '/kathonng/models/visitor.glb',
    )
  })

  it('derives the base from Vite without a trailing slash', () => {
    expect(publicAssetBase).not.toMatch(/\/$/)
  })
})
