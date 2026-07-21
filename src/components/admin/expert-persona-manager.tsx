"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchExamTopicsAction, type TopicOption } from "@/app/admin/questions/import/actions";
import { fetchSourcesForExamAction, type SourceOption } from "@/app/admin/sources/actions";
import { createExpertPersonaAction, setPersonaActiveAction } from "@/app/admin/experts/actions";
import { GENERATION_CADENCES, type GenerationCadence } from "@/lib/question-bank/expert-persona-schema";

type ExamOption = { id: string; name: string };

export type PersonaRow = {
  id: string;
  name: string;
  systemPrompt: string;
  generationCadence: string;
  isActive: boolean;
  topicName: string;
  examName: string;
  sourceCount: number;
};

const CADENCE_LABELS: Record<GenerationCadence, string> = {
  manual: "Manual only",
  daily: "Daily",
  weekly: "Weekly"
};

export function ExpertPersonaManager({ exams, personas }: { exams: ExamOption[]; personas: PersonaRow[] }) {
  const [examId, setExamId] = useState(exams.length === 1 ? exams[0].id : "");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topicId, setTopicId] = useState("");
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [cadence, setCadence] = useState<GenerationCadence>("manual");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    setTopics([]);
    setTopicId("");
    setSources([]);
    setSelectedSourceIds(new Set());
    if (!examId) {
      return;
    }
    void fetchExamTopicsAction(examId).then(setTopics);
    void fetchSourcesForExamAction(examId).then(setSources);
  }, [examId]);

  const canSave = Boolean(topicId) && name.trim().length >= 3 && systemPrompt.trim().length >= 20 && !isSaving;

  function toggleSource(sourceId: string) {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  }

  function handleCreate() {
    startSave(() => {
      void createExpertPersonaAction({
        topicId,
        name,
        systemPrompt,
        generationCadence: cadence,
        sourceIds: Array.from(selectedSourceIds)
      }).then((result) => {
        setMessage(result.message);
        if (result.ok) {
          setName("");
          setSystemPrompt("");
          setSelectedSourceIds(new Set());
        }
      });
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 rounded-xl border border-border bg-card shadow-card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            Subject / topic
            <select
              className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              disabled={!examId}
              onChange={(e) => setTopicId(e.target.value)}
              value={topicId}
            >
              <option value="">{examId ? "Select topic" : "Select exam first"}</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Generation cadence
            <select
              className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              onChange={(e) => setCadence(e.target.value as GenerationCadence)}
              value={cadence}
            >
              {GENERATION_CADENCES.map((value) => (
                <option key={value} value={value}>
                  {CADENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Persona name
            <input
              className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Polity Prof"
              value={name}
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          System prompt
          <textarea
            className="min-h-[140px] rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Describe how this expert should teach and talk — its focus, tone, and depth (at least 20 characters)."
            value={systemPrompt}
          />
        </label>

        {sources.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-sm font-medium">Ground in sources (optional)</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {sources.map((source) => (
                <label className="flex items-center gap-2 text-sm" key={source.id}>
                  <input
                    checked={selectedSourceIds.has(source.id)}
                    onChange={() => toggleSource(source.id)}
                    type="checkbox"
                  />
                  {source.title}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="h-11 w-fit rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSave}
            onClick={handleCreate}
            type="button"
          >
            {isSaving ? "Saving..." : "Create expert"}
          </button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </div>

      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">Existing experts</h2>
        {personas.length ? (
          personas.map((persona) => <PersonaCard key={persona.id} persona={persona} />)
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
            No experts defined yet.
          </div>
        )}
      </div>
    </div>
  );
}

function PersonaCard({ persona }: { persona: PersonaRow }) {
  const [isToggling, startToggle] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleToggle() {
    startToggle(() => {
      void setPersonaActiveAction(persona.id, !persona.isActive).then((result) => {
        setMessage(result.message);
      });
    });
  }

  return (
    <article className="rounded-xl border border-border bg-card shadow-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {persona.examName} · {persona.topicName}
          </p>
          <h3 className="mt-1 text-sm font-semibold">{persona.name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              persona.isActive ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"
            }`}
          >
            {persona.isActive ? "Active" : "Inactive"}
          </span>
          <button
            className="h-9 rounded-md border border-border px-3 text-xs font-semibold transition hover:border-primary disabled:opacity-60"
            disabled={isToggling}
            onClick={handleToggle}
            type="button"
          >
            {isToggling ? "Saving..." : persona.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">{persona.systemPrompt}</p>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>Cadence: {persona.generationCadence}</span>
        <span>Sources: {persona.sourceCount}</span>
      </div>

      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </article>
  );
}
