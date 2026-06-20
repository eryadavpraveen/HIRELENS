/**
 * HIRELENS Violation & Integrity Engine
 * ------------------------------------------------------------------
 * Single source of truth for:
 *  - The full violation taxonomy (raw backend type -> category)
 *  - Severity color mapping (yellow / orange / red / purple)
 *  - MULTIPLE_PERSON de-duplication (max of FACE / YOLO)
 *  - Integrity score + evaluation computation
 *  - Monitoring status color levels (green / yellow / orange / red)
 *
 * The backend stores raw event types (e.g. HEAD_LEFT, MULTIPLE_PERSON_FACE,
 * MULTIPLE_PERSON_YOLO, OBJECT_PHONE...). This module normalizes them into the
 * 11 recruiter-facing violation categories defined by the product spec.
 */

export const SEVERITY_LEVEL = {
  YELLOW: 'yellow',
  ORANGE: 'orange',
  RED: 'red',
  PURPLE: 'purple',
}

/**
 * The 11 recruiter violation categories.
 * `weight` drives integrity-score penalties. `order` controls card order.
 */
export const VIOLATION_CATEGORIES = {
  head: {
    key: 'head',
    label: 'Head Violations',
    timelineLabel: 'Head Movement',
    icon: 'MoveDiagonal',
    severity: SEVERITY_LEVEL.YELLOW,
    weight: 1,
    order: 1,
  },
  eye: {
    key: 'eye',
    label: 'Eye Violations',
    timelineLabel: 'Eye Movement',
    icon: 'Eye',
    severity: SEVERITY_LEVEL.YELLOW,
    weight: 1,
    order: 2,
  },
  no_face: {
    key: 'no_face',
    label: 'No Face Violations',
    timelineLabel: 'No Face Detected',
    icon: 'ScanFace',
    severity: SEVERITY_LEVEL.ORANGE,
    weight: 3,
    order: 3,
  },
  window: {
    key: 'window',
    label: 'Window Violations',
    timelineLabel: 'Window Focus Lost',
    icon: 'AppWindow',
    severity: SEVERITY_LEVEL.ORANGE,
    weight: 2,
    order: 4,
  },
  fullscreen: {
    key: 'fullscreen',
    label: 'Fullscreen Exit Violations',
    timelineLabel: 'Fullscreen Exit',
    icon: 'Maximize',
    severity: SEVERITY_LEVEL.ORANGE,
    weight: 3,
    order: 5,
  },
  object: {
    key: 'object',
    label: 'Object Violations',
    timelineLabel: 'Prohibited Object',
    icon: 'Smartphone',
    severity: SEVERITY_LEVEL.RED,
    weight: 5,
    order: 6,
  },
  multiple_person: {
    key: 'multiple_person',
    label: 'Multiple Person Violations',
    timelineLabel: 'Multiple Person',
    icon: 'Users',
    severity: SEVERITY_LEVEL.PURPLE,
    weight: 6,
    order: 7,
  },
  voice: {
    key: 'voice',
    label: 'Voice Violations',
    timelineLabel: 'Voice Mismatch',
    icon: 'Mic',
    severity: SEVERITY_LEVEL.RED,
    weight: 5,
    order: 8,
  },
  lipsync: {
    key: 'lipsync',
    label: 'Lip Sync Violations',
    timelineLabel: 'Lip Sync Mismatch',
    icon: 'AudioLines',
    severity: SEVERITY_LEVEL.RED,
    weight: 4,
    order: 9,
  },
  identity: {
    key: 'identity',
    label: 'Identity Violations',
    timelineLabel: 'Identity Mismatch',
    icon: 'UserX',
    severity: SEVERITY_LEVEL.PURPLE,
    weight: 8,
    order: 10,
  },
  tab_switch: {
    key: 'tab_switch',
    label: 'Tab Switch Violations',
    timelineLabel: 'Tab Switch',
    icon: 'PanelsTopLeft',
    severity: SEVERITY_LEVEL.PURPLE,
    weight: 4,
    order: 11,
  },
}

export const CATEGORY_LIST = Object.values(VIOLATION_CATEGORIES).sort(
  (a, b) => a.order - b.order
)

/**
 * Maps any raw backend / engine event type to a violation category key.
 * Returns null when the type is benign (e.g. FACE_DETECTED, VERIFIED).
 */
