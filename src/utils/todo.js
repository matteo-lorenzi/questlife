// Modèle pur de la To-do list : rubriques et tâches, opérations immuables.
// Aucune horloge, aucun id généré ici : les ids sont passés par l'appelant.
// Une opération refusée ou sans cible renvoie la MÊME référence `sections`.
//
// Section = { id, title, tasks: Task[] } ; Task = { id, text, done }

export const MAX_TEXT_LENGTH = 200

// Texte saisi (titre de rubrique ou tâche) : trimé, tronqué à 200, ou null si vide.
export function normalizeTodoText(raw) {
  if (typeof raw !== 'string') return null
  const text = raw.trim().slice(0, MAX_TEXT_LENGTH).trim()
  return text === '' ? null : text
}

function hasSection(sections, id) {
  return sections.some(s => s.id === id)
}

function updateSection(sections, id, fn) {
  if (!hasSection(sections, id)) return sections
  return sections.map(s => (s.id === id ? fn(s) : s))
}

export function addSection(sections, id, title) {
  const clean = normalizeTodoText(title)
  if (clean === null) return sections
  return [...sections, { id, title: clean, tasks: [] }]
}

export function renameSection(sections, id, title) {
  const clean = normalizeTodoText(title)
  if (clean === null) return sections
  return updateSection(sections, id, s => ({ ...s, title: clean }))
}

export function removeSection(sections, id) {
  if (!hasSection(sections, id)) return sections
  return sections.filter(s => s.id !== id)
}

export function addTask(sections, sectionId, taskId, text) {
  const clean = normalizeTodoText(text)
  if (clean === null) return sections
  return updateSection(sections, sectionId, s => ({
    ...s,
    tasks: [...s.tasks, { id: taskId, text: clean, done: false }],
  }))
}

function hasTask(sections, sectionId, taskId) {
  return sections.some(s => s.id === sectionId && s.tasks.some(t => t.id === taskId))
}

export function toggleTask(sections, sectionId, taskId) {
  if (!hasTask(sections, sectionId, taskId)) return sections
  return updateSection(sections, sectionId, s => ({
    ...s,
    tasks: s.tasks.map(t => (t.id === taskId ? { ...t, done: !t.done } : t)),
  }))
}

export function removeTask(sections, sectionId, taskId) {
  if (!hasTask(sections, sectionId, taskId)) return sections
  return updateSection(sections, sectionId, s => ({
    ...s,
    tasks: s.tasks.filter(t => t.id !== taskId),
  }))
}
