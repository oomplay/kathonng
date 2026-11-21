/**
 * Shared layout for the Loy Krathong riverside.
 *
 * Every module (landmarks, visitors, camera) reads its geometry from here so
 * the walkways, the buildings and the walking routes can never drift apart.
 *
 * Units are metres-ish: the krathong hulls are ~1.2 units wide and a visitor
 * is ~2.0 units tall, so the whole scene reads at a toy-diorama scale.
 */

/** Water surface height. */
export const WATER_Y = 0
/** Top of the natural riverbank. */
export const GROUND_Y = 0.55
/** Top of the paved walkways and courtyards. */
export const PAVING_Y = 0.62

/** The river runs along Z; the water channel is `2 * RIVER_HALF_WIDTH` wide. */
export const RIVER_HALF_WIDTH = 6.2
/** Where the water stops and the far bank begins. */
export const FAR_BANK_EDGE_Z = -11

export interface Slab {
  x0: number
  x1: number
  z0: number
  z1: number
  top: number
}

/** Solid land, built as boxes so the river channel stays open. */
export const LAND_SLABS: Slab[] = [
  { x0: -50, x1: 50, z0: -50, z1: FAR_BANK_EDGE_Z, top: GROUND_Y },
  { x0: -50, x1: -RIVER_HALF_WIDTH, z0: FAR_BANK_EDGE_Z, z1: 50, top: GROUND_Y },
  { x0: RIVER_HALF_WIDTH, x1: 50, z0: FAR_BANK_EDGE_Z, z1: 50, top: GROUND_Y },
]

/** Stone paving laid over the land: two promenades plus the temple courtyard. */
export const PAVING_SLABS: Slab[] = [
  { x0: -9.8, x1: -6.4, z0: -11, z1: 12, top: PAVING_Y },
  { x0: 6.4, x1: 9.8, z0: -11, z1: 12, top: PAVING_Y },
  { x0: -13.5, x1: -4.5, z0: -14.5, z1: -11, top: PAVING_Y },
]

/** Raised plinth of the temple hall. */
export const TEMPLE_PLATFORM: Slab = {
  x0: -13.5,
  x1: -4.5,
  z0: -23,
  z1: -14.5,
  top: 1.55,
}

/** Raised terrace under the golden chedi. */
export const CHEDI_TERRACE: Slab = {
  x0: 4.5,
  x1: 12,
  z0: -21,
  z1: -14,
  top: 0.95,
}

/** Deck of the traditional Thai house, held up by stilts over the water. */
export const HOUSE_DECK: Slab = {
  x0: -5.8,
  x1: -1.6,
  z0: -10.4,
  z1: -6,
  top: 2.2,
}

/** Wooden pier where the krathongs are launched. */
export const PIER: Slab = {
  x0: 2.4,
  x1: 6.6,
  z0: -9,
  z1: -7,
  top: 0.95,
}

/**
 * Night palette shared by the landmarks.
 *
 * These mirror the CSS custom properties in `src/index.css`, so the 3D scene
 * and the HUD are lit from the same palette. The values are duplicated here
 * because three.js materials need concrete colours, not CSS variables.
 */
export const PALETTE = {
  bank: '#0b1430',
  paving: '#1b2e63',
  terrace: '#122048',
  templeStone: '#27407f',
  wood: '#5a3a26',
  woodDark: '#3a2519',
  woodLight: '#7a5136',
  roof: '#9c3427',
  roofDark: '#6f241b',
  hall: '#6b4327',
  gold: '#ffcb6b',
  goldDeep: '#f59a1f',
  window: '#ffdd9e',
  lantern: '#ffeccd',
  lanternGlow: '#ffb43f',
  skyLantern: '#ffdd9e',
} as const

/* ------------------------------------------------------------------ *
 * Walking routes
 * ------------------------------------------------------------------ */

export interface VisitorPath {
  id: string
  /** Closed loop of XZ waypoints. */
  points: readonly (readonly [number, number])[]
  /** Walking surface height for this route. */
  groundY: number
  /** How many visitors walk this route. */
  capacity: number
}

