import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Search, Download, Eye, FileText, ArrowUpDown, Calendar, User } from 'lucide-react'
import { fetchReports } from '@/features/report/reportSlice'
import { Card, CardContent } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { PageLoader, EmptyState } from '@/components/common/LoadingSpinner'
import { CircularProgress } from '@/components/common/CircularProgress'
import { getEvaluation } from '@/utils/violations'
import reportService from '@/services/reportService'
import { generateReportPdf } from '@/utils/pdfGenerator'
import { formatDate, cn } from '@/utils/helpers'

const EVAL_FILTERS = ['ALL', 'EXCELLENT', 'GOOD', 'SUSPICIOUS', 'HIGH RISK']

export default function RecruiterReportsPage() {
  const dispatch = useDispatch()
  const { reports, loading } = useSelector((state) => state.report)
  const [query, setQuery] = useState('')
  const [evalFilter, setEvalFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('date')

  useEffect(() => {
    dispatch(fetchReports())
  }, [dispatch])

  const filtered = useMemo(() => {
    let list = [...reports]
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (r) =>
          r.candidate_name?.toLowerCase().includes(q) ||
          r.interview_title?.toLowerCase().includes(q) ||
          r.candidate_email?.toLowerCase().includes(q)
      )
    }
    if (evalFilter !== 'ALL') {
      list = list.filter((r) => r.evaluation === evalFilter)
    }
    list.sort((a, b) => {
      if (sortBy === 'score') return (b.integrity_score || 0) - (a.integrity_score || 0)
      if (sortBy === 'name') return (a.candidate_name || '').localeCompare(b.candidate_name || '')
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })
    return list
  }, [reports, query, evalFilter, sortBy])

  if (loading && reports.length === 0) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Candidate Reports</h1>
        <p className="text-muted-foreground">Search, filter and download integrity assessments.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by candidate, interview or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Search reports"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {EVAL_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setEvalFilter(f)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  evalFilter === f
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort reports"
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="date">Newest</option>
              <option value="score">Integrity Score</option>
              <option value="name">Candidate Name</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No reports found" description="Try adjusting your search or filters." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const evaluation = getEvaluation(r.integrity_score || 0)
            return (
              <Card key={r.id} className="flex flex-col gap-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{r.candidate_name}</h3>
                    <p className="truncate text-sm text-muted-foreground">{r.interview_title}</p>
                  </div>
                  <CircularProgress value={r.integrity_score || 0} size={64} strokeWidth={6} color={evaluation.color}>
                    <span className="text-sm font-bold" style={{ color: evaluation.color }}>{r.integrity_score}</span>
                  </CircularProgress>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(r.created_at)}</span>
                  <span className={cn('rounded-full border px-2.5 py-0.5 font-semibold', evaluation.badge)}>{evaluation.label}</span>
                </div>

                <div className="mt-auto flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to={`/recruiter/reports/${r.id}`}><Eye className="h-4 w-4" /> View</Link>
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={async () => {
                      const full = await reportService.getById(r.id)
                      generateReportPdf(full)
                    }}
                  >
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
