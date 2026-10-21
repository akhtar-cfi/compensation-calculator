import type { Page } from "@playwright/test";
import { examples, expect, fillDate, fillForm, openGroup, pickMonth, radio, test } from "./helpers";

const h1 = (page: Page) => page.getByRole("heading", { level: 1 });
const H1_EN = "Find your amount · about 2 minutes";
const H1_HI = "अपनी रक़म जानिए · लगभग 2 मिनट";
const block = (page: Page, id: string) => page.locator(`[data-question="${id}"]`);
/** Moves focus out of a question, as a person does when they go on to the next one. */
const leave = (page: Page) => page.locator("#page-title").focus();

test("the form starts empty: nothing pre-selected, and the estimate says what is needed", async ({
  page,
}) => {
  await page.goto("#/all");
  await expect(h1(page)).toHaveText(H1_EN);
  await expect(page.locator("input[type=radio]:checked")).toHaveCount(0);
  await expect(page.locator("#accidentDate-year")).toHaveValue("");
  await expect(page.getByTestId("answers-left")).toContainText("answers still needed");
  await expect(page.getByTestId("headline")).toHaveCount(0);
  await expect(page.getByTestId("progress")).toContainText("0 of 7 answered");
  // No error is shown before anything has been tried.
  await expect(page.getByText("Please answer this question.")).toHaveCount(0);
  // Details are there, closed, and optional.
  await expect(page.locator("details[data-question]").first()).not.toHaveAttribute("open", "");
});

test("an answer that ends the claim says why under it, and the rest is not asked", async ({ page }) => {
  await page.goto("#/all");
  await radio(page, "victimRole", "owner_driver_single_vehicle");
  await expect(block(page, "checks").locator("[data-stop=owner_driver]")).toBeVisible();
  await expect(page.locator("#result").getByTestId("no-estimate")).toBeVisible();
  await expect(page.getByTestId("headline")).toHaveCount(0);
  // Announced once (under the answer), not again in the estimate.
  await expect(page.locator("[data-stop] [role=alert]")).toHaveCount(1);
  await expect(block(page, "age")).toHaveCount(0);
  await expect(page.getByTestId("skipped")).toBeVisible();
  await expect(page.locator("#more")).toHaveCount(0);
  await radio(page, "victimRole", "not_driving");
  await expect(page.locator("[data-stop]")).toHaveCount(0);
  await expect(block(page, "age")).toBeVisible();
  await expect(page.getByTestId("answers-left")).toBeVisible();
});

test("a wrong answer is reported when leaving it; the list of answers left jumps to each", async ({
  page,
}) => {
  await page.goto("#/all");
  await page.fill("#age", "130");
  await expect(page.locator("#age-error")).toHaveCount(0); // not while typing
  await leave(page);
  await expect(page.locator("#age-error")).toContainText("from 0 to 110"); // says what is expected
  await page.fill("#age", "30");
  await leave(page);
  await expect(page.locator("#age-error")).toHaveCount(0);

  await page.locator("#result [data-missing=kind]").click();
  await expect(page.locator('input[name="kind"]').first()).toBeFocused();
  await expect(page.locator("#kind-error")).toContainText("Please answer this question.");
  // Only the question someone was sent to: the rest are not marked wrong before they are reached.
  await expect(page.locator("#victimRole-error")).toHaveCount(0);
  await radio(page, "kind", "death");
  await expect(page.locator("#kind-error")).toHaveCount(0);
  await expect(page.locator("#result [data-missing=kind]")).toHaveCount(0);
});

test("the list of answers left also reaches an answer inside a closed group of details", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillForm(page, input);
  await openGroup(page, "medical");
  await page.fill("#medicalBills", "1000");
  await page.fill("#cashlessPaid", "2000");
  await page.locator("details[data-question=medical] summary").click(); // close it again
  await expect(page.locator("#result [data-missing=cashlessPaid]")).toBeVisible();
  await page.locator("#result [data-missing=cashlessPaid]").click();
  await expect(page.locator("#cashlessPaid")).toBeFocused();
  await expect(page.locator("#cashlessPaid-error")).toContainText("Cannot be more than the medical bills");
});

