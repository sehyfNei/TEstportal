# Session 12 Architecture Plan
## Mastery Update Job (TSP-055)

**Session:** 12  
**Milestone:** M3 — Scoring & Learning Model (second slice)  
**Ticket:** TSP-055  
**Owner:** Architect (planning) → Builder → Sanity Tester  
**Scope:** Create `mastery_records` table; design and implement deterministic mastery update job triggered post-submit.

---

## 1. Requirements Summary

From **ROADMAP.md** (M3 track):
- TSP-055 mastery update is second of four M3 sub-tasks (after TSP-053/054 result aggregates & strategy metrics).
- Feeds into TSP-056 (readiness) and TSP-057 (forgetting-curve decay).

From **FINAL_TRD Section 12.1 (Mastery Update)**:
- Conservative weighted update: `newMastery = combine(oldMastery, latestAccuracy, difficultyWeight, confidenceWeight, benchmarkWeight, recencyWeight)`.
- High-confidence wrong answers reduce mastery strongly (misconception signal).
- Correct + guessed increases mastery least.
- Benchmark sessions carry stronger measurement weight than adaptive practice.
- Low sample sizes keep confidence level low.

From **FINAL_TRD Section 6.5 (Schema)**:
- `mastery_records` table must support topic-level and concept-level mastery (mutually exclusive per row).
- Fields: mastery_score (0–100), confidence_level (low/medium/high), stability_factor (forgetting-curve multiplier), questions_attempted/correct, last_tested_at.

---

## 2. Design Decisions

### 2.1 Mastery Score Range
- **Scale:** 0–100 (percentage-based, intuitive for end-user dashboard).
- **Formula base:** Weighted average of accuracy across all attempts for a topic/concept, adjusted by recent signals.

### 2.2 Confidence Level Logic
- **"low":** Fewer than 3 attempts OR inconsistent performance (stddev > 30) OR no benchmark data.
- **"medium":** 3–10 attempts OR recent benchmark with acceptable sample.
- **"high":** 10+ attempts AND recent benchmark (within 30 days) OR consistent high accuracy across multiple session types.

### 2.3 Stability Factor
- **Purpose:** Multiplier for forgetting-curve decay (Section 12.2). High stability = slower decay.
- **Initialization:** 1.0 (neutral).
- **Update rule:** Increase by 0.1 per consecutive successful retest (capped at 2.0); reset to 1.0 on failure.
- **Persistence:** Stored in `mastery_records.stability_factor` to survive across sessions.

### 2.4 Update Weights
Each factor is 0–1, multiplied by contribution:

| Signal | Weight | Rationale |
|--------|--------|-----------|
| **Latest accuracy** | 0.4 | Most recent session dominates but doesn't erase history. |
| **Difficulty weight** | 0.15 | Correct on hard questions = stronger mastery signal. |
| **Confidence weight** | 0.25 | Correct + sure > guessed; wrong + sure = misconception. |
| **Benchmark weight** | 0.15 | Mock/benchmark carry 1.5× multiplier; practice carries 1.0×. |
| **Recency weight** | 0.05 | Sessions within 7 days carry full weight; decay after. |

Total: 1.0 when all signals present; normalized if incomplete.

### 2.5 First Attempt Handling
- If no prior `mastery_records` row exists:
  - Create new row with mastery_score = latest_accuracy × confidence_adjustment (70–100 based on confidence).
  - Set confidence_level = "low".
  - Set baseline_score = latest_accuracy for future delta tracking.

### 2.6 High-Confidence Wrong Penalty
- Wrong answer + "sure" confidence = strong misconception signal.
- Reduce mastery by: `min(oldMastery, 1.5 * |latestAccuracy - oldMastery|)`.
- Example: old mastery 80%, accuracy 20%, penalty = min(80, 1.5 × 60) = 80 → new mastery floor 0 (clamped 0–100).

### 2.7 Session Type Weight
- **Benchmark/Mock:** 1.5× weight (official measurement).
- **Diagnostic/Topic/Retest:** 1.0× weight (practice measurement).
- Applied to all per-question signals before aggregation.

---

## 3. Data Flow

