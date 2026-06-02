import { expect, test } from "@playwright/test";

test("home page renders the phase 0 console", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Test-led preparation engine" })).toBeVisible();
});

