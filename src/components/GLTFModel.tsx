import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Suspense, useEffect, useRef } from 'react'
import { AnimationClip, AnimationMixer, Clock, LoopOnce, Mesh, Vector3 } from 'three'
import type { AssetKey, AnimationClipName } from '../lib/gltf'
import { getAssetEntry, fitModelToConstraints } from '../lib/gltf'

interface GLTFModelProps {
  /** Registered asset key from the asset registry. */
  asset: AssetKey
  /** Override the default position (after fitting). */
  position?: [number, number, number]
  /** Override the default rotation (in radians). */
  rotation?: [number, number, number]
  /** Override the default animation clip. */
  animation?: AnimationClipName
  /** Whether to play the animation (default: true if asset has animations). */
  playAnimation?: boolean
  /** Callback when the model and animations are ready. */
  onReady?: (mixer: AnimationMixer | null, clips: AnimationClip[]) => void
}

/**
 * Reusable typed GLTF model loader with deterministic bounds-based fitting,
 * optional named animations, and procedural fallback on error.
 */
export function GLTFModel({
  asset,
  position,
  rotation,
  animation,
  playAnimation = true,
  onReady,
}: GLTFModelProps) {
  const entry = getAssetEntry(asset)
  const { url, bounds, fit, defaultAnimation, castShadow = true, receiveShadow = true } = entry
  const gltf = useLoader(GLTFLoader, url)
  const mixerRef = useRef<AnimationMixer | null>(null)
  const clockRef = useRef(new Clock())

  // Apply fitted transform after load
  useEffect(() => {
    const fitted = fitModelToConstraints(bounds, fit)
    const root = gltf.scene
    root.scale.setScalar(fitted.scale)
    root.position.set(fitted.center[0], fitted.center[1], fitted.center[2])
    if (position) root.position.add(new Vector3(...position))
    if (rotation) root.rotation.set(...rotation)
    root.updateMatrixWorld(true)

    // Enable shadows on all meshes
    root.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = castShadow
        child.receiveShadow = receiveShadow
      }
    })

    // Set up animations if available
    const clips = gltf.animations
    let mixer: AnimationMixer | null = null

    if (clips.length > 0 && playAnimation) {
      mixer = new AnimationMixer(root)
      mixerRef.current = mixer

      const clipName = animation ?? defaultAnimation ?? clips[0].name
      const clip = clips.find((c) => c.name === clipName) ?? clips[0]
      const action = mixer.clipAction(clip)
      action.setLoop(LoopOnce, Infinity)
      action.clampWhenFinished = true
      action.play()
    }

    onReady?.(mixer, clips)

    return () => {
      mixer?.uncacheRoot(root)
      mixer?.stopAllAction()
    }
  }, [gltf, bounds, fit, position, rotation, animation, defaultAnimation, playAnimation, castShadow, receiveShadow, onReady])

  // Animation frame update
  useEffect(() => {
    const mixer = mixerRef.current
    if (!mixer) return

    const animate = () => {
      const delta = clockRef.current.getDelta()
      mixer.update(delta)
    }

    const frameId = requestAnimationFrame(function loop() {
      animate()
      requestAnimationFrame(loop)
    })

    return () => cancelAnimationFrame(frameId)
  }, [])

  // Error boundary fallback will catch loading errors
  return (
    <group>
      <primitive object={gltf.scene} />
    </group>
  )
}

/**
 * Suspense wrapper for GLTFModel that provides a procedural fallback.
 */
export function GLTFModelWithFallback({
  asset,
  fallback,
  ...props
}: GLTFModelProps & { fallback?: React.ReactNode }) {
  return (
    <Suspense fallback={fallback ?? null}>
      <GLTFModel asset={asset} {...props} />
    </Suspense>
  )
}

// Types and utilities are available directly from '@/lib/gltf'