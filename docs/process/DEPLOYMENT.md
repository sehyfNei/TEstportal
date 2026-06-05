# Deployment Guide

## Status

**Code readiness:** ✅ All 4 Standard gates green (typecheck, build, lint, test — 302/302 pass)

**Production deployment:** ⏸️ Blocked on founder setup

---

## Pre-deployment Checklist

Production deployment cannot proceed autonomously. The following **must be completed by the founder**:

### 1. Vercel Project Setup
- [ ] Vercel project created and linked to this GitHub repo (`C:\Users\Rakesh\OneDrive\Documents\Business\TEST`)
- [ ] Vercel project name decided (e.g., `test-series-portal`)
- [ ] Production domain configured (or use default Vercel domain)

### 2. Environment Variables in Vercel

Configure these secrets in Vercel project settings (Environment Variables):

**Production Keys (required):**
- [ ] `GROQ_API_KEY` — Production Groq API key (get from Groq console)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Production Supabase service role key (from Supabase project settings)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Production Supabase URL (from Supabase dashboard)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Production Supabase anon key (public, from Supabase dashboard)

**Check `.env.example` for any additional vars** — add all non-placeholder keys to Vercel.

⚠️ **CRITICAL:** Never commit secrets to git. `.env.example` must contain only placeholders.

### 3. Supabase Production Database

- [ ] Supabase project created (separate from dev/staging)
- [ ] All migrations applied: `supabase/migrations/*`
  - Run: `supabase db push --db-url "postgresql://..."` (production URL)
- [ ] Auth configured:
  - [ ] Redirect URL whitelisted for production domain (e.g., `https://tsp.vercel.app/auth/callback`)
  - [ ] JWT secret matches Vercel config (auto-fetched if using Supabase CLI)
- [ ] Row-level security (RLS) policies enforced on all tables
- [ ] Service role key secured (use only in server-side code, never in client)

### 4. Security Pre-flight

- [ ] GROQ_API_KEY rotated post-deployment (was briefly exposed in `.env.example` during dev, reverted — no git history, but good practice to rotate)
- [ ] SUPABASE_SERVICE_ROLE_KEY rotated post-deployment
- [ ] API rate limiting configured (if required)
- [ ] CORS headers reviewed (Next.js `middleware.ts` + Supabase CORS settings)

---

## Deployment Steps

### Once prerequisites are complete:

**Step 1: Get approval**
```
Founder: "Deploy to production"
```

**Step 2: Push to main**
```bash
cd C:\Users\Rakesh\OneDrive\Documents\Business\TEST
git checkout main
git merge master  # or rebase, depending on workflow
git push origin main
```

**Step 3: Monitor Vercel deployment**
- Vercel will auto-build from the `main` branch push
- Check Vercel dashboard for build logs
- Expected: `✓ Compiled successfully` (21/21 pages)
- All env vars must be present (if missing, build will fail with clear error)

**Step 4: Verify production**
- [ ] Visit production URL (e.g., `https://tsp.vercel.app`)
- [ ] Smoke test checklist:
  - [ ] Admin login works (`/admin/questions`)
  - [ ] Student login works (`/tests`)
  - [ ] Question preview loads
  - [ ] Test session can be created and submitted
  - [ ] Dashboard shows results
  - [ ] No 500 errors in console

**Step 5: Post-deployment security**
```bash
# Rotate keys in Supabase + Groq consoles
# Add new keys to Vercel env vars
# Verify old keys are revoked
```

---

## Rollback

If production deployment fails or breaks:

1. **Revert main branch:**
   ```bash
   git revert HEAD  # Creates new commit that undoes the broken push
   git push origin main
   ```

2. **Vercel auto-rollback:**
   - Vercel will re-deploy from the previous commit
   - Check Vercel dashboard → Deployments → select previous build

3. **Debug in staging first:**
   - Reproduce the issue in a staging branch if possible
   - Run full gate suite in Test_Portal clone before re-attempting main push

---

## Ongoing Deployments

Once production is live:

- **Preview deployments:** Automatically deploy on PR to main (configured in Vercel)
- **Production deployments:** Merge to main after code review
- **Hotfixes:** Create hotfix branch from main, test in Test_Portal, merge, deploy

---

## Key Decision Points

### Deployment model
- **Preview on PR:** ✅ Recommended (catch issues before merge)
- **Auto-deploy on main:** ✅ Recommended (continuous deployment)
- **Manual approval per deploy:** Optional (add Vercel → Slack notification if desired)

### Database strategy
- **Migrations auto-run:** Configure Vercel post-deploy hook to run `supabase db push` (optional, manual is safer initially)
- **Backups:** Enable Supabase automatic backups (Settings → Backups)

### Monitoring (future)
- Error tracking: Sentry or Vercel Analytics
- Database monitoring: Supabase Monitoring dashboard
- Performance: Vercel Analytics dashboard

---

## Contacts & Resources

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://app.supabase.com
- **Groq API Console:** https://console.groq.com
- **GitHub Repo:** `C:\Users\Rakesh\OneDrive\Documents\Business\TEST`

---

**Last updated:** 2026-06-05 (Session 35 complete, all gates green)
