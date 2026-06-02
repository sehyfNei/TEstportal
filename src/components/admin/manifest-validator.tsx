"use client";

import { useActionState, useMemo, useState } from "react";
import {
  importManifestAction,
  type ManifestImportActionState
} from "@/app/admin/manifests/actions";
import { createManifestImportPlanFromJson } from "@/lib/exam/manifest-import";

const exampleManifest = `{
  "schemaVersion": "1.0",
  "exam": {
    "slug": "sample-exam",
    "name": "Sample Exam",
    "languages": ["en"],
    "supportedQuestionTypes": ["mcq"]
  },
  "marking": {
    "totalQuestions": 100,
    "durationMinutes": 120,
    "marksPerCorrect": 2,
    "negativeMarkingFraction": 0.3333,
    "sections": [{ "slug": "general", "name": "General", "questionCount": 100 }]
  },
  "topics": [{ "slug": "sample-topic", "name": "Sample Topic", "weightPercent": 100 }]
}`;

const initialImportState: ManifestImportActionState = {
  ok: false,
  message: ""
};

export function ManifestValidator() {
  const [rawManifest, setRawManifest] = useState(exampleManifest);
  const [importState, importAction, isImportPending] = useActionState(
    importManifestAction,
    initialImportState
  );

  const validation = useMemo(() => {
    try {
      const plan = createManifestImportPlanFromJson(rawManifest);
      return {
        ok: true as const,
        summary: plan.summary,
        error: null
      };
    } catch (error) {
      return {
        ok: false as const,
        summary: null,
        error: error instanceof Error ? error.message : "Invalid manifest"
      };
    }
  }, [rawManifest]);

  return (
    <form action={importAction} className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <label className="grid gap-2 text-sm font-medium">
        Manifest JSON
        <textarea
          className="min-h-[520px] rounded-md border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
          name="manifest"
          onChange={(event) => setRawManifest(event.target.value)}
          spellCheck={false}
          value={rawManifest}
        />
      </label>

      <aside className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Validation result</h2>
        {validation.ok ? (
          <div className="mt-4 grid gap-3 text-sm">
            <p className="rounded-md border border-border bg-muted px-3 py-2 font-medium text-primary">
              Manifest is valid.
            </p>
            <dl className="grid gap-2 text-muted-foreground">
              <div className="flex justify-between gap-4">
                <dt>Exam</dt>
                <dd className="text-right text-foreground">{validation.summary.examName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Slug</dt>
                <dd className="text-right text-foreground">{validation.summary.examSlug}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Topics</dt>
                <dd className="text-right text-foreground">{validation.summary.topicCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Concepts</dt>
                <dd className="text-right text-foreground">{validation.summary.conceptCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Cutoffs</dt>
                <dd className="text-right text-foreground">{validation.summary.cutoffCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Duration</dt>
                <dd className="text-right text-foreground">
                  {validation.summary.durationMinutes} min
                </dd>
              </div>
            </dl>
            <button
              className="mt-2 h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!validation.ok || isImportPending}
              type="submit"
            >
              {isImportPending ? "Importing..." : "Import to database"}
            </button>
            <p className="text-xs leading-5 text-muted-foreground">
              Import replaces the current hierarchy for this exam slug and preserves old manifest
              records as inactive versions.
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm leading-6 text-muted-foreground">
            {validation.error}
          </p>
        )}
        {importState.message ? (
          <div
            className={`mt-4 rounded-md border px-3 py-2 text-sm leading-6 ${
              importState.ok
                ? "border-primary/30 bg-primary/10 text-foreground"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            <p className="font-medium">{importState.message}</p>
            {importState.result ? (
              <dl className="mt-2 grid gap-1 text-xs">
                <div className="flex justify-between gap-4">
                  <dt>Version</dt>
                  <dd>{importState.result.manifestVersion}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Topics</dt>
                  <dd>{importState.result.topicCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Concepts</dt>
                  <dd>{importState.result.conceptCount}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        ) : null}
      </aside>
    </form>
  );
}
