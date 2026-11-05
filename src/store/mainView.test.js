import { describe, it, expect, vi } from "vitest";

async function freshStore() {
  vi.resetModules();
  const { useMainView } = await import("./useMainView");
  return useMainView;
}

describe("main view store", () => {
  it("defaults to the chapters view", async () => {
    const store = await freshStore();
    expect(store.getState().mainView).toBe("chapters");
  });

  it("switches to the todo view", async () => {
    const store = await freshStore();
    store.getState().setMainView("todo");
    expect(store.getState().mainView).toBe("todo");
  });

  it("ignores unknown views", async () => {
    const store = await freshStore();
    store.getState().setMainView("todo");
    store.getState().setMainView("agenda");
    expect(store.getState().mainView).toBe("todo");
  });
});
