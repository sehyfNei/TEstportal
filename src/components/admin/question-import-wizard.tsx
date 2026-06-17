"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  type BulkQuestionImportActionState,
  enrichQuestionsAction,
  type EnrichQuestionsResult,
  type EnrichmentQuestionOutput,
  fetchExamTopicsAction,
  importQuestionsAction,
  type TopicOption
} from "@/app/admin/questions/import/actions";
import {
  type BulkQuestionImportFormat,
  type BulkQuestionImportInput,
  parseBulkQuestionImportPayload
} from "@/lib/question-bank/bulk-question-import";

type ExamOption = {
  id: string;
  name: string;
};

type QuestionImportWizardProps = {
  exams: ExamOption[];
};

type WizardStep = "select" | "compose" | "preview";

type ClientValidation = {
  totalRows: number;
  validRows: number;
  errors: number;
  message: string;
};

type EnrichmentOverrideField = "suggestedDifficulty" | "suggestedExplanation";

const initialImportState: BulkQuestionImportActionState = {
  ok: false,
  message: "",
  totalRows: 0,
  validRows: 0,
  importedRows: 0,
  errors: []
};

const emptyValidation: ClientValidation = {
  totalRows: 0,
  validRows: 0,
  errors: 0,
  message: "Paste JSON or CSV rows to preview validation."
};

const selectClass =
  "h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";
