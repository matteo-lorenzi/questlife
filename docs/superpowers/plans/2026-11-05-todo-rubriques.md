# To-do list par rubriques — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un onglet « To-do » (tâches rangées par rubriques, persistées à part) et un onglet « Chapitres », de sorte que la To-do s'affiche dans la zone principale à côté de l'Agenda du panneau gauche.

**Architecture:** Un modèle pur et immuable (`todo.js`) manipulé par un store zustand dédié (`useTodo`), persisté dans sa propre clé localStorage. Les onglets du panneau gauche gagnent un `target` (`'panel'` ou `'main'`) : « Chapitres » et « To-do » pilotent la zone principale de l'accueil via un petit store `useMainView`, les autres restent dans le panneau.

**Tech Stack:** React, zustand, Tailwind, Vitest (jsdom). Pas de testing-library : l'UI se vérifie à la main, la logique par tests.

**Spec:** `GLOSSARY.md` (sections « To-do » et « Onglet ») ; décisions validées en conversation (grill-with-docs, 2026-11-05).

## Global Constraints

- Vocabulaire du glossaire : **To-do list**, **Rubrique**, **Tâche** ; ne jamais écrire « Quête » pour une tâche.
- Onglets, dans l'ordre : `Chapitres · Agenda · Quêtes · Minuteur · To-do` (ids : `chapters`, `agenda`, `quests`, `timer`, `todo`).
- « Chapitres » et « To-do » : `target: 'main'`, vues `home` et `chapter`. Depuis une vue chapitre, les choisir ramène à l'accueil sur cette vue.
- Tâche = texte seul + `done` (booléen) ; deux états « Pas commencée » / « Terminée ». Terminée : texte barré et grisé, reste à sa place, décochable.
- Saisie (tâches **et** noms de rubrique) : espaces autour retirés ; vide ou espaces seuls refusé ; doublons autorisés ; 200 caractères maximum.
- Rubriques : créées, renommées, supprimées ; ordre de création ; pas de réordonnancement, pas de repli ; pas de déplacement de tâche entre rubriques ; pas d'édition du texte d'une tâche.
- Suppression d'une tâche : sans confirmation. Suppression d'une rubrique contenant des tâches : confirmation (suit le motif de confirmation de `deleteChapter` dans `src/components/chapters/ChapterCard.jsx`) ; sans tâche : directe.
- Textes exacts : bouton « Nouvelle rubrique » ; vue sans rubrique « Aucune rubrique. Crée la première pour ranger tes tâches. » ; rubrique sans tâche « Aucune tâche ».
- Persistance : clé `questlife_todo`, hors `questlife_data` et hors `_persist()` de `useStore.js`. Aucun effet sur XP, série, objectifs hebdomadaires, badges.
- Messages de commit en français : `feat(todo): …`.

## Review Focus

- localStorage `questlife_todo` corrompu ou de mauvaise forme → liste vide, pas de crash (Task 2).
- `setItem` qui lève (stockage plein/indisponible) → l'état en mémoire reste à jour (Task 2).
- Renommer une rubrique avec un texte vide ou d'espaces → refusé, ancien titre conservé (Task 1).
- Action sur une rubrique ou une tâche inexistante (ex. supprimée entre-temps) → sans effet, sans exception (Task 1).
- Supprimer une rubrique supprime ses tâches et laisse les autres rubriques intactes ; cocher deux fois une tâche la remet « Pas commencée » (Task 1).
- Depuis une vue chapitre, cliquer « To-do » ramène à l'accueil avec la To-do affichée (Task 3).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `src/utils/todo.js` (créer) | Modèle pur : normalisation du texte, opérations immuables sur les rubriques/tâches |
| `src/utils/todoStorage.js` (créer) | Lecture/écriture localStorage tolérante aux erreurs, validation de forme |
| `src/store/useTodo.js` (créer) | Store zustand : état `sections`, actions, persistance |
| `src/store/useMainView.js` (créer) | Vue affichée dans la zone principale de l'accueil (`chapters` / `todo`) |
| `src/components/panel/tabs.js` (modifier) | Registre des onglets avec `target`, nouvel ordre |
| `src/components/panel/LeftPanel.jsx` (modifier) | Gère les onglets `main` (props `mainTabId`, `onSelectMainTab`) |
| `src/components/todo/TodoView.jsx`, `TodoSection.jsx` (créer) | UI de la To-do, zone principale |
| `src/components/layout/HomePage.jsx`, `CanvasView.jsx` (modifier) | Branchement des onglets `main` |

