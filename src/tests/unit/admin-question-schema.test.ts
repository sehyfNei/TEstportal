import { describe, expect, it } from "vitest";
import {
  defaultQuestionContent,
  parseAdminQuestionFormData
} from "@/lib/question-bank/admin-question-schema";

const examId = "11111111-1111-4111-8111-111111111111";
const topicId = "22222222-2222-4222-8222-222222222222";

describe("admin question form schema", () => {
  it("parses a valid manual MCQ payload", () => {
    const formData = new FormData();
    formData.set("examId", examId);
    formData.set("topicId", topicId);
    formData.set("type", "mcq");
    formData.set("difficulty", "medium");
    formData.set("source", "manual");
    formData.set("sourceYear", "");
    formData.set("language", "en");
    formData.set("status", "draft");
    formData.set("exposurePolicy", "practice");
    formData.set("qualityTier", "bronze");
    formData.set("content", defaultQuestionContent());
    formData.set("explanation", "Because it is the correct option.");

    const parsed = parseAdminQuestionFormData(formData);

    expect(parsed.examId).toBe(examId);
    expect(parsed.topicId).toBe(topicId);
    expect(parsed.sourceYear).toBeNull();
    expect(parsed.content.text).toBe("Question text in markdown");
  });

  it("passes through extra content keys unchanged (e.g. TSP-074 distractor_rationales)", () => {
    const formData = new FormData();
    formData.set("examId", examId);
    formData.set("topicId", topicId);
    formData.set("type", "mcq");
    formData.set("difficulty", "medium");
    formData.set("source", "ai_generated");
    formData.set("sourceYear", "");
    formData.set("language", "en");
    formData.set("status", "draft");
    formData.set("exposurePolicy", "practice");
    formData.set("qualityTier", "bronze");
    formData.set(
      "content",
      JSON.stringify({
        text: "Which right is exempt?",
        options: ["A", "B", "C", "D"],
        correct_options: [2],
        distractor_rationales: [
          { option_index: 0, misconception: "Thinks equality is absolute." },
          { option_index: 1, misconception: "Thinks freedom is unrestricted." },
          { option_index: 3, misconception: "Thinks remedies are absolute." }
        ]
      })
    );
    formData.set("explanation", "Because it is the correct option.");

    const parsed = parseAdminQuestionFormData(formData);

    expect(parsed.content.distractor_rationales).toEqual([
      { option_index: 0, misconception: "Thinks equality is absolute." },
      { option_index: 1, misconception: "Thinks freedom is unrestricted." },
      { option_index: 3, misconception: "Thinks remedies are absolute." }
    ]);
  });

  it("rejects malformed content JSON", () => {
    const formData = new FormData();
    formData.set("examId", examId);
    formData.set("topicId", topicId);
    formData.set("type", "mcq");
    formData.set("difficulty", "medium");
    formData.set("source", "manual");
    formData.set("language", "en");
    formData.set("status", "draft");
    formData.set("exposurePolicy", "practice");
    formData.set("qualityTier", "bronze");
    formData.set("content", "{bad json");

    expect(() => parseAdminQuestionFormData(formData)).toThrow(
      "Question content must be valid JSON."
    );
  });
});
