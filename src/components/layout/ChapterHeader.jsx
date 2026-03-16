import React from 'react'
import { useStore } from '../../store/useStore'
import { ProgressBar, Btn } from '../ui'
import { getChapterProgress } from '../../utils/graph'
import { QUEST_STATUS } from '../../utils/constants'
import ChapterSwitcher from '../navigation/ChapterSwitcher'

export default function ChapterHeader({ chapter }) {
  const { quests, setActiveChapter, openChapterModal } = useStore()
  const cq = quests.filter(q => q.chapterId === chapter.id && q.status !== QUEST_STATUS.DRAFT)
  const prog = getChapterProgress(cq)
  const done = cq.filter(q => q.status === QUEST_STATUS.DONE).length
  const active = cq.filter(q => q.status === QUEST_STATUS.ACTIVE).length
  const locked = cq.filter(q => q.status === QUEST_STATUS.LOCKED).length
  const xpGained = quests.filter(q => q.chapterId === chapter.id && q.status === QUEST_STATUS.DONE).reduce((s, q) => s + q.xp, 0)

  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setActiveChapter(null)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Retour
          </button>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-200 flex-shrink-0"><path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-xs text-gray-300 flex-shrink-0 hidden sm:block">Chapitres</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-200 flex-shrink-0 hidden sm:block"><path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <ChapterSwitcher chapter={chapter} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-28 hidden md:block"><ProgressBar pct={prog.pct} accent={chapter.color.accent} height={5} /></div>
          <span className="text-xs font-medium hidden md:block" style={{ color: chapter.color.accent }}>{prog.done}/{prog.total}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Btn size="sm" variant="default" onClick={() => openChapterModal(chapter)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/></svg>
            <span className="hidden sm:inline">Modifier</span>
          </Btn>
        </div>
      </div>
      <div className="flex items-center gap-4 px-4 py-1.5 bg-gray-50 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-teal-400" /><span className="text-gray-500">{done} complétée{done !== 1 ? 's' : ''}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-200" /><span className="text-gray-500">{active} en cours</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border border-dashed border-gray-300" /><span className="text-gray-500">{locked} verrouillée{locked !== 1 ? 's' : ''}</span></div>
        <div className="ml-auto flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="5,0.8 6.5,4 9.8,4.3 7.3,6.5 8,9.5 5,8 2,9.5 2.7,6.5 0.2,4.3 3.5,4" fill="#EF9F27"/></svg>
          <span className="text-amber-800 font-medium">{xpGained.toLocaleString()} XP gagnés</span>
        </div>
      </div>
    </div>
  )
}
