/* eslint-disable @typescript-eslint/no-require-imports */
let postgres;

try {
  postgres = require('postgres');
} catch {
  postgres = require('./node_modules/.pnpm/postgres@3.4.9/node_modules/postgres');
}
const fs = require('fs');
const path = require('path');
try {
  require('dotenv').config();
} catch {
  const envPath = path.join(__dirname, '.env');

  if (fs.existsSync(envPath)) {
    const databaseUrlLine = fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .find((line) => line.startsWith('DATABASE_URL='));

    if (databaseUrlLine && !process.env.DATABASE_URL) {
      process.env.DATABASE_URL = databaseUrlLine.slice('DATABASE_URL='.length).trim();
    }
  }
}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`Applying migration: ${file}...`);
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await sql.unsafe(content);
      console.log(`Migration ${file} applied successfully.`);
    } catch (err) {
      console.error(`Error applying migration ${file}:`, err);
      process.exit(1);
    }
  }

  console.log('All migrations applied.');
  process.exit(0);
}

runMigrations();
