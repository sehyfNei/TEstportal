import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { updatePathProgressJob } from "@/lib/jobs/handlers/update-path-progress";

type MockResponse = { data: unknown; error: unknown };
type ResponseMap = Record<string, MockResponse[]>;
type UpdateCall = { table: string; payload: Record<string, unknown>; matcher: Record<string, unknown> };

function createSupabaseMock(responses: ResponseMap, updateCalls: UpdateCall[] = []): SupabaseClient {
  const queues = new Map<string, MockResponse[]>(Object.entries(responses).map(([table, queue]) => [table, [...queue]]));

  return {
    from: vi.fn((table: string) => {
      const queue = queues.get(table) ?? [];
      const response = queue.shift() ?? { data: null, error: null };

      const selectChain = {
        eq: vi.fn(() => selectChain),
        not: vi.fn(() => selectChain),
        maybeSingle: vi.fn(() => Promise.resolve(response)),
        then: (
          onfulfilled?: Parameters<Promise<MockResponse>["then"]>[0],
          onrejected?: Parameters<Promise<MockResponse>["then"]>[1]
        ) => Promise.resolve(response).then(onfulfilled, onrejected)
      };

      return {
        select: vi.fn(() => selectChain),
        update: vi.fn((payload: Record<string, unknown>) => {
          const matcher: Record<string, unknown> = {};
          const updateChain = {
            eq: vi.fn((col: string, val: unknown) => {
              matcher[col] = val;
              updateCalls.push({ table, payload, matcher });
              return Promise.resolve({ error: null });
            }),
            in: vi.fn((col: string, vals: unknown[]) => {
              matcher[col] = vals;
              updateCalls.push({ table, payload, matcher });
              return Promise.resolve({ error: null });
            })
          };
          return updateChain;
        })
      };
    })
  } as unknown as SupabaseClient;
}

describe("updatePathProgressJob", () => {
  it("throws when the session result can't be found", async () => {
    const supabase = createSupabaseMock({
      session_results: [{ data: null, error: null }]
    });

    await expect(updatePathProgressJob("result-1", supabase)).rejects.toThrow("session_results lookup failed");
  });

  it("is a no-op when the student has no active learning path for this exam", async () => {
    const updateCalls: UpdateCall[] = [];
    const supabase = createSupabaseMock(
      {
        session_results: [{ data: { user_id: "user-1", exam_id: "exam-1" }, error: null }],
        learning_paths: [{ data: null, error: null }]
      },
      updateCalls
    );

    await updatePathProgressJob("result-1", supabase);
    expect(updateCalls).toHaveLength(0);
  });

  it("completes a milestone whose target mastery has been reached and updates overall progress", async () => {
    const updateCalls: UpdateCall[] = [];
    const supabase = createSupabaseMock(
      {
        session_results: [{ data: { user_id: "user-1", exam_id: "exam-1" }, error: null }],
        learning_paths: [{ data: { id: "path-1" }, error: null }],
        path_milestones: [
          {
            data: [
              { id: "m1", topic_id: "topic-1", target_mastery: 60, completed_at: null },
              { id: "m2", topic_id: "topic-2", target_mastery: 80, completed_at: null },
              { id: "m3", topic_id: "topic-3", target_mastery: 50, completed_at: "2026-07-01T00:00:00.000Z" }
            ],
            error: null
          }
        ],
        mastery_records: [
          {
            data: [
              { topic_id: "topic-1", mastery_score: 65 },
              { topic_id: "topic-2", mastery_score: 40 }
            ],
            error: null
          }
        ]
      },
      updateCalls
    );

    await updatePathProgressJob("result-1", supabase);

    const milestoneUpdate = updateCalls.find((call) => call.table === "path_milestones");
    expect(milestoneUpdate?.matcher.id).toEqual(["m1"]);
    expect(milestoneUpdate?.payload.completed_at).toEqual(expect.any(String));

    const pathUpdate = updateCalls.find((call) => call.table === "learning_paths");
    // 2 of 3 milestones now completed (m1 newly + m3 already).
    expect(pathUpdate?.payload.overall_progress_percent).toBeCloseTo(66.67, 2);
    expect(pathUpdate?.matcher.id).toBe("path-1");
  });

  it("does not re-complete an already-completed milestone and leaves progress unchanged", async () => {
    const updateCalls: UpdateCall[] = [];
    const supabase = createSupabaseMock(
      {
        session_results: [{ data: { user_id: "user-1", exam_id: "exam-1" }, error: null }],
        learning_paths: [{ data: { id: "path-1" }, error: null }],
        path_milestones: [
          {
            data: [{ id: "m1", topic_id: "topic-1", target_mastery: 60, completed_at: "2026-07-01T00:00:00.000Z" }],
            error: null
          }
        ],
        mastery_records: [{ data: [{ topic_id: "topic-1", mastery_score: 95 }], error: null }]
      },
      updateCalls
    );

    await updatePathProgressJob("result-1", supabase);

    expect(updateCalls.some((call) => call.table === "path_milestones")).toBe(false);
    const pathUpdate = updateCalls.find((call) => call.table === "learning_paths");
    expect(pathUpdate?.payload.overall_progress_percent).toBe(100);
  });

  it("leaves a milestone incomplete when mastery is below target", async () => {
    const updateCalls: UpdateCall[] = [];
    const supabase = createSupabaseMock(
      {
        session_results: [{ data: { user_id: "user-1", exam_id: "exam-1" }, error: null }],
        learning_paths: [{ data: { id: "path-1" }, error: null }],
        path_milestones: [
          { data: [{ id: "m1", topic_id: "topic-1", target_mastery: 80, completed_at: null }], error: null }
        ],
        mastery_records: [{ data: [{ topic_id: "topic-1", mastery_score: 30 }], error: null }]
      },
      updateCalls
    );

    await updatePathProgressJob("result-1", supabase);

    expect(updateCalls.some((call) => call.table === "path_milestones")).toBe(false);
    const pathUpdate = updateCalls.find((call) => call.table === "learning_paths");
    expect(pathUpdate?.payload.overall_progress_percent).toBe(0);
  });

  it("throws when the milestone completion update fails", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "session_results") {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { user_id: "u1", exam_id: "e1" }, error: null }) }) }) };
        }
        if (table === "learning_paths") {
          return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "path-1" }, error: null }) }) }) }) }) };
        }
        if (table === "path_milestones") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ id: "m1", topic_id: "topic-1", target_mastery: 50, completed_at: null }],
                  error: null
                })
            }),
            update: () => ({ in: () => Promise.resolve({ error: new Error("db down") }) })
          };
        }
        if (table === "mastery_records") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  not: () => Promise.resolve({ data: [{ topic_id: "topic-1", mastery_score: 90 }], error: null })
                })
              })
            })
          };
        }
        throw new Error(`unexpected table ${table}`);
      })
    } as unknown as SupabaseClient;

    await expect(updatePathProgressJob("result-1", supabase)).rejects.toThrow("milestone completion update failed");
  });
});
