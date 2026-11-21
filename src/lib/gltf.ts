import { Box3, Object3D } from 'three'
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { modelAssetUrl } from './assets'

/** Bounding box of a model in its local coordinate system. */
export interface ModelBounds {
  /** Minimum corner of the bounding box. */
  min: [number, number, number]
  /** Maximum corner of the bounding box. */
  max: [number, number, number]
}

/** Constraints applied when a model is fitted into the scene. */
export interface FitConstraints {
  /** Desired height of the model after fitting. */
  targetHeight?: number
  /** Largest allowed width of the model after fitting. */
  maxWidth?: number
  /** Largest allowed depth of the model after fitting. */
  maxDepth?: number
  /** Extra multiplier applied after the fit is calculated. */
  scaleMultiplier?: number
}

/**
 * Clones a loaded GLTF scene so every instance owns its own objects.
 *
 * `useLoader` caches one parsed GLTF per URL, so every model that points at
 * the same file would otherwise receive the very same `Object3D`. Mounting
 * one object in several places in the scene graph is undefined behaviour in
 * three.js: the last mount wins the world transform, so four visitors end up
 * stacked on top of each other. Cloning gives each instance an independent
 * hierarchy.
 *
 * Rigged models need `SkeletonUtils.clone`, because a plain `Object3D.clone`
 * copies the mesh but leaves it bound to the original armature. The visitor
 * model is skinned, so its bones and the mesh binding have to be cloned
 * together.
 *
 * @param source - The scene root of the cached GLTF.
 * @returns An independent copy that is safe to mount and animate.
 */
export function cloneScene(source: Object3D): Object3D {
  let isSkinned = false
  source.traverse((child) => {
    if ((child as { isSkinnedMesh?: boolean }).isSkinnedMesh) isSkinned = true
  })
  return isSkinned ? cloneWithSkeleton(source) : source.clone()
}

/** Size of the model after fitting. */
export interface FittedModel {
  /** Uniform scale factor applied to the model. */
  scale: number
  /** Size of the fitted model. */
  size: [number, number, number]
  /** Center of the fitted model (always 0 on Y after ground alignment). */
  center: [number, number, number]
}

/**
 * Computes a uniform scale so the model fits within the given constraints
 * and sits on the ground (min Y = 0).
 *
 * @param bounds - Local bounding box of the model.
 * @param constraints - Target height and optional width/depth limits.
 * @returns Scale factor and resulting fitted size/center.
 */
export function fitModelToConstraints(
  bounds: ModelBounds,
  constraints: FitConstraints = {},
): FittedModel {
  const { targetHeight = 1, maxWidth, maxDepth, scaleMultiplier = 1 } = constraints

  const width = bounds.max[0] - bounds.min[0]
  const height = bounds.max[1] - bounds.min[1]
  const depth = bounds.max[2] - bounds.min[2]

  // Start with height-based scale.
  let scale = targetHeight / height

  // Clamp by width if needed.
  if (maxWidth && width * scale > maxWidth) {
    scale = maxWidth / width
  }

  // Clamp by depth if needed.
  if (maxDepth && depth * scale > maxDepth) {
    scale = maxDepth / depth
  }

  scale *= scaleMultiplier

  const fittedWidth = width * scale
  const fittedHeight = height * scale
  const fittedDepth = depth * scale

  // Center on X/Z, ground on Y (min Y = 0).
  const centerX = -(bounds.min[0] + bounds.max[0]) / 2 * scale
  const centerY = -bounds.min[1] * scale
  const centerZ = -(bounds.min[2] + bounds.max[2]) / 2 * scale

  return {
    scale,
    size: [fittedWidth, fittedHeight, fittedDepth],
    center: [centerX, centerY, centerZ],
  }
}

/**
 * Applies the fitted transform to a Three.js object.
 * Call after the GLTF has loaded and `object.updateMatrixWorld(true)` has run.
 */
export function applyFittedTransform(object: Object3D, fitted: FittedModel): void {
  object.scale.setScalar(fitted.scale)
  object.position.set(fitted.center[0], fitted.center[1], fitted.center[2])
  object.updateMatrixWorld(true)
}

/**
 * Creates a Box3 from an Object3D, accounting for all meshes in the hierarchy.
 */
export function computeBounds(object: Object3D): ModelBounds {
  const box = new Box3().setFromObject(object)
  return {
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
  }
}

/** Named animation clip identifiers for assets that have animations. */
export type AnimationClipName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'wave'
  | 'punch'
  | 'death'
  | 'cheer'
  | 'dance'

