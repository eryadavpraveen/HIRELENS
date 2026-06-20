import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { ScrollArea } from '@/components/common/ScrollArea'
import { EmptyState } from '@/components/common/LoadingSpinner'
import { formatTime } from '@/utils/helpers'
import {
  categorizeViolation,
  VIOLATION_CATEGORIES,
  getSeverityStyle,
} from '@/utils/violations'
import { cn } from '@/utils/helpers'

export function AlertCard({ event }) {
  const cat = categorizeViolation(event.type)
  const meta = cat ? VIOLATION_CATEGORIES[cat] : null
  const style = getSeverityStyle(meta?.severity)
  const Icon = (meta && Icons[meta.icon]) || Icons.CheckCircle2

  const label = meta ? meta.timelineLabel : String(event.type || '').replace(/_/g, ' ')

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-3 animate-slide-up', style.ring, style.bg)}>
      <div className={cn('rounded-lg p-2', style.bg, style.text)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{label}</p>
          <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', style.badge)}>
            {style.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatTime(event.timestamp)}
          {event.duration != null && ` · ${event.duration.toFixed(1)}s`}
        </p>
      </div>
    </div>
  )
}

export function EventTimeline({ events = [], height = 360 }) {
  const violations = events.filter((e) => categorizeViolation(e.type))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Live Event Feed</CardTitle>
      </CardHeader>
      <CardContent>
        {violations.length === 0 ? (
          <EmptyState icon={Icons.Activity} title="Monitoring active" description="No violations detected yet." />
        ) : (
          <ScrollArea style={{ maxHeight: height }} className="pr-2">
            <div className="space-y-2">
              {violations.map((event) => (
                <AlertCard key={event.id || event.timestamp} event={event} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export default EventTimeline
