import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FileText, ShieldCheck, Calendar } from 'lucide-react'
import { fetchInterviews } from '@/features/interview/interviewSlice'
import { Card, CardContent } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { PageLoader, EmptyState } from '@/components/common/LoadingSpinner'
import { formatDate } from '@/utils/helpers'

/**
 * Student "Reports" view. Intentionally minimal — students only see their
 * interview participation history. No integrity score, evaluation,
 * violation data or PDF reports (those are recruiter-only).
 */
export default function StudentReportsPage() {
  const dispatch = useDispatch()
  const { interviewList, loading } = useSelector((state) => state.interview)

  useEffect(() => {
    dispatch(fetchInterviews())
  }, [dispatch])

  if (loading && interviewList.length === 0) return <PageLoader />

  const completed = interviewList.filter((i) => i.status === 'completed')

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">My Interviews</h1>
        <p className="text-muted-foreground">A record of your completed interview sessions.</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-3 py-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Detailed integrity assessments are securely shared with recruiters only.
          </p>
        </CardContent>
      </Card>

      {completed.length === 0 ? (
        <EmptyState icon={FileText} title="No completed interviews yet" description="Your finished interviews will appear here." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {completed.map((i) => (
            <Card key={i.id} className="animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="success">Completed</Badge>
              </div>
              <h3 className="mt-4 font-semibold">{i.title}</h3>
              <p className="text-sm text-muted-foreground">{i.recruiter_name || 'Recruiter'}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(i.start_time || i.created_at)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
