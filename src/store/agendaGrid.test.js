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
