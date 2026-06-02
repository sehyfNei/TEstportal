import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/config/site";

describe("siteConfig", () => {
  it("names the product", () => {
    expect(siteConfig.name).toBe("Test Series Portal");
  });
});

