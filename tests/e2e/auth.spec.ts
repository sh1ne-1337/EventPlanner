import { expect, test } from "@playwright/test";

import { PASSWORD, register, uniqueEmail } from "./helpers";

test("redirects anonymous users to the login page", async ({ page }) => {
  await page.goto("/events");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Welcome back")).toBeVisible();
});

test("validates the registration form on the client", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
});

test("register, sign out and sign back in", async ({ page }) => {
  const email = await register(page);

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("[data-slot=card] [role=alert]")).toContainText(
    "Invalid email or password",
  );

  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/events/);
});

test("rejects duplicate registration", async ({ page, browser }) => {
  const email = await register(page);

  const other = await browser.newPage();
  await other.goto("/register");
  await other.getByLabel("Email").fill(email);
  await other.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await other.getByLabel("Confirm password").fill(PASSWORD);
  await other.getByRole("button", { name: "Create account" }).click();
  await expect(other.locator("[data-slot=card] [role=alert]")).toContainText("already exists");
  await other.close();
});

test("signed-in users are redirected away from auth pages", async ({ page }) => {
  await register(page, uniqueEmail());
  await page.goto("/login");
  await expect(page).toHaveURL(/\/events/);
});
