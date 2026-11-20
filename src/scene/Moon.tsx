import { useMemo } from 'react'
import * as THREE from 'three'

interface MoonProps {
  reducedEffects: boolean
}

/** Position of the moon in the sky, above the far bank. */
const MOON_POSITION: [number, number, number] = [-17, 15, -38]

/** Paints a soft radial falloff used by the moon halo and the reflection. */
function createGlowCanvas(): HTMLCanvasElement {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return canvas

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  )
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.35, 'rgba(255,240,210,0.55)')
  gradient.addColorStop(1, 'rgba(255,220,170,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  return canvas
}

/**
 * The full moon over the far bank, plus its shimmering reflection on the
 * river. The reflection is a stretched additive plane just above the water.
 */
export function Moon({ reducedEffects }: MoonProps) {
  const glow = useMemo(() => {
    const texture = new THREE.CanvasTexture(createGlowCanvas())
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])

  return (
    <group>
      <group position={MOON_POSITION}>
        <mesh>
          <sphereGeometry args={[3.1, 32, 24]} />
          <meshBasicMaterial color="#fff6df" toneMapped={false} fog={false} />
        </mesh>
        <sprite scale={[16, 16, 1]}>
          <spriteMaterial
            map={glow}
            color="#ffe9bd"
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            fog={false}
          />
        </sprite>
      </group>

      {/* Reflection: a soft vertical streak lying flat on the water. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[MOON_POSITION[0] * 0.25, 0.03, -12]}
        renderOrder={2}
      >
        <planeGeometry args={[7, 26]} />
        <meshBasicMaterial
          map={glow}
          color="#ffe6b8"
          transparent
          opacity={reducedEffects ? 0.16 : 0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
