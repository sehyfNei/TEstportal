# Final Technical Requirements Document
## Relay — AI-Driven Development Lifecycle (AIDLC) Harness

**Version:** 1.0 Draft
**Date:** 2026-06-23
**Status:** Initial technical plan for implementation

---

## 1. Technical Objective

Build a provider-agnostic multi-agent orchestration engine that:

- Routes development lifecycle roles (Architect, Builder, Sanity Tester) to configurable AI providers.
- Enforces a discipline layer: typecheck / lint / test / build gates run before any commit.
- Persists every agent decision in an append-only Handoff Bus (file or database).
- Surfaces configurable human checkpoints before irreversible actions.
- Integrates with task trackers (CSV, GitHub Issues, JIRA, Linear) for task selection and status updates.
- Powers two surfaces from a single core engine: a CLI (solo) and a web dashboard (team).

---

## 2. Architecture Overview

### 2.1 Layered Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                       │
│   CLI Shell (solo)          Web Shell (team)              │
│   relay run / approve       Next.js dashboard + REST API  │
├──────────────────────────────────────────────────────────┤
│                  ORCHESTRATION LAYER                      │
│   Orchestrator   Task Picker   Context Assembler          │
│   Agent Router   Gate Runner   Checkpoint System          │
│   Handoff Bus    Tracker Updater                          │
├──────────────────────────────────────────────────────────┤
│                  PROVIDER LAYER                           │
│   AgentProvider interface                                 │
│   ClaudeAdapter  OpenAIAdapter  GeminiAdapter  LocalAdapter│
│   Tool Abstraction Layer (fs, shell, search)              │
├──────────────────────────────────────────────────────────┤
│                  PERSISTENCE LAYER                        │
│   Solo: HANDOFF.md + relay.run.json (local files)        │
│   Team: PostgreSQL (Supabase) + object storage            │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Per Run

```
1. Orchestrator reads relay.config.yaml
2. Task Picker queries tracker → picks next eligible task → sets status In Progress
3. Context Assembler reads repo files, git log, Handoff Bus
4. Agent Router invokes Architect with context → streams plan output
5. Handoff Bus appended (architect plan)
6. [CHECKPOINT: human approves plan]
7. Agent Router invokes Builder with context + plan → streams code diffs
8. File writer applies diffs to working directory
9. Gate Runner executes gates sequentially → captures output
10. Handoff Bus appended (builder output + gate results)
11. [CHECKPOINT: human approves commit]
12. Commit staged and created
13. Agent Router invokes Sanity Tester with context + diff + gate results
14. Handoff Bus appended (sanity findings)
15. Tracker Updater writes status + remarks
16. [CHECKPOINT: human approves Done]
17. Task closed. Orchestrator loops to step 2 or exits.
```

### 2.3 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Core engine | TypeScript / Node.js 20+ | Type safety, existing ecosystem, cross-platform |
| CLI | Commander.js + Ink (React for terminal) | Rich terminal UI with streaming support |
| Web UI | Next.js 15 App Router + TypeScript | Same stack as core, fast full-stack delivery |
| Database (team) | PostgreSQL via Supabase | Managed, RLS, realtime, proven |
| ORM (team) | Drizzle ORM | Type-safe, lightweight |
| Auth (team) | Supabase Auth | Built-in, supports email + OAuth |
| AI SDKs | @anthropic-ai/sdk, openai, @google/genai | Official SDKs per provider |
| Process runner | execa | Cross-platform shell execution |
| Config parsing | zod + js-yaml | Validated YAML config |
| Monorepo | pnpm workspaces | CLI + Web + Core as separate packages |

---

## 3. Repository Structure

