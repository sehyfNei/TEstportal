# Blockers

Known external dependencies and blocked implementation areas.

---

## Supabase Credentials

Needed values:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

Blocked or partially blocked tasks:

- Real signup/login testing.
- Google OAuth callback testing.
- Profile persistence testing.
- Admin role claim testing.

Current mitigation:

- Code compiles in no-config mode.
- SQL migrations are present in `supabase/migrations`.
- Import validation works without DB writes.
- 2026-05-18: Supabase pooler `DATABASE_URL` was verified, migrations were applied, and direct RPC smoke tests passed for manifest import and admin question CRUD.

Needed next from founder:

- One admin user with `app_metadata.user_role = "admin"` or equivalent `user_role` claim.
- `SUPABASE_SERVICE_ROLE_KEY` for later server-side admin jobs and maintenance flows.

2026-05-15 update:

- Supabase project URL and anon key were provided and placed in local `.env`.
- `node run-migrations.js` reached Supabase but failed with `tenant/user ... not found` for the existing `DATABASE_URL`.
- The direct Postgres URL was updated with the provided password, but Node failed to resolve/connect to the direct DB hostname.
- Pooler retries with both the URL project ref and the anon-token project ref were rejected with `tenant/user ... not found`.
- The anon token decodes to a different project ref than the provided REST URL. Confirm the correct Supabase project and provide the exact Project Settings connection string before migrations can be applied.

2026-05-18 update:

- The new pooler URI/password were tested successfully.
- `node run-migrations.js` applied all migrations through `202605170001_admin_question_crud.sql`.
- `scripts/smoke-manifest-import.js` imported the UPSC seed manifest through `public.import_exam_manifest`.
- `scripts/smoke-question-crud.js` verified create/update/retire RPCs and cleaned up its smoke question.
- Remaining Supabase blocker is browser/server-action verification with a real admin user session.

2026-05-18 review update:

- **Grant bug found in `202605170001`**: migration was missing `grant execute` for all question CRUD RPCs. Fixed in the migration file and re-applied to the live DB.
- After grant verification and admin user creation, the only remaining blocker for TSP-019 and TSP-024 is the browser smoke itself.

2026-05-18 grant follow-up:

- `node run-migrations.js` was re-run after the grant fix.
- `scripts/check-rpc-grants.js` verified authenticated execute privilege for all question CRUD RPC functions.
- Direct manifest import and question CRUD smoke tests were rerun successfully after the grant fix.
- Remaining blocker for TSP-019 and TSP-024 is browser/server-action verification with a real admin user session.

2026-05-30 Session 2 update:

- `node run-migrations.js` failed before applying the new Session 2 migrations with `PostgresError: (ENOTFOUND) tenant/user postgres.iwzerbplanzlzwtiiska not found`.
- This blocks live DB application for `TSP-035`, `TSP-027`, and `TSP-159`, and therefore blocks browser smoke for `TSP-026`.
- Needed next: confirm the current Supabase project and replace `DATABASE_URL` with the exact Project Settings transaction pooler connection string/user for that project.

2026-05-30 Session 3 update:

- The same `DATABASE_URL` error blocks live application of `202605310001_test_session_engine.sql`.
- This blocks DB/RPC smoke for `start_test_session` and `submit_test_session`, and therefore blocks `TSP-039`, `TSP-040`, and `TSP-041` from moving past `Review`.
- After the pooler string is corrected, run `node run-migrations.js`, then `node scripts\check-rpc-grants.js` to verify `set_question_status`, `start_test_session`, and `submit_test_session` grants.

**2026-05-31 RESOLVED — root cause was a PAUSED Supabase project, not a bad `DATABASE_URL`.**

- The connection string was correct all along (`postgres.iwzerbplanzlzwtiiska` @ `aws-1-ap-northeast-2.pooler.supabase.com:6543`). Supavisor returns `tenant/user not found` for a paused project's tenant.
- Founder unpaused the project; connection succeeds immediately.
- All migrations applied live (Session 2 + Session 3). `check-rpc-grants.js`: all 7 RPCs grant `authenticated` execute. Manifest-import, question-CRUD, and the new `smoke-test-session.js` all PASS live (answer isolation + scoring + idempotency verified).
- `TSP-035/039/041/159/027` → `Done`. Remaining: browser smoke for `TSP-019/024/025/026/040/090` once the two users exist.
- **Lesson for future:** if `DATABASE_URL` was previously working, a sudden `tenant/user not found` almost always means the free-tier project auto-paused — check the dashboard and unpause before touching the connection string.

