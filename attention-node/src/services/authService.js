import jwt from 'jsonwebtoken'
import { prisma } from '../db/prisma.js'
import { env } from '../config/env.js'
import { httpError } from '../utils/errors.js'

export function decodeAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.secretKey, {
      algorithms: [env.algorithm],
    })
    if (payload.type !== 'access') return null
    return payload
  } catch {
    return null
  }
}

export async function authorizeStudentVoice(candidateId, authorization) {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw httpError(401, 'Missing authorization')
  }
  const token = authorization.slice(7)
  const payload = decodeAccessToken(token)
  if (!payload || payload.role !== 'student') {
    throw httpError(401, 'Invalid token')
  }

  const participant = await prisma.participant.findFirst({
    where: {
      interviewId: candidateId,
      studentId: payload.sub,
    },
  })
  if (!participant) {
    throw httpError(403, 'Not authorized for this interview')
  }
  return payload
}
