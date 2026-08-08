import { prisma } from '../db/prisma.js'

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
  let sum = 0
  for (let i = 0; i < a.length; i += 1) sum += Number(a[i]) * Number(b[i])
  return sum
}
