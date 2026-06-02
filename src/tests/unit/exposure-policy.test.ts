import { describe, expect, it } from "vitest";
import {
  getEligibleExposurePolicies,
  isValidExposurePolicy
} from "@/lib/question-bank/exposure-policy";

describe("exposure policy helpers", () => {
  it.each([
    ["practice", ["practice"]],
    ["topic", ["practice"]],
    ["concept_retest", ["practice"]],
    ["sectional", ["practice"]],
    ["custom", ["practice"]],
    ["diagnostic", ["practice", "diagnostic_reserved"]],
    ["benchmark", ["practice", "benchmark_reserved"]],
    ["mock", ["practice", "benchmark_reserved"]],
    ["unknown", ["practice"]]
  ])("returns eligible policies for %s sessions", (sessionType, expected) => {
    expect(getEligibleExposurePolicies(sessionType)).toEqual(expected);
  });

  it("never includes hidden in eligible policies", () => {
    const sessionTypes = [
      "practice",
      "topic",
      "concept_retest",
      "sectional",
      "custom",
      "diagnostic",
      "benchmark",
      "mock",
      "unknown"
    ];

    for (const sessionType of sessionTypes) {
      expect(getEligibleExposurePolicies(sessionType)).not.toContain("hidden");
    }
  });

  it("validates exposure policies", () => {
    expect(isValidExposurePolicy("practice")).toBe(true);
    expect(isValidExposurePolicy("diagnostic_reserved")).toBe(true);
    expect(isValidExposurePolicy("benchmark_reserved")).toBe(true);
    expect(isValidExposurePolicy("hidden")).toBe(true);
    expect(isValidExposurePolicy("unknown")).toBe(false);
  });
});
