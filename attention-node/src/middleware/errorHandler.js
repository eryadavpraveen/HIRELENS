import { AppError } from '../utils/errors.js'

export function notFoundHandler(_req, res) {
  res.status(404).json({ detail: 'Not Found' })
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ detail: err.detail })
  }
  if (err?.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ detail: err.message })
  }
  console.error(err)
  return res.status(500).json({ detail: 'Internal server error' })
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
