/* eslint-disable @typescript-eslint/no-require-imports */
// Smoke test for TSP-028 question flags + auto-quarantine:
// 1. Three distinct users flag the same question -> auto-quarantine fires at flag 3
// 2. Duplicate flag from same user does NOT increment count
// 3. resolve_question_flag closes a flag and flag_count drops
// 4. A quarantine question is excluded from start_test_session picks
//
// NOTE: Gated on live DB (DATABASE_URL required). Document as blocked if M0 live-DB not yet unblocked.

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
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^(['"])(.*)(\1)$/, "$2");
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error("ASSERT FAILED: " + message);
  }
}

async function setJwtClaims(sql, userId, isAdmin = false) {
  await sql`
    select set_config(
      'request.jwt.claims',
      ${JSON.stringify({
        role: "authenticated",
        sub: userId,
        app_metadata: isAdmin ? { user_role: "admin" } : {}
      })},
      false
    )
  `;
  await sql`select set_config('request.jwt.claim.sub', ${userId}, false)`;
}

async function createUser(sql, suffix) {
  const id = crypto.randomUUID();
  await sql`
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      ${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      ${"smoke-flags-" + suffix + "@example.com"}, '', now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      '', '', '', ''
    )
  `;
  return id;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Gated on M0 live-DB unblock.");
  }

  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });
  const runId = crypto.randomUUID().slice(0, 8);
  const userIds = [];
  let questionId = null;
  let templateId = null;
  let flagId1 = null;

  try {
    // ── Setup: 3 distinct users (user[0] doubles as admin for resolution) ──
    for (let i = 0; i < 3; i++) {
      userIds.push(await createUser(sql, runId + "-u" + i));
    }
    const [adminUserId, user2Id, user3Id] = userIds;

    // ── Setup: find an exam+topic, create a live question ──
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

    // Use admin JWT to create the question
    await setJwtClaims(sql, adminUserId, true);
    const content = {
      text: `Smoke flag question ${runId}: which answer is correct?`,
      options: ["A", "B", "C", "D"],
      correct_options: [0],
      correct_integer: null,
      pairs: null,
      images: []
    };
    const [created] = await sql`
      select public.create_admin_question(
        ${examId}, ${topicId}, ${null}, ${"mcq"}, ${"medium"},
        ${"manual"}, ${null}, ${"smoke-flags"}, ${false}, ${"en"}, ${"draft"},
        ${"practice"}, ${"bronze"}, ${sql.json(content)}, ${"Smoke flags explanation."},
        ${null}, ${"Seeded by question flag smoke."}
      ) as result
    `;
    questionId = created.result.question_id;
    await sql`select public.set_question_status(${questionId}, ${"live"}, ${"smoke seed to live"}) as result`;

    // ── Assert 1a: flag from user 1 (not yet at threshold) ──
    await setJwtClaims(sql, adminUserId, false);
    const [flag1Row] = await sql`select public.submit_question_flag(
      ${questionId}, ${"incorrect_answer"}, ${"Smoke test flag 1"}
    ) as result`;
    const flag1 = flag1Row.result;
    assert(flag1.duplicate === false, "flag 1: not a duplicate");
    assert(flag1.quarantined === false, "flag 1: not yet quarantined");
    assert(flag1.open_flags === 1, "flag 1: open_flags = 1");
    flagId1 = flag1.flag_id;

    // ── Assert 2: duplicate flag from same user does NOT increment count ──
    const [dupRow] = await sql`select public.submit_question_flag(
      ${questionId}, ${"ambiguous"}, ${null}
    ) as result`;
    const dup = dupRow.result;
    assert(dup.duplicate === true, "duplicate flag: returns duplicate=true");
    const [countCheck] = await sql`
      select flag_count from public.questions where id = ${questionId}
    `;
    assert(countCheck.flag_count === 1, "duplicate flag did not increment flag_count");

    // ── Assert 1b: flag from user 2 ──
    await setJwtClaims(sql, user2Id, false);
    const [flag2Row] = await sql`select public.submit_question_flag(
      ${questionId}, ${"ambiguous"}, ${null}
    ) as result`;
    const flag2 = flag2Row.result;
    assert(flag2.duplicate === false, "flag 2: not a duplicate");
    assert(flag2.quarantined === false, "flag 2: not yet quarantined (count = 2)");
    assert(flag2.open_flags === 2, "flag 2: open_flags = 2");

    // ── Assert 1c: flag from user 3 -> triggers quarantine ──
    await setJwtClaims(sql, user3Id, false);
    const [flag3Row] = await sql`select public.submit_question_flag(
      ${questionId}, ${"low_quality"}, ${null}
    ) as result`;
    const flag3 = flag3Row.result;
    assert(flag3.duplicate === false, "flag 3: not a duplicate");
    assert(flag3.quarantined === true, "flag 3: quarantined=true at threshold");
    assert(flag3.open_flags === 3, "flag 3: open_flags = 3");

    // Verify DB state after quarantine
    const [qRow] = await sql`
      select status, quality_tier, flag_count from public.questions where id = ${questionId}
    `;
    assert(qRow.status === "flagged", "question status = flagged after quarantine");
    assert(qRow.quality_tier === "quarantine", "question quality_tier = quarantine");
    assert(qRow.flag_count === 3, "question flag_count = 3");

    const [auditRow] = await sql`
      select from_status, to_status from public.question_status_events
      where question_id = ${questionId} and to_status = 'flagged'
      order by created_at desc
      limit 1
    `;
    assert(auditRow, "auto-quarantine wrote a question_status_events row");
    assert(auditRow.from_status === "live", "audit row: from_status = live");
    assert(auditRow.to_status === "flagged", "audit row: to_status = flagged");

    // ── Assert 3: resolve_question_flag closes flag and flag_count drops ──
    await setJwtClaims(sql, adminUserId, true);
    const [resolveRow] = await sql`select public.resolve_question_flag(
      ${flagId1}, ${"resolved"}, ${null}
    ) as result`;
    const resolved = resolveRow.result;
    assert(resolved.changed === true, "resolve: changed=true");
    assert(resolved.open_flags === 2, "resolve: open_flags dropped to 2");

    const [qAfterResolve] = await sql`
      select flag_count from public.questions where id = ${questionId}
    `;
    assert(qAfterResolve.flag_count === 2, "questions.flag_count = 2 after resolving 1 flag");

    // ── Assert 4: quarantine question excluded from start_test_session ──
    const [template] = await sql`
      insert into public.test_templates (
        exam_id, type, title, selection_mode, config, is_active, created_by
      )
      values (
        ${examId}, ${"practice"}, ${"Smoke flag selection " + runId},
        ${"adaptive"}, ${sql.json({ minDifficulty: "easy", maxDifficulty: "hard" })},
        true, ${adminUserId}
      )
      returning id
    `;
    templateId = template.id;

    await setJwtClaims(sql, adminUserId, false);
    const [startRow] = await sql`
      select public.start_test_session(
        ${examId}, ${"practice"}, ${null}, ${topicId}, ${10}, ${30}, ${"bronze"}
      ) as result
    `;
    const startResult = startRow.result;
    const pickedIds = (startResult.questions ?? []).map((q) => q.question_id);
    assert(
      !pickedIds.includes(questionId),
      "quarantine question excluded from start_test_session picks"
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          runId,
          questionId,
          flag1Id: flagId1,
          assertions: [
            "three-flag quarantine",
            "duplicate not counted",
            "resolve drops count",
            "quarantine excluded from selection"
          ]
        },
        null,
        2
      )
    );
    console.log("smoke-question-flags: PASS");
  } finally {
    try {
      // Cleanup (best-effort; order matters for FK constraints)
      if (templateId) {
        await sql`delete from public.test_templates where id = ${templateId}`;
      }
      if (questionId) {
        await sql`delete from public.question_status_events where question_id = ${questionId}`;
        await sql`delete from public.question_flags where question_id = ${questionId}`;
        await sql`delete from public.questions where id = ${questionId}`;
      }
      for (const uid of userIds) {
        await sql`delete from auth.users where id = ${uid}`;
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
