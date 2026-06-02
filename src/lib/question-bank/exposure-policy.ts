export const EXPOSURE_POLICIES = [
  "practice",
  "diagnostic_reserved",
  "benchmark_reserved",
  "hidden"
] as const;

export type ExposurePolicy = (typeof EXPOSURE_POLICIES)[number];

export function isValidExposurePolicy(value: string): value is ExposurePolicy {
  return EXPOSURE_POLICIES.includes(value as ExposurePolicy);
}

export function getEligibleExposurePolicies(sessionType: string): ExposurePolicy[] {
  if (sessionType === "diagnostic") {
    return ["practice", "diagnostic_reserved"];
  }

  if (sessionType === "benchmark" || sessionType === "mock") {
    return ["practice", "benchmark_reserved"];
  }

  return ["practice"];
}
