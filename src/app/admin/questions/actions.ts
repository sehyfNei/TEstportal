"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/auth/require-admin";
import {
  type AdminQuestionActionState,
  parseAdminQuestionFormData
} from "@/lib/question-bank/admin-question-schema";
import { isValidExposurePolicy } from "@/lib/question-bank/exposure-policy";
import { isQuestionStatus } from "@/lib/question-bank/question-lifecycle";
import { isValidQualityTier } from "@/lib/question-bank/quality-tier";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type QuestionRpcResult = {
  changed?: boolean;
  new_policy?: string;
  new_tier?: string;
  old_policy?: string;
  old_tier?: string;
  from_status?: string;
  question_id?: string;
  version_id?: string;
  version?: number;
  status?: string;
  to_status?: string;
};

export async function createQuestionAction(
  _previousState: AdminQuestionActionState,
  formData: FormData
): Promise<AdminQuestionActionState> {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: "Supabase is not configured yet. Add Supabase URL and anon key before saving."
    };
  }

  let input: ReturnType<typeof parseAdminQuestionFormData>;

  try {
    input = parseAdminQuestionFormData(formData);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Question validation failed."
    };
  }

  const adminCheck = await requireAdminForAction();

  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_admin_question", {
    p_exam_id: input.examId,
    p_topic_id: input.topicId,
    p_subtopic_id: input.subtopicId,
    p_type: input.type,
    p_difficulty: input.difficulty,
    p_source: input.source,
    p_source_year: input.sourceYear,
    p_source_reference: input.sourceReference,
    p_is_contested: input.isContested,
    p_language: input.language,
    p_status: input.status,
    p_exposure_policy: input.exposurePolicy,
    p_quality_tier: input.qualityTier,
    p_content: input.content,
    p_explanation: input.explanation,
    p_explanation_detail: input.explanationDetail,
    p_reviewer_notes: input.reviewerNotes
  });

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  const rpcResult = toQuestionRpcResult(data);
  revalidatePath("/admin/questions");

  return {
    ok: true,
    message: `Created question draft with version ${rpcResult.version ?? 1}.`,
    questionId: rpcResult.question_id
  };
}

