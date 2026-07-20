"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { fetchExamTopicsAction, type TopicOption } from "@/app/admin/questions/import/actions";
import {
  fetchGenerationConceptsAction,
  generateQuestionsAction,
  saveGeneratedQuestionAction,
  type ConceptOption,
  type GeneratedCandidate
} from "@/app/admin/questions/generate/actions";
import { fetchSourcesForExamAction, type SourceOption } from "@/app/admin/sources/actions";

type ExamOption = { id: string; name: string };
type Difficulty = "easy" | "medium" | "hard";

const MAX_COUNT = 8;

export function QuestionGenerator({ exams }: { exams: ExamOption[] }) {
  const [examId, setExamId] = useState(exams.length === 1 ? exams[0].id : "");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [topicId, setTopicId] = useState("");
  const [concepts, setConcepts] = useState<ConceptOption[]>([]);
  const [conceptId, setConceptId] = useState("");
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(3);

  const [candidates, setCandidates] = useState<GeneratedCandidate[]>([]);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [isGenerating, startGenerate] = useTransition();

  const selectedExamName = exams.find((exam) => exam.id === examId)?.name ?? "";
  const selectedTopic = topics.find((topic) => topic.id === topicId) ?? null;
  const selectedConceptName = concepts.find((concept) => concept.id === conceptId)?.name ?? null;
  const selectedSourceTitle = sources.find((source) => source.id === sourceId)?.title ?? null;

  useEffect(() => {
    setTopics([]);
    setTopicId("");
    setSources([]);
    setSourceId("");
    if (!examId) {
      return;
    }
    void fetchExamTopicsAction(examId).then(setTopics);
    void fetchSourcesForExamAction(examId).then(setSources);
  }, [examId]);

  useEffect(() => {
    setConcepts([]);
    setConceptId("");
    if (!topicId) {
      return;
    }
    void fetchGenerationConceptsAction(topicId).then(setConcepts);
  }, [topicId]);

  const canGenerate = Boolean(examId && topicId && selectedTopic) && !isGenerating;

  function handleGenerate() {
    if (!selectedTopic) {
      return;
    }
    startGenerate(() => {
      setCandidates([]);
      setSavedIndexes(new Set());
      setGenerateMessage(null);
      void generateQuestionsAction({
        examId,
        examName: selectedExamName,
        topicId,
        topicName: selectedTopic.name,
        conceptName: selectedConceptName,
        difficulty,
        count,
        sourceId: sourceId || null
      }).then((result) => {
        setGenerateMessage(result.message);
        if (result.ok) {
          setCandidates(result.candidates);
        }
      });
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 rounded-xl border border-border bg-card shadow-card p-5 sm:grid-cols-2 lg:grid-cols-6">
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
          Topic
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
          Concept (optional)
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            disabled={!topicId || concepts.length === 0}
            onChange={(e) => setConceptId(e.target.value)}
            value={conceptId}
          >
            <option value="">{concepts.length ? "Any concept" : "No concepts tagged"}</option>
            {concepts.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Ground in a source (optional)
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            disabled={!examId || sources.length === 0}
            onChange={(e) => setSourceId(e.target.value)}
            value={sourceId}
          >
            <option value="">{sources.length ? "None — general knowledge" : "No sources for this exam"}</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.title}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Difficulty
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            value={difficulty}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium">
          How many (max {MAX_COUNT})
          <input
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            max={MAX_COUNT}
            min={1}
            onChange={(e) => setCount(Math.min(MAX_COUNT, Math.max(1, Number(e.target.value) || 1)))}
            type="number"
            value={count}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canGenerate}
          onClick={handleGenerate}
          type="button"
        >
          {isGenerating ? "Generating..." : "Generate questions"}
        </button>
        {generateMessage ? <p className="text-sm text-muted-foreground">{generateMessage}</p> : null}
      </div>

      {candidates.length > 0 ? (
        <div className="grid gap-3">
          {selectedSourceTitle ? (
            <p className="text-xs font-medium text-muted-foreground">Grounded in: {selectedSourceTitle}</p>
          ) : null}
          {candidates.map((candidate, index) => (
            <CandidateCard
              candidate={candidate}
              difficulty={difficulty}
              examId={examId}
              isSaved={savedIndexes.has(index)}
              key={index}
              onSaved={() => setSavedIndexes((prev) => new Set(prev).add(index))}
              sourceId={sourceId || null}
              topicId={topicId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CandidateCard({
  candidate,
  difficulty,
  examId,
  isSaved,
  onSaved,
  sourceId,
  topicId
}: {
  candidate: GeneratedCandidate;
  difficulty: Difficulty;
  examId: string;
  isSaved: boolean;
  onSaved: () => void;
  sourceId: string | null;
  topicId: string;
}) {
  const [isSaving, startSave] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const { question, gate } = candidate;

  const correctLetter = useMemo(
    () => String.fromCharCode(65 + question.correctOptionIndex),
    [question.correctOptionIndex]
  );

  function handleSave() {
    startSave(() => {
      void saveGeneratedQuestionAction({ examId, topicId, difficulty, question, gate, sourceId }).then((result) => {
        setMessage(result.message);
        if (result.ok) {
          setQuestionId(result.questionId ?? null);
          onSaved();
        }
      });
    });
  }

  return (
    <article
      className={`rounded-xl border p-4 shadow-card ${
        gate.passed ? "border-border bg-card" : "border-amber-500/40 bg-amber-500/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-6">{question.stem}</p>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            gate.passed ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/15 text-amber-800"
          }`}
        >
          {gate.passed ? "Gates: OK" : "Gates: flagged"}
        </span>
      </div>

      <ol className="mt-3 grid gap-1 text-sm">
        {question.options.map((option, optionIndex) => {
          const isCorrect = optionIndex === question.correctOptionIndex;
          const rationale = question.distractorRationales.find((r) => r.optionIndex === optionIndex);

          return (
            <li className={isCorrect ? "font-semibold text-emerald-700" : ""} key={optionIndex}>
              {String.fromCharCode(65 + optionIndex)}. {option}
              {isCorrect ? " ✓" : ""}
              {rationale ? (
                <span className="block text-xs font-normal text-muted-foreground">
                  Targets: {rationale.misconception}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Correct: {correctLetter} — {question.explanation}
      </p>

      {gate.warnings.length > 0 || gate.notes.length > 0 ? (
        <ul className="mt-3 grid gap-1 text-xs leading-5 text-amber-900/80">
          {gate.warnings.map((warning) => (
            <li key={warning}>⚠ {warning}</li>
          ))}
          {gate.notes.map((note) => (
            <li className="text-muted-foreground" key={note}>
              {note}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isSaved ? (
          <>
            <span className="text-xs font-medium text-emerald-700">Saved as draft.</span>
            {questionId ? (
              <Link className="text-xs font-medium text-primary" href={`/admin/questions/${questionId}`}>
                Open question
              </Link>
            ) : null}
          </>
        ) : (
          <button
            className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            disabled={isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "Saving..." : "Save as draft"}
          </button>
        )}
        {message && !isSaved ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      </div>
    </article>
  );
}
