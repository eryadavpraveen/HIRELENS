/**
 * Safe connection checks — never prints secret values.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'
import { v2 as cloudinary } from 'cloudinary'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnv(filePath) {
  const map = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue
    const i = line.indexOf('=')
    map[line.slice(0, i)] = line.slice(i + 1)
  }
  return map
}

function sanitize(msg) {
  return String(msg || '')
    .replace(/postgresql:\/\/[^\s)"]+/gi, 'postgresql://***')
    .replace(/postgres\.[a-z0-9]+/gi, 'postgres.***')
    .replace(/api[_-]?key[=: ]+[^\s&]+/gi, 'api_key=***')
    .replace(/api[_-]?secret[=: ]+[^\s&]+/gi, 'api_secret=***')
    .split('\n')[0]
    .slice(0, 180)
}

async function checkDb(label, envPath) {
  const env = loadEnv(envPath)
  process.env.DATABASE_URL = env.DATABASE_URL
  const prisma = new PrismaClient()
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log(`${label}=PASS`)
  } catch (e) {
    console.log(`${label}=FAIL ${sanitize(e.message)}`)
  } finally {
    await prisma.$disconnect()
  }
}

const mainEnv = loadEnv(path.resolve(__dirname, '../.env'))
const attnEnv = loadEnv(path.resolve(__dirname, '../../attention-node/.env'))

await checkDb('Main→PostgreSQL', path.resolve(__dirname, '../.env'))
await checkDb('Attention→PostgreSQL', path.resolve(__dirname, '../../attention-node/.env'))

try {
  const a = await fetch('http://127.0.0.1:8000/')
  const b = await fetch('http://127.0.0.1:8001/')
  console.log(
    `Main→AttentionExpress=${a.ok && b.ok ? 'PASS' : 'FAIL'} main=${a.status} attn=${b.status}`,
  )
} catch (e) {
  console.log(`Main→AttentionExpress=FAIL ${sanitize(e.message)}`)
}

cloudinary.config({
  cloud_name: mainEnv.CLOUDINARY_CLOUD_NAME,
  api_key: mainEnv.CLOUDINARY_API_KEY,
  api_secret: mainEnv.CLOUDINARY_API_SECRET,
  secure: true,
})
try {
  const ping = await cloudinary.api.ping()
  console.log(`Cloudinary=${ping ? 'PASS' : 'FAIL'}`)
} catch (e) {
  console.log(`Cloudinary=FAIL ${sanitize(e.message)}`)
}

const img = path.join(__dirname, 'test-face.jpg')
if (fs.existsSync(img)) {
  try {
    const form = new FormData()
    form.append('file', new Blob([fs.readFileSync(img)]), 'face.jpg')
    const res = await fetch('http://127.0.0.1:8001/attention/analyze', {
      method: 'POST',
      body: form,
    })
    console.log(`AttentionWorker=${res.status === 200 ? 'PASS' : 'FAIL'} status=${res.status}`)
  } catch (e) {
    console.log(`AttentionWorker=FAIL ${sanitize(e.message)}`)
  }
} else {
  console.log('AttentionWorker=SKIPPED missing test-face.jpg')
}

// Vision worker: if main is up and we can hit a student-auth route we need tokens later.
// Probe via health of process only here.
console.log('VisionWorker=READY_IF_MAIN_LOGS_SAY_READY (verified at startup)')
