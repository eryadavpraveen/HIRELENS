import { Router } from 'express'
import multer from 'multer'
import { asyncHandler } from '../middleware/errorHandler.js'
import { attentionWorker } from '../ml/attentionWorkerClient.js'
import { writeTempFile, removeTempFile } from '../utils/files.js'
import { httpError } from '../utils/errors.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post(
  '/analyze',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw httpError(422, [{ msg: 'file is required' }])

    const imagePath = writeTempFile(req.file.buffer, '.jpg')
    try {
      const result = await attentionWorker.request(
        'analyze',
        { image_path: imagePath },
        60000,
      )
      res.json(result)
    } catch (err) {
      console.error('attention analyze failed:', err)
      throw httpError(503, `Attention analysis failed: ${err.message}`)
    } finally {
      removeTempFile(imagePath)
    }
  }),
)

export default router
