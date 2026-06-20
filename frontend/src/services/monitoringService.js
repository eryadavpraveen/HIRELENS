import axios from 'axios'
import api from './api'
import { API_BASE_URL, ATTENTION_SERVICE_URL } from '../utils/constants'

/**
 * monitoringService
 * ------------------------------------------------------------------
 * Wraps every AI monitoring endpoint exposed by the FastAPI backend
 * (computer vision / identity / object) and the MediaPipe attention
 * service (face landmarks / voice). All calls accept a Blob/File frame
 * captured from the candidate's webcam or microphone.
 *
 * Endpoints (backend, :8000):
 *   POST /cv/check-face            -> { status, face_count }
 *   POST /identity/verify-identity -> { verified, similarity, ... }
 *   POST /object-detection/check   -> { detected, objects, ... }
 *   POST /verification/upload      -> { photo_path }
 *
 * Endpoints (attention service, :8001):
 *   POST /attention/analyze        -> { face_detected, horizontal, ... }
 *   POST /voice/register           -> { status }
 *   POST /voice/verify             -> { status, similarity }
 */

// Dedicated client for the MediaPipe attention micro-service.
const attentionApi = axios.create({
  baseURL: ATTENTION_SERVICE_URL,
  timeout: 30000,
})

attentionApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('hirelens_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function frameForm(frame, fieldName = 'file', filename = 'frame.jpg') {
  const form = new FormData()
  form.append(fieldName, frame, filename)
  return form
}

export const monitoringService = {
  /** Face presence / multiple face detection. */
  checkFace: async (frame) => {
    const { data } = await api.post('/cv/check-face', frameForm(frame), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** Identity verification against the candidate's own registered reference photo. */
  verifyIdentity: async (frame, candidateId) => {
    const form = frameForm(frame)
    form.append('candidate_id', candidateId)
    const { data } = await api.post('/identity/verify-identity', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** Prohibited object detection (phone / book / second device). */
  checkObjects: async (frame) => {
    const { data } = await api.post('/object-detection/check', frameForm(frame), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** Upload + register the candidate reference photo at verification time. */
  uploadVerificationPhoto: async (frame, candidateId) => {
    const form = frameForm(frame)
    form.append('candidate_id', candidateId)
    const { data } = await api.post('/verification/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** Head pose + eye + attention + mouth landmarks (MediaPipe service). */
  analyzeAttention: async (frame) => {
    const { data } = await attentionApi.post('/attention/analyze', frameForm(frame), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** Register a candidate voiceprint. */
  registerVoice: async (candidateId, audioBlob) => {
    const form = new FormData()
    form.append('candidate_id', candidateId)
    form.append('audio', audioBlob, 'voice.webm')
    const { data } = await attentionApi.post('/voice/register', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  /** Verify live audio against the registered voiceprint. */
  verifyVoice: async (candidateId, audioBlob) => {
    const form = new FormData()
    form.append('candidate_id', candidateId)
    form.append('audio', audioBlob, 'voice.webm')
    const { data } = await attentionApi.post('/voice/verify', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}

export const MONITORING_ENDPOINTS = {
  base: API_BASE_URL,
  attention: ATTENTION_SERVICE_URL,
}

export default monitoringService
