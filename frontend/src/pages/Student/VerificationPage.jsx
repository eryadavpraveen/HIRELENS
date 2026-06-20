import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Camera, Mic, ShieldCheck, CheckCircle2, Loader2, RefreshCw, ArrowRight } from 'lucide-react'
import { fetchInterviewById } from '@/features/interview/interviewSlice'
import monitoringService from '@/services/monitoringService'
import { recordAudio } from '@/services/audioRecorder'
import { setVerificationStep, isFullyVerified } from '@/utils/verification'
import { Button } from '@/components/common/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card'
import { cn } from '@/utils/helpers'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const VOICE_CLIP_MS = 5000

function StepIndicator({ index, title, done, active }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
          done
            ? 'border-success/40 bg-success/15 text-success'
            : active
              ? 'border-primary/40 bg-primary/15 text-primary'
              : 'border-border bg-muted/30 text-muted-foreground'
        )}
      >
        {done ? <CheckCircle2 className="h-5 w-5" /> : index}
      </div>
      <span className={cn('text-sm', done || active ? 'text-foreground' : 'text-muted-foreground')}>{title}</span>
    </div>
  )
}

export default function VerificationPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { currentInterview } = useSelector((state) => state.interview)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  const [photoBlob, setPhotoBlob] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [voiceBlob, setVoiceBlob] = useState(null)
  const [recording, setRecording] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Already verified (e.g. navigated back) -> show the success screen.
  const [done, setDone] = useState(() => isFullyVerified(id))

  useEffect(() => {
    if (!currentInterview) dispatch(fetchInterviewById(id))
  }, [dispatch, id, currentInterview])

  useEffect(() => {
    if (currentInterview?.status === 'completed') {
      setError('This interview has already been completed.')
    }
  }, [currentInterview])

  // Acquire the camera for the photo capture step.
  useEffect(() => {
    let active = true
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch((err) => setError(`Camera unavailable: ${err.message}`))
    return () => {
      active = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setPhotoBlob(blob)
        setPhotoPreview(URL.createObjectURL(blob))
      },
      'image/jpeg',
      0.85
    )
  }

  const retakePhoto = () => {
    setPhotoBlob(null)
    setPhotoPreview(null)
  }

  const handleRecordVoice = async () => {
    setError('')
    setRecording(true)
    try {
      const blob = await recordAudio(VOICE_CLIP_MS)
      setVoiceBlob(blob)
    } catch (err) {
      setError(`Microphone unavailable: ${err.message}`)
    } finally {
      setRecording(false)
    }
  }

  const handleSubmit = async () => {
    if (!photoBlob || !voiceBlob) return
    setSubmitting(true)
    setError('')
    try {
      // STEP 3: register both reference samples against this candidate id.
      await monitoringService.uploadVerificationPhoto(photoBlob, id)
      setVerificationStep(id, { photo: true })

      await monitoringService.registerVoice(id, voiceBlob)
      setVerificationStep(id, { voice: true })

      setDone(true)
    } catch (err) {
      if (USE_MOCK) {
        // Mock fallback: allow the demo to proceed even without the backend.
        setVerificationStep(id, { photo: true, voice: true })
        setDone(true)
      } else {
        setError(err?.response?.data?.detail || err.message || 'Verification failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const enterRoom = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    navigate(`/student/interview/${id}`)
  }

  if (currentInterview?.status === 'completed') {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15">
          <ShieldCheck className="h-9 w-9 text-success" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Interview Completed</h1>
          <p className="mt-2 text-muted-foreground">This interview has already been completed.</p>
        </div>
        <Button size="lg" onClick={() => navigate('/student/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  const photoDone = Boolean(photoBlob)
  const voiceDone = Boolean(voiceBlob)

  // STEP 4 + 5: success screen -> enter interview room.
  if (done) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-6 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15">
          <CheckCircle2 className="h-9 w-9 text-success" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Verification Complete</h1>
          <p className="mt-2 text-muted-foreground">
            Your identity and voice have been registered for this interview.
          </p>
        </div>
        <Button size="lg" onClick={enterRoom}>
          Enter Interview Room
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Identity Verification</h1>
        <p className="text-muted-foreground">
          Complete verification for {currentInterview?.title || 'your interview'} before joining.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <StepIndicator index={1} title="Capture Photo" done={photoDone} active={!photoDone} />
          <StepIndicator index={2} title="Record Voice" done={voiceDone} active={photoDone && !voiceDone} />
          <StepIndicator index={3} title="Register" done={false} active={photoDone && voiceDone} />
          <StepIndicator index={4} title="Enter Room" done={false} active={false} />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* STEP 1: photo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Verification Photo
            </CardTitle>
            <CardDescription>This becomes your identity reference for the interview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-border bg-black">
              {photoPreview ? (
                <img src={photoPreview} alt="Verification capture" className="aspect-video w-full object-cover" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
              )}
            </div>
            {photoDone ? (
              <Button variant="outline" className="w-full" onClick={retakePhoto}>
                <RefreshCw className="h-4 w-4" /> Retake Photo
              </Button>
            ) : (
              <Button className="w-full" onClick={capturePhoto}>
                <Camera className="h-4 w-4" /> Capture Photo
              </Button>
            )}
          </CardContent>
        </Card>

        {/* STEP 2: voice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" /> Voice Sample
            </CardTitle>
            <CardDescription>Speak naturally for a few seconds to register your voiceprint.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/30">
              {recording ? (
                <>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/15">
                    <Mic className="h-8 w-8 animate-pulse text-danger" />
                  </span>
                  <p className="text-sm text-muted-foreground">Recording… please speak</p>
                </>
              ) : voiceDone ? (
                <>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </span>
                  <p className="text-sm text-muted-foreground">Voice sample recorded</p>
                </>
              ) : (
                <>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Mic className="h-8 w-8 text-primary" />
                  </span>
                  <p className="text-sm text-muted-foreground">Ready to record</p>
                </>
              )}
            </div>
            <Button
              variant={voiceDone ? 'outline' : 'default'}
              className="w-full"
              onClick={handleRecordVoice}
              disabled={recording}
            >
              {recording ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Recording…
                </>
              ) : voiceDone ? (
                <>
                  <RefreshCw className="h-4 w-4" /> Re-record Voice
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" /> Record Voice Sample
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Button size="lg" className="w-full" onClick={handleSubmit} disabled={!photoDone || !voiceDone || submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Registering Verification…
          </>
        ) : (
          <>
            <ShieldCheck className="h-5 w-5" /> Register & Continue
          </>
        )}
      </Button>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
