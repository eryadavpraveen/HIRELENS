/**
 * Mock data for HIRELENS frontend development.
 * Used when VITE_USE_MOCK !== 'false'. Mirrors the shape returned by the
 * Express Main + Attention APIs so the UI can be demoed end-to-end.
 */

export const mockInterviews = [
  {
    id: 'int-001',
    title: 'Frontend Developer Interview',
    description: 'React and JavaScript technical assessment',
    recruiter_id: 'rec-001',
    recruiter_name: 'Sarah Chen',
    status: 'scheduled',
    start_time: '2026-06-20T10:00:00',
    end_time: '2026-06-20T11:00:00',
    duration: 60,
    code: 'FE2026',
    link: 'http://localhost:5173/student/join?code=FE2026',
    candidate_name: 'Alex Johnson',
    candidate_emails: ['alex@student.edu'],
    created_at: '2026-06-18T09:00:00',
  },
  {
    id: 'int-002',
    title: 'Backend Engineer Screening',
    description: 'Python and Express fundamentals',
    recruiter_id: 'rec-001',
    recruiter_name: 'Sarah Chen',
    status: 'active',
    start_time: '2026-06-19T14:00:00',
    end_time: '2026-06-19T15:00:00',
    duration: 45,
    code: 'BE2026',
    link: 'http://localhost:5173/student/join?code=BE2026',
    candidate_name: 'Jamie Lee',
    candidate_emails: ['jamie@student.edu'],
    created_at: '2026-06-17T11:00:00',
  },
  {
    id: 'int-003',
    title: 'Data Science Assessment',
    description: 'ML concepts and Python coding',
    recruiter_id: 'rec-002',
    recruiter_name: 'Michael Torres',
    status: 'completed',
    start_time: '2026-06-15T09:00:00',
    end_time: '2026-06-15T10:30:00',
    duration: 90,
    code: 'DS2026',
    link: 'http://localhost:5173/student/join?code=DS2026',
    candidate_name: 'Taylor Smith',
    candidate_emails: ['taylor@student.edu'],
    created_at: '2026-06-10T08:00:00',
  },
  {
    id: 'int-004',
    title: 'Senior Fullstack Round',
    description: 'System design and live coding',
    recruiter_id: 'rec-001',
    recruiter_name: 'Sarah Chen',
    status: 'completed',
    start_time: '2026-06-14T13:00:00',
    end_time: '2026-06-14T14:00:00',
    duration: 60,
    code: 'FS2026',
    candidate_name: 'Priya Nair',
    candidate_emails: ['priya@student.edu'],
    created_at: '2026-06-09T08:00:00',
  },
]

export const mockCandidates = [
  { id: 'stu-001', name: 'Alex Johnson', email: 'alex@student.edu', interviews: 3, status: 'active', integrity: 88 },
  { id: 'stu-002', name: 'Jamie Lee', email: 'jamie@student.edu', interviews: 2, status: 'active', integrity: 72 },
  { id: 'stu-003', name: 'Taylor Smith', email: 'taylor@student.edu', interviews: 5, status: 'completed', integrity: 64 },
  { id: 'stu-004', name: 'Priya Nair', email: 'priya@student.edu', interviews: 1, status: 'completed', integrity: 41 },
]

/**
 * Raw violation timeline events. `type` uses backend / engine raw type strings.
 * Note MULTIPLE_PERSON_FACE + MULTIPLE_PERSON_YOLO appear separately — the
 * integrity engine de-dupes them via max() into a single MULTIPLE_PERSON count.
 */
function makeEvents(base, items) {
  return items.map((it, i) => ({
    id: `${base}-evt-${i + 1}`,
    type: it[0],
    timestamp: it[1],
    duration: it[2],
    message: it[3] || it[0].replace(/_/g, ' '),
  }))
}

const dsEvents = makeEvents('ds', [
  ['HEAD_LEFT', '2026-06-15T09:06:12', 2.4, 'Head turned left'],
  ['EYE_RIGHT', '2026-06-15T09:08:40', 1.8, 'Gaze drifted right'],
  ['NO_FACE', '2026-06-15T09:11:05', 4.1, 'No face detected'],
  ['WINDOW_BLUR', '2026-06-15T09:14:20', 6.0, 'Window lost focus'],
  ['TAB_SWITCH', '2026-06-15T09:15:02', 9.3, 'Tab switch detected'],
  ['OBJECT_PHONE', '2026-06-15T09:22:31', 3.2, 'Phone detected in frame'],
  ['MULTIPLE_PERSON_FACE', '2026-06-15T09:31:10', 5.5, 'Second face detected'],
  ['MULTIPLE_PERSON_YOLO', '2026-06-15T09:31:12', 5.5, 'Second person detected'],
  ['VOICE_MISMATCH', '2026-06-15T09:38:44', 2.0, 'Voice did not match profile'],
  ['LIP_SYNC_MISMATCH', '2026-06-15T09:41:09', 1.5, 'Lip sync mismatch'],
  ['FULLSCREEN_EXIT', '2026-06-15T09:45:50', 7.8, 'Exited fullscreen'],
  ['EYES_CLOSED', '2026-06-15T09:52:33', 3.0, 'Eyes closed (drowsiness)'],
  ['HEAD_DOWN', '2026-06-15T09:58:00', 2.2, 'Head tilted down'],
])

