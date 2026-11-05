// Logique pure de l'agenda. Tous les jours sont des jours LOCAUX (jamais UTC).
import { nanoid } from "nanoid";
import { normalizeReminderOffsetsMs } from "./reminders";

const pad = (n) => String(n).padStart(2, "0");

// "HH:MM" depuis un nombre de minutes écoulées depuis minuit.
export function minutesToHHMM(totalMin) {
  return `${pad(Math.floor(totalMin / 60))}:${pad(totalMin % 60)}`;
}

// "HH:MM" local d'un horodatage (affichage et <input type="time">).
export function hhmm(ts) {
  const d = new Date(ts);
  return minutesToHHMM(d.getHours() * 60 + d.getMinutes());
}

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

// "HH:MM" d'une position de la grille (minutes depuis 06:00).
export function gridMinutesToHHMM(minFromGridStart) {
  return minutesToHHMM(GRID_START_HOUR * 60 + minFromGridStart);
}

// Clic sur la grille (minutes depuis 06:00) -> début arrondi à la demi-heure la plus proche,
// fin à +1 h. Le début est borné à [06:00, 22:30] : un créneau commençant à 23:00 pile irait
// dans la bande « Après 23:00 » et disparaîtrait de la grille juste après sa création.
export function slotTimesForGridClick(minFromGridStart) {
  const maxStart = (GRID_END_HOUR - GRID_START_HOUR) * 60 - 30;
  const rounded = Math.min(maxStart, Math.max(0, Math.round(minFromGridStart / 30) * 30));
  const startAbs = GRID_START_HOUR * 60 + rounded;
  return { start: minutesToHHMM(startAbs), end: minutesToHHMM(startAbs + 60) };
}

// Créneaux d'un jour local placés dans la grille (début/fin en minutes depuis 06:00).
// Un créneau à cheval sur la plage est tronqué avec un marqueur (startMarker / endMarker) ;
// un créneau entièrement hors plage va dans `before` (≤ 06:00) ou `after` (≥ 23:00).
export function buildGridItems(slots, dayKey) {
  const max = (GRID_END_HOUR - GRID_START_HOUR) * 60;
  const result = { items: [], before: [], after: [] };
  const sameDay = sortSlots(slots.filter((s) => localDayKey(s.startAt) === dayKey));
  for (const s of sameDay) {
    const item = {
      kind: "slot",
      id: s.id,
      title: s.title,
      chapterId: s.chapterId,
      done: s.done,
      startMin: minutesSinceGridStart(s.startAt),
      endMin: minutesSinceGridStart(s.endAt),
    };
    if (item.endMin <= 0) result.before.push(item);
    else if (item.startMin >= max) result.after.push(item);
    else {
      const placed = { ...item, startMin: Math.max(0, item.startMin), endMin: Math.min(max, item.endMin) };
      if (item.startMin < 0) placed.startMarker = `↑ dès ${hhmm(s.startAt)}`;
      if (item.endMin > max) placed.endMarker = `↓ jusqu'à ${hhmm(s.endAt)}`;
      result.items.push(placed);
    }
  }
  return result;
}

// Durées minimales d'affichage (en minutes) : un bloc court ou une deadline reste visible et cliquable.
// Un bloc tronqué (marqueur « ↑ dès » / « ↓ jusqu'à ») doit afficher marqueur + titre : plus haut.
export const MIN_SLOT_DISPLAY_MIN = 25;
export const MIN_TRUNCATED_DISPLAY_MIN = 40;
export const DEADLINE_DISPLAY_MIN = 23;

// Durée d'affichage (minutes) : la durée réelle, au moins le minimum du type d'élément.
function displayMinutes(item) {
  let min = MIN_SLOT_DISPLAY_MIN;
  if (item.kind === "deadline") min = DEADLINE_DISPLAY_MIN;
  else if (item.startMarker || item.endMarker) min = MIN_TRUNCATED_DISPLAY_MIN;
  return Math.max(min, item.endMin - item.startMin);
}

// Place les éléments chevauchants côte à côte. `items` triés par startMin.
// Ajoute `col` (colonne, 0-based), `cols` (nombre de colonnes du groupe de chevauchements enchaînés)
// et `displayMin` (durée d'affichage : la hauteur du bloc doit l'utiliser pour rester cohérente).
export function assignOverlapColumns(items) {
  const displayEnd = (i) => i.startMin + i.displayMin;
  const out = [];
  let group = [];
  let colEnds = [];
  let groupEnd = -Infinity;
  const flush = () => {
    group.forEach((g) => out.push({ ...g, cols: colEnds.length }));
    group = [];
    colEnds = [];
  };
  for (const raw of items) {
    const item = { ...raw, displayMin: displayMinutes(raw) };
    if (group.length && item.startMin >= groupEnd) flush();
    let col = colEnds.findIndex((end) => end <= item.startMin);
    if (col === -1) col = colEnds.length;
    const end = displayEnd(item);
    colEnds[col] = end;
    groupEnd = group.length ? Math.max(groupEnd, end) : end;
    group.push({ ...item, col });
  }
  flush();
  return out;
}
