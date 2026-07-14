import { describe, expect, it } from "vitest";
import {
  parseBulkQuestionImportPayload,
  parseCorrectOptionSpec,
  SIMPLE_QUESTION_CSV_TEMPLATE
} from "@/lib/question-bank/bulk-question-import";

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

describe("simple CSV format", () => {
  const defaults = { examId, topicId };

  function simpleCsv(rows: string[]) {
    return [
      "question,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty",
      ...rows
    ].join("\n");
  }

  it("parses the bundled template with wizard defaults", () => {
    const plan = parseBulkQuestionImportPayload(SIMPLE_QUESTION_CSV_TEMPLATE, "csv", defaults);

    expect(plan.errors).toEqual([]);
    expect(plan.questions).toHaveLength(2);
    expect(plan.questions[0]?.examId).toBe(examId);
    expect(plan.questions[0]?.topicId).toBe(topicId);
    expect(plan.questions[0]?.type).toBe("mcq");
    expect(plan.questions[0]?.content.correct_options).toEqual([1]);
    expect(plan.questions[1]?.type).toBe("msq");
    expect(plan.questions[1]?.content.correct_options).toEqual([0, 2]);
  });

  it("accepts a number as the correct option and defaults difficulty", () => {
    const plan = parseBulkQuestionImportPayload(
      simpleCsv(['"Q1?","One","Two","Three","Four","3","",""']),
      "csv",
      defaults
    );

    expect(plan.errors).toEqual([]);
    expect(plan.questions[0]?.content.correct_options).toEqual([2]);
    expect(plan.questions[0]?.difficulty).toBe("medium");
    expect(plan.questions[0]?.explanation).toBeNull();
  });

  it("rejects a correct option outside the provided options", () => {
    const plan = parseBulkQuestionImportPayload(
      simpleCsv(['"Q1?","One","Two","","","E","",""']),
      "csv",
      defaults
    );

    expect(plan.questions).toEqual([]);
    expect(plan.errors[0]?.message).toContain('correct_option "E"');
  });

  it("rejects option gaps and too few options", () => {
    const gapPlan = parseBulkQuestionImportPayload(
      simpleCsv(['"Q1?","One","","Three","","A","",""']),
      "csv",
      defaults
    );
    const fewPlan = parseBulkQuestionImportPayload(
      simpleCsv(['"Q1?","One","","","","A","",""']),
      "csv",
      defaults
    );

    expect(gapPlan.errors[0]?.message).toContain("no gaps");
    expect(fewPlan.errors[0]?.message).toContain("At least two options");
  });

  it("requires exam and topic when no defaults are supplied", () => {
    const plan = parseBulkQuestionImportPayload(
      simpleCsv(['"Q1?","One","Two","Three","Four","A","",""']),
      "csv"
    );

    expect(plan.questions).toEqual([]);
    expect(plan.errors[0]?.message).toBe("Select an exam.");
  });

  it("lets per-row ids override wizard defaults in JSON rows", () => {
    const otherExam = "33333333-3333-4333-8333-333333333333";
    const plan = parseBulkQuestionImportPayload(
      JSON.stringify([{ examId: otherExam, type: "mcq", difficulty: "medium", source: "manual", content }]),
      "json",
      defaults
    );

    expect(plan.errors).toEqual([]);
    expect(plan.questions[0]?.examId).toBe(otherExam);
    expect(plan.questions[0]?.topicId).toBe(topicId);
  });
});

describe("parseCorrectOptionSpec", () => {
  it("parses letters, numbers, and mixed separators", () => {
    expect(parseCorrectOptionSpec("B", 4)).toEqual({ ok: true, indexes: [1] });
    expect(parseCorrectOptionSpec("a, C", 4)).toEqual({ ok: true, indexes: [0, 2] });
    expect(parseCorrectOptionSpec(2, 4)).toEqual({ ok: true, indexes: [1] });
    expect(parseCorrectOptionSpec("1;4", 4)).toEqual({ ok: true, indexes: [0, 3] });
  });

  it("rejects blanks, junk tokens, and out-of-range picks", () => {
    expect(parseCorrectOptionSpec("", 4).ok).toBe(false);
    expect(parseCorrectOptionSpec("AB", 4).ok).toBe(false);
    expect(parseCorrectOptionSpec("5", 4).ok).toBe(false);
    expect(parseCorrectOptionSpec("0", 4).ok).toBe(false);
  });
});
