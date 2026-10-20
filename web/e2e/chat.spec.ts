import type { Page } from "@playwright/test";
import { chatAt, examples, expect, expected, fillChat, guardRequests, settle, tabTo, test } from "./helpers";

/**
 * "Talk it through": the questions as a chat, answered with pictures and few words. No free text and no AI: every
 * bubble comes from the answers, so a reload (or the phone dropping the tab) keeps the whole conversation.
 */

const salaried = examples().find((e) => e.name === "death-salaried.yaml")!.input;
const q = (page: Page) => page.locator("#chat-q");
const ask = (page: Page) => page.locator("[data-chat-step]");
const tap = (page: Page, value: string) => ask(page).locator(`[data-value="${value}"]`).click();

/** Opens the chat on a fresh tab and picks English. */
async function begin(page: Page) {
  await page.goto("#/chat");
  await ask(page).locator("button[data-value=en]").click();
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:kind");
}

/** Answers the first questions of a death claim, up to the age. */
async function upToAge(page: Page) {
  await begin(page);
  await tap(page, "death");
  await tap(page, "not_driving");
  await tap(page, "yes");
  await tap(page, "none");
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:age");
}

test("asks the language first, in both languages, then each question in turn", async ({ page }) => {
  await page.goto("#/chat");
  await expect(page.locator("h1")).toHaveText("Talk it through");
  await expect(q(page)).toContainText("भाषा चुनें");
  await expect(q(page)).toContainText("Choose a language");
  await ask(page).locator("button[data-value=en]").click();
  await expect(q(page)).toHaveText("What happened?");
  await expect(q(page)).toBeFocused();
});

test("a tap answers; the conversation shows it, politely announced, with a way to change it", async ({
  page,
}) => {
  await begin(page);
  await tap(page, "death");
  const log = page.getByRole("log");
  await expect(log).toHaveAttribute("aria-live", "polite");
  await expect(log.locator("[data-said=kind]")).toHaveText(/They died/);
  await expect(log.locator("[data-change=kind]")).toBeVisible();
  await expect(q(page)).toHaveText("How were they involved?");
  await expect(q(page)).toBeFocused();
});

test("a typed answer waits for Send, and a wrong one says what is wrong", async ({ page }) => {
  await upToAge(page);
  await page.fill("#age", "3");
  await settle(page);
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:age");
  await page.fill("#age", "200");
  await ask(page).locator("[data-action=send]").click();
  await expect(page.locator("#age-error")).toBeVisible();
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:age");
  await page.fill("#age", "35");
  await ask(page).locator("[data-action=send]").click();
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:employment");
  await expect(page.getByRole("log").locator("[data-said=age]")).toContainText("35");
});

test("Change asks again, and answers that no longer apply drop out", async ({ page }) => {
  await upToAge(page);
  await page.fill("#age", "30");
  await ask(page).locator("[data-action=send]").click();
  await tap(page, "permanent");
  await tap(page, "salary_slip");
  await page.fill("#monthlySalary", "25000");
  await ask(page).locator("[data-action=send]").click();
  const log = page.getByRole("log");
  await expect(log.locator("[data-said=monthlySalary]")).toBeVisible();
  await log.locator("[data-change=employment]").click();
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:employment");
  await expect(q(page)).toBeFocused();
  await expect(ask(page).locator('[data-value="permanent"]')).toHaveAttribute("aria-pressed", "true");
  await tap(page, "homemaker");
  await expect(log.locator("[data-said=employment]")).toContainText("Homemaker");
  await expect(log.locator("[data-said=proof]")).toHaveCount(0);
  await expect(log.locator("[data-said=monthlySalary]")).toHaveCount(0);
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:married");
});

test("Start again asks before clearing the answers", async ({ page }) => {
  await begin(page);
  await tap(page, "death");
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:victimRole");
  await page.getByTestId("restart").click();
  await page.getByRole("button", { name: "Keep my answers" }).click();
  await expect(page.getByTestId("restart")).toBeFocused();
  await expect(page.locator("[data-said=kind]")).toBeVisible();
  await page.getByTestId("restart").click();
  await page.getByTestId("restart-confirm").click();
  await expect(page.locator("[data-said]")).toHaveCount(0);
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:kind");
});

test("a reload keeps the whole conversation", async ({ page }) => {
  await upToAge(page);
  await page.fill("#age", "30");
  await ask(page).locator("[data-action=send]").click();
  const said = () =>
    page
      .getByRole("log")
      .locator("[data-said]")
      .evaluateAll((els) => els.map((e) => `${e.getAttribute("data-said")}=${e.textContent}`));
  const before = await said();
  expect(before.length).toBe(5);
  await page.reload();
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:employment");
  expect(await said()).toEqual(before);
});

