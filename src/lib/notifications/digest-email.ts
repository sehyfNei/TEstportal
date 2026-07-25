import { getErrorMessage } from "@/lib/errors";
import { hasResendConfig } from "@/lib/notifications/resend-config";

export type DigestUpcomingItem = {
  sessionType: string;
  scheduledFor: string;
};

export type DigestWeakTopic = {
  topicName: string;
  masteryScore: number;
};

export type DigestEmailInput = {
  toEmail: string;
  examName: string;
  testsCompletedThisWeek: number;
  weakTopics: DigestWeakTopic[];
  upcoming: DigestUpcomingItem[];
};

export type SendDigestEmailResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "send_failed"; error?: string };

export type SendDigestEmailDeps = {
  fetchFn?: typeof fetch;
};

export async function sendDigestEmail(
  input: DigestEmailInput,
  deps: SendDigestEmailDeps = {}
): Promise<SendDigestEmailResult> {
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

export function buildSubject(input: Pick<DigestEmailInput, "examName">): string {
  return `Your week with ${input.examName}`;
}

export function buildBody(input: DigestEmailInput): string {
  const lines: string[] = [];

  lines.push(
    input.testsCompletedThisWeek > 0
      ? `You completed ${input.testsCompletedThisWeek} test${input.testsCompletedThisWeek === 1 ? "" : "s"} this week for ${input.examName}.`
      : `No tests completed this week for ${input.examName} - a quick session goes a long way.`
  );

  if (input.weakTopics.length > 0) {
    lines.push(
      `Focus next: ${input.weakTopics.map((topic) => `${topic.topicName} (${Math.round(topic.masteryScore)}% mastered)`).join(", ")}.`
    );
  }

  if (input.upcoming.length > 0) {
    lines.push(
      `Upcoming: ${input.upcoming
        .map((item) => `${humanizeSessionType(item.sessionType)} on ${formatWhen(item.scheduledFor)}`)
        .join("; ")}.`
    );
  } else {
    lines.push("Nothing scheduled yet - visit the Schedule page to plan your next session.");
  }

  return lines.join("\n\n");
}

function humanizeSessionType(sessionType: string): string {
  return sessionType.replace(/_/g, " ");
}

function formatWhen(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleDateString();
}
