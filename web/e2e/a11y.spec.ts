import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { examples, expect, fillWizard, test } from "./helpers";

async function noSeriousViolations(page: Page, where: string) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map((v) => `${where}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
}

for (const lang of ["en", "hi"] as const) {
  test(`no serious accessibility violations (${lang})`, async ({ page }) => {
    await page.goto(lang === "hi" ? "?lang=hi#/" : "#/");
    await noSeriousViolations(page, "start");
    for (const route of ["how", "rules", "offer", "design"]) {
      await page.goto(`#/${route}`);
      if (route === "design") await expect(page.locator("[data-component]").first()).toBeVisible();
      await noSeriousViolations(page, route);
    }
    await page.goto("#/estimate");
    await page.getByRole("button", { name: lang === "hi" ? "आगे बढ़ें" : "Continue" }).click(); // the error state
    await expect(page.locator("#error-summary")).toBeVisible();
    await noSeriousViolations(page, "question with errors");
    await page.goto("#/q/role");
    await page.locator('input[name="victimRole"][value="owner_driver_single_vehicle"]').check();
    await page.getByRole("button", { name: lang === "hi" ? "आगे बढ़ें" : "Continue" }).click();
    await expect(page.locator("[data-stop]")).toBeVisible();
    await noSeriousViolations(page, "stop page");
    if (lang === "en") {
      const { input } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
      await fillWizard(page, input);
      await noSeriousViolations(page, "result");
      const closed = page.locator("[data-disclosure] button[aria-expanded=false]");
      while (await closed.count()) await closed.first().click();
      await noSeriousViolations(page, "result, all sections open");
      await page.goto("#/check");
      await noSeriousViolations(page, "check answers");
      await page.goto("#/offer");
      await page.fill("#offer-amount", "500000");
      await page.getByRole("button", { name: "Check the offer" }).click();
      await noSeriousViolations(page, "offer result");
    }
  });
}
