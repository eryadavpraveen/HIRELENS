import { WebSocketServer } from 'ws'
import { prisma } from '../db/prisma.js'
import { decodeAccessToken } from '../services/authService.js'
import { completionWsPayload } from '../services/interviewComplete.js'

const RELAY_TYPES = new Set([
  'offer',
  'answer',
  'ice-candidate',
  'monitoring-event',
  'status-update',
  'request-offer',
])

function safeSend(ws, message) {
  if (ws.readyState !== 1) return false
  try {
    ws.send(JSON.stringify(message))
    return true
  } catch {
    return false
  }
}

class ConnectionManager {
  constructor() {
    this.rooms = new Map()
  }

  connect(interviewId, ws, role) {
    if (!this.rooms.has(interviewId)) this.rooms.set(interviewId, [])
    this.rooms.get(interviewId).push({ ws, role })
  }

  disconnect(interviewId, ws) {
    const room = this.rooms.get(interviewId)
    if (!room) return null
    let role = null
    const idx = room.findIndex((m) => m.ws === ws)
    if (idx >= 0) {
      role = room[idx].role
      room.splice(idx, 1)
    }
    if (room.length === 0) this.rooms.delete(interviewId)
    return role
  }

  participants(interviewId, exclude = null) {
    const room = this.rooms.get(interviewId) || []
    return room.filter((m) => m.ws !== exclude).map((m) => m.role)
  }

  evictRoom(interviewId) {
    const room = this.rooms.get(interviewId)
    if (!room) return 0
    const count = room.length
    this.rooms.delete(interviewId)
    return count
  }

  async closeRoom(interviewId, reason = 'RECRUITER') {
    const room = this.rooms.get(interviewId)
    if (!room) return 0
    this.rooms.delete(interviewId)
    const count = room.length
    for (const member of room) {
      const payload = completionWsPayload(interviewId, reason, member.role)
      safeSend(member.ws, payload)
      try {
        member.ws.close()
      } catch {
        /* ignore */
      }
    }
    return count
  }

  broadcast(interviewId, message, exclude = null) {
    const room = this.rooms.get(interviewId)
    if (!room) return
    const dead = []
    for (const member of room) {
      if (member.ws === exclude) continue
      if (!safeSend(member.ws, message)) dead.push(member.ws)
    }
    for (const ws of dead) this.disconnect(interviewId, ws)
  }
}

export const manager = new ConnectionManager()

async function awaitAuthToken(ws, queryToken) {
  if (queryToken) return queryToken
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup()
      resolve(null)
    }, 15000)

    const onMessage = (raw) => {
      try {
        const data = JSON.parse(String(raw))
        if (data.type === 'auth' && data.token) {
          cleanup()
          resolve(data.token)
          return
        }
      } catch {
        /* ignore */
      }
      cleanup()
      resolve(null)
    }

    const cleanup = () => {
      clearTimeout(timer)
      ws.off('message', onMessage)
    }

    ws.on('message', onMessage)
  })
}

async function authorizeWebsocket(interview, role, token) {
  if (role !== 'recruiter' && role !== 'student') return false
  const payload = decodeAccessToken(token || '')
  if (!payload) return false

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || user.role !== role) return false

  if (role === 'recruiter') {
    return String(interview.recruiterId) === String(user.id)
  }

  const participant = await prisma.participant.findFirst({
    where: { interviewId: interview.id, studentId: user.id },
  })
  return Boolean(participant)
}

export function attachSignaling(server) {
  const wss = new WebSocketServer({ server, path: undefined })

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost')
    const match = url.pathname.match(/^\/ws\/interview\/([^/]+)\/?$/)
    if (!match) {
      ws.close(4000, 'Invalid path')
      return
    }

    const interviewId = match[1]
    const role = url.searchParams.get('role') || 'guest'
    const queryToken = url.searchParams.get('token')

    const token = await awaitAuthToken(ws, queryToken)

    try {
      const interview = await prisma.interview.findUnique({ where: { id: interviewId } })
      if (!interview) {
        safeSend(ws, { type: 'auth-error', message: 'Interview not found' })
        ws.close(4004, 'Interview not found')
        return
      }
      if (interview.status === 'completed') {
        safeSend(ws, {
          type: 'interview-completed',
          interview_id: String(interviewId),
          message: 'This interview has already been completed.',
        })
        ws.close()
        return
      }

      if (!(await authorizeWebsocket(interview, role, token))) {
        safeSend(ws, {
          type: 'auth-error',
          message: 'Signaling unauthorized. Log in again or join the interview first.',
        })
        ws.close(4401, 'Unauthorized')
        return
      }
    } catch (err) {
      console.error('signaling auth error', err)
      safeSend(ws, { type: 'auth-error', message: 'Signaling unauthorized.' })
      ws.close(4401, 'Unauthorized')
      return
    }

    manager.connect(interviewId, ws, role)
    console.info(
      `signaling: ${role} joined interview ${interviewId} (room peers: ${manager.participants(interviewId)})`,
    )

    if (
      !safeSend(ws, {
        type: 'room-joined',
        role,
        participants: manager.participants(interviewId, ws),
      })
    ) {
      manager.disconnect(interviewId, ws)
      return
    }

    manager.broadcast(interviewId, { type: 'peer-joined', role }, ws)

    ws.on('message', (raw) => {
      let data
      try {
        data = JSON.parse(String(raw))
      } catch {
        return
      }
      const msgType = data.type
      if (!data.from) data.from = role
      if (RELAY_TYPES.has(msgType)) {
        manager.broadcast(interviewId, data, ws)
      }
    })

    ws.on('close', () => {
      const leftRole = manager.disconnect(interviewId, ws)
      if (leftRole) {
        manager.broadcast(interviewId, { type: 'peer-left', role: leftRole })
      }
    })
  })

  return wss
}
