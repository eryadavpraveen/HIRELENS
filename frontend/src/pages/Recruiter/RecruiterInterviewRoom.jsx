import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Radio, Clock, Wifi } from 'lucide-react'
import { fetchInterviewById } from '@/features/interview/interviewSlice'
import {
  clearMonitoring,
  setLiveEvents,
} from '@/features/monitoring/monitoringSlice'
import reportService from '@/services/reportService'
import { violationService } from '@/services/violationService'
import { VideoStream } from '@/components/interview/VideoStream'
import { CandidateInfoPanel } from '@/components/interview/InterviewDetails'
import { RecruiterInterviewControls } from '@/components/interview/InterviewControls'
import { EventTimeline } from '@/components/monitoring/EventTimeline'
import { MonitoringPanel } from '@/components/monitoring/MonitoringPanel'
import { IntegrityDashboard } from '@/components/monitoring/IntegrityDashboard'
import { ViolationDashboard } from '@/components/monitoring/ViolationDashboard'
import { ViolationTimeline } from '@/components/monitoring/ViolationTimeline'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { PageLoader } from '@/components/common/LoadingSpinner'
import interviewService from '@/services/interviewService'
import { formatDuration } from '@/utils/helpers'
import { useWebRTC } from '@/hooks/useWebRTC'

export default function RecruiterInterviewRoom() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { currentInterview } = useSelector((state) => state.interview)
  const { liveEvents, statuses } = useSelector((state) => state.monitoring)
  const [generating, setGenerating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [candidate, setCandidate] = useState(null)
  const [endedMessage, setEndedMessage] = useState('')
  const [sessionEnded, setSessionEnded] = useState(false)
  const sessionEndRef = useRef(false)

  const handleSessionEnd = useCallback((message) => {
    if (sessionEndRef.current) return
    sessionEndRef.current = true
    setEndedMessage(message)
    setSessionEnded(true)
    dispatch(clearMonitoring())
  }, [dispatch])

  // Real-time peer connection + inbound monitoring stream (recruiter role).
  const { localStream, remoteStream, peerConnected, wsConnected, setVideoEnabled, setAudioEnabled } = useWebRTC({
    interviewId: sessionEnded ? null : id,
    role: 'recruiter',
    receiveMonitoring: true,
    onSessionEnd: handleSessionEnd,
  })

  useEffect(() => {
    dispatch(fetchInterviewById(id))
    dispatch(clearMonitoring())
    // Monitoring statuses start empty and ONLY populate from events received
    // from the student over WebSocket — the recruiter is never monitored.
    // Seed the timeline with any already-stored violations for this interview.
    violationService
      .getByInterview(id)
      .then((events) => {
        if (events && events.length) dispatch(setLiveEvents(events))
      })
      .catch(() => { })

    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [dispatch, id])

  useEffect(() => {
    if (currentInterview?.status === 'completed') {
      handleSessionEnd('This interview has already been completed.')
    }
  }, [currentInterview, handleSessionEnd])

  useEffect(() => {
    if (!id) return
    interviewService
      .getParticipants(id)
      .then((participants) => {
        const primary = participants?.[0]
        if (primary?.name || primary?.email) {
          setCandidate({ name: primary.name, email: primary.email })
        }
      })
      .catch(() => { })
  }, [id])

  const displayCandidate = useMemo(() => {
    if (candidate?.name || candidate?.email) return candidate
    if (currentInterview?.candidate_name || currentInterview?.candidate_email) {
      return {
        name: currentInterview.candidate_name,
        email: currentInterview.candidate_email,
      }
    }
    return null
  }, [candidate, currentInterview])

  // Live integrity assessment derived from the streaming violation timeline.
  const assessment = useMemo(() => violationService.aggregate(liveEvents), [liveEvents])

  const handleEnd = () => {
    dispatch(clearMonitoring())
    navigate('/recruiter/dashboard')
  }

  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      await reportService.generateReport(id)
      navigate(`/recruiter/reports/${id}`)
    } finally {
      setGenerating(false)
    }
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

  if (!currentInterview) return <PageLoader />

  if (sessionEnded) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center gap-6 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15">
          <Radio className="h-8 w-8 text-success" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Interview Completed</h1>
          <p className="mt-2 text-muted-foreground">{endedMessage}</p>
        </div>
        <Button size="lg" onClick={() => navigate('/recruiter/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1700px] space-y-4 animate-fade-in">
      {/* Header / status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Monitoring: {currentInterview.title}</h1>
          <p className="text-sm text-muted-foreground">{displayCandidate?.name || currentInterview.candidate_name || 'Awaiting candidate'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={wsConnected ? 'success' : 'warning'} className="gap-1.5">
            <Radio className="h-3.5 w-3.5" /> {wsConnected ? 'Live' : 'Connecting'}
          </Badge>
          <Badge variant="accent" className="gap-1.5">
            <Wifi className="h-3.5 w-3.5" /> {peerConnected ? 'Peer Connected' : 'Awaiting Peer'}
          </Badge>
          <Badge variant="secondary" className="gap-1.5 font-mono">
            <Clock className="h-3.5 w-3.5" /> {formatDuration(elapsed)}
          </Badge>
        </div>
      </div>

      {!peerConnected && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          Waiting for participant in Interview ID: <span className="font-semibold">{id}</span>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Left: videos + candidate info */}
        <div className="space-y-4 xl:col-span-8">
          <div className="grid gap-4 md:grid-cols-2">
            <VideoStream self={false} stream={remoteStream} muted={false} label="Candidate Video" connected={peerConnected} />
            <VideoStream self={cameraOn} stream={localStream} label="Recruiter Video (You)" />
          </div>
          <RecruiterInterviewControls
            cameraOn={cameraOn}
            micOn={micOn}
            onToggleCamera={handleToggleCamera}
            onToggleMic={handleToggleMic}
            onEndInterview={handleEnd}
            onGenerateReport={handleGenerateReport}
            generating={generating}
          />
          <ViolationDashboard summary={assessment.summary} />
          <ViolationTimeline events={liveEvents} />
        </div>

        {/* Right: monitoring + integrity + live feed */}
        <div className="space-y-4 xl:col-span-4">
          <IntegrityDashboard score={assessment.integrityScore} compact />
          <MonitoringPanel statuses={statuses} />
          <CandidateInfoPanel candidate={displayCandidate} interview={currentInterview} />
          <EventTimeline events={liveEvents} />
        </div>
      </div>
    </div>
  )
}
