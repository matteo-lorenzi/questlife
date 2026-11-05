// Machine à états pure du minuteur de focus. Aucune lecture de l'horloge :
// l'instant courant est toujours passé en paramètre.

export const DEFAULT_FOCUS_MINUTES = 60
export const MIN_FOCUS_MINUTES = 1
export const MAX_FOCUS_MINUTES = 180
export const FOCUS_PRESETS_MINUTES = [15, 25, 45, 60]

const MINUTE_MS = 60000

export function normalizeFocusMinutes(value) {
  if (value === null || value === undefined || value === '') return DEFAULT_FOCUS_MINUTES
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULT_FOCUS_MINUTES
  return Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, Math.round(n)))
}

export function idleTimer(durationMs) {
  return { status: 'idle', durationMs, endAt: null, remainingMs: durationMs }
}

export function startTimer(t, now) {
  if (t.status !== 'idle' && t.status !== 'done') return t
  return { status: 'running', durationMs: t.durationMs, endAt: now + t.durationMs, remainingMs: t.durationMs }
}

export function pauseTimer(t, now) {
  if (t.status !== 'running') return t
  return { ...t, status: 'paused', endAt: null, remainingMs: Math.max(0, t.endAt - now) }
}

export function resumeTimer(t, now) {
  if (t.status !== 'paused') return t
  return { ...t, status: 'running', endAt: now + t.remainingMs }
}

export function resetTimer(t) {
  return idleTimer(t.durationMs)
}

export function finishTimer(t) {
  return { ...t, status: 'done', endAt: null, remainingMs: 0 }
}

export function isFinished(t, now) {
  return t.status === 'running' && now >= t.endAt
}

export function getRemainingMs(t, now) {
  switch (t.status) {
    case 'running': return Math.max(0, t.endAt - now)
    case 'paused': return t.remainingMs
    case 'idle': return t.durationMs
    default: return 0
  }
}

// Durée lisible sans arrondi trompeur : « 25 min », « 1 h », « 1 h 30 ».
export function formatFocusDuration(ms) {
  const totalMinutes = Math.round(ms / MINUTE_MS)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m}`
}

export function formatClock(ms) {
  const totalSeconds = ms > 0 ? Math.ceil(ms / 1000) : 0
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}

export { MINUTE_MS }
