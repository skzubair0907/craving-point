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
        <main className="grid min-h-screen place-items-center bg-[#120f10] px-6 text-center text-white">
          <section className="max-w-md space-y-5 rounded-2xl border border-white/15 bg-white/5 p-8">
            <p className="text-sm font-semibold tracking-[0.18em] text-primary">CRAVING POINT</p>
            <h1 className="text-3xl font-bold">Something went wrong</h1>
            <p className="text-white/70">Please try again. If the problem continues, call the restaurant for help with your order.</p>
            <button onClick={() => window.location.reload()} className="btn-primary w-full">
              Try again
            </button>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