```
submit_test_session() completes (Session 11 RPC)
  ↓
session_results row inserted with:
  - topic_scores JSONB
  - concept_scores JSONB (if concepts linked)
  - strategy_metrics JSONB
  ↓
Backend enqueues "update_mastery" job with result_id
  ↓
Job handler loads:
  - session_results (aggregate scores, session type)
  - session_answers (is_correct, marks_awarded, confidence per question)
  - session_questions + questions (difficulty, source)
  - question_concepts (for concept_id → topic_id linkage)
  ↓
For each topic in session_questions:
  - Load current mastery_records row (user, exam, topic_id)
  - Compute topic_accuracy from topic_scores
  - Compute weighted_signal using weights above
  - If no prior row: insert with new mastery
  - If row exists: update mastery_score + confidence + last_tested_at
  ↓
For each concept in question_concepts:
  - Same logic but grouped by concept_id
  - Concept accuracy drawn from concept_scores JSONB
  ↓
Transaction commits all upserts
```

---

## 4. File Changes

### 4.1 SQL Migration: `supabase/migrations/202606010004_mastery_records.sql`

```sql
-- Create mastery_records table (first M3 learning model table)
create table if not exists mastery_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  concept_id uuid references concepts(id) on delete cascade,
  mastery_score numeric not null default 0,
  confidence_level text not null default 'low'
    check (confidence_level in ('low', 'medium', 'high')),
  baseline_score numeric,
  stability_factor numeric not null default 1.0,
  questions_attempted int not null default 0,
  questions_correct int not null default 0,
  last_tested_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (topic_id is not null and concept_id is null) or
    (topic_id is null and concept_id is not null)
  ),
  unique (user_id, exam_id, topic_id, concept_id)
);

-- Indexes for common queries
create index mastery_user_exam
on mastery_records (user_id, exam_id);

create index mastery_topic_query
on mastery_records (exam_id, topic_id)
where topic_id is not null;

create index mastery_concept_query
on mastery_records (exam_id, concept_id)
where concept_id is not null;

create index mastery_last_tested
on mastery_records (last_tested_at desc)
where last_tested_at is not null;

-- RLS: users can read/write their own mastery records
alter table mastery_records enable row level security;

create policy mastery_own_rows on mastery_records
  for all using (auth.uid() = user_id);

-- Grant public role to read (RLS enforced)
grant select on mastery_records to authenticated;
grant insert, update on mastery_records to authenticated;
```

**Rationale:**
- Unique constraint on (user, exam, topic/concept) prevents duplicate mastery records.
- CHECK ensures exactly one of topic_id or concept_id is set (mutually exclusive).
- Indexes support dashboard queries by user+exam and mastery filters.
- RLS enforces user isolation.

---

### 4.2 TypeScript Types: `src/lib/scoring/mastery-types.ts`

```typescript
// Domain types for mastery calculation

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type SessionType = 'diagnostic' | 'topic' | 'concept_retest' | 'sectional' | 'mock' | 'benchmark' | 'custom';

export interface MasteryInput {
  userId: string;
  examId: string;
  sessionId: string;
  sessionType: SessionType;
  topicScores: Record<string, ScoreBucket>; // from session_results.topic_scores
  conceptScores: Record<string, ScoreBucket> | null; // from session_results.concept_scores
  sessionAnswers: SessionAnswerForMastery[];
  questionDifficulties: Map<string, 'easy' | 'medium' | 'hard'>;
  questionTopics: Map<string, string>; // question_id -> topic_id
  questionConcepts: Map<string, string[]>; // question_id -> concept_ids[]
}

export interface SessionAnswerForMastery {
  questionId: string;
  isCorrect: boolean | null;
  confidence: 'sure' | 'unsure' | 'guessed' | null;
  marksAwarded: number;
  timeSpentSec: number;
  revisitCount: number;
}

export interface ScoreBucket {
  score: number;
  maxScore: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
}

export interface WeightFactors {
  latestAccuracy: number; // 0.4
  difficultyWeight: number; // 0.15
  confidenceWeight: number; // 0.25
  benchmarkWeight: number; // 0.15
  recencyWeight: number; // 0.05
}

export interface MasteryUpdate {
  topicId?: string;
  conceptId?: string;
  oldMasteryScore: number;
  newMasteryScore: number;
  confidenceLevel: ConfidenceLevel;
  stabilityFactor: number;
  questionsAttempted: number;
  questionsCorrect: number;
  lastTestedAt: Date;
}

export interface MasteryRecord {
  id: string;
  userId: string;
  examId: string;
  topicId?: string;
  conceptId?: string;
  masteryScore: number;
  confidenceLevel: ConfidenceLevel;
  baselineScore?: number;
  stabilityFactor: number;
  questionsAttempted: number;
  questionsCorrect: number;
  lastTestedAt?: Date;
  updatedAt: Date;
}
```

