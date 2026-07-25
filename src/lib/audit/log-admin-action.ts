import type { SupabaseClient } from "@supabase/supabase-js";
import { getErrorMessage } from "@/lib/errors";
import { isValidAuditAction, type AuditAction } from "@/lib/audit/audit-actions";

export type LogAdminActionParams = {
  actorId: string | null;
  action: AuditAction;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
};

export type LogAdminActionResult = { ok: true } | { ok: false; error: string };

// Mirrors logEvent (src/lib/analytics/log-event.ts): takes an already-built
// SupabaseClient so it works from any server-action context, validates
// against a closed action union, and NEVER throws - a failed audit write
// must not be able to break the admin mutation it's recording.
export async function logAdminAction(
  supabase: SupabaseClient,
  params: LogAdminActionParams
): Promise<LogAdminActionResult> {
  if (!isValidAuditAction(params.action)) {
    return { ok: false, error: `invalid audit action: ${String(params.action)}` };
  }

  try {
    const { error } = await supabase.from("audit_log").insert({
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      details: params.details ?? null
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: getErrorMessage(err) || "unknown error" };
  }
}
