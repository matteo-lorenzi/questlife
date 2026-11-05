import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("scripts/resolve-bin.cjs", () => {
  it("résout le binaire de concurrently malgré le champ exports du paquet", () => {
    const { resolveBin } = require("../../scripts/resolve-bin.cjs");
    const bin = resolveBin("concurrently");
    expect(bin).toMatch(/concurrently\.js$/);
    expect(existsSync(bin)).toBe(true);
  });

  it("electron-dev.cjs charge ses modules et résout concurrently (dry-run)", () => {
    const r = spawnSync(process.execPath, ["scripts/electron-dev.cjs", "demo"], {
      encoding: "utf8",
      env: { ...process.env, QUESTLIFE_DRY_RUN: "1" },
    });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/concurrently.js$/);
  });

  it("electron-dev.cjs refuse un profil inconnu", () => {
    const r = spawnSync(process.execPath, ["scripts/electron-dev.cjs", "inconnu"], { encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Profil inconnu");
  });
});
