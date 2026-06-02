/* eslint-disable @typescript-eslint/no-require-imports */
// Smoke test for TSP-055 mastery updates:
// seed fixed benchmark questions across two topics -> submit -> run mastery job -> verify rows and idempotency.
let postgres;

try {
  postgres = require("postgres");
} catch {
  postgres = require("../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres");
}

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

try {
  require("dotenv").config({ path: path.join(process.cwd(), ".env") });
} catch {
  loadEnvFile(path.join(process.cwd(), ".env"));
}

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error("ASSERT FAILED: " + message);
  }
}

function makeMasteryRepository(sql) {
  return {
    async loadMasterySource(resultId) {
      const [result] = await sql`
        select session_id, exam_id, user_id, topic_scores, concept_scores
        from public.session_results
        where id = ${resultId}
      `;

      if (!result) {
        return null;
      }

      const [session] = await sql`
        select type
        from public.test_sessions
        where id = ${result.session_id}
      `;

      if (!session) {
        return null;
      }

      const answers = await sql`
        select question_id, is_correct, confidence, marks_awarded, time_spent_sec, revisit_count
        from public.session_answers
        where session_id = ${result.session_id}
      `;

      const sessionQuestions = await sql`
        select sq.question_id, q.topic_id, q.difficulty
        from public.session_questions sq
        join public.questions q on q.id = sq.question_id
        where sq.session_id = ${result.session_id}
      `;
      const questionIds = sessionQuestions.map((row) => row.question_id);
      const questionTopics = new Map();
      const questionDifficulties = new Map();

      for (const row of sessionQuestions) {
        questionTopics.set(row.question_id, row.topic_id);
        questionDifficulties.set(row.question_id, row.difficulty);
      }

      const questionConcepts = new Map();

      if (questionIds.length > 0) {
        const concepts = await sql`
          select question_id, concept_id
          from public.question_concepts
          where question_id in ${sql(questionIds)}
        `;

        for (const row of concepts) {
          const conceptIds = questionConcepts.get(row.question_id);

          if (conceptIds) {
            conceptIds.push(row.concept_id);
          } else {
            questionConcepts.set(row.question_id, [row.concept_id]);
          }
        }
      }

      return {
        resultId,
        userId: result.user_id,
        examId: result.exam_id,
        sessionId: result.session_id,
        sessionType: session.type,
        topicScores: result.topic_scores ?? {},
        conceptScores: result.concept_scores ?? null,
        sessionAnswers: answers.map((row) => ({
          questionId: row.question_id,
          isCorrect: row.is_correct,
          confidence: row.confidence,
          marksAwarded: Number(row.marks_awarded ?? 0),
          timeSpentSec: Number(row.time_spent_sec ?? 0),
          revisitCount: Number(row.revisit_count ?? 0)
        })),
        questionDifficulties,
        questionTopics,
        questionConcepts,
        testedAt: new Date()
      };
    },

    async findMasteryRecord(key) {
      const rows = key.topicId
        ? await sql`
            select
              id,
              mastery_score as "masteryScore",
              questions_attempted as "questionsAttempted",
              questions_correct as "questionsCorrect",
              stability_factor as "stabilityFactor"
            from public.mastery_records
            where user_id = ${key.userId}
              and exam_id = ${key.examId}
              and topic_id = ${key.topicId}
              and concept_id is null
            limit 1
          `
        : await sql`
            select
              id,
              mastery_score as "masteryScore",
              questions_attempted as "questionsAttempted",
              questions_correct as "questionsCorrect",
              stability_factor as "stabilityFactor"
            from public.mastery_records
            where user_id = ${key.userId}
              and exam_id = ${key.examId}
              and topic_id is null
              and concept_id = ${key.conceptId}
            limit 1
          `;

      return rows[0] ?? null;
    },

    async upsertMasteryRecord(record) {
      const id = record.id ?? crypto.randomUUID();

      if (record.topicId) {
        await sql`
          insert into public.mastery_records (
            id,
            user_id,
            exam_id,
            topic_id,
            concept_id,
            mastery_score,
            confidence_level,
            baseline_score,
            stability_factor,
            questions_attempted,
            questions_correct,
            last_tested_at,
            updated_at
          )
          values (
            ${id},
            ${record.userId},
            ${record.examId},
            ${record.topicId},
            ${null},
            ${record.masteryScore},
            ${record.confidenceLevel},
            ${record.baselineScore},
            ${record.stabilityFactor},
            ${record.questionsAttempted},
            ${record.questionsCorrect},
            ${record.lastTestedAt.toISOString()},
            ${record.updatedAt.toISOString()}
          )
          on conflict (user_id, exam_id, topic_id) where topic_id is not null do update
          set mastery_score = excluded.mastery_score,
              confidence_level = excluded.confidence_level,
              baseline_score = excluded.baseline_score,
              stability_factor = excluded.stability_factor,
              questions_attempted = excluded.questions_attempted,
              questions_correct = excluded.questions_correct,
              last_tested_at = excluded.last_tested_at,
              updated_at = excluded.updated_at
        `;
        return;
      }

      await sql`
        insert into public.mastery_records (
          id,
          user_id,
          exam_id,
          topic_id,
          concept_id,
          mastery_score,
          confidence_level,
          baseline_score,
          stability_factor,
          questions_attempted,
          questions_correct,
          last_tested_at,
          updated_at
        )
        values (
          ${id},
          ${record.userId},
          ${record.examId},
          ${null},
          ${record.conceptId},
          ${record.masteryScore},
          ${record.confidenceLevel},
          ${record.baselineScore},
          ${record.stabilityFactor},
          ${record.questionsAttempted},
          ${record.questionsCorrect},
          ${record.lastTestedAt.toISOString()},
          ${record.updatedAt.toISOString()}
        )
        on conflict (user_id, exam_id, concept_id) where concept_id is not null do update
        set mastery_score = excluded.mastery_score,
            confidence_level = excluded.confidence_level,
            baseline_score = excluded.baseline_score,
            stability_factor = excluded.stability_factor,
            questions_attempted = excluded.questions_attempted,
            questions_correct = excluded.questions_correct,
            last_tested_at = excluded.last_tested_at,
            updated_at = excluded.updated_at
      `;
    }
  };
}

