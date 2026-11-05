import { describe, it, expect } from "vitest";
import {
  MAX_TEXT_LENGTH,
  normalizeTodoText,
  addSection,
  renameSection,
  removeSection,
  addTask,
  toggleTask,
  removeTask,
} from "./todo";

const base = () => [
  { id: "s1", title: "Mémoire", tasks: [{ id: "t1", text: "Lire", done: false }] },
  { id: "s2", title: "TD droit", tasks: [] },
];

describe("normalizeTodoText", () => {
  it("trims surrounding spaces", () => {
    expect(normalizeTodoText("  a  ")).toBe("a");
  });
  it("refuses blank text", () => {
    expect(normalizeTodoText("   ")).toBeNull();
  });
  it("refuses non-strings", () => {
    expect(normalizeTodoText(42)).toBeNull();
  });
  it("truncates to 200 characters", () => {
    expect(MAX_TEXT_LENGTH).toBe(200);
    expect(normalizeTodoText("x".repeat(250))).toHaveLength(200);
  });
});

describe("sections", () => {
  it("adds a trimmed section at the end with no tasks", () => {
    const next = addSection([], "s1", " Mémoire ");
    expect(next).toEqual([{ id: "s1", title: "Mémoire", tasks: [] }]);
  });
  it("refuses a blank title and returns the same reference", () => {
    const list = base();
    expect(addSection(list, "s3", "  ")).toBe(list);
  });
  it("accepts duplicate titles", () => {
    const next = addSection(base(), "s3", "Mémoire");
    expect(next.map((s) => s.title)).toEqual(["Mémoire", "TD droit", "Mémoire"]);
  });
  it("renames a section", () => {
    const next = renameSection(base(), "s2", " Droit ");
    expect(next[1].title).toBe("Droit");
  });
  it("refuses an empty rename and keeps the old title", () => {
    const list = base();
    expect(renameSection(list, "s1", "")).toBe(list);
    expect(list[0].title).toBe("Mémoire");
  });
  it("ignores renaming an unknown section", () => {
    const list = base();
    expect(renameSection(list, "nope", "X")).toBe(list);
  });
  it("removes a section with its tasks and keeps the others identical", () => {
    const list = base();
    const next = removeSection(list, "s1");
    expect(next).toHaveLength(1);
    expect(next[0]).toBe(list[1]);
  });
  it("ignores removing an unknown section", () => {
    const list = base();
    expect(removeSection(list, "nope")).toBe(list);
  });
});

describe("tasks", () => {
  it("adds a task at the end, not done, without mutating the input", () => {
    const list = base();
    const snapshot = JSON.stringify(list);
    const next = addTask(list, "s1", "t2", " Écrire ");
    expect(next[0].tasks.map((t) => t.text)).toEqual(["Lire", "Écrire"]);
    expect(next[0].tasks[1]).toEqual({ id: "t2", text: "Écrire", done: false });
    expect(JSON.stringify(list)).toBe(snapshot);
  });
  it("ignores adding to an unknown section", () => {
    const list = base();
    expect(addTask(list, "nope", "t2", "X")).toBe(list);
  });
  it("refuses blank task text", () => {
    const list = base();
    expect(addTask(list, "s1", "t2", "  ")).toBe(list);
  });
  it("accepts duplicate task text", () => {
    const next = addTask(base(), "s1", "t2", "Lire");
    expect(next[0].tasks.map((t) => t.text)).toEqual(["Lire", "Lire"]);
  });
  it("toggles twice back to not done", () => {
    const once = toggleTask(base(), "s1", "t1");
    expect(once[0].tasks[0].done).toBe(true);
    const twice = toggleTask(once, "s1", "t1");
    expect(twice[0].tasks[0].done).toBe(false);
  });
  it("ignores toggling an unknown task", () => {
    const list = base();
    expect(toggleTask(list, "s1", "nope")).toBe(list);
  });
  it("removes only the target task", () => {
    const list = addTask(base(), "s1", "t2", "Écrire");
    const next = removeTask(list, "s1", "t1");
    expect(next[0].tasks.map((t) => t.id)).toEqual(["t2"]);
  });
  it("ignores removing an unknown task", () => {
    const list = base();
    expect(removeTask(list, "s1", "nope")).toBe(list);
  });
});
