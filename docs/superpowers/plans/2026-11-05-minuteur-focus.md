# Minuteur de focus — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un onglet « Minuteur » au panneau gauche (compte à rebours de focus) et une pastille discrète dans les en-têtes, avec toast + notification desktop à la fin.

**Architecture:** Une machine à états pure (`src/utils/focusTimer.js`) fondée sur un instant de fin absolu ; un store zustand dédié (`useFocusTimer`, séparé de `useStore` et non persisté) qui porte l'état hors des composants d'onglet et émet les événements `questlife:toast` / `questlife:system-notify` existants ; un pilote `setInterval` 1 s dans `App.jsx` actif seulement quand le minuteur tourne. La pastille ouvre l'onglet via un événement `questlife:open-panel-tab` écouté par `LeftPanel`.

**Tech Stack:** React 18, zustand 4, Tailwind, Vitest (jsdom, tests `src/**/*.test.js` uniquement, pas de test de composant).

**Spec:** `GLOSSARY.md` (sections « Minuteur », « Focus », « Pastille du minuteur », « Onglet ») + décisions du grilling du 2026-11-05 reprises dans « Global Constraints ». Reporté : `docs/BACKLOG.md` §5.

## Global Constraints

- Le minuteur ne mesure que le **Focus** : pas de phase de pause, pas de cycle. Boutons : Démarrer, Pause/Reprendre, Réinitialiser ; à 0 : « Focus terminé » avec Relancer et Fermer.
- Durée : **60 min par défaut**, préréglages **15 / 25 / 45 / 60 min**, champ libre **1 à 180 min** (entier). Non modifiable tant que le minuteur n'est pas au repos (`idle`).
- Durée mémorisée dans `localStorage` sous la clé dédiée `questlife_focus_prefs`, **hors `questlife_data`** ; toute lecture/écriture `localStorage` dans un `try/catch`.
- Le minuteur survit au changement d'onglet, à la réduction du panneau et à l'accueil ↔ chapitre ; fermer l'app l'abandonne (état non persisté).
- Fin calculée sur un instant absolu (`endAt`) : après une veille, la notification part dès le premier tick, une seule fois.
- Fin = toast (`questlife:toast`, type `success`) + notification desktop (`questlife:system-notify`), **sans son**.
- Aucun lien avec chapitres, quêtes, créneaux, XP, série, objectifs, badges ; aucun historique. Les rappels de créneaux ne sont pas filtrés pendant un focus.
- Pastille dans **les deux en-têtes** (accueil et vue chapitre) ; visible seulement hors `idle` ; discrète ; un clic ouvre l'onglet « Minuteur » et déploie le panneau s'il est réduit.
- Textes en français avec accents ; identifiants de code en anglais, comme le reste du dépôt. Pas de « session », « pomodoro », « timer » dans l'interface.

## Review Focus

- Veille / fenêtre minimisée : un `tick` très postérieur à `endAt` termine le focus, notifie une fois, reste à 0 (jamais négatif) — testé en Task 2.
- Ticks répétés après la fin : aucune seconde notification — testé en Task 2.
- Pause à 1 s de la fin puis reprise : le temps restant est conservé, pas de fin prématurée — testé en Task 1.
- Durée saisie invalide (`0`, `999`, `"abc"`, `12.7`, vide) : repli sur la valeur bornée ou 60, jamais `NaN` — testé en Task 1.
- Changement de durée pendant un focus (running/paused/done) : ignoré — testé en Task 2.
- `localStorage` indisponible ou JSON corrompu : durée par défaut, aucune exception — testé en Task 2.
- Actions hors état valide (Pause en `idle`, Démarrer en `running`, Reprendre en `running`) : sans effet, ne réinitialisent pas le compte à rebours — testé en Task 1.

---

## File Structure

