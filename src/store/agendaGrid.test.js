import { describe, it, expect, beforeEach, vi } from "vitest";

async function freshStore() {
  vi.resetModules();
  localStorage.clear();
  const { useStore } = await import("./useStore");
  return useStore;
}

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe("getAgendaGridForDay", () => {
  beforeEach(() => localStorage.clear());

  it("places a slot with start/end in minutes since 06:00", async () => {
    const store = await freshStore();
    store.getState().createAgendaSlot({ title: "Maths", startAt: at(2026, 11, 5, 9, 30), endAt: at(2026, 11, 5, 11) });

    const grid = store.getState().getAgendaGridForDay("2026-11-05");
    expect(grid.items).toHaveLength(1);
    expect(grid.items[0]).toMatchObject({ kind: "slot", title: "Maths", startMin: 210, endMin: 300 });
  });

  it("only shows slots of the selected day, sorted by start", async () => {
    const store = await freshStore();
    const { createAgendaSlot } = store.getState();
    createAgendaSlot({ title: "Soir", startAt: at(2026, 11, 5, 18), endAt: at(2026, 11, 5, 19) });
    createAgendaSlot({ title: "Matin", startAt: at(2026, 11, 5, 8), endAt: at(2026, 11, 5, 9) });
    createAgendaSlot({ title: "Demain", startAt: at(2026, 11, 6, 8), endAt: at(2026, 11, 6, 9) });

    expect(store.getState().getAgendaGridForDay("2026-11-05").items.map((i) => i.title)).toEqual(["Matin", "Soir"]);
    expect(store.getState().getAgendaGridForDay("2026-11-06").items.map((i) => i.title)).toEqual(["Demain"]);
  });

  it("returns an empty grid for a day without slot", async () => {
    const store = await freshStore();
    expect(store.getState().getAgendaGridForDay("2026-11-07").items).toEqual([]);
  });

  it("reflects done, edit, delete and duplicate immediately", async () => {
    const store = await freshStore();
    const { slot } = store.getState().createAgendaSlot({ title: "Maths", startAt: at(2026, 11, 5, 9), endAt: at(2026, 11, 5, 10) });
    const grid = (day) => store.getState().getAgendaGridForDay(day).items;

    store.getState().toggleAgendaSlotDone(slot.id);
    expect(grid("2026-11-05")[0]).toMatchObject({ id: slot.id, done: true });

    store.getState().updateAgendaSlot(slot.id, { title: "Physique", startAt: at(2026, 11, 5, 14), endAt: at(2026, 11, 5, 15, 30) });
    expect(grid("2026-11-05")[0]).toMatchObject({ title: "Physique", startMin: 480, endMin: 570 });

    const dup = store.getState().duplicateAgendaSlotToNextWeek(slot.id);
    expect(grid("2026-11-12").map((i) => i.id)).toEqual([dup.slot.id]);

    store.getState().deleteAgendaSlot(slot.id);
    expect(grid("2026-11-05")).toEqual([]);
    expect(grid("2026-11-12")).toHaveLength(1);
  });

  it("keeps local wall-clock minutes on a daylight-saving change day", async () => {
    const store = await freshStore();
    store.getState().createAgendaSlot({ title: "DST", startAt: at(2026, 3, 29, 9), endAt: at(2026, 3, 29, 10, 15) });
    store.getState().createAgendaSlot({ title: "DST fall", startAt: at(2026, 10, 25, 7), endAt: at(2026, 10, 25, 8) });

    expect(store.getState().getAgendaGridForDay("2026-03-29").items[0]).toMatchObject({ startMin: 180, endMin: 255 });
    expect(store.getState().getAgendaGridForDay("2026-10-25").items[0]).toMatchObject({ startMin: 60, endMin: 120 });
  });
});

// Quest created through the store, then patched (deadline, status).
function addQuest(store, patch) {
  const chapterId = store.getState().chapters[0].id;
  store.getState().createQuest(chapterId, { x: 0, y: 0 });
  const quests = store.getState().quests;
  const q = quests[quests.length - 1];
  store.setState({ quests: quests.map((x) => (x.id === q.id ? { ...x, ...patch } : x)) });
  return q.id;
}

function clearDeadlines(store) {
  store.setState({
    quests: store.getState().quests.map((q) => ({ ...q, deadlineAt: null, deadlineMode: "none" })),
  });
}

describe("getAgendaGridForDay with quest deadlines", () => {
  beforeEach(() => localStorage.clear());

  it("places a deadline of the day as a one-line marker at its time, among slots", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "Matin", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 10) });
    const id = addQuest(store, { title: "Rendu", deadlineAt: at(2030, 5, 10, 14, 30), deadlineMode: "absolute" });

    const items = store.getState().getAgendaGridForDay("2030-05-10", at(2030, 5, 1)).items;
    expect(items.map((i) => [i.kind, i.title])).toEqual([["slot", "Matin"], ["deadline", "Rendu"]]);
    expect(items[1]).toMatchObject({ questId: id, startMin: 510, endMin: 510, expired: false, done: false });
  });

  it("ignores deadlines of another day", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    addQuest(store, { title: "Demain", deadlineAt: at(2030, 5, 11, 14), deadlineMode: "absolute" });
    expect(store.getState().getAgendaGridForDay("2030-05-10").items).toEqual([]);
  });

  it("marks past deadlines expired and keeps validated quests done", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    addQuest(store, { title: "Passée", deadlineAt: at(2001, 1, 2, 12), deadlineMode: "absolute" });
    addQuest(store, { title: "Validée", deadlineAt: at(2001, 1, 2, 13), deadlineMode: "absolute", status: "done" });
    const byTitle = Object.fromEntries(
      store.getState().getAgendaGridForDay("2001-01-02", at(2001, 1, 2, 13, 30)).items.map((i) => [i.title, i]),
    );
    expect(byTitle["Passée"]).toMatchObject({ expired: true, done: false });
    expect(byTitle["Validée"]).toMatchObject({ expired: false, done: true });
  });
});
