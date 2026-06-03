import { describe, expect, it } from "vitest";
import {
  REPORT_CATEGORY_LABELS,
  VALID_REPORT_CATEGORIES,
  isValidRating,
  isValidReportCategory,
  isValidScope
} from "@/lib/ai/rating-helpers";

describe("isValidScope", () => {
  it("accepts the three known scopes", () => {
    expect(isValidScope("question_analysis")).toBe(true);
    expect(isValidScope("topic_summary")).toBe(true);
    expect(isValidScope("overall")).toBe(true);
  });

  it("rejects unknown scopes and non-strings", () => {
    expect(isValidScope("summary")).toBe(false);
    expect(isValidScope("")).toBe(false);
    expect(isValidScope(null)).toBe(false);
    expect(isValidScope(undefined)).toBe(false);
    expect(isValidScope(3)).toBe(false);
  });
});

describe("isValidRating", () => {
  it("accepts up and down", () => {
    expect(isValidRating("up")).toBe(true);
    expect(isValidRating("down")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isValidRating("yes")).toBe(false);
    expect(isValidRating("thumbs_up")).toBe(false);
    expect(isValidRating("")).toBe(false);
    expect(isValidRating(null)).toBe(false);
  });
});

describe("isValidReportCategory", () => {
  it("accepts the four known categories", () => {
    for (const category of VALID_REPORT_CATEGORIES) {
      expect(isValidReportCategory(category)).toBe(true);
    }
  });

  it("rejects unknown categories, empty string, and null", () => {
    expect(isValidReportCategory("bad")).toBe(false);
    expect(isValidReportCategory("incorrect")).toBe(false);
    expect(isValidReportCategory("")).toBe(false);
    expect(isValidReportCategory(null)).toBe(false);
    expect(isValidReportCategory(undefined)).toBe(false);
  });
});

describe("REPORT_CATEGORY_LABELS", () => {
  it("provides a non-empty label for every valid category", () => {
    expect(Object.keys(REPORT_CATEGORY_LABELS).sort()).toEqual([...VALID_REPORT_CATEGORIES].sort());

    for (const category of VALID_REPORT_CATEGORIES) {
      expect(REPORT_CATEGORY_LABELS[category].length).toBeGreaterThan(0);
    }
  });
});
