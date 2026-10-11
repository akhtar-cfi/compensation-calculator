import { expect, test } from "@playwright/test";
import { checkOffer } from "../../src/engine/index.js";
import { examples, expected, fillWizard, guardRequests, rules } from "./helpers";

// The page runs the same engine as the CLI and the tests. Each worked example, typed into the wizard, must show
// exactly what estimate() gives for the same input: headline, range and every head.
for (const { name, input } of examples()) {
  test(`wizard matches estimate() for ${name}`, async ({ page, baseURL }) => {
    const outside = guardRequests(page, baseURL!);
    await fillWizard(page, input);
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
    for (const h of est.scenarios!.standard.heads)
      await expect(page.locator(`[data-head=${h.id}]`)).toHaveAttribute("data-amount", String(h.amount));
    for (const w of est.warnings) await expect(page.locator(`[data-code=${w.code}]`)).toHaveCount(1);
    if (est.practiceSpread) await expect(page.getByTestId("spread")).toContainText(`${est.practiceSpread.n}`);
    expect(outside, "requests outside the page's own origin").toEqual([]);
  });
}

test("offer check matches checkOffer()", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillWizard(page, input);
  await page.getByRole("link", { name: "Check an insurance offer against this estimate" }).click();
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