---

### 4.3 Mastery Computation: `src/lib/scoring/compute-mastery.ts`

```typescript
import type { ConfidenceLevel, SessionType, MasteryInput, MasteryUpdate, WeightFactors } from './mastery-types';

const WEIGHTS: WeightFactors = {
  latestAccuracy: 0.4,
  difficultyWeight: 0.15,
  confidenceWeight: 0.25,
  benchmarkWeight: 0.15,
  recencyWeight: 0.05,
};

const SESSION_TYPE_WEIGHT: Record<SessionType, number> = {
  benchmark: 1.5,
  mock: 1.5,
  diagnostic: 1.0,
  topic: 1.0,
  concept_retest: 1.0,
  sectional: 1.0,
  custom: 1.0,
};

const CONFIDENCE_ADJUSTMENT: Record<'sure' | 'unsure' | 'guessed' | null, number> = {
  sure: 1.0,
  unsure: 0.7,
  guessed: 0.5,
  null: 0.6,
};

/**
 * Compute new mastery score for a topic or concept given session results.
 * Conservative weighted update: combines old mastery, latest accuracy, and contextual signals.
 */
export function computeTopicMastery(
  oldMastery: number | null,
  topicAccuracy: number,
  sessionType: SessionType,
  confidenceInTopic: number, // 0-1 based on answer confidences in topic
  difficultyInTopic: number, // avg difficulty 0-1 (easy=0.33, medium=0.67, hard=1.0)
  questionsAttempted: number,
  questionsCorrect: number,
  oldQuestionsAttempted: number = 0,
  oldQuestionsCorrect: number = 0
): { masteryScore: number; confidenceLevel: ConfidenceLevel; stabilityFactor: number } {
  const sessionWeight = SESSION_TYPE_WEIGHT[sessionType];
  const newQuestionsAttempted = oldQuestionsAttempted + questionsAttempted;
  const newQuestionsCorrect = oldQuestionsCorrect + questionsCorrect;

  // First attempt: initialize from latest accuracy
  if (oldMastery === null || oldMastery === undefined) {
    const baseScore = topicAccuracy * 100;
    const confidenceAdj = confidenceInTopic; // 0-1
    const initialScore = Math.max(0, Math.min(100, baseScore * (0.7 + 0.3 * confidenceAdj)));
    const confidence = newQuestionsAttempted < 3 ? 'low' : newQuestionsAttempted < 10 ? 'medium' : 'high';
    return {
      masteryScore: initialScore,
      confidenceLevel: confidence,
      stabilityFactor: 1.0,
    };
  }

  // Subsequent attempt: weighted combine
  let weightedScore = 0;
  let totalWeight = 0;

  // Latest accuracy: 40% weight
  const latestSignal = topicAccuracy * 100 * sessionWeight;
  weightedScore += latestSignal * WEIGHTS.latestAccuracy;
  totalWeight += WEIGHTS.latestAccuracy;

  // Difficulty weight: harder questions = stronger signal
  const difficultySignal = (topicAccuracy * 100) * (0.8 + 0.4 * difficultyInTopic) * sessionWeight;
  weightedScore += difficultySignal * WEIGHTS.difficultyWeight;
  totalWeight += WEIGHTS.difficultyWeight;

  // Confidence weight: sure > guessed, wrong + sure = misconception
  const confidenceSignal = confidenceInTopic * 100 * sessionWeight;
  weightedScore += confidenceSignal * WEIGHTS.confidenceWeight;
  totalWeight += WEIGHTS.confidenceWeight;

  // Benchmark weight: benchmark/mock carry higher multiplier
  const benchmarkMultiplier = sessionWeight > 1.0 ? 1.5 : 1.0;
  const benchmarkSignal = (topicAccuracy * 100) * benchmarkMultiplier * sessionWeight;
  weightedScore += benchmarkSignal * WEIGHTS.benchmarkWeight;
  totalWeight += WEIGHTS.benchmarkWeight;

  // Recency weight: sessions within 7 days carry full weight
  const recencySignal = (topicAccuracy * 100) * sessionWeight;
  weightedScore += recencySignal * WEIGHTS.recencyWeight;
  totalWeight += WEIGHTS.recencyWeight;

  // Normalize
  const newScore = totalWeight > 0 ? weightedScore / totalWeight : oldMastery;

  // Conservative blend: 60% old, 40% new (prevents wild swings)
  const blendedScore = oldMastery * 0.6 + newScore * 0.4;

  // High-confidence wrong penalty (misconception signal)
  if (topicAccuracy < 0.5 && confidenceInTopic > 0.8) {
    const penalty = Math.min(oldMastery, 1.5 * (oldMastery - topicAccuracy * 100));
    const penalizedScore = Math.max(0, oldMastery - penalty);
    const finalScore = penalizedScore * 0.5 + blendedScore * 0.5;
    return {
      masteryScore: Math.max(0, Math.min(100, finalScore)),
      confidenceLevel: updateConfidenceLevel(newQuestionsAttempted),
      stabilityFactor: updateStabilityFactor(topicAccuracy, oldMastery),
    };
  }

  return {
    masteryScore: Math.max(0, Math.min(100, blendedScore)),
    confidenceLevel: updateConfidenceLevel(newQuestionsAttempted),
    stabilityFactor: updateStabilityFactor(topicAccuracy, oldMastery),
  };
}

function updateConfidenceLevel(totalAttempts: number): ConfidenceLevel {
  if (totalAttempts < 3) return 'low';
  if (totalAttempts < 10) return 'medium';
  return 'high';
}

function updateStabilityFactor(accuracy: number, oldMastery: number): number {
  // On success (accuracy > oldMastery * 0.8), increase stability (slower decay later)
  // On failure, reset to 1.0
  if (accuracy > oldMastery * 0.008) {
    return Math.min(2.0, oldMastery + 0.1);
  }
  return 1.0;
}

/**
 * Aggregate per-question confidence within a topic (weighted by correctness).
 * Correct + sure = 1.0; correct + unsure = 0.7; wrong + sure = -0.5; etc.
 */
export function aggregateConfidenceInTopic(
  answers: Array<{ isCorrect: boolean | null; confidence: 'sure' | 'unsure' | 'guessed' | null }>
): number {
  if (answers.length === 0) return 0.6;

  let totalConfidence = 0;
  let weightSum = 0;

  for (const ans of answers) {
    if (ans.isCorrect === null) continue; // skip skipped

    const baseConf = CONFIDENCE_ADJUSTMENT[ans.confidence] || 0.6;
    const signal = ans.isCorrect ? baseConf : -baseConf * 0.5; // wrong + sure = negative signal
    totalConfidence += signal;
    weightSum += 1;
  }

  return Math.max(-1, Math.min(1, totalConfidence / weightSum));
}

/**
 * Average difficulty of questions in topic (0 = easy, 1 = hard).
 */
export function averageDifficultyInTopic(difficulties: ('easy' | 'medium' | 'hard')[]): number {
  if (difficulties.length === 0) return 0.67; // default to medium

  const difficultyScore: Record<string, number> = {
    easy: 0.33,
    medium: 0.67,
    hard: 1.0,
  };

  const total = difficulties.reduce((sum, d) => sum + difficultyScore[d], 0);
  return total / difficulties.length;
}
```

