export const MASTERY_DECAY_TIME_CONSTANT_DAYS = 14;
export const MIN_DECAYED_MASTERY = 0;

export function computeDecayedMastery(
  storedMastery: number,
  daysSinceTested: number,
  stabilityFactor: number
): number {
  if (daysSinceTested <= 0) {
    return storedMastery;
  }

  const effectiveStabilityFactor =
    Number.isFinite(stabilityFactor) && stabilityFactor > 0 ? stabilityFactor : 1;
  const decayExponent =
    -daysSinceTested / (MASTERY_DECAY_TIME_CONSTANT_DAYS * effectiveStabilityFactor);

  return Math.max(MIN_DECAYED_MASTERY, storedMastery * Math.exp(decayExponent));
}
