/* eslint-disable @typescript-eslint/no-require-imports */
let postgres;

try {
  postgres = require("postgres");
} catch {
  postgres = require("../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres");
}

const fs = require("fs");
const path = require("path");

function flattenTopics(topics, parentSlug = null, level = 1) {
  return topics.flatMap((topic, orderIndex) => {
    const current = {
      slug: topic.slug,
      name: topic.name,
      description: topic.description ?? null,
      weight_percent: topic.weightPercent ?? null,
      parent_slug: parentSlug,
      level,
      order_index: orderIndex
    };

    return [current, ...flattenTopics(topic.children ?? [], topic.slug, level + 1)];
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const manifestPath = path.join(
    process.cwd(),
    "supabase",
    "seed",
    "upsc-prelims.manifest.json"
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const topics = flattenTopics(manifest.topics);
  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

  try {
    await sql.unsafe(
      `select set_config(
        'request.jwt.claims',
        '{"role":"authenticated","app_metadata":{"user_role":"admin"}}',
        false
      )`
    );

    const [result] = await sql`
      select public.import_exam_manifest(${sql.json(manifest)}, ${sql.json(topics)}) as result
    `;
    const examId = result.result.exam_id;
    const [counts] = await sql`
      select
        (select count(*)::int from public.topics where exam_id = ${examId}) as topics,
        (select count(*)::int from public.concepts where exam_id = ${examId}) as concepts,
        (select count(*)::int from public.concept_clusters where exam_id = ${examId}) as clusters,
        (select count(*)::int from public.historical_cutoffs where exam_id = ${examId}) as cutoffs
    `;

    console.log(JSON.stringify({ import: result.result, counts }));
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
