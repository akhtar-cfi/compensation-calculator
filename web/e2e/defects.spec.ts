import type { Page } from "@playwright/test";
import { examples, expect, fillForm, openGroup, radio, test } from "./helpers";

/*
 * One test per problem found in the October 2026 review of the live page, so none comes back. Each says what
 * went wrong before.
 */

const salaried = () => examples().find((e) => e.name === "death-salaried.yaml")!.input;
const leave = (page: Page) => page.locator("#page-title").focus();

test("1. correcting an offer assumption keeps the panel open and every keystroke", async ({ page }) => {
  // Before: the panel closed on the first keystroke and later keystrokes were lost ("8.5" became "8").
  await fillForm(page, salaried());
  await page.fill("#offer-amount", "500000");
  await page.getByRole("button", { name: "Change the assumptions" }).click();
  await page.fill("#offer-interest", "50");
  await page.getByRole("button", { name: "Check the offer" }).click();
  await expect(page.locator("#offer-interest")).toBeFocused();
  await page.locator("#offer-interest").press("Control+A");
  await page.keyboard.type("8.5");
  await expect(page.locator("#offer-interest")).toHaveValue("8.5");
  await expect(page.locator("#offer-interest")).toBeVisible();
  await expect(page.locator("#offer-interest")).toBeFocused();
});

test("2. at 1280 x 720 the whole estimate is reachable by scrolling the page", async ({ page }) => {
  // Before: a panel capped at screen height hid the offer link, Copy and Print in its own inner scroll.
  await page.setViewportSize({ width: 1280, height: 720 });
  await fillForm(page, examples().find((e) => e.name === "injury-delivery-rider.yaml")!.input);
  const inner = await page
    .locator("#summary, #summary *")
    .evaluateAll(
      (els) => els.filter((e) => ["auto", "scroll"].includes(getComputedStyle(e).overflowY)).length,
    );
  expect(inner).toBe(0);
  const print = page.getByRole("button", { name: "Print or save as PDF" });
  await print.scrollIntoViewIfNeeded();
  await expect(print).toBeInViewport();
});

for (const pct of [150, 175, 200])
  test(`3. a phone with text at ${pct}% does not scroll sideways, and choices stay readable`, async ({
    page,
  }) => {
    // Before: fixed-width date boxes pushed the page to 450-548 px wide.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("#/all");
    // Like a phone's own text-size setting (set through the DOM: the page's security policy refuses inline CSS).
    await page.evaluate((p) => (document.documentElement.style.fontSize = `${p}%`), pct);
    await radio(page, "kind", "death");
    await openGroup(page, "dates");
    await radio(page, "claimFiled", "yes");
    await radio(page, "employment", "permanent");
    await radio(page, "proof", "salary_slip");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // Each choice's words stay whole: the label is at least as wide as its longest word.
    const squeezed = await page.locator('[data-question="work"] label').evaluateAll(
      (els) =>
        els.filter((el) => {
          const text = el.querySelector("span.min-w-0") as HTMLElement | null;
          return text ? text.scrollWidth > text.clientWidth + 1 : false;
        }).length,
    );
    expect(squeezed).toBe(0);
    // And with an estimate on the page.
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    await fillForm(page, salaried());
    await page.evaluate((p) => (document.documentElement.style.fontSize = `${p}%`), pct);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });

test("4. 'no minimum wage' only points to a proof question that exists", async ({ page }) => {
  // Before: a homemaker in Haryana was told to "choose that answer above", which did not exist.
  const input = examples().find((e) => e.name === "death-homemaker.yaml")!.input;
  await fillForm(page, { ...input, state: "HR" });
  const note = page.locator("#result [data-code=MW_MISSING]");
  await expect(note).toBeVisible();
  await expect(note).not.toContainText("choose that answer above");
  // A child's death: no "the range shows both approaches" when there is no range.
  await radio(page, "employment", "minor");
  await expect(page.locator("#result")).not.toContainText("both approaches");
  // Where proof can be given, the message says how.
  await radio(page, "employment", "permanent");
  await radio(page, "proof", "none");
  await expect(note).toContainText("choose that answer above");
});

test("5. a monthly tax larger than the salary is refused", async ({ page }) => {
  // Before: ₹50,000 tax on a ₹10,000 salary was taken, and the estimate fell to ₹36,300.
  await fillForm(page, salaried());
  await page.fill("#monthlySalary", "10000");
  await openGroup(page, "earnings");
  await page.fill("#monthlyTax", "50000");
  await leave(page);
  await expect(page.locator("#monthlyTax-error")).toContainText("less than the salary");
  // The last estimate stays, marked out of date, until the tax is corrected.
  await expect(page.getByTestId("stale")).toBeVisible();
});