---

### 4.4 Job Handler: `src/lib/jobs/handlers/update-mastery.ts`

```typescript
import { db } from '@/lib/db/client';
import { eq, and } from 'drizzle-orm';
import { sessionResults, sessionAnswers, sessionQuestions, questions, questionConcepts } from '@/lib/db/schema';
import { masteryRecords } from '@/lib/db/schema/learning';
import {
  computeTopicMastery,
  aggregateConfidenceInTopic,
  averageDifficultyInTopic,
} from '@/lib/scoring/compute-mastery';
import type { MasteryInput, SessionAnswerForMastery } from '@/lib/scoring/mastery-types';

export async function updateMasteryJob(resultId: string): Promise<void> {
  // Load result with aggregates
  const result = await db.query.sessionResults.findFirst({
    where: eq(sessionResults.id, resultId),
  });

  if (!result) {
    throw new Error(`Result ${resultId} not found`);
  }

  const sessionId = result.sessionId;
  const userId = result.userId;
  const examId = result.examId;
  const sessionType = result.sessionType as any; // from test_sessions, type field

  // Load session for type
  const session = await db.query.testSessions.findFirst({
    where: eq(testSessions.id, sessionId),
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Load all answers for this session with question info
  const answers = await db
    .select({
      questionId: sessionAnswers.questionId,
      isCorrect: sessionAnswers.isCorrect,
      confidence: sessionAnswers.confidence,
      marksAwarded: sessionAnswers.marksAwarded,
      timeSpentSec: sessionAnswers.timeSpentSec,
      revisitCount: sessionAnswers.revisitCount,
      difficulty: questions.difficulty,
      topicId: questions.topicId,
    })
    .from(sessionAnswers)
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(eq(sessionAnswers.sessionId, sessionId));

  // Load topic scores and concept scores from result JSONB
  const topicScores: Record<string, any> = result.topicScores || {};
  const conceptScores: Record<string, any> = result.conceptScores || null;

  // Group answers by topic
  const answersByTopic: Map<string, SessionAnswerForMastery[]> = new Map();
  const difficultiesByTopic: Map<string, ('easy' | 'medium' | 'hard')[]> = new Map();

  for (const ans of answers) {
    const topicId = ans.topicId;
    if (!answersByTopic.has(topicId)) {
      answersByTopic.set(topicId, []);
      difficultiesByTopic.set(topicId, []);
    }
    answersByTopic.get(topicId)!.push({
      questionId: ans.questionId,
      isCorrect: ans.isCorrect,
      confidence: ans.confidence,
      marksAwarded: ans.marksAwarded,
      timeSpentSec: ans.timeSpentSec,
      revisitCount: ans.revisitCount,
    });
    difficultiesByTopic.get(topicId)!.push(ans.difficulty);
  }

  // Process each topic
  for (const [topicId, topicAnswers] of answersByTopic.entries()) {
    const topicScore = topicScores[topicId] || { correct: 0, attempted: topicAnswers.length };
    const topicAccuracy = topicScore.attempted > 0 ? topicScore.correct / topicScore.attempted : 0;

    const difficulties = difficultiesByTopic.get(topicId) || [];
    const avgDifficulty = averageDifficultyInTopic(difficulties);
    const confidence = aggregateConfidenceInTopic(topicAnswers);

    // Load current mastery for this user-exam-topic
    const currentMastery = await db.query.masteryRecords.findFirst({
      where: and(
        eq(masteryRecords.userId, userId),
        eq(masteryRecords.examId, examId),
        eq(masteryRecords.topicId, topicId)
      ),
    });

    const oldMasteryScore = currentMastery?.masteryScore || null;
    const oldQuestionsAttempted = currentMastery?.questionsAttempted || 0;
    const oldQuestionsCorrect = currentMastery?.questionsCorrect || 0;

    const { masteryScore, confidenceLevel, stabilityFactor } = computeTopicMastery(
      oldMasteryScore,
      topicAccuracy,
      session.type as any,
      confidence,
      avgDifficulty,
      topicAnswers.length,
      topicScore.correct,
      oldQuestionsAttempted,
      oldQuestionsCorrect
    );

    // Upsert mastery record
    if (currentMastery) {
      await db
        .update(masteryRecords)
        .set({
          masteryScore,
          confidenceLevel,
          stabilityFactor,
          questionsAttempted: oldQuestionsAttempted + topicAnswers.length,
          questionsCorrect: oldQuestionsCorrect + topicScore.correct,
          lastTestedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(masteryRecords.id, currentMastery.id));
    } else {
      await db.insert(masteryRecords).values({
        userId,
        examId,
        topicId,
        masteryScore,
        confidenceLevel,
        baselineScore: topicAccuracy * 100,
        stabilityFactor,
        questionsAttempted: topicAnswers.length,
        questionsCorrect: topicScore.correct,
        lastTestedAt: new Date(),
      });
    }
  }

  // TODO: Process concept-level mastery similarly (if conceptScores present)
  // For now, topics are the primary unit; concepts follow same logic.
}
```

