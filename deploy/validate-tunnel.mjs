/**
 * Validate Cloudflare Tunnel → Main Express + local Attention/workers.
 * Usage:
 *   node deploy/validate-tunnel.mjs
 *   node deploy/validate-tunnel.mjs https://xxxx.trycloudflare.com
 */
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const require = createRequire(path.join(ROOT, 'backend-node', 'package.json'))
const WebSocket = require('ws')

const MAIN = 'http://127.0.0.1:8000'
const ATTENTION = 'http://127.0.0.1:8001'

const results = []
const pass = (n, d = '') => {
  results.push({ ok: true, n, d })
  console.log(`[PASS] ${n}${d ? ` — ${d}` : ''}`)
}
const fail = (n, d = '') => {
  results.push({ ok: false, n, d })
  console.log(`[FAIL] ${n}${d ? ` — ${d}` : ''}`)
}

function loadEnvFile(rel) {
  const map = {}
  const p = path.join(ROOT, rel)
  if (!fs.existsSync(p)) return map
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    map[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return map
}

function discoverTunnelUrl() {
  if (process.argv[2]) return process.argv[2].replace(/\/$/, '')
  if (process.env.TUNNEL_URL) return process.env.TUNNEL_URL.replace(/\/$/, '')
  for (const rel of ['deploy/tunnel-api-err.log', 'deploy/tunnel-api.log']) {
    const p = path.join(ROOT, rel)
    if (!fs.existsSync(p)) continue
    const text = fs.readFileSync(p, 'utf8')
    const matches = [...text.matchAll(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi)]
    if (matches.length) return matches[matches.length - 1][0]
  }
  return null
}

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options)
  const body = await res.json().catch(async () => ({ raw: await res.text() }))
  return { status: res.status, body }
}

function wsOnce(url, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const timer = setTimeout(() => {
      try {
        ws.close()
      } catch {
        /* ignore */
      }
      reject(new Error('WS timeout'))
    }, 20000)
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'auth', token }))
    })
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw))
      if (msg.type === 'room-joined') {
        clearTimeout(timer)
        ws.close()
        resolve(msg)
      }
      if (msg.type === 'auth-error') {
        clearTimeout(timer)
        ws.close()
        reject(new Error(msg.message || 'auth-error'))
      }
    })
    ws.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

const env = loadEnvFile('backend-node/.env')
const stamp = Date.now()
// Valid 1x1 PNG (OpenCV/MediaPipe can decode; face may be absent)
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

try {
  const startTunnel = fs.readFileSync(path.join(ROOT, 'deploy/start-tunnel.ps1'), 'utf8')
  if (startTunnel.includes('127.0.0.1:8000') && !/--url["\s]+https?:\/\/[^"'\s]*8001/.test(startTunnel)) {
    pass('tunnel script targets Main Express :8000 only')
  } else fail('tunnel script targets Main Express :8000 only')

  if ((env.ATTENTION_SERVICE_URL || '').includes('127.0.0.1:8001')) {
    pass('ATTENTION_SERVICE_URL is local :8001')
  } else {
    fail('ATTENTION_SERVICE_URL is local :8001', env.ATTENTION_SERVICE_URL || '(missing)')
  }

  try {
    const local = await jsonFetch(`${MAIN}/`)
    if (local.status === 200) pass('Main Express local :8000', JSON.stringify(local.body).slice(0, 80))
    else fail('Main Express local :8000', `status ${local.status}`)
  } catch (e) {
    fail('Main Express local :8000', e.message)
  }

  try {
    const att = await jsonFetch(`${ATTENTION}/`)
    if (att.status === 200) pass('Attention Express local :8001')
    else fail('Attention Express local :8001', `status ${att.status}`)
  } catch (e) {
    fail('Attention Express local :8001', e.message)
  }

  const password = 'TestPass123!'
  const recEmail = `tunnel.rec.${stamp}@example.com`
  const stuEmail = `tunnel.stu.${stamp}@example.com`
  await jsonFetch(`${MAIN}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Tunnel Rec', email: recEmail, password, role: 'recruiter' }),
  })
  await jsonFetch(`${MAIN}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Tunnel Stu', email: stuEmail, password, role: 'student' }),
  })
  const login = await jsonFetch(`${MAIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: recEmail, password }),
  })
  const stuLogin = await jsonFetch(`${MAIN}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: stuEmail, password }),
  })
  const token = login.body?.access_token
  const studentToken = stuLogin.body?.access_token
  if (!token) fail('local login for WS', JSON.stringify(login.body))
  else pass('local login for WS')

  const created = await jsonFetch(`${MAIN}/interviews/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: `Tunnel validate ${stamp}` }),
  })
  const interviewId = created.body?.id
  if (!interviewId) fail('create interview', JSON.stringify(created.body))
  else pass('create interview', interviewId)

  if (token && interviewId) {
    try {
      await wsOnce(`ws://127.0.0.1:8000/ws/interview/${interviewId}?role=recruiter`, token)
      pass('local WebSocket /ws/interview')
    } catch (e) {
      fail('local WebSocket /ws/interview', e.message)
    }
  }

  try {
    const form = new FormData()
    form.append('file', new Blob([tinyPng], { type: 'image/png' }), 't.png')
    const res = await fetch(`${MAIN}/attention/analyze`, { method: 'POST', body: form })
    const text = await res.text()
    // Connectivity pass: proxy reached Attention/worker (2xx/4xx or analysis error JSON)
    if (res.status < 500 || /attention|face|NO_FACE|analysis/i.test(text)) {
      pass('Main → Attention worker path', `HTTP ${res.status}`)
    } else fail('Main → Attention worker path', `HTTP ${res.status} ${text.slice(0, 120)}`)
  } catch (e) {
    fail('Main → Attention worker path', e.message)
  }

  try {
    const form = new FormData()
    form.append('file', new Blob([tinyPng], { type: 'image/png' }), 't.png')
    const headers = studentToken
      ? { Authorization: `Bearer ${studentToken}` }
      : {}
    const res = await fetch(`${MAIN}/cv/check-face`, { method: 'POST', headers, body: form })
    const text = await res.text()
    if (res.status === 200) {
      pass('Main → Vision worker path', `HTTP ${res.status} ${text.slice(0, 80)}`)
    } else fail('Main → Vision worker path', `HTTP ${res.status} ${text.slice(0, 120)}`)
  } catch (e) {
    fail('Main → Vision worker path', e.message)
  }

  const tunnel = discoverTunnelUrl()
  if (!tunnel) {
    fail('discover tunnel URL', 'pass URL as argv or start tunnel first')
  } else {
    pass('discover tunnel URL', tunnel)
    try {
      const remote = await jsonFetch(`${tunnel}/`)
      if (remote.status === 200) pass('Tunnel REST → Main Express', JSON.stringify(remote.body).slice(0, 80))
      else fail('Tunnel REST → Main Express', `status ${remote.status}`)
    } catch (e) {
      fail('Tunnel REST → Main Express', e.message)
    }

    if (token && interviewId) {
      const wsUrl =
        tunnel.replace(/^https:/i, 'wss:') + `/ws/interview/${interviewId}?role=recruiter`
      try {
        await wsOnce(wsUrl, token)
        pass('Tunnel WebSocket /ws/interview', wsUrl)
      } catch (e) {
        fail('Tunnel WebSocket /ws/interview', e.message)
      }
    }
  }

  if (token && interviewId) {
    await jsonFetch(`${MAIN}/interviews/${interviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }
} finally {
  const failed = results.filter((r) => !r.ok).length
  console.log(`\nTunnel validation: ${results.length - failed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}
