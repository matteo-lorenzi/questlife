import { create } from 'zustand'
import {
  addSection,
  renameSection,
  removeSection,
  addTask,
  toggleTask,
  removeTask,
} from '../utils/todo'
import { loadTodo, saveTodo } from '../utils/todoStorage'

// Store dédié à la To-do list : autonome, persisté à part des données de jeu.
// Chaque action renvoie true si elle a changé quelque chose, false si refusée.

const newId = () => globalThis.crypto.randomUUID()

export const useTodo = create((set, get) => {
  // `op` reçoit les sections courantes et renvoie les nouvelles (même référence = refus).
  function apply(op) {
    const prev = get().sections
    const next = op(prev)
    if (next === prev) return false
    set({ sections: next })
    saveTodo(next)
    return true
  }

  return {
    sections: loadTodo(),
    addSection: title => apply(s => addSection(s, newId(), title)),
    renameSection: (id, title) => apply(s => renameSection(s, id, title)),
    removeSection: id => apply(s => removeSection(s, id)),
    addTask: (sectionId, text) => apply(s => addTask(s, sectionId, newId(), text)),
    toggleTask: (sectionId, taskId) => apply(s => toggleTask(s, sectionId, taskId)),
    removeTask: (sectionId, taskId) => apply(s => removeTask(s, sectionId, taskId)),
  }
})
