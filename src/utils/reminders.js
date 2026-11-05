// Règles partagées des rappels (quêtes et créneaux d'agenda).

export function normalizeReminderOffsetsMs(offsets) {
  if (!Array.isArray(offsets)) return [];
  const clean = offsets
    .map((v) => Number.parseInt(v, 10))
    .filter((v) => Number.isFinite(v) && v > 0)
    .map((v) => Math.max(60000, v));
  return [...new Set(clean)].sort((a, b) => b - a).slice(0, 8);
}

export function formatReminderLeadTime(offsetMs) {
  const minutes = Math.round(offsetMs / 60000);
  if (minutes >= 43200) return `${Math.round(minutes / 43200)} mois`;
  if (minutes >= 10080) return `${Math.round(minutes / 10080)} sem`;
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} j`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} h`;
  return `${minutes} min`;
}
