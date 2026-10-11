import type { Page } from "@playwright/test";
import { examples, expect, fillWizard, test } from "./helpers";

const WIDTHS = [320, 360, 768, 1200];
const SHOTS = process.env.SCREENSHOTS === "1";

/** No sideways scrolling, and every control big enough to tap (44 px; links inside a sentence are exempt). */
async function checkLayout(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${where}: page scrolls sideways`).toBeLessThanOrEqual(0);
  const small = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        "button, select, input:not([type=radio]):not([type=checkbox]), label:has(input), nav a, a.rounded-full",
      ),
    ]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 44)
      .map(
        ({ el, r }) =>
          `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(r.height)}px`,
      ),
  );
  expect(small, `${where}: controls under 44 px`).toEqual([]);
}

async function shot(page: Page, name: string, width: number) {
  await checkLayout(page, `${name} @${width}`);
  if (SHOTS) await page.screenshot({ path: `web/test-results/screens/${name}-${width}.png`, fullPage: true });
}

for (const width of WIDTHS) {
  test(`layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("#/");
    await shot(page, "01-start", width);
    await page.goto("#/estimate");
    await page.getByRole("button", { name: "Continue" }).click();
    await shot(page, "02-question-error", width);
    await page.goto("#/q/role");
    await shot(page, "03-question-role", width);
    await page.locator('input[name="victimRole"][value="owner_driver_single_vehicle"]').check();
    await page.getByRole("button", { name: "Continue" }).click();
    await shot(page, "04-stop", width);
    const { input: death } = examples().find((e) => e.name === "death-homemaker.yaml")!;
    await fillWizard(page, death);
    await shot(page, "05-result-death", width);
    await page.goto("#/check");
    await shot(page, "06-check", width);
    const { input: injury } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
    await fillWizard(page, injury);
    const closed = page.locator("[data-disclosure] button[aria-expanded=false]");
    while (await closed.count()) await closed.first().click();
    await shot(page, "07-result-injury-open", width);
    await page.goto("#/offer");
    await page.fill("#offer-amount", "300000");
    await page.getByRole("button", { name: "Check the offer" }).click();
    await shot(page, "08-offer", width);
    await page.goto("#/rules");
    await shot(page, "09-rules", width);
    await page.goto("#/design");
    await expect(page.locator("[data-component]").first()).toBeVisible();
    await shot(page, "10-design", width);
    await page.getByRole("button", { name: "हिंदी" }).click();
    await page.goto("#/q/family");
    await shot(page, "11-question-hi", width);
  });
}

test("the result page prints without the navigation and buttons", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillWizard(page, input);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("header")).toBeHidden();
  // Collapsed sections print in full.
  await expect(page.locator("[data-head]").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeHidden();
  await expect(page.getByTestId("headline")).toBeVisible();
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  expect(pdf.byteLength).toBeGreaterThan(10_000);
  if (SHOTS) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync("web/test-results/screens/result-print.pdf", pdf);
  }
});
