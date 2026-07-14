import {
  createManifestImportPlan,
  type ManifestImportPlan
} from "@/lib/exam/manifest-import";

export type ManifestBuilderTopic = {
  name: string;
  weightPercent: string;
};

export type ManifestBuilderValue = {
  examName: string;
  description: string;
  durationMinutes: string;
  totalQuestions: string;
  marksPerCorrect: string;
  negativeMarkingFraction: string;
};

export const NEGATIVE_MARKING_CHOICES = [
  { value: "0", label: "No negative marking" },
  { value: "0.25", label: "1/4 mark deducted" },
  { value: "0.3333", label: "1/3 mark deducted" },
  { value: "0.5", label: "1/2 mark deducted" }
] as const;

export function emptyManifestBuilderValue(): ManifestBuilderValue {
  return {
    examName: "",
    description: "",
    durationMinutes: "120",
    totalQuestions: "100",
    marksPerCorrect: "2",
    negativeMarkingFraction: "0.3333"
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ManifestBuildResult =
  | { ok: true; json: string; plan: ManifestImportPlan }
  | { ok: false; message: string };

/**
 * Turns the guided form into a full manifest and runs it through the same
 * validation the JSON import path uses, so the builder can never submit a
 * manifest the importer would reject.
 */
export function buildManifestFromForm(
  value: ManifestBuilderValue,
  topics: ManifestBuilderTopic[]
): ManifestBuildResult {
  const examName = value.examName.trim();

  if (!examName) {
    return { ok: false, message: "Give the exam a name." };
  }

  const examSlug = slugify(examName);

  if (!examSlug) {
    return { ok: false, message: "The exam name needs at least one letter or number." };
  }

  const durationMinutes = parsePositiveInt(value.durationMinutes);

  if (!durationMinutes) {
    return { ok: false, message: "Duration must be a whole number of minutes." };
  }

  const totalQuestions = parsePositiveInt(value.totalQuestions);

  if (!totalQuestions) {
    return { ok: false, message: "Total questions must be a whole number." };
  }

  const marksPerCorrect = Number(value.marksPerCorrect);

  if (!Number.isFinite(marksPerCorrect) || marksPerCorrect <= 0) {
    return { ok: false, message: "Marks per correct answer must be a positive number." };
  }

  const negativeMarkingFraction = Number(value.negativeMarkingFraction);

  if (!Number.isFinite(negativeMarkingFraction) || negativeMarkingFraction < 0) {
    return { ok: false, message: "Pick a negative marking option." };
  }

  const namedTopics = topics
    .map((topic) => ({ name: topic.name.trim(), weightPercent: topic.weightPercent.trim() }))
    .filter((topic) => topic.name);

  if (!namedTopics.length) {
    return { ok: false, message: "Add at least one topic (e.g. Polity, History)." };
  }

  const usedSlugs = new Set<string>();
  const manifestTopics: Array<{ slug: string; name: string; weightPercent?: number }> = [];

  for (const topic of namedTopics) {
    let slug = slugify(topic.name);

    if (!slug) {
      return { ok: false, message: `Topic "${topic.name}" needs at least one letter or number.` };
    }

    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${slugify(topic.name)}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);

    let weightPercent: number | undefined;

    if (topic.weightPercent) {
      const parsed = Number(topic.weightPercent);

      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        return {
          ok: false,
          message: `Weight for "${topic.name}" must be a number between 0 and 100 (or left blank).`
        };
      }

      weightPercent = parsed;
    }

    manifestTopics.push({ slug, name: topic.name, ...(weightPercent !== undefined ? { weightPercent } : {}) });
  }

  const manifest = {
    schemaVersion: "1.0",
    exam: {
      slug: examSlug,
      name: examName,
      ...(value.description.trim() ? { description: value.description.trim() } : {}),
      languages: ["en"],
      supportedQuestionTypes: ["mcq", "msq", "integer", "statement", "assertion", "match"]
    },
    marking: {
      totalQuestions,
      durationMinutes,
      marksPerCorrect,
      negativeMarkingFraction,
      sections: [{ slug: "general", name: "General", questionCount: totalQuestions }]
    },
    topics: manifestTopics
  };

  try {
    const plan = createManifestImportPlan(manifest);

    return { ok: true, json: JSON.stringify(manifest, null, 2), plan };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "The manifest failed validation."
    };
  }
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number(value.trim());

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
