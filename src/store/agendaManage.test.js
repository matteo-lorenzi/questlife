import { describe, it, expect, beforeEach, vi } from "vitest";
import { daySlots } from "./agendaTestHelpers";

// Tests go through the public store API only (actions / selectors).
async function freshStore(savedData) {
  vi.resetModules();
  localStorage.clear();
  if (savedData !== undefined) localStorage.setItem("questlife_data", JSON.stringify(savedData));
  const { useStore } = await import("./useStore");
  return useStore;
}

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const DAY = "2026-11-05";

function withSlot(store, extra = {}) {
  const r = store.getState().createAgendaSlot({ title: "Révision", startAt: at(2026, 11, 5, 9), endAt: at(2026, 11, 5, 10), ...extra });
  expect(r.ok).toBe(true);
  return r.slot;
}

describe("agenda slot management", () => {
  beforeEach(() => localStorage.clear());

  it("updates title, times and moves the slot to another day", async () => {
    const store = await freshStore();
    const slot = withSlot(store);
    const r = store.getState().updateAgendaSlot(slot.id, { title: " Maths ", startAt: at(2026, 11, 6, 14), endAt: at(2026, 11, 6, 16) });
    expect(r.ok).toBe(true);
    expect(daySlots(store, DAY)).toEqual([]);
    const moved = daySlots(store, "2026-11-06");
    expect(moved.map((s) => s.title)).toEqual(["Maths"]);
    expect(moved[0].id).toBe(slot.id);
  });

  it("applies the creation validation rules on update and keeps the slot untouched on error", async () => {
    const store = await freshStore();
    const slot = withSlot(store);
    const { updateAgendaSlot } = store.getState();
    const cases = [
      [{ title: "  " }, /titre/i],
      [{ endAt: slot.startAt }, /strictement/i],
      [{ startAt: at(2026, 11, 5, 11) }, /strictement/i],
      [{ endAt: at(2026, 11, 6, 1) }, /journée/i],
    ];
    for (const [patch, msg] of cases) {
      const r = updateAgendaSlot(slot.id, patch);
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(msg);
    }
    const [kept] = daySlots(store, DAY);
    expect(kept).toMatchObject({ title: "Révision", startMin: 180, endMin: 240 });
    expect(store.getState().agenda.slots[0]).toMatchObject({ startAt: slot.startAt, endAt: slot.endAt });
    expect(updateAgendaSlot("nope", { title: "x" }).ok).toBe(false);
  });

  it("deletes a slot", async () => {
    const store = await freshStore();
    const a = withSlot(store);
    withSlot(store, { title: "Autre" });
    store.getState().deleteAgendaSlot(a.id);
    expect(daySlots(store, DAY).map((s) => s.title)).toEqual(["Autre"]);
  });

  it("toggles done on and off without touching XP, streak, goals or badges", async () => {
    const store = await freshStore();
    const slot = withSlot(store);
    const before = JSON.stringify(store.getState().profile);
    store.getState().toggleAgendaSlotDone(slot.id);
    expect(daySlots(store, DAY)[0].done).toBe(true);
    expect(JSON.stringify(store.getState().profile)).toBe(before);
    store.getState().toggleAgendaSlotDone(slot.id);
    expect(daySlots(store, DAY)[0].done).toBe(false);
    expect(JSON.stringify(store.getState().profile)).toBe(before);
  });

  it("links an optional chapter at creation and on update, and can unlink it", async () => {
    const store = await freshStore();
    const chapterId = store.getState().createChapter({ title: "Maths" });

    const free = withSlot(store, { title: "Libre" });
    expect(free.chapterId).toBeNull();
    const linked = withSlot(store, { title: "Lié", chapterId });
    expect(linked.chapterId).toBe(chapterId);

    store.getState().updateAgendaSlot(free.id, { chapterId });
    store.getState().updateAgendaSlot(linked.id, { chapterId: null });
    const byTitle = Object.fromEntries(daySlots(store, DAY).map((s) => [s.title, s.chapterId]));
    expect(byTitle).toEqual({ Libre: chapterId, Lié: null });

    // Unknown chapter ids are not stored.
    store.getState().updateAgendaSlot(free.id, { chapterId: "ghost" });
    expect(daySlots(store, DAY).find((s) => s.title === "Libre").chapterId).toBeNull();
  });

  it("keeps slots and clears their chapter link when the chapter is deleted", async () => {
    const store = await freshStore();
    const chapterId = store.getState().createChapter({ title: "Maths" });
    withSlot(store, { chapterId });
    store.getState().deleteChapter(chapterId);
    const [slot] = daySlots(store, DAY);
    expect(slot.title).toBe("Révision");
    expect(slot.chapterId).toBeNull();
    expect(JSON.parse(localStorage.getItem("questlife_data")).agenda.slots[0].chapterId).toBeNull();
  });

  it("persists updates, done state and deletions in the main save", async () => {
    const store = await freshStore();
    const a = withSlot(store);
    const b = withSlot(store, { title: "B" });
    store.getState().updateAgendaSlot(a.id, { title: "A2" });
    store.getState().toggleAgendaSlotDone(a.id);
    store.getState().deleteAgendaSlot(b.id);
    const saved = JSON.parse(localStorage.getItem("questlife_data")).agenda.slots;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ title: "A2", done: true });
  });
});
