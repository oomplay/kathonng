import { describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { Group } from 'three'

/**
 * The shared GLTF that `useLoader` would return. Every component instance
 * receives this very same object, which is exactly the situation that made
 * the visitors overlap before each instance started cloning the scene.
 */
const sharedScene = new Group()

vi.mock('@react-three/fiber', () => ({
  useLoader: () => ({ scene: sharedScene, animations: [] }),
  useFrame: () => {},
}))

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {},
}))

// The component renders three.js elements (`group`, `primitive`), which the
// DOM renderer of jsdom does not know. They are irrelevant to the behaviour
// under test, so the warning is silenced.
vi.spyOn(console, 'error').mockImplementation(() => {})

import { GLTFModel } from './GLTFModel'

describe('GLTFModel scene instances', () => {
  it('gives each instance an independent scene object', async () => {
    const roots: object[] = []

    render(
      <>
        <GLTFModel
          asset="visitor"
          position={[1, 0, 0]}
          onReady={(_mixer, _clips, scene) => roots.push(scene)}
        />
        <GLTFModel
          asset="visitor"
          position={[-1, 0, 0]}
          onReady={(_mixer, _clips, scene) => roots.push(scene)}
        />
      </>,
    )

    await waitFor(() => expect(roots).toHaveLength(2))
    expect(roots[0]).not.toBe(roots[1])
    expect(roots[0]).not.toBe(sharedScene)
    expect(roots[1]).not.toBe(sharedScene)
  })

  it('applies the position offset to the cloned scene, not the shared one', async () => {
    const roots: Group[] = []

    render(
      <GLTFModel
        asset="visitor"
        position={[4, 0, -8]}
        onReady={(_mixer, _clips, scene) => roots.push(scene as Group)}
      />,
    )

    await waitFor(() => expect(roots).toHaveLength(1))
    expect(roots[0].position.x).toBeCloseTo(4)
    expect(roots[0].position.z).toBeCloseTo(-8)
    // The cached scene must not be mutated by the instance transform.
    expect(sharedScene.position.x).toBe(0)
    expect(sharedScene.position.z).toBe(0)
  })
})
