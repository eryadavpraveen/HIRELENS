import { useEffect, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import websocketService from '../services/websocketService'
import {
  addLiveEvent,
  updateStatuses,
  pushWarning,
  setConnected,
} from '../features/monitoring/monitoringSlice'
import { categorizeViolation } from '../utils/violations'

/**
 * Translate a raw violation event into a partial status update for the
 * 8-signal recruiter monitoring panel + a human-readable warning message.
 */
function deriveStatusUpdate(rawType) {
  const t = String(rawType || '').toUpperCase()
  const cat = categorizeViolation(t)

  switch (cat) {
    case 'no_face':
      return { status: { face: 'NO_FACE' }, warning: 'No face detected. Please stay in frame.' }
    case 'multiple_person':
      return { status: { face: 'MULTIPLE_FACE' }, warning: 'Multiple people detected in frame.' }
    case 'object':
      return { status: { object: 'OBJECT_DETECTED' }, warning: 'A prohibited object was detected.' }
    case 'voice':
      return { status: { voice: 'VOICE_MISMATCH' }, warning: 'Voice mismatch detected.' }
    case 'lipsync':
      return { status: { lipsync: 'LIP_SYNC_MISMATCH' }, warning: 'Lip sync mismatch detected.' }
    case 'identity':
      return { status: { identity: 'IDENTITY_MISMATCH' }, warning: 'Identity mismatch detected.' }
    case 'eye':
      return {
        status: { attention: t === 'EYES_CLOSED' ? 'DROWSY' : 'ATTENTION_LOSS' },
        warning: 'Please keep your eyes on the screen.',
      }
    case 'head':
      return { status: { attention: 'ATTENTION_LOSS' }, warning: 'Please face the screen.' }
    case 'tab_switch':
      return { status: {}, warning: 'Tab switch detected. Return to the interview.' }
    case 'window':
      return { status: {}, warning: 'Window focus lost. Stay on the interview.' }
    case 'fullscreen':
      return { status: {}, warning: 'You exited fullscreen. Please return to fullscreen.' }
    default:
      return { status: {}, warning: null }
  }
}

export function useInterviewWebSocket(interviewId, { enabled = true, withWarnings = false } = {}) {
  const dispatch = useDispatch()
  const connectionRef = useRef(null)

  const handleMessage = useCallback(
    (data) => {
      dispatch(
        addLiveEvent({
          type: data.type,
          duration: data.duration ?? null,
          message: data.message || String(data.type || '').replace(/_/g, ' '),
          timestamp: data.timestamp,
        })
      )

      const { status, warning } = deriveStatusUpdate(data.type)
      if (Object.keys(status).length) dispatch(updateStatuses(status))
      if (withWarnings && warning) dispatch(pushWarning({ message: warning, type: data.type }))
    },
    [dispatch, withWarnings]
  )

  useEffect(() => {
    if (!enabled || !interviewId) return

    connectionRef.current = websocketService.connect(`/ws/interview/${interviewId}`, {
      onMessage: handleMessage,
      onOpen: () => dispatch(setConnected(true)),
      onClose: () => dispatch(setConnected(false)),
    })

    return () => {
      websocketService.disconnect(`/ws/interview/${interviewId}`)
    }
  }, [interviewId, enabled, handleMessage, dispatch])

  // Expose a getter so callers can access the live connection without
  // reading the ref during render.
  return { getConnection: () => connectionRef.current }
}

export default useInterviewWebSocket
