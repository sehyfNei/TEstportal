import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODE_ID,
  TEST_MODES,
  getTestMode,
  parseCatalogSearchParams
} from "@/lib/tests/catalog";

const RPC_SESSION_TYPES = [
  "diagnostic",
  "topic",
  "concept_retest",
  "sectional",
  "mock",
  "benchmark",
  "custom"
];

const VALID_UUID = "3f2c9d8e-1a4b-4c6d-9e8f-0a1b2c3d4e5f";

describe("TEST_MODES", () => {
  it("only uses session types the start_test_session RPC accepts", () => {
    for (const mode of TEST_MODES) {
      expect(RPC_SESSION_TYPES).toContain(mode.sessionType);
    }
  });

  it("never uses the template-dependent benchmark type", () => {
    const sessionTypes: string[] = TEST_MODES.map((mode) => mode.sessionType);
    expect(sessionTypes).not.toContain("benchmark");
  });

  it("has unique ids and sane defaults", () => {
    const ids = TEST_MODES.map((mode) => mode.id);
    expect(new Set(ids).size).toBe(TEST_MODES.length);

    for (const mode of TEST_MODES) {
      expect(mode.defaultCount).toBeGreaterThan(0);
      expect(mode.defaultCount).toBeLessThanOrEqual(100);
      if (mode.defaultDurationMinutes !== null) {
        expect(mode.defaultDurationMinutes).toBeGreaterThan(0);
      }
      expect(["gold", "silver", "bronze"]).toContain(mode.minQualityTier);
    }
  });

  it("flags topic-scoped modes as requiring a topic", () => {
    expect(getTestMode("topic")?.requiresTopic).toBe(true);
    expect(getTestMode("sectional")?.requiresTopic).toBe(true);
    expect(getTestMode("diagnostic")?.requiresTopic).toBe(false);
    expect(getTestMode("mock")?.requiresTopic).toBe(false);
  });
});

describe("getTestMode", () => {
  it("returns null for unknown or non-string ids", () => {
    expect(getTestMode("retest")).toBeNull();
    expect(getTestMode("")).toBeNull();
    expect(getTestMode(null)).toBeNull();
    expect(getTestMode(undefined)).toBeNull();
  });
});

describe("parseCatalogSearchParams", () => {
  it("preselects a valid mode and topic", () => {
    expect(parseCatalogSearchParams({ mode: "topic", topicId: VALID_UUID })).toEqual({
      modeId: "topic",
      topicId: VALID_UUID
    });
  });

  it("falls back to the default mode for unknown modes", () => {
    expect(parseCatalogSearchParams({ mode: "benchmark" })).toEqual({
      modeId: DEFAULT_MODE_ID,
      topicId: null
    });
    expect(parseCatalogSearchParams({})).toEqual({ modeId: DEFAULT_MODE_ID, topicId: null });
  });

  it("drops malformed topic ids instead of throwing", () => {
    expect(parseCatalogSearchParams({ mode: "sectional", topicId: "not-a-uuid" })).toEqual({
      modeId: "sectional",
      topicId: null
    });
  });

  it("uses the first value when params repeat and ignores empty arrays", () => {
    expect(parseCatalogSearchParams({ mode: ["mock", "topic"], topicId: [] })).toEqual({
      modeId: "mock",
      topicId: null
    });
  });
});
