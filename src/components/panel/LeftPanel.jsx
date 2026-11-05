import React, { useState } from 'react'
import { loadPanelPrefs, savePanelPrefs } from '../../utils/panelPrefs'

// Panneau gauche à onglets. `tabs` est un registre [{ id, label, component }].
// Les composants d'onglet reçoivent `tabProps`.
export default function LeftPanel({ tabs, tabProps = {} }) {
  const [prefs, setPrefs] = useState(loadPanelPrefs)

  const activeTab = tabs.find(t => t.id === prefs.activeTab) ?? tabs[0]
  const ActiveComponent = activeTab?.component

  function update(patch) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    savePanelPrefs(next)
  }

  if (prefs.collapsed) {
    return (
      <div className="w-9 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-gray-100 dark:border-zinc-800 flex flex-col items-center py-2">
        <button type="button" onClick={() => update({ collapsed: false })}
          title="Déployer le panneau" aria-label="Déployer le panneau"
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    )
  }

  return (
    <div className="w-44 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-gray-100 dark:border-zinc-800 flex flex-col min-h-0">
      <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-100 dark:border-zinc-800">
        <div role="tablist" className="flex-1 flex gap-1 min-w-0">
          {tabs.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === activeTab?.id}
              onClick={() => update({ activeTab: t.id })}
              className={`px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wide truncate ${
                t.id === activeTab?.id ? 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => update({ collapsed: true })}
          title="Réduire le panneau" aria-label="Réduire le panneau"
          className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {ActiveComponent && <ActiveComponent {...tabProps} />}
      </div>
    </div>
  )
}
