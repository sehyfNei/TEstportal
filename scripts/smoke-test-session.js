/* eslint-disable @typescript-eslint/no-require-imports */
// Smoke test for the Session 3 test engine: start_test_session -> autosave -> submit_test_session.
// Verifies (1) prompt snapshots are answer-free, (2) scoring reads the frozen key correctly,
// (3) submit is idempotent. Seeds and cleans up its own data.
let postgres;

try {
  postgres = require("postgres");
} catch {
  postgres = require("../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres");
}

const crypto = require("crypto");

const BANNED_KEY = /correct|answer|explanation/i;

function assert(condition, message) {
  if (!condition) {
    throw new Error("ASSERT FAILED: " + message);
  }
}

// Recursively check object KEYS (not values) for leaked answer-key fields.
function findBannedKeys(value, path = "$") {
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((item, i) => hits.push(...findBannedKeys(item, `${path}[${i}]`)));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (BANNED_KEY.test(key) || key === "pairs") {
        hits.push(`${path}.${key}`);
      }
      hits.push(...findBannedKeys(child, `${path}.${key}`));
    }
  }
  return hits;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

  const userId = process.env.TEST_USER_ID || crypto.randomUUID();
  const createdUser = !process.env.TEST_USER_ID;
  const seededQuestionIds = [];

  try {
    // 1. A real auth.users row is required (FKs + auth.uid()).
    if (createdUser) {
      await sql`
        insert into auth.users (
          id, instance_id, aud, role, email, encrypted_password,
          email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data,
          confirmation_token, email_change, email_change_token_new, recovery_token
        ) values (
          ${userId}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          ${"smoke+" + userId + "@example.com"}, '', now(), now(), now(),
          '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
          '', '', '', ''
        )
      `;
    }

    // Act as this user, with admin claims so we can also seed live questions.
    await sql.unsafe(
      `select set_config('request.jwt.claims', '${JSON.stringify({
        role: "authenticated",
        sub: userId,
        app_metadata: { user_role: "admin" }
      })}', false)`
    );

    const [scope] = await sql`
      select e.id as exam_id, t.id as topic_id
      from public.exams e
      join public.topics t on t.exam_id = e.id
      where e.slug = 'upsc-prelims'
      order by t.level, t.order_index
      limit 1
    `;
    assert(scope, "UPSC Prelims exam/topic seed required (run smoke-manifest-import first).");

    // 2. Seed 3 live practice MCQs with known correct options.
    const seed = [
      { correct: 0, answer: { options: [0] }, expect: "correct" },
      { correct: 1, answer: { options: [3] }, expect: "incorrect" },
      { correct: 2, answer: null, expect: "skipped" }
    ];

    for (const item of seed) {
      const content = {
        text: "Smoke: which option is correct?",
        options: ["A", "B", "C", "D"],
        correct_options: [item.correct],
        correct_integer: null,
        pairs: null,
        images: []
      };
      const [created] = await sql`
        select public.create_admin_question(
          ${scope.exam_id}, ${scope.topic_id}, ${null}, ${"mcq"}, ${"medium"},
          ${"manual"}, ${null}, ${"smoke-session"}, ${false}, ${"en"}, ${"draft"},
          ${"practice"}, ${"bronze"}, ${sql.json(content)}, ${"Seed explanation (must never leak)."},
          ${null}, ${"Seeded by session smoke."}
        ) as result
      `;
      const qid = created.result.question_id;
      item.questionId = qid;
      seededQuestionIds.push(qid);
      await sql`select public.set_question_status(${qid}, ${"live"}, ${"smoke seed to live"}) as r`;
    }

    // 3. Start a session.
    const [startRow] = await sql`
      select public.start_test_session(
        ${scope.exam_id}, ${"custom"}, ${null}, ${scope.topic_id}, ${10}, ${30}
      ) as result
    `;
    const start = startRow.result;
    const sessionId = start.session_id;
    assert(sessionId, "start_test_session returned a session_id");
    assert(Array.isArray(start.questions) && start.questions.length >= 3, "session has >= 3 questions");

    // SECURITY: no answer-key fields in any returned snapshot.
    const leaks = [];
    for (const q of start.questions) {
      leaks.push(...findBannedKeys(q.prompt_snapshot, `q[${q.question_id}].prompt_snapshot`));
    }
    assert(leaks.length === 0, "no answer-key leak in snapshots; found: " + leaks.join(", "));

    // Read the frozen marking rule.
    const [meta] = await sql`select metadata -> 'markingRule' as rule from public.test_sessions where id = ${sessionId}`;
    const mpc = Number(meta.rule.marksPerCorrect);
    const nmf = Number(meta.rule.negativeMarkingFraction);
    assert(Number.isFinite(mpc) && Number.isFinite(nmf), "marking rule is numeric");

    // All 3 seeded questions must be in the session (we requested 10, only 3 live exist on this topic typically).
    for (const item of seed) {
      assert(
        start.questions.some((q) => q.question_id === item.questionId),
        "seeded question present in session: " + item.questionId
      );
    }

    // 4. Autosave answers (simulates TSP-040: owner upsert into session_answers).
    for (const item of seed) {
      if (item.answer === null) continue;
      await sql`
        insert into public.session_answers (session_id, question_id, user_id, selected_answer, last_saved_at, answered_at)
        values (${sessionId}, ${item.questionId}, ${userId}, ${sql.json(item.answer)}, now(), now())
        on conflict (session_id, question_id) do update set selected_answer = excluded.selected_answer
      `;
    }

    // 5. Submit and score.
    const [submitRow] = await sql`select public.submit_test_session(${sessionId}) as result`;
    const result = submitRow.result;
    assert(result.status === "scored", "session status scored");

    // Per-answer correctness for our seeded questions (robust to any other live questions).
    const answers = await sql`
      select question_id, is_correct, marks_awarded
      from public.session_answers
      where session_id = ${sessionId}
    `;
    const byQ = new Map(answers.map((a) => [a.question_id, a]));

    const correctRow = byQ.get(seed[0].questionId);
    assert(correctRow && correctRow.is_correct === true, "Q1 scored correct");
    assert(Number(correctRow.marks_awarded) === mpc, `Q1 marks == +${mpc}`);

    const wrongRow = byQ.get(seed[1].questionId);
    assert(wrongRow && wrongRow.is_correct === false, "Q2 scored incorrect");
    assert(Math.abs(Number(wrongRow.marks_awarded) - -(nmf * mpc)) < 1e-9, `Q2 marks == -${nmf * mpc}`);

    // Q3 was never answered -> no session_answers row -> skipped (no row to check).
    assert(!byQ.has(seed[2].questionId), "Q3 left unanswered (skipped)");

    // 6. Idempotency: second submit returns the same result, no re-scoring.
    const [resubmitRow] = await sql`select public.submit_test_session(${sessionId}) as result`;
    assert(resubmitRow.result.result_id === result.result_id, "re-submit returns same result_id (idempotent)");
    assert(resubmitRow.result.score === result.score, "re-submit score unchanged");

    console.log(
      JSON.stringify(
        {
          ok: true,
          sessionId,
          questionsInSession: start.questions.length,
          markingRule: { marksPerCorrect: mpc, negativeMarkingFraction: nmf, source: meta.rule.source },
          result: {
            score: result.score,
            max_score: result.max_score,
            accuracy: result.accuracy,
            attempted: result.attempted,
            correct: result.correct,
            incorrect: result.incorrect,
            skipped: result.skipped
          },
          snapshotLeak: leaks.length === 0 ? "none" : leaks,
          idempotent: true
        },
        null,
        2
      )
    );
  } finally {
    // Cleanup order matters: sessions first (cascades session_questions that reference questions),
    // then questions (their created_by references the user), then the user last.
    try {
      await sql`delete from public.test_sessions where user_id = ${userId}`;
      for (const qid of seededQuestionIds) {
        await sql`delete from public.questions where id = ${qid}`;
      }
      if (createdUser) {
        await sql`delete from auth.users where id = ${userId}`;
      }
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
