import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import { GLTFModel, GLTFModelWithFallback } from './GLTFModel'
import type { AssetKey } from '../lib/gltf'
import '@testing-library/jest-dom'

// Mock the GLTFLoader
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    load: (_url: string, onLoad: (gltf: any) => void) => {
      // Simulate async load with a mock GLTF object
      const mockGltf = {
        scene: {
          traverse: (cb: (obj: any) => void) => cb({ isMesh: false }),
          updateMatrixWorld: vi.fn(),
          scale: { setScalar: vi.fn() },
          position: { set: vi.fn(), add: vi.fn() },
          rotation: { set: vi.fn() },
        },
        animations: [],
      }
      setTimeout(() => onLoad(mockGltf), 0)
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
    Clock: vi.fn().mockImplementation(() => ({
      getDelta: () => 0.016,
    })),
    LoopOnce: 2200,
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