"use client";

import { LayoutList, PanelTop } from "lucide-react";
import { useEffect, useState } from "react";
import { FixedPapers, type FixedPaper } from "@/components/test/fixed-papers";
import { TestCatalog } from "@/components/test/test-catalog";
import type { ExamOption, TopicOption } from "@/components/test/start-test";
import type { CatalogPreselect } from "@/lib/tests/catalog";
import {
  normalizeTestExperience,
  TEST_EXPERIENCE_STORAGE_KEY,
  type TestExperience
} from "@/lib/test-session/experience";
import { cn } from "@/lib/utils";

type TestLaunchpadProps = {
  betaAvailable: boolean;
  exams: ExamOption[];
  fixedPapers: FixedPaper[];
  preselect: CatalogPreselect;
  topics: TopicOption[];
};

const experiences: {
  icon: typeof LayoutList;
  label: string;
  value: TestExperience;
}[] = [
  { icon: LayoutList, label: "Classic", value: "classic" },
  { icon: PanelTop, label: "Beta CBT", value: "beta" }
];

export function TestLaunchpad({
  betaAvailable,
  exams,
  fixedPapers,
  preselect,
  topics
}: TestLaunchpadProps) {
  const [experience, setExperience] = useState<TestExperience>("classic");

  useEffect(() => {
    if (!betaAvailable) {
      return;
    }

    setExperience(normalizeTestExperience(window.localStorage.getItem(TEST_EXPERIENCE_STORAGE_KEY)));
  }, [betaAvailable]);

  function selectExperience(value: TestExperience) {
    if (value === "beta" && !betaAvailable) {
      return;
    }

    setExperience(value);
    window.localStorage.setItem(TEST_EXPERIENCE_STORAGE_KEY, value);
  }

  return (
    <div className="grid gap-6">
      {betaAvailable ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
          <p className="text-sm font-semibold">Test experience</p>
          <div className="inline-flex rounded-md border border-border bg-muted p-1" role="group">
            {experiences.map((option) => {
              const Icon = option.icon;
              const active = experience === option.value;

              return (
                <button
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-semibold transition",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  key={option.value}
                  onClick={() => selectExperience(option.value)}
                  type="button"
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <TestCatalog
        exams={exams}
        experience={experience}
        preselect={preselect}
        topics={topics}
      />
      <FixedPapers experience={experience} papers={fixedPapers} />
    </div>
  );
}
