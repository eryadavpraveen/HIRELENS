import { Router } from 'express'
import { prisma } from '../db/prisma.js'
import { requireRecruiter } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

router.get(
  '/',
  ...requireRecruiter,
  asyncHandler(async (req, res) => {
    const interviews = await prisma.interview.findMany({
      where: { recruiterId: req.user.id },
    })
    if (!interviews.length) return res.json([])

    const interviewStatus = Object.fromEntries(
      interviews.map((i) => [i.id, i.status]),
    )
    const interviewIds = interviews.map((i) => i.id)

    const participants = await prisma.participant.findMany({
      where: { interviewId: { in: interviewIds } },
    })

    const stats = new Map()
    for (const participant of participants) {
      const studentId = participant.studentId
      if (!stats.has(studentId)) {
        stats.set(studentId, { interviews: 0, hasActive: false })
      }
      const entry = stats.get(studentId)
      entry.interviews += 1
      const status = interviewStatus[participant.interviewId] || ''
      if (status === 'scheduled' || status === 'active') entry.hasActive = true
    }

    if (!stats.size) return res.json([])

    const users = await prisma.user.findMany({
      where: { id: { in: [...stats.keys()] } },
    })

    const results = users.map((user) => {
      const entry = stats.get(user.id)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        interviews: entry.interviews,
        status: entry.hasActive ? 'active' : 'completed',
      }
    })

    results.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    res.json(results)
  }),
)

export default router