```
relay/
├── packages/
│   ├── core/                    ← Core engine (shared by CLI and Web)
│   │   ├── src/
│   │   │   ├── orchestrator.ts
│   │   │   ├── task-picker/
│   │   │   ├── context-assembler/
│   │   │   ├── agent-router/
│   │   │   ├── gate-runner/
│   │   │   ├── checkpoint/
│   │   │   ├── handoff-bus/
│   │   │   ├── tracker-updater/
│   │   │   ├── providers/
│   │   │   │   ├── base.ts           ← AgentProvider interface
│   │   │   │   ├── claude.ts
│   │   │   │   ├── openai.ts
│   │   │   │   ├── gemini.ts
│   │   │   │   └── local.ts
│   │   │   ├── tools/
│   │   │   │   ├── fs-tools.ts       ← read/write/list abstraction
│   │   │   │   └── shell-tools.ts    ← run_command abstraction
│   │   │   ├── trackers/
│   │   │   │   ├── base.ts           ← TaskTracker interface
│   │   │   │   ├── csv-tracker.ts
│   │   │   │   ├── github-tracker.ts
│   │   │   │   ├── jira-tracker.ts
│   │   │   │   └── linear-tracker.ts
│   │   │   ├── config.ts             ← relay.config.yaml schema + loader
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── cli/                     ← Solo CLI shell
│   │   ├── src/
│   │   │   ├── index.ts             ← Commander entry point
│   │   │   ├── commands/
│   │   │   │   ├── init.ts
│   │   │   │   ├── run.ts
│   │   │   │   ├── approve.ts
│   │   │   │   ├── log.ts
│   │   │   │   ├── status.ts
│   │   │   │   └── cost.ts
│   │   │   ├── ui/                  ← Ink components
│   │   │   │   ├── stream-panel.tsx ← streaming agent output
│   │   │   │   ├── gate-panel.tsx   ← gate pass/fail display
│   │   │   │   └── checkpoint.tsx   ← y/n/view approval prompt
│   │   │   └── checkpoint-cli.ts    ← CLI implementation of CheckpointHandler
│   │   └── package.json
│   │
│   └── web/                     ← Team web shell
│       ├── src/
│       │   ├── app/              ← Next.js App Router
│       │   │   ├── api/          ← REST API for orchestrator
│       │   │   ├── dashboard/
│       │   │   ├── runs/
│       │   │   ├── approvals/
│       │   │   └── settings/
│       │   ├── lib/
│       │   │   ├── db/           ← Drizzle schema
│       │   │   └── auth/
│       │   └── components/
│       └── package.json
│
├── relay.config.yaml.example    ← reference config
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. Core Engine — Module Specifications

### 4.1 Orchestrator (`packages/core/src/orchestrator.ts`)

Entry point for a single run cycle. Coordinates all other modules.

```ts
export type RunConfig = {
  taskId?: string;           // override: target a specific task
  roles?: ("architect" | "builder" | "sanity_tester")[];  // run subset of roles
  dryRun?: boolean;          // assemble context but make no AI calls
};

export type RunResult = {
  runId: string;
  taskId: string;
  status: "completed" | "gate_failed" | "checkpoint_rejected" | "agent_failed" | "blocked";
  handoffEntries: HandoffEntry[];
  gateResults: GateResult[];
  cost: CostSummary;
};

export async function runCycle(config: RelayConfig, runOptions: RunConfig): Promise<RunResult>;
```

**Responsibilities:**
- Generates unique `runId` (UUID) shared across all log entries for the cycle.
- Calls Task Picker if no `taskId` override.
- Calls Context Assembler before each agent role.
- Invokes Agent Router for each role in sequence.
- Invokes Gate Runner after Builder.
- Invokes Checkpoint System at configured gates.
- Calls Tracker Updater on completion or failure.
- Handles errors at each step: partial failures are logged, not silently swallowed.

### 4.2 Task Picker (`packages/core/src/task-picker/`)

```ts
export interface TaskTracker {
  getNextTask(filter?: TaskFilter): Promise<Task | null>;
  setStatus(taskId: string, status: TaskStatus, remarks?: string): Promise<void>;
  getTask(taskId: string): Promise<Task>;
}

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  dependencies: string[];   // IDs that must be Done before this task
  milestone?: string;
  acceptanceCriteria?: string;
  source: string;           // tracker system name
};