export async function updateQuestionAction(
  _previousState: AdminQuestionActionState,
  formData: FormData
): Promise<AdminQuestionActionState> {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: "Supabase is not configured yet. Add Supabase URL and anon key before saving."
    };
  }

  let input: ReturnType<typeof parseAdminQuestionFormData>;

  try {
    input = parseAdminQuestionFormData(formData);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Question validation failed."
    };
  }

  if (!input.questionId) {
    return {
      ok: false,
      message: "Question id is required for edits."
    };
  }

  const adminCheck = await requireAdminForAction();

  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_admin_question", {
    p_question_id: input.questionId,
    p_exam_id: input.examId,
    p_topic_id: input.topicId,
    p_subtopic_id: input.subtopicId,
    p_type: input.type,
    p_difficulty: input.difficulty,
    p_source: input.source,
    p_source_year: input.sourceYear,
    p_source_reference: input.sourceReference,
    p_is_contested: input.isContested,
    p_language: input.language,
    p_status: input.status,
    p_exposure_policy: input.exposurePolicy,
    p_quality_tier: input.qualityTier,
    p_content: input.content,
    p_explanation: input.explanation,
    p_explanation_detail: input.explanationDetail,
    p_reviewer_notes: input.reviewerNotes
  });

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  const rpcResult = toQuestionRpcResult(data);
  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${input.questionId}`);

  return {
    ok: true,
    message: `Saved version ${rpcResult.version ?? "next"} for this question.`,
    questionId: input.questionId
  };
}

export async function retireQuestionAction(
  _previousState: AdminQuestionActionState,
  formData: FormData
): Promise<AdminQuestionActionState> {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: "Supabase is not configured yet. Add Supabase URL and anon key before retiring."
    };
  }

  const questionId = formData.get("questionId");

  if (typeof questionId !== "string" || !questionId) {
    return {
      ok: false,
      message: "Question id is required."
    };
  }

  return setQuestionStatus(questionId, "retired", "Retired from question detail.");
}

export async function setQuestionStatusAction(
  _previousState: AdminQuestionActionState,
  formData: FormData
): Promise<AdminQuestionActionState> {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: "Supabase is not configured yet. Add Supabase URL and anon key before changing status."
    };
  }

  const questionId = formData.get("questionId");
  const toStatus = formData.get("toStatus");
  const note = formData.get("note");

  if (typeof questionId !== "string" || !questionId) {
    return {
      ok: false,
      message: "Question id is required."
    };
  }

  if (typeof toStatus !== "string" || !toStatus) {
    return {
      ok: false,
      message: "Target status is required."
    };
  }

  if (!isQuestionStatus(toStatus)) {
    return {
      ok: false,
      message: "Unsupported target status."
    };
  }

  return setQuestionStatus(questionId, toStatus, typeof note === "string" ? note : null);
}

export async function setQualityTierAction(
  _previousState: AdminQuestionActionState,
  formData: FormData
): Promise<AdminQuestionActionState> {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: "Supabase is not configured yet. Add Supabase URL and anon key before changing quality."
    };
  }

  const questionId = formData.get("questionId");
  const tier = formData.get("tier");

  if (typeof questionId !== "string" || !questionId) {
    return {
      ok: false,
      message: "Question id is required."
    };
  }

  if (typeof tier !== "string" || !isValidQualityTier(tier)) {
    return {
      ok: false,
      message: "Unsupported quality tier."
    };
  }

  const adminCheck = await requireAdminForAction();

  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_question_quality_tier", {
    p_question_id: questionId,
    p_tier: tier
  });

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  const rpcResult = toQuestionRpcResult(data);
  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/review");
  revalidatePath(`/admin/questions/${questionId}`);

  const newTier = rpcResult.new_tier ?? tier;

  return {
    ok: true,
    message:
      rpcResult.changed === false ? `Quality tier already ${newTier}.` : `Quality tier is now ${newTier}.`,
    questionId
  };
}

export async function setExposurePolicyAction(
  _previousState: AdminQuestionActionState,
  formData: FormData
): Promise<AdminQuestionActionState> {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message:
        "Supabase is not configured yet. Add Supabase URL and anon key before changing exposure policy."
    };
  }

  const questionId = formData.get("questionId");
  const policy = formData.get("policy");

  if (typeof questionId !== "string" || !questionId) {
    return {
      ok: false,
      message: "Question id is required."
    };
  }

  if (typeof policy !== "string" || !isValidExposurePolicy(policy)) {
    return {
      ok: false,
      message: "Unsupported exposure policy."
    };
  }

  const adminCheck = await requireAdminForAction();

  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_question_exposure_policy", {
    p_question_id: questionId,
    p_policy: policy
  });

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  const rpcResult = toQuestionRpcResult(data);
  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/review");
  revalidatePath(`/admin/questions/${questionId}`);

  const newPolicy = rpcResult.new_policy ?? policy;

  return {
    ok: true,
    message:
      rpcResult.changed === false
        ? `Exposure policy already ${newPolicy}.`
        : `Exposure policy is now ${newPolicy}.`,
    questionId
  };
}

async function setQuestionStatus(
  questionId: string,
  toStatus: string,
  note: string | null
): Promise<AdminQuestionActionState> {
  const adminCheck = await requireAdminForAction();

  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_question_status", {
    p_question_id: questionId,
    p_to_status: toStatus,
    p_note: note
  });

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  const rpcResult = toQuestionRpcResult(data);
  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/review");
  revalidatePath(`/admin/questions/${questionId}`);

  const status = rpcResult.status ?? rpcResult.to_status ?? toStatus;

  return {
    ok: true,
    message: rpcResult.changed === false ? `Question already ${status}.` : `Question is now ${status}.`,
    questionId
  };
}

function toQuestionRpcResult(value: unknown): QuestionRpcResult {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as QuestionRpcResult;
}
