import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { examples, expect, fillForm, test } from "./helpers";

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
    await noSeriousViolations(page, "empty form");
    for (const route of ["how", "rules", "offer-study", "design"]) {
      await page.goto(`#/${route}`);
      if (route === "design") await expect(page.locator("[data-component]").first()).toBeVisible();
      await noSeriousViolations(page, route);
    }
    await page.goto("#/");
    await page.locator("#result [data-missing]").first().click(); // every unanswered question now says so
    await expect(page.locator("[id$=-error]").first()).toBeVisible();
    await noSeriousViolations(page, "form with errors");
    await page.selectOption("#victimRole", "owner_driver_single_vehicle");
    await expect(page.locator("[data-stop]").first()).toBeVisible();
    await noSeriousViolations(page, "stopped");
    if (lang === "en") {
      const { input } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
      await fillForm(page, input);
      await noSeriousViolations(page, "estimate");
      const closed = page.locator("[data-disclosure] button[aria-expanded=false]");
      while (await closed.count()) await closed.first().click();
      await noSeriousViolations(page, "estimate, all sections open");
      await page.fill("#offer-amount", "500000");
      await page.getByRole("button", { name: "Check the offer" }).click();
      await expect(page.getByTestId("offer-result")).toBeVisible();
      await noSeriousViolations(page, "offer result");
    }
  });
}
