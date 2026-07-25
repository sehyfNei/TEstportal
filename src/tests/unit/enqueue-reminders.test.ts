import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueueJob: vi.fn()
}));

vi.mock("@/lib/jobs/enqueue", () => ({
  enqueueJob: mocks.enqueueJob,
  generateIdempotencyKey: (type: string, ...parts: string[]) => [type, ...parts].join(":")
}));

import { ensureReminderJobsQueued } from "@/lib/jobs/enqueue-reminders";

type Row = { user_id: string; status: string; scheduled_for: string; reminder_sent_at: string | null };

function mockSupabase(rows: Row[], error: { message: string } | null = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: rows, error }))
          }))
        }))
      }))
    }))
  } as unknown as never;
}

describe("ensureReminderJobsQueued", () => {
  const now = new Date("2026-07-26T00:00:00.000Z");

  it("enqueues one job per distinct user with a due item, with a date-scoped key", async () => {
    mocks.enqueueJob.mockClear();
    mocks.enqueueJob.mockResolvedValue({ ok: true, jobId: null, conflict: false });

    const supabase = mockSupabase([
      { user_id: "user-1", status: "planned", scheduled_for: "2026-07-25T00:00:00.000Z", reminder_sent_at: null },
      { user_id: "user-1", status: "planned", scheduled_for: "2026-07-26T06:00:00.000Z", reminder_sent_at: null },
      { user_id: "user-2", status: "planned", scheduled_for: "2026-07-26T12:00:00.000Z", reminder_sent_at: null }
    ]);

    await ensureReminderJobsQueued(supabase, now);

    expect(mocks.enqueueJob).toHaveBeenCalledTimes(2);
    expect(mocks.enqueueJob).toHaveBeenCalledWith(
      supabase,
      "send_reminders",
      { user_id: "user-1" },
      "send_reminders:user-1:2026-07-26"
    );
    expect(mocks.enqueueJob).toHaveBeenCalledWith(
      supabase,
      "send_reminders",
      { user_id: "user-2" },
      "send_reminders:user-2:2026-07-26"
    );
  });

  it("does not enqueue users whose items are outside the reminder window", async () => {
    mocks.enqueueJob.mockClear();
    mocks.enqueueJob.mockResolvedValue({ ok: true, jobId: null, conflict: false });

    const supabase = mockSupabase([
      { user_id: "user-far-out", status: "planned", scheduled_for: "2026-08-15T00:00:00.000Z", reminder_sent_at: null }
    ]);

    await ensureReminderJobsQueued(supabase, now);

    expect(mocks.enqueueJob).not.toHaveBeenCalled();
  });

  it("does not throw when the initial query errors", async () => {
    mocks.enqueueJob.mockClear();
    const supabase = mockSupabase([], { message: "db down" });

    await expect(ensureReminderJobsQueued(supabase, now)).resolves.toBeUndefined();
    expect(mocks.enqueueJob).not.toHaveBeenCalled();
  });

  it("does not throw when an individual enqueue call fails", async () => {
    mocks.enqueueJob.mockClear();
    mocks.enqueueJob.mockResolvedValue({ ok: false, conflict: false, error: "boom" });

    const supabase = mockSupabase([
      { user_id: "user-1", status: "planned", scheduled_for: "2026-07-25T00:00:00.000Z", reminder_sent_at: null }
    ]);

    await expect(ensureReminderJobsQueued(supabase, now)).resolves.toBeUndefined();
  });
});
