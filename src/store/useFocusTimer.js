import { create } from 'zustand'
import {
  MINUTE_MS,
  idleTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  finishTimer,
  isFinished,
  normalizeFocusMinutes,
} from '../utils/focusTimer'
import { loadFocusMinutes, saveFocusMinutes } from '../utils/focusPrefs'
import { formatReminderLeadTime } from '../utils/reminders'

// Store dédié au minuteur : état en mémoire uniquement (fermer l'app l'abandonne),
// seule la durée choisie est mémorisée (voir focusPrefs).

function emitToast(msg, type = 'success') {
  globalThis.dispatchEvent(new CustomEvent('questlife:toast', { detail: { msg, type } }))
}

function emitSystemNotification(title, body) {
  globalThis.dispatchEvent(new CustomEvent('questlife:system-notify', { detail: { title, body } }))
}

export const useFocusTimer = create((set, get) => ({
  timer: idleTimer(loadFocusMinutes() * MINUTE_MS),
  now: Date.now(),

  setDurationMinutes(minutes) {
    if (get().timer.status !== 'idle') return
    const normalized = normalizeFocusMinutes(minutes)
    saveFocusMinutes(normalized)
    set({ timer: idleTimer(normalized * MINUTE_MS) })
  },

  start(now = Date.now()) {
    set(s => ({ timer: startTimer(s.timer, now), now }))
  },

  pause(now = Date.now()) {
    set(s => ({ timer: pauseTimer(s.timer, now), now }))
  },

  resume(now = Date.now()) {
    set(s => ({ timer: resumeTimer(s.timer, now), now }))
  },

  reset() {
    set(s => ({ timer: resetTimer(s.timer) }))
  },

  restart(now = Date.now()) {
    set(s => ({ timer: s.timer.status === 'done' ? startTimer(s.timer, now) : s.timer, now }))
  },

  tick(now) {
    const { timer } = get()
    if (isFinished(timer, now)) {
      set({ timer: finishTimer(timer), now })
      emitToast('Focus terminé')
      emitSystemNotification(
        'QuestLife - focus terminé',
        `Focus de ${formatReminderLeadTime(timer.durationMs)} terminé.`,
      )
      return
    }
    set({ now })
  },
}))
