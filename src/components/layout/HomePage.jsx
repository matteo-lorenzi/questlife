import React from 'react'
import { useStore } from '../../store/useStore'
import ChapterCard from '../chapters/ChapterCard'
import { Btn, ProgressBar } from '../ui'
import { getLevelFromXP, getNextLevel } from '../../utils/constants'

export default function HomePage() {
  const { chapters, profile, openChapterModal, openProfile, toggleTheme, theme } = useStore()
  const level = getLevelFromXP(profile.totalXP)
  const next = getNextLevel(level.level)
  const pct = next
    ? Math.round(((profile.totalXP - level.xp) / (next.xp - level.xp)) * 100)
    : 100

  const active = chapters.filter(c => !c.archivedAt).sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <polygon points="7,1 9,5 13,5.5 10,8.5 11,13 7,10.5 3,13 4,8.5 1,5.5 5,5" fill="#7F77DD" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">QuestLife</span>
        </div>

        {/* XP profile */}
        <div className="flex items-center gap-3">
          <Btn size="sm" variant="default" onClick={openProfile}>
            Mon compte
          </Btn>
          <Btn size="sm" variant="default" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="2.3" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 0.9V2M6 10V11.1M0.9 6H2M10 6H11.1M1.8 1.8L2.6 2.6M9.4 9.4L10.2 10.2M10.2 1.8L9.4 2.6M2.6 9.4L1.8 10.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M10.4 7.2A4.6 4.6 0 1 1 4.8 1.6a4.1 4.1 0 0 0 5.6 5.6Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
              </svg>
            )}
            {theme === 'dark' ? 'Clair' : 'Sombre'}
          </Btn>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400 dark:text-gray-500">{level.label}</p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{profile.totalXP.toLocaleString()} XP</p>
            <p className="text-xs text-teal-700">{profile.totalXP.toLocaleString()} EUR virtuels</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 hidden sm:block">
              <ProgressBar pct={pct} accent="#7F77DD" height={3} />
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-50 border-2 border-purple-400 flex items-center justify-center text-xs font-medium text-purple-800">
              {level.level}
            </div>
          </div>
          {profile.badges.length > 0 && (
            <div className="text-xs text-gray-400 hidden sm:block">
              <span className="inline-flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="5,0.8 6.5,4 9.8,4.3 7.3,6.5 8,9.5 5,8 2,9.5 2.7,6.5 0.2,4.3 3.5,4" fill="#EF9F27" /></svg>
                {profile.badges.length} badge{profile.badges.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-zinc-950">
        <div className="max-w-3xl mx-auto">
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-base font-medium text-gray-900 dark:text-gray-100">Mes chapitres</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {active.length} chapitre{active.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Btn onClick={() => openChapterModal()} variant="primary" size="sm">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Nouveau chapitre
            </Btn>
          </div>

          {/* Grid */}
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <polygon points="16,3 20,12 29,13 22,20 24,29 16,25 8,29 10,20 3,13 12,12" stroke="#7F77DD" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-sm font-medium text-gray-700 mb-1">Aucun chapitre pour l'instant</h2>
              <p className="text-xs text-gray-400 mb-5 max-w-xs">
                Créez votre premier chapitre pour commencer à organiser vos objectifs en quêtes.
              </p>
              <Btn onClick={() => openChapterModal()} variant="primary">
                Créer mon premier chapitre
              </Btn>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {active.map(ch => <ChapterCard key={ch.id} chapter={ch} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
