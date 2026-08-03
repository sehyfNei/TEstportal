export const TEST_EXPERIENCE_STORAGE_KEY = "test-runner-experience";

export type TestExperience = "classic" | "beta";

export function normalizeTestExperience(value: unknown): TestExperience {
  return value === "beta" ? "beta" : "classic";
}

export function buildTestSessionHref(sessionId: string, experience: TestExperience) {
  return `/tests/${encodeURIComponent(sessionId)}?experience=${experience}`;
}
