import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import {
  getOrCreateStudentParticipant,
  requireAuth,
  requireRecruiter,
  requireStudent,
} from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { serializeInterview } from '../services/interviewPresenter.js'
import { completeInterview } from '../services/interviewComplete.js'
import { deleteInterviewCascade } from '../services/interviewCleanup.js'
import { httpError } from '../utils/errors.js'

const router = Router()

router.post(
  '/',
  ...requireRecruiter,
  asyncHandler(async (req, res) => {
    const { title, description, start_time, end_time } = req.body || {}
    if (!title) throw httpError(422, [{ msg: 'title is required' }])

    const interview = await prisma.interview.create({
      data: {
        title,
        description: description || null,
        recruiterId: req.user.id,
        startTime: start_time ? new Date(start_time) : null,
        endTime: end_time ? new Date(end_time) : null,
      },
    })

    res.json({ message: 'Interview created', id: interview.id })
  }),
)

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    let interviews
    if (req.user.role === 'recruiter') {
      interviews = await prisma.interview.findMany({
        where: { recruiterId: req.user.id },
      })
    } else if (req.user.role === 'student') {
      const parts = await prisma.participant.findMany({
        where: { studentId: req.user.id },
        select: { interviewId: true },
      })
      const ids = parts.map((p) => p.interviewId)
      interviews = await prisma.interview.findMany({
        where: { id: { in: ids } },
      })
    } else {
      throw httpError(403, 'Insufficient permissions')
    }

    res.json(await Promise.all(interviews.map(serializeInterview)))
  }),
)

router.get(
  '/:interviewId/join-preview',
  ...requireStudent,
  asyncHandler(async (req, res) => {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.interviewId },
    })
    if (!interview) throw httpError(404, 'Interview not found')
    if (interview.status === 'completed') {
      throw httpError(400, 'This interview has already been completed.')
    }
    res.json({
      id: interview.id,
      title: interview.title,
      description: interview.description,
      status: interview.status,
      start_time: interview.startTime ? interview.startTime.toISOString() : null,
      end_time: interview.endTime ? interview.endTime.toISOString() : null,
    })
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

    res.json(await serializeInterview(interview))
  }),
)

router.patch(
  '/:interviewId/complete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.interviewId },
    })
    if (!interview) throw httpError(404, 'Interview not found')

    const reason = req.body?.reason || 'RECRUITER'

    if (req.user.role === 'recruiter') {
      if (interview.recruiterId !== req.user.id) {
        throw httpError(403, 'Not authorized for this interview')
      }
    } else if (req.user.role === 'student') {
      if (reason !== 'TAB_SWITCH') {
        throw httpError(403, 'Students may only complete via tab switch')
      }
      const participant = await prisma.participant.findFirst({
        where: { interviewId: interview.id, studentId: req.user.id },
      })
      if (!participant) throw httpError(403, 'Not authorized for this interview')
    } else {
      throw httpError(403, 'Insufficient permissions')
    }

    const { interview: updated } = await completeInterview(interview.id, reason)
    if (!updated) throw httpError(404, 'Interview not found')
    res.json(await serializeInterview(updated))
  }),
)

router.delete(
  '/:interviewId',
  ...requireRecruiter,
  asyncHandler(async (req, res) => {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.interviewId },
    })
    if (!interview) throw httpError(404, 'Interview not found')
    if (interview.recruiterId !== req.user.id) {
      throw httpError(403, 'Not authorized for this interview')
    }

    try {
      const result = await deleteInterviewCascade(interview.id)
      if (!result) throw httpError(404, 'Interview not found')
      res.json(result)
    } catch (err) {
      if (err.status) throw err
      throw httpError(500, `Interview deletion failed: ${err.message}`)
    }
  }),
)

router.post(
  '/:interviewId/join',
  ...requireStudent,
  asyncHandler(async (req, res) => {
    const participant = await getOrCreateStudentParticipant(
      req.params.interviewId,
      req.user,
    )
    res.json({
      message: 'Joined interview',
      participant_id: participant.id,
    })
  }),
)

router.get(
  '/:interviewId/participants',
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

    const participants = await prisma.participant.findMany({
      where: { interviewId: interview.id },
    })

    const results = []
    for (const participant of participants) {
      const student = await prisma.user.findUnique({
        where: { id: participant.studentId },
      })
      results.push({
        id: participant.id,
        interview_id: participant.interviewId,
        student_id: participant.studentId,
        joined_at: participant.joinedAt ? participant.joinedAt.toISOString() : null,
        name: student?.name ?? null,
        email: student?.email ?? null,
      })
    }
    res.json(results)
  }),
)

export default router
