import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobType, JobPayloads } from "./types";

export type EnqueueResult =
  | { ok: true; jobId: null; conflict: false }
  | { ok: true; jobId: null; conflict: true }
  | { ok: false; conflict: false; error: string };

export function generateIdempotencyKey(type: JobType, ...parts: string[]): string {
  return [type, ...parts].join(":");
}

export async function enqueueJob<T extends JobType>(
  supabase: SupabaseClient,
  type: T,
  payload: JobPayloads[T],
  idempotencyKey?: string
): Promise<EnqueueResult> {
  const finalKey = idempotencyKey ?? generateIdempotencyKey(
    type,
    ...Object.values(payload as Record<string, unknown>).map(String)
  );

  const { error } = await supabase
    .from("jobs")
    .insert({
      type,
      status: "pending",
      idempotency_key: finalKey,
      payload
    });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, jobId: null, conflict: true };
    }
    return { ok: false, conflict: false, error: error.message };
  }

  return { ok: true, jobId: null, conflict: false };
}
