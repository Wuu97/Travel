import { expect, test } from "@playwright/test";

test("browser storage keeps guest and user scopes separate", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("tuyu-trip-library:guest", JSON.stringify([{ id: "guest-trip", title: "Guest", startDate: "2026-01-01", endDate: "2026-01-02", status: "筹备中" }]));
    localStorage.setItem("tuyu-trip-library:user-a", JSON.stringify([{ id: "user-trip", title: "User", startDate: "2026-02-01", endDate: "2026-02-02", status: "进行中" }]));
  });
  await expect(page.evaluate(() => localStorage.getItem("tuyu-trip-library:guest"))).resolves.toContain("guest-trip");
  await expect(page.evaluate(() => localStorage.getItem("tuyu-trip-library:user-a"))).resolves.toContain("user-trip");
});
