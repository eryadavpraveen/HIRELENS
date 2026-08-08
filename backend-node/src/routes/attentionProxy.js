import { Router } from 'express'
import multer from 'multer'
import { env } from '../config/env.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { httpError } from '../utils/errors.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

async function forwardMultipart(path, fields, fileField, authorization) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value)
  }
  if (fileField) {
    form.append(
      fileField.name,
      new Blob([fileField.buffer], { type: fileField.contentType }),
      fileField.filename,
    )
  }

  const headers = {}
  if (authorization) headers.Authorization = authorization

  let response
  try {
    response = await fetch(`${env.attentionServiceUrl}${path}`, {
      method: 'POST',
      headers,
      body: form,
      signal: AbortSignal.timeout(env.attentionVoiceTimeoutMs),
    })
  } catch (err) {
    throw httpError(503, `Attention service unavailable: ${err.message}`)
  }

  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  if (response.status >= 400) {
    const detail =
      data && typeof data === 'object' && 'detail' in data ? data.detail : text
    throw httpError(response.status, detail)
  }

  return data
}

router.post(
  '/voice/register',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    const candidateId = req.body?.candidate_id
    if (!candidateId) throw httpError(422, [{ msg: 'candidate_id is required' }])
    if (!req.file) throw httpError(422, [{ msg: 'audio is required' }])

    const data = await forwardMultipart(
      '/voice/register',
      { candidate_id: candidateId },
      {
        name: 'audio',
        buffer: req.file.buffer,
        filename: req.file.originalname || 'voice.webm',
        contentType: req.file.mimetype || 'audio/webm',
      },
      req.headers.authorization,
    )
    res.json(data)
  }),
)

router.post(
  '/voice/verify',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    const candidateId = req.body?.candidate_id
    if (!candidateId) throw httpError(422, [{ msg: 'candidate_id is required' }])
    if (!req.file) throw httpError(422, [{ msg: 'audio is required' }])

    const data = await forwardMultipart(
      '/voice/verify',
      { candidate_id: candidateId },
      {
        name: 'audio',
        buffer: req.file.buffer,
        filename: req.file.originalname || 'voice.webm',
        contentType: req.file.mimetype || 'audio/webm',
      },
      req.headers.authorization,
    )
    res.json(data)
  }),
)

router.post(
  '/attention/analyze',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw httpError(422, [{ msg: 'file is required' }])

    const form = new FormData()
    form.append(
      'file',
      new Blob([req.file.buffer], {
        type: req.file.mimetype || 'image/jpeg',
      }),
      req.file.originalname || 'frame.jpg',
    )

    let response
    try {
      response = await fetch(`${env.attentionServiceUrl}/attention/analyze`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(60000),
      })
    } catch (err) {
      throw httpError(503, `Attention service unavailable: ${err.message}`)
    }

    const text = await response.text()
    if (response.status >= 400) {
      throw httpError(response.status, text)
    }
    res.json(JSON.parse(text))
  }),
)

export default router
