import type { SupabaseClient } from "@supabase/supabase-js";

export const MISTAKE_TYPE_LABELS: Record<string, string> = {
  conceptual_gap: "Conceptual gap",
  time_pressure: "Time pressure",
  silly_mistake: "Silly mistake",
  not_attempted: "Not attempted",
  overconfidence: "Overconfidence",
  lucky_guess: "Lucky guess",
  bookmarked: "Bookmarked"
};

export const MISTAKE_STATUSES = ["unresolved", "reviewed", "resolved", "ignored"] as const;
export type MistakeStatus = (typeof MISTAKE_STATUSES)[number];

export type MistakeListItem = {
  id: string;
  questionId: string;
  sessionId: string;
  topicId: string | null;
  topicName: string | null;
  conceptId: string | null;
  conceptName: string | null;
  mistakeType: string;
  confidence: string | null;
  status: string;
  createdAt: string;
  stem: string | null;          // best-effort, from session_questions.prompt_snapshot
};

export type MistakeFilters = { status?: string; mistakeType?: string };

// Returns the user's mistakes for one exam, newest first, with topic/concept
// names joined and a best-effort answer-stripped stem. Never throws on a bad
// optional join — degrades to null labels.
export async function fetchMistakeItems(
  supabase: SupabaseClient,
  userId: string,
  examId: string,
  filters: MistakeFilters = {}
): Promise<MistakeListItem[]> {
  let query = supabase
    .from("mistake_items")
    .select("id,question_id,session_id,topic_id,concept_id,mistake_type,confidence,status,created_at")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.status && MISTAKE_STATUSES.includes(filters.status as MistakeStatus)) {
    query = query.eq("status", filters.status);
  }
  if (filters.mistakeType && filters.mistakeType in MISTAKE_TYPE_LABELS) {
    query = query.eq("mistake_type", filters.mistakeType);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  const topicIds = Array.from(new Set(data.map(d => d.topic_id).filter(Boolean))) as string[];
  const conceptIds = Array.from(new Set(data.map(d => d.concept_id).filter(Boolean))) as string[];
  const sessionIds = Array.from(new Set(data.map(d => d.session_id).filter(Boolean))) as string[];

  const topicMap = new Map<string, string>();
  const conceptMap = new Map<string, string>();
  const stemMap = new Map<string, string>(); // Key: "session_id:question_id"

  // Fetch topic names in a batch
  if (topicIds.length > 0) {
    try {
      const { data: topicsData } = await supabase
        .from("topics")
        .select("id,name")
        .in("id", topicIds);
      if (topicsData) {
        topicsData.forEach(t => topicMap.set(t.id, t.name));
      }
    } catch (e) {
      console.error("[mistake-list] failed to fetch topic names", e);
    }
  }

  // Fetch concept names in a batch
  if (conceptIds.length > 0) {
    try {
      const { data: conceptsData } = await supabase
        .from("concepts")
        .select("id,name")
        .in("id", conceptIds);
      if (conceptsData) {
        conceptsData.forEach(c => conceptMap.set(c.id, c.name));
      }
    } catch (e) {
      console.error("[mistake-list] failed to fetch concept names", e);
    }
  }

  // Fetch stems best-effort from session_questions.prompt_snapshot
  if (sessionIds.length > 0) {
    try {
      const { data: sessionQuestionsData } = await supabase
        .from("session_questions")
        .select("session_id,question_id,prompt_snapshot")
        .in("session_id", sessionIds);
      if (sessionQuestionsData) {
        const { extractStem } = await import("@/lib/ai/jobs/question-context");
        sessionQuestionsData.forEach(sq => {
          try {
            const stem = extractStem(sq.prompt_snapshot);
            if (stem) {
              stemMap.set(`${sq.session_id}:${sq.question_id}`, stem);
            }
          } catch {
            // ignore individual conversion failures
          }
        });
      }
    } catch (e) {
      console.error("[mistake-list] failed to fetch session questions for stems", e);
    }
  }

  type RawMistakeRow = {
    id: string;
    question_id: string;
    session_id: string;
    topic_id: string | null;
    concept_id: string | null;
    mistake_type: string;
    confidence: string | null;
    status: string;
    created_at: string;
  };

  return (data as RawMistakeRow[]).map((item): MistakeListItem => {
    const key = `${item.session_id}:${item.question_id}`;
    return {
      id: item.id,
      questionId: item.question_id,
      sessionId: item.session_id,
      topicId: item.topic_id,
      topicName: item.topic_id ? (topicMap.get(item.topic_id) ?? null) : null,
      conceptId: item.concept_id,
      conceptName: item.concept_id ? (conceptMap.get(item.concept_id) ?? null) : null,
      mistakeType: item.mistake_type,
      confidence: item.confidence,
      status: item.status,
      createdAt: item.created_at,
      stem: stemMap.get(key) ?? null
    };
  });
}
