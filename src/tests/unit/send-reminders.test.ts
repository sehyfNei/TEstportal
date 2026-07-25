import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendReminderEmail: vi.fn()
}));

vi.mock("@/lib/notifications/reminder-email", () => ({
  sendReminderEmail: mocks.sendReminderEmail
}));

import { sendRemindersJob } from "@/lib/jobs/handlers/send-reminders";

type ScheduledRow = {
  id: string;
  exam_id: string;
  item_type: string;
  session_type: string;
  scheduled_for: string;
  status: string;
  reminder_sent_at: string | null;
};

function mockSupabase(options: {
  scheduledItems: ScheduledRow[];
  exams: { id: string; name: string }[];
  userEmail: string | null;
  updateError?: { message: string };
}) {
  const updateCalls: { id: string; payload: Record<string, unknown> }[] = [];

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "scheduled_items") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => Promise.resolve({ data: options.scheduledItems, error: null }))
              }))
            }))
          })),
          update: vi.fn((payload: Record<string, unknown>) => ({
            eq: vi.fn((_col: string, id: string) => {
              updateCalls.push({ id, payload });
              return Promise.resolve({ error: options.updateError ?? null });
            })
          }))
        };
      }

      if (table === "exams") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: options.exams, error: null }))
          }))
        };
      }

      throw new Error(`unexpected table ${table}`);
    }),
    auth: {
      admin: {
        getUserById: vi.fn(() =>
          Promise.resolve(
            options.userEmail
              ? { data: { user: { email: options.userEmail } }, error: null }
              : { data: { user: null }, error: null }
          )
        )
      }
    }
  };

  return { supabase: supabase as unknown as never, updateCalls };
}

describe("sendRemindersJob", () => {
  const now = new Date("2026-07-26T00:00:00.000Z");

  it("is a no-op when the user has no due items", async () => {
    const { supabase, updateCalls } = mockSupabase({ scheduledItems: [], exams: [], userEmail: "s@example.com" });

    await sendRemindersJob("user-1", supabase, now);

    expect(mocks.sendReminderEmail).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(0);
  });

  it("sends an email for each due item and marks reminder_sent_at", async () => {
    mocks.sendReminderEmail.mockClear();
    mocks.sendReminderEmail.mockResolvedValue({ sent: true });

    const { supabase, updateCalls } = mockSupabase({
      scheduledItems: [
        {
          id: "item-1",
          exam_id: "exam-1",
          item_type: "test",
          session_type: "diagnostic",
          scheduled_for: "2026-07-25T00:00:00.000Z",
          status: "planned",
          reminder_sent_at: null
        }
      ],
      exams: [{ id: "exam-1", name: "UPSC Prelims" }],
      userEmail: "student@example.com"
    });

    await sendRemindersJob("user-1", supabase, now);

    expect(mocks.sendReminderEmail).toHaveBeenCalledWith({
      toEmail: "student@example.com",
      examName: "UPSC Prelims",
      sessionType: "diagnostic",
      scheduledFor: "2026-07-25T00:00:00.000Z"
    });
    expect(updateCalls).toEqual([{ id: "item-1", payload: { reminder_sent_at: now.toISOString() } }]);
  });

  it("still marks reminder_sent_at when the user has no resolvable email", async () => {
    mocks.sendReminderEmail.mockClear();

    const { supabase, updateCalls } = mockSupabase({
      scheduledItems: [
        {
          id: "item-1",
          exam_id: "exam-1",
          item_type: "test",
          session_type: "diagnostic",
          scheduled_for: "2026-07-25T00:00:00.000Z",
          status: "planned",
          reminder_sent_at: null
        }
      ],
      exams: [{ id: "exam-1", name: "UPSC Prelims" }],
      userEmail: null
    });

    await sendRemindersJob("user-1", supabase, now);

    expect(mocks.sendReminderEmail).not.toHaveBeenCalled();
    expect(updateCalls).toEqual([{ id: "item-1", payload: { reminder_sent_at: now.toISOString() } }]);
  });

  it("still marks reminder_sent_at even when sendReminderEmail throws", async () => {
    mocks.sendReminderEmail.mockClear();
    mocks.sendReminderEmail.mockRejectedValue(new Error("resend down"));

    const { supabase, updateCalls } = mockSupabase({
      scheduledItems: [
        {
          id: "item-1",
          exam_id: "exam-1",
          item_type: "test",
          session_type: "mock",
          scheduled_for: "2026-07-25T00:00:00.000Z",
          status: "planned",
          reminder_sent_at: null
        }
      ],
      exams: [{ id: "exam-1", name: "UPSC Prelims" }],
      userEmail: "student@example.com"
    });

    await expect(sendRemindersJob("user-1", supabase, now)).resolves.toBeUndefined();
    expect(updateCalls).toEqual([{ id: "item-1", payload: { reminder_sent_at: now.toISOString() } }]);
  });

  it("filters out items outside the reminder window before processing", async () => {
    mocks.sendReminderEmail.mockClear();

    const { supabase, updateCalls } = mockSupabase({
      scheduledItems: [
        {
          id: "item-far-out",
          exam_id: "exam-1",
          item_type: "test",
          session_type: "diagnostic",
          scheduled_for: "2026-09-01T00:00:00.000Z",
          status: "planned",
          reminder_sent_at: null
        }
      ],
      exams: [{ id: "exam-1", name: "UPSC Prelims" }],
      userEmail: "student@example.com"
    });

    await sendRemindersJob("user-1", supabase, now);

    expect(mocks.sendReminderEmail).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(0);
  });
});