---

### 4.5 Drizzle Schema: `src/lib/db/schema/learning.ts`

```typescript
import { pgTable, uuid, text, numeric, int, timestamp, check, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { auth } from './auth';
import { exams, topics, concepts } from './exam';

export const masteryRecords = pgTable(
  'mastery_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => auth.id, { onDelete: 'cascade' }),
    examId: uuid('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }),
    conceptId: uuid('concept_id').references(() => concepts.id, { onDelete: 'cascade' }),
    masteryScore: numeric('mastery_score', { precision: 5, scale: 2 }).notNull().default('0'),
    confidenceLevel: text('confidence_level').notNull().default('low'),
    baselineScore: numeric('baseline_score', { precision: 5, scale: 2 }),
    stabilityFactor: numeric('stability_factor', { precision: 3, scale: 1 }).notNull().default('1'),
    questionsAttempted: int('questions_attempted').notNull().default(0),
    questionsCorrect: int('questions_correct').notNull().default(0),
    lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('confidence_level_check', sql`confidence_level in ('low', 'medium', 'high')`),
    check(
      'topic_xor_concept',
      sql`(topic_id is not null and concept_id is null) or (topic_id is null and concept_id is not null)`
    ),
    index('mastery_user_exam').on(table.userId, table.examId),
    index('mastery_topic_query').on(table.examId, table.topicId),
    index('mastery_concept_query').on(table.examId, table.conceptId),
    index('mastery_last_tested').on(table.lastTestedAt),
    uniqueIndex('mastery_unique_user_exam_topic_concept').on(
      table.userId,
      table.examId,
      table.topicId,
      table.conceptId
    ),
  ]
);

export type MasteryRecord = typeof masteryRecords.$inferSelect;
export type InsertMasteryRecord = typeof masteryRecords.$inferInsert;
```

