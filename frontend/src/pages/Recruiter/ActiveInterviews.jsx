import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Trash2, CheckCircle2, AlertCircle, CheckCheck } from 'lucide-react'
import { fetchInterviews, deleteInterview, completeInterview } from '@/features/interview/interviewSlice'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { LoadingSpinner, PageLoader } from '@/components/common/LoadingSpinner'
import { formatDateTime } from '@/utils/helpers'

export default function ActiveInterviewsPage() {
  const dispatch = useDispatch()
  const { interviewList, loading } = useSelector((state) => state.interview)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [completeTarget, setCompleteTarget] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [completingId, setCompletingId] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    dispatch(fetchInterviews())
  }, [dispatch])

  const showNotice = (type, message) => {
    setNotice({ type, message })
    setTimeout(() => setNotice(null), 4000)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    setDeletingId(target.id)
    const result = await dispatch(deleteInterview(target.id))
    setDeletingId(null)
    if (deleteInterview.fulfilled.match(result)) {
      showNotice('success', 'Interview deleted successfully.')
    } else {
      showNotice('error', 'Failed to delete interview. Please try again.')
    }
  }

  const handleConfirmComplete = async () => {
    if (!completeTarget) return
    const target = completeTarget
    setCompleteTarget(null)
    setCompletingId(target.id)
    const result = await dispatch(completeInterview(target.id))
    setCompletingId(null)
    if (completeInterview.fulfilled.match(result)) {
      showNotice('success', 'Interview marked as completed.')
    } else {
      showNotice('error', 'Failed to complete interview. Please try again.')
    }
  }

  if (loading) return <PageLoader />

  const interviews = interviewList.filter(
    (i) => i.status === 'active' || i.status === 'scheduled' || i.status === 'completed'
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">Active Interviews</h1>

      {notice && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-lg border p-3 text-sm animate-slide-up ${
            notice.type === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {interviews.length === 0 ? (
          <p className="text-muted-foreground">No interviews.</p>
        ) : (
          interviews.map((interview) => {
            const isCompleted = interview.status === 'completed'
            return (
              <Card key={interview.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{interview.title}</CardTitle>
                  {isCompleted ? (
                    <Badge variant="success">Completed</Badge>
                  ) : (
                    <Badge variant={interview.status === 'active' ? 'success' : 'accent'}>
                      {interview.status}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{formatDateTime(interview.start_time)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isCompleted && (
                      <>
                        <Button asChild size="sm">
                          <Link to={`/recruiter/interview/${interview.id}`}>Monitor</Link>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCompleteTarget(interview)}
                          disabled={completingId === interview.id}
                        >
                          {completingId === interview.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <>
                              <CheckCheck className="h-4 w-4" />
                              Complete
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    {isCompleted && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(interview)}
                        disabled={deletingId === interview.id}
                      >
                        {deletingId === interview.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onClick={() => setDeleteTarget(null)}
        >
          <Card
            className="w-full max-w-md animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle id="delete-dialog-title" className="flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5 text-danger" />
                Delete Interview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this interview? This action cannot be undone.
              </p>
              <p className="truncate text-sm font-medium">{deleteTarget.title}</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleConfirmDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {completeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-dialog-title"
          onClick={() => setCompleteTarget(null)}
        >
          <Card
            className="w-full max-w-md animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle id="complete-dialog-title" className="flex items-center gap-2 text-base">
                <CheckCheck className="h-5 w-5 text-success" />
                Complete Interview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Mark this interview as completed?
              </p>
              <p className="text-sm text-muted-foreground">
                After completion:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>Student cannot rejoin.</li>
                <li>Recruiter cannot reopen the interview.</li>
                <li>Monitoring will stop.</li>
                <li>Video/audio session will end.</li>
                <li>All interview data and reports will remain available.</li>
              </ul>
              <p className="text-sm font-medium text-warning">This action cannot be undone.</p>
              <p className="truncate text-sm font-medium">{completeTarget.title}</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setCompleteTarget(null)}>
                  Cancel
                </Button>
                <Button variant="success" size="sm" onClick={handleConfirmComplete}>
                  <CheckCheck className="h-4 w-4" />
                  Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
