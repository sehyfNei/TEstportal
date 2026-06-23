# Final Product Requirements Document
## Relay — AI-Driven Development Lifecycle (AIDLC) Harness

**Version:** 1.0 Draft
**Date:** 2026-06-23
**Status:** Initial requirements for founder review and implementation planning
**Product codename:** Relay

---

## 1. Executive Summary

Relay is a configurable multi-agent development harness that automates the software development lifecycle using AI agents in sequential, role-specialized roles. Unlike fully autonomous AI coding tools that trade control for speed, Relay is built around a disciplined loop: AI does the work, humans stay in control.

The core loop:

```
Task Picker → Architect Agent → Builder Agent → Sanity Tester Agent
     ↑              ↓                 ↓                  ↓
  Tracker      Plan written      Code written       Pass/Fail logged
  (CSV/JIRA/   to Handoff Bus    Gates run          Tracker updated
   Linear)                       Commit staged      Human approved
```

Every agent role is configurable to any AI provider — Claude for architecture, GPT-4o for building, Gemini for sanity review. The same core engine powers a solo CLI (`relay run`) and a team web dashboard with approval gates, JIRA sync, and Slack notifications.

---

## 2. Product Vision

### 2.1 Vision Statement

Make disciplined, auditable, multi-agent software development accessible to any solo developer or engineering team — without locking them into a single AI provider or sacrificing human oversight.

### 2.2 Core Positioning

| Competitor | Their bet | Relay's bet |
|---|---|---|
| Devin / OpenHands | Full autonomy — AI drives everything | Disciplined autonomy — AI drives, humans approve at gates |
| CrewAI / AutoGen | Framework for building agents | Opinionated product for shipping software |
| GitHub Copilot | In-editor suggestion | End-to-end lifecycle orchestration |
| Cursor | Fast single-agent coding | Multi-agent role specialization + discipline layer |

**Lead message:** "AI does the work. You stay in control."

### 2.3 Differentiators

| Area | Differentiator |
|---|---|
| Provider flexibility | Any role maps to any AI provider; swap without changing workflow |
| Discipline layer | Typecheck / lint / test / build gates are first-class, not optional |
| Human checkpoints | Configurable approval gates before commit, migrate, push, or deploy |
| Audit trail | Every agent's plan, output, gate result, and decision is appended to a persistent Handoff Bus |
| Tracker integration | CSV, GitHub Issues, JIRA, Linear — task selection, status updates, and builder remarks are automated |
| Role specialization | Architect (reasoning), Builder (code gen), Sanity Tester (critic) — different strengths, different models |
| No vendor lock-in | Anthropic, OpenAI, Google, local models — switch per role, per project, per run |

---

## 3. Problem Statement

Engineering teams and solo developers using AI coding tools today face five recurring problems:

1. **No discipline layer.** AI tools generate code but do not run typecheck, lint, or tests before declaring success. Human developers discover failures manually, often hours later.
2. **No audit trail.** Autonomous agents make architectural decisions with no record of why. Debugging or reverting AI decisions is expensive.
3. **No role specialization.** A single model handles planning, coding, and review — even though reasoning, code generation, and critique favor different model types and temperatures.
4. **No tracker integration.** AI tools have no awareness of what task to work on, what is already done, or where to record progress. Status management stays manual.
5. **Provider lock-in.** Tools are built around one AI vendor. Cost spikes, model quality regressions, or rate limits have no fallback.

Relay addresses all five with a single, composable harness.

---

## 4. Target Users

### 4.1 Solo Developer

- Individual engineers building production software with AI assistance.
- Wants speed without sacrificing code quality or losing control of their codebase.
- Comfortable with CLI tools and YAML config.
- Uses GitHub Issues or a CSV tracker for task management.
- Values: fast setup, no babysitting, visible gate output, easy approval prompts.

### 4.2 Engineering Team

- Small-to-mid sized software teams (2–20 engineers).
- Wants AI to handle implementation grunt work while senior engineers review and approve.
- Uses JIRA, Linear, or GitHub Projects for task management.
- Has existing CI/CD pipelines; wants Relay to sit before merge, not replace CI.
- Values: web dashboard for visibility, role-based approvals, Slack notifications, JIRA sync.

