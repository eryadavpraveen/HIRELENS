import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { dismissWarning } from '@/features/monitoring/monitoringSlice'
import { STUDENT_WARNING_TOAST_TYPES } from '@/utils/constants'

function WarningToast({ warning }) {
  const dispatch = useDispatch()

  useEffect(() => {
    const t = setTimeout(() => dispatch(dismissWarning(warning.id)), 5000)
    return () => clearTimeout(t)
  }, [warning.id, dispatch])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/15 p-4 shadow-xl backdrop-blur-xl"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-warning">Warning</p>
        <p className="text-sm text-foreground/90">{warning.message}</p>
      </div>
      <button
        onClick={() => dispatch(dismissWarning(warning.id))}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Dismiss warning"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

/**
 * Student-facing warning popups. Deliberately shows ONLY warning messages —
 * never any monitoring analytics, statuses, or integrity data.
 */
export function WarningToasts() {
  const warnings = useSelector((state) => state.monitoring.warnings)

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-3">
      <AnimatePresence initial={false}>
        {warnings
          .filter((w) => STUDENT_WARNING_TOAST_TYPES.includes(w.type))
          .map((w) => (
          <div key={w.id} className="pointer-events-auto">
            <WarningToast warning={w} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default WarningToasts
