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

L auto-update permet a l application installee chez tes amis de recuperer les nouvelles versions sans reinstaller manuellement.

#### Comment ca fonctionne

1. QuestLife verifie les mises a jour au demarrage (en production, pas en mode dev).
2. Si une version plus recente existe sur ton serveur, elle est telechargee automatiquement.
3. Quand le telechargement est termine, l application propose de redemarrer pour installer la mise a jour.

#### Configuration

1. Definis l URL de mise a jour dans `electron/update-config.json`.
2. Le dossier cible doit etre accessible en HTTP/HTTPS depuis les PC de tes amis.
3. Optionnel: tu peux surcharger l URL avec la variable d environnement `QUESTLIFE_UPDATE_URL`.

Exemple de config:

```json
{
  "provider": "generic",
  "url": "https://ton-domaine.com/questlife-updates"
}
```

#### Comment publier une nouvelle version

1. Augmente la version dans `package.json` (ex: `1.0.0` -> `1.0.1`).
2. Genere la release:

```bash
npm run electron:build
```

3. Publie sur ton serveur de mises a jour les fichiers du dossier `release/`, au minimum:
- `latest.yml`
- `QuestLife Setup x.y.z.exe`

4. Quand tes amis ouvrent QuestLife, la nouvelle version est detectee puis proposee au redemarrage.

#### Important

- Une modification locale de ton code ne se propage pas toute seule: il faut refaire un build et republier les artefacts.
- Si l URL est invalide ou inaccessible, l app continue de fonctionner normalement, mais sans update.

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
