import { useEffect, useMemo } from 'react'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three'
import {
  CHEDI_TERRACE,
  FAR_BANK_EDGE_Z,
  GROUND_Y,
  HOUSE_DECK,
  LAND_SLABS,
  PALETTE,
  PAVING_SLABS,
  PAVING_Y,
  PIER,
  RIVER_HALF_WIDTH,
  TEMPLE_PLATFORM,
} from './world'

interface LandmarksProps {
  reducedEffects: boolean
}

/** Depth of the land slabs; they reach below the water so the banks read solid. */
const LAND_DEPTH = 2

/** Centre of a slab on the XZ plane. */
function centerX(slab: { x0: number; x1: number }) {
  return (slab.x0 + slab.x1) / 2
}

function centerZ(slab: { z0: number; z1: number }) {
  return (slab.z0 + slab.z1) / 2
}

/**
 * The wat: a raised stone platform, a columned hall with a tiered roof and
 * the usual golden finial.
 */
function Temple() {
  const hallZ = -18.8
  const roofLayers = [
    { w: 8.6, d: 5.4, y: 5.35 },
    { w: 7.2, d: 4.4, y: 6.25 },
    { w: 5.6, d: 3.4, y: 7.05 },
  ]

  return (
    <group>
      {/* Stone platform under the hall. */}
      <mesh
        position={[
          (TEMPLE_PLATFORM.x0 + TEMPLE_PLATFORM.x1) / 2,
          (TEMPLE_PLATFORM.top - GROUND_Y) / 2 + GROUND_Y - 0.35,
          (TEMPLE_PLATFORM.z0 + TEMPLE_PLATFORM.z1) / 2,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            TEMPLE_PLATFORM.x1 - TEMPLE_PLATFORM.x0,
            TEMPLE_PLATFORM.top - GROUND_Y + 0.7,
            TEMPLE_PLATFORM.z1 - TEMPLE_PLATFORM.z0,
          ]}
        />
        <meshStandardMaterial color={PALETTE.templeStone} roughness={0.92} />
      </mesh>

      {/* Hall body. */}
      <mesh position={[-9, TEMPLE_PLATFORM.top + 1.5, hallZ]} castShadow receiveShadow>
        <boxGeometry args={[7.4, 3, 4.6]} />
        <meshStandardMaterial color={PALETTE.hall} roughness={0.8} />
      </mesh>

      {/* Glowing doors, visible on the river side. */}
      <mesh position={[-9, TEMPLE_PLATFORM.top + 1.1, hallZ + 2.32]}>
        <planeGeometry args={[2.2, 1.9]} />
        <meshBasicMaterial color={PALETTE.window} toneMapped={false} />
      </mesh>

      {/* Tiered roof. */}
      {roofLayers.map((layer, index) => (
        <mesh key={`roof-${index}`} position={[-9, layer.y, hallZ]} castShadow>
          <boxGeometry args={[layer.w, 0.9, layer.d]} />
          <meshStandardMaterial
            color={index === 0 ? PALETTE.roofDark : PALETTE.roof}
            roughness={0.7}
          />
        </mesh>
      ))}

      {/* Slender columns along the front. */}
      {[-12.2, -9, -5.8].map((x) => (
        <mesh key={`column-${x}`} position={[x, TEMPLE_PLATFORM.top + 1.4, hallZ + 2.5]} castShadow>
          <cylinderGeometry args={[0.16, 0.19, 2.8, 10]} />
          <meshStandardMaterial color={PALETTE.gold} roughness={0.5} metalness={0.35} />
        </mesh>
      ))}

      {/* Golden finial on the roof ridge. */}
      <mesh position={[-9, 8.2, hallZ]} castShadow>
        <coneGeometry args={[0.7, 1.9, 8]} />
        <meshStandardMaterial color={PALETTE.gold} roughness={0.4} metalness={0.2} />
      </mesh>
    </group>
  )
}

