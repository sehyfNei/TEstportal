import type { SupabaseClient } from "@supabase/supabase-js";

export const AI_CONSENT_TYPE = "ai_features";
export const AI_CONSENT_VERSION = "v1.0.0";

export const VALID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayAbbr = (typeof VALID_DAYS)[number];

export type UserProfile = {
  name: string;
  prepStartDate: string | null;
  dailyStudyMinutes: number | null;
  preferredTestDays: DayAbbr[];
};

export type ProfileUpdate = UserProfile;

type ProfileRow = {
  name: string | null;
  prep_start_date: string | null;
  daily_study_minutes: number | string | null;
  preferred_test_days: unknown;
};

type ConsentRow = {
  granted: boolean | null;
};

export function parseProfileUpdate(fields: Record<string, unknown>): ProfileUpdate | null {
  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  if (!name) {
    return null;
  }

  const rawMinutes = Number(fields.dailyStudyMinutes);
  const dailyStudyMinutes =
    Number.isFinite(rawMinutes) && rawMinutes >= 0 ? Math.min(720, Math.floor(rawMinutes)) : null;

  const rawDate = typeof fields.prepStartDate === "string" ? fields.prepStartDate.trim() : "";
  const prepStartDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;

  return {
    name,
    prepStartDate,
    dailyStudyMinutes,
    preferredTestDays: readPreferredDays(fields.preferredTestDays)
  };
}

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("name,prep_start_date,daily_study_minutes,preferred_test_days")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Profile load failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as ProfileRow;
  return {
    name: typeof row.name === "string" ? row.name : "",
    prepStartDate: typeof row.prep_start_date === "string" ? row.prep_start_date : null,
    dailyStudyMinutes: toNullableInteger(row.daily_study_minutes),
    preferredTestDays: readPreferredDays(row.preferred_test_days)
  };
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  update: ProfileUpdate
): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .update({
      name: update.name,
      prep_start_date: update.prepStartDate,
      daily_study_minutes: update.dailyStudyMinutes,
      preferred_test_days: update.preferredTestDays
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Profile update failed: ${error.message}`);
  }
}

export async function getAiConsent(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_consents")
    .select("granted")
    .eq("user_id", userId)
    .eq("consent_type", AI_CONSENT_TYPE)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Consent load failed: ${error.message}`);
  }

  return (data as ConsentRow | null)?.granted === true;
}

export async function setAiConsent(
  supabase: SupabaseClient,
  userId: string,
  granted: boolean
): Promise<void> {
  const { error } = await supabase.from("user_consents").insert({
    user_id: userId,
    consent_type: AI_CONSENT_TYPE,
    granted,
    version: AI_CONSENT_VERSION
  });

  if (error) {
    throw new Error(`Consent update failed: ${error.message}`);
  }
}

function readPreferredDays(value: unknown): DayAbbr[] {
  const values = Array.isArray(value) ? value : [];
  return values.filter((day): day is DayAbbr => isValidDay(day));
}

function isValidDay(value: unknown): value is DayAbbr {
  return typeof value === "string" && VALID_DAYS.includes(value as DayAbbr);
}

function toNullableInteger(value: number | string | null): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.floor(value) : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.floor(parsed) : null;
  }

  return null;
}
