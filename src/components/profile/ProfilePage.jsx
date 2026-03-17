import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { Modal, Btn, ProgressBar } from '../ui'
import { getLevelFromXP, getNextLevel, BADGE_DEFS, QUEST_STATUS } from '../../utils/constants'
import WeeklyObjectives from './WeeklyObjectives'
import ActivityChart from './ActivityChart'

function getInitials(pseudo) {
    return (pseudo || 'A').slice(0, 2).toUpperCase()
}

export default function ProfilePage() {
    const {
        showProfile,
        closeProfile,
        profile,
        quests,
        chapters,
        updatePseudo,
        getWeeklyObjectives,
    } = useStore()

    const [pseudoDraft, setPseudoDraft] = useState(profile.pseudo || 'Aventurier')
    const [objectives, setObjectives] = useState(profile.weeklyObjectives?.objectives || [])

    useEffect(() => {
        setPseudoDraft(profile.pseudo || 'Aventurier')
    }, [profile.pseudo])

    useEffect(() => {
        if (!showProfile) return
        setObjectives(getWeeklyObjectives())
    }, [showProfile, getWeeklyObjectives])

    const level = getLevelFromXP(profile.totalXP)
    const nextLevel = getNextLevel(level.level)
    const levelPct = nextLevel
        ? Math.max(0, Math.min(100, Math.round(((profile.totalXP - level.xp) / (nextLevel.xp - level.xp)) * 100)))
        : 100

    const doneQuests = quests.filter((q) => q.status === QUEST_STATUS.DONE).length
    const realQuests = quests.filter((q) => q.status !== QUEST_STATUS.DRAFT).length

    const chapterProgress = useMemo(() => {
        return chapters.map((ch) => {
            const chapterQuests = quests.filter((q) => q.chapterId === ch.id && q.status !== QUEST_STATUS.DRAFT)
            const done = chapterQuests.filter((q) => q.status === QUEST_STATUS.DONE).length
            const total = chapterQuests.length
            return {
                id: ch.id,
                title: ch.title,
                accent: ch.color?.accent || '#1D9E75',
                done,
                total,
                pct: total > 0 ? Math.round((done / total) * 100) : 0,
            }
        })
    }, [chapters, quests])

    return (
        <Modal open={showProfile} onClose={closeProfile} title="Mon compte" width="max-w-5xl">
            <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4 bg-gray-50">
                <div className="rounded-xl border border-gray-100 bg-white p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-semibold">
                            {getInitials(profile.pseudo)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-gray-400">Pseudonyme</p>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    value={pseudoDraft}
                                    onChange={(e) => setPseudoDraft(e.target.value)}
                                    className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:border-teal-400"
                                />
                                <Btn size="sm" variant="default" onClick={() => updatePseudo(pseudoDraft)}>Enregistrer</Btn>
                            </div>
                        </div>
                    </div>
                    <div className="w-64 max-w-full">
                        <p className="text-xs text-gray-400 mb-1">Niveau {level.level} - {level.label}</p>
                        <ProgressBar pct={levelPct} accent="#1D9E75" height={6} />
                        <p className="text-[11px] text-gray-500 mt-1">{profile.totalXP.toLocaleString()} XP</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                        <p className="text-xs text-gray-400">Quetes realisees</p>
                        <p className="text-lg font-semibold text-gray-900">{doneQuests}/{realQuests}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                        <p className="text-xs text-gray-400">XP total cumule</p>
                        <p className="text-lg font-semibold text-teal-700">{profile.totalXP.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                        <p className="text-xs text-gray-400">Badges debloques</p>
                        <p className="text-lg font-semibold text-amber-700">{profile.badges.length}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <ActivityChart activityLog={profile.activityLog} streak={profile.streak} />
                    <WeeklyObjectives objectives={objectives} />
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Progression chapitres</h3>
                    <div className="space-y-2">
                        {chapterProgress.map((ch) => (
                            <div key={ch.id}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-gray-700">{ch.title}</span>
                                    <span className="text-gray-500">{ch.done}/{ch.total}</span>
                                </div>
                                <ProgressBar pct={ch.pct} accent={ch.accent} height={5} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Badges</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {BADGE_DEFS.map((def) => {
                            const unlocked = profile.badges.find((b) => b.id === def.id)
                            return (
                                <div
                                    key={def.id}
                                    className="rounded-lg border px-2 py-2"
                                    style={{
                                        borderColor: unlocked ? '#F4D38A' : '#E5E5E0',
                                        background: unlocked ? '#FFF8EA' : '#F8F8F6',
                                        opacity: unlocked ? 1 : 0.55,
                                    }}
                                >
                                    <p className="text-xs font-medium text-gray-700">{def.label}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">{def.desc}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    )
}