test("an answer that ends the claim says what to do instead, and can be changed", async ({ page }) => {
  await begin(page);
  await tap(page, "injury");
  await tap(page, "owner_driver_single_vehicle");
  await expect(ask(page)).toHaveAttribute("data-chat-step", "stop");
  await expect(ask(page).locator("[data-stop]")).toBeVisible();
  await ask(page).locator("[data-action=change-stop]").click();
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:victimRole");
  await tap(page, "not_driving");
  await expect(ask(page)).toHaveAttribute("data-chat-step", "ask:vehicleTraced");
});

test("the amount arrives as a card, then an offer to make it more accurate", async ({ page, baseURL }) => {
  const outside = guardRequests(page, baseURL!);
  await fillChat(page, salaried, { details: false });
  await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute(
    "data-amount",
    String(expected(salaried).headline!.amount),
  );
  await page.locator("[data-change=age]").click();
  await page.fill("#age", "45");
  await ask(page).locator("[data-action=send]").click();
  await expect(page.locator("[data-testid=headline] [data-amount]")).not.toHaveAttribute(
    "data-amount",
    String(expected(salaried).headline!.amount),
  );
  expect(outside, "requests outside the page's own origin").toEqual([]);
});

test("the amount is in view where the chat is, when it arrives and when an answer changes it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fillChat(page, salaried, { details: false });
  const mini = ask(page).getByTestId("mini-amount");
  await expect(mini).toContainText("lakh");
  await expect(mini).toBeInViewport();
  await page.locator("[data-change=age]").click();
  await page.fill("#age", "45");
  await ask(page).locator("[data-action=send]").click();
  await expect(ask(page).getByTestId("mini-amount")).toContainText(/from ₹/);
  await expect(ask(page).getByTestId("mini-amount")).toBeInViewport();
});

test("each detail after the amount moves it, and can be skipped", async ({ page }) => {
  await fillChat(page, salaried, { details: false });
  await ask(page).locator("[data-action=more]").click();
  await expect(ask(page)).toHaveAttribute("data-chat-step", "refine:medicalBills");
  await page.fill("#medicalBills", "1,00,000");
  await ask(page).locator("[data-action=send]").click();
  await expect(page.getByTestId("change")).toContainText("Up ₹1,00,000");
  await expect(ask(page)).toHaveAttribute("data-chat-step", "refine:cashlessPaid");
  await ask(page).locator("[data-action=skip]").click();
  await expect(page.getByRole("log").locator("[data-said=cashlessPaid]")).toContainText("Skipped");
});

test("in Hindi, every bubble is in Hindi", async ({ page }) => {
  const where = await fillChat(page, salaried, { lang: "hi" });
  expect(where).toBe("result");
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  const bubbles = await page
    .locator("[data-bubble]")
    .evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()));
  expect(bubbles.length).toBeGreaterThan(15);
  // Latin letters only in abbreviations a Hindi reader also sees in English (the tribunal's name).
  const english = bubbles.filter((b) => /[A-Za-z]/.test(b.replace(/MACT/g, "")));
  expect(english).toEqual([]);
  expect(await chatAt(page)).toBe("done");
});

test("can be answered with the keyboard alone, each new question taking the focus", async ({ page }) => {
  const press = async (selector: string) => {
    await tabTo(page, selector);
    await page.keyboard.press("Enter");
  };
  const type = async (selector: string, text: string) => {
    await tabTo(page, selector);
    await page.keyboard.type(text);
  };
  await page.goto("#/chat");
  await press("[data-chat-step] button[data-value=en]");
  for (const v of ["death", "not_driving", "yes", "none"]) {
    await press(`[data-chat-step] [data-value="${v}"]`);
    await expect(q(page)).toBeFocused();
  }
  await type("#age", "30");
  await press("[data-chat-step] [data-action=send]");
  await press('[data-chat-step] [data-value="permanent"]');
  await press('[data-chat-step] [data-value="salary_slip"]');
  await type("#monthlySalary", "25000");
  await press("[data-chat-step] [data-action=send]");
  for (const v of ["yes", "yes", "2", "0"]) await press(`[data-chat-step] [data-value="${v}"]`);
  await type("#accidentDate-month", "June");
  await type("#accidentDate-year", "2025");
  await press("[data-chat-step] [data-action=send]");
  await press('[data-chat-step] [data-value="DL"]');
  await expect(ask(page)).toHaveAttribute("data-chat-step", "offerRefine");
  await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute(
    "data-amount",
    String(expected(salaried).headline!.amount),
  );
});
