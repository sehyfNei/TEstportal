import { describe, expect, it } from "vitest";
import { isDueForReminder, REMINDER_WINDOW_HOURS } from "@/lib/scheduling/reminder-window";

describe("isDueForReminder", () => {
  const now = new Date("2026-07-26T00:00:00.000Z");

  it("is due when scheduled_for is already in the past", () => {
    expect(
      isDueForReminder({ status: "planned", scheduledFor: "2026-07-25T00:00:00.000Z", reminderSentAt: null }, now)
    ).toBe(true);
  });

  it("is due when scheduled_for is within the reminder window", () => {
    expect(
      isDueForReminder({ status: "planned", scheduledFor: "2026-07-26T12:00:00.000Z", reminderSentAt: null }, now)
    ).toBe(true);
  });

  it("is not due when scheduled_for is beyond the reminder window", () => {
    expect(
      isDueForReminder({ status: "planned", scheduledFor: "2026-07-30T00:00:00.000Z", reminderSentAt: null }, now)
    ).toBe(false);
  });

  it("respects a custom window", () => {
    const scheduledFor = "2026-07-27T00:00:00.000Z"; // 24h out
    expect(isDueForReminder({ status: "planned", scheduledFor, reminderSentAt: null }, now, 12)).toBe(false);
    expect(isDueForReminder({ status: "planned", scheduledFor, reminderSentAt: null }, now, 48)).toBe(true);
  });

  it("is not due when a reminder was already sent", () => {
    expect(
      isDueForReminder(
        { status: "planned", scheduledFor: "2026-07-25T00:00:00.000Z", reminderSentAt: "2026-07-25T12:00:00.000Z" },
        now
      )
    ).toBe(false);
  });

  it("is not due for non-planned statuses", () => {
    expect(
      isDueForReminder({ status: "completed", scheduledFor: "2026-07-25T00:00:00.000Z", reminderSentAt: null }, now)
    ).toBe(false);
    expect(
      isDueForReminder({ status: "cancelled", scheduledFor: "2026-07-25T00:00:00.000Z", reminderSentAt: null }, now)
    ).toBe(false);
  });

  it("is not due for an unparseable scheduled_for", () => {
    expect(isDueForReminder({ status: "planned", scheduledFor: "not-a-date", reminderSentAt: null }, now)).toBe(
      false
    );
  });

  it("defaults to a 24 hour window", () => {
    expect(REMINDER_WINDOW_HOURS).toBe(24);
  });
});
