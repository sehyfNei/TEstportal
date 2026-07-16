import { describe, expect, it } from "vitest";
import {
  canonicalizeQuestionText,
  contentHash,
  parseEmbeddingResponse,
  toDuplicateMatches,
  toVectorLiteral,
  EMBEDDING_DIM
} from "@/lib/question-bank/duplicate-check";

describe("canonicalizeQuestionText", () => {
  it("is insensitive to option order, case, and extra whitespace", () => {
    const a = canonicalizeQuestionText({
      text: "What   is the Capital of India?",
      options: ["Delhi", "Mumbai", "Chennai"]
    });
    const b = canonicalizeQuestionText({
      text: "what is the capital of india?",
      options: ["Chennai", "Delhi", "Mumbai"]
    });
    expect(a).toBe(b);
  });

  it("handles missing options and non-string entries defensively", () => {
    expect(canonicalizeQuestionText({ text: "Stem only" })).toBe("stem only");
    expect(canonicalizeQuestionText({ text: "S", options: [1, "B"] as unknown as string[] })).toBe(
      "s | b"
    );
    expect(canonicalizeQuestionText({})).toBe("");
  });
});

describe("contentHash", () => {
  it("is stable and 8 hex chars", () => {
    expect(contentHash("hello")).toBe(contentHash("hello"));
    expect(contentHash("hello")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("changes when the text changes", () => {
    expect(contentHash("hello")).not.toBe(contentHash("hello!"));
  });
});

describe("parseEmbeddingResponse", () => {
  const vector = Array.from({ length: EMBEDDING_DIM }, (_, i) => i / EMBEDDING_DIM);

  it("accepts one 384-dim vector per input", () => {
    const result = parseEmbeddingResponse([vector, vector], 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.vectors).toHaveLength(2);
    }
  });

  it("rejects count mismatch, wrong dimension, and non-finite values", () => {
    expect(parseEmbeddingResponse([vector], 2).ok).toBe(false);
    expect(parseEmbeddingResponse([[1, 2, 3]], 1).ok).toBe(false);
    expect(parseEmbeddingResponse([[...vector.slice(0, -1), Number.NaN]], 1).ok).toBe(false);
    expect(parseEmbeddingResponse({ error: "loading" }, 1).ok).toBe(false);
  });
});

describe("toVectorLiteral", () => {
  it("formats a pgvector literal", () => {
    expect(toVectorLiteral([0.5, -1, 2])).toBe("[0.5,-1,2]");
  });
});

describe("toDuplicateMatches", () => {
  it("normalizes rpc rows and rounds similarity", () => {
    const matches = toDuplicateMatches([
      { question_id: "q1", similarity: 0.91234, stem: "Existing stem", status: "live" }
    ]);
    expect(matches).toEqual([
      { questionId: "q1", similarity: 0.912, stem: "Existing stem", status: "live" }
    ]);
  });

  it("drops malformed rows", () => {
    expect(
      toDuplicateMatches([null, {}, { question_id: "q2", similarity: "not-a-number" }, 42])
    ).toEqual([]);
    expect(toDuplicateMatches("nope")).toEqual([]);
  });
});
