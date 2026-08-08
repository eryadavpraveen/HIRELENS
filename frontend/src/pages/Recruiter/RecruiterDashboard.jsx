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
import { useAuth } from '@/hooks/useAuth'

export default function RecruiterDashboard() {
  const dispatch = useDispatch()
  const { interviewList, loading } = useSelector((state) => state.interview)
  const { reports } = useSelector((state) => state.report)
  const { user } = useAuth()

  useEffect(() => {
    dispatch(fetchInterviews())
    dispatch(fetchReports())
  }, [dispatch])

  const stats = useMemo(() => {
    const activeInterviews = interviewList.filter(
      (i) => i.status === 'active' || i.status === 'scheduled'
    ).length
    const candidates = new Set(
      reports.map((r) => r.candidate_email || r.candidate_name || r.id).filter(Boolean)
    ).size

    return {
      totalInterviews: interviewList.length,
      activeInterviews,
      candidates,
      reportsGenerated: reports.length,
    }
  }, [interviewList, reports])

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

  const integrityTrend = useMemo(
    () =>
      reports
        .slice()
        .reverse()
        .slice(-8)
        .map((r, index) => ({
          interview: r.interview_title || `Report ${index + 1}`,
          score: r.integrity_score ?? 0,
        })),
    [reports]
  )

  const candidateComparison = useMemo(
    () =>
      reports.slice(0, 10).map((r) => ({
        name: r.candidate_name || 'Candidate',
        score: r.integrity_score ?? 0,
      })),
    [reports]
  )

  if (loading && interviewList.length === 0) return <PageLoader />

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.name || 'Recruiter'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Total Interviews" value={stats.totalInterviews} icon={Calendar} />
        <DashboardCard title="Active Interviews" value={stats.activeInterviews} icon={Radio} accent="success" />
        <DashboardCard title="Candidates Evaluated" value={stats.candidates} icon={Users} accent="accent" />
        <DashboardCard title="Reports Generated" value={stats.reportsGenerated} icon={FileText} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IntegrityTrendChart data={integrityTrend} />
        <ViolationDistributionChart counts={aggregatedCounts} />
      </div>

      <CandidateComparisonChart data={candidateComparison} />

      <RecentInterviewsTable
        interviews={interviewList}
        role="recruiter"
        createPath="/recruiter/create"
      />
    </div>
  )
}
