import { expect, type Page } from "@playwright/test";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export const PASSWORD = "Passw0rd!";

export async function register(page: Page, email = uniqueEmail()) {
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/events/);
  return email;
}

export async function createEvent(
  page: Page,
  {
    title,
    description,
    importance,
    start,
    end,
  }: {
    title: string;
    description?: string;
    importance?: "Normal" | "Important" | "Critical";
    start?: string;
    end?: string;
  },
) {
  await page.getByRole("button", { name: "New event" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill(title);
  if (start) await dialog.getByLabel("Starts").fill(start);
  if (end) await dialog.getByLabel(/Ends/).fill(end);
  if (importance) await dialog.getByRole("radio", { name: importance }).click();
  if (description) await dialog.getByLabel(/Description/).fill(description);
  await dialog.getByRole("button", { name: "Create event" }).click();
  await expect(dialog).toBeHidden();
}

export function inDays(days: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}
