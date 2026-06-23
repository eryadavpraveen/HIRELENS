import { WS_BASE_URL } from '../utils/constants'
import { rtcLog, rtcWarn } from '../utils/rtcLog'

/**
 * WebRTC configuration + small helpers shared by the interview rooms.
 * Media is exchanged peer-to-peer; only signaling flows through the backend
 * WebSocket relay (see backend/app/api/signaling.py).
 *
 * TURN is REQUIRED whenever the two peers are on different / restrictive
 * networks (symmetric NAT, mobile, corporate or campus firewalls) — STUN alone
 * cannot traverse those, so the call would silently never connect. Supply
 * working TURN credentials via env (see frontend/.env*.example):
 *
 *   VITE_TURN_URLS       comma-separated turn:/turns: URLs
 *   VITE_TURN_USERNAME   TURN username
 *   VITE_TURN_CREDENTIAL TURN credential / password
 *
 * Get a free key at https://www.metered.ca/tools/openrelay/ (or use Twilio /
 * Cloudflare TURN / self-hosted coturn). The old hardcoded openrelayproject
 * credentials are deprecated and no longer authenticate.
 */
const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function buildTurnServers() {
  const rawUrls = (import.meta.env.VITE_TURN_URLS || '').trim()
  const username = (import.meta.env.VITE_TURN_USERNAME || '').trim()
  const credential = (import.meta.env.VITE_TURN_CREDENTIAL || '').trim()

  if (!rawUrls) return []

  const urls = rawUrls
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)

  if (!urls.length) return []

  if (!username || !credential) {
    rtcWarn('config', 'VITE_TURN_URLS set but username/credential missing — TURN will fail auth')
  }

  return [{ urls, username, credential }]
}

function buildIceServers() {
  const turnServers = buildTurnServers()
  if (!turnServers.length) {
    rtcWarn(
      'config',
      'No TURN servers configured (VITE_TURN_URLS unset) — calls across different networks will not connect. STUN-only works on the same LAN.'
    )
  } else {
    rtcLog('config', 'TURN servers configured', turnServers[0].urls)
  }
  return [...STUN_SERVERS, ...turnServers]
}

export const RTC_CONFIG = {
  iceServers: buildIceServers(),
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
