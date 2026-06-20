import { WS_BASE_URL } from '../utils/constants'

/**
 * WebRTC configuration + small helpers shared by the interview rooms.
 * Media is exchanged peer-to-peer; only signaling flows through the backend
 * WebSocket relay (see backend/app/api/signaling.py).
 */
export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

/** Acquire the local camera + microphone stream. */
export async function getLocalMedia() {
  return navigator.mediaDevices.getUserMedia({ video: true, audio: true })
}

/** Build the signaling WebSocket URL for an interview room + role. */
export function signalingUrl(interviewId, role) {
  const params = new URLSearchParams({ role })
  const token = localStorage.getItem('hirelens_token')
  if (token) params.set('token', token)
  return `${WS_BASE_URL}/ws/interview/${interviewId}?${params.toString()}`
}
