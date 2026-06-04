/* eslint-disable @typescript-eslint/no-require-imports */
/*
 * M0 unblock helper — create (or repair) the admin + test-student users.
 *
 * Uses the Supabase Admin API (service_role key) so it can:
 *   - create users with email auto-confirmed (no inbox needed)
 *   - set app_metadata.user_role = "admin" AT CREATION (this is the claim
 *     public.is_admin() trusts: auth.jwt() -> 'app_metadata' ->> 'user_role')
 *   - run idempotently: if a user already exists, it repairs role + confirm
 *
 * Requires in .env (or process.env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY      <-- Dashboard > Project Settings > API > service_role (secret)
 *
 * Optional overrides (env vars):
 *   TEST_ADMIN_EMAIL     (default admin@example.com)
 *   TEST_STUDENT_EMAIL   (default student@example.com)
 *   TEST_ADMIN_PASSWORD  (default: a strong random one, printed once)
 *   TEST_STUDENT_PASSWORD(default: a strong random one, printed once)
 *
 * Run:  node scripts/create-test-users.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// --- load .env (mirror run-migrations.js robustness) ---
try {
  require("dotenv").config();
} catch {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const eq = line.indexOf("=");
      if (eq > 0 && !line.startsWith("#")) {
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

let createClient;
try {
  ({ createClient } = require("@supabase/supabase-js"));
} catch {
  // pnpm leaves no top-level symlink in this workspace; resolve from the .pnpm store.
  const pnpmDir = path.join(__dirname, "..", "node_modules", ".pnpm");
  const match = fs
    .readdirSync(pnpmDir)
    .filter((d) => d.startsWith("@supabase+supabase-js@"))
    .sort()
    .pop();
  if (!match) throw new Error("Could not locate @supabase/supabase-js in node_modules/.pnpm");
  ({ createClient } = require(
    path.join(pnpmDir, match, "node_modules", "@supabase", "supabase-js")
  ));
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "\nMissing config. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.\n" +
      "Get the service_role key from: Supabase Dashboard > Project Settings > API > service_role (secret).\n"
  );
  process.exit(1);
}

function strongPassword() {
  // 18 url-safe chars; meets Supabase's default min length comfortably
  return crypto.randomBytes(14).toString("base64url");
}

const USERS = [
  {
    label: "ADMIN",
    email: process.env.TEST_ADMIN_EMAIL || "admin@example.com",
    password: process.env.TEST_ADMIN_PASSWORD || strongPassword(),
    app_metadata: { provider: "email", providers: ["email"], user_role: "admin" }
  },
  {
    label: "STUDENT",
    email: process.env.TEST_STUDENT_EMAIL || "student@example.com",
    password: process.env.TEST_STUDENT_PASSWORD || strongPassword(),
    app_metadata: { provider: "email", providers: ["email"] }
  }
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findByEmail(email) {
  // paginate listUsers until found (projects with few users resolve on page 1)
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(u) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    app_metadata: u.app_metadata
  });

  if (!error && data.user) {
    return { id: data.user.id, created: true, passwordKnown: true };
  }

  // Already exists (or similar) -> repair role + confirm in place
  const existing = await findByEmail(u.email);
  if (!existing) {
    throw new Error(`createUser failed for ${u.email}: ${error?.message ?? "unknown error"}`);
  }

  const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
    email_confirm: true,
    app_metadata: u.app_metadata
  });
  if (updErr) throw updErr;

  return { id: existing.id, created: false, passwordKnown: false };
}

(async () => {
  console.log(`\nTarget project: ${SUPABASE_URL}\n`);
  const results = [];

  for (const u of USERS) {
    try {
      const r = await ensureUser(u);
      results.push({ ...u, ...r });
      console.log(
        `${r.created ? "CREATED" : "REPAIRED"}  ${u.label.padEnd(7)} ${u.email}  (role=${
          u.app_metadata.user_role || "student"
        })`
      );
    } catch (e) {
      console.error(`FAILED   ${u.label.padEnd(7)} ${u.email}  -> ${e.message}`);
      process.exitCode = 1;
    }
  }

  console.log("\n--- LOGIN CREDENTIALS (store these now) ---");
  for (const r of results) {
    if (r.passwordKnown) {
      console.log(`${r.label}: ${r.email}  /  ${r.password}`);
    } else {
      console.log(
        `${r.label}: ${r.email}  /  (already existed — password unchanged; reset via Dashboard if unknown)`
      );
    }
  }
  console.log(
    "\nNote: if the admin was already signed in, log out and back in so the fresh JWT carries user_role=admin.\n"
  );
  await supabase.auth.stopAutoRefresh?.();
  process.exit(process.exitCode || 0);
})();
