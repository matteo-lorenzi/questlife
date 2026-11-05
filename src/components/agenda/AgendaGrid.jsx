import React, { useEffect, useMemo, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { GRID_START_HOUR, GRID_END_HOUR, minutesSinceGridStart } from '../../utils/agenda'

const HOUR_PX = 48
const MIN_BLOCK_PX = 20
const DEADLINE_PX = 18
const PX_PER_MIN = HOUR_PX / 60
const HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i)
const TOTAL_PX = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_PX
const pad = n => String(n).padStart(2, '0')

// Grille horaire en lecture seule : un jour, axe 06:00-23:00, 48 px par heure.
export default function AgendaGrid({ dayKey, todayKey, now }) {
  const getAgendaGridForDay = useStore(s => s.getAgendaGridForDay)
  const slots = useStore(s => s.agenda.slots) // re-render quand les créneaux changent
  const quests = useStore(s => s.quests) // re-render quand les deadlines changent
  const openAgendaDeadline = useStore(s => s.openAgendaDeadline)
  const chapters = useStore(s => s.chapters)
  const scrollRef = useRef(null)

  const grid = useMemo(() => getAgendaGridForDay(dayKey, now), [getAgendaGridForDay, dayKey, now, slots, quests])
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
      <div className="relative" style={{ height: TOTAL_PX + 8 }}>
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
            if (item.kind === 'deadline') {
              const tone = item.done
                ? 'border-gray-300 dark:border-zinc-600 text-gray-400 line-through'
                : item.expired
                  ? 'border-red-400 dark:border-red-500/60 text-red-600 dark:text-red-400'
                  : 'border-amber-400 dark:border-amber-500/60 text-amber-700 dark:text-amber-300'
              return (
                <button key={item.id} type="button" data-testid="agenda-grid-deadline"
                  onClick={() => openAgendaDeadline(item.questId)}
                  title={`${item.title || 'Quête sans titre'}${item.done ? ' · validée' : item.expired ? ' · expirée' : ''}`}
                  className={`absolute left-0 right-0 z-[5] flex items-center gap-1 px-1.5 text-left text-[11px] leading-none truncate border-t-2 border-dashed bg-white/80 dark:bg-zinc-900/80 ${tone}`}
                  style={{ top: item.startMin * PX_PER_MIN, height: DEADLINE_PX }}>
                  <span>⚑</span>
                  <span className="truncate">{item.title || 'Quête sans titre'}{item.done ? ' · validée' : item.expired ? ' · expirée' : ''}</span>
                </button>
              )
            }
            const chapter = chapters.find(c => c.id === item.chapterId)
            const height = Math.max(MIN_BLOCK_PX, (item.endMin - item.startMin) * PX_PER_MIN)
            const accent = chapter?.color?.accent || '#a855f7'
            return (
              <div key={item.id} title={item.title}
                className="absolute left-0 right-0 overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight text-gray-800 dark:text-gray-100 bg-purple-100/80 dark:bg-zinc-800"
                style={{ top: item.startMin * PX_PER_MIN, height, borderLeft: `3px solid ${accent}`, backgroundColor: `${accent}26` }}>
                <span className={`font-medium ${item.done ? 'line-through opacity-60' : ''}`}>{item.title}</span>
              </div>
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
  )
}
