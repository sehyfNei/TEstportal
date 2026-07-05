import { describe, expect, it, vi } from "vitest";
import {
  updateMasteryJob,
  type ExistingMasteryRecord,
  type MasteryJobSource,
  type MasteryLookupKey,
  type MasteryRecordUpsert,
  type MasteryUpdateRepository
} from "@/lib/jobs/handlers/update-mastery";
import type { ScoreBucket, SessionAnswerForMastery } from "@/lib/scoring/mastery-types";

const TESTED_AT = new Date("2026-07-05T00:00:00.000Z");

describe("updateMasteryJob", () => {
  it("throws when the session result source cannot be loaded", async () => {
    const { repository } = createRepository(null);

    await expect(updateMasteryJob("missing-result", repository)).rejects.toThrow(
      "Session result missing-result not found for mastery update."
    );
  });

  it("initializes a new topic mastery record when no prior record exists", async () => {
    const { repository, upserts } = createRepository(sourceForTopic());

    const updates = await updateMasteryJob("result-1", repository);

    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({
      userId: "user-1",
      examId: "exam-1",
      topicId: "topic-1",
      conceptId: undefined,
      baselineScore: 100,
      questionsAttempted: 2,
      questionsCorrect: 2,
      lastTestedAt: TESTED_AT,
      updatedAt: TESTED_AT
    });
    expect(upserts[0].id).toBeUndefined();
    expect(upserts[0].masteryScore).toBe(100);
    expect(upserts[0].stabilityFactor).toBe(1);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      topicId: "topic-1",
      conceptId: undefined,
      oldMasteryScore: null,
      questionsAttempted: 2,
      questionsCorrect: 2
    });
  });

  it("accumulates attempts and preserves record id for existing topic mastery", async () => {
    const existing = new Map([
      [
        keyFor({ userId: "user-1", examId: "exam-1", topicId: "topic-1" }),
        {
          id: "mastery-1",
          masteryScore: "40",
          questionsAttempted: 3,
          questionsCorrect: 1,
          stabilityFactor: "1.2"
        }
      ]
    ]);
    const { repository, upserts } = createRepository(sourceForTopic(), existing);

    const updates = await updateMasteryJob("result-1", repository);

    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({
      id: "mastery-1",
      topicId: "topic-1",
      questionsAttempted: 5,
      questionsCorrect: 3,
      baselineScore: 40
    });
    expect(upserts[0].masteryScore).toBeGreaterThan(40);
    expect(updates[0]).toMatchObject({
      oldMasteryScore: 40,
      questionsAttempted: 5,
      questionsCorrect: 3
    });
  });

  it("skips grouped answers when the score bucket has zero attempted questions", async () => {
    const source = sourceForTopic({
      topicScores: {
        "topic-1": bucket({ attempted: 0, correct: 0, skipped: 1 })
      },
      sessionAnswers: [answer("q1", null)],
      questionTopics: new Map([["q1", "topic-1"]])
    });
    const { repository, upserts } = createRepository(source);

    const updates = await updateMasteryJob("result-1", repository);

    expect(updates).toEqual([]);
    expect(upserts).toEqual([]);
  });

  it("branches topic and concept mastery updates into separate lookup keys", async () => {
    const source = sourceForTopic({
      conceptScores: {
        "concept-1": bucket({ attempted: 2, correct: 1 })
      },
      questionConcepts: new Map([
        ["q1", ["concept-1"]],
        ["q2", ["concept-1"]]
      ])
    });
    const { repository, findKeys, upserts } = createRepository(source);

    const updates = await updateMasteryJob("result-1", repository);

    expect(findKeys).toEqual([
      { userId: "user-1", examId: "exam-1", topicId: "topic-1", conceptId: undefined },
      { userId: "user-1", examId: "exam-1", topicId: undefined, conceptId: "concept-1" }
    ]);
    expect(upserts).toHaveLength(2);
    expect(upserts.map((record) => [record.topicId, record.conceptId])).toEqual([
      ["topic-1", undefined],
      [undefined, "concept-1"]
    ]);
    expect(updates.map((update) => [update.topicId, update.conceptId])).toEqual([
      ["topic-1", undefined],
      [undefined, "concept-1"]
    ]);
  });

  it("summarizes grouped answers when a score bucket is missing", async () => {
    const source = sourceForTopic({
      topicScores: {},
      sessionAnswers: [answer("q1", true), answer("q2", false, "unsure", 0)],
      questionTopics: new Map([
        ["q1", "topic-1"],
        ["q2", "topic-1"]
      ])
    });
    const { repository, upserts } = createRepository(source);

    await updateMasteryJob("result-1", repository);

    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({
      topicId: "topic-1",
      questionsAttempted: 2,
      questionsCorrect: 1,
      baselineScore: 50
    });
  });

  it("runs inside the provided transaction repository", async () => {
    const txRepository = createRepository(sourceForTopic()).repository;
    const outerRepository: MasteryUpdateRepository = {
      loadMasterySource: vi.fn(async () => {
        throw new Error("outer repository should not load source");
      }),
      findMasteryRecord: vi.fn(async () => null),
      upsertMasteryRecord: vi.fn(async () => undefined),
      transaction: vi.fn((work) => work(txRepository))
    };

    const updates = await updateMasteryJob("result-1", outerRepository);

    expect(outerRepository.transaction).toHaveBeenCalledTimes(1);
    expect(outerRepository.loadMasterySource).not.toHaveBeenCalled();
    expect(txRepository.loadMasterySource).toHaveBeenCalledWith("result-1");
    expect(updates).toHaveLength(1);
  });
});

