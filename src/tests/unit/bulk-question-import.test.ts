import { describe, expect, it } from "vitest";
import { parseBulkQuestionImportPayload } from "@/lib/question-bank/bulk-question-import";

const examId = "11111111-1111-4111-8111-111111111111";
const topicId = "22222222-2222-4222-8222-222222222222";
const content = {
  text: "Which statement is correct?",
  options: ["A", "B", "C", "D"],
  correct_options: [0],
  correct_integer: null,
  pairs: null,
  images: []
};

describe("bulk question import parser", () => {
  it("parses valid JSON rows", () => {
    const plan = parseBulkQuestionImportPayload(
      JSON.stringify([
        {
          examId,
          topicId,
          type: "mcq",
          difficulty: "medium",
          source: "manual",
          content,
          explanation: "Because A is correct."
        }
      ]),
      "json"
    );

    expect(plan.errors).toEqual([]);
    expect(plan.questions).toHaveLength(1);
    expect(plan.questions[0]?.content.text).toBe("Which statement is correct?");
    expect(plan.questions[0]?.status).toBe("draft");
  });

  it("parses CSV rows with quoted content_json", () => {
    const contentJson = JSON.stringify(content).replaceAll('"', '""');
    const csv = [
      "exam_id,topic_id,type,difficulty,source,content_json,explanation",
      `${examId},${topicId},mcq,hard,manual,"${contentJson}","Quoted, explanation"`
    ].join("\n");

    const plan = parseBulkQuestionImportPayload(csv, "csv");

    expect(plan.errors).toEqual([]);
    expect(plan.questions).toHaveLength(1);
    expect(plan.questions[0]?.difficulty).toBe("hard");
    expect(plan.questions[0]?.explanation).toBe("Quoted, explanation");
  });

  it("reports row-level validation errors", () => {
    const plan = parseBulkQuestionImportPayload(
      JSON.stringify([
        {
          examId,
          topicId,
          type: "mcq",
          difficulty: "medium",
          source: "manual",
          content
        },
        {
          examId,
          topicId: "not-a-uuid",
          content
        }
      ]),
      "json"
    );

    expect(plan.questions).toHaveLength(1);
    expect(plan.errors).toEqual([{ row: 2, message: "Select a topic." }]);
  });

  it("rejects empty payloads", () => {
    const plan = parseBulkQuestionImportPayload("", "json");

    expect(plan.questions).toEqual([]);
    expect(plan.errors).toEqual([{ row: 0, message: "Import payload is required." }]);
  });
});
