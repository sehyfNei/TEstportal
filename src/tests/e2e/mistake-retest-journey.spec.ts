import { expect, test } from "@playwright/test";
import { hasStudentCreds, loginAsStudent } from "./helpers/auth";

test.describe("mistake retest journey (TSP-133)", () => {
  test.skip(!hasStudentCreds, "E2E_STUDENT_PASSWORD not set");
  test.skip(({ isMobile }) => Boolean(isMobile), "journey runs on desktop chromium only");

  test("student can review the mistake notebook and start a due retest", async ({ page }) => {
    await loginAsStudent(page);

    // Notebook renders: either grouped mistakes or the documented empty state.
    await page.goto("/mistakes");
    await expect(page.getByText("Mistake Notebook").first()).toBeVisible();
    const emptyNotice = page.getByText(/No mistakes here yet/);
    const notebookHasItems = !(await emptyNotice.isVisible());

    // Retests are started from the dashboard's Due retests card.
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Due retests" })).toBeVisible();

    const retestCard = page.locator("#due-retests");
    const startButtons = retestCard.getByRole("button", { name: /start/i });

    if ((await startButtons.count()) > 0) {
      await startButtons.first().click();
      await expect(page).toHaveURL(/\/tests\/[0-9a-f-]{36}/, { timeout: 30000 });
      await expect(page.getByRole("button", { name: "Submit test" })).toBeVisible();
    } else {
      // Render paths verified; no retest was due for the e2e student. Recorded
      // as a data gap instead of a silent pass so Sanity re-runs it with data.
      await expect(retestCard.getByText(/No retests due yet/)).toBeVisible();
      test.info().annotations.push({
        type: "data-gap",
        description: `no due retests for e2e student (notebook items: ${notebookHasItems}); start-retest click not exercised`
      });
    }
  });
});
