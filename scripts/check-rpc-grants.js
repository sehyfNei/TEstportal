/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
let postgres;

try {
  postgres = require("postgres");
} catch {
  postgres = require("../node_modules/.pnpm/postgres@3.4.9/node_modules/postgres");
}

try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch {
  loadDatabaseUrlFromEnvFile();
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

  try {
    const rows = await sql.unsafe(`
      select
        p.proname,
        has_function_privilege('authenticated', p.oid, 'execute') as can_execute
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'assert_question_topic_scope',
          'create_admin_question',
          'search_admin_questions',
          'set_question_exposure_policy',
          'set_question_quality_tier',
          'set_question_status',
          'start_test_session',
          'submit_test_session',
          'update_admin_question',
          'retire_admin_question'
        )
      order by p.proname
    `);

    console.log(JSON.stringify(rows));

    if (rows.length !== 10 || rows.some((row) => !row.can_execute)) {
      throw new Error("One or more authenticated RPC grants are missing.");
    }
  } finally {
    await sql.end();
  }
}

function loadDatabaseUrlFromEnvFile() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const envPath = path.join(__dirname, "..", ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const databaseUrlLine = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((line) => line.startsWith("DATABASE_URL="));

  if (databaseUrlLine) {
    process.env.DATABASE_URL = databaseUrlLine.slice("DATABASE_URL=".length).trim();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
