import path from 'path'
import { env } from '../config/env.js'
import { NdjsonWorkerClient } from './NdjsonWorkerClient.js'

export const attentionWorker = new NdjsonWorkerClient({
  name: 'attention',
  pythonPath: env.pythonPath,
  scriptPath: env.attentionWorkerScript,
  cwd: path.dirname(env.attentionWorkerScript),
  env: {
    ...process.env,
    PYTHONPATH: path.dirname(env.attentionWorkerScript),
  },
})

export function startAttentionWorker() {
  attentionWorker.start()
}
