/* eslint-disable @typescript-eslint/no-require-imports */
// Smoke test for TSP-062 retest queue scheduling:
// seed fixed questions -> submit -> create mistake_items -> populate retest_queue -> verify shape and idempotency.
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

const DAY_MS = 24 * 60 * 60 * 1000;
const MISTAKE_TYPE_PRIORITY = {
  overconfidence: 3,
  conceptual_gap: 2,
  not_attempted: 1,
  lucky_guess: 1,
  bookmarked: 0.5
};
const MAX_PRIORITY = 10;
const TOPIC_BOOST_SCALE = 2;

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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

function classifyMistake(answer) {
  if (answer.is_correct === false && answer.confidence === "sure") {
    return "overconfidence";
  }

  if (answer.is_correct === false) {
    return "conceptual_gap";
  }

  if (answer.is_correct === null) {
    return "not_attempted";
  }

  if (answer.is_correct === true && answer.confidence === "guessed") {
    return "lucky_guess";
  }

  if (answer.is_correct === true && answer.marked_review) {
    return "bookmarked";
  }

  return null;
}

function computeInitialSchedule(mistakeTypes, topicWeightPercent, nowMs) {
  const basePriority =
    mistakeTypes.length > 0
      ? Math.max(...mistakeTypes.map((type) => MISTAKE_TYPE_PRIORITY[type] ?? 0))
      : 0;
  const topicBoost =
    topicWeightPercent !== null && Number.isFinite(topicWeightPercent)
      ? (topicWeightPercent / 100) * TOPIC_BOOST_SCALE
      : 0;
  const priority = Math.min(MAX_PRIORITY, Math.max(0, basePriority + topicBoost));

  return {
    dueAt: new Date(nowMs + DAY_MS),
    priority,
    schedulerState: {
      intervalDays: 1,
      repetitions: 0,
      lapses: 0,
      lastReviewedAt: null
    }
  };
}

async function runMistakeJob(sql, resultId) {
  const [result] = await sql`
    select session_id, user_id, exam_id
    from public.session_results
    where id = ${resultId}
  `;
  assert(result, "session result found for mistake job");

  const answers = await sql`
    select question_id, is_correct, confidence, marked_review
    from public.session_answers
    where session_id = ${result.session_id}
      and user_id = ${result.user_id}
  `;
  const questionIds = answers.map((answer) => answer.question_id);
  assert(questionIds.length > 0, "answers found for mistake job");

  const questions = await sql`
    select id, topic_id
    from public.questions
    where id in ${sql(questionIds)}
  `;
  const topicByQuestion = new Map(questions.map((question) => [question.id, question.topic_id]));
  const conceptRows = await sql`
    select question_id, concept_id, relevance
    from public.question_concepts
    where question_id in ${sql(questionIds)}
    order by relevance desc
  `;
  const primaryConceptByQuestion = new Map();

  for (const row of conceptRows) {
    if (!primaryConceptByQuestion.has(row.question_id)) {
      primaryConceptByQuestion.set(row.question_id, row.concept_id);
    }
  }

  for (const answer of answers) {
    const mistakeType = classifyMistake(answer);

    if (!mistakeType) {
      continue;
    }

    await sql`
      insert into public.mistake_items (
        user_id,
        exam_id,
        question_id,
        session_id,
        topic_id,
        concept_id,
        mistake_type,
        confidence,
        status
      )
      values (
        ${result.user_id},
        ${result.exam_id},
        ${answer.question_id},
        ${result.session_id},
        ${topicByQuestion.get(answer.question_id) ?? null},
        ${primaryConceptByQuestion.get(answer.question_id) ?? null},
        ${mistakeType},
        ${answer.confidence ?? null},
        ${"unresolved"}
      )
      on conflict (user_id, session_id, question_id) do nothing
    `;
  }
}

