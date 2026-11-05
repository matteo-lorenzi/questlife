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
La date limite d'une quête ; la passer sans valider la quête l'expire. Elle apparaît aussi dans l'agenda, en lecture seule (voir **Agenda**).
_Avoid_: Échéance, date butoir

## Agenda

**Agenda**:
Le calendrier intégré où l'utilisateur planifie son emploi du temps de révisions, tous chapitres confondus. Il affiche, pour un jour choisi dans un mini-calendrier du mois, les créneaux de révision et les deadlines de quêtes (lecture seule, expirées incluses, marquées comme telles ; un clic ouvre le chapitre et sélectionne la quête). Les jours sont en heure locale.
_Avoid_: Planning, calendrier

**Créneau de révision**:
Une plage horaire que l'utilisateur réserve dans l'agenda pour réviser, qui commence et finit le même jour. Il peut être rattaché à un chapitre (le supprimer conserve le créneau et efface le lien) et marqué « fait », sans effet sur l'XP, la série, les objectifs hebdomadaires ni les badges. Il peut être modifié, supprimé, ou dupliqué à la semaine suivante (même heure locale, +7 jours). Il appartient à l'agenda, pas à une quête.
_Avoid_: Événement, rendez-vous, séance, session

**Rappel**:
Une notification (toast et notification desktop) émise un certain nombre de minutes avant le début d'un créneau de révision, une seule fois par décalage. Vérifiée toutes les 30 s comme les deadlines : elle ne part que si l'application est ouverte. Jamais pour un créneau déjà commencé ou « fait ».
_Avoid_: Alarme, alerte

**Panneau gauche**:
La colonne latérale persistante de l'application, partagée entre l'accueil et la vue d'un chapitre, qui regroupe des onglets d'outils. Elle peut être réduite ; l'onglet choisi et l'état réduit sont mémorisés à part des données de jeu.
_Avoid_: Sidebar, menu latéral

**Onglet**:
Un outil affiché dans le panneau gauche : « Agenda » (accueil et vue chapitre) et « Quêtes » (vue chapitre, ajout de quêtes au clic ou par glisser-déposer). Minuteur et to-do plus tard.
_Avoid_: Widget, module, section
