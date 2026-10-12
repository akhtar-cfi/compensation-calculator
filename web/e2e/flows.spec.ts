import type { Page } from "@playwright/test";
import { examples, expect, fillDate, fillForm, test } from "./helpers";

const h1 = (page: Page) => page.getByRole("heading", { level: 1 });
const question = (page: Page, id: string) => page.locator(`[data-question="${id}"]`);
/** Moves focus out of a question, as a person does when they go on to the next one. */
const leave = (page: Page) => page.locator("#page-title").focus();

test("the form starts empty: nothing pre-selected, and the panel lists what is needed", async ({ page }) => {
  await page.goto("#/");
  await expect(h1(page)).toHaveText("Motor accident compensation calculator");
  await expect(page.locator("input[type=radio]:checked")).toHaveCount(0);
  await expect(page.locator("#victimRole")).toHaveValue("");
  await expect(page.locator("#employment")).toHaveValue("");
  await expect(page.getByTestId("answers-left")).toContainText("answers still needed");
  await expect(page.getByTestId("headline")).toHaveCount(0);
  // No error is shown before anything has been tried.
  await expect(page.getByText("Please answer this question.")).toHaveCount(0);
});

test("an answer that ends the claim shows why under it, and the panel shows no number", async ({ page }) => {
  await page.goto("#/");
  await page.selectOption("#victimRole", "owner_driver_single_vehicle");
  await expect(question(page, "role").locator("[data-stop=owner_driver]")).toBeVisible();
  await expect(page.locator("#result").getByTestId("no-estimate")).toBeVisible();
  await expect(page.getByTestId("headline")).toHaveCount(0);
  // The notice is announced once (under the answer), not again in the panel.
  await expect(page.locator("[data-stop] [role=alert]")).toHaveCount(1);
  await page.selectOption("#victimRole", "pedestrian");
  await expect(page.locator("[data-stop]")).toHaveCount(0);
  await expect(page.getByTestId("answers-left")).toBeVisible();
});

test("a wrong answer is reported when leaving it; the list of answers left jumps to each", async ({
  page,
}) => {
  await page.goto("#/");
  await fillDate(page, "accidentDate", "2025-02-30");
  await expect(page.locator("#accidentDate-error")).toHaveCount(0); // not while typing
  await leave(page);
  await expect(page.locator("#accidentDate-error")).toContainText("Enter a real date");
  await fillDate(page, "accidentDate", "2099-01-01");
  await leave(page);
  await expect(page.locator("#accidentDate-error")).toContainText("cannot be in the future");
  await fillDate(page, "accidentDate", "2025-06-01");
  await leave(page);
  await expect(page.locator("#accidentDate-error")).toHaveCount(0);

  await page.locator("#result [data-missing=kind]").click();
  await expect(page.locator('input[name="kind"]').first()).toBeFocused();
  await expect(page.locator("#kind-error")).toContainText("Please answer this question.");
  await page.locator('input[name="kind"][value="death"]').check();
  await expect(page.locator("#kind-error")).toHaveCount(0);
  await expect(page.locator("#result [data-missing=kind]")).toHaveCount(0);
});

test("follow-up questions appear only when they apply", async ({ page }) => {
  await page.goto("#/");
  await expect(page.locator("#claimFiledDate-day")).toHaveCount(0);
  await page.locator('input[name="claimFiled"][value="yes"]').check();
  await expect(page.locator("#claimFiledDate-day")).toBeVisible();
  await page.locator('input[name="claimFiled"][value="no"]').check();
  await expect(page.locator("#claimFiledDate-day")).toHaveCount(0);

  await page.selectOption("#employment", "student");
  await expect(question(page, "course")).toBeVisible();
  await expect(question(page, "income")).toHaveCount(0);
  await page.selectOption("#employment", "permanent");
  await expect(question(page, "course")).toHaveCount(0);
  await page.locator('input[name="proof"][value="salary_slip"]').check();
  await page.fill("#monthlySalary", "25,000");
  await expect(page.locator("#monthlySalary-echo")).toHaveText("= ₹25,000 a month");

  await expect(page.locator('input[name="spouse"]')).toHaveCount(0);
  await page.locator('input[name="married"][value="yes"]').check();
  await expect(page.locator('input[name="spouse"]').first()).toBeVisible();

  // Injury brings its own section; death does not ask it.
  await expect(page.locator("[data-section=details] [data-question=disability]")).toHaveCount(0);
  await page.locator('input[name="kind"][value="injury"]').check();
  await expect(question(page, "disability")).toBeVisible();
  await page.locator('input[name="kind"][value="death"]').check();
  await expect(question(page, "disability")).toHaveCount(0);
});

test("the estimate appears as soon as the answers are in, and follows changes", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillForm(page, input);
  const amount = page.locator("#result [data-testid=headline] [data-amount]");
  const before = Number(await amount.getAttribute("data-amount"));
  await page.fill("#monthlySalary", "50000");
  await expect.poll(async () => Number(await amount.getAttribute("data-amount"))).toBeGreaterThan(before);
  await expect(page.locator("#details")).toBeVisible();
  await expect(page.locator("#offer")).toBeVisible();
});