---

### Task 1: Modèle pur de la To-do

**Files:**
- Create: `src/utils/todo.js`
- Test: `src/utils/todo.test.js`

**Interfaces:**
- Produces (types : `Task = { id: string, text: string, done: boolean }`, `Section = { id: string, title: string, tasks: Task[] }`) :
  - `MAX_TEXT_LENGTH = 200`
  - `normalizeTodoText(raw: unknown): string | null` — `null` si pas une chaîne ou vide après trim ; sinon texte trimé tronqué à 200.
  - `addSection(sections: Section[], id: string, title: string): Section[]` — ajoute en fin avec `tasks: []`.
  - `renameSection(sections, id, title): Section[]`
  - `removeSection(sections, id): Section[]`
  - `addTask(sections, sectionId, taskId, text): Section[]` — ajoute en fin de la rubrique, `done: false`.
  - `toggleTask(sections, sectionId, taskId): Section[]`
  - `removeTask(sections, sectionId, taskId): Section[]`
  - Toutes renvoient **la même référence `sections`** quand l'opération est refusée ou sans cible (texte invalide, id inconnu) ; sinon un nouveau tableau sans muter l'entrée.

- [ ] **Step 1: Write the failing tests** in `src/utils/todo.test.js`, un `it` par ligne : `normalizeTodoText("  a  ")` → `"a"` ; `"   "` → `null` ; `42` → `null` ; 250 × `"x"` → longueur 200 ; `addSection([], "s1", " Mémoire ")` → une rubrique `{ id: "s1", title: "Mémoire", tasks: [] }` ; `addSection(list, "s2", "  ")` → `toBe(list)` ; doublon de titre accepté ; `renameSection` avec `""` → `toBe(list)` et titre inchangé ; `renameSection` id inconnu → `toBe(list)` ; `addTask` met la tâche en fin avec `done: false` et ne mute pas l'entrée (`Object.isFrozen`-style ou comparaison avant/après) ; `addTask` rubrique inconnue → `toBe(list)` ; doublon de texte accepté ; `toggleTask` deux fois → `done: false` ; `toggleTask` tâche inconnue → `toBe(list)` ; `removeTask` retire seulement la cible ; `removeSection` retire la rubrique et ses tâches, les autres rubriques restent identiques (`toBe` sur les objets conservés).
- [ ] **Step 2: Run** `npx vitest run src/utils/todo.test.js` — Expected: FAIL (module introuvable).
- [ ] **Step 3: Implement** `src/utils/todo.js` avec les signatures ci-dessus (fonctions pures, `map`/`filter`, aucune horloge ni génération d'id : les ids sont passés en paramètre).
- [ ] **Step 4: Run** `npx vitest run src/utils/todo.test.js` — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add src/utils/todo.js src/utils/todo.test.js
git commit -m "feat(todo): modèle pur des rubriques et tâches"
```

---

### Task 2: Persistance et store `useTodo`

**Files:**
- Create: `src/utils/todoStorage.js`, `src/store/useTodo.js`
- Test: `src/utils/todoStorage.test.js`, `src/store/todo.test.js`

**Interfaces:**
- Consumes: toutes les fonctions de `src/utils/todo.js` (Task 1).
- Produces:
  - `TODO_KEY = 'questlife_todo'`
  - `loadTodo(storage = globalThis.localStorage): Section[]` — `[]` si absent, JSON invalide, ou racine non tableau ; écarte les rubriques/tâches de forme invalide (id/titre/texte non chaînes, `done` non booléen).
  - `saveTodo(sections: Section[], storage = globalThis.localStorage): void` — silencieux si le stockage lève (même motif que `focusPrefs.js`).
  - `useTodo` (zustand) : état `{ sections: Section[] }` initialisé par `loadTodo()` ; actions `addSection(title): boolean`, `renameSection(id, title): boolean`, `removeSection(id): boolean`, `addTask(sectionId, text): boolean`, `toggleTask(sectionId, taskId): boolean`, `removeTask(sectionId, taskId): boolean`. Retour `true` = changement appliqué et sauvegardé, `false` = refusé. Ids générés avec `globalThis.crypto.randomUUID()`.

- [ ] **Step 1: Write the failing tests.** `todoStorage.test.js` : aller-retour save/load ; clé absente → `[]` ; `"{pas du json"` → `[]` ; `"{}"` (racine objet) → `[]` ; rubrique avec tâche `done: "oui"` → tâche écartée, reste conservé ; storage factice dont `setItem` lève → `saveTodo` ne lève pas. `todo.test.js` (store, style de `src/store/focusTimer.test.js` : `vi.resetModules()` + import dynamique + `localStorage.clear()`) : état initial vide ; `addSection("TD droit")` → `true`, état et `localStorage[TODO_KEY]` à jour ; `addSection("  ")` → `false`, rien écrit ; `addTask` / `toggleTask` / `removeTask` / `renameSection` / `removeSection` mettent à jour état et stockage ; action sur id inconnu → `false` ; un nouveau `freshStore()` relit les données sauvegardées ; avec `localStorage.setItem` espionné pour lever, `addSection("A")` met quand même l'état en mémoire à jour.
- [ ] **Step 2: Run** `npx vitest run src/utils/todoStorage.test.js src/store/todo.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** `todoStorage.js` (validation de forme, try/catch) puis `useTodo.js` : chaque action appelle la fonction pure, compare la référence renvoyée à l'ancienne (`===` → `false`), sinon `set` + `saveTodo` + `true`.
- [ ] **Step 4: Run** les deux fichiers — Expected: PASS.
- [ ] **Step 5: Commit**
```bash
git add src/utils/todoStorage.js src/utils/todoStorage.test.js src/store/useTodo.js src/store/todo.test.js
git commit -m "feat(todo): store zustand et persistance dédiée"
```

---

### Task 3: Onglets « Chapitres » et « To-do » et vue principale

**Files:**
- Create: `src/store/useMainView.js`
- Modify: `src/components/panel/tabs.js`, `src/components/panel/LeftPanel.jsx`, `src/components/layout/HomePage.jsx`, `src/components/layout/CanvasView.jsx` (ligne ~115, appel de `LeftPanel`)
- Test: `src/store/mainView.test.js`, `src/components/panel/tabs.test.js`

**Interfaces:**
- Consumes: `useStore().setActiveChapter(id)` (existant, `null` ramène à l'accueil).
- Produces:
  - `useMainView` (zustand, en mémoire, non persisté) : `{ mainView: 'chapters' | 'todo', setMainView(id) }` ; défaut `'chapters'` ; `setMainView` ignore toute autre valeur.
  - Registre `LEFT_PANEL_TABS` : chaque entrée a `target: 'panel' | 'main'`. Ordre et vues : `chapters` (main, `component: null`, `['home','chapter']`), `agenda` (panel, `['home','chapter']`), `quests` (panel, `['chapter']`), `timer` (panel, `['home','chapter']`), `todo` (main, `component: null`, `['home','chapter']`). `tabsForView(view)` inchangée.
  - `LeftPanel({ tabs, tabProps, defaultTab, mainTabId, onSelectMainTab })` : le clic sur un onglet `main` appelle `onSelectMainTab(id)` et ne modifie pas l'onglet de panneau mémorisé ; l'onglet actif du panneau est choisi parmi les onglets `target !== 'main'` (mémorisé → `defaultTab` → premier) ; un onglet `main` est `aria-selected` seulement si `id === mainTabId`. La barre d'onglets passe à la ligne si elle déborde (`flex-wrap`).

- [ ] **Step 1: Write the failing tests.** `mainView.test.js` : défaut `'chapters'` ; `setMainView('todo')` → `'todo'` ; `setMainView('agenda')` → reste inchangé. `tabs.test.js` : `tabsForView('home').map(t => t.id)` = `['chapters','agenda','timer','todo']` ; `tabsForView('chapter').map(t => t.id)` = `['chapters','agenda','quests','timer','todo']` ; les `target` valent `main` pour `chapters` et `todo` seulement. (Si l'import de `tabs.js` échoue sous Vitest à cause des composants JSX, extraire la liste d'ids/targets dans `src/components/panel/tabsMeta.js` et tester celle-ci.)
- [ ] **Step 2: Run** `npx vitest run src/store/mainView.test.js src/components/panel/tabs.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** `useMainView.js` et le registre. Dans `tabs.js`, `chapters` et `todo` référencent leur composant plus tard : pour l'instant `component: null` (les vues vivent dans `HomePage`, pas dans le panneau).
- [ ] **Step 4: Run** les deux fichiers — Expected: PASS.
- [ ] **Step 5: Implement le câblage UI.** `LeftPanel` : nouvelles props et comportement décrits ci-dessus. `HomePage` : `<LeftPanel … mainTabId={mainView} onSelectMainTab={setMainView} />` ; dans `<main>`, si `mainView === 'todo'` afficher `<TodoView />` (créé Task 4 ; ici un `<div>To-do</div>` provisoire), sinon le contenu « Mes chapitres » existant inchangé. `CanvasView` : `onSelectMainTab={id => { useMainView.getState().setMainView(id); useStore.getState().setActiveChapter(null) }}`, sans `mainTabId`.
- [ ] **Step 6: Vérification manuelle** (démarrer l'app avec le skill `run` / `preview_start`) : à l'accueil la barre affiche les 4 onglets, « Chapitres » surligné ; « To-do » change la zone principale sans changer l'Agenda du panneau ; « Agenda » et « Minuteur » changent le panneau sans toucher la zone principale ; dans un chapitre, cliquer « To-do » ramène à l'accueil sur la To-do ; la barre ne déborde pas du panneau (retour à la ligne) ; thème sombre lisible.
- [ ] **Step 7: Commit**
```bash
git add src/store/useMainView.js src/store/mainView.test.js src/components/panel src/components/layout/HomePage.jsx src/components/layout/CanvasView.jsx
git commit -m "feat(todo): onglets Chapitres et To-do, vue principale pilotée par le panneau"
```

---

### Task 4: Vue To-do (rubriques et tâches)

**Files:**
- Create: `src/components/todo/TodoView.jsx`, `src/components/todo/TodoSection.jsx`
- Modify: `src/components/layout/HomePage.jsx` (remplacer le provisoire)
- Test: aucun test automatisé (pas de testing-library) ; la logique est couverte par les Tasks 1-2.

**Interfaces:**
- Consumes: `useTodo` (Task 2) — `sections` et les six actions ; composants `Btn` de `../ui`.
- Produces: `TodoView()` sans props (rend la zone principale, même conteneur `max-w-3xl mx-auto` et mêmes classes de thème que « Mes chapitres ») ; `TodoSection({ section })`.

- [ ] **Step 1: Implement `TodoView`.** En-tête « To-do » avec le nombre de rubriques (style de l'en-tête « Mes chapitres ») et un bouton « Nouvelle rubrique » qui révèle un champ de nom (Entrée valide, Échap annule, `maxLength` 200). Sans rubrique : le message exact des contraintes globales avec le bouton. Une rubrique par `TodoSection`, dans l'ordre de `sections`.
- [ ] **Step 2: Implement `TodoSection`.** Titre renommable (clic sur le titre → champ, Entrée valide, vide refusé : le champ reprend l'ancien titre) ; bouton de suppression de la rubrique (confirmation si `tasks.length > 0`, motif de `ChapterCard`) ; champ d'ajout de tâche (Entrée → `addTask` ; vider le champ seulement si l'action renvoie `true` ; `maxLength` 200) ; liste des tâches dans l'ordre, chacune avec une case à cocher (`toggleTask`), son texte (barré et grisé si `done`) et un bouton de suppression (`removeTask`, sans confirmation) ; « Aucune tâche » si la liste est vide. Accessibilité : `aria-label` sur les cases et boutons (« Marquer comme terminée », « Supprimer la tâche », « Supprimer la rubrique »).
- [ ] **Step 3: Brancher** `TodoView` dans `HomePage` à la place du provisoire.
- [ ] **Step 4: Vérification manuelle** (app lancée) : créer « Mémoire » et « TD droit » ; ajouter des tâches dans chacune ; texte vide ou d'espaces refusé ; cocher → barré/grisé, décocher → normal ; supprimer une tâche sans confirmation ; supprimer une rubrique avec tâches → confirmation, annuler la conserve ; recharger l'app → tout est restitué ; vider `localStorage.questlife_todo` dans la console → liste vide ; copier 250 caractères dans un champ → coupé à 200 ; les XP et badges du profil ne bougent pas ; thème sombre lisible ; l'Agenda reste visible à gauche pendant toute la manipulation.
- [ ] **Step 5: Lancer toute la suite** `npm test` — Expected: tous les tests passent (aucune régression sur agenda/minuteur).
- [ ] **Step 6: Commit**
```bash
git add src/components/todo src/components/layout/HomePage.jsx
git commit -m "feat(todo): vue To-do avec rubriques et tâches"
```
