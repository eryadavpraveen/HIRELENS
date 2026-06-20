import api from './api'
import { mockReports } from '../utils/mockData'
import { violationService } from './violationService'

import { IS_MOCK } from '../utils/env'

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Normalize API report shape for UI components. */
function normalizeReport(report) {
  if (!report) return report
  return {
    ...report,
    interview_title: report.interview_title || report.title || 'Interview',
    candidate_name: report.candidate_name || '—',
    candidate_email: report.candidate_email || '',
    created_at: report.created_at || report.end_time || report.start_time || null,
  }
}

/** Attach the computed integrity assessment (summary, score, evaluation). */
function enrich(report) {
  if (!report) return report
  const normalized = normalizeReport(report)
  const assessment = violationService.aggregate(normalized.events || [])
  return {
    ...normalized,
    summary: assessment.summary,
    integrity_score: assessment.integrityScore,
    evaluation: assessment.evaluation.label,
  }
}

export const reportService = {
  getAll: async () => {
    if (IS_MOCK) {
      await delay(300)
      return mockReports.map(enrich)
    }
    const { data } = await api.get('/reports/')
    return Array.isArray(data) ? data.map(enrich) : data
  },

  getById: async (reportId) => {
    if (IS_MOCK) {
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
    if (IS_MOCK) {
      await delay(200)
      const report = mockReports.find((r) => r.interview_id === interviewId)
      if (report) return enrich(report)
      return enrich({ interview_id: interviewId, events: [] })
    }
    const events = await violationService.getByInterview(interviewId)
    return enrich({ interview_id: interviewId, events })
  },

  generateReport: async (interviewId) => {
    if (IS_MOCK) {
      await delay(700)
      return { message: 'Report generated', report_id: `rep-${Date.now()}` }
    }
    const { data } = await api.post(`/reports/generate/${interviewId}`)
    return data
  },
}

export default reportService
