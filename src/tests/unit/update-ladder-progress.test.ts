import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { updateLadderProgressJob } from "@/lib/jobs/handlers/update-ladder-progress";

type Resp = { data: unknown; error: unknown };

function chain(resp: Resp) {
  const obj: Record<string, unknown> = {
    select: vi.fn(() => obj),
    eq: vi.fn(() => obj),
    in: vi.fn(() => obj),
    order: vi.fn(() => obj),
    maybeSingle: vi.fn(() => Promise.resolve(resp)),
    then: (onFulfilled?: (value: Resp) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(resp).then(onFulfilled, onRejected)
  };
  return obj;
}

type Config = {
  sessionResult?: { user_id: string; exam_id: string; session_id: string } | null;
  session?: { type: string; metadata: unknown } | null;
  sessionQuestions?: { question_id: string; sequence: number }[];
  sessionAnswers?: { question_id: string; is_correct: boolean | null }[];
  existingLadderProgress?: { cycle_count: number } | null;
  activeLearningPath?: { target_date: string | null } | null;
  existingRetestQueueRow?: { id: string } | null;
};

function mockSupabase(config: Config, calls: { upserts: unknown[]; inserts: unknown[]; updates: unknown[] }) {
  return {
    from: vi.fn((table: string) => {
      if (table === "session_results") {
        return chain({ data: config.sessionResult ?? null, error: null });
      }
      if (table === "test_sessions") {
        return chain({ data: config.session ?? null, error: null });
      }
      if (table === "session_questions") {
        return chain({ data: config.sessionQuestions ?? [], error: null });
      }
      if (table === "session_answers") {
        return chain({ data: config.sessionAnswers ?? [], error: null });
      }
      if (table === "topic_ladder_progress") {
        return {
          select: vi.fn(() => chain({ data: config.existingLadderProgress ?? null, error: null })),
          upsert: vi.fn((payload: unknown) => {
            calls.upserts.push(payload);
            return Promise.resolve({ error: null });
          })
        };
      }
      if (table === "learning_paths") {
        return chain({ data: config.activeLearningPath ?? null, error: null });
      }
      if (table === "retest_queue") {
        return {
          select: vi.fn(() => chain({ data: config.existingRetestQueueRow ?? null, error: null })),
          insert: vi.fn((payload: unknown) => {
            calls.inserts.push(payload);
            return Promise.resolve({ error: null });
          }),
          update: vi.fn((payload: unknown) => {
            calls.updates.push(payload);
            return { eq: vi.fn(() => Promise.resolve({ error: null })) };
          })
        };
      }
      throw new Error(`unexpected table ${table}`);
    })
  } as unknown as SupabaseClient;
}

describe("updateLadderProgressJob", () => {
  it("throws when the session result can't be found", async () => {
    const calls = { upserts: [], inserts: [], updates: [] };
    const supabase = mockSupabase({ sessionResult: null }, calls);
    await expect(updateLadderProgressJob("result-1", supabase)).rejects.toThrow("session_results lookup failed");
  });

  it("is a no-op for a non-ladder session", async () => {
    const calls = { upserts: [], inserts: [], updates: [] };
    const supabase = mockSupabase(
      {
        sessionResult: { user_id: "u1", exam_id: "e1", session_id: "s1" },
        session: { type: "topic", metadata: {} }
      },
      calls
    );
    await updateLadderProgressJob("result-1", supabase);
    expect(calls.upserts).toHaveLength(0);
  });

  it("throws when a topic_ladder session has no topicId in metadata", async () => {
    const calls = { upserts: [], inserts: [], updates: [] };
    const supabase = mockSupabase(
      {
        sessionResult: { user_id: "u1", exam_id: "e1", session_id: "s1" },
        session: { type: "topic_ladder", metadata: {} }
      },
      calls
    );
    await expect(updateLadderProgressJob("result-1", supabase)).rejects.toThrow("no topicId in metadata");
  });

  it("records rung results without completing when one rung is wrong", async () => {
    const calls = { upserts: [], inserts: [], updates: [] };
    const supabase = mockSupabase(
      {
        sessionResult: { user_id: "u1", exam_id: "e1", session_id: "s1" },
        session: { type: "topic_ladder", metadata: { selection: { topicId: "topic-1" } } },
        sessionQuestions: [
          { question_id: "q1", sequence: 1 },
          { question_id: "q2", sequence: 2 }
        ],
        sessionAnswers: [
          { question_id: "q1", is_correct: true },
          { question_id: "q2", is_correct: false }
        ]
      },
      calls
    );

    await updateLadderProgressJob("result-1", supabase);

    expect(calls.upserts).toHaveLength(1);
    const payload = calls.upserts[0] as { completed_at: string | null; rung_results: unknown[] };
    expect(payload.completed_at).toBeNull();
    expect(payload.rung_results).toHaveLength(2);
    expect(calls.inserts).toHaveLength(0);
  });

  it("marks completed and schedules a cycle-1 revision check when every rung is correct", async () => {
    const calls = { upserts: [], inserts: [], updates: [] };
    const supabase = mockSupabase(
      {
        sessionResult: { user_id: "u1", exam_id: "e1", session_id: "s1" },
        session: { type: "topic_ladder", metadata: { selection: { topicId: "topic-1" } } },
        sessionQuestions: [
          { question_id: "q1", sequence: 1 },
          { question_id: "q2", sequence: 2 }
        ],
        sessionAnswers: [
          { question_id: "q1", is_correct: true },
          { question_id: "q2", is_correct: true }
        ],
        activeLearningPath: null,
        existingRetestQueueRow: null
      },
      calls
    );

    await updateLadderProgressJob("result-1", supabase);

    const payload = calls.upserts[0] as { completed_at: string | null };
    expect(payload.completed_at).toEqual(expect.any(String));

    expect(calls.inserts).toHaveLength(1);
    const inserted = calls.inserts[0] as { topic_id: string; status: string; scheduler_state: { cycle: number } };
    expect(inserted.topic_id).toBe("topic-1");
    expect(inserted.status).toBe("due");
    expect(inserted.scheduler_state.cycle).toBe(1);
  });

  it("updates an existing active retest_queue row instead of inserting a duplicate", async () => {
    const calls = { upserts: [], inserts: [], updates: [] };
    const supabase = mockSupabase(
      {
        sessionResult: { user_id: "u1", exam_id: "e1", session_id: "s1" },
        session: { type: "topic_ladder", metadata: { selection: { topicId: "topic-1" } } },
        sessionQuestions: [{ question_id: "q1", sequence: 1 }],
        sessionAnswers: [{ question_id: "q1", is_correct: true }],
        existingRetestQueueRow: { id: "rq-1" }
      },
      calls
    );

    await updateLadderProgressJob("result-1", supabase);

    expect(calls.inserts).toHaveLength(0);
    expect(calls.updates).toHaveLength(1);
  });
});
