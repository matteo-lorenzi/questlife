// Deadlines de quêtes vues comme éléments d'agenda (lecture seule). Jours LOCAUX.
import { QUEST_STATUS } from "./constants";
import { localDayKey, minutesSinceGridStart, GRID_START_HOUR, GRID_END_HOUR } from "./agenda";

// Une deadline par quête ayant une échéance. `done` : quête validée (jamais urgente).
// `expired` : échéance dépassée (ou quête expirée) et quête non validée.
export function questDeadlineItems(quests, now = Date.now()) {
  return quests
    .filter((q) => Number.isFinite(q.deadlineAt))
    .map((q) => {
      const done = q.status === QUEST_STATUS.DONE;
      return {
        kind: "deadline",
        id: `deadline-${q.id}`,
        questId: q.id,
        chapterId: q.chapterId,
        title: q.title,
        at: q.deadlineAt,
        done,
        expired: !done && (q.status === QUEST_STATUS.EXPIRED || q.deadlineAt <= now),
      };
    });
}

// Deadlines d'un jour local comme repères d'une ligne de la grille (startMin === endMin).
// Celles hors de la plage vont dans `before` (< 06:00) / `after` (≥ 23:00), comme les créneaux.
export function buildGridDeadlines(deadlines, dayKey) {
  const max = (GRID_END_HOUR - GRID_START_HOUR) * 60;
  const result = { items: [], before: [], after: [] };
  for (const d of deadlines.filter((x) => localDayKey(x.at) === dayKey)) {
    const startMin = minutesSinceGridStart(d.at);
    const item = { ...d, startMin, endMin: startMin };
    if (startMin < 0) result.before.push(item);
    else if (startMin >= max) result.after.push(item);
    else result.items.push(item);
  }
  return result;
}
