import { useMemo } from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { createWaterNormalTexture } from './water'

interface RiverProps {
  reducedEffects: boolean
  /** Cheap tier for software renderers: no reflection pass at all. */
  degraded: boolean
}

/**
 * The river surface.
 *
 * Reflections come from `MeshReflectorMaterial`; in reduced-effects mode the
 * expensive reflection pass is swapped for a cheap translucent plane.
 */
export function River({ reducedEffects, degraded }: RiverProps) {
  // The normal map is only needed by the reflective material.
  const normalMap = useMemo(
    () => (reducedEffects || degraded ? null : createWaterNormalTexture(256)),
    [reducedEffects, degraded],
  )
  const normalScale = useMemo(() => new THREE.Vector2(0.6, 0.6), [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 90, 1, 1]} />
        {reducedEffects || degraded ? (
          <meshStandardMaterial color="#0b1430" roughness={0.55} metalness={0.35} />
        ) : (
          <MeshReflectorMaterial
            resolution={256}
            mixBlur={1}
            mixStrength={2.2}
            blur={[280, 90]}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.35}
            roughness={0.92}
            metalness={0.35}
            color="#122048"
            normalMap={normalMap}
            normalScale={normalScale}
          />
        )}
      </mesh>

      {/* Riverbank silhouettes for depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[15, 46, 48]} />
        <meshStandardMaterial color="#070d1f" roughness={1} metalness={0} />
      </mesh>
    </group>
  )
}
