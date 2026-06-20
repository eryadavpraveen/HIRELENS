import { Download, ShieldCheck, Calendar, User, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { IntegrityDashboard } from '@/components/monitoring/IntegrityDashboard'
import { ViolationDashboard } from '@/components/monitoring/ViolationDashboard'
import { ViolationTimeline } from '@/components/monitoring/ViolationTimeline'
import { ViolationDistributionChart } from '@/components/charts/AnalyticsCharts'
import { generateReportPdf } from '@/utils/pdfGenerator'
import { formatDate } from '@/utils/helpers'

/**
 * Report detail view.
 *  - recruiter: full integrity assessment + violation dashboard + timeline + PDF.
 *  - student: interview metadata only (no monitoring analytics, per spec).
 */
export function ReportSummary({ report, role = 'student' }) {
  if (!report) return null

  if (role !== 'recruiter') {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold">{report.interview_title || 'Interview'}</h2>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Integrity analytics for this interview are available to recruiters only.
            </p>
          </CardContent>
        </Card>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Meta icon={Calendar} label="Date" value={formatDate(report.start_time || report.created_at)} />
            <Meta icon={User} label="Recruiter" value={report.recruiter_name || '—'} />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{report.interview_title || 'Interview Report'}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{report.candidate_name}</span>
            <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{report.candidate_email}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDate(report.start_time || report.created_at)}</span>
          </div>
        </div>
        <Button onClick={() => generateReportPdf(report)}>
          <Download className="h-4 w-4" />
          Download PDF Report
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <IntegrityDashboard score={report.integrity_score} />
        <div className="lg:col-span-2">
          <ViolationDistributionChart counts={report.summary?.counts} />
        </div>
      </div>

      <ViolationDashboard summary={report.summary} />
      <ViolationTimeline events={report.events} maxHeight="500px" />
    </div>
  )
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

export default ReportSummary
