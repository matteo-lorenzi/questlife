import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Tests go through the public store API only; notification events are observed on globalThis.
async function freshStore() {
  vi.resetModules();
  const { useFocusTimer } = await import("./useFocusTimer");
  const { getRemainingMs } = await import("../utils/focusTimer");
  return { store: useFocusTimer, getRemainingMs };
}

const MIN = 60000;
const HOUR = 60 * MIN;

function listen() {
  const notifications = [];
  const toasts = [];
  const onNotify = (e) => notifications.push(e.detail);
  const onToast = (e) => toasts.push(e.detail);
  globalThis.addEventListener("questlife:system-notify", onNotify);
  globalThis.addEventListener("questlife:toast", onToast);
  return {
    notifications,
    toasts,
    stop: () => {
      globalThis.removeEventListener("questlife:system-notify", onNotify);
      globalThis.removeEventListener("questlife:toast", onToast);
    },
  };
}

describe("focus timer store", () => {
  let spy;
  beforeEach(() => {
    localStorage.clear();
    spy = listen();
  });
  afterEach(() => spy.stop());

  it("defaults to a 60 minute idle focus", async () => {
    const { store } = await freshStore();
    const { timer } = store.getState();
    expect(timer.status).toBe("idle");
    expect(timer.durationMs).toBe(HOUR);
  });

  it("remembers the chosen duration across store instances", async () => {
    const { store } = await freshStore();
    store.getState().setDurationMinutes(25);
    expect(store.getState().timer.durationMs).toBe(25 * MIN);
    expect(localStorage.getItem("questlife_focus_prefs")).toContain("25");
    const { store: again } = await freshStore();
    expect(again.getState().timer.durationMs).toBe(25 * MIN);
  });

  it("clamps the chosen duration to 1..180 minutes", async () => {
    const { store } = await freshStore();
    store.getState().setDurationMinutes(0);
    expect(store.getState().timer.durationMs).toBe(1 * MIN);
    store.getState().setDurationMinutes(999);
    expect(store.getState().timer.durationMs).toBe(180 * MIN);
  });

  it("ignores duration changes while running, paused or done", async () => {
    const { store } = await freshStore();
    store.getState().start(0);
    store.getState().setDurationMinutes(10);
    expect(store.getState().timer.durationMs).toBe(HOUR);
    store.getState().pause(1000);
    store.getState().setDurationMinutes(10);
    expect(store.getState().timer.durationMs).toBe(HOUR);
    store.getState().resume(2000);
    store.getState().tick(2000 + HOUR);
    expect(store.getState().timer.status).toBe("done");
    store.getState().setDurationMinutes(10);
    expect(store.getState().timer.durationMs).toBe(HOUR);
  });

  it("falls back to the default when preferences are corrupt or storage throws", async () => {
    localStorage.setItem("questlife_focus_prefs", "{not json");
    const { store } = await freshStore();
    expect(store.getState().timer.durationMs).toBe(HOUR);

    const spyGet = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { store: blocked } = await freshStore();
    expect(blocked.getState().timer.durationMs).toBe(HOUR);
    spyGet.mockRestore();
  });

  it("does not notify before the end", async () => {
    const { store } = await freshStore();
    store.getState().start(0);
    store.getState().tick(1000);
    expect(store.getState().timer.status).toBe("running");
    expect(spy.notifications).toHaveLength(0);
    expect(spy.toasts).toHaveLength(0);
  });

  it("emits a toast and a desktop notification once at the end", async () => {
    const { store } = await freshStore();
    store.getState().start(0);
    store.getState().tick(HOUR);
    expect(store.getState().timer.status).toBe("done");
    expect(spy.toasts).toEqual([{ msg: "Focus terminé", type: "success" }]);
    expect(spy.notifications).toEqual([
      { title: "QuestLife - focus terminé", body: "Focus de 1 h terminé." },
    ]);
  });

  it("notifies once and stays at zero after a long sleep and repeated ticks", async () => {
    const { store, getRemainingMs } = await freshStore();
    store.getState().start(0);
    store.getState().tick(10 * HOUR);
    store.getState().tick(10 * HOUR + 1000);
    store.getState().tick(10 * HOUR + 2000);
    expect(spy.notifications).toHaveLength(1);
    expect(spy.toasts).toHaveLength(1);
    const { timer, now } = store.getState();
    expect(getRemainingMs(timer, now)).toBe(0);
  });

  it("does not finish while paused and finishes after resume", async () => {
    const { store } = await freshStore();
    store.getState().start(0);
    store.getState().pause(1000);
    store.getState().tick(99 * HOUR);
    expect(store.getState().timer.status).toBe("paused");
    expect(spy.notifications).toHaveLength(0);
    store.getState().resume(2000);
    store.getState().tick(2000 + HOUR - 1000);
    expect(store.getState().timer.status).toBe("done");
    expect(spy.notifications).toHaveLength(1);
  });

  it("reset returns to idle silently and restart relaunches a finished focus", async () => {
    const { store } = await freshStore();
    store.getState().start(0);
    store.getState().reset();
    expect(store.getState().timer.status).toBe("idle");
    expect(spy.notifications).toHaveLength(0);

    store.getState().start(0);
    store.getState().tick(HOUR);
    store.getState().restart(5000);
    expect(store.getState().timer.status).toBe("running");
    expect(store.getState().timer.endAt).toBe(5000 + HOUR);
  });

  it("start while running keeps the end instant", async () => {
    const { store } = await freshStore();
    store.getState().start(0);
    store.getState().start(30 * MIN);
    expect(store.getState().timer.endAt).toBe(HOUR);
  });
});
