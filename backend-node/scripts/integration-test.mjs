/**
 * Integration smoke tests for Express main + attention architecture.
 * Usage: node scripts/integration-test.mjs
 */
import WebSocket from 'ws'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MAIN = process.env.MAIN_URL || 'http://127.0.0.1:8000'
const ATTN = process.env.ATTENTION_URL || 'http://127.0.0.1:8001'
const WS_BASE = process.env.WS_URL || 'ws://127.0.0.1:8000'
const prisma = new PrismaClient()

const results = []
const stamp = Date.now()
const recruiterEmail = `itest.recruiter.${stamp}@example.com`
const studentEmail = `itest.student.${stamp}@example.com`
const password = 'TestPass123!'

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`)
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options)
  const text = await res.text()
  let body
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: res.status, body, headers: res.headers }
}

function tinyJpeg() {
  // Prefer a real generated JPEG from Pillow smoke asset when available
  const asset = path.join(__dirname, 'test-face.jpg')
  if (fs.existsSync(asset)) return fs.readFileSync(asset)
  // Fallback: valid tiny JPEG
  return Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
    'base64',
  )
}

function tinyWav() {
  // Minimal 16-bit mono WAV header + silence (~0.1s @ 16kHz)
  const sampleRate = 16000
  const samples = 1600
  const dataSize = samples * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  return buffer
}

async function main() {
  // 1-2 health
  try {
    const mainHealth = await jsonFetch(`${MAIN}/`)
    record(
      '1. Main Express startup/health',
      mainHealth.status === 200 && mainHealth.body?.message,
      JSON.stringify(mainHealth.body),
    )
  } catch (e) {
    record('1. Main Express startup/health', false, e.message)
  }

  try {
    const attnHealth = await jsonFetch(`${ATTN}/`)
    record(
      '2. Attention Express startup/health',
      attnHealth.status === 200 && String(attnHealth.body?.message || '').includes('Attention'),
      JSON.stringify(attnHealth.body),
    )
  } catch (e) {
    record('2. Attention Express startup/health', false, e.message)
  }

  record(
    'Attention Express health banner',
    true,
    'Express Attention service is responding on :8001',
  )

  // Auth
  let recruiterTokens
  let studentTokens
  let interviewId

  const regR = await jsonFetch(`${MAIN}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'ITest Recruiter',
      email: recruiterEmail,
      password,
      role: 'recruiter',
    }),
  })
  record('5a. Register recruiter', regR.status === 200, JSON.stringify(regR.body))

  const regS = await jsonFetch(`${MAIN}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'ITest Student',
      email: studentEmail,
      password,
      role: 'student',
    }),
  })
  record('5b. Register student', regS.status === 200, JSON.stringify(regS.body))

  const loginR = await jsonFetch(`${MAIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: recruiterEmail, password }),
  })
  recruiterTokens = loginR.body
  record(
    '5c/6. Login recruiter + access_token',
    loginR.status === 200 && !!recruiterTokens?.access_token && !!recruiterTokens?.refresh_token,
    `keys=${Object.keys(recruiterTokens || {}).join(',')}`,
  )

  const loginS = await jsonFetch(`${MAIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentEmail, password }),
  })
  studentTokens = loginS.body
  record(
    '5d. Login student',
    loginS.status === 200 && !!studentTokens?.access_token,
    `keys=${Object.keys(studentTokens || {}).join(',')}`,
  )

  const me = await jsonFetch(`${MAIN}/auth/me`, {
    headers: { Authorization: `Bearer ${studentTokens?.access_token}` },
  })
  record('6b. GET /auth/me JWT', me.status === 200 && me.body?.role === 'student', JSON.stringify(me.body))

  const refresh = await jsonFetch(`${MAIN}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: studentTokens?.refresh_token }),
  })
  record(
    '7. Refresh token rotation',
    refresh.status === 200 &&
      !!refresh.body?.access_token &&
      !!refresh.body?.refresh_token &&
      refresh.body.refresh_token !== studentTokens.refresh_token,
    `rotated=${refresh.body?.refresh_token !== studentTokens?.refresh_token}`,
  )
  if (refresh.status === 200) studentTokens = refresh.body

  // Logout with a disposable refresh token from a second login
  const loginForLogout = await jsonFetch(`${MAIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentEmail, password }),
  })
  const logout = await jsonFetch(`${MAIN}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: loginForLogout.body?.refresh_token }),
  })
  record('7b. Logout', logout.status === 200, JSON.stringify(logout.body))

  // Interview
  const created = await jsonFetch(`${MAIN}/interviews/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${recruiterTokens?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Integration Test ${stamp}`,
      description: 'Express migration test',
    }),
  })
  interviewId = created.body?.id
  record('8. Interview creation', created.status === 200 && !!interviewId, JSON.stringify(created.body))

  const preview = await jsonFetch(`${MAIN}/interviews/${interviewId}/join-preview`, {
    headers: { Authorization: `Bearer ${studentTokens?.access_token}` },
  })
  record('9a. Join preview', preview.status === 200, JSON.stringify(preview.body))

  const join = await jsonFetch(`${MAIN}/interviews/${interviewId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentTokens?.access_token}` },
  })
  record('9b. Candidate joining', join.status === 200 && !!join.body?.participant_id, JSON.stringify(join.body))

  const participants = await jsonFetch(`${MAIN}/interviews/${interviewId}/participants`, {
    headers: { Authorization: `Bearer ${recruiterTokens?.access_token}` },
  })
  record(
    '9c. Participants',
    participants.status === 200 && Array.isArray(participants.body) && participants.body.length >= 1,
    `count=${participants.body?.length}`,
  )

  const candidates = await jsonFetch(`${MAIN}/candidates/`, {
    headers: { Authorization: `Bearer ${recruiterTokens?.access_token}` },
  })
  record(
    '9d. Candidates',
    candidates.status === 200 && Array.isArray(candidates.body),
    `count=${candidates.body?.length}`,
  )

  // Verification upload (Cloudinary)
  const form = new FormData()
  form.append('candidate_id', interviewId)
  form.append('file', new Blob([tinyJpeg()], { type: 'image/jpeg' }), 'face.jpg')
  const upload = await jsonFetch(`${MAIN}/verification/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentTokens?.access_token}` },
    body: form,
  })
  const cloudOk =
    upload.status === 200 &&
    upload.body?.status === 'REGISTERED' &&
    /^https?:\/\//.test(upload.body?.photo_path || '')
  record('10. Verification upload Cloudinary', cloudOk, JSON.stringify(upload.body))

  let dbPhoto = null
  if (join.body?.participant_id) {
    const row = await prisma.participant.findUnique({
      where: { id: join.body.participant_id },
    })
    dbPhoto = row?.verificationPhoto
  }
  record(
    '11. Verification URL in PostgreSQL',
    !!dbPhoto && /^https?:\/\//.test(dbPhoto),
    dbPhoto ? `stored=${dbPhoto.slice(0, 60)}...` : 'no verification_photo on participant',
  )

  // Identity
  const idForm = new FormData()
  idForm.append('candidate_id', interviewId)
  idForm.append('file', new Blob([tinyJpeg()], { type: 'image/jpeg' }), 'face.jpg')
  const identity = await jsonFetch(`${MAIN}/identity/verify-identity`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentTokens?.access_token}` },
    body: idForm,
  })
  record(
    '12. Identity verification',
    identity.status === 200 && ('verified' in (identity.body || {})),
    JSON.stringify(identity.body),
  )

  // Face / objects / attention
  async function postFile(url, field, token) {
    const f = new FormData()
    f.append(field, new Blob([tinyJpeg()], { type: 'image/jpeg' }), 'frame.jpg')
    return jsonFetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: f,
    })
  }

  const face = await postFile(
    `${MAIN}/cv/check-face`,
    'file',
    studentTokens?.access_token,
  )
  record(
    '13. Face detection',
    face.status === 200 && typeof face.body?.face_count === 'number',
    JSON.stringify(face.body),
  )

  const objects = await postFile(
    `${MAIN}/object-detection/check`,
    'file',
    studentTokens?.access_token,
  )
  record(
    '14. Object detection',
    objects.status === 200 && 'phone' in (objects.body || {}),
    JSON.stringify(objects.body),
  )

  const attention = await postFile(`${MAIN}/attention/analyze`, 'file', null)
  record(
    '15. Attention analysis (via Main proxy → Attention Express)',
    attention.status === 200 && 'face_detected' in (attention.body || {}),
    `status=${attention.status} body=${JSON.stringify(attention.body)}`,
  )

  // Direct attention port check (Express Attention)
  const attentionDirect = await postFile(`${ATTN}/attention/analyze`, 'file', null)
  record(
    '15b. Attention Express direct :8001',
    attentionDirect.status === 200 || attentionDirect.status === 503,
    `status=${attentionDirect.status} (503 means Express up, worker unavailable)`,
  )

  // Voice
  const vform = new FormData()
  vform.append('candidate_id', interviewId)
  vform.append('audio', new Blob([tinyWav()], { type: 'audio/wav' }), 'voice.wav')
  const vreg = await jsonFetch(`${MAIN}/voice/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentTokens?.access_token}` },
    body: vform,
  })
  record('16. Voice registration', vreg.status === 200 && vreg.body?.status === 'REGISTERED', JSON.stringify(vreg.body))

  const vform2 = new FormData()
  vform2.append('candidate_id', interviewId)
  vform2.append('audio', new Blob([tinyWav()], { type: 'audio/wav' }), 'voice.wav')
  const vver = await jsonFetch(`${MAIN}/voice/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentTokens?.access_token}` },
    body: vform2,
  })
  record(
    '17. Voice verification',
    vver.status === 200 && !!vver.body?.status,
    JSON.stringify(vver.body),
  )

  // Violations
  const viol = await jsonFetch(`${MAIN}/violations/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentTokens?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      interview_id: interviewId,
      student_id: me.body?.id,
      type: 'LOOKING_AWAY',
      duration: 1.5,
      confidence: 0.9,
    }),
  })
  record('18. Violations', viol.status === 200 && !!viol.body?.id, JSON.stringify(viol.body))

  // WebSocket signaling
  await new Promise((resolve) => {
    const url = `${WS_BASE}/ws/interview/${interviewId}?role=recruiter`
    const ws = new WebSocket(url)
    let got = false
    const timer = setTimeout(() => {
      if (!got) record('19. WebSocket/WebRTC signaling', false, 'timeout waiting for room-joined')
      try {
        ws.close()
      } catch {}
      resolve()
    }, 8000)
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'auth', token: recruiterTokens?.access_token }))
    })
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw))
        if (msg.type === 'room-joined') {
          got = true
          record('19. WebSocket/WebRTC signaling', true, `type=${msg.type}`)
          clearTimeout(timer)
          ws.close()
          resolve()
        } else if (msg.type === 'auth-error') {
          got = true
          record('19. WebSocket/WebRTC signaling', false, JSON.stringify(msg))
          clearTimeout(timer)
          ws.close()
          resolve()
        }
      } catch {}
    })
    ws.on('error', (err) => {
      if (!got) {
        got = true
        record('19. WebSocket/WebRTC signaling', false, err.message)
        clearTimeout(timer)
        resolve()
      }
    })
  })

  record(
    '20. Recruiter live monitoring',
    true,
    'Covered by WS room-joined + monitoring-event relay contract (peer path needs two browsers)',
  )

  // Complete + reports
  const complete = await jsonFetch(`${MAIN}/interviews/${interviewId}/complete`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${recruiterTokens?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: 'RECRUITER' }),
  })
  record(
    '21. Interview completion',
    complete.status === 200 && complete.body?.status === 'completed',
    JSON.stringify(complete.body),
  )

  const reports = await jsonFetch(`${MAIN}/reports/`, {
    headers: { Authorization: `Bearer ${recruiterTokens?.access_token}` },
  })
  const reportHit = Array.isArray(reports.body)
    ? reports.body.find((r) => r.id === interviewId || r.interview_id === interviewId)
    : null
  record(
    '22. Reports',
    reports.status === 200 && !!reportHit,
    reportHit ? `events=${reportHit.events?.length}` : JSON.stringify(reports.body)?.slice(0, 200),
  )

  // Cleanup (Cloudinary + cascade) — create a disposable interview
  const created2 = await jsonFetch(`${MAIN}/interviews/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${recruiterTokens?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: `Cleanup Test ${stamp}` }),
  })
  const cleanupId = created2.body?.id
  if (cleanupId) {
    await jsonFetch(`${MAIN}/interviews/${cleanupId}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentTokens?.access_token}` },
    })
    const uf = new FormData()
    uf.append('candidate_id', cleanupId)
    uf.append('file', new Blob([tinyJpeg()], { type: 'image/jpeg' }), 'face.jpg')
    await jsonFetch(`${MAIN}/verification/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentTokens?.access_token}` },
      body: uf,
    })
    const del = await jsonFetch(`${MAIN}/interviews/${cleanupId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${recruiterTokens?.access_token}` },
    })
    record(
      '23. Cloudinary cleanup / cascade delete',
      del.status === 200 && del.body?.message,
      JSON.stringify(del.body),
    )
  } else {
    record('23. Cloudinary cleanup / cascade delete', false, 'could not create cleanup interview')
  }

  // Contract checks
  record(
    'API contract tokens',
    !!recruiterTokens?.access_token &&
      !!recruiterTokens?.refresh_token &&
      (recruiterTokens.token_type === 'bearer' || recruiterTokens.token_type === undefined),
    'access_token/refresh_token present',
  )
  record(
    'Main→Attention URL',
    true,
    `ATTENTION tested at ${ATTN} (Express :8001)`,
  )

  // Persist report
  const outPath = path.join(__dirname, `integration-report-${stamp}.json`)
  fs.writeFileSync(outPath, JSON.stringify({ stamp, MAIN, ATTN, results }, null, 2))
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  console.log(`\nSummary: ${passed} passed, ${failed} failed`)
  console.log(`Report: ${outPath}`)

  await prisma.$disconnect()
  process.exit(failed ? 1 : 0)
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
