/* eslint-disable @typescript-eslint/no-require-imports */
let postgres;

try {
  postgres = require("postgres");
} catch {
  postgres = require("../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres");
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

  try {
    await sql.unsafe(
      `select set_config(
        'request.jwt.claims',
        '{"role":"authenticated","app_metadata":{"user_role":"admin"}}',
        false
      )`
    );

    const [scope] = await sql`
      select e.id as exam_id, t.id as topic_id
      from public.exams e
      join public.topics t on t.exam_id = e.id
      where e.slug = 'upsc-prelims'
      order by t.level, t.order_index
      limit 1
    `;

    if (!scope) {
      throw new Error("UPSC Prelims exam/topic seed data is required before question CRUD smoke.");
    }

    const contentV1 = {
      text: "Smoke test question: which option is correct?",
      options: ["A", "B", "C", "D"],
      correct_options: [0],
      correct_integer: null,
      pairs: null,
      images: []
    };
    const contentV2 = {
      ...contentV1,
      text: "Smoke test question updated: which option is correct?"
    };

    const [created] = await sql`
      select public.create_admin_question(
        ${scope.exam_id},
        ${scope.topic_id},
        ${null},
        ${"mcq"},
        ${"medium"},
        ${"manual"},
        ${null},
        ${"smoke-test"},
        ${false},
        ${"en"},
        ${"draft"},
        ${"practice"},
        ${"bronze"},
        ${sql.json(contentV1)},
        ${"Smoke explanation."},
        ${null},
        ${"Created by smoke test."}
      ) as result
    `;

    const questionId = created.result.question_id;

    const [updated] = await sql`
      select public.update_admin_question(
        ${questionId},
        ${scope.exam_id},
        ${scope.topic_id},
        ${null},
        ${"mcq"},
        ${"hard"},
        ${"manual"},
        ${null},
        ${"smoke-test"},
        ${false},
        ${"en"},
        ${"validated"},
        ${"practice"},
        ${"silver"},
        ${sql.json(contentV2)},
        ${"Updated smoke explanation."},
        ${null},
        ${"Updated by smoke test."}
      ) as result
    `;

    const [retired] = await sql`
      select public.retire_admin_question(${questionId}) as result
    `;
    const [versionCount] = await sql`
      select count(*)::int as count
      from public.question_versions
      where question_id = ${questionId}
    `;

    await sql`
      delete from public.questions
      where id = ${questionId}
    `;

    console.log(
      JSON.stringify({
        created: created.result,
        updated: updated.result,
        retired: retired.result,
        versionCount: versionCount.count,
        cleanedUp: true
      })
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
