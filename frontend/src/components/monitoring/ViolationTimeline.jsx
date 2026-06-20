import { useMemo, useState } from 'react'
import { ListFilter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/common/Table'
import { ScrollArea } from '@/components/common/ScrollArea'
import { EmptyState } from '@/components/common/LoadingSpinner'
import { categorizeViolation, VIOLATION_CATEGORIES, getSeverityStyle } from '@/utils/violations'
import { formatTime } from '@/utils/helpers'
import { cn } from '@/utils/helpers'

function rowFor(evt) {
  const cat = categorizeViolation(evt.type)
  if (!cat) return null
  const meta = VIOLATION_CATEGORIES[cat]
  return {
    id: evt.id,
    time: evt.timestamp,
    // Both MULTIPLE_PERSON_FACE and MULTIPLE_PERSON_YOLO display as MULTIPLE_PERSON.
    label: meta.timelineLabel,
    raw: cat === 'multiple_person' ? 'MULTIPLE_PERSON' : String(evt.type || '').toUpperCase(),
    duration: evt.duration,
    severity: meta.severity,
  }
}

/**
 * Recruiter-only professional violation timeline table.
 * Columns: Time | Violation | Duration | Severity (color-coded badge).
 */
export function ViolationTimeline({ events = [], className, maxHeight = '420px' }) {
  const [filter, setFilter] = useState('all')

  const rows = useMemo(
    () => events.map(rowFor).filter(Boolean),
    [events]
  )

  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.severity === filter)),
    [rows, filter]
  )

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Violation Timeline</CardTitle>
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter timeline by severity"
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All severities</option>
            <option value="yellow">Warning</option>
            <option value="orange">Suspicious</option>
            <option value="red">Critical</option>
            <option value="purple">Critical (Identity/Tab)</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <EmptyState icon={ListFilter} title="No violations recorded" description="The candidate timeline is clean for this filter." />
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Violation</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const style = getSeverityStyle(row.severity)
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{formatTime(row.time)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{row.label}</span>
                          <span className="text-[10px] text-muted-foreground">{row.raw}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.duration != null ? `${row.duration.toFixed(1)}s` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', style.badge)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
                          {style.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export default ViolationTimeline
