import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  /** Content to protect. */
  children: ReactNode
  /** Rendered in place of the children once an error has been caught. */
  fallback: ReactNode
  /** Called with the caught error, for logging or reporting. */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * A React error boundary that keeps a failed subtree from unmounting the
 * whole app.
 *
 * Without a boundary, a single thrown error (a failed model download, a
 * WebGL context that cannot be created) unmounts the entire React tree and
 * leaves the page blank. With a boundary the failure is contained: the
 * fallback is rendered instead, and the rest of the app keeps working.
 *
 * The component is renderer agnostic. It is used both in the DOM tree and
 * inside the React Three Fiber canvas, where it keeps one broken model from
 * taking down the whole 3D scene.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
  }

  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}