/**
 * The riverside itself: two banks, the paved promenades and the quay walls
 * that separate the stone from the water.
 */
function Ground() {
  return (
    <group>
      {LAND_SLABS.map((slab, index) => (
        <mesh
          key={`land-${index}`}
          position={[centerX(slab), (slab.top - LAND_DEPTH) / 2, centerZ(slab)]}
          receiveShadow
        >
          <boxGeometry args={[slab.x1 - slab.x0, slab.top + LAND_DEPTH, slab.z1 - slab.z0]} />
          <meshStandardMaterial color={PALETTE.bank} roughness={0.95} metalness={0} />
        </mesh>
      ))}

      {PAVING_SLABS.map((slab, index) => (
        <mesh
          key={`paving-${index}`}
          position={[centerX(slab), (GROUND_Y + PAVING_Y) / 2 - 0.02, centerZ(slab)]}
          receiveShadow
        >
          <boxGeometry args={[slab.x1 - slab.x0, PAVING_Y - GROUND_Y + 0.04, slab.z1 - slab.z0]} />
          <meshStandardMaterial color={PALETTE.paving} roughness={0.88} metalness={0.02} />
        </mesh>
      ))}

      {/* Quay walls along every water edge. */}
      <mesh position={[-RIVER_HALF_WIDTH - 0.15, GROUND_Y / 2, 0.5]} receiveShadow>
        <boxGeometry args={[0.3, GROUND_Y + LAND_DEPTH, 24]} />
        <meshStandardMaterial color={PALETTE.terrace} roughness={0.9} />
      </mesh>
      <mesh position={[RIVER_HALF_WIDTH + 0.15, GROUND_Y / 2, 0.5]} receiveShadow>
        <boxGeometry args={[0.3, GROUND_Y + LAND_DEPTH, 24]} />
        <meshStandardMaterial color={PALETTE.terrace} roughness={0.9} />
      </mesh>
      <mesh position={[0, GROUND_Y / 2, FAR_BANK_EDGE_Z - 0.15]} receiveShadow>
        <boxGeometry args={[RIVER_HALF_WIDTH * 2 + 0.6, GROUND_Y + LAND_DEPTH, 0.3]} />
        <meshStandardMaterial color={PALETTE.terrace} roughness={0.9} />
      </mesh>
    </group>
  )
}

