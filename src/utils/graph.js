import { QUEST_STATUS } from './constants'

// ── Cycle detection (DFS) ─────────────────────────────────────────────────────
export function wouldCreateCycle(quests, fromId, toId) {
  // Returns true if adding edge fromId→toId would create a cycle
  // i.e., if toId can already reach fromId
  const adj = {}
  for (const q of quests) {
    adj[q.id] = [...q.dependencies]
  }
  // Temporarily add the new edge (toId now depends on fromId in its deps)
  // We actually want: fromId depends on toId → check if toId is reachable from fromId
  // Edge semantic: fromId IS A PREREQUISITE of toId → toId.dependencies includes fromId
  // Cycle if toId can already reach fromId through existing deps
  const visited = new Set()
  function dfs(nodeId) {
    if (nodeId === fromId) return true
    if (visited.has(nodeId)) return false
    visited.add(nodeId)
    for (const depId of (adj[nodeId] || [])) {
      if (dfs(depId)) return true
    }
    return false
  }
  return dfs(toId)
}

// ── Recompute statuses ────────────────────────────────────────────────────────
export function recomputeStatuses(quests) {
  const doneSet = new Set(quests.filter(q => q.status === QUEST_STATUS.DONE).map(q => q.id))

  return quests.map(q => {
    if (q.status === QUEST_STATUS.DONE || q.status === QUEST_STATUS.DRAFT) return q

    const allDepsDone = q.dependencies.every(depId => doneSet.has(depId))
    const newStatus = allDepsDone ? QUEST_STATUS.ACTIVE : QUEST_STATUS.LOCKED
    return newStatus === q.status ? q : { ...q, status: newStatus }
  })
}

// ── Get dependents (quests that depend ON questId) ────────────────────────────
export function getDependents(quests, questId) {
  return quests.filter(q => q.dependencies.includes(questId))
}

// ── Chapter completion % ──────────────────────────────────────────────────────
export function getChapterProgress(quests) {
  const total = quests.filter(q => q.status !== QUEST_STATUS.DRAFT).length
  const done  = quests.filter(q => q.status === QUEST_STATUS.DONE).length
  return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}
