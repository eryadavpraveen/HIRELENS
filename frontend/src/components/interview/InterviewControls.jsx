import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  PhoneOff,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/common/Button'

export function StudentInterviewControls({
  cameraOn,
  micOn,
  onToggleCamera,
  onToggleMic,
  onEndInterview,
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl glass p-4">
      <Button variant={cameraOn ? 'secondary' : 'destructive'} onClick={onToggleCamera}>
        {cameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
        {cameraOn ? 'Camera On' : 'Camera Off'}
      </Button>
      <Button variant={micOn ? 'secondary' : 'destructive'} onClick={onToggleMic}>
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        {micOn ? 'Mic On' : 'Mic Off'}
      </Button>
      <Button variant="destructive" onClick={onEndInterview}>
        <PhoneOff className="h-4 w-4" />
        End Interview
      </Button>
    </div>
  )
}

export function RecruiterInterviewControls({
  cameraOn,
  micOn,
  onToggleCamera,
  onToggleMic,
  onEndInterview,
  onGenerateReport,
  generating,
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl glass p-4">
      <Button variant={cameraOn ? 'secondary' : 'destructive'} onClick={onToggleCamera}>
        {cameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
        {cameraOn ? 'Camera On' : 'Camera Off'}
      </Button>
      <Button variant={micOn ? 'secondary' : 'destructive'} onClick={onToggleMic}>
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        {micOn ? 'Mic On' : 'Mic Off'}
      </Button>
      <Button variant="destructive" onClick={onEndInterview}>
        <PhoneOff className="h-4 w-4" />
        End Interview
      </Button>
      <Button variant="default" onClick={onGenerateReport} disabled={generating}>
        <FileText className="h-4 w-4" />
        {generating ? 'Generating...' : 'Generate Report'}
      </Button>
    </div>
  )
}
