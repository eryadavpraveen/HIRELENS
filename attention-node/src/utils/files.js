import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'

export function writeTempFile(buffer, suffix = '.jpg') {
  const filePath = path.join(os.tmpdir(), `hirelens-att-${randomUUID()}${suffix}`)
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

export function audioSuffix(filename, contentType) {
  if (filename && filename.toLowerCase().endsWith('.webm')) return '.webm'
  if (contentType && contentType.includes('webm')) return '.webm'
  return '.wav'
}
