import {
  ScanFace,
  UserCheck,
  Smartphone,
  Eye,
  Smile,
  AudioLines,
  Mic,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { getStatusLevel } from '@/utils/violations'
import { cn } from '@/utils/helpers'

const SIGNAL_ICONS = {
  face: ScanFace,
  identity: UserCheck,
  object: Smartphone,
  attention: Eye,
  mouth: Smile,
  lipsync: AudioLines,
  voice: Mic,
}

const SIGNALS = [
  { key: 'face', label: 'Face Status' },
  { key: 'identity', label: 'Identity Status' },
  { key: 'object', label: 'Object Status' },
  { key: 'attention', label: 'Attention Status' },
  { key: 'mouth', label: 'Mouth Status' },
  { key: 'lipsync', label: 'Lip Sync Status' },
  { key: 'voice', label: 'Voice Status' },
]

function humanizeStatus(value) {
  if (!value) return '—'
  return String(value).replace(/_/g, ' ')
}

function StatusRow({ icon: Icon, label, value }) {
  const level = getStatusLevel(value)
  return (
    <div className={cn('flex items-center justify-between rounded-lg border px-3 py-2.5', level.ring, level.bg)}>
      <div className="flex items-center gap-2.5">
        <Icon className={cn('h-4 w-4', level.text)} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-semibold uppercase tracking-wide', level.text)}>
          {humanizeStatus(value)}
        </span>
        <span className={cn('h-2.5 w-2.5 rounded-full', level.dot, 'animate-pulse-soft')} />
      </div>
    </div>
  )
}

/**
 * Recruiter-only live monitoring panel. Renders the 8 monitoring signals
 * (Face / Identity / Object / Attention / Mouth / Lip Sync / Voice + Voice
 * Similarity) with the green / yellow / orange / red status color system.
 */
export function MonitoringPanel({ statuses = {}, className }) {
  const similarity = statuses.voiceSimilarity
  const simPct = similarity != null ? Math.round(similarity * 100) : null
  const simLevel =
    simPct == null
      ? getStatusLevel('PENDING')
      : simPct >= 85
        ? getStatusLevel('VERIFIED')
        : simPct >= 75
          ? getStatusLevel('SUSPICIOUS')
          : getStatusLevel('VOICE_MISMATCH')

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Live Monitoring</CardTitle>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-success" />
          Real-time
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {SIGNALS.map((s) => (
          <StatusRow key={s.key} icon={SIGNAL_ICONS[s.key]} label={s.label} value={statuses[s.key]} />
        ))}

        {/* Voice Similarity (numeric) */}
        <div className={cn('rounded-lg border px-3 py-2.5', simLevel.ring, simLevel.bg)}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Voice Similarity</span>
            <span className={cn('text-sm font-bold', simLevel.text)}>
              {simPct == null ? '—' : `${simPct}%`}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${simPct ?? 0}%`, backgroundColor: simLevel.hex }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MonitoringPanel