---

### 4.6 Unit Tests: `src/tests/unit/compute-mastery.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { computeTopicMastery, aggregateConfidenceInTopic, averageDifficultyInTopic } from '@/lib/scoring/compute-mastery';

describe('computeTopicMastery', () => {
  it('initializes new mastery from accuracy on first attempt', () => {
    const result = computeTopicMastery(
      null, // oldMastery
      0.8, // topicAccuracy (80%)
      'topic', // sessionType
      0.8, // confidenceInTopic
      0.67, // difficultyInTopic (medium)
      5, // questionsAttempted
      4 // questionsCorrect
    );

    expect(result.masteryScore).toBeGreaterThan(60);
    expect(result.masteryScore).toBeLessThan(90);
    expect(result.confidenceLevel).toBe('low');
    expect(result.stabilityFactor).toBe(1.0);
  });

  it('blends old and new mastery on subsequent attempt', () => {
    const result = computeTopicMastery(
      70, // oldMastery
      0.85, // topicAccuracy
      'topic',
      0.85,
      0.67,
      5,
      4,
      10, // oldQuestionsAttempted
      8 // oldQuestionsCorrect
    );

    // Should blend 60% old (70) + 40% new (85): ~75
    expect(result.masteryScore).toBeGreaterThan(70);
    expect(result.masteryScore).toBeLessThan(85);
    expect(result.confidenceLevel).toBe('medium');
  });

  it('detects misconception (high-confidence wrong)', () => {
    const result = computeTopicMastery(
      85, // oldMastery
      0.2, // topicAccuracy (20% - mostly wrong)
      'topic',
      0.9, // confidenceInTopic (high confidence)
      0.67,
      5,
      1, // only 1 correct
      20,
      16
    );

    // Should penalize strongly due to misconception signal
    expect(result.masteryScore).toBeLessThan(85);
    expect(result.masteryScore).toBeLessThan(50); // significant drop
  });

  it('boosts mastery for benchmark sessions', () => {
    const topicResult = computeTopicMastery(
      60,
      0.75,
      'topic',
      0.7,
      0.67,
      10,
      7,
      30,
      20
    );

    const benchmarkResult = computeTopicMastery(
      60,
      0.75,
      'benchmark', // 1.5× weight
      0.7,
      0.67,
      10,
      7,
      30,
      20
    );

    expect(benchmarkResult.masteryScore).toBeGreaterThan(topicResult.masteryScore);
  });

  it('increases stability on successful retest', () => {
    // Accuracy > oldMastery * 0.8 = success
    const result = computeTopicMastery(
      70,
      0.8, // 80% > 70 * 0.8 = 56
      'topic',
      0.8,
      0.67,
      5,
      4,
      10,
      8
    );

    expect(result.stabilityFactor).toBeGreaterThan(1.0);
  });

  it('resets stability on failure', () => {
    // Accuracy < oldMastery * 0.8
    const result = computeTopicMastery(
      70,
      0.3, // 30% < 56
      'topic',
      0.3,
      0.67,
      5,
      1,
      10,
      8
    );

    expect(result.stabilityFactor).toBe(1.0);
  });

  it('updates confidence level based on attempt count', () => {
    const low = computeTopicMastery(null, 0.8, 'topic', 0.8, 0.67, 1, 1, 0, 0);
    expect(low.confidenceLevel).toBe('low');

    const medium = computeTopicMastery(null, 0.8, 'topic', 0.8, 0.67, 5, 4, 3, 2);
    expect(medium.confidenceLevel).toBe('medium');

    const high = computeTopicMastery(null, 0.8, 'topic', 0.8, 0.67, 5, 4, 15, 12);
    expect(high.confidenceLevel).toBe('high');
  });
});

