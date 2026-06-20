/**
 * Lightweight client-side gate that records whether a student has completed
 * BOTH photo and voice registration for a given interview. The interview room
 * refuses entry unless both flags are set.
 *
 * Stored in localStorage keyed by interview id so a page refresh during the
 * verified session does not force re-verification.
 */
const KEY = (interviewId) => `hirelens:verified:${interviewId}`

export function getVerificationState(interviewId) {
  try {
    const raw = localStorage.getItem(KEY(interviewId))
    if (!raw) return { photo: false, voice: false }
    return { photo: false, voice: false, ...JSON.parse(raw) }
  } catch {
    return { photo: false, voice: false }
  }
}

export function setVerificationStep(interviewId, step) {
  const state = getVerificationState(interviewId)
  const next = { ...state, ...step }
  try {
    localStorage.setItem(KEY(interviewId), JSON.stringify(next))
  } catch {
    /* ignore quota / privacy mode errors */
  }
  return next
}

export function isFullyVerified(interviewId) {
  const { photo, voice } = getVerificationState(interviewId)
  return Boolean(photo && voice)
}

export function clearVerification(interviewId) {
  try {
    localStorage.removeItem(KEY(interviewId))
  } catch {
    /* ignore */
  }
}
