import { describe, expect, it } from 'vitest'
import {
  FOCAL_GLTF_VISITOR_POSITIONS,
  GLTF_VISITOR_COUNT,
  PROCEDURAL_VISITOR_COUNT,
  TOTAL_VISITOR_COUNT,
} from './visitorConfig'

describe('visitor count', () => {
  it('keeps the full-quality scene at exactly twenty visitors', () => {
    expect(PROCEDURAL_VISITOR_COUNT).toBe(16)
    expect(GLTF_VISITOR_COUNT).toBe(4)
    expect(FOCAL_GLTF_VISITOR_POSITIONS).toHaveLength(4)
    expect(TOTAL_VISITOR_COUNT).toBe(20)
  })
})
