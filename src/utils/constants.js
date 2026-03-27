// ── Chapter colors ────────────────────────────────────────────────────────────
export const CHAPTER_COLORS = [
  {
    id: "teal",
    bg: "#E1F5EE",
    bgDark: "#0A2E22",
    accent: "#1D9E75",
    name: "Vert",
  },
  {
    id: "blue",
    bg: "#E6F1FB",
    bgDark: "#0C1E35",
    accent: "#378ADD",
    name: "Bleu",
  },
  {
    id: "purple",
    bg: "#EEEDFE",
    bgDark: "#16143A",
    accent: "#7F77DD",
    name: "Violet",
  },
  {
    id: "amber",
    bg: "#FAEEDA",
    bgDark: "#2E1E06",
    accent: "#EF9F27",
    name: "Ambre",
  },
  {
    id: "coral",
    bg: "#FAECE7",
    bgDark: "#2E0F06",
    accent: "#D85A30",
    name: "Corail",
  },
  {
    id: "pink",
    bg: "#FBEAF0",
    bgDark: "#2E0A18",
    accent: "#D4537E",
    name: "Rose",
  },
  {
    id: "red",
    bg: "#FCEBEB",
    bgDark: "#2E0808",
    accent: "#E24B4A",
    name: "Rouge",
  },
  {
    id: "gray",
    bg: "#F1EFE8",
    bgDark: "#1C1C1A",
    accent: "#888780",
    name: "Gris",
  },
];

export function getChapterBg(color, theme = "light") {
  if (!color) return theme === "dark" ? "#1C1C1A" : "#F1EFE8";
  if (theme === "dark") return color.bgDark || "#1C1C1A";
  return color.bg;
}

// ── Chapter icons ─────────────────────────────────────────────────────────────
export const CHAPTER_ICONS = {
  health: {
    label: "Santé",
    path: "M8 14C8 14 2 10 2 6C2 4 4 2 6 2C7 2 8 3 8 3C8 3 9 2 10 2C12 2 14 4 14 6C14 10 8 14 8 14Z",
  },
  sport: { label: "Sport", custom: true },
  work: { label: "Carrière", custom: true },
  creative: { label: "Créativité", custom: true },
  learn: { label: "Apprentissage", custom: true },
  finance: { label: "Finance", custom: true },
  travel: { label: "Voyage", custom: true },
  social: { label: "Relations", custom: true },
  home: { label: "Maison", custom: true },
  book: { label: "Lecture", custom: true },
  music: { label: "Musique", custom: true },
  mind: { label: "Bien-être", custom: true },
  code: { label: "Code", custom: true },
  food: { label: "Cuisine", custom: true },
  nature: { label: "Nature", custom: true },
  photo: { label: "Photo", custom: true },
};

// ── XP Levels ─────────────────────────────────────────────────────────────────
export const XP_LEVELS = [
  { level: 1, xp: 0, label: "Débutant" },
  { level: 2, xp: 200, label: "Apprenti" },
  { level: 3, xp: 500, label: "Explorateur" },
  { level: 4, xp: 1000, label: "Aventurier" },
  { level: 5, xp: 2000, label: "Expert" },
  { level: 6, xp: 3500, label: "Maître" },
  { level: 7, xp: 5500, label: "Champion" },
  { level: 8, xp: 8000, label: "Légende" },
  { level: 9, xp: 11000, label: "Héros" },
  { level: 10, xp: 15000, label: "Transcendant" },
];

export function getLevelFromXP(xp) {
  let current = XP_LEVELS[0];
  for (const lvl of XP_LEVELS) {
    if (xp >= lvl.xp) current = lvl;
    else break;
  }
  return current;
}

export function getNextLevel(currentLevel) {
  return XP_LEVELS.find((l) => l.level === currentLevel + 1) || null;
}

// ── Badge triggers ────────────────────────────────────────────────────────────
export const BADGE_DEFS = [
  {
    id: "first_quest",
    label: "Premier pas",
    desc: "Première quête complétée",
    trigger: (s) => s.totalCompleted >= 1,
  },
  {
    id: "quest_5",
    label: "En route",
    desc: "5 quêtes complétées",
    trigger: (s) => s.totalCompleted >= 5,
  },
  {
    id: "quest_10",
    label: "Régulier",
    desc: "10 quêtes complétées",
    trigger: (s) => s.totalCompleted >= 10,
  },
  {
    id: "quest_50",
    label: "Quêteur chevronné",
    desc: "50 quêtes complétées",
    trigger: (s) => s.totalCompleted >= 50,
  },
  {
    id: "xp_500",
    label: "Accumulateur",
    desc: "500 XP cumulés",
    trigger: (s) => s.totalXP >= 500,
  },
  {
    id: "xp_1000",
    label: "Millionnaire XP",
    desc: "1 000 XP cumulés",
    trigger: (s) => s.totalXP >= 1000,
  },
  {
    id: "level_5",
    label: "Demi-chemin",
    desc: "Niveau 5 atteint",
    trigger: (s) => s.level >= 5,
  },
  {
    id: "chapters_3",
    label: "Organisateur",
    desc: "3 chapitres créés",
    trigger: (s) => s.totalChapters >= 3,
  },
  {
    id: "boss_done",
    label: "Boss vaincu",
    desc: "Quête de type boss complétée",
    trigger: (s) => s.bossCompleted >= 1,
  },
  {
    id: "chapter_100",
    label: "Maître du chapitre",
    desc: "Un chapitre complété à 100%",
    trigger: (s) => s.chapterCompleted >= 1,
  },
];

