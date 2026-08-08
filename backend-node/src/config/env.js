import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

// Prefer backend-node/.env only (do not auto-load secrets from other trees)
dotenv.config({ path: path.join(ROOT, '.env') })

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export const env = {
  port: Number(process.env.PORT || 8000),
  databaseUrl: process.env.DATABASE_URL,
  secretKey: process.env.SECRET_KEY,
  algorithm: process.env.ALGORITHM || 'HS256',
  accessTokenExpireMinutes: Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 120),
  refreshTokenExpireDays: Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS || 30),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  corsOrigins: process.env.CORS_ORIGINS || '',
  corsOriginRegex: process.env.CORS_ORIGIN_REGEX || '',
  // Express Attention Service (attention-node) — local internal URL
  attentionServiceUrl: (
    process.env.ATTENTION_SERVICE_URL || 'http://127.0.0.1:8001'
  ).replace(/\/$/, ''),
  attentionVoiceTimeoutMs: Number(process.env.ATTENTION_VOICE_TIMEOUT || 120) * 1000,
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
  pythonPath: process.env.PYTHON_PATH || process.env.PYTHON || 'python',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cloudinaryFolder: (process.env.CLOUDINARY_FOLDER || 'hirelens_images').replace(
    /^\/+|\/+$/g,
    '',
  ),
  visionWorkerScript:
    process.env.VISION_WORKER_SCRIPT ||
    path.join(ROOT, 'python_vision_worker', 'worker.py'),
  root: ROOT,
}

export function validateEnv() {
  requireEnv('DATABASE_URL')
  requireEnv('SECRET_KEY')
  requireEnv('CLOUDINARY_CLOUD_NAME')
  requireEnv('CLOUDINARY_API_KEY')
  requireEnv('CLOUDINARY_API_SECRET')
}
