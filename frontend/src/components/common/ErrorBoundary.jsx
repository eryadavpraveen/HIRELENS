import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/common/Button'

/**
 * Global error boundary. Catches render-time errors anywhere in the tree
 * and shows a recoverable fallback instead of a blank screen.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production this is where you'd report to Sentry / logging.
    console.error('[HIRELENS ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.assign('/')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="glass-card max-w-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/15">
              <AlertTriangle className="h-7 w-7 text-danger" />
            </div>
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. You can try again or return to the home page.
            </p>
            {this.state.error?.message && (
              <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={this.handleReset}>
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleReload}>Go Home</Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
