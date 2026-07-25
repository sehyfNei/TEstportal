import { getErrorMessage } from "@/lib/errors";

export function hasResendConfig(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.REMINDER_FROM_EMAIL);
}

export type ReminderEmailInput = {
  toEmail: string;
  examName: string;
  sessionType: string;
  scheduledFor: string;
};

export type SendReminderEmailResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "send_failed"; error?: string };

export type SendReminderEmailDeps = {
  fetchFn?: typeof fetch;
};

// Gated the same way callAi is gated by AI_DISABLED/GROQ_API_KEY: when Resend
// isn't configured yet, this is a clean no-op rather than a thrown error, so
// the reminder job can still run (and still mark reminder_sent_at) before
// the founder has set up email.
export async function sendReminderEmail(
  input: ReminderEmailInput,
  deps: SendReminderEmailDeps = {}
): Promise<SendReminderEmailResult> {
  if (!hasResendConfig()) {
    return { sent: false, reason: "not_configured" };
  }

  const fetchFn = deps.fetchFn ?? fetch;

  try {
    const response = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.REMINDER_FROM_EMAIL,
        to: input.toEmail,
        subject: buildSubject(input),
        text: buildBody(input)
      })
    });

    if (!response.ok) {
      return { sent: false, reason: "send_failed", error: `HTTP ${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    return { sent: false, reason: "send_failed", error: getErrorMessage(error) };
  }
}

function buildSubject(input: ReminderEmailInput): string {
  return `Reminder: ${humanizeSessionType(input.sessionType)} for ${input.examName}`;
}

function buildBody(input: ReminderEmailInput): string {
  const when = formatWhen(input.scheduledFor);
  return `Your ${humanizeSessionType(input.sessionType)} for ${input.examName} is scheduled for ${when}. Open the Test Series Portal to start or reschedule it.`;
}

function humanizeSessionType(sessionType: string): string {
  return sessionType.replace(/_/g, " ");
}

function formatWhen(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString();
}
