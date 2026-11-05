import { describe, it, expect } from "vitest";
import { wouldCreateCycle } from "./graph";

// wouldCreateCycle(quests, fromId, toId) is true when toId can already reach
// fromId by following `dependencies` (smoke test of the current contract).
const quests = [
  { id: "a", dependencies: [] },
  { id: "b", dependencies: ["a"] },
  { id: "c", dependencies: ["b"] },
  { id: "d", dependencies: [] },
];

describe("wouldCreateCycle", () => {
  it("reports a cycle when toId already reaches fromId through dependencies", () => {
    expect(wouldCreateCycle(quests, "a", "c")).toBe(true);
  });

  it("reports a cycle for a self-link", () => {
    expect(wouldCreateCycle(quests, "a", "a")).toBe(true);
  });

  it("reports no cycle between unrelated quests", () => {
    expect(wouldCreateCycle(quests, "d", "c")).toBe(false);
  });
});
