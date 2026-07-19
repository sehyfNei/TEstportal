import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueueJob: vi.fn()
}));

vi.mock("@/lib/jobs/enqueue", () => ({
  enqueueJob: mocks.enqueueJob,
  generateIdempotencyKey: (type: string, ...parts: string[]) => [type, ...parts].join(":")
}));

import { ensureNightlyJobsQueued, utcDayKey } from "@/lib/jobs/nightly";

describe("utcDayKey", () => {
  it("formats a UTC calendar day regardless of local time zone", () => {
    expect(utcDayKey(new Date("2026-07-16T23:59:00.000Z"))).toBe("2026-07-16");
    expect(utcDayKey(new Date("2026-07-16T00:00:00.000Z"))).toBe("2026-07-16");
  });
});

describe("ensureNightlyJobsQueued", () => {
  it("enqueues compute_question_stats with a date-scoped idempotency key", async () => {
    mocks.enqueueJob.mockResolvedValue({ ok: true, jobId: null, conflict: false });
    const supabase = {} as never;

    await ensureNightlyJobsQueued(supabase, new Date("2026-07-16T03:00:00.000Z"));

    expect(mocks.enqueueJob).toHaveBeenCalledWith(
      supabase,
      "compute_question_stats",
      {},
      "compute_question_stats:2026-07-16"
    );
  });

  it("does not throw when enqueue reports a conflict (already queued today)", async () => {
    mocks.enqueueJob.mockResolvedValue({ ok: true, jobId: null, conflict: true });
    await expect(
      ensureNightlyJobsQueued({} as never, new Date("2026-07-16T03:00:00.000Z"))
    ).resolves.toBeUndefined();
  });

  it("does not throw when enqueue fails outright (logs and continues)", async () => {
    mocks.enqueueJob.mockResolvedValue({ ok: false, conflict: false, error: "boom" });
    await expect(
      ensureNightlyJobsQueued({} as never, new Date("2026-07-16T03:00:00.000Z"))
    ).resolves.toBeUndefined();
  });
});
