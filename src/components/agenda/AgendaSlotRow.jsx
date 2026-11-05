import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { localDayKey, localTimestamp } from '../../utils/agenda'

const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const hhmm = ts => {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const inputCls = 'w-full text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200'

// Sélecteur de chapitre facultatif (réutilisé par le formulaire de création).
export function ChapterSelect({ value, onChange }) {
  const chapters = useStore(s => s.chapters)
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value || null)}
      aria-label="Chapitre" className={inputCls}>
      <option value="">Aucun chapitre</option>
      {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
    </select>
  )
}

// Ligne d'un créneau : case « fait », chapitre coloré, modification et suppression.
export default function AgendaSlotRow({ slot }) {
  const updateAgendaSlot = useStore(s => s.updateAgendaSlot)
  const deleteAgendaSlot = useStore(s => s.deleteAgendaSlot)
  const toggleAgendaSlotDone = useStore(s => s.toggleAgendaSlotDone)
  const chapter = useStore(s => s.chapters.find(c => c.id === slot.chapterId))

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(slot.title)
  const [day, setDay] = useState(localDayKey(slot.startAt))
  const [start, setStart] = useState(hhmm(slot.startAt))
  const [end, setEnd] = useState(hhmm(slot.endAt))
  const [chapterId, setChapterId] = useState(slot.chapterId)
  const [error, setError] = useState('')

  function openEdit() {
    setTitle(slot.title)
    setDay(localDayKey(slot.startAt))
    setStart(hhmm(slot.startAt))
    setEnd(hhmm(slot.endAt))
    setChapterId(slot.chapterId)
    setError('')
    setEditing(true)
  }

  function save(e) {
    e.preventDefault()
    const result = updateAgendaSlot(slot.id, {
      title,
      startAt: localTimestamp(day, start),
      endAt: localTimestamp(day, end),
      chapterId,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setEditing(false)
  }

  const box = 'px-2 py-1.5 rounded-lg border border-gray-100 dark:border-zinc-800'

  if (editing) {
    return (
      <li className={box}>
        <form onSubmit={save} className="space-y-1.5">
          <input value={title} onChange={e => setTitle(e.target.value)} aria-label="Titre" className={inputCls} />
          <input type="date" value={day} onChange={e => setDay(e.target.value)} aria-label="Jour" className={inputCls} />
          <div className="flex gap-1.5">
            <input type="time" value={start} onChange={e => setStart(e.target.value)} aria-label="Début" className={inputCls} />
            <input type="time" value={end} onChange={e => setEnd(e.target.value)} aria-label="Fin" className={inputCls} />
          </div>
          <ChapterSelect value={chapterId} onChange={setChapterId} />
          {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-1.5">
            <button type="submit" className="flex-1 text-xs py-1 rounded-md bg-purple-500 text-white hover:bg-purple-600">Enregistrer</button>
            <button type="button" onClick={() => setEditing(false)}
              className="flex-1 text-xs py-1 rounded-md border border-gray-200 dark:border-zinc-700">Annuler</button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className={`${box} flex items-start gap-2`}>
      <input type="checkbox" checked={slot.done} onChange={() => toggleAgendaSlotDone(slot.id)}
        aria-label="Fait" className="mt-0.5 accent-purple-500" />
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium truncate ${slot.done ? 'line-through text-gray-400' : ''}`}>{slot.title}</p>
        <p className="text-xs text-gray-400">{TIME_FMT.format(slot.startAt)} – {TIME_FMT.format(slot.endAt)}</p>
        {chapter && (
          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chapter.color?.accent }} />
            {chapter.title}
          </span>
        )}
      </div>
      <button type="button" onClick={openEdit} aria-label="Modifier"
        className="text-xs text-gray-400 hover:text-purple-500">✎</button>
      <button type="button" onClick={() => deleteAgendaSlot(slot.id)} aria-label="Supprimer"
        className="text-xs text-gray-400 hover:text-red-500">✕</button>
    </li>
  )
}
