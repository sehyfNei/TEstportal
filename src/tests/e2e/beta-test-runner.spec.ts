import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const canCreateSmokeUser = Boolean(supabaseUrl && serviceRoleKey);

test.describe("beta CBT journey (TSP-205)", () => {
  test.setTimeout(60000);
  test.skip(!canCreateSmokeUser, "Supabase service-role configuration is unavailable");

  let userId = "";
  let email = "";
  let password = "";

  test.beforeAll(async () => {
    email = `beta-smoke-${randomUUID()}@example.com`;
    password = `BetaSmoke!${randomUUID()}`;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error || !data.user) {
      throw error ?? new Error("Temporary beta smoke user was not created");
    }

    userId = data.user.id;
  });

  test.afterAll(async () => {
    if (!userId) {
      return;
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const { error } = await admin.auth.admin.deleteUser(userId);

      if (!error) {
        return;
      }

      if (attempt === 3) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  });

  test("student can opt in, answer, navigate, and submit", async ({ isMobile, page }, testInfo) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/(dashboard|tests)/, { timeout: 20000 });

    await page.goto("/tests");
    await page.getByRole("button", { name: "Beta CBT" }).click();
    await expect(page.getByRole("button", { name: "Beta CBT" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    const examSelect = page.getByLabel("Exam");
    if ((await examSelect.inputValue()) === "") {
      await examSelect.selectOption({ index: 1 });
    }
    await page.getByLabel("Questions").fill("3");
    const startButton = page.getByRole("button", { name: /^start diagnostic/i });
    await startButton.click();

    await expect(page).toHaveURL(/\/tests\/[0-9a-f-]{36}\?experience=beta/, {
      timeout: 30000
    });
    await expect(page.getByText("UPSC Practice Portal")).toBeVisible();
    await expect(page.getByText("How confident are you?")).toBeHidden();

    const radios = page.getByRole("radio");
    const checkboxes = page.getByRole("checkbox");
    if ((await radios.count()) > 0) {
      await radios.first().check();
    } else if ((await checkboxes.count()) > 0) {
      await checkboxes.first().check();
    } else {
      await page.getByPlaceholder("Enter a number").fill("1");
    }

    await expect(page.getByText("How confident are you?")).toBeVisible();
    await page.getByRole("button", { name: "Sure", exact: true }).click();
    await expect(page.getByText("Question 2", { exact: true }).first()).toBeVisible();

    if (isMobile) {
      await page.getByRole("button", { name: "Open question palette" }).click();
      await expect(page.getByRole("heading", { name: "Question palette" })).toBeVisible();
      await page.getByRole("button", { name: "Close question palette" }).last().click();
    } else {
      await expect(page.getByRole("heading", { name: "Question palette" })).toBeVisible();
    }

    await page.screenshot({ path: testInfo.outputPath("beta-runner.png") });
    await page.getByRole("button", { name: "Open submit confirmation" }).click();
    await page.getByRole("button", { name: "Submit test" }).click();
    await expect(page.getByText("Test complete")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Score", { exact: true })).toBeVisible();
  });
});
