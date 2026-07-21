import { describe, expect, it } from "vitest";
import { createExpertPersonaSchema, MAX_PERSONA_SOURCES } from "@/lib/question-bank/expert-persona-schema";

const validInput = {
  topicId: "11111111-1111-4111-8111-111111111111",
  name: "Polity Prof",
  systemPrompt: "You are an expert tutor in Indian Polity for competitive exam students.",
  generationCadence: "manual" as const,
  sourceIds: []
};

describe("createExpertPersonaSchema", () => {
  it("accepts a well-formed persona with no sources", () => {
    expect(createExpertPersonaSchema.safeParse(validInput).success).toBe(true);
  });

  it("accepts a persona with bound sources", () => {
    const result = createExpertPersonaSchema.safeParse({
      ...validInput,
      sourceIds: ["22222222-2222-4222-8222-222222222222"]
    });
    expect(result.success).toBe(true);
  });

  it("rejects a name shorter than 3 characters", () => {
    expect(createExpertPersonaSchema.safeParse({ ...validInput, name: "ab" }).success).toBe(false);
  });

  it("rejects a system prompt shorter than 20 characters", () => {
    expect(createExpertPersonaSchema.safeParse({ ...validInput, systemPrompt: "too short" }).success).toBe(false);
  });

  it("rejects an invalid generationCadence", () => {
    expect(createExpertPersonaSchema.safeParse({ ...validInput, generationCadence: "hourly" }).success).toBe(false);
  });

  it("rejects a non-uuid topicId", () => {
    expect(createExpertPersonaSchema.safeParse({ ...validInput, topicId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects a non-uuid entry inside sourceIds", () => {
    expect(createExpertPersonaSchema.safeParse({ ...validInput, sourceIds: ["not-a-uuid"] }).success).toBe(false);
  });

  it("rejects more sources than the max", () => {
    const tooMany = Array.from({ length: MAX_PERSONA_SOURCES + 1 }, (_, i) =>
      `33333333-3333-4333-8333-${String(i).padStart(12, "0")}`
    );
    expect(createExpertPersonaSchema.safeParse({ ...validInput, sourceIds: tooMany }).success).toBe(false);
  });

  it("trims name and systemPrompt", () => {
    const parsed = createExpertPersonaSchema.parse({ ...validInput, name: "  Padded  " });
    expect(parsed.name).toBe("Padded");
  });
});
