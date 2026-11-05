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

describe("getAgendaGridForDay overlap columns", () => {
  beforeEach(() => localStorage.clear());
  const cols = (store, day, now) =>
    Object.fromEntries(store.getState().getAgendaGridForDay(day, now).items.map((i) => [i.title, [i.col, i.cols]]));

  it("gives full width to items that do not overlap, even when back to back", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "A", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 10) });
    store.getState().createAgendaSlot({ title: "B", startAt: at(2030, 5, 10, 10), endAt: at(2030, 5, 10, 11) });
    store.getState().createAgendaSlot({ title: "C", startAt: at(2030, 5, 10, 15), endAt: at(2030, 5, 10, 16) });
    expect(cols(store, "2030-05-10")).toEqual({ A: [0, 1], B: [0, 1], C: [0, 1] });
  });

  it("puts two simultaneous slots side by side", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "A", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 10) });
    store.getState().createAgendaSlot({ title: "B", startAt: at(2030, 5, 10, 9, 30), endAt: at(2030, 5, 10, 10, 30) });
    expect(cols(store, "2030-05-10")).toEqual({ A: [0, 2], B: [1, 2] });
  });

  it("does not hide a slot behind a deadline falling inside it", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "Cours", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 11) });
    addQuest(store, { title: "Rendu", deadlineAt: at(2030, 5, 10, 10), deadlineMode: "absolute" });
    expect(cols(store, "2030-05-10", at(2030, 5, 1))).toEqual({ Cours: [0, 2], Rendu: [1, 2] });
  });

  it("treats a deadline as an item of minimum display duration", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "Cours", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 10) });
    addQuest(store, { title: "Juste apres", deadlineAt: at(2030, 5, 10, 10, 30), deadlineMode: "absolute" });
    addQuest(store, { title: "Pile dessus", deadlineAt: at(2030, 5, 10, 9, 59), deadlineMode: "absolute" });
    expect(cols(store, "2030-05-10", at(2030, 5, 1))).toEqual({
      Cours: [0, 2], "Pile dessus": [1, 2], "Juste apres": [0, 1],
    });
  });

  it("shares the column count across a chain of overlaps and reuses free columns", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "A", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 10) });
    store.getState().createAgendaSlot({ title: "B", startAt: at(2030, 5, 10, 9, 30), endAt: at(2030, 5, 10, 10, 30) });
    store.getState().createAgendaSlot({ title: "C", startAt: at(2030, 5, 10, 10, 15), endAt: at(2030, 5, 10, 11) });
    expect(cols(store, "2030-05-10")).toEqual({ A: [0, 2], B: [1, 2], C: [0, 2] });
  });

  it("still allows creating overlapping slots", async () => {
    const store = await freshStore();
    store.getState().createAgendaSlot({ title: "A", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 10) });
    store.getState().createAgendaSlot({ title: "B", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 10) });
    expect(store.getState().agenda.slots).toHaveLength(2);
  });
});

describe("getAgendaGridForDay out-of-range items", () => {
  beforeEach(() => localStorage.clear());
  const grid = (store, day = "2030-05-10") => store.getState().getAgendaGridForDay(day, at(2030, 5, 1));

  it("truncates a slot straddling 06:00 with a marker and keeps it out of the bands", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "Tôt", startAt: at(2030, 5, 10, 5), endAt: at(2030, 5, 10, 7) });
    const g = grid(store);
    expect(g.items).toHaveLength(1);
    expect(g.items[0]).toMatchObject({ title: "Tôt", startMin: 0, endMin: 60, startMarker: "↑ dès 05:00" });
    expect(g.items[0].endMarker).toBeUndefined();
    expect(g.before).toEqual([]);
    expect(g.after).toEqual([]);
  });

  it("truncates a slot straddling 23:00 with a marker and keeps it out of the bands", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "Tard", startAt: at(2030, 5, 10, 22, 30), endAt: at(2030, 5, 10, 23, 45) });
    const g = grid(store);
    expect(g.items[0]).toMatchObject({ title: "Tard", startMin: 990, endMin: 1020, endMarker: "↓ jusqu'à 23:45" });
    expect(g.items[0].startMarker).toBeUndefined();
    expect(g.before).toEqual([]);
    expect(g.after).toEqual([]);
  });

  it("puts items entirely before 06:00 only in the top band, and after 23:00 only in the bottom band", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "Aube", startAt: at(2030, 5, 10, 4), endAt: at(2030, 5, 10, 5, 30) });
    store.getState().createAgendaSlot({ title: "Nuit", startAt: at(2030, 5, 10, 23, 15), endAt: at(2030, 5, 10, 23, 45) });
    addQuest(store, { title: "Rendu tôt", deadlineAt: at(2030, 5, 10, 5), deadlineMode: "absolute" });
    addQuest(store, { title: "Rendu tard", deadlineAt: at(2030, 5, 10, 23, 30), deadlineMode: "absolute" });
    const g = grid(store);
    expect(g.items).toEqual([]);
    expect(g.before.map((i) => [i.kind, i.title])).toEqual([["slot", "Aube"], ["deadline", "Rendu tôt"]]);
    expect(g.after.map((i) => [i.kind, i.title])).toEqual([["slot", "Nuit"], ["deadline", "Rendu tard"]]);
    expect(g.before[1]).toMatchObject({ questId: expect.any(String), expired: false });
  });

  it("returns empty bands when nothing is out of range", async () => {
    const store = await freshStore();
    clearDeadlines(store);
    store.getState().createAgendaSlot({ title: "Jour", startAt: at(2030, 5, 10, 9), endAt: at(2030, 5, 10, 10) });
    const g = grid(store);
    expect(g.before).toEqual([]);
    expect(g.after).toEqual([]);
  });
});
