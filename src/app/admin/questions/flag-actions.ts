"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/auth/require-admin";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ResolveFlagState = { ok: boolean; message: string };

// useActionState-compatible signature: (prev, formData) -> { ok, message }
export async function resolveFlagAction(
  _prev: ResolveFlagState,
  formData: FormData
): Promise<ResolveFlagState> {
  const flagId = getString(formData, "flagId");
  const resolution = getString(formData, "resolution");

  if (!UUID_REGEX.test(flagId)) {
    return { ok: false, message: "Invalid flag ID." };
  }

  if (resolution !== "resolved" && resolution !== "rejected") {
    return { ok: false, message: "Resolution must be 'resolved' or 'rejected'." };
  }

  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  // Defense-in-depth: admin check in TS layer; RPC also enforces is_admin().
  const adminCheck = await requireAdminForAction();
  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_question_flag", {
    p_flag_id: flagId,
    p_resolution: resolution,
    p_note: null
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/questions/flags");
  return { ok: true, message: `Flag ${resolution}.` };
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
