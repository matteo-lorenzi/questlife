import { describe, it, expect } from "vitest";
import { TODO_KEY, loadTodo, saveTodo } from "./todoStorage";

function fakeStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[TODO_KEY, initial]]);
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
  };
}

const sample = [
  { id: "s1", title: "Mémoire", tasks: [{ id: "t1", text: "Lire", done: true }] },
];

describe("todo storage", () => {
  it("uses a dedicated key outside the game data", () => {
    expect(TODO_KEY).toBe("questlife_todo");
  });

  it("round-trips sections", () => {
    const storage = fakeStorage();
    saveTodo(sample, storage);
    expect(loadTodo(storage)).toEqual(sample);
  });

  it("returns an empty list when the key is missing", () => {
    expect(loadTodo(fakeStorage())).toEqual([]);
  });

  it("returns an empty list on invalid JSON", () => {
    expect(loadTodo(fakeStorage("{pas du json"))).toEqual([]);
  });

  it("returns an empty list when the root is not an array", () => {
    expect(loadTodo(fakeStorage("{}"))).toEqual([]);
  });

  it("drops malformed tasks and sections but keeps valid ones", () => {
    const raw = JSON.stringify([
      { id: "s1", title: "OK", tasks: [
        { id: "t1", text: "bonne", done: false },
        { id: "t2", text: "mauvaise", done: "oui" },
      ] },
      { id: 3, title: "id invalide", tasks: [] },
      { id: "s3", title: "sans tâches" },
    ]);
    expect(loadTodo(fakeStorage(raw))).toEqual([
      { id: "s1", title: "OK", tasks: [{ id: "t1", text: "bonne", done: false }] },
    ]);
  });

  it("does not throw when storage fails on write", () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(() => saveTodo(sample, storage)).not.toThrow();
  });
});
