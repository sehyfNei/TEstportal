# Google Login Setup (TSP-010)

**Owner:** Founder · **Status:** code shipped; provider config pending

The "Continue with Google" button is live on /login and /register. Until you complete the two steps
below it shows a friendly "not configured" message and email/password keeps working — nothing breaks.

## Step 1 — Google Cloud Console (~10 min)

1. Go to https://console.cloud.google.com/ → create (or pick) a project, e.g. "Test Series Portal".
2. **APIs & Services → OAuth consent screen**: External · app name "Test Series Portal" · your support
   email · add your domain later when you have one. Publish the app (Testing mode also works for now,
   but only listed test users can sign in).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI (exactly one, from your Supabase project):
     `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`
     (Find it in Supabase Dashboard → Authentication → Providers → Google — it shows the callback URL to copy.)
4. Copy the **Client ID** and **Client secret**.

## Step 2 — Supabase Dashboard (~2 min)

1. **Authentication → Providers → Google**: toggle **Enabled**, paste the Client ID and Client secret, save.
2. **Authentication → URL Configuration**:
   - Site URL: your deployed app URL (or `http://localhost:3000` while testing locally).
   - Redirect URLs: add `<app-url>/auth/callback` (e.g. `http://localhost:3000/auth/callback` and the
     production equivalent once deployed).

## Verify

/login → "Continue with Google" → pick account → you should land on /dashboard signed in.
A Google-created account gets a normal student profile; admin remains governed by
`app_metadata.user_role` (never granted by OAuth), so there is no privilege risk in enabling this.

## Notes

- No code changes are needed when you finish the config — the button starts working immediately.
- Password reset stays email/password-only; Google users simply don't need it.
