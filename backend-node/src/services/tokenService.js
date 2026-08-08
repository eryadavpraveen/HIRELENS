import crypto from 'crypto'
import { prisma } from '../db/prisma.js'
import { env } from '../config/env.js'

function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url')
}

export async function createRefreshTokenRecord(userId) {
  const plain = generateRefreshToken()
  const expiresAt = new Date(
    Date.now() + env.refreshTokenExpireDays * 24 * 60 * 60 * 1000,
  )
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(plain),
      expiresAt,
      revoked: false,
    },
  })
  return plain
}

export async function rotateRefreshToken(plainToken) {
  const tokenHash = hashToken(plainToken)
  const record = await prisma.refreshToken.findFirst({
    where: { tokenHash, revoked: false },
  })
  if (!record || record.expiresAt < new Date()) return null

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revoked: true },
  })

  const newPlain = await createRefreshTokenRecord(record.userId)
  return { userId: record.userId, refreshToken: newPlain }
}

export async function revokeRefreshToken(plainToken) {
  const tokenHash = hashToken(plainToken)
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } })
  if (!record) return false
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revoked: true },
  })
  return true
}
