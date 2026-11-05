import React from 'react'
import { useFocusTimer } from '../../store/useFocusTimer'
import { getRemainingMs, formatClock } from '../../utils/focusTimer'
import { requestOpenPanelTab } from '../../utils/panelPrefs'

// Pastille discrète d'en-tête : rappelle le minuteur tant qu'il n'est pas au repos.
export default function FocusPill() {
  const timer = useFocusTimer(s => s.timer)
  const now = useFocusTimer(s => s.now)
  if (timer.status === 'idle') return null

  const done = timer.status === 'done'
  const paused = timer.status === 'paused'
  const label = done ? 'Terminé' : formatClock(getRemainingMs(timer, now))

  return (
    <button type="button" onClick={() => requestOpenPanelTab('timer')}
      aria-label="Ouvrir le minuteur" title={paused ? 'Minuteur en pause' : 'Minuteur de focus'}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium tabular-nums transition-colors ${
        done
          ? 'border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30'
          : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
      } ${paused ? 'opacity-60' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-teal-500' : paused ? 'bg-gray-400' : 'bg-purple-500 animate-pulse'}`} />
      {label}
    </button>
  )
}
