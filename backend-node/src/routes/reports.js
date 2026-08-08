import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { requireRecruiter } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { serializeInterview } from '../services/interviewPresenter.js'
import { httpError } from '../utils/errors.js'

const router = Router()

async function buildReport(interview) {
  const base = await serializeInterview(interview)
  const violations = await prisma.violation.findMany({
    where: { interviewId: interview.id },
    orderBy: { timestamp: 'asc' },
  })
  const events = violations.map((v) => ({
    id: v.id,
    type: v.type,
    duration: v.duration,
    confidence: v.confidence,
    timestamp: v.timestamp ? v.timestamp.toISOString() : null,
    message: v.type.replaceAll('_', ' '),
  }))
  const createdAt = interview.completedAt || interview.endTime || interview.createdAt
  return {
    ...base,
    interview_id: interview.id,
    interview_title: interview.title,
    title: interview.title,
    events,
    created_at: createdAt ? createdAt.toISOString() : base.created_at,
  }
}

router.get(
  '/',
  ...requireRecruiter,
  asyncHandler(async (req, res) => {
    const interviews = await prisma.interview.findMany({
      where: { recruiterId: req.user.id },
    })
    res.json(await Promise.all(interviews.map(buildReport)))
  }),
)

router.get(
  '/:reportId',
  ...requireRecruiter,
  asyncHandler(async (req, res) => {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.reportId },
    })
    if (!interview) throw httpError(404, 'Report not found')
    if (interview.recruiterId !== req.user.id) {
      throw httpError(403, 'Not authorized for this report')
    }
    res.json(await buildReport(interview))
  }),
)

router.post(
  '/generate/:interviewId',
  ...requireRecruiter,
  asyncHandler(async (req, res) => {
    const interview = await prisma.interview.findUnique({
      where: { id: req.params.interviewId },
    })
    if (!interview) throw httpError(404, 'Interview not found')
    if (interview.recruiterId !== req.user.id) {
      throw httpError(403, 'Not authorized for this interview')
    }
    res.json({ message: 'Report generated', report_id: interview.id })
  }),
)

export default router
