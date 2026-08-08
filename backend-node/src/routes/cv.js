import { Router } from 'express'
import multer from 'multer'
import { requireStudent } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { visionWorker } from '../ml/visionWorkerClient.js'
import { writeTempFile, removeTempFile } from '../utils/files.js'
import { httpError } from '../utils/errors.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post(
  '/check-face',
  ...requireStudent,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    try {
      const raw = req.file?.buffer
      if (!raw || !raw.length) {
        return res.json({ status: 'NO_FACE', face_count: 0 })
      }

      const imagePath = writeTempFile(raw, '.jpg')
      try {
        const count = await visionWorker.request(
          'count_faces',
          { image_path: imagePath },
          30000,
        )
        let status = 'FACE_PRESENT'
        if (count === 0) status = 'NO_FACE'
        else if (count > 1) status = 'MULTIPLE_FACE'
        res.json({ status, face_count: count })
      } finally {
        removeTempFile(imagePath)
      }
    } catch (err) {
      console.error('check-face failed:', err)
      throw httpError(503, 'Face check failed')
    }
  }),
)

export default router
