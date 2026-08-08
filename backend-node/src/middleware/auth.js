import { prisma } from '../db/prisma.js'
import { decodeAccessToken } from '../services/authService.js'
import { httpError } from '../utils/errors.js'
import { asyncHandler } from './errorHandler.js'

export function extractBearer(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7)
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req)
  if (!token) throw httpError(401, 'Invalid token')

  const payload = decodeAccessToken(token)
  if (!payload?.sub) throw httpError(401, 'Invalid token')

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) throw httpError(401, 'User not found')

  req.user = user
  req.tokenPayload = payload
  next()
})

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(httpError(403, 'Insufficient permissions'))
    }
    next()
  }
}

export const requireRecruiter = [requireAuth, requireRoles('recruiter')]
export const requireStudent = [requireAuth, requireRoles('student')]

export async function getOrCreateStudentParticipant(interviewId, user) {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } })
  if (!interview) throw httpError(404, 'Interview not found')
  if (interview.status === 'completed') {
    throw httpError(400, 'This interview has already been completed.')
  }

  const existing = await prisma.participant.findFirst({
    where: { interviewId, studentId: user.id },
  })
  if (existing) return existing

  return prisma.participant.create({
    data: { interviewId: interview.id, studentId: user.id },
  })
}

export async function ensureStudentParticipant(interviewId, user) {
  const participant = await prisma.participant.findFirst({
    where: { interviewId, studentId: user.id },
  })
  if (!participant) throw httpError(403, 'Not authorized for this interview')
  return participant
}
