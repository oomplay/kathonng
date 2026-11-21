import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Object3D,
  SphereGeometry,
} from 'three'
import {
  compilePath,
  HAIR_COLORS,
  PALETTE,
  SARONG_COLORS,
  SHIRT_COLORS,
  SKIN_COLORS,
  TROUSER_COLORS,
  VISITOR_PATHS,
} from './world'

interface VisitorsProps {
  reducedEffects: boolean
  /** Cheap tier for software renderers: fewer visitors in the crowd. */
  degraded: boolean
}

/** Total number of visitors in the scene. */
const VISITOR_COUNT = 20

/** Number of visitors drawn in the degraded tier. */
const DEGRADED_VISITOR_COUNT = 6

/** Walking speed in units per second. */
const WALK_SPEED = 0.55

interface Visitor {
  path: ReturnType<typeof compilePath>
  /** Walking surface height for this visitor's route. */
  groundY: number
  /** Offset along the path where this visitor starts. */
  phase: number
  /** Lateral offset so visitors do not walk in a single file. */
  lane: number
  shirt: string
  sarong: string
  skin: string
  hair: string
  trousers: string
  /** Height multiplier, so the crowd is not perfectly uniform. */
  scale: number
}

/**
 * Builds the crowd: every visitor gets a route, a lane offset and a stable
 * festival outfit. The order is deterministic so the scene never reshuffles
 * between renders.
 */
function buildVisitors(count: number): Visitor[] {
  const visitors: Visitor[] = []
  const seed = (index: number, salt: number) => {
    // Small deterministic hash so colours stay stable across reloads.
    const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
    return value - Math.floor(value)
  }

  let index = 0
  for (const route of VISITOR_PATHS) {
    const path = compilePath(route.points)
    for (let slot = 0; slot < route.capacity && index < count; slot += 1) {
      const r1 = seed(index, 1)
      const r2 = seed(index, 2)
      const r3 = seed(index, 3)
      const r4 = seed(index, 4)
      const r5 = seed(index, 5)
      visitors.push({
        path,
        groundY: route.groundY,
        phase: (slot / route.capacity) * path.length + r1 * 1.5,
        lane: (r2 - 0.5) * 0.7,
        shirt: SHIRT_COLORS[Math.floor(r3 * SHIRT_COLORS.length) % SHIRT_COLORS.length],
        sarong: SARONG_COLORS[Math.floor(r4 * SARONG_COLORS.length) % SARONG_COLORS.length],
        skin: SKIN_COLORS[Math.floor(r5 * SKIN_COLORS.length) % SKIN_COLORS.length],
        hair: HAIR_COLORS[index % HAIR_COLORS.length],
        trousers: TROUSER_COLORS[index % TROUSER_COLORS.length],
        scale: 0.92 + seed(index, 6) * 0.16,
      })
      index += 1
    }
  }

  return visitors
}

/**
 * The body parts every visitor is built from.
 *
 * `pivot` is the joint the part rotates around (in visitor-local space) and
 * `offset` is the centre of the geometry relative to that pivot.
 */
interface PartSpec {
  pivot: [number, number, number]
  offset: [number, number, number]
  geometry: BufferGeometry
}

function buildParts(): PartSpec[] {
  const torso = new CylinderGeometry(0.19, 0.23, 0.52, 10)
  torso.translate(0, 0, 0)

  const sarong = new CylinderGeometry(0.24, 0.3, 0.55, 12)

  const head = new SphereGeometry(0.16, 14, 12)

  const hair = new SphereGeometry(0.168, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62)

  const arm = new CylinderGeometry(0.055, 0.05, 0.58, 7)

  const leg = new CylinderGeometry(0.07, 0.06, 0.82, 8)

  const lantern = new CylinderGeometry(0.075, 0.075, 0.2, 8)

  return [
    { pivot: [0, 1.34, 0], offset: [0, 0, 0], geometry: torso },
    { pivot: [0, 0.86, 0], offset: [0, 0, 0], geometry: sarong },
    { pivot: [0, 1.72, 0], offset: [0, 0, 0], geometry: head },
    { pivot: [0, 1.73, 0], offset: [0, 0.015, 0], geometry: hair },
    { pivot: [-0.235, 1.52, 0], offset: [0, -0.29, 0], geometry: arm },
    { pivot: [0.235, 1.52, 0], offset: [0, -0.29, 0], geometry: arm },
    { pivot: [-0.1, 0.82, 0], offset: [0, -0.41, 0], geometry: leg },
    { pivot: [0.1, 0.82, 0], offset: [0, -0.41, 0], geometry: leg },
    { pivot: [0.3, 1.0, 0.26], offset: [0, 0, 0], geometry: lantern },
  ]
}

