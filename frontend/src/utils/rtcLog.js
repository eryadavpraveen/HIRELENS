/** Dev-only WebRTC/signaling trace (always on in production for interview debugging). */
const PREFIX = '[WebRTC]'

export function rtcLog(scope, message, data) {
  if (data !== undefined) {
    console.info(`${PREFIX}:${scope}`, message, data)
  } else {
    console.info(`${PREFIX}:${scope}`, message)
  }
}

export function rtcWarn(scope, message, data) {
  if (data !== undefined) {
    console.warn(`${PREFIX}:${scope}`, message, data)
  } else {
    console.warn(`${PREFIX}:${scope}`, message)
  }
}
