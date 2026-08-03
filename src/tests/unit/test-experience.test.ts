import { describe, expect, it } from "vitest";
import { buildTestSessionHref, normalizeTestExperience } from "@/lib/test-session/experience";

describe("test experience", () => {
  it("accepts beta and defaults every other value to classic", () => {
    expect(normalizeTestExperience("beta")).toBe("beta");
    expect(normalizeTestExperience("classic")).toBe("classic");
    expect(normalizeTestExperience("experimental")).toBe("classic");
    expect(normalizeTestExperience(null)).toBe("classic");
  });

  it("preserves the selected experience in the session URL", () => {
    expect(buildTestSessionHref("session-123", "beta")).toBe(
      "/tests/session-123?experience=beta"
    );
  });

  it("encodes session ids before building the URL", () => {
    expect(buildTestSessionHref("session/123", "classic")).toBe(
      "/tests/session%2F123?experience=classic"
    );
  });
});
