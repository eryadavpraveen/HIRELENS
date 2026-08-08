import http from 'http'
import { createApp } from './app.js'
import { env, validateEnv } from './config/env.js'
import { startVisionWorker, visionWorker } from './ml/visionWorkerClient.js'
import { attachSignaling } from './ws/signaling.js'

validateEnv()

const app = createApp()
const server = http.createServer(app)
attachSignaling(server)
startVisionWorker()

server.listen(env.port, () => {
  console.info(`Express main backend listening on http://127.0.0.1:${env.port}`)
  console.info(`Attention Express target: ${env.attentionServiceUrl}`)
  console.info('Verification photos: Cloudinary')
})

async function shutdown(signal) {
  console.info(`Received ${signal}, shutting down...`)
  try {
    await visionWorker.stop()
  } catch {
    /* ignore */
  }
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
