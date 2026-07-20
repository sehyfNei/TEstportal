import { describe, expect, it } from "vitest";
import {
  buildGenerationMessages,
  generationRequestSchema,
  validateGenerationOutput,
  GENERATION_PROMPT_VERSION
} from "@/lib/ai/schemas/question-generation";

const baseRequest = {
  examName: "UPSC Prelims",
  topicName: "Indian Polity",
  conceptName: null,
  difficulty: "medium" as const,
  count: 3
};

describe("generationRequestSchema", () => {
  it("accepts a well-formed request", () => {
    expect(generationRequestSchema.safeParse(baseRequest).success).toBe(true);
  });

  it("rejects count outside 1..8", () => {
    expect(generationRequestSchema.safeParse({ ...baseRequest, count: 0 }).success).toBe(false);
    expect(generationRequestSchema.safeParse({ ...baseRequest, count: 9 }).success).toBe(false);
  });

  it("rejects an invalid difficulty", () => {
    expect(generationRequestSchema.safeParse({ ...baseRequest, difficulty: "extreme" }).success).toBe(false);
  });

  it("defaults sourceExcerpt to null when omitted (ungrounded requests need no changes)", () => {
    const result = generationRequestSchema.safeParse(baseRequest);
    expect(result.success && result.data.sourceExcerpt).toBeNull();
  });

  it("accepts an explicit sourceExcerpt", () => {
    const result = generationRequestSchema.safeParse({ ...baseRequest, sourceExcerpt: "Some article text." });
    expect(result.success && result.data.sourceExcerpt).toBe("Some article text.");
  });
});

describe("buildGenerationMessages", () => {
  it("names the exact requested count and scope in the prompt", () => {
    const messages = buildGenerationMessages(baseRequest);
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    expect(system).toContain("exactly 3 new MCQ questions");
    expect(system).toContain("UPSC Prelims / Indian Polity");
    expect(system).toContain('"index": 0');
  });

  it("includes the concept in scope when provided", () => {
    const messages = buildGenerationMessages({ ...baseRequest, conceptName: "Fundamental Rights" });
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    expect(system).toContain("UPSC Prelims / Indian Polity / Fundamental Rights");
  });

  it("serializes the request as the user message", () => {
    const messages = buildGenerationMessages(baseRequest);
    const user = messages.find((m) => m.role === "user")?.content ?? "";
    expect(JSON.parse(user)).toMatchObject({ task: "generate_questions", topicName: "Indian Polity" });
  });

  it("omits grounding instructions when sourceExcerpt is absent", () => {
    const messages = buildGenerationMessages(baseRequest);
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    expect(system).not.toContain("SOURCE_MATERIAL");
  });

  it("includes the source excerpt and grounding instructions when provided", () => {
    const messages = buildGenerationMessages({
      ...baseRequest,
      sourceExcerpt: "The 73rd Amendment established Panchayati Raj institutions in 1992."
    });
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    expect(system).toContain("Base every question strictly on facts");
    expect(system).toContain('SOURCE_MATERIAL: """The 73rd Amendment established Panchayati Raj institutions in 1992."""');
    expect(system).toContain("return fewer questions rather than inventing unsupported ones");
  });
});

describe("validateGenerationOutput", () => {
  const validCandidate = {
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
    ]
  };

  it("accepts a well-formed batch", () => {
    const result = validateGenerationOutput({ questions: [validCandidate] });
    expect(result.ok).toBe(true);
  });

  it("rejects a question with fewer than 4 options", () => {
    const result = validateGenerationOutput({
      questions: [{ ...validCandidate, options: ["A", "B", "C"] }]
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an out-of-range correctOptionIndex", () => {
    const result = validateGenerationOutput({
      questions: [{ ...validCandidate, correctOptionIndex: 4 }]
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid confidence value", () => {
    const result = validateGenerationOutput({
      questions: [{ ...validCandidate, confidence: "certain" }]
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-object payload", () => {
    expect(validateGenerationOutput("not json").ok).toBe(false);
    expect(validateGenerationOutput(null).ok).toBe(false);
  });

  it("rejects a missing distractorRationales entry for a wrong option", () => {
    const result = validateGenerationOutput({
      questions: [{ ...validCandidate, distractorRationales: validCandidate.distractorRationales.slice(0, 2) }]
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a distractorRationales entry that points at the correct option", () => {
    const result = validateGenerationOutput({
      questions: [
        {
          ...validCandidate,
          distractorRationales: [
            { optionIndex: 1, misconception: "Should never target the correct option." },
            { optionIndex: 2, misconception: "Mixes up Article 19's freedoms with the right to equality." },
            { optionIndex: 3, misconception: "Confuses the right to life (Article 21) with equality before law." }
          ]
        }
      ]
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a duplicate distractorRationales optionIndex", () => {
    const result = validateGenerationOutput({
      questions: [
        {
          ...validCandidate,
          distractorRationales: [
            { optionIndex: 0, misconception: "Confuses Article 12's definitions clause with the equality guarantee." },
            { optionIndex: 0, misconception: "Same index repeated instead of covering option 2." },
            { optionIndex: 3, misconception: "Confuses the right to life (Article 21) with equality before law." }
          ]
        }
      ]
    });
    expect(result.ok).toBe(false);
  });
});

describe("version constants", () => {
  it("are stable, explicit strings", () => {
    expect(GENERATION_PROMPT_VERSION).toBe("question_generation@1.2.0");
  });
});
