import { useEffect, useRef, useCallback } from 'react'
import monitoringService from '../services/monitoringService'
import violationService from '../services/violationService'
import { recordAudioFromStream } from '../services/audioRecorder'

// Backend currently scopes violations to a fixed demo student UUID (no auth in
// Phase 1). Used only to satisfy the violation schema; real ownership is Phase 2.
const DEMO_STUDENT_ID = '00000000-0000-0000-0000-000000000002'

const ATTENTION_INTERVAL_MS = 1000
const FACE_INTERVAL_MS = 2000
const OBJECT_INTERVAL_MS = 3000
const IDENTITY_INTERVAL_MS = 4000
const VOICE_RECORD_MS = 5000
const VOICE_COOLDOWN_MS = 1000
const EVENT_DEDUPE_MS = 5000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * useMonitoring
 * ------------------------------------------------------------------
 * Independent self-scheduling AI loops (no setInterval). Each channel runs:
 *   await cycle → wait configured delay → next cycle
 * A cycle never starts while the previous request for that channel is in flight.
 */
export function useMonitoring({ interviewId, localStream, active, sendMessage, candidateId }) {
  const lastEmit = useRef({})
  const lastStatusSent = useRef({})

  const report = useCallback(
    (type, opts = {}) => {
      const now = Date.now()
      if (lastEmit.current[type] && now - lastEmit.current[type] < EVENT_DEDUPE_MS) return
      lastEmit.current[type] = now

      const event = {
        type,
        duration: opts.duration ?? null,
        timestamp: new Date().toISOString(),
        message: opts.message || type.replace(/_/g, ' '),
      }

      sendMessage?.({ type: 'monitoring-event', event })

      violationService
        .record({
          interviewId,
          studentId: candidateId || DEMO_STUDENT_ID,
          type,
          duration: opts.duration ?? null,
          confidence: opts.confidence ?? 0,
        })
        .catch(() => {})
    },
    [interviewId, candidateId, sendMessage]
  )

  const pushStatus = useCallback(
    (partial) => {
      const changed = {}
      for (const [key, value] of Object.entries(partial)) {
        if (lastStatusSent.current[key] !== value) {
          changed[key] = value
          lastStatusSent.current[key] = value
        }
      }
      if (Object.keys(changed).length > 0) {
        sendMessage?.({ type: 'status-update', statuses: changed })
      }
    },
    [sendMessage]
  )

  useEffect(() => {
    if (!active || !localStream) return undefined

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = localStream
    video.play().catch(() => {})

    const canvas = document.createElement('canvas')
    let stopped = false

    const inFlight = {
      attention: false,
      face: false,
      object: false,
      identity: false,
      voice: false,
    }

    async function grabFrame() {
      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) return null
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, w, h)
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7))
    }

    async function runAttentionCheck() {
      if (stopped || inFlight.attention) return
      inFlight.attention = true
      try {
        const frame = await grabFrame()
        if (!frame || stopped) return

        const result = await monitoringService.analyzeAttention(frame)
        if (stopped || !result) return

        if (result.face_detected === false) {
          pushStatus({ attention: 'ATTENTION_LOSS' })
        } else {
          ;(result.reasons || []).forEach((r) => {
            if (r.startsWith('HEAD') || r.startsWith('EYE') || r === 'EYES_CLOSED') report(r)
          })
          pushStatus({
            attention: result.eyes_closed ? 'DROWSY' : result.attention_loss ? 'ATTENTION_LOSS' : 'ATTENTIVE',
            mouth: result.mouth_open ? 'MOUTH_OPEN' : 'MOUTH_CLOSED',
            lipsync: 'LIP_SYNC_OK',
          })
        }
      } catch {
        /* ignore monitoring errors */
      } finally {
        inFlight.attention = false
      }
    }

    async function runFaceCheck() {
      if (stopped || inFlight.face) return
      inFlight.face = true
      try {
        const frame = await grabFrame()
        if (!frame || stopped) return

        const d = await monitoringService.checkFace(frame)
        if (stopped || !d) return

        if (d.status === 'NO_FACE') {
          report('NO_FACE')
          pushStatus({ face: 'NO_FACE' })
        } else if (d.status === 'MULTIPLE_FACE') {
          report('MULTIPLE_PERSON_FACE')
          pushStatus({ face: 'MULTIPLE_FACE' })
        } else {
          pushStatus({ face: 'FACE_PRESENT' })
        }
      } catch {
        /* ignore */
      } finally {
        inFlight.face = false
      }
    }

    async function runObjectCheck() {
      if (stopped || inFlight.object) return
      inFlight.object = true
      try {
        const frame = await grabFrame()
        if (!frame || stopped) return

        const d = await monitoringService.checkObjects(frame)
        if (stopped || !d) return

        let detected = false
        if (d.phone) {
          report('OBJECT_PHONE')
          detected = true
        }
        if (d.book_count > 0) {
          report('OBJECT_BOOK')
          detected = true
        }
        if (d.laptop_count > 0) {
          report('OBJECT_DEVICE')
          detected = true
        }
        if (d.person_count >= 2) {
          report('MULTIPLE_PERSON_YOLO')
        }
        pushStatus({ object: detected ? 'OBJECT_DETECTED' : 'CLEAR' })
      } catch {
        /* ignore */
      } finally {
        inFlight.object = false
      }
    }

    async function runIdentityCheck() {
      if (stopped || inFlight.identity) return
      inFlight.identity = true
      try {
        const frame = await grabFrame()
        if (!frame || stopped) return

        const d = await monitoringService.verifyIdentity(frame, candidateId || DEMO_STUDENT_ID)
        if (stopped || d === undefined) return

        const verified = typeof d === 'boolean' ? d : d.verified
        if (verified === false) {
          report('IDENTITY_MISMATCH')
          pushStatus({ identity: 'IDENTITY_MISMATCH' })
        } else if (verified === true) {
          pushStatus({ identity: 'VERIFIED' })
        }
      } catch {
        /* ignore */
      } finally {
        inFlight.identity = false
      }
    }

    async function runVoiceCheck() {
      if (stopped || inFlight.voice) return
      inFlight.voice = true
      try {
        const blob = await recordAudioFromStream(localStream, VOICE_RECORD_MS)
        if (stopped || !blob) return

        const res = await monitoringService.verifyVoice(candidateId || DEMO_STUDENT_ID, blob)
        if (stopped || !res) return

        const sim = res?.similarity ?? null
        if (res?.status === 'VOICE_MISMATCH') {
          report('VOICE_MISMATCH')
          pushStatus({ voice: 'VOICE_MISMATCH', voiceSimilarity: sim })
        } else if (res?.status === 'SUSPICIOUS') {
          pushStatus({ voice: 'SUSPICIOUS', voiceSimilarity: sim })
        } else if (res?.status === 'VERIFIED') {
          pushStatus({ voice: 'VERIFIED', voiceSimilarity: sim })
        } else if (res?.status === 'NOT_REGISTERED') {
          pushStatus({ voice: 'NOT_REGISTERED' })
        }
      } catch (err) {
        console.warn('[useMonitoring] voice verify failed:', err?.message || err)
      } finally {
        inFlight.voice = false
      }
    }

    async function attentionLoop() {
      while (!stopped) {
        await runAttentionCheck()
        if (stopped) break
        await sleep(ATTENTION_INTERVAL_MS)
      }
    }

    async function faceLoop() {
      while (!stopped) {
        await runFaceCheck()
        if (stopped) break
        await sleep(FACE_INTERVAL_MS)
      }
    }

    async function objectLoop() {
      while (!stopped) {
        await runObjectCheck()
        if (stopped) break
        await sleep(OBJECT_INTERVAL_MS)
      }
    }

    async function identityLoop() {
      while (!stopped) {
        await runIdentityCheck()
        if (stopped) break
        await sleep(IDENTITY_INTERVAL_MS)
      }
    }

    async function voiceLoop() {
      while (!stopped) {
        await runVoiceCheck()
        if (stopped) break
        await sleep(VOICE_COOLDOWN_MS)
      }
    }

    attentionLoop()
    faceLoop()
    objectLoop()
    identityLoop()
    voiceLoop()

    return () => {
      stopped = true
      lastStatusSent.current = {}
      video.srcObject = null
    }
  }, [active, localStream, interviewId, candidateId, report, pushStatus])

  return { report }
}

export default useMonitoring
