import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import AgendaSlotRow from './AgendaSlotRow'
import { useStore } from '../../store/useStore'
import AgendaDeadlineButton from './AgendaDeadlineButton'
import { GRID_START_HOUR, GRID_END_HOUR, minutesSinceGridStart, slotTimesForGridClick, minutesToHHMM, gridMinutesToHHMM } from '../../utils/agenda'

const HOUR_PX = 48
const DEADLINE_PX = 18
const PX_PER_MIN = HOUR_PX / 60
const HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i)
const TOTAL_PX = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_PX
// Largeur et décalage horizontal d'un élément selon sa colonne de chevauchement.
const colStyle = item => ({ left: `${(item.col / item.cols) * 100}%`, width: `${100 / item.cols}%` })

// Grille horaire en lecture seule : un jour, axe 06:00-23:00, 48 px par heure.
export default function AgendaGrid({ dayKey, todayKey, now, onCreateAt }) {
  const getAgendaGridForDay = useStore(s => s.getAgendaGridForDay)
  const slots = useStore(s => s.agenda.slots) // re-render quand les créneaux changent
  const quests = useStore(s => s.quests) // re-render quand les deadlines changent
  const openAgendaDeadline = useStore(s => s.openAgendaDeadline)
  const chapters = useStore(s => s.chapters)
  const scrollRef = useRef(null)
  const [open, setOpen] = useState(null) // { id, rect } du bloc cliqué
  const closeCard = useCallback(() => setOpen(null), [])
  const closedByPointerRef = useRef(false) // un clic dans le vide qui ferme la carte ne crée rien
  const openSlot = open ? slots.find(s => s.id === open.id) : null

  const grid = useMemo(() => getAgendaGridForDay(dayKey, now), [getAgendaGridForDay, dayKey, now, slots, quests])
  // Créneau supprimé ou déplacé hors du jour : la carte se ferme.
  useEffect(() => {
    if (open && ![...grid.items, ...grid.before, ...grid.after].some(i => i.id === open.id)) setOpen(null)
  }, [open, grid])
  const isEmpty = !grid.items.length && !grid.before.length && !grid.after.length
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

  const bandProps = { chapters, openAgendaDeadline, onOpenSlot: setOpen }

  return (
    <div>
    {isEmpty && (
      <p data-testid="agenda-empty" className="mb-1 text-[11px] text-gray-400">
        Aucun créneau ce jour.{onCreateAt ? ' Cliquez sur la grille pour en ajouter.' : ''}
      </p>
    )}
    <div className="rounded-lg border border-gray-100 dark:border-zinc-800">
    {grid.before.length > 0 && <Band testid="agenda-band-before" label="Avant 06:00" items={grid.before} {...bandProps} />}
    <div ref={scrollRef} data-testid="agenda-grid" className="relative overflow-y-auto h-72">
      <div className="relative" style={{ height: TOTAL_PX + 8 }}
        onMouseDownCapture={() => { closedByPointerRef.current = open != null }}
        onClick={e => {
          // Seule une zone vide déclenche la création ; si une carte était ouverte, ce clic ne fait que la fermer.
          const closedCard = closedByPointerRef.current
          closedByPointerRef.current = false
          if (closedCard || !onCreateAt || e.target.closest('[data-grid-item]')) return
          const rect = e.currentTarget.getBoundingClientRect()
          onCreateAt(slotTimesForGridClick((e.clientY - rect.top) / PX_PER_MIN))
        }}>
        {HOURS.map((h, i) => (
          <React.Fragment key={h}>
            <div className="absolute left-0 right-0 border-t border-gray-200 dark:border-zinc-700" style={{ top: i * HOUR_PX }}>
              <span className="absolute left-1 -top-2 px-0.5 text-[9px] leading-none text-gray-400 bg-white dark:bg-zinc-900">{minutesToHHMM(h * 60)}</span>
            </div>
            {h < GRID_END_HOUR && (
              <div className="absolute left-9 right-0 border-t border-dashed border-gray-100 dark:border-zinc-800" style={{ top: i * HOUR_PX + HOUR_PX / 2 }} />
            )}
          </React.Fragment>
        ))}

        <div className="absolute top-0 bottom-0 left-10 right-1">
          {grid.items.map(item => {
            if (item.kind === 'deadline') {
              return (
                <AgendaDeadlineButton key={item.id} item={item} onOpen={openAgendaDeadline} testid="agenda-grid-deadline"
                  className="absolute z-[5] leading-none"
                  style={{ top: item.startMin * PX_PER_MIN, height: DEADLINE_PX, ...colStyle(item) }} />
              )
            }
            const chapter = chapters.find(c => c.id === item.chapterId)
            const height = item.displayMin * PX_PER_MIN // même durée d'affichage que celle des colonnes de chevauchement
            const accent = chapter?.color?.accent || '#a855f7'
            return (
              <button key={item.id} type="button" title={item.title} data-slot-id={item.id} data-grid-item
                onClick={e => setOpen({ id: item.id, rect: e.currentTarget.getBoundingClientRect() })}
                className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight text-gray-800 dark:text-gray-100 bg-purple-100/80 dark:bg-zinc-800 cursor-pointer"
                style={{ top: item.startMin * PX_PER_MIN, height, ...colStyle(item), borderLeft: `3px solid ${accent}`, backgroundColor: `${accent}26` }}>
                {item.startMarker && <span data-testid="agenda-marker-start" className="block text-[9px] leading-none opacity-70">{item.startMarker}</span>}
                <span className={`font-medium ${item.done ? 'line-through opacity-60' : ''}`}>{item.title}</span>
                {item.endMarker && <span data-testid="agenda-marker-end" className="block text-[9px] leading-none opacity-70">{item.endMarker}</span>}
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
    </div>
    {grid.after.length > 0 && <Band testid="agenda-band-after" label="Après 23:00" items={grid.after} {...bandProps} />}
    {openSlot && (
      <SlotPopover slot={openSlot} rect={open.rect} scrollRef={scrollRef} onClose={closeCard} />
    )}
    </div>
    </div>
  )
}

// Bande fixe (hors de la zone qui défile) pour les éléments entièrement hors plage.
// Les éléments se placent côte à côte et passent à la ligne si nécessaire.
function Band({ testid, label, items, chapters, openAgendaDeadline, onOpenSlot }) {
  return (
    <div data-testid={testid}
      className="px-1.5 py-1 bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-800 first:border-b last:border-t">
      <div className="text-[9px] leading-none uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {items.map(item => {
          const time = gridMinutesToHHMM(item.startMin)
          if (item.kind === 'deadline') {
            return (
              <AgendaDeadlineButton key={item.id} item={item} onOpen={openAgendaDeadline} testid="agenda-band-deadline" time={time}
                className="flex-1 basis-[45%] min-w-0 py-0.5 leading-tight" />
            )
          }
          const accent = chapters.find(c => c.id === item.chapterId)?.color?.accent || '#a855f7'
          return (
            <button key={item.id} type="button" title={item.title} data-slot-id={item.id} data-grid-item data-testid="agenda-band-slot"
              onClick={e => onOpenSlot({ id: item.id, rect: e.currentTarget.getBoundingClientRect() })}
              className="flex-1 basis-[45%] min-w-0 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight text-gray-800 dark:text-gray-100 cursor-pointer"
              style={{ borderLeft: `3px solid ${accent}`, backgroundColor: `${accent}26` }}>
              <span className={`block truncate font-medium ${item.done ? 'line-through opacity-60' : ''}`}>{time} {item.title}</span>
            </button>
          )
        })}
      </div>
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
    const onKey = e => {
      if (e.key !== 'Escape') return
      if (popRef.current?.querySelector('form')) return // édition en cours : Échap ne ferme pas la carte
      onClose()
    }
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
      if (!b) return
      const box = el.getBoundingClientRect()
      const r = b.getBoundingClientRect()
      if (r.bottom <= box.top || r.top >= box.bottom) onClose() // bloc sorti de la zone visible
      else setAnchor(r)
    }
    el.addEventListener('scroll', follow)
    return () => el.removeEventListener('scroll', follow)
  }, [scrollRef, slotId, onClose])

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
