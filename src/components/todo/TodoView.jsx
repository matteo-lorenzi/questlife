import React, { useState } from 'react'
import { useTodo } from '../../store/useTodo'
import { Btn } from '../ui'
import TodoSection from './TodoSection'
import { MAX_TEXT_LENGTH } from '../../utils/todo'

// Vue « To-do » de la zone principale : rubriques créées par l'utilisateur et leurs tâches.
export default function TodoView() {
  const sections = useTodo(s => s.sections)
  const addSection = useTodo(s => s.addSection)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  function submit(e) {
    e.preventDefault()
    if (addSection(name)) {
      setName('')
      setCreating(false)
    }
  }

  const newSectionForm = creating && (
    <form onSubmit={submit} className="mb-4">
      <input autoFocus value={name} maxLength={MAX_TEXT_LENGTH}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') { setCreating(false); setName('') } }}
        placeholder="Nom de la rubrique (Entrée)" aria-label="Nom de la nouvelle rubrique"
        className="w-full text-sm px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-purple-400" />
    </form>
  )

  const newSectionButton = (
    <Btn onClick={() => setCreating(true)} variant="primary" size="sm">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Nouvelle rubrique
    </Btn>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-medium text-gray-900 dark:text-gray-100">To-do</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {sections.length} rubrique{sections.length !== 1 ? 's' : ''}
          </p>
        </div>
        {newSectionButton}
      </div>

      {newSectionForm}

      {sections.length === 0 ? (
        !creating && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5 max-w-xs">
              Aucune rubrique. Crée la première pour ranger tes tâches.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {sections.map(s => <TodoSection key={s.id} section={s} />)}
        </div>
      )}
    </div>
  )
}
