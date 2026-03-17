import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { ProgressBar } from '../ui'
import ChapterIcon from '../../assets/icons/ChapterIcon'
import { getChapterProgress } from '../../utils/graph'
import { ConfirmModal } from '../ui'
import { getChapterBg } from '../../utils/constants'

export default function ChapterCard({ chapter }) {
  const { quests, setActiveChapter, deleteChapter, openChapterModal, theme } = useStore()
  const [menu, setMenu] = useState(false)
  const [confirmDel, setConfirm] = useState(false)

  const cq = quests.filter(q => q.chapterId === chapter.id)
  const progress = getChapterProgress(cq)
  const accent = chapter.color.accent
  const bg = getChapterBg(chapter.color, theme)

  return (
    <>
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-xl border transition-all duration-200 cursor-pointer group"
        style={{ borderColor: '#E5E5E0', borderWidth: '1px' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = accent}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E5E0'}
        onClick={() => setActiveChapter(chapter.id)}
      >
        {/* Inner wrapper clips only the decorative corner, not the dropdown */}
        <div className="relative overflow-hidden rounded-xl">
          {/* Decorative corner */}
          <div className="absolute top-0 right-0 w-14 h-14 rounded-bl-[60px] opacity-40 pointer-events-none"
            style={{ background: bg }} />

          <div className="p-4">
            <div className="flex items-start justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: bg }}>
                  <ChapterIcon icon={chapter.icon} accent={accent} size={16} />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">{chapter.title}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: bg, color: accent }}>
                  {progress.done}/{progress.total}
                </span>
                {/* Context menu */}
                <button
                  className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                  onClick={e => { e.stopPropagation(); setMenu(m => !m) }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="3" r="1" fill="currentColor" />
                    <circle cx="7" cy="7" r="1" fill="currentColor" />
                    <circle cx="7" cy="11" r="1" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>

            {chapter.description && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 leading-relaxed line-clamp-2">{chapter.description}</p>
            )}

            <ProgressBar pct={progress.pct} accent={accent} height={4} className="mb-2" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: accent }}>
                {progress.pct === 0 ? 'Pas encore commencé' : `${progress.pct}% complété`}
              </span>
              <span className="text-xs text-gray-300">
                {cq.filter(q => q.status !== 'done' && q.status !== 'draft').reduce((s, q) => s + q.xp, 0)} XP restants
              </span>
            </div>
          </div>
        </div>

        {/* Context dropdown — outside overflow-hidden so it can extend beyond card bounds */}
        {menu && (
          <div
            className="absolute top-10 right-2 z-20 bg-white border border-gray-100 rounded-lg py-1 shadow-lg animate-fadeIn min-w-[160px]"
            onClick={e => e.stopPropagation()}
          >
            {[
              { label: 'Ouvrir', action: () => { setActiveChapter(chapter.id); setMenu(false) } },
              { label: 'Modifier', action: () => { openChapterModal(chapter); setMenu(false) } },
              { label: 'Supprimer', action: () => { setConfirm(true); setMenu(false) }, danger: true },
            ].map(item => (
              <button key={item.label}
                className={`w-full text-left text-xs px-3 py-2 hover:bg-gray-50 transition-colors ${item.danger ? 'text-red-500' : 'text-gray-700'}`}
                onClick={item.action}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {menu && <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />}

      <ConfirmModal open={confirmDel} onClose={() => setConfirm(false)}
        onConfirm={() => { deleteChapter(chapter.id); setConfirm(false) }}
        title="Supprimer ce chapitre ?"
        confirmLabel="Supprimer" confirmVariant="danger">
        <p>
          Le chapitre <strong>"{chapter.title}"</strong> et ses{' '}
          <strong>{cq.length} quêtes</strong> seront supprimés définitivement.
        </p>
        <p className="mt-2 text-gray-400 text-xs">Les XP déjà gagnés dans ce chapitre sont conservés dans votre profil.</p>
      </ConfirmModal>
    </>
  )
}
