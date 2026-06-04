import { describe, expect, it } from "vitest";
import {
  FLAG_REASONS,
  FLAG_REASON_LABELS,
  isValidFlagReason
} from "@/lib/question-bank/flag-reasons";

describe("isValidFlagReason", () => {
  it("returns true for each valid reason", () => {
    for (const reason of FLAG_REASONS) {
      expect(isValidFlagReason(reason)).toBe(true);
    }
  });

  it("returns false for an unknown string", () => {
    expect(isValidFlagReason("bad_reason")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidFlagReason("")).toBe(false);
  });

  it("returns false for a non-string (number)", () => {
    expect(isValidFlagReason(42)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isValidFlagReason(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isValidFlagReason(undefined)).toBe(false);
  });
});

describe("FLAG_REASON_LABELS", () => {
  it("has a label for every FLAG_REASONS entry", () => {
    for (const reason of FLAG_REASONS) {
      expect(FLAG_REASON_LABELS[reason]).toBeDefined();
      expect(typeof FLAG_REASON_LABELS[reason]).toBe("string");
      expect(FLAG_REASON_LABELS[reason].length).toBeGreaterThan(0);
    }
  });

  it("has exactly the same number of entries as FLAG_REASONS", () => {
    const labelKeys = Object.keys(FLAG_REASON_LABELS);
    expect(labelKeys.length).toBe(FLAG_REASONS.length);
  });
});
