import { describe, expect, it } from "vitest";
import {
  computePledgeProgress,
  daysLeftInIstWeek,
  istWeekStart
} from "@/lib/dashboard/weekly-pledge";

// Tue 2026-07-14 14:00 UTC = Tue 2026-07-14 19:30 IST.
const NOW = new Date("2026-07-14T14:00:00.000Z");

describe("istWeekStart", () => {
  it("returns the IST Monday midnight for a mid-week instant", () => {
    // Monday 2026-07-13 00:00 IST = Sunday 2026-07-12 18:30 UTC.
    expect(istWeekStart(NOW).toISOString()).toBe("2026-07-12T18:30:00.000Z");
  });

  it("keeps a Sunday-night IST session in the same week (not the next)", () => {
    // Sun 2026-07-19 22:00 IST = Sun 2026-07-19 16:30 UTC — still this week.
    const sundayNight = new Date("2026-07-19T16:30:00.000Z");
    expect(istWeekStart(sundayNight).toISOString()).toBe("2026-07-12T18:30:00.000Z");
  });

  it("rolls to the new week at IST Monday midnight", () => {
    // Mon 2026-07-20 00:30 IST = Sun 2026-07-19 19:00 UTC — next week.
    const mondayEarly = new Date("2026-07-19T19:00:00.000Z");
    expect(istWeekStart(mondayEarly).toISOString()).toBe("2026-07-19T18:30:00.000Z");
  });
});

describe("daysLeftInIstWeek", () => {
  it("counts today plus the rest of the week", () => {
    // Tuesday → Tue,Wed,Thu,Fri,Sat,Sun = 6 days left.
    expect(daysLeftInIstWeek(NOW)).toBe(6);
  });

  it("is 7 on Monday and 1 on Sunday", () => {
    const monday = new Date("2026-07-13T06:00:00.000Z"); // Mon 11:30 IST
    const sunday = new Date("2026-07-19T06:00:00.000Z"); // Sun 11:30 IST
    expect(daysLeftInIstWeek(monday)).toBe(7);
    expect(daysLeftInIstWeek(sunday)).toBe(1);
  });
});

describe("computePledgeProgress", () => {
  it("counts only submissions at or after this week's IST Monday", () => {
    const timestamps = [
      "2026-07-11T10:00:00.000Z", // last week (Sat) — excluded
      "2026-07-13T05:00:00.000Z", // Mon this week — included
      "2026-07-14T09:00:00.000Z", // Tue this week — included
      NOW.toISOString() // now — included
    ];

    const summary = computePledgeProgress(5, timestamps, NOW);
    expect(summary.target).toBe(5);
    expect(summary.completed).toBe(3);
    expect(summary.daysLeftInWeek).toBe(6);
    expect(summary.weekStartDay).toBe("2026-07-13");
  });

  it("normalizes a missing or non-positive target to null", () => {
    expect(computePledgeProgress(null, [], NOW).target).toBeNull();
    expect(computePledgeProgress(0, [], NOW).target).toBeNull();
  });

  it("ignores unparseable timestamps", () => {
    const summary = computePledgeProgress(3, ["not-a-date", NOW.toISOString()], NOW);
    expect(summary.completed).toBe(1);
  });

  it("boundary: an instant exactly at week start counts", () => {
    const weekStart = istWeekStart(NOW).toISOString();
    expect(computePledgeProgress(3, [weekStart], NOW).completed).toBe(1);
  });
});
