/**
 * Deterministic layout for the 3D river.
 *
 * Positions are derived from the krathong id (not from list order) so a
 * krathong keeps the same spot in the river while votes and new arrivals
 * change the ordering of the feed.
 */

/** Half the width of the float field, in world units. */
export const FLOAT_FIELD_HALF_WIDTH = 4.6
/** Z of the nearest row of floats. */
export const FIRST_ROW_Z = 8.5
/** Z of the furthest row of floats; it stays north of the far bank. */
export const LAST_ROW_Z = -4.5
/** Horizontal jitter applied to each float. */
const JITTER_X = 0.35
/** Depth jitter applied to each float. */
const JITTER_Z = 0.3
/** Maximum number of columns in the grid. */
const MAX_COLUMNS = 5

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

/**
 * The grid shape for a given number of floats.
 *
 * The field is a rectangle of `columns * rows` cells. Twenty floats fill a
 * five by four grid, which spreads them over the whole width of the river
 * and still leaves a clear lane between the rows. Fewer floats use fewer
 * rows so they do not bunch up at the far end of the river.
 */
export function gridShape(count: number): { columns: number; rows: number } {
  const columns = Math.min(MAX_COLUMNS, Math.max(1, count))
  const rows = Math.max(1, Math.ceil(count / columns))
  return { columns, rows }
}

/**
 * Assigns every krathong a stable slot on the river.
 *
 * The ids are sorted before the slots are handed out, so the layout depends
 * only on *which* krathongs are on the river and not on the order the feed
 * happens to deliver them in. A vote that reorders the list therefore never
 * teleports a float to a different spot.
 *
 * Every krathong gets a slot: nothing is dropped, so the cheap rendering
 * tier shows the same twenty floats as the rich one.
 */
export function layoutKrathongs(ids: readonly string[]): Map<string, Placement> {
  const sorted = [...ids].sort()
  const { columns, rows } = gridShape(sorted.length)
  const placements = new Map<string, Placement>()

  sorted.forEach((id, index) => {
    const hash = hashString(id)
    const row = Math.floor(index / columns)
    const column = index % columns

    // The columns are spread evenly across the field, so the grid fills the
    // river width no matter how many columns there are.
    const columnX =
      columns === 1
        ? 0
        : (column - (columns - 1) / 2) * ((2 * FLOAT_FIELD_HALF_WIDTH) / (columns - 1))

    // The rows are spread evenly between the near and the far edge.
    const rowZ =
      rows === 1
        ? (FIRST_ROW_Z + LAST_ROW_Z) / 2
        : FIRST_ROW_Z + ((LAST_ROW_Z - FIRST_ROW_Z) * row) / (rows - 1)

    const jitterX = ((hash % 1000) / 1000 - 0.5) * 2 * JITTER_X
    const jitterZ = (((hash >>> 11) % 1000) / 1000 - 0.5) * 2 * JITTER_Z

    placements.set(id, {
      position: [columnX + jitterX, 0, rowZ + jitterZ],
      rotationY: ((hash >>> 21) % 628) / 100,
      phase: ((hash >>> 7) % 1000) / 1000 * Math.PI * 2,
      bobSpeed: 0.55 + ((hash >>> 3) % 45) / 100,
    })
  })

  return placements
}
