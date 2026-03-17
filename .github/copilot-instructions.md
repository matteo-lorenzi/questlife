# QuestLife — Instructions Copilot

## Projet

Application web de gestion d'objectifs personnels gamifiée, inspirée du mod FTB Quests (Minecraft). L'utilisateur organise ses objectifs en **chapitres** (ex : Santé, Carrière), chaque chapitre contenant un **arbre de quêtes** avec dépendances visuelles. Compléter des quêtes rapporte des XP et débloque des badges.

Usage : mono-utilisateur, usage personnel, 100 % front-end. Pas de backend, pas d'auth en v1.

---

## Stack

| Rôle | Lib |
|---|---|
| Framework | React 18 + Vite |
| Canvas / graphe | React Flow 11 |
| State global | Zustand 4 |
| Style | Tailwind CSS 3 |
| Persistance | LocalStorage (`questlife_data`) |
| IDs | nanoid |
| Toasts | react-hot-toast |

---

## Structure des fichiers

```
src/
├── App.jsx                          # Routeur + toasts + raccourcis clavier
├── store/useStore.js                # Store Zustand unique (chapitres, quêtes, profil)
├── utils/constants.js               # CHAPTER_COLORS, CHAPTER_ICONS, XP_LEVELS, BADGE_DEFS, WEEKLY_OBJECTIVES
├── utils/graph.js                   # wouldCreateCycle(), recomputeStatuses(), getDependents()
├── assets/icons/ChapterIcon.jsx     # SVG icons renderer
└── components/
    ├── ui/index.jsx                 # Btn, Modal, ConfirmModal, ProgressBar, Input, Textarea
    ├── chapters/ChapterCard.jsx     # Carte chapitre avec menu contextuel
    ├── chapters/ChapterModal.jsx    # Modal création/édition chapitre
    ├── quest/QuestNode.jsx          # Nœud React Flow (mémoïsé)
    ├── quest/QuestSidebar.jsx       # Sidebar drag-source (3 types)
    ├── editor/QuestPanel.jsx        # Panel éditeur droit (slide-in)
    ├── navigation/ChapterSwitcher.jsx # Dropdown navigation rapide
    ├── profile/ProfilePage.jsx      # Page compte utilisateur (pseudo, XP, badges, stats)
    ├── profile/WeeklyObjectives.jsx # Objectifs hebdomadaires rotatifs avec bonus XP
    ├── profile/ActivityChart.jsx    # Graphique activité 7 jours + série quotidienne
    ├── layout/HomePage.jsx          # Page d'accueil grille chapitres
    ├── layout/ChapterHeader.jsx     # Header vue arbre
    └── layout/CanvasView.jsx        # React Flow canvas principal
```

---

## Modèle de données

### Chapter
```js
{
  id: string,           // nanoid
  title: string,        // obligatoire
  description?: string,
  color: { bg: string, accent: string }, // parmi CHAPTER_COLORS
  icon: string,         // clé parmi CHAPTER_ICONS (16 valeurs)
  order: number,
  createdAt: number,    // timestamp
  archivedAt?: number,
}
```

### Quest
```js
{
  id: string,
  chapterId: string,
  title: string,
  description?: string,
  xp: number,           // défaut 50, min 0, max 9999
  status: 'draft' | 'locked' | 'active' | 'done',
  type: 'standard' | 'habit' | 'boss',
  dependencies: string[], // IDs des quêtes prérequises
  position: { x: number, y: number },
  completedAt?: number,
}
```

### UserProfile
```js
{
  pseudo: string,             // Pseudonyme choisi par l'utilisateur (pas de vraie identité)
  totalXP: number,
  level: number,              // 1–10
  badges: [{ id, label, desc, unlockedAt }],
  xpHistory: [{ questId, xp, timestamp }],
  streak: {
    current: number,          // Jours consécutifs avec au moins 1 quête complétée
    longest: number,          // Record historique
    lastActiveDate: string,   // ISO date (YYYY-MM-DD) du dernier jour actif
  },
  weeklyObjectives: {
    weekKey: string,          // Format "YYYY-Wnn" pour identifier la semaine
    objectives: WeeklyObjective[],
  },
  activityLog: [{ date: string, count: number }], // 90 derniers jours max
}
```

### WeeklyObjective
```js
{
  id: string,
  label: string,        // Description de l'objectif
  bonusXP: number,      // XP bonus accordés à la complétion de l'objectif
  target: number,       // Valeur cible (ex : 3 quêtes)
  progress: number,     // Avancement actuel
  done: boolean,
}
```

---

## Store Zustand — API principale

