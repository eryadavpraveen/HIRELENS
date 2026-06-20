import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchReportById } from '@/features/report/reportSlice'
import { ReportSummary } from '@/components/reports/ReportSummary'
import { PageLoader } from '@/components/common/LoadingSpinner'

export default function ReportDetailPage({ role = 'student' }) {
  const { id } = useParams()
  const dispatch = useDispatch()
  const { selectedReport, loading } = useSelector((state) => state.report)

  useEffect(() => {
    dispatch(fetchReportById(id))
  }, [dispatch, id])

  if (loading || !selectedReport) return <PageLoader />

  return (
    <div className="animate-fade-in">
      <ReportSummary report={selectedReport} role={role} />
    </div>
  )
}
