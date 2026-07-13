import { expect, test } from "@playwright/test";
import { hasStudentCreds, loginAsStudent } from "./helpers/auth";

test.describe("diagnostic journey (TSP-132)", () => {
  test.skip(!hasStudentCreds, "E2E_STUDENT_PASSWORD not set");
  test.skip(({ isMobile }) => Boolean(isMobile), "journey runs on desktop chromium only");

  test("student can start, answer, and submit a diagnostic", async ({ page }) => {
    await loginAsStudent(page);

    await page.goto("/tests");
    await expect(page.getByRole("heading", { name: "Test catalog" })).toBeVisible();

    // Diagnostic is the default-selected mode; the exam select auto-fills
    // when exactly one exam is active.
    const examSelect = page.getByLabel("Exam");
    if ((await examSelect.inputValue()) === "") {
      await examSelect.selectOption({ index: 1 });
    }

    await page.getByRole("button", { name: /^start diagnostic/i }).click();

    // An empty question pool fails here — that is a real launch blocker, not
    // a test bug (start_test_session raises only on zero questions).
    await expect(page).toHaveURL(/\/tests\/[0-9a-f-]{36}/, { timeout: 30000 });

    const radios = page.getByRole("radio");
    if ((await radios.count()) > 0) {
      await radios.first().check();
    } else {
      await page.getByRole("checkbox").first().check();
    }

    await page.getByRole("button", { name: "Submit test" }).click();

    // Assert the synchronous result panel; AI analysis resolves async later.
    await expect(page.getByText("Score", { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("heading", { name: /\d+(\.\d+)?\s*\/\s*\d+/ })).toBeVisible();
  });
});
