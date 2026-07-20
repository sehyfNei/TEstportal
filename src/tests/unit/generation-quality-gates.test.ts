import { describe, expect, it } from "vitest";
import { formatGateNote, runQualityGates } from "@/lib/question-bank/generation-quality-gates";
import type { GeneratedQuestion } from "@/lib/ai/schemas/question-generation";
import type { DuplicateMatch } from "@/lib/question-bank/duplicate-check";

function candidate(overrides: Partial<GeneratedQuestion> = {}): GeneratedQuestion {
  return {
    index: 0,
    stem: "Which article guarantees the Right to Equality?",
    options: ["Article 12", "Article 14", "Article 19", "Article 21"],
    correctOptionIndex: 1,
    explanation: "Article 14 guarantees equality before the law.",
    confidence: "high",
    distractorRationales: [
      { optionIndex: 0, misconception: "Confuses Article 12's definitions clause with the equality guarantee." },
      { optionIndex: 2, misconception: "Mixes up Article 19's freedoms with the right to equality." },
      { optionIndex: 3, misconception: "Confuses the right to life (Article 21) with equality before law." }
    ],
    ...overrides
  };
}

function match(overrides: Partial<DuplicateMatch> = {}): DuplicateMatch {
  return { questionId: "q1", similarity: 0.5, stem: "existing", status: "live", ...overrides };
}

describe("runQualityGates", () => {
  it("passes a clean, high-confidence, non-duplicate candidate", () => {
    const result = runQualityGates(candidate(), []);
    expect(result.passed).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("fails on duplicate answer options", () => {
    const result = runQualityGates(
      candidate({ options: ["Article 14", "article 14 ", "Article 19", "Article 21"] }),
      []
    );
    expect(result.passed).toBe(false);
    expect(result.warnings[0]).toMatch(/duplicates/i);
  });

  it("fails when a strong duplicate match exists in the bank", () => {
    const result = runQualityGates(candidate(), [match({ similarity: 0.92 })]);
    expect(result.passed).toBe(false);
    expect(result.warnings[0]).toContain("92%");
  });

  it("does not fail on a weak/irrelevant duplicate match below threshold", () => {
    const result = runQualityGates(candidate(), [match({ similarity: 0.4 })]);
    expect(result.passed).toBe(true);
  });

  it("uses the strongest match when several are returned", () => {
    const result = runQualityGates(candidate(), [match({ similarity: 0.6 }), match({ similarity: 0.95 })]);
    expect(result.warnings[0]).toContain("95%");
  });

  it("fails on low self-reported confidence", () => {
    const result = runQualityGates(candidate({ confidence: "low" }), []);
    expect(result.passed).toBe(false);
    expect(result.warnings[0]).toMatch(/low confidence/i);
  });

  it("notes medium confidence without failing the gate", () => {
    const result = runQualityGates(candidate({ confidence: "medium" }), []);
    expect(result.passed).toBe(true);
    expect(result.notes[0]).toMatch(/medium confidence/i);
  });

  it("can report multiple independent warnings at once", () => {
    const result = runQualityGates(candidate({ confidence: "low" }), [match({ similarity: 0.9 })]);
    expect(result.warnings).toHaveLength(2);
  });

  it("fails when two distractor rationales are near-duplicates", () => {
    const result = runQualityGates(
      candidate({
        distractorRationales: [
          { optionIndex: 0, misconception: "Mixes up two similar articles." },
          { optionIndex: 2, misconception: "Mixes up two similar articles." },
          { optionIndex: 3, misconception: "Confuses the right to life with equality before law." }
        ]
      }),
      []
    );
    expect(result.passed).toBe(false);
    expect(result.warnings[0]).toMatch(/near-duplicates/i);
  });

  it("ignores case and surrounding whitespace when comparing rationale text", () => {
    const result = runQualityGates(
      candidate({
        distractorRationales: [
          { optionIndex: 0, misconception: "  Mixes up two similar articles.  " },
          { optionIndex: 2, misconception: "MIXES UP TWO SIMILAR ARTICLES." },
          { optionIndex: 3, misconception: "Confuses the right to life with equality before law." }
        ]
      }),
      []
    );
    expect(result.passed).toBe(false);
  });

  it("passes when every distractor rationale targets a distinct misconception", () => {
    const result = runQualityGates(candidate(), []);
    expect(result.passed).toBe(true);
  });
});

describe("formatGateNote", () => {
  it("reads cleanly when nothing is flagged", () => {
    const note = formatGateNote({ passed: true, warnings: [], notes: [] });
    expect(note).toContain("no issues detected");
  });

  it("includes each warning and note in the note text", () => {
    const note = formatGateNote({
      passed: false,
      warnings: ["92% similar to an existing live question."],
      notes: ["Model self-reported medium confidence in this answer."]
    });
    expect(note).toContain("92% similar");
    expect(note).toContain("medium confidence");
  });
});
