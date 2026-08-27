import { expect, test } from "@playwright/test";

test("guest empty workspace smoke persists across refresh", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "开始规划你的下一段旅程" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "开始规划你的下一段旅程" })).toBeVisible();
});

test("independent smoke boundary for real third-party environments", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
});
