// Durée de focus mémorisée. Clé localStorage dédiée, hors de `questlife_data`.
import { normalizeFocusMinutes } from './focusTimer'

export const FOCUS_PREFS_KEY = 'questlife_focus_prefs'

export function loadFocusMinutes(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(FOCUS_PREFS_KEY)
    if (!raw) return normalizeFocusMinutes(undefined)
    return normalizeFocusMinutes(JSON.parse(raw)?.minutes)
  } catch {
    return normalizeFocusMinutes(undefined)
  }
}

export function saveFocusMinutes(minutes, storage = globalThis.localStorage) {
  try {
    storage?.setItem(FOCUS_PREFS_KEY, JSON.stringify({ minutes: normalizeFocusMinutes(minutes) }))
  } catch {
    // Stockage indisponible : durée non mémorisée.
  }
}