test("follow-up questions appear in place, only when they apply", async ({ page }) => {
  await page.goto("#/all");
  await radio(page, "kind", "death");
  await radio(page, "employment", "student");
  await expect(page.locator('input[name="proof"]')).toHaveCount(0);
  await radio(page, "employment", "permanent");
  await radio(page, "proof", "salary_slip");
  await page.fill("#monthlySalary", "25,000");
  await expect(page.locator("#monthlySalary-echo")).toHaveText("= ₹25,000 a month");
  await page.fill("#monthlySalary", "25k"); // amounts as people type them
  await expect(page.locator("#monthlySalary-echo")).toHaveText("= ₹25,000 a month");
  await page.fill("#monthlySalary", "2.5 lakh");
  await expect(page.locator("#monthlySalary-echo")).toHaveText("= ₹2.5 lakh a month");
  await radio(page, "employment", "informal");
  await expect(page.locator("#occupationCode")).toBeVisible();
  await expect(page.locator("#monthlySalary")).toHaveCount(0);

  await expect(page.locator('input[name="spouse"]')).toHaveCount(0);
  await radio(page, "married", "yes");
  await expect(page.locator('input[name="spouse"]').first()).toBeVisible();

  await expect(block(page, "injury")).toHaveCount(0);
  await radio(page, "kind", "injury");
  await expect(block(page, "injury")).toBeVisible();
  await expect(page.locator('input[name="spouse"]')).toHaveCount(0); // a spouse's claim changes nothing here
  await expect(page.locator("#children")).toHaveCount(0);

  await expect(block(page, "insurance")).toHaveCount(0);
  await radio(page, "vehicleTraced", "yes");
  await expect(block(page, "insurance")).toBeVisible();

  await openGroup(page, "dates");
  await expect(page.locator("#claimFiledDate-day")).toHaveCount(0);
  await radio(page, "claimFiled", "yes");
  await expect(page.locator("#claimFiledDate-day")).toBeVisible();
});

test("the estimate appears as soon as the quick answers are in, and follows changes", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillForm(page, input);
  await expect(page.getByTestId("progress")).toContainText("7 of 7 answered");
  const amount = page.locator("#result [data-testid=headline] [data-amount]");
  const before = Number(await amount.getAttribute("data-amount"));
  await page.fill("#monthlySalary", "50000");
  await expect.poll(async () => Number(await amount.getAttribute("data-amount"))).toBeGreaterThan(before);
  await expect(page.locator("#details")).toBeVisible();
  await expect(page.locator("#offer")).toBeVisible();
});

test("an injury estimate waits for the certificate and the months off work", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
  await fillForm(page, input);
  await page.fill("#monthsOffWork", "");
  await expect(page.locator("#result [data-testid=headline]")).toHaveCount(0);
  await expect(page.locator("#result [data-missing=monthsOffWork]")).toBeVisible();
  await page.fill("#monthsOffWork", "0"); // none is an answer
  await expect(page.locator("#result [data-testid=headline]")).toBeVisible();
  await page.fill("#certificatePct", "");
  await expect(page.locator("#result [data-testid=headline]")).toHaveCount(0);
  // "No certificate yet" is an answer: the estimate then says what it leaves out.
  await page.check("#noCertificate");
  await expect(page.locator("#certificatePct")).toBeDisabled();
  await expect(page.locator("#result").getByText("No disability certificate entered")).toBeVisible();
});

test("the offer check follows a changed estimate", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillForm(page, input);
  await page.fill("#offer-amount", "10,00,000");
  await page.getByRole("button", { name: "Check the offer" }).click();
  const pct = page.getByTestId("offer-pct-std");
  const before = parseFloat((await pct.textContent())!);
  await page.fill("#monthlySalary", "50000");
  await expect.poll(async () => parseFloat((await pct.textContent())!)).toBeLessThan(before);
  await expect(page.getByTestId("offer-summary")).toContainText("₹10 lakh");
});