test("6. on a phone, an answer with keyboard focus is never under the bottom bar", async ({ page }) => {
  // Before: the bar hid for text boxes but not for radio buttons, and covered a focused one.
  await page.setViewportSize({ width: 390, height: 844 });
  await fillForm(page, salaried());
  await page.locator("#page-title").focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  const bar = page.getByTestId("bottom-bar");
  await expect(bar).toBeVisible();
  // Tabbing to a choice near the bottom of the screen scrolls it clear of the bar (the page keeps room for it).
  await page.locator('input[name="married"][value="yes"]').focus();
  if (await bar.count()) {
    const barTop = (await bar.boundingBox())!.y;
    const choice = (await page.locator('label[for="married-yes"]').boundingBox())!;
    expect(choice.y + choice.height).toBeLessThanOrEqual(barTop);
  }
  // Typing in a box (the keyboard is open): the bar is gone.
  await page.locator("#age").focus();
  await expect(bar).toHaveCount(0);
});

test("7. the keyboard focus stays on the page when a button disables or goes away", async ({ page }) => {
  // Before: focus dropped to the page body.
  await page.goto("#/all");
  await radio(page, "kind", "death");
  await radio(page, "children", "more");
  await page.fill("#childrenMore", "6");
  await page.locator("#childrenMore-less").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#childrenMore")).toHaveValue("5");
  await expect(page.locator("#childrenMore-more")).toBeFocused();
  await page.getByRole("button", { name: "Start again" }).click();
  await page.getByRole("button", { name: "Keep my answers" }).click();
  await expect(page.getByTestId("restart")).toBeFocused();
});

test("8. two answers that end the claim: both stay changeable", async ({ page }) => {
  // Before: the second was dimmed and locked until the first was changed.
  await page.goto("#/all");
  await radio(page, "victimRole", "owner_driver_single_vehicle");
  await radio(page, "s164", "accepted_via_insurer");
  const checks = page.locator('[data-question="checks"]');
  await expect(checks.locator("[data-stop]")).toHaveCount(2);
  await expect(page.locator("[inert]")).toHaveCount(0);
  await radio(page, "s164", "none");
  await expect(checks.locator("[data-stop]")).toHaveCount(1);
  await radio(page, "victimRole", "not_driving");
  await expect(page.locator("[data-stop]")).toHaveCount(0);
});

