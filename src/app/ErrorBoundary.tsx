import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{ padding: '2rem', color: 'var(--alert)' }}>
          <h2>Something went wrong</h2>
          <pre>{this.state.error.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
