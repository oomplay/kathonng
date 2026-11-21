import { useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import {
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  Mesh,
  Object3D,
  Vector3,
} from 'three'
import type { AssetKey, AnimationClipName } from '../lib/gltf'
import { cloneScene, getAssetEntry, fitModelToConstraints } from '../lib/gltf'
import { ErrorBoundary } from './ErrorBoundary'

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
  /**
   * Callback when the model and animations are ready.
   *
   * The scene root is passed as the third argument so callers can verify
   * that each instance owns an independent object hierarchy.
   */
  onReady?: (mixer: AnimationMixer | null, clips: AnimationClip[], scene: Object3D) => void
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

  // One clone per instance. The cached GLTF is shared, the scene graph is not.
  const scene = useMemo(() => cloneScene(gltf.scene), [gltf])
  const mixerRef = useRef<AnimationMixer | null>(null)

  // Apply the fitted transform after load
  useEffect(() => {
    const fitted = fitModelToConstraints(bounds, fit)
    const root = scene
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
      // Idle, wave and cheer are meant to loop; the one-shot clips are not.
      // A one-shot action repeats once and then holds its final frame.
      const loopsForever = clipName !== 'jump' && clipName !== 'fall' && clipName !== 'death'
      action.setLoop(loopsForever ? LoopRepeat : LoopOnce, loopsForever ? Infinity : 1)
      action.clampWhenFinished = !loopsForever
      action.play()
    }

    onReady?.(mixer, clips, root)

    return () => {
      mixer?.stopAllAction()
      mixer?.uncacheRoot(root)
      if (mixerRef.current === mixer) mixerRef.current = null
    }
  }, [scene, gltf, bounds, fit, position, rotation, animation, defaultAnimation, playAnimation, castShadow, receiveShadow, onReady])

  // Animation update. The mixer is driven by the render loop of React Three
  // Fiber instead of a private `requestAnimationFrame` loop, so the animation
  // stays in step with the frame that is actually drawn and stops as soon as
  // the component unmounts.
  useFrame((_, delta) => {
    // The mixer is created in the effect above, which runs after the first
    // render, so it is looked up lazily here.
    const mixer = mixerRef.current
    if (!mixer) return
    mixer.update(delta)
  })

  return (
    <group>
      <primitive object={scene} />
    </group>
  )
}

/**
 * Suspense wrapper for GLTFModel that provides a procedural fallback.
 *
 * The error boundary is part of the component because a model can fail in two
 * different ways: the download can reject (handled by Suspense), or the
 * parsed scene can throw while it is mounted (handled by the boundary). In
 * both cases the fallback is rendered and the rest of the scene survives.
 */
export function GLTFModelWithFallback({
  asset,
  fallback,
  ...props
}: GLTFModelProps & { fallback?: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={fallback ?? null}>
      <Suspense fallback={fallback ?? null}>
        <GLTFModel asset={asset} {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

// Types and utilities are available directly from '@/lib/gltf'