export function categorizeViolation(rawType) {
  if (!rawType) return null
  const t = String(rawType).toUpperCase()

  // Benign / positive states — never count as violations.
  if (
    ['FACE_DETECTED', 'FACE_PRESENT', 'VERIFIED', 'NORMAL', 'EYE_CENTER', 'CENTER'].includes(t)
  ) {
    return null
  }

  if (t.startsWith('HEAD')) return 'head'
  if (t.startsWith('EYE') || t === 'EYES_CLOSED' || t === 'LOOKING_AWAY' || t === 'EYE_MOVEMENT')
    return 'eye'
  if (t === 'NO_FACE') return 'no_face'
  if (t.includes('WINDOW') || t === 'BLUR' || t === 'RESIZE') return 'window'
  if (t.includes('FULLSCREEN')) return 'fullscreen'
  if (t.startsWith('OBJECT') || ['PHONE', 'BOOK', 'CELL_PHONE', 'SECOND_DEVICE', 'LAPTOP'].includes(t))
    return 'object'
  if (t.startsWith('MULTIPLE_PERSON') || t === 'MULTIPLE_FACE') return 'multiple_person'
  if (t.includes('LIP')) return 'lipsync'
  if (t.includes('VOICE')) return 'voice'
  if (t.includes('IDENTITY')) return 'identity'
  if (t.includes('TAB')) return 'tab_switch'

  return null
}

/** Tailwind class bundles for each severity level. */
export const SEVERITY_STYLES = {
  [SEVERITY_LEVEL.YELLOW]: {
    badge: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-400',
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/15',
    ring: 'border-yellow-500/30',
    dot: 'bg-yellow-400',
    hex: '#EAB308',
    label: 'Warning',
  },
  [SEVERITY_LEVEL.ORANGE]: {
    badge: 'border-orange-500/30 bg-orange-500/15 text-orange-400',
    text: 'text-orange-400',
    bg: 'bg-orange-500/15',
    ring: 'border-orange-500/30',
    dot: 'bg-orange-400',
    hex: '#F97316',
    label: 'Suspicious',
  },
  [SEVERITY_LEVEL.RED]: {
    badge: 'border-red-500/30 bg-red-500/15 text-red-400',
    text: 'text-red-400',
    bg: 'bg-red-500/15',
    ring: 'border-red-500/30',
    dot: 'bg-red-400',
    hex: '#EF4444',
    label: 'Critical',
  },
  [SEVERITY_LEVEL.PURPLE]: {
    badge: 'border-purple-500/30 bg-purple-500/15 text-purple-400',
    text: 'text-purple-400',
    bg: 'bg-purple-500/15',
    ring: 'border-purple-500/30',
    dot: 'bg-purple-400',
    hex: '#A855F7',
    label: 'Critical',
  },
}

export function getSeverityForType(rawType) {
  const cat = categorizeViolation(rawType)
  return cat ? VIOLATION_CATEGORIES[cat].severity : SEVERITY_LEVEL.YELLOW
}

export function getSeverityStyle(severity) {
  return SEVERITY_STYLES[severity] || SEVERITY_STYLES[SEVERITY_LEVEL.YELLOW]
}

/**
 * Build the violation summary from a list of raw events / records.
 * Each item should expose a `type` (raw type string).
 *
 * Returns:
 *  {
 *    counts: { head, eye, no_face, ... },  // per-category counts (deduped)
 *    timelineTotal: number,                // total raw timeline violations
 *    summaryTotal: number,                 // sum of deduped category counts
 *  }
 *
 * MULTIPLE_PERSON de-duplication:
 *  Backend stores MULTIPLE_PERSON_FACE and MULTIPLE_PERSON_YOLO separately.
 *  The summary uses max(FACE, YOLO) so the same physical event is not
 *  double-counted across the two detectors.
 */
export function buildViolationSummary(events = []) {
  const counts = {}
  CATEGORY_LIST.forEach((c) => (counts[c.key] = 0))

  let timelineTotal = 0
  let multiplePersonFace = 0
  let multiplePersonYolo = 0

  events.forEach((evt) => {
    const rawType = String(evt.type || '').toUpperCase()
    const cat = categorizeViolation(rawType)
    if (!cat) return

    timelineTotal += 1

    if (cat === 'multiple_person') {
      if (rawType.includes('YOLO')) multiplePersonYolo += 1
      else multiplePersonFace += 1
      return
    }

    counts[cat] += 1
  })

  // De-dupe multiple person across detectors.
  counts.multiple_person = Math.max(multiplePersonFace, multiplePersonYolo)

  const summaryTotal = CATEGORY_LIST.reduce((sum, c) => sum + counts[c.key], 0)

  return { counts, timelineTotal, summaryTotal, multiplePersonFace, multiplePersonYolo }
}

