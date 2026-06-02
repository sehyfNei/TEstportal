import { describe, expect, it } from "vitest";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_EXPOSURE_POLICIES,
  QUESTION_FLAG_REASONS,
  QUESTION_QUALITY_TIERS,
  QUESTION_SOURCES,
  QUESTION_STATUSES,
  QUESTION_TYPES
} from "@/lib/db/schema/question";

describe("question bank schema constants", () => {
  it("supports all P0 question types", () => {
    expect(QUESTION_TYPES).toEqual(["mcq", "msq", "integer", "statement", "assertion", "match"]);
  });

  it("models lifecycle, source, quality, exposure, and flag policies", () => {
    expect(QUESTION_STATUSES).toContain("draft");
    expect(QUESTION_STATUSES).toContain("live");
    expect(QUESTION_STATUSES).toContain("retired");
    expect(QUESTION_SOURCES).toEqual(["pyq", "ai_generated", "manual", "vision_ingested"]);
    expect(QUESTION_DIFFICULTIES).toEqual(["easy", "medium", "hard"]);
    expect(QUESTION_QUALITY_TIERS).toEqual(["gold", "silver", "bronze", "quarantine"]);
    expect(QUESTION_EXPOSURE_POLICIES).toContain("diagnostic_reserved");
    expect(QUESTION_EXPOSURE_POLICIES).toContain("benchmark_reserved");
    expect(QUESTION_FLAG_REASONS).toContain("incorrect_answer");
    expect(QUESTION_FLAG_REASONS).toContain("ambiguous");
  });
});
