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

for (const pct of [175, 200])
  test(`3. a phone with text at ${pct}% does not scroll sideways`, async ({ page }) => {
    // Before: fixed-width date boxes pushed the page to 450-548 px wide.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("#/");
    // Like a phone's own text-size setting (set through the DOM: the page's security policy refuses inline CSS).
    await page.evaluate((p) => (document.documentElement.style.fontSize = `${p}%`), pct);
    await radio(page, "kind", "death");
    await openGroup(page, "dates");
    await radio(page, "claimFiled", "yes");
    await radio(page, "employment", "permanent");
    await radio(page, "proof", "salary_slip");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
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
  await expect(page.locator("#result [data-testid=headline]")).toHaveCount(0);
});

test("6. on a phone, an answer with keyboard focus is never under the bottom bar", async ({ page }) => {
  // Before: the bar hid for text boxes but not for radio buttons, and covered a focused one.
  await page.setViewportSize({ width: 390, height: 844 });
  await fillForm(page, salaried());
  await page.locator("#page-title").focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByTestId("bottom-bar")).toBeVisible();
  await page.locator('input[name="married"][value="yes"]').focus();
  await expect(page.getByTestId("bottom-bar")).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBottom)).not.toBe(
    "auto",
  );
});

test("7. the keyboard focus stays on the page when a button disables or goes away", async ({ page }) => {
  // Before: focus dropped to the page body.
  await page.goto("#/");
  await radio(page, "kind", "death");
  await page.fill("#children", "1");
  await page.locator("#children-less").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#children")).toHaveValue("0");
  await expect(page.locator("#children-more")).toBeFocused();
  await page.getByRole("button", { name: "Start again" }).click();
  await page.getByRole("button", { name: "Keep my answers" }).click();
  await expect(page.getByTestId("restart")).toBeFocused();
});

test("8. two answers that end the claim: both stay changeable", async ({ page }) => {
  // Before: the second was dimmed and locked until the first was changed.
  await page.goto("#/");
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
  await page.goto("?lang=hi#/");
  await page.getByRole("button", { name: "English" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("10. a count typed above the limit is refused", async ({ page }) => {
  // Before: 25 children were accepted (+ stops at 20), and − then jumped from 25 to 20.
  await page.goto("#/");
  await radio(page, "kind", "death");
  await page.fill("#children", "25");
  await leave(page);
  await expect(page.locator("#children-error")).toContainText("up to 20");
});

test("11. dependent parents cannot be more than the parents claiming", async ({ page }) => {
  // Before: 2 dependent parents with 0 parents gave no error.
  await fillForm(page, salaried());
  await openGroup(page, "dependants");
  await page.fill("#dependentParents", "2");
  await leave(page);
  await expect(page.locator("#dependentParents-error")).toContainText("more than the parents");
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
