import { afterEach, describe, expect, it, vi } from "vitest";
import { hasResendConfig, sendReminderEmail } from "@/lib/notifications/reminder-email";

function baseInput() {
  return {
    toEmail: "student@example.com",
    examName: "UPSC Prelims",
    sessionType: "concept_retest",
    scheduledFor: "2026-07-26T10:00:00.000Z"
  };
}

describe("hasResendConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false when neither env var is set", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("REMINDER_FROM_EMAIL", "");
    expect(hasResendConfig()).toBe(false);
  });

  it("is false when only the API key is set", () => {
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("REMINDER_FROM_EMAIL", "");
    expect(hasResendConfig()).toBe(false);
  });

  it("is true when both env vars are set", () => {
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("REMINDER_FROM_EMAIL", "reminders@example.com");
    expect(hasResendConfig()).toBe(true);
  });
});

describe("sendReminderEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips sending and returns not_configured when Resend isn't set up", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("REMINDER_FROM_EMAIL", "");
    const fetchFn = vi.fn();

    const result = await sendReminderEmail(baseInput(), { fetchFn });

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends via the Resend API when configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("REMINDER_FROM_EMAIL", "reminders@example.com");
    const fetchFn = vi.fn<(url: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify({ id: "email-1" }), { status: 200 })
    );

    const result = await sendReminderEmail(baseInput(), { fetchFn: fetchFn as unknown as typeof fetch });

    expect(result).toEqual({ sent: true });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" })
      })
    );
    const body = JSON.parse((fetchFn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toBe("student@example.com");
    expect(body.from).toBe("reminders@example.com");
    expect(body.subject).toContain("UPSC Prelims");
  });

  it("reports send_failed on a non-2xx response", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("REMINDER_FROM_EMAIL", "reminders@example.com");
    const fetchFn = vi.fn(async () => new Response("bad request", { status: 400 }));

    const result = await sendReminderEmail(baseInput(), { fetchFn: fetchFn as unknown as typeof fetch });

    expect(result).toEqual({ sent: false, reason: "send_failed", error: "HTTP 400" });
  });

  it("reports send_failed when fetch throws", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("REMINDER_FROM_EMAIL", "reminders@example.com");
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await sendReminderEmail(baseInput(), { fetchFn: fetchFn as unknown as typeof fetch });

    expect(result).toEqual({ sent: false, reason: "send_failed", error: "network down" });
  });
});
