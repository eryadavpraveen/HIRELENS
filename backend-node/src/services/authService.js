import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed)
}

export function createAccessToken({ sub, role }) {
  return jwt.sign(
    { sub, role, type: 'access' },
    env.secretKey,
    {
      algorithm: env.algorithm,
      expiresIn: `${env.accessTokenExpireMinutes}m`,
    },
  )
}

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
