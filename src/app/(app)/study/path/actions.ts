"use server";

import { redirect } from "next/navigation";
import { MAX_GOAL_LENGTH, parseTargetDate } from "@/lib/learning-path/wizard-input";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type LearningPathWizardState = {
  ok: boolean;
  message: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createLearningPathAction(
  _previousState: LearningPathWizardState,
  formData: FormData
): Promise<LearningPathWizardState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, message: "Sign in to continue." };
  }

  const examId = getString(formData, "examId");
  if (!UUID_PATTERN.test(examId)) {
    return { ok: false, message: "Valid exam is required." };
  }

  const targetDate = parseTargetDate(getString(formData, "targetDate"));
  if (!targetDate.ok) {
    return { ok: false, message: targetDate.message };
  }

  const goal = getString(formData, "goal");
  if (!goal) {
    return { ok: false, message: "Describe what success looks like for you." };
  }
  if (goal.length > MAX_GOAL_LENGTH) {
    return { ok: false, message: `Keep your goal under ${MAX_GOAL_LENGTH} characters.` };
  }

  // learning_paths_one_active_per_user_exam allows only one active row per
  // (user, exam) — retire any prior goal for this exam before creating the new one.
  const { error: retireError } = await supabase
    .from("learning_paths")
    .update({ status: "abandoned" })
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .eq("status", "active");

  if (retireError) {
    console.error("[learning_path] failed to retire previous active path", retireError);
    return { ok: false, message: "Failed to update your existing plan. Try again." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("learning_paths")
    .insert({
      user_id: user.id,
      exam_id: examId,
      goal,
      target_date: targetDate.iso,
      status: "active"
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[learning_path] failed to create path", insertError);
    return { ok: false, message: "Failed to create your plan. Try again." };
  }

  const pathId = (inserted as { id: string }).id;

  const { enqueueJob, generateIdempotencyKey } = await import("@/lib/jobs/enqueue");
  const enqueueResult = await enqueueJob(
    supabase,
    "generate_learning_path",
    { learning_path_id: pathId },
    generateIdempotencyKey("generate_learning_path", pathId)
  );

  if (!enqueueResult.ok) {
    console.error("[learning_path] enqueue failed", enqueueResult.error);
  }

  const { kickJobRunnerNonFatal } = await import("@/lib/jobs/kick");
  await kickJobRunnerNonFatal();

  redirect("/study/path");
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
