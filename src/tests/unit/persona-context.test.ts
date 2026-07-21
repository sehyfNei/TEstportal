import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { assembleTopicContext, buildPersonaSystemMessage, loadActivePersona } from "@/lib/chat/persona-context";

type MockResponse = { data: unknown; error: Error | null };
type ResponseMap = Record<string, MockResponse[]>;

function createSupabaseMock(responses: ResponseMap): SupabaseClient {
  return { from: vi.fn((table: string) => createQuery(table, responses)) } as unknown as SupabaseClient;
}

function createQuery(table: string, responses: ResponseMap) {
  const response = responses[table]?.shift() ?? { data: null, error: null };
  let limitCount: number | null = null;
  const resolve = () => Promise.resolve(applyLimit(response, limitCount));
  const query = {
    eq: vi.fn(() => query),
    limit: vi.fn((count: number) => {
      limitCount = count;
      return query;
    }),
    maybeSingle: vi.fn(resolve),
    order: vi.fn(() => query),
    select: vi.fn(() => query),
    then: (
      onfulfilled?: Parameters<Promise<MockResponse>["then"]>[0],
      onrejected?: Parameters<Promise<MockResponse>["then"]>[1]
    ) => resolve().then(onfulfilled, onrejected)
  };
  return query;
}

function applyLimit(response: MockResponse, limitCount: number | null): MockResponse {
  if (limitCount === null || !Array.isArray(response.data)) {
    return response;
  }
  return { ...response, data: response.data.slice(0, limitCount) };
}

describe("loadActivePersona", () => {
  it("returns the persona when an active one exists for the topic", async () => {
    const supabase = createSupabaseMock({
      expert_personas: [
        { data: { id: "p1", name: "Polity Prof", system_prompt: "Be strict and precise." }, error: null }
      ]
    });

    const result = await loadActivePersona(supabase, "topic-1");
    expect(result).toEqual({ id: "p1", name: "Polity Prof", systemPrompt: "Be strict and precise." });
  });

  it("returns null when no active persona exists for the topic", async () => {
    const supabase = createSupabaseMock({ expert_personas: [{ data: null, error: null }] });
    expect(await loadActivePersona(supabase, "topic-1")).toBeNull();
  });

  it("returns null on query error rather than throwing", async () => {
    const supabase = createSupabaseMock({
      expert_personas: [{ data: null, error: new Error("boom") }]
    });
    expect(await loadActivePersona(supabase, "topic-1")).toBeNull();
  });
});

describe("assembleTopicContext", () => {
  it("assembles topic name, mastery score, and recent mistake types", async () => {
    const supabase = createSupabaseMock({
      topics: [{ data: { name: "Indian Polity" }, error: null }],
      mastery_records: [{ data: { mastery_score: 42 }, error: null }],
      mistake_items: [
        {
          data: [{ mistake_type: "wrong" }, { mistake_type: "guessed" }],
          error: null
        }
      ]
    });

    const result = await assembleTopicContext(supabase, "user-1", "topic-1");
    expect(result).toEqual({
      topicName: "Indian Polity",
      masteryScore: 42,
      recentMistakeTypes: ["wrong", "guessed"]
    });
  });

  it("degrades gracefully when the student has no mastery/mistake data yet", async () => {
    const supabase = createSupabaseMock({
      topics: [{ data: { name: "Indian Polity" }, error: null }],
      mastery_records: [{ data: null, error: null }],
      mistake_items: [{ data: [], error: null }]
    });

    const result = await assembleTopicContext(supabase, "user-1", "topic-1");
    expect(result).toEqual({ topicName: "Indian Polity", masteryScore: null, recentMistakeTypes: [] });
  });

  it("caps recent mistake types at five", async () => {
    const supabase = createSupabaseMock({
      topics: [{ data: { name: "Indian Polity" }, error: null }],
      mastery_records: [{ data: { mastery_score: 10 }, error: null }],
      mistake_items: [
        {
          data: Array.from({ length: 7 }, (_, i) => ({ mistake_type: `type-${i}` })),
          error: null
        }
      ]
    });

    const result = await assembleTopicContext(supabase, "user-1", "topic-1");
    expect(result.recentMistakeTypes).toHaveLength(5);
  });
});

describe("buildPersonaSystemMessage", () => {
  const persona = { id: "p1", name: "Polity Prof", systemPrompt: "Teach with rigor and clarity." };

  it("includes the persona prompt, topic name, mastery score, and mistake types", () => {
    const message = buildPersonaSystemMessage(persona, {
      topicName: "Indian Polity",
      masteryScore: 63.7,
      recentMistakeTypes: ["wrong", "guessed"]
    });

    expect(message.role).toBe("system");
    expect(message.content).toContain("Teach with rigor and clarity.");
    expect(message.content).toContain("Indian Polity");
    expect(message.content).toContain("64%");
    expect(message.content).toContain("wrong, guessed");
  });

  it("omits mastery/mistake lines when the student has no data yet", () => {
    const message = buildPersonaSystemMessage(persona, {
      topicName: null,
      masteryScore: null,
      recentMistakeTypes: []
    });

    expect(message.content).not.toContain("mastery");
    expect(message.content).not.toContain("Recent unresolved mistake types");
  });
});
