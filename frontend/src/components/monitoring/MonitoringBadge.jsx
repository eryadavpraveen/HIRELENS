import {
  ScanFace,
  Users,
  UserCheck,
  Eye,
  AppWindow,
  AlertTriangle,
} from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { cn } from '@/utils/helpers'

const ALERT_CONFIG = {
  FACE_DETECTED: { label: 'Face Detected', icon: ScanFace, variant: 'success' },
  NO_FACE: { label: 'No Face Detected', icon: ScanFace, variant: 'danger' },
  MULTIPLE_PERSON: { label: 'Multiple Person', icon: Users, variant: 'danger' },
  MULTIPLE_FACE: { label: 'Multiple Face', icon: UserCheck, variant: 'danger' },
  LOOKING_AWAY: { label: 'Looking Away', icon: Eye, variant: 'warning' },
  TAB_SWITCH: { label: 'Tab Switching', icon: AppWindow, variant: 'warning' },
  EYE_MOVEMENT: { label: 'Eye Movement', icon: Eye, variant: 'warning' },
}

export function MonitoringBadge({ type, active = false, className }) {
  const config = ALERT_CONFIG[type] || {
    label: type,
    icon: AlertTriangle,
    variant: 'secondary',
  }
  const Icon = config.icon

  return (
    <Badge
      variant={active ? config.variant : 'secondary'}
      className={cn(
        'gap-1.5 px-3 py-1.5 text-xs transition-all',
        active && 'animate-pulse-soft',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  )
}

export function MonitoringStatusPanel({ status }) {
  const items = [
    { type: 'FACE_DETECTED', active: status.faceDetected },
    { type: 'MULTIPLE_PERSON', active: status.multiplePerson },
    { type: 'MULTIPLE_FACE', active: status.multipleFace },
    { type: 'LOOKING_AWAY', active: status.lookingAway },
    { type: 'TAB_SWITCH', active: status.tabSwitching },
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Monitoring Status
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <MonitoringBadge key={item.type} type={item.type} active={item.active} />
        ))}
      </div>
    </div>
  )
}