const buttonBase =
  "h-10 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export function QuestionImportWizard({ exams }: QuestionImportWizardProps) {
  const [step, setStep] = useState<WizardStep>("select");
  const [examId, setExamId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topicLoadError, setTopicLoadError] = useState("");
  const [format, setFormat] = useState<BulkQuestionImportFormat>("json");
  const [payload, setPayload] = useState("");
  const [clientValidation, setClientValidation] = useState<ClientValidation>(emptyValidation);
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topicRequestId = useRef(0);
  const [isLoadingTopics, startTopicTransition] = useTransition();

  const selectedExam = exams.find((exam) => exam.id === examId);
  const selectedTopic = topics.find((topic) => topic.id === topicId);
  const template = useMemo(() => buildTemplate(format, examId, topicId), [examId, format, topicId]);

  useEffect(() => {
    if (validationTimer.current) {
      clearTimeout(validationTimer.current);
    }

    validationTimer.current = setTimeout(() => {
      const trimmedPayload = payload.trim();

      if (!trimmedPayload) {
        setClientValidation(emptyValidation);
        return;
      }

      const plan = parseBulkQuestionImportPayload(trimmedPayload, format);
      const totalRows = plan.questions.length + plan.errors.length;

      setClientValidation({
        totalRows,
        validRows: plan.questions.length,
        errors: plan.errors.length,
        message: plan.errors.length
          ? `${plan.errors.length} row${plan.errors.length === 1 ? "" : "s"} have errors.`
          : `${plan.questions.length} row${plan.questions.length === 1 ? "" : "s"} valid.`
      });
    }, 300);

    return () => {
      if (validationTimer.current) {
        clearTimeout(validationTimer.current);
      }
    };
  }, [format, payload]);

  function handleExamChange(nextExamId: string) {
    const requestId = topicRequestId.current + 1;

    topicRequestId.current = requestId;
    setExamId(nextExamId);
    setTopicId("");
    setTopics([]);
    setTopicLoadError("");
    setStep("select");

    if (!nextExamId) return;

    startTopicTransition(() => {
      void fetchExamTopicsAction(nextExamId)
        .then((nextTopics) => {
          if (topicRequestId.current !== requestId) return;

          setTopics(nextTopics);
          setTopicLoadError(nextTopics.length ? "" : "No top-level topics found for this exam.");
        })
        .catch(() => {
          if (topicRequestId.current !== requestId) return;

          setTopics([]);
          setTopicLoadError("Topics could not be loaded.");
        });
    });
  }

  function handleFormatChange(nextFormat: BulkQuestionImportFormat) {
    const currentTemplate = buildTemplate(format, examId, topicId);

    setFormat(nextFormat);
    setPayload((currentPayload) =>
      !currentPayload.trim() || currentPayload === currentTemplate
        ? buildTemplate(nextFormat, examId, topicId)
        : currentPayload
    );
  }

  function handleContinue() {
    const nextTemplate = buildTemplate(format, examId, topicId);

    setPayload((currentPayload) => (currentPayload.trim() ? currentPayload : nextTemplate));
    setStep("compose");
  }

  return (
    <div className="grid gap-6">
      <StepHeader currentStep={step} />

      {step === "select" ? (
        <section className="rounded-xl border border-border bg-card shadow-card p-5">
          <div>
            <h2 className="text-lg font-semibold">Select destination</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Choose where these questions should land before composing the upload payload.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Exam
              <select
                className={selectClass}
                value={examId}
                onChange={(event) => handleExamChange(event.target.value)}
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
              Topic
              <select
                className={selectClass}
                disabled={!examId || isLoadingTopics || !topics.length}
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
              >
                <option value="">{isLoadingTopics ? "Loading topics..." : "Select topic"}</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {topicLoadError ? (
            <p className="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {topicLoadError}
            </p>
          ) : null}

          {!exams.length ? (
            <p className="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Exams are not available yet. Confirm Supabase is configured and the exam catalog is
              seeded.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <SelectionSummary exam={selectedExam?.name} topic={selectedTopic?.name} />
            <button
              className={`${buttonBase} bg-primary px-4 text-primary-foreground hover:opacity-90`}
              disabled={!examId || !topicId}
              type="button"
              onClick={handleContinue}
            >
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === "compose" ? (
        <section className="rounded-xl border border-border bg-card shadow-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Compose payload</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use the pre-filled template or paste a larger batch for the selected exam and topic.
              </p>
            </div>
            <div className="flex rounded-md border border-border p-1">
              <button
                className={formatButtonClass(format === "json")}
                type="button"
                onClick={() => handleFormatChange("json")}
              >
                JSON
              </button>
              <button
                className={formatButtonClass(format === "csv")}
                type="button"
                onClick={() => handleFormatChange("csv")}
              >
                CSV
              </button>
            </div>
          </div>

          <details className="mt-5 rounded-xl border border-border bg-background p-4" open>
            <summary className="cursor-pointer text-sm font-semibold">
              Template with selected IDs
            </summary>
            <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">
              {template}
            </pre>
            <button
              className="mt-3 h-9 rounded-md border border-border px-3 text-sm font-semibold text-primary transition hover:border-primary"
              type="button"
              onClick={() => setPayload(template)}
            >
              Use template
            </button>
          </details>

          <label className="mt-5 grid gap-2 text-sm font-medium">
            Import payload
            <textarea
              className="min-h-[420px] rounded-md border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
              value={payload}
              spellCheck={false}
              onChange={(event) => setPayload(event.target.value)}
            />
          </label>

          <ClientValidationSummary validation={clientValidation} />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              className={`${buttonBase} border border-border text-foreground hover:border-primary`}
              type="button"
              onClick={() => setStep("select")}
            >
              Back
            </button>
            <button
              className={`${buttonBase} bg-primary px-4 text-primary-foreground hover:opacity-90`}
              disabled={!payload.trim()}
              type="button"
              onClick={() => setStep("preview")}
            >
              Preview
            </button>
          </div>
        </section>
      ) : null}

      {step === "preview" ? (
        <PreviewStep
          key={`${format}:${payload}`}
          format={format}
          payload={payload}
          selectedExam={selectedExam?.name ?? "Selected exam"}
          selectedTopic={selectedTopic?.name ?? "Selected topic"}
          onBack={() => setStep("compose")}
        />
      ) : null}
    </div>
  );
}

function StepHeader({ currentStep }: { currentStep: WizardStep }) {
  const steps: Array<{ id: WizardStep; label: string }> = [
    { id: "select", label: "Select" },
    { id: "compose", label: "Compose" },
    { id: "preview", label: "Preview" }
  ];
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((step, index) => (
        <li
          className={`rounded-xl border p-4 ${
            index <= currentIndex ? "border-primary/40 bg-primary/10" : "border-border bg-card"
          }`}
          key={step.id}
        >
          <p className="text-xs font-medium uppercase text-muted-foreground">Step {index + 1}</p>
          <p className="mt-1 text-sm font-semibold">{step.label}</p>
        </li>
      ))}
    </ol>
  );
}

