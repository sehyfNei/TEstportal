/**
 * Session-flow integration tests (TSP-130).
 *
 * Exercises startSessionAction → saveAnswerAction → submitSessionAction against a
 * stateful fake Supabase client. The fake asserts the exact RPC argument names, so
 * a drift between the actions and the SQL contract fails these tests. A real
 * staging test database is founder-gated (TSP-102); this is the action-level
 * equivalent recorded in the tracker rescope.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  hasSupabaseConfig: vi.fn(),
  logEvent: vi.fn(),
  enqueueJob: vi.fn(),
  generateIdempotencyKey: vi.fn(),
  kickJobRunnerNonFatal: vi.fn(),
  updateMasteryJob: vi.fn(),
  createSupabaseMasteryRepository: vi.fn(),
  createMistakeItemsJob: vi.fn(),
  updateRetestQueueJob: vi.fn(),
  afterCallbacks: [] as Array<() => unknown>
}));

vi.mock("next/server", () => ({
  after: (callback: () => unknown) => {
    mocks.afterCallbacks.push(callback);
  }
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/env", () => ({ hasSupabaseConfig: mocks.hasSupabaseConfig }));
vi.mock("@/lib/analytics/log-event", () => ({ logEvent: mocks.logEvent }));
vi.mock("@/lib/jobs/enqueue", () => ({
  enqueueJob: mocks.enqueueJob,
  generateIdempotencyKey: mocks.generateIdempotencyKey
}));
vi.mock("@/lib/jobs/kick", () => ({ kickJobRunnerNonFatal: mocks.kickJobRunnerNonFatal }));
vi.mock("@/lib/jobs/handlers/update-mastery", () => ({ updateMasteryJob: mocks.updateMasteryJob }));
vi.mock("@/lib/jobs/handlers/update-mastery-supabase", () => ({
  createSupabaseMasteryRepository: mocks.createSupabaseMasteryRepository
}));
vi.mock("@/lib/jobs/handlers/create-mistake-items", () => ({
  createMistakeItemsJob: mocks.createMistakeItemsJob
}));
vi.mock("@/lib/jobs/handlers/update-retest-queue", () => ({
  updateRetestQueueJob: mocks.updateRetestQueueJob
}));

import { saveAnswerAction, startSessionAction, submitSessionAction } from "@/app/test/actions";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const EXAM_ID = "33333333-3333-4333-8333-333333333333";
const SESSION_ID = "44444444-4444-4444-8444-444444444444";
const QUESTION_ID = "55555555-5555-4555-8555-555555555555";
const QUESTION_2_ID = "66666666-6666-4666-8666-666666666666";
const SCHEDULED_ITEM_ID = "77777777-7777-4777-8777-777777777777";
const RESULT_ID = "88888888-8888-4888-8888-888888888888";

type Row = Record<string, unknown>;
type RpcResult = { data: unknown; error: { message: string } | null };

/**
 * Stateful fake mirroring the slices of the Supabase contract the session flow
 * touches. RPC handlers assert exact argument names so contract drift fails here.
 */
