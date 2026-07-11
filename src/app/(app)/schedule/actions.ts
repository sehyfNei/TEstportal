"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  canTransitionScheduleStatus,
  parseScheduledFor,
  resolveScheduleMode
} from "@/lib/schedule/schedule-service";

export type ScheduleActionState = {
  ok: boolean;
  message: string;
};

type AuthCheckResult = { ok: true; userId: string } | { ok: false; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createScheduledItemAction(
  _previousState: ScheduleActionState,
  formData: FormData
): Promise<ScheduleActionState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const auth = await requireAuth();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const mode = resolveScheduleMode(getString(formData, "mode"));
  if (!mode) {
    return { ok: false, message: "Pick what kind of session to schedule." };
  }

  const examId = getString(formData, "examId");
  if (!UUID_PATTERN.test(examId)) {
    return { ok: false, message: "Valid exam is required." };
  }

  const topicId = getString(formData, "topicId");
  if (mode.requiresTopic && !UUID_PATTERN.test(topicId)) {
    return { ok: false, message: `${mode.title} needs a topic.` };
  }
  if (topicId && !UUID_PATTERN.test(topicId)) {
    return { ok: false, message: "Topic id must be a valid UUID." };
  }

  const scheduledFor = parseScheduledFor(formData.get("scheduledFor"));
  if (!scheduledFor.ok) {
    return { ok: false, message: scheduledFor.message };
  }

  const notes = getString(formData, "notes");

  const supabase = await createClient();
  const { error } = await supabase.from("scheduled_items").insert({
    user_id: auth.userId,
    exam_id: examId,
    topic_id: topicId || null,
    item_type: mode.itemType,
    session_type: mode.sessionType,
    scheduled_for: scheduledFor.iso,
    notes: notes || null
  });

  if (error) {
    console.error("[schedule] create failed", error);
    return { ok: false, message: "Failed to schedule. Try again." };
  }

  revalidatePath("/schedule");
  return { ok: true, message: `${mode.title} scheduled.` };
}

export async function rescheduleScheduledItemAction(
  _previousState: ScheduleActionState,
  formData: FormData
): Promise<ScheduleActionState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const auth = await requireAuth();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const itemId = getString(formData, "itemId");
  if (!UUID_PATTERN.test(itemId)) {
    return { ok: false, message: "Valid schedule item id is required." };
  }

  const scheduledFor = parseScheduledFor(formData.get("scheduledFor"));
  if (!scheduledFor.ok) {
    return { ok: false, message: scheduledFor.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_items")
    .update({ scheduled_for: scheduledFor.iso })
    .eq("id", itemId)
    .eq("user_id", auth.userId)
    .eq("status", "planned")
    .select("id");

  if (error) {
    console.error("[schedule] reschedule failed", error);
    return { ok: false, message: "Failed to reschedule. Try again." };
  }

  if (!data?.length) {
    return { ok: false, message: "Only planned items can be rescheduled." };
  }

  revalidatePath("/schedule");
  return { ok: true, message: "Rescheduled." };
}

export async function setScheduledItemStatusAction(
  _previousState: ScheduleActionState,
  formData: FormData
): Promise<ScheduleActionState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const auth = await requireAuth();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const itemId = getString(formData, "itemId");
  const status = getString(formData, "status");

  if (!UUID_PATTERN.test(itemId)) {
    return { ok: false, message: "Valid schedule item id is required." };
  }

  if (!canTransitionScheduleStatus("planned", status)) {
    return { ok: false, message: "Status must be completed or cancelled." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_items")
    .update({ status })
    .eq("id", itemId)
    .eq("user_id", auth.userId)
    .eq("status", "planned")
    .select("id");

  if (error) {
    console.error("[schedule] status update failed", error);
    return { ok: false, message: "Failed to update. Try again." };
  }

  if (!data?.length) {
    return { ok: false, message: "Only planned items can be updated." };
  }

  revalidatePath("/schedule");
  return { ok: true, message: status === "completed" ? "Marked done." : "Cancelled." };
}

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

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
