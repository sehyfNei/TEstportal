import { describe, expect, it } from "vitest";
import {
  buildManifestFromForm,
  emptyManifestBuilderValue,
  slugify,
  type ManifestBuilderValue
} from "@/lib/exam/manifest-builder";

const validValue: ManifestBuilderValue = {
  ...emptyManifestBuilderValue(),
  examName: "SSC CGL Tier 1"
};

const validTopics = [
  { name: "Quantitative Aptitude", weightPercent: "25" },
  { name: "General Awareness", weightPercent: "" }
];

describe("slugify", () => {
  it("builds url-safe slugs", () => {
    expect(slugify("SSC CGL Tier 1")).toBe("ssc-cgl-tier-1");
    expect(slugify("  Polity & Governance!  ")).toBe("polity-governance");
    expect(slugify("!!!")).toBe("");
  });
});

describe("buildManifestFromForm", () => {
  it("builds a manifest that passes the importer's own validation", () => {
    const result = buildManifestFromForm(validValue, validTopics);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const manifest = JSON.parse(result.json);

      expect(manifest.schemaVersion).toBe("1.0");
      expect(manifest.exam.slug).toBe("ssc-cgl-tier-1");
      expect(manifest.marking.sections).toEqual([
        { slug: "general", name: "General", questionCount: 100 }
      ]);
      expect(manifest.topics).toEqual([
        { slug: "quantitative-aptitude", name: "Quantitative Aptitude", weightPercent: 25 },
        { slug: "general-awareness", name: "General Awareness" }
      ]);
      expect(result.plan.summary.topicCount).toBe(2);
    }
  });

  it("dedupes topic slugs that collide", () => {
    const result = buildManifestFromForm(validValue, [
      { name: "History", weightPercent: "" },
      { name: "History!", weightPercent: "" }
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const manifest = JSON.parse(result.json);

      expect(manifest.topics.map((topic: { slug: string }) => topic.slug)).toEqual([
        "history",
        "history-2"
      ]);
    }
  });

  it("rejects missing name, bad numbers, no topics, and bad weights", () => {
    expect(buildManifestFromForm({ ...validValue, examName: " " }, validTopics).ok).toBe(false);
    expect(
      buildManifestFromForm({ ...validValue, durationMinutes: "two hours" }, validTopics).ok
    ).toBe(false);
    expect(buildManifestFromForm({ ...validValue, totalQuestions: "0" }, validTopics).ok).toBe(
      false
    );
    expect(buildManifestFromForm(validValue, [{ name: " ", weightPercent: "" }]).ok).toBe(false);

    const badWeight = buildManifestFromForm(validValue, [{ name: "Polity", weightPercent: "150" }]);

    expect(badWeight.ok).toBe(false);
    if (!badWeight.ok) {
      expect(badWeight.message).toContain("between 0 and 100");
    }
  });

  it("ignores blank topic rows left in the form", () => {
    const result = buildManifestFromForm(validValue, [
      { name: "Polity", weightPercent: "" },
      { name: "", weightPercent: "" }
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.summary.topicCount).toBe(1);
    }
  });
});
