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
  '/check',
  ...requireStudent,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw httpError(422, [{ msg: 'file is required' }])

    const tempPath = writeTempFile(req.file.buffer, '.jpg')
    try {
      const result = await visionWorker.request(
        'detect_objects',
        { image_path: tempPath },
        60000,
      )
      res.json(result)
    } catch (err) {
      console.error('object-detection failed:', err)
      throw httpError(503, 'Object detection unavailable')
    } finally {
      removeTempFile(tempPath)
    }
  }),
)

export default router
