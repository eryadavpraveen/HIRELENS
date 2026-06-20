import api from './api'
import { buildViolationSummary, computeIntegrityScore, getEvaluation } from '../utils/violations'
import { mockReports } from '../utils/mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * violationService
 * ------------------------------------------------------------------
 * CRUD for violation records plus client-side aggregation.
 *
 * Backend endpoints (:8000):
 *   POST /violations/                 -> create a violation
 *   GET  /violations/{interview_id}   -> list violations for an interview
 *
 * The backend stores raw event rows only; HIRELENS computes the violation
 * summary, integrity score and evaluation on the client via the integrity
 * engine (utils/violations.js).
 */
export const violationService = {
  /** Record a single violation event. */
  record: async ({ interviewId, studentId, type, duration = null, confidence = 0 }) => {
    if (USE_MOCK) {
      await delay(120)
      return { message: 'Violation recorded (mock)', id: `v-${Date.now()}` }
    }
    const { data } = await api.post('/violations/', {
      interview_id: interviewId,
      student_id: studentId,
      type,
      duration,
      confidence,
    })
    return data
  },

  /** Fetch the raw timeline for an interview. */
  getByInterview: async (interviewId) => {
    if (USE_MOCK) {
      await delay(200)
      const report = mockReports.find((r) => r.interview_id === interviewId)
      return report ? report.events : []
    }
    const { data } = await api.get(`/violations/${interviewId}`)
    return data
  },

  /**
   * Fetch + aggregate into a full integrity assessment for an interview.
   * Returns { events, summary, integrityScore, evaluation }.
   */
  getAssessment: async (interviewId) => {
    const events = await violationService.getByInterview(interviewId)
    return violationService.aggregate(events)
  },

  /** Pure aggregation helper (no I/O) — also used for live computation. */
  aggregate: (events = []) => {
    const summary = buildViolationSummary(events)
    const integrityScore = computeIntegrityScore(summary.counts)
    const evaluation = getEvaluation(integrityScore)
    return { events, summary, integrityScore, evaluation }
  },
}

export default violationService
