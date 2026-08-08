import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { requireAuth, requireStudent } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { httpError } from '../utils/errors.js'

const router = Router()

router.post(
  '/',
  ...requireStudent,
  asyncHandler(async (req, res) => {
    const { interview_id, type, duration, confidence } = req.body || {}
    if (!interview_id || !type) {
      throw httpError(422, [{ msg: 'interview_id and type are required' }])
    }

    const interview = await prisma.interview.findUnique({ where: { id: interview_id } })
    if (!interview) throw httpError(404, 'Interview not found')
    if (interview.status === 'completed') {
      throw httpError(400, 'Interview has already been completed')
    }

    const participant = await prisma.participant.findFirst({
      where: { interviewId: interview_id, studentId: req.user.id },
    })
    if (!participant) throw httpError(403, 'Not authorized for this interview')

    const violation = await prisma.violation.create({
      data: {
        interviewId: interview_id,
        studentId: req.user.id,
        type,
        duration: duration ?? null,
        confidence: confidence ?? 0,
      },
    })

    res.json({ message: 'Violation recorded', id: violation.id })
  }),
)

router.get(
  '/:interviewId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.interviewId },
    })
    if (!interview) throw httpError(404, 'Interview not found')

    if (req.user.role === 'recruiter') {
      if (interview.recruiterId !== req.user.id) {
        throw httpError(403, 'Not authorized for this interview')
      }
    } else if (req.user.role === 'student') {
      const participant = await prisma.participant.findFirst({
        where: { interviewId: interview.id, studentId: req.user.id },
      })
      if (!participant) throw httpError(403, 'Not authorized for this interview')
    } else {
      throw httpError(403, 'Insufficient permissions')
    }

    const violations = await prisma.violation.findMany({
      where: { interviewId: interview.id },
      orderBy: { timestamp: 'asc' },
    })

    // Match historical API JSON shape for frontend compatibility
    res.json(
      violations.map((v) => ({
        id: v.id,
        interview_id: v.interviewId,
        student_id: v.studentId,
        type: v.type,
        duration: v.duration,
        confidence: v.confidence,
        timestamp: v.timestamp,
      })),
    )
  }),
)

export default router
