import { describe, expect, it } from "vitest";
import { computeStreak, istDayKey } from "@/lib/dashboard/streaks";

// A fixed "now" in IST-daytime so tests are deterministic.
const NOW = new Date("2026-07-14T09:00:00.000Z"); // 14:30 IST on 2026-07-14

function istMidday(day: string): string {
  // ~11:30 IST on the given IST calendar day.
  return `${day}T06:00:00.000Z`;
}

describe("istDayKey", () => {
  it("keeps a late-evening IST session on the same IST day", () => {
    // 23:30 IST on 2026-07-14 is 18:00 UTC same day.
    expect(istDayKey("2026-07-14T18:00:00.000Z")).toBe("2026-07-14");
  });

  it("rolls a post-midnight-UTC instant back to the IST day", () => {
    // 00:30 UTC on 2026-07-15 is 06:00 IST on 2026-07-15.
    expect(istDayKey("2026-07-15T00:30:00.000Z")).toBe("2026-07-15");
  });
});

describe("computeStreak", () => {
  it("returns zeros for no activity", () => {
    expect(computeStreak([], NOW)).toEqual({ current: 0, longest: 0, lastActiveDay: null });
  });

  it("counts consecutive days including today", () => {
    const result = computeStreak(
      [istMidday("2026-07-12"), istMidday("2026-07-13"), istMidday("2026-07-14")],
      NOW
    );

    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
    expect(result.lastActiveDay).toBe("2026-07-14");
  });

  it("keeps the streak current when the last active day was yesterday", () => {
    const result = computeStreak([istMidday("2026-07-12"), istMidday("2026-07-13")], NOW);

    expect(result.current).toBe(2);
  });

  it("lapses the current streak after a fully missed day", () => {
    const result = computeStreak([istMidday("2026-07-10"), istMidday("2026-07-11")], NOW);

    expect(result.current).toBe(0);
    expect(result.longest).toBe(2);
    expect(result.lastActiveDay).toBe("2026-07-11");
  });

  it("dedupes multiple sessions on the same day", () => {
    const result = computeStreak(
      [
        istMidday("2026-07-14"),
        "2026-07-14T04:00:00.000Z",
        "2026-07-14T15:00:00.000Z"
      ],
      NOW
    );

    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
  });

  it("reports longest independently of the current run", () => {
    const result = computeStreak(
      [
        // A 3-day run in the past, then a gap, then a 1-day current run.
        istMidday("2026-07-01"),
        istMidday("2026-07-02"),
        istMidday("2026-07-03"),
        istMidday("2026-07-14")
      ],
      NOW
    );

    expect(result.current).toBe(1);
    expect(result.longest).toBe(3);
  });

  it("is order-independent", () => {
    const result = computeStreak(
      [istMidday("2026-07-14"), istMidday("2026-07-12"), istMidday("2026-07-13")],
      NOW
    );

    expect(result.current).toBe(3);
  });
});
