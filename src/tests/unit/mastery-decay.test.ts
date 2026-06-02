import { describe, expect, it } from "vitest";
import {
  MASTERY_DECAY_TIME_CONSTANT_DAYS,
  MIN_DECAYED_MASTERY,
  computeDecayedMastery
} from "@/lib/adaptive/mastery-decay";

describe("computeDecayedMastery", () => {
  it("leaves mastery unchanged when zero days elapsed", () => {
    expect(computeDecayedMastery(80, 0, 1)).toBe(80);
  });

  it("leaves mastery unchanged when elapsed days are negative", () => {
    expect(computeDecayedMastery(80, -3, 1)).toBe(80);
  });

  it("decays to e^-1 after 14 days at stability 1.0", () => {
    expect(computeDecayedMastery(80, 14, 1)).toBeCloseTo(80 * Math.exp(-1), 5);
    expect(MASTERY_DECAY_TIME_CONSTANT_DAYS).toBe(14);
  });

  it("decays to e^-2 after 28 days at stability 1.0", () => {
    expect(computeDecayedMastery(80, 28, 1)).toBeCloseTo(80 * Math.exp(-2), 5);
  });

  it("decays to e^-0.5 after 14 days at stability 2.0", () => {
    expect(computeDecayedMastery(80, 14, 2)).toBeCloseTo(80 * Math.exp(-0.5), 5);
  });

  it("decays to e^-1 after 28 days at stability 2.0", () => {
    expect(computeDecayedMastery(80, 28, 2)).toBeCloseTo(80 * Math.exp(-1), 5);
  });

  it("decays high mastery without exceeding the stored value", () => {
    const result = computeDecayedMastery(100, 14, 1);

    expect(result).toBeCloseTo(100 * Math.exp(-1), 5);
    expect(result).toBeLessThan(100);
  });

  it("keeps low positive mastery above zero after one time constant", () => {
    const result = computeDecayedMastery(5, 14, 1);

    expect(result).toBeCloseTo(5 * Math.exp(-1), 5);
    expect(result).toBeGreaterThan(0);
  });

  it("keeps zero mastery at zero", () => {
    expect(computeDecayedMastery(0, 14, 1)).toBe(0);
  });

  it("floors negative decayed values at zero", () => {
    expect(computeDecayedMastery(-10, 14, 1)).toBe(MIN_DECAYED_MASTERY);
  });

  it("decays faster at stability 1.0 than stability 2.0", () => {
    const fastDecay = computeDecayedMastery(80, 14, 1);
    const slowDecay = computeDecayedMastery(80, 14, 2);

    expect(fastDecay).toBeLessThan(slowDecay);
  });

  it("uses stability 1.0 as the fallback for invalid stability values", () => {
    expect(computeDecayedMastery(80, 14, 0)).toBeCloseTo(80 * Math.exp(-1), 5);
  });
});
