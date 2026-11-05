import { describe, it, expect, beforeEach, vi } from "vitest";

// Public store API only. TZ is fixed to Europe/Paris in vite.config.js.
async function freshStore(savedData) {
  vi.resetModules();
  localStorage.clear();
  if (savedData !== undefined) localStorage.setItem("questlife_data", JSON.stringify(savedData));
  const { useStore } = await import("./useStore");
  return useStore;
}

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

const seeded = (over = {}) => ({
  id: "s1",
  title: "Réviser chap. 3",
  startAt: at(2026, 11, 5, 18),
  endAt: at(2026, 11, 5, 19, 30),
  chapterId: "ch1",
  done: true,
  reminderOffsetsMs: [600000, 3600000],
  sentReminderOffsetsMs: [600000],
  createdAt: at(2026, 11, 1),
  ...over,
});

describe("duplicate agenda slot to next week", () => {
  beforeEach(() => localStorage.clear());

  it("copies title, chapter, duration and reminders 7 days later, reset done/sent, original untouched", async () => {
    const store = await freshStore({ agenda: { slots: [seeded()] } });
    const original = store.getState().getAgendaSlotsForDay("2026-11-05")[0];

    const res = store.getState().duplicateAgendaSlotToNextWeek("s1");
    expect(res.ok).toBe(true);

    const copies = store.getState().getAgendaSlotsForDay("2026-11-12");
    expect(copies).toHaveLength(1);
    const copy = copies[0];
    expect(copy.id).not.toBe("s1");
    expect(copy).toMatchObject({
      title: "Réviser chap. 3",
      chapterId: "ch1",
      startAt: at(2026, 11, 12, 18),
      endAt: at(2026, 11, 12, 19, 30),
      done: false,
      reminderOffsetsMs: [600000, 3600000],
      sentReminderOffsetsMs: [],
    });

    const after = store.getState().getAgendaSlotsForDay("2026-11-05");
    expect(after).toHaveLength(1);
    expect(after[0]).toEqual(original);
  });

  it("keeps 18:00 local across the autumn change (Oct 25 -> Nov 1 2026)", async () => {
    const store = await freshStore({
      agenda: { slots: [seeded({ startAt: at(2026, 10, 25, 18), endAt: at(2026, 10, 25, 19) })] },
    });
    store.getState().duplicateAgendaSlotToNextWeek("s1");
    const [copy] = store.getState().getAgendaSlotsForDay("2026-11-01");
    expect(copy.startAt).toBe(at(2026, 11, 1, 18));
    expect(copy.endAt).toBe(at(2026, 11, 1, 19));
    expect(new Date(copy.startAt).getHours()).toBe(18);
  });

  it("keeps 18:00 local across the spring change (Mar 22 -> Mar 29 2026)", async () => {
    const store = await freshStore({
      agenda: { slots: [seeded({ startAt: at(2026, 3, 22, 18), endAt: at(2026, 3, 22, 19) })] },
    });
    store.getState().duplicateAgendaSlotToNextWeek("s1");
    const [copy] = store.getState().getAgendaSlotsForDay("2026-03-29");
    expect(copy.startAt).toBe(at(2026, 3, 29, 18));
    expect(new Date(copy.startAt).getHours()).toBe(18);
  });

  it("returns an error for an unknown slot and stores nothing", async () => {
    const store = await freshStore({ agenda: { slots: [seeded()] } });
    const res = store.getState().duplicateAgendaSlotToNextWeek("nope");
    expect(res.ok).toBe(false);
    expect(typeof res.error).toBe("string");
    expect(store.getState().agenda.slots).toHaveLength(1);
  });
});
