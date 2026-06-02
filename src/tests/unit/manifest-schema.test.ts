import { describe, expect, it } from "vitest";
import upscManifest from "../../../supabase/seed/upsc-prelims.manifest.json";
import {
  createManifestImportPlan,
  flattenTopics,
  parseExamManifest,
  summarizeManifest
} from "@/lib/exam/manifest-import";

describe("exam manifest validation", () => {
  it("parses the UPSC seed manifest", () => {
    const manifest = parseExamManifest(upscManifest);
    const summary = summarizeManifest(manifest);

    expect(summary.examSlug).toBe("upsc-prelims");
    expect(summary.totalQuestions).toBe(100);
    expect(summary.topicCount).toBeGreaterThan(7);
    expect(summary.conceptCount).toBeGreaterThan(0);
  });

  it("flattens topic hierarchy with levels and parent slugs", () => {
    const manifest = parseExamManifest(upscManifest);
    const flattened = flattenTopics(manifest.topics);
    const parliament = flattened.find((topic) => topic.slug === "parliament");

    expect(parliament).toMatchObject({
      parentSlug: "polity",
      level: 2
    });
  });

  it("rejects unsupported manifest versions", () => {
    expect(() =>
      parseExamManifest({
        ...upscManifest,
        schemaVersion: "2.0"
      })
    ).toThrow();
  });

  it("creates a database import plan with normalized topics", () => {
    const plan = createManifestImportPlan(upscManifest);
    const parliament = plan.topics.find((topic) => topic.slug === "parliament");

    expect(plan.summary.examSlug).toBe("upsc-prelims");
    expect(parliament).toMatchObject({
      parent_slug: "polity",
      level: 2,
      order_index: 1
    });
  });

  it("rejects concepts that reference unknown topic slugs", () => {
    expect(() =>
      createManifestImportPlan({
        ...upscManifest,
        concepts: [
          {
            slug: "bad-reference",
            name: "Bad Reference",
            topicSlug: "missing-topic"
          }
        ]
      })
    ).toThrow('Concept "bad-reference" references unknown topic "missing-topic".');
  });

  it("rejects duplicate topic slugs before database import", () => {
    expect(() =>
      createManifestImportPlan({
        ...upscManifest,
        topics: [
          ...upscManifest.topics,
          {
            slug: "polity",
            name: "Duplicate Polity"
          }
        ]
      })
    ).toThrow("Duplicate topic slug: polity");
  });
});
