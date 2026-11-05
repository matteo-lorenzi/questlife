import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildDemoData } from "./demoData";
import { installDemo } from "./installDemo";
import { recomputeStatuses } from "../utils/graph";
import { getLevelFromXP } from "../utils/constants";
import { localDayKey, shiftLocalDays, normalizeAgenda } from "../utils/agenda";
import { loadTodo, TODO_KEY } from "../utils/todoStorage";
import { loadPanelPrefs } from "../utils/panelPrefs";

// Jeudi 5 novembre 2026, 14:00 heure locale (fuseau de test : Europe/Paris).
const NOW = new Date(2026, 10, 5, 14, 0).getTime();
const DAY = (n) => localDayKey(shiftLocalDays(NOW, n));

// Le store lit localStorage à l'import : chaque test repart d'un module neuf.
async function storeWith(data) {
  vi.resetModules();
  localStorage.clear();
  localStorage.setItem("questlife_data", JSON.stringify(data));
  const { useStore } = await import("../store/useStore");
  return useStore;
}

describe("jeu de démo", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("est déterministe pour un même instant et à ids uniques", () => {
    const a = buildDemoData(NOW);
    expect(buildDemoData(NOW)).toEqual(a);
    const ids = [...a.data.chapters, ...a.data.quests, ...a.data.agenda.slots].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("survit au chargement du vrai store sans perte", async () => {
    const { data } = buildDemoData(NOW);
    const store = await storeWith(data);
    const s = store.getState();
    expect(s.chapters).toHaveLength(data.chapters.length);
    expect(s.quests).toHaveLength(data.quests.length);
    expect(s.agenda.slots).toHaveLength(data.agenda.slots.length);
  });

  it("garde des statuts de quête cohérents avec les dépendances", () => {
    const { quests } = buildDemoData(NOW).data;
    expect(recomputeStatuses(quests)).toEqual(quests);
    const ids = new Set(quests.map((q) => q.id));
    for (const q of quests) for (const d of q.dependencies) expect(ids.has(d)).toBe(true);
  });

  it("n'a aucun cycle de dépendances", () => {
    const { quests } = buildDemoData(NOW).data;
    const deps = new Map(quests.map((q) => [q.id, q.dependencies]));
    const state = new Map();
    const visit = (id) => {
      if (state.get(id) === 2) return;
      expect(state.get(id)).not.toBe(1);
      state.set(id, 1);
      for (const d of deps.get(id)) visit(d);
      state.set(id, 2);
    };
    for (const id of deps.keys()) visit(id);
  });

  it("couvre les 5 statuts, les 3 types, un diamant et les cas de volume", () => {
    const { chapters, quests } = buildDemoData(NOW).data;
    expect(new Set(quests.map((q) => q.status))).toEqual(
      new Set(["draft", "locked", "active", "expired", "done"]),
    );
    expect(new Set(quests.map((q) => q.type))).toEqual(new Set(["standard", "habit", "boss"]));
    expect(quests.some((q) => q.dependencies.length >= 2)).toBe(true);
    const perChapter = (id) => quests.filter((q) => q.chapterId === id).length;
    expect(chapters.some((c) => perChapter(c.id) === 0)).toBe(true);
    expect(chapters.some((c) => perChapter(c.id) >= 100)).toBe(true);
    expect(quests.some((q) => q.checklistItems.length === 30)).toBe(true);
    expect(quests.some((q) => q.checklistItems.length === 0)).toBe(true);
    expect(quests.some((q) => q.attachments.length > 0)).toBe(true);
    expect(quests.some((q) => q.title.length > 80)).toBe(true);
  });

  it("a des deadlines passées (expirées), proches et lointaines, sans expiration silencieuse", () => {
    const { quests } = buildDemoData(NOW).data;
    const withDl = quests.filter((q) => q.deadlineAt);
    expect(withDl.some((q) => q.status === "expired" && q.deadlineAt < NOW && q.expiredAt)).toBe(true);
    expect(withDl.some((q) => q.status === "active" && q.deadlineAt - NOW < 24 * 3600e3)).toBe(true);
    expect(withDl.some((q) => q.deadlineAt - NOW > 15 * 24 * 3600e3)).toBe(true);
    // La boucle de 30 s ne doit expirer aucune quête non expirée à l'ouverture.
    for (const q of withDl.filter((x) => x.status !== "expired" && x.status !== "done")) {
      expect(q.deadlineAt).toBeGreaterThan(NOW + 10 * 60e3);
    }
  });

  it("ne déclenche aucune rafale de rappels à l'ouverture", () => {
    const { quests, agenda } = buildDemoData(NOW).data;
    const items = [
      ...quests.filter((q) => q.status !== "expired" && q.status !== "done")
        .map((q) => ({ at: q.deadlineAt, ...q })),
      ...agenda.slots.map((s) => ({ at: s.startAt, ...s })),
    ];
    for (const it of items) {
      for (const off of it.reminderOffsetsMs ?? []) {
        const due = it.at - off <= NOW;
        const sent = (it.sentReminderOffsetsMs ?? []).includes(off);
        // Dû et non envoyé = notification immédiate indésirable.
        expect(due && !sent).toBe(false);
      }
    }
    expect(items.some((it) => (it.reminderOffsetsMs ?? []).some((o) => it.at - o > NOW))).toBe(true);
  });

  it("produit un profil cohérent (XP, niveau, badges, objectifs hebdo)", async () => {
    const { data } = buildDemoData(NOW);
    const p = data.profile;
    const sum = p.xpHistory.reduce((n, h) => n + h.xp, 0);
    expect(p.totalXP).toBe(sum);
    expect(p.level).toBe(getLevelFromXP(p.totalXP).level);
    for (const q of data.quests.filter((x) => x.status === "done")) {
      expect(p.xpHistory.some((h) => h.questId === q.id && h.xp === q.xp)).toBe(true);
    }
    expect(p.badges.map((b) => b.id).sort()).toEqual(
      ["boss_done", "chapter_100", "chapters_3", "first_quest", "quest_10", "quest_5", "xp_500"].sort(),
    );
    expect(p.streak.current).toBeGreaterThanOrEqual(5);
    expect(p.streak.longest).toBeGreaterThanOrEqual(p.streak.current);
    expect(p.activityLog.length).toBeGreaterThanOrEqual(20);

    const objs = p.weeklyObjectives.objectives;
    expect(objs.some((o) => o.done)).toBe(true);
    expect(objs.some((o) => !o.done && o.progress > 0)).toBe(true);
    expect(objs.some((o) => o.progress === 0)).toBe(true);
    // La semaine courante est reconnue : le store ne retire pas d'autres objectifs.
    const store = await storeWith(data);
    expect(store.getState().getWeeklyObjectives()).toEqual(objs);
  });

  it("remplit l'agenda de cas limites sur les bons jours", async () => {
    const { data } = buildDemoData(NOW);
    const store = await storeWith(data);
    const grid = (n) => store.getState().getAgendaGridForDay(DAY(n), NOW);
    const slotsOf = (g) => [...g.before, ...g.items, ...g.after].filter((i) => i.kind === "slot");

    const today = grid(0);
    expect(slotsOf(today).length).toBeGreaterThanOrEqual(6);
    expect(Math.max(...today.items.map((i) => i.cols))).toBeGreaterThanOrEqual(3); // chevauchements côte à côte
    expect(today.items.some((i) => i.startMarker || i.endMarker)).toBe(true); // créneau tronqué

    const tomorrow = grid(1);
    expect(tomorrow.before.length).toBeGreaterThanOrEqual(1);
    expect(tomorrow.after.length).toBeGreaterThanOrEqual(1);

    const empty = grid(2);
    expect([...empty.before, ...empty.items, ...empty.after]).toEqual([]);

    const slots = data.agenda.slots;
    expect(slots.some((s) => s.done)).toBe(true);
    expect(slots.some((s) => !s.done && s.endAt < NOW)).toBe(true);
    expect(slots.some((s) => s.chapterId === null)).toBe(true);
    expect(slots.some((s) => s.chapterId)).toBe(true);
    expect(slots.some((s) => s.title.length > 60)).toBe(true);
  });

  it("fournit une To-do avec rubrique vide et rubrique monstre", () => {
    const { todo } = buildDemoData(NOW);
    expect(todo.some((s) => s.tasks.length === 0)).toBe(true);
    expect(todo.some((s) => s.tasks.length >= 100)).toBe(true);
    expect(todo.some((s) => s.tasks.some((t) => t.done))).toBe(true);
    expect(todo.some((s) => s.tasks.some((t) => !t.done))).toBe(true);
    for (const s of todo) for (const t of s.tasks) expect(t.text.length).toBeLessThanOrEqual(200);
  });
});

describe("jeu de démo à différents instants", () => {
  // Bords de journée et de semaine : juste après minuit, dimanche soir, lundi matin, changement d'heure.
  it.each([
    ["lundi 00:30", new Date(2026, 10, 2, 0, 30)],
    ["dimanche 23:50", new Date(2026, 10, 8, 23, 50)],
    ["jeudi 14:00", new Date(2026, 10, 5, 14, 0)],
    ["passage à l'heure d'été", new Date(2027, 2, 28, 12, 0)],
  ])("reste cohérent : %s", (_label, date) => {
    const now = date.getTime();
    const { data } = buildDemoData(now);
    const p = data.profile;

    expect(recomputeStatuses(data.quests)).toEqual(data.quests);
    expect(normalizeAgenda(data.agenda)).toEqual(data.agenda);
    expect(p.totalXP).toBe(p.xpHistory.reduce((n, h) => n + h.xp, 0));

    // Aucune complétion dans le futur, et les complétions du jour sont bien aujourd'hui.
    for (const h of p.xpHistory) expect(h.timestamp).toBeLessThanOrEqual(now);
    for (const q of data.quests.filter((x) => x.status === "done")) {
      expect(q.completedAt).toBeLessThanOrEqual(now);
    }
    const today = p.activityLog.at(-1);
    expect(today.count).toBe(3);

    // Un bonus d'objectif n'existe que si l'objectif est validé.
    const bonusXP = p.xpHistory.filter((h) => h.questId === null).reduce((n, h) => n + h.xp, 0);
    const doneBonus = p.weeklyObjectives.objectives.filter((o) => o.done).reduce((n, o) => n + o.bonusXP, 0);
    expect(bonusXP).toBe(doneBonus);
  });
});

describe("installDemo", () => {
  function fakeStorage(initial = {}) {
    const m = new Map(Object.entries(initial));
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => void m.set(k, String(v)),
      removeItem: (k) => void m.delete(k),
      keys: () => [...m.keys()],
    };
  }

  it("écrase toujours les clés de jeu et ouvre le panneau sur l'Agenda", () => {
    const storage = fakeStorage({ questlife_data: "junk", [TODO_KEY]: "junk" });
    installDemo(storage, NOW);
    const saved = JSON.parse(storage.getItem("questlife_data"));
    expect(saved).toEqual(buildDemoData(NOW).data);
    expect(loadTodo(storage)).toEqual(buildDemoData(NOW).todo);
    expect(loadPanelPrefs(storage)).toEqual({ collapsed: false, activeTab: "agenda" });
  });

  it("ne touche ni le thème ni la durée du minuteur", () => {
    const storage = fakeStorage({ questlife_theme: "dark", questlife_focus_prefs: '{"minutes":25}' });
    installDemo(storage, NOW);
    expect(storage.getItem("questlife_theme")).toBe("dark");
    expect(storage.getItem("questlife_focus_prefs")).toBe('{"minutes":25}');
  });
});
