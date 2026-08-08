import { Router } from 'express'
import multer from 'multer'
import { prisma } from '../db/prisma.js'
import {
  getOrCreateStudentParticipant,
  requireStudent,
} from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { uploadVerificationImage } from '../services/cloudinaryService.js'
import { httpError } from '../utils/errors.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post(
  '/upload',
  ...requireStudent,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const candidateId = req.body?.candidate_id
    if (!candidateId) throw httpError(422, [{ msg: 'candidate_id is required' }])
    if (!req.file) throw httpError(422, [{ msg: 'file is required' }])

    const participant = await getOrCreateStudentParticipant(candidateId, req.user)

    let uploaded
    try {
      uploaded = await uploadVerificationImage(candidateId, req.file.buffer)
    } catch (err) {
      console.error('Cloudinary verification upload failed:', err)
      throw httpError(503, 'Verification photo upload failed')
    }

    await prisma.participant.update({
      where: { id: participant.id },
      data: { verificationPhoto: uploaded.url },
    })

    // photo_path kept for API compatibility; value is now the Cloudinary URL
    res.json({
      status: 'REGISTERED',
      candidate_id: candidateId,
      photo_path: uploaded.url,
      photo_url: uploaded.url,
      public_id: uploaded.publicId,
    })
  }),
)

export default router
