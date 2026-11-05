import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { localDayKey, localTimestamp } from '../../utils/agenda'
import DeadlineRow from './DeadlineRow'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTH_FMT = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

// Onglet Agenda : mini-calendrier du mois, liste du jour, formulaire de création.
export default function AgendaTab() {
  const agenda = useStore(s => s.agenda)
  const createAgendaSlot = useStore(s => s.createAgendaSlot)
  const getAgendaItemsForDay = useStore(s => s.getAgendaItemsForDay)
  const getAgendaItemBusyDays = useStore(s => s.getAgendaItemBusyDays)
  const openAgendaDeadline = useStore(s => s.openAgendaDeadline)
  const quests = useStore(s => s.quests) // re-render quand une deadline change

  const todayKey = localDayKey()
  const [selected, setSelected] = useState(todayKey)
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(todayKey)
  const [start, setStart] = useState('18:00')
  const [end, setEnd] = useState('19:00')
  const [error, setError] = useState('')

  // `agenda` est lu pour re-render quand les créneaux changent.
  const busy = new Set(agenda && quests ? getAgendaItemBusyDays() : [])
  const items = getAgendaItemsForDay(selected)

  const first = new Date(cursor.year, cursor.month, 1)
  const offset = (first.getDay() + 6) % 7 // lundi en premier
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => localDayKey(new Date(cursor.year, cursor.month, i + 1).getTime())),
  ]

  function shiftMonth(delta) {
    const d = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  function goToday() {
    const d = new Date()
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setSelected(todayKey)
  }

  function selectDay(key) {
    setSelected(key)
    setDay(key)
  }

  function openForm() {
    setDay(selected)
    setError('')
    setFormOpen(true)
  }

  function submit(e) {
    e.preventDefault()
    const result = createAgendaSlot({
      title,
      startAt: localTimestamp(day, start),
      endAt: localTimestamp(day, end),
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    setTitle('')
    setFormOpen(false)
    selectDay(day)
    const d = new Date(result.slot.startAt)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  const inputCls = 'w-full text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200'
  const [sy, sm, sd] = selected.split('-').map(Number)

  return (
    <div className="p-2 space-y-3 text-gray-700 dark:text-gray-200">
      <div>
        <div className="flex items-center justify-between mb-1">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mois précédent"
            className="w-6 h-6 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">‹</button>
          <span className="text-xs font-medium capitalize">{MONTH_FMT.format(first)}</span>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Mois suivant"
            className="w-6 h-6 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">›</button>
        </div>
        <div className="grid grid-cols-7 text-center text-[10px] text-gray-400 mb-0.5">
          {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((key, i) => {
            if (!key) return <span key={`e${i}`} />
            const isSel = key === selected
            const isToday = key === todayKey
            return (
              <button key={key} type="button" onClick={() => selectDay(key)}
                aria-label={key} aria-pressed={isSel}
                className={`relative h-7 text-xs rounded-md ${
                  isSel ? 'bg-purple-500 text-white font-medium'
                    : isToday ? 'ring-1 ring-purple-400 text-purple-600 dark:text-purple-300'
                    : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}>
                {Number(key.slice(8))}
                {busy.has(key) && (
                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isSel ? 'bg-white' : 'bg-purple-500'}`} />
                )}
              </button>
            )
          })}
        </div>
        <button type="button" onClick={goToday}
          className="mt-1 w-full text-xs text-purple-600 dark:text-purple-300 hover:underline">
          Aujourd'hui
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium capitalize">{DAY_FMT.format(new Date(sy, sm - 1, sd))}</p>
          {!formOpen && (
            <button type="button" onClick={openForm}
              className="text-xs px-2 py-0.5 rounded-md bg-purple-500 text-white hover:bg-purple-600">
              + Créneau
            </button>
          )}
        </div>

        {formOpen && (
          <form onSubmit={submit} className="space-y-1.5 p-2 mb-2 rounded-lg border border-gray-100 dark:border-zinc-800">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre"
              aria-label="Titre" className={inputCls} />
            <input type="date" value={day} onChange={e => setDay(e.target.value)}
              aria-label="Jour" className={inputCls} />
            <div className="flex gap-1.5">
              <input type="time" value={start} onChange={e => setStart(e.target.value)}
                aria-label="Début" className={inputCls} />
              <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                aria-label="Fin" className={inputCls} />
            </div>
            {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-1.5">
              <button type="submit" className="flex-1 text-xs py-1 rounded-md bg-purple-500 text-white hover:bg-purple-600">Créer</button>
              <button type="button" onClick={() => { setFormOpen(false); setError('') }}
                className="flex-1 text-xs py-1 rounded-md border border-gray-200 dark:border-zinc-700">Annuler</button>
            </div>
          </form>
        )}

        {items.length === 0 ? (
          <p className="text-xs text-gray-400">Aucun créneau ce jour.</p>
        ) : (
          <ul className="space-y-1">
            {items.map(s => s.kind === 'deadline' ? (
              <DeadlineRow key={s.id} item={s} onOpen={openAgendaDeadline} />
            ) : (
              <li key={s.id} className="px-2 py-1.5 rounded-lg border border-gray-100 dark:border-zinc-800">
                <p className="text-xs font-medium truncate">{s.title}</p>
                <p className="text-xs text-gray-400">
                  {TIME_FMT.format(s.startAt)} – {TIME_FMT.format(s.endAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
