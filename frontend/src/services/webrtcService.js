import { WS_BASE_URL } from '../utils/constants'
import { rtcLog } from '../utils/rtcLog'

/**
 * WebRTC configuration + small helpers shared by the interview rooms.
 * Media is exchanged peer-to-peer; only signaling flows through the backend
 * WebSocket relay (see backend/app/api/signaling.py).
 */
export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
}

/** Acquire the local camera + microphone stream. */
export async function getLocalMedia() {
  return navigator.mediaDevices.getUserMedia({ video: true, audio: true })
}

/** Build the signaling WebSocket URL (role only — token sent after connect). */
export function signalingUrl(interviewId, role) {
  const params = new URLSearchParams({ role })
  const url = `${WS_BASE_URL}/ws/interview/${interviewId}?${params.toString()}`
  rtcLog(role, 'signaling URL built', { url, interviewId })
  return url
}
