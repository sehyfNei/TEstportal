import {
  aggregateConfidenceInTopic,
  averageDifficultyInTopic,
  computeTopicMastery
} from "@/lib/scoring/compute-mastery";
import type { MasteryRecord as DbMasteryRecord } from "@/lib/db/schema/learning";
import type {
  MasteryUpdate,
  QuestionDifficulty,
  ScoreBucket,
  SessionAnswerForMastery,
  SessionType
} from "@/lib/scoring/mastery-types";

type MasteryEntity = "topic" | "concept";

export type MasteryJobSource = {
  resultId: string;
  userId: string;
  examId: string;
  sessionId: string;
  sessionType: SessionType;
  topicScores: Record<string, ScoreBucket>;
  conceptScores: Record<string, ScoreBucket> | null;
  sessionAnswers: SessionAnswerForMastery[];
  questionDifficulties: Map<string, QuestionDifficulty>;
  questionTopics: Map<string, string>;
  questionConcepts: Map<string, string[]>;
  testedAt?: Date;
};

export type MasteryLookupKey = {
  userId: string;
  examId: string;
  topicId?: string;
  conceptId?: string;
};

export type ExistingMasteryRecord = Pick<
  DbMasteryRecord,
  "id" | "masteryScore" | "questionsAttempted" | "questionsCorrect" | "stabilityFactor"
>;

export type MasteryRecordUpsert = MasteryLookupKey & {
  id?: string;
  masteryScore: number;
  confidenceLevel: MasteryUpdate["confidenceLevel"];
  baselineScore: number;
  stabilityFactor: number;
  questionsAttempted: number;
  questionsCorrect: number;
  lastTestedAt: Date;
  updatedAt: Date;
};

export type MasteryUpdateRepository = {
  loadMasterySource(resultId: string): Promise<MasteryJobSource | null>;
  findMasteryRecord(key: MasteryLookupKey): Promise<ExistingMasteryRecord | null>;
  upsertMasteryRecord(record: MasteryRecordUpsert): Promise<void>;
  transaction?<T>(work: (repository: MasteryUpdateRepository) => Promise<T>): Promise<T>;
};

export async function updateMasteryJob(
  resultId: string,
  repository?: MasteryUpdateRepository
): Promise<MasteryUpdate[]> {
  if (!repository) {
    throw new Error("updateMasteryJob requires a repository adapter until the job runner DB client is introduced.");
  }

  if (repository.transaction) {
    return repository.transaction((txRepository) => runMasteryUpdate(resultId, txRepository));
  }

  return runMasteryUpdate(resultId, repository);
}

async function runMasteryUpdate(resultId: string, repository: MasteryUpdateRepository): Promise<MasteryUpdate[]> {
  const source = await repository.loadMasterySource(resultId);

  if (!source) {
    throw new Error(`Session result ${resultId} not found for mastery update.`);
  }

  const testedAt = source.testedAt ?? new Date();
  const updates: MasteryUpdate[] = [];

  await processMasteryEntity({
    entity: "topic",
    source,
    scoreBuckets: source.topicScores,
    groupedAnswers: groupAnswersByTopic(source),
    testedAt,
    repository,
    updates
  });

  await processMasteryEntity({
    entity: "concept",
    source,
    scoreBuckets: source.conceptScores ?? {},
    groupedAnswers: groupAnswersByConcept(source),
    testedAt,
    repository,
    updates
  });

  return updates;
}

type ProcessMasteryEntityInput = {
  entity: MasteryEntity;
  source: MasteryJobSource;
  scoreBuckets: Record<string, ScoreBucket>;
  groupedAnswers: Map<string, SessionAnswerForMastery[]>;
  testedAt: Date;
  repository: MasteryUpdateRepository;
  updates: MasteryUpdate[];
};

