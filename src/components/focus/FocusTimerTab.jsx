import React, { useEffect, useState } from 'react'
import { Btn } from '../ui'
import { useFocusTimer } from '../../store/useFocusTimer'
import {
  FOCUS_PRESETS_MINUTES,
  MIN_FOCUS_MINUTES,
  MAX_FOCUS_MINUTES,
  MINUTE_MS,
  getRemainingMs,
  formatClock,
} from '../../utils/focusTimer'

// Onglet « Minuteur » : réglage de la durée du focus et contrôles.
export default function FocusTimerTab() {
  const { timer, now, setDurationMinutes, start, pause, resume, reset, restart } = useFocusTimer()
  const idle = timer.status === 'idle'
  const minutes = Math.round(timer.durationMs / MINUTE_MS)

  // Brouillon du champ libre : permet de taper « 4 » en route vers « 45 ».
  const [draft, setDraft] = useState(String(minutes))
  useEffect(() => { setDraft(String(minutes)) }, [minutes])

  function onDraftChange(e) {
    setDraft(e.target.value)
    if (e.target.value.trim() !== '') setDurationMinutes(e.target.value)
  }

  const statusLabel = {
    idle: 'Prêt',
    running: 'Focus en cours',
    paused: 'En pause',
    done: 'Focus terminé',
  }[timer.status]

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-gray-400">{statusLabel}</p>
        <p className="text-4xl font-medium tabular-nums text-gray-900 dark:text-gray-100 mt-1">
          {formatClock(getRemainingMs(timer, now))}
        </p>
      </div>

      <div className="flex gap-1.5 justify-center flex-wrap">
        {FOCUS_PRESETS_MINUTES.map(m => (
          <button key={m} type="button" disabled={!idle} onClick={() => setDurationMinutes(m)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border disabled:opacity-40 disabled:cursor-not-allowed ${
              m === minutes
                ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                : 'border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}>
            {m} min
          </button>
        ))}
      </div>

      <label className="flex items-center justify-center gap-2 text-xs text-gray-400">
        Durée (min)
        <input type="number" inputMode="numeric" min={MIN_FOCUS_MINUTES} max={MAX_FOCUS_MINUTES}
          disabled={!idle} value={draft} onChange={onDraftChange} onBlur={() => setDraft(String(minutes))}
          className="w-16 text-sm px-2 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 outline-none focus:border-purple-400 disabled:opacity-40" />
      </label>

      <div className="flex gap-2 justify-center">
        {timer.status === 'idle' && <Btn variant="primary" size="sm" onClick={() => start()}>Démarrer</Btn>}
        {timer.status === 'running' && <Btn size="sm" onClick={() => pause()}>Pause</Btn>}
        {timer.status === 'paused' && <Btn variant="primary" size="sm" onClick={() => resume()}>Reprendre</Btn>}
        {(timer.status === 'running' || timer.status === 'paused') && <Btn size="sm" onClick={reset}>Réinitialiser</Btn>}
        {timer.status === 'done' && (
          <>
            <Btn variant="primary" size="sm" onClick={() => restart()}>Relancer</Btn>
            <Btn size="sm" onClick={reset}>Fermer</Btn>
          </>
        )}
      </div>
    </div>
  )
}
