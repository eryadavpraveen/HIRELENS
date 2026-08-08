import crypto from 'crypto'
import { prisma } from '../db/prisma.js'
import { sendPasswordResetEmail } from './emailService.js'

const RESET_TOKEN_EXPIRE_MINUTES = 10

function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

async function createPasswordResetToken(userId) {
  const plain = crypto.randomBytes(48).toString('base64url')
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(plain),
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRE_MINUTES * 60 * 1000),
      used: false,
    },
  })
  return plain
}

export async function consumePasswordResetToken(plainToken) {
  const tokenHash = hashToken(plainToken)
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, used: false },
  })
  if (!record || record.expiresAt < new Date()) return null

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { used: true },
  })
  return record.userId
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return false
  const plain = await createPasswordResetToken(user.id)
  await sendPasswordResetEmail(user.email, plain)
  return true
}
