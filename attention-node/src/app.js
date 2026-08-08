import express from 'express'
import { buildCorsMiddleware } from './middleware/cors.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import attentionRoutes from './routes/attention.js'
import voiceRoutes from './routes/voice.js'

export function createApp() {
  const app = express()
  app.use(buildCorsMiddleware())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.get('/', (_req, res) => {
    res.json({ message: 'MediaPipe Attention Service Running' })
  })

  app.use('/attention', attentionRoutes)
  app.use('/voice', voiceRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
