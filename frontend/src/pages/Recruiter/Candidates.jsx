import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/common/Table'
import { mockCandidates } from '@/utils/mockData'

export default function CandidatesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">Candidates</h1>
      <Card>
        <CardHeader><CardTitle>All Candidates</CardTitle></CardHeader>
        <CardContent>
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
              {mockCandidates.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.interviews}</TableCell>
                  <TableCell><Badge variant={c.status === 'active' ? 'success' : 'secondary'}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
