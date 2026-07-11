# Test Series Portal

Production-ready modular test series and self-study portal for competitive exams.

## Read First

For any new agent or session:

1. `docs/final/PRODUCT_VISION.md`
2. `docs/process/HANDOFF.md`
3. `docs/process/AGENT_WORKFLOW.md`
4. `docs/process/SESSION_STATE.md`
5. `trackers/JIRA_TRACKER.csv`

## Source Of Truth

- Product vision and phase boundaries: `docs/final/PRODUCT_VISION.md`
- Product requirements: `docs/final/FINAL_PRD.md`
- Technical requirements: `docs/final/FINAL_TRD.md`
- Task tracker: `trackers/JIRA_TRACKER.csv`
- Decisions: `docs/process/DECISIONS.md`
- Blockers: `docs/process/BLOCKERS.md`
- Changelog: `docs/process/CHANGELOG.md`

## Artifact Layout

- `docs/final/` - canonical PRD and TRD.
- `docs/process/` - workflow, handoff, session state, decisions, blockers, and changelog.
- `docs/agents/` - agent-specific drafts and brainstorm documents.
- `docs/archive/` - original pre-merge PRD/TRD drafts.
- `trackers/` - Jira-style CSV tracker files.
- `src/`, `supabase/`, `.github/`, and config files - implementation source.

## Common Commands

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Start local dev server:

```powershell
corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000
```
