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
├── utils/constants.js               # CHAPTER_COLORS, CHAPTER_ICONS, XP_LEVELS, BADGE_DEFS
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
  totalXP: number,
  level: number,        // 1–10
  badges: [{ id, label, desc, unlockedAt }],
  xpHistory: [{ questId, xp, timestamp }],
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