import React from 'react'

const TIME_FMT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

// Deadline de quête dans la liste du jour : lecture seule, un clic ouvre le chapitre.
export default function DeadlineRow({ item, onOpen }) {
  const tone = item.done
    ? 'border-gray-100 dark:border-zinc-800 text-gray-400 line-through'
    : item.expired
      ? 'border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400'
      : 'border-amber-300 dark:border-amber-500/50 text-amber-700 dark:text-amber-300'
  return (
    <li>
      <button type="button" onClick={() => onOpen(item.questId)}
        className={`w-full text-left px-2 py-1.5 rounded-lg border border-dashed ${tone}`}>
        <p className="text-xs font-medium truncate">⚑ {item.title || 'Quête sans titre'}</p>
        <p className="text-xs opacity-80">
          Deadline {TIME_FMT.format(item.at)}
          {item.done ? ' · validée' : item.expired ? ' · expirée' : ''}
        </p>
      </button>
    </li>
  )
}