describe('aggregateConfidenceInTopic', () => {
  it('returns 0.6 for empty input', () => {
    expect(aggregateConfidenceInTopic([])).toBe(0.6);
  });

  it('aggregates confidence signals', () => {
    const answers = [
      { isCorrect: true, confidence: 'sure' },
      { isCorrect: true, confidence: 'unsure' },
      { isCorrect: false, confidence: 'sure' },
      { isCorrect: false, confidence: 'guessed' },
    ];

    const conf = aggregateConfidenceInTopic(answers);
    // (1.0 + 0.7 + (-0.5) + (-0.25)) / 4 ≈ 0.24
    expect(conf).toBeGreaterThan(0.1);
    expect(conf).toBeLessThan(0.4);
  });

  it('ignores skipped answers', () => {
    const answers = [
      { isCorrect: true, confidence: 'sure' },
      { isCorrect: null, confidence: null }, // skipped
      { isCorrect: true, confidence: 'sure' },
    ];

    const conf = aggregateConfidenceInTopic(answers);
    // Only 2 answers, both correct + sure
    expect(conf).toBeCloseTo(1.0);
  });
});

describe('averageDifficultyInTopic', () => {
  it('averages difficulty levels', () => {
    const difficulties = ['easy', 'medium', 'hard'];
    const avg = averageDifficultyInTopic(difficulties);
    // (0.33 + 0.67 + 1.0) / 3 ≈ 0.67
    expect(avg).toBeCloseTo(0.67);
  });

  it('returns default for empty input', () => {
    expect(averageDifficultyInTopic([])).toBe(0.67);
  });
});
```

---

## 5. Integration Points

### 5.1 Trigger From `submit_test_session()`
After Session 11 RPC completes and inserts `session_results`, enqueue job:
```sql
-- At end of submit_test_session RPC (after INSERT session_results)
insert into jobs (type, idempotency_key, payload, status)
values (
  'update_mastery',
  format('result:%s', v_result_id),
  jsonb_build_object('resultId', v_result_id),
  'pending'
);
```

### 5.2 Job Runner Integration
Add job handler to job scheduler:
```typescript
// src/lib/jobs/job-handler.ts (existing)
import { updateMasteryJob } from './handlers/update-mastery';