// ── Quest defaults ────────────────────────────────────────────────────────────
export const QUEST_STATUS = {
  DRAFT: "draft",
  LOCKED: "locked",
  ACTIVE: "active",
  EXPIRED: "expired",
  DONE: "done",
};
export const QUEST_TYPE = {
  STANDARD: "standard",
  HABIT: "habit",
  BOSS: "boss",
};
export const DEFAULT_XP = 50;

export const WEEKLY_OBJECTIVES_POOL = [
  {
    id: "w_3quests",
    label: "Compléter 3 quêtes cette semaine",
    bonusXP: 50,
    target: 3,
    type: "questCount",
  },
  {
    id: "w_5quests",
    label: "Compléter 5 quêtes cette semaine",
    bonusXP: 100,
    target: 5,
    type: "questCount",
  },
  {
    id: "w_streak3",
    label: "Maintenir une série de 3 jours",
    bonusXP: 75,
    target: 3,
    type: "streak",
  },
  {
    id: "w_streak5",
    label: "Maintenir une série de 5 jours",
    bonusXP: 150,
    target: 5,
    type: "streak",
  },
  {
    id: "w_boss",
    label: "Compléter une quête de type boss",
    bonusXP: 100,
    target: 1,
    type: "bossQuest",
  },
  {
    id: "w_chapter",
    label: "Compléter un chapitre entier",
    bonusXP: 150,
    target: 1,
    type: "chapterDone",
  },
  {
    id: "w_xp200",
    label: "Gagner 200 XP cette semaine",
    bonusXP: 80,
    target: 200,
    type: "weeklyXP",
  },
  {
    id: "w_newquest",
    label: "Créer 2 nouvelles quêtes",
    bonusXP: 30,
    target: 2,
    type: "questCreated",
  },
];

// ── Canvas background presets ───────────────────────────────────────────────
export const CANVAS_BACKGROUNDS = [
  {
    id: "paper-sage",
    label: "Papier sauge",
    preview: "#F4F8F2",
    canvas: {
      backgroundColor: "#F4F8F2",
      backgroundImage:
        "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0))",
      rfVariant: "dots",
      rfColor: "#C4D5C8",
      rfGap: 22,
      rfSize: 1,
    },
  },
  {
    id: "mist-blue",
    label: "Brume bleue",
    preview: "#EDF4FB",
    canvas: {
      backgroundColor: "#EDF4FB",
      backgroundImage:
        "radial-gradient(circle at 15% 12%, rgba(55,138,221,0.12), transparent 42%), radial-gradient(circle at 84% 80%, rgba(127,119,221,0.09), transparent 46%)",
      rfVariant: "dots",
      rfColor: "#BFD3E7",
      rfGap: 24,
      rfSize: 1,
    },
  },
  {
    id: "linen-amber",
    label: "Lin ambré",
    preview: "#FBF5E8",
    canvas: {
      backgroundColor: "#FBF5E8",
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(133,79,11,0.035), rgba(133,79,11,0.035) 1px, transparent 1px, transparent 18px)",
      rfVariant: "dots",
      rfColor: "#E0CFAB",
      rfGap: 22,
      rfSize: 1,
    },
  },
  {
    id: "rose-fog",
    label: "Brume rosée",
    preview: "#FAF1F5",
    canvas: {
      backgroundColor: "#FAF1F5",
      backgroundImage:
        "linear-gradient(135deg, rgba(212,83,126,0.08), transparent 45%), linear-gradient(310deg, rgba(216,90,48,0.06), transparent 50%)",
      rfVariant: "dots",
      rfColor: "#E2C4CF",
      rfGap: 24,
      rfSize: 1,
    },
  },
  {
    id: "stone-light",
    label: "Pierre claire",
    preview: "#F4F3EF",
    canvas: {
      backgroundColor: "#F4F3EF",
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(136,135,128,0.04), rgba(136,135,128,0.04) 2px, transparent 2px, transparent 16px)",
      rfVariant: "dots",
      rfColor: "#D3D1C7",
      rfGap: 22,
      rfSize: 1,
    },
  },
  {
    id: "mint-grid",
    label: "Menthe quadrillée",
    preview: "#EFFAF5",
    canvas: {
      backgroundColor: "#EFFAF5",
      backgroundImage:
        "linear-gradient(rgba(29,158,117,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(29,158,117,0.05) 1px, transparent 1px)",
      backgroundSize: "32px 32px",
      rfVariant: "lines",
      rfColor: "#C2E7D9",
      rfGap: 28,
      rfSize: 1,
    },
  },
];
