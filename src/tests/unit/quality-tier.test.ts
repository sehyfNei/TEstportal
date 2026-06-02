import { describe, expect, it } from "vitest";
import {
  isValidQualityTier,
  meetsMinimumTier,
  QUALITY_TIER_RANK
} from "@/lib/question-bank/quality-tier";

describe("quality tier helpers", () => {
  it("orders quality tiers by launch selection rank", () => {
    expect(QUALITY_TIER_RANK).toEqual({
      gold: 4,
      silver: 3,
      bronze: 2,
      quarantine: 1
    });
  });

  it("validates known quality tiers", () => {
    expect(isValidQualityTier("gold")).toBe(true);
    expect(isValidQualityTier("silver")).toBe(true);
    expect(isValidQualityTier("bronze")).toBe(true);
    expect(isValidQualityTier("quarantine")).toBe(true);
    expect(isValidQualityTier("unknown")).toBe(false);
  });

  it("allows gold through every normal minimum", () => {
    expect(meetsMinimumTier("gold", "gold")).toBe(true);
    expect(meetsMinimumTier("gold", "silver")).toBe(true);
    expect(meetsMinimumTier("gold", "bronze")).toBe(true);
  });

  it("allows silver through silver and bronze minimums only", () => {
    expect(meetsMinimumTier("silver", "gold")).toBe(false);
    expect(meetsMinimumTier("silver", "silver")).toBe(true);
    expect(meetsMinimumTier("silver", "bronze")).toBe(true);
  });

  it("allows bronze through bronze minimum only", () => {
    expect(meetsMinimumTier("bronze", "gold")).toBe(false);
    expect(meetsMinimumTier("bronze", "silver")).toBe(false);
    expect(meetsMinimumTier("bronze", "bronze")).toBe(true);
  });

  it("excludes quarantine from all minimums", () => {
    expect(meetsMinimumTier("quarantine", "gold")).toBe(false);
    expect(meetsMinimumTier("quarantine", "silver")).toBe(false);
    expect(meetsMinimumTier("quarantine", "bronze")).toBe(false);
    expect(meetsMinimumTier("quarantine", "quarantine")).toBe(false);
  });

  it("treats quarantine minimum as the lowest non-quarantine threshold", () => {
    expect(meetsMinimumTier("gold", "quarantine")).toBe(true);
    expect(meetsMinimumTier("silver", "quarantine")).toBe(true);
    expect(meetsMinimumTier("bronze", "quarantine")).toBe(true);
  });

  it("rejects invalid tier inputs", () => {
    expect(meetsMinimumTier("unknown", "bronze")).toBe(false);
    expect(meetsMinimumTier("gold", "unknown")).toBe(false);
  });
});
