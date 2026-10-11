import { examples, expect, fillDate, fillWizard, test } from "./helpers";

const h1 = (page: import("@playwright/test").Page) => page.getByRole("heading", { level: 1 });
const cont = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Continue" }).click();

test("the estimate starts with nothing pre-selected", async ({ page }) => {
  await page.goto("#/");
  await page.getByRole("link", { name: "Start the estimate" }).click();
  await expect(page).toHaveURL(/#\/q\/kind$/);
  await expect(h1(page)).toHaveText("What happened to the person?");
  await expect(page.locator('input[name="kind"]:checked')).toHaveCount(0);
  await expect(page.getByTestId("caption")).toHaveText("The accident · part 1 of 4");
});

test("an answer that ends the claim goes to a stop page, with a way back", async ({ page }) => {
  await page.goto("#/");
  await page.goto("#/q/role");
  await page.locator('input[name="victimRole"][value="owner_driver_single_vehicle"]').check();
  await cont(page);
  await expect(page).toHaveURL(/#\/stop\/owner_driver$/);
  await expect(page.locator("[data-stop=owner_driver]")).toBeVisible();
  await expect(page.getByTestId("headline")).toHaveCount(0);
  await page.getByRole("link", { name: "Change this answer" }).click();
  await expect(page).toHaveURL(/#\/q\/role$/);
  await expect(page.locator('input[name="victimRole"][value="owner_driver_single_vehicle"]')).toBeChecked();
});

test("a missing or impossible answer is reported on its own page and blocks moving on", async ({ page }) => {
  await page.goto("#/");
  await page.goto("#/q/kind");
  await cont(page);
  await expect(page.locator("#error-summary")).toBeFocused();
  await expect(page.locator("#error-summary")).toContainText("Please answer this question.");
  await expect(page).toHaveURL(/#\/q\/kind$/);
  await page.locator('input[name="kind"][value="death"]').check();
  await cont(page);
  await fillDate(page, "accidentDate", "2025-02-30");
  await cont(page);
  await expect(page.locator("#accidentDate-error")).toContainText("Enter a real date");
  await fillDate(page, "accidentDate", "2099-01-01");
  await cont(page);
  await expect(page.locator("#accidentDate-error")).toContainText("cannot be in the future");
});

test("the phone's back button goes to the previous question with answers kept", async ({ page }) => {
  await page.goto("#/");
  await page.goto("#/estimate");
  await page.locator('input[name="kind"][value="injury"]').check();
  await cont(page);
  await fillDate(page, "accidentDate", "2025-06-01");
  await cont(page);
  await expect(page).toHaveURL(/#\/q\/role$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/q\/accidentDate$/);
  await expect(page.locator("#accidentDate-day")).toHaveValue("1");
  await page.goBack();
  await expect(page.locator('input[name="kind"][value="injury"]')).toBeChecked();
});

test("answers survive a reload (kept in this tab only)", async ({ page }) => {
  await page.goto("#/");
  await page.goto("#/estimate");
  await page.locator('input[name="kind"][value="death"]').check();
  await cont(page);
  await fillDate(page, "accidentDate", "2025-06-01");
  await cont(page);
  await page.reload();
  await expect(page).toHaveURL(/#\/q\/role$/);
  await page.goBack();
  await expect(page.locator("#accidentDate-year")).toHaveValue("2025");
  await page.goto("#/");
  await expect(page.getByRole("link", { name: "Continue where you left off" })).toBeVisible();
  await page.getByRole("button", { name: "Start again" }).click();
  await expect(page.getByRole("link", { name: "Start the estimate" })).toBeVisible();
});

test("switching to Hindi keeps every answer", async ({ page }) => {
  await page.goto("#/");
  await page.goto("#/estimate");
  await page.locator('input[name="kind"][value="injury"]').check();
  await cont(page);
  await fillDate(page, "accidentDate", "2025-06-01");
  await page.getByRole("button", { name: "हिंदी" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(h1(page)).toHaveText("दुर्घटना कब हुई?");
  await expect(page.locator("#accidentDate-month")).toHaveValue("6");
  await page.getByRole("link", { name: "पीछे" }).click();
  await expect(page.locator('input[name="kind"][value="injury"]')).toBeChecked();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("?lang=hi opens the page in Hindi", async ({ page }) => {
  await page.goto("?lang=hi#/");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("link", { name: "अनुमान शुरू करें" })).toBeVisible();
});

test("the result page in Hindi shows the same amounts", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-homemaker.yaml")!;
  await fillWizard(page, input);
  const amount = await page.locator("[data-testid=headline] [data-amount]").getAttribute("data-amount");
  await page.getByRole("button", { name: "हिंदी" }).click();
  await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute("data-amount", amount!);
  await expect(page.locator("[data-head=loss_of_dependency]")).toContainText("आश्रितता की हानि");
});

test('"Change answers" goes to Check; a change that opens a branch asks only the new question', async ({
  page,
}) => {
  const { input } = examples().find((e) => e.name === "death-homemaker.yaml")!;
  await fillWizard(page, input);
  await page.getByRole("link", { name: "Change answers" }).click();
  await expect(page).toHaveURL(/#\/check$/);
  await expect(page.locator("[data-row=age]")).toContainText("35");
  await page.locator("[data-row=work] a").click();
  await expect(page).toHaveURL(/#\/q\/work\?from=check$/);
  await page.locator('input[name="employment"][value="permanent"]').check();
  await cont(page);
  // A salaried person is asked about proof of income, then goes straight back to Check.
  await expect(page).toHaveURL(/#\/q\/income\?from=check$/);
  await page.locator('input[name="proof"][value="salary_slip"]').check();
  await page.fill("#monthlySalary", "25,000");
  await expect(page.locator("#monthlySalary-echo")).toHaveText("= ₹25,000 a month");
  await cont(page);
  await expect(page).toHaveURL(/#\/check$/);
  await expect(page.locator("[data-row=income]")).toContainText("25,000");
});

test("the result page cannot be opened without answers", async ({ page }) => {
  await page.goto("#/");
  await page.goto("#/result");
  await expect(page).toHaveURL(/#\/q\/kind$/);
});

test("the public documents are on the page, and in-page links do not change the page", async ({ page }) => {
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
});

test("the questions can be answered with the keyboard alone", async ({ page }) => {
  await page.goto("#/");
  const tabTo = async (selector: string) => {
    for (let i = 0; i < 60; i++) {
      if (await page.locator(selector).evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error(`could not reach ${selector} with Tab`);
  };
  const submit = async (next: RegExp) => {
    await tabTo('form button[type="submit"]');
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(next);
  };
  await tabTo('a[href="#/estimate"].rounded-full');
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/q\/kind$/);
  await tabTo('input[name="kind"][value="death"]');
  await page.keyboard.press("Space");
  await submit(/accidentDate$/);
  await tabTo("#accidentDate-day");
  await page.keyboard.type("1");
  await page.keyboard.press("Tab");
  await page.keyboard.type("6");
  await page.keyboard.press("Tab");
  await page.keyboard.type("2025");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/role$/);
  await tabTo('input[name="victimRole"][value="pedestrian"]');
  await page.keyboard.press("Space");
  await submit(/vehicle$/);
  await tabTo('input[name="offendingVehicle"][value="identified_insured"]');
  await page.keyboard.press("Space");
  await submit(/s164$/);
  await tabTo('input[name="s164"][value="none"]');
  await page.keyboard.press("Space");
  await submit(/claim$/);
  await tabTo('input[name="claimFiled"][value="yes"]');
  await page.keyboard.press("ArrowDown"); // radio groups move with the arrow keys
  await expect(page.locator('input[name="claimFiled"][value="no"]')).toBeChecked();
  await submit(/state$/);
  await tabTo("#state");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#state")).toHaveValue("DL");
  await submit(/age$/);
  await tabTo("#age");
  await page.keyboard.type("35");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/work$/);
  await tabTo('input[name="employment"][value="permanent"]');
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
  await expect(page.locator('input[name="employment"][value="homemaker"]')).toBeChecked();
  await submit(/family$/);
  await tabTo('input[name="married"][value="yes"]');
  await page.keyboard.press("ArrowDown");
  await tabTo("#children");
  await page.keyboard.type("0");
  await tabTo("#parents");
  await page.keyboard.type("2");
  await submit(/medical$/);
  await submit(/check$/);
  await tabTo('a[href="#/result"]');
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/result$/);
  await expect(page.getByTestId("headline")).toBeVisible();
});

test("a route change right after the first render is not missed", async ({ page }) => {
  // Change the route the moment the app has rendered, before any deferred work has run (as a quick click would).
  await page.addInitScript(() => {
    new MutationObserver((_, obs) => {
      if (document.getElementById("page-title")) {
        obs.disconnect();
        location.hash = "#/estimate";
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("#/");
  await expect(h1(page)).toHaveText("What happened to the person?", { timeout: 2000 });
});
