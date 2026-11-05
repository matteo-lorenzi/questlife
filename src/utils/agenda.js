// Logique pure de l'agenda. Tous les jours sont des jours LOCAUX (jamais UTC).
import { nanoid } from "nanoid";
import { normalizeReminderOffsetsMs } from "./reminders";

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
      reminderOffsetsMs: normalizeReminderOffsetsMs(s.reminderOffsetsMs),
      sentReminderOffsetsMs: normalizeReminderOffsetsMs(s.sentReminderOffsetsMs),
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

// Décale un créneau (début + fin) de `days` jours locaux en gardant un créneau valide :
// si le décalage indépendant écrase la durée (trou de changement d'heure), la fin
// est recalculée à partir du nouveau début + durée d'origine.
export function shiftLocalSlot(startAt, endAt, days) {
  const newStart = shiftLocalDays(startAt, days);
  let newEnd = shiftLocalDays(endAt, days);
  if (newEnd <= newStart) newEnd = newStart + (endAt - startAt);
  return { startAt: newStart, endAt: newEnd };
}

export function sortSlots(slots) {
  return [...slots].sort((a, b) => a.startAt - b.startAt || a.endAt - b.endAt);
}

// --- Grille horaire : plage 06:00–23:00, minutes locales (sans notion de pixels). ---
export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 23;

// Minutes écoulées depuis 06:00 en heure murale locale (indépendant des changements d'heure).
export function minutesSinceGridStart(ts) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes() - GRID_START_HOUR * 60;
}

// Créneaux d'un jour local placés dans la grille (début/fin en minutes depuis 06:00).
// Les éléments entièrement hors plage sont exclus ici ; la troncature marquée et les
// bandes relèvent de tickets suivants.
export function buildGridItems(slots, dayKey) {
  const max = (GRID_END_HOUR - GRID_START_HOUR) * 60;
  return sortSlots(slots.filter((s) => localDayKey(s.startAt) === dayKey))
    .map((s) => ({
      kind: "slot",
      id: s.id,
      title: s.title,
      chapterId: s.chapterId,
      done: s.done,
      startMin: minutesSinceGridStart(s.startAt),
      endMin: minutesSinceGridStart(s.endAt),
    }))
    .filter((i) => i.endMin > 0 && i.startMin < max)
    .map((i) => ({ ...i, startMin: Math.max(0, i.startMin), endMin: Math.min(max, i.endMin) }));
}
