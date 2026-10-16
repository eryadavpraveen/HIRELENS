import { WebSocketServer } from 'ws'
import { prisma } from '../db/prisma.js'
import { decodeAccessToken } from '../services/authService.js'
import { completionWsPayload } from '../services/interviewComplete.js'


// Defines the WebSocket message types that are allowed to be
// forwarded between participants in the same interview room.
// These include WebRTC signaling messages such as offer, answer,
// and ICE candidates, as well as interview monitoring and status events.
const RELAY_TYPES = new Set([
  'offer',
  'answer',
  'ice-candidate',
  'monitoring-event',
  'status-update',
  'request-offer',
])


// Safely sends a message to a WebSocket client.
// It first checks whether the connection is still open, converts
// the JavaScript message object into JSON, and sends it to the client.
// Returns true when the message is sent successfully and false
// when the connection is closed or an error occurs.
function safeSend(ws, message) {
  if (ws.readyState !== 1) return false

  try {
    ws.send(JSON.stringify(message))
    return true
  } catch {
    return false
  }
}


// Manages all active WebSocket connections for different interviews.
// Each interview is treated as a separate room containing the
// connected recruiter and student WebSocket connections.
// The class provides functionality to join/leave rooms, find
// connected participants, broadcast messages, and close rooms.
class ConnectionManager {
  constructor() {
    this.rooms = new Map()
  }


  // Adds a WebSocket connection to the specified interview room.
  // If the room does not already exist, a new room is created.
  // The connection and the user's role (recruiter/student) are
  // then stored so that messages can be exchanged with other
  // participants in the same interview.
  connect(interviewId, ws, role) {
    if (!this.rooms.has(interviewId)) this.rooms.set(interviewId, [])
    this.rooms.get(interviewId).push({ ws, role })
  }


  // Removes a WebSocket connection from an interview room.
  // It identifies the connection, removes it from the room,
  // and returns the role of the disconnected user. If the room
  // becomes empty after the removal, the room itself is deleted.
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


  // Returns the roles of all users currently connected to an
  // interview room. An optional WebSocket connection can be
  // excluded, which is useful when identifying the other
  // participants in the room.
  participants(interviewId, exclude = null) {
    const room = this.rooms.get(interviewId) || []

    return room
      .filter((m) => m.ws !== exclude)
      .map((m) => m.role)
  }


  // Removes an entire interview room from the connection manager.
  // This is useful when an interview is deleted or when all
  // connections associated with the room need to be removed
  // from the server's in-memory connection list.
  evictRoom(interviewId) {
    const room = this.rooms.get(interviewId)

    if (!room) return 0

    const count = room.length
    this.rooms.delete(interviewId)

    return count
  }


  // Completes an active WebSocket room by notifying every connected
  // participant that the interview has ended and then closing their
  // WebSocket connections. The completion message is generated
  // according to the interview ID, completion reason, and participant role.
  async closeRoom(interviewId, reason = 'RECRUITER') {
    const room = this.rooms.get(interviewId)

    if (!room) return 0

    this.rooms.delete(interviewId)

    const count = room.length

    for (const member of room) {
      const payload = completionWsPayload(
        interviewId,
        reason,
        member.role,
      )

      safeSend(member.ws, payload)

      try {
        member.ws.close()
      } catch {
        /* ignore */
      }
    }

    return count
  }


  // Broadcasts a message to all connected participants in a specific
  // interview room except the sender. This is used to relay WebRTC
  // signaling messages and interview monitoring/status events.
  // Connections that can no longer receive messages are detected
  // and removed from the room.
  broadcast(interviewId, message, exclude = null) {
    const room = this.rooms.get(interviewId)

    if (!room) return

    const dead = []

    for (const member of room) {
      if (member.ws === exclude) continue

      if (!safeSend(member.ws, message)) {
        dead.push(member.ws)
      }
    }

    for (const ws of dead) {
      this.disconnect(interviewId, ws)
    }
  }
}


