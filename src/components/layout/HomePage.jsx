import React from 'react'
import { useStore } from '../../store/useStore'
import ChapterCard from '../chapters/ChapterCard'
import { Btn } from '../ui'
import { getLevelFromXP, getNextLevel, XP_LEVELS } from '../../utils/constants'
import { ProgressBar } from '../ui'

export default function HomePage() {
  const { chapters, profile, openChapterModal } = useStore()
  const level = getLevelFromXP(profile.totalXP)
  const next  = getNextLevel(level.level)
  const pct   = next
    ? Math.round(((profile.totalXP - level.xp) / (next.xp - level.xp)) * 100)
    : 100

  const active = chapters.filter(c => !c.archivedAt).sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <polygon points="7,1 9,5 13,5.5 10,8.5 11,13 7,10.5 3,13 4,8.5 1,5.5 5,5" fill="#7F77DD"/>
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">QuestLife</span>
        </div>

        {/* XP profile */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">{level.label}</p>
            <p className="text-xs font-medium text-gray-700">{profile.totalXP.toLocaleString()} XP</p>
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
              🏅 {profile.badges.length} badge{profile.badges.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-base font-medium text-gray-900">Mes chapitres</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {active.length} chapitre{active.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Btn onClick={() => openChapterModal()} variant="primary" size="sm">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Nouveau chapitre
            </Btn>
          </div>

          {/* Grid */}
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <polygon points="16,3 20,12 29,13 22,20 24,29 16,25 8,29 10,20 3,13 12,12" stroke="#7F77DD" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
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