function SelectionSummary({ exam, topic }: { exam?: string; topic?: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {exam ? `Exam: ${exam}` : "No exam selected"}
      {topic ? ` / Topic: ${topic}` : ""}
    </p>
  );
}

function ClientValidationSummary({ validation }: { validation: ClientValidation }) {
  const hasErrors = validation.errors > 0;
  const hasRows = validation.totalRows > 0;

  return (
    <div
      className={`mt-3 rounded-md border px-3 py-2 text-sm ${
        hasRows && !hasErrors
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      <p>{validation.message}</p>
      {hasRows ? (
        <p className="mt-1 text-xs">
          Rows: {validation.totalRows} / valid: {validation.validRows} / errors: {validation.errors}
        </p>
      ) : null}
    </div>
  );
}

function PreviewStep({
  format,
  onBack,
  payload,
  selectedExam,
  selectedTopic
}: {
  format: BulkQuestionImportFormat;
  onBack: () => void;
  payload: string;
  selectedExam: string;
  selectedTopic: string;
}) {
  const dryRunFormRef = useRef<HTMLFormElement>(null);
  const [dryRunState, dryRunAction, isDryRunPending] = useActionState(
    importQuestionsAction,
    initialImportState
  );
  const [importState, importAction, isImportPending] = useActionState(
    importQuestionsAction,
    initialImportState
  );
  const [enrichResult, setEnrichResult] = useState<EnrichQuestionsResult | null>(null);
  const [overrides, setOverrides] = useState<Map<number, Partial<EnrichmentQuestionOutput>>>(
    () => new Map()
  );
  const [effectivePayload, setEffectivePayload] = useState(payload);
  const [isEnriching, startEnrichTransition] = useTransition();
  const parsedPlan = useMemo(
    () => parseBulkQuestionImportPayload(payload, format),
    [format, payload]
  );
  const validQuestions = parsedPlan.questions;
  const canImport = dryRunState.ok && dryRunState.validRows > 0 && !isDryRunPending;
  const canRequestEnrichment =
    dryRunState.ok && dryRunState.validRows > 0 && validQuestions.length > 0;
  const isBatchTooLarge = canRequestEnrichment && validQuestions.length > 30;
  const importFormat = effectivePayload === payload ? format : "json";

  useEffect(() => {
    dryRunFormRef.current?.requestSubmit();
  }, []);

  function handleEnrich() {
    startEnrichTransition(() => {
      setEnrichResult(null);
      void enrichQuestionsAction(validQuestions).then(setEnrichResult);
    });
  }

  function handleAccept(
    rowIndex: number,
    field: EnrichmentOverrideField,
    value: EnrichmentQuestionOutput[EnrichmentOverrideField]
  ) {
    const nextOverrides = new Map(overrides);
    const nextRow = { ...(nextOverrides.get(rowIndex) ?? {}) };

    nextRow[field] = value as never;
    nextOverrides.set(rowIndex, nextRow);
    updateOverrides(nextOverrides);
  }

  function handleDismiss(rowIndex: number, field: EnrichmentOverrideField) {
    const nextOverrides = new Map(overrides);
    const nextRow = { ...(nextOverrides.get(rowIndex) ?? {}) };

    delete nextRow[field];

    if (nextRow.suggestedDifficulty || nextRow.suggestedExplanation) {
      nextOverrides.set(rowIndex, nextRow);
    } else {
      nextOverrides.delete(rowIndex);
    }

    updateOverrides(nextOverrides);
  }

  function updateOverrides(nextOverrides: Map<number, Partial<EnrichmentQuestionOutput>>) {
    setOverrides(nextOverrides);
    setEffectivePayload(
      nextOverrides.size ? JSON.stringify(applyOverrides(validQuestions, nextOverrides), null, 2) : payload
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Preview and import</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {selectedExam} / {selectedTopic} / {format.toUpperCase()}
        </p>
      </div>

      <form ref={dryRunFormRef} action={dryRunAction} className="mt-5 grid gap-3">
        <input name="format" type="hidden" value={format} />
        <input name="payload" type="hidden" value={payload} />
        <input name="dryRun" type="hidden" value="on" />
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={`${buttonBase} border border-border text-foreground hover:border-primary`}
            disabled={isDryRunPending}
            type="submit"
          >
            {isDryRunPending ? "Validating..." : "Run validation"}
          </button>
          {dryRunState.message ? <ImportSummary state={dryRunState} /> : null}
        </div>
      </form>

      {dryRunState.errors.length ? <ErrorList errors={dryRunState.errors} /> : null}

      {canRequestEnrichment ? (
        <div className="mt-5 grid gap-3 rounded-md border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">AI enrichment</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional difficulty and explanation suggestions for this validated batch.
              </p>
            </div>
            {isBatchTooLarge ? null : (
              <button
                className={`${buttonBase} bg-primary px-4 text-primary-foreground hover:opacity-90`}
                disabled={isEnriching || Boolean(enrichResult?.ok)}
                type="button"
                onClick={handleEnrich}
              >
                {isEnriching ? "Enriching..." : "✨ Enrich with AI"}
              </button>
            )}
          </div>

          {isBatchTooLarge ? (
            <p className="text-sm text-muted-foreground">
              AI enrichment is capped at 30 rows per batch. Import is still available.
            </p>
          ) : null}

          {enrichResult && !enrichResult.ok ? (
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              {enrichResult.message}
            </p>
          ) : null}

          {enrichResult?.ok ? (
            <EnrichmentPanel
              overrides={overrides}
              suggestions={enrichResult.suggestions}
              validQuestions={validQuestions}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
            />
          ) : null}
        </div>
      ) : null}

      <form action={importAction} className="mt-5 flex flex-wrap items-center gap-3">
        <input name="format" type="hidden" value={importFormat} />
        <input name="payload" type="hidden" value={effectivePayload} />
        <button
          className={`${buttonBase} bg-primary px-4 text-primary-foreground hover:opacity-90`}
          disabled={!canImport || isImportPending}
          type="submit"
        >
          {isImportPending ? "Importing..." : `Import ${dryRunState.validRows} questions`}
        </button>
        <button
          className={`${buttonBase} border border-border text-foreground hover:border-primary`}
          disabled={isImportPending}
          type="button"
          onClick={onBack}
        >
          Back
        </button>
        {importState.message ? <ImportSummary state={importState} /> : null}
      </form>
    </section>
  );
}

function EnrichmentPanel({
  onAccept,
  onDismiss,
  overrides,
  suggestions,
  validQuestions
}: {
  onAccept: (
    rowIndex: number,
    field: EnrichmentOverrideField,
    value: EnrichmentQuestionOutput[EnrichmentOverrideField]
  ) => void;
  onDismiss: (rowIndex: number, field: EnrichmentOverrideField) => void;
  overrides: Map<number, Partial<EnrichmentQuestionOutput>>;
  suggestions: EnrichmentQuestionOutput[];
  validQuestions: BulkQuestionImportInput[];
}) {
  return (
    <details className="rounded-md border border-border bg-muted/40 p-4" open>
      <summary className="cursor-pointer text-sm font-semibold">
        Review {suggestions.length} suggestion{suggestions.length === 1 ? "" : "s"}
      </summary>
      <div className="mt-4 grid gap-3">
        {suggestions.map((suggestion) => {
          const question = validQuestions[suggestion.rowIndex];
          const stem = question?.content.text ?? "Untitled question";
          const rowOverrides = overrides.get(suggestion.rowIndex);
          const difficultyAccepted =
            rowOverrides?.suggestedDifficulty === suggestion.suggestedDifficulty;
          const explanationAccepted =
            Boolean(suggestion.suggestedExplanation) &&
            rowOverrides?.suggestedExplanation === suggestion.suggestedExplanation;

          return (
            <article
              className="rounded-xl border border-border bg-background p-4"
              key={`${suggestion.rowIndex}-${suggestion.suggestedDifficulty}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Row {suggestion.rowIndex + 1}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{truncateStem(stem)}</p>
                </div>
                <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                  {question?.type ?? "question"}
                </span>
              </div>

              <div className="mt-4 grid gap-4">
                <div className="grid gap-2 rounded-md border border-border bg-card p-3">
                  <p className="text-sm font-medium">
                    Difficulty: {question?.difficulty ?? "medium"} →{" "}
                    {suggestion.suggestedDifficulty}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`${buttonBase} border border-border text-foreground hover:border-primary`}
                      disabled={difficultyAccepted}
                      type="button"
                      onClick={() =>
                        onAccept(
                          suggestion.rowIndex,
                          "suggestedDifficulty",
                          suggestion.suggestedDifficulty
                        )
                      }
                    >
                      {difficultyAccepted ? "Accepted" : "Accept"}
                    </button>
                    <button
                      className={`${buttonBase} border border-border text-muted-foreground hover:border-primary hover:text-foreground`}
                      disabled={!difficultyAccepted}
                      type="button"
                      onClick={() => onDismiss(suggestion.rowIndex, "suggestedDifficulty")}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                {suggestion.suggestedExplanation !== null ? (
                  <div className="grid gap-2 rounded-md border border-border bg-card p-3">
                    <p className="text-sm font-medium">Explanation suggestion</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {suggestion.suggestedExplanation}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={`${buttonBase} border border-border text-foreground hover:border-primary`}
                        disabled={explanationAccepted}
                        type="button"
                        onClick={() =>
                          onAccept(
                            suggestion.rowIndex,
                            "suggestedExplanation",
                            suggestion.suggestedExplanation
                          )
                        }
                      >
                        {explanationAccepted ? "Accepted" : "Accept"}
                      </button>
                      <button
                        className={`${buttonBase} border border-border text-muted-foreground hover:border-primary hover:text-foreground`}
                        disabled={!explanationAccepted}
                        type="button"
                        onClick={() => onDismiss(suggestion.rowIndex, "suggestedExplanation")}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ) : null}

                <p className="text-xs leading-5 text-muted-foreground">
                  Reasoning: {suggestion.reasoning}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </details>
  );
}

