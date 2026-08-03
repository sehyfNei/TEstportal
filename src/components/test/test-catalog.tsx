"use client";

import { useState } from "react";
import Link from "next/link";
import { TEST_MODES, type CatalogPreselect, type TestModeId } from "@/lib/tests/catalog";
import { StartTest, type ExamOption, type TopicOption } from "@/components/test/start-test";
import type { TestExperience } from "@/lib/test-session/experience";

type TestCatalogProps = {
  exams: ExamOption[];
  topics: TopicOption[];
  preselect: CatalogPreselect;
  experience: TestExperience;
};

export function TestCatalog({ exams, experience, topics, preselect }: TestCatalogProps) {
  const [selectedModeId, setSelectedModeId] = useState<TestModeId>(preselect.modeId);
  const selectedMode = TEST_MODES.find((mode) => mode.id === selectedModeId) ?? TEST_MODES[0];

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {TEST_MODES.map((mode) => {
          const isSelected = mode.id === selectedMode.id;

          return (
            <button
              aria-pressed={isSelected}
              className={`min-w-0 rounded-xl border p-4 text-left transition ${
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
          className="min-w-0 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/50"
          href="/mistakes"
        >
          <p className="text-sm font-semibold">Mistake retest</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Review your notebook and start due retests — they unlock on their scheduled date.
          </p>
        </Link>
      </div>

      <StartTest
        exams={exams}
        experience={experience}
        initialTopicId={preselect.topicId}
        key={selectedMode.id}
        mode={selectedMode}
        scheduledItemId={selectedMode.id === preselect.modeId ? preselect.scheduleId : null}
        topics={topics}
      />
    </div>
  );
}