function createFakeSupabase({ userId }: { userId: string | null }) {
  const tables: Record<string, Row[]> = {
    test_sessions: [],
    session_questions: [],
    session_answers: [],
    scheduled_items: [],
    retest_queue: []
  };
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpcFailures = new Map<string, string>();

  function startTestSession(args: Record<string, unknown>): RpcResult {
    expect(Object.keys(args).sort()).toEqual([
      "p_count",
      "p_duration_minutes",
      "p_exam_id",
      "p_min_quality_tier",
      "p_pyq_only",
      "p_template_id",
      "p_topic_id",
      "p_type"
    ]);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    tables.test_sessions.push({
      id: SESSION_ID,
      user_id: userId,
      status: "in_progress",
      type: args.p_type,
      exam_id: args.p_exam_id,
      expires_at: expiresAt,
      metadata: null
    });
    for (const questionId of [QUESTION_ID, QUESTION_2_ID]) {
      tables.session_questions.push({ session_id: SESSION_ID, question_id: questionId });
    }

    return {
      data: {
        session_id: SESSION_ID,
        expires_at: expiresAt,
        question_count: 2
      },
      error: null
    };
  }

  function submitTestSession(args: Record<string, unknown>): RpcResult {
    expect(Object.keys(args)).toEqual(["p_session_id"]);

    const session = tables.test_sessions.find((row) => row.id === args.p_session_id);
    if (!session) {
      return { data: null, error: { message: "session not found" } };
    }
    session.status = "scored";

    return {
      data: {
        result_id: RESULT_ID,
        session_id: session.id,
        score: 3,
        max_score: 4,
        accuracy: 0.75,
        attempted: 2,
        correct: 1,
        incorrect: 1,
        skipped: 0,
        status: "scored"
      },
      error: null
    };
  }

  function makeBuilder(rows: Row[]) {
    const filters: Array<[string, unknown]> = [];
    let pendingUpdate: Row | null = null;
    const matching = () => rows.filter((row) => filters.every(([col, val]) => row[col] === val));

    // Chainable stub covering the query shapes the actions use:
    // select().eq()…maybeSingle(), update().eq()… (awaited), upsert(payload, { onConflict }).
    const builder = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters.push([col, val]);
        return builder;
      },
      maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
      update: (payload: Row) => {
        pendingUpdate = payload;
        return builder;
      },
      upsert: async (payload: Row, options?: { onConflict?: string }) => {
        const conflictKeys = (options?.onConflict ?? "").split(",").filter(Boolean);
        const existing = rows.find(
          (row) => conflictKeys.length > 0 && conflictKeys.every((key) => row[key] === payload[key])
        );
        if (existing) {
          Object.assign(existing, payload);
        } else {
          rows.push({ ...payload });
        }
        return { data: null, error: null };
      },
      then: (
        onFulfilled: (value: { data: null; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) => {
        if (pendingUpdate) {
          for (const row of matching()) {
            Object.assign(row, pendingUpdate);
          }
          pendingUpdate = null;
        }
        return Promise.resolve({ data: null, error: null } as const).then(onFulfilled, onRejected);
      }
    };

    return builder;
  }

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null
      })
    },
    rpc: async (name: string, args: Record<string, unknown>): Promise<RpcResult> => {
      rpcCalls.push({ name, args });
      const failure = rpcFailures.get(name);
      if (failure) {
        rpcFailures.delete(name);
        return { data: null, error: { message: failure } };
      }
      if (name === "start_test_session_compact") {
        return startTestSession(args);
      }
      if (name === "submit_test_session") {
        return submitTestSession(args);
      }
      return { data: null, error: { message: `unexpected rpc: ${name}` } };
    },
    from: (table: string) => makeBuilder((tables[table] ??= []))
  };

  return {
    client,
    tables,
    rpcCalls,
    failNextRpc: (name: string, message: string) => rpcFailures.set(name, message)
  };
}

function formOf(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

async function flushAfter() {
  for (const callback of mocks.afterCallbacks.splice(0)) {
    await callback();
  }
}

const initialState = { ok: false, message: "" };

function useFake(fake: ReturnType<typeof createFakeSupabase>) {
  mocks.createClient.mockResolvedValue(fake.client);
  return fake;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.afterCallbacks.length = 0;
  mocks.hasSupabaseConfig.mockReturnValue(true);
  mocks.logEvent.mockResolvedValue(undefined);
  mocks.enqueueJob.mockResolvedValue({ ok: true });
  mocks.generateIdempotencyKey.mockImplementation((type: string, id: string) => `${type}:${id}`);
  mocks.kickJobRunnerNonFatal.mockResolvedValue(undefined);
  mocks.updateMasteryJob.mockResolvedValue(undefined);
  mocks.createSupabaseMasteryRepository.mockReturnValue({});
  mocks.createMistakeItemsJob.mockResolvedValue(undefined);
  mocks.updateRetestQueueJob.mockResolvedValue(undefined);
});

