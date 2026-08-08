import { prisma } from '../db/prisma.js'

async function studentForInterview(interviewId) {
  const participant = await prisma.participant.findFirst({
    where: { interviewId },
    orderBy: { joinedAt: 'asc' },
  })

  let studentId = participant?.studentId || null
  if (!studentId) {
    const violation = await prisma.violation.findFirst({
      where: { interviewId },
      orderBy: { timestamp: 'asc' },
    })
    studentId = violation?.studentId || null
  }
  if (!studentId) return { name: null, email: null }

  const student = await prisma.user.findUnique({ where: { id: studentId } })
  if (!student) return { name: null, email: null }
  return { name: student.name, email: student.email }
}

async function recruiterForInterview(recruiterId) {
  const recruiter = await prisma.user.findUnique({ where: { id: recruiterId } })
  if (!recruiter) return { name: null, email: null }
  return { name: recruiter.name, email: recruiter.email }
}

export async function serializeInterview(interview) {
  const candidate = await studentForInterview(interview.id)
  const recruiter = await recruiterForInterview(interview.recruiterId)
  return {
    id: interview.id,
    title: interview.title,
    description: interview.description,
    recruiter_id: interview.recruiterId,
    recruiter_name: recruiter.name,
    recruiter_email: recruiter.email,
    status: interview.status,
    completion_status: interview.status,
    start_time: interview.startTime ? interview.startTime.toISOString() : null,
    end_time: interview.endTime ? interview.endTime.toISOString() : null,
    completed_at: interview.completedAt ? interview.completedAt.toISOString() : null,
    created_at: interview.createdAt ? interview.createdAt.toISOString() : null,
    candidate_name: candidate.name,
    candidate_email: candidate.email,
  }
}