async function runRetestQueueJob(sql, userId, sessionId, examId) {
  const mistakes = await sql`
    select concept_id, topic_id, mistake_type
    from public.mistake_items
    where session_id = ${sessionId}
      and user_id = ${userId}
      and status = 'unresolved'
  `;
  const groups = new Map();

  for (const row of mistakes) {
    if (!row.concept_id && !row.topic_id) {
      continue;
    }

    const key = row.concept_id ? `concept:${row.concept_id}` : `topic:${row.topic_id}`;
    const existing = groups.get(key);

    if (existing) {
      existing.mistakeTypes.push(row.mistake_type);
    } else {
      groups.set(key, {
        conceptId: row.concept_id,
        topicId: row.concept_id ? null : row.topic_id,
        mistakeTypes: [row.mistake_type]
      });
    }
  }

  const topicIds = [...new Set([...groups.values()].map((group) => group.topicId).filter(Boolean))];
  const topicWeightMap = new Map();

  if (topicIds.length > 0) {
    const topics = await sql`
      select id, weight_percent
      from public.topics
      where id in ${sql(topicIds)}
    `;

    for (const topic of topics) {
      const weight = Number(topic.weight_percent ?? 0);

      if (Number.isFinite(weight)) {
        topicWeightMap.set(topic.id, weight);
      }
    }
  }

  const nowMs = Date.now();

  for (const group of groups.values()) {
    const topicWeight = group.topicId ? (topicWeightMap.get(group.topicId) ?? null) : null;
    const schedule = computeInitialSchedule(group.mistakeTypes, topicWeight, nowMs);
    const activeRows = group.conceptId
      ? await sql`
          select id, priority
          from public.retest_queue
          where user_id = ${userId}
            and exam_id = ${examId}
            and concept_id = ${group.conceptId}
            and topic_id is null
            and status in ('due', 'scheduled', 'snoozed')
          limit 1
        `
      : await sql`
          select id, priority
          from public.retest_queue
          where user_id = ${userId}
            and exam_id = ${examId}
            and topic_id = ${group.topicId}
            and concept_id is null
            and status in ('due', 'scheduled', 'snoozed')
          limit 1
        `;
    const activeRow = activeRows[0];

    if (activeRow) {
      const existingPriority = Number(activeRow.priority ?? 0);

      if (schedule.priority > existingPriority) {
        await sql`
          update public.retest_queue
          set priority = ${schedule.priority},
              updated_at = ${new Date(nowMs).toISOString()}
          where id = ${activeRow.id}
        `;
      }
      continue;
    }

    await sql`
      insert into public.retest_queue (
        user_id,
        exam_id,
        concept_id,
        topic_id,
        due_at,
        scheduler,
        scheduler_state,
        priority,
        status
      )
      values (
        ${userId},
        ${examId},
        ${group.conceptId},
        ${group.topicId},
        ${schedule.dueAt.toISOString()},
        ${"simple"},
        ${sql.json(schedule.schedulerState)},
        ${schedule.priority},
        ${"due"}
      )
    `;
  }
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

async function submitSession(sql, sessionId) {
  const [submitRow] = await sql`select public.submit_test_session(${sessionId}) as result`;
  const result = submitRow.result;
  assert(result.result_id, "submit_test_session returned a result_id");
  return result;
}

async function loadRetestRows(sql, userId, examId) {
  return sql`
    select
      id,
      user_id,
      exam_id,
      topic_id,
      concept_id,
      due_at,
      scheduler,
      scheduler_state,
      priority,
      status
    from public.retest_queue
    where user_id = ${userId}
      and exam_id = ${examId}
    order by priority desc, id
  `;
}

function normalizePriorities(rows) {
  return new Map(rows.map((row) => [row.id, Number(row.priority)]));
}

function schedulerState(row) {
  return typeof row.scheduler_state === "string" ? JSON.parse(row.scheduler_state) : row.scheduler_state;
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
        ${"smoke-retest+" + userId + "@example.com"}, '', now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        '', '', '', ''
      )
    `;
    await setJwtClaims(sql, userId);

    const [topic] = await sql`
      select e.id as exam_id, t.id as topic_id
      from public.exams e
      join public.topics t on t.exam_id = e.id
      where e.slug = 'upsc-prelims'
      order by t.level, t.order_index
      limit 1
    `;
    assert(topic, "UPSC Prelims exam with at least one topic is required.");

    const examId = topic.exam_id;
    const topicId = topic.topic_id;
    const seed = [
      {
        label: "overconfidence",
        correct: 0,
        answer: { options: [1] },
        confidence: "sure",
        markedReview: false,
        expected: "overconfidence"
      },
      {
        label: "conceptual_gap",
        correct: 0,
        answer: { options: [2] },
        confidence: "unsure",
        markedReview: false,
        expected: "conceptual_gap"
      },
      {
        label: "not_attempted",
        correct: 0,
        answer: null,
        confidence: null,
        markedReview: false,
        expected: "not_attempted"
      },
      {
        label: "lucky_guess",
        correct: 0,
        answer: { options: [0] },
        confidence: "guessed",
        markedReview: false,
        expected: "lucky_guess"
      }
    ];

    for (const [index, item] of seed.entries()) {
      const [concept] = await sql`
        insert into public.concepts (exam_id, topic_id, slug, name, description)
        values (
          ${examId},
          ${topicId},
          ${"smoke-retest-" + runId + "-" + index},
          ${"Smoke retest concept " + index},
          ${"Temporary concept for retest queue smoke."}
        )
        returning id
      `;
      seededConceptIds.push(concept.id);
      item.conceptId = concept.id;

      const content = {
        text: `Smoke retest question ${index + 1}: choose the correct option.`,
        options: ["A", "B", "C", "D"],
        correct_options: [item.correct],
        correct_integer: null,
        pairs: null,
        images: []
      };
      const [created] = await sql`
        select public.create_admin_question(
          ${examId}, ${topicId}, ${null}, ${"mcq"}, ${"medium"},
          ${"manual"}, ${null}, ${"smoke-retest"}, ${false}, ${"en"}, ${"draft"},
          ${"practice"}, ${"bronze"}, ${sql.json(content)}, ${"Smoke retest explanation."},
          ${null}, ${"Seeded by retest queue smoke."}
        ) as result
      `;
      const questionId = created.result.question_id;
      seededQuestionIds.push(questionId);
      item.questionId = questionId;

      await sql`select public.set_question_status(${questionId}, ${"live"}, ${"smoke seed to live"}) as result`;
      await sql`
        insert into public.question_concepts (question_id, concept_id, relevance)
        values (${questionId}, ${concept.id}, 1.0)
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
        ${"Smoke retest fixed benchmark " + runId},
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
          marked_review,
          time_spent_sec,
          revisit_count,
          last_saved_at,
          answered_at
        )
        values (
          ${sessionId},
          ${item.questionId},
          ${userId},
          ${item.answer === null ? null : sql.json(item.answer)},
          ${item.confidence},
          ${item.markedReview},
          ${45 + seed.indexOf(item) * 5},
          ${0},
          now(),
          ${item.answer === null ? null : new Date().toISOString()}
        )
        on conflict (session_id, question_id) do update
        set selected_answer = excluded.selected_answer,
            confidence = excluded.confidence,
            marked_review = excluded.marked_review,
            last_saved_at = excluded.last_saved_at,
            answered_at = excluded.answered_at
      `;
    }

    const result = await submitSession(sql, sessionId);
    assert(result.status === "scored", "session status scored");

    const beforeJobMs = Date.now();
    await runMistakeJob(sql, result.result_id);
    await runRetestQueueJob(sql, userId, sessionId, examId);

    const retestRows = await loadRetestRows(sql, userId, examId);
    assert(retestRows.length >= 1, "at least one retest_queue row exists");
    assert(retestRows.length === 4, "one retest_queue row per seeded concept");

    const highestPriority = retestRows[0];
    const overconfidenceSeed = seed.find((item) => item.expected === "overconfidence");
    assert(highestPriority.concept_id === overconfidenceSeed.conceptId, "highest priority row is overconfidence concept");

    for (const row of retestRows) {
      const dueAtMs = new Date(row.due_at).getTime();
      const state = schedulerState(row);

      assert(row.user_id === userId, "retest row belongs to seeded user");
      assert(row.exam_id === examId, "retest row belongs to seeded exam");
      assert(row.status === "due", "retest row status is due");
      assert(row.scheduler === "simple", "retest row scheduler is simple");
      assert(row.concept_id !== null && row.topic_id === null, "retest row is concept-level");
      assert(dueAtMs >= beforeJobMs, "due_at is in the future");
      assert(dueAtMs <= beforeJobMs + 2 * DAY_MS, "due_at is within two days");
      assert(state && state.intervalDays === 1, "scheduler_state intervalDays is 1");
      assert(state.repetitions === 0, "scheduler_state repetitions is 0");
      assert(state.lapses === 0, "scheduler_state lapses is 0");
      assert(state.lastReviewedAt === null, "scheduler_state lastReviewedAt is null");
    }

    const prioritiesBefore = normalizePriorities(retestRows);
    await runRetestQueueJob(sql, userId, sessionId, examId);
    const afterRows = await loadRetestRows(sql, userId, examId);
    assert(afterRows.length === retestRows.length, "second retest job run did not add duplicate active rows");

    for (const row of afterRows) {
      assert(Number(row.priority) >= prioritiesBefore.get(row.id), "priority did not decrease on idempotent rerun");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          sessionId,
          resultId: result.result_id,
          retestRows: retestRows.length,
          highestPriority: Number(highestPriority.priority),
          highestPriorityMistakeType: "overconfidence",
          idempotent: true
        },
        null,
        2
      )
    );
    console.log("smoke-retest-queue: PASS");
  } finally {
    try {
      await sql`delete from public.retest_queue where user_id = ${userId}`;
      if (sessionId) {
        await sql`delete from public.mistake_items where session_id = ${sessionId}`;
        await sql`delete from public.test_sessions where id = ${sessionId}`;
      }
      if (templateId) {
        await sql`delete from public.test_templates where id = ${templateId}`;
      }
      for (const questionId of seededQuestionIds) {
        await sql`delete from public.questions where id = ${questionId}`;
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
