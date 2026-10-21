import { escapeOnOpen, expect, test } from "./helpers";

/**
 * Four ways of answering share one set of answers. Each has its own address and a visible way to change how to
 * answer; the phone remembers only which way was chosen.
 */

test("the one-page calculator has its own address, with a way to change how to answer", async ({ page }) => {
  await page.goto("#/all");
  await expect(page.locator('[data-question="kind"]')).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find your amount");
  const change = page.getByRole("button", { name: "Change how I answer" });
  await expect(change).toHaveAttribute("aria-expanded", "false");
  await change.click();
  await expect(change).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: /See it all/ })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(change).toHaveAttribute("aria-expanded", "false");
  await expect(change).toBeFocused();
});

test("Escape closes the list of ways from the moment it opens", async ({ page }) => {
  await escapeOnOpen(page);
  await page.goto("#/all");
  const change = page.getByRole("button", { name: "Change how I answer" });
  await change.click();
  await expect(page.locator("html")).toHaveAttribute("data-escaped", "1");
  await expect(change).toHaveAttribute("aria-expanded", "false");
  await expect(change).toBeFocused();
});

test("answers given in one place are there in the other, and after a reload", async ({ page }) => {
  await page.goto("#/all");
  await page.fill("#age", "40");
  await page.goto("#/all");
  await expect(page.locator("#age")).toHaveValue("40");
  await page.reload();
  await expect(page.locator("#age")).toHaveValue("40");
  await page.goto("#/all");
  await expect(page.locator("#age")).toHaveValue("40");
});

test("the way of answering chosen is remembered on this phone, and nothing else is", async ({ page }) => {
  await page.goto("#/all");
  await page.fill("#age", "40");
  await page.getByRole("button", { name: "Change how I answer" }).click();
  await page.getByRole("link", { name: /See it all/ }).click();
  await expect(page.getByRole("button", { name: "Change how I answer" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  const local = await page.evaluate(() => ({ ...localStorage }));
  expect(local).toEqual({ "mact-calculator.mode": "all" });
});
