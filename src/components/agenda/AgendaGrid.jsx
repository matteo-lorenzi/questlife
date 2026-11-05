import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AgendaSlotRow from './AgendaSlotRow'
import { useStore } from '../../store/useStore'
import { GRID_START_HOUR, GRID_END_HOUR, minutesSinceGridStart, slotTimesForGridClick } from '../../utils/agenda'

const HOUR_PX = 48
const MIN_BLOCK_PX = 20
const PX_PER_MIN = HOUR_PX / 60
const HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i)
const TOTAL_PX = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_PX
const pad = n => String(n).padStart(2, '0')

// Grille horaire en lecture seule : un jour, axe 06:00-23:00, 48 px par heure.
export default function AgendaGrid({ dayKey, todayKey, now, onCreateAt }) {
  const getAgendaGridForDay = useStore(s => s.getAgendaGridForDay)
  const slots = useStore(s => s.agenda.slots) // re-render quand les créneaux changent
  const chapters = useStore(s => s.chapters)
  const scrollRef = useRef(null)
  const [open, setOpen] = useState(null) // { id, rect } du bloc cliqué
  const openSlot = open ? slots.find(s => s.id === open.id) : null

  const grid = useMemo(() => getAgendaGridForDay(dayKey, now), [getAgendaGridForDay, dayKey, now, slots])
  // Créneau supprimé ou déplacé hors du jour : la carte se ferme.
  useEffect(() => {
    if (open && !grid.items.some(i => i.id === open.id)) setOpen(null)
  }, [open, grid])
  const isToday = dayKey === todayKey
  const nowMin = minutesSinceGridStart(now)
  const showNow = isToday && nowMin >= 0 && nowMin <= (GRID_END_HOUR - GRID_START_HOUR) * 60

  // Auto-défilement au changement de jour : heure actuelle (aujourd'hui) ou premier élément.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let targetMin = 0
    if (isToday) targetMin = Math.max(0, minutesSinceGridStart(Date.now()) - 60)
    else if (grid.items.length) targetMin = Math.max(0, grid.items[0].startMin - 15)
    el.scrollTop = targetMin * PX_PER_MIN
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey])

  return (
    <div ref={scrollRef} data-testid="agenda-grid"
      className="relative overflow-y-auto h-72 rounded-lg border border-gray-100 dark:border-zinc-800">
      <div className="relative" style={{ height: TOTAL_PX + 8 }}
        onClick={e => {
          // Seule une zone vide déclenche la création (blocs et repères stoppent la propagation).
          if (!onCreateAt || e.target.closest('[data-grid-item]')) return
          const rect = e.currentTarget.getBoundingClientRect()
          onCreateAt(slotTimesForGridClick((e.clientY - rect.top) / PX_PER_MIN))
        }}>
        {HOURS.map((h, i) => (
          <React.Fragment key={h}>
            <div className="absolute left-0 right-0 border-t border-gray-200 dark:border-zinc-700" style={{ top: i * HOUR_PX }}>
              <span className="absolute left-1 -top-2 px-0.5 text-[9px] leading-none text-gray-400 bg-white dark:bg-zinc-900">{pad(h)}:00</span>
            </div>
            {h < GRID_END_HOUR && (
              <div className="absolute left-9 right-0 border-t border-dashed border-gray-100 dark:border-zinc-800" style={{ top: i * HOUR_PX + HOUR_PX / 2 }} />
            )}
          </React.Fragment>
        ))}

        <div className="absolute top-0 bottom-0 left-10 right-1">
          {grid.items.map(item => {
            const chapter = chapters.find(c => c.id === item.chapterId)
            const height = Math.max(MIN_BLOCK_PX, (item.endMin - item.startMin) * PX_PER_MIN)
            const accent = chapter?.color?.accent || '#a855f7'
            return (
              <button key={item.id} type="button" title={item.title} data-slot-id={item.id} data-grid-item
                onClick={e => setOpen({ id: item.id, rect: e.currentTarget.getBoundingClientRect() })}
                className="absolute left-0 right-0 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight text-gray-800 dark:text-gray-100 bg-purple-100/80 dark:bg-zinc-800 cursor-pointer"
                style={{ top: item.startMin * PX_PER_MIN, height, borderLeft: `3px solid ${accent}`, backgroundColor: `${accent}26` }}>
                <span className={`font-medium ${item.done ? 'line-through opacity-60' : ''}`}>{item.title}</span>
              </button>
            )
          })}
        </div>

        {showNow && (
          <div data-testid="agenda-now-line" className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: nowMin * PX_PER_MIN }}>
            <div className="border-t-2 border-red-500" />
            <span className="absolute -left-0.5 -top-1 w-2 h-2 rounded-full bg-red-500" />
          </div>
        )}
      </div>
      {openSlot && (
        <SlotPopover slot={openSlot} rect={open.rect} scrollRef={scrollRef} onClose={() => setOpen(null)} />
      )}
    </div>
  )
}

const POP_W = 240
const POP_MAX_H = 320

// Carte du créneau en surimpression, ancrée au bloc cliqué (position fixe : pas rognée par le défilement).
function SlotPopover({ slot, rect, scrollRef, onClose }) {
  const popRef = useRef(null)
  const [anchor, setAnchor] = useState(rect)
  const slotId = slot.id

  useEffect(() => { setAnchor(rect) }, [rect])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    const onDown = e => {
      if (popRef.current?.contains(e.target)) return
      if (e.target.closest?.('[data-slot-id]')) return // un autre bloc rouvre sa propre carte
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [onClose])

  // Suit le bloc quand la grille défile.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    const follow = () => {
      const b = el.querySelector(`[data-slot-id="${slotId}"]`)
      if (b) setAnchor(b.getBoundingClientRect())
    }
    el.addEventListener('scroll', follow)
    return () => el.removeEventListener('scroll', follow)
  }, [scrollRef, slotId])

  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = Math.max(4, Math.min(anchor.left, vw - POP_W - 4))
  const below = anchor.bottom + 4
  const fitsBelow = below + Math.min(POP_MAX_H, 200) <= vh
  const style = fitsBelow
    ? { top: below, left, width: POP_W, maxHeight: Math.min(POP_MAX_H, vh - below - 4) }
    : { bottom: vh - anchor.top + 4, left, width: POP_W, maxHeight: Math.min(POP_MAX_H, anchor.top - 8) }

  return createPortal(
    <div ref={popRef} role="dialog" aria-label="Créneau" style={style}
      className="fixed z-50 overflow-y-auto rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200">
      <ul><AgendaSlotRow slot={slot} /></ul>
    </div>,
    document.body,
  )
}