describe("session flow: start → save answer → submit", () => {
  it("runs the full diagnostic flow and enqueues analysis + improvement plan", async () => {
    const fake = useFake(createFakeSupabase({ userId: USER_ID }));
    fake.tables.scheduled_items.push({
      id: SCHEDULED_ITEM_ID,
      user_id: USER_ID,
      status: "planned",
      session_id: null
    });

    const startState = await startSessionAction(
      initialState,
      formOf({
        examId: EXAM_ID,
        type: "diagnostic",
        count: "20",
        minQualityTier: "bronze",
        scheduledItemId: SCHEDULED_ITEM_ID
      })
    );

    expect(startState.ok).toBe(true);
    expect(startState.sessionId).toBe(SESSION_ID);
    expect(startState).not.toHaveProperty("questions");
    // TSP-180: the started session is linked back onto the scheduled item.
    expect(fake.tables.scheduled_items[0].session_id).toBe(SESSION_ID);
    expect(mocks.logEvent).toHaveBeenCalledWith(
      fake.client,
      expect.objectContaining({ eventType: "test_start", entityId: SESSION_ID })
    );

    const saveState = await saveAnswerAction(
      initialState,
      formOf({
        sessionId: SESSION_ID,
        questionId: QUESTION_ID,
        selectedAnswer: JSON.stringify({ choice: "A" }),
        confidence: "sure",
        timeSpentSec: "30"
      })
    );

    expect(saveState).toMatchObject({ ok: true, sessionId: SESSION_ID, questionId: QUESTION_ID });
    expect(fake.tables.session_answers).toHaveLength(1);
    expect(fake.tables.session_answers[0]).toMatchObject({
      session_id: SESSION_ID,
      question_id: QUESTION_ID,
      user_id: USER_ID,
      selected_answer: { choice: "A" },
      confidence: "sure",
      time_spent_sec: 30,
      // revisitIncrement defaults to 0 when the form omits it (Number("") === 0
      // beats the declared fallback of 1), so a plain save does not count a revisit.
      revisit_count: 0
    });

    const submitState = await submitSessionAction(initialState, formOf({ sessionId: SESSION_ID }));

    expect(submitState.ok).toBe(true);
    expect(submitState.result).toMatchObject({
      resultId: RESULT_ID,
      sessionId: SESSION_ID,
      score: 3,
      maxScore: 4,
      status: "scored"
    });
    expect(fake.rpcCalls.map((call) => call.name)).toEqual([
      "start_test_session_compact",
      "submit_test_session"
    ]);

    await flushAfter();

    const enqueuedTypes = mocks.enqueueJob.mock.calls.map((call) => call[1]);
    expect(enqueuedTypes).toContain("generate_analysis");
    expect(enqueuedTypes).toContain("generate_improvement_plan");
    expect(mocks.enqueueJob).toHaveBeenCalledWith(
      fake.client,
      "generate_analysis",
      { result_id: RESULT_ID, user_id: USER_ID },
      `generate_analysis:${RESULT_ID}`
    );
    expect(mocks.updateMasteryJob).toHaveBeenCalledWith(RESULT_ID, expect.anything());
    expect(mocks.createMistakeItemsJob).toHaveBeenCalledWith(RESULT_ID, fake.client);
    expect(mocks.kickJobRunnerNonFatal).toHaveBeenCalledTimes(1);
    // TSP-180: submitting the linked session auto-completes the scheduled item.
    expect(fake.tables.scheduled_items[0].status).toBe("completed");
  });

  it("accumulates time and revisits across repeated saves of the same question", async () => {
    const fake = useFake(createFakeSupabase({ userId: USER_ID }));
    await startSessionAction(initialState, formOf({ examId: EXAM_ID, type: "mock" }));

    await saveAnswerAction(
      initialState,
      formOf({ sessionId: SESSION_ID, questionId: QUESTION_ID, timeSpentSec: "30" })
    );
    await saveAnswerAction(
      initialState,
      formOf({
        sessionId: SESSION_ID,
        questionId: QUESTION_ID,
        selectedAnswer: JSON.stringify({ choice: "B" }),
        timeSpentSec: "15",
        revisitIncrement: "1"
      })
    );

    expect(fake.tables.session_answers).toHaveLength(1);
    expect(fake.tables.session_answers[0]).toMatchObject({
      selected_answer: { choice: "B" },
      time_spent_sec: 45,
      revisit_count: 1
    });
  });

  it("does not link a scheduled item that belongs to someone else", async () => {
    const fake = useFake(createFakeSupabase({ userId: USER_ID }));
    fake.tables.scheduled_items.push({
      id: SCHEDULED_ITEM_ID,
      user_id: OTHER_USER_ID,
      status: "planned",
      session_id: null
    });

    const startState = await startSessionAction(
      initialState,
      formOf({ examId: EXAM_ID, type: "mock", scheduledItemId: SCHEDULED_ITEM_ID })
    );

    expect(startState.ok).toBe(true);
    expect(fake.tables.scheduled_items[0].session_id).toBeNull();
  });
});

