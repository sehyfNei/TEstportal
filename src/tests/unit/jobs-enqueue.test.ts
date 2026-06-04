import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateIdempotencyKey, enqueueJob } from "@/lib/jobs/enqueue";

describe("generateIdempotencyKey", () => {
  it("joins type and one part with a colon", () => {
    const key = generateIdempotencyKey("generate_analysis", "result-uuid");
    expect(key).toBe("generate_analysis:result-uuid");
  });

  it("joins type and multiple parts with a colon", () => {
    const key = generateIdempotencyKey("generate_improvement_plan", "result-uuid", "user-uuid", "exam-uuid");
    expect(key).toBe("generate_improvement_plan:result-uuid:user-uuid:exam-uuid");
  });

  it("returns just the type when no parts are provided", () => {
    const key = generateIdempotencyKey("compute_question_stats");
    expect(key).toBe("compute_question_stats");
  });
});

function mockSupabase(resolvedValue: { error: unknown }): SupabaseClient {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue(resolvedValue)
    })
  } as unknown as SupabaseClient;
}

describe("enqueueJob", () => {
  it("enqueues a job successfully with correct fields", async () => {
    const supabase = mockSupabase({ error: null });
    const payload = { result_id: "res-123", user_id: "usr-456" };

    const result = await enqueueJob(supabase, "generate_analysis", payload, "custom-key");

    expect(result).toEqual({ ok: true, jobId: null, conflict: false });
    expect(supabase.from).toHaveBeenCalledWith("jobs");
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value.insert)
      .toHaveBeenCalledWith({
        type: "generate_analysis",
        status: "pending",
        idempotency_key: "custom-key",
        payload
      });
  });

  it("generates default idempotency key from payload when key is omitted", async () => {
    const supabase = mockSupabase({ error: null });
    const payload = { result_id: "res-123", user_id: "usr-456" };

    const result = await enqueueJob(supabase, "generate_analysis", payload);

    expect(result).toEqual({ ok: true, jobId: null, conflict: false });
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value.insert)
      .toHaveBeenCalledWith({
        type: "generate_analysis",
        status: "pending",
        idempotency_key: "generate_analysis:res-123:usr-456",
        payload
      });
  });

  it("handles empty payload for default idempotency key (no parts → just type)", async () => {
    const supabase = mockSupabase({ error: null });

    const result = await enqueueJob(supabase, "decay_mastery", {});

    expect(result).toEqual({ ok: true, jobId: null, conflict: false });
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value.insert)
      .toHaveBeenCalledWith({
        type: "decay_mastery",
        status: "pending",
        idempotency_key: "decay_mastery",
        payload: {}
      });
  });

  it("returns conflict: true and jobId: null on unique constraint violation (23505)", async () => {
    const supabase = mockSupabase({ error: { code: "23505", message: "Duplicate key" } });

    const result = await enqueueJob(supabase, "send_reminders", { user_id: "usr-789" }, "remind-key");

    expect(result).toEqual({ ok: true, jobId: null, conflict: true });
  });

  it("returns ok: false on other database errors", async () => {
    const supabase = mockSupabase({ error: { code: "08006", message: "Database connection failed" } });

    const result = await enqueueJob(supabase, "weekly_digest", { user_id: "usr-789" }, "digest-key");

    expect(result).toEqual({ ok: false, conflict: false, error: "Database connection failed" });
  });
});
