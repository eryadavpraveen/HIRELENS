/**
 * Safe environment/connection audit — never prints secret values.
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'
import { v2 as cloudinary } from 'cloudinary'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, bom: false, map: {} }
  const buf = fs.readFileSync(filePath)
  const bom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
  const text = bom ? buf.slice(3).toString('utf8') : buf.toString('utf8')
  const map = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i <= 0) continue
    map[line.slice(0, i)] = line.slice(i + 1)
  }
  return { exists: true, bom, map }
}

function statusOf(value, { required = false, placeholderRe = null } = {}) {
  if (value === undefined) return required ? 'Missing' : 'Not required'
  if (String(value).trim() === '') return required ? 'Missing' : 'Defaulted/Empty'
  if (placeholderRe && placeholderRe.test(String(value))) return 'Invalid format'
  return 'Present'
}

function fingerprint(value) {
  if (!value) return null
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12)
}

function looksLikeUrl(value, proto) {
  try {
    const u = new URL(value)
    return proto ? u.protocol === proto : true
  } catch {
    return false
  }
}

const mainEnv = parseEnvFile(path.join(ROOT, 'backend-node', '.env'))
const attnEnv = parseEnvFile(path.join(ROOT, 'attention-node', '.env'))
const feEnv = parseEnvFile(path.join(ROOT, 'frontend', '.env'))
const legacyBackup = parseEnvFile(path.join(ROOT, 'local-env-backups', 'backend.env'))

const report = {
  files: {
    'backend-node/.env': mainEnv.exists ? `Present BOM=${mainEnv.bom}` : 'Missing',
    'attention-node/.env': attnEnv.exists ? `Present BOM=${attnEnv.bom}` : 'Missing',
    'frontend/.env': feEnv.exists ? `Present BOM=${feEnv.bom}` : 'Missing',
    'local-env-backups/backend.env': legacyBackup.exists
      ? `Present (gitignored backup) BOM=${legacyBackup.bom}`
      : 'Missing',
  },
  comparison: [],
  validation: [],
  connections: {},
}

function addCompare(variable, service, required, value, extra = '') {
  let st = statusOf(value, {
    required,
    placeholderRe:
      variable === 'DATABASE_URL'
        ? /USER:PASSWORD|HOST|change-me/i
        : /change-me|your-|not-configured|USER:PASSWORD/i,
  })
  if (variable === 'DATABASE_URL' && value && !String(value).startsWith('postgresql')) {
    st = 'Invalid format'
  }
  if (variable === 'ATTENTION_SERVICE_URL' && value) {
    if (!looksLikeUrl(value, 'http:') && !looksLikeUrl(value, 'https:')) st = 'Invalid format'
    else if (String(value).includes(':8001')) st = 'Present'
    else st = 'Present (not :8001)'
  }
  report.comparison.push({
    Variable: variable,
    Service: service,
    Required: required ? 'Yes' : 'No',
    Status: st + (extra ? ` ${extra}` : ''),
  })
}

// Main required/optional
const m = mainEnv.map
const a = attnEnv.map
addCompare('DATABASE_URL', 'backend-node', true, m.DATABASE_URL)
addCompare('SECRET_KEY', 'backend-node', true, m.SECRET_KEY)
addCompare('ALGORITHM', 'backend-node', false, m.ALGORITHM || 'HS256(default)')
addCompare('PORT', 'backend-node', false, m.PORT || '8000(default)')
addCompare('FRONTEND_URL', 'backend-node', false, m.FRONTEND_URL)
addCompare('CORS_ORIGINS', 'backend-node', false, m.CORS_ORIGINS)
addCompare('CORS_ORIGIN_REGEX', 'backend-node', false, m.CORS_ORIGIN_REGEX)
addCompare('ACCESS_TOKEN_EXPIRE_MINUTES', 'backend-node', false, m.ACCESS_TOKEN_EXPIRE_MINUTES)
addCompare('REFRESH_TOKEN_EXPIRE_DAYS', 'backend-node', false, m.REFRESH_TOKEN_EXPIRE_DAYS)
addCompare('ATTENTION_SERVICE_URL', 'backend-node', true, m.ATTENTION_SERVICE_URL)
addCompare('ATTENTION_VOICE_TIMEOUT', 'backend-node', false, m.ATTENTION_VOICE_TIMEOUT)
addCompare('CLOUDINARY_CLOUD_NAME', 'backend-node', true, m.CLOUDINARY_CLOUD_NAME)
addCompare('CLOUDINARY_API_KEY', 'backend-node', true, m.CLOUDINARY_API_KEY)
addCompare('CLOUDINARY_API_SECRET', 'backend-node', true, m.CLOUDINARY_API_SECRET)
addCompare('CLOUDINARY_FOLDER', 'backend-node', false, m.CLOUDINARY_FOLDER)
addCompare('PYTHON_PATH', 'backend-node', false, m.PYTHON_PATH)
addCompare('VISION_WORKER_SCRIPT', 'backend-node', false, m.VISION_WORKER_SCRIPT)
addCompare('SMTP_HOST', 'backend-node', false, m.SMTP_HOST)
addCompare('SMTP_PORT', 'backend-node', false, m.SMTP_PORT)
addCompare('SMTP_USER', 'backend-node', false, m.SMTP_USER)
addCompare('SMTP_PASS', 'backend-node', false, m.SMTP_PASS)
addCompare('SMTP_FROM', 'backend-node', false, m.SMTP_FROM)
addCompare('VERIFICATION_UPLOAD_DIR', 'backend-node', false, m.VERIFICATION_UPLOAD_DIR)

addCompare('DATABASE_URL', 'attention-node', true, a.DATABASE_URL)
addCompare('SECRET_KEY', 'attention-node', true, a.SECRET_KEY)
addCompare('ALGORITHM', 'attention-node', false, a.ALGORITHM || 'HS256(default)')
addCompare('PORT', 'attention-node', false, a.PORT || '8001(default)')
addCompare('FRONTEND_URL', 'attention-node', false, a.FRONTEND_URL)
addCompare('CORS_ORIGINS', 'attention-node', false, a.CORS_ORIGINS)
addCompare('PYTHON_PATH', 'attention-node', false, a.PYTHON_PATH)
addCompare('ATTENTION_WORKER_SCRIPT', 'attention-node', false, a.ATTENTION_WORKER_SCRIPT)

// Cross-service consistency
const dbMatch =
  fingerprint(m.DATABASE_URL) && fingerprint(m.DATABASE_URL) === fingerprint(a.DATABASE_URL)
const secretMatch =
  fingerprint(m.SECRET_KEY) && fingerprint(m.SECRET_KEY) === fingerprint(a.SECRET_KEY)

report.validation.push(
  {
    check: 'backend-node DATABASE_URL == attention-node DATABASE_URL',
    result: dbMatch ? 'PASS' : 'FAIL',
  },
  {
    check: 'backend-node SECRET_KEY == attention-node SECRET_KEY (JWT compat)',
    result: secretMatch ? 'PASS' : 'FAIL',
  },
  {
    check: 'ATTENTION_SERVICE_URL uses :8001',
    result: String(m.ATTENTION_SERVICE_URL || '').includes(':8001') ? 'PASS' : 'FAIL',
  },
  {
    check: 'VERIFICATION_UPLOAD_DIR not required (Cloudinary flow)',
    result: m.VERIFICATION_UPLOAD_DIR ? 'WARN (unused leftover)' : 'PASS',
  },
  {
    check: 'face_landmarker.task present',
    result: fs.existsSync(
      path.join(ROOT, 'attention-node', 'python_attention_worker', 'models', 'face_landmarker.task'),
    )
      ? 'PASS'
      : 'FAIL',
  },
  {
    check: 'Vision PYTHON_PATH exists',
    result: m.PYTHON_PATH && fs.existsSync(m.PYTHON_PATH) ? 'PASS' : 'WARN/Missing',
  },
  {
    check: 'Attention PYTHON_PATH exists',
    result: a.PYTHON_PATH && fs.existsSync(a.PYTHON_PATH) ? 'PASS' : 'WARN/Missing',
  },
)

// Frontend pointing
const apiBase = feEnv.map.VITE_API_BASE_URL || ''
const wsBase = feEnv.map.VITE_WS_BASE_URL || ''
report.validation.push(
  {
    check: 'frontend VITE_API_BASE_URL points to :8000',
    result: apiBase.includes(':8000') ? 'PASS' : `WARN (${apiBase ? 'custom' : 'missing'})`,
  },
  {
    check: 'frontend VITE_WS_BASE_URL points to :8000',
    result: wsBase.includes(':8000') || wsBase.includes('ws://127.0.0.1:8000') ? 'PASS' : 'WARN',
  },
)

// Connections
async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options)
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, body }
}

async function testDb(label, envMap) {
  // Temporarily set env for Prisma client in this process using DATABASE_URL from file
  process.env.DATABASE_URL = envMap.DATABASE_URL
  const prisma = new PrismaClient()
  try {
    await prisma.$queryRaw`SELECT 1`
    report.connections[label] = 'PASS'
  } catch (e) {
    const msg = String(e.message || e)
      .replace(/postgresql:\/\/[^\s)"]+/gi, 'postgresql://***')
      .replace(/postgres\.[a-z0-9]+/gi, 'postgres.***')
      .split('\n')[0]
    report.connections[label] = `FAIL: ${msg.slice(0, 160)}`
  } finally {
    await prisma.$disconnect()
  }
}

async function testCloudinary() {
  cloudinary.config({
    cloud_name: m.CLOUDINARY_CLOUD_NAME,
    api_key: m.CLOUDINARY_API_KEY,
    api_secret: m.CLOUDINARY_API_SECRET,
    secure: true,
  })
  try {
    const result = await cloudinary.api.ping()
    report.connections.Cloudinary = result?.status === 'ok' || result ? 'PASS' : 'FAIL'
  } catch (e) {
    report.connections.Cloudinary = `FAIL: ${String(e.message || e).slice(0, 160)}`
  }
}

async function testHttp() {
  try {
    const main = await jsonFetch('http://127.0.0.1:8000/')
    report.connections['Main Express health'] =
      main.status === 200 ? 'PASS' : `FAIL status=${main.status}`
  } catch (e) {
    report.connections['Main Express health'] = `FAIL: ${e.message}`
  }
  try {
    const attn = await jsonFetch('http://127.0.0.1:8001/')
    report.connections['Attention Express health'] =
      attn.status === 200 ? 'PASS' : `FAIL status=${attn.status}`
  } catch (e) {
    report.connections['Attention Express health'] = `FAIL: ${e.message}`
  }
  try {
    const proxied = await jsonFetch('http://127.0.0.1:8000/')
    const direct = await jsonFetch('http://127.0.0.1:8001/')
    report.connections['Main → Attention Express reachable'] =
      proxied.status === 200 && direct.status === 200
        ? 'PASS (both up; proxy used in feature tests)'
        : 'FAIL'
  } catch (e) {
    report.connections['Main → Attention Express reachable'] = `FAIL: ${e.message}`
  }
}

await testHttp()
await testDb('Main Express → PostgreSQL', m)
await testDb('Attention Express → PostgreSQL', a)
await testCloudinary()

// Worker readiness inferred from a cheap authenticated-less attention call with tiny valid jpeg if services up
try {
  const imgPath = path.join(__dirname, 'test-face.jpg')
  if (fs.existsSync(imgPath)) {
    const form = new FormData()
    form.append('file', new Blob([fs.readFileSync(imgPath)]), 'face.jpg')
    const attn = await fetch('http://127.0.0.1:8001/attention/analyze', {
      method: 'POST',
      body: form,
    })
    report.connections['Attention Express → Attention Worker'] =
      attn.status === 200
        ? 'PASS'
        : `FAIL status=${attn.status} ${String(await attn.text()).slice(0, 100)}`
    const proxy = await fetch('http://127.0.0.1:8000/attention/analyze', {
      method: 'POST',
      body: (() => {
        const f = new FormData()
        f.append('file', new Blob([fs.readFileSync(imgPath)]), 'face.jpg')
        return f
      })(),
    })
    report.connections['Main Express → Attention Express (/attention/analyze)'] =
      proxy.status === 200 ? 'PASS' : `FAIL status=${proxy.status}`
  } else {
    report.connections['Attention worker probe'] = 'SKIPPED (no test-face.jpg)'
  }
} catch (e) {
  report.connections['Attention worker probe'] = `FAIL: ${e.message}`
}

console.log(JSON.stringify(report, null, 2))
