"use client";

import { useState } from "react";
import Link from "next/link";
import { TEST_MODES, type CatalogPreselect, type TestModeId } from "@/lib/tests/catalog";
import { StartTest, type ExamOption, type TopicOption } from "@/components/test/start-test";

type TestCatalogProps = {
  exams: ExamOption[];
  topics: TopicOption[];
  preselect: CatalogPreselect;
};

export function TestCatalog({ exams, topics, preselect }: TestCatalogProps) {
  const [selectedModeId, setSelectedModeId] = useState<TestModeId>(preselect.modeId);
  const selectedMode = TEST_MODES.find((mode) => mode.id === selectedModeId) ?? TEST_MODES[0];

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {TEST_MODES.map((mode) => {
          const isSelected = mode.id === selectedMode.id;

          return (
            <button
              aria-pressed={isSelected}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-card"
                  : "border-border bg-card hover:border-primary/50"
              }`}
              key={mode.id}
              onClick={() => setSelectedModeId(mode.id)}
              type="button"
            >
              <p className="text-sm font-semibold">{mode.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{mode.description}</p>
            </button>
          );
        })}

        <Link
          className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/50"
          href="/mistakes"
        >
          <p className="text-sm font-semibold">Mistake retest</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Re-attempt concepts you got wrong, from your mistake notebook.
          </p>
        </Link>
      </div>

      <StartTest
        exams={exams}
        initialTopicId={preselect.topicId}
        key={selectedMode.id}
        mode={selectedMode}
        topics={topics}
      />
    </div>
  );
}
