import React from 'react'

type State = { hasError: boolean; error?: Error | null }

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, Arial' }}>
          <h1 style={{ color: '#b91c1c' }}>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#111', color: '#fff', padding: 12, borderRadius: 6 }}>
            {String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error)}
          </pre>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 12px', borderRadius: 6 }}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
