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

## Tests

```bash
npm test
```

Lance Vitest (`vitest run`) dans un environnement jsdom (le store lit `localStorage` des son import). Le fuseau horaire est fixe (`Europe/Paris`, defini dans `vite.config.js`) pour que les tests de dates soient deterministes. Les tests couvrent la detection de cycle du graphe (`src/utils/graph.test.js`) et l'agenda via l'API publique du store (`src/store/agenda*.test.js`). Pas de React Testing Library : les composants ne sont pas testes.

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
      QuestSidebar.jsx     - Contenu de l'onglet Quetes (ajout par clic ou drag-and-drop)
    panel/
      LeftPanel.jsx        - Panneau gauche a onglets (reductible, preferences memorisees)
      tabs.js              - Registre des onglets {id, label, component, views}
    agenda/
      AgendaTab.jsx        - Onglet Agenda : mini-calendrier, liste du jour, formulaire de creation
      AgendaSlotRow.jsx    - Ligne d'un creneau : fait, modifier, supprimer, dupliquer
      DeadlineRow.jsx      - Ligne d'une deadline de quete (lecture seule)
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
    agenda.js              - Logique pure de l'agenda (jours locaux, validation, normalisation, tri)
    agendaDeadlines.js     - Deadlines de quetes vues comme elements d'agenda
    panelPrefs.js          - Preferences du panneau gauche (cle localStorage questlife_left_panel)

## Fonctionnalites v1

- Chapitres : creation, edition, suppression, icone + couleur
- Arbre de quetes : canvas React Flow zoomable, drag-and-drop
- 3 types de quetes : standard, habitude, boss
- Dependances visuelles + detection de cycles
- Statuts auto : draft -> locked -> active -> done
- Systeme XP + 10 niveaux + 10 badges
- Navigation : switcher, breadcrumb, Echap
- Persistance LocalStorage (aucun backend requis)
- Panneau gauche a onglets et agenda de revisions (voir ci-dessous)

## Panneau gauche

Colonne laterale presente sur l'accueil et dans la vue chapitre. Chaque onglet est une entree du registre `src/components/panel/tabs.js` (`id`, `label`, `component`, `views`) ; ajouter un onglet = ajouter une entree.

- Onglets livres : **Agenda** (accueil et vue chapitre) et **Quetes** (vue chapitre uniquement, ancien `QuestSidebar`, comportement inchange). Le glisser-deposer de quetes n'est donc possible que sur l'onglet Quetes.
- Onglet par defaut : Agenda sur l'accueil, Quetes dans la vue chapitre, tant que l'utilisateur n'a pas choisi un onglet disponible dans la vue.
- Un bouton reduit le panneau (bande de 36 px) pour liberer le canvas ; le dernier onglet choisi et l'etat reduit/deploye sont memorises dans `localStorage` sous la cle `questlife_left_panel`, hors de `questlife_data`.

## Onglet Agenda

- Mini-calendrier du mois (navigation, retour a aujourd'hui, jour selectionne distinct d'aujourd'hui, point sur les jours occupes) et liste chronologique du jour dessous.
- **Creneaux de revision** : formulaire dans le panneau (sans modale) avec titre obligatoire, jour, debut, fin, chapitre optionnel et rappels optionnels (minutes avant le debut, ex. `15, 60`). Depuis la ligne d'un creneau : cocher « fait », modifier, supprimer, dupliquer a la semaine suivante (meme heure locale, +7 jours, non fait, rappels rearmes).
- Un creneau tient dans une seule journee locale (fin strictement apres le debut) ; chevauchements et creneaux passes autorises. Supprimer un chapitre conserve ses creneaux et efface seulement le lien.
- **Deadlines de quetes** : affichees en lecture seule dans la liste du jour (expirees et validees incluses, marquees comme telles). Un clic ouvre le chapitre et selectionne la quete.
- **Rappels** : meme boucle de 30 s et memes notifications (toast + notification desktop) que les deadlines de quetes, une seule fois par decalage. Ils ne fonctionnent que si l'application est ouverte.
- Aucun effet sur l'XP : « fait » ne touche ni l'XP, ni la serie, ni les objectifs hebdomadaires, ni les badges.
- Les jours sont toujours en heure locale. Donnees stockees dans le champ `agenda` de `questlife_data` ; une sauvegarde sans `agenda` reste valide et les creneaux invalides sont ignores au chargement.

Idees reportees (recurrence, XP d'agenda, rappels application fermee) : `docs/BACKLOG.md`. Decisions de cadrage : `docs/agenda-plan.md`.

## Stack

React 18 + Vite | React Flow 11 | Tailwind CSS 3 | Zustand 4 | nanoid | react-hot-toast
