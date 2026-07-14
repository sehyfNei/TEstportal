"use server";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { MISTAKE_STATUSES } from "@/lib/mistakes/mistake-list";

// NOTE: a "use server" file may only export async functions — exporting the
// initial-state object from here crashed /mistakes in production (Next
// invalid-use-server-value, founder log 2026-07-14). Type exports are fine.
export type ResolveMistakeState = { ok: boolean; message: string };

export async function resolveMistakeAction(
  _prev: ResolveMistakeState,
  formData: FormData
): Promise<ResolveMistakeState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const mistakeId = getString(formData, "mistakeId");
  const status = getString(formData, "status");

  if (!isUuid(mistakeId)) {
    return { ok: false, message: "Invalid mistake id." };
  }

  if (!(MISTAKE_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, message: "Invalid status." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, message: authError?.message ?? "Sign in to continue." };
  }

  // Direct update - mistake_items has an owner-UPDATE RLS policy (TSP-059).
  const { error } = await supabase
    .from("mistake_items")
    .update({ 
      status, 
      resolved_at: status === "resolved" ? new Date().toISOString() : null 
    })
    .eq("id", mistakeId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Updated." };
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
