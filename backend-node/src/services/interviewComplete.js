import { prisma } from '../db/prisma.js'

export const COMPLETION_MESSAGES = {
  RECRUITER: {
    recruiter: 'Interview completed by recruiter.',
    student: 'Interview completed by recruiter.',
    default: 'Interview completed by recruiter.',
  },
  TAB_SWITCH: {
    recruiter: 'Interview automatically completed due to candidate tab switching.',
    student:
      'Interview terminated due to tab switching. The interview has been marked as completed.',
    default: 'Interview completed.',
  },
}

export function completionWsPayload(interviewId, reason, role) {
  const messages = COMPLETION_MESSAGES[reason] || COMPLETION_MESSAGES.RECRUITER
  const message = messages[role] || messages.default
  return {
    type: 'interview-completed',
    reason,
    interview_id: String(interviewId),
    message,
  }
}

export async function completeInterview(interviewId, reason = 'RECRUITER') {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } })
  if (!interview) return { interview: null, newlyCompleted: false }
  if (interview.status === 'completed') {
    return { interview, newlyCompleted: false }
  }

  const updated = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  })

  const { manager } = await import('../ws/signaling.js')
  await manager.closeRoom(String(interviewId), reason)
  return { interview: updated, newlyCompleted: true }
}
