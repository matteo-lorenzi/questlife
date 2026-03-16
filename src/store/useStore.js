import { create } from "zustand";
import { nanoid } from "nanoid";
import {
  QUEST_STATUS,
  QUEST_TYPE,
  DEFAULT_XP,
  BADGE_DEFS,
  getLevelFromXP,
  XP_LEVELS,
} from "../utils/constants";
import { recomputeStatuses, getDependents } from "../utils/graph";

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

// ── Default profile ───────────────────────────────────────────────────────────
const defaultProfile = {
  totalXP: 0,
  level: 1,
  badges: [],
  xpHistory: [],
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
        color: { bg: "#E1F5EE", accent: "#1D9E75" },
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

export const useStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  chapters: initial.chapters || [],
  quests: initial.quests || [],
  profile: initial.profile || defaultProfile,
  canvasViewports: initial.canvasViewports || {},

  // UI state (not persisted)
  activeChapterId: null,
  selectedQuestId: null,
  isPanelOpen: false,
  showChapterModal: false,
  editingChapter: null, // chapter object being edited (null = new)

  // ── Persist helper ─────────────────────────────────────────────────────────
  _persist() {
    saveState(get());
  },

  // ── Chapters ───────────────────────────────────────────────────────────────
  setActiveChapter(id) {
    set({ activeChapterId: id, selectedQuestId: null, isPanelOpen: false });
  },

  openChapterModal(chapter = null) {
    set({ showChapterModal: true, editingChapter: chapter });
  },
  closeChapterModal() {
    set({ showChapterModal: false, editingChapter: null });
  },

  createChapter(data) {
    const chapter = {
      id: nanoid(),
      order: get().chapters.length,
      createdAt: Date.now(),
      archivedAt: null,
      ...data,
    };
    set((s) => ({ chapters: [...s.chapters, chapter] }));
    get()._persist();
    // Check badge
    get()._checkBadges();
    return chapter.id;
  },

  updateChapter(id, data) {
    set((s) => ({
      chapters: s.chapters.map((c) => (c.id === id ? { ...c, ...data } : c)),
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
      completedAt: null,
    };
    set((s) => ({ quests: [...s.quests, quest] }));
    set({ selectedQuestId: quest.id, isPanelOpen: true });
    get()._persist();
    return quest.id;
  },

  updateQuest(id, data) {
    set((s) => {
      let quests = s.quests.map((q) => (q.id === id ? { ...q, ...data } : q));
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

  completeQuest(id) {
    const quest = get().quests.find((q) => q.id === id);
    if (!quest || quest.status === QUEST_STATUS.DONE) return;

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

      return { quests, profile };
    });
    get()._persist();
    get()._checkBadges();
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

  // ── Badge checker ──────────────────────────────────────────────────────────
  _checkBadges() {
    const s = get();
    const chapterQuests = s.quests.filter((q) => q.chapterId);
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
        window.dispatchEvent(new CustomEvent("questlife:badge", { detail: b }));
      }
    }
  },
}));
