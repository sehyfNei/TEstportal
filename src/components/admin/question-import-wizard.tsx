"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  type BulkQuestionImportActionState,
  fetchExamTopicsAction,
  importQuestionsAction,
  type TopicOption
} from "@/app/admin/questions/import/actions";
import {
  type BulkQuestionImportFormat,
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
  const canImport = dryRunState.ok && dryRunState.validRows > 0 && !isDryRunPending;

  useEffect(() => {
    dryRunFormRef.current?.requestSubmit();
  }, []);

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

      <form action={importAction} className="mt-5 flex flex-wrap items-center gap-3">
        <input name="format" type="hidden" value={format} />
        <input name="payload" type="hidden" value={payload} />
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

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