async function processMasteryEntity(input: ProcessMasteryEntityInput) {
  for (const [entityId, answers] of input.groupedAnswers.entries()) {
    const scoreBucket = input.scoreBuckets[entityId] ?? summarizeAnswers(answers);
    const questionsAttempted = Math.max(0, scoreBucket.attempted);
    const questionsCorrect = Math.max(0, Math.min(scoreBucket.correct, questionsAttempted));

    if (questionsAttempted === 0) {
      continue;
    }

    const lookupKey = makeLookupKey(input.source, input.entity, entityId);
    const current = await input.repository.findMasteryRecord(lookupKey);
    const oldMasteryScore = current ? toNumber(current.masteryScore) : null;
    const oldQuestionsAttempted = current ? toNumber(current.questionsAttempted) : 0;
    const oldQuestionsCorrect = current ? toNumber(current.questionsCorrect) : 0;
    const oldStabilityFactor = current ? toNumber(current.stabilityFactor) : 1.0;
    const accuracy = questionsCorrect / questionsAttempted;
    const confidence = aggregateConfidenceInTopic(answers);
    const difficulty = averageDifficultyInTopic(difficultiesForAnswers(answers, input.source));
    const result = computeTopicMastery(
      oldMasteryScore,
      accuracy,
      input.source.sessionType,
      confidence,
      difficulty,
      questionsAttempted,
      questionsCorrect,
      oldQuestionsAttempted,
      oldQuestionsCorrect,
      oldStabilityFactor
    );
    const totalAttempted = oldQuestionsAttempted + questionsAttempted;
    const totalCorrect = oldQuestionsCorrect + questionsCorrect;

    await input.repository.upsertMasteryRecord({
      ...lookupKey,
      id: current?.id,
      masteryScore: result.masteryScore,
      confidenceLevel: result.confidenceLevel,
      baselineScore: oldMasteryScore === null ? accuracy * 100 : oldMasteryScore,
      stabilityFactor: result.stabilityFactor,
      questionsAttempted: totalAttempted,
      questionsCorrect: totalCorrect,
      lastTestedAt: input.testedAt,
      updatedAt: input.testedAt
    });

    input.updates.push({
      topicId: input.entity === "topic" ? entityId : undefined,
      conceptId: input.entity === "concept" ? entityId : undefined,
      oldMasteryScore,
      newMasteryScore: result.masteryScore,
      confidenceLevel: result.confidenceLevel,
      stabilityFactor: result.stabilityFactor,
      questionsAttempted: totalAttempted,
      questionsCorrect: totalCorrect,
      lastTestedAt: input.testedAt
    });
  }
}

function groupAnswersByTopic(source: MasteryJobSource) {
  const grouped = new Map<string, SessionAnswerForMastery[]>();

  for (const answer of source.sessionAnswers) {
    const topicId = source.questionTopics.get(answer.questionId);

    if (!topicId) {
      continue;
    }

    appendGroupedAnswer(grouped, topicId, answer);
  }

  return grouped;
}

function groupAnswersByConcept(source: MasteryJobSource) {
  const grouped = new Map<string, SessionAnswerForMastery[]>();

  for (const answer of source.sessionAnswers) {
    const conceptIds = source.questionConcepts.get(answer.questionId) ?? [];

    for (const conceptId of conceptIds) {
      appendGroupedAnswer(grouped, conceptId, answer);
    }
  }

  return grouped;
}

function appendGroupedAnswer(grouped: Map<string, SessionAnswerForMastery[]>, key: string, answer: SessionAnswerForMastery) {
  const answers = grouped.get(key);

  if (answers) {
    answers.push(answer);
  } else {
    grouped.set(key, [answer]);
  }
}

function makeLookupKey(source: MasteryJobSource, entity: MasteryEntity, entityId: string): MasteryLookupKey {
  return {
    userId: source.userId,
    examId: source.examId,
    topicId: entity === "topic" ? entityId : undefined,
    conceptId: entity === "concept" ? entityId : undefined
  };
}

function summarizeAnswers(answers: SessionAnswerForMastery[]): ScoreBucket {
  let attempted = 0;
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  let score = 0;

  for (const answer of answers) {
    score += answer.marksAwarded;

    if (answer.isCorrect === null) {
      skipped += 1;
    } else if (answer.isCorrect) {
      attempted += 1;
      correct += 1;
    } else {
      attempted += 1;
      incorrect += 1;
    }
  }

  return {
    score,
    maxScore: answers.length,
    attempted,
    correct,
    incorrect,
    skipped
  };
}

function difficultiesForAnswers(answers: SessionAnswerForMastery[], source: MasteryJobSource): QuestionDifficulty[] {
  const difficulties: QuestionDifficulty[] = [];

  for (const answer of answers) {
    const difficulty = source.questionDifficulties.get(answer.questionId);

    if (difficulty) {
      difficulties.push(difficulty);
    }
  }

  return difficulties;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