```js
const {
  // Chapitres
  chapters, setActiveChapter(id), openChapterModal(chapter?),
  createChapter(data), updateChapter(id, data), deleteChapter(id),

  // Quêtes
  quests, getChapterQuests(chapterId),
  createQuest(chapterId, position, type),
  updateQuest(id, data), completeQuest(id), deleteQuest(id),
  redirectAndDeleteQuest(id, replacementId),
  addDependency(questId, depId), removeDependency(questId, depId),
  updateQuestPosition(id, position),

  // UI
  activeChapterId, selectedQuestId, isPanelOpen,
  selectQuest(id), closePanel(),
  saveViewport(chapterId, viewport), canvasViewports,

  // Profil
  profile,
  updatePseudo(pseudo),           // Met à jour le pseudonyme (validation : 2–20 chars, alphanum + _-)
  getWeeklyObjectives(),          // Retourne ou génère les objectifs de la semaine courante
  checkWeeklyObjectives(),        // Appelé après chaque completeQuest() pour mettre à jour la progression
  updateStreak(),                 // Appelé après chaque completeQuest() pour maintenir la série
} = useStore()
```

Toute modification appelle `get()._persist()` automatiquement → pas besoin de sauvegarder manuellement.

---

## Règles métier critiques

**Statuts des quêtes :**
- `draft` → nœud venant d'être créé, titre vide. Supprimé silencieusement si panel fermé sans titre.
- `locked` → au moins un prérequis n'est pas `done`
- `active` → tous les prérequis sont `done` (ou aucun prérequis)
- `done` → marquée manuellement. **Irréversible.**

**Recalcul automatique :** après toute modification de dépendance ou complétion, appeler `recomputeStatuses(chapterQuests)` depuis `utils/graph.js`.

**Détection de cycle :** avant d'accepter un lien A→B (A est prérequis de B), appeler `wouldCreateCycle(quests, A, B)`. Si `true`, rejeter et émettre `window.dispatchEvent(new CustomEvent('questlife:toast', { detail: { msg: '...', type: 'error' } }))`.

**XP :** crédités au profil à la complétion uniquement. Jamais retirés, même si la quête est supprimée ensuite.

**Suppression avec dépendants :** si la quête supprimée est prérequis d'autres quêtes, proposer :
- Option A : supprimer les liens (les dépendantes se déverrouillent)
- Option B : rediriger les liens vers un nœud de remplacement

---

## Module Compte (ProfilePage)

### Principe RGPD / vie privée
Le module compte ne collecte **aucune donnée personnelle** au sens du RGPD. Seul un **pseudonyme** librement choisi est stocké localement (localStorage). Pas d'email, pas de nom réel, pas de téléphone, pas d'identifiant externe, pas de synchronisation distante.

### Contenu de la page Compte

