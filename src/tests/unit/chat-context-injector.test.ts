import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { assembleContext } from "@/lib/chat/context-injector";
import { fetchReadinessScore } from "@/lib/scoring/readiness-query";
import type { ReadinessScore } from "@/lib/scoring/readiness";

vi.mock("@/lib/scoring/readiness-query", () => ({
  fetchReadinessScore: vi.fn()
}));

const fetchReadinessScoreMock = vi.mocked(fetchReadinessScore);

describe("assembleContext", () => {
  beforeEach(() => {
    fetchReadinessScoreMock.mockReset();
    fetchReadinessScoreMock.mockResolvedValue(readiness());
  });

  it("returns an empty payload for a user without learning data", async () => {
    const supabase = createSupabaseMock({
      exams: [{ data: null, error: null }],
      topics: [{ data: [], error: null }],
      mastery_records: [{ data: [], error: null }],
      mistake_items: [{ data: [], error: null }],
      improvement_plans: [{ data: null, error: null }]
    });

    const result = await assembleContext(supabase, "user-1", "exam-1");

    expect(result).toEqual({
      examName: null,
      readinessScore: 0,
      readinessConfidence: "low",
      weakTopics: [],
      recentMistakes: [],
      improvementPlanHeadline: null,
      hasData: false
    });
  });

  it("assembles partial readiness and weak-topic data", async () => {
    fetchReadinessScoreMock.mockResolvedValue(
      readiness({ score: 40, confidenceLevel: "medium", coveragePercent: 50 })
    );
    const supabase = createSupabaseMock({
      exams: [{ data: { name: "UPSC Prelims" }, error: null }],
      topics: [
        {
          data: [topic("topic-a", "Polity", 20), topic("topic-b", "History", 30), topic("topic-c", "Economy", 15)],
          error: null
        }
      ],
      mastery_records: [
        {
          data: [
            { topic_id: "topic-a", mastery_score: 50 },
            { topic_id: "topic-b", mastery_score: 20 },
            { topic_id: "topic-c", mastery_score: 90 }
          ],
          error: null
        }
      ],
      mistake_items: [{ data: [], error: null }],
      improvement_plans: [{ data: null, error: null }]
    });

    const result = await assembleContext(supabase, "user-1", "exam-1");

    expect(result.hasData).toBe(true);
    expect(result.readinessScore).toBe(40);
    expect(result.readinessConfidence).toBe("medium");
    expect(result.weakTopics).toHaveLength(3);
    expect(result.weakTopics[0]).toMatchObject({ topicName: "History" });
    expect(result.recentMistakes).toEqual([]);
    expect(result.improvementPlanHeadline).toBeNull();
  });

  it("caps weak topics and recent mistakes at five rows while reading the latest plan headline", async () => {
    fetchReadinessScoreMock.mockResolvedValue(
      readiness({ score: 68, confidenceLevel: "high", coveragePercent: 90 })
    );
    const supabase = createSupabaseMock({
      exams: [{ data: { name: "UPSC Prelims" }, error: null }],
      topics: [
        {
          data: Array.from({ length: 7 }, (_, index) =>
            topic(`topic-${index + 1}`, `Topic ${index + 1}`, 100 - index)
          ),
          error: null
        }
      ],
      mastery_records: [
        {
          data: Array.from({ length: 7 }, (_, index) => ({
            topic_id: `topic-${index + 1}`,
            mastery_score: index * 5
          })),
          error: null
        }
      ],
      mistake_items: [
        {
          data: Array.from({ length: 7 }, (_, index) => ({
            mistake_type: index % 2 === 0 ? "wrong" : "guessed",
            topics: { name: `Topic ${index + 1}` }
          })),
          error: null
        }
      ],
      improvement_plans: [
        {
          data: { output: { overallStrategy: "Focus on Polity" } },
          error: null
        }
      ]
    });

    const result = await assembleContext(supabase, "user-1", "exam-1");

    expect(result.examName).toBe("UPSC Prelims");
    expect(result.weakTopics).toHaveLength(5);
    expect(result.recentMistakes).toHaveLength(5);
    expect(result.recentMistakes[0]).toEqual({ topicName: "Topic 1", mistakeType: "wrong" });
    expect(result.improvementPlanHeadline).toBe("Focus on Polity");
  });

  it("keeps the rest of the context when one query fails", async () => {
    fetchReadinessScoreMock.mockResolvedValue(
      readiness({ score: 55, confidenceLevel: "medium", coveragePercent: 60 })
    );
    const supabase = createSupabaseMock({
      exams: [{ data: { name: "UPSC Prelims" }, error: null }],
      topics: [{ data: [topic("topic-a", "Polity", 40)], error: null }],
      mastery_records: [{ data: [{ topic_id: "topic-a", mastery_score: 35 }], error: null }],
      mistake_items: [
        {
          data: [{ mistake_type: "skipped", topics: { name: "Polity" } }],
          error: null
        }
      ],
      improvement_plans: [{ data: null, error: new Error("plan query failed") }]
    });

    const result = await assembleContext(supabase, "user-1", "exam-1");

    expect(result).toMatchObject({
      examName: "UPSC Prelims",
      readinessScore: 55,
      readinessConfidence: "medium",
      recentMistakes: [{ topicName: "Polity", mistakeType: "skipped" }],
      improvementPlanHeadline: null,
      hasData: true
    });
    expect(result.weakTopics).toHaveLength(1);
  });
});

type MockResponse = {
  count?: number | null;
  data: unknown;
  error: Error | null;
};

type ResponseMap = Record<string, MockResponse[]>;

type QueryChain = {
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: Promise<MockResponse>["then"];
};

function createSupabaseMock(responses: ResponseMap): SupabaseClient {
  return {
    from: vi.fn((table: string) => createQuery(table, responses))
  } as unknown as SupabaseClient;
}

function createQuery(table: string, responses: ResponseMap): QueryChain {
  const response = responses[table]?.shift() ?? { data: null, error: null };
  let limitCount: number | null = null;
  const resolve = () => Promise.resolve(applyLimit(response, limitCount));
  const query = {
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn((count: number) => {
      limitCount = count;
      return query;
    }),
    maybeSingle: vi.fn(resolve),
    not: vi.fn(() => query),
    order: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(resolve),
    then: (
      onfulfilled?: Parameters<Promise<MockResponse>["then"]>[0],
      onrejected?: Parameters<Promise<MockResponse>["then"]>[1]
    ) => resolve().then(onfulfilled, onrejected)
  };

  return query as unknown as QueryChain;
}

function applyLimit(response: MockResponse, limitCount: number | null): MockResponse {
  if (limitCount === null || !Array.isArray(response.data)) {
    return response;
  }

  return {
    ...response,
    data: response.data.slice(0, limitCount)
  };
}

function readiness(overrides: Partial<ReadinessScore> = {}): ReadinessScore {
  return {
    score: 0,
    confidenceLevel: "low",
    coveragePercent: 0,
    staleTopicIds: [],
    hasBenchmarkSession: false,
    breakdown: {},
    ...overrides
  };
}

function topic(id: string, name: string, weight_percent: number) {
  return { id, name, weight_percent };
}
