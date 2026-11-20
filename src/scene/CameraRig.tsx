import { useCallback, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

interface CameraRigProps {
  reducedEffects: boolean
  /** Called with a reset function so the UI can trigger it. */
  onReady?: (reset: () => void) => void
  /** Called when the view leaves or returns to the home framing. */
  onMove?: (moved: boolean) => void
}

/** The default camera framing of the riverside. */
const HOME_POSITION: [number, number, number] = [0, 5.4, 13.5]
const HOME_TARGET: [number, number, number] = [0, 0.6, 0]

/** How long the reset animation takes, in seconds. */
const RESET_DURATION = 0.9

/**
 * OrbitControls for the riverside.
 *
 * The camera never goes under the water and never zooms so far out that the
 * scene collapses into a dot. A reset button smoothly flies the camera back
 * to its home framing.
 */
export function CameraRig({ reducedEffects, onReady, onMove }: CameraRigProps) {
  const controls = useRef<OrbitControlsImpl | null>(null)
  const camera = useThree((state) => state.camera)

  // Reset animation state.
  const resetFrom = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null)
  const resetStart = useRef(0)
  const resetActive = useRef(false)
  const moved = useRef(false)

  useEffect(() => {
    camera.position.set(...HOME_POSITION)
    camera.lookAt(...HOME_TARGET)
  }, [camera])

  // Publish the reset handler to the UI layer.
  const reset = useCallback(() => {
    const instance = controls.current
    if (!instance) return
    if (reducedEffects) {
      // No animation when effects are reduced.
      instance.object.position.set(...HOME_POSITION)
      instance.target.set(...HOME_TARGET)
      instance.update()
      return
    }
    resetFrom.current = {
      position: instance.object.position.clone(),
      target: instance.target.clone(),
    }
    resetStart.current = performance.now() / 1000
    resetActive.current = true
  }, [reducedEffects])

  useEffect(() => {
    if (!onReady) return
    onReady(reset)
  }, [onReady, reset])

  useFrame(() => {
    const instance = controls.current

    // Report whether the view has drifted away from the home framing.
    if (instance) {
      const distance = instance.object.position.distanceTo(
        new THREE.Vector3(...HOME_POSITION),
      )
      const targetDistance = instance.target.distanceTo(new THREE.Vector3(...HOME_TARGET))
      const isMoved = distance > 0.35 || targetDistance > 0.2
      if (isMoved !== moved.current) {
        moved.current = isMoved
        onMove?.(isMoved)
      }
    }

    if (!resetActive.current) return
    const from = resetFrom.current
    if (!instance || !from) {
      resetActive.current = false
      return
    }

    const now = performance.now() / 1000
    const elapsed = (now - resetStart.current) / RESET_DURATION
    const t = Math.min(1, Math.max(0, elapsed))
    // Ease in-out cubic.
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    instance.object.position.lerpVectors(from.position, new THREE.Vector3(...HOME_POSITION), eased)
    instance.target.lerpVectors(from.target, new THREE.Vector3(...HOME_TARGET), eased)
    instance.update()

    if (t >= 1) {
      resetActive.current = false
      resetFrom.current = null
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
      minDistance={7}
      maxDistance={26}
      minPolarAngle={0.55}
      maxPolarAngle={1.32}
      target={HOME_TARGET}
    />
  )
}
