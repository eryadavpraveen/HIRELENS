import express from 'express'
import { buildCorsMiddleware } from './middleware/cors.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import interviewRoutes from './routes/interviews.js'
import violationRoutes from './routes/violations.js'
import reportRoutes from './routes/reports.js'
import candidateRoutes from './routes/candidates.js'
import verificationRoutes from './routes/verification.js'
import cvRoutes from './routes/cv.js'
import identityRoutes from './routes/identity.js'
import objectRoutes from './routes/objectDetection.js'
import attentionProxyRoutes from './routes/attentionProxy.js'

export function createApp() {
  const app = express()

  app.use(buildCorsMiddleware())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.get('/', (_req, res) => {
    res.json({ message: 'InterviewAI Backend Running' })
  })

  app.use('/auth', authRoutes)
  app.use('/interviews', interviewRoutes)
  app.use('/violations', violationRoutes)
  app.use('/reports', reportRoutes)
  app.use('/candidates', candidateRoutes)
  app.use('/verification', verificationRoutes)
  app.use('/cv', cvRoutes)
  app.use('/identity', identityRoutes)
  app.use('/object-detection', objectRoutes)
  app.use(attentionProxyRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
