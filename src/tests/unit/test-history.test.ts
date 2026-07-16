import { describe, expect, it } from "vitest";
import { buildTestHistory } from "@/lib/tests/history";

const session = {
  id: "session-1",
  exam_id: "exam-1",
  type: "diagnostic",
  status: "scored",
  started_at: "2026-07-16T08:00:00.000Z",
  submitted_at: "2026-07-16T09:00:00.000Z",
  created_at: "2026-07-16T07:59:00.000Z"
};

const result = {
  id: "result-1",
  session_id: "session-1",
  score: "72.5",
  max_score: 100,
  accuracy: "0.75",
  attempted: 90,
  correct: 70,
  incorrect: 20,
  skipped: 10
};

describe("buildTestHistory", () => {
  it("combines session, result, exam, and analysis records", () => {
    expect(
      buildTestHistory(
        [session],
        [result],
        [{ session_result_id: "result-1", status: "completed" }],
        [{ id: "exam-1", name: "UPSC Prelims" }]
      )
    ).toEqual([
      expect.objectContaining({
        sessionId: "session-1",
        resultId: "result-1",
        examName: "UPSC Prelims",
        score: 72.5,
        accuracy: 0.75,
        analysisStatus: "completed"
      })
    ]);
  });

  it("marks missing analysis as absent", () => {
    const [item] = buildTestHistory([session], [result], [], []);
    expect(item).toMatchObject({ examName: "Exam", analysisStatus: "absent" });
  });

  it("omits sessions that do not have a scored result", () => {
    expect(buildTestHistory([session], [], [], [])).toEqual([]);
  });
});
