import { useEffect, useRef, useState } from 'react'
import { Video, VideoOff, Wifi, WifiOff, User } from 'lucide-react'
import { cn } from '@/utils/helpers'

/**
 * Video tile.
 *  - `stream` : when provided (a MediaStream), it is attached directly — used
 *               for WebRTC local/remote streams. No getUserMedia is called.
 *  - `self`   : true => when no external stream, falls back to capturing the
 *               local webcam via getUserMedia (legacy/standalone preview).
 *               false => remote-peer tile (shows placeholder until a stream
 *               arrives).
 *  - `network`: 'good' | 'fair' | 'poor' connection-quality indicator.
 *
 * Backward compatible: existing callers that pass only `self`/`enabled`
 * keep the original getUserMedia preview behavior.
 */
export function VideoStream({
  enabled = true,
  self = true,
  muted = true,
  className,
  label = 'Live Video',
  network = 'good',
  connected = true,
  stream = null,
}) {
  const videoRef = useRef(null)
  const gumRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const el = videoRef.current

    // External stream (WebRTC): attach + ensure playback (unmuted remotes can fail autoplay).
    if (stream) {
      if (el) {
        if (el.srcObject !== stream) el.srcObject = stream
        const playAttempt = el.play?.()
        if (playAttempt?.catch) {
          playAttempt.catch(() => {
            // Browser blocked unmuted autoplay — retry muted so pixels still show.
            const wasMuted = el.muted
            el.muted = true
            el.play?.().catch(() => {})
            if (!wasMuted) {
              // Keep audio intent: unmute after a short delay if policy allows.
              setTimeout(() => {
                el.muted = false
                el.play?.().catch(() => {
                  el.muted = true
                })
              }, 250)
            }
          })
        }
      }
      return undefined
    }

    if (el) el.srcObject = null

    // No external stream + remote tile: nothing to capture.
    if (!self || !enabled) {
      gumRef.current?.getTracks().forEach((t) => t.stop())
      gumRef.current = null
      return undefined
    }

    // Legacy standalone preview path.
    let active = true
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        gumRef.current = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play?.().catch(() => {})
        }
      })
      .catch((err) => setError(err.message))

    return () => {
      active = false
      gumRef.current?.getTracks().forEach((t) => t.stop())
      gumRef.current = null
    }
  }, [enabled, self, stream])

  const networkConfig = {
    good: { icon: Wifi, color: 'text-success', label: 'Strong' },
    fair: { icon: Wifi, color: 'text-warning', label: 'Fair' },
    poor: { icon: WifiOff, color: 'text-danger', label: 'Weak' },
  }[network] || { icon: Wifi, color: 'text-success', label: 'Strong' }
  const NetIcon = networkConfig.icon

  const Overlay = (
    <>
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
        <Video className="h-3.5 w-3.5 text-success" />
        <span>{label}</span>
        {connected && <span className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />}
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
        <NetIcon className={cn('h-3.5 w-3.5', networkConfig.color)} />
        {networkConfig.label}
      </div>
    </>
  )

  // Self camera turned off
  if (self && !enabled) {
    return (
      <div className={cn('relative flex aspect-video items-center justify-center rounded-xl border border-border bg-muted/40', className)}>
        <div className="text-center">
          <VideoOff className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Camera Off</p>
        </div>
        <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white">{label}</div>
      </div>
    )
  }

  // getUserMedia error (legacy preview path only)
  if (self && error && !stream) {
    return (
      <div className={cn('relative flex aspect-video items-center justify-center rounded-xl border border-danger/30 bg-muted/40', className)}>
        <p className="px-4 text-center text-sm text-danger">Camera unavailable: {error}</p>
        <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white">{label}</div>
      </div>
    )
  }

  // Remote peer tile
  if (!self) {
    return (
      <div className={cn('relative aspect-video overflow-hidden rounded-xl border border-border bg-gradient-to-br from-secondary to-background', className)}>
        <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
        {!stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 ring-2 ring-primary/30">
              <User className="h-9 w-9 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {connected ? 'Connecting…' : 'Waiting for participant…'}
            </p>
          </div>
        )}
        {Overlay}
      </div>
    )
  }

  // Self tile (external stream or legacy preview)
  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-border bg-black', className)}>
      <video ref={videoRef} autoPlay playsInline muted={muted} className="aspect-video w-full object-cover" />
      {Overlay}
    </div>
  )
}

export default VideoStream
