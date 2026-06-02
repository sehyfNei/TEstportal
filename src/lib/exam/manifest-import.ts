import { examManifestSchema, type ExamManifest, type ExamManifestTopic } from "@/lib/exam/manifest-schema";

export type FlattenedTopic = {
  slug: string;
  name: string;
  description?: string;
  weightPercent?: number;
  parentSlug?: string;
  level: number;
  orderIndex: number;
};

export type DatabaseManifestTopic = {
  slug: string;
  name: string;
  description: string | null;
  weight_percent: number | null;
  parent_slug: string | null;
  level: number;
  order_index: number;
};

export type ManifestImportPlan = {
  manifest: ExamManifest;
  topics: DatabaseManifestTopic[];
  summary: ReturnType<typeof summarizeManifest>;
};

export function parseExamManifest(input: unknown): ExamManifest {
  return examManifestSchema.parse(input);
}

export function parseExamManifestJson(json: string): ExamManifest {
  return parseExamManifest(JSON.parse(json));
}

export function flattenTopics(topics: ExamManifestTopic[], parentSlug?: string, level = 1) {
  const flattened: FlattenedTopic[] = [];

  topics.forEach((topic, orderIndex) => {
    flattened.push({
      slug: topic.slug,
      name: topic.name,
      description: topic.description,
      weightPercent: topic.weightPercent,
      parentSlug,
      level,
      orderIndex
    });

    if (topic.children?.length) {
      flattened.push(...flattenTopics(topic.children, topic.slug, level + 1));
    }
  });

  return flattened;
}

function findDuplicate(values: string[]) {
  const seen = new Set<string>();

  return values.find((value) => {
    if (seen.has(value)) {
      return true;
    }

    seen.add(value);
    return false;
  });
}

export function validateManifestReferences(manifest: ExamManifest) {
  const flattenedTopics = flattenTopics(manifest.topics);
  const topicSlugs = flattenedTopics.map((topic) => topic.slug);
  const clusterSlugs = manifest.conceptClusters.map((cluster) => cluster.slug);
  const conceptSlugs = manifest.concepts.map((concept) => concept.slug);
  const duplicateTopicSlug = findDuplicate(topicSlugs);
  const duplicateClusterSlug = findDuplicate(clusterSlugs);
  const duplicateConceptSlug = findDuplicate(conceptSlugs);
  const topicSlugSet = new Set(topicSlugs);
  const clusterSlugSet = new Set(clusterSlugs);
  const sectionQuestionCount = manifest.marking.sections.reduce(
    (total, section) => total + section.questionCount,
    0
  );

  if (duplicateTopicSlug) {
    throw new Error(`Duplicate topic slug: ${duplicateTopicSlug}`);
  }

  if (duplicateClusterSlug) {
    throw new Error(`Duplicate concept cluster slug: ${duplicateClusterSlug}`);
  }

  if (duplicateConceptSlug) {
    throw new Error(`Duplicate concept slug: ${duplicateConceptSlug}`);
  }

  if (sectionQuestionCount !== manifest.marking.totalQuestions) {
    throw new Error("Section question counts must equal marking.totalQuestions.");
  }

  manifest.concepts.forEach((concept) => {
    if (!topicSlugSet.has(concept.topicSlug)) {
      throw new Error(`Concept "${concept.slug}" references unknown topic "${concept.topicSlug}".`);
    }

    if (concept.clusterSlug && !clusterSlugSet.has(concept.clusterSlug)) {
      throw new Error(
        `Concept "${concept.slug}" references unknown concept cluster "${concept.clusterSlug}".`
      );
    }
  });
}

export function createManifestImportPlan(input: unknown): ManifestImportPlan {
  const manifest = parseExamManifest(input);
  validateManifestReferences(manifest);

  return {
    manifest,
    topics: flattenTopics(manifest.topics).map((topic) => ({
      slug: topic.slug,
      name: topic.name,
      description: topic.description ?? null,
      weight_percent: topic.weightPercent ?? null,
      parent_slug: topic.parentSlug ?? null,
      level: topic.level,
      order_index: topic.orderIndex
    })),
    summary: summarizeManifest(manifest)
  };
}

export function createManifestImportPlanFromJson(json: string): ManifestImportPlan {
  return createManifestImportPlan(JSON.parse(json));
}

export function summarizeManifest(manifest: ExamManifest) {
  const flattenedTopics = flattenTopics(manifest.topics);

  return {
    examSlug: manifest.exam.slug,
    examName: manifest.exam.name,
    topicCount: flattenedTopics.length,
    conceptCount: manifest.concepts.length,
    clusterCount: manifest.conceptClusters.length,
    cutoffCount: manifest.historicalCutoffs.length,
    totalQuestions: manifest.marking.totalQuestions,
    durationMinutes: manifest.marking.durationMinutes
  };
}