describe("session flow rejections", () => {
  it("rejects every action when unauthenticated", async () => {
    useFake(createFakeSupabase({ userId: null }));

    await expect(
      startSessionAction(initialState, formOf({ examId: EXAM_ID }))
    ).resolves.toMatchObject({ ok: false, message: "Sign in to continue." });
    await expect(
      saveAnswerAction(initialState, formOf({ sessionId: SESSION_ID, questionId: QUESTION_ID }))
    ).resolves.toMatchObject({ ok: false, message: "Sign in to continue." });
    await expect(
      submitSessionAction(initialState, formOf({ sessionId: SESSION_ID }))
    ).resolves.toMatchObject({ ok: false, message: "Sign in to continue." });
  });

  it("rejects a start with an invalid exam id before touching the RPC", async () => {
    const fake = useFake(createFakeSupabase({ userId: USER_ID }));

    const state = await startSessionAction(initialState, formOf({ examId: "not-a-uuid" }));

    expect(state).toMatchObject({ ok: false, message: "Valid exam id is required." });
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("hides sessions owned by other users from saveAnswer", async () => {
    const fake = useFake(createFakeSupabase({ userId: USER_ID }));
    fake.tables.test_sessions.push({
      id: SESSION_ID,
      user_id: OTHER_USER_ID,
      status: "in_progress",
      expires_at: null
    });

    const state = await saveAnswerAction(
      initialState,
      formOf({ sessionId: SESSION_ID, questionId: QUESTION_ID })
    );

    expect(state).toMatchObject({ ok: false, message: "Session not found." });
  });

  it("rejects saves into scored or expired sessions", async () => {
    const fake = useFake(createFakeSupabase({ userId: USER_ID }));
    fake.tables.test_sessions.push({
      id: SESSION_ID,
      user_id: USER_ID,
      status: "scored",
      expires_at: null
    });

    await expect(
      saveAnswerAction(initialState, formOf({ sessionId: SESSION_ID, questionId: QUESTION_ID }))
    ).resolves.toMatchObject({
      ok: false,
      message: "Answers can only be saved for an in-progress session."
    });

    fake.tables.test_sessions[0].status = "in_progress";
    fake.tables.test_sessions[0].expires_at = new Date(Date.now() - 1000).toISOString();

    await expect(
      saveAnswerAction(initialState, formOf({ sessionId: SESSION_ID, questionId: QUESTION_ID }))
    ).resolves.toMatchObject({ ok: false, message: "This session has expired." });
  });

  it("rejects answers for questions that are not part of the session", async () => {
    const fake = useFake(createFakeSupabase({ userId: USER_ID }));
    await startSessionAction(initialState, formOf({ examId: EXAM_ID, type: "mock" }));
    fake.tables.session_questions.length = 0;

    const state = await saveAnswerAction(
      initialState,
      formOf({ sessionId: SESSION_ID, questionId: QUESTION_ID })
    );

    expect(state).toMatchObject({ ok: false, message: "Question does not belong to this session." });
  });

  it("propagates submit RPC errors without firing side-effects", async () => {
    const fake = useFake(createFakeSupabase({ userId: USER_ID }));
    await startSessionAction(initialState, formOf({ examId: EXAM_ID, type: "mock" }));
    fake.failNextRpc("submit_test_session", "submit blew up");

    const state = await submitSessionAction(initialState, formOf({ sessionId: SESSION_ID }));

    expect(state).toMatchObject({ ok: false, message: "submit blew up" });
    expect(mocks.afterCallbacks).toHaveLength(0);
    expect(mocks.enqueueJob).not.toHaveBeenCalled();
  });

  it("does not re-fire side-effects when submitting an already-scored session", async () => {
    const fake = useFake(createFakeSupabase({ userId: USER_ID }));
    fake.tables.test_sessions.push({
      id: SESSION_ID,
      user_id: USER_ID,
      status: "scored",
      type: "mock",
      exam_id: EXAM_ID,
      metadata: null
    });

    const state = await submitSessionAction(initialState, formOf({ sessionId: SESSION_ID }));

    expect(state.ok).toBe(true);
    await flushAfter();
    expect(mocks.enqueueJob).not.toHaveBeenCalled();
    expect(mocks.updateMasteryJob).not.toHaveBeenCalled();
  });
});