- Create `src/utils/focusTimer.js` — machine à états pure, constantes, `formatClock`.
- Create `src/utils/focusTimer.test.js`
- Create `src/utils/focusPrefs.js` — lecture/écriture de la durée mémorisée.
- Create `src/store/useFocusTimer.js` — store zustand, notifications de fin.
- Create `src/store/focusTimer.test.js`
- Create `src/components/focus/FocusTimerTab.jsx` — onglet complet.
- Create `src/components/focus/FocusPill.jsx` — pastille d'en-tête.
- Modify `src/components/panel/tabs.js` — entrée `timer`.
- Modify `src/utils/panelPrefs.js` — `requestOpenPanelTab` + constante d'événement.
- Create `src/utils/panelPrefs.test.js`
- Modify `src/components/panel/LeftPanel.jsx` — écoute de l'événement d'ouverture.
- Modify `src/App.jsx` — pilote `setInterval`.
- Modify `src/components/layout/HomePage.jsx`, `src/components/layout/ChapterHeader.jsx` — pastille.

---

### Task 1: Machine à états pure du minuteur

**Files:**
- Create: `src/utils/focusTimer.js`
- Test: `src/utils/focusTimer.test.js`

**Interfaces:**
- Produces (exports de `focusTimer.js`) :
  - `DEFAULT_FOCUS_MINUTES = 60`, `MIN_FOCUS_MINUTES = 1`, `MAX_FOCUS_MINUTES = 180`, `FOCUS_PRESETS_MINUTES = [15, 25, 45, 60]`
  - `normalizeFocusMinutes(value: unknown): number` — entier borné [1, 180] ; arrondi à l'entier le plus proche ; non numérique/vide → 60.
  - `type Timer = { status: 'idle' | 'running' | 'paused' | 'done', durationMs: number, endAt: number | null, remainingMs: number }`
  - `idleTimer(durationMs: number): Timer` (`remainingMs = durationMs`, `endAt = null`)
  - `startTimer(t: Timer, now: number): Timer` — valide depuis `idle` et `done` seulement ; sinon renvoie `t` inchangé.
  - `pauseTimer(t, now)` — depuis `running` seulement ; `remainingMs = max(0, endAt - now)`.
  - `resumeTimer(t, now)` — depuis `paused` seulement ; `endAt = now + remainingMs`.
  - `resetTimer(t): Timer` — depuis tout état, `idleTimer(t.durationMs)`.
  - `finishTimer(t): Timer` — `status: 'done'`, `endAt: null`, `remainingMs: 0`.
  - `isFinished(t, now): boolean` — `running` et `now >= endAt`.
  - `getRemainingMs(t, now): number` — `running` : `max(0, endAt - now)` ; `paused` : `remainingMs` ; `idle` : `durationMs` ; `done` : 0.
  - `formatClock(ms: number): string` — secondes arrondies au supérieur ; `m:ss` sous 1 h (`"25:00"`, `"0:01"`), `h:mm:ss` à partir de 1 h (`"1:00:00"`) ; `ms <= 0` → `"0:00"`.

