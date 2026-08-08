/**
 * Dual-client WebSocket signaling + monitoring-event relay test.
 * Simulates recruiter + student peers without browser media devices.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import WebSocket from 'ws'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MAIN = 'http://127.0.0.1:8000'
const WS = 'ws://127.0.0.1:8000'
const stamp = Date.now()
const prisma = new PrismaClient()

function loadEnv() {
  const map = {}
  for (const line of fs.readFileSync(path.join(__dirname, '../.env'), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    map[line.slice(0, i)] = line.slice(i + 1)
  }
  return map
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options)
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

function connectWs(interviewId, role, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS}/ws/interview/${interviewId}?role=${role}`)
    const inbox = []
    const timer = setTimeout(() => reject(new Error(`${role} WS timeout`)), 10000)
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'auth', token }))
    })
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw))
      inbox.push(msg)
      if (msg.type === 'room-joined') {
        clearTimeout(timer)
        resolve({ ws, inbox, role })
      }
      if (msg.type === 'auth-error') {
        clearTimeout(timer)
        reject(new Error(`${role} auth-error: ${msg.message}`))
      }
    })
    ws.on('error', reject)
  })
}

function waitFor(inbox, type, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      const hit = inbox.find((m) => m.type === type)
      if (hit) return resolve(hit)
      if (Date.now() - start > timeoutMs) return reject(new Error(`timeout waiting for ${type}`))
      setTimeout(tick, 50)
    }
    tick()
  })
}

const results = []
const pass = (name, detail = '') => {
  results.push({ name, ok: true, detail })
  console.log(`[PASS] ${name}${detail ? ` — ${detail}` : ''}`)
}
const fail = (name, detail = '') => {
  results.push({ name, ok: false, detail })
  console.log(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`)
}

try {
  loadEnv() // ensure file exists
  process.env.DATABASE_URL = loadEnv().DATABASE_URL

  const recEmail = `webrtc.rec.${stamp}@example.com`
  const stuEmail = `webrtc.stu.${stamp}@example.com`
  const password = 'TestPass123!'

  await jsonFetch(`${MAIN}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'WS Rec', email: recEmail, password, role: 'recruiter' }),
  })
  await jsonFetch(`${MAIN}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'WS Stu', email: stuEmail, password, role: 'student' }),
  })
  const recLogin = await jsonFetch(`${MAIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: recEmail, password }),
  })
  const stuLogin = await jsonFetch(`${MAIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: stuEmail, password }),
  })
  const created = await jsonFetch(`${MAIN}/interviews/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${recLogin.body.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: `WebRTC Audit ${stamp}` }),
  })
  const interviewId = created.body.id
  await jsonFetch(`${MAIN}/interviews/${interviewId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stuLogin.body.access_token}` },
  })

  const recruiter = await connectWs(interviewId, 'recruiter', recLogin.body.access_token)
  pass('Recruiter WS room-joined')

  const student = await connectWs(interviewId, 'student', stuLogin.body.access_token)
  pass('Student WS room-joined')

  const peerJoined = await waitFor(recruiter.inbox, 'peer-joined')
  pass('Recruiter received peer-joined', `role=${peerJoined.role}`)

  // SDP-like relay
  student.ws.send(
    JSON.stringify({ type: 'offer', sdp: { type: 'offer', sdp: 'v=0-fake-offer' } }),
  )
  const offer = await waitFor(recruiter.inbox, 'offer')
  pass('Offer relayed to recruiter', `from=${offer.from}`)

  recruiter.ws.send(
    JSON.stringify({ type: 'answer', sdp: { type: 'answer', sdp: 'v=0-fake-answer' } }),
  )
  const answer = await waitFor(student.inbox, 'answer')
  pass('Answer relayed to student', `from=${answer.from}`)

  student.ws.send(
    JSON.stringify({ type: 'ice-candidate', candidate: { candidate: 'fake-ice', sdpMid: '0' } }),
  )
  await waitFor(recruiter.inbox, 'ice-candidate')
  pass('ICE candidate relayed')

  // Live monitoring event student → recruiter
  student.ws.send(
    JSON.stringify({
      type: 'monitoring-event',
      event: {
        type: 'LOOKING_AWAY',
        duration: 2,
        timestamp: new Date().toISOString(),
        message: 'Looking away',
      },
    }),
  )
  const mon = await waitFor(recruiter.inbox, 'monitoring-event')
  pass('Live monitoring-event relayed', `type=${mon.event?.type}`)

  student.ws.send(
    JSON.stringify({
      type: 'status-update',
      statuses: { attention: 'ATTENTION_LOSS' },
    }),
  )
  const status = await waitFor(recruiter.inbox, 'status-update')
  pass('Live status-update relayed', JSON.stringify(status.statuses))

  // Cleanup
  recruiter.ws.close()
  student.ws.close()
  await jsonFetch(`${MAIN}/interviews/${interviewId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${recLogin.body.access_token}` },
  })
  pass('Cleanup interview deleted')
} catch (e) {
  fail('WebRTC/live-monitoring suite', e.message)
} finally {
  await prisma.$disconnect()
  const failed = results.filter((r) => !r.ok).length
  console.log(`\nWebRTC suite: ${results.length - failed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
