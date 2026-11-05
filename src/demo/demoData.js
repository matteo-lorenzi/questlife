// Jeu de données de démonstration : un usage complet de l'app dès l'ouverture,
// avec des cas limites volontaires pour repérer ce qui casse dans l'UX / l'UI.
//
// Fonction pure : tout est calculé à partir de `now` (jours et heures relatifs à
// « maintenant »), donc l'agenda, les deadlines et les rappels restent pertinents.
// Ne dépend d'aucun store (il doit pouvoir s'exécuter avant leur initialisation).
import {
  CHAPTER_COLORS,
  BADGE_DEFS,
  QUEST_STATUS as S,
  QUEST_TYPE as T,
  WEEKLY_OBJECTIVES_POOL,
  getLevelFromXP,
} from "../utils/constants";
import { recomputeStatuses } from "../utils/graph";
import { localDayKey, localTimestamp, shiftLocalDays } from "../utils/agenda";

const MIN = 60e3;
const HOUR = 3600e3;
const DAY_MS = 24 * HOUR;

// Même calcul que la clé de semaine du store : le test d'hydratation garde les deux alignés.
function weekKeyOf(ts) {
  const date = new Date(ts);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

const isoUTC = (ts) => new Date(ts).toISOString().slice(0, 10);

// Petites images SVG intégrées (data URL) : aucune ressource externe.
function svgAttachment(id, name, fill) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">` +
    `<rect width="120" height="80" fill="${fill}"/><text x="8" y="46" font-size="14" fill="#fff">${name}</text></svg>`;
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return { id, name, type: "image/svg+xml", size: dataUrl.length, dataUrl };
}

