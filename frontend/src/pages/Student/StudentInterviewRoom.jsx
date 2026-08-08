import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Play, Maximize, Clock, ShieldCheck } from 'lucide-react'
import { fetchInterviewById, joinInterview } from '@/features/interview/interviewSlice'
import { clearMonitoring } from '@/features/monitoring/monitoringSlice'
import { VideoStream } from '@/components/interview/VideoStream'
import { StudentInterviewControls } from '@/components/interview/InterviewControls'
import { WarningToasts } from '@/components/interview/WarningToasts'
import { FullscreenExitOverlay } from '@/components/interview/FullscreenExitOverlay'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { formatDuration } from '@/utils/helpers'
import { isFullyVerified } from '@/utils/verification'
import interviewService from '@/services/interviewService'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useMonitoring } from '@/hooks/useMonitoring'

export default function StudentInterviewRoom() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { currentInterview } = useSelector((state) => state.interview)

  const [started, setStarted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [endedMessage, setEndedMessage] = useState('')
  const [fullscreenBlocked, setFullscreenBlocked] = useState(false)
  const [fullscreenError, setFullscreenError] = useState(null)
  const containerRef = useRef(null)
  const sessionEndRef = useRef(false)
  // While > Date.now(), WINDOW_BLUR / WINDOW_RESIZE caused by a fullscreen exit
  // are ignored (the ESC keypress cascades a resize/blur we must not double-count).
  const suppressUntilRef = useRef(0)

  // Gate: students cannot enter the room without completing photo + voice
  // registration. Missing either step redirects back to the verification page.
  const verified = isFullyVerified(id)
  useEffect(() => {
    if (!verified) navigate(`/student/interview/${id}/verify`, { replace: true })
  }, [verified, id, navigate])

  const handleSessionEnd = useCallback((message) => {
    if (sessionEndRef.current) return
    sessionEndRef.current = true
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    setEndedMessage(message)
    setSessionEnded(true)
  }, [])

  // Real-time peer connection (student role). Held back until verified so the
  // camera is not acquired during the redirect.
  const { localStream, remoteStream, peerConnected, sendMessage, setVideoEnabled, setAudioEnabled } =
    useWebRTC({
      interviewId: verified && !sessionEnded ? id : null,
      role: 'student',
      receiveMonitoring: false,
      onSessionEnd: handleSessionEnd,
    })

  // Live AI monitoring loop (runs only after the interview starts, until ended).
  const { report } = useMonitoring({
    interviewId: id,
    localStream,
    active: started && !sessionEnded,
    sendMessage,
    candidateId: id,
  })

  useEffect(() => {
    dispatch(fetchInterviewById(id))
    dispatch(clearMonitoring())
    dispatch(joinInterview(id)).unwrap().catch(() => {})
  }, [dispatch, id])

  useEffect(() => {
    if (currentInterview?.status === 'completed') {
      handleSessionEnd('This interview has already been completed.')
    }
  }, [currentInterview, handleSessionEnd])

  useEffect(() => {
    if (!started) return undefined
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [started])

  const requestFullscreen = useCallback(async () => {
    const el = containerRef.current || document.documentElement
    return el.requestFullscreen?.()
  }, [])

  const handleReturnToFullscreen = useCallback(async () => {
    try {
      await requestFullscreen()
      setFullscreenBlocked(false)
      setFullscreenError(null)
    } catch {
      setFullscreenError(
        'Could not enter fullscreen. Please allow fullscreen in your browser settings and try again.'
      )
    }
  }, [requestFullscreen])

  // TAB_SWITCH: record violation, complete interview (lock), tear down session.
  const terminateInterview = useCallback(
    async (reasonType) => {
      if (sessionEndRef.current) return
      sessionEndRef.current = true

      report(reasonType)

      if (reasonType === 'TAB_SWITCH') {
        try {
          await interviewService.complete(id, 'TAB_SWITCH')
        } catch {
          /* idempotent — interview may already be completed */
        }
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
        setEndedMessage(
          'Interview terminated due to tab switching. The interview has been marked as completed.'
        )
        setSessionEnded(true)
      }
    },
    [report, id]
  )

  // Environment proctoring — flows through the same monitoring pipeline
  // (warning popup + recruiter event + persistence) without showing analytics.
  useEffect(() => {
    if (!started || sessionEnded) return undefined

    const onVisibility = () => {
      // TAB SWITCH -> complete interview and end session.
      if (document.hidden) {
        terminateInterview('TAB_SWITCH')
      }
    }
    const onBlur = () => {
      // Ignore the blur that accompanies a tab switch (handled by termination)...
      if (document.hidden) return
      // ...and the blur cascaded by a fullscreen exit.
      if (Date.now() < suppressUntilRef.current) return
      report('WINDOW_BLUR')
    }
    const onResize = () => {
      // Ignore the resize cascaded by a fullscreen exit.
      if (Date.now() < suppressUntilRef.current) return
      report('WINDOW_RESIZE')
    }
    const onFsChange = () => {
      const fs = Boolean(document.fullscreenElement)
      setIsFullscreen(fs)
      if (!fs) {
        // FULLSCREEN_EXIT: record it, then suppress the blur/resize it cascades
        // for the next 3 seconds so they are not double-counted.
        suppressUntilRef.current = Date.now() + 3000
        report('FULLSCREEN_EXIT')
        setFullscreenBlocked(true)
        setFullscreenError(null)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onResize)
    document.addEventListener('fullscreenchange', onFsChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('fullscreenchange', onFsChange)
    }
  }, [started, sessionEnded, report, terminateInterview])

  const handleStart = () => {
    setStarted(true)
    requestFullscreen().catch(() => {})
  }

  const handleEnd = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    dispatch(clearMonitoring())
    navigate('/student/dashboard')
  }

  const handleToggleCamera = () => {
    setCameraOn((prev) => {
      const next = !prev
      setVideoEnabled(next)
      return next
    })
  }

  const handleToggleMic = () => {
    setMicOn((prev) => {
      const next = !prev
      setAudioEnabled(next)
      return next
    })
  }

  if (!verified || !currentInterview) return <PageLoader />

  if (sessionEnded) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center gap-6 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15">
          <ShieldCheck className="h-8 w-8 text-success" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Interview Completed</h1>
          <p className="mt-2 text-muted-foreground">{endedMessage}</p>
        </div>
        <Button size="lg" onClick={() => navigate('/student/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  // Pre-start lobby
  if (!started) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center gap-6 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{currentInterview.title}</h1>
          <p className="mt-2 text-muted-foreground">
            with {currentInterview.recruiter_name || 'your recruiter'}
          </p>
        </div>
        <div className="w-full max-w-md space-y-3">
          <VideoStream self stream={localStream} label="Camera Preview" />
          <VideoStream
            self={false}
            stream={remoteStream}
            muted={false}
            label={currentInterview.recruiter_name || 'Recruiter'}
            connected={peerConnected}
          />
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          This is a monitored interview. Please remain in fullscreen, keep your face visible,
          and avoid switching tabs or using other devices.
        </p>
        <Button size="lg" onClick={handleStart}>
          <Play className="h-5 w-5" />
          Start Interview
        </Button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="mx-auto max-w-[1400px] space-y-4 animate-fade-in">
      <WarningToasts />
      {fullscreenBlocked && (
        <FullscreenExitOverlay error={fullscreenError} onReturnToFullscreen={handleReturnToFullscreen} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{currentInterview.title}</h1>
        <div className="flex items-center gap-2">
          {!isFullscreen && !fullscreenBlocked && (
            <Button variant="outline" size="sm" onClick={handleReturnToFullscreen}>
              <Maximize className="h-4 w-4" />
              Return to Fullscreen
            </Button>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm font-semibold text-primary">{formatDuration(elapsed)}</span>
          </div>
        </div>
      </div>

      {!peerConnected && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          Waiting for participant in Interview ID: <span className="font-semibold">{id}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recruiter video (large) */}
        <div className="lg:col-span-2">
          <VideoStream
            self={false}
            stream={remoteStream}
            muted={false}
            label={currentInterview.recruiter_name || 'Recruiter'}
            connected={peerConnected}
          />
        </div>
        {/* Own camera preview (small) */}
        <div className="space-y-4">
          <VideoStream self={cameraOn} stream={localStream} label="Your Camera" />
          <Card className="text-center">
            <p className="text-sm text-muted-foreground">
              {peerConnected
                ? 'You are connected. Stay focused — your interview is being securely monitored.'
                : 'Waiting for recruiter to connect. Keep this page open.'}
            </p>
          </Card>
        </div>
      </div>

      <StudentInterviewControls
        cameraOn={cameraOn}
        micOn={micOn}
        onToggleCamera={handleToggleCamera}
        onToggleMic={handleToggleMic}
        onEndInterview={handleEnd}
      />
    </div>
  )
}
