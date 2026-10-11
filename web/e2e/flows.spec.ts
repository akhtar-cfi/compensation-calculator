import { examples, expect, fillWizard, test } from "./helpers";

test("an eligibility stop is flagged on the first step and gives no number", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await page.goto("#/estimate");
  await page.selectOption("#victimRole", "owner_driver_single_vehicle");
  await expect(page.getByRole("alert")).toContainText("owner-driver");
  await fillWizard(page, { ...input, victimRole: "owner_driver_single_vehicle" });
  await expect(page.getByTestId("no-estimate")).toBeVisible();
  await expect(page.getByTestId("headline")).toHaveCount(0);
  await expect(page.locator("[data-code=OWNER_DRIVER_NO_166][data-severity=stop]")).toHaveCount(1);
});

test("switching to Hindi keeps every answer", async ({ page }) => {
  await page.goto("#/estimate");
  await page.locator('input[name="kind"][value="injury"]').check();
  await page.fill("#accidentDate", "2025-06-01");
  await page.selectOption("#victimRole", "pedestrian");
  await page.getByRole("button", { name: "Next" }).click();
  await page.fill("#age", "41");
  await page.getByRole("button", { name: "हिंदी" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("व्यक्ति");
  await expect(page.locator("#age")).toHaveValue("41");
  await page.getByRole("button", { name: "पीछे" }).click();
  await expect(page.locator('input[name="kind"][value="injury"]')).toBeChecked();
  await expect(page.locator("#accidentDate")).toHaveValue("2025-06-01");
  await expect(page.locator("#victimRole")).toHaveValue("pedestrian");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("the result page in Hindi shows the same amounts", async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-homemaker.yaml")!;
  await fillWizard(page, input);
  const amount = await page.locator("[data-testid=headline] [data-amount]").getAttribute("data-amount");
  await page.getByRole("button", { name: "हिंदी" }).click();
  await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute("data-amount", amount!);
  await expect(page.locator("[data-head=loss_of_dependency]")).toContainText("आश्रितता की हानि");
});

test("a missing answer is reported on its own step and blocks moving on", async ({ page }) => {
  await page.goto("#/estimate");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator("#accidentDate")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#accidentDate")).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The accident");
  await page.fill("#accidentDate", "2099-01-01");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator("#accidentDate-error")).toHaveText("This date cannot be in the future.");
});

test("the result page cannot be opened without answers", async ({ page }) => {
  await page.goto("#/result");
  await expect(page).toHaveURL(/#\/estimate$/);
});

test("the public documents are on the page", async ({ page }) => {
  await page.goto("#/how");
  await expect(page.locator("article.doc h1").first()).toBeVisible();
  await page.goto("#/rules");
  await expect(page.locator("article.doc")).toContainText("Open checks");
  await page.goto("#/offer-study");
  await expect(page.locator("article.doc h1").first()).toBeVisible();
});

test("the wizard can be completed with the keyboard alone", async ({ page }) => {
  await page.goto("#/");
  const tabTo = async (selector: string) => {
    for (let i = 0; i < 80; i++) {
      if (await page.locator(selector).evaluate((el) => el === document.activeElement)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error(`could not reach ${selector} with Tab`);
  };
  await tabTo('a[href="#/estimate"].rounded-full');
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/estimate$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The accident");
  await tabTo('input[name="kind"][value="death"]');
  await tabTo("#accidentDate");
  await page.keyboard.type("06012025"); // mm dd yyyy in the en-US date field
  await expect(page.locator("#accidentDate")).toHaveValue("2025-06-01");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The person");
  await tabTo("#age");
  await page.keyboard.type("35");
  await tabTo("#employment");
  await tabTo('button[type="submit"]');
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Family");
  await tabTo('input[name="married"][value="no"]');
  await page.keyboard.press("ArrowUp"); // radio groups move with the arrow keys
  await expect(page.locator('input[name="married"][value="yes"]')).toBeChecked();
  await tabTo('input[name="spouse"][value="no"]');
  await page.keyboard.press("ArrowUp");
  await tabTo("#children");
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Medical expenses");
  await tabTo("#medicalBills");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/result$/);
  await expect(page.getByTestId("headline")).toBeVisible();
});

test('"Change answers" reopens the wizard at the first step with the answers kept', async ({ page }) => {
  const { input } = examples().find((e) => e.name === "death-salaried.yaml")!;
  await fillWizard(page, input);
  await page.getByRole("link", { name: "Change answers" }).first().click();
  await expect(page).toHaveURL(/#\/estimate$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The accident");
  await expect(page.locator("#accidentDate")).toHaveValue(input.accidentDate);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator("#monthlySalary")).toHaveValue(String(input.victim.income!.monthlySalary));
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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The accident", { timeout: 2000 });
});
