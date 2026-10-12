import type { Page } from "@playwright/test";
import { examples, expect, fillForm, openGroup, radio, test } from "./helpers";

const WIDTHS = [320, 360, 390, 768, 1280];
const SHOTS = process.env.SCREENSHOTS === "1";

/**
 * No sideways scrolling, and every control big enough to tap: 44 px on a phone (below 640 px wide), the 24 px
 * WCAG 2.2 minimum above that, where the page uses the website's 36–40 px controls. Links inside a sentence are
 * exempt.
 */
async function checkLayout(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${where}: page scrolls sideways`).toBeLessThanOrEqual(0);
  const small = await page.evaluate(() => {
    const min = window.innerWidth < 640 ? 44 : 24;
    return [
      ...document.querySelectorAll<HTMLElement>(
        "button, select, input:not([type=radio]):not([type=checkbox]), label:has(input), nav a, a[data-missing]",
      ),
    ]
      .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === "fixed")
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height < min)
      .map(
        ({ el, r }) =>
          `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(r.height)}px`,
      );
  });
  expect(small, `${where}: controls too small to tap`).toEqual([]);
}

async function shot(page: Page, name: string, width: number) {
  await checkLayout(page, `${name} @${width}`);
  if (SHOTS) await page.screenshot({ path: `web/test-results/screens/${name}-${width}.png`, fullPage: true });
}

for (const width of WIDTHS) {
  test(`layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("#/");
    await shot(page, "01-empty", width);
    await page.locator("#result [data-missing]").first().click();
    await shot(page, "02-errors", width);
    await radio(page, "victimRole", "owner_driver_single_vehicle");
    await shot(page, "03-stop", width);
    const { input: death } = examples().find((e) => e.name === "death-homemaker.yaml")!;
    await fillForm(page, death);
    await shot(page, "04-estimate-death", width);
    const { input: injury } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
    await fillForm(page, injury);
    for (const g of ["dates", "earnings", "recovery", "medical"]) await openGroup(page, g);
    const closed = page.locator("[data-disclosure] button[aria-expanded=false]");
    while (await closed.count()) await closed.first().click();
    await page.fill("#offer-amount", "300000");
    await page.getByRole("button", { name: "Check the offer" }).click();
    await shot(page, "05-estimate-injury-open", width);
    await page.goto("#/rules");
    await shot(page, "06-rules", width);
    await page.goto("#/design");
    await expect(page.locator("[data-component]").first()).toBeVisible();
    await shot(page, "07-design", width);
    await page.goto("#/");
    await page.getByRole("button", { name: "हिंदी" }).click();
    await shot(page, "08-hindi", width);
  });
}

test("the estimate prints without the navigation or buttons", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillForm(page, input);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("header")).toBeHidden();
  // Collapsed sections print in full.
  await expect(page.locator("[data-head]").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeHidden();
  await expect(page.getByTestId("bottom-bar")).toBeHidden();
  await expect(page.locator('form[aria-labelledby="page-title"]')).toBeHidden(); // the estimate, not the form
  await expect(page.locator("#offer")).toBeHidden();
  await expect(page.locator("#result [data-testid=headline]")).toBeVisible();
  await expect(page.getByText("DRAFT", { exact: true })).toBeVisible();
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  expect(pdf.byteLength).toBeGreaterThan(10_000);
  if (SHOTS) {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync("web/test-results/screens", { recursive: true });
    writeFileSync("web/test-results/screens/estimate-print.pdf", pdf);
  }
});
