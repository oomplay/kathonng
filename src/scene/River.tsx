import { useMemo } from 'react'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { createWaterNormalTexture } from './water'

interface RiverProps {
  reducedEffects: boolean
}

/**
 * The river surface.
 *
 * Reflections come from `MeshReflectorMaterial`; in reduced-effects mode the
 * expensive reflection pass is swapped for a cheap translucent plane.
 */
export function River({ reducedEffects }: RiverProps) {
  const normalMap = useMemo(() => createWaterNormalTexture(256), [])
  const normalScale = useMemo(() => new THREE.Vector2(0.6, 0.6), [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 90, 1, 1]} />
        {reducedEffects ? (
          <meshStandardMaterial color="#0b2039" roughness={0.55} metalness={0.35} />
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
            color="#123252"
            normalMap={normalMap}
            normalScale={normalScale}
          />
        )}
      </mesh>

      {/* Riverbank silhouettes for depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[15, 46, 48]} />
        <meshStandardMaterial color="#081426" roughness={1} metalness={0} />
      </mesh>
    </group>
  )
}
