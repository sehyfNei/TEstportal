import { describe, expect, it } from "vitest";
import { assembleExportResult } from "@/lib/profile/export-service";

const EXPORTED_AT = "2026-07-05T00:00:00.000Z";

describe("assembleExportResult", () => {
  it("returns the stable export shape and row counts", () => {
    const result = assembleExportResult(
      { name: "Student" },
      [{ consent_type: "ai_features", granted: true }],
      [{ id: "session-1" }],
      [{ topic_id: "topic-1", mastery_score: 55 }],
      [{ id: "mistake-1" }],
      [{ id: "chat-1", title: "Study chat" }],
      EXPORTED_AT
    );

    expect(Object.keys(result)).toEqual([
      "exportedAt",
      "profile",
      "consents",
      "testSessions",
      "masteryRecords",
      "mistakeItems",
      "chatSessions"
    ]);
    expect(result.exportedAt).toBe(EXPORTED_AT);
    expect(result.profile).toEqual({ name: "Student" });
    expect(result.consents).toHaveLength(1);
    expect(result.testSessions).toHaveLength(1);
    expect(result.masteryRecords).toHaveLength(1);
    expect(result.mistakeItems).toHaveLength(1);
    expect(result.chatSessions).toHaveLength(1);
  });

  it("uses null-safe defaults for missing export rows", () => {
    const result = assembleExportResult(null, null, null, null, [], null, EXPORTED_AT);

    expect(result.profile).toBeNull();
    expect(result.consents).toEqual([]);
    expect(result.testSessions).toEqual([]);
    expect(result.masteryRecords).toEqual([]);
    expect(result.mistakeItems).toEqual([]);
    expect(result.chatSessions).toEqual([]);
  });
});
