import { expect, type Page } from "@playwright/test";

// Journey specs authenticate through the real login UI with a live-DB student.
// Set both in .env.local (or the shell) before running `pnpm test:e2e`; specs
// skip cleanly when the password is absent so the suite stays green elsewhere.
export const studentEmail = process.env.E2E_STUDENT_EMAIL ?? "student@example.com";
export const studentPassword = process.env.E2E_STUDENT_PASSWORD ?? "";
export const hasStudentCreds = studentPassword.length > 0;

export async function loginAsStudent(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(studentEmail);
  await page.getByLabel("Password").fill(studentPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(dashboard|tests)/, { timeout: 20000 });
}
