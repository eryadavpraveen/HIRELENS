import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'

export default function StudentProfilePage() {
  const { user, role } = useAuth()

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">Profile</h1>
      <Card>
        <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <ProfileRow label="Name" value={user?.name} />
          <ProfileRow label="Email" value={user?.email} />
          <ProfileRow label="Role" value={<Badge className="capitalize">{role}</Badge>} />
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
