import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { examples, expect, fillWizard, test } from "./helpers";

async function noSeriousViolations(page: Page, where: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map((v) => `${where}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
}

for (const lang of ["en", "hi"] as const) {
  test(`no serious accessibility violations (${lang})`, async ({ page }) => {
    await page.goto("#/");
    if (lang === "hi") await page.getByRole("button", { name: "हिंदी" }).click();
    await noSeriousViolations(page, "start");
    for (const route of ["how", "rules", "offer"]) {
      await page.goto(`#/${route}`);
      await noSeriousViolations(page, route);
    }
    const { input } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
    await page.goto("#/estimate");
    await page.getByRole("button", { name: lang === "hi" ? "आगे" : "Next" }).click(); // shows the error state
    await noSeriousViolations(page, "wizard with errors");
    if (lang === "en") {
      await fillWizard(page, input);
      await noSeriousViolations(page, "result");
      await page.goto("#/offer");
      await page.fill("#offer-amount", "500000");
      await page.getByRole("button", { name: "Check the offer" }).click();
      await noSeriousViolations(page, "offer result");
    }
  });
}
