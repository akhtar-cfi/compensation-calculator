import type { Page } from "@playwright/test";
import { expect, radio, test } from "./helpers";

/**
 * The first screen: a short hero that says what the tool does, then "What happened to your family?" cards that
 * scroll sideways. Each card starts the calculator in the right place; three carry a worked example (a made-up
 * person) whose amount comes from the engine. The page sits in the crashfreeindia.org frame (header, footer).
 */

const card = (page: Page, id: string) => page.locator(`[data-situation="${id}"]`);
const track = (page: Page) => page.getByTestId("situations-track");
const checked = (page: Page, name: string, value: string) =>
  expect(page.locator(`input[name="${name}"][value="${value}"]`)).toBeChecked();

test("the hero says what the tool does, in a few lines, and leads to the calculator", async ({ page }) => {
  await page.goto("#/");
  await expect(page.locator("h1#page-title")).toHaveText(
    "Know what you’re owed before you accept any offer.",
  );
  await expect(page.getByTestId("tells").locator("li")).toHaveCount(5);
  await expect(page.getByTestId("tells")).toContainText("Cases like yours");
  await page.getByRole("link", { name: "See what you’re owed" }).click();
  await expect(page.locator("#calc")).toBeInViewport();
  await expect(page.locator("#calc")).toBeFocused();
});

test("the situation cards scroll sideways on a phone, and the page itself does not", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("#/");
  await expect(card(page, "hurt")).toBeVisible();
  const m = await track(page).evaluate((el) => ({
    scroll: el.scrollWidth,
    client: el.clientWidth,
    snap: getComputedStyle(el).scrollSnapType,
    first: el.querySelector("li")!.getBoundingClientRect().width,
  }));
  expect(m.scroll).toBeGreaterThan(m.client);
  expect(m.snap).toContain("x");
  // The next card peeks in, so it is clear there is more to see.
  expect(m.first).toBeLessThan(360 * 0.9);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
  await expect(page.locator("[data-situation] img").first()).toHaveAttribute("loading", "lazy");
});

test("on a laptop, arrows move the cards one at a time", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("#/");
  const prev = page.getByRole("button", { name: "Previous card" });
  const next = page.getByRole("button", { name: "Next card" });
  await expect(prev).toBeDisabled();
  await next.click();
  await expect.poll(() => track(page).evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  await expect(prev).toBeEnabled();
  await prev.click();
  await expect.poll(() => track(page).evaluate((el) => el.scrollLeft)).toBeLessThan(10);
});