- [ ] **Step 1: Écrire les tests (échouants)** dans `focusTimer.test.js`, un `it` par ligne :
  - `normalizeFocusMinutes`: `0 → 1`, `999 → 180`, `"abc" → 60`, `"" → 60`, `null → 60`, `12.7 → 13`, `"45" → 45`.
  - `startTimer(idleTimer(3_600_000), 1000)` → `{status:'running', endAt: 3_601_000}` ; `getRemainingMs(…, 1000)` = 3 600 000.
  - `getRemainingMs` d'un focus démarré à 0 de 60 min évalué à `now = 90_000` = 3 510 000 ; à `now` ≥ `endAt` = 0, jamais négatif.
  - Pause à `endAt - 1000` puis reprise à `now = 999_999` : `getRemainingMs` après reprise = 1000 et `endAt = 1_000_999`.
  - `pauseTimer` sur `idle` renvoie le même objet ; `startTimer` sur `running` renvoie le même objet (`toBe`) ; `resumeTimer` sur `running` idem.
  - `isFinished`: faux à `endAt - 1`, vrai à `endAt` et à `endAt + 10 * 3_600_000` ; faux hors `running`.
  - `finishTimer` puis `startTimer(done, 5000)` redémarre avec la même `durationMs` (Relancer).
  - `resetTimer` depuis `paused` conserve `durationMs` et renvoie `idle`.
  - `formatClock`: `0 → "0:00"`, `-5 → "0:00"`, `1 → "0:01"` (arrondi supérieur), `25*60000 → "25:00"`, `3_599_000 → "59:59"`, `3_600_000 → "1:00:00"`, `3_661_000 → "1:01:01"`.

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `npx vitest run src/utils/focusTimer.test.js`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `focusTimer.js`** avec les signatures ci-dessus. Fonctions pures, aucune lecture de `Date.now()`.

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/utils/focusTimer.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/focusTimer.js src/utils/focusTimer.test.js
git commit -m "feat(minuteur): machine à états pure du focus"
```

---

### Task 2: Préférences de durée et store du minuteur

**Files:**
- Create: `src/utils/focusPrefs.js`
- Create: `src/store/useFocusTimer.js`
- Test: `src/store/focusTimer.test.js`

**Interfaces:**
- Consumes (Task 1) : `idleTimer`, `startTimer`, `pauseTimer`, `resumeTimer`, `resetTimer`, `finishTimer`, `isFinished`, `normalizeFocusMinutes`, `DEFAULT_FOCUS_MINUTES`. Existant : `formatReminderLeadTime(offsetMs)` de `src/utils/reminders.js` (60 min → `"1 h"`, 25 min → `"25 min"`).
- Produces :
  - `focusPrefs.js` : `FOCUS_PREFS_KEY = 'questlife_focus_prefs'` ; `loadFocusMinutes(storage = globalThis.localStorage): number` (JSON `{ minutes }`, `normalizeFocusMinutes`, tout échec → 60) ; `saveFocusMinutes(minutes: number, storage = globalThis.localStorage): void` (silencieux si échec).
  - `useFocusTimer` (zustand), état `{ timer: Timer, now: number }`, actions : `setDurationMinutes(minutes: unknown)`, `start(now = Date.now())`, `pause(now = Date.now())`, `resume(now = Date.now())`, `reset()`, `restart(now = Date.now())` (Relancer depuis `done`), `tick(now: number)`. Sélecteur utile : `getRemainingMs(timer, now)` appelé par les composants avec `now` du store.
  - Événements émis dans `tick` quand le focus se termine, **une seule fois** : `questlife:toast` `{ msg: 'Focus terminé', type: 'success' }` et `questlife:system-notify` `{ title: 'QuestLife - focus terminé', body: \`Focus de ${formatReminderLeadTime(durationMs)} terminé.\` }`.

- [ ] **Step 1: Écrire les tests (échouants)** dans `focusTimer.test.js`, sur le modèle de `agendaReminders.test.js` (`vi.resetModules()` + `localStorage.clear()` + import dynamique du store ; écouteurs sur `globalThis`). Cas :
  - Défaut : sans préférence, `timer.durationMs = 60 * 60000`, `status = 'idle'`.
  - `setDurationMinutes(25)` à l'arrêt : `durationMs = 25 * 60000` et `localStorage['questlife_focus_prefs']` contient `25` ; un store neuf relit 25.
  - `setDurationMinutes(0)` → 1 min ; `(999)` → 180 min.
  - `setDurationMinutes(10)` pendant `running`, `paused` et `done` : `durationMs` inchangé.
  - JSON corrompu dans `questlife_focus_prefs` et `localStorage.getItem` qui lève : défaut 60, aucune exception.
  - `start(0)` puis `tick(1000)` : aucun événement, `status = 'running'`.
  - `start(0)` puis `tick(3_600_000)` : un `questlife:toast` et un `questlife:system-notify` avec les textes ci-dessus (`body === 'Focus de 1 h terminé.'`), `status = 'done'`.
  - Veille : `start(0)` puis `tick(10 * 3_600_000)` : un seul de chaque événement, `getRemainingMs` = 0.
  - Ticks répétés après la fin (`tick` ×3) : toujours un seul de chaque événement.
  - `pause(1000)` puis `tick(99 * 3_600_000)` : aucun événement, `status = 'paused'` ; `resume(2000)` puis `tick(2000 + durée)` : un événement.
  - `reset()` depuis `running` : retour `idle`, aucun événement ; `restart(5000)` depuis `done` : `running` avec `endAt = 5000 + durationMs`.
  - `start` pendant `running` ne modifie pas `endAt`.

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `npx vitest run src/store/focusTimer.test.js`
Expected: FAIL.

- [ ] **Step 3: Implémenter `focusPrefs.js`** puis `useFocusTimer.js` (zustand `create`). `tick(now)` met à jour `now` ; si `isFinished(timer, now)`, passe en `finishTimer` et émet les deux événements via `globalThis.dispatchEvent(new CustomEvent(...))` (deux petits helpers locaux, sans toucher à `useStore.js`). `setDurationMinutes` n'agit que si `status === 'idle'`, persiste via `saveFocusMinutes`.

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/store/focusTimer.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/focusPrefs.js src/store/useFocusTimer.js src/store/focusTimer.test.js
git commit -m "feat(minuteur): store zustand, durée mémorisée et notification de fin"
```

---

### Task 3: Onglet « Minuteur », pilote 1 s et ouverture du panneau

**Files:**
- Create: `src/components/focus/FocusTimerTab.jsx`
- Modify: `src/components/panel/tabs.js:6-9`
- Modify: `src/utils/panelPrefs.js`
- Create: `src/utils/panelPrefs.test.js`
- Modify: `src/components/panel/LeftPanel.jsx:8-20`
- Modify: `src/App.jsx:49-114`

**Interfaces:**
- Consumes (Tasks 1-2) : `useFocusTimer` et ses actions ; `getRemainingMs`, `formatClock`, `FOCUS_PRESETS_MINUTES`, `MIN_FOCUS_MINUTES`, `MAX_FOCUS_MINUTES`. Existant : `Btn`, `Input` de `src/components/ui`.
- Produces :
  - `panelPrefs.js` : `OPEN_PANEL_TAB_EVENT = 'questlife:open-panel-tab'` ; `requestOpenPanelTab(tabId: string): void` — dispatch `CustomEvent(OPEN_PANEL_TAB_EVENT, { detail: { tabId } })` sur `globalThis`.
  - `FocusTimerTab` (default export, sans props) enregistré `{ id: 'timer', label: 'Minuteur', component: FocusTimerTab, views: ['home', 'chapter'] }` à la suite des entrées existantes.

- [ ] **Step 1: Test de `requestOpenPanelTab`** dans `panelPrefs.test.js` : un écouteur sur `OPEN_PANEL_TAB_EVENT` reçoit `detail.tabId === 'timer'` après `requestOpenPanelTab('timer')`.

- [ ] **Step 2: Lancer et vérifier l'échec**

Run: `npx vitest run src/utils/panelPrefs.test.js`
Expected: FAIL (export manquant).

- [ ] **Step 3: Implémenter `requestOpenPanelTab`** dans `panelPrefs.js`, puis relancer : PASS.

- [ ] **Step 4: `LeftPanel`** — ajouter un `useEffect` qui écoute `OPEN_PANEL_TAB_EVENT` ; si `tabs` contient `detail.tabId`, appliquer `{ activeTab: tabId, collapsed: false }` et sauvegarder. Utiliser `setPrefs` en forme fonctionnelle (calculer `next` depuis l'état courant, appeler `savePanelPrefs(next)`) pour éviter une fermeture sur un `prefs` périmé ; réécrire `update` de la même façon pour garder une seule voie de mise à jour.

- [ ] **Step 5: `FocusTimerTab`** — lit `timer` et `now` du store. Affichage de `formatClock(getRemainingMs(timer, now))` en grand. Selon `timer.status` :
  - `idle` : préréglages `FOCUS_PRESETS_MINUTES` (bouton actif = durée courante), champ numérique minutes (`min`/`max` bornes, appelle `setDurationMinutes` à la saisie), bouton « Démarrer ».
  - `running` : « Pause » et « Réinitialiser ».
  - `paused` : libellé « En pause », « Reprendre » et « Réinitialiser ».
  - `done` : « Focus terminé », « Relancer » (`restart`) et « Fermer » (`reset`).
  Préréglages et champ désactivés hors `idle`. Classes Tailwind avec variantes `dark:` comme `LeftPanel`/`AgendaTab`.

- [ ] **Step 6: Registre** — ajouter l'entrée `timer` dans `tabs.js` (import de `FocusTimerTab`).

- [ ] **Step 7: Pilote dans `App.jsx`** — `const timerStatus = useFocusTimer(s => s.timer.status)` ; un `useEffect` dépendant de `timerStatus` : si `'running'`, appeler `tick(Date.now())` immédiatement puis `setInterval(() => tick(Date.now()), 1000)`, nettoyé au démontage/changement. Ne pas toucher à la boucle de 30 s existante.

- [ ] **Step 8: Vérifier**

Run: `npm test`
Expected: tous les tests PASS (existants + nouveaux).

Run: lancer l'app (`npm run dev`, ouvrir dans le navigateur) et vérifier à la main : onglet « Minuteur » présent à l'accueil et en vue chapitre ; Démarrer avec 1 min puis changer d'onglet, réduire le panneau, aller dans un chapitre : le compte à rebours continue ; à 0 un toast et une notification apparaissent une seule fois ; Pause/Reprendre/Réinitialiser/Relancer/Fermer ; préréglages et champ grisés hors repos ; durée retrouvée après rechargement.

- [ ] **Step 9: Commit**

```bash
git add src/components/focus/FocusTimerTab.jsx src/components/panel src/utils/panelPrefs.js src/utils/panelPrefs.test.js src/App.jsx
git commit -m "feat(minuteur): onglet Minuteur et pilote de compte à rebours"
```

---

### Task 4: Pastille du minuteur dans les en-têtes

**Files:**
- Create: `src/components/focus/FocusPill.jsx`
- Modify: `src/components/layout/HomePage.jsx:22-30`
- Modify: `src/components/layout/ChapterHeader.jsx:67-69`

**Interfaces:**
- Consumes : `useFocusTimer`, `getRemainingMs`, `formatClock` (Tasks 1-2), `requestOpenPanelTab` (Task 3).
- Produces : `FocusPill` (default export, sans props).

- [ ] **Step 1: Implémenter `FocusPill`** — renvoie `null` si `timer.status === 'idle'`. Sinon un `<button type="button">` compact (texte `text-xs`, fond neutre, bordure fine, dark mode) : `running` → `formatClock(restant)` avec petit point d'activité ; `paused` → `formatClock(restant)` atténué avec mention « pause » en `title` ; `done` → « Terminé » avec couleur d'accent. `aria-label="Ouvrir le minuteur"`, `onClick={() => requestOpenPanelTab('timer')}`.

- [ ] **Step 2: Accueil** — dans `HomePage.jsx`, insérer `<FocusPill />` comme enfant central du `<header>` (entre le bloc logo et le bloc profil ; le `justify-between` existant le centre dans la zone encadrée de la capture).

- [ ] **Step 3: Vue chapitre** — dans `ChapterHeader.jsx`, insérer `<FocusPill />` en tête du groupe de droite (avant le bouton « Fond : … »).

- [ ] **Step 4: Vérifier**

Run: `npm test`
Expected: PASS.

Run: `npm run dev` et vérifier à la main : aucune pastille au repos ; pastille visible à l'accueil et en vue chapitre pendant un focus, avec le même temps que l'onglet ; clic à l'accueil et en chapitre sur panneau réduit : le panneau se déploie sur « Minuteur » ; en `paused` la pastille est atténuée ; en `done` elle affiche « Terminé » jusqu'à Relancer ou Fermer ; l'en-tête ne déborde pas en fenêtre étroite.

- [ ] **Step 5: Commit**

```bash
git add src/components/focus/FocusPill.jsx src/components/layout/HomePage.jsx src/components/layout/ChapterHeader.jsx
git commit -m "feat(minuteur): pastille discrète dans les en-têtes"
```
