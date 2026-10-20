import { estimate } from "../../src/engine/index.js";
import type { EstimateInput } from "../../src/engine/types.js";
import { contested, type ContestedId } from "../src/contested.js";
import { examples, expect, fillForm, rules, test, today } from "./helpers";

/**
 * "Full detail", for helpers and lawyers: every question and group open, the points of law this case turns on as
 * switches with their authorities, a "Your choices" amount worked out by the engine, and the breakdown open.
 */

const homemaker = examples().find((e) => e.name === "death-homemaker.yaml")!.input;
const rider = examples().find((e) => e.name === "injury-delivery-rider.yaml")!.input;
const points = (input: EstimateInput) =>
  estimate(rules, input, { asOf: today(), mix: {} }).mix!.parameters.map((p) => p.id);

test("every question and every group of details is open", async ({ page }) => {
  await fillForm(page, rider, "#/detail");
  const groups = page.locator("details[data-question]");
  expect(await groups.count()).toBeGreaterThan(3);
  for (const g of await groups.all()) await expect(g).toHaveAttribute("open", "");
});

for (const [name, input] of [
  ["homemaker", homemaker],
  ["rider", rider],
] as const)
  test(`the points courts differ on are the ones this case turns on, with effect and authorities (${name})`, async ({
    page,
  }) => {
    await fillForm(page, input, "#/detail");
    const ids = points(input);
    expect(ids.length).toBeGreaterThan(0);
    await expect(page.locator("[data-param]")).toHaveCount(ids.length);
    expect(
      await page.locator("[data-param]").evaluateAll((els) => els.map((e) => e.getAttribute("data-param"))),
    ).toEqual(ids);
    const est = estimate(rules, input, { asOf: today() });
    for (const id of ids) {
      const box = page.locator(`[data-param=${id}]`);
      const sw = est.swingFactors.find((s) => s.parameter === id);
      if (sw)
        await expect(box.getByTestId("effect")).toHaveAttribute(
          "data-effect",
          `${sw.toConservative},${sw.toClaimantMax}`,
        );
      const p = contested(id as ContestedId, rules);
      if (p.sources.length) await expect(box.locator("[data-source]")).toHaveCount(p.sources.length);
      else await expect(box).toContainText("No court authority recorded for this choice yet.");
    }
  });

test("each point says what its standard position rests on", async ({ page }) => {
  await fillForm(page, rider, "#/detail");
  await expect(page.locator("[data-param=functional_pct] [data-testid=basis]")).toContainText(
    "Delhi tribunal practice",
  );
  await fillForm(page, homemaker, "#/detail");
  await expect(page.locator("[data-param=homemaker_income] [data-testid=basis]")).toContainText(
    "a Supreme Court ruling",
  );
});

test("your choices recompute the amount exactly as the engine does, and are kept", async ({ page }) => {
  await fillForm(page, homemaker, "#/detail");
  const [first] = points(homemaker);
  const standard = String(estimate(rules, homemaker, { asOf: today() }).headline!.amount);
  await expect(page.getByTestId("mix-amount")).toHaveAttribute("data-amount", standard);
  await page.locator(`[data-param=${first}] input[value=conservative]`).check();
  const want = estimate(rules, homemaker, { asOf: today(), mix: { [first!]: "conservative" } }).mix!.result
    .net;
  await expect(page.getByTestId("mix-amount")).toHaveAttribute("data-amount", String(want));
  // The three standard amounts stay as they are.
  await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute("data-amount", standard);
  await page.reload();
  await expect(page.locator(`[data-param=${first}] input[value=conservative]`)).toBeChecked();
  await expect(page.getByTestId("mix-amount")).toHaveAttribute("data-amount", String(want));
  await page.locator("[data-action=reset-mix]").click();
  await expect(page.getByTestId("mix-amount")).toHaveAttribute("data-amount", standard);
});

test("prints with the points of law and every section open", async ({ page }) => {
  await fillForm(page, rider, "#/detail");
  await expect(page.locator("[data-contested]")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("[data-contested]")).toBeVisible();
  // The breakdown and its notes (the offer check is a form, left out of the printout).
  const panels = page.locator("#details [data-disclosure] [data-panel]");
  expect(await panels.count()).toBeGreaterThan(3);
  for (const panel of await panels.all()) await expect(panel).toBeVisible();
});
