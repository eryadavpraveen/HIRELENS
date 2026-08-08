import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

// Prefer attention-node/.env only (do not auto-load secrets from other trees)
dotenv.config({ path: path.join(ROOT, '.env') })

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

export const env = {
  port: Number(process.env.PORT || 8001),
  databaseUrl: process.env.DATABASE_URL,
  secretKey: process.env.SECRET_KEY,
  algorithm: process.env.ALGORITHM || 'HS256',
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  corsOrigins: process.env.CORS_ORIGINS || '',
  corsOriginRegex: process.env.CORS_ORIGIN_REGEX || '',
  pythonPath: process.env.PYTHON_PATH || process.env.PYTHON || 'python',
  attentionWorkerScript:
    process.env.ATTENTION_WORKER_SCRIPT ||
    path.join(ROOT, 'python_attention_worker', 'worker.py'),
  root: ROOT,
}

export function validateEnv() {
  requireEnv('DATABASE_URL')
  requireEnv('SECRET_KEY')
}