/** Which colour each part index wears. */
const PART_COLOR_SOURCE = [
  'shirt',
  'sarong',
  'skin',
  'hair',
  'skin',
  'skin',
  'trousers',
  'trousers',
] as const

const ARM_LEFT = 4
const ARM_RIGHT = 5
const LEG_LEFT = 6
const LEG_RIGHT = 7
/** Index of the candle each visitor carries. */
const LANTERN_PART = 8

/**
 * The festival crowd: exactly twenty visitors walking their routes.
 *
 * Every body part of every visitor is drawn by one instanced mesh per part,
 * so the whole crowd costs nine draw calls instead of a hundred and eighty.
 */
export function Visitors({ reducedEffects, degraded }: VisitorsProps) {
  const visitorCount = degraded ? DEGRADED_VISITOR_COUNT : VISITOR_COUNT
  const visitors = useMemo(() => buildVisitors(visitorCount), [visitorCount])
  const parts = useMemo(() => buildParts(), [])

  const meshes = useRef<(InstancedMesh | null)[]>([])
  const dummy = useMemo(() => new Object3D(), [])
  const color = useMemo(() => new Color(), [])

  // These geometries are passed as instancedMesh args, so React Three Fiber
  // does not dispose them automatically. Release every part on unmount.
  useEffect(() => {
    return () => {
      for (const part of parts) part.geometry.dispose()
    }
  }, [parts])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const motion = reducedEffects ? 0 : 1

    for (let index = 0; index < visitors.length; index += 1) {
      const visitor = visitors[index]

      const distance = visitor.phase + time * WALK_SPEED * motion
      const sample = visitor.path.sample(distance)

      // Face the direction of travel.
      const heading = Math.atan2(sample.tx, sample.tz)
      const cos = Math.cos(heading)
      const sin = Math.sin(heading)

      // Lateral offset, perpendicular to the direction of travel.
      const offsetX = -sample.tz * visitor.lane
      const offsetZ = sample.tx * visitor.lane

      const bob = Math.sin(time * 6 + index) * 0.035 * motion
      const stride = Math.sin(time * 6 + index) * 0.55 * motion

      // Root of the visitor in world space.
      const rootX = sample.x + offsetX
      const rootY = visitor.groundY + bob
      const rootZ = sample.z + offsetZ

      for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
        const mesh = meshes.current[partIndex]
        if (!mesh) continue

        const part = parts[partIndex]

        // Rotate the part offset into world space around the Y axis.
        const localX = part.pivot[0] + part.offset[0]
        const localY = part.pivot[1] + part.offset[1]
        const localZ = part.pivot[2] + part.offset[2]
        const worldX = localX * cos + localZ * sin
        const worldZ = -localX * sin + localZ * cos

        dummy.position.set(
          rootX + worldX * visitor.scale,
          rootY + localY * visitor.scale,
          rootZ + worldZ * visitor.scale,
        )

        // Limbs swing around their own pivot.
        let swingX = 0
        let swingZ = 0
        if (partIndex === LEG_LEFT) swingX = stride
        else if (partIndex === LEG_RIGHT) swingX = -stride
        else if (partIndex === ARM_LEFT) swingX = -stride * 0.7
        else if (partIndex === ARM_RIGHT) swingX = stride * 0.7

        // The lantern arm stays raised, as if carrying a floating candle.
        if (partIndex === ARM_RIGHT) {
          swingX = -0.75 + swingX * 0.2
          swingZ = -0.35
        }

        // Rotate the swing in the visitor's local frame, then face the heading.
        dummy.rotation.set(swingX, heading, swingZ, 'YXZ')
        dummy.scale.setScalar(visitor.scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)

        // Colours are constant per visitor and part.
        const source = PART_COLOR_SOURCE[partIndex]
        color.set(visitor[source] ?? '#ffffff')
        mesh.setColorAt(index, color)
      }
    }

    for (const mesh of meshes.current) {
      if (!mesh) continue
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  })

  return (
    <group>
      {parts.map((part, index) => (
        <instancedMesh
          key={`part-${index}`}
          ref={(mesh) => {
            meshes.current[index] = mesh
          }}
          args={[part.geometry, undefined, visitorCount]}
          castShadow={!reducedEffects && index !== LANTERN_PART}
          frustumCulled={false}
        >
          {index === LANTERN_PART ? (
            <meshBasicMaterial color={PALETTE.lantern} toneMapped={false} />
          ) : (
            <meshStandardMaterial vertexColors roughness={0.75} metalness={0.05} />
          )}
        </instancedMesh>
      ))}
    </group>
  )
}