/** Registry entry for a single GLTF/GLB asset. */
export interface AssetRegistryEntry {
  /** File name of the GLB inside `public/models/`. */
  fileName: string
  /** Base-aware public URL used to load the asset. */
  url: string
  /** Local bounds measured from the source file (before any fitting). */
  bounds: ModelBounds
  /** Default fitting constraints for this asset in the scene. */
  fit: FitConstraints
  /** Optional animation clips available in this asset. */
  animations?: readonly AnimationClipName[]
  /** Default animation to play (must be in animations if specified). */
  defaultAnimation?: AnimationClipName
  /** Whether the asset casts shadows. */
  castShadow?: boolean
  /** Whether the asset receives shadows. */
  receiveShadow?: boolean
}

/** Typed keys for all registered assets. */
export type AssetKey =
  | 'festival-lantern'
  | 'lotus'
  | 'pagoda'
  | 'riverside-tree'
  | 'thai-house'
  | 'visitor'
  | 'wat-temple'

/** Complete asset registry with typed keys. */
export const ASSET_REGISTRY: Readonly<Record<AssetKey, AssetRegistryEntry>> = {
  'festival-lantern': {
    fileName: 'festival-lantern.glb',
    url: modelAssetUrl('festival-lantern.glb'),
    bounds: { min: [-0.32, 0, -0.32], max: [0.32, 0.925, 0.32] },
    fit: { targetHeight: 1.2, scaleMultiplier: 1 },
    castShadow: true,
    receiveShadow: true,
  },
  lotus: {
    fileName: 'lotus.glb',
    url: modelAssetUrl('lotus.glb'),
    bounds: { min: [-0.337, -0.798, -0.316], max: [0.322, 0.293, 0.341] },
    fit: { targetHeight: 0.5, scaleMultiplier: 1 },
    castShadow: true,
    receiveShadow: true,
  },
  pagoda: {
    fileName: 'pagoda.glb',
    url: modelAssetUrl('pagoda.glb'),
    bounds: { min: [-24516.035, -215.064, 1468.869], max: [-15974.184, 10691.325, 10074.298] },
    fit: { targetHeight: 18, maxWidth: 14, maxDepth: 14, scaleMultiplier: 1 },
    castShadow: true,
    receiveShadow: true,
  },
  'riverside-tree': {
    fileName: 'riverside-tree.glb',
    url: modelAssetUrl('riverside-tree.glb'),
    bounds: { min: [-2.194, -0.243, -2.225], max: [2.117, 7.022, 2.353] },
    fit: { targetHeight: 6, maxWidth: 4, maxDepth: 4, scaleMultiplier: 1 },
    castShadow: true,
    receiveShadow: true,
  },
  'thai-house': {
    fileName: 'thai-house.glb',
    url: modelAssetUrl('thai-house.glb'),
    bounds: { min: [-0.435, -0.766, -0.587], max: [1.029, 0.002, 0.587] },
    fit: { targetHeight: 3.5, maxWidth: 5, maxDepth: 4, scaleMultiplier: 1 },
    castShadow: true,
    receiveShadow: true,
  },
  visitor: {
    fileName: 'visitor.glb',
    url: modelAssetUrl('visitor.glb'),
    bounds: { min: [-0.525, 0, -0.491], max: [0.525, 2.157, 0.491] },
    fit: { targetHeight: 1.8, scaleMultiplier: 1 },
    animations: ['idle', 'walk', 'run', 'jump', 'fall', 'wave', 'punch', 'death', 'cheer', 'dance'] as const,
    defaultAnimation: 'idle',
    castShadow: true,
    receiveShadow: true,
  },
  'wat-temple': {
    fileName: 'wat-temple.glb',
    url: modelAssetUrl('wat-temple.glb'),
    bounds: { min: [-1.096, -4.327, -1.096], max: [1.096, 0.002, 1.096] },
    fit: { targetHeight: 6, maxWidth: 5, maxDepth: 5, scaleMultiplier: 1 },
    castShadow: true,
    receiveShadow: true,
  },
} as const

/** Type-safe accessor for a registry entry. */
export function getAssetEntry(key: AssetKey): AssetRegistryEntry {
  return ASSET_REGISTRY[key]
}

/** All asset keys as a readonly array for iteration. */
export const ASSET_KEYS: readonly AssetKey[] = [
  'festival-lantern',
  'lotus',
  'pagoda',
  'riverside-tree',
  'thai-house',
  'visitor',
  'wat-temple',
] as const
