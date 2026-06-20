import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'

export default function RecruiterProfilePage() {
  const { user, role } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">Profile</h1>
      <Card>
        <CardHeader><CardTitle>Recruiter Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between border-b border-white/5 pb-3">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-3">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge className="capitalize">{role}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
