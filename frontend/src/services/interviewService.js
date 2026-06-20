import api from './api'
import { mockInterviews } from '../utils/mockData'
import { generateInterviewCode } from '../utils/helpers'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export const interviewService = {
  getAll: async () => {
    if (USE_MOCK) {
      await delay(300)
      return mockInterviews
    }
    const { data } = await api.get('/interviews/')
    return data
  },

  getById: async (id) => {
    if (USE_MOCK) {
      await delay(200)
      const interview = mockInterviews.find((i) => i.id === id)
      if (!interview) throw new Error('Interview not found')
      return interview
    }
    const { data } = await api.get(`/interviews/${id}`)
    return data
  },

  create: async (interviewData) => {
    if (USE_MOCK) {
      await delay(500)
      const code = generateInterviewCode()
      const id = `int-${Date.now()}`
      return {
        message: 'Interview created',
        id,
        code,
        link: `${window.location.origin}/student/join?code=${code}`,
        interview: {
          ...interviewData,
          id,
          code,
          status: 'scheduled',
          created_at: new Date().toISOString(),
        },
      }
    }
    const payload = {
      title: interviewData.title,
      description: interviewData.description,
      start_time: interviewData.start_time,
      end_time: interviewData.end_time,
    }
    const { data } = await api.post('/interviews/', payload)
    return data
  },

  join: async (interviewId) => {
    if (USE_MOCK) {
      await delay(300)
      const interview = mockInterviews.find((i) => i.id === interviewId)
      if (interview?.status === 'completed') {
        throw new Error('This interview has already been completed.')
      }
      return { message: 'Joined interview', participant_id: `part-${Date.now()}` }
    }
    const { data } = await api.post(`/interviews/${interviewId}/join`)
    return data
  },

  validateJoin: async ({ interviewId, code, link }) => {
    if (USE_MOCK) {
      await delay(400)
      let interview = null
      if (interviewId) {
        interview = mockInterviews.find((i) => i.id === interviewId)
      } else if (code) {
        interview = mockInterviews.find((i) => i.code?.toUpperCase() === code.toUpperCase())
      } else if (link) {
        const urlCode = new URL(link, window.location.origin).searchParams.get('code')
        if (urlCode) {
          interview = mockInterviews.find((i) => i.code?.toUpperCase() === urlCode.toUpperCase())
        }
      }
      if (!interview) throw new Error('Invalid interview ID, code, or link')
      if (interview.status === 'completed') {
        throw new Error('This interview has already been completed.')
      }
      return interview
    }

    if (interviewId) {
      const { data } = await api.get(`/interviews/${interviewId}/join-preview`)
      return data
    }
    throw new Error('Provide interview ID for backend validation')
  },

  getParticipants: async (interviewId) => {
    if (USE_MOCK) {
      await delay(200)
      return [{ id: 'part-1', student_id: 'stu-001', joined_at: new Date().toISOString() }]
    }
    const { data } = await api.get(`/interviews/${interviewId}/participants`)
    return data
  },

  endInterview: async (interviewId) => {
    if (USE_MOCK) {
      await delay(300)
      return { message: 'Interview ended', status: 'completed' }
    }
    // Wire to backend when endpoint exists
    return { message: 'Interview ended' }
  },

  remove: async (interviewId) => {
    if (USE_MOCK) {
      await delay(300)
      return { message: 'Interview deleted successfully', id: interviewId }
    }
    const { data } = await api.delete(`/interviews/${interviewId}`)
    return data
  },

  complete: async (interviewId, reason = 'RECRUITER') => {
    if (USE_MOCK) {
      await delay(300)
      const interview = mockInterviews.find((i) => i.id === interviewId)
      if (!interview) throw new Error('Interview not found')
      if (interview.status === 'completed') return { ...interview }
      interview.status = 'completed'
      interview.completed_at = new Date().toISOString()
      return { ...interview }
    }
    const { data } = await api.patch(`/interviews/${interviewId}/complete`, { reason })
    return data
  },
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default interviewService
