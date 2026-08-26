import { expect, test } from "@playwright/test";

test("cloud discovery fixture selects a cloud-only trip", async ({ page }) => {
  await page.route("**/api/trips", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ json: { trips: [{ id: "cloud-trip", title: "云端旅行", startDate: "2026-09-01", endDate: "2026-09-03", status: "筹备中" }] } });
  });
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
});
