// Must be evaluated before React Three Fiber is imported: it installs a narrow
// Three.js warning filter. This import lives at the top of the lazy scene
// chunk so that `three` never enters the initial bundle.
import '../lib/threeConsole'
import { Suspense, useCallback, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { PCFShadowMap } from 'three'
import type { KrathongRow } from '../types/db'
import { layoutKrathongs } from '../lib/layout'
import { CameraRig } from './CameraRig'
import { Krathong } from './Krathong'
import { Landmarks } from './Landmarks'
import { Moon } from './Moon'
import { River } from './River'
import { Visitors } from './Visitors'
import { FpsMonitor, type RenderQuality } from './quality'

interface SceneProps {
  krathongs: KrathongRow[]
  selectedId: string | null
  reducedEffects: boolean
  /** Rendering tier; `degraded` trades effects for frame rate. */
  quality: RenderQuality
  onSelect: (id: string) => void
  /** Called when the camera leaves or returns to its home framing. */
  onCameraMoved?: (moved: boolean) => void
  /** Called with a reset function so the UI can trigger it. */
  onCameraResetReady?: (reset: () => void) => void
  /** Called with a function that flies the camera to a krathong by id. */
  onCameraFocusReady?: (focus: (id: string) => void) => void
  /** Called when the scene measures a sustained low frame rate. */
  onLowPerformance?: () => void
}

/**
 * Krathongs rendered in the degraded tier.
 *
 * The cheap tier drops the expensive per-float lighting and halos, not the
 * floats themselves: all twenty still have to be on the river, otherwise the
 * two quality tiers would show a different scene.
 */

/** Krathongs rendered in the full tier. */
const FULL_KRATHONG_COUNT = 40

/**
 * Watches the frame rate and reports a sustained slowdown.
 *
 * Hidden tabs are ignored: the browser throttles their timers, so their frame
 * times say nothing about how heavy the scene is.
 */
function FrameRateWatchdog({ onLowPerformance }: { onLowPerformance?: () => void }) {
  const monitor = useRef(new FpsMonitor())
  const lastTime = useRef(0)
  const reported = useRef(false)

  useFrame((state) => {
    const now = state.clock.elapsedTime
    const previous = lastTime.current
    lastTime.current = now

    if (document.visibilityState !== 'visible') {
      monitor.current.reset()
      return
    }

    if (previous === 0) return

    const frameTime = (now - previous) * 1000
    if (monitor.current.add(frameTime) && !reported.current) {
      reported.current = true
      onLowPerformance?.()
    }
  })

  return null
}

/** The 3D river with every krathong floating on it. */
export function Scene({
  krathongs,
  selectedId,
  reducedEffects,
  quality,
  onSelect,
  onCameraMoved,
  onCameraResetReady,
  onCameraFocusReady,
  onLowPerformance,
}: SceneProps) {
  const degraded = quality === 'degraded'

  // Every krathong gets a slot on the river, and the slots are handed out in
  // a stable id order. The cheap tier renders the same floats as the rich
  // one, so switching tiers never changes which krathongs are on the water.
  const placements = useMemo(
    () => layoutKrathongs(krathongs.map((krathong) => krathong.id)),
    [krathongs],
  )

  const visible = useMemo(
    () => krathongs.slice(0, FULL_KRATHONG_COUNT),
    [krathongs],
  )

  // World positions of the rendered krathongs, so the camera can fly to one.
  const krathongPositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    visible.forEach((krathong) => {
      const placement = placements.get(krathong.id)
      if (placement) map.set(krathong.id, placement.position)
    })
    return map
  }, [visible, placements])

  // The camera rig reports back when the view is no longer the home framing.
  const handleCameraMoved = useCallback(
    (moved: boolean) => {
      onCameraMoved?.(moved)
    },
    [onCameraMoved],
  )

  return (
    <Canvas
      // `PCFSoftShadowMap` was removed in Three r187 and falls back with a
      // warning, so the shadow type is pinned explicitly.
      shadows={degraded ? false : { type: PCFShadowMap }}
      dpr={degraded ? 1 : reducedEffects ? [1, 1] : [1, 1.75]}
      camera={{ position: [0, 8.39, 26.25], fov: 47.1, near: 0.1, far: 120 }}
      gl={{ antialias: !reducedEffects && !degraded, powerPreference: 'high-performance' }}
      onPointerMissed={() => onSelect('')}
    >
      <color attach="background" args={['#04070f']} />
      {/* Fog range.
          The camera now sits 26 units back from the look-at point, which puts
          the temple about 46 units away and the chedi about 45. The old
          18/46 range ended exactly on the far bank, so both landmarks were
          painted in the background colour and disappeared. Starting the haze
          behind the float field and ending it well beyond the far bank keeps
          the depth cue on the water while letting the skyline read. */}
      <fog attach="fog" args={['#04070f', 28, 100]} />

      <ambientLight intensity={0.55} color="#8fb4ff" />
      <hemisphereLight intensity={0.5} color="#9dc4ff" groundColor="#04070f" />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.1}
        color="#fff0d6"
        castShadow={!reducedEffects && !degraded}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Moonlight from behind the far bank.
          The landmarks face the camera across 45 units of water, so they are
          lit mostly by the sky rather than by the lights down on the river.
          Without this they stay in silhouette even once the fog is fixed. */}
      <directionalLight
        position={[-4, 16, -26]}
        intensity={0.9}
        color="#b9d0ff"
      />
      {!degraded && (
        <>
          <pointLight position={[-9, 7, -6]} intensity={22} color="#3b6cff" distance={34} />
          <pointLight position={[9, 6, 4]} intensity={16} color="#ffb43f" distance={30} />
        </>
      )}

      {!reducedEffects && !degraded && (
        <Stars radius={60} depth={30} count={900} factor={2.4} fade speed={0.4} />
      )}

      <Suspense fallback={null}>
        <Landmarks reducedEffects={reducedEffects} />
        <Moon reducedEffects={reducedEffects} />
        <River reducedEffects={reducedEffects} degraded={degraded} />
        <Visitors reducedEffects={reducedEffects} degraded={degraded} />
        {visible.map((krathong) => {
          const placement = placements.get(krathong.id)
          if (!placement) return null
          return (
            <Krathong
              key={krathong.id}
              krathong={krathong}
              placement={placement}
              selected={krathong.id === selectedId}
              reducedEffects={reducedEffects}
              degraded={degraded}
              onSelect={onSelect}
            />
          )
        })}
      </Suspense>

      <FrameRateWatchdog onLowPerformance={onLowPerformance} />

      <CameraRig
        reducedEffects={reducedEffects}
        onReady={onCameraResetReady}
        onMove={handleCameraMoved}
        onFocusReady={onCameraFocusReady}
        krathongPositions={krathongPositions}
      />
    </Canvas>
  )
}
