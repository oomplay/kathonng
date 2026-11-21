import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

/** A component that always throws, to simulate a failed render. */
function Boom(): never {
  throw new Error('render failed')
}

describe('ErrorBoundary', () => {
  it('renders its children when nothing fails', () => {
    render(
      <ErrorBoundary fallback={<p>fallback</p>}>
        <p>content</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.queryByText('fallback')).not.toBeInTheDocument()
  })

  it('renders the fallback instead of unmounting the tree', () => {
    // React logs the caught error; silence it so the test output stays clean.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<p>fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByText('fallback')).toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('reports the error to the onError callback', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onError = vi.fn()

    render(
      <ErrorBoundary fallback={<p>fallback</p>} onError={onError}>
        <Boom />
      </ErrorBoundary>,
    )

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    consoleError.mockRestore()
  })
})
