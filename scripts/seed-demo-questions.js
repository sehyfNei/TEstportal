/* eslint-disable @typescript-eslint/no-require-imports */
/*
 * M0 demo content seeder — creates a small set of LIVE MCQ questions so a real
 * diagnostic/topic test can be taken and the flag -> quarantine flow exercised.
 *
 * One live MCQ per topic of the UPSC exam (18 questions). Idempotent: tags each
 * with source_reference = 'demo-seed-v1' and skips if already present.
 *
 * Uses DATABASE_URL (direct pooler connection) + admin JWT claims via set_config,
 * the same pattern as scripts/smoke-mistake-items.js, so create_admin_question /
 * set_question_status pass their is_admin() guard. Runs on a single connection
 * (max:1) so the session-level claims persist across statements.
 *
 * Run:  node scripts/seed-demo-questions.js
 */

const fs = require("fs");
const path = require("path");

if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, "..", ".env");
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("DATABASE_URL="));
  if (line) process.env.DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
}

let postgres;
try {
  postgres = require("postgres");
} catch {
  const d = path.join(__dirname, "..", "node_modules", ".pnpm");
  const m = fs.readdirSync(d).filter((x) => x.startsWith("postgres@")).sort().pop();
  postgres = require(path.join(d, m, "node_modules", "postgres"));
}

const SOURCE_REF = "demo-seed-v1";
const TIERS = ["gold", "silver", "bronze"];
const DIFFICULTIES = ["easy", "medium", "hard"];

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

async function setAdminClaims(adminId) {
  await sql`
    select set_config(
      'request.jwt.claims',
      ${JSON.stringify({ role: "authenticated", sub: adminId, app_metadata: { user_role: "admin" } })},
      false
    )
  `;
  await sql`select set_config('request.jwt.claim.sub', ${adminId}, false)`;
}

(async () => {
  const [exam] = await sql`select id, name from public.exams where slug = 'upsc-prelims' limit 1`;
  if (!exam) {
    console.error("UPSC exam (slug=upsc-prelims) not found. Import the manifest first.");
    process.exit(1);
  }

  const [admin] = await sql`select id from auth.users where email = 'admin@example.com' limit 1`;
  if (!admin) {
    console.error("admin@example.com not found. Run scripts/create-test-users.js first.");
    process.exit(1);
  }

  const [existing] = await sql`
    select count(*)::int n
    from public.questions
    where exam_id = ${exam.id} and source_reference = ${SOURCE_REF}
  `;
  if (existing.n > 0) {
    const [live] = await sql`
      select count(*)::int n from public.questions where exam_id = ${exam.id} and status = 'live'
    `;
    console.log(`Already seeded (${existing.n} demo questions present). Live questions for exam: ${live.n}. Nothing to do.`);
    await sql.end();
    return;
  }

  const topics = await sql`select id, name from public.topics where exam_id = ${exam.id} order by slug`;
  if (topics.length === 0) {
    console.error("No topics found for the exam.");
    process.exit(1);
  }

  await setAdminClaims(admin.id);

  let created = 0;
  for (const [index, topic] of topics.entries()) {
    const correct = index % 4;
    const content = {
      text: `[Demo] Which of the following statements about "${topic.name}" is correct? (option ${String.fromCharCode(65 + correct)} is the intended answer)`,
      options: [
        `Statement A about ${topic.name}`,
        `Statement B about ${topic.name}`,
        `Statement C about ${topic.name}`,
        `Statement D about ${topic.name}`
      ],
      correct_options: [correct],
      correct_integer: null,
      pairs: null,
      images: []
    };

    const [row] = await sql`
      select public.create_admin_question(
        ${exam.id}, ${topic.id}, ${null}, ${"mcq"}, ${DIFFICULTIES[index % 3]},
        ${"manual"}, ${null}, ${SOURCE_REF}, ${false}, ${"en"}, ${"draft"},
        ${"practice"}, ${TIERS[index % 3]}, ${sql.json(content)},
        ${`The correct option is ${String.fromCharCode(65 + correct)}. (Demo seed for smoke testing.)`},
        ${null}, ${"Seeded by seed-demo-questions.js"}
      ) as result
    `;
    const questionId = row.result.question_id;
    await sql`select public.set_question_status(${questionId}, ${"live"}, ${"demo seed to live"}) as result`;
    created++;
  }

  const [live] = await sql`
    select count(*)::int n from public.questions where exam_id = ${exam.id} and status = 'live'
  `;
  console.log(`Seeded ${created} live demo questions across ${topics.length} topics.`);
  console.log(`Total live questions for "${exam.name}": ${live.n}.`);
  console.log("You can now start a diagnostic at /tests and exercise flag -> quarantine.");
  await sql.end();
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