export type TaskStatus = "backlog" | "in_progress" | "blocked" | "review" | "done";
```

**Selection algorithm:**
1. Fetch all tasks with `status = backlog`.
2. Filter: all `dependencies` must be `done`.
3. Sort by priority descending, then by position in backlog.
4. Return first eligible task.
5. Set to `in_progress` before returning (atomic where tracker supports it).

**Tracker implementations:**

| Tracker | Read | Write |
|---|---|---|
| CSV | Parse CSV, filter rows | Write CSV back with updated row |
| GitHub Issues | REST API `GET /issues` with label filter | `PATCH /issues/:id` labels + comment |
| JIRA | REST API with JQL query | Transition API |
| Linear | GraphQL API | Mutation |

### 4.3 Context Assembler (`packages/core/src/context-assembler/`)

```ts
export type AgentContext = {
  task: Task;
  recentHandoffEntries: HandoffEntry[];   // last N entries from Handoff Bus
  relevantFiles: FileSnapshot[];           // files near task scope
  recentGitLog: string;                    // last N commits, one line each
  repoStructure: string;                   // top-level directory tree
  config: RelayConfig;                     // sanitized (no secrets)
};

export type FileSnapshot = {
  path: string;
  content: string;
  language: string;
};

export async function assembleContext(
  task: Task,
  handoffBus: HandoffBus,
  config: RelayConfig
): Promise<AgentContext>;
```

**File selection heuristics:**
- Files explicitly mentioned in task description or title (path pattern matching).
- Files modified in last N commits touching the task's domain keywords.
- Files in directories listed in `context.include_paths` config.
- Always exclude: `.env*`, `node_modules/`, `.next/`, `dist/`, `*.lock`, `*.log`.
- Truncate files exceeding `context.max_file_chars` (default 8000) with a `[truncated]` marker.
- Total context budget: configurable, default 80k tokens; assembler estimates and trims.

### 4.4 Agent Router (`packages/core/src/agent-router/`)

```ts
export interface AgentProvider {
  readonly name: string;
  readonly model: string;
  call(input: AgentCallInput): Promise<AgentCallResult>;
  stream(input: AgentCallInput): AsyncIterable<string>;
}

export type AgentCallInput = {
  systemPrompt: string;
  userMessage: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
};

