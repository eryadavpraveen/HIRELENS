import http from 'http'
import { createApp } from './app.js'
import { env, validateEnv } from './config/env.js'
import {
  attentionWorker,
  startAttentionWorker,
} from './ml/attentionWorkerClient.js'

validateEnv()

const app = createApp()
const server = http.createServer(app)
startAttentionWorker()

server.listen(env.port, () => {
  console.info(`Express attention service listening on http://127.0.0.1:${env.port}`)
})

async function shutdown(signal) {
  console.info(`Received ${signal}, shutting down...`)
  try {
    await attentionWorker.stop()
  } catch {
    /* ignore */
  }
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
