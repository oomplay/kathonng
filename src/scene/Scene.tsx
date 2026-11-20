import { Suspense, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import type { KrathongRow } from '../types/db'
import { CameraRig } from './CameraRig'
import { Krathong } from './Krathong'
import { Landmarks } from './Landmarks'
import { Moon } from './Moon'
import { River } from './River'
import { Visitors } from './Visitors'

interface SceneProps {
  krathongs: KrathongRow[]
  selectedId: string | null
  reducedEffects: boolean
  onSelect: (id: string) => void
  /** Called when the camera leaves or returns to its home framing. */
  onCameraMoved?: (moved: boolean) => void
  /** Called with a reset function so the UI can trigger it. */
  onCameraResetReady?: (reset: () => void) => void
}

/** The 3D river with every krathong floating on it. */
export function Scene({
  krathongs,
  selectedId,
  reducedEffects,
  onSelect,
  onCameraMoved,
  onCameraResetReady,
}: SceneProps) {
  // Only the first rows are rendered so the scene stays responsive.
  const visible = useMemo(() => krathongs.slice(0, 40), [krathongs])

  // The camera rig reports back when the view is no longer the home framing.
  const handleCameraMoved = useCallback(
    (moved: boolean) => {
      onCameraMoved?.(moved)
    },
    [onCameraMoved],
  )

  return (
    <Canvas
      shadows
      dpr={reducedEffects ? [1, 1] : [1, 1.75]}
      camera={{ position: [0, 5.4, 13.5], fov: 45, near: 0.1, far: 120 }}
      gl={{ antialias: !reducedEffects, powerPreference: 'high-performance' }}
      onPointerMissed={() => onSelect('')}
    >
      <color attach="background" args={['#050b18']} />
      <fog attach="fog" args={['#050b18', 18, 46]} />

      <ambientLight intensity={0.55} color="#8fb4ff" />
      <hemisphereLight intensity={0.5} color="#9dc4ff" groundColor="#04070f" />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.1}
        color="#fff0d6"
        castShadow={!reducedEffects}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-9, 7, -6]} intensity={22} color="#3b6cff" distance={34} />
      <pointLight position={[9, 6, 4]} intensity={16} color="#ff7a4d" distance={30} />

      {!reducedEffects && <Stars radius={60} depth={30} count={900} factor={2.4} fade speed={0.4} />}

      <Suspense fallback={null}>
        <Landmarks reducedEffects={reducedEffects} />
        <Moon reducedEffects={reducedEffects} />
        <River reducedEffects={reducedEffects} />
        <Visitors reducedEffects={reducedEffects} />
        {visible.map((krathong, index) => (
          <Krathong
            key={krathong.id}
            krathong={krathong}
            index={index}
            selected={krathong.id === selectedId}
            reducedEffects={reducedEffects}
            onSelect={onSelect}
          />
        ))}
      </Suspense>

      <CameraRig
        reducedEffects={reducedEffects}
        onReady={onCameraResetReady}
        onMove={handleCameraMoved}
      />
    </Canvas>
  )
}
