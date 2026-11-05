// Logique pure de l'agenda. Tous les jours sont des jours LOCAUX (jamais UTC).
import { nanoid } from "nanoid";

const pad = (n) => String(n).padStart(2, "0");

// Clé de jour locale "YYYY-MM-DD".
export function localDayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Horodatage local depuis un jour "YYYY-MM-DD" et une heure "HH:MM". NaN si invalide.
export function localTimestamp(dayKey, time) {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey ?? "");
  const hm = /^(\d{1,2}):(\d{2})$/.exec(time ?? "");
  if (!day || !hm) return NaN;
  const [y, m, d] = [Number(day[1]), Number(day[2]), Number(day[3])];
  const [h, min] = [Number(hm[1]), Number(hm[2])];
  if (h > 23 || min > 59) return NaN;
  const date = new Date(y, m - 1, d, h, min);
  // Rejette les dates qui débordent (ex. 31 février).
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return NaN;
  return date.getTime();
}

// Retourne un message d'erreur clair, ou null si le créneau est valide.
export function validateSlotInput({ title, startAt, endAt }) {
  if (typeof title !== "string" || !title.trim()) return "Le titre est obligatoire.";
  if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) return "Les horaires du créneau sont invalides.";
  if (endAt <= startAt) return "La fin doit être strictement après le début.";
  if (localDayKey(startAt) !== localDayKey(endAt)) return "Un créneau doit tenir dans une seule journée.";
  return null;
}

// Normalisation tolérante au chargement : ignore les créneaux invalides.
export function normalizeAgenda(raw) {
  const rawSlots = Array.isArray(raw?.slots) ? raw.slots : [];
  const seen = new Set();
  const slots = [];
  for (const s of rawSlots) {
    if (!s || typeof s !== "object") continue;
    const title = typeof s.title === "string" ? s.title.trim() : "";
    if (validateSlotInput({ title, startAt: s.startAt, endAt: s.endAt })) continue;
    let id = typeof s.id === "string" && s.id ? s.id : nanoid();
    if (seen.has(id)) id = nanoid();
    seen.add(id);
    slots.push({
      id,
      title,
      startAt: s.startAt,
      endAt: s.endAt,
      chapterId: typeof s.chapterId === "string" ? s.chapterId : null,
      done: s.done === true,
      reminderOffsetsMs: Array.isArray(s.reminderOffsetsMs) ? s.reminderOffsetsMs.filter(Number.isFinite) : [],
      sentReminderOffsetsMs: Array.isArray(s.sentReminderOffsetsMs) ? s.sentReminderOffsetsMs.filter(Number.isFinite) : [],
      createdAt: Number.isFinite(s.createdAt) ? s.createdAt : s.startAt,
    });
  }
  return { slots };
}

// Même heure locale, `days` jours plus tard (résiste aux changements d'heure :
// on décale le calendrier local, pas un nombre fixe de millisecondes).
export function shiftLocalDays(ts, days) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()).getTime();
}

export function sortSlots(slots) {
  return [...slots].sort((a, b) => a.startAt - b.startAt || a.endAt - b.endAt);
}
