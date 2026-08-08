import cors from 'cors'
import { env } from '../config/env.js'

const LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]

const DEFAULT_ORIGIN_REGEX =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$|^https:\/\/[a-zA-Z0-9-]+\.netlify\.app$|^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$|^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$/

function buildAllowedOrigins() {
  const origins = [...LOCAL_ORIGINS]
  if (env.frontendUrl) origins.push(env.frontendUrl)
  for (const item of env.corsOrigins.split(',')) {
    const trimmed = item.trim().replace(/\/$/, '')
    if (trimmed) origins.push(trimmed)
  }
  return [...new Set(origins)]
}

export function buildCorsMiddleware() {
  const allowed = buildAllowedOrigins()
  const regex = env.corsOriginRegex
    ? new RegExp(env.corsOriginRegex)
    : DEFAULT_ORIGIN_REGEX

  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (allowed.includes(origin) || regex.test(origin)) {
        return callback(null, true)
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
  })
}
