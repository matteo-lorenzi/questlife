import { describe, it, expect, beforeEach, vi } from "vitest";
import { dayEntries } from "./agendaTestHelpers";

// Tests go through the public store API only.
async function freshStore() {
  vi.resetModules();
  localStorage.clear();
  const { useStore } = await import("./useStore");
  return useStore;
}

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

// Creates a quest through the store, then patches it (deadline, status...).
function addQuest(store, patch) {
  const chapterId = store.getState().chapters[0].id;
  store.getState().createQuest(chapterId, { x: 0, y: 0 });
  const quests = store.getState().quests;
  const q = quests[quests.length - 1];
  store.setState({ quests: quests.map((x) => (x.id === q.id ? { ...x, ...patch } : x)) });
  return q.id;
}

// Seed quests may already carry deadlines: start each test from a clean slate.
function clearDeadlines(store) {
  store.setState({
    quests: store.getState().quests.map((q) => ({ ...q, deadlineAt: null, deadlineMode: "none" })),
  });
}

describe("agenda day entries (slots + quest deadlines, read through the grid)", () => {
  beforeEach(() => localStorage.clear());

  it("mixes slots and deadlines of a day, sorted by time", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "Matin", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 10) });
    store.getState().createAgendaSlot({ title: "Soir", startAt: at(2030, 5, 10, 18), endAt: at(2030, 5, 10, 19) });
    addQuest(store, { title: "Rendu", deadlineAt: at(2030, 5, 10, 14), deadlineMode: "absolute" });
    addQuest(store, { title: "Autre jour", deadlineAt: at(2030, 5, 11, 14), deadlineMode: "absolute" });

    const items = dayEntries(store, "2030-05-10");
    expect(items.map((i) => [i.kind, i.title])).toEqual([
      ["slot", "Matin"],
      ["deadline", "Rendu"],
      ["slot", "Soir"],
    ]);
  });

  it("keeps a 23:30 deadline on its local day", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    addQuest(store, { title: "Tard", deadlineAt: at(2030, 5, 10, 23, 30), deadlineMode: "absolute" });
    expect(dayEntries(store, "2030-05-10")).toHaveLength(1);
    expect(dayEntries(store, "2030-05-11")).toHaveLength(0);
  });

  it("marks past deadlines as expired and validated quests as done, not urgent", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    addQuest(store, { title: "Passée", deadlineAt: at(2001, 1, 2, 12), deadlineMode: "absolute" });
    addQuest(store, { title: "Validée", deadlineAt: at(2001, 1, 2, 13), deadlineMode: "absolute", status: "done" });
    addQuest(store, { title: "Future", deadlineAt: at(2001, 1, 2, 14), deadlineMode: "absolute" });
    const now = at(2001, 1, 2, 13, 30);
    const byTitle = Object.fromEntries(
      dayEntries(store, "2001-01-02", now).map((i) => [i.title, i]),
    );
    expect(byTitle["Passée"]).toMatchObject({ expired: true, done: false });
    expect(byTitle["Validée"]).toMatchObject({ expired: false, done: true });
    expect(byTitle["Future"]).toMatchObject({ expired: false, done: false });
  });

  it("flags days having only a deadline as busy", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "S", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 10) });
    addQuest(store, { title: "D", deadlineAt: at(2030, 5, 12, 9), deadlineMode: "absolute" });
    expect(store.getState().getAgendaItemBusyDays().sort()).toEqual(["2030-05-10", "2030-05-12"]);
  });

  it("opens the chapter of a deadline and selects its quest", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    const id = addQuest(store, { title: "D", deadlineAt: at(2030, 5, 12, 9), deadlineMode: "absolute" });
    const chapterId = store.getState().quests.find((q) => q.id === id).chapterId;
    store.getState().openAgendaDeadline(id);
    expect(store.getState().activeChapterId).toBe(chapterId);
    expect(store.getState().selectedQuestId).toBe(id);
  });
});
