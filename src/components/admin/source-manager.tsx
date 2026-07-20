"use client";

import { useState, useTransition } from "react";
import { createSourceAction } from "@/app/admin/sources/actions";
import { SOURCE_TYPES, type SourceType } from "@/lib/question-bank/source-schema";

type ExamOption = { id: string; name: string };

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  past_year_paper: "Past-year paper",
  article: "Article / news",
  other: "Other"
};

export function SourceManager({ exams }: { exams: ExamOption[] }) {
  const [examId, setExamId] = useState(exams.length === 1 ? exams[0].id : "");
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("article");
  const [bodyText, setBodyText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  const canSave = Boolean(examId) && title.trim().length >= 3 && bodyText.trim().length >= 50 && !isSaving;

  function handleSave() {
    startSave(() => {
      void createSourceAction({ examId, title, sourceType, bodyText }).then((result) => {
        setMessage(result.message);
        if (result.ok) {
          setTitle("");
          setBodyText("");
        }
      });
    });
  }

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card shadow-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Exam
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            onChange={(e) => setExamId(e.target.value)}
            value={examId}
          >
            <option value="">Select exam</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Type
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            onChange={(e) => setSourceType(e.target.value as SourceType)}
            value={sourceType}
          >
            {SOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {SOURCE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        Title
        <input
          className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. UPSC Prelims 2023 GS-I paper"
          value={title}
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Text content
        <textarea
          className="min-h-[200px] rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          onChange={(e) => setBodyText(e.target.value)}
          placeholder="Paste the paper, article, or notes text here (at least 50 characters)."
          value={bodyText}
        />
        <span className="text-xs text-muted-foreground">{bodyText.trim().length} characters</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-11 w-fit rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSave}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "Saving..." : "Add source"}
        </button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}
