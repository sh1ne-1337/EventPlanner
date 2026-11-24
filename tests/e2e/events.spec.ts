import { expect, test } from "@playwright/test";

import { createEvent, inDays, register } from "./helpers";

test.beforeEach(async ({ page }) => {
  await register(page);
});

test("create, search, filter, edit and delete events in the list view", async ({ page }) => {
  await page.getByRole("radio", { name: "List view" }).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.getByText("Plan something!")).toBeVisible();

  await createEvent(page, {
    title: "Quarterly planning",
    description: "Roadmap for the next quarter",
    importance: "Critical",
    start: inDays(1, 10),
    end: inDays(1, 12),
  });
  await createEvent(page, {
    title: "Зустріч з командою",
    importance: "Normal",
    start: inDays(2, 11),
  });

  const list = page.locator("article");
  await expect(list).toHaveCount(2);
  await expect(page.getByText("Event created").first()).toBeVisible();

  await page.getByLabel("Search events").fill("зуст");
  await expect(page).toHaveURL(/q=/);
  await expect(list).toHaveCount(1);
  await expect(list.first()).toContainText("Зустріч з командою");

  await page.getByLabel("Search events").fill("roadmap");
  await expect(list).toHaveCount(1);
  await expect(list.first()).toContainText("Quarterly planning");
  await page.getByLabel("Clear search").click();
  await expect(list).toHaveCount(2);

  await page
    .getByRole("toolbar", { name: "Filter by importance" })
    .getByRole("button", { name: "Critical" })
    .click();
  await expect(page).toHaveURL(/importance=CRITICAL/);
  await expect(list).toHaveCount(1);
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(list).toHaveCount(2);

  await page.getByRole("button", { name: "Edit “Quarterly planning”" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Title")).toHaveValue("Quarterly planning");
  await dialog.getByLabel("Title").fill("Quarterly planning (moved)");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Quarterly planning (moved)")).toBeVisible();

  await page.getByRole("button", { name: "Delete “Quarterly planning (moved)”" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("cannot be undone");
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(list).toHaveCount(2);

  await page.getByRole("button", { name: "Delete “Quarterly planning (moved)”" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(list).toHaveCount(1);
  await expect(page.getByText("Quarterly planning (moved)")).toHaveCount(0);

  await page.reload();
  await expect(page.locator("article")).toHaveCount(1);
});

test("moving the start keeps the event duration", async ({ page }) => {
  await page.getByRole("button", { name: "New event" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Starts").fill(inDays(3, 14));
  await dialog.getByLabel(/Ends/).fill(inDays(3, 16));
  await dialog.getByLabel("Starts").fill(inDays(5, 9));
  await expect(dialog.getByLabel(/Ends/)).toHaveValue(inDays(5, 11));
});

test("validates the event form", async ({ page }) => {
  await page.getByRole("button", { name: "New event" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("   ");
  await dialog.getByLabel("Starts").fill(inDays(0, 5));
  await dialog.getByLabel(/Ends/).fill(inDays(0, 1));
  await dialog.getByRole("button", { name: "Create event" }).click();
  await expect(dialog.getByText("Title is required")).toBeVisible();
  await expect(dialog.getByText("End must be after start")).toBeVisible();
});

test("clicking a day in the calendar opens the form for that date", async ({ page }) => {
  await expect(page.locator(".fc")).toBeVisible();

  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const key = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  await page.locator(`.fc-daygrid-day[data-date="${key}"] .fc-daygrid-day-frame`).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Starts")).toHaveValue(`${key}T09:00`);
  await dialog.getByLabel("Title").fill("Calendar event");
  await dialog.getByRole("button", { name: "Create event" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.locator(".fc-event", { hasText: "Calendar event" })).toBeVisible();

  await page.locator(".fc-event", { hasText: "Calendar event" }).click();
  await expect(page.getByRole("dialog").getByLabel("Title")).toHaveValue("Calendar event");
});

test("users only see their own events", async ({ page, browser }) => {
  await page.getByRole("radio", { name: "List view" }).click();
  await createEvent(page, { title: "Private event of user A", start: inDays(1) });
  await expect(page.locator("article")).toHaveCount(1);

  const contextB = await browser.newContext({ timezoneId: "Europe/Kyiv" });
  const pageB = await contextB.newPage();
  await register(pageB);
  await pageB.goto("/events?view=list&scope=all");
  await expect(pageB.getByText("Plan something!")).toBeVisible();
  await expect(pageB.locator("article")).toHaveCount(0);
  await expect(pageB.getByText("Private event of user A")).toHaveCount(0);
  await contextB.close();
});

test("all-day events keep their date in every time zone", async ({ page, browser }) => {
  await page.getByRole("radio", { name: "List view" }).click();
  await page.getByRole("button", { name: "New event" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title").fill("Public holiday");
  await dialog.getByLabel("All day").click();
  const day = inDays(2).slice(0, 10);
  await dialog.getByLabel("Start date").fill(day);
  await dialog.getByRole("button", { name: "Create event" }).click();
  await expect(dialog).toBeHidden();

  const storage = await page.context().storageState();
  const newYork = await browser.newContext({
    timezoneId: "America/New_York",
    storageState: storage,
  });
  const ny = await newYork.newPage();
  await ny.goto(`/events?date=${day}`);
  await expect(
    ny.locator(`.fc-daygrid-day[data-date="${day}"] .fc-event`, { hasText: "Public holiday" }),
  ).toBeVisible();
  await newYork.close();
});

test("the calendar follows the URL when navigating back to today", async ({ page }) => {
  await expect(page.locator(".fc")).toBeVisible();
  const title = page.locator(".fc-toolbar-title");
  const currentMonth = await title.innerText();

  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page).toHaveURL(/date=/);
  await expect(title).not.toHaveText(currentMonth);

  await page.getByRole("link", { name: "Planner" }).click();
  await expect(title).toHaveText(currentMonth);
});
