import { expect, test } from "@playwright/test";

test("guest core workspace smoke: itinerary, ledger, and refresh persist", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /杭州/ }).first()).toBeVisible();
  await page.getByRole("button", { name: /账本/ }).click();
  await expect(page.getByText("总预算").first()).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /账本/ }).click();
  await expect(page.getByText("总预算").first()).toBeVisible();
});

test("independent smoke boundary for real third-party environments", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
});