test("with no disability certificate yet, the amount says what it leaves out, and an offer is not judged", async ({
  page,
}) => {
  const { input } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
  const injury = { ...input.injury };
  delete injury.certificatePct;
  delete injury.certificateBasis;
  await fillForm(page, { ...input, injury });
  await expect(page.locator("#result").getByTestId("no-cert")).toContainText("lost future earnings");
  await page.fill("#offer-amount", "3,00,000");
  await page.getByRole("button", { name: "Check the offer" }).click();
  await expect(page.getByTestId("offer-verdict")).toHaveText("Too early to judge this offer");
  await expect(page.getByTestId("offer-result")).toContainText(
    "Get the certificate before you sign anything",
  );
  await expect(page.getByTestId("offer-pct-std")).toHaveCount(0);
});

test("the amount says when some of its usual positions are not Supreme Court rulings", async ({ page }) => {
  const rider = examples().find((e) => e.name === "injury-delivery-rider.yaml")!.input;
  await fillForm(page, rider);
  await expect(page.locator("#result").getByTestId("basis")).toContainText("not Supreme Court rulings");
  await expect(page.locator("[data-disclosure=sure] [data-scenario=standard] dt")).toHaveText("Standard");
  await expect(page.locator("[data-disclosure=swing] [data-basis=functional_pct]")).toContainText(
    "Delhi tribunal practice",
  );
  const salaried = examples().find((e) => e.name === "death-salaried.yaml")!.input;
  await fillForm(page, salaried);
  await expect(page.locator("#result [data-testid=headline]")).toBeVisible();
  await expect(page.locator("#result").getByTestId("basis")).toHaveCount(0);
});

test("an offer above the estimate is said to be above it", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillForm(page, input);
  const standard = Number(
    await page.locator("#result [data-testid=headline] [data-amount]").getAttribute("data-amount"),
  );
  await page.fill("#offer-amount", String(Math.round(standard * 1.2)));
  await page.getByRole("button", { name: "Check the offer" }).click();
  await expect(page.getByTestId("offer-verdict")).toHaveText("Above the estimate");
});

test("a check answered 'Not sure' is said, under the amount, to be assumed", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillForm(page, input);
  await radio(page, "vehicleTraced", "unknown");
  await radio(page, "s164", "unknown");
  const result = page.locator("#result");
  await expect(result.getByTestId("unsure-vehicle")).toContainText("assumes the vehicle was traced");
  await expect(result.getByTestId("unsure-vehicle")).toContainText("₹2,00,000");
  await expect(result.getByTestId("unsure-s164")).toContainText("section 164");
  await radio(page, "vehicleTraced", "yes");
  await expect(result.getByTestId("unsure-vehicle")).toHaveCount(0);
});

test("taking the insurer's no-fault settlement says what that payment is, and what money does not end a claim", async ({
  page,
}) => {
  await page.goto("#/all");
  await radio(page, "s164", "accepted_via_insurer");
  const stop = block(page, "checks").locator("[data-stop=s164_insurer]");
  await expect(stop).toContainText("₹5,00,000 (death)");
  await expect(stop).toContainText("Other money does not end the claim");
  await expect(stop).toContainText("before you give up the claim");
});