function ImportSummary({ state }: { state: BulkQuestionImportActionState }) {
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

function ErrorList({ errors }: { errors: BulkQuestionImportActionState["errors"] }) {
  return (
    <div className="mt-5 rounded-md border border-border bg-background p-4">
      <h3 className="text-sm font-semibold">Validation errors</h3>
      <div className="mt-3 grid gap-2">
        {errors.slice(0, 25).map((error) => (
          <p className="text-sm text-muted-foreground" key={`${error.row}-${error.message}`}>
            Row {error.row}: {error.message}
          </p>
        ))}
      </div>
      {errors.length > 25 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing first 25 of {errors.length} errors.
        </p>
      ) : null}
    </div>
  );
}

function formatButtonClass(isActive: boolean) {
  return `h-8 rounded px-3 text-sm font-semibold transition ${
    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
  }`;
}

function buildTemplate(format: BulkQuestionImportFormat, examId: string, topicId: string) {
  const row = {
    examId,
    topicId,
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
    explanation: ""
  };

  if (format === "json") {
    return JSON.stringify([row], null, 2);
  }

  const headers = [
    "exam_id",
    "topic_id",
    "type",
    "difficulty",
    "source",
    "status",
    "exposure_policy",
    "quality_tier",
    "content_json",
    "explanation"
  ];
  const values = [
    examId,
    topicId,
    row.type,
    row.difficulty,
    row.source,
    row.status,
    row.exposurePolicy,
    row.qualityTier,
    JSON.stringify(row.content),
    row.explanation
  ];

  return `${headers.join(",")}\n${values.map(csvCell).join(",")}`;
}

function applyOverrides(
  questions: BulkQuestionImportInput[],
  overrides: Map<number, Partial<EnrichmentQuestionOutput>>
): BulkQuestionImportInput[] {
  return questions.map((question, index) => {
    const override = overrides.get(index);

    if (!override) {
      return question;
    }

    return {
      ...question,
      ...(override.suggestedDifficulty
        ? { difficulty: override.suggestedDifficulty }
        : {}),
      ...(override.suggestedExplanation
        ? { explanation: override.suggestedExplanation }
        : {})
    };
  });
}

function truncateStem(value: string) {
  return value.length > 80 ? `${value.slice(0, 80)}...` : value;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
