import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { CATEGORY_LIST, SEVERITY_STYLES } from '@/utils/violations'
import { cn } from '@/utils/helpers'

function ViolationCard({ category, count }) {
  const Icon = Icons[category.icon] || Icons.AlertTriangle
  const style = SEVERITY_STYLES[category.severity]
  return (
    <div className={cn('flex flex-col gap-2 rounded-xl border p-4 transition-all hover:scale-[1.02]', style.ring, style.bg)}>
      <div className="flex items-center justify-between">
        <Icon className={cn('h-5 w-5', style.text)} />
        <span className={cn('h-2 w-2 rounded-full', style.dot)} />
      </div>
      <span className={cn('text-3xl font-bold tabular-nums', count > 0 ? style.text : 'text-muted-foreground')}>
        {count}
      </span>
      <span className="text-xs font-medium text-muted-foreground">{category.label}</span>
    </div>
  )
}

/**
 * Recruiter-only violation dashboard. Renders the 11 violation category
 * cards plus the Total Timeline Violations and Total Summary Violations.
 *
 * `summary` is the object returned by buildViolationSummary():
 *   { counts, timelineTotal, summaryTotal }
 */
export function ViolationDashboard({ summary, className }) {
  const counts = summary?.counts || {}
  const timelineTotal = summary?.timelineTotal ?? 0
  const summaryTotal = summary?.summaryTotal ?? 0

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Violation Dashboard</CardTitle>
        <div className="flex flex-wrap gap-2">
          <TotalPill label="Timeline Violations" value={timelineTotal} icon={Icons.ListChecks} accent="text-accent" />
          <TotalPill label="Summary Violations" value={summaryTotal} icon={Icons.Sigma} accent="text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {CATEGORY_LIST.map((category) => (
            <ViolationCard key={category.key} category={category} count={counts[category.key] || 0} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TotalPill({ label, value, icon: Icon, accent }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
      <Icon className={cn('h-4 w-4', accent)} />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </div>
  )
}

export default ViolationDashboard
