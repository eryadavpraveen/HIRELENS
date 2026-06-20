import { Link } from 'react-router-dom'
import { Calendar, Clock, User, Video } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { formatDate, formatTime } from '@/utils/helpers'

const statusVariant = {
  scheduled: 'accent',
  active: 'success',
  completed: 'secondary',
  cancelled: 'danger',
}

/** Interview card for student dashboards (title, recruiter, date, time, status). */
export function InterviewCard({ interview, role = 'student' }) {
  const joinable = interview.status === 'scheduled' || interview.status === 'active'
  const joinPath =
    role === 'recruiter'
      ? `/recruiter/interview/${interview.id}`
      : `/student/interview/${interview.id}`

  return (
    <Card className="flex flex-col gap-3 animate-slide-up">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
          <Video className="h-5 w-5 text-primary" />
        </div>
        <Badge variant={statusVariant[interview.status] || 'secondary'} className="capitalize">
          {interview.status}
        </Badge>
      </div>

      <div>
        <h3 className="font-semibold leading-tight">{interview.title}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          {interview.recruiter_name || 'Recruiter'}
        </p>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(interview.start_time)}</span>
        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatTime(interview.start_time)}</span>
      </div>

      <Button asChild disabled={!joinable} className="mt-1 w-full" variant={joinable ? 'default' : 'secondary'}>
        <Link to={joinPath}>
          <Video className="h-4 w-4" />
          {role === 'recruiter' ? 'Monitor Interview' : 'Join Interview'}
        </Link>
      </Button>
    </Card>
  )
}

export default InterviewCard
