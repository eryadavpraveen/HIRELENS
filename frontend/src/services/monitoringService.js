import api from './api'
import { API_BASE_URL } from '../utils/constants'
import { ensureWavBlob } from './audioRecorder'

/**
 * monitoringService — AI monitoring via the main API (proxies attention service when needed).
 */

function frameForm(frame, fieldName = 'file', filename = 'frame.jpg') {
  const form = new FormData()
  form.append(fieldName, frame, filename)
  return form
}

const VOICE_TIMEOUT_MS = 120000

export const monitoringService = {
  checkFace: async (frame) => {
    const { data } = await api.post('/cv/check-face', frameForm(frame), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  verifyIdentity: async (frame, candidateId) => {
    const form = frameForm(frame)
    form.append('candidate_id', candidateId)
    const { data } = await api.post('/identity/verify-identity', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  checkObjects: async (frame) => {
    const { data } = await api.post('/object-detection/check', frameForm(frame), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  uploadVerificationPhoto: async (frame, candidateId) => {
    const form = frameForm(frame)
    form.append('candidate_id', candidateId)
    const { data } = await api.post('/verification/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
    return data
  },

  analyzeAttention: async (frame) => {
    const { data } = await api.post('/attention/analyze', frameForm(frame), {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
    return data
  },

  registerVoice: async (candidateId, audioBlob) => {
    const wavBlob = await ensureWavBlob(audioBlob)
    const form = new FormData()
    form.append('candidate_id', candidateId)
    form.append('audio', wavBlob, 'voice.wav')
    const { data } = await api.post('/voice/register', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: VOICE_TIMEOUT_MS,
    })
    return data
  },

  verifyVoice: async (candidateId, audioBlob) => {
    const wavBlob = await ensureWavBlob(audioBlob)
    const form = new FormData()
    form.append('candidate_id', candidateId)
    form.append('audio', wavBlob, 'voice.wav')
    const { data } = await api.post('/voice/verify', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: VOICE_TIMEOUT_MS,
    })
    return data
  },
}

export const MONITORING_ENDPOINTS = {
  base: API_BASE_URL,
}

export default monitoringService
