import { describe, expect, it } from "vitest";
import {
  buildComposerContent,
  composerValueFromContent,
  emptyComposerValue,
  validateComposerValue,
  type ComposerValue
} from "@/lib/question-bank/question-content-form";

const filledValue: ComposerValue = {
  text: "Which article deals with the Right to Equality?",
  options: ["Article 14", "Article 19", "Article 21", "Article 32"],
  correctOptions: [0],
  correctInteger: ""
};

describe("buildComposerContent", () => {
  it("builds standard option content for mcq", () => {
    expect(buildComposerContent(filledValue, "mcq")).toEqual({
      text: filledValue.text,
      options: filledValue.options,
      correct_options: [0],
      correct_integer: null,
      pairs: null,
      images: []
    });
  });

  it("sorts multi-answer indexes and builds integer content", () => {
    const msq = buildComposerContent({ ...filledValue, correctOptions: [2, 0] }, "msq");
    const integer = buildComposerContent(
      { ...emptyComposerValue(), text: "2+2?", correctInteger: "4" },
      "integer"
    );

    expect(msq.correct_options).toEqual([0, 2]);
    expect(integer.correct_integer).toBe(4);
    expect(integer.options).toEqual([]);
  });
});

describe("validateComposerValue", () => {
  it("passes a complete mcq and integer question", () => {
    expect(validateComposerValue(filledValue, "mcq")).toBeNull();
    expect(
      validateComposerValue({ ...emptyComposerValue(), text: "2+2?", correctInteger: "4" }, "integer")
    ).toBeNull();
  });

  it("flags missing text, options, and correct picks", () => {
    expect(validateComposerValue({ ...filledValue, text: " " }, "mcq")).toContain("question text");
    expect(
      validateComposerValue({ ...filledValue, options: ["Only one", "", "", ""] }, "mcq")
    ).toContain("two options");
    expect(validateComposerValue({ ...filledValue, correctOptions: [] }, "mcq")).toContain("Tick");
    expect(validateComposerValue({ ...filledValue, correctOptions: [0, 1] }, "mcq")).toContain(
      "exactly one"
    );
    expect(
      validateComposerValue({ ...emptyComposerValue(), text: "2+2?", correctInteger: "x" }, "integer")
    ).toContain("numeric");
  });
});

describe("composerValueFromContent", () => {
  it("round-trips composer-built content", () => {
    const content = buildComposerContent(filledValue, "mcq");
    const mapped = composerValueFromContent(content, "mcq");

    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.text).toBe(filledValue.text);
      expect(mapped.value.options).toEqual(filledValue.options);
      expect(mapped.value.correctOptions).toEqual([0]);
    }
  });

  it("refuses content the simple form cannot represent", () => {
    expect(composerValueFromContent({ text: "q", pairs: [{ left: "a" }] }, "match").ok).toBe(false);
    expect(
      composerValueFromContent({ text: "q", options: [], images: ["img.png"] }, "mcq").ok
    ).toBe(false);
    expect(composerValueFromContent({ text: "q", custom_field: 1 }, "mcq").ok).toBe(false);
    expect(composerValueFromContent("not an object", "mcq").ok).toBe(false);
  });
});