const WEIGHTS = {
  latestAccuracy: 0.4,
  difficultyWeight: 0.15,
  confidenceWeight: 0.25,
  benchmarkWeight: 0.15,
  recencyWeight: 0.05
};

const SESSION_TYPE_WEIGHT = {
  diagnostic: 1.0,
  topic: 1.0,
  concept_retest: 1.0,
  sectional: 1.0,
  mock: 1.5,
  benchmark: 1.5,
  custom: 1.0
};

const CONFIDENCE_ADJUSTMENT = {
  sure: 1.0,
  unsure: 0.7,
  guessed: 0.5
};

const DEFAULT_CONFIDENCE = 0.6;

async function updateMasteryJob(resultId, repository) {
  const source = await repository.loadMasterySource(resultId);

  if (!source) {
    throw new Error(`Session result ${resultId} not found for mastery update.`);
  }

  const testedAt = source.testedAt ?? new Date();
  const updates = [];

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

async function processMasteryEntity(input) {
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

function groupAnswersByTopic(source) {
  const grouped = new Map();

  for (const answer of source.sessionAnswers) {
    const topicId = source.questionTopics.get(answer.questionId);

    if (topicId) {
      appendGroupedAnswer(grouped, topicId, answer);
    }
  }

  return grouped;
}

function groupAnswersByConcept(source) {
  const grouped = new Map();

  for (const answer of source.sessionAnswers) {
    const conceptIds = source.questionConcepts.get(answer.questionId) ?? [];

    for (const conceptId of conceptIds) {
      appendGroupedAnswer(grouped, conceptId, answer);
    }
  }

  return grouped;
}

function appendGroupedAnswer(grouped, key, answer) {
  const answers = grouped.get(key);

  if (answers) {
    answers.push(answer);
  } else {
    grouped.set(key, [answer]);
  }
}

function makeLookupKey(source, entity, entityId) {
  return {
    userId: source.userId,
    examId: source.examId,
    topicId: entity === "topic" ? entityId : undefined,
    conceptId: entity === "concept" ? entityId : undefined
  };
}

function summarizeAnswers(answers) {
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

function difficultiesForAnswers(answers, source) {
  const difficulties = [];

  for (const answer of answers) {
    const difficulty = source.questionDifficulties.get(answer.questionId);

    if (difficulty) {
      difficulties.push(difficulty);
    }
  }

  return difficulties;
}

function computeTopicMastery(
  oldMastery,
  topicAccuracy,
  sessionType,
  confidenceInTopic,
  difficultyInTopic,
  questionsAttempted,
  questionsCorrect,
  oldQuestionsAttempted = 0,
  oldQuestionsCorrect = 0,
  oldStabilityFactor = 1.0
) {
  const accuracy = clamp01(topicAccuracy);
  const confidence = clamp(confidenceInTopic, -1, 1);
  const positiveConfidence = clamp01(confidence);
  const difficulty = clamp01(difficultyInTopic);
  const currentAttempted = Math.max(0, questionsAttempted);
  const currentCorrect = Math.max(0, Math.min(questionsCorrect, currentAttempted));
  const priorAttempted = Math.max(0, oldQuestionsAttempted);
  const priorCorrect = Math.max(0, Math.min(oldQuestionsCorrect, priorAttempted));
  const totalAttempted = priorAttempted + currentAttempted;

  if (oldMastery === null) {
    return {
      masteryScore: roundMastery(accuracy * 100 * (0.7 + 0.3 * positiveConfidence)),
      confidenceLevel: priorAttempted === 0 ? "low" : updateConfidenceLevel(totalAttempted),
      stabilityFactor: 1.0
    };
  }

  const oldScore = clamp100(oldMastery);
  const sessionWeight = SESSION_TYPE_WEIGHT[sessionType] ?? 1.0;
  const totalCorrect = priorCorrect + currentCorrect;
  const lifetimeAccuracy = totalAttempted > 0 ? totalCorrect / totalAttempted : accuracy;
  const latestSignal = accuracy * 100 * sessionWeight;
  const difficultySignal = accuracy * 100 * (0.8 + 0.4 * difficulty) * sessionWeight;
  const confidenceSignal = confidence * 100 * sessionWeight;
  const benchmarkSignal = accuracy * 100 * sessionWeight;
  const recencySignal = lifetimeAccuracy * 100;
  const weightedScore =
    latestSignal * WEIGHTS.latestAccuracy +
    difficultySignal * WEIGHTS.difficultyWeight +
    confidenceSignal * WEIGHTS.confidenceWeight +
    benchmarkSignal * WEIGHTS.benchmarkWeight +
    recencySignal * WEIGHTS.recencyWeight;

  const newSignal = weightedScore / totalWeight();
  const blendedScore = oldScore * 0.6 + newSignal * 0.4;
  const stabilityFactor = updateStabilityFactor(accuracy, oldScore, oldStabilityFactor);

  if (accuracy < 0.5 && positiveConfidence > 0.8) {
    const penalty = Math.min(oldScore, 1.5 * Math.abs(accuracy * 100 - oldScore));
    const penalizedScore = Math.max(0, oldScore - penalty);

    return {
      masteryScore: roundMastery(penalizedScore * 0.5 + blendedScore * 0.5),
      confidenceLevel: updateConfidenceLevel(totalAttempted),
      stabilityFactor
    };
  }

  return {
    masteryScore: roundMastery(blendedScore),
    confidenceLevel: updateConfidenceLevel(totalAttempted),
    stabilityFactor
  };
}

function aggregateConfidenceInTopic(answers) {
  if (answers.length === 0) {
    return DEFAULT_CONFIDENCE;
  }

  let totalConfidence = 0;
  let counted = 0;

  for (const answer of answers) {
    if (answer.isCorrect === null) {
      continue;
    }

    const baseConfidence = answer.confidence ? CONFIDENCE_ADJUSTMENT[answer.confidence] : DEFAULT_CONFIDENCE;
    totalConfidence += answer.isCorrect ? baseConfidence : -baseConfidence * 0.5;
    counted += 1;
  }

  return counted > 0 ? clamp(totalConfidence / counted, -1, 1) : DEFAULT_CONFIDENCE;
}

function averageDifficultyInTopic(difficulties) {
  if (difficulties.length === 0) {
    return 0.67;
  }

  const difficultyScore = {
    easy: 0.33,
    medium: 0.67,
    hard: 1.0
  };

  return difficulties.reduce((sum, difficulty) => sum + difficultyScore[difficulty], 0) / difficulties.length;
}

function updateConfidenceLevel(totalAttempts) {
  if (totalAttempts < 3) {
    return "low";
  }

  if (totalAttempts < 10) {
    return "medium";
  }

  return "high";
}

function updateStabilityFactor(accuracy, oldMastery, oldStabilityFactor) {
  if (accuracy * 100 > oldMastery * 0.8) {
    return Math.min(2.0, Math.max(1.0, oldStabilityFactor) + 0.1);
  }

  return 1.0;
}

function totalWeight() {
  return (
    WEIGHTS.latestAccuracy +
    WEIGHTS.difficultyWeight +
    WEIGHTS.confidenceWeight +
    WEIGHTS.benchmarkWeight +
    WEIGHTS.recencyWeight
  );
}

function roundMastery(score) {
  return Math.round(clamp100(score) * 100) / 100;
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function clamp100(value) {
  return clamp(value, 0, 100);
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

async function setJwtClaims(sql, userId) {
  await sql`
    select set_config(
      'request.jwt.claims',
      ${JSON.stringify({
        role: "authenticated",
        sub: userId,
        app_metadata: { user_role: "admin" }
      })},
      false
    )
  `;
  await sql`select set_config('request.jwt.claim.sub', ${userId}, false)`;
}

async function submitAndMaybeUpdateMastery(sql, repository, updateMasteryJob, sessionId) {
  const [status] = await sql`
    select status
    from public.test_sessions
    where id = ${sessionId}
  `;
  const [submitRow] = await sql`select public.submit_test_session(${sessionId}) as result`;
  const result = submitRow.result;

  assert(result.result_id, "submit_test_session returned a result_id");

  if (status?.status !== "scored") {
    await updateMasteryJob(result.result_id, repository);
  }

  return result;
}

function normalizeMasteryRows(rows) {
  return JSON.stringify(
    rows
      .map((row) => ({
        id: row.id,
        user_id: row.user_id,
        exam_id: row.exam_id,
        topic_id: row.topic_id,
        concept_id: row.concept_id,
        mastery_score: Number(row.mastery_score),
        confidence_level: row.confidence_level,
        baseline_score: row.baseline_score === null ? null : Number(row.baseline_score),
        stability_factor: Number(row.stability_factor),
        questions_attempted: Number(row.questions_attempted),
        questions_correct: Number(row.questions_correct),
        last_tested_at: row.last_tested_at?.toISOString?.() ?? String(row.last_tested_at),
        updated_at: row.updated_at?.toISOString?.() ?? String(row.updated_at)
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });
  const userId = crypto.randomUUID();
  const runId = crypto.randomUUID().slice(0, 8);
  const seededQuestionIds = [];
  const seededConceptIds = [];
  let templateId = null;
  let sessionId = null;

  try {
    await sql`
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        ${userId}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        ${"smoke-mastery+" + userId + "@example.com"}, '', now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        '', '', '', ''
      )
    `;
    await setJwtClaims(sql, userId);

    const topics = await sql`
      select e.id as exam_id, t.id as topic_id
      from public.exams e
      join public.topics t on t.exam_id = e.id
      where e.slug = 'upsc-prelims'
      order by t.level, t.order_index
      limit 2
    `;
    assert(topics.length >= 2, "UPSC Prelims exam with at least 2 topics is required.");

    const examId = topics[0].exam_id;
    const topicIds = topics.map((topic) => topic.topic_id);

    for (const topic of topics) {
      const [concept] = await sql`
        insert into public.concepts (exam_id, topic_id, slug, name, description)
        values (
          ${examId},
          ${topic.topic_id},
          ${"smoke-mastery-" + runId + "-" + seededConceptIds.length},
          ${"Smoke mastery concept " + seededConceptIds.length},
          ${"Temporary concept for mastery smoke."}
        )
        returning id
      `;
      seededConceptIds.push(concept.id);
    }

    const seed = [
      { topicId: topicIds[0], conceptId: seededConceptIds[0], correct: 0, answer: { options: [0] }, confidence: "sure", difficulty: "easy" },
      { topicId: topicIds[0], conceptId: seededConceptIds[0], correct: 1, answer: { options: [3] }, confidence: "sure", difficulty: "hard" },
      { topicId: topicIds[1], conceptId: seededConceptIds[1], correct: 2, answer: { options: [2] }, confidence: "unsure", difficulty: "medium" },
      { topicId: topicIds[1], conceptId: seededConceptIds[1], correct: 3, answer: { options: [0] }, confidence: "guessed", difficulty: "hard" }
    ];

    for (const [index, item] of seed.entries()) {
      const content = {
        text: `Smoke mastery question ${index + 1}: which option is correct?`,
        options: ["A", "B", "C", "D"],
        correct_options: [item.correct],
        correct_integer: null,
        pairs: null,
        images: []
      };
      const [created] = await sql`
        select public.create_admin_question(
          ${examId}, ${item.topicId}, ${null}, ${"mcq"}, ${item.difficulty},
          ${"manual"}, ${null}, ${"smoke-mastery"}, ${false}, ${"en"}, ${"draft"},
          ${"practice"}, ${"bronze"}, ${sql.json(content)}, ${"Smoke mastery explanation."},
          ${null}, ${"Seeded by mastery smoke."}
        ) as result
      `;
      const questionId = created.result.question_id;
      seededQuestionIds.push(questionId);
      item.questionId = questionId;

      await sql`select public.set_question_status(${questionId}, ${"live"}, ${"smoke seed to live"}) as result`;
      await sql`
        insert into public.question_concepts (question_id, concept_id, relevance)
        values (${questionId}, ${item.conceptId}, 1.0)
        on conflict (question_id, concept_id) do nothing
      `;
    }

    const [template] = await sql`
      insert into public.test_templates (
        exam_id, type, title, selection_mode, config, is_active, created_by
      )
      values (
        ${examId},
        ${"benchmark"},
        ${"Smoke mastery fixed benchmark " + runId},
        ${"fixed"},
        ${sql.json({ selectionMode: "fixed", questionIds: seededQuestionIds })},
        true,
        ${userId}
      )
      returning id
    `;
    templateId = template.id;

    const [startRow] = await sql`
      select public.start_test_session(
        ${examId}, ${"benchmark"}, ${templateId}, ${null}, ${seed.length}, ${30}, ${"bronze"}
      ) as result
    `;
    const start = startRow.result;
    sessionId = start.session_id;
    assert(sessionId, "start_test_session returned a session_id");
    assert(Array.isArray(start.questions) && start.questions.length === seed.length, "fixed benchmark returned seeded questions");

    for (const item of seed) {
      assert(start.questions.some((question) => question.question_id === item.questionId), "seeded question present: " + item.questionId);
      await sql`
        insert into public.session_answers (
          session_id,
          question_id,
          user_id,
          selected_answer,
          confidence,
          time_spent_sec,
          revisit_count,
          last_saved_at,
          answered_at
        )
        values (
          ${sessionId},
          ${item.questionId},
          ${userId},
          ${sql.json(item.answer)},
          ${item.confidence},
          ${45 + seed.indexOf(item) * 10},
          ${seed.indexOf(item)},
          now(),
          now()
        )
        on conflict (session_id, question_id) do update
        set selected_answer = excluded.selected_answer,
            confidence = excluded.confidence,
            last_saved_at = excluded.last_saved_at,
            answered_at = excluded.answered_at
      `;
    }

    const repository = makeMasteryRepository(sql);
    const result = await submitAndMaybeUpdateMastery(sql, repository, updateMasteryJob, sessionId);
    assert(result.status === "scored", "session status scored");

    const masteryRows = await sql`
      select
        id,
        user_id,
        exam_id,
        topic_id,
        concept_id,
        mastery_score,
        confidence_level,
        baseline_score,
        stability_factor,
        questions_attempted,
        questions_correct,
        last_tested_at,
        updated_at
      from public.mastery_records
      where user_id = ${userId}
        and exam_id = ${examId}
      order by id
    `;

    const topicRows = masteryRows.filter((row) => row.topic_id !== null && row.concept_id === null);
    const conceptRows = masteryRows.filter((row) => row.topic_id === null && row.concept_id !== null);

    assert(topicRows.length >= 2, "mastery rows include both seeded topics");
    assert(conceptRows.length >= 2, "mastery rows include both seeded concepts");

    for (const topicId of topicIds) {
      assert(topicRows.some((row) => row.topic_id === topicId), "topic mastery row exists: " + topicId);
    }

    for (const conceptId of seededConceptIds) {
      assert(conceptRows.some((row) => row.concept_id === conceptId), "concept mastery row exists: " + conceptId);
    }

    for (const row of masteryRows) {
      const masteryScore = Number(row.mastery_score);
      assert(row.user_id === userId, "mastery row belongs to auth user");
      assert(row.exam_id === examId, "mastery row belongs to exam");
      assert((row.topic_id === null) !== (row.concept_id === null), "mastery row has topic xor concept");
      assert(masteryScore >= 0 && masteryScore <= 100, "mastery_score is between 0 and 100");
      assert(row.confidence_level === "low", "first-attempt confidence level is low");
      assert(Number(row.questions_attempted) > 0, "questions_attempted > 0");
      assert(Number(row.questions_correct) <= Number(row.questions_attempted), "questions_correct <= questions_attempted");
      assert(row.last_tested_at, "last_tested_at is set");
      assert(row.updated_at, "updated_at is set");
    }

    const beforeResubmit = normalizeMasteryRows(masteryRows);
    const resubmit = await submitAndMaybeUpdateMastery(sql, repository, updateMasteryJob, sessionId);
    assert(resubmit.result_id === result.result_id, "re-submit returns same result_id");

    const afterRows = await sql`
      select
        id,
        user_id,
        exam_id,
        topic_id,
        concept_id,
        mastery_score,
        confidence_level,
        baseline_score,
        stability_factor,
        questions_attempted,
        questions_correct,
        last_tested_at,
        updated_at
      from public.mastery_records
      where user_id = ${userId}
        and exam_id = ${examId}
      order by id
    `;
    assert(normalizeMasteryRows(afterRows) === beforeResubmit, "duplicate submit did not change mastery rows");

    console.log(
      JSON.stringify(
        {
          ok: true,
          sessionId,
          resultId: result.result_id,
          masteryRows: masteryRows.length,
          topicRows: topicRows.length,
          conceptRows: conceptRows.length,
          idempotent: true
        },
        null,
        2
      )
    );
    console.log("smoke-mastery-update: PASS");
  } finally {
    try {
      if (sessionId) {
        await sql`delete from public.test_sessions where id = ${sessionId}`;
      }
      await sql`delete from public.mastery_records where user_id = ${userId}`;
      if (templateId) {
        await sql`delete from public.test_templates where id = ${templateId}`;
      }
      for (const qid of seededQuestionIds) {
        await sql`delete from public.questions where id = ${qid}`;
      }
      for (const conceptId of seededConceptIds) {
        await sql`delete from public.concepts where id = ${conceptId}`;
      }
      await sql`delete from auth.users where id = ${userId}`;
    } catch (cleanupError) {
      console.error("cleanup warning:", cleanupError.message);
    }
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
