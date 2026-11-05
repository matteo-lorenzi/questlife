import { describe, it, expect } from "vitest";
import { OPEN_PANEL_TAB_EVENT, requestOpenPanelTab } from "./panelPrefs";

describe("requestOpenPanelTab", () => {
  it("dispatches the open-tab event with the requested tab id", () => {
    const received = [];
    const handler = (e) => received.push(e.detail);
    globalThis.addEventListener(OPEN_PANEL_TAB_EVENT, handler);
    requestOpenPanelTab("timer");
    globalThis.removeEventListener(OPEN_PANEL_TAB_EVENT, handler);
    expect(received).toEqual([{ tabId: "timer" }]);
  });
});
