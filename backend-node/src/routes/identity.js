import { Router } from 'express'
import multer from 'multer'
import { prisma } from '../db/prisma.js'
import {
  ensureStudentParticipant,
  requireStudent,
} from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { visionWorker } from '../ml/visionWorkerClient.js'
import {
  downloadImageBuffer,
} from '../services/cloudinaryService.js'
import { writeTempFile, removeTempFile } from '../utils/files.js'
import { httpError } from '../utils/errors.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post(
  '/verify-identity',
  ...requireStudent,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const candidateId = req.body?.candidate_id
    if (!candidateId) throw httpError(422, [{ msg: 'candidate_id is required' }])
    if (!req.file) throw httpError(422, [{ msg: 'file is required' }])

    await ensureStudentParticipant(candidateId, req.user)

    const participant = await prisma.participant.findFirst({
      where: { interviewId: candidateId, studentId: req.user.id },
    })

    const photoUrl = participant?.verificationPhoto
    if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) {
      return res.json({
        verified: null,
        status: 'NOT_REGISTERED',
        message: 'No registered reference photo for this candidate',
      })
    }

    let referenceImage
    const currentImage = writeTempFile(req.file.buffer, '.jpg')
    try {
      const referenceBuffer = await downloadImageBuffer(photoUrl)
      referenceImage = writeTempFile(referenceBuffer, '.jpg')

      const verified = await visionWorker.request(
        'verify_faces',
        {
          reference_image: referenceImage,
          current_image: currentImage,
        },
        120000,
      )
      res.json({ verified: Boolean(verified) })
    } catch (err) {
      res.json({ verified: false, error: String(err.message || err) })
    } finally {
      removeTempFile(currentImage)
      removeTempFile(referenceImage)
    }
  }),
)

export default router
