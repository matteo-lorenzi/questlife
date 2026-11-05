import { describe, it, expect, beforeEach, vi } from "vitest";

// Tests go through the public store API only; the notification event is observed on globalThis.
async function freshStore() {
  vi.resetModules();
  localStorage.clear();
  const { useStore } = await import("./useStore");
  return useStore;
}

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const MIN = 60000;

function listen() {
  const events = [];
  const handler = (e) => events.push(e.detail);
  globalThis.addEventListener("questlife:system-notify", handler);
  return { events, stop: () => globalThis.removeEventListener("questlife:system-notify", handler) };
}

function slotWith(store, reminderOffsetsMs, extra = {}) {
  const r = store.getState().createAgendaSlot({
    title: "Révision maths",
    startAt: at(2026, 11, 5, 9),
    endAt: at(2026, 11, 5, 10),
    reminderOffsetsMs,
    ...extra,
  });
  expect(r.ok).toBe(true);
  return r.slot;
}

describe("agenda slot reminders", () => {
  let spy;
  beforeEach(() => {
    spy?.stop();
    spy = listen();
  });

  it("emits a single desktop notification when a reminder becomes due", async () => {
    const store = await freshStore();
    slotWith(store, [15 * MIN]);
    store.getState().checkAgendaRemindersAndEmitAlerts(at(2026, 11, 5, 8, 40));
    expect(spy.events).toHaveLength(0);
    store.getState().checkAgendaRemindersAndEmitAlerts(at(2026, 11, 5, 8, 46));
    expect(spy.events).toHaveLength(1);
    expect(spy.events[0].body).toContain("Révision maths");
    store.getState().checkAgendaRemindersAndEmitAlerts(at(2026, 11, 5, 8, 50));
    expect(spy.events).toHaveLength(1);
  });

  it("does not remind for a slot already started or marked done", async () => {
    const store = await freshStore();
    const started = slotWith(store, [15 * MIN]);
    store.getState().checkAgendaRemindersAndEmitAlerts(at(2026, 11, 5, 9, 1));
    expect(spy.events).toHaveLength(0);
    store.getState().deleteAgendaSlot(started.id);
    const done = slotWith(store, [15 * MIN]);
    store.getState().toggleAgendaSlotDone(done.id);
    store.getState().checkAgendaRemindersAndEmitAlerts(at(2026, 11, 5, 8, 50));
    expect(spy.events).toHaveLength(0);
  });

  it("re-arms reminders when the slot is moved", async () => {
    const store = await freshStore();
    const slot = slotWith(store, [15 * MIN]);
    store.getState().checkAgendaRemindersAndEmitAlerts(at(2026, 11, 5, 8, 50));
    expect(spy.events).toHaveLength(1);
    store.getState().updateAgendaSlot(slot.id, { startAt: at(2026, 11, 5, 14), endAt: at(2026, 11, 5, 15) });
    store.getState().checkAgendaRemindersAndEmitAlerts(at(2026, 11, 5, 8, 55));
    expect(spy.events).toHaveLength(1);
    store.getState().checkAgendaRemindersAndEmitAlerts(at(2026, 11, 5, 13, 50));
    expect(spy.events).toHaveLength(2);
  });

  it("normalizes reminders like quests: min 1 min, no duplicates, max 8", async () => {
    const store = await freshStore();
    const slot = slotWith(store, [1000, 60000, 15 * MIN, 15 * MIN, "5", -3, "x"]);
    expect(slot.reminderOffsetsMs).toEqual([15 * MIN, MIN]);
    const many = slotWith(store, Array.from({ length: 12 }, (_, i) => (i + 1) * MIN));
    expect(many.reminderOffsetsMs).toHaveLength(8);
    const r = store.getState().updateAgendaSlot(slot.id, { reminderOffsetsMs: [30 * MIN, 30 * MIN, 10 * MIN] });
    expect(r.slot.reminderOffsetsMs).toEqual([30 * MIN, 10 * MIN]);
  });
});
