import { describe, it, expect } from "vitest";
import { LEFT_PANEL_TABS, tabsForView } from "./tabs";

describe("left panel tab registry", () => {
  it("lists the home tabs in order", () => {
    expect(tabsForView("home").map((t) => t.id)).toEqual(["chapters", "agenda", "timer", "todo"]);
  });

  it("lists the chapter-view tabs in order", () => {
    expect(tabsForView("chapter").map((t) => t.id)).toEqual(["chapters", "agenda", "quests", "timer", "todo"]);
  });

  it("targets the main area only for chapters and todo", () => {
    const main = LEFT_PANEL_TABS.filter((t) => t.target === "main").map((t) => t.id);
    expect(main).toEqual(["chapters", "todo"]);
    expect(LEFT_PANEL_TABS.every((t) => t.target === "main" || t.target === "panel")).toBe(true);
  });

  it("labels the tabs", () => {
    expect(LEFT_PANEL_TABS.map((t) => t.label)).toEqual(["Chapitres", "Agenda", "Quêtes", "Minuteur", "To-do"]);
  });
});
