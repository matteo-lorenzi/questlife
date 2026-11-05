# Feature 1 : Agenda intégré — décisions et tickets

Résultat de la session de cadrage du 2026-11-05. Les termes (Agenda, Créneau de révision, Panneau gauche, Onglet) sont définis dans `GLOSSARY.md`. Les idées reportées sont dans `docs/BACKLOG.md`. Les features 2 (minuteur) et 3 (to-do) ne sont pas traitées ici.

## Décisions

1. **Panneau gauche global.** Visible sur l'accueil et dans la vue chapitre. L'ancienne `QuestSidebar` devient l'onglet « Quêtes ».
2. **Conteneur réutilisable.** Panneau à onglets avec un petit registre `{id, label, composant}`. Seul l'onglet Agenda est livré ; pas d'onglets vides pour le minuteur et la to-do.
3. **Deux sources dans l'agenda.** Créneaux de révision autonomes, plus deadlines de quêtes affichées en lecture seule (expirées incluses, marquées comme telles). Un clic sur une deadline ouvre le chapitre et sélectionne la quête.
4. **Contenu du panneau.** Mini-calendrier du mois pour choisir un jour, liste chronologique du jour dessous. Pas de vue semaine plein écran.
5. **Pas de récurrence en v1.** Action « dupliquer à la semaine suivante » à la place (voir `BACKLOG.md`, entrée 1).
6. **Rappels.** Même circuit de notifications desktop et même boucle de 30 s que les deadlines. Fonctionne application ouverte uniquement (voir `BACKLOG.md`, entrée 3).
7. **Pas d'XP pour l'agenda.** Case « fait » sans effet sur XP, série, objectifs hebdo ou badges (voir `BACKLOG.md`, entrée 2).
8. **Lien chapitre.** Un créneau peut être lié à un chapitre (pas à une quête). Suppression du chapitre : le créneau est conservé, le lien est effacé.
9. **Un créneau tient dans une journée.** Fin strictement après début, même jour local. Chevauchements autorisés, sans avertissement.
10. **Jours en heure locale.** Ne pas réutiliser `getISODate()` du store, qui renvoie le jour UTC.
11. **Stockage.** Champ `agenda` dans `questlife_data`, normalisation tolérante au chargement (un ancien fichier sans `agenda` reste valide), pas de version de schéma.
12. **Préférences d'affichage.** Onglet par défaut : Agenda sur l'accueil, Quêtes dans la vue chapitre. Dernier onglet choisi et état réduit/déployé mémorisés dans une clé `localStorage` à part, hors `questlife_data`. Bouton pour réduire le panneau.
13. **Formulaire.** Dans le panneau, sans modale : titre (obligatoire), jour, début, fin, chapitre (optionnel), rappels (optionnel). Modifier, supprimer, cocher « fait » et dupliquer se font depuis la ligne du créneau.

## Tickets

Découpage réel, suivi dans GitHub Issues (spec : #1). Tous livrés, dans l'ordre : #2 → #3 → #4 → #5 → #6 → #7 → #8 → #9. Le découpage initial (tickets 0 à 6) a été remanié en tranches verticales : la logique pure, l'état et l'interface d'un même comportement sont livrés ensemble plutôt que par couche.

| Issue | Ticket | Livré |
|---|---|---|
| #1 | Spec « Agenda intégré » | Ticket parent : décisions ci-dessus. |
| #2 | Installer Vitest et un test de fumée | `vitest` + `jsdom`, script `npm test` (`vitest run`), fuseau `Europe/Paris` fixé dans `vite.config.js`, test de fumée sur `wouldCreateCycle` (`src/utils/graph.test.js`). Pas de React Testing Library. |
| #3 | Panneau gauche à onglets dans la vue chapitre | `src/components/panel/LeftPanel.jsx` + registre `tabs.js` (`{id, label, component, views}`). `QuestSidebar` devient l'onglet « Quêtes », comportement inchangé. Bouton réduire/déployer, préférences dans `src/utils/panelPrefs.js` (clé `questlife_left_panel`, hors `questlife_data`). |
| #4 | Planifier un créneau de révision (onglet Agenda) | `src/utils/agenda.js` (jours locaux, `validateSlotInput`, `normalizeAgenda`, tri), champ `agenda` du store + persistance + `createAgendaSlot`, onglet Agenda (mini-calendrier, liste du jour, formulaire en ligne), panneau monté aussi sur l'accueil avec Agenda par défaut. Tests du store. |
| #5 | Gérer un créneau : modifier, supprimer, fait, chapitre | `updateAgendaSlot`, `deleteAgendaSlot`, `toggleAgendaSlotDone`, sélecteur de chapitre, nettoyage du lien à la suppression d'un chapitre (`AgendaSlotRow.jsx`). |
| #6 | Dupliquer un créneau à la semaine suivante | `duplicateAgendaSlotToNextWeek` + `shiftLocalDays` (même heure locale, +7 jours, résiste au changement d'heure ; copie non faite, rappels réarmés). |
| #7 | Afficher les deadlines de quêtes dans l'agenda | `src/utils/agendaDeadlines.js` (`questDeadlineItems`, `mergeDayItems`), `getAgendaItemsForDay` / `getAgendaItemBusyDays`, `DeadlineRow.jsx` en lecture seule (expirées et validées marquées), `openAgendaDeadline` ouvre le chapitre et sélectionne la quête. |
| #8 | Rappels de créneaux | Champs `reminderOffsetsMs` / `sentReminderOffsetsMs` sur le créneau, saisie en minutes dans le formulaire, `checkAgendaRemindersAndEmitAlerts` branché sur la boucle de 30 s de `App.jsx` et le circuit toast + notification desktop. |
| #9 | Documentation de l'agenda | `README.md`, `.github/copilot-instructions.md`, `GLOSSARY.md`, ce plan. |

## Points d'attention pour l'implémentation

- Dans la vue chapitre, le glisser-déposer de quêtes n'est possible que sur l'onglet « Quêtes ». C'est voulu, mais à garder en tête pour l'ergonomie.
- Largeur de fenêtre minimale d'Electron : 1024 px. Le panneau (environ 280 px) doit laisser le canvas utilisable, d'où le bouton pour le réduire.
- `useStore.js` lit `localStorage` à l'import (`loadState()`, `getInitialTheme()`). Les tests du store passent donc par `jsdom`.
