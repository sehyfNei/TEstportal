"use server";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { logEvent } from "@/lib/analytics/log-event";
import { isValidEventType } from "@/lib/analytics/event-types";

type AuthCheckResult = { ok: false; message: string } | { ok: true; userId: string };

async function requireAuth(): Promise<AuthCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, message: error?.message ?? "Sign in to continue." };
  }

  return { ok: true, userId: user.id };
}

// Fire-and-forget client entry point (e.g. analysis_view from a client component).
export async function logEventAction(input: {
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  properties?: Record<string, unknown> | null;
}): Promise<void> {
  if (!hasSupabaseConfig()) return;
  if (!isValidEventType(input.eventType)) return;
  const auth = await requireAuth();
  if (!auth.ok) return;
  const supabase = await createClient();
  await logEvent(supabase, {
    userId: auth.userId,
    eventType: input.eventType,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    properties: input.properties ?? null
  });
}
