import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type PyqRow = {
  questionNumber: number;
  topicSlug: string;
  sourceReference: string;
  isContested: boolean;
  status: string;
  exposurePolicy: string;
  qualityTier: string;
  content: {
    text: string;
    options: string[];
    correct_options?: number[];
    official_answer: string;
    source_url: string;
    answer_key_url: string;
  };
  explanation: string;
  explanationDetail: string;
};

const rows = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "upsc-pyq", "2021-gs1.json"), "utf8")
) as PyqRow[];

describe("UPSC 2021 GS I PYQ data", () => {
  it("contains one unique row for every Series A question", () => {
    expect(rows).toHaveLength(100);
    expect(rows.map((row) => row.questionNumber)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(new Set(rows.map((row) => row.sourceReference)).size).toBe(100);
  });

  it("contains complete MCQ content and official provenance", () => {
    for (const row of rows) {
      expect(row.content.text.length).toBeGreaterThan(10);
      expect(row.content.options).toHaveLength(4);
      expect(row.content.options.every((option) => typeof option === "string" && option !== "[object Object]")).toBe(true);
      expect(row.content.source_url).toContain("upsc.gov.in");
      expect(row.content.answer_key_url).toContain("upsc.gov.in");
    }
  });

  it("contains a topic and reviewable explanation for every question", () => {
    for (const row of rows) {
      expect(row.topicSlug.length).toBeGreaterThan(2);
      expect(row.explanation.length).toBeGreaterThan(10);
      expect(row.explanationDetail.length).toBeGreaterThan(20);
      expect(row.status).toBe("draft");
    }
  });

  it("keeps official dropped question 80 hidden and unscored", () => {
    const dropped = rows.find((row) => row.questionNumber === 80);
    expect(dropped).toMatchObject({
      isContested: true,
      exposurePolicy: "hidden",
      qualityTier: "quarantine",
      content: { official_answer: "DROPPED" }
    });
    expect(dropped?.content.correct_options).toBeUndefined();

    for (const row of rows.filter((item) => item.questionNumber !== 80)) {
      expect(row.isContested).toBe(false);
      expect(row.content.correct_options).toHaveLength(1);
      expect(row.content.correct_options?.[0]).toBeGreaterThanOrEqual(0);
      expect(row.content.correct_options?.[0]).toBeLessThanOrEqual(3);
    }
  });
});


