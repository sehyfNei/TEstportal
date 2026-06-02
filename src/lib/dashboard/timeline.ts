import type { SupabaseClient } from "@supabase/supabase-js";

export type TimelinePoint = {
  sessionId: string;
  type: string;
  scorePercent: number;
  accuracy: number;
  createdAt: string;
};

export async function fetchProgressTimeline(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<TimelinePoint[]> {
  const { data: resultRows, error: resultError } = await supabase
    .from("session_results")
    .select("session_id,score,max_score,accuracy,created_at")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .order("created_at", { ascending: true })
    .limit(20);

  if (resultError) {
    return [];
  }

  const results = (resultRows ?? []) as Array<{
    session_id: string;
    score: number | string | null;
    max_score: number | string | null;
    accuracy: number | string | null;
    created_at: string;
  }>;

  if (results.length === 0) {
    return [];
  }

  const sessionIds = results.map((result) => result.session_id);
  const { data: sessionRows, error: sessionError } = await supabase
    .from("test_sessions")
    .select("id,type")
    .in("id", sessionIds);

  const typeBySessionId = new Map<string, string>();
  if (!sessionError) {
    for (const row of (sessionRows ?? []) as Array<{ id: string; type: string }>) {
      typeBySessionId.set(row.id, row.type);
    }
  }

  return results.map((result) => {
    const score = toNumber(result.score);
    const maxScore = toNumber(result.max_score);
    const rawScorePercent = maxScore > 0 ? (score / maxScore) * 100 : 0;

    return {
      sessionId: result.session_id,
      type: typeBySessionId.get(result.session_id) ?? "unknown",
      scorePercent: clampPercent(rawScorePercent),
      accuracy: clampPercent(toNumber(result.accuracy) * 100),
      createdAt: result.created_at
    };
  });
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function toNumber(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : (value ?? 0);
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}
