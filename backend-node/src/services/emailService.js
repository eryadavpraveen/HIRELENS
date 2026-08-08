import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

export async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`

  if (!env.smtpHost) {
    console.info(
      `[HIRELENS] Password reset for ${email} — configure SMTP to send email. Reset URL: ${resetUrl}`,
    )
    return
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: env.smtpUser
      ? { user: env.smtpUser, pass: env.smtpPass }
      : undefined,
  })

  await transporter.sendMail({
    from: env.smtpFrom || env.smtpUser || 'noreply@hirelens.local',
    to: email,
    subject: 'HIRELENS password reset',
    text: `Reset your password: ${resetUrl}`,
    html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  })
}