test("answers survive a reload (kept in this tab only), and Start again clears them", async ({ page }) => {
  // On a slow phone, an answer changed just before a reload must still be kept (it was lost when saving waited for
  // the next paint).
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await page.goto("#/all");
  await radio(page, "kind", "death");
  await pickMonth(page, "2025-06-01");
  await radio(page, "state", "DL");
  await page.reload();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await expect(page.locator('input[name="kind"][value="death"]')).toBeChecked();
  await expect(page.locator("#accidentDate-year")).toHaveValue("2025");
  await expect(page.locator('input[name="state"][value="DL"]')).toBeChecked();
  // Clearing asks first, and can be called off (the keyboard focus goes back to the button).
  await page.getByRole("button", { name: "Start again" }).click();
  await page.getByRole("button", { name: "Keep my answers" }).click();
  await expect(page.getByTestId("restart")).toBeFocused();
  await expect(page.locator('input[name="kind"][value="death"]')).toBeChecked();
  await page.getByRole("button", { name: "Start again" }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator("input[type=radio]:checked")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start again" })).toHaveCount(0);
  await expect(page.locator("#accidentDate-year")).toHaveValue("");
  await expect(page.locator("#page-title")).toBeFocused();
});

test("switching to Hindi keeps every answer", async ({ page }) => {
  await page.goto("#/all");
  await radio(page, "kind", "injury");
  await pickMonth(page, "2025-06-01");
  await page.getByRole("button", { name: "हिंदी" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(h1(page)).toHaveText(H1_HI);
  await expect(page.locator("#accidentDate-month")).toHaveValue("6");
  await expect(page.locator('input[name="kind"][value="injury"]')).toBeChecked();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("?lang=hi opens the page in Hindi, until the person chooses otherwise", async ({ page }) => {
  await page.goto("?lang=hi#/all");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(h1(page)).toHaveText(H1_HI);
  await page.getByRole("button", { name: "English" }).click();
  await expect(page).not.toHaveURL(/lang=hi/);
  await page.reload();
  await expect(h1(page)).toHaveText(H1_EN);
});

test("a shared ?lang=hi link opens in Hindi in a tab that had only shown English", async ({ page }) => {
  await page.goto("#/all");
  await page.fill("#age", "30");
  await page.goto("?lang=hi#/all");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.locator("#age")).toHaveValue("30");
});

test("the estimate in Hindi shows the same amounts", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-homemaker.yaml")!;
  await fillForm(page, input);
  const amount = await page.locator("[data-testid=headline] [data-amount]").getAttribute("data-amount");
  await page.getByRole("button", { name: "हिंदी" }).click();
  await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute("data-amount", amount!);
  await expect(page.locator("[data-head=loss_of_dependency]")).toContainText("आश्रितता की हानि");
  await expect(page.locator("#result [data-testid=headline]")).toContainText("लाख");
});

test("in Hindi, the cautions are in Hindi too", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
  await fillForm(page, input);
  await page.getByRole("button", { name: "हिंदी" }).click();
  const note = page.locator("#warn-INJURY_EXPERIMENTAL");
  await expect(note).toContainText("प्रायोगिक");
  await expect(note.locator('[lang="en"]')).toHaveCount(0);
});

test("a caution named under the amount opens in full, and so does how sure the amount is", async ({
  page,
}) => {
  const { input } = examples().find((e) => e.name === "injury-delivery-rider.yaml")!;
  await fillForm(page, input);
  const link = page.locator('#result a[href^="#warn-"]').first();
  const id = (await link.getAttribute("href"))!.slice(1);
  const caution = page.locator(`[id="${id}"]`);
  await expect(caution).toBeHidden(); // folded away under "Cautions, in full"
  await link.click();
  await expect(caution).toBeVisible();
  await expect(caution).toBeFocused();
  await expect(page.locator("[data-disclosure=warnings] h3 button")).toHaveAttribute("aria-expanded", "true");
  await page.locator("#result").getByRole("link", { name: "How sure is this?" }).click();
  const sure = page.locator("[data-disclosure=sure] h3 button");
  await expect(sure).toHaveAttribute("aria-expanded", "true");
  await expect(sure).toBeFocused();
  await expect(page.getByTestId("range")).toBeVisible();
});

test("older addresses open the one-page calculator at the matching place", async ({ page }) => {
  await page.goto("#/q/age");
  await expect(page).toHaveURL(/#\/all$/);
  await expect(page.locator("#age")).toBeFocused();
  await page.goto("#/stop/owner_driver");
  await expect(page).toHaveURL(/#\/all$/);
  await expect(page.locator('input[name="victimRole"]').first()).toBeFocused();
  for (const old of ["#/estimate", "#/check", "#/result", "#/offer"]) {
    await page.goto(old);
    await expect(page).toHaveURL(/#\/all$/);
    await expect(page.locator('[data-question="kind"]')).toBeVisible();
  }
});

test("a bar at the bottom shows the estimate while it is out of view, and hides while answering", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillForm(page, input);
  const bar = page.getByTestId("bottom-bar");
  await page.locator("#page-title").focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).toContainText("₹");
  await page.locator("#age").focus(); // typing: the keyboard is open, nothing covers the box
  await expect(bar).toHaveCount(0);
  await page.locator("#page-title").focus();
  await expect(bar).toBeVisible();
  await bar.getByRole("button").click();
  await expect(bar).toHaveCount(0); // the estimate itself is on screen
  await expect(page.locator("#result [data-testid=headline]")).toBeInViewport();
});

test("the public documents are on the page, and coming back keeps your place", async ({ page }) => {
  await page.goto("#/how");
  await expect(page.locator("article.doc h1").first()).toBeVisible();
  await page.goto("#/rules");
  await expect(page.locator("article.doc")).toContainText("Open checks");
  await page.goto("#/offer-study");
  await expect(page.locator("article.doc h1").first()).toBeVisible();
  await page.keyboard.press("Tab");
  await page.getByRole("link", { name: "Skip to content" }).press("Enter");
  await expect(page).toHaveURL(/#\/offer-study$/);
  await expect(page.locator("#main")).toBeFocused();
  await page.getByRole("link", { name: "Back to the calculator" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator("#page-title")).toBeFocused();

  // Scrolled down the calculator, opened a document, came back: the same place.
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.getByRole("link", { name: "How it is calculated" }).first().click();
  await expect(page.locator("article.doc h1").first()).toBeVisible();
  await page.goBack();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);
});

test("the whole form can be answered with the keyboard alone", async ({ page }) => {
  await page.goto("#/all");
  const tabTo = async (selector: string) => {
    for (let i = 0; i < 80; i++) {
      if (await page.locator(selector).evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error(`could not reach ${selector} with Tab`);
  };
  await tabTo('input[name="kind"][value="death"]');
  await page.keyboard.press("Space");
  await tabTo('input[name="victimRole"][value="not_driving"]');
  await page.keyboard.press("Space");
  await tabTo('input[name="vehicleTraced"][value="yes"]');
  await page.keyboard.press("ArrowRight"); // radio groups move with the arrow keys
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('input[name="vehicleTraced"][value="unknown"]')).toBeChecked();
  await tabTo('input[name="s164"][value="none"]');
  await page.keyboard.press("Space");
  await tabTo("#age");
  await page.keyboard.type("35");
  await tabTo('input[name="employment"][value="permanent"]');
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  await expect(page.locator('input[name="employment"][value="homemaker"]')).toBeChecked();
  await tabTo('input[name="married"][value="yes"]');
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('input[name="married"][value="no"]')).toBeChecked();
  await tabTo('input[name="children"][value="0"]');
  await page.keyboard.press("Space");
  await tabTo('input[name="parents"][value="0"]');
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('input[name="parents"][value="1"]')).toBeChecked();
  await tabTo('input[name="dependentParents"][value="1"]');
  await page.keyboard.press("Space");
  await tabTo("#accidentDate-month");
  await page.keyboard.press("ArrowDown");
  await tabTo("#accidentDate-year");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await tabTo('input[name="state"][value="DL"]');
  await page.keyboard.press("Space");
  await expect(page.locator("#result [data-testid=headline]")).toBeVisible();
});

test("a route change right after the first render is not missed", async ({ page }) => {
  // Change the route the moment the app has rendered, before any deferred work has run (as a quick click would).
  await page.addInitScript(() => {
    new MutationObserver((_, obs) => {
      if (document.getElementById("page-title")) {
        obs.disconnect();
        location.hash = "#/how";
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("#/all");
  await expect(page.locator("article.doc h1").first()).toBeVisible({ timeout: 2000 });
});

test("a date typed as day, month and year still works where one is asked", async ({ page }) => {
  await page.goto("#/all");
  await radio(page, "kind", "death");
  await openGroup(page, "dates");
  await radio(page, "claimFiled", "yes");
  await fillDate(page, "claimFiledDate", "2025-02-30");
  await leave(page);
  await expect(page.locator("#claimFiledDate-error")).toContainText("Enter a real date");
});
