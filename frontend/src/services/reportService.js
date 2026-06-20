import api from './api'
import { mockReports } from '../utils/mockData'
import { violationService } from './violationService'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Attach the computed integrity assessment (summary, score, evaluation). */
function enrich(report) {
  if (!report) return report
  const assessment = violationService.aggregate(report.events || [])
  return {
    ...report,
    summary: assessment.summary,
    integrity_score: assessment.integrityScore,
    evaluation: assessment.evaluation.label,
  }
}

export const reportService = {
  getAll: async () => {
    if (USE_MOCK) {
      await delay(300)
      return mockReports.map(enrich)
    }
    const { data } = await api.get('/reports/')
    return Array.isArray(data) ? data.map(enrich) : data
  },

  getById: async (reportId) => {
    if (USE_MOCK) {
      await delay(200)
      const report =
        mockReports.find((r) => r.id === reportId) ||
        mockReports.find((r) => r.interview_id === reportId)
      // Fall back to an empty (in-progress) report so detail pages never crash.
      return enrich(report || { id: reportId, interview_id: reportId, events: [] })
    }
    const { data } = await api.get(`/reports/${reportId}`)
    return enrich(data)
  },

  /** Build a report directly from an interview's violation timeline. */
  getByInterview: async (interviewId) => {
    if (USE_MOCK) {
      await delay(200)
      const report = mockReports.find((r) => r.interview_id === interviewId)
      if (report) return enrich(report)
      return enrich({ interview_id: interviewId, events: [] })
    }
    const events = await violationService.getByInterview(interviewId)
    return enrich({ interview_id: interviewId, events })
  },

  generateReport: async (interviewId) => {
    if (USE_MOCK) {
      await delay(700)
      return { message: 'Report generated', report_id: `rep-${Date.now()}` }
    }
    const { data } = await api.post(`/reports/generate/${interviewId}`)
    return data
  },
}

export default reportService