export function buildDemoData(now = Date.now()) {
  const dayKey = (n) => localDayKey(shiftLocalDays(now, n));
  const at = (n, hm) => localTimestamp(dayKey(n), hm);
  // Complétions « du jour » : jamais avant minuit local, jamais dans le futur.
  const startOfToday = at(0, "00:00");
  const earlierToday = (ms) => Math.max(startOfToday, now - ms);

  // ── Chapitres ──────────────────────────────────────────────────────────────
  const chapterDefs = [
    ["demo-ch-droit", "Licence de droit", "Révisions et partiels du semestre", "learn", 1],
    ["demo-ch-sport", "Santé & Sport", "Objectifs physiques et bien-être", "health", 0],
    ["demo-ch-lecture", "Lecture 2026", "Chapitre terminé à 100 %", "book", 3],
    [
      "demo-ch-code",
      "Projet de fin d'études : étude comparative des architectures événementielles et de leurs compromis 🚀",
      "Un titre volontairement très long pour tester les débordements.",
      "code",
      2,
    ],
    ["demo-ch-japon", "Voyage au Japon 🇯🇵", "Chapitre sans aucune quête.", "travel", 4],
    ["demo-ch-monstre", "Chapitre monstre (120 quêtes)", "Test de volume : défilement et performance.", "nature", 7],
  ];
  const chapters = chapterDefs.map(([id, title, description, icon, colorIdx], order) => {
    const c = CHAPTER_COLORS[colorIdx];
    return {
      id,
      title,
      description,
      color: { bg: c.bg, bgDark: c.bgDark, accent: c.accent },
      icon,
      order,
      createdAt: now - (60 - order * 5) * DAY_MS,
      archivedAt: null,
    };
  });

  // ── Quêtes ─────────────────────────────────────────────────────────────────
  const quests = [];
  const quest = (id, chapterId, title, pos, o = {}) => {
    quests.push({
      id,
      chapterId,
      title,
      description: "",
      xp: 50,
      status: S.ACTIVE,
      type: T.STANDARD,
      dependencies: [],
      position: { x: pos[0], y: pos[1] },
      checklistItems: [],
      attachments: [],
      deadlineAt: null,
      deadlineMode: "none",
      durationMs: null,
      reminderOffsetsMs: [],
      sentReminderOffsetsMs: [],
      expiredAt: null,
      disabledReason: null,
      completedAt: null,
      ...o,
    });
  };
  const done = (completedAt) => ({ status: S.DONE, completedAt });
  const withDeadline = (deadlineAt, reminderOffsetsMs = []) => ({
    deadlineAt,
    deadlineMode: "absolute",
    reminderOffsetsMs,
    // Rappels déjà dus à l'ouverture : marqués envoyés (pas de rafale de notifications).
    sentReminderOffsetsMs: reminderOffsetsMs.filter((off) => deadlineAt - off <= now),
  });
  const checklist = (prefix, total, doneCount) =>
    Array.from({ length: total }, (_, i) => ({
      id: `${prefix}-${i + 1}`,
      label: `Étape ${i + 1}`,
      done: i < doneCount,
    }));

  // Licence de droit : 5 statuts, un diamant (d4 dépend de d2 et d3), deadlines variées.
  quest("demo-d1", "demo-ch-droit", "Lire le cours de droit civil", [80, 160], {
    xp: 40, ...done(now - 12 * DAY_MS),
  });
  quest("demo-d2", "demo-ch-droit", "Fiches de révision : obligations", [320, 80], {
    xp: 40, dependencies: ["demo-d1"], ...done(earlierToday(2 * HOUR)),
  });
  quest("demo-d3", "demo-ch-droit", "Fiche d'arrêts de principe", [320, 240], {
    xp: 40, dependencies: ["demo-d1"], ...done(earlierToday(90 * MIN)),
  });
  quest("demo-d4", "demo-ch-droit", "Dissertation blanche", [560, 160], {
    xp: 100,
    description: "Sujet : la force obligatoire du contrat ⚖️ — rédaction complète en 4 heures.",
    dependencies: ["demo-d2", "demo-d3"],
    checklistItems: checklist("demo-d4-c", 5, 3),
    attachments: [
      svgAttachment("demo-att-1", "plan.svg", "#378ADD"),
      svgAttachment("demo-att-2", "sujet.svg", "#7F77DD"),
      svgAttachment("demo-att-3", "corrige.svg", "#1D9E75"),
    ],
    ...withDeadline(at(3, "18:00"), [24 * HOUR, HOUR]),
  });
  quest("demo-d5", "demo-ch-droit", "Colle de contrats", [560, 320], {
    xp: 60,
    description: "Checklist pleine (30 éléments) pour tester le défilement.",
    dependencies: ["demo-d1"],
    checklistItems: checklist("demo-d5-c", 30, 12),
    ...withDeadline(now + 3 * HOUR, [30 * MIN, 10 * MIN]),
  });
  quest(
    "demo-d6",
    "demo-ch-droit",
    "Préparer et réussir l'examen final de droit des obligations, des contrats et de la responsabilité civile (session de janvier)",
    [800, 240],
    {
      xp: 250,
      type: T.BOSS,
      dependencies: ["demo-d4", "demo-d5"],
      ...withDeadline(now + 21 * DAY_MS, [7 * DAY_MS]),
    },
  );
  quest("demo-d7", "demo-ch-droit", "Mémo juridique (brouillon)", [80, 340], {
    status: S.DRAFT, description: "Idée pas encore planifiée.",
  });
  quest("demo-d8", "demo-ch-droit", "Rendre le TD n°3", [320, 400], {
    status: S.EXPIRED,
    deadlineAt: at(-1, "18:00"),
    deadlineMode: "absolute",
    expiredAt: at(-1, "18:00"),
    disabledReason: "deadline_missed",
  });
  quest("demo-d9", "demo-ch-droit", "Dossier de bourse", [80, 460], {
    status: S.EXPIRED,
    deadlineAt: at(-3, "09:00"),
    deadlineMode: "absolute",
    expiredAt: at(-3, "09:00"),
    disabledReason: "deadline_missed",
  });
  quest("demo-d10", "demo-ch-droit", "Suite du dossier de bourse", [320, 520], {
    dependencies: ["demo-d9"],
  });
  quest("demo-d11", "demo-ch-droit", "Quiz du matin", [560, 480], {
    xp: 20, ...withDeadline(at(1, "05:30")),
  });
  quest("demo-d12", "demo-ch-droit", "Clôture des inscriptions au partiel", [800, 440], {
    xp: 20, ...withDeadline(at(1, "23:00")),
  });

  // Santé & Sport
  quest("demo-s1", "demo-ch-sport", "Marche 30 min", [80, 160], {
    xp: 60, type: T.HABIT, ...done(earlierToday(30 * MIN)),
  });
  quest("demo-s2", "demo-ch-sport", "Course 5 km", [320, 100], { xp: 100, dependencies: ["demo-s1"] });
  quest("demo-s3", "demo-ch-sport", "Yoga 3 séances", [320, 240], {
    xp: 75, type: T.HABIT, dependencies: ["demo-s1"], checklistItems: checklist("demo-s3-c", 3, 1),
  });
  quest("demo-s4", "demo-ch-sport", "Semi-marathon", [560, 170], {
    xp: 250, type: T.BOSS, dependencies: ["demo-s2", "demo-s3"],
  });
  quest("demo-s5", "demo-ch-sport", "Bilan médical", [80, 320], { xp: 30, ...done(now - 20 * DAY_MS) });
  quest("demo-s6", "demo-ch-sport", "Dormir 8 h toute la semaine", [320, 380], { xp: 40, type: T.HABIT });

  // Lecture 2026 : chapitre terminé à 100 % (badge « Maître du chapitre »).
  [
    ["demo-l1", "Un roman classique", 30],
    ["demo-l2", "Un essai", 30],
    ["demo-l3", "Une BD", 30],
    ["demo-l4", "Un recueil de poèmes", 30],
  ].forEach(([id, title, xp], i) =>
    quest(id, "demo-ch-lecture", title, [80 + i * 200, 120], { xp, ...done(now - (30 - i * 3) * DAY_MS) }),
  );
  quest("demo-l5", "demo-ch-lecture", "Lire 12 romans", [880, 120], {
    xp: 150,
    type: T.BOSS,
    dependencies: ["demo-l1", "demo-l2", "demo-l3", "demo-l4"],
    ...done(now - 10 * DAY_MS),
  });

  // Projet de fin d'études
  quest("demo-c1", "demo-ch-code", "Choisir la stack technique", [80, 160], { ...done(now - 15 * DAY_MS) });
  quest("demo-c2", "demo-ch-code", "Maquette de l'interface", [320, 160], {
    xp: 80, dependencies: ["demo-c1"], ...withDeadline(now + 6 * DAY_MS, [DAY_MS]),
  });
  quest("demo-c3", "demo-ch-code", "Prototype fonctionnel", [560, 160], { xp: 120, dependencies: ["demo-c2"] });
  quest("demo-c4", "demo-ch-code", "Soutenance", [800, 160], {
    xp: 300, type: T.BOSS, dependencies: ["demo-c3"],
  });
  quest("demo-c5", "demo-ch-code", "Idées bonus", [320, 320], { status: S.DRAFT });

  // Chapitre monstre : 120 quêtes en grille 12 × 10, chaque ligne dépend de la précédente.
  for (let i = 0; i < 120; i += 1) {
    quest(`demo-m${String(i + 1).padStart(3, "0")}`, "demo-ch-monstre", `Quête monstre ${String(i + 1).padStart(3, "0")}`,
      [(i % 12) * 240 + 80, Math.floor(i / 12) * 130 + 80],
      {
        xp: 10,
        dependencies: i >= 12 ? [`demo-m${String(i - 11).padStart(3, "0")}`] : [],
        ...(i < 6 ? done(now - (40 - i) * DAY_MS) : {}),
      },
    );
  }

  const coherentQuests = recomputeStatuses(quests);

  // ── Profil (cohérent avec les quêtes terminées) ─────────────────────────────
  const xpHistory = coherentQuests
    .filter((q) => q.status === S.DONE)
    .map((q) => ({ questId: q.id, xp: q.xp, timestamp: q.completedAt }));
  const bonus = { questId: null, xp: 50, timestamp: earlierToday(20 * MIN) }; // objectif « 3 quêtes » validé
  xpHistory.push(bonus);
  xpHistory.sort((a, b) => a.timestamp - b.timestamp);
  const totalXP = xpHistory.reduce((n, h) => n + h.xp, 0);
  const level = getLevelFromXP(totalXP).level;

  const todayDone = coherentQuests.filter(
    (q) => q.status === S.DONE && q.completedAt >= startOfToday,
  );
  const todayXP = todayDone.reduce((n, q) => n + q.xp, 0) + bonus.xp;
  const pool = (id) => WEEKLY_OBJECTIVES_POOL.find((o) => o.id === id);
  const objective = (id, progress) => {
    const o = pool(id);
    const p = Math.min(o.target, progress);
    return { id: o.id, label: o.label, bonusXP: o.bonusXP, target: o.target, type: o.type, progress: p, done: p >= o.target };
  };

  const doneCount = coherentQuests.filter((q) => q.status === S.DONE).length;
  const stats = {
    totalXP,
    level,
    totalCompleted: doneCount,
    bossCompleted: coherentQuests.filter((q) => q.status === S.DONE && q.type === T.BOSS).length,
    totalChapters: chapters.length,
    chapterCompleted: chapters.filter((c) => {
      const cq = coherentQuests.filter((q) => q.chapterId === c.id && q.status !== S.DRAFT);
      return cq.length > 0 && cq.every((q) => q.status === S.DONE);
    }).length,
  };
  const badges = BADGE_DEFS.filter((b) => b.trigger(stats)).map((b, i) => ({
    id: b.id,
    label: b.label,
    desc: b.desc,
    unlockedAt: now - (30 - i * 3) * DAY_MS,
  }));

  const activityLog = [];
  for (let i = 0; i < 30; i += 1) {
    // Série en cours : jours 0 à 5 actifs, trou au jour 6, puis activité éparse.
    const count = i === 0 ? todayDone.length : i < 6 ? 1 + (i % 3) : i === 6 ? 0 : (i * 7) % 4;
    if (count > 0) activityLog.push({ date: isoUTC(now - i * DAY_MS), count });
  }
  activityLog.reverse();

  const profile = {
    pseudo: "Aventurier démo",
    totalXP,
    level,
    badges,
    xpHistory,
    // current = jours 0 à 5 de activityLog (6 jours consécutifs) ; longest ≥ current.
    streak: { current: 6, longest: 14, lastActiveDate: isoUTC(now) },
    weeklyObjectives: {
      weekKey: weekKeyOf(now),
      objectives: [
        objective("w_3quests", todayDone.length),
        objective("w_5quests", todayDone.length),
        objective("w_boss", 0),
        objective("w_xp200", todayXP),
      ],
    },
    activityLog,
  };

  // ── Agenda ──────────────────────────────────────────────────────────────────
  const slots = [];
  const slot = (id, n, from, to, title, o = {}) => {
    const startAt = at(n, from);
    const reminderOffsetsMs = o.reminders ?? [];
    slots.push({
      id,
      title,
      startAt,
      endAt: at(n, to),
      chapterId: o.chapterId ?? null,
      done: o.done === true,
      reminderOffsetsMs,
      sentReminderOffsetsMs: reminderOffsetsMs.filter((off) => startAt - off <= now),
      createdAt: startAt - 2 * DAY_MS,
    });
  };
  // Aujourd'hui : journée dense, chevauchements jusqu'à 4 colonnes, créneau tronqué en fin de grille.
  slot("demo-a01", 0, "07:30", "09:00", "Révision droit civil", { chapterId: "demo-ch-droit", done: true });
  slot("demo-a02", 0, "09:00", "10:30", "TD droit des contrats", { chapterId: "demo-ch-droit" });
  slot("demo-a03", 0, "10:00", "11:30", "Fiche d'arrêts", { chapterId: "demo-ch-droit" });
  slot("demo-a04", 0, "10:15", "11:00", "Footing léger", { chapterId: "demo-ch-sport" });
  slot("demo-a05", 0, "10:30", "12:00", "Appel avec le mentor");
  slot("demo-a06", 0, "14:00", "15:30", "Rédaction du mémoire", { chapterId: "demo-ch-code", reminders: [15 * MIN] });
  slot("demo-a07", 0, "18:00", "19:00", "Course à pied", { chapterId: "demo-ch-sport", reminders: [30 * MIN] });
  slot("demo-a08", 0, "22:30", "23:30", "Relecture du soir"); // 22:30 pile, déborde après 23:00
  // Demain : bandes « Avant 06:00 » / « Après 23:00 », tronqués, titre très long.
  slot("demo-a09", 1, "04:00", "05:30", "Révision très tôt");
  slot("demo-a10", 1, "05:30", "07:00", "Relecture avant le quiz", { chapterId: "demo-ch-droit" });
  slot("demo-a11", 1, "09:00", "09:30", "Point rapide", { reminders: [HOUR, 15 * MIN] });
  slot("demo-a12", 1, "13:00", "16:00",
    "Séance de révision intensive : droit des obligations, responsabilité civile, régimes spéciaux et jurisprudence récente 📚",
    { chapterId: "demo-ch-droit" });
  slot("demo-a13", 1, "22:00", "23:30", "Débrief de la journée");
  slot("demo-a14", 1, "23:00", "23:45", "Lecture au lit", { chapterId: "demo-ch-lecture" });
  // Après-demain (n = 2) : volontairement vide, pour l'invitation à cliquer sur la grille.
  // Passé et suite du mois.
  slot("demo-a15", -1, "18:00", "19:30", "Révision droit pénal", { chapterId: "demo-ch-droit", done: true });
  slot("demo-a16", -2, "10:00", "11:30", "Lecture d'un roman", { chapterId: "demo-ch-lecture" }); // manqué : non fait
  slot("demo-a17", 3, "14:00", "17:00", "Dissertation blanche", { chapterId: "demo-ch-droit", reminders: [2 * HOUR] });
  slot("demo-a18", 7, "09:00", "10:30", "Révision hebdomadaire", { chapterId: "demo-ch-droit" });
  slot("demo-a19", 9, "16:00", "17:00", "Séance de yoga", { chapterId: "demo-ch-sport" });
  slot("demo-a20", 14, "10:00", "12:00", "Maquette de l'interface", { chapterId: "demo-ch-code" });

  // ── To-do ───────────────────────────────────────────────────────────────────
  const tasks = (prefix, texts, doneEvery) =>
    texts.map((text, i) => ({
      id: `${prefix}-${i + 1}`,
      text: text.slice(0, 200),
      done: doneEvery > 0 && i % doneEvery === 0,
    }));
  const numbered = (label, n) => Array.from({ length: n }, (_, i) => `${label} ${i + 1}`);
  const todo = [
    {
      id: "demo-todo-memoire",
      title: "Mémoire",
      tasks: tasks("demo-t-mem", [
        "Choisir la problématique", "Lire les 5 articles de référence", "Plan détaillé",
        "Rédiger l'introduction", "Fiche de lecture n°1", "Fiche de lecture n°2",
        "Relire le chapitre 1", "Mettre en forme la bibliographie", "Contacter le directeur de mémoire",
        "Préparer le diaporama", "Répéter la soutenance", "Imprimer et relier",
      ], 3),
    },
    {
      id: "demo-todo-td",
      title: "TD droit",
      tasks: tasks("demo-t-td", numbered("Exercice du TD", 8), 3),
    },
    {
      id: "demo-todo-perso",
      title: "Perso & administratif",
      tasks: tasks("demo-t-perso", [
        "Renouveler la carte étudiante", "Appeler la banque", "Rendez-vous chez le dentiste",
        "Acheter un cadeau d'anniversaire 🎁", "Payer le loyer", "Ranger le bureau",
        "Réserver le train pour Noël", "Vérifier l'assurance habitation", "Trier les mails",
        "Faire les courses", "Mettre à jour le CV", "Sauvegarder le disque dur",
        "Répondre à Camille", "Prendre rendez-vous coiffeur", "Changer l'ampoule du salon",
        "Poster le colis", "Planifier la semaine", "Renouveler l'abonnement transport",
        "Écrire une carte de remerciement", "Débrancher le chargeur de la cuisine",
      ], 3),
    },
    { id: "demo-todo-vide", title: "À trier", tasks: [] },
    {
      id: "demo-todo-long",
      title: "Rubrique au titre vraiment très long pour vérifier le retour à la ligne et la troncature éventuelle 🧪",
      tasks: tasks("demo-t-long", [
        "Tâche courte",
        "Tâche au texte maximal : " + "lorem ipsum dolor sit amet ".repeat(8),
        "Tâche avec accents et caractères spéciaux : éàùçœ « » — … ✅",
      ], 0),
    },
    {
      id: "demo-todo-monstre",
      title: "Rubrique monstre (150 tâches)",
      tasks: tasks("demo-t-monstre", numbered("Tâche monstre", 150), 3),
    },
  ];

  return {
    data: {
      chapters,
      quests: coherentQuests,
      profile,
      canvasViewports: {},
      agenda: { slots },
    },
    todo,
    panelPrefs: { collapsed: false, activeTab: "agenda" },
  };
}
