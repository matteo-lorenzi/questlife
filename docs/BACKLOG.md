# Backlog d'idées reportées

Idées volontairement laissées de côté, avec la raison et de quoi reprendre sans refaire l'analyse. Chaque entrée dit : ce qui est repoussé, pourquoi pas maintenant, ce qui est fait à la place, et par où reprendre.

Date de rédaction : 2026-11-05 (session de cadrage de la feature « Agenda intégré »).

---

## 1. Récurrence des créneaux de révision

**Idée.** Créer un créneau qui se répète (ex. « chaque mardi 18h–20h ») au lieu de le recréer chaque semaine.

**Pourquoi pas maintenant.** La récurrence double la complexité du modèle de l'agenda :
- Il faut une règle de répétition (fréquence, intervalle, jours, date de fin) et décider si les occurrences sont stockées ou calculées à l'affichage.
- Il faut gérer les exceptions : modifier, supprimer ou marquer « fait » **une seule** occurrence sans toucher à la série.
- Les rappels deviennent par occurrence : le suivi des rappels déjà envoyés (sur le modèle de `sentReminderOffsetsMs` des quêtes) ne peut plus être porté par le créneau seul.
- Changement d'heure : un créneau « 18h » répété chaque semaine ne doit pas être stocké en timestamp fixe, sinon il glisse d'une heure aux passages heure d'été / heure d'hiver. Cela impose de raisonner en heure locale.

**Ce qui est fait à la place (v1).** Une action « dupliquer à la semaine suivante » sur un créneau, qui copie titre, chapitre, durée et rappels à la même heure locale +7 jours.

**Pour reprendre.**
- Signal pour s'y remettre : l'utilisateur duplique à la main les mêmes créneaux semaine après semaine.
- Piste de modèle : champ `recurrence` sur le créneau (fréquence, jours, date de fin) + liste d'exceptions par date, avec expansion des occurrences sur la fenêtre affichée uniquement.
- Mettre la logique d'expansion dans `src/utils/agenda.js` (fonctions pures), à tester avec Vitest, y compris autour d'un changement d'heure.

---

## 2. XP et gamification de l'agenda

**Idée.** Récompenser le fait de réviser : XP quand un créneau est marqué « fait », série de jours de révision, objectif hebdomadaire du type « 5 h de révision cette semaine », badges.

**Pourquoi pas maintenant.** Le système d'XP actuel est entièrement bâti autour des quêtes :
- `completeQuest` / `uncompleteQuest` ajoutent et retirent l'XP via une entrée de `xpHistory` identifiée par `questId`. Un créneau n'a pas de `questId` ; il faudrait élargir ce format et la logique d'annulation.
- `checkWeeklyObjectives`, `activityLog`, la série (`streak`) et `BADGE_DEFS` comptent des quêtes terminées. Chacun devrait apprendre à compter des créneaux, ou à les ignorer explicitement.
- C'est une décision de produit avant d'être une décision technique : combien vaut une heure de révision ? Aujourd'hui 1 XP = 1 EUR virtuel affiché à l'écran, donc une règle trop généreuse fausse tout le décompte.
- Risque d'abus : cocher un créneau sans réviser rapporte de l'XP gratuit. Il faut une règle (XP seulement une fois le créneau passé, plafond par jour, XP proportionnel à la durée avec plafond…).
- Décocher un créneau doit retirer exactement l'XP accordé, comme `uncompleteQuest`.

**Ce qui est fait à la place (v1).** Un créneau a un état « fait » (case à cocher) sans aucun effet sur l'XP, la série, les objectifs hebdomadaires ou les badges.

**Pour reprendre.**
- Trancher d'abord la règle de gain et la règle anti-abus.
- Piste technique : ajouter un champ `slotId` aux entrées de `xpHistory` (en plus de `questId`), adapter l'annulation, puis ajouter un type d'objectif hebdomadaire « heures de révision ».
- Garder la comptabilité des créneaux dans `src/utils/agenda.js` (pure) pour que le calcul d'XP soit testable sans interface.

---

## 3. Vue semaine de l'agenda

**Idée.** Afficher plusieurs jours côte à côte (colonnes Lun, Mar…) dans une grille horaire, comme un calendrier hebdomadaire classique.

**Pourquoi pas maintenant.** Le panneau gauche fait 256 px : une grille multi-jours y serait illisible. Il faudrait un panneau élargissable ou une vue plein écran dédiée.

**Ce qui est fait à la place.** Une grille horaire d'une seule journée (le jour sélectionné dans le mini-calendrier), sous le calendrier.

**Pour reprendre.**
- Réutiliser le calcul de mise en page de la grille du jour (placement par heure, chevauchements) en le rendant indépendant du nombre de colonnes.
- Décider d'abord où vit la vue : panneau élargissable, ou page d'agenda à part.

---

## 4. Limite connue : rappels uniquement application ouverte

Les rappels de créneaux utilisent le circuit de notifications desktop existant, vérifié toutes les 30 s dans l'application. Ils ne se déclenchent donc **que si QuestLife est ouvert**, comme les alarmes de deadline des quêtes. Pour des rappels application fermée, il faudrait un service en arrière-plan côté Electron (planificateur dans le processus principal ou tâche système) ; c'est hors périmètre de la feature Agenda.

---

## 5. XP, historique et stats du minuteur de focus

**Idée.** Récompenser les focus terminés : XP, historique (focus du jour, durée cumulée), série, objectif hebdomadaire « X h de focus », badges, rattachement d'un focus à un chapitre, une quête ou un créneau de révision.

**Pourquoi pas maintenant.** Mêmes raisons que l'XP de l'agenda (§2) :
- Le système d'XP est bâti sur les quêtes (`xpHistory` identifié par `questId`) ; un focus n'a pas d'identifiant équivalent.
- Règle de gain et règle anti-abus à trancher d'abord : lancer un minuteur sans travailler ne doit pas rapporter d'XP (durée minimale, plafond par jour, focus interrompu non compté…).
- Un historique impose de persister les focus dans `questlife_data` et de définir ce qu'est un focus « terminé » (pause, reset, fermeture de l'app).
- Le lien avec un chapitre, une quête ou un créneau élargit les modèles de ces entités.

**Ce qui est fait à la place (v1).** Minuteur autonome : un focus terminé ne laisse aucune trace et n'a aucun effet sur l'XP, la série, les objectifs hebdomadaires ni les badges.

**Pour reprendre.**
- Signal pour s'y remettre : tu veux voir combien de temps tu as réellement focalisé sur la semaine.
- Trancher d'abord la règle de gain et la règle anti-abus, en cohérence avec §2.
- Garder le calcul (cumul, plafond) dans une fonction pure testable, hors interface.
