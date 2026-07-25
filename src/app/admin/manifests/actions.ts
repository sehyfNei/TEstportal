"use server";

import { requireAdminForAction } from "@/lib/auth/require-admin";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createManifestImportPlanFromJson } from "@/lib/exam/manifest-import";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type ManifestImportActionState = {
  ok: boolean;
  message: string;
  result?: {
    examSlug: string;
    examId: string;
    manifestVersion: number;
    topicCount: number;
    conceptCount: number;
    clusterCount: number;
    cutoffCount: number;
  };
};

function getManifestJson(formData: FormData) {
  const value = formData.get("manifest");
  return typeof value === "string" ? value.trim() : "";
}

function toImportResult(value: unknown): ManifestImportActionState["result"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  return {
    examSlug: String(record.exam_slug ?? ""),
    examId: String(record.exam_id ?? ""),
    manifestVersion: Number(record.manifest_version ?? 0),
    topicCount: Number(record.topic_count ?? 0),
    conceptCount: Number(record.concept_count ?? 0),
    clusterCount: Number(record.cluster_count ?? 0),
    cutoffCount: Number(record.cutoff_count ?? 0)
  };
}

export async function importManifestAction(
  _previousState: ManifestImportActionState,
  formData: FormData
): Promise<ManifestImportActionState> {
  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: "Supabase is not configured yet. Add Supabase URL and anon key before importing."
    };
  }

  const rawManifest = getManifestJson(formData);

  if (!rawManifest) {
    return {
      ok: false,
      message: "Paste a manifest JSON payload before importing."
    };
  }

  let plan: ReturnType<typeof createManifestImportPlanFromJson>;

  try {
    plan = createManifestImportPlanFromJson(rawManifest);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Manifest validation failed."
    };
  }

  const adminCheck = await requireAdminForAction();

  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_exam_manifest", {
    p_manifest: plan.manifest,
    p_topics: plan.topics
  });

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  const result = toImportResult(data);

  await logAdminAction(supabase, {
    actorId: adminCheck.userId,
    action: "manifest_import",
    entityType: "exam",
    entityId: result?.examId ?? null,
    details: result
      ? { examSlug: result.examSlug, manifestVersion: result.manifestVersion, topicCount: result.topicCount }
      : { examSlug: plan.summary.examSlug }
  });

  return {
    ok: true,
    message: result
      ? `Imported ${result.examSlug} manifest version ${result.manifestVersion}.`
      : `Imported ${plan.summary.examSlug}.`,
    result
  };
}
