import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueueJob: vi.fn()
}));

vi.mock("@/lib/jobs/enqueue", () => ({
  enqueueJob: mocks.enqueueJob,
  generateIdempotencyKey: (type: string, ...parts: string[]) => [type, ...parts].join(":")
}));

import { ensureDigestJobsQueued, isDigestDay } from "@/lib/jobs/enqueue-digest";

function mockSupabase(rows: { id: string }[], error: { message: string } | null = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: rows, error }))
      }))
    }))
  } as unknown as never;
}

describe("isDigestDay", () => {
  it("is true on the IST Monday", () => {
    // 2026-07-27 is a Monday; 03:00 UTC = 08:30 IST, still Monday.
    expect(isDigestDay(new Date("2026-07-27T03:00:00.000Z"))).toBe(true);
  });

  it("is false on other days of the week", () => {
    expect(isDigestDay(new Date("2026-07-28T03:00:00.000Z"))).toBe(false);
    expect(isDigestDay(new Date("2026-08-01T03:00:00.000Z"))).toBe(false);
  });

  it("uses the IST calendar, not UTC, near the day boundary", () => {
    // 2026-07-26T19:00:00Z = 2026-07-27T00:30 IST - already Monday in IST.
    expect(isDigestDay(new Date("2026-07-26T19:00:00.000Z"))).toBe(true);
  });
});

describe("ensureDigestJobsQueued", () => {
  it("does nothing on a non-digest day", async () => {
    mocks.enqueueJob.mockClear();
    const supabase = mockSupabase([{ id: "user-1" }]);

    await ensureDigestJobsQueued(supabase, new Date("2026-07-28T03:00:00.000Z"));

    expect(mocks.enqueueJob).not.toHaveBeenCalled();
  });

  it("enqueues one weekly_digest job per registered user on the digest day, week-scoped", async () => {
    mocks.enqueueJob.mockClear();
    mocks.enqueueJob.mockResolvedValue({ ok: true, jobId: null, conflict: false });
    const supabase = mockSupabase([{ id: "user-1" }, { id: "user-2" }]);

    await ensureDigestJobsQueued(supabase, new Date("2026-07-27T03:00:00.000Z"));

    expect(mocks.enqueueJob).toHaveBeenCalledTimes(2);
    expect(mocks.enqueueJob).toHaveBeenCalledWith(
      supabase,
      "weekly_digest",
      { user_id: "user-1" },
      "weekly_digest:user-1:2026-07-27"
    );
  });

  it("does not throw when the initial query errors", async () => {
    mocks.enqueueJob.mockClear();
    const supabase = mockSupabase([], { message: "db down" });

    await expect(
      ensureDigestJobsQueued(supabase, new Date("2026-07-27T03:00:00.000Z"))
    ).resolves.toBeUndefined();
    expect(mocks.enqueueJob).not.toHaveBeenCalled();
  });

  it("does not throw when an individual enqueue call fails", async () => {
    mocks.enqueueJob.mockClear();
    mocks.enqueueJob.mockResolvedValue({ ok: false, conflict: false, error: "boom" });
    const supabase = mockSupabase([{ id: "user-1" }]);

    await expect(
      ensureDigestJobsQueued(supabase, new Date("2026-07-27T03:00:00.000Z"))
    ).resolves.toBeUndefined();
  });
});
