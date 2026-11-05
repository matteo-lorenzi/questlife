// Persistance de la To-do list. Clé localStorage dédiée, hors de `questlife_data`.
export const TODO_KEY = 'questlife_todo'

const isTask = t =>
  t !== null && typeof t === 'object'
  && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean'

function toSection(s) {
  if (s === null || typeof s !== 'object') return null
  if (typeof s.id !== 'string' || typeof s.title !== 'string' || !Array.isArray(s.tasks)) return null
  return { id: s.id, title: s.title, tasks: s.tasks.filter(isTask).map(t => ({ id: t.id, text: t.text, done: t.done })) }
}

export function loadTodo(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(TODO_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(toSection).filter(Boolean)
  } catch {
    return []
  }
}

export function saveTodo(sections, storage = globalThis.localStorage) {
  try {
    storage?.setItem(TODO_KEY, JSON.stringify(sections))
  } catch {
    // Stockage indisponible : les données restent en mémoire uniquement.
  }
}