| Section | Contenu |
|---|---|
| Hero | Avatar initiales (générées depuis le pseudo), pseudonyme éditable, niveau + titre RPG, barre XP vers niveau suivant |
| Stats | Quêtes réalisées / total, XP total cumulé, nombre de badges débloqués |
| Activité | Graphique en barres sur 7 jours + compteur de série quotidienne |
| Objectifs hebdo | 4 défis rotatifs avec bonus XP, réinitialisés chaque semaine (lundi) |
| Progression chapitres | Barre par chapitre avec couleur d'accent + compteur x/total |
| Badges | Grille : débloqués en couleur, verrouillés en grisé (pour créer l'envie) |

### Pseudonyme
- Saisie libre par l'utilisateur, modifiable à tout moment
- Validation : 2–20 caractères, lettres, chiffres, `_` et `-` autorisés
- Valeur par défaut : `"Aventurier"` à la première ouverture
- L'avatar affiche les 2 premières lettres du pseudo en majuscules

### Série quotidienne (streak)
- Incrémentée si au moins 1 quête est complétée dans la journée calendaire
- Remise à zéro si aucune quête n'est complétée la veille
- `updateStreak()` doit être appelé dans `completeQuest()` après le crédit XP
- Comparer `lastActiveDate` avec `today` (format ISO YYYY-MM-DD) :
  - Si `today` = `lastActiveDate` → déjà compté aujourd'hui, ne pas incrémenter
  - Si `today` = `lastActiveDate + 1 jour` → `current++`, mettre à jour `lastActiveDate`
  - Sinon → `current = 1`, mettre à jour `lastActiveDate`

### Objectifs hebdomadaires
- Générés automatiquement chaque semaine (lundi = début de semaine, clé `YYYY-Wnn`)
- Si `weeklyObjectives.weekKey` ≠ semaine courante → régénérer 4 objectifs depuis `WEEKLY_OBJECTIVES_POOL`
- `checkWeeklyObjectives()` appelé après chaque `completeQuest()` — met à jour `progress` et `done`, crédite le bonus XP si `done` passe à `true`
- Le bonus XP des objectifs hebdo est crédité une seule fois (idempotent)

### Pool d'objectifs hebdomadaires (`WEEKLY_OBJECTIVES_POOL` dans `utils/constants.js`)
```js
[
  { id: 'w_3quests',   label: 'Compléter 3 quêtes cette semaine',    bonusXP: 50,  target: 3,  type: 'questCount' },
  { id: 'w_5quests',   label: 'Compléter 5 quêtes cette semaine',    bonusXP: 100, target: 5,  type: 'questCount' },
  { id: 'w_streak3',   label: 'Maintenir une série de 3 jours',      bonusXP: 75,  target: 3,  type: 'streak' },
  { id: 'w_streak5',   label: 'Maintenir une série de 5 jours',      bonusXP: 150, target: 5,  type: 'streak' },
  { id: 'w_boss',      label: 'Compléter une quête de type boss',    bonusXP: 100, target: 1,  type: 'bossQuest' },
  { id: 'w_chapter',   label: 'Compléter un chapitre entier',        bonusXP: 150, target: 1,  type: 'chapterDone' },
  { id: 'w_xp200',     label: 'Gagner 200 XP cette semaine',         bonusXP: 80,  target: 200, type: 'weeklyXP' },
  { id: 'w_newquest',  label: 'Créer 2 nouvelles quêtes',            bonusXP: 30,  target: 2,  type: 'questCreated' },
]
```
Chaque semaine, tirer 4 objectifs au hasard parmi ce pool (sans doublons).

---

## Badges — déclencheurs

Les badges sont vérifiés via `get()._checkBadges()` après chaque `completeQuest()` et `createChapter()`. Les définitions sont dans `BADGE_DEFS` (`utils/constants.js`). Un badge déclenche un event `questlife:badge` capté dans `App.jsx` pour afficher un toast custom.

---

## Conventions de code

- **Composants** : fonctionnels, hooks uniquement, pas de classes
- **Nœud React Flow** : toujours `memo()` pour les performances
- **Styles** : Tailwind utilitaires. Pour les couleurs dynamiques (accent de chapitre), utiliser `style={{ color: chapter.color.accent }}` — Tailwind ne supporte pas les valeurs dynamiques à la compilation
- **Animations** : classes CSS custom dans `index.css` (`animate-fadeIn`, `animate-slideInRight`, `animate-scaleIn`, `animate-slideInUp`)
- **Events globaux** : `questlife:toast` et `questlife:badge` sur `window` pour découpler les toasts des composants
- **Pas de `useEffect` pour la persistance** : c'est géré dans le store via `_persist()`
- **Icônes** : toujours SVG inline, jamais d'emoji comme icône UI

---

## Comportements UX importants

- **Panel droit** : s'ouvre au clic sur un nœud, se ferme avec `Echap` ou clic sur le canvas
- **Fermeture du panel** = sauvegarde automatique (appeler `saveField()` ou `updateQuest()`)
- **Nœud draft** : si panel fermé avec titre vide → `deleteQuest(id)` silencieux
- **Canvas** : position + zoom mémorisés par chapitre dans `canvasViewports`, restaurés à la réouverture
- **Échap** : 1er appui = ferme panel, 2e appui = retour accueil (`setActiveChapter(null)`)
- **Drop sur canvas** : lire `e.dataTransfer.getData('quest_type')`, convertir coords avec `rfInstance.screenToFlowPosition()`
- **Page Compte** : accessible depuis un bouton/icône dans le header de la page d'accueil. Pas de route dédiée en v1 — affichage en modal pleine page ou panneau latéral.

---

## Palette de couleurs disponibles

```js
// Depuis utils/constants.js — CHAPTER_COLORS
[
  { id: 'teal',   bg: '#E1F5EE', accent: '#1D9E75' },
  { id: 'blue',   bg: '#E6F1FB', accent: '#378ADD' },
  { id: 'purple', bg: '#EEEDFE', accent: '#7F77DD' },
  { id: 'amber',  bg: '#FAEEDA', accent: '#EF9F27' },
  { id: 'coral',  bg: '#FAECE7', accent: '#D85A30' },
  { id: 'pink',   bg: '#FBEAF0', accent: '#D4537E' },
  { id: 'red',    bg: '#FCEBEB', accent: '#E24B4A' },
  { id: 'gray',   bg: '#F1EFE8', accent: '#888780' },
]
```

Toujours utiliser `chapter.color.bg` pour les fonds clairs et `chapter.color.accent` pour les textes, bordures et icônes colorées.
