import { useCallback, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { getFraming } from '../lib/framing'

interface CameraRigProps {
  reducedEffects: boolean
  /** Called with a reset function so the UI can trigger it. */
  onReady?: (reset: () => void) => void
  /** Called when the view leaves or returns to the home framing. */
  onMove?: (moved: boolean) => void
  /** Called with a function that flies the camera to a krathong by id. */
  onFocusReady?: (focus: (id: string) => void) => void
  /** Krathong ids mapped to their world position. */
  krathongPositions?: Map<string, [number, number, number]>
}

/** The default camera framing of the riverside. */
const HOME_TARGET: [number, number, number] = [0, 3.2, 0]

/** How long a camera flight takes, in seconds. */
const RESET_DURATION = 0.9

/** The width used when flying to a single krathong on a phone. */
const NARROW_FOCUS_WIDTH = 4.6
/** The width used when flying to a single krathong on desktop. */
const WIDE_FOCUS_WIDTH = 8

/**
 * OrbitControls limits.
 *
 * The polar angle is measured from the vertical axis, so the solved home
 * framings sit at about 77 and 79 degrees. The clamp has to admit both of
 * them, otherwise the controls silently drag the camera away from the
 * solved framing on their first update.
 *
 * The lower bound keeps the camera from tilting so far down that the
 * horizon - and with it the moon - leaves the frame; the upper bound keeps
 * it from dropping towards the water.
 */
const MIN_DISTANCE = 8
const MAX_DISTANCE = 38
const MIN_POLAR_ANGLE = 1.25
const MAX_POLAR_ANGLE = 1.45

/**
 * OrbitControls for the riverside.
 *
 * The camera never goes under the water and never zooms so far out that the
 * scene collapses into a dot. The home framing adapts to the viewport so a
 * phone sees a usable amount of the river instead of a zoomed-in corner.
 */
export function CameraRig({
  reducedEffects,
  onReady,
  onMove,
  onFocusReady,
  krathongPositions,
}: CameraRigProps) {
  const controls = useRef<OrbitControlsImpl | null>(null)
  const camera = useThree((state) => state.camera)
  const aspect = useThree((state) => state.viewport.aspect)

  // The rig only ever runs with a perspective camera, but R3F types the scene
  // camera as a union, so narrow it before reading the field of view.
  const perspectiveCamera = camera as THREE.PerspectiveCamera
  // A ref is the sanctioned way to mutate a value that came out of a hook:
  // the field of view has to follow the shape of the viewport.
  const cameraRef = useRef(perspectiveCamera)

  // Flight animation state.
  const flightFrom = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const flightTo = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const flightStart = useRef(0)
  const flightActive = useRef(false)
  const moved = useRef(false)
  // A focus request can arrive one React render before the krathong's world
  // placement exists. Remember it until the position map catches up.
  const pendingFocusId = useRef<string | null>(null)

  /**
   * Distance from the target that shows `width` world units across the
   * viewport, for the current field of view.
   *
   * A perspective camera shows `2 * distance * tan(horizontalFov / 2)` world
   * units across the viewport, so the distance that fits `width` units is
   * `(width / 2) / tan(horizontalFov / 2)`.
   *
   * `width` is horizontal, so the horizontal FOV must be used. Converting the
   * vertical FOV to horizontal first is essential on wide screens: using the
   * vertical angle directly would place the camera roughly four times too
   * close and crop the riverside away.
   */
  const distanceForWidth = useCallback(
    (width: number) => {
      const verticalFov = (perspectiveCamera.fov * Math.PI) / 180
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect)
      return width / 2 / Math.tan(horizontalFov / 2)
    },
    [aspect, perspectiveCamera.fov],
  )

  /**
   * The home framing, adapted to the viewport.
   *
   * Landscape and portrait use different solved rigs; see `lib/framing.ts`
   * for what each one guarantees.
   */
  const homeFraming = useCallback(() => {
    const framing = getFraming(aspect)
    return {
      position: new THREE.Vector3(...framing.position),
      target: new THREE.Vector3(...framing.target),
      fov: framing.fov,
    }
  }, [aspect])

  useEffect(() => {
    const { position, target, fov } = homeFraming()
    const instance = cameraRef.current
    instance.position.copy(position)
    instance.lookAt(target)
    // The field of view is part of the solved rig: a phone needs a much
    // taller one to see the same landmarks across a narrow frame.
    if (instance.fov !== fov) {
      instance.fov = fov
      instance.updateProjectionMatrix()
    }
  }, [homeFraming])

  /** Starts a flight to the given camera position and target. */
  const flyTo = useCallback(
    (position: THREE.Vector3, target: THREE.Vector3) => {
      const instance = controls.current
      if (!instance) return

      if (reducedEffects) {
        instance.object.position.copy(position)
        instance.target.copy(target)
        instance.update()
        return
      }

      flightFrom.current = {
        position: instance.object.position.clone(),
        target: instance.target.clone(),
      }
      flightTo.current = { position, target }
      flightStart.current = performance.now() / 1000
      flightActive.current = true
    },
    [reducedEffects],
  )

  // Publish the reset handler to the UI layer.
  const reset = useCallback(() => {
    const { position, target } = homeFraming()
    flyTo(position, target)
  }, [flyTo, homeFraming])

  useEffect(() => {
    if (!onReady) return
    onReady(reset)
  }, [onReady, reset])

  /**
   * Fly the camera to a krathong so a freshly created one is visible.
   *
   * The camera sits above and behind the float, framed so the target and its
   * neighbours fill the frame.
   */
  const focus = useCallback(
    (id: string) => {
      const position = krathongPositions?.get(id)
      if (!position) {
        pendingFocusId.current = id
        return
      }

      pendingFocusId.current = null
      const target = new THREE.Vector3(position[0], 0.5, position[2])
      const targetWidth = aspect < 0.9 ? NARROW_FOCUS_WIDTH : WIDE_FOCUS_WIDTH
      const distance = distanceForWidth(targetWidth)
      const cameraPosition = target.clone().add(new THREE.Vector3(0, distance * 0.62, distance))

      flyTo(cameraPosition, target)
    },
    [aspect, distanceForWidth, flyTo, krathongPositions],
  )

  // Retry a pending focus as soon as the scene publishes the new placement.
  useEffect(() => {
    const pendingId = pendingFocusId.current
    if (!pendingId) return
    if (!krathongPositions?.has(pendingId)) return
    pendingFocusId.current = null
    focus(pendingId)
  }, [focus, krathongPositions])

  useEffect(() => {
    if (!onFocusReady) return
    onFocusReady(focus)
  }, [onFocusReady, focus])

  useFrame(() => {
    const instance = controls.current

    // Report whether the view has drifted away from the home framing.
    if (instance) {
      const home = homeFraming()
      const distance = instance.object.position.distanceTo(home.position)
      const targetDistance = instance.target.distanceTo(home.target)
      const isMoved = distance > 0.35 || targetDistance > 0.2
      if (isMoved !== moved.current) {
        moved.current = isMoved
        onMove?.(isMoved)
      }
    }

    if (!flightActive.current) return
    const from = flightFrom.current
    const to = flightTo.current
    if (!instance || !from || !to) {
      flightActive.current = false
      return
    }

    const now = performance.now() / 1000
    const elapsed = (now - flightStart.current) / RESET_DURATION
    const t = Math.min(1, Math.max(0, elapsed))
    // Ease in-out cubic.
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    instance.object.position.lerpVectors(from.position, to.position, eased)
    instance.target.lerpVectors(from.target, to.target, eased)
    instance.update()

    if (t >= 1) {
      flightActive.current = false
      flightFrom.current = null
      flightTo.current = null
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableZoom
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      minPolarAngle={MIN_POLAR_ANGLE}
      maxPolarAngle={MAX_POLAR_ANGLE}
      target={HOME_TARGET}
    />
  )
}
