// Generation quality gates (TSP-073).
//
// Runs against each AI-generated candidate before an admin can save it. Pure
// and advisory: a failing gate never blocks a save, it just gets written
// into the question's reviewer_notes so it stays visible in the existing
// review queue (TSP-024/033) for whoever approves it — no new column, no new
// page. Topic/syllabus alignment is deliberately not checked here: it's
// already a hard DB constraint at save time (assert_question_topic_scope
// inside create_admin_question), so it can't silently pass a soft check here
// and then fail to save later.

import type { GeneratedQuestion } from "@/lib/ai/schemas/question-generation";
import { DUPLICATE_WARN_THRESHOLD, type DuplicateMatch } from "@/lib/question-bank/duplicate-check";

export type QualityGateResult = {
  passed: boolean;
  warnings: string[];
  /** Informational only — never affects `passed`. */
  notes: string[];
};

export function runQualityGates(
  question: GeneratedQuestion,
  duplicateMatches: DuplicateMatch[]
): QualityGateResult {
  const warnings: string[] = [];
  const notes: string[] = [];

  const uniqueOptions = new Set(question.options.map((option) => option.trim().toLowerCase()));
  if (uniqueOptions.size < question.options.length) {
    warnings.push("Two or more answer options are duplicates of each other.");
  }

  const strongestMatch = duplicateMatches.reduce<DuplicateMatch | null>(
    (strongest, match) => (!strongest || match.similarity > strongest.similarity ? match : strongest),
    null
  );
  if (strongestMatch && strongestMatch.similarity >= DUPLICATE_WARN_THRESHOLD) {
    warnings.push(
      `${Math.round(strongestMatch.similarity * 100)}% similar to an existing ${strongestMatch.status} question.`
    );
  }

  if (question.confidence === "low") {
    warnings.push("The model itself reported low confidence in this answer key.");
  } else if (question.confidence === "medium") {
    notes.push("Model self-reported medium confidence in this answer.");
  }

  // TSP-074: distractors are only "adversarial" if each targets a distinct
  // misconception. A model that pastes near-identical rationale text across
  // options has likely generated generic filler, not a real misconception.
  const rationaleTexts = question.distractorRationales.map((r) => r.misconception.trim().toLowerCase());
  if (new Set(rationaleTexts).size < rationaleTexts.length) {
    warnings.push("Two or more distractor rationales are near-duplicates — distractors may not be genuinely adversarial.");
  }

  return { passed: warnings.length === 0, warnings, notes };
}

/** Builds the reviewer_notes text so gate results stay visible after save. */
export function formatGateNote(result: QualityGateResult): string {
  const parts = ["AI-generated question — review before approving."];

  if (result.warnings.length > 0) {
    parts.push(`Quality gates flagged: ${result.warnings.join(" ")}`);
  } else {
    parts.push("Quality gates: no issues detected.");
  }

  if (result.notes.length > 0) {
    parts.push(result.notes.join(" "));
  }

  return parts.join(" ");
}
