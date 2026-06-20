import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchInterviews } from '@/features/interview/interviewSlice'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/common/Table'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { formatDate } from '@/utils/helpers'

export default function InterviewHistoryPage() {
  const dispatch = useDispatch()
  const { interviewList, loading } = useSelector((state) => state.interview)

  useEffect(() => {
    dispatch(fetchInterviews())
  }, [dispatch])

  if (loading) return <PageLoader />

  const completed = interviewList.filter((i) => i.status === 'completed')

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">Interview History</h1>
      <Card>
        <CardHeader><CardTitle>Past Interviews</CardTitle></CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No completed interviews yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Recruiter</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completed.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.title}</TableCell>
                    <TableCell>{i.recruiter_name}</TableCell>
                    <TableCell>{formatDate(i.start_time)}</TableCell>
                    <TableCell><Badge variant="success">{i.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