### 4.3 AI-Forward Engineering Manager

- Manages a team adopting AI tooling; responsible for output quality and velocity.
- Wants auditability: what did the AI decide, why, and who approved.
- Wants cost tracking across providers and runs.
- Values: audit log, cost dashboard, per-project provider config, compliance-friendly outputs.

---

## 5. User Journeys

### 5.1 Solo Developer — First Run

1. `npm install -g relay-cli`
2. `relay init` in their repo → generates `relay.config.yaml` with defaults (Claude for all roles).
3. Developer adds their Anthropic API key to `.env`.
4. `relay run` → Relay reads their tracker (GitHub Issues or CSV), picks the next open task, runs Architect, outputs a plan to terminal and `HANDOFF.md`.
5. Developer reviews the plan. Relay prompts: `Proceed to Builder? [y/n]`.
6. Builder runs → writes code → gate runner executes typecheck / lint / test / build.
7. All gates pass → Relay prompts: `Commit and continue? [y/n]`.
8. Developer approves → commit created → tracker updated → Sanity Tester runs.
9. Sanity Tester outputs pass/fail findings → Relay prompts: `Mark task Done? [y/n]`.
10. Task closed. Next task begins or session ends.

### 5.2 Solo Developer — Gate Failure

1. Builder writes code → gate runner executes → typecheck fails (3 errors).
2. Relay shows exact error output. Prompts: `Auto-fix with Builder? [y/n/view]`.
3. Developer approves → Builder re-runs with error context → fixes applied → gates re-run.
4. If second pass fails → Relay marks task `Blocked`, writes error to Handoff Bus, stops.
5. Developer can resume with `relay resume <task-id>`.

### 5.3 Team — Task Approval Flow

1. Task assigned in JIRA → Relay picks it up (webhook or polling).
2. Architect runs → plan written to Handoff Bus → Slack notification sent to tech lead.
3. Tech lead reviews plan in web UI → approves or requests changes.
4. Builder runs → code written → gates pass → PR created (or commit staged).
5. Web UI shows diff, gate results, Builder notes → team member approves.
6. Sanity Tester runs → findings in web UI → task closes.
7. Full audit log stored in database: who approved, what AI decided, which gates ran.

### 5.4 Provider Switch Mid-Project

1. Developer notices Builder (OpenAI) producing low-quality TypeScript.
2. Opens `relay.config.yaml` → changes `builder.provider: openai` to `builder.provider: claude`.
3. `relay run` on the next task uses Claude for building, Architect and Sanity unchanged.
4. No other config change needed. Cost and latency reflected in run log.

---

## 6. Feature Requirements

### 6.1 Core Engine (required for both tiers)

#### CE-01 Task Picker
- Reads task backlog from configured source (CSV, GitHub Issues, JIRA, Linear).
- Filters tasks: status is `Backlog` or `To Do`, dependencies are `Done`.
- Respects priority ordering and milestone sequencing if defined.
- Sets picked task to `In Progress` in tracker before handing to Architect.
- Supports manual task override: `relay run --task TSP-171`.

#### CE-02 Context Assembler
- Reads relevant source files, recent git log, open tasks, Handoff Bus entries.
- Assembles a structured context object passed to each agent role.
- Configurable context depth (file count, git history length, handoff lookback).
- Excludes secrets, `.env`, node_modules, and generated files automatically.

#### CE-03 Agent Router
- Maps each role (architect, builder, sanity_tester) to a configured provider + model.
- Passes context + role-specific system prompt to the provider.
- Supports temperature, max_tokens, and json_mode overrides per role.
- Retries on rate limit (configurable max retries + backoff).
- Falls back to a secondary provider if primary fails (optional, configurable).

#### CE-04 Gate Runner
- Executes an ordered list of shell commands after Builder completes.
- Captures stdout, stderr, and exit code per command.
- Stops on first non-zero exit (configurable: `fail_fast: true/false`).
- Reports per-gate pass/fail with output to Handoff Bus and terminal/UI.
- Supports custom gates: any shell command counts as a gate.

