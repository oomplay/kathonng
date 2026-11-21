import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import {
  Bone,
  BoxGeometry,
  Group,
  MeshBasicMaterial,
  Skeleton,
  SkinnedMesh,
} from 'three'
import { GLTFModel, GLTFModelWithFallback } from './GLTFModel'
import { cloneScene } from '../lib/gltf'
import type { AssetKey } from '../lib/gltf'
import '@testing-library/jest-dom'

/**
 * The scenes handed to the component are real `Group` instances, so the
 * cloning behaviour under test is the same one that runs in the browser.
 */
const loadedScenes: Group[] = []

// Mock the GLTFLoader
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    load: (_url: string, onLoad: (gltf: unknown) => void) => {
      const scene = new Group()
      loadedScenes.push(scene)
      setTimeout(() => onLoad({ scene, animations: [] }), 0)
    },
  })),
}))

// Mock three.js animation
vi.mock('three', async () => {
  const actual = await vi.importActual('three')
  return {
    ...actual,
    AnimationMixer: vi.fn().mockImplementation(() => ({
      clipAction: vi.fn().mockReturnValue({
        setLoop: vi.fn().mockReturnThis(),
        clampWhenFinished: true,
        play: vi.fn(),
      }),
      uncacheRoot: vi.fn(),
      stopAllAction: vi.fn(),
      update: vi.fn(),
    })),
    Vector3: actual.Vector3,
    Mesh: actual.Mesh,
  }
})

describe('GLTFModel', () => {
  const mockAsset: AssetKey = 'visitor'

  it('should render without throwing', () => {
    const { container } = render(
      <Canvas>
        <GLTFModel asset={mockAsset} />
      </Canvas>
    )
    expect(container).toBeInTheDocument()
  })

  it('should accept position prop', () => {
    const { container } = render(
      <Canvas>
        <GLTFModel asset={mockAsset} position={[1, 2, 3]} />
      </Canvas>
    )
    expect(container).toBeInTheDocument()
  })

  it('should accept rotation prop', () => {
    const { container } = render(
      <Canvas>
        <GLTFModel asset={mockAsset} rotation={[0, Math.PI / 2, 0]} />
      </Canvas>
    )
    expect(container).toBeInTheDocument()
  })

  it('should accept animation prop', () => {
    const { container } = render(
      <Canvas>
        <GLTFModel asset={mockAsset} animation="wave" />
      </Canvas>
    )
    expect(container).toBeInTheDocument()
  })

  it('should accept playAnimation prop', () => {
    const { container } = render(
      <Canvas>
        <GLTFModel asset={mockAsset} playAnimation={false} />
      </Canvas>
    )
    expect(container).toBeInTheDocument()
  })
})

describe('cloneScene', () => {
  it('returns a distinct object for a plain scene', () => {
    const source = new Group()
    source.position.set(1, 2, 3)

    const clone = cloneScene(source)

    expect(clone).not.toBe(source)
    expect(clone.position).not.toBe(source.position)
    expect(clone.position.toArray()).toEqual(source.position.toArray())
  })

  it('does not share the transform with the source', () => {
    const source = new Group()
    const clone = cloneScene(source)

    clone.position.set(9, 9, 9)

    expect(source.position.toArray()).toEqual([0, 0, 0])
  })

  it('clones a rigged scene with its skeleton', () => {
    const source = new Group()
    const bone = new Bone()
    source.add(bone)

    const mesh = new SkinnedMesh(new BoxGeometry(), new MeshBasicMaterial())
    mesh.bind(new Skeleton([bone]))
    source.add(mesh)

    const clone = cloneScene(source)

    expect(clone).not.toBe(source)
    const clonedMesh = clone.children.find(
      (child) => (child as { isSkinnedMesh?: boolean }).isSkinnedMesh,
    ) as SkinnedMesh
    expect(clonedMesh).toBeDefined()
    expect(clonedMesh.skeleton).not.toBe(mesh.skeleton)
    expect(clonedMesh.skeleton.bones[0]).not.toBe(bone)
  })
})

describe('GLTFModelWithFallback', () => {
  const mockAsset: AssetKey = 'visitor'

  it('should render fallback when provided', () => {
    const Fallback = () => <group data-testid="fallback" />
    const { container } = render(
      <Canvas>
        <GLTFModelWithFallback asset={mockAsset} fallback={<Fallback />} />
      </Canvas>
    )
    expect(container).toBeInTheDocument()
  })

  it('should render without fallback', () => {
    const { container } = render(
      <Canvas>
        <GLTFModelWithFallback asset={mockAsset} />
      </Canvas>
    )
    expect(container).toBeInTheDocument()
  })
})