---

## M0/M1 Browser Smoke Users

Needed values:

```text
Admin user with app_metadata.user_role = "admin"
Plain test student
```

Blocked or partially blocked tasks:

- `TSP-019`, `TSP-024`, `TSP-025`, `TSP-026`, and `TSP-090` need admin-browser smoke before Done.
- `TSP-040`, `TSP-043`, and `TSP-044` need a plain student browser pass before Done.
- `TSP-029`, `TSP-030`, `TSP-031`, and `TSP-036` need Sanity review plus admin/student browser smoke before Done.

Current state:

- Session-engine direct smoke passes live.
- Session 4 UI is implemented locally and verified by unit/type/lint/build gates.
- Browser smoke path: login as plain student -> `/tests` -> start -> answer MCQ/MSQ/integer -> submit -> see inline score.
- M2 quality/selection smoke path: login as admin -> edit a question tier/policy -> save; login as plain student -> `/tests` -> start a diagnostic/benchmark/mock session and confirm eligible pools still start without hidden/quarantine questions.
- Session 8 smoke path: login as admin -> `/admin/questions` -> search/filter by text, exam/topic, status, difficulty, quality, exposure, and source; page through results. Login as plain student -> start a diagnostic session and confirm it completes the normal submit path.

---

## Local Dependency Install

Blocked tasks:

- Clean dependency repair through `corepack pnpm install`.
- Any future task that needs missing packages not already linked in the current `node_modules` tree.

Current state:

- `node_modules` currently contains `.pnpm` but is missing top-level package links such as `zod`, `typescript`, `postgres`, and `vitest`.
- `corepack pnpm test -- src/tests/unit/bulk-question-import.test.ts src/tests/unit/admin-question-schema.test.ts` failed before executing tests because package links were missing.
- Offline repair failed because `isomorphic-dompurify@2.36.0` is missing from the local pnpm store.
- Network repair attempt timed out.
- 2026-05-29 Session 1 Builder attempt: `corepack pnpm install` failed with `UNKNOWN: unknown error, read` while pnpm read its modules manifest.
- 2026-05-29 verification note: despite the install failure, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build` passed after elevated reruns.
- 2026-05-29 dev-server follow-up: background `next dev` exited immediately and `node_modules\.bin\next.CMD --version` failed with `The cloud file provider exited unexpectedly`, indicating OneDrive/node_modules hydration is still unreliable.
- 2026-05-31 Session 4 dev-server follow-up: the pnpm shim still exits immediately; the direct Next binary prints `http://127.0.0.1:3000` and then exits with `UNKNOWN: unknown error, read`.
- 2026-05-31 Session 5 dev-server follow-up: `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exits 0 immediately with no server left listening; `curl.exe -I http://127.0.0.1:3000/tests` cannot connect.
- 2026-05-31 Session 6 dev-server follow-up: `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exits 0 immediately with no server left listening; `curl.exe -I http://127.0.0.1:3000/tests` cannot connect.
- 2026-05-31 Session 7 dev-server follow-up: `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exits 0 immediately with no output and no server left listening.
- 2026-06-01 Session 8 dev-server follow-up: `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exits 0 immediately with no output and no server left listening.

Needed next:

- Complete a clean `corepack pnpm install` with network access or repair the modules manifest/top-level package links. If OneDrive keeps dehydrating `node_modules`, move the workspace to a non-synced local path or force the dependency tree to stay offline-available before retrying.

---

## AI Provider Keys

Needed later:

```text
GROQ_API_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
HUGGINGFACE_API_KEY
```

Blocked tasks:

- AI post-test analysis.
- AI question generation.
- Embeddings and semantic duplicate detection.
- HuggingFace auto-tagging.

Current direction:

- Use Groq as the first AI inference provider behind the future provider abstraction.
- Keep OpenAI available for embeddings unless replaced by a later decision.

Needed next from founder:

- `GROQ_API_KEY` before `TSP-066` AI gateway work starts.

---

## Email Provider Key

Needed later:

```text
RESEND_API_KEY
EMAIL_FROM
```

Blocked tasks:

- Password reset delivery in real environment.
- Scheduled test email reminders.
- Weekly digest.

---

## Admin Role Assignment Policy

Needed decision:

- How admin users are created and assigned `user_role = admin`.

Blocked tasks:

- Full admin route enforcement verification.
- Admin-only DB writes through RLS.
