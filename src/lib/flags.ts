import type { SupabaseClient } from "@supabase/supabase-js";

// Compile-time registry of known flags and their fail-open defaults. The DB
// row is the runtime truth (toggling needs no deploy — TSP-111); these
// defaults apply only when the table/row is unreadable or missing.
export const FEATURE_FLAG_DEFAULTS = {
  chat_enabled: true,
  ai_analysis_enabled: true,
  test_runner_beta: true,
  fsrs: false,
  pos: false,
  peer_insights: false,
  vision_ingestion: false,
  flow_adjuster: false
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAG_DEFAULTS;

export type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  description: string;
};

export function isKnownFlag(key: string): key is FeatureFlagKey {
  return key in FEATURE_FLAG_DEFAULTS;
}

export async function isFeatureEnabled(
  supabase: SupabaseClient,
  key: FeatureFlagKey
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", key)
      .maybeSingle();

    if (error || !data) {
      return FEATURE_FLAG_DEFAULTS[key];
    }

    return Boolean(data.enabled);
  } catch {
    return FEATURE_FLAG_DEFAULTS[key];
  }
}

export async function listFeatureFlags(supabase: SupabaseClient): Promise<FeatureFlagRow[]> {
  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key,enabled,description")
      .order("key");

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      key: String(row.key),
      enabled: Boolean(row.enabled),
      description: String(row.description ?? "")
    }));
  } catch {
    return [];
  }
}
