import { describe, expect, it } from "vitest";
import {
  createSourceSchema,
  truncateForGrounding,
  MAX_GROUNDING_EXCERPT_CHARS,
  MAX_SOURCE_BODY_CHARS
} from "@/lib/question-bank/source-schema";

const validInput = {
  examId: "11111111-1111-4111-8111-111111111111",
  title: "UPSC Prelims 2023 GS-I paper",
  sourceType: "past_year_paper" as const,
  bodyText: "x".repeat(200)
};

describe("createSourceSchema", () => {
  it("accepts a well-formed source", () => {
    expect(createSourceSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects a title shorter than 3 characters", () => {
    expect(createSourceSchema.safeParse({ ...validInput, title: "ab" }).success).toBe(false);
  });

  it("rejects body text shorter than 50 characters", () => {
    expect(createSourceSchema.safeParse({ ...validInput, bodyText: "too short" }).success).toBe(false);
  });

  it("rejects body text longer than the max", () => {
    expect(
      createSourceSchema.safeParse({ ...validInput, bodyText: "x".repeat(MAX_SOURCE_BODY_CHARS + 1) }).success
    ).toBe(false);
  });

  it("rejects an invalid sourceType", () => {
    expect(createSourceSchema.safeParse({ ...validInput, sourceType: "tweet" }).success).toBe(false);
  });

  it("rejects a non-uuid examId", () => {
    expect(createSourceSchema.safeParse({ ...validInput, examId: "not-a-uuid" }).success).toBe(false);
  });

  it("trims title and bodyText", () => {
    const parsed = createSourceSchema.parse({ ...validInput, title: "  Padded title  " });
    expect(parsed.title).toBe("Padded title");
  });
});

describe("truncateForGrounding", () => {
  it("returns short text unchanged", () => {
    expect(truncateForGrounding("a short source")).toBe("a short source");
  });

  it("trims surrounding whitespace even when under the limit", () => {
    expect(truncateForGrounding("  padded  ")).toBe("padded");
  });

  it("truncates text longer than the max and appends an ellipsis marker", () => {
    const long = "a".repeat(MAX_GROUNDING_EXCERPT_CHARS + 500);
    const result = truncateForGrounding(long);

    expect(result.length).toBe(MAX_GROUNDING_EXCERPT_CHARS + 1);
    expect(result.endsWith("…")).toBe(true);
  });

  it("returns exactly the max length unchanged when the input is exactly at the boundary", () => {
    const exact = "b".repeat(MAX_GROUNDING_EXCERPT_CHARS);
    expect(truncateForGrounding(exact)).toBe(exact);
  });
});