/**
 * Routes never cross open water and never pass through a building:
 * every point sits on a paved slab, a pier deck or a raised terrace.
 */
export const VISITOR_PATHS: VisitorPath[] = [
  {
    id: 'left-promenade',
    points: [
      [-9, -10.4],
      [-9, 11.2],
      [-7.4, 11.2],
      [-7.4, -10.4],
    ],
    groundY: PAVING_Y,
    capacity: 5,
  },
  {
    id: 'right-promenade',
    points: [
      [7.4, -10.4],
      [7.4, 11.2],
      [9, 11.2],
      [9, -10.4],
    ],
    groundY: PAVING_Y,
    capacity: 5,
  },
  {
    id: 'temple-courtyard',
    points: [
      [-12.6, -13.9],
      [-5.4, -13.9],
      [-5.4, -11.7],
      [-12.6, -11.7],
    ],
    groundY: PAVING_Y,
    capacity: 4,
  },
  {
    id: 'pier',
    points: [
      [3.1, -8.4],
      [5.9, -8.4],
      [5.9, -7.6],
      [3.1, -7.6],
    ],
    groundY: PIER.top,
    capacity: 3,
  },
  {
    id: 'chedi-terrace',
    points: [
      [5.4, -19.6],
      [11.1, -19.6],
      [11.1, -15.4],
      [5.4, -15.4],
    ],
    groundY: CHEDI_TERRACE.top,
    capacity: 3,
  },
]

export interface PathSample {
  x: number
  z: number
  /** Unit tangent of travel direction. */
  tx: number
  tz: number
}

export interface CompiledPath {
  length: number
  sample: (distance: number) => PathSample
}

/** Compiles a closed waypoint loop into arc-length parameterised samples. */
export function compilePath(points: readonly (readonly [number, number])[]): CompiledPath {
  const closed = [...points, points[0]]
  const segments: {
    ax: number
    az: number
    bx: number
    bz: number
    len: number
    start: number
  }[] = []
  let total = 0

  for (let index = 0; index < closed.length - 1; index += 1) {
    const [ax, az] = closed[index]
    const [bx, bz] = closed[index + 1]
    const len = Math.hypot(bx - ax, bz - az)
    segments.push({ ax, az, bx, bz, len, start: total })
    total += len
  }

  return {
    length: total,
    sample(distance: number): PathSample {
      const d = ((distance % total) + total) % total
      let segment = segments[segments.length - 1]
      for (const candidate of segments) {
        if (d <= candidate.start + candidate.len) {
          segment = candidate
          break
        }
      }
      const t = segment.len > 0 ? (d - segment.start) / segment.len : 0
      return {
        x: segment.ax + (segment.bx - segment.ax) * t,
        z: segment.az + (segment.bz - segment.az) * t,
        tx: segment.len > 0 ? (segment.bx - segment.ax) / segment.len : 0,
        tz: segment.len > 0 ? (segment.bz - segment.az) / segment.len : 0,
      }
    },
  }
}

/* ------------------------------------------------------------------ *
 * Festival crowd dressing
 * ------------------------------------------------------------------ */

export const SHIRT_COLORS = [
  '#c1272d',
  '#e8a33d',
  '#f2e4c9',
  '#1f7a6b',
  '#d94f8a',
  '#3b3f8f',
  '#ef7a3c',
  '#4f9e4a',
  '#8f4bb0',
  '#f4d35e',
  '#20639b',
  '#b23a48',
]

export const SARONG_COLORS = [
  '#2f4858',
  '#7a3e9d',
  '#c05c3e',
  '#356859',
  '#b8860b',
  '#3a4f7a',
  '#a0522d',
  '#4b6b3c',
]

export const SKIN_COLORS = ['#f3c9a3', '#e6ac7d', '#d19463', '#b87a4c', '#9c6236', '#7d4a28']

export const HAIR_COLORS = ['#171210', '#2a1d16', '#3b2a1c', '#0f0c0a']

export const TROUSER_COLORS = ['#2a2f45', '#3d3a33', '#26323b', '#4a3b52']
