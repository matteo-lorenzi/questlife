# QuestLife

Application de bureau mono-utilisateur de gestion d'objectifs personnels gamifiée. L'utilisateur organise ses objectifs en chapitres de quêtes et, avec l'agenda, planifie son temps de révision.

## Objectifs

**Chapitre**:
Un grand domaine d'objectifs de l'utilisateur (ex. une matière, la santé), qui regroupe un arbre de quêtes.
_Avoid_: Matière, catégorie, projet

**Quête**:
Un objectif unique à l'intérieur d'un chapitre, qui rapporte de l'XP une fois validé.
_Avoid_: Tâche, mission, to-do

**Deadline**:
La date limite d'une quête ; la passer sans valider la quête l'expire.
_Avoid_: Échéance, date butoir

## Agenda

**Agenda**:
Le calendrier intégré où l'utilisateur planifie son emploi du temps de révisions, tous chapitres confondus.
_Avoid_: Planning, calendrier

**Créneau de révision**:
Une plage horaire que l'utilisateur réserve dans l'agenda pour réviser, qui commence et finit le même jour. Il peut être rattaché à un chapitre et marqué « fait », sans effet sur l'XP. Il appartient à l'agenda, pas à une quête.
_Avoid_: Événement, rendez-vous, séance, session

**Panneau gauche**:
La colonne latérale persistante de l'application, partagée entre l'accueil et la vue d'un chapitre, qui regroupe des onglets d'outils.
_Avoid_: Sidebar, menu latéral

**Onglet**:
Un outil affiché dans le panneau gauche (agenda aujourd'hui ; minuteur et to-do plus tard).
_Avoid_: Widget, module, section
