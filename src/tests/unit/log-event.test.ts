import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logEvent } from "@/lib/analytics/log-event";
import type { EventType } from "@/lib/analytics/event-types";

function mockSupabase(resolvedValue: { error: unknown }): SupabaseClient {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue(resolvedValue)
    })
  } as unknown as SupabaseClient;
}

describe("logEvent", () => {
  it("logs event successfully with correct fields (case 1)", async () => {
    const supabase = mockSupabase({ error: null });
    const properties = { session_id: "sess-123", exam_id: "exam-456", type: "diagnostic" };

    const result = await logEvent(supabase, {
      userId: "user-123",
      eventType: "test_start",
      entityType: "session",
      entityId: "sess-123",
      properties
    });

    expect(result).toEqual({ ok: true });
    expect(supabase.from).toHaveBeenCalledWith("user_events");
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value.insert)
      .toHaveBeenCalledWith({
        user_id: "user-123",
        event_type: "test_start",
        entity_type: "session",
        entity_id: "sess-123",
        properties
      });
  });

  it("returns error on invalid event type and does not call insert (case 2)", async () => {
    const supabase = mockSupabase({ error: null });

    const result = await logEvent(supabase, {
      userId: "user-123",
      eventType: "invalid_event" as EventType
    });

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("error");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("handles Supabase errors gracefully without throwing (case 3)", async () => {
    const supabase = mockSupabase({ error: { message: "Database connection failed" } });

    const result = await logEvent(supabase, {
      userId: "user-123",
      eventType: "test_start"
    });

    expect(result).toEqual({ ok: false, error: "Database connection failed" });
  });

  it("handles throwing errors inside Supabase call gracefully (case 4)", async () => {
    const supabase = {
      from: vi.fn().mockImplementation(() => {
        throw new Error("Unexpected database crash");
      })
    } as unknown as SupabaseClient;

    const result = await logEvent(supabase, {
      userId: "user-123",
      eventType: "test_start"
    });

    expect(result).toEqual({ ok: false, error: "Unexpected database crash" });
  });

  it("passes properties and entities through correctly (case 5)", async () => {
    const supabase = mockSupabase({ error: null });
    const properties = { foo: "bar" };

    const result = await logEvent(supabase, {
      userId: null,
      eventType: "analysis_view",
      entityType: "result",
      entityId: "res-999",
      properties
    });

    expect(result).toEqual({ ok: true });
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value.insert)
      .toHaveBeenCalledWith({
        user_id: null,
        event_type: "analysis_view",
        entity_type: "result",
        entity_id: "res-999",
        properties
      });
  });
});
