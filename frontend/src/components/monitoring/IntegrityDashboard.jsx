import { ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { CircularProgress } from '@/components/common/CircularProgress'
import { getEvaluation } from '@/utils/violations'
import { cn } from '@/utils/helpers'

/**
 * Recruiter-only integrity dashboard: large circular integrity score
 * (e.g. 84 / 100) plus the evaluation band (EXCELLENT / GOOD / SUSPICIOUS
 * / HIGH RISK) with green / orange / red color coding.
 */
export function IntegrityDashboard({ score = 0, size = 200, className, compact = false }) {
  const evaluation = getEvaluation(score)

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Integrity Score</CardTitle>
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <CircularProgress
          value={score}
          size={size}
          color={evaluation.color}
          label={`Integrity score ${score} out of 100`}
        >
          <span className="text-5xl font-extrabold tabular-nums" style={{ color: evaluation.color }}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </CircularProgress>

        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Evaluation</p>
          <span
            className={cn(
              'mt-1 inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-bold tracking-wide',
              evaluation.badge
            )}
          >
            {evaluation.label}
          </span>
        </div>

        {!compact && (
          <div className="grid w-full grid-cols-4 gap-1.5 text-center text-[10px] font-semibold uppercase">
            <Band active={evaluation.label === 'EXCELLENT'} color="#22C55E" text="Excellent" />
            <Band active={evaluation.label === 'GOOD'} color="#10B981" text="Good" />
            <Band active={evaluation.label === 'SUSPICIOUS'} color="#F97316" text="Suspicious" />
            <Band active={evaluation.label === 'HIGH RISK'} color="#EF4444" text="High Risk" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Band({ active, color, text }) {
  return (
    <div
      className={cn('rounded-md border py-1 transition-all', active ? 'border-transparent text-white' : 'border-border text-muted-foreground')}
      style={active ? { backgroundColor: color } : undefined}
    >
      {text}
    </div>
  )
}

export default IntegrityDashboard
