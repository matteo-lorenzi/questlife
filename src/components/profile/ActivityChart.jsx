import React from 'react'

function getLast7Days() {
    const days = []
    const now = new Date()
    for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        days.push(d.toISOString().slice(0, 10))
    }
    return days
}

export default function ActivityChart({ activityLog = [], streak }) {
    const byDate = new Map(activityLog.map((item) => [item.date, item.count]))
    const days = getLast7Days()
    const points = days.map((date) => ({
        date,
        count: byDate.get(date) || 0,
    }))
    const max = Math.max(1, ...points.map((p) => p.count))

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Activite 7 jours</h3>
                <div className="text-xs text-gray-500">
                    Serie: <span className="font-semibold text-teal-700">{streak?.current || 0} jours</span>
                    <span className="mx-1 text-gray-300">|</span>
                    Record: <span className="font-semibold text-gray-700">{streak?.longest || 0}</span>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2 items-end h-24">
                {points.map((p) => {
                    const h = Math.max(8, Math.round((p.count / max) * 72))
                    return (
                        <div key={p.date} className="flex flex-col items-center justify-end gap-1">
                            <div
                                className="w-full rounded-md bg-teal-200/70 border border-teal-300/60"
                                style={{ height: h }}
                                title={`${p.date}: ${p.count}`}
                            />
                            <span className="text-[10px] text-gray-400">{p.date.slice(8)}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
