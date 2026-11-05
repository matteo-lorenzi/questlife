import { describe, it, expect, beforeEach, vi } from "vitest";

// Tests go through the public store API only (actions / selectors).
// The store reads localStorage at import, so each test gets a fresh module.
async function freshStore(savedData) {
  vi.resetModules();
  localStorage.clear();
  if (savedData !== undefined) {
    localStorage.setItem("questlife_data", typeof savedData === "string" ? savedData : JSON.stringify(savedData));
  }
  const { useStore } = await import("./useStore");
  return useStore;
}

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe("agenda slots", () => {
  beforeEach(() => localStorage.clear());

  it("lists a created slot on its local day, sorted by start time", async () => {
    const store = await freshStore();
    const { createAgendaSlot } = store.getState();

    const late = createAgendaSlot({ title: "Soir", startAt: at(2026, 11, 5, 18), endAt: at(2026, 11, 5, 19) });
    const early = createAgendaSlot({ title: "Matin", startAt: at(2026, 11, 5, 9), endAt: at(2026, 11, 5, 10) });
    expect(late.ok).toBe(true);
    expect(early.ok).toBe(true);

    const titles = store.getState().getAgendaItemsForDay("2026-11-05").filter((i) => i.kind === "slot").map((s) => s.title);
    expect(titles).toEqual(["Matin", "Soir"]);
    expect(store.getState().getAgendaItemsForDay("2026-11-06").filter((i) => i.kind === "slot")).toEqual([]);
  });

  it("rejects invalid slots with a clear message and stores nothing", async () => {
    const store = await freshStore();
    const { createAgendaSlot } = store.getState();

    const noTitle = createAgendaSlot({ title: "  ", startAt: at(2026, 11, 5, 9), endAt: at(2026, 11, 5, 10) });
    const sameTime = createAgendaSlot({ title: "X", startAt: at(2026, 11, 5, 9), endAt: at(2026, 11, 5, 9) });
    const reversed = createAgendaSlot({ title: "X", startAt: at(2026, 11, 5, 10), endAt: at(2026, 11, 5, 9) });
    const twoDays = createAgendaSlot({ title: "X", startAt: at(2026, 11, 5, 23), endAt: at(2026, 11, 6, 1) });

    for (const r of [noTitle, sameTime, reversed, twoDays]) {
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/\S/);
    }
    expect(noTitle.error).toMatch(/titre/i);
    expect(twoDays.error).toMatch(/journée/i);
    expect(store.getState().getAgendaItemBusyDays()).toEqual([]);
  });

  it("allows overlapping and past slots", async () => {
    const store = await freshStore();
    const { createAgendaSlot } = store.getState();
    expect(createAgendaSlot({ title: "A", startAt: at(2001, 1, 2, 9), endAt: at(2001, 1, 2, 11) }).ok).toBe(true);
    expect(createAgendaSlot({ title: "B", startAt: at(2001, 1, 2, 10), endAt: at(2001, 1, 2, 12) }).ok).toBe(true);
    expect(store.getState().getAgendaItemsForDay("2001-01-02").filter((i) => i.kind === "slot")).toHaveLength(2);
  });

  it("keeps a 23:30 slot on its local day (not the UTC day)", async () => {
    const store = await freshStore();
    const r = store.getState().createAgendaSlot({ title: "Tard", startAt: at(2026, 7, 14, 23, 30), endAt: at(2026, 7, 14, 23, 45) });
    expect(r.ok).toBe(true);
    expect(store.getState().getAgendaItemsForDay("2026-07-14").filter((i) => i.kind === "slot")).toHaveLength(1);
    expect(store.getState().getAgendaItemBusyDays()).toEqual(["2026-07-14"]);
    // 00:10 local in summer is still the previous UTC day: must land on the local day.
    store.getState().createAgendaSlot({ title: "Tôt", startAt: at(2026, 7, 15, 0, 10), endAt: at(2026, 7, 15, 0, 40) });
    expect(store.getState().getAgendaItemsForDay("2026-07-15").filter((i) => i.kind === "slot").map((s) => s.title)).toEqual(["Tôt"]);
  });

  it("persists slots in the main save and reloads them", async () => {
    const store = await freshStore();
    store.getState().createAgendaSlot({ title: "Survit", startAt: at(2026, 11, 5, 9), endAt: at(2026, 11, 5, 10) });

    const saved = JSON.parse(localStorage.getItem("questlife_data"));
    expect(saved.agenda.slots.map((s) => s.title)).toEqual(["Survit"]);

    vi.resetModules();
    const { useStore } = await import("./useStore");
    expect(useStore.getState().getAgendaItemsForDay("2026-11-05").filter((i) => i.kind === "slot").map((s) => s.title)).toEqual(["Survit"]);
  });

  it("loads an existing save without agenda", async () => {
    const store = await freshStore({ chapters: [], quests: [], profile: {}, canvasViewports: {} });
    expect(store.getState().getAgendaItemBusyDays()).toEqual([]);
    expect(store.getState().createAgendaSlot({ title: "Ok", startAt: at(2026, 11, 5, 9), endAt: at(2026, 11, 5, 10) }).ok).toBe(true);
  });

  it("ignores corrupted agenda data without blocking the app", async () => {
    for (const agenda of ["oops", 42, null, { slots: "nope" }, { slots: [null, 7, "x"] }]) {
      const store = await freshStore({ chapters: [], quests: [], profile: {}, canvasViewports: {}, agenda });
      expect(store.getState().getAgendaItemBusyDays()).toEqual([]);
    }

    const store = await freshStore({
      chapters: [], quests: [], profile: {}, canvasViewports: {},
      agenda: { slots: [
        { id: "good", title: "Bon", startAt: at(2026, 11, 5, 9), endAt: at(2026, 11, 5, 10) },
        { id: "notitle", title: "", startAt: at(2026, 11, 5, 9), endAt: at(2026, 11, 5, 10) },
        { id: "inverted", title: "Inv", startAt: at(2026, 11, 5, 10), endAt: at(2026, 11, 5, 9) },
        { id: "twodays", title: "2j", startAt: at(2026, 11, 5, 23), endAt: at(2026, 11, 6, 1) },
        { id: "nan", title: "NaN", startAt: "x", endAt: null },
      ] },
    });
    expect(store.getState().getAgendaItemsForDay("2026-11-05").filter((i) => i.kind === "slot").map((s) => s.id)).toEqual(["good"]);
  });

  it("normalizes reminder arrays of a loaded slot like quest reminders", async () => {
    const store = await freshStore({
      agenda: { slots: [{
        id: "r", title: "Rem", startAt: at(2026, 11, 5, 9), endAt: at(2026, 11, 5, 10),
        reminderOffsetsMs: [-5, 0, 60000, 60000, 30000, 120000, 3, 4, 5, 6, 7, 8, 9, 10000000],
        sentReminderOffsetsMs: [-1, 90000, 90000],
      }] },
    });
    const [slot] = store.getState().agenda.slots;
    expect(slot.reminderOffsetsMs).toEqual([10000000, 120000, 60000]);
    expect(slot.sentReminderOffsetsMs).toEqual([90000]);
  });
});
