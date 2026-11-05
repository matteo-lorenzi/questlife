// Aides de test : lecture d'un jour via la grille horaire (API publique du store).

// Tous les éléments d'un jour (bande « avant », grille, bande « après »), triés par heure.
export function dayEntries(store, dayKey, now) {
  const g = store.getState().getAgendaGridForDay(dayKey, now);
  return [...g.before, ...g.items, ...g.after];
}

// Créneaux seuls (sans deadlines) d'un jour.
export function daySlots(store, dayKey) {
  return dayEntries(store, dayKey).filter((i) => i.kind === "slot");
}
