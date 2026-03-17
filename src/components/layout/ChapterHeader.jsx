import React, { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { ProgressBar, Btn, Modal } from '../ui'
import { getChapterProgress } from '../../utils/graph'
import { QUEST_STATUS, CANVAS_BACKGROUNDS } from '../../utils/constants'
import ChapterSwitcher from '../navigation/ChapterSwitcher'

export default function ChapterHeader({ chapter }) {
  const { quests, setActiveChapter, openChapterModal, updateChapter } = useStore()
  const [showFight, setShowFight] = useState(false)
  const [showDiploma, setShowDiploma] = useState(false)
  const [showBackgroundBank, setShowBackgroundBank] = useState(false)
  const [enemyHp, setEnemyHp] = useState(100)
  const [lastHit, setLastHit] = useState(0)
  const cq = quests.filter(q => q.chapterId === chapter.id && q.status !== QUEST_STATUS.DRAFT)
  const prog = getChapterProgress(cq)
  const done = cq.filter(q => q.status === QUEST_STATUS.DONE).length
  const active = cq.filter(q => q.status === QUEST_STATUS.ACTIVE).length
  const locked = cq.filter(q => q.status === QUEST_STATUS.LOCKED).length
  const xpGained = quests.filter(q => q.chapterId === chapter.id && q.status === QUEST_STATUS.DONE).reduce((s, q) => s + q.xp, 0)
  const chapterCompleted = cq.length > 0 && done === cq.length
  const hasBossDone = cq.some(q => q.type === 'boss' && q.status === QUEST_STATUS.DONE)
  const finaleReady = chapterCompleted && hasBossDone
  const selectedBackgroundId = chapter.canvasBackground || CANVAS_BACKGROUNDS[0].id
  const selectedBackground = CANVAS_BACKGROUNDS.find((bg) => bg.id === selectedBackgroundId) || CANVAS_BACKGROUNDS[0]

  const diplomaDate = useMemo(() => new Date().toLocaleDateString('fr-FR'), [])

  function launchFight() {
    setEnemyHp(100)
    setLastHit(0)
    setShowFight(true)
  }

  function attackBoss() {
    if (enemyHp <= 0) return
    const hit = 16 + Math.floor(Math.random() * 17)
    setLastHit(hit)
    setEnemyHp(prev => Math.max(0, prev - hit))
  }

  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setActiveChapter(null)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Retour
          </button>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-200 flex-shrink-0"><path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-xs text-gray-300 flex-shrink-0 hidden sm:block">Chapitres</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-gray-200 flex-shrink-0 hidden sm:block"><path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <ChapterSwitcher chapter={chapter} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-28 hidden md:block"><ProgressBar pct={prog.pct} accent={chapter.color.accent} height={5} /></div>
          <span className="text-xs font-medium hidden md:block" style={{ color: chapter.color.accent }}>{prog.done}/{prog.total}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Btn size="sm" variant="default" onClick={() => setShowBackgroundBank(true)}>
            Fond: {selectedBackground.label}
          </Btn>
          {finaleReady && (
            <>
              <Btn size="sm" variant="success" onClick={launchFight}>
                Combat epique
              </Btn>
              <Btn size="sm" variant="default" onClick={() => setShowDiploma(true)}>
                Diplome
              </Btn>
            </>
          )}
          <Btn size="sm" variant="default" onClick={() => openChapterModal(chapter)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" /></svg>
            <span className="hidden sm:inline">Modifier</span>
          </Btn>
        </div>
      </div>
      <div className="flex items-center gap-4 px-4 py-1.5 bg-gray-50 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-teal-400" /><span className="text-gray-500">{done} complétée{done !== 1 ? 's' : ''}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-200" /><span className="text-gray-500">{active} en cours</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border border-dashed border-gray-300" /><span className="text-gray-500">{locked} verrouillée{locked !== 1 ? 's' : ''}</span></div>
        <div className="ml-auto flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polygon points="5,0.8 6.5,4 9.8,4.3 7.3,6.5 8,9.5 5,8 2,9.5 2.7,6.5 0.2,4.3 3.5,4" fill="#EF9F27" /></svg>
          <span className="text-amber-800 font-medium">{xpGained.toLocaleString()} XP ({xpGained.toLocaleString()} EUR virtuels)</span>
        </div>
      </div>

      <Modal open={showFight} onClose={() => setShowFight(false)} title="Combat epique du chapitre" width="max-w-md">
        <div className="px-5 py-4">
          <div className={`rounded-xl border px-4 py-3 mb-3 ${enemyHp > 0 ? 'animate-epicShake' : ''}`}
            style={{ borderColor: '#F4B253', background: '#FFF8EA' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-amber-900">Boss final: Gardien de {chapter.title}</span>
              <span className="text-xs text-amber-700">PV {enemyHp}/100</span>
            </div>
            <ProgressBar pct={enemyHp} accent="#D85A30" height={7} />
            {lastHit > 0 && enemyHp > 0 && (
              <p className="text-xs text-red-700 mt-2 animate-epicSlash">-{lastHit} degats</p>
            )}
            {enemyHp === 0 && (
              <p className="text-sm font-medium text-teal-700 mt-2 animate-fadeIn">Victoire legendaire. Chapitre valide.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Btn variant="default" onClick={() => setShowFight(false)}>Fermer</Btn>
            <Btn variant="success" onClick={attackBoss} disabled={enemyHp === 0}>Attaquer</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={showDiploma} onClose={() => setShowDiploma(false)} title="Diplome de chapitre" width="max-w-lg">
        <div className="px-5 py-5">
          <div className="rounded-xl border-2 p-5 animate-diplomaReveal"
            style={{ borderColor: chapter.color.accent, background: chapter.color.bg }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: chapter.color.accent }}>QuestLife Academy</p>
            <h3 className="text-lg font-semibold mt-2 text-gray-900">Certificat de reussite</h3>
            <p className="text-sm text-gray-700 mt-3">Ce diplome atteste que ce chapitre est complete a 100%.</p>
            <p className="text-base font-semibold mt-3" style={{ color: chapter.color.accent }}>{chapter.title}</p>
            <p className="text-xs text-gray-600 mt-2">XP gagnes: {xpGained.toLocaleString()} XP ({xpGained.toLocaleString()} EUR virtuels)</p>
            <p className="text-xs text-gray-500 mt-3">Date: {diplomaDate}</p>
          </div>
          <div className="flex justify-end mt-4">
            <Btn variant="default" onClick={() => setShowDiploma(false)}>Fermer</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={showBackgroundBank} onClose={() => setShowBackgroundBank(false)} title="Banque de fonds du canvas" width="max-w-2xl">
        <div className="px-5 py-4">
          <p className="text-xs text-gray-500 mb-3">Choisis un fond discret pour ce chapitre.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CANVAS_BACKGROUNDS.map((bg) => {
              const isSelected = bg.id === selectedBackgroundId
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => {
                    updateChapter(chapter.id, { canvasBackground: bg.id })
                    setShowBackgroundBank(false)
                  }}
                  className={`rounded-lg border p-2 text-left transition-all duration-150 ${isSelected ? 'ring-2 ring-offset-1 ring-teal-400' : ''}`}
                  style={{ borderColor: isSelected ? '#1D9E75' : '#E5E5E0' }}
                >
                  <div
                    className="h-16 rounded-md border"
                    style={{
                      backgroundColor: bg.canvas.backgroundColor,
                      backgroundImage: bg.canvas.backgroundImage,
                      backgroundSize: bg.canvas.backgroundSize,
                      borderColor: '#E5E5E0',
                    }}
                  />
                  <p className="text-xs font-medium text-gray-700 mt-2">{bg.label}</p>
                </button>
              )
            })}
          </div>
          <div className="flex justify-end mt-4">
            <Btn variant="default" onClick={() => setShowBackgroundBank(false)}>Fermer</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
