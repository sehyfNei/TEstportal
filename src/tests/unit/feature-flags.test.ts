import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FEATURE_FLAG_DEFAULTS, isFeatureEnabled, isKnownFlag, listFeatureFlags } from "@/lib/flags";

type FlagRow = { key: string; enabled: boolean; description: string };

function fakeClient(input: { rows?: FlagRow[]; error?: string; throws?: boolean }): SupabaseClient {
  return {
    from: () => ({
      select: () => {
        if (input.throws) {
          throw new Error("connection refused");
        }

        return {
          eq: (_column: string, key: string) => ({
            maybeSingle: async () => ({
              data: input.error ? null : (input.rows?.find((row) => row.key === key) ?? null),
              error: input.error ? { message: input.error } : null
            })
          }),
          order: async () => ({
            data: input.error ? null : (input.rows ?? []),
            error: input.error ? { message: input.error } : null
          })
        };
      }
    })
  } as unknown as SupabaseClient;
}

describe("feature flags", () => {
  it("returns the DB value when the flag row exists", async () => {
    const client = fakeClient({
      rows: [{ key: "chat_enabled", enabled: false, description: "" }]
    });

    await expect(isFeatureEnabled(client, "chat_enabled")).resolves.toBe(false);
  });

  it("falls back to the compile-time default when the row is missing", async () => {
    const client = fakeClient({ rows: [] });

    await expect(isFeatureEnabled(client, "chat_enabled")).resolves.toBe(
      FEATURE_FLAG_DEFAULTS.chat_enabled
    );
    await expect(isFeatureEnabled(client, "fsrs")).resolves.toBe(FEATURE_FLAG_DEFAULTS.fsrs);
  });

  it("falls back to the default on query error and on thrown error", async () => {
    await expect(
      isFeatureEnabled(fakeClient({ error: "relation does not exist" }), "chat_enabled")
    ).resolves.toBe(true);
    await expect(isFeatureEnabled(fakeClient({ throws: true }), "chat_enabled")).resolves.toBe(
      true
    );
  });

  it("lists flags and degrades to an empty list on error", async () => {
    const rows = [
      { key: "chat_enabled", enabled: true, description: "chat" },
      { key: "fsrs", enabled: false, description: "fsrs" }
    ];

    await expect(listFeatureFlags(fakeClient({ rows }))).resolves.toEqual(rows);
    await expect(listFeatureFlags(fakeClient({ error: "boom" }))).resolves.toEqual([]);
  });

  it("recognizes only registered flag keys", () => {
    expect(isKnownFlag("chat_enabled")).toBe(true);
    expect(isKnownFlag("nonexistent_flag")).toBe(false);
  });
});
