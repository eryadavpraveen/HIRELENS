import { AlertTriangle, Maximize } from 'lucide-react'
import { Button } from '@/components/common/Button'

/**
 * Blocking overlay shown after FULLSCREEN_EXIT. Cannot be dismissed except by
 * successfully returning to fullscreen via the action button.
 */
export function FullscreenExitOverlay({ error, onReturnToFullscreen }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fullscreen-exit-title"
      aria-describedby="fullscreen-exit-desc"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-warning/40 bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning/15">
          <AlertTriangle className="h-7 w-7 text-warning" />
        </div>
        <h2 id="fullscreen-exit-title" className="text-xl font-bold">
          Fullscreen Mode Required
        </h2>
        <p id="fullscreen-exit-desc" className="mt-3 text-muted-foreground">
          You exited fullscreen mode. To continue the interview, please return to fullscreen mode.
        </p>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Button size="lg" className="mt-6 w-full" onClick={onReturnToFullscreen}>
          <Maximize className="h-5 w-5" />
          Return to Fullscreen
        </Button>
      </div>
    </div>
  )
}

export default FullscreenExitOverlay
