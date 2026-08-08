import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'

export function safeCandidateId(candidateId) {
  return String(candidateId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_')
}

export function writeTempFile(buffer, suffix = '.jpg') {
  const filePath = path.join(os.tmpdir(), `hirelens-${randomUUID()}${suffix}`)
  fs.writeFileSync(filePath, buffer)
  return filePath
}

export function removeTempFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
    } catch {
      /* ignore */
    }
  }
}
