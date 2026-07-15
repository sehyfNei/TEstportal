"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/auth/require-admin";
import {
  buildTemplateRow,
  validateTemplateInput
} from "@/lib/exam/test-template";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type TemplateQuestionOption = {
  id: string;
  stem: string;
  type: string;
  topic: string | null;
  qualityTier: string;
};

export type FetchTemplateQuestionsState =
  | { ok: true; questions: TemplateQuestionOption[] }
  | { ok: false; message: string };

export type TemplateMutationState = {
  ok: boolean;
  message: string;
  templateId?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function fetchTemplateQuestionsAction(
  examId: string
): Promise<FetchTemplateQuestionsState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const admin = await requireAdminForAction();
  if (!admin.ok) {
    return { ok: false, message: admin.message };
  }

  if (!UUID_PATTERN.test(examId)) {
    return { ok: false, message: "Valid exam id is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id,type,quality_tier,topic:topics!questions_topic_id_fkey(name),current_version:question_versions!questions_current_version_fk(content)"
    )
    .eq("exam_id", examId)
    .eq("status", "live")
    .limit(500);

  if (error) {
    return { ok: false, message: error.message };
  }

  const questions = (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const version = record.current_version as { content?: { text?: string } } | null;
    const topic = record.topic as { name?: string } | null;
    return {
      id: String(record.id),
      stem: version?.content?.text?.trim() || "Untitled question",
      type: String(record.type ?? "mcq"),
      topic: topic?.name ?? null,
      qualityTier: String(record.quality_tier ?? "bronze")
    } satisfies TemplateQuestionOption;
  });

  return { ok: true, questions };
}

export async function saveTemplateAction(
  _prev: TemplateMutationState,
  formData: FormData
): Promise<TemplateMutationState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const admin = await requireAdminForAction();
  if (!admin.ok) {
    return { ok: false, message: admin.message };
  }

  const templateId = getString(formData, "templateId");
  const validation = validateTemplateInput({
    title: getString(formData, "title"),
    description: getString(formData, "description") || null,
    examId: getString(formData, "examId"),
    questionIds: parseQuestionIds(getString(formData, "questionIds")),
    durationMinutes: parseNullableInt(getString(formData, "durationMinutes")),
    isActive: getString(formData, "isActive") !== "false"
  });

  if (!validation.ok) {
    return { ok: false, message: validation.errors.join(" ") };
  }

  const supabase = await createClient();
  const row = buildTemplateRow(validation.value);

  if (templateId) {
    if (!UUID_PATTERN.test(templateId)) {
      return { ok: false, message: "Invalid template id." };
    }

    const { error } = await supabase.from("test_templates").update(row).eq("id", templateId);
    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/admin/templates");
    revalidatePath("/tests");
    return { ok: true, message: "Fixed paper updated.", templateId };
  }

  const { data, error } = await supabase
    .from("test_templates")
    .insert({ ...row, created_by: admin.userId })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/templates");
  revalidatePath("/tests");
  return { ok: true, message: "Fixed paper created.", templateId: String(data?.id ?? "") };
}

export async function setTemplateActiveAction(
  _prev: TemplateMutationState,
  formData: FormData
): Promise<TemplateMutationState> {
  const admin = await guardMutation();
  if (!admin.ok) {
    return { ok: false, message: admin.message };
  }

  const templateId = getString(formData, "templateId");
  const isActive = getString(formData, "isActive") === "true";
  if (!UUID_PATTERN.test(templateId)) {
    return { ok: false, message: "Invalid template id." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("test_templates")
    .update({ is_active: isActive })
    .eq("id", templateId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/templates");
  revalidatePath("/tests");
  return { ok: true, message: isActive ? "Paper activated." : "Paper deactivated.", templateId };
}

export async function deleteTemplateAction(
  _prev: TemplateMutationState,
  formData: FormData
): Promise<TemplateMutationState> {
  const admin = await guardMutation();
  if (!admin.ok) {
    return { ok: false, message: admin.message };
  }

  const templateId = getString(formData, "templateId");
  if (!UUID_PATTERN.test(templateId)) {
    return { ok: false, message: "Invalid template id." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("test_templates").delete().eq("id", templateId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/templates");
  revalidatePath("/tests");
  return { ok: true, message: "Fixed paper deleted." };
}

async function guardMutation(): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }
  const admin = await requireAdminForAction();
  return admin.ok ? { ok: true } : { ok: false, message: admin.message };
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseQuestionIds(raw: string): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function parseNullableInt(raw: string): number | null {
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}
