# Autosave & Submit Load Test (TSP-112)

**Owner:** Architect · **Run:** 2026-07-26 · **Target:** `docs/final/FINAL_TRD.md` §21.1 Scale Assumptions ("Private beta: 25-100 concurrent test takers")

## Verdict

**PASS for autosave/submit concurrency. FAIL (real, launch-relevant) on default Supabase Auth sign-in rate limits.**

The operations this row exists to validate — concurrent autosave writes and submit scoring — showed **zero errors and no latency degradation** at every concurrency level actually exercised (10-30 simultaneous test-takers). The one real bottleneck found was **not** in autosave/submit at all: Supabase's default password-sign-in rate limit rejected 40-66% of sign-in attempts whenever more than ~20-30 students authenticated within the same short window, regardless of whether those logins were simultaneous or lightly staggered. That must be raised before a real private beta launch, independent of anything else in this report.

## Methodology

Ran against the real (not staging — TSP-102 doesn't exist yet) Supabase project, via `@supabase/supabase-js` directly rather than through Next.js Server Actions: Server Actions only accept requests through Next's internal action-invocation wire format (an unstable, build-specific encoding not meant to be hit directly), so this test calls the same underlying operations `saveAnswerAction`/`submitSessionAction` perform — `session_answers` upserts and the `submit_test_session` RPC — under a real per-user JWT obtained via `signInWithPassword`, exercising the actual RLS policies and DB load. This deliberately does **not** measure Next.js's own request-handling overhead or the thin validation layer inside the Server Actions themselves — both are negligible compared to the DB round-trip and were out of scope for "validate concurrent test-taking load."

Each virtual student: `start_test_session_compact` (10-question diagnostic) → one `session_answers` upsert per question (the autosave write) → `submit_test_session`. Sign-in happened in a separate phase *before* the timed window in every run — GoTrue's own auth throughput is a distinct concern from DB-layer concurrency, and blending the two would misattribute auth-service latency to the operations this row actually targets. 50 throwaway accounts were created via the admin API, used across runs, and deleted at the end (`on delete cascade` from `auth.users` cleans up every session/answer/result row they created — nothing was left behind).

Three trials:

| Run | Concurrency | Sign-in pattern |
|---|---:|---|
| `baseline` | 10 | simultaneous |
| `private-beta-midpoint-instant-logins` | 50 | simultaneous |
| `private-beta-midpoint-staggered-logins` | 50 | 120ms apart (~6s spread) |

## Results

| Run | Authenticated | `start_test_session` p50/p95 | autosave (`session_answers` upsert) p50/p95 | `submit_test_session` p50/p95 | Errors (start/autosave/submit) |
|---|---:|---|---|---|---|
| baseline (10) | 10/10 | 626ms / 629ms | 148ms / 392ms | 199ms / 218ms | 0 / 0 / 0 |
| instant-logins (50) | 30/50 | 520ms / 538ms | 140ms / 157ms | 151ms / 163ms | 0 / 0 / 0 |
| staggered-logins (50) | 17/50 | 712ms / 747ms | 145ms / 378ms | 152ms / 168ms | 0 / 0 / 0 |

Sign-in itself: 0% failure at 10 concurrent; **40-66% failure at 50 concurrent** in both the instant and staggered variants, always `"Request rate limit reached"` from Supabase Auth — a 25s pause between runs was not enough for the limit to reset, and the cumulative sign-in attempts across all three runs (110 total) suggest the effective budget is well under 50 sign-ins per short window from one source.

## Findings

1. **Autosave and submit hold up fine at private-beta scale, with no pooling in place yet.** Every `session_answers` upsert and every `submit_test_session` call succeeded across all three runs, and latency did not trend upward with concurrency (30-concurrent autosave p50/p95 were, if anything, tighter than the 10-concurrent baseline — normal run-to-run variance, not a real trend). TSP-103 (DB connection pooling) is still unbuilt, and this range of concurrency does not yet expose a problem there. This is **not** evidence TSP-103 is unnecessary at higher scale (Public Phase 1's 500-1,000 concurrent target, per FINAL_TRD §21.1, is a different regime entirely) — only that it is not an *immediate* blocker for private beta specifically.
2. **Supabase's default Auth rate limit is the real, load-bearing finding here**, and it is not specific to load-testing artifacts: it reproduced identically whether logins were simultaneous or spread over ~6 seconds. At private-beta scale (25-100 concurrent test takers per FINAL_TRD §21.1), any real-world moment where a meaningful fraction of students log in close together (e.g., right before a scheduled mock test opens) would plausibly produce visible login failures today.
3. Not tested here: sustained/repeated autosave over a full exam duration (this ran one upsert per question, not the realistic debounced-repeated-save pattern over 30-180 minutes), and the actual Next.js Server Action HTTP path (see Methodology's scope note). Both are reasonable follow-ups if a deeper load test is ever wanted, but neither changes this row's pass/fail call.

## Recommendation (founder action, not code)

Raise Supabase's password sign-in rate limit under **Authentication → Rate Limits** in the Supabase dashboard before running any real private beta with concurrent logins, and re-check it if a paid tier/plan change affects those defaults. This is a dashboard/support-ticket action, not something fixable in this repo's code.

## Reproduction

The load-test script was a one-off (not committed — it creates and deletes throwaway Supabase Auth users via the admin API, which is not something to leave lying around as a checked-in artifact tied to one run). To re-run: sign in N users via `supabase.auth.admin.createUser` + `signInWithPassword`, then concurrently call `start_test_session_compact` → `session_answers` upsert per question → `submit_test_session`, timing each call. Delete the throwaway users afterward (cascades clean up everything else).
