import type { SupabaseClient } from "@supabase/supabase-js";

export const USER_EXPORT_SCHEMA_VERSION = "user-export@1.0.0";

export const USER_EXPORT_TABLES = [
  "user_profiles",
  "user_consents",
  "test_sessions",
  "mastery_records",
  "mistake_items",
  "chat_sessions"
] as const;

export type ExportRecord = Record<string, unknown>;

export type UserExport = {
  exportedAt: string;
  profile: ExportRecord | null;
  consents: ExportRecord[];
  testSessions: ExportRecord[];
  masteryRecords: ExportRecord[];
  mistakeItems: ExportRecord[];
  chatSessions: ExportRecord[];
};

export async function exportUserData(supabase: SupabaseClient, userId: string): Promise<UserExport> {
  const [profile, consents, testSessions, masteryRecords, mistakeItems, chatSessions] =
    await Promise.all([
      readSingle(
        supabase,
        "user_profiles",
        "name,avatar_url,target_exams,prep_start_date,daily_study_minutes,preferred_test_days,current_streak,longest_streak,created_at,updated_at",
        "id",
        userId
      ),
      readMany(
        supabase,
        "user_consents",
        "consent_type,granted,version,created_at",
        userId,
        "created_at"
      ),
      readMany(
        supabase,
        "test_sessions",
        "id,type,status,exam_id,started_at,submitted_at,created_at",
        userId,
        "created_at"
      ),
      readMany(
        supabase,
        "mastery_records",
        "exam_id,topic_id,concept_id,mastery_score,confidence_level,questions_attempted,questions_correct,last_tested_at,updated_at",
        userId,
        "updated_at"
      ),
      readMany(
        supabase,
        "mistake_items",
        "question_id,session_id,mistake_type,confidence,status,created_at",
        userId,
        "created_at"
      ),
      readMany(supabase, "chat_sessions", "id,exam_id,title,created_at", userId, "created_at")
    ]);

  return assembleExportResult(
    profile,
    consents,
    testSessions,
    masteryRecords,
    mistakeItems,
    chatSessions
  );
}

export function assembleExportResult(
  profile: unknown,
  consents: unknown[] | null,
  testSessions: unknown[] | null,
  masteryRecords: unknown[] | null,
  mistakeItems: unknown[] | null,
  chatSessions: unknown[] | null,
  exportedAt = new Date().toISOString()
): UserExport {
  return {
    exportedAt,
    profile: (profile as ExportRecord | null) ?? null,
    consents: toRows(consents),
    testSessions: toRows(testSessions),
    masteryRecords: toRows(masteryRecords),
    mistakeItems: toRows(mistakeItems),
    chatSessions: toRows(chatSessions)
  };
}

async function readSingle(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  key: string,
  value: string
): Promise<ExportRecord | null> {
  const { data, error } = await supabase.from(table).select(columns).eq(key, value).maybeSingle();

  if (error) {
    throw new Error(`Failed to export ${table}: ${error.message}`);
  }

  return (data as ExportRecord | null) ?? null;
}

async function readMany(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  userId: string,
  orderColumn: string
): Promise<ExportRecord[]> {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("user_id", userId)
    .order(orderColumn, { ascending: true });

  if (error) {
    throw new Error(`Failed to export ${table}: ${error.message}`);
  }

  return toRows(data as unknown[] | null);
}

function toRows(value: unknown[] | null): ExportRecord[] {
  return (value ?? []) as ExportRecord[];
}
