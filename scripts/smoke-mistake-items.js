/* eslint-disable @typescript-eslint/no-require-imports */
// Smoke test for TSP-060 mistake item creation:
// seed fixed questions -> submit -> create mistake_items -> verify classifications and idempotency.
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

async function createMistakeItemsJob(sql, resultId) {
  const [result] = await sql`
    select session_id, user_id, exam_id
    from public.session_results
    where id = ${resultId}
  `;

  if (!result) {
    throw new Error("[mistake] session result not found: " + resultId);
  }

  const answers = await sql`
    select question_id, is_correct, confidence, marked_review
    from public.session_answers
    where session_id = ${result.session_id}
      and user_id = ${result.user_id}
  `;

  if (answers.length === 0) {
    return;
  }

  const questionIds = answers.map((answer) => answer.question_id);
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

async function loadMistakeRows(sql, sessionId) {
  return sql`
    select
      user_id,
      exam_id,
      question_id,
      session_id,
      topic_id,
      concept_id,
      mistake_type,
      confidence,
      status
    from public.mistake_items
    where session_id = ${sessionId}
    order by question_id
  `;
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
        ${"smoke-mistakes+" + userId + "@example.com"}, '', now(), now(), now(),
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
          ${"smoke-mistakes-" + runId + "-" + index},
          ${"Smoke mistakes concept " + index},
          ${"Temporary concept for mistake item smoke."}
        )
        returning id
      `;
      seededConceptIds.push(concept.id);

      const content = {
        text: `Smoke mistake question ${index + 1}: choose the correct option.`,
        options: ["A", "B", "C", "D"],
        correct_options: [item.correct],
        correct_integer: null,
        pairs: null,
        images: []
      };
      const [created] = await sql`
        select public.create_admin_question(
          ${examId}, ${topicId}, ${null}, ${"mcq"}, ${"medium"},
          ${"manual"}, ${null}, ${"smoke-mistakes"}, ${false}, ${"en"}, ${"draft"},
          ${"practice"}, ${"bronze"}, ${sql.json(content)}, ${"Smoke mistakes explanation."},
          ${null}, ${"Seeded by mistake item smoke."}
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
        ${"Smoke mistake fixed benchmark " + runId},
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

    await createMistakeItemsJob(sql, result.result_id);
    const mistakeRows = await loadMistakeRows(sql, sessionId);
    assert(mistakeRows.length === 4, "mistake_items count is 4");

    const byQuestion = new Map(mistakeRows.map((row) => [row.question_id, row]));
    for (const item of seed) {
      const row = byQuestion.get(item.questionId);
      assert(row, "mistake row exists for " + item.label);
      assert(row.mistake_type === item.expected, "mistake type matches " + item.label);
      assert(row.user_id === userId, "mistake row belongs to seeded user");
      assert(row.exam_id === examId, "mistake row belongs to seeded exam");
      assert(row.topic_id === topicId, "topic_id is set for " + item.label);
      assert(row.concept_id, "concept_id is set for " + item.label);
      assert(row.status === "unresolved", "status is unresolved for " + item.label);
    }

    await createMistakeItemsJob(sql, result.result_id);
    const afterSecondJob = await loadMistakeRows(sql, sessionId);
    assert(afterSecondJob.length === 4, "second job run did not duplicate mistake rows");

    const resubmit = await submitSession(sql, sessionId);
    assert(resubmit.result_id === result.result_id, "re-submit returns same result_id");
    const afterResubmit = await loadMistakeRows(sql, sessionId);
    assert(afterResubmit.length === 4, "duplicate submit did not duplicate mistake rows");

    console.log(
      JSON.stringify(
        {
          ok: true,
          sessionId,
          resultId: result.result_id,
          mistakeRows: mistakeRows.length,
          mistakeTypes: mistakeRows.map((row) => row.mistake_type).sort(),
          idempotent: true
        },
        null,
        2
      )
    );
    console.log("smoke-mistake-items: PASS");
  } finally {
    try {
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
