import { create } from "zustand";
import { nanoid } from "nanoid";
import {
  QUEST_STATUS,
  QUEST_TYPE,
  DEFAULT_XP,
  BADGE_DEFS,
  getLevelFromXP,
  WEEKLY_OBJECTIVES_POOL,
  CHAPTER_COLORS,
} from "../utils/constants";
import { recomputeStatuses } from "../utils/graph";

// ── LocalStorage persistence helper ──────────────────────────────────────────
const LS_KEY = "questlife_data";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        chapters: state.chapters,
        quests: state.quests,
        profile: state.profile,
        canvasViewports: state.canvasViewports,
      }),
    );
  } catch (e) {
    console.warn("LocalStorage save failed", e);
  }
}

function emitToast(msg, type = "success") {
  globalThis.dispatchEvent(
    new CustomEvent("questlife:toast", { detail: { msg, type } }),
  );
}

function emitSystemNotification(title, body) {
  globalThis.dispatchEvent(
    new CustomEvent("questlife:system-notify", { detail: { title, body } }),
  );
}

function normalizeReminderOffsetsMs(offsets) {
  if (!Array.isArray(offsets)) return [];
  const clean = offsets
    .map((v) => Number.parseInt(v, 10))
    .filter((v) => Number.isFinite(v) && v > 0)
    .map((v) => Math.max(60000, v));
  return [...new Set(clean)].sort((a, b) => b - a).slice(0, 8);
}

function formatReminderLeadTime(offsetMs) {
  const minutes = Math.round(offsetMs / 60000);
  if (minutes >= 43200) return `${Math.round(minutes / 43200)} mois`;
  if (minutes >= 10080) return `${Math.round(minutes / 10080)} sem`;
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} j`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} h`;
  return `${minutes} min`;
}

function getInitialTheme() {
  const savedTheme = localStorage.getItem("questlife_theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  const prefersDark = globalThis.matchMedia?.(
    "(prefers-color-scheme: dark)",
  )?.matches;
  return prefersDark ? "dark" : "light";
}

