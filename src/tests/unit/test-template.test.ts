import { describe, expect, it } from "vitest";
import {
  buildTemplateRow,
  durationFromConfig,
  normalizeQuestionIds,
  questionIdsFromConfig,
  validateTemplateInput,
  MAX_TEMPLATE_QUESTIONS
} from "@/lib/exam/test-template";

const EXAM = "11111111-1111-4111-8111-111111111111";
const Q1 = "22222222-2222-4222-8222-222222222222";
const Q2 = "33333333-3333-4333-8333-333333333333";
const Q3 = "44444444-4444-4444-8444-444444444444";

describe("normalizeQuestionIds", () => {
  it("dedupes while preserving first-seen order", () => {
    expect(normalizeQuestionIds([Q2, Q1, Q2, Q3, Q1])).toEqual([Q2, Q1, Q3]);
  });

  it("drops blanks and non-uuid entries", () => {
    expect(normalizeQuestionIds([" ", "not-a-uuid", Q1])).toEqual([Q1]);
  });
});

describe("validateTemplateInput", () => {
  it("accepts a well-formed fixed paper and preserves question order", () => {
    const result = validateTemplateInput({
      title: "  Full Mock 1  ",
      description: "  A shared benchmark  ",
      examId: EXAM,
      questionIds: [Q3, Q1, Q2],
      durationMinutes: 90
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Full Mock 1");
      expect(result.value.description).toBe("A shared benchmark");
      expect(result.value.questionIds).toEqual([Q3, Q1, Q2]);
      expect(result.value.durationMinutes).toBe(90);
      expect(result.value.isActive).toBe(true);
    }
  });

  it("requires a title, an exam, and at least one question", () => {
    const result = validateTemplateInput({
      title: "   ",
      examId: "nope",
      questionIds: []
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining(["Give the paper a title.", "Select an exam.", "Add at least one question."])
      );
    }
  });

  it("rejects more than the max questions", () => {
    const many = Array.from({ length: MAX_TEMPLATE_QUESTIONS + 1 }, (_, i) => {
      const hex = i.toString(16).padStart(12, "0");
      return `55555555-5555-4555-8555-${hex}`;
    });
    const result = validateTemplateInput({ title: "Big", examId: EXAM, questionIds: many });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("at most"))).toBe(true);
    }
  });

  it("rejects an out-of-range duration but allows a blank one", () => {
    const bad = validateTemplateInput({ title: "X", examId: EXAM, questionIds: [Q1], durationMinutes: 0 });
    expect(bad.ok).toBe(false);

    const blank = validateTemplateInput({ title: "X", examId: EXAM, questionIds: [Q1], durationMinutes: null });
    expect(blank.ok).toBe(true);
    if (blank.ok) {
      expect(blank.value.durationMinutes).toBeNull();
    }
  });
});

describe("buildTemplateRow", () => {
  it("produces the fixed shape start_test_session reads", () => {
    const built = validateTemplateInput({
      title: "Mock",
      examId: EXAM,
      questionIds: [Q1, Q2],
      durationMinutes: 60,
      isActive: false
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const row = buildTemplateRow(built.value);
    expect(row.type).toBe("benchmark");
    expect(row.selection_mode).toBe("fixed");
    expect(row.config).toEqual({ selectionMode: "fixed", questionIds: [Q1, Q2], durationMinutes: 60 });
    expect(row.is_active).toBe(false);
  });
});

describe("config readers", () => {
  it("round-trips questionIds and duration out of a stored config", () => {
    const config = { selectionMode: "fixed", questionIds: [Q1, Q2, Q1], durationMinutes: 45 };
    expect(questionIdsFromConfig(config)).toEqual([Q1, Q2]);
    expect(durationFromConfig(config)).toBe(45);
  });

  it("is defensive against malformed config", () => {
    expect(questionIdsFromConfig(null)).toEqual([]);
    expect(questionIdsFromConfig({ questionIds: "x" })).toEqual([]);
    expect(durationFromConfig({})).toBeNull();
    expect(durationFromConfig({ durationMinutes: 9999 })).toBeNull();
  });
});
