import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import {
  createAccessToken,
  hashPassword,
  verifyPassword,
} from '../services/authService.js'
import {
  createRefreshTokenRecord,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../services/tokenService.js'
import {
  consumePasswordResetToken,
  requestPasswordReset,
} from '../services/passwordResetService.js'
import { httpError } from '../utils/errors.js'

const router = Router()

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validationDetail(msg) {
  return [{ msg }]
}

async function issueTokens(user) {
  const access_token = createAccessToken({ sub: user.id, role: user.role })
  const refresh_token = await createRefreshTokenRecord(user.id)
  return { access_token, refresh_token, token_type: 'bearer' }
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body || {}
    if (!name || !email || !password || !role) {
      throw httpError(422, validationDetail('name, email, password, and role are required'))
    }
    if (!isEmail(email)) {
      throw httpError(422, validationDetail('Invalid email'))
    }
    if (!['student', 'recruiter'].includes(role)) {
      throw httpError(400, 'Invalid role')
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw httpError(400, 'Email already registered')

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role,
      },
    })

    res.json({ message: 'User registered successfully' })
  }),
)

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {}
    if (!email || !password) {
      throw httpError(422, validationDetail('email and password are required'))
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw httpError(401, 'Invalid credentials')
    }

    res.json(await issueTokens(user))
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    })
  }),
)

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refresh_token = req.body?.refresh_token
    if (!refresh_token) throw httpError(422, validationDetail('refresh_token is required'))

    const rotated = await rotateRefreshToken(refresh_token)
    if (!rotated) throw httpError(401, 'Invalid or expired refresh token')

    const user = await prisma.user.findUnique({ where: { id: rotated.userId } })
    if (!user) throw httpError(401, 'User not found')

    res.json({
      access_token: createAccessToken({ sub: user.id, role: user.role }),
      refresh_token: rotated.refreshToken,
      token_type: 'bearer',
    })
  }),
)

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refresh_token = req.body?.refresh_token
    if (refresh_token) await revokeRefreshToken(refresh_token)
    res.json({ message: 'Logged out' })
  }),
)

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const email = req.body?.email
    if (!email || !isEmail(email)) {
      throw httpError(422, validationDetail('Valid email is required'))
    }
    await requestPasswordReset(email)
    res.json({
      message: 'If an account exists for that email, a reset link has been sent.',
    })
  }),
)

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body || {}
    if (!token || !password) {
      throw httpError(422, validationDetail('token and password are required'))
    }

    const userId = await consumePasswordResetToken(token)
    if (!userId) throw httpError(400, 'Invalid or expired reset token')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw httpError(400, 'Invalid reset token')

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(password) },
    })

    res.json({ message: 'Password updated successfully' })
  }),
)

export default router
