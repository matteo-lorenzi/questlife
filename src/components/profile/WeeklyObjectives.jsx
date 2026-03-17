import React from 'react'

export default function WeeklyObjectives({ objectives = [] }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Objectifs hebdomadaires</h3>
            <div className="space-y-2.5">
                {objectives.length === 0 && (
                    <p className="text-xs text-gray-400">Aucun objectif cette semaine.</p>
                )}
                {objectives.map((obj) => {
                    const pct = obj.target > 0 ? Math.min(100, Math.round((obj.progress / obj.target) * 100)) : 0
                    return (
                        <div key={obj.id} className="rounded-lg border border-gray-100 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                                <p className={`text-xs ${obj.done ? 'text-teal-700 font-medium' : 'text-gray-700'}`}>{obj.label}</p>
                                <span className="text-[10px] text-amber-700 font-medium">+{obj.bonusXP} XP</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                <div className={`h-full ${obj.done ? 'bg-teal-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="mt-1 text-[10px] text-gray-400">{obj.progress}/{obj.target}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
