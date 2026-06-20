export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
export const ATTENTION_SERVICE_URL = import.meta.env.VITE_ATTENTION_SERVICE_URL || 'http://localhost:8001'
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8000'

export const ROLES = {
  STUDENT: 'student',
  RECRUITER: 'recruiter',
}

export const INTERVIEW_STATUS = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const ALERT_TYPES = {
  FACE_DETECTED: 'FACE_DETECTED',
  NO_FACE: 'NO_FACE',
  MULTIPLE_PERSON: 'MULTIPLE_PERSON',
  MULTIPLE_FACE: 'MULTIPLE_FACE',
  LOOKING_AWAY: 'LOOKING_AWAY',
  TAB_SWITCH: 'TAB_SWITCH',
  EYE_MOVEMENT: 'EYE_MOVEMENT',
  HEAD_LEFT: 'HEAD_LEFT',
  HEAD_RIGHT: 'HEAD_RIGHT',
  EYES_CLOSED: 'EYES_CLOSED',
  WINDOW_BLUR: 'WINDOW_BLUR',
  WINDOW_RESIZE: 'WINDOW_RESIZE',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  OBJECT_PHONE: 'OBJECT_PHONE',
  OBJECT_BOOK: 'OBJECT_BOOK',
  OBJECT_DEVICE: 'OBJECT_DEVICE',
  VOICE_MISMATCH: 'VOICE_MISMATCH',
  LIP_SYNC_MISMATCH: 'LIP_SYNC_MISMATCH',
  IDENTITY_MISMATCH: 'IDENTITY_MISMATCH',
}

/** Student toast allowlist — empty; fullscreen exit uses FullscreenExitOverlay only. */
export const STUDENT_WARNING_TOAST_TYPES = []

export const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
}

/** Monitoring statuses surfaced to the recruiter live panel (8 total). */
export const MONITORING_STATUS_KEYS = [
  { key: 'face', label: 'Face Status' },
  { key: 'identity', label: 'Identity Status' },
  { key: 'object', label: 'Object Status' },
  { key: 'attention', label: 'Attention Status' },
  { key: 'mouth', label: 'Mouth Status' },
  { key: 'lipsync', label: 'Lip Sync Status' },
  { key: 'voice', label: 'Voice Status' },
]

export const TAGLINE = 'See Beyond the Resume'

export const NAV_ITEMS = {
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: 'LayoutDashboard' },
    { label: 'Join Interview', path: '/student/join', icon: 'Video' },
    { label: 'Interview History', path: '/student/history', icon: 'History' },
    { label: 'Reports', path: '/student/reports', icon: 'FileText' },
    { label: 'Profile', path: '/student/profile', icon: 'User' },
  ],
  recruiter: [
    { label: 'Dashboard', path: '/recruiter/dashboard', icon: 'LayoutDashboard' },
    { label: 'Create Interview', path: '/recruiter/create', icon: 'PlusCircle' },
    { label: 'Active Interviews', path: '/recruiter/active', icon: 'Radio' },
    { label: 'Candidates', path: '/recruiter/candidates', icon: 'Users' },
    { label: 'Reports', path: '/recruiter/reports', icon: 'FileText' },
    { label: 'Profile', path: '/recruiter/profile', icon: 'User' },
  ],
}

export const FEATURES = [
  { title: 'Identity Verification', description: 'Confirms the candidate matches their verified reference photo in real time.', icon: 'ScanFace' },
  { title: 'Voice Verification', description: 'Continuously matches live audio against the candidate voiceprint.', icon: 'Mic' },
  { title: 'Lip Sync Detection', description: 'Detects mismatches between spoken audio and mouth movement.', icon: 'AudioLines' },
  { title: 'Object Detection', description: 'Flags phones, books, and secondary devices in frame instantly.', icon: 'Smartphone' },
  { title: 'Multiple Person Detection', description: 'Alerts when more than one person appears during the session.', icon: 'Users' },
  { title: 'Integrity Scoring', description: 'A live 0-100 integrity score with EXCELLENT to HIGH RISK evaluation.', icon: 'Gauge' },
  { title: 'PDF Reporting', description: 'Professional, downloadable integrity reports for every interview.', icon: 'FileDown' },
  { title: 'Attention & Gaze Tracking', description: 'Monitors head pose, eye direction, and drowsiness throughout.', icon: 'Eye' },
]

export const HOW_IT_WORKS = [
  { step: 1, title: 'Recruiter Creates Interview', description: 'Set up interview details and invite candidates.' },
  { step: 2, title: 'Student Joins Interview', description: 'Candidates join via link, code, or interview ID.' },
  { step: 3, title: 'Live Monitoring Begins', description: 'AI monitors face, attention, and tab activity in real time.' },
  { step: 4, title: 'Report Generated Automatically', description: 'Detailed integrity report with violation timeline.' },
]
