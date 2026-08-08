import { Router } from 'express'
import multer from 'multer'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authorizeStudentVoice } from '../services/authService.js'
import {
  cosineSimilarity,
  deleteVoiceprint,
  loadVoiceprint,
  saveVoiceprint,
} from '../services/voiceStore.js'
import { attentionWorker } from '../ml/attentionWorkerClient.js'
import { writeTempFile, removeTempFile, audioSuffix } from '../utils/files.js'
import { httpError } from '../utils/errors.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post(
  '/register',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    const candidateId = req.body?.candidate_id
    if (!candidateId) throw httpError(422, [{ msg: 'candidate_id is required' }])
    if (!req.file) throw httpError(422, [{ msg: 'audio is required' }])

    await authorizeStudentVoice(candidateId, req.headers.authorization)

    const audioPath = writeTempFile(
      req.file.buffer,
      audioSuffix(req.file.originalname, req.file.mimetype),
    )
    try {
      const embedding = await attentionWorker.request(
        'embed',
        { audio_path: audioPath },
        120000,
      )
      await saveVoiceprint(candidateId, embedding)
      res.json({ status: 'REGISTERED' })
    } catch (err) {
      console.error('Voice registration failed:', err)
      throw httpError(400, `Voice processing failed: ${err.message}`)
    } finally {
      removeTempFile(audioPath)
    }
  }),
)

router.post(
  '/verify',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    const candidateId = req.body?.candidate_id
    if (!candidateId) throw httpError(422, [{ msg: 'candidate_id is required' }])
    if (!req.file) throw httpError(422, [{ msg: 'audio is required' }])

    await authorizeStudentVoice(candidateId, req.headers.authorization)

    const stored = await loadVoiceprint(candidateId)
    if (!stored) return res.json({ status: 'NOT_REGISTERED' })

    const audioPath = writeTempFile(
      req.file.buffer,
      audioSuffix(req.file.originalname, req.file.mimetype),
    )
    try {
      const current = await attentionWorker.request(
        'embed',
        { audio_path: audioPath },
        120000,
      )
      const similarity = cosineSimilarity(stored, current)
      let status = 'VOICE_MISMATCH'
      if (similarity >= 0.85) status = 'VERIFIED'
      else if (similarity >= 0.75) status = 'SUSPICIOUS'
      res.json({ status, similarity: Number(similarity.toFixed(3)) })
    } catch (err) {
      console.error('Voice verify failed:', err)
      throw httpError(400, `Voice processing failed: ${err.message}`)
    } finally {
      removeTempFile(audioPath)
    }
  }),
)

router.delete(
  '/:candidateId',
  asyncHandler(async (req, res) => {
    const deleted = await deleteVoiceprint(req.params.candidateId)
    if (deleted) {
      return res.json({
        status: 'DELETED',
        candidate_id: req.params.candidateId,
      })
    }
    res.json({
      status: 'NOT_FOUND',
      candidate_id: req.params.candidateId,
    })
  }),
)

export default router
