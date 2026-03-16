# QuestLife

Application web de gestion d objectifs personnels gamifiee, inspiree du mod FTB Quests.

## Prerequis

- Node.js 18+ (https://nodejs.org)
- npm 9+

## Installation

```bash
cd questlife
npm install
npm run dev
```

Application disponible sur http://localhost:5173

## Build production

```bash
npm run build
npm run preview
```

## Version application de bureau (Windows)

Cette version permet de distribuer QuestLife sous forme d installeur `.exe`.

### Developpement desktop

```bash
npm run electron:dev
```

### Generer un installeur Windows (.exe)

```bash
npm run electron:build
```

Le fichier installeur est genere dans `release/`.

### Build signe (Code Signing Windows)

Le build signe utilise les variables standard `CSC_LINK` et `CSC_KEY_PASSWORD`.

Exemple PowerShell:

```powershell
$env:CSC_LINK = "file:///C:/certs/questlife-signing.pfx"
$env:CSC_KEY_PASSWORD = "ton-mot-de-passe"
npm run electron:build:signed
```

Si ces variables sont absentes, le script s arrete avec erreur.

### Generer une version portable (sans install)

```bash
npm run electron:build:dir
```

Le binaire est genere dans `release/win-unpacked/`.

### Auto-update

1. Configure l URL de mise a jour dans `electron/update-config.json`.
2. Heberge le contenu de `release/` (au minimum `latest.yml` + le setup `.exe`) sur cette URL.
3. Au lancement de l application installee, QuestLife verifie automatiquement les mises a jour.

Option: tu peux surcharger l URL via la variable d environnement `QUESTLIFE_UPDATE_URL`.

## Initialiser un repo GitHub

```bash
git init
git add .
git commit -m "feat: QuestLife v1.0 initial"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/questlife.git
git push -u origin main
```

## Structure

src/
  App.jsx                  - Routeur principal
  index.css                - Styles globaux + Tailwind
  assets/icons/
    ChapterIcon.jsx        - 16 icones SVG chapitres
  components/
    ui/index.jsx           - Composants UI (Button, Modal, Input)
    chapters/
      ChapterCard.jsx      - Carte chapitre (accueil)
      ChapterModal.jsx     - Modal creation/edition chapitre
    quest/
      QuestNode.jsx        - Noeud React Flow
      QuestSidebar.jsx     - Sidebar drag-and-drop
    editor/
      QuestPanel.jsx       - Panel editeur droit
    layout/
      HomePage.jsx         - Accueil (grille chapitres)
      ChapterHeader.jsx    - Header vue arbre
      CanvasView.jsx       - Canvas React Flow principal
    navigation/
      ChapterSwitcher.jsx  - Dropdown navigation rapide
  store/
    useStore.js            - Zustand + LocalStorage
  utils/
    constants.js           - Couleurs, icones, niveaux, badges
    graph.js               - Detection cycle, calcul statuts

## Fonctionnalites v1

- Chapitres : creation, edition, suppression, icone + couleur
- Arbre de quetes : canvas React Flow zoomable, drag-and-drop
- 3 types de quetes : standard, habitude, boss
- Dependances visuelles + detection de cycles
- Statuts auto : draft -> locked -> active -> done
- Systeme XP + 10 niveaux + 10 badges
- Navigation : switcher, breadcrumb, Echap
- Persistance LocalStorage (aucun backend requis)

## Stack

React 18 + Vite | React Flow 11 | Tailwind CSS 3 | Zustand 4 | nanoid | react-hot-toast
