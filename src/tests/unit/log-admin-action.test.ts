import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import type { AuditAction } from "@/lib/audit/audit-actions";

function mockSupabase(resolvedValue: { error: unknown }): SupabaseClient {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue(resolvedValue)
    })
  } as unknown as SupabaseClient;
}

describe("logAdminAction", () => {
  it("logs an admin action successfully with correct fields", async () => {
    const supabase = mockSupabase({ error: null });
    const details = { fromStatus: "draft", toStatus: "approved" };

    const result = await logAdminAction(supabase, {
      actorId: "admin-1",
      action: "question_status_change",
      entityType: "question",
      entityId: "q-123",
      details
    });

    expect(result).toEqual({ ok: true });
    expect(supabase.from).toHaveBeenCalledWith("audit_log");
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value.insert).toHaveBeenCalledWith({
      actor_id: "admin-1",
      action: "question_status_change",
      entity_type: "question",
      entity_id: "q-123",
      details
    });
  });

  it("returns an error on an invalid action and does not call insert", async () => {
    const supabase = mockSupabase({ error: null });

    const result = await logAdminAction(supabase, {
      actorId: "admin-1",
      action: "not_a_real_action" as AuditAction
    });

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("error");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("handles Supabase errors gracefully without throwing", async () => {
    const supabase = mockSupabase({ error: { message: "Database connection failed" } });

    const result = await logAdminAction(supabase, {
      actorId: "admin-1",
      action: "manifest_import"
    });

    expect(result).toEqual({ ok: false, error: "Database connection failed" });
  });

  it("handles throwing errors inside the Supabase call gracefully", async () => {
    const supabase = {
      from: vi.fn().mockImplementation(() => {
        throw new Error("Unexpected database crash");
      })
    } as unknown as SupabaseClient;

    const result = await logAdminAction(supabase, {
      actorId: "admin-1",
      action: "question_bulk_import"
    });

    expect(result).toEqual({ ok: false, error: "Unexpected database crash" });
  });

  it("defaults optional fields to null when omitted", async () => {
    const supabase = mockSupabase({ error: null });

    const result = await logAdminAction(supabase, {
      actorId: null,
      action: "question_bulk_import"
    });

    expect(result).toEqual({ ok: true });
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value.insert).toHaveBeenCalledWith({
      actor_id: null,
      action: "question_bulk_import",
      entity_type: null,
      entity_id: null,
      details: null
    });
  });
});
