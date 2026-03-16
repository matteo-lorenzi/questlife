import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import ChapterIcon from '../../assets/icons/ChapterIcon'
import { getChapterProgress } from '../../utils/graph'
import { ProgressBar } from '../ui'

export default function ChapterSwitcher({ chapter }) {
  const { chapters, quests, setActiveChapter, openChapterModal } = useStore()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const active = chapters.filter(c => !c.archivedAt)
  const filtered = active.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(o => !o); setSearch('') }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all duration-150">
        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: chapter.color.bg }}>
          <ChapterIcon icon={chapter.icon} accent={chapter.color.accent} size={12} />
        </div>
        <span className="text-sm font-medium text-gray-900 max-w-[160px] truncate">{chapter.title}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-400 flex-shrink-0">
          <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-30 bg-white border border-gray-100 rounded-xl shadow-lg w-64 animate-fadeIn overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer les chapitres…"
              className="w-full text-xs outline-none text-gray-700 placeholder:text-gray-300 bg-transparent" />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.map(ch => {
              const prog = getChapterProgress(quests.filter(q => q.chapterId === ch.id))
              const isCurrent = ch.id === chapter.id
              return (
                <button key={ch.id} onClick={() => { setActiveChapter(ch.id); setOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                  style={{ background: isCurrent ? ch.color.bg : undefined }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isCurrent ? ch.color.bg : '#F5F5F2' }}>
                    <ChapterIcon icon={ch.icon} accent={ch.color.accent} size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{ch.title}</p>
                    <p className="text-xs text-gray-400">{prog.done}/{prog.total} · {prog.pct}%</p>
                  </div>
                  <div className="w-14 flex-shrink-0"><ProgressBar pct={prog.pct} accent={ch.color.accent} height={3} /></div>
                  {isCurrent && (<svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0"><path d="M2 6L5 9L10 3" stroke={ch.color.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
                </button>
              )
            })}
            {filtered.length === 0 && <p className="text-xs text-gray-300 text-center py-4">Aucun chapitre trouvé</p>}
          </div>
          <div className="border-t border-gray-100 px-2 py-1.5">
            <button onClick={() => { openChapterModal(); setOpen(false) }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 transition-colors">
              + Nouveau chapitre
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
