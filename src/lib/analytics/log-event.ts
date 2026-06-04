import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidEventType, type EventType } from "@/lib/analytics/event-types";

export type LogEventParams = {
  userId: string | null;
  eventType: EventType;
  entityType?: string | null;
  entityId?: string | null;
  properties?: Record<string, unknown> | null;
};

export type LogEventResult = { ok: true } | { ok: false; error: string };

// Works from any context (server action -> server client, job -> admin client).
// ALWAYS non-fatal: never throws, never blocks the caller's flow.
export async function logEvent(
  supabase: SupabaseClient,
  params: LogEventParams
): Promise<LogEventResult> {
  if (!isValidEventType(params.eventType)) {
    return { ok: false, error: `invalid event_type: ${String(params.eventType)}` };
  }
  try {
    const { error } = await supabase.from("user_events").insert({
      user_id: params.userId,
      event_type: params.eventType,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      properties: params.properties ?? null
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "unknown error" };
  }
}
