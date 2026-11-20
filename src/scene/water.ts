import * as THREE from 'three'

/**
 * Builds a seamless tangent-space normal map from layered sine waves so the
 * reflective water shows moving ripples without shipping any texture asset.
 */
export function createWaterNormalTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)

  const height = (x: number, y: number) =>
    Math.sin(x * 0.09) * 0.5 +
    Math.sin(y * 0.065 + 1.3) * 0.5 +
    Math.sin((x + y) * 0.045) * 0.4

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height(x - 1, y)
      const right = height(x + 1, y)
      const down = height(x, y - 1)
      const up = height(x, y + 1)

      const nx = (left - right) * 0.5
      const ny = (down - up) * 0.5
      const nz = 1
      const length = Math.hypot(nx, ny, nz)

      const offset = (y * size + x) * 4
      data[offset] = ((nx / length) * 0.5 + 0.5) * 255
      data[offset + 1] = ((ny / length) * 0.5 + 0.5) * 255
      data[offset + 2] = ((nz / length) * 0.5 + 0.5) * 255
      data[offset + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(10, 10)
  texture.needsUpdate = true
  return texture
}
