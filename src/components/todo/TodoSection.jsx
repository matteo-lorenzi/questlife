import React, { useState } from 'react'
import { useTodo } from '../../store/useTodo'
import { ConfirmModal } from '../ui'
import { MAX_TEXT_LENGTH } from '../../utils/todo'

const inputClass =
  'w-full text-sm px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-purple-400'

// Une rubrique : titre renommable, champ d'ajout, tâches dans l'ordre d'ajout.
export default function TodoSection({ section }) {
  const { renameSection, removeSection, addTask, toggleTask, removeTask } = useTodo()
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(section.title)
  const [confirmDel, setConfirmDel] = useState(false)

  function submitTask(e) {
    e.preventDefault()
    if (addTask(section.id, draft)) setDraft('')
  }

  function startRename() {
    setTitleDraft(section.title)
    setEditing(true)
  }

  // Titre vide refusé : on garde l'ancien titre.
  function finishRename() {
    renameSection(section.id, titleDraft)
    setEditing(false)
  }

  function askDelete() {
    if (section.tasks.length > 0) setConfirmDel(true)
    else removeSection(section.id)
  }

  return (
    <section className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {editing ? (
          <input autoFocus value={titleDraft} maxLength={MAX_TEXT_LENGTH}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={finishRename}
            onKeyDown={e => {
              if (e.key === 'Enter') finishRename()
              if (e.key === 'Escape') setEditing(false)
            }}
            aria-label="Nom de la rubrique" className={inputClass} />
        ) : (
          <button type="button" onClick={startRename} title="Renommer la rubrique"
            className="flex-1 min-w-0 text-left text-sm font-medium text-gray-900 dark:text-gray-100 truncate hover:text-purple-600">
            {section.title}
          </button>
        )}
        <button type="button" onClick={askDelete}
          aria-label="Supprimer la rubrique" title="Supprimer la rubrique"
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        </button>
      </div>

      <form onSubmit={submitTask} className="mb-3">
        <input value={draft} maxLength={MAX_TEXT_LENGTH} onChange={e => setDraft(e.target.value)}
          placeholder="Ajouter une tâche (Entrée)" aria-label={`Ajouter une tâche à ${section.title}`}
          className={inputClass} />
      </form>

      {section.tasks.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Aucune tâche</p>
      ) : (
        <ul className="space-y-1">
          {section.tasks.map(task => (
            <li key={task.id} className="group flex items-center gap-2">
              <input type="checkbox" checked={task.done}
                onChange={() => toggleTask(section.id, task.id)}
                aria-label={task.done ? 'Marquer comme pas commencée' : 'Marquer comme terminée'}
                className="flex-shrink-0 accent-purple-500" />
              <span className={`flex-1 min-w-0 text-sm break-words ${
                task.done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'
              }`}>
                {task.text}
              </span>
              <button type="button" onClick={() => removeTask(section.id, task.id)}
                aria-label="Supprimer la tâche" title="Supprimer la tâche"
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal open={confirmDel} onClose={() => setConfirmDel(false)}
        onConfirm={() => { removeSection(section.id); setConfirmDel(false) }}
        title="Supprimer cette rubrique ?"
        confirmLabel="Supprimer" confirmVariant="danger">
        <p>
          La rubrique <strong>"{section.title}"</strong> et ses{' '}
          <strong>{section.tasks.length} tâche{section.tasks.length > 1 ? 's' : ''}</strong> seront supprimées définitivement.
        </p>
      </ConfirmModal>
    </section>
  )
}
