import { describe, it, expect, beforeEach, vi } from "vitest";

// Tests go through the public store API only.
async function freshStore() {
  vi.resetModules();
  const { useTodo } = await import("./useTodo");
  const { TODO_KEY } = await import("../utils/todoStorage");
  return { store: useTodo, TODO_KEY };
}

const stored = (key) => JSON.parse(localStorage.getItem(key));

describe("todo store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("starts empty", async () => {
    const { store } = await freshStore();
    expect(store.getState().sections).toEqual([]);
  });

  it("adds a section, updates state and storage", async () => {
    const { store, TODO_KEY } = await freshStore();
    expect(store.getState().addSection("TD droit")).toBe(true);
    const [section] = store.getState().sections;
    expect(section.title).toBe("TD droit");
    expect(stored(TODO_KEY)).toEqual(store.getState().sections);
  });

  it("refuses a blank section title and writes nothing", async () => {
    const { store, TODO_KEY } = await freshStore();
    expect(store.getState().addSection("  ")).toBe(false);
    expect(localStorage.getItem(TODO_KEY)).toBeNull();
  });

  it("adds, toggles and removes a task", async () => {
    const { store, TODO_KEY } = await freshStore();
    store.getState().addSection("Mémoire");
    const sectionId = store.getState().sections[0].id;
    expect(store.getState().addTask(sectionId, "Lire")).toBe(true);
    const taskId = store.getState().sections[0].tasks[0].id;
    expect(store.getState().toggleTask(sectionId, taskId)).toBe(true);
    expect(stored(TODO_KEY)[0].tasks[0].done).toBe(true);
    expect(store.getState().removeTask(sectionId, taskId)).toBe(true);
    expect(stored(TODO_KEY)[0].tasks).toEqual([]);
  });

  it("renames and removes a section", async () => {
    const { store, TODO_KEY } = await freshStore();
    store.getState().addSection("A");
    const id = store.getState().sections[0].id;
    expect(store.getState().renameSection(id, "B")).toBe(true);
    expect(stored(TODO_KEY)[0].title).toBe("B");
    expect(store.getState().removeSection(id)).toBe(true);
    expect(stored(TODO_KEY)).toEqual([]);
  });

  it("returns false for unknown ids", async () => {
    const { store } = await freshStore();
    const s = store.getState();
    expect(s.renameSection("x", "B")).toBe(false);
    expect(s.removeSection("x")).toBe(false);
    expect(s.addTask("x", "t")).toBe(false);
    expect(s.toggleTask("x", "y")).toBe(false);
    expect(s.removeTask("x", "y")).toBe(false);
  });

  it("reloads saved data in a fresh store", async () => {
    const first = await freshStore();
    first.store.getState().addSection("Mémoire");
    const second = await freshStore();
    expect(second.store.getState().sections[0].title).toBe("Mémoire");
  });

  it("keeps in-memory state updated when storage throws", async () => {
    const { store } = await freshStore();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(store.getState().addSection("A")).toBe(true);
    expect(store.getState().sections).toHaveLength(1);
  });
});
