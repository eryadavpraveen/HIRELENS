import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { formatDateTime, formatDuration } from '@/utils/helpers'
import { Clock } from 'lucide-react'

export function InterviewDetailsPanel({ interview, elapsedSeconds = 0 }) {
  if (!interview) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Interview Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DetailRow label="Interview Name" value={interview.title} />
        <DetailRow label="Recruiter" value={interview.recruiter_name || 'Recruiter'} />
        <DetailRow label="Start Time" value={formatDateTime(interview.start_time)} />
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-mono font-semibold text-primary">
            {formatDuration(elapsedSeconds)}
          </span>
        </div>
        {interview.description && (
          <DetailRow label="Description" value={interview.description} />
        )}
      </CardContent>
    </Card>
  )
}

export function CandidateInfoPanel({ candidate, interview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Candidate Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DetailRow label="Name" value={candidate?.name || '—'} />
        <DetailRow label="Email" value={candidate?.email || '—'} />
        <DetailRow label="Resume" value={candidate?.resume || '—'} />
        <DetailRow label="Duration" value={`${interview?.duration || 60} min`} />
      </CardContent>
    </Card>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
