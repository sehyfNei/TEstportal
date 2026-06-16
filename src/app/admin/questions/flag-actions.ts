"use server";

import { requireAdminForAction } from "@/lib/auth/require-admin";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ResolveFlagState = { ok: boolean; message: string };

// ---------------------------------------------------------------------------
// resolveFlagAction — single-flag path (TSP-028, unchanged)
// useActionState-compatible signature: (prev, formData) -> { ok, message }
// ---------------------------------------------------------------------------
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

  return { ok: true, message: `Flag ${resolution}.` };
}

// ---------------------------------------------------------------------------
// resolveQuestionFlagsAction — bulk path (TSP-092)
// Closes all open/reviewing flags for a question in one RPC transaction.
// useActionState-compatible signature: (prev, formData) -> { ok, message }
// ---------------------------------------------------------------------------
export async function resolveQuestionFlagsAction(
  _prev: ResolveFlagState,
  formData: FormData
): Promise<ResolveFlagState> {
  const questionId = getString(formData, "questionId");
  const resolution = getString(formData, "resolution");

  if (!UUID_REGEX.test(questionId)) {
    return { ok: false, message: "Invalid question ID." };
  }

  if (resolution !== "resolved" && resolution !== "rejected") {
    return { ok: false, message: "Resolution must be 'resolved' or 'rejected'." };
  }

  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const adminCheck = await requireAdminForAction();
  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_flags_for_question", {
    p_question_id: questionId,
    p_resolution: resolution,
    p_note: null
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const result = (data ?? {}) as { closed_count?: number; open_flags?: number };
  const closed = result.closed_count ?? 0;
  const msg =
    closed === 0
      ? "No open flags to close."
      : `${closed} flag${closed === 1 ? "" : "s"} ${resolution}. Question stays quarantined until restored via the editor.`;

  return { ok: true, message: msg };
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
