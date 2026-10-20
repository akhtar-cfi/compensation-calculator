import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { examples, expect, fillForm, fillSlow, openGroup, radio, settle, test } from "./helpers";

async function noSeriousViolations(page: Page, where: string) {
  // A screen that has just come in is still fading up: scan it as people read it, once it has settled.
  await settle(page);
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );
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
    test.setTimeout(60_000); // about ten full-page scans
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
    await radio(page, "victimRole", "owner_driver_single_vehicle");
    await expect(page.locator("[data-stop]").first()).toBeVisible();
    await noSeriousViolations(page, "stopped");
    if (lang === "en") {
      const { input } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
      await fillForm(page, input);
      for (const g of ["dates", "earnings", "recovery", "medical"]) await openGroup(page, g);
      await noSeriousViolations(page, "estimate, details open");
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

for (const lang of ["en", "hi"] as const) {
  test(`'Take it slow' has no serious accessibility violations (${lang})`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("#/slow");
    await noSeriousViolations(page, "slow: language");
    await page.locator(`[data-slow=lang] button[data-value=${lang}]`).click();
    await expect(page.locator("[data-field=kind]")).toBeVisible();
    await noSeriousViolations(page, "slow: first question");
    await page.locator('[data-field=kind] [data-value="injury"]').click();
    await page.locator('[data-field=victimRole] [data-value="owner_driver_single_vehicle"]').click();
    await expect(page.locator("[data-stop]")).toBeVisible();
    await noSeriousViolations(page, "slow: stop");
    const { input } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
    await fillSlow(page, input, { lang, details: false });
    await noSeriousViolations(page, "slow: amount");
    await page.locator("[data-action=refine]").click();
    await expect(page.getByTestId("mini-amount")).toBeVisible();
    await noSeriousViolations(page, "slow: detail");
    await page.locator("[data-action=review]").or(page.locator("a[href='#/slow/review']")).first().click();
    await expect(page.locator("[data-review]").first()).toBeVisible();
    await noSeriousViolations(page, "slow: answers");
    await page.locator("[data-change=age]").click();
    await page.fill("#age", "");
    await page.locator("[data-action=continue]").click();
    await expect(page.locator("#age-error")).toBeVisible();
    await noSeriousViolations(page, "slow: missing answer");
  });
}