const fsEvents = makeEvents('fs', [
  ['IDENTITY_MISMATCH', '2026-06-14T13:03:21', 0, 'Identity mismatch detected'],
  ['TAB_SWITCH', '2026-06-14T13:09:10', 12.4, 'Tab switch detected'],
  ['TAB_SWITCH', '2026-06-14T13:18:42', 8.1, 'Tab switch detected'],
  ['OBJECT_BOOK', '2026-06-14T13:21:00', 4.5, 'Book detected in frame'],
  ['OBJECT_DEVICE', '2026-06-14T13:24:15', 6.7, 'Second device detected'],
  ['MULTIPLE_PERSON_FACE', '2026-06-14T13:29:30', 9.0, 'Second face detected'],
  ['MULTIPLE_PERSON_YOLO', '2026-06-14T13:29:31', 9.0, 'Second person detected'],
  ['MULTIPLE_PERSON_YOLO', '2026-06-14T13:35:48', 4.2, 'Second person detected'],
  ['VOICE_MISMATCH', '2026-06-14T13:39:00', 3.3, 'Voice did not match profile'],
  ['NO_FACE', '2026-06-14T13:44:12', 5.0, 'No face detected'],
  ['FULLSCREEN_EXIT', '2026-06-14T13:48:55', 10.0, 'Exited fullscreen'],
])

export const mockReports = [
  {
    id: 'rep-001',
    interview_id: 'int-003',
    interview_title: 'Data Science Assessment',
    candidate_name: 'Taylor Smith',
    candidate_email: 'taylor@student.edu',
    recruiter_name: 'Michael Torres',
    duration: 5400,
    start_time: '2026-06-15T09:00:00',
    completion_status: 'completed',
    events: dsEvents,
    created_at: '2026-06-15T10:30:00',
  },
  {
    id: 'rep-002',
    interview_id: 'int-004',
    interview_title: 'Senior Fullstack Round',
    candidate_name: 'Priya Nair',
    candidate_email: 'priya@student.edu',
    recruiter_name: 'Sarah Chen',
    duration: 3600,
    start_time: '2026-06-14T13:00:00',
    completion_status: 'completed',
    events: fsEvents,
    created_at: '2026-06-14T14:00:00',
  },
]

/** Live recruiter monitoring statuses (raw status strings). */
export const mockMonitoringStatuses = {
  face: 'FACE_PRESENT',
  identity: 'VERIFIED',
  object: 'CLEAR',
  attention: 'ATTENTIVE',
  mouth: 'MOUTH_CLOSED',
  lipsync: 'LIP_SYNC_OK',
  voice: 'VERIFIED',
  voiceSimilarity: 0.94,
}

export const mockMonitoringEvents = [
  { id: 'evt-1', type: 'FACE_DETECTED', timestamp: new Date().toISOString(), message: 'Face detected in frame' },
  { id: 'evt-2', type: 'HEAD_LEFT', timestamp: new Date().toISOString(), duration: 2.1, message: 'Head turned left' },
  { id: 'evt-3', type: 'TAB_SWITCH', timestamp: new Date().toISOString(), duration: 5.0, message: 'Tab switch detected' },
]

/** Integrity score trend for analytics charts. */
export const mockIntegrityTrend = [
  { interview: 'Apr W1', score: 91 },
  { interview: 'Apr W2', score: 88 },
  { interview: 'May W1', score: 82 },
  { interview: 'May W2', score: 76 },
  { interview: 'Jun W1', score: 84 },
  { interview: 'Jun W2', score: 71 },
]

export const mockCandidateComparison = [
  { name: 'Alex J.', score: 88 },
  { name: 'Jamie L.', score: 72 },
  { name: 'Taylor S.', score: 64 },
  { name: 'Priya N.', score: 41 },
]

export const mockDashboardStats = {
  student: {
    totalInterviews: 5,
    upcomingInterviews: 2,
    completedInterviews: 3,
  },
  recruiter: {
    totalInterviews: 12,
    activeInterviews: 2,
    candidates: 8,
    reportsGenerated: 6,
  },
}