/** The golden chedi on its stone terrace. */
function Chedi() {
  const cx = (CHEDI_TERRACE.x0 + CHEDI_TERRACE.x1) / 2
  const cz = (CHEDI_TERRACE.z0 + CHEDI_TERRACE.z1) / 2

  return (
    <group>
      {/* Terrace. */}
      <mesh
        position={[
          cx,
          (CHEDI_TERRACE.top - GROUND_Y) / 2 + GROUND_Y - 0.3,
          cz,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            CHEDI_TERRACE.x1 - CHEDI_TERRACE.x0,
            CHEDI_TERRACE.top - GROUND_Y + 0.6,
            CHEDI_TERRACE.z1 - CHEDI_TERRACE.z0,
          ]}
        />
        <meshStandardMaterial color={PALETTE.templeStone} roughness={0.9} />
      </mesh>

      {/* Bell-shaped body, built from stacked tapering cylinders.
          The gold is kept mostly dielectric on purpose. A high metalness
          looks right only when there is an environment map to reflect, and
          this scene has none, so a metallic surface would swallow the
          moonlight and the chedi would read as a black cut-out. */}
      <mesh position={[cx, CHEDI_TERRACE.top + 1.5, cz]} castShadow>
        <cylinderGeometry args={[0.95, 1.7, 3, 16]} />
        <meshStandardMaterial color={PALETTE.gold} roughness={0.42} metalness={0.18} />
      </mesh>
      <mesh position={[cx, CHEDI_TERRACE.top + 3.3, cz]} castShadow>
        <cylinderGeometry args={[0.55, 0.95, 0.7, 16]} />
        <meshStandardMaterial color={PALETTE.goldDeep} roughness={0.44} metalness={0.16} />
      </mesh>

      {/* Spire. */}
      <mesh position={[cx, CHEDI_TERRACE.top + 4.5, cz]} castShadow>
        <coneGeometry args={[0.42, 1.9, 10]} />
        <meshStandardMaterial color={PALETTE.gold} roughness={0.38} metalness={0.18} />
      </mesh>

      {/* Small guardian bells at the four corners. */}
      {[
        [CHEDI_TERRACE.x0 + 0.7, CHEDI_TERRACE.z0 + 0.7],
        [CHEDI_TERRACE.x1 - 0.7, CHEDI_TERRACE.z0 + 0.7],
        [CHEDI_TERRACE.x0 + 0.7, CHEDI_TERRACE.z1 - 0.7],
        [CHEDI_TERRACE.x1 - 0.7, CHEDI_TERRACE.z1 - 0.7],
      ].map(([x, z]) => (
        <mesh key={`bell-${x}-${z}`} position={[x, CHEDI_TERRACE.top + 0.5, z]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <meshStandardMaterial color={PALETTE.goldDeep} roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/** A traditional teak house on stilts, standing in the water near the bank. */
function StiltHouse() {
  const cx = (HOUSE_DECK.x0 + HOUSE_DECK.x1) / 2
  const cz = (HOUSE_DECK.z0 + HOUSE_DECK.z1) / 2

  return (
    <group>
      {/* Stilts down into the water. */}
      {[HOUSE_DECK.x0 + 0.4, HOUSE_DECK.x1 - 0.4].flatMap((x) =>
        [HOUSE_DECK.z0 + 0.4, HOUSE_DECK.z1 - 0.4].map((z) => (
          <mesh key={`stilt-${x}-${z}`} position={[x, (HOUSE_DECK.top - 1.6) / 2, z]} castShadow>
            <cylinderGeometry args={[0.16, 0.18, HOUSE_DECK.top + 1.6, 8]} />
            <meshStandardMaterial color={PALETTE.woodDark} roughness={0.9} />
          </mesh>
        )),
      )}

      {/* Deck. */}
      <mesh position={[cx, HOUSE_DECK.top - 0.12, cz]} castShadow receiveShadow>
        <boxGeometry
          args={[
            HOUSE_DECK.x1 - HOUSE_DECK.x0,
            0.24,
            HOUSE_DECK.z1 - HOUSE_DECK.z0,
          ]}
        />
        <meshStandardMaterial color={PALETTE.wood} roughness={0.85} />
      </mesh>

      {/* Walls. */}
      <mesh position={[cx, HOUSE_DECK.top + 1.1, cz]} castShadow receiveShadow>
        <boxGeometry args={[HOUSE_DECK.x1 - HOUSE_DECK.x0 - 0.4, 2.2, HOUSE_DECK.z1 - HOUSE_DECK.z0 - 0.4]} />
        <meshStandardMaterial color={PALETTE.hall} roughness={0.82} />
      </mesh>

      {/* Warm light from the windows. */}
      <mesh position={[cx, HOUSE_DECK.top + 1.2, cz + (HOUSE_DECK.z1 - HOUSE_DECK.z0) / 2 - 0.18]}>
        <planeGeometry args={[2.4, 0.9]} />
        <meshBasicMaterial color={PALETTE.window} toneMapped={false} />
      </mesh>

      {/* Steep gabled roof. */}
      <mesh position={[cx, HOUSE_DECK.top + 2.65, cz]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry
          args={[(HOUSE_DECK.x1 - HOUSE_DECK.x0) / 2 + 0.5, 1.5, 4]}
        />
        <meshStandardMaterial color={PALETTE.roof} roughness={0.7} />
      </mesh>
    </group>
  )
}

/** The wooden pier the krathongs are launched from. */
function Pier() {
  const cz = (PIER.z0 + PIER.z1) / 2

  return (
    <group>
      {/* Deck planks. */}
      {Array.from({ length: 8 }, (_, index) => (
        <mesh
          key={`plank-${index}`}
          position={[PIER.x0 + 0.35 + index * ((PIER.x1 - PIER.x0 - 0.7) / 7), PIER.top - 0.06, cz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[(PIER.x1 - PIER.x0 - 0.7) / 7 - 0.04, 0.12, PIER.z1 - PIER.z0]} />
          <meshStandardMaterial color={PALETTE.woodLight} roughness={0.9} />
        </mesh>
      ))}

      {/* Support posts. */}
      {[PIER.x0 + 0.4, PIER.x1 - 0.4].map((x) =>
        [PIER.z0 + 0.3, PIER.z1 - 0.3].map((z) => (
          <mesh key={`post-${x}-${z}`} position={[x, (PIER.top - 1.4) / 2, z]} castShadow>
            <cylinderGeometry args={[0.14, 0.16, PIER.top + 1.4, 8]} />
            <meshStandardMaterial color={PALETTE.woodDark} roughness={0.9} />
          </mesh>
        )),
      )}

      {/* Two lanterns at the pier head. */}
      {[PIER.x0 + 0.7, PIER.x1 - 0.7].map((x) => (
        <group key={`pier-lantern-${x}`} position={[x, PIER.top + 1.5, PIER.z1 - 0.35]}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 0.42, 8]} />
            <meshBasicMaterial color={PALETTE.lantern} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <coneGeometry args={[0.2, 0.18, 8]} />
            <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Paints a soft radial falloff used by the moon halo and the lantern glows. */
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

/** Paper lanterns strung above the promenades. */
function Lanterns({ reducedEffects }: LandmarksProps) {
  const glow = useMemo(() => {
    const texture = new CanvasTexture(createGlowCanvas())
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [])

  // CanvasTexture is not owned by a declarative material, so release the GPU
  // copy explicitly when the landmark group unmounts.
  useEffect(() => {
    return () => {
      glow.dispose()
    }
  }, [glow])

  const strands = useMemo(() => {
    const result: {
      x: number
      z: number
      y: number
      color: string
      scale: number
    }[] = []

    // A strand runs across the river, anchored on both promenades.
    for (const z of [-6, -1, 4, 9]) {
      const count = 9
      for (let index = 0; index < count; index += 1) {
        const t = index / (count - 1)
        const x = -9 + t * 18
        // Catenary-ish sag across the span.
        const sag = Math.sin(t * Math.PI) * 0.9
        result.push({
          x,
          z,
          y: 4.6 - sag,
          color: index % 3 === 0 ? PALETTE.lanternGlow : PALETTE.skyLantern,
          scale: 0.85 + (index % 3) * 0.12,
        })
      }
    }
    return result
  }, [])

  return (
    <group>
      {strands.map((lantern, index) => (
        <group key={`lantern-${index}`} position={[lantern.x, lantern.y, lantern.z]}>
          <mesh>
            <cylinderGeometry args={[0.17, 0.17, 0.4, 8]} />
            <meshBasicMaterial color={lantern.color} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <coneGeometry args={[0.19, 0.16, 8]} />
            <meshStandardMaterial color={PALETTE.woodDark} roughness={0.8} />
          </mesh>
          {!reducedEffects && (
            <sprite scale={[1.5, 1.5, 1]}>
              <spriteMaterial
                map={glow}
                color={lantern.color}
                transparent
                opacity={0.4}
                depthWrite={false}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </sprite>
          )}
        </group>
      ))}
    </group>
  )
}

/** Everything that builds the riverside skyline. */
export function Landmarks({ reducedEffects }: LandmarksProps) {
  return (
    <group>
      <Ground />
      <Temple />
      <Chedi />
      <StiltHouse />
      <Pier />
      <Lanterns reducedEffects={reducedEffects} />
    </group>
  )
}
