"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import {
  deleteTemplateAction,
  fetchTemplateQuestionsAction,
  saveTemplateAction,
  setTemplateActiveAction,
  type TemplateMutationState,
  type TemplateQuestionOption
} from "@/app/admin/templates/actions";
import { MAX_TEMPLATE_QUESTIONS } from "@/lib/exam/test-template";

export type TemplateExamOption = { id: string; name: string; slug: string };

export type TemplateSummary = {
  id: string;
  examId: string;
  examName: string;
  title: string;
  description: string | null;
  isActive: boolean;
  questionIds: string[];
  questionCount: number;
  durationMinutes: number | null;
};

const initialSave: TemplateMutationState = { ok: false, message: "" };

export function TemplateManager({
  exams,
  templates
}: {
  exams: TemplateExamOption[];
  templates: TemplateSummary[];
}) {
  const [editing, setEditing] = useState<TemplateSummary | null>(null);

  return (
    <div className="grid gap-8">
      <ExistingPapers templates={templates} onEdit={setEditing} editingId={editing?.id ?? null} />
      <TemplateBuilder exams={exams} editing={editing} onClearEdit={() => setEditing(null)} />
    </div>
  );
}

function ExistingPapers({
  templates,
  onEdit,
  editingId
}: {
  templates: TemplateSummary[];
  onEdit: (t: TemplateSummary) => void;
  editingId: string | null;
}) {
  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm text-muted-foreground">
        No fixed papers yet. Build your first one below.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">Existing papers</h2>
      {templates.map((template) => (
        <PaperRow
          key={template.id}
          template={template}
          onEdit={onEdit}
          isEditing={editingId === template.id}
        />
      ))}
    </div>
  );
}

