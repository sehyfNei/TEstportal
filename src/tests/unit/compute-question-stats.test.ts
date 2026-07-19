import { describe, expect, it } from "vitest";
import { computeQuestionStatsJob } from "@/lib/jobs/handlers/compute-question-stats";

type Resp = { data: unknown; error: { message: string } | null };

/**
 * Minimal chainable fake: every table gets one canned response, returned
 * regardless of which filter/order/limit methods were called on it. Good
 * enough to drive the handler's three reads + upsert without reimplementing
 * PostgREST.
 */
function makeFakeSupabase(responses: Record<string, Resp>, capture: { upserts: unknown[][] }) {
  return {
    from(table: string) {
      const resp = responses[table] ?? { data: [], error: null };
      const builder: Record<string, unknown> = {
        select: () => builder,
        not: () => builder,
        order: () => builder,
        limit: () => builder,
        in: () => builder,
        upsert: (rows: unknown[]) => {
          capture.upserts.push(rows);
          return Promise.resolve({ data: null, error: null });
        },
        then: (onFulfilled: (v: Resp) => unknown, onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(resp).then(onFulfilled, onRejected)
      };
      return builder;
    }
  };
}

describe("computeQuestionStatsJob", () => {
  it("short-circuits with zero updates when there are no scored answers", async () => {
    const capture = { upserts: [] as unknown[][] };
    const supabase = makeFakeSupabase(
      { session_answers: { data: [], error: null } },
      capture
    );

    const result = await computeQuestionStatsJob(supabase as never);
    expect(result).toEqual({ questionsUpdated: 0, attemptsProcessed: 0 });
    expect(capture.upserts).toHaveLength(0);
  });

  it("groups attempts by question, joins accuracy and flags, and upserts computed stats", async () => {
    const capture = { upserts: [] as unknown[][] };
    const supabase = makeFakeSupabase(
      {
        session_answers: {
          data: [
            {
              question_id: "q1",
              session_id: "s1",
              is_correct: true,
              time_spent_sec: 20,
              selected_answer: { options: [0] }
            },
            {
              question_id: "q1",
              session_id: "s2",
              is_correct: false,
              time_spent_sec: 40,
              selected_answer: { options: [1] }
            },
            {
              question_id: "q2",
              session_id: "s1",
              is_correct: true,
              time_spent_sec: 10,
              selected_answer: { integer: 5 }
            }
          ],
          error: null
        },
        session_results: {
          data: [
            { session_id: "s1", accuracy: 0.8 },
            { session_id: "s2", accuracy: "0.4" }
          ],
          error: null
        },
        questions: {
          data: [
            { id: "q1", flag_count: 1 },
            { id: "q2", flag_count: 0 }
          ],
          error: null
        }
      },
      capture
    );

    const result = await computeQuestionStatsJob(supabase as never);
    expect(result).toEqual({ questionsUpdated: 2, attemptsProcessed: 3 });
    expect(capture.upserts).toHaveLength(1);

    const rows = capture.upserts[0] as Array<Record<string, unknown>>;
    const q1 = rows.find((r) => r.question_id === "q1");
    const q2 = rows.find((r) => r.question_id === "q2");

    expect(q1).toMatchObject({
      total_attempts: 2,
      correct_attempts: 1,
      difficulty_index: 0.5,
      flag_count: 1,
      distractor_dist: { "0": 1, "1": 1 }
    });
    expect(q2).toMatchObject({
      total_attempts: 1,
      correct_attempts: 1,
      difficulty_index: 1,
      flag_count: 0,
      distractor_dist: {}
    });
  });

  it("propagates a session_answers lookup error", async () => {
    const capture = { upserts: [] as unknown[][] };
    const supabase = makeFakeSupabase(
      { session_answers: { data: null, error: { message: "boom" } } },
      capture
    );

    await expect(computeQuestionStatsJob(supabase as never)).rejects.toThrow(/boom/);
  });
});
