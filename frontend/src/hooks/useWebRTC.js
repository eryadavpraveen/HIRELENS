import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { RTC_CONFIG, getLocalMedia, signalingUrl } from '../services/webrtcService'
import { getValidAccessToken } from '../services/api'
import {
  addLiveEvent,
  updateStatuses,
  setConnected,
} from '../features/monitoring/monitoringSlice'
import { rtcLog, rtcWarn } from '../utils/rtcLog'

import { IS_MOCK } from '@/utils/env'

/**
 * useWebRTC — peer connection + signaling WebSocket for interview rooms.
 *
 * Media must exist before offer/answer so both SDP sides include sendrecv video.
 * ontrack always attaches tracks even when e.streams is empty.
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
    let intentionalClose = false
    let reconnectTimer = null
    let offerPollTimer = null
    let everOpened = false
    let peerLive = false
    let pendingRemoteOffer = null
    const remoteMediaStream = new MediaStream()
    const pendingCandidates = []
    const PROTECTED_SIGNALING = new Set(['have-local-offer', 'have-remote-offer', 'stable'])
    const log = (msg, data) => rtcLog(role, msg, data)
    const warn = (msg, data) => rtcWarn(role, msg, data)

    function publishRemoteStream() {
      if (cancelled) return
      // New MediaStream wrapper so React sees a distinct object when tracks are added.
      setRemoteStream(new MediaStream(remoteMediaStream.getTracks()))
      setPeerConnected(true)
      peerLive = true
    }

    function handleRemoteTrack(event) {
      const track = event.track
      if (!track) return
      log('ontrack', {
        kind: track.kind,
        id: track.id,
        streams: event.streams?.length ?? 0,
        readyState: track.readyState,
        enabled: track.enabled,
      })

      const inbound = event.streams?.[0]
      if (inbound) {
        inbound.getTracks().forEach((t) => {
          if (!remoteMediaStream.getTracks().includes(t)) remoteMediaStream.addTrack(t)
        })
      } else if (!remoteMediaStream.getTracks().includes(track)) {
        remoteMediaStream.addTrack(track)
      }

      track.onunmute = () => {
        log('remote track unmuted', track.kind)
        publishRemoteStream()
      }
      publishRemoteStream()
    }

    function attachLocalTracks(peer) {
      if (!peer || !localStreamLocal) return 0
      const existing = new Set(peer.getSenders().map((s) => s.track).filter(Boolean))
      let added = 0
      localStreamLocal.getTracks().forEach((track) => {
        if (!existing.has(track)) {
          peer.addTrack(track, localStreamLocal)
          added += 1
        }
      })
      if (added) {
        log(
          'local tracks added to peer',
          localStreamLocal.getTracks().map((t) => `${t.kind}:${t.readyState}:${t.enabled}`),
        )
      }
      return added
    }

    function canResetPeer({ sessionEnd = false, reason = '' } = {}) {
      if (sessionEnd) return true
      if (!pc) return true
      const signalingState = pc.signalingState
      const connectionState = pc.connectionState
      if (connectionState === 'failed' || connectionState === 'closed') return true
      if (PROTECTED_SIGNALING.has(signalingState)) {
        warn('resetPeer blocked', { reason, signalingState, connectionState })
        return false
      }
      return true
    }

    function clearPeerState() {
      initiated = false
      pendingCandidates.length = 0
      pendingRemoteOffer = null
      remoteMediaStream.getTracks().forEach((t) => {
        remoteMediaStream.removeTrack(t)
      })
      if (!cancelled) {
        setRemoteStream(null)
        setPeerConnected(false)
        peerLive = false
      }
    }

    function closePeerSession(reason) {
      if (pc) {
        log('closePeerSession', {
          reason,
          signalingState: pc.signalingState,
          connectionState: pc.connectionState,
        })
        pc.close()
        pc = null
      }
      clearPeerState()
    }

    function resetPeer(reason = 'unknown', options = {}) {
      if (!canResetPeer({ ...options, reason })) return false
      if (pc) {
        log('resetPeer', {
          reason,
          signalingState: pc.signalingState,
          connectionState: pc.connectionState,
        })
        pc.close()
        pc = null
      }
      clearPeerState()
      return true
    }

    function resendLocalOffer() {
      if (!pc?.localDescription?.sdp) return false
      const sig = pc.signalingState
      if (sig !== 'have-local-offer') {
        log('resendLocalOffer skipped', { signalingState: sig })
        return false
      }
      send({ type: 'offer', sdp: pc.localDescription })
      log('offer re-sent without reset', { signalingState: sig })
      return true
    }

    function isPeerEstablished() {
      return (
        peerLive ||
        pc?.connectionState === 'connected' ||
        pc?.iceConnectionState === 'connected' ||
        pc?.iceConnectionState === 'completed'
      )
    }

    function shouldInitiateOffer() {
      if (isPeerEstablished()) return false
      if (pc?.signalingState === 'stable' && pc?.remoteDescription?.type === 'answer') return false
      return true
    }

    const send = (msg) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg))
        if (msg.type === 'offer') log('offer sent')
        else if (msg.type === 'answer') log('answer sent')
        else if (msg.type === 'ice-candidate') log('ICE candidate sent')
        else if (msg.type === 'request-offer') log('request-offer sent')
        else if (msg.type === 'auth') log('auth sent')
        else if (msg.type === 'status-update') log('status-update sent', msg.statuses)
        else if (msg.type === 'monitoring-event') log('monitoring-event sent', msg.event?.type)
      }
    }

    function bindPeerEvents(peer) {
      peer.onicecandidate = (e) => {
        if (e.candidate) send({ type: 'ice-candidate', candidate: e.candidate })
      }
      peer.oniceconnectionstatechange = () => {
        log('iceConnectionState', peer.iceConnectionState)
        if (peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed') {
          if (!cancelled && !peerLive) {
            setPeerConnected(true)
            peerLive = true
          }
        }
      }
      peer.onconnectionstatechange = () => {
        log('connectionState', {
          connectionState: peer.connectionState,
          iceConnectionState: peer.iceConnectionState,
          signalingState: peer.signalingState,
        })
        if (peer.connectionState === 'connected') {
          if (!cancelled) {
            setPeerConnected(true)
            peerLive = true
          }
        }
        if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
          if (!cancelled) {
            setPeerConnected(false)
            peerLive = false
          }
          if (peer.connectionState === 'failed') warn('peer connection failed')
        }
      }
      peer.ontrack = handleRemoteTrack
    }

    function ensurePeer() {
      if (pc) {
        log('ensurePeer reuse', {
          signalingState: pc.signalingState,
          connectionState: pc.connectionState,
          senders: pc.getSenders().filter((s) => s.track).map((s) => s.track.kind),
        })
        attachLocalTracks(pc)
        return pc
      }
      log('ensurePeer create — new RTCPeerConnection')
      pc = new RTCPeerConnection(RTC_CONFIG)
      bindPeerEvents(pc)
      attachLocalTracks(pc)
      return pc
    }

    async function drainCandidates(peer) {
      while (pendingCandidates.length) {
        const c = pendingCandidates.shift()
        try {
          await peer.addIceCandidate(new RTCIceCandidate(c))
          log('ICE candidate applied (drained)')
        } catch (err) {
          warn('ICE drain failed', err?.message)
        }
      }
    }

    async function answerOffer(msg) {
      if (!localStreamLocal) {
        pendingRemoteOffer = msg
        warn('offer deferred — waiting for local media before answer')
        return
      }
      const peer = ensurePeer()
      if (peer.signalingState === 'have-local-offer') {
        warn('offer ignored — unexpected have-local-offer on answerer')
        return
      }
      attachLocalTracks(peer)
      await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp))
      await drainCandidates(peer)
      if (peer.signalingState !== 'have-remote-offer') {
        warn('offer handler — expected have-remote-offer after setRemote', peer.signalingState)
        return
      }
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      const sdp = peer.localDescription?.sdp || ''
      log('answer created', {
        hasVideo: sdp.includes('m=video'),
        senders: peer.getSenders().filter((s) => s.track).map((s) => s.track.kind),
        signalingState: peer.signalingState,
      })
      send({ type: 'answer', sdp: peer.localDescription })
    }

    async function createOffer({ force = false } = {}) {
      if (!localStreamLocal) {
        warn('createOffer skipped — no local media yet')
        return
      }
      if (initiated && !force) return

      if (force && pc) {
        if (!resetPeer('createOffer')) {
          if (resendLocalOffer()) return
          warn('createOffer aborted — cannot reset or re-send offer')
          return
        }
      }

      try {
        initiated = true
        const peer = ensurePeer()
        attachLocalTracks(peer)
        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)
        const sdp = peer.localDescription?.sdp || ''
        log('offer created', {
          hasVideo: sdp.includes('m=video'),
          senders: peer.getSenders().filter((s) => s.track).map((s) => s.track.kind),
        })
        send({ type: 'offer', sdp: peer.localDescription })
      } catch (err) {
        initiated = false
        warn('createOffer failed', err?.message || err)
      }
    }

    function maybeInitiate(force = false) {
      if (role !== 'recruiter') return
      if (!shouldInitiateOffer()) {
        log('maybeInitiate skipped — offer not needed', {
          signalingState: pc?.signalingState,
          connectionState: pc?.connectionState,
        })
        return
      }
      log('maybeInitiate', { force, hasMedia: Boolean(localStreamLocal), initiated })
      if (localStreamLocal) createOffer({ force })
    }

    async function handle(msg) {
      log('ws message', { type: msg.type, from: msg.from || msg.role })

      try {
        switch (msg.type) {
          case 'room-joined':
            log('room-joined', { participants: msg.participants })
            if (!cancelled) {
              setWsConnected(true)
              dispatch(setConnected(true))
              startOfferPoll()
            }
            if (role === 'recruiter' && (msg.participants || []).includes('student') && shouldInitiateOffer()) {
              maybeInitiate(true)
            }
            if (role === 'student' && (msg.participants || []).includes('recruiter')) {
              send({ type: 'request-offer' })
            }
            break
          case 'peer-joined':
            log('peer joined', msg.role)
            if (role === 'recruiter' && msg.role === 'student' && shouldInitiateOffer()) maybeInitiate(true)
            if (role === 'student' && msg.role === 'recruiter') {
              send({ type: 'request-offer' })
            }
            break
          case 'request-offer':
            if (role === 'recruiter' && shouldInitiateOffer()) maybeInitiate(true)
            break
          case 'offer':
            log('offer received', { signalingState: pc?.signalingState })
            await answerOffer(msg)
            break
          case 'answer': {
            log('answer received', { signalingState: pc?.signalingState })
            const peer = ensurePeer()
            if (peer.signalingState !== 'have-local-offer') {
              warn('answer ignored — expected have-local-offer', peer.signalingState)
              break
            }
            await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            await drainCandidates(peer)
            log('answer applied', {
              connectionState: peer.connectionState,
              iceConnectionState: peer.iceConnectionState,
              signalingState: peer.signalingState,
            })
            break
          }
          case 'ice-candidate': {
            log('ICE candidate received')
            if (pc && pc.remoteDescription?.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
              } catch (err) {
                warn('addIceCandidate failed', err?.message)
              }
            } else {
              pendingCandidates.push(msg.candidate)
              log('ICE candidate queued', { pending: pendingCandidates.length })
            }
            break
          }
          case 'peer-left':
            warn('peer-left', msg.role)
            closePeerSession('peer-left')
            break
          case 'interview-completed':
            cancelled = true
            setWsConnected(false)
            dispatch(setConnected(false))
            closePeerSession('interview-completed')
            localStreamLocal?.getTracks().forEach((t) => t.stop())
            localStreamRef.current = null
            try {
              ws?.close()
            } catch {
              /* ignore */
            }
            onSessionEndRef.current?.(msg.message || 'Interview completed by recruiter.')
            break
          case 'auth-error':
            warn('signaling auth failed', msg.message)
            break
          case 'monitoring-event':
            if (receiveMonitoring && msg.event) dispatch(addLiveEvent(msg.event))
            break
          case 'status-update':
            if (receiveMonitoring && msg.statuses) {
              log('status-update received', msg.statuses)
              dispatch(updateStatuses(msg.statuses))
            }
            break
          default:
            break
        }
      } catch (err) {
        warn(`handler error on ${msg.type}`, err?.message || err)
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
          }),
        )
      }, 6000)
    }

    function scheduleReconnect() {
      if (cancelled || intentionalClose || reconnectTimer) return
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connectSignaling()
      }, 3000)
    }

    function startOfferPoll() {
      if (offerPollTimer) return
      offerPollTimer = setInterval(() => {
        if (cancelled || !ws || ws.readyState !== WebSocket.OPEN) return
        if (peerLive) return
        if (role === 'student') {
          send({ type: 'request-offer' })
        } else if (role === 'recruiter') {
          if (!initiated && localStreamLocal) maybeInitiate(false)
          else if (pc?.connectionState === 'failed') maybeInitiate(true)
        }
      }, 5000)
    }

    async function connectSignaling() {
      if (cancelled) return
      if (ws) {
        try {
          ws.close()
        } catch {
          /* ignore */
        }
        ws = null
      }
      opened = false
      try {
        const token = await getValidAccessToken()
        const url = signalingUrl(interviewId, role)
        ws = new WebSocket(url)
        wsRef.current = ws
        ws.onopen = () => {
          everOpened = true
          opened = true
          log('WebSocket open')
          if (token) send({ type: 'auth', token })
        }
        ws.onmessage = (e) => {
          try {
            handle(JSON.parse(e.data))
          } catch {
            warn('malformed ws message')
          }
        }
        ws.onclose = (ev) => {
          opened = false
          warn('WebSocket close', { code: ev.code, reason: ev.reason })
          if (!cancelled) {
            setWsConnected(false)
            dispatch(setConnected(false))
          }
          if (!intentionalClose && !cancelled) {
            if (!everOpened) startMockFallback()
            scheduleReconnect()
          }
        }
        ws.onerror = () => {
          warn('WebSocket error')
          if (!opened) startMockFallback()
        }
      } catch (err) {
        warn('connectSignaling failed', err?.message)
        startMockFallback()
        scheduleReconnect()
      }
    }

    // Acquire local media FIRST, then open signaling — prevents answer/offer without send tracks.
    ;(async () => {
      try {
        const stream = await getLocalMedia()
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamLocal = stream
        localStreamRef.current = stream
        setLocalStream(stream)
        log(
          'local media acquired',
          stream.getTracks().map((t) => `${t.kind}:${t.readyState}:${t.enabled}`),
        )
        if (pc) attachLocalTracks(pc)
        if (pendingRemoteOffer) {
          const deferred = pendingRemoteOffer
          pendingRemoteOffer = null
          await answerOffer(deferred)
        }
        if (!cancelled) await connectSignaling()
      } catch (err) {
        warn('getUserMedia failed', err?.message || err)
        // Still connect so room messaging works; video will remain one-way/absent.
        if (!cancelled) await connectSignaling()
      }
    })()

    return () => {
      cancelled = true
      intentionalClose = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (offerPollTimer) {
        clearInterval(offerPollTimer)
        offerPollTimer = null
      }
      if (mockTimerRef.current) {
        clearInterval(mockTimerRef.current)
        mockTimerRef.current = null
      }
      try {
        ws && ws.close()
      } catch {
        /* ignore */
      }
      closePeerSession('hook-cleanup')
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
