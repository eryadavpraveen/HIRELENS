import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Calendar, Clock, CheckCircle, Mail, User, Video } from 'lucide-react'
import { fetchInterviews } from '@/features/interview/interviewSlice'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { InterviewCard } from '@/components/dashboard/InterviewCard'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { PageLoader, EmptyState } from '@/components/common/LoadingSpinner'
import { mockDashboardStats } from '@/utils/mockData'
import { useAuth } from '@/hooks/useAuth'

export default function StudentDashboard() {
  const dispatch = useDispatch()
  const { interviewList, loading } = useSelector((state) => state.interview)
  const { user } = useAuth()
  const stats = mockDashboardStats.student

  useEffect(() => {
    dispatch(fetchInterviews())
  }, [dispatch])

  if (loading && interviewList.length === 0) return <PageLoader />

  const upcoming = interviewList.filter((i) => i.status !== 'completed')

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name || 'Student'}</p>
      </div>

      {/* Profile card */}
      <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-bold text-white">
            {(user?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.name || 'Student'}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5" />{user?.email || '—'}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3.5 w-3.5" />Candidate</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/student/join"><Video className="h-4 w-4" /> Join Interview</Link>
        </Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="Total Interviews" value={stats.totalInterviews} icon={Calendar} accent="primary" />
        <DashboardCard title="Upcoming Interviews" value={stats.upcomingInterviews} icon={Clock} accent="accent" />
        <DashboardCard title="Completed Interviews" value={stats.completedInterviews} icon={CheckCircle} accent="success" />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Upcoming Interviews</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/student/history">View all</Link></Button>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState icon={Calendar} title="No upcoming interviews" description="You're all caught up." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((i) => (
              <InterviewCard key={i.id} interview={i} role="student" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
