"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/auth/require-admin";
import { createSourceSchema } from "@/lib/question-bank/source-schema";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateSourceState = {
  ok: boolean;
  message: string;
};

export async function createSourceAction(input: {
  examId: string;
  title: string;
  sourceType: string;
  bodyText: string;
}): Promise<CreateSourceState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const admin = await requireAdminForAction();
  if (!admin.ok) {
    return { ok: false, message: admin.message };
  }

  const parsed = createSourceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid source." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("question_sources").insert({
    exam_id: parsed.data.examId,
    title: parsed.data.title,
    source_type: parsed.data.sourceType,
    body_text: parsed.data.bodyText
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/sources");
  return { ok: true, message: "Source added." };
}

export type SourceOption = { id: string; title: string; sourceType: string };

export async function fetchSourcesForExamAction(examId: string): Promise<SourceOption[]> {
  if (!hasSupabaseConfig() || !UUID_PATTERN.test(examId)) {
    return [];
  }

  const admin = await requireAdminForAction();
  if (!admin.ok) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_sources")
    .select("id,title,source_type")
    .eq("exam_id", examId)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      title: String(record.title),
      sourceType: String(record.source_type)
    };
  });
}
