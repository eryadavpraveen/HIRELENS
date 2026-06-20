import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/common/Table'
import { PageLoader, EmptyState } from '@/components/common/LoadingSpinner'
import { Users } from 'lucide-react'
import candidateService from '@/services/candidateService'

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    candidateService
      .getAll()
      .then((data) => {
        if (active) setCandidates(data)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load candidates')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">Candidates</h1>
      <Card>
        <CardHeader><CardTitle>All Candidates</CardTitle></CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : candidates.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No candidates yet"
              description="Students appear here after they join one of your interviews."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Interviews</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.interviews}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'active' ? 'success' : 'secondary'}>{c.status}</Badge>
                    </TableCell>
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