// Creates a single connection manager instance that is shared
// throughout the WebSocket signaling system.
export const manager = new ConnectionManager()


// Obtains the JWT authentication token for a WebSocket connection.
// The token can either be provided directly in the WebSocket URL
// or sent as an initial "auth" message. If the client does not
// provide a valid token within 15 seconds, authentication fails.
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


// Authenticates and authorizes a WebSocket participant before allowing
// access to an interview room. It verifies the JWT, checks that the
// user exists and has the expected role, then verifies interview
// ownership for recruiters or participant registration for students.
async function authorizeWebsocket(interview, role, token) {
  if (role !== 'recruiter' && role !== 'student') return false

  const payload = decodeAccessToken(token || '')

  if (!payload) return false

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  })

  if (!user || user.role !== role) return false

  if (role === 'recruiter') {
    return String(interview.recruiterId) === String(user.id)
  }

  const participant = await prisma.participant.findFirst({
    where: {
      interviewId: interview.id,
      studentId: user.id,
    },
  })

  return Boolean(participant)
}


// Creates and attaches the WebSocket signaling server to the existing
// Node.js HTTP server. It handles new WebSocket connections, validates
// the interview URL, authenticates users, checks interview access,
// adds authorized users to interview rooms, relays WebRTC/monitoring
// messages, and handles participant disconnections.
export function attachSignaling(server) {
  const wss = new WebSocketServer({
    server,
    path: undefined,
  })


  // Handles every new WebSocket connection from a recruiter or student.
  // It extracts the interview ID, role, and authentication token,
  // verifies that the interview exists and is still active, authorizes
  // the user, adds them to the appropriate interview room, and
  // establishes handlers for real-time messages and disconnections.
  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url || '', 'http://localhost')

    const match = url.pathname.match(
      /^\/ws\/interview\/([^/]+)\/?$/,
    )

    if (!match) {
      ws.close(4000, 'Invalid path')
      return
    }

    const interviewId = match[1]
    const role = url.searchParams.get('role') || 'guest'
    const queryToken = url.searchParams.get('token')

    const token = await awaitAuthToken(ws, queryToken)

    try {
      const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
      })

      if (!interview) {
        safeSend(ws, {
          type: 'auth-error',
          message: 'Interview not found',
        })

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
          message:
            'Signaling unauthorized. Log in again or join the interview first.',
        })

        ws.close(4401, 'Unauthorized')
        return
      }
    } catch (err) {
      console.error('signaling auth error', err)

      safeSend(ws, {
        type: 'auth-error',
        message: 'Signaling unauthorized.',
      })

      ws.close(4401, 'Unauthorized')
      return
    }


    // Registers the authenticated participant in the interview room
    // and informs the new participant about existing room members.
    // It also notifies the existing participants that a new peer
    // has joined the interview.
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

    manager.broadcast(
      interviewId,
      { type: 'peer-joined', role },
      ws,
    )


    // Handles messages received from the connected participant.
    // The incoming JSON message is validated and its sender role is
    // added when necessary. Only predefined message types are
    // forwarded to other participants in the same interview room.
    ws.on('message', (raw) => {
      let data

      try {
        data = JSON.parse(String(raw))
      } catch {
        return
      }

      const msgType = data.type

      if (!data.from) {
        data.from = role
      }

      if (RELAY_TYPES.has(msgType)) {
        manager.broadcast(interviewId, data, ws)
      }
    })


    // Handles a participant leaving the WebSocket connection.
    // The participant is removed from the interview room and the
    // remaining participants are notified that the peer has left.
    ws.on('close', () => {
      const leftRole = manager.disconnect(interviewId, ws)

      if (leftRole) {
        manager.broadcast(
          interviewId,
          {
            type: 'peer-left',
            role: leftRole,
          },
        )
      }
    })
  })


  // Returns the configured WebSocket server so it can be used
  // or managed by the rest of the Node.js application.
  return wss
}