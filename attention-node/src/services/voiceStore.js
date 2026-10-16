import { prisma } from '../db/prisma.js'

// This file is the voiceprint storage and comparison service of your attention-node backend.

export async function saveVoiceprint(candidateId, embedding) {
  await prisma.voiceprint.upsert({
    where: { candidateId },
    create: {
      candidateId,
      embedding,
    },
    update: {
      embedding,
      updatedAt: new Date(),
    },
  })
}

export async function loadVoiceprint(candidateId) {
  const row = await prisma.voiceprint.findUnique({ where: { candidateId } })
  if (!row) return null
  return row.embedding
}

export async function deleteVoiceprint(candidateId) {
  try {
    await prisma.voiceprint.delete({ where: { candidateId } })
    return true
  } catch {
    return false
  }
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('Invalid embeddings for comparison')
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < a.length; i += 1) {
    const valueA = Number(a[i])
    const valueB = Number(b[i])

    dotProduct += valueA * valueB
    magnitudeA += valueA * valueA
    magnitudeB += valueB * valueB
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error('Cannot compare zero-magnitude embeddings')
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
}
