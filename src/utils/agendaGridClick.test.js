import { describe, it, expect } from "vitest";
import { slotTimesForGridClick } from "./agenda";

// Minutes depuis 06:00 : 14:20 -> (14-6)*60+20 = 500
describe("slotTimesForGridClick", () => {
  it("rounds 14:20 to 14:30 and ends one hour later", () => {
    expect(slotTimesForGridClick(500)).toEqual({ start: "14:30", end: "15:30" });
  });
  it("rounds 14:10 down to 14:00", () => {
    expect(slotTimesForGridClick(490)).toEqual({ start: "14:00", end: "15:00" });
  });
  it("rounds the half-way point (14:15) up to 14:30", () => {
    expect(slotTimesForGridClick(495)).toEqual({ start: "14:30", end: "15:30" });
  });
  it("never starts at 23:00 or later, so the new slot stays in the grid (bottom click -> 22:30)", () => {
    expect(slotTimesForGridClick(17 * 60)).toEqual({ start: "22:30", end: "23:30" });
    expect(slotTimesForGridClick(16 * 60 + 50)).toEqual({ start: "22:30", end: "23:30" });
  });
  it("never starts before 06:00", () => {
    expect(slotTimesForGridClick(-5)).toEqual({ start: "06:00", end: "07:00" });
  });
});