test("answers survive a reload (kept in this tab only), and Start again clears them", async ({ page }) => {
  await page.goto("#/");
  await page.locator('input[name="kind"][value="death"]').check();
  await fillDate(page, "accidentDate", "2025-06-01");
  await page.selectOption("#state", "DL");
  await page.reload();
  await expect(page.locator('input[name="kind"][value="death"]')).toBeChecked();
  await expect(page.locator("#accidentDate-year")).toHaveValue("2025");
  await expect(page.locator("#state")).toHaveValue("DL");
  await page.getByRole("button", { name: "Start again" }).click();
  await expect(page.locator("input[type=radio]:checked")).toHaveCount(0);
  await expect(page.locator("#accidentDate-year")).toHaveValue("");
  await expect(page.locator("#page-title")).toBeFocused();
});

test("switching to Hindi keeps every answer", async ({ page }) => {
  await page.goto("#/");
  await page.locator('input[name="kind"][value="injury"]').check();
  await fillDate(page, "accidentDate", "2025-06-01");
  await page.getByRole("button", { name: "हिंदी" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(h1(page)).toHaveText("मोटर दुर्घटना मुआवज़ा कैलकुलेटर");
  await expect(page.locator("#accidentDate-month")).toHaveValue("6");
  await expect(page.locator('input[name="kind"][value="injury"]')).toBeChecked();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("?lang=hi opens the page in Hindi", async ({ page }) => {
  await page.goto("?lang=hi#/");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(h1(page)).toHaveText("मोटर दुर्घटना मुआवज़ा कैलकुलेटर");
});

test("the estimate in Hindi shows the same amounts", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-homemaker.yaml")!;
  await fillForm(page, input);
  const amount = await page.locator("[data-testid=headline] [data-amount]").getAttribute("data-amount");
  await page.getByRole("button", { name: "हिंदी" }).click();
  await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute("data-amount", amount!);
  await expect(page.locator("[data-head=loss_of_dependency]")).toContainText("आश्रितता की हानि");
});

test("older addresses open the calculator at the matching place", async ({ page }) => {
  await page.goto("#/q/age");
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator("#age")).toBeFocused();
  await page.goto("#/stop/owner_driver");
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator("#victimRole")).toBeFocused();
  for (const old of ["#/estimate", "#/check", "#/result", "#/offer"]) {
    await page.goto(old);
    await expect(page).toHaveURL(/#\/$/);
    await expect(h1(page)).toHaveText("Motor accident compensation calculator");
  }
});

test("on a phone, a bar at the bottom shows progress, then the estimate, and hides while typing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("#/");
  const bar = page.getByTestId("phone-bar");
  await expect(bar).toContainText("answers still needed");
  await bar.getByRole("button").click(); // "Next": goes to the first unanswered question
  await expect(page.locator('input[name="kind"]').first()).toBeFocused();
  await page.locator("#age").focus();
  await expect(bar).toHaveCount(0); // the keyboard is open: nothing covers the field
  await page.locator("#page-title").focus();
  await expect(bar).toBeVisible();

  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillForm(page, input);
  await page.locator("#page-title").focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).toContainText("₹");
  await bar.getByRole("button").click();
  await expect(bar).toHaveCount(0); // the estimate itself is on screen
  await expect(page.locator("#result [data-testid=headline]")).toBeInViewport();
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
  await page.getByRole("link", { name: "Estimate", exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator("#page-title")).toBeFocused();
});

test("the whole form can be answered with the keyboard alone", async ({ page }) => {
  await page.goto("#/");
  const tabTo = async (selector: string) => {
    for (let i = 0; i < 80; i++) {
      if (await page.locator(selector).evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error(`could not reach ${selector} with Tab`);
  };
  await tabTo('input[name="kind"][value="death"]');
  await page.keyboard.press("Space");
  await tabTo("#accidentDate-day");
  await page.keyboard.type("1");
  await page.keyboard.press("Tab");
  await page.keyboard.type("6");
  await page.keyboard.press("Tab");
  await page.keyboard.type("2025");
  await tabTo("#victimRole");
  await page.keyboard.press("ArrowDown"); // the first choice: walking
  await expect(page.locator("#victimRole")).toHaveValue("pedestrian");
  await tabTo("#state");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#state")).toHaveValue("DL");
  await tabTo('input[name="offendingVehicle"][value="identified_insured"]');
  await page.keyboard.press("Space");
  await tabTo('input[name="s164"][value="none"]');
  await page.keyboard.press("Space");
  await tabTo('input[name="claimFiled"][value="yes"]');
  await page.keyboard.press("ArrowDown"); // radio groups move with the arrow keys
  await expect(page.locator('input[name="claimFiled"][value="no"]')).toBeChecked();
  await tabTo("#age");
  await page.keyboard.type("35");
  await tabTo("#employment");
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown");
  await expect(page.locator("#employment")).toHaveValue("homemaker");
  await tabTo('input[name="married"][value="yes"]');
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('input[name="married"][value="no"]')).toBeChecked();
  await tabTo("#children");
  await page.keyboard.type("0");
  await tabTo("#parents");
  await page.keyboard.type("2");
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
  await page.goto("#/");
  await expect(page.locator("article.doc h1").first()).toBeVisible({ timeout: 2000 });
});
