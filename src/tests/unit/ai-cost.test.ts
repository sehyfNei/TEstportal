import { describe, expect, it } from "vitest";
import { computeCostUsd, hashInput } from "@/lib/ai/cost";
import type { AiMessage } from "@/lib/ai/types";

describe("computeCostUsd", () => {
  it("uses known 70b model pricing", () => {
    expect(computeCostUsd("llama-3.3-70b-versatile", 1_000_000, 1_000_000)).toBe(1.38);
  });

  it("uses fallback pricing for unknown models", () => {
    expect(computeCostUsd("unknown-model", 1_000_000, 1_000_000)).toBe(1.38);
  });

  it("returns zero for zero tokens", () => {
    expect(computeCostUsd("llama-3.3-70b-versatile", 0, 0)).toBe(0);
  });

  it("guards negative token counts", () => {
    expect(computeCostUsd("llama-3.3-70b-versatile", -100, -200)).toBe(0);
  });

  it("rounds cost to six decimal places", () => {
    expect(computeCostUsd("llama-3.3-70b-versatile", 1, 1)).toBe(0.000001);
  });
});

describe("hashInput", () => {
  const messages: AiMessage[] = [
    { role: "system", content: "Follow instructions." },
    { role: "user", content: "Explain question 1." }
  ];

  it("is deterministic for identical messages", () => {
    expect(hashInput(messages)).toBe(hashInput([...messages]));
  });

  it("differs when content differs", () => {
    const changed = [
      messages[0],
      { role: "user", content: "Explain question 2." } satisfies AiMessage
    ];

    expect(hashInput(messages)).not.toBe(hashInput(changed));
  });

  it("differs when role differs", () => {
    const changed: AiMessage[] = [
      { role: "assistant", content: messages[0].content },
      messages[1]
    ];

    expect(hashInput(messages)).not.toBe(hashInput(changed));
  });
});
