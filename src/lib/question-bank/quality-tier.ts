export const QUALITY_TIERS = ["gold", "silver", "bronze", "quarantine"] as const;

export type QualityTier = (typeof QUALITY_TIERS)[number];

export const QUALITY_TIER_RANK: Record<QualityTier, number> = {
  gold: 4,
  silver: 3,
  bronze: 2,
  quarantine: 1
};

export function isValidQualityTier(value: string): value is QualityTier {
  return QUALITY_TIERS.includes(value as QualityTier);
}

export function meetsMinimumTier(tier: string, minTier: string): boolean {
  if (!isValidQualityTier(tier) || !isValidQualityTier(minTier) || tier === "quarantine") {
    return false;
  }

  return QUALITY_TIER_RANK[tier] >= QUALITY_TIER_RANK[minTier];
}
