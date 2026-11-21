import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { KrathongRow } from '../types/db'
import type { Placement } from '../lib/layout'
import { getStyle } from '../lib/styles'
import { shade, withAlpha } from '../lib/color'

interface KrathongProps {
  krathong: KrathongRow
  /** The slot this float occupies on the river. */
  placement: Placement
  selected: boolean
  reducedEffects: boolean
  /** Cheap tier for software renderers: no per-float light or halo. */
  degraded: boolean
  onSelect: (id: string) => void
}

/** A single floating krathong with its candle, glow and gentle bobbing. */
export function Krathong({
  krathong,
  placement,
  selected,
  reducedEffects,
  degraded,
  onSelect,
}: KrathongProps) {
  const groupRef = useRef<THREE.Group>(null)
  const flameRef = useRef<THREE.PointLight>(null)
  const haloRef = useRef<THREE.Mesh>(null)

  const style = getStyle(krathong.style_id)

  // The chosen colour tints the float while the style keeps its identity.
  const bodyColor = useMemo(() => shade(krathong.color_hex, -0.08), [krathong.color_hex])
  const petalColor = useMemo(() => shade(style.trimColor, -0.05), [style.trimColor])

  useFrame((state) => {
    const group = groupRef.current
    if (!group) return

    const time = state.clock.elapsedTime
    const bob = reducedEffects ? 0 : Math.sin(time * placement.bobSpeed + placement.phase)
    const sway = reducedEffects
      ? 0
      : Math.cos(time * placement.bobSpeed * 0.7 + placement.phase) * 0.06

    group.position.y = 0.18 + bob * 0.09
    group.rotation.z = sway
    group.rotation.y =
      placement.rotationY +
      (reducedEffects ? 0 : Math.sin(time * 0.3 + placement.phase) * 0.05)

    if (flameRef.current && !reducedEffects) {
      const flicker = 1 + Math.sin(time * 9 + placement.phase) * 0.12
      flameRef.current.intensity = 1.15 * flicker
    }

    if (haloRef.current && !reducedEffects) {
      const pulse = 1 + Math.sin(time * 2.2 + placement.phase) * 0.08
      haloRef.current.scale.setScalar(pulse)
    }
  })

  const petals = Array.from({ length: style.petals }, (_, petal) => petal)

  return (
    <group
      ref={groupRef}
      position={placement.position}
      scale={style.scale * (selected ? 1.12 : 1)}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(krathong.id)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {/* Invisible tap target.
          The visible float is only ~1.2 units wide, which is a small target on
          a phone. This fully transparent sphere is still raycast by three.js
          but draws nothing, so the whole halo around the float is tappable. */}
      <mesh
        position={[0, 0.3, 0]}
        onClick={(event) => {
          event.stopPropagation()
          onSelect(krathong.id)
        }}
      >
        <sphereGeometry args={[0.95, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Hull */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.42, 0.34, 24]} />
        <meshStandardMaterial color={bodyColor} roughness={0.72} metalness={0.08} />
      </mesh>

      {/* Upper rim.
          A torus is built in the XY plane, so without this rotation it stands
          upright like a basket handle. Laying it flat makes it read as the
          rim of the float. */}
      <mesh
        position={[0, 0.18, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[0.6, 0.055, 10, 28]} />
        <meshStandardMaterial color={petalColor} roughness={0.5} metalness={0.16} />
      </mesh>

      {/* Style-specific petals / ribs */}
      {petals.map((petal) => {
        const angle = (petal / petals.length) * Math.PI * 2
        return (
          <mesh
            key={petal}
            position={[Math.cos(angle) * 0.58, 0.12, Math.sin(angle) * 0.58]}
            rotation={[0, -angle, Math.PI / 2.35]}
            castShadow
          >
            <boxGeometry args={[0.3, 0.05, 0.16]} />
            <meshStandardMaterial
              color={petalColor}
              roughness={0.55}
              metalness={style.id === 'golden' ? 0.55 : 0.1}
              emissive={style.id === 'neon' ? style.glowColor : '#000000'}
              emissiveIntensity={style.id === 'neon' ? 0.55 : 0}
            />
          </mesh>
        )
      })}

      {/* Lotus crown for the lotus style */}
      {style.id === 'lotus' && (
        <group position={[0, 0.26, 0]}>
          {Array.from({ length: 8 }, (_, petal) => {
            const angle = (petal / 8) * Math.PI * 2
            return (
              <mesh
                key={petal}
                position={[Math.cos(angle) * 0.22, 0, Math.sin(angle) * 0.22]}
                rotation={[0, -angle, 0.42]}
                castShadow
              >
                <sphereGeometry args={[0.16, 12, 10]} />
                <meshStandardMaterial color={style.trimColor} roughness={0.42} />
              </mesh>
            )
          })}
        </group>
      )}

      {/* Golden tier */}
      {style.id === 'golden' && (
        <mesh position={[0, 0.3, 0]} castShadow>
          <coneGeometry args={[0.34, 0.3, 16]} />
          <meshStandardMaterial
            color={style.trimColor}
            roughness={0.24}
            metalness={0.85}
            emissive={style.glowColor}
            emissiveIntensity={0.18}
          />
        </mesh>
      )}

      {/* Neon core ring */}
      {style.id === 'neon' && (
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.44, 0.035, 8, 32]} />
          <meshStandardMaterial
            color={style.glowColor}
            emissive={style.glowColor}
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Candle */}
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.085, 0.3, 12]} />
        <meshStandardMaterial color="#f7efe0" roughness={0.85} />
      </mesh>

      {/* Flame */}
      <mesh position={[0, 0.56, 0]}>
        <sphereGeometry args={[0.062, 12, 12]} />
        <meshBasicMaterial color={style.glowColor} toneMapped={false} />
      </mesh>

      {!degraded && (
        <pointLight
          ref={flameRef}
          position={[0, 0.6, 0]}
          color={style.glowColor}
          intensity={reducedEffects ? 1.0 : 1.15}
          distance={3.6}
          decay={2}
        />
      )}

      {/* Soft halo on the water.
          Kept deliberately faint. The reflective river already catches the
          candle, so a stronger additive disc stacks on top of that reflection
          and blows the near floats out to white. */}
      {!degraded && (
        <mesh ref={haloRef} position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.85, 32]} />
          <meshBasicMaterial
            color={style.glowColor}
            transparent
            opacity={selected ? 0.22 : 0.1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Selection ring: a bright outer ring plus a soft inner glow, so the
          selected float is obvious even against the candle light. */}
      {selected && (
        <>
          <mesh position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.92, 1.06, 48]} />
            <meshBasicMaterial
              color={withAlpha(style.glowColor, 0.95)}
              transparent
              opacity={0.95}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.12, 1.3, 48]} />
            <meshBasicMaterial
              color={withAlpha(style.glowColor, 0.5)}
              transparent
              opacity={0.5}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </>
      )}
    </group>
  )
}

