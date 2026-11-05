import React from 'react'

// Teinte d'une deadline : validée (grisée), expirée (rouge) ou à venir (ambre).
export function deadlineTone(item) {
  if (item.done) return 'border-gray-300 dark:border-zinc-600 text-gray-400 line-through'
  if (item.expired) return 'border-red-400 dark:border-red-500/60 text-red-600 dark:text-red-400'
  return 'border-amber-400 dark:border-amber-500/60 text-amber-700 dark:text-amber-300'
}

// Titre d'une deadline avec sa mention d'état (« · validée » / « · expirée »).
export function deadlineLabel(item) {
  return `${item.title || 'Quête sans titre'}${item.done ? ' · validée' : item.expired ? ' · expirée' : ''}`
}

// Repère de deadline cliquable (lecture seule), partagé par la grille et les bandes hors plage.
// `time` (facultatif) préfixe le libellé : utile dans les bandes, où la position n'indique pas l'heure.
export default function AgendaDeadlineButton({ item, onOpen, testid, className = '', style, time }) {
  const label = deadlineLabel(item)
  return (
    <button type="button" data-testid={testid} data-grid-item title={label}
      onClick={() => onOpen(item.questId)}
      className={`flex items-center gap-1 px-1.5 text-left text-[11px] truncate border-t-2 border-dashed bg-white/80 dark:bg-zinc-900/80 ${deadlineTone(item)} ${className}`}
      style={style}>
      <span>⚑</span>
      <span className="truncate">{time ? `${time} ` : ''}{label}</span>
    </button>
  )
}
