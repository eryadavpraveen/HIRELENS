import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'
import { safeCandidateId } from '../utils/files.js'

let configured = false

function ensureConfigured() {
  if (configured) return
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  })
  configured = true
}

/** Deterministic public_id so re-uploads overwrite and cleanup can delete by id. */
export function verificationPublicId(candidateId) {
  const folder = env.cloudinaryFolder || 'hirelens_images'
  return `${folder}/verification/${safeCandidateId(candidateId)}`
}

/**
 * Upload a verification JPEG buffer to Cloudinary.
 * @returns {{ url: string, publicId: string }}
 */
export async function uploadVerificationImage(candidateId, buffer) {
  ensureConfigured()
  const publicId = verificationPublicId(candidateId)

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        // public_id includes folder path: {CLOUDINARY_FOLDER}/verification/{candidateId}
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        format: 'jpg',
      },
      (err, uploaded) => {
        if (err) reject(err)
        else resolve(uploaded)
      },
    )
    stream.end(buffer)
  })

  return {
    url: result.secure_url,
    publicId: result.public_id,
  }
}

/** Delete a Cloudinary asset by public_id. Missing assets count as success. */
export async function deleteVerificationImage(publicIdOrCandidateId) {
  ensureConfigured()
  const publicId = publicIdOrCandidateId.includes('/')
    ? publicIdOrCandidateId
    : verificationPublicId(publicIdOrCandidateId)

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    })
    return result?.result === 'ok' || result?.result === 'not found'
  } catch (err) {
    console.error('Cloudinary delete failed:', publicId, err.message)
    throw err
  }
}

/** Download a remote image URL to a Buffer (for ML temp files). */
export async function downloadImageBuffer(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download reference image: HTTP ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