test("starting from a card answers what it settles and goes on to the next question", async ({ page }) => {
  await page.goto("#/");
  await card(page, "homemaker").getByRole("button", { name: "Start: a homemaker died" }).click();
  await checked(page, "kind", "death");
  await checked(page, "employment", "homemaker");
  await expect(page.locator('[data-question="checks"] input').first()).toBeFocused();
  await expect(page).toHaveURL(/#\/$/);
});

test("each example card shows the engine's amount, and trying it fills the calculator", async ({ page }) => {
  await page.goto("#/");
  for (const id of ["hurt", "earner", "homemaker"])
    await expect(card(page, id).getByText("Example · not a real person")).toBeVisible();
  const amount = await card(page, "hurt").locator("[data-example-amount]").getAttribute("data-amount");
  expect(Number(amount)).toBeGreaterThan(800_000); // more than the ₹8 lakh offer in Madhur's story
  await expect(card(page, "hurt")).toContainText("₹8,00,000");
  await card(page, "hurt").getByRole("button", { name: "Try this example" }).click();
  await expect(page.locator("#result [data-testid=headline] [data-amount]")).toHaveAttribute(
    "data-amount",
    amount!,
  );
  await expect(page.locator("#age")).toHaveValue("21");
  await expect(page.locator("#result")).toBeInViewport();
});

test("trying an example over someone's own answers asks first", async ({ page }) => {
  await page.goto("#/");
  await page.fill("#age", "40");
  const c = card(page, "earner");
  await c.getByRole("button", { name: "Try this example" }).click();
  await expect(c.getByTestId("example-confirm")).toBeVisible();
  await c.getByRole("button", { name: "Keep my answers" }).click();
  await expect(c.getByTestId("example-confirm")).toHaveCount(0);
  await expect(c.getByRole("button", { name: "Try this example" })).toBeFocused();
  await expect(page.locator("#age")).toHaveValue("40");
  await c.getByRole("button", { name: "Try this example" }).click();
  await c.getByRole("button", { name: "Use the example" }).click();
  await expect(page.locator("#age")).toHaveValue("34");
  await expect(page.locator("#result [data-testid=headline]")).toBeVisible();
});

test("the hit-and-run card opens the hit-and-run guidance, with the scheme's amounts", async ({ page }) => {
  await page.goto("#/");
  await expect(card(page, "hit-and-run")).toContainText("₹2,00,000");
  await card(page, "hit-and-run").getByRole("button", { name: "See what to do" }).click();
  await checked(page, "vehicleTraced", "no");
  const stop = page.locator('[data-question="checks"] [data-stop="unidentified"]');
  await expect(stop).toBeVisible();
  await expect(stop).toContainText("₹50,000");
  await expect(page.locator("#result").getByTestId("no-estimate")).toBeVisible();
});

test("the offer card explains that the offer check follows the estimate", async ({ page }) => {
  await page.goto("#/");
  await card(page, "offer").getByRole("button", { name: "Check an offer" }).click();
  await expect(page.getByTestId("offer-hint")).toBeVisible();
  await expect(page.getByTestId("offer-hint")).toBeInViewport();
});

test("a card's link can be shared: it opens the calculator ready, then the address is the calculator's", async ({
  page,
}) => {
  await page.goto("#/start/homemaker");
  await checked(page, "kind", "death");
  await checked(page, "employment", "homemaker");
  await expect(page).toHaveURL(/#\/$/);
  await page.goto("#/example/earner");
  await expect(page.locator("#result [data-testid=headline]")).toBeVisible();
  await expect(page.locator("#age")).toHaveValue("34");
  await expect(page).toHaveURL(/#\/$/);
});

test("on a phone the site menu opens in place and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("#/");
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#site-menu")).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator("#site-menu");
  await expect(panel.getByRole("link", { name: "How it is calculated" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Donate Now" })).toHaveAttribute(
    "href",
    "https://crashfreeindia.org/donate",
  );
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
});

test("on a laptop the header is the website's: its pages, Donate, and the language switch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.goto("#/");
  const header = page.locator("header");
  await expect(header.getByRole("link", { name: "Knowledge Hub" })).toHaveAttribute(
    "href",
    "https://crashfreeindia.org/knowledge-hub",
  );
  await expect(header.getByRole("link", { name: "Donate Now" })).toBeVisible();
  await expect(header.getByRole("button", { name: "हिंदी" })).toBeVisible();
  await expect(header.getByRole("button", { name: "Menu" })).toBeHidden();
  const box = await header.boundingBox();
  expect(Math.round(box!.height)).toBe(69); // 68 px and its hairline, as on crashfreeindia.org
});

test("facts carry their sources, and help is one tap away", async ({ page }) => {
  await page.goto("#/");
  const facts = page.getByTestId("facts").locator("li");
  await expect(facts).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(facts.nth(i).getByRole("link")).toHaveAttribute("href", /\S/);
  const help = page.getByTestId("help");
  await expect(help.getByRole("link", { name: "+91 87429 10592" })).toHaveAttribute(
    "href",
    "tel:+918742910592",
  );
  await expect(help.getByRole("link", { name: "help@crashfreeindia.org" })).toHaveAttribute(
    "href",
    "mailto:help@crashfreeindia.org",
  );
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
    "href",
    "https://crashfreeindia.org/privacy-policy",
  );
  await expect(footer.getByRole("link", { name: "Instagram" })).toBeVisible();
  await expect(footer).toContainText("not legal advice");
});

test("with an estimate, cases like yours come right after it", async ({ page }) => {
  await page.goto("#/example/homemaker");
  const cases = page.getByTestId("cases-card");
  await expect(cases.getByRole("heading", { name: "Cases like yours" })).toBeVisible();
  await expect(cases.locator("[data-case]").first()).toBeVisible();
  // Directly under the estimate, before the optional details.
  const order = await page.evaluate(() =>
    ["result", "cases", "more"].map((id) => document.getElementById(id)!.getBoundingClientRect().top),
  );
  expect(order[0]).toBeLessThan(order[1]!);
  expect(order[1]).toBeLessThan(order[2]!);
});

test("in Hindi the first screen is in Hindi, and the cards still work", async ({ page }) => {
  await page.goto("?lang=hi#/");
  await expect(page.locator("h1#page-title")).toHaveText(
    "जानिए आपका हक़ कितना है कोई भी ऑफ़र मानने से पहले।",
  );
  await expect(card(page, "homemaker")).toContainText("उदाहरण · असली व्यक्ति नहीं");
  await card(page, "hurt").getByRole("button", { name: "शुरू करें: कोई घायल हुआ" }).click();
  await radio(page, "kind", "injury");
  await checked(page, "kind", "injury");
});