#### CE-05 Handoff Bus
- Append-only log of every agent's input, output, gate results, and human decisions.
- Solo mode: writes to `HANDOFF.md` in the repo (human-readable markdown).
- Team mode: writes to database (queryable, web UI viewable).
- Each entry includes: timestamp, agent role, provider + model used, task ID, content, gate results, human approval status.

#### CE-06 Checkpoint System
- Configurable gate before each irreversible action: commit, push, DB migrate, PR create.
- Solo mode: terminal prompt (`y/n/view/skip`).
- Team mode: web UI approval card + Slack/email notification.
- `view` opens the diff or gate output in the terminal pager.
- Timeout behavior configurable: auto-approve after N minutes or auto-reject.

#### CE-07 Tracker Updater
- After each successful agent run, writes back to the tracker:
  - Status update (In Progress → Review → Done).
  - Built By field (agent role + provider name).
  - Builder Remarks (auto-generated from Builder's output summary).
  - Gate results (pass/fail per gate, appended to remarks).
- Supports CSV write-back, GitHub Issues labels+comments, JIRA transitions, Linear state changes.

### 6.2 CLI Shell — Solo Tier

#### CLI-01 Init
- `relay init` — scaffolds `relay.config.yaml`, `.env.example`, and `HANDOFF.md` in the repo.
- Detects existing tracker files (CSV, GitHub repo) and pre-fills config.
- Validates API keys on init with a test call.

#### CLI-02 Run
- `relay run` — picks next task, runs full Architect → Builder → Sanity loop.
- `relay run --task <id>` — targets a specific task.
- `relay run --role architect` — runs only the Architect step (plan only).
- `relay run --dry-run` — assembles context and shows what would run, no AI calls.
- Live streaming output to terminal as agents produce tokens.

#### CLI-03 Approve
- `relay approve` — manually trigger a pending checkpoint if the session was interrupted.
- `relay approve --skip-gates` — approve without re-running gates (explicit, logged).

#### CLI-04 Log
- `relay log` — shows last N Handoff Bus entries in terminal (paged).
- `relay log --task <id>` — shows all entries for a specific task.
- `relay log --json` — outputs raw JSON for piping.

#### CLI-05 Status
- `relay status` — shows current task queue, in-progress task, and gate state.
- `relay status --providers` — shows configured providers and tests connectivity.

#### CLI-06 Cost
- `relay cost` — shows total token usage and estimated cost per provider per session/day/week.

### 6.3 Web Shell — Team Tier

#### WEB-01 Dashboard
- Overview of all active projects, current in-progress tasks, and recent run results.
- Per-project pipeline view: task → Architect → Builder → Gates → Sanity → Done.
- Color-coded gate status (green/red/pending per gate).

#### WEB-02 Run Log
- Full Handoff Bus viewer: per-task timeline of agent inputs, outputs, gate results, approvals.
- Expandable per-agent entries with formatted plan/code/findings.
- Filter by task, agent role, provider, status, date.

#### WEB-03 Approval UI
- Pending approvals surface as cards: shows task, agent output, gate results, diff (if commit).
- Approve / Request Changes / Reject — with optional comment.
- Approval records include approver identity, timestamp, and comment.

#### WEB-04 Team Management
- Org and project model: one org can have multiple projects.
- Role-based access: Admin (full), Reviewer (approve only), Viewer (read only).
- Per-project provider config: override global defaults at project level.

#### WEB-05 Tracker Integration
- JIRA: OAuth connection, project + board selection, two-way status sync.
- Linear: OAuth connection, team + cycle selection, two-way state sync.
- GitHub Issues: PAT or GitHub App, label-based status mapping.
- Webhook inbound: trigger a run when a task is moved to a configured status.

#### WEB-06 Notifications
- Slack: post approval request to configured channel when Architect plan is ready.
- Email: send approval request to configured reviewer on gate pass.
- Configurable per-project: which events trigger which notifications.

#### WEB-07 Cost Dashboard
- Per-project, per-run, per-provider token usage and USD cost.
- Daily / weekly / monthly aggregation.
- Budget alert: notify when estimated monthly cost exceeds configured threshold.
- Per-role cost breakdown (how much did Architect vs Builder vs Sanity cost).

#### WEB-08 Audit Log
- Immutable record of every decision: who approved, which agent ran, what model, what output, which gates passed.
- Exportable as JSON or CSV for compliance.
- Retention configurable (30/90/365 days).

### 6.4 Provider Adapters

#### PA-01 Anthropic (Claude)
- Supports all Claude models: claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5.
- Tool use: read_file, write_file, list_files, run_command, search_codebase.
- Streaming output to terminal and web UI.

#### PA-02 OpenAI
- Supports GPT-4o, GPT-4o-mini, o1, o3 models.
- Function calling mapped to same tool interface as Claude adapter.
- Streaming support.

#### PA-03 Google (Gemini)
- Supports Gemini 2.5 Pro, Gemini 2.0 Flash.
- Function declarations mapped to tool interface.
- Streaming support.

#### PA-04 Local / Custom
- Ollama-compatible endpoint (llama3, mistral, codestral, etc.).
- OpenAI-compatible REST endpoint (any server implementing the chat completions API).
- No streaming required for local adapters (optional).

### 6.5 Non-Functional Requirements

#### NFR-01 Latency
- Gate runner executes within 60 seconds for standard Next.js / TypeScript stacks.
- Architect output streams to terminal; first token within 5 seconds.
- Web UI approval card appears within 30 seconds of gate completion.

#### NFR-02 Reliability
- Agent call failures retry up to 3 times with exponential backoff before marking a run as failed.
- Gate runner failures do not lose prior agent output — Handoff Bus is written before gates run.
- Database writes in team mode are transactional; partial failures roll back.

#### NFR-03 Security
- API keys stored in `.env` (solo) or environment secrets / vault (team).
- API keys never written to Handoff Bus, git, or logs.
- Tool permissions are explicit: write_file requires confirmation for files outside the configured working directory.
- Checkpoint system cannot be bypassed without explicit `--skip-checkpoints` flag, which is logged.

#### NFR-04 Portability
- CLI runs on macOS, Windows (PowerShell), and Linux.
- No dependency on a specific shell; all commands are cross-platform via `execa` or equivalent.
- Web UI deployable on Vercel, Railway, or any Node.js host.

#### NFR-05 Observability
- Every run produces a structured JSON log alongside the human-readable Handoff Bus.
- Run IDs are unique and correlate all log entries for a single orchestration cycle.
- Provider errors (rate limit, HTTP 5xx, timeout) are captured with exact status and message.

---

## 7. Out of Scope (v1)

- Generating new tasks from product requirements (task creation is human-authored).
- Full autonomous deployment to production (Relay stages; humans push).
- Video or voice interfaces.
- Mobile app.
- Real-time pair-programming mode.
- Training or fine-tuning custom models.
- Phase 2: multi-repo orchestration (single repo per project only in v1).

---

## 8. Success Metrics

| Metric | Solo Tier Target | Team Tier Target |
|---|---|---|
| Time from `relay init` to first completed task | < 15 minutes | < 30 minutes |
| Gate failure rate (AI code fails gates on first pass) | < 30% | < 30% |
| Human intervention rate (checkpoints triggered) | < 20% of runs | Configurable |
| Provider switch time (change YAML, next run uses new provider) | < 2 minutes | < 5 minutes |
| Audit completeness (every decision logged) | 100% | 100% |
| Cost per completed task (tokens) | Tracked and visible | Tracked and visible |

---

## 9. Milestones

| Milestone | Scope | Target |
|---|---|---|
| M0 — Core Engine + CLI | CE-01 to CE-07 + CLI-01 to CLI-06, Claude adapter only, CSV tracker | Week 4 |
| M1 — Multi-Provider | OpenAI + Gemini + Local adapters, provider fallback | Week 7 |
| M2 — Web Shell Alpha | WEB-01 to WEB-04, team auth, database Handoff Bus, JIRA integration | Week 14 |
| M3 — Team Tier GA | WEB-05 to WEB-08, Slack + email, cost dashboard, audit log | Week 20 |
| M4 — Hardening | Load testing, compliance export, enterprise SSO, multi-region | Week 26 |