export type AgentCallResult = {
  content: string;
  toolCalls?: ToolCall[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  provider: string;
  model: string;
};

export async function invokeAgent(
  role: AgentRole,
  context: AgentContext,
  systemPrompt: string,
  provider: AgentProvider,
  onToken?: (token: string) => void
): Promise<AgentCallResult>;
```

**Role system prompts** are loaded from `packages/core/src/agent-router/prompts/`:
- `architect.md` — instructs the Architect to read context, produce structured plan with files, risks, gates.
- `builder.md` — instructs Builder to implement the plan, use tools to read/write files, report changed files.
- `sanity_tester.md` — instructs Sanity Tester to review diff + gate results, report pass/fail with specifics.

Prompts are markdown files — editable by users who want to customize role behavior.

**Tool call loop:**
Builder is the only role that uses file system tools. The router enters a tool call loop:
1. Invoke provider with Builder prompt.
2. Provider returns tool calls (read_file, write_file, etc.).
3. Router executes tool calls via Tool Abstraction Layer.
4. Tool results returned to provider.
5. Repeat until provider returns a final text response (no more tool calls).
6. Max iterations: configurable, default 20.

### 4.5 Tool Abstraction Layer (`packages/core/src/tools/`)

```ts
export type ToolDefinition = {
  name: string;
  description: string;
  parameters: JsonSchema;
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolResult = {
  toolCallId: string;
  content: string;
  isError: boolean;
};

// Standard tools available to all providers:
export const STANDARD_TOOLS: ToolDefinition[] = [
  READ_FILE_TOOL,       // read a file by path
  WRITE_FILE_TOOL,      // write content to a file
  LIST_FILES_TOOL,      // list files in a directory
  SEARCH_CODE_TOOL,     // grep-style search across codebase
  RUN_COMMAND_TOOL,     // execute a shell command (gated)
];

export async function executeTool(
  call: ToolCall,
  config: RelayConfig
): Promise<ToolResult>;
```

**Tool security:**
- `write_file` — restricted to `config.working_dir` and its subdirectories. Paths outside throw a security error.
- `run_command` — restricted to an allowlist in config (`tools.allowed_commands`). If not in allowlist, triggers a checkpoint.
- All tool executions logged to run log.

**Provider tool mapping:**

| Tool | Claude | OpenAI | Gemini | Local |
|---|---|---|---|---|
| read_file | Native tool use | Function calling | Function declaration | Prompt injection |
| write_file | Native tool use | Function calling | Function declaration | Structured output |
| list_files | Native tool use | Function calling | Function declaration | Prompt injection |
| search_code | Native tool use | Function calling | Function declaration | Prompt injection |
| run_command | Native tool use | Function calling | Function declaration | Not supported |

### 4.6 Gate Runner (`packages/core/src/gate-runner/`)

```ts
export type GateConfig = {
  name: string;
  command: string;
  workingDir: string;
  timeoutMs?: number;      // default 120000 (2 min)
  failFast?: boolean;      // default true — stop on first failure
};

export type GateResult = {
  name: string;
  command: string;
  passed: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export async function runGates(
  gates: GateConfig[],
  onGateComplete?: (result: GateResult) => void
): Promise<GateResult[]>;
```

**Standard gate set (default for TypeScript/Next.js projects):**
```yaml
gates:
  - name: typecheck
    command: corepack pnpm typecheck
  - name: lint
    command: corepack pnpm lint
  - name: test
    command: corepack pnpm test
  - name: build
    command: corepack pnpm build
```

**Gate failure handling:**
- On failure: stop (if `fail_fast: true`), log results, trigger checkpoint asking to auto-fix.
- Auto-fix: re-invoke Builder with gate output as additional context. Max 2 auto-fix attempts.
- If auto-fix fails: mark task `blocked`, write to Handoff Bus, stop run.

### 4.7 Checkpoint System (`packages/core/src/checkpoint/`)

```ts
export interface CheckpointHandler {
  prompt(event: CheckpointEvent): Promise<CheckpointDecision>;
}

export type CheckpointEvent = {
  type: "plan_ready" | "gates_passed" | "commit_ready" | "migrate_ready" | "push_ready" | "task_done" | "custom";
  runId: string;
  taskId: string;
  summary: string;          // human-readable description of what's about to happen
  details?: string;         // diff, gate output, or plan text
  timeoutMs?: number;       // auto-decision after timeout (configurable)
  timeoutDecision?: "approve" | "reject";
};

export type CheckpointDecision = {
  approved: boolean;
  comment?: string;
  approver: string;         // "cli:human", "web:user@email.com", "auto:timeout"
  timestamp: string;
};
```

**CLI implementation** (`packages/cli/src/checkpoint-cli.ts`):
- Renders Ink component showing summary + options: `[y] Approve  [n] Reject  [v] View details  [s] Skip`.
- `v` opens `details` in `less` (or `more` on Windows).
- Returns decision immediately on keypress.

**Web implementation** (REST + SSE):
- Orchestrator posts `CheckpointEvent` to `/api/checkpoints` → stored in DB.
- Web UI polls or subscribes via SSE → renders approval card.
- Reviewer clicks Approve/Reject → `PATCH /api/checkpoints/:id` → orchestrator resumes.
- Timeout uses database-scheduled job.

### 4.8 Handoff Bus (`packages/core/src/handoff-bus/`)

```ts
export type HandoffEntry = {
  id: string;
  runId: string;
  taskId: string;
  timestamp: string;
  agentRole: AgentRole | "gate_runner" | "checkpoint" | "tracker_updater" | "orchestrator";
  provider?: string;
  model?: string;
  content: string;          // markdown-formatted agent output or event description
  gateResults?: GateResult[];
  checkpointDecision?: CheckpointDecision;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
};

export interface HandoffBus {
  append(entry: HandoffEntry): Promise<void>;
  getRecent(n: number, taskId?: string): Promise<HandoffEntry[]>;
  getByRunId(runId: string): Promise<HandoffEntry[]>;
}
```

**FileHandoffBus** (solo mode):
- Appends formatted markdown to `HANDOFF.md` in the repo root.
- Also writes raw JSON to `.relay/runs/<runId>.json` for machine consumption.
- Thread-safe via a write queue (prevents concurrent append corruption).

**DatabaseHandoffBus** (team mode):
- Writes to `relay_handoff_entries` Postgres table.
- Includes full-text search index on `content` for web UI filtering.
- Soft-delete only — audit entries are never deleted, only expired per retention config.

---

## 5. Provider Adapter Specifications

### 5.1 AgentProvider Interface

```ts
export abstract class BaseProvider implements AgentProvider {
  abstract readonly name: string;
  abstract readonly model: string;

  abstract call(input: AgentCallInput): Promise<AgentCallResult>;
  abstract stream(input: AgentCallInput): AsyncIterable<string>;
  abstract formatToolDefinitions(tools: ToolDefinition[]): unknown;
  abstract parseToolCalls(response: unknown): ToolCall[];

  protected estimateCost(inputTokens: number, outputTokens: number): number {
    // subclass overrides with provider-specific pricing
    return 0;
  }
}
```

### 5.2 Claude Adapter

```ts
export class ClaudeProvider extends BaseProvider {
  private client: Anthropic;

  constructor(config: { apiKey: string; model: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async call(input: AgentCallInput): Promise<AgentCallResult> {
    // maps AgentCallInput → Anthropic messages API
    // maps tool definitions to Anthropic tool format
    // handles content blocks + tool_use blocks in response
  }

  async *stream(input: AgentCallInput): AsyncIterable<string> {
    // uses client.messages.stream()
    // yields text deltas
  }
}
```

**Claude-specific:**
- Supports extended thinking (`thinking: { type: "enabled", budget_tokens: N }`) for Architect role.
- Maps `jsonMode` to system prompt instruction (Claude doesn't have a native JSON mode toggle).
- Tool results sent as `tool_result` content blocks.

### 5.3 OpenAI Adapter

```ts
export class OpenAIProvider extends BaseProvider {
  private client: OpenAI;

  constructor(config: { apiKey: string; model: string; baseURL?: string }) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    this.model = config.model;
  }

  // maps to chat.completions.create
  // maps tool definitions to OpenAI function calling format
  // handles tool_calls in response
}
```

**OpenAI-specific:**
- `jsonMode` maps to `response_format: { type: "json_object" }`.
- Custom `baseURL` enables any OpenAI-compatible endpoint (local models, Azure, etc.).
- o1/o3 models: disable tools (not supported), adjust max_tokens handling.

### 5.4 Gemini Adapter

```ts
export class GeminiProvider extends BaseProvider {
  private client: GoogleGenAI;

  // maps to generateContent
  // maps tool definitions to Gemini FunctionDeclaration format
  // handles functionCall parts in response
}
```

### 5.5 Local Adapter

```ts
export class LocalProvider extends BaseProvider {
  // Uses OpenAI-compatible REST API (works with Ollama, LM Studio, etc.)
  // baseURL: "http://localhost:11434/v1" for Ollama
  // No tool use support — Builder uses structured output prompt instead
  // No streaming required (optional)
}
```

---

## 6. Configuration Schema (`relay.config.yaml`)

```ts
export const relayConfigSchema = z.object({
  project: z.object({
    name: z.string(),
    working_dir: z.string().default("."),
    tracker: z.enum(["csv", "github", "jira", "linear"]),
    tracker_path: z.string().optional(),    // CSV path
    tracker_project: z.string().optional(), // JIRA project key / Linear team key
    repo_url: z.string().optional(),        // GitHub repo for Issues tracker
  }),

  roles: z.object({
    architect: z.object({
      provider: z.enum(["claude", "openai", "gemini", "local"]),
      model: z.string(),
      temperature: z.number().default(0.3),
      max_tokens: z.number().default(8192),
      fallback_provider: z.string().optional(),
    }),
    builder: z.object({
      provider: z.enum(["claude", "openai", "gemini", "local"]),
      model: z.string(),
      temperature: z.number().default(0.2),
      max_tokens: z.number().default(16384),
      max_tool_iterations: z.number().default(20),
    }),
    sanity_tester: z.object({
      provider: z.enum(["claude", "openai", "gemini", "local"]),
      model: z.string(),
      temperature: z.number().default(0.1),
      max_tokens: z.number().default(4096),
    }),
  }),

  gates: z.object({
    working_dir: z.string(),
    fail_fast: z.boolean().default(true),
    auto_fix_attempts: z.number().default(2),
    commands: z.array(z.object({
      name: z.string(),
      command: z.string(),
      timeout_ms: z.number().default(120000),
    })),
  }),

  checkpoints: z.object({
    before_build: z.boolean().default(true),    // human approves before Builder runs
    before_commit: z.boolean().default(true),
    before_push: z.boolean().default(true),
    before_migrate: z.boolean().default(true),
    timeout_ms: z.number().default(0),          // 0 = wait forever
    timeout_decision: z.enum(["approve", "reject"]).default("reject"),
  }),

  context: z.object({
    include_paths: z.array(z.string()).default([]),
    exclude_paths: z.array(z.string()).default([]),
    max_file_chars: z.number().default(8000),
    handoff_lookback: z.number().default(5),    // last N handoff entries
    git_log_depth: z.number().default(10),
  }),

  tools: z.object({
    allowed_commands: z.array(z.string()).default([]),  // shell commands Builder may run
  }),

  handoff_bus: z.object({
    file_path: z.string().default("HANDOFF.md"),
    json_dir: z.string().default(".relay/runs"),
  }),

  notifications: z.object({
    slack_webhook: z.string().optional(),
    email: z.string().optional(),
    on_events: z.array(z.string()).default(["checkpoint_required", "run_failed"]),
  }).optional(),
});

export type RelayConfig = z.infer<typeof relayConfigSchema>;
```

---

## 7. Database Schema (Team Mode — PostgreSQL / Supabase)

### 7.1 Core Tables

```sql
-- Organizations
create table relay_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Projects (one org has many projects, one project = one repo)
create table relay_projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references relay_orgs(id) on delete cascade,
  name text not null,
  config jsonb not null,            -- RelayConfig stored as JSONB
  tracker_type text not null,       -- csv | github | jira | linear
  tracker_config jsonb not null,    -- tracker-specific connection info (no secrets)
  created_at timestamptz not null default now()
);

-- Runs (one orchestration cycle)
create table relay_runs (
  id uuid primary key,              -- runId from orchestrator
  project_id uuid not null references relay_projects(id) on delete cascade,
  task_id text not null,            -- tracker task ID
  task_title text,
  status text not null check (status in ('running','completed','gate_failed','checkpoint_rejected','agent_failed','blocked')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_cost_usd numeric(10,6),
  total_input_tokens int,
  total_output_tokens int
);

-- Handoff entries (append-only audit log)
create table relay_handoff_entries (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references relay_runs(id) on delete cascade,
  project_id uuid not null references relay_projects(id) on delete cascade,
  task_id text not null,
  agent_role text not null,
  provider text,
  model text,
  content text not null,
  gate_results jsonb,
  checkpoint_decision jsonb,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10,6),
  created_at timestamptz not null default now()
);

create index relay_handoff_run_idx on relay_handoff_entries(run_id, created_at);
create index relay_handoff_project_idx on relay_handoff_entries(project_id, created_at desc);

-- Checkpoints (pending human approvals)
create table relay_checkpoints (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references relay_runs(id) on delete cascade,
  project_id uuid not null references relay_projects(id) on delete cascade,
  event_type text not null,
  summary text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','timed_out')),
  approver_id uuid references auth.users(id),
  approver_comment text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Team members
create table relay_org_members (
  org_id uuid not null references relay_orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','reviewer','viewer')),
  primary key (org_id, user_id)
);
```

### 7.2 RLS Policies

- All tables: `using (org_id in (select org_id from relay_org_members where user_id = auth.uid()))`.
- `relay_checkpoints`: only `admin` and `reviewer` roles may update (approve/reject).
- `relay_handoff_entries`: append-only enforced at application level; no delete policy granted.

---

## 8. CLI Design

### 8.1 Entry Point

```
relay <command> [options]

Commands:
  init          Initialize Relay in the current repo
  run           Run the full Architect → Builder → Sanity cycle
  approve       Resolve a pending checkpoint
  log           View Handoff Bus entries
  status        Show current run and task queue state
  cost          Show token usage and cost breakdown
  config        Validate and display resolved config
  providers     Test provider connectivity
```

### 8.2 Terminal UI (Ink Components)

**StreamPanel** — renders streaming agent output with role badge and token counter:
```
[ARCHITECT — claude-opus-4-8]  ████████░░  823 tokens
  TSP-171: Context Injector
  Files to create:
    • src/lib/chat/context-injector.ts
    • src/tests/unit/chat-context-injector.test.ts
  ...
```

**GatePanel** — renders gate results as they complete:
```
Gates:
  ✅ typecheck    (3.2s)
  ✅ lint         (1.8s)
  ✅ test         (12.4s)  302/302 pass
  ✅ build        (28.1s)
```

**CheckpointPrompt** — renders approval prompt:
```
╔══════════════════════════════════════════╗
║  CHECKPOINT: commit_ready                ║
║  Task: TSP-171 — Context Injector        ║
║  2 files created. All 4 gates passed.   ║
╠══════════════════════════════════════════╣
║  [y] Approve   [n] Reject   [v] View    ║
╚══════════════════════════════════════════╝
```

### 8.3 Environment Variables

```
RELAY_ANTHROPIC_API_KEY=...
RELAY_OPENAI_API_KEY=...
RELAY_GOOGLE_AI_API_KEY=...
RELAY_GITHUB_TOKEN=...       # for GitHub Issues tracker
RELAY_JIRA_TOKEN=...         # for JIRA tracker
RELAY_LINEAR_API_KEY=...     # for Linear tracker
RELAY_SLACK_WEBHOOK=...      # optional
```

---

## 9. Web API Design (Team Mode)

### 9.1 REST Endpoints

```
GET    /api/projects                    → list org projects
POST   /api/projects                    → create project
GET    /api/projects/:id/runs           → list runs for project
GET    /api/projects/:id/runs/:runId    → get run detail + handoff entries
GET    /api/projects/:id/checkpoints    → list pending checkpoints
PATCH  /api/projects/:id/checkpoints/:checkpointId  → approve/reject
GET    /api/projects/:id/cost           → cost summary (project, date range)
POST   /api/runs                        → trigger a run (webhook or manual)
GET    /api/runs/:runId/stream          → SSE stream of run events
```

### 9.2 Webhook Trigger

External systems (JIRA, Linear, GitHub) can trigger a run via:

```
POST /api/webhooks/:projectId/trigger
Authorization: Bearer <webhook_secret>
Content-Type: application/json

{
  "event": "task_moved_to_in_progress",
  "task_id": "TSP-171",
  "task_title": "Context injector",
  "source": "jira"
}
```

### 9.3 SSE Run Stream

Web UI subscribes to `/api/runs/:runId/stream` to receive live events:

```
event: agent_token
data: {"role":"architect","token":"Files to create:"}

event: gate_result
data: {"name":"typecheck","passed":true,"durationMs":3200}

event: checkpoint_required
data: {"checkpointId":"uuid","type":"commit_ready","summary":"..."}

event: run_complete
data: {"status":"completed","costUsd":0.047}
```

---

## 10. Security

### 10.1 Secret Management

- API keys never stored in `relay.config.yaml` — config file is safe to commit.
- Keys sourced from environment variables only.
- In team mode: keys stored in Supabase Edge Function secrets or Vercel env vars; never in database rows.

### 10.2 Tool Execution Safety

- `write_file` enforces `working_dir` boundary via `path.resolve` + `startsWith` check.
- `run_command` blocked unless command string matches an entry in `tools.allowed_commands` (exact prefix match).
- Unapproved tool calls trigger an immediate checkpoint — no silent execution.

### 10.3 Checkpoint Bypass Audit

- `--skip-checkpoints` CLI flag is allowed but every skipped checkpoint is logged with `approver: "cli:skip_flag"`.
- Team mode: no skip flag. Checkpoints can only be resolved by a user with `reviewer` or `admin` role.

### 10.4 Handoff Bus Integrity

- Solo: Handoff Bus is append-only by application convention; the `.relay/runs/` JSON files are also written and should be committed to git for team repos.
- Team: `relay_handoff_entries` has no DELETE policy; entries may only be marked expired per retention config. Audit trail is immutable.

---

## 11. Deployment

### 11.1 Solo (CLI)

```
npm install -g relay-cli
relay init
relay run
```

Published to npm. Self-contained binary option via `pkg` for users who don't want Node.js.

### 11.2 Team (Web)

**Option A — Vercel + Supabase (recommended):**
- Web UI deployed to Vercel.
- Database on Supabase (managed Postgres + Auth + RLS).
- Orchestrator runs as Vercel background functions or a persistent worker (Railway).

**Option B — Self-hosted:**
- Docker Compose: web container + postgres container.
- Env vars for all secrets.
- `docker compose up` → running in < 5 minutes.

**Option C — Cloud-hosted SaaS:**
- relay.dev — multi-tenant Vercel + Supabase deployment.
- Orgs sign up, connect trackers and providers, run immediately.
- Billing via Stripe; cost per run or per seat.

---

## 12. Build Milestones (Technical)

### M0 — Core Engine + CLI (Weeks 1–4)

- `packages/core`: Orchestrator, Task Picker (CSV only), Context Assembler, Agent Router, Gate Runner, Checkpoint (CLI), Handoff Bus (file), Tracker Updater (CSV).
- `packages/cli`: `relay init`, `relay run`, `relay approve`, `relay log`.
- Provider: Claude only.
- Tests: unit tests for Task Picker (filter + priority), Gate Runner (pass/fail/fast), Context Assembler (file selection + truncation), Handoff Bus (append + read).
- Gate: typecheck + lint + test + build on the harness itself.

### M1 — Multi-Provider (Weeks 5–7)

- OpenAI adapter (GPT-4o + function calling).
- Gemini adapter.
- Local adapter (Ollama-compatible).
- Provider fallback logic.
- `relay providers` command.
- `relay cost` command with per-provider breakdown.
- GitHub Issues tracker.

### M2 — Web Shell Alpha (Weeks 8–14)

- `packages/web`: Next.js app, Supabase schema, auth, org + project model.
- REST API for runs, checkpoints, cost.
- SSE stream for live run events.
- Web UI: dashboard, run log, checkpoint approval cards.
- DatabaseHandoffBus implementation.
- JIRA tracker integration.
- Webhook trigger endpoint.

### M3 — Team Tier GA (Weeks 15–20)

- Linear tracker integration.
- Slack + email notifications.
- Cost dashboard with budget alerts.
- Audit log export (JSON, CSV).
- Role-based access (admin, reviewer, viewer).
- Self-hosted Docker Compose.

### M4 — Hardening (Weeks 21–26)

- Load testing (concurrent runs across projects).
- Enterprise SSO (SAML via Supabase Auth).
- Compliance export (SOC 2 evidence, audit trail).
- Multi-region database option.
- `relay.dev` SaaS launch.
