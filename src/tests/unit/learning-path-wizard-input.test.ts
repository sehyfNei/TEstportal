import { describe, expect, it } from "vitest";
import { MAX_GOAL_LENGTH, parseTargetDate } from "@/lib/learning-path/wizard-input";

describe("parseTargetDate", () => {
  const now = new Date("2026-07-25T12:00:00.000Z");

  it("rejects an empty value", () => {
    expect(parseTargetDate("", now)).toEqual({ ok: false, message: "Target date is required." });
  });

  it("rejects an unparseable value", () => {
    expect(parseTargetDate("not-a-date", now)).toEqual({
      ok: false,
      message: "Target date must be a valid date."
    });
  });

  it("rejects a date in the past", () => {
    const result = parseTargetDate("2026-01-01", now);
    expect(result.ok).toBe(false);
  });

  it("accepts today's date", () => {
    const result = parseTargetDate("2026-07-25", now);
    expect(result).toEqual({ ok: true, iso: "2026-07-25" });
  });

  it("accepts a future date", () => {
    const result = parseTargetDate("2026-09-15", now);
    expect(result).toEqual({ ok: true, iso: "2026-09-15" });
  });
});

describe("MAX_GOAL_LENGTH", () => {
  it("is a positive, reasonable free-text cap", () => {
    expect(MAX_GOAL_LENGTH).toBeGreaterThan(0);
    expect(MAX_GOAL_LENGTH).toBeLessThanOrEqual(1000);
  });
});
