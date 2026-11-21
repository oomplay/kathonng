import { describe, it, expect } from 'vitest'
import {
  fitModelToConstraints,
  ASSET_REGISTRY,
  ASSET_KEYS,
  getAssetEntry,
  type AssetKey,
  type ModelBounds,
  type FitConstraints,
  type AnimationClipName,
} from './gltf'
import { publicAssetBase } from './assets'

describe('gltf utilities', () => {
  describe('fitModelToConstraints', () => {
    it('should compute correct scale for height-only constraint', () => {
      const bounds: ModelBounds = { min: [0, 0, 0], max: [2, 4, 2] }
      const constraints: FitConstraints = { targetHeight: 2 }
      const result = fitModelToConstraints(bounds, constraints)

      expect(result.scale).toBe(0.5)
      expect(result.size[1]).toBe(2)
      expect(result.size[0]).toBe(1)
      expect(result.size[2]).toBe(1)
    })

    it('should center on X/Z and ground on Y', () => {
      const bounds: ModelBounds = { min: [-1, -2, -1], max: [1, 2, 1] }
      const constraints: FitConstraints = { targetHeight: 4 }
      const result = fitModelToConstraints(bounds, constraints)

      expect(result.center[1]).toBe(2)
      // Use toBeCloseTo which handles -0 vs +0
      expect(result.center[0]).toBeCloseTo(0)
      expect(result.center[2]).toBeCloseTo(0)
    })

    it('should clamp by maxWidth when width exceeds limit', () => {
      const bounds: ModelBounds = { min: [0, 0, 0], max: [10, 2, 2] }
      const constraints: FitConstraints = { targetHeight: 2, maxWidth: 4 }
      const result = fitModelToConstraints(bounds, constraints)

      expect(result.scale).toBe(0.4)
      expect(result.size[0]).toBe(4)
      expect(result.size[1]).toBe(0.8)
    })

    it('should clamp by maxDepth when depth exceeds limit', () => {
      const bounds: ModelBounds = { min: [0, 0, 0], max: [2, 2, 10] }
      const constraints: FitConstraints = { targetHeight: 2, maxDepth: 4 }
      const result = fitModelToConstraints(bounds, constraints)

      expect(result.scale).toBe(0.4)
      expect(result.size[2]).toBe(4)
      expect(result.size[1]).toBe(0.8)
    })

    it('should apply scaleMultiplier after clamping', () => {
      const bounds: ModelBounds = { min: [0, 0, 0], max: [2, 4, 2] }
      const constraints: FitConstraints = { targetHeight: 2, scaleMultiplier: 1.5 }
      const result = fitModelToConstraints(bounds, constraints)

      expect(result.scale).toBe(0.75)
      expect(result.size[1]).toBe(3)
    })

    it('should handle asymmetric bounds correctly', () => {
      const bounds: ModelBounds = { min: [-3, -1, -2], max: [1, 3, 2] }
      const constraints: FitConstraints = { targetHeight: 4 }
      const result = fitModelToConstraints(bounds, constraints)

      expect(result.center[0]).toBe(1)
      expect(result.center[1]).toBe(1)
      // Use toBeCloseTo which handles -0 vs +0
      expect(result.center[2]).toBeCloseTo(0)
    })
  })

  describe('ASSET_REGISTRY', () => {
    it('should have exactly 7 registered assets', () => {
      expect(ASSET_KEYS).toHaveLength(7)
      expect(Object.keys(ASSET_REGISTRY)).toHaveLength(7)
    })

    it('should have all required asset keys', () => {
      const expectedKeys: AssetKey[] = [
        'festival-lantern',
        'lotus',
        'pagoda',
        'riverside-tree',
        'thai-house',
        'visitor',
        'wat-temple',
      ]
      expectedKeys.forEach((key) => {
        expect(ASSET_REGISTRY).toHaveProperty(key)
        expect(ASSET_KEYS).toContain(key)
      })
    })

    it('should have a base-aware URL for each asset', () => {
      ASSET_KEYS.forEach((key) => {
        const entry = ASSET_REGISTRY[key]
        expect(entry.fileName).toMatch(/^[^/]+\.glb$/)
        // The URL is always composed from the configured base, never
        // hard-coded. On GitHub Pages the base is `/kathonng`, so a
        // root-absolute `/models/...` URL would 404.
        expect(entry.url).toBe(`${publicAssetBase}/models/${entry.fileName}`)
        expect(entry.url.endsWith(`/models/${entry.fileName}`)).toBe(true)
        if (publicAssetBase) {
          expect(entry.url.startsWith(`${publicAssetBase}/`)).toBe(true)
        }
      })
    })

    it('should have valid bounds for each asset', () => {
      ASSET_KEYS.forEach((key) => {
        const entry = ASSET_REGISTRY[key]
        expect(entry.bounds.min).toHaveLength(3)
        expect(entry.bounds.max).toHaveLength(3)
        expect(entry.bounds.min[0]).toBeLessThanOrEqual(entry.bounds.max[0])
        expect(entry.bounds.min[1]).toBeLessThanOrEqual(entry.bounds.max[1])
        expect(entry.bounds.min[2]).toBeLessThanOrEqual(entry.bounds.max[2])
      })
    })

    it('should have valid fit constraints for each asset', () => {
      ASSET_KEYS.forEach((key) => {
        const entry = ASSET_REGISTRY[key]
        expect(entry.fit.targetHeight).toBeDefined()
        expect(entry.fit.targetHeight).toBeGreaterThan(0)
        if (entry.fit.maxWidth) expect(entry.fit.maxWidth).toBeGreaterThan(0)
        if (entry.fit.maxDepth) expect(entry.fit.maxDepth).toBeGreaterThan(0)
        expect(entry.fit.scaleMultiplier).toBeGreaterThanOrEqual(0)
      })
    })

    it('should have shadow properties for each asset', () => {
      ASSET_KEYS.forEach((key) => {
        const entry = ASSET_REGISTRY[key]
        expect(typeof entry.castShadow).toBe('boolean')
        expect(typeof entry.receiveShadow).toBe('boolean')
      })
    })

    it('should have animations only for visitor asset', () => {
      ASSET_KEYS.forEach((key) => {
        const entry = ASSET_REGISTRY[key]
        if (key === 'visitor') {
          expect(entry.animations).toBeDefined()
          expect(entry.animations!.length).toBeGreaterThan(0)
          expect(entry.defaultAnimation).toBeDefined()
          expect(entry.animations).toContain(entry.defaultAnimation!)
        } else if (entry.animations && entry.defaultAnimation) {
          expect(entry.animations).toContain(entry.defaultAnimation)
        }
      })
    })

    it('visitor should have all 10 expected animation clips', () => {
      const visitor = ASSET_REGISTRY.visitor
      const expectedClips: AnimationClipName[] = [
        'idle',
        'walk',
        'run',
        'jump',
        'fall',
        'wave',
        'punch',
        'death',
        'cheer',
        'dance',
      ]
      expect(visitor.animations).toEqual(expectedClips)
      expect(visitor.defaultAnimation).toBe('idle')
    })
  })

  describe('getAssetEntry', () => {
    it('should return correct entry for valid key', () => {
      const entry = getAssetEntry('visitor')
      expect(entry.fileName).toBe('visitor.glb')
      expect(entry.url).toBe(`${publicAssetBase}/models/visitor.glb`)
      expect(entry.animations).toContain('idle')
    })

    it('should have type-safe keys', () => {
      const key: AssetKey = 'visitor'
      const entry = getAssetEntry(key)
      expect(entry).toBeDefined()
    })
  })

  describe('asset registry invariants', () => {
    it('should have unique URLs across all assets', () => {
      const urls = ASSET_KEYS.map((key) => ASSET_REGISTRY[key].url)
      const uniqueUrls = new Set(urls)
      expect(uniqueUrls.size).toBe(urls.length)
    })

    it('should have positive targetHeight for all assets', () => {
      ASSET_KEYS.forEach((key) => {
        expect(ASSET_REGISTRY[key].fit.targetHeight).toBeGreaterThan(0)
      })
    })

    it('should have scaleMultiplier >= 0 for all assets', () => {
      ASSET_KEYS.forEach((key) => {
        const mult = ASSET_REGISTRY[key].fit.scaleMultiplier ?? 1
        expect(mult).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