function getISODate(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

function isSameISOWeek(isoDate, now = new Date()) {
  const d = new Date(isoDate);
  return getWeekKey(d) === getWeekKey(now);
}

function getWeekKey(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function pickWeeklyObjectives() {
  const pool = [...WEEKLY_OBJECTIVES_POOL];
  const chosen = [];
  while (pool.length > 0 && chosen.length < 4) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen.map((o) => ({
    id: o.id,
    label: o.label,
    bonusXP: o.bonusXP,
    target: o.target,
    type: o.type,
    progress: 0,
    done: false,
  }));
}

// ── Default profile ───────────────────────────────────────────────────────────
const defaultProfile = {
  pseudo: "Aventurier",
  totalXP: 0,
  level: 1,
  badges: [],
  xpHistory: [],
  streak: {
    current: 0,
    longest: 0,
    lastActiveDate: null,
  },
  weeklyObjectives: {
    weekKey: "",
    objectives: [],
  },
  activityLog: [],
};

// ── Seed data ─────────────────────────────────────────────────────────────────
function seedData() {
  const chapterId = nanoid();
  const q1 = nanoid(),
    q2 = nanoid(),
    q3 = nanoid(),
    q4 = nanoid();
  return {
    chapters: [
      {
        id: chapterId,
        title: "Santé & Sport",
        description: "Objectifs physiques et bien-être",
        color: {
          bg: CHAPTER_COLORS[0].bg,
          bgDark: CHAPTER_COLORS[0].bgDark,
          accent: CHAPTER_COLORS[0].accent,
        },
        icon: "health",
        order: 0,
        createdAt: Date.now(),
        archivedAt: null,
      },
    ],
    quests: [
      {
        id: q1,
        chapterId,
        title: "Marche 30 min",
        description: "3x par semaine",
        xp: 50,
        status: QUEST_STATUS.DONE,
        type: QUEST_TYPE.HABIT,
        dependencies: [],
        position: { x: 80, y: 160 },
        completedAt: Date.now() - 86400000,
      },
      {
        id: q2,
        chapterId,
        title: "Course 5km",
        description: "Première sortie",
        xp: 100,
        status: QUEST_STATUS.ACTIVE,
        type: QUEST_TYPE.STANDARD,
        dependencies: [q1],
        position: { x: 320, y: 100 },
        completedAt: null,
      },
      {
        id: q3,
        chapterId,
        title: "Yoga 3 séances",
        description: "Flexibilité",
        xp: 75,
        status: QUEST_STATUS.ACTIVE,
        type: QUEST_TYPE.HABIT,
        dependencies: [q1],
        position: { x: 320, y: 240 },
        completedAt: null,
      },
      {
        id: q4,
        chapterId,
        title: "Semi-marathon",
        description: "21km",
        xp: 250,
        status: QUEST_STATUS.LOCKED,
        type: QUEST_TYPE.BOSS,
        dependencies: [q2, q3],
        position: { x: 560, y: 170 },
        completedAt: null,
      },
    ],
    profile: { ...defaultProfile, totalXP: 50 },
    canvasViewports: {},
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────
const saved = loadState();
const initial = saved || seedData();
const savedProfile = initial.profile || defaultProfile;
const initialProfile = {
  ...defaultProfile,
  ...savedProfile,
  streak: {
    ...defaultProfile.streak,
    ...(savedProfile.streak || {}),
  },
  weeklyObjectives: {
    ...defaultProfile.weeklyObjectives,
    ...(savedProfile.weeklyObjectives || {}),
    objectives: savedProfile.weeklyObjectives?.objectives || [],
  },
  activityLog: savedProfile.activityLog || [],
};

export const useStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  chapters: (initial.chapters || []).map((ch) => {
    if (ch.color?.bgDark) return ch;
    const colorDef = CHAPTER_COLORS.find((c) => c.accent === ch.color?.accent);
    return {
      ...ch,
      color: {
        bg: ch.color?.bg || colorDef?.bg || CHAPTER_COLORS[0].bg,
        bgDark: colorDef?.bgDark || CHAPTER_COLORS[0].bgDark,
        accent:
          ch.color?.accent || colorDef?.accent || CHAPTER_COLORS[0].accent,
      },
    };
  }),
  quests: (initial.quests || []).map((q) => ({
    ...q,
    attachments: q.attachments || [],
    deadlineAt: Number.isFinite(q.deadlineAt) ? q.deadlineAt : null,
    deadlineMode: q.deadlineMode || "none",
    durationMs: Number.isFinite(q.durationMs) ? q.durationMs : null,
    reminderOffsetsMs: normalizeReminderOffsetsMs(q.reminderOffsetsMs),
    sentReminderOffsetsMs: normalizeReminderOffsetsMs(q.sentReminderOffsetsMs),
    expiredAt: Number.isFinite(q.expiredAt) ? q.expiredAt : null,
    disabledReason: q.disabledReason || null,
  })),
  profile: initialProfile,
  canvasViewports: initial.canvasViewports || {},

  // UI state (not persisted)
  activeChapterId: null,
  selectedQuestId: null,
  isPanelOpen: false,
  showProfile: false,
  showChapterModal: false,
  editingChapter: null, // chapter object being edited (null = new)
  theme: getInitialTheme(),

  // ── Persist helper ─────────────────────────────────────────────────────────
  _persist() {
    saveState(get());
  },

  // ── Chapters ───────────────────────────────────────────────────────────────
  setActiveChapter(id) {
    set({ activeChapterId: id, selectedQuestId: null, isPanelOpen: false });
  },

  openProfile() {
    set({ showProfile: true });
  },

  toggleTheme() {
    const next = get().theme === "light" ? "dark" : "light";
    globalThis.document?.documentElement.classList.toggle(
      "dark",
      next === "dark",
    );
    localStorage.setItem("questlife_theme", next);
    set({ theme: next });
  },

  closeProfile() {
    set({ showProfile: false });
  },

  openChapterModal(chapter = null) {
    set({ showChapterModal: true, editingChapter: chapter });
  },
  closeChapterModal() {
    set({ showChapterModal: false, editingChapter: null });
  },

  createChapter(data) {
    const colorDef = CHAPTER_COLORS.find(
      (c) => c.accent === data?.color?.accent,
    );
    const chapter = {
      id: nanoid(),
      order: get().chapters.length,
      createdAt: Date.now(),
      archivedAt: null,
      ...data,
      color: {
        bg: data?.color?.bg || colorDef?.bg || CHAPTER_COLORS[0].bg,
        bgDark:
          data?.color?.bgDark || colorDef?.bgDark || CHAPTER_COLORS[0].bgDark,
        accent:
          data?.color?.accent || colorDef?.accent || CHAPTER_COLORS[0].accent,
      },
    };
    set((s) => ({ chapters: [...s.chapters, chapter] }));
    get()._persist();
    // Check badge
    get()._checkBadges();
    return chapter.id;
  },

  updateChapter(id, data) {
    const colorDef = CHAPTER_COLORS.find(
      (c) => c.accent === data?.color?.accent,
    );
    set((s) => ({
      chapters: s.chapters.map((c) =>
        c.id === id
          ? {
              ...c,
              ...data,
              color: data?.color
                ? {
                    bg:
                      data.color.bg ||
                      colorDef?.bg ||
                      c.color?.bg ||
                      CHAPTER_COLORS[0].bg,
                    bgDark:
                      data.color.bgDark ||
                      colorDef?.bgDark ||
                      c.color?.bgDark ||
                      CHAPTER_COLORS[0].bgDark,
                    accent:
                      data.color.accent ||
                      colorDef?.accent ||
                      c.color?.accent ||
                      CHAPTER_COLORS[0].accent,
                  }
                : c.color,
            }
          : c,
      ),
    }));
    get()._persist();
  },

  deleteChapter(id) {
    set((s) => ({
      chapters: s.chapters.filter((c) => c.id !== id),
      quests: s.quests.filter((q) => q.chapterId !== id),
      activeChapterId: s.activeChapterId === id ? null : s.activeChapterId,
    }));
    get()._persist();
  },

  reorderChapters(chapters) {
    set({ chapters });
    get()._persist();
  },

  // ── Quests ─────────────────────────────────────────────────────────────────
  getChapterQuests(chapterId) {
    return get().quests.filter((q) => q.chapterId === chapterId);
  },

  createQuest(chapterId, position, type = QUEST_TYPE.STANDARD) {
    const quest = {
      id: nanoid(),
      chapterId,
      title: "",
      description: "",
      xp: DEFAULT_XP,
      status: QUEST_STATUS.DRAFT,
      type,
      dependencies: [],
      position,
      attachments: [],
      deadlineAt: null,
      deadlineMode: "none",
      durationMs: null,
      reminderOffsetsMs: [],
      sentReminderOffsetsMs: [],
      expiredAt: null,
      disabledReason: null,
      completedAt: null,
    };
    set((s) => ({ quests: [...s.quests, quest] }));
    set({ selectedQuestId: quest.id, isPanelOpen: true });
    get()._persist();
    get().checkWeeklyObjectives({ questCreated: 1 });
    return quest.id;
  },

  updateQuest(id, data) {
    set((s) => {
      let quests = s.quests.map((q) => {
        if (q.id !== id) return q;
        const next = { ...q, ...data };
        if (
          q.status === QUEST_STATUS.EXPIRED &&
          Object.hasOwn(data, "status") &&
          data.status !== QUEST_STATUS.EXPIRED
        ) {
          next.status = QUEST_STATUS.EXPIRED;
        }
        if (Object.hasOwn(data, "reminderOffsetsMs")) {
          next.reminderOffsetsMs = normalizeReminderOffsetsMs(
            data.reminderOffsetsMs,
          );
        }
        if (Object.hasOwn(data, "sentReminderOffsetsMs")) {
          next.sentReminderOffsetsMs = normalizeReminderOffsetsMs(
            data.sentReminderOffsetsMs,
          );
        }
        return next;
      });
      // If status changed or deps changed, recompute chapter
      const quest = quests.find((q) => q.id === id);
      if (quest) {
        const chapterQuests = quests.filter(
          (q) => q.chapterId === quest.chapterId,
        );
        const updated = recomputeStatuses(chapterQuests);
        quests = quests.map((q) => updated.find((u) => u.id === q.id) || q);
      }
      return { quests };
    });
    get()._persist();
  },

  setQuestDeadline(id, payload = {}) {
    const quest = get().quests.find((q) => q.id === id);
    if (!quest) return false;
    if (quest.status === QUEST_STATUS.EXPIRED) {
      emitToast(
        "Cette quete est expiree. Utilisez la reactivation avec une nouvelle deadline.",
        "error",
      );
      return false;
    }

    const deadlineAt = Number.parseInt(payload.deadlineAt, 10);
    if (!Number.isFinite(deadlineAt) || deadlineAt <= Date.now() + 30000) {
      emitToast("Deadline invalide: choisissez une date future.", "error");
      return false;
    }

    const reminderOffsetsMs = normalizeReminderOffsetsMs(
      payload.reminderOffsetsMs,
    );

    get().updateQuest(id, {
      deadlineAt,
      deadlineMode: payload.deadlineMode || "absolute",
      durationMs: Number.isFinite(payload.durationMs)
        ? payload.durationMs
        : null,
      reminderOffsetsMs,
      sentReminderOffsetsMs: [],
      expiredAt: null,
      disabledReason: null,
    });
    emitToast("Deadline enregistree", "success");
    return true;
  },

  clearQuestDeadline(id) {
    const quest = get().quests.find((q) => q.id === id);
    if (!quest) return false;
    if (quest.status === QUEST_STATUS.EXPIRED) {
      emitToast(
        "Reactivation necessaire: une quete expiree doit recevoir une nouvelle deadline.",
        "error",
      );
      return false;
    }

    get().updateQuest(id, {
      deadlineAt: null,
      deadlineMode: "none",
      durationMs: null,
      reminderOffsetsMs: [],
      sentReminderOffsetsMs: [],
      expiredAt: null,
      disabledReason: null,
    });
    emitToast("Deadline supprimee", "success");
    return true;
  },

  reactivateExpiredQuestWithNewDeadline(id, payload = {}) {
    const quest = get().quests.find((q) => q.id === id);
    if (!quest) return false;

    const deadlineAt = Number.parseInt(payload.deadlineAt, 10);
    if (!Number.isFinite(deadlineAt) || deadlineAt <= Date.now() + 30000) {
      emitToast("Nouvelle deadline invalide.", "error");
      return false;
    }

    const reminderOffsetsMs = normalizeReminderOffsetsMs(
      payload.reminderOffsetsMs,
    );

    set((s) => {
      let quests = s.quests.map((q) =>
        q.id === id
          ? {
              ...q,
              deadlineAt,
              deadlineMode: payload.deadlineMode || "absolute",
              durationMs: Number.isFinite(payload.durationMs)
                ? payload.durationMs
                : null,
              reminderOffsetsMs,
              sentReminderOffsetsMs: [],
              expiredAt: null,
              disabledReason: null,
              status:
                q.status === QUEST_STATUS.EXPIRED
                  ? QUEST_STATUS.LOCKED
                  : q.status,
            }
          : q,
      );

      const updatedQuest = quests.find((q) => q.id === id);
      if (updatedQuest) {
        const chapterQuests = quests.filter(
          (q) => q.chapterId === updatedQuest.chapterId,
        );
        const recomputed = recomputeStatuses(chapterQuests);
        quests = quests.map((q) => recomputed.find((u) => u.id === q.id) || q);
      }

      return { quests };
    });

    get()._persist();
    emitToast("Quete reactivee avec une nouvelle deadline", "success");
    return true;
  },

  checkDeadlinesAndEmitAlerts(now = Date.now()) {
    const timestamp = Number.parseInt(now, 10);
    const nowTs = Number.isFinite(timestamp) ? timestamp : Date.now();
    const remindersToEmit = [];
    const expirationsToEmit = [];
    let hasChanges = false;

    set((s) => {
      const quests = s.quests.map((q) => {
        if (!q.deadlineAt || q.status === QUEST_STATUS.DONE) return q;

        if (q.status !== QUEST_STATUS.EXPIRED && q.deadlineAt <= nowTs) {
          hasChanges = true;
          expirationsToEmit.push(q);
          return {
            ...q,
            status: QUEST_STATUS.EXPIRED,
            expiredAt: nowTs,
            disabledReason: "deadline_missed",
          };
        }

        if (q.status === QUEST_STATUS.EXPIRED) return q;

        const offsets = normalizeReminderOffsetsMs(q.reminderOffsetsMs);
        if (offsets.length === 0) return q;

        const sent = new Set(
          normalizeReminderOffsetsMs(q.sentReminderOffsetsMs),
        );
        let questChanged = false;

        for (const offset of offsets) {
          if (sent.has(offset)) continue;
          if (nowTs >= q.deadlineAt - offset && nowTs < q.deadlineAt) {
            sent.add(offset);
            questChanged = true;
            remindersToEmit.push({ quest: q, offsetMs: offset });
          }
        }

        if (!questChanged) return q;
        hasChanges = true;
        return {
          ...q,
          sentReminderOffsetsMs: [...sent].sort((a, b) => b - a),
        };
      });

      return hasChanges ? { quests } : {};
    });

    if (!hasChanges) return;

    for (const item of remindersToEmit) {
      const { quest, offsetMs } = item;
      const label = formatReminderLeadTime(offsetMs);
      const msg = `Alarme: "${quest.title || "Quete sans titre"}" se ferme dans ${label}.`;
      emitToast(msg, "error");
      emitSystemNotification("QuestLife - alarme deadline", msg);
    }

    for (const quest of expirationsToEmit) {
      const msg = `"${quest.title || "Quete sans titre"}" a ete desactivee pour retard.`;
      emitToast(msg, "error");
      emitSystemNotification("QuestLife - quete desactivee", msg);
    }

    get()._persist();
  },

  completeQuest(id) {
    const quest = get().quests.find((q) => q.id === id);
    if (!quest || quest.status === QUEST_STATUS.DONE) return;
    if (quest.status === QUEST_STATUS.EXPIRED) {
      emitToast(
        "Quete desactivee: reprogrammez une deadline pour la reactiver.",
        "error",
      );
      return;
    }

    set((s) => {
      let quests = s.quests.map((q) =>
        q.id === id
          ? { ...q, status: QUEST_STATUS.DONE, completedAt: Date.now() }
          : q,
      );
      // Recompute all quests in same chapter
      const chapterQuests = quests.filter(
        (q) => q.chapterId === quest.chapterId,
      );
      const updated = recomputeStatuses(chapterQuests);
      quests = quests.map((q) => updated.find((u) => u.id === q.id) || q);

      // XP
      const profile = { ...s.profile };
      profile.totalXP += quest.xp;
      const lvl = getLevelFromXP(profile.totalXP);
      profile.level = lvl.level;
      profile.xpHistory = [
        ...(profile.xpHistory || []),
        { questId: id, xp: quest.xp, timestamp: Date.now() },
      ];

      const today = getISODate();
      const activityMap = new Map(
        (profile.activityLog || []).map((item) => [item.date, item.count]),
      );
      activityMap.set(today, (activityMap.get(today) || 0) + 1);
      profile.activityLog = [...activityMap.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-90);

      return { quests, profile };
    });
    get().updateStreak();
    get().checkWeeklyObjectives({ completedQuestId: id, earnedXP: quest.xp });
    get()._persist();
    get()._checkBadges();
    emitToast(
      `bravo ma reine - +${quest.xp} XP = +${quest.xp} EUR (versement virtuel)`,
      "success",
    );
  },

  uncompleteQuest(id) {
    const quest = get().quests.find((q) => q.id === id);
    if (!quest || quest.status !== QUEST_STATUS.DONE) return;

    set((s) => {
      let quests = s.quests.map((q) =>
        q.id === id
          ? { ...q, status: QUEST_STATUS.ACTIVE, completedAt: null }
          : q,
      );

      const chapterQuests = quests.filter(
        (q) => q.chapterId === quest.chapterId,
      );
      const updated = recomputeStatuses(chapterQuests);
      quests = quests.map((q) => updated.find((u) => u.id === q.id) || q);

      const profile = { ...s.profile };
      profile.totalXP = Math.max(0, profile.totalXP - quest.xp);
      profile.level = getLevelFromXP(profile.totalXP).level;

      const history = [...(profile.xpHistory || [])];
      for (let i = history.length - 1; i >= 0; i -= 1) {
        if (history[i].questId === id) {
          history.splice(i, 1);
          break;
        }
      }
      profile.xpHistory = history;

      return { quests, profile };
    });

    get()._persist();
  },

  deleteQuest(id) {
    set((s) => {
      // Remove quest and remove it from all dependencies
      let quests = s.quests
        .filter((q) => q.id !== id)
        .map((q) =>
          q.dependencies.includes(id)
            ? { ...q, dependencies: q.dependencies.filter((d) => d !== id) }
            : q,
        );
      // Recompute
      const deletedQuest = s.quests.find((q) => q.id === id);
      if (deletedQuest) {
        const chapterQuests = quests.filter(
          (q) => q.chapterId === deletedQuest.chapterId,
        );
        const updated = recomputeStatuses(chapterQuests);
        quests = quests.map((q) => updated.find((u) => u.id === q.id) || q);
      }
      return {
        quests,
        selectedQuestId: s.selectedQuestId === id ? null : s.selectedQuestId,
        isPanelOpen: s.selectedQuestId === id ? false : s.isPanelOpen,
      };
    });
    get()._persist();
  },

  redirectAndDeleteQuest(id, replacementId) {
    set((s) => {
      let quests = s.quests
        .filter((q) => q.id !== id)
        .map((q) => {
          if (!q.dependencies.includes(id)) return q;
          const newDeps = q.dependencies.filter((d) => d !== id);
          if (replacementId && !newDeps.includes(replacementId))
            newDeps.push(replacementId);
          return { ...q, dependencies: newDeps };
        });
      const deletedQuest = s.quests.find((q) => q.id === id);
      if (deletedQuest) {
        const chapterQuests = quests.filter(
          (q) => q.chapterId === deletedQuest.chapterId,
        );
        const updated = recomputeStatuses(chapterQuests);
        quests = quests.map((q) => updated.find((u) => u.id === q.id) || q);
      }
      return {
        quests,
        selectedQuestId: s.selectedQuestId === id ? null : s.selectedQuestId,
        isPanelOpen: s.selectedQuestId === id ? false : s.isPanelOpen,
      };
    });
    get()._persist();
  },

  addDependency(questId, depId) {
    set((s) => {
      let quests = s.quests.map((q) =>
        q.id === questId && !q.dependencies.includes(depId)
          ? { ...q, dependencies: [...q.dependencies, depId] }
          : q,
      );
      const quest = quests.find((q) => q.id === questId);
      if (quest) {
        const chapterQuests = quests.filter(
          (q) => q.chapterId === quest.chapterId,
        );
        const updated = recomputeStatuses(chapterQuests);
        quests = quests.map((q) => updated.find((u) => u.id === q.id) || q);
      }
      return { quests };
    });
    get()._persist();
  },

  removeDependency(questId, depId) {
    set((s) => {
      let quests = s.quests.map((q) =>
        q.id === questId
          ? { ...q, dependencies: q.dependencies.filter((d) => d !== depId) }
          : q,
      );
      const quest = quests.find((q) => q.id === questId);
      if (quest) {
        const chapterQuests = quests.filter(
          (q) => q.chapterId === quest.chapterId,
        );
        const updated = recomputeStatuses(chapterQuests);
        quests = quests.map((q) => updated.find((u) => u.id === q.id) || q);
      }
      return { quests };
    });
    get()._persist();
  },

  updateQuestPosition(id, position) {
    set((s) => ({
      quests: s.quests.map((q) => (q.id === id ? { ...q, position } : q)),
    }));
    get()._persist();
  },

  addQuestAttachments(id, attachments) {
    if (!attachments || attachments.length === 0) return;
    set((s) => ({
      quests: s.quests.map((q) =>
        q.id === id
          ? {
              ...q,
              attachments: [...(q.attachments || []), ...attachments],
            }
          : q,
      ),
    }));
    get()._persist();
  },

  removeQuestAttachment(id, attachmentId) {
    set((s) => ({
      quests: s.quests.map((q) =>
        q.id === id
          ? {
              ...q,
              attachments: (q.attachments || []).filter(
                (a) => a.id !== attachmentId,
              ),
            }
          : q,
      ),
    }));
    get()._persist();
  },

  // ── Panel ──────────────────────────────────────────────────────────────────
  selectQuest(id) {
    set({ selectedQuestId: id, isPanelOpen: !!id });
  },
  closePanel() {
    set({ selectedQuestId: null, isPanelOpen: false });
  },

  // ── Canvas viewport ────────────────────────────────────────────────────────
  saveViewport(chapterId, viewport) {
    set((s) => ({
      canvasViewports: { ...s.canvasViewports, [chapterId]: viewport },
    }));
    get()._persist();
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  updatePseudo(pseudo) {
    const value = (pseudo || "").trim();
    if (!/^[A-Za-z0-9_-]{2,20}$/.test(value)) {
      emitToast(
        "Pseudo invalide: 2-20 caractères (lettres, chiffres, _ ou -)",
        "error",
      );
      return false;
    }
    set((s) => ({ profile: { ...s.profile, pseudo: value } }));
    get()._persist();
    emitToast("Pseudo mis à jour", "success");
    return true;
  },

  getWeeklyObjectives() {
    const weekKey = getWeekKey(new Date());
    const profile = get().profile;
    if (profile.weeklyObjectives?.weekKey === weekKey) {
      return profile.weeklyObjectives.objectives || [];
    }

    const objectives = pickWeeklyObjectives();
    set((s) => ({
      profile: {
        ...s.profile,
        weeklyObjectives: {
          weekKey,
          objectives,
        },
      },
    }));
    get()._persist();
    return objectives;
  },

  updateStreak() {
    const today = getISODate();
    set((s) => {
      const streak = {
        ...defaultProfile.streak,
        ...s.profile.streak,
      };

      if (streak.lastActiveDate === today) {
        return {};
      }

      if (streak.lastActiveDate) {
        const prev = new Date(`${streak.lastActiveDate}T00:00:00`);
        const next = new Date(prev);
        next.setDate(prev.getDate() + 1);
        if (getISODate(next.getTime()) === today) {
          streak.current += 1;
        } else {
          streak.current = 1;
        }
      } else {
        streak.current = 1;
      }

      streak.lastActiveDate = today;
      streak.longest = Math.max(streak.longest || 0, streak.current || 0);
      return { profile: { ...s.profile, streak } };
    });
    get()._persist();
  },

  checkWeeklyObjectives(payload = {}) {
    const objectives = get().getWeeklyObjectives();
    const { quests, chapters, profile } = get();
    if (!objectives || objectives.length === 0) return;

    const nowWeekKey = getWeekKey(new Date());
    const questCompletionsThisWeek = (profile.xpHistory || []).filter(
      (h) => h.questId && isSameISOWeek(getISODate(h.timestamp)),
    ).length;
    const weeklyXP = (profile.xpHistory || [])
      .filter((h) => isSameISOWeek(getISODate(h.timestamp)))
      .reduce((sum, h) => sum + h.xp, 0);
    const chapterDoneCount = chapters.filter((ch) => {
      const chapterQuests = quests.filter(
        (q) => q.chapterId === ch.id && q.status !== QUEST_STATUS.DRAFT,
      );
      return (
        chapterQuests.length > 0 &&
        chapterQuests.every((q) => q.status === QUEST_STATUS.DONE)
      );
    }).length;

    let bonusAwarded = 0;
    const updatedObjectives = objectives.map((obj) => {
      let progress = obj.progress || 0;
      if (obj.type === "questCount") progress = questCompletionsThisWeek;
      if (obj.type === "streak") progress = profile.streak?.current || 0;
      if (obj.type === "bossQuest") {
        const hasBossThisWeek = (profile.xpHistory || []).some((h) => {
          if (!isSameISOWeek(getISODate(h.timestamp))) return false;
          const quest = quests.find((q) => q.id === h.questId);
          return quest?.type === QUEST_TYPE.BOSS;
        });
        progress = hasBossThisWeek ? 1 : 0;
      }
      if (obj.type === "chapterDone") progress = chapterDoneCount;
      if (obj.type === "weeklyXP") progress = weeklyXP;
      if (obj.type === "questCreated")
        progress = (obj.progress || 0) + (payload.questCreated || 0);

      const clampedProgress = Math.min(obj.target, progress);
      const doneNow = clampedProgress >= obj.target;
      if (doneNow && !obj.done) {
        bonusAwarded += obj.bonusXP;
      }
      return {
        ...obj,
        progress: clampedProgress,
        done: obj.done || doneNow,
      };
    });

    set((s) => {
      const nextProfile = {
        ...s.profile,
        weeklyObjectives: {
          weekKey: nowWeekKey,
          objectives: updatedObjectives,
        },
      };

      if (bonusAwarded > 0) {
        nextProfile.totalXP += bonusAwarded;
        nextProfile.level = getLevelFromXP(nextProfile.totalXP).level;
        nextProfile.xpHistory = [
          ...(nextProfile.xpHistory || []),
          {
            questId: null,
            xp: bonusAwarded,
            timestamp: Date.now(),
          },
        ];
      }

      return { profile: nextProfile };
    });

    if (bonusAwarded > 0) {
      emitToast(`Objectifs hebdo validés: +${bonusAwarded} XP`, "success");
    }
    get()._persist();
  },

  // ── Badge checker ──────────────────────────────────────────────────────────
  _checkBadges() {
    const s = get();
    const totalCompleted = s.quests.filter(
      (q) => q.status === QUEST_STATUS.DONE,
    ).length;
    const bossCompleted = s.quests.filter(
      (q) => q.status === QUEST_STATUS.DONE && q.type === QUEST_TYPE.BOSS,
    ).length;
    const totalChapters = s.chapters.length;

    // Chapter 100% check
    let chapterCompleted = 0;
    for (const ch of s.chapters) {
      const cq = s.quests.filter(
        (q) => q.chapterId === ch.id && q.status !== QUEST_STATUS.DRAFT,
      );
      if (cq.length > 0 && cq.every((q) => q.status === QUEST_STATUS.DONE))
        chapterCompleted++;
    }

    const stats = {
      totalXP: s.profile.totalXP,
      level: s.profile.level,
      totalCompleted,
      bossCompleted,
      totalChapters,
      chapterCompleted,
    };

    const existingIds = new Set(s.profile.badges.map((b) => b.id));
    const newBadges = [];
    for (const def of BADGE_DEFS) {
      if (!existingIds.has(def.id) && def.trigger(stats)) {
        newBadges.push({
          id: def.id,
          label: def.label,
          desc: def.desc,
          unlockedAt: Date.now(),
        });
      }
    }

    if (newBadges.length > 0) {
      set((s) => ({
        profile: { ...s.profile, badges: [...s.profile.badges, ...newBadges] },
      }));
      get()._persist();
      // Emit custom event so toast can pick it up
      for (const b of newBadges) {
        globalThis.dispatchEvent(
          new CustomEvent("questlife:badge", { detail: b }),
        );
      }
    }
  },
}));
