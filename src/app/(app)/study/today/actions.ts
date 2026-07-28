"use server";

import { revalidatePath } from "next/cache";
import { MAX_CONCEPTS_PER_DAY, MIN_CONCEPTS_PER_DAY } from "@/lib/dashboard/daily-focus";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type StartLadderState = { ok: boolean; message: string; sessionId?: string };

const LADDER_DURATION_MINUTES = 20;
const LADDER_QUESTION_COUNT = 5;

export async function startLadderAction(_prev: StartLadderState, formData: FormData): Promise<StartLadderState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const examId = getString(formData, "examId");
  const topicId = getString(formData, "topicId");

  if (!isUuid(examId) || !isUuid(topicId)) {
    return { ok: false, message: "Invalid exam or topic id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, message: authError?.message ?? "Sign in to continue." };
  }

  const { data, error } = await supabase.rpc("start_test_session", {
    p_exam_id: examId,
    p_type: "topic_ladder",
    p_template_id: null,
    p_topic_id: topicId,
    p_count: LADDER_QUESTION_COUNT,
    p_duration_minutes: LADDER_DURATION_MINUTES,
    p_min_quality_tier: "bronze"
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const sessionId = toSessionId(data);

  if (!sessionId) {
    return { ok: false, message: "Failed to start the ladder." };
  }

  return { ok: true, message: "Ladder started.", sessionId };
}

export type SetConceptsPerDayState = { ok: boolean; message: string };

export async function setConceptsPerDayAction(
  _prev: SetConceptsPerDayState,
  formData: FormData
): Promise<SetConceptsPerDayState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const examId = getString(formData, "examId");
  const rawTarget = Number(getString(formData, "conceptsPerDay"));

  if (!isUuid(examId)) {
    return { ok: false, message: "Invalid exam id." };
  }

  if (!Number.isInteger(rawTarget) || rawTarget < MIN_CONCEPTS_PER_DAY || rawTarget > MAX_CONCEPTS_PER_DAY) {
    return {
      ok: false,
      message: `Pick a value between ${MIN_CONCEPTS_PER_DAY} and ${MAX_CONCEPTS_PER_DAY} topics per day.`
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, message: authError?.message ?? "Sign in to continue." };
  }

  const { error } = await supabase
    .from("daily_focus_settings")
    .upsert({ user_id: user.id, exam_id: examId, concepts_per_day: rawTarget }, { onConflict: "user_id" });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/study/today");
  return { ok: true, message: `Set to ${rawTarget} topic${rawTarget === 1 ? "" : "s"} a day.` };
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toSessionId(data: unknown): string | undefined {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return typeof record.session_id === "string" ? record.session_id : undefined;
}
