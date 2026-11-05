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

Ordre : 0 → 1 → 2 → 3 → 4 → 5 → 6. Le ticket 3 est indépendant des tickets 1 et 2. Le ticket 4 a besoin des tickets 2 et 3.

| # | Ticket | Contenu |
|---|---|---|
| 0 | Installer Vitest | `vitest` + `jsdom` (le store lit `localStorage` à l'import), script `npm test`, un test de fumée sur `wouldCreateCycle` de `src/utils/graph.js`. Pas de React Testing Library. |
| 1 | Logique pure de l'agenda | `src/utils/agenda.js` : clés de jour locales, validation d'un créneau, tri, copie « semaine suivante » (même heure locale, +7 jours), calcul des rappels dus. Tests pour tout. |
| 2 | État et persistance | Champ `agenda` dans le store et `saveState`, normalisation au chargement, actions créer / modifier / supprimer / cocher / dupliquer, nettoyage du lien à la suppression d'un chapitre. Tests du store. |
| 3 | Conteneur du panneau gauche | Composant à onglets avec registre, monté sur l'accueil et dans la vue chapitre, `QuestSidebar` devient l'onglet « Quêtes », mémorisation de l'onglet et de l'état réduit. |
| 4 | Onglet Agenda | Mini-calendrier du mois, liste du jour, formulaire en ligne, deadlines de quêtes en lecture seule avec clic vers la quête. |
| 5 | Rappels de créneaux | Branchement sur la boucle de 30 s et le circuit de notifications existants, avec suivi des rappels déjà envoyés. |
| 6 | Documentation | `README.md` (structure), `.github/copilot-instructions.md` (modèle de données), `GLOSSARY.md` à jour. |

## Points d'attention pour l'implémentation

- Dans la vue chapitre, le glisser-déposer de quêtes n'est possible que sur l'onglet « Quêtes ». C'est voulu, mais à garder en tête pour l'ergonomie.
- Largeur de fenêtre minimale d'Electron : 1024 px. Le panneau (environ 280 px) doit laisser le canvas utilisable, d'où le bouton pour le réduire.
- `useStore.js` lit `localStorage` à l'import (`loadState()`, `getInitialTheme()`). Les tests du store passent donc par `jsdom`.
