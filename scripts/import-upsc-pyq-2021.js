/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "upsc-pyq", "2021-gs1.json");
const SOURCE_PREFIX = "upsc-cse-prelims-2021-gs1-series-a-q-";
const TOPIC_DEFINITIONS = {
  "ancient-medieval-art-culture": {
    name: "Ancient, Medieval History and Art & Culture",
    description: "Ancient and medieval Indian history, archaeology, architecture, literature, religion, and visual culture.",
    weightPercent: 8,
    orderIndex: 2
  }
};

loadEnv(path.join(__dirname, "..", ".env"));

let postgres;
try {
  postgres = require("postgres");
} catch {
  const pnpmRoot = path.join(__dirname, "..", "node_modules", ".pnpm");
  const packageDir = fs.readdirSync(pnpmRoot).filter((name) => name.startsWith("postgres@")).sort().pop();
  postgres = require(path.join(pnpmRoot, packageDir, "node_modules", "postgres"));
}

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length !== 100) throw new Error("Expected exactly 100 UPSC 2021 questions.");
  const numbers = new Set();
  const references = new Set();
  for (const row of rows) {
    if (!Number.isInteger(row.questionNumber) || row.questionNumber < 1 || row.questionNumber > 100) {
      throw new Error(`Invalid question number: ${row.questionNumber}`);
    }
    if (numbers.has(row.questionNumber)) throw new Error(`Duplicate question number: ${row.questionNumber}`);
    numbers.add(row.questionNumber);
    if (row.sourceReference !== SOURCE_PREFIX + String(row.questionNumber).padStart(3, "0")) {
      throw new Error(`Invalid source reference for question ${row.questionNumber}.`);
    }
    if (references.has(row.sourceReference)) throw new Error(`Duplicate source reference: ${row.sourceReference}`);
    references.add(row.sourceReference);
    if (row.year !== 2021 || row.series !== "A" || row.source !== "pyq" || row.status !== "draft") {
      throw new Error(`Invalid provenance or review status for question ${row.questionNumber}.`);
    }
    if (!row.topicSlug || !["easy", "medium", "hard"].includes(row.difficulty)) {
      throw new Error(`Invalid topic or difficulty for question ${row.questionNumber}.`);
    }
    if (
      !row.content?.text ||
      !Array.isArray(row.content.options) ||
      row.content.options.length !== 4 ||
      row.content.options.some((option) => typeof option !== "string" || !option || option === "[object Object]")
    ) {
      throw new Error(`Invalid MCQ content for question ${row.questionNumber}.`);
    }
    if (!row.explanation || !row.explanationDetail) throw new Error(`Missing explanation for question ${row.questionNumber}.`);
    if (row.questionNumber === 80) {
      if (!row.isContested || row.content.official_answer !== "DROPPED" || row.exposurePolicy !== "hidden") {
        throw new Error("Question 80 must be hidden and marked dropped/contested.");
      }
      if (row.content.correct_options) throw new Error("Dropped question 80 must not have a scoring key.");
    } else if (
      row.isContested ||
      !Array.isArray(row.content.correct_options) ||
      row.content.correct_options.length !== 1 ||
      ![0, 1, 2, 3].includes(row.content.correct_options[0])
    ) {
      throw new Error(`Invalid official answer for question ${row.questionNumber}.`);
    }
  }
  for (let number = 1; number <= 100; number += 1) {
    if (!numbers.has(number)) throw new Error(`Missing question number: ${number}`);
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function existingMatches(existing, row, topicId) {
  let content = existing.content;
  if (existing.content_type !== "object") return false;
  if (typeof content === "string") content = JSON.parse(content);
  return (
    existing.topic_id === topicId &&
    existing.type === row.type &&
    existing.difficulty === row.difficulty &&
    existing.is_contested === row.isContested &&
    existing.language === row.language &&
    existing.status === row.status &&
    existing.exposure_policy === row.exposurePolicy &&
    existing.quality_tier === row.qualityTier &&
    stableJson(content) === stableJson(row.content) &&
    existing.explanation === row.explanation &&
    existing.explanation_detail === row.explanationDetail &&
    existing.reviewer_notes === row.reviewerNotes
  );
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const rows = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  validateRows(rows);

  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  try {
    const [exam] = await sql`select id from public.exams where slug = 'upsc-prelims' limit 1`;
    if (!exam) throw new Error("UPSC exam slug upsc-prelims was not found.");
    const [admin] = await sql`select id from auth.users where email = 'admin@example.com' limit 1`;
    if (!admin) throw new Error("admin@example.com was not found.");

    const result = await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: "authenticated", sub: admin.id, app_metadata: { user_role: "admin" } })}, true)`;
      await tx`select set_config('request.jwt.claim.sub', ${admin.id}, true)`;

      const topicRows = await tx`select id, slug from public.topics where exam_id = ${exam.id}`;
      const topicIds = new Map(topicRows.map((topic) => [topic.slug, topic.id]));
      for (const topicSlug of new Set(rows.map((row) => row.topicSlug))) {
        if (topicIds.has(topicSlug)) continue;
        const definition = TOPIC_DEFINITIONS[topicSlug];
        if (!definition) throw new Error(`Unknown topic slug: ${topicSlug}`);
        const [topic] = await tx`
          insert into public.topics (exam_id, parent_id, slug, name, description, level, weight_percent, order_index)
          values (
            ${exam.id}, null, ${topicSlug}, ${definition.name}, ${definition.description},
            1, ${definition.weightPercent}, ${definition.orderIndex}
          )
          on conflict (exam_id, slug) do update set
            name = excluded.name,
            description = excluded.description,
            weight_percent = excluded.weight_percent,
            order_index = excluded.order_index
          returning id
        `;
        topicIds.set(topicSlug, topic.id);
      }

      const existingRows = await tx`
        select
          q.id, q.topic_id, q.type, q.difficulty, q.source_reference, q.is_contested,
          q.language, q.status, q.exposure_policy, q.quality_tier,
          v.content, jsonb_typeof(v.content) as content_type,
          v.explanation, v.explanation_detail, v.reviewer_notes
        from public.questions q
        join public.question_versions v on v.id = q.current_version_id
        where q.exam_id = ${exam.id}
          and q.source = 'pyq'
          and q.source_year = 2021
          and q.source_reference like ${SOURCE_PREFIX + "%"}
      `;
      const existing = new Map(existingRows.map((row) => [row.source_reference, row]));
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const row of rows) {
        const topicId = topicIds.get(row.topicSlug);
        const existingRow = existing.get(row.sourceReference);
        if (existingRow) {
          if (existingMatches(existingRow, row, topicId)) {
            skipped += 1;
            continue;
          }
          const rpcResult = await tx`
            select update_admin_question(
              ${existingRow.id}::uuid,
              ${exam.id}::uuid,
              ${topicId}::uuid,
              null::uuid,
              ${row.type},
              ${row.difficulty},
              ${row.source},
              ${row.sourceYear}::int,
              ${row.sourceReference},
              ${row.isContested},
              ${row.language},
              ${row.status},
              ${row.exposurePolicy},
              ${row.qualityTier},
              ${tx.json(row.content)},
              ${row.explanation},
              ${row.explanationDetail},
              ${row.reviewerNotes}
            ) as result
          `;
          if (!rpcResult?.[0]?.result) throw new Error(`Update failed for question ${row.questionNumber}.`);
          updated += 1;
          continue;
        }
        const rpcResult = await tx`
          select create_admin_question(
            ${exam.id}::uuid,
            ${topicId}::uuid,
            null::uuid,
            ${row.type},
            ${row.difficulty},
            ${row.source},
            ${row.sourceYear}::int,
            ${row.sourceReference},
            ${row.isContested},
            ${row.language},
            ${row.status},
            ${row.exposurePolicy},
            ${row.qualityTier},
            ${tx.json(row.content)},
            ${row.explanation},
            ${row.explanationDetail},
            ${row.reviewerNotes}
          ) as result
        `;
        if (!rpcResult?.[0]?.result) throw new Error(`Import failed for question ${row.questionNumber}.`);
        created += 1;
      }
      return { created, updated, skipped };
    });

    const [count] = await sql`
      select count(*)::int as total
      from public.questions
      where exam_id = ${exam.id}
        and source = 'pyq'
        and source_year = 2021
        and source_reference like ${SOURCE_PREFIX + "%"}
    `;
    if (count.total !== 100) throw new Error(`Post-import verification expected 100 rows, found ${count.total}.`);
    console.log(`UPSC 2021 GS I import complete: created=${result.created}, updated=${result.updated}, skipped=${result.skipped}, verified=${count.total}`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});



