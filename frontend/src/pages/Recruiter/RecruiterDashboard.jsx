import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Calendar, Radio, Users, FileText } from 'lucide-react'
import { fetchInterviews } from '@/features/interview/interviewSlice'
import { fetchReports } from '@/features/report/reportSlice'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { RecentInterviewsTable } from '@/components/dashboard/RecentInterviewsTable'
import {
  IntegrityTrendChart,
  ViolationDistributionChart,
  CandidateComparisonChart,
} from '@/components/charts/AnalyticsCharts'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { mockDashboardStats, mockIntegrityTrend, mockCandidateComparison } from '@/utils/mockData'
import { useAuth } from '@/hooks/useAuth'

export default function RecruiterDashboard() {
  const dispatch = useDispatch()
  const { interviewList, loading } = useSelector((state) => state.interview)
  const { reports } = useSelector((state) => state.report)
  const { user } = useAuth()
  const stats = mockDashboardStats.recruiter

  useEffect(() => {
    dispatch(fetchInterviews())
    dispatch(fetchReports())
  }, [dispatch])

  // Aggregate violation distribution across all generated reports.
  const aggregatedCounts = useMemo(() => {
    const totals = {}
    reports.forEach((r) => {
      const counts = r.summary?.counts || {}
      Object.entries(counts).forEach(([k, v]) => {
        totals[k] = (totals[k] || 0) + v
      })
    })
    return totals
  }, [reports])

  if (loading && interviewList.length === 0) return <PageLoader />

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name || 'Recruiter'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Total Interviews" value={stats.totalInterviews} icon={Calendar} trend="+3 this month" />
        <DashboardCard title="Active Interviews" value={stats.activeInterviews} icon={Radio} accent="success" trend="Live now" />
        <DashboardCard title="Candidates Evaluated" value={stats.candidates} icon={Users} accent="accent" />
        <DashboardCard title="Reports Generated" value={stats.reportsGenerated} icon={FileText} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IntegrityTrendChart data={mockIntegrityTrend} />
        <ViolationDistributionChart counts={aggregatedCounts} />
      </div>

      <CandidateComparisonChart data={mockCandidateComparison} />

      <RecentInterviewsTable
        interviews={interviewList}
        role="recruiter"
        createPath="/recruiter/create"
      />
    </div>
  )
}
