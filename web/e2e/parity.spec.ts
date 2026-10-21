import type { Page } from "@playwright/test";
import { checkOffer } from "../../src/engine/index.js";
import type { EstimateInput } from "../../src/engine/types.js";
import {
  examples,
  expect,
  expected,
  fillChat,
  fillForm,
  fillSlow,
  guardRequests,
  rules,
  test,
} from "./helpers";

// The page runs the same engine as the CLI and the tests. Each worked example, answered in each way of answering,
// must show exactly what estimate() gives for the same input: headline, range and every head.
const FILL = {
  all: fillForm,
  slow: fillSlow,
  chat: fillChat,
  detail: (page: Page, input: EstimateInput) => fillForm(page, input, "#/detail"),
} as const;
for (const [mode, fill] of Object.entries(FILL))
  for (const { name, input } of examples()) {
    test(`the page matches estimate() for ${name} (${mode})`, async ({ page, baseURL }) => {
      const outside = guardRequests(page, baseURL!);
      expect(await fill(page, input)).toBe("result");
      const est = expected(input);
      expect(est.eligible).toBe(true);
      await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute(
        "data-amount",
        String(est.headline!.amount),
      );
      for (const s of ["conservative", "standard", "claimantMax"] as const)
        await expect(page.locator(`[data-scenario=${s}]`)).toHaveAttribute(
          "data-amount",
          String(est.range![s]),
        );
      const heads = page.locator("[data-head]");
      await expect(heads).toHaveCount(est.scenarios!.standard.heads.length);
      for (const h of est.scenarios!.standard.heads) {
        await expect(page.locator(`[data-head=${h.id}]`)).toHaveAttribute("data-amount", String(h.amount));
        if (h.worked) await expect(page.locator(`[data-head=${h.id}] [data-worked]`)).toHaveText(h.worked);
      }
      // Every caution is shown, except the rules' review status (kept for the command line, not the page).
      for (const w of est.warnings)
        await expect(page.locator(`[data-code=${w.code}]`)).toHaveCount(w.code === "RULE_UNVERIFIED" ? 0 : 1);
      if (est.practiceSpread)
        await expect(page.getByTestId("spread")).toContainText(`${est.practiceSpread.n}`);
      expect(outside, "requests outside the page's own origin").toEqual([]);
    });
  }

test("offer check matches checkOffer()", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillForm(page, input);
  await page.getByRole("link", { name: "Check an insurer's offer" }).click();
  await page.fill("#offer-amount", "10,00,000");
  await page.getByRole("button", { name: "Check the offer" }).click();
  const c = checkOffer(expected(input), 1_000_000, {
    yearsToAward: rules.statutory.pendency.tribunal_years,
    awardInterestPct: 7.5,
    discountPct: 7,
    lawyerFeePct: 0,
  });
  await expect(page.getByTestId("offer-pct-std")).toHaveText(`${c.offerPctOfStandard}%`);
  await expect(page.getByTestId("offer-award")).toContainText(c.awardWithInterest.toLocaleString("en-IN"));
  await expect(page.getByTestId("offer-pv")).toContainText(c.presentValueOfWaiting.toLocaleString("en-IN"));
  await expect(page.getByTestId("offer-vs-pv")).toContainText(`${c.offerVsPresentValuePct}%`);
});
