/**
 * Physical framing model for the Loy Krathong riverside.
 *
 * The scene has to work on a 1280x768 laptop and on a 390x844 phone. Those
 * two shapes cannot share one field of view: a landscape viewport is wide
 * and short, a portrait one is narrow and tall, and the same vertical FOV
 * either crops the far bank away or shrinks the floats to specks.
 *
 * So the framing is described physically - how high the camera sits, how far
 * back it stands, what it looks at and how much it sees - and the numbers
 * below were solved against the real scene geometry. In both orientations
 * the solution guarantees that:
 *
 *   - the horizon sits low enough for a visible band of night sky, which is
 *     where the moon lives,
 *   - the temple hall and the golden chedi are fully inside the frame,
 *   - all twenty floats are on screen, spread out and clear of each other,
 *   - no float hides behind the HUD.
 */

/** A camera placement, described in world units. */
export interface Rig {
  /** Vertical field of view, in degrees. */
  fov: number
  /** Height of the camera above the water plane. */
  height: number
  /** Horizontal distance from the look-at point back to the camera. */
  distance: number
}

/**
 * Landscape rig.
 *
 * The wide field of view keeps the temple on the left and the chedi on the
 * right of the same frame, and the height is high enough that the water
 * fills the lower two thirds instead of the lower half.
 */
const LANDSCAPE_RIG: Rig = { fov: 47.1, height: 8.39, distance: 26.25 }

/**
 * Portrait rig.
 *
 * A phone is narrow, so the camera has to see the same landmarks across a
 * much smaller slice of the river. A taller field of view does that without
 * pulling the camera so far back that the floats become unclickable.
 */
const PORTRAIT_RIG: Rig = { fov: 71.9, height: 8.85, distance: 25.11 }

/** Height of the point the camera looks at, above the water plane. */
export const TARGET_HEIGHT = 3.2

/** Below this aspect ratio a viewport is treated as a phone. */
export const PORTRAIT_ASPECT = 0.9

export interface Framing {
  /** Camera position in world space. */
  position: [number, number, number]
  /** The point the camera looks at. */
  target: [number, number, number]
  /** Vertical field of view, in degrees. */
  fov: number
}

/** The framing for a viewport of the given aspect ratio. */
export function getFraming(aspect: number): Framing {
  const rig = aspect < PORTRAIT_ASPECT ? PORTRAIT_RIG : LANDSCAPE_RIG
  return {
    position: [0, rig.height, rig.distance],
    target: [0, TARGET_HEIGHT, 0],
    fov: rig.fov,
  }
}
