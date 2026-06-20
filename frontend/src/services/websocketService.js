import { WS_BASE_URL } from '../utils/constants'

/**
 * Reusable WebSocket service for live monitoring, interview status, and report updates.
 *
 * Example usage:
 *   const ws = websocketService.connect(`/ws/interview/${interviewId}`, {
 *     onMessage: (data) => dispatch(addLiveEvent(data)),
 *     onOpen: () => console.log('Connected'),
 *   })
 *   ws.send({ type: 'PING' })
 *   websocketService.disconnect(`/ws/interview/${interviewId}`)
 */
class WebSocketService {
  constructor() {
    this.connections = new Map()
    this.reconnectAttempts = new Map()
    this.maxReconnectAttempts = 5
  }

  connect(path, { onMessage, onOpen, onClose, onError, autoReconnect = true } = {}) {
    const url = path.startsWith('ws') ? path : `${WS_BASE_URL}${path}`

    if (this.connections.has(url)) {
      return this.connections.get(url)
    }

    let ws
    try {
      ws = new WebSocket(url)
    } catch (err) {
      console.warn('[WebSocket] Connection failed, using mock event stream:', err.message)
      return this._createMockConnection(url, onMessage, onOpen)
    }

    ws.onopen = () => {
      this.reconnectAttempts.set(url, 0)
      onOpen?.()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage?.(data)
      } catch {
        onMessage?.({ type: 'RAW', payload: event.data })
      }
    }

    ws.onerror = (error) => {
      onError?.(error)
    }

    ws.onclose = () => {
      this.connections.delete(url)
      onClose?.()
      if (autoReconnect) {
        this._attemptReconnect(url, { onMessage, onOpen, onClose, onError, autoReconnect })
      }
    }

    const connection = {
      send: (payload) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload))
        }
      },
      close: () => {
        ws.close()
        this.connections.delete(url)
      },
      ws,
    }

    this.connections.set(url, connection)
    return connection
  }

  disconnect(path) {
    const url = path.startsWith('ws') ? path : `${WS_BASE_URL}${path}`
    const connection = this.connections.get(url)
    if (connection) {
      connection.close()
      this.connections.delete(url)
    }
  }

  disconnectAll() {
    this.connections.forEach((conn) => conn.close())
    this.connections.clear()
  }

  _attemptReconnect(url, handlers) {
    const attempts = this.reconnectAttempts.get(url) || 0
    if (attempts >= this.maxReconnectAttempts) return

    this.reconnectAttempts.set(url, attempts + 1)
    setTimeout(() => {
      this.connect(url.replace(WS_BASE_URL, ''), handlers)
    }, Math.min(1000 * 2 ** attempts, 10000))
  }

  _createMockConnection(url, onMessage, onOpen) {
    onOpen?.()

    const mockEvents = [
      { type: 'HEAD_LEFT', duration: 2.1 },
      { type: 'EYE_RIGHT', duration: 1.4 },
      { type: 'NO_FACE', duration: 3.5 },
      { type: 'TAB_SWITCH', duration: 6.2 },
      { type: 'OBJECT_PHONE', duration: 4.0 },
      { type: 'MULTIPLE_PERSON_FACE', duration: 5.0 },
      { type: 'MULTIPLE_PERSON_YOLO', duration: 5.0 },
      { type: 'VOICE_MISMATCH', duration: 2.0 },
      { type: 'LIP_SYNC_MISMATCH', duration: 1.5 },
      { type: 'FULLSCREEN_EXIT', duration: 8.0 },
      { type: 'WINDOW_BLUR', duration: 5.0 },
      { type: 'EYES_CLOSED', duration: 2.5 },
    ]

    let index = 0
    const interval = setInterval(() => {
      const evt = mockEvents[index % mockEvents.length]
      onMessage?.({
        ...evt,
        interview_id: url.split('/').pop(),
        timestamp: new Date().toISOString(),
        message: evt.type.replace(/_/g, ' '),
      })
      index++
    }, 6000)

    const connection = {
      send: (payload) => console.debug('[WebSocket Mock] Sent:', payload),
      close: () => clearInterval(interval),
      ws: null,
      isMock: true,
    }

    this.connections.set(url, connection)
    return connection
  }
}

export const websocketService = new WebSocketService()
export default websocketService