export async function executeJob(job: Job): Promise<void> {
  switch (job.type) {
    // ... existing handlers ...
    case 'update_mastery':
      await updateMasteryJob(job.payload.resultId);
      break;
  }
}
```

---

## 6. Verification Checkpoints (Sanity Review)

### 6.1 Schema & Migration
- [ ] Migration creates `mastery_records` table with correct constraints.
- [ ] CHECK constraint enforces exactly one of topic_id or concept_id.
- [ ] Unique index prevents duplicate (user, exam, topic/concept) rows.
- [ ] RLS policy restricts to user's own rows.

### 6.2 Mastery Computation
- [ ] First-attempt initialization sets mastery 70–100% (accuracy × confidence adjustment).
- [ ] Subsequent blends 60% old + 40% new, preventing wild swings.
- [ ] High-confidence wrong (accuracy < 50%, confidence > 80%) applies misconception penalty.
- [ ] Benchmark sessions carry 1.5× weight; practice carries 1.0×.
- [ ] Confidence level logic: low (< 3 att), medium (3–10), high (10+).
- [ ] Stability factor increases on success, resets on failure.

### 6.3 Job Handler
- [ ] Loads session_results, session_answers, question metadata correctly.
- [ ] Groups answers by topic; groups topics by exam.
- [ ] Computes topic accuracy from topic_scores JSONB.
- [ ] Calls `computeTopicMastery()` with correct inputs.
- [ ] Upserts (insert or update) mastery_records for each topic.
- [ ] Transaction commits atomically.

### 6.4 Unit Tests
- [ ] Empty attempt defaults to low confidence.
- [ ] Blending logic: old 60%, new 40%, range checks.
- [ ] Misconception detection triggers on high-confidence wrong.
- [ ] Benchmark weight boost is measurable.
- [ ] Stability increases on success, resets on failure.
- [ ] Confidence level updates match attempt thresholds.
- [ ] Aggregate confidence handles mixed answers + skipped answers.

### 6.5 Drizzle Schema Alignment
- [ ] `masteryRecords` pgTable matches migration column order and types.
- [ ] CHECK constraints in Drizzle match SQL.
- [ ] Index definitions match.
- [ ] Exported types `MasteryRecord` and `InsertMasteryRecord` are usable.

---

## 7. No Breaking Changes

- No existing tables modified.
- No RPC signatures changed.
- Migration is `create table if not exists`, idempotent.
- Job enqueue happens silently; no user-visible change.

---

## 8. Commit Strategy

One commit per file:
1. **Migration:** supabase/migrations/202606010004_mastery_records.sql
2. **Types:** src/lib/scoring/mastery-types.ts
3. **Computation:** src/lib/scoring/compute-mastery.ts
4. **Job handler:** src/lib/jobs/handlers/update-mastery.ts
5. **Drizzle schema:** src/lib/db/schema/learning.ts
6. **Tests:** src/tests/unit/compute-mastery.test.ts

Each commit message: `TSP-055: [specific file] — mastery engine [detail]`

---

## 9. Known Gaps / Next Session (TSP-056)

- **Readiness score:** Weighted average of topic/concept mastery by exam weights.
- **Readiness confidence:** Incorporates sample size, recency, benchmark coverage.
- **Forgetting-curve decay:** Nightly job using stability_factor.

These come in Session 13.

---

## 10. Handoff Checklist

**Architect → Builder:**
- [ ] Plan reviewed and approved by founder.
- [ ] No open questions on formula or data flow.
- [ ] Test strategy clearly outlined.
- [ ] File structure and naming conventions clear.

**Builder → Sanity Tester:**
- [ ] All 6 files implemented.
- [ ] All 10 sanity focus items passing.
- [ ] No circular imports.
- [ ] Migration applies cleanly.
- [ ] Tests run and pass.

---

**End of Session 12 Plan**
