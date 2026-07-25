import { afterEach, describe, expect, it, vi } from "vitest";
import { buildBody, sendDigestEmail } from "@/lib/notifications/digest-email";

function baseInput() {
  return {
    toEmail: "student@example.com",
    examName: "UPSC Prelims",
    testsCompletedThisWeek: 3,
    weakTopics: [{ topicName: "Indian Polity", masteryScore: 42.4 }],
    upcoming: [{ sessionType: "topic", scheduledFor: "2026-08-01T10:00:00.000Z" }]
  };
}

describe("buildBody", () => {
  it("mentions the number of tests completed this week", () => {
    expect(buildBody(baseInput())).toContain("3 tests");
  });

  it("uses singular phrasing for exactly one test", () => {
    expect(buildBody({ ...baseInput(), testsCompletedThisWeek: 1 })).toContain("1 test ");
  });

  it("encourages a session when nothing was completed", () => {
    expect(buildBody({ ...baseInput(), testsCompletedThisWeek: 0 })).toContain("No tests completed");
  });

  it("lists weak topics with rounded mastery", () => {
    expect(buildBody(baseInput())).toContain("Indian Polity (42% mastered)");
  });

  it("omits the weak-topics line when there are none", () => {
    expect(buildBody({ ...baseInput(), weakTopics: [] })).not.toContain("Focus next");
  });

  it("lists upcoming scheduled items", () => {
    expect(buildBody(baseInput())).toContain("topic on");
  });

  it("prompts scheduling when nothing is upcoming", () => {
    expect(buildBody({ ...baseInput(), upcoming: [] })).toContain("Nothing scheduled yet");
  });
});

describe("sendDigestEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips sending and returns not_configured when Resend isn't set up", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("REMINDER_FROM_EMAIL", "");
    const fetchFn = vi.fn();

    const result = await sendDigestEmail(baseInput(), { fetchFn });

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends via the Resend API when configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("REMINDER_FROM_EMAIL", "reminders@example.com");
    const fetchFn = vi.fn<(url: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify({ id: "email-1" }), { status: 200 })
    );

    const result = await sendDigestEmail(baseInput(), { fetchFn: fetchFn as unknown as typeof fetch });

    expect(result).toEqual({ sent: true });
    const body = JSON.parse((fetchFn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toBe("student@example.com");
    expect(body.subject).toContain("UPSC Prelims");
  });

  it("reports send_failed on a non-2xx response", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("REMINDER_FROM_EMAIL", "reminders@example.com");
    const fetchFn = vi.fn(async () => new Response("bad request", { status: 400 }));

    const result = await sendDigestEmail(baseInput(), { fetchFn: fetchFn as unknown as typeof fetch });

    expect(result).toEqual({ sent: false, reason: "send_failed", error: "HTTP 400" });
  });
});
