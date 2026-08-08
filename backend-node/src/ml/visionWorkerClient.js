import { env } from '../config/env.js'
import { NdjsonWorkerClient } from './NdjsonWorkerClient.js'

import path from 'path'

export const visionWorker = new NdjsonWorkerClient({
  name: 'vision',
  pythonPath: env.pythonPath,
  scriptPath: env.visionWorkerScript,
  // Worker dir as cwd so YOLO finds yolov8n.pt next to object_detector.py
  cwd: path.dirname(env.visionWorkerScript),
  env: {
    ...process.env,
    PYTHONPATH: path.dirname(env.visionWorkerScript),
  },
})

export function startVisionWorker() {
  visionWorker.start()
}
