import '@testing-library/jest-dom'
import { expect } from 'vitest'

declare module 'vitest' {
  interface Assertion<T> {
    toBeInTheDocument(): T
  }
  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): void
  }
}