function PaperRow({
  template,
  onEdit,
  isEditing
}: {
  template: TemplateSummary;
  onEdit: (t: TemplateSummary) => void;
  isEditing: boolean;
}) {
  const [activeState, activeAction, activePending] = useActionState(setTemplateActiveAction, initialSave);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTemplateAction, initialSave);
  const message = activeState.message || deleteState.message;

  return (
    <article
      className={`rounded-xl border bg-card shadow-card p-4 ${
        isEditing ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{template.title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                template.isActive
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {template.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {template.examName} · {template.questionCount} question
            {template.questionCount === 1 ? "" : "s"}
            {template.durationMinutes ? ` · ${template.durationMinutes} min` : ""}
          </p>
          {template.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{template.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-primary"
            onClick={() => onEdit(template)}
            type="button"
          >
            Edit
          </button>
          <form action={activeAction}>
            <input name="templateId" type="hidden" value={template.id} />
            <input name="isActive" type="hidden" value={template.isActive ? "false" : "true"} />
            <button
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-primary disabled:opacity-60"
              disabled={activePending}
              type="submit"
            >
              {template.isActive ? "Deactivate" : "Activate"}
            </button>
          </form>
          <form action={deleteAction}>
            <input name="templateId" type="hidden" value={template.id} />
            <button
              className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:border-destructive disabled:opacity-60"
              disabled={deletePending}
              type="submit"
            >
              {deletePending ? "Deleting..." : "Delete"}
            </button>
          </form>
        </div>
      </div>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </article>
  );
}

function TemplateBuilder({
  exams,
  editing,
  onClearEdit
}: {
  exams: TemplateExamOption[];
  editing: TemplateSummary | null;
  onClearEdit: () => void;
}) {
  const [saveState, saveAction, savePending] = useActionState(saveTemplateAction, initialSave);

  const [examId, setExamId] = useState(editing?.examId ?? (exams.length === 1 ? exams[0].id : ""));
  const [available, setAvailable] = useState<TemplateQuestionOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(editing?.questionIds ?? []);
  const [filter, setFilter] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();

  // When the admin picks a paper to edit, hydrate the form from it.
  useEffect(() => {
    if (editing) {
      setExamId(editing.examId);
      setSelectedIds(editing.questionIds);
      setFilter("");
    }
  }, [editing]);

  // Load the chosen exam's live questions whenever the exam changes.
  useEffect(() => {
    if (!examId) {
      setAvailable([]);
      return;
    }
    setLoadError(null);
    startLoad(() => {
      void fetchTemplateQuestionsAction(examId).then((res) => {
        if (res.ok) {
          setAvailable(res.questions);
        } else {
          setAvailable([]);
          setLoadError(res.message);
        }
      });
    });
  }, [examId]);

  // After a successful save, reset to a clean create form.
  useEffect(() => {
    if (saveState.ok) {
      setSelectedIds([]);
      setFilter("");
      onClearEdit();
    }
  }, [saveState.ok, onClearEdit]);

  const byId = useMemo(() => new Map(available.map((q) => [q.id, q])), [available]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return available
      .filter((q) => !selectedSet.has(q.id))
      .filter((q) => (needle ? q.stem.toLowerCase().includes(needle) : true))
      .slice(0, 100);
  }, [available, selectedSet, filter]);

  function add(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) || prev.length >= MAX_TEMPLATE_QUESTIONS ? prev : [...prev, id]
    );
  }
  function remove(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }
  function move(index: number, delta: number) {
    setSelectedIds((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) {
        return prev;
      }
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={saveAction} className="grid gap-5 rounded-xl border border-border bg-card shadow-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{editing ? "Edit paper" : "Build a new paper"}</h2>
        {editing ? (
          <button
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={onClearEdit}
            type="button"
          >
            Cancel edit
          </button>
        ) : null}
      </div>

      {editing ? <input name="templateId" type="hidden" value={editing.id} /> : null}
      <input name="examId" type="hidden" value={examId} />
      <input name="questionIds" type="hidden" value={JSON.stringify(selectedIds)} />

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
                {exam.name} ({exam.slug})
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Duration (minutes, optional)
          <input
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue={editing?.durationMinutes ? String(editing.durationMinutes) : ""}
            key={editing?.id ?? "new-duration"}
            min={1}
            max={600}
            name="durationMinutes"
            type="number"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        Title
        <input
          className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          defaultValue={editing?.title ?? ""}
          key={editing?.id ?? "new-title"}
          maxLength={160}
          name="title"
          placeholder="e.g. UPSC Prelims 2024 – Full Mock 1"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Description (optional)
        <textarea
          className="min-h-[64px] rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          defaultValue={editing?.description ?? ""}
          key={editing?.id ?? "new-desc"}
          name="description"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          defaultChecked={editing ? editing.isActive : true}
          key={editing?.id ?? "new-active"}
          name="isActive"
          type="checkbox"
          value="true"
        />
        Active (students can start it)
      </label>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Available questions</p>
            {isLoading ? <span className="text-xs text-muted-foreground">Loading…</span> : null}
          </div>
          <input
            className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by text"
            value={filter}
          />
          {loadError ? <p className="text-xs text-muted-foreground">{loadError}</p> : null}
          <div className="grid max-h-80 gap-2 overflow-y-auto rounded-md border border-border p-2">
            {!examId ? (
              <p className="p-2 text-xs text-muted-foreground">Select an exam to load its live questions.</p>
            ) : filtered.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">
                {available.length === 0 ? "No live questions for this exam." : "No matches — clear the filter."}
              </p>
            ) : (
              filtered.map((q) => (
                <button
                  className="rounded-md border border-border p-2 text-left text-xs hover:border-primary"
                  key={q.id}
                  onClick={() => add(q.id)}
                  type="button"
                >
                  <span className="line-clamp-2 font-medium text-foreground">{q.stem}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {q.type} · {q.qualityTier}
                    {q.topic ? ` · ${q.topic}` : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-semibold">
            Selected ({selectedIds.length}
            {selectedIds.length >= MAX_TEMPLATE_QUESTIONS ? " · max" : ""})
          </p>
          <div className="grid max-h-[22.5rem] gap-2 overflow-y-auto rounded-md border border-border p-2">
            {selectedIds.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">
                Add questions from the left. Their order here is the exact order students will see.
              </p>
            ) : (
              selectedIds.map((id, index) => {
                const q = byId.get(id);
                return (
                  <div className="flex items-start gap-2 rounded-md border border-border p-2 text-xs" key={id}>
                    <span className="mt-0.5 font-semibold text-muted-foreground">{index + 1}.</span>
                    <span className="flex-1">
                      <span className="line-clamp-2 font-medium text-foreground">
                        {q ? q.stem : "Question not in this exam's live pool"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        aria-label="Move up"
                        className="rounded border border-border px-1.5 py-0.5 disabled:opacity-40"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label="Move down"
                        className="rounded border border-border px-1.5 py-0.5 disabled:opacity-40"
                        disabled={index === selectedIds.length - 1}
                        onClick={() => move(index, 1)}
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        aria-label="Remove"
                        className="rounded border border-destructive/40 px-1.5 py-0.5 text-destructive"
                        onClick={() => remove(id)}
                        type="button"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          disabled={savePending || selectedIds.length === 0 || !examId}
          type="submit"
        >
          {savePending ? "Saving..." : editing ? "Update paper" : "Create paper"}
        </button>
        {saveState.message ? (
          <p className={`text-sm ${saveState.ok ? "text-primary" : "text-muted-foreground"}`}>
            {saveState.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
