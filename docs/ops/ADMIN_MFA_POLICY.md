# Admin MFA Policy (TSP-106)

**Owner:** Founder (enrollment) / Architect (enforcement) · **Created:** 2026-07-13

## Policy

Every account with `app_metadata.user_role = "admin"` **must enroll a TOTP factor before production launch**. Admin accounts without MFA must not exist once real users are on the platform.

## Enforcement (in code today)

`src/lib/auth/require-admin.ts` checks the session's Authenticator Assurance Level on every admin page load (`requireAdmin`) and every admin server action (`requireAdminForAction`):

- Factor enrolled but not verified this session (`nextLevel = aal2`, `currentLevel = aal1`) → **blocked**: pages redirect with `mfa_required`, actions return "Multi-factor verification required."
- Session verified with MFA (`aal2`) → allowed.
- No factor enrolled (`nextLevel = aal1`) → allowed by code; **forbidden by this policy** before launch.
- Assurance check errors → allowed (fail-open). Rationale: the primary gate is still the `app_metadata` role check ([auth role rule](../process/DECISIONS.md)); failing closed on an availability blip would lock all admin operations with no self-serve recovery for a single-admin team.

**TODO (flip after founder enrolls):** once `admin@example.com` (and any future admin) has a verified TOTP factor, change the no-factor and error branches to fail-closed and update the tests. Tracked as the follow-up in TSP-106's tracker remark.

## Founder enrollment steps

1. Supabase Dashboard → Authentication → Users → the admin user → Multi-Factor → require re-authentication, **or** log into the app and call `supabase.auth.mfa.enroll({ factorType: "totp" })` from the browser console on an authed session, scan the QR into an authenticator app, then `mfa.challenge()` + `mfa.verify()`.
2. Log out and back in; verify the TOTP prompt appears and `/admin` loads only after entering the code (session reaches `aal2`).
3. Store recovery: keep the TOTP secret QR screenshot in the founder password manager.

## Verification

Unit tests in `src/tests/unit/auth-guard.test.ts` cover: step-up required when enrolled-but-unverified, aal2 accepted, fail-open on error, and the standing rule that `user_metadata` is never trusted.