test("9. a shared ?lang=hi link does not override the language chosen", async ({ page }) => {
  // Before: switching to English and reloading brought Hindi back.
  await page.goto("?lang=hi#/all");
  await page.getByRole("button", { name: "English" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("10. a count typed above the limit is refused", async ({ page }) => {
  // Before: 25 children were accepted (+ stops at 20), and − then jumped from 25 to 20.
  await page.goto("#/all");
  await radio(page, "kind", "death");
  await radio(page, "children", "more");
  await page.fill("#childrenMore", "25");
  await leave(page);
  await expect(page.locator("#childrenMore-error")).toContainText("up to 20");
});

test("11. whether the parents depended on the person is asked, not silently assumed", async ({ page }) => {
  // Before: an optional "dependent parents" box, left empty, assumed both parents depended (about ₹6 lakh), and
  // 2 dependent parents with 0 parents gave no error. Since the legal review (A-22), "not sure" counts no parent
  // as a dependant and says what it would add if they were.
  await fillForm(page, salaried());
  await expect(page.locator('input[name="dependentParents"]')).toHaveCount(0); // no parents claiming
  await radio(page, "parents", "2");
  await expect(page.locator("#result [data-missing=dependentParents]")).toBeVisible();
  await radio(page, "dependentParents", "unknown");
  await expect(page.getByTestId("parents-assumed")).toContainText("If they did depend on the person, about");
  await radio(page, "dependentParents", "0");
  await expect(page.getByTestId("parents-assumed")).toHaveCount(0);
});

test("12. amounts that can only be a typing slip are refused, and large ones questioned", async ({
  page,
}) => {
  // Before: "1e9" was read as a number, and ₹99 crore a month gave a ₹9,800 crore estimate.
  await fillForm(page, salaried());
  await page.fill("#monthlySalary", "1e9");
  await leave(page);
  await expect(page.locator("#monthlySalary-error")).toContainText("Enter rupees as a number");
  await page.fill("#monthlySalary", "99 crore");
  await leave(page);
  await expect(page.locator("#monthlySalary-error")).toContainText("more than ₹1 crore a month");
  await page.fill("#monthlySalary", "15 lakh");
  await expect(page.locator("#monthlySalary-error")).toHaveCount(0);
  await expect(page.getByTestId("monthlySalary-check")).toContainText("Please check it");
});

/* From the second round of reviews (phone and desktop), 12 Oct 2026. */

test("a future month cannot be chosen, and a wrong answer keeps the last estimate in view, marked out of date", async ({
  page,
}) => {
  await fillForm(page, salaried());
  const now = new Date();
  await page.selectOption("#accidentDate-year", String(now.getFullYear()));
  const months = await page.locator("#accidentDate-month option").evaluateAll((o) => o.length - 1);
  expect(months).toBe(now.getMonth() + 1);
  await page.selectOption("#accidentDate-year", "2025");
  await page.selectOption("#accidentDate-month", "6");
  await page.fill("#age", "abc");
  await leave(page);
  await expect(page.getByTestId("stale")).toContainText("Out of date");
  await expect(page.locator("#result [data-testid=headline]")).toBeVisible();
  await page.fill("#age", "30");
  await expect(page.getByTestId("stale")).toHaveCount(0);
});

test("the estimate says how the last change moved it", async ({ page }) => {
  await fillForm(page, salaried());
  await page.fill("#monthlySalary", "30000");
  await expect(page.locator("#result").getByTestId("change")).toContainText("Up ₹");
});

test("on a laptop there is one column, and the bar at the bottom shows the estimate while it is out of view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await fillForm(page, salaried());
  // Nothing beside the questions: the estimate comes under them, in the same column.
  const form = (await page.locator("#calc form").first().boundingBox())!;
  const result = (await page.locator("#result").boundingBox())!;
  expect(Math.abs(result.x - form.x)).toBeLessThanOrEqual(2); // the same left edge, give or take a border
  expect(result.y).toBeGreaterThan(form.y + form.height);
  await page.evaluate(() => document.getElementById("calc")!.scrollIntoView());
  const bar = page.getByTestId("bottom-bar");
  await expect(bar).toContainText("₹");
  await bar.getByRole("button").click();
  await expect(page.locator("#result [data-testid=headline]")).toBeInViewport();
});

test("the offer check puts the offer beside the estimate, with no verdict, and follows changed assumptions", async ({
  page,
}) => {
  await fillForm(page, salaried());
  await page.getByRole("link", { name: "Check an insurer's offer" }).click();
  await expect(page.locator("#offer-amount")).toBeFocused();
  await page.keyboard.type("10,00,000");
  await page.getByRole("button", { name: "Check the offer" }).click();
  // Legal review C-1: the offer, the estimate and the difference; never "fair", "far below" or advice to accept.
  await expect(page.getByTestId("offer-summary")).toContainText("% of the estimate");
  await expect(page.getByTestId("offer-diff")).toContainText("less than the estimate");
  await expect(page.getByTestId("offer-result")).not.toContainText(/far below|fair/i);
  const before = await page.getByTestId("offer-award").textContent();
  await page.getByRole("button", { name: "Change the assumptions" }).click();
  await page.fill("#offer-years", "3");
  await expect(page.getByTestId("offer-award")).not.toHaveText(before!);
});

test("the two salaried kinds of work say how they differ", async ({ page }) => {
  await page.goto("#/all");
  await expect(page.locator("#employment-permanent-hint")).toContainText("yearly pay rises");
  await expect(page.locator("#employment-fixed_salary-hint")).toContainText("no regular pay rises");
});

test("the printout lists every answer used, and the offer checked", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
  await fillForm(page, input);
  await page.fill("#offer-amount", "8,00,000");
  await page.getByRole("button", { name: "Check the offer" }).click();
  await expect(page.getByTestId("offer-summary")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  const answers = page.locator("#result").getByTestId("print-answers");
  await expect(answers).toBeVisible();
  await expect(answers).toContainText(`${input.injury!.certificatePct}%`);
  await expect(answers).toContainText("vehicle that hit");
  await expect(page.getByTestId("offer-result")).toBeVisible();
  await expect(page.locator("#offer-amount")).toBeHidden();
});

test("the printout names the facts the estimate rests on", async ({ page }) => {
  await fillForm(page, salaried());
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("print-facts")).toContainText("June 2025");
  await expect(page.getByTestId("print-facts")).toContainText("2 children");
});
