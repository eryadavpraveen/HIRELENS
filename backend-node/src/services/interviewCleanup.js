import { prisma } from '../db/prisma.js'
import { env } from '../config/env.js'
import {
  deleteVerificationImage,
  verificationPublicId,
} from './cloudinaryService.js'

function collectCleanupTargets(interviewId, participants) {
  const candidateIds = new Set([String(interviewId)])
  const cloudinaryPublicIds = new Set()

  // Deterministic public_id for the interview (candidate_id === interview id in FE flow)
  cloudinaryPublicIds.add(verificationPublicId(interviewId))

  for (const participant of participants) {
    candidateIds.add(String(participant.studentId))
    // Also try student-scoped id in case older data used it
    cloudinaryPublicIds.add(verificationPublicId(participant.studentId))
    if (participant.verificationPhoto) {
      // URL stored in DB; public_id is derived from interview/candidate convention
      cloudinaryPublicIds.add(verificationPublicId(interviewId))
    }
  }

  return { candidateIds, cloudinaryPublicIds }
}

async function deleteCloudinaryPhotos(publicIds) {
  let deleted = 0
  for (const publicId of publicIds) {
    const ok = await deleteVerificationImage(publicId)
    if (ok) deleted += 1
  }
  return deleted
}

async function deleteVoiceRegistration(candidateId) {
  const url = `${env.attentionServiceUrl}/voice/${candidateId}`
  const response = await fetch(url, { method: 'DELETE' })
  if (response.status === 200 || response.status === 404) {
    console.info(
      `Voice registration removed for candidate_id=${candidateId} (status=${response.status})`,
    )
    return response.status === 200
  }
  const text = await response.text()
  throw new Error(`Voice delete failed for ${candidateId}: HTTP ${response.status} ${text}`)
}

export async function deleteInterviewCascade(interviewId) {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } })
  if (!interview) return null

  const participants = await prisma.participant.findMany({
    where: { interviewId },
  })
  const { candidateIds, cloudinaryPublicIds } = collectCleanupTargets(
    interviewId,
    participants,
  )

  const photosDeleted = await deleteCloudinaryPhotos(cloudinaryPublicIds)
  let voicesDeleted = 0
  for (const candidateId of candidateIds) {
    if (await deleteVoiceRegistration(candidateId)) voicesDeleted += 1
  }

  const { violationsDeleted, participantsDeleted } = await prisma.$transaction(
    async (tx) => {
      const violationsDeleted = (
        await tx.violation.deleteMany({ where: { interviewId } })
      ).count
      const participantsDeleted = (
        await tx.participant.deleteMany({ where: { interviewId } })
      ).count
      await tx.interview.delete({ where: { id: interviewId } })
      return { violationsDeleted, participantsDeleted }
    },
  )

  const { manager } = await import('../ws/signaling.js')
  const websocketPeersEvicted = manager.evictRoom(String(interviewId))

  const summary = {
    message: 'Interview deleted successfully',
    id: String(interviewId),
    violations_deleted: violationsDeleted,
    participants_deleted: participantsDeleted,
    verification_photos_deleted: photosDeleted,
    voice_registrations_deleted: voicesDeleted,
    websocket_peers_evicted: websocketPeersEvicted,
    reports_deleted: violationsDeleted,
  }

  console.info('Interview cascade delete completed:', summary)
  return summary
}
