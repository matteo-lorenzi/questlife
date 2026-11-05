import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("scripts/resolve-bin.cjs", () => {
  it("résout le binaire de concurrently malgré le champ exports du paquet", () => {
    const { resolveBin } = require("../../scripts/resolve-bin.cjs");
    const bin = resolveBin("concurrently");
    expect(bin).toMatch(/concurrently\.js$/);
    expect(existsSync(bin)).toBe(true);
  });
});
