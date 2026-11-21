export interface FocalGLTFVisitor {
  position: [number, number, number]
  rotation: [number, number, number]
  animation: 'idle' | 'wave' | 'cheer'
}

/**
 * Procedural visitors are instanced, while these four focal visitors use the
 * rigged visitor GLB. Together they make exactly twenty visitors in the full
 * quality tier.
 */
export const PROCEDURAL_VISITOR_COUNT = 16
export const FOCAL_GLTF_VISITOR_POSITIONS: readonly FocalGLTFVisitor[] = [
  { position: [4.5, 0, -8.2], rotation: [0, -Math.PI / 2, 0], animation: 'idle' },
  { position: [-8.5, 0, 3], rotation: [0, Math.PI / 4, 0], animation: 'wave' },
  { position: [8.5, 0, -3], rotation: [0, -Math.PI / 4, 0], animation: 'cheer' },
  { position: [-9, 0, -18], rotation: [0, 0, 0], animation: 'idle' },
]

export const GLTF_VISITOR_COUNT = FOCAL_GLTF_VISITOR_POSITIONS.length
export const TOTAL_VISITOR_COUNT = PROCEDURAL_VISITOR_COUNT + GLTF_VISITOR_COUNT

/** Number of visitors drawn in the degraded tier. */
export const DEGRADED_VISITOR_COUNT = 6