function createRepository(
  source: MasteryJobSource | null,
  existingRecords = new Map<string, ExistingMasteryRecord>()
) {
  const upserts: MasteryRecordUpsert[] = [];
  const findKeys: MasteryLookupKey[] = [];

  const repository: MasteryUpdateRepository = {
    loadMasterySource: vi.fn(async () => source),
    findMasteryRecord: vi.fn(async (key) => {
      findKeys.push(key);
      return existingRecords.get(keyFor(key)) ?? null;
    }),
    upsertMasteryRecord: vi.fn(async (record) => {
      upserts.push(record);
    })
  };

  return { repository, findKeys, upserts };
}

function sourceForTopic(overrides: Partial<MasteryJobSource> = {}): MasteryJobSource {
  return {
    resultId: "result-1",
    userId: "user-1",
    examId: "exam-1",
    sessionId: "session-1",
    sessionType: "topic",
    topicScores: {
      "topic-1": bucket({ attempted: 2, correct: 2 })
    },
    conceptScores: null,
    sessionAnswers: [answer("q1", true), answer("q2", true)],
    questionDifficulties: new Map([
      ["q1", "easy"],
      ["q2", "medium"]
    ]),
    questionTopics: new Map([
      ["q1", "topic-1"],
      ["q2", "topic-1"]
    ]),
    questionConcepts: new Map(),
    testedAt: TESTED_AT,
    ...overrides
  };
}

function answer(
  questionId: string,
  isCorrect: boolean | null,
  confidence: SessionAnswerForMastery["confidence"] = "sure",
  marksAwarded = isCorrect ? 1 : 0
): SessionAnswerForMastery {
  return {
    questionId,
    isCorrect,
    confidence: isCorrect === null ? null : confidence,
    marksAwarded,
    timeSpentSec: 30,
    revisitCount: 0
  };
}

function bucket(input: { attempted: number; correct: number; skipped?: number }): ScoreBucket {
  const skipped = input.skipped ?? 0;

  return {
    score: input.correct,
    maxScore: input.attempted + skipped,
    attempted: input.attempted,
    correct: input.correct,
    incorrect: Math.max(0, input.attempted - input.correct),
    skipped
  };
}

function keyFor(key: MasteryLookupKey) {
  return [key.userId, key.examId, key.topicId ?? "", key.conceptId ?? ""].join(":");
}
