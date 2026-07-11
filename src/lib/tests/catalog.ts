export type TestModeId = "diagnostic" | "topic" | "sectional" | "mock";

export type TestMode = {
  id: TestModeId;
  sessionType: "diagnostic" | "topic" | "sectional" | "mock";
  title: string;
  description: string;
  requiresTopic: boolean;
  defaultCount: number;
  defaultDurationMinutes: number | null;
  minQualityTier: "gold" | "silver" | "bronze";
};

export const TEST_MODES: readonly TestMode[] = [
  {
    id: "diagnostic",
    sessionType: "diagnostic",
    title: "Diagnostic",
    description: "Map your current strengths and weak areas across the full syllabus.",
    requiresTopic: false,
    defaultCount: 20,
    defaultDurationMinutes: 25,
    minQualityTier: "bronze"
  },
  {
    id: "topic",
    sessionType: "topic",
    title: "Topic practice",
    description: "Drill one topic with questions you have not seen recently.",
    requiresTopic: true,
    defaultCount: 10,
    defaultDurationMinutes: null,
    minQualityTier: "bronze"
  },
  {
    id: "sectional",
    sessionType: "sectional",
    title: "Sectional test",
    description: "A timed section-length test scoped to one topic.",
    requiresTopic: true,
    defaultCount: 25,
    defaultDurationMinutes: 30,
    minQualityTier: "bronze"
  },
  {
    id: "mock",
    sessionType: "mock",
    title: "Full mock",
    description: "A timed exam-style mock drawing on the strongest available questions.",
    requiresTopic: false,
    defaultCount: 50,
    defaultDurationMinutes: 60,
    minQualityTier: "bronze"
  }
];

export const DEFAULT_MODE_ID: TestModeId = "diagnostic";

export function getTestMode(id: string | null | undefined): TestMode | null {
  if (typeof id !== "string") {
    return null;
  }

  return TEST_MODES.find((mode) => mode.id === id) ?? null;
}

export type CatalogPreselect = {
  modeId: TestModeId;
  topicId: string | null;
  scheduleId: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseCatalogSearchParams(
  params: Record<string, string | string[] | undefined>
): CatalogPreselect {
  const mode = getTestMode(singleValue(params.mode));

  return {
    modeId: mode?.id ?? DEFAULT_MODE_ID,
    topicId: uuidOrNull(singleValue(params.topicId)),
    scheduleId: uuidOrNull(singleValue(params.scheduleId))
  };
}

function uuidOrNull(value: string | null): string | null {
  return value && UUID_PATTERN.test(value) ? value : null;
}

function singleValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return null;
}
