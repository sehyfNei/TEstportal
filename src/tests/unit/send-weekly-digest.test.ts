import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchDashboardOverview: vi.fn(),
  sendDigestEmail: vi.fn()
}));

vi.mock("@/lib/dashboard/overview", () => ({
  fetchDashboardOverview: mocks.fetchDashboardOverview
}));

vi.mock("@/lib/notifications/digest-email", () => ({
  sendDigestEmail: mocks.sendDigestEmail
}));

import { sendWeeklyDigestJob } from "@/lib/jobs/handlers/send-weekly-digest";

type Resp = { data: unknown; error: unknown };

/** A chainable query stub: every chain method returns itself; awaiting it
 * (or calling .maybeSingle()) resolves to the configured response. */
function chain(resp: Resp) {
  const obj: Record<string, unknown> = {
    select: vi.fn(() => obj),
    eq: vi.fn(() => obj),
    gte: vi.fn(() => obj),
    lte: vi.fn(() => obj),
    order: vi.fn(() => obj),
    limit: vi.fn(() => obj),
    maybeSingle: vi.fn(() => Promise.resolve(resp)),
    then: (onFulfilled?: (value: Resp) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(resp).then(onFulfilled, onRejected)
  };
  return obj;
}

function mockSupabase(config: {
  testSessionExamId?: string | null;
  scheduledFallbackExamId?: string | null;
  examName?: string;
  weekCount?: number;
  upcoming?: { session_type: string; scheduled_for: string }[];
  userEmail?: string | null;
}) {
  const scheduledItemsCalls: string[] = [];

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "test_sessions") {
        return chain({ data: config.testSessionExamId ? { exam_id: config.testSessionExamId } : null, error: null });
      }
      if (table === "exams") {
        return chain({ data: { name: config.examName ?? "UPSC Prelims" }, error: null });
      }
      if (table === "session_results") {
        return chain({ data: null, error: null, count: config.weekCount ?? 0 } as never);
      }
      if (table === "scheduled_items") {
        scheduledItemsCalls.push("call");
        // First call (only reached if test_sessions had nothing) resolves the
        // fallback exam id via maybeSingle; later call is the upcoming list.
        if (scheduledItemsCalls.length === 1 && !config.testSessionExamId) {
          return chain({
            data: config.scheduledFallbackExamId ? { exam_id: config.scheduledFallbackExamId } : null,
            error: null
          });
        }
        return chain({ data: config.upcoming ?? [], error: null });
      }
      throw new Error(`unexpected table ${table}`);
    }),
    auth: {
      admin: {
        getUserById: vi.fn(() =>
          Promise.resolve(
            config.userEmail !== undefined && config.userEmail !== null
              ? { data: { user: { email: config.userEmail } }, error: null }
              : { data: { user: null }, error: null }
          )
        )
      }
    }
  };

  return supabase as unknown as never;
}

describe("sendWeeklyDigestJob", () => {
  const now = new Date("2026-07-27T03:00:00.000Z");

  it("is a no-op when no exam can be resolved from sessions or schedule", async () => {
    mocks.fetchDashboardOverview.mockClear();
    mocks.sendDigestEmail.mockClear();
    const supabase = mockSupabase({ testSessionExamId: null, scheduledFallbackExamId: null });

    await sendWeeklyDigestJob("user-1", supabase, now);

    expect(mocks.fetchDashboardOverview).not.toHaveBeenCalled();
    expect(mocks.sendDigestEmail).not.toHaveBeenCalled();
  });

  it("falls back to a scheduled_items exam when the user has no test_sessions", async () => {
    mocks.fetchDashboardOverview.mockClear();
    mocks.fetchDashboardOverview.mockResolvedValue({ weakTopics: [] });
    mocks.sendDigestEmail.mockClear();
    mocks.sendDigestEmail.mockResolvedValue({ sent: true });

    const supabase = mockSupabase({
      testSessionExamId: null,
      scheduledFallbackExamId: "exam-fallback",
      userEmail: "student@example.com"
    });

    await sendWeeklyDigestJob("user-1", supabase, now);

    expect(mocks.fetchDashboardOverview).toHaveBeenCalledWith(supabase, "user-1", "exam-fallback");
  });

  it("sends a digest built from the dashboard overview and schedule when everything resolves", async () => {
    mocks.fetchDashboardOverview.mockClear();
    mocks.fetchDashboardOverview.mockResolvedValue({
      weakTopics: [{ topicId: "t1", topicName: "Indian Polity", masteryScore: 42, weightPercent: 10 }]
    });
    mocks.sendDigestEmail.mockClear();
    mocks.sendDigestEmail.mockResolvedValue({ sent: true });

    const supabase = mockSupabase({
      testSessionExamId: "exam-1",
      examName: "UPSC Prelims",
      weekCount: 2,
      upcoming: [{ session_type: "topic", scheduled_for: "2026-08-01T10:00:00.000Z" }],
      userEmail: "student@example.com"
    });

    await sendWeeklyDigestJob("user-1", supabase, now);

    expect(mocks.fetchDashboardOverview).toHaveBeenCalledWith(supabase, "user-1", "exam-1");
    expect(mocks.sendDigestEmail).toHaveBeenCalledWith({
      toEmail: "student@example.com",
      examName: "UPSC Prelims",
      testsCompletedThisWeek: 2,
      weakTopics: [{ topicName: "Indian Polity", masteryScore: 42 }],
      upcoming: [{ sessionType: "topic", scheduledFor: "2026-08-01T10:00:00.000Z" }]
    });
  });

  it("does not send when the user has no resolvable email", async () => {
    mocks.fetchDashboardOverview.mockClear();
    mocks.fetchDashboardOverview.mockResolvedValue({ weakTopics: [] });
    mocks.sendDigestEmail.mockClear();

    const supabase = mockSupabase({ testSessionExamId: "exam-1", userEmail: null });

    await sendWeeklyDigestJob("user-1", supabase, now);

    expect(mocks.sendDigestEmail).not.toHaveBeenCalled();
  });

  it("does not throw when sendDigestEmail itself throws", async () => {
    mocks.fetchDashboardOverview.mockClear();
    mocks.fetchDashboardOverview.mockResolvedValue({ weakTopics: [] });
    mocks.sendDigestEmail.mockClear();
    mocks.sendDigestEmail.mockRejectedValue(new Error("resend down"));

    const supabase = mockSupabase({ testSessionExamId: "exam-1", userEmail: "student@example.com" });

    await expect(sendWeeklyDigestJob("user-1", supabase, now)).resolves.toBeUndefined();
  });
});
