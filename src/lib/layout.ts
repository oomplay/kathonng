/**
 * Deterministic layout for the 3D river.
 *
 * Positions are derived from the krathong id (not from list order) so a
 * krathong keeps the same spot in the river while votes and new arrivals
 * change the ordering of the feed.
 */

export interface Placement {
  position: [number, number, number]
  rotationY: number
  /** Phase offset for the bobbing animation, in radians. */
  phase: number
  /** Bobbing speed multiplier. */
  bobSpeed: number
}

/** FNV-1a, used as a cheap deterministic hash for stable placement. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const COLUMN_SPACING = 2.2
const ROW_SPACING = 3.2
const COLUMNS = 5
/** Nearest row sits this far in front of the camera. */
const FIRST_ROW_Z = 7

export function getKrathongPlacement(index: number, id: string): Placement {
  const hash = hashString(id)
  const jitterX = ((hash % 1000) / 1000 - 0.5) * 0.72
  const jitterZ = (((hash >>> 11) % 1000) / 1000 - 0.5) * 0.9
  const row = Math.floor(index / COLUMNS)
  const column = index % COLUMNS
  const x = (column - (COLUMNS - 1) / 2) * COLUMN_SPACING + jitterX
  const z = FIRST_ROW_Z - row * ROW_SPACING + jitterZ

  return {
    position: [x, 0, z],
    rotationY: ((hash >>> 21) % 628) / 100,
    phase: ((hash >>> 7) % 1000) / 1000 * Math.PI * 2,
    bobSpeed: 0.55 + ((hash >>> 3) % 45) / 100,
  }
}
