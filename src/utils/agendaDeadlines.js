// Deadlines de quêtes vues comme éléments d'agenda (lecture seule). Jours LOCAUX.
import { QUEST_STATUS } from "./constants";
import { localDayKey } from "./agenda";

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

// Éléments d'un jour (créneaux + deadlines) triés par heure.
export function mergeDayItems(slots, deadlines, dayKey) {
  const slotItems = slots.map((s) => ({ ...s, kind: "slot", at: s.startAt }));
  const dlItems = deadlines.filter((d) => localDayKey(d.at) === dayKey);
  return [...slotItems, ...dlItems].sort((a, b) => a.at - b.at);
}