/**
 * Compute an integrity score (0-100) from a violation summary's counts.
 * Each category contributes `weight * count` penalty points.
 */
export function computeIntegrityScore(counts = {}) {
  let penalty = 0
  CATEGORY_LIST.forEach((c) => {
    penalty += (counts[c.key] || 0) * c.weight
  })
  return Math.max(0, Math.min(100, Math.round(100 - penalty)))
}

export const EVALUATION = {
  EXCELLENT: { label: 'EXCELLENT', color: '#22C55E', tw: 'text-green-400', badge: 'border-green-500/30 bg-green-500/15 text-green-400', min: 85 },
  GOOD: { label: 'GOOD', color: '#10B981', tw: 'text-emerald-400', badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400', min: 70 },
  SUSPICIOUS: { label: 'SUSPICIOUS', color: '#F97316', tw: 'text-orange-400', badge: 'border-orange-500/30 bg-orange-500/15 text-orange-400', min: 50 },
  HIGH_RISK: { label: 'HIGH RISK', color: '#EF4444', tw: 'text-red-400', badge: 'border-red-500/30 bg-red-500/15 text-red-400', min: 0 },
}

export function getEvaluation(score) {
  if (score >= EVALUATION.EXCELLENT.min) return EVALUATION.EXCELLENT
  if (score >= EVALUATION.GOOD.min) return EVALUATION.GOOD
  if (score >= EVALUATION.SUSPICIOUS.min) return EVALUATION.SUSPICIOUS
  return EVALUATION.HIGH_RISK
}

/**
 * Monitoring status levels (green / yellow / orange / red) used by the
 * recruiter live status panel. Maps a raw status string -> level + label.
 */
export const STATUS_LEVEL = {
  GREEN: { key: 'green', label: 'Normal', dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-500/10', ring: 'border-green-500/30', hex: '#22C55E' },
  YELLOW: { key: 'yellow', label: 'Warning', dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-500/10', ring: 'border-yellow-500/30', hex: '#EAB308' },
  ORANGE: { key: 'orange', label: 'Suspicious', dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-500/10', ring: 'border-orange-500/30', hex: '#F97316' },
  RED: { key: 'red', label: 'Critical', dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10', ring: 'border-red-500/30', hex: '#EF4444' },
}

const STATUS_MAPPING = {
  // Face
  FACE_PRESENT: STATUS_LEVEL.GREEN,
  FACE_DETECTED: STATUS_LEVEL.GREEN,
  NO_FACE: STATUS_LEVEL.RED,
  MULTIPLE_FACE: STATUS_LEVEL.RED,
  // Identity / Voice
  VERIFIED: STATUS_LEVEL.GREEN,
  SUSPICIOUS: STATUS_LEVEL.ORANGE,
  VOICE_MISMATCH: STATUS_LEVEL.RED,
  IDENTITY_MISMATCH: STATUS_LEVEL.RED,
  NOT_REGISTERED: STATUS_LEVEL.YELLOW,
  // Object
  CLEAR: STATUS_LEVEL.GREEN,
  OBJECT_DETECTED: STATUS_LEVEL.RED,
  // Attention
  ATTENTIVE: STATUS_LEVEL.GREEN,
  ATTENTION_LOSS: STATUS_LEVEL.YELLOW,
  DROWSY: STATUS_LEVEL.ORANGE,
  // Mouth / lip sync
  MOUTH_CLOSED: STATUS_LEVEL.GREEN,
  MOUTH_OPEN: STATUS_LEVEL.GREEN,
  LIP_SYNC_OK: STATUS_LEVEL.GREEN,
  LIP_SYNC_MISMATCH: STATUS_LEVEL.RED,
  // Generic
  NORMAL: STATUS_LEVEL.GREEN,
  WARNING: STATUS_LEVEL.YELLOW,
  CRITICAL: STATUS_LEVEL.RED,
  PENDING: STATUS_LEVEL.YELLOW,
}

export function getStatusLevel(status) {
  if (!status) return STATUS_LEVEL.YELLOW
  return STATUS_MAPPING[String(status).toUpperCase()] || STATUS_LEVEL.YELLOW
}
