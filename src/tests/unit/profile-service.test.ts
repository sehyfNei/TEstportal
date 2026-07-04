import { describe, expect, it } from "vitest";
import { parseProfileUpdate } from "@/lib/profile/profile-service";

describe("parseProfileUpdate", () => {
  it("returns a normalized update for well-formed input", () => {
    const result = parseProfileUpdate({
      name: "  Rahul  ",
      dailyStudyMinutes: "120",
      prepStartDate: "2026-01-15",
      preferredTestDays: ["Mon", "Wed", "Fri"]
    });

    expect(result).toEqual({
      name: "Rahul",
      dailyStudyMinutes: 120,
      prepStartDate: "2026-01-15",
      preferredTestDays: ["Mon", "Wed", "Fri"]
    });
  });

  it("returns null when name is empty", () => {
    expect(parseProfileUpdate({ name: "  ", dailyStudyMinutes: "60" })).toBeNull();
  });

  it("clamps daily study minutes above 720", () => {
    const result = parseProfileUpdate({ name: "Rahul", dailyStudyMinutes: "900" });

    expect(result?.dailyStudyMinutes).toBe(720);
  });

  it("filters invalid preferred day abbreviations", () => {
    const result = parseProfileUpdate({
      name: "Rahul",
      preferredTestDays: ["Mon", "Xyz", "Fri", ""]
    });

    expect(result?.preferredTestDays).toEqual(["Mon", "Fri"]);
  });
});
