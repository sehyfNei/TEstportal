"use server";

import { revalidatePath } from "next/cache";
import { fetchDashboardOverview, type DashboardOverview } from "@/lib/dashboard/overview";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type GetDashboardOverviewState =
  | { ok: true; data: DashboardOverview }
  | { ok: false; message: string };

export type StartRetestState = {
  ok: boolean;
  message: string;
  sessionId?: string;
};

export const initialStartRetestState: StartRetestState = { ok: false, message: "" };

export async function getDashboardOverviewAction(
  examId: string
): Promise<GetDashboardOverviewState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  if (!isUuid(examId)) {
    return { ok: false, message: "Valid exam id is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, message: authError?.message ?? "Sign in to continue." };
  }

  const data = await fetchDashboardOverview(supabase, user.id, examId);
  return { ok: true, data };
}

export async function startRetestAction(
  _prev: StartRetestState,
  formData: FormData
): Promise<StartRetestState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const retestQueueId = getString(formData, "retestQueueId");
  const examId = getString(formData, "examId");

  if (!isUuid(retestQueueId) || !isUuid(examId)) {
    return { ok: false, message: "Invalid retest or exam id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, message: authError?.message ?? "Sign in to continue." };
  }

  const { data: retestRow, error: retestError } = await supabase
    .from("retest_queue")
    .select("id,user_id,concept_id,topic_id")
    .eq("id", retestQueueId)
    .eq("exam_id", examId)
    .maybeSingle();

  if (retestError || !retestRow) {
    return { ok: false, message: "Retest item not found." };
  }

  const row = retestRow as {
    id: string;
    user_id: string;
    concept_id: string | null;
    topic_id: string | null;
  };

  if (row.user_id !== user.id) {
    return { ok: false, message: "Retest item not found." };
  }

  let topicId: string | null = row.topic_id;
  if (!topicId && row.concept_id) {
    const { data: conceptRow, error: conceptError } = await supabase
      .from("concepts")
      .select("topic_id")
      .eq("id", row.concept_id)
      .maybeSingle();

    if (conceptError) {
      return { ok: false, message: "Could not resolve topic for this retest." };
    }

    topicId = (conceptRow as { topic_id: string | null } | null)?.topic_id ?? null;
  }

  if (!topicId) {
    return { ok: false, message: "Could not resolve topic for this retest." };
  }

  const { data, error: startError } = await supabase.rpc("start_test_session", {
    p_exam_id: examId,
    p_type: "concept_retest",
    p_template_id: null,
    p_topic_id: topicId,
    p_count: 10,
    p_duration_minutes: null,
    p_min_quality_tier: "bronze"
  });

  if (startError) {
    return { ok: false, message: startError.message };
  }

  const sessionId = toSessionId(data);
  if (!sessionId) {
    return { ok: false, message: "Failed to start retest session." };
  }

  // Update test_session metadata with retestQueueId non-fatally
  try {
    const { data: sessionData, error: sessionFetchError } = await supabase
      .from("test_sessions")
      .select("metadata")
      .eq("id", sessionId)
      .maybeSingle();

    if (!sessionFetchError && sessionData) {
      const existingMetadata = (sessionData.metadata && typeof sessionData.metadata === "object")
        ? (sessionData.metadata as Record<string, unknown>)
        : {};

      await supabase
        .from("test_sessions")
        .update({
          metadata: {
            ...existingMetadata,
            retestQueueId
          }
        })
        .eq("id", sessionId)
        .eq("user_id", user.id);
    }
  } catch (metadataError) {
    console.error("[retest] failed to write metadata.retestQueueId", metadataError);
  }

  revalidatePath("/dashboard");
  return { ok: true, message: "Retest started.", sessionId };
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toSessionId(data: unknown): string | undefined {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return typeof record.session_id === "string" ? record.session_id : undefined;
}
