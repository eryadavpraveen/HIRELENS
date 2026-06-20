import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/common/Table'
import { formatDate } from '@/utils/helpers'

const statusVariant = {
  scheduled: 'accent',
  active: 'success',
  completed: 'secondary',
  cancelled: 'danger',
}

export function RecentInterviewsTable({ interviews, joinPath, createPath, role }) {
  return (
    <Card className="animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Interviews</CardTitle>
        {role === 'student' && joinPath && (
          <Button asChild size="sm">
            <Link to={joinPath}>Join Interview</Link>
          </Button>
        )}
        {role === 'recruiter' && createPath && (
          <Button asChild size="sm">
            <Link to={createPath}>Create Interview</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {interviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No interviews yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interview Name</TableHead>
                {role === 'student' && <TableHead>Recruiter</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.slice(0, 5).map((interview) => (
                <TableRow key={interview.id}>
                  <TableCell className="font-medium">{interview.title}</TableCell>
                  {role === 'student' && (
                    <TableCell>{interview.recruiter_name || '—'}</TableCell>
                  )}
                  <TableCell>{formatDate(interview.start_time || interview.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[interview.status] || 'secondary'}>
                      {interview.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {role === 'student' && interview.status !== 'completed' && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/student/interview/${interview.id}`}>Enter</Link>
                      </Button>
                    )}
                    {role === 'recruiter' && interview.status === 'active' && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/recruiter/interview/${interview.id}`}>Monitor</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
