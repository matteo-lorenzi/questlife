import { describe, it, expect } from "vitest";
import {
  normalizeFocusMinutes,
  idleTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  finishTimer,
  isFinished,
  getRemainingMs,
  formatClock,
} from "./focusTimer";

const MIN = 60000;
const HOUR = 60 * MIN;

describe("normalizeFocusMinutes", () => {
  it.each([
    [0, 1],
    [999, 180],
    ["abc", 60],
    ["", 60],
    [null, 60],
    [undefined, 60],
    [12.7, 13],
    ["45", 45],
    [25, 25],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeFocusMinutes(input)).toBe(expected);
  });
});

describe("timer transitions", () => {
  it("starts from idle with an absolute end instant", () => {
    const t = startTimer(idleTimer(HOUR), 1000);
    expect(t.status).toBe("running");
    expect(t.endAt).toBe(HOUR + 1000);
    expect(getRemainingMs(t, 1000)).toBe(HOUR);
  });

  it("computes remaining time and never goes negative", () => {
    const t = startTimer(idleTimer(HOUR), 0);
    expect(getRemainingMs(t, 90000)).toBe(HOUR - 90000);
    expect(getRemainingMs(t, HOUR)).toBe(0);
    expect(getRemainingMs(t, HOUR * 5)).toBe(0);
  });

  it("keeps the remaining time across pause and resume", () => {
    const running = startTimer(idleTimer(HOUR), 0);
    const paused = pauseTimer(running, running.endAt - 1000);
    expect(paused.status).toBe("paused");
    expect(getRemainingMs(paused, 999999999)).toBe(1000);
    const resumed = resumeTimer(paused, 999999);
    expect(resumed.status).toBe("running");
    expect(resumed.endAt).toBe(1000999);
    expect(getRemainingMs(resumed, 999999)).toBe(1000);
  });

  it("ignores actions invalid for the current state", () => {
    const idle = idleTimer(HOUR);
    const running = startTimer(idle, 0);
    expect(pauseTimer(idle, 0)).toBe(idle);
    expect(resumeTimer(idle, 0)).toBe(idle);
    expect(startTimer(running, 5000)).toBe(running);
    expect(resumeTimer(running, 5000)).toBe(running);
  });

  it("detects the end, including long after it (sleep)", () => {
    const t = startTimer(idleTimer(HOUR), 0);
    expect(isFinished(t, HOUR - 1)).toBe(false);
    expect(isFinished(t, HOUR)).toBe(true);
    expect(isFinished(t, HOUR + 10 * HOUR)).toBe(true);
    expect(isFinished(idleTimer(HOUR), HOUR * 10)).toBe(false);
    expect(isFinished(pauseTimer(t, 1000), HOUR * 10)).toBe(false);
  });

  it("restarts a finished timer with the same duration", () => {
    const done = finishTimer(startTimer(idleTimer(25 * MIN), 0));
    expect(done.status).toBe("done");
    expect(getRemainingMs(done, 0)).toBe(0);
    const again = startTimer(done, 5000);
    expect(again.status).toBe("running");
    expect(again.endAt).toBe(5000 + 25 * MIN);
  });

  it("resets to idle keeping the duration", () => {
    const paused = pauseTimer(startTimer(idleTimer(45 * MIN), 0), 1000);
    const reset = resetTimer(paused);
    expect(reset.status).toBe("idle");
    expect(reset.durationMs).toBe(45 * MIN);
    expect(getRemainingMs(reset, 0)).toBe(45 * MIN);
  });
});

describe("formatClock", () => {
  it.each([
    [0, "0:00"],
    [-5, "0:00"],
    [1, "0:01"],
    [25 * MIN, "25:00"],
    [3599000, "59:59"],
    [3600000, "1:00:00"],
    [3661000, "1:01:01"],
  ])("formats %s ms as %s", (ms, expected) => {
    expect(formatClock(ms)).toBe(expected);
  });
});
