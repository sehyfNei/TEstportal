"use client";

import { useActionState } from "react";
import {
  type BulkQuestionImportActionState,
  importQuestionsAction
} from "@/app/admin/questions/import/actions";

const sampleJson = JSON.stringify(
  [
    {
      examId: "00000000-0000-4000-8000-000000000000",
      topicId: "11111111-1111-4111-8111-111111111111",
      type: "mcq",
      difficulty: "medium",
      source: "manual",
      status: "draft",
      exposurePolicy: "practice",
      qualityTier: "bronze",
      content: {
        text: "Question text in markdown",
        options: ["A", "B", "C", "D"],
        correct_options: [0],
        correct_integer: null,
        pairs: null,
        images: []
      },
      explanation: "Short explanation."
    }
  ],
  null,
  2
);

const initialBulkQuestionImportActionState: BulkQuestionImportActionState = {
  ok: false,
  message: "",
  totalRows: 0,
  validRows: 0,
  importedRows: 0,
  errors: []
};

export function QuestionImporter() {
  const [state, formAction, isPending] = useActionState(
    importQuestionsAction,
    initialBulkQuestionImportActionState
  );

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <label className="grid gap-2 text-sm font-medium">
          Format
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue="json"
            name="format"
          >
            <option value="json">JSON array</option>
            <option value="csv">CSV</option>
          </select>
        </label>

        <label className="flex items-end gap-2 pb-3 text-sm font-medium">
          <input
            className="h-4 w-4 rounded border-border"
            defaultChecked
            name="dryRun"
            type="checkbox"
          />
          Validate only
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        Import payload
        <textarea
          className="min-h-[420px] rounded-md border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
          defaultValue={sampleJson}
          name="payload"
          spellCheck={false}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Processing..." : "Run import"}
        </button>
        {state.message ? <ImportSummary state={state} /> : null}
      </div>

      {state.errors.length ? (
        <div className="rounded-xl border border-border bg-card shadow-card p-4">
          <h2 className="text-sm font-semibold">Validation errors</h2>
          <div className="mt-3 grid gap-2">
            {state.errors.slice(0, 25).map((error) => (
              <p className="text-sm text-muted-foreground" key={`${error.row}-${error.message}`}>
                Row {error.row}: {error.message}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}

function ImportSummary({
  state
}: {
  state: {
    ok: boolean;
    message: string;
    totalRows: number;
    validRows: number;
    importedRows: number;
  };
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-sm ${
        state.ok
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      <p>{state.message}</p>
      <p className="mt-1 text-xs">
        Rows: {state.totalRows} / valid: {state.validRows} / imported: {state.importedRows}
      </p>
    </div>
  );
}
