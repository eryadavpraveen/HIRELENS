import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { RTC_CONFIG, getLocalMedia, signalingUrl } from '../services/webrtcService'
import {
  addLiveEvent,
  updateStatuses,
  setConnected,
} from '../features/monitoring/monitoringSlice'

import { IS_MOCK } from '@/utils/env'

/**
 * useWebRTC
 * ------------------------------------------------------------------
 * Establishes a peer-to-peer audio/video call between the student and the
 * recruiter using a single WebSocket for signaling. The recruiter acts as the
 * deterministic offer initiator.
 *
 * It also routes inbound `monitoring-event` / `status-update` messages into
 * Redux when `receiveMonitoring` is true (recruiter side) so the dashboards
 * update live.
 *
 * If the signaling server is unreachable and mock mode is enabled, it falls
 * back to a local mock monitoring stream so the existing demo still works.
 *
 * Returns: { localStream, remoteStream, wsConnected, peerConnected, usingMock,
 *            sendMessage, setVideoEnabled, setAudioEnabled }
 */
export function useWebRTC({ interviewId, role, receiveMonitoring = false, onSessionEnd }) {
  const dispatch = useDispatch()

  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [peerConnected, setPeerConnected] = useState(false)
  const [usingMock, setUsingMock] = useState(false)

  const wsRef = useRef(null)
  const localStreamRef = useRef(null)
  const mockTimerRef = useRef(null)
  const onSessionEndRef = useRef(onSessionEnd)

  useEffect(() => {
    onSessionEndRef.current = onSessionEnd
  }, [onSessionEnd])

  const sendMessage = useCallback((msg) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
      return true
    }
    return false
  }, [])

  const setVideoEnabled = useCallback((on) => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = on
    })
  }, [])

  const setAudioEnabled = useCallback((on) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = on
    })
  }, [])

  useEffect(() => {
    if (!interviewId) return undefined

    let cancelled = false
    let ws = null
    let pc = null
    let localStreamLocal = null
    let opened = false
    let initiated = false
    let wantInitiate = false
    const pendingCandidates = []

    const send = (msg) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg))
      }
    }

    function ensurePeer() {
      if (pc) return pc
      pc = new RTCPeerConnection(RTC_CONFIG)

      pc.onicecandidate = (e) => {
        if (e.candidate) send({ type: 'ice-candidate', candidate: e.candidate })
      }
      pc.ontrack = (e) => {
        if (!cancelled) {
          setRemoteStream(e.streams[0])
          setPeerConnected(true)
        }
      }
      pc.onconnectionstatechange = () => {
        if (!pc) return
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          if (!cancelled) setPeerConnected(false)
        }
      }

      if (localStreamLocal) {
        localStreamLocal.getTracks().forEach((t) => pc.addTrack(t, localStreamLocal))
      }
      return pc
    }

    async function createOffer() {
      if (initiated || !localStreamLocal) return
      initiated = true
      const peer = ensurePeer()
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
      await peer.setLocalDescription(offer)
      send({ type: 'offer', sdp: peer.localDescription })
    }

    function maybeInitiate() {
      if (role !== 'recruiter') return
      if (localStreamLocal) createOffer()
      else wantInitiate = true
    }

    async function drainCandidates(peer) {
      while (pendingCandidates.length) {
        const c = pendingCandidates.shift()
        try {
          await peer.addIceCandidate(new RTCIceCandidate(c))
        } catch {
          /* ignore */
        }
      }
    }

    async function handle(msg) {
      switch (msg.type) {
        case 'room-joined':
          if (role === 'recruiter' && (msg.participants || []).includes('student')) maybeInitiate()
          break
        case 'peer-joined':
          if (role === 'recruiter' && msg.role === 'student') maybeInitiate()
          break
        case 'offer': {
          const peer = ensurePeer()
          await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          await drainCandidates(peer)
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          send({ type: 'answer', sdp: peer.localDescription })
          break
        }
        case 'answer': {
          const peer = ensurePeer()
          await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          await drainCandidates(peer)
          break
        }
        case 'ice-candidate': {
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
            } catch {
              /* ignore */
            }
          } else {
            pendingCandidates.push(msg.candidate)
          }
          break
        }
        case 'peer-left':
          if (!cancelled) {
            setRemoteStream(null)
            setPeerConnected(false)
          }
          if (pc) {
            pc.close()
            pc = null
          }
          initiated = false
          break
        case 'interview-completed':
          cancelled = true
          setRemoteStream(null)
          setPeerConnected(false)
          setWsConnected(false)
          dispatch(setConnected(false))
          if (pc) {
            pc.close()
            pc = null
          }
          localStreamLocal?.getTracks().forEach((t) => t.stop())
          localStreamRef.current = null
          try {
            ws?.close()
          } catch {
            /* ignore */
          }
          onSessionEndRef.current?.(msg.message || 'Interview completed by recruiter.')
          break
        case 'monitoring-event':
          if (receiveMonitoring && msg.event) dispatch(addLiveEvent(msg.event))
          break
        case 'status-update':
          if (receiveMonitoring && msg.statuses) dispatch(updateStatuses(msg.statuses))
          break
        default:
          break
      }
    }

    function startMockFallback() {
      if (!IS_MOCK || mockTimerRef.current || !receiveMonitoring) return
      setUsingMock(true)
      const seq = [
        ['HEAD_LEFT', 2.1],
        ['EYE_RIGHT', 1.4],
        ['NO_FACE', 3.5],
        ['TAB_SWITCH', 6.0],
        ['OBJECT_PHONE', 4.0],
        ['MULTIPLE_PERSON_FACE', 5.0],
        ['MULTIPLE_PERSON_YOLO', 5.0],
        ['VOICE_MISMATCH', 2.0],
        ['LIP_SYNC_MISMATCH', 1.5],
        ['FULLSCREEN_EXIT', 8.0],
      ]
      let i = 0
      mockTimerRef.current = setInterval(() => {
        const [type, duration] = seq[i % seq.length]
        i += 1
        dispatch(
          addLiveEvent({
            type,
            duration,
            timestamp: new Date().toISOString(),
            message: type.replace(/_/g, ' '),
          })
        )
      }, 6000)
    }

    // --- acquire local media ---
    getLocalMedia()
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamLocal = stream
        localStreamRef.current = stream
        setLocalStream(stream)
        if (pc) stream.getTracks().forEach((t) => pc.addTrack(t, stream))
        if (wantInitiate) createOffer()
      })
      .catch((err) => console.warn('[useWebRTC] getUserMedia failed:', err?.message))

    // --- connect signaling socket ---
    try {
      ws = new WebSocket(signalingUrl(interviewId, role))
      wsRef.current = ws
      ws.onopen = () => {
        opened = true
        if (!cancelled) {
          setWsConnected(true)
          dispatch(setConnected(true))
        }
      }
      ws.onmessage = (e) => {
        try {
          handle(JSON.parse(e.data))
        } catch {
          /* ignore malformed */
        }
      }
      ws.onclose = () => {
        if (!cancelled) {
          setWsConnected(false)
          dispatch(setConnected(false))
        }
        if (!opened) startMockFallback()
      }
      ws.onerror = () => {
        if (!opened) startMockFallback()
      }
    } catch {
      startMockFallback()
    }

    return () => {
      cancelled = true
      if (mockTimerRef.current) {
        clearInterval(mockTimerRef.current)
        mockTimerRef.current = null
      }
      try {
        ws && ws.close()
      } catch {
        /* ignore */
      }
      if (pc) {
        pc.close()
        pc = null
      }
      localStreamLocal?.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
  }, [interviewId, role, receiveMonitoring, dispatch])

  return {
    localStream,
    remoteStream,
    wsConnected,
    peerConnected,
    usingMock,
    sendMessage,
    setVideoEnabled,
    setAudioEnabled,
  }
}

export default useWebRTC
