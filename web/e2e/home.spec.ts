import type { Page } from "@playwright/test";
import { escapeOnOpen, expect, radio, test } from "./helpers";

/**
 * The first screen: what the tool does, four ways to answer (picked once, remembered on the phone), what you can
 * find out, and "What happened to your family?" cards that move only when touched. Each card opens the way of
 * answering the person picked last (or "Take it slow") with what it settles; three carry a worked example whose
 * amount comes from the engine. The page sits in the crashfreeindia.org frame (header, footer).
 */

const card = (page: Page, id: string) => page.locator(`[data-situation="${id}"]`);
const track = (page: Page) => page.getByTestId("situations-track");
const tiles = (page: Page) => page.getByTestId("chooser").locator("[data-mode]");
const checked = (page: Page, name: string, value: string) =>
  expect(page.locator(`input[name="${name}"][value="${value}"]`)).toBeChecked();
/** As if this phone had picked a way of answering before. */
const remembered = (page: Page, mode: string) =>
  page.addInitScript((m) => localStorage.setItem("mact-calculator.mode", m), mode);

for (const [w, h] of [
  [360, 740],
  [1280, 720],
] as const)
  for (const lang of ["en", "hi"] as const)
    test(`the first screen says what the tool does and shows the four ways to answer (${w}×${h}, ${lang})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(lang === "hi" ? "?lang=hi#/" : "#/");
      await expect(page.locator("h1#page-title")).toHaveText(
        lang === "hi"
          ? "सड़क दुर्घटना का मुआवज़ा, कुछ ही मिनटों में।"
          : "Road crash compensation, worked out in minutes.",
      );
      await expect(tiles(page)).toHaveCount(4);
      for (const tile of await tiles(page).all()) {
        const box = (await tile.boundingBox())!;
        expect(box.y + box.height, "the tile is on the first screen").toBeLessThanOrEqual(h);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBeLessThanOrEqual(0);
    });

test("what you can find out includes how cases like yours went", async ({ page }) => {
  await page.goto("#/");
  const tells = page.getByTestId("tells").locator("li");
  await expect(tells).toHaveCount(5);
  await expect(page.getByTestId("tells").locator("[data-highlight]")).toContainText(
    "How cases like yours went",
  );
});

test("picking a way of answering opens it, and this phone remembers it as 'Last time'", async ({ page }) => {
  await page.goto("#/");
  await expect(page.getByTestId("chooser")).not.toContainText("Last time");
  await tiles(page).filter({ hasText: "Talk it through" }).click();
  await expect(page).toHaveURL(/#\/chat$/);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ "mact-calculator.mode": "chat" });
  await page.goto("#/");
  await expect(page.locator('[data-mode="chat"]')).toContainText("Last time");
  await page.getByRole("link", { name: /Not sure\? Start the easy way/ }).click();
  await expect(page).toHaveURL(/#\/slow/);
  expect(await page.evaluate(() => localStorage.getItem("mact-calculator.mode"))).toBe("slow");
});

test("#/choose brings the four ways into view and focus", async ({ page }) => {
  await page.goto("#/how");
  await page.goto("#/choose");
  await expect(page.locator("#choose-h")).toBeFocused();
  await expect(page.getByTestId("chooser")).toBeInViewport();
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

test("on a laptop the cards move only when touched: arrows move them one at a time", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("#/");
  await page.waitForTimeout(2500);
  expect(await track(page).evaluate((el) => el.scrollLeft)).toBe(0);
  const prev = page.getByRole("button", { name: "Previous card" });
  const next = page.getByRole("button", { name: "Next card" });
  await expect(prev).toBeDisabled();
  await next.click();
  await expect.poll(() => track(page).evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  await expect(prev).toBeEnabled();
  await prev.click();
  await expect.poll(() => track(page).evaluate((el) => el.scrollLeft)).toBeLessThan(10);
});

test("a card opens 'Take it slow' on a first visit, with what the card settles", async ({ page }) => {
  await page.goto("#/");
  await card(page, "homemaker").getByRole("button", { name: "Start: a homemaker died" }).click();
  await expect(page).toHaveURL(/#\/slow\/lang$/);
  await page.locator("[data-slow=lang] button[data-value=en]").click();
  await expect(page).toHaveURL(/#\/slow\/role$/);
  await expect(page.locator("[data-chip=kind]")).toContainText("They died");
  await expect(page.locator("[data-chip=employment]")).toHaveCount(0); // asked on a later screen
});

test("a card opens the way of answering picked last time", async ({ page }) => {
  await remembered(page, "all");
  await page.goto("#/");
  await card(page, "homemaker").getByRole("button", { name: "Start: a homemaker died" }).click();
  await expect(page).toHaveURL(/#\/all$/);
  await checked(page, "kind", "death");
  await checked(page, "employment", "homemaker");
  await expect(page.locator('[data-question="checks"] input').first()).toBeFocused();
});

test("each example card shows the engine's amount, and trying it opens that amount", async ({ page }) => {
  await remembered(page, "all");
  await page.goto("#/");
  for (const id of ["hurt", "earner", "homemaker"])
    await expect(card(page, id).getByText("Example · not a real person")).toBeVisible();
  const amount = await card(page, "hurt").locator("[data-example-amount]").getAttribute("data-amount");
  expect(Number(amount)).toBeGreaterThan(800_000); // more than the ₹8 lakh offer in Madhur's story
  await expect(card(page, "hurt")).toContainText("₹8,00,000");
  await card(page, "hurt").getByRole("button", { name: "Try this example" }).click();
  await expect(page).toHaveURL(/#\/all$/);
  await expect(page.locator("#result [data-testid=headline] [data-amount]")).toHaveAttribute(
    "data-amount",
    amount!,
  );
  await expect(page.locator("#age")).toHaveValue("21");
  await expect(page.locator("#result")).toBeInViewport();
});

test("trying an example over someone's own answers asks first", async ({ page }) => {
  await page.goto("#/all");
  await page.fill("#age", "40");
  await page.goto("#/");
  const c = card(page, "earner");
  await c.getByRole("button", { name: "Try this example" }).click();
  await expect(c.getByTestId("example-confirm")).toBeVisible();
  await c.getByRole("button", { name: "Keep my answers" }).click();
  await expect(c.getByTestId("example-confirm")).toHaveCount(0);
  await expect(c.getByRole("button", { name: "Try this example" })).toBeFocused();
  await c.getByRole("button", { name: "Try this example" }).click();
  await c.getByRole("button", { name: "Use the example" }).click();
  await expect(page).toHaveURL(/#\/slow\//);
  await page.goto("#/all");
  await expect(page.locator("#age")).toHaveValue("34");
});

test("the hit-and-run card opens the hit-and-run guidance, with the scheme's amounts", async ({ page }) => {
  await remembered(page, "all");
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
  await remembered(page, "all");
  await page.goto("#/");
  await card(page, "offer").getByRole("button", { name: "Check an offer" }).click();
  await expect(page.getByTestId("offer-hint")).toBeVisible();
  await expect(page.getByTestId("offer-hint")).toBeInViewport();
});

test("a card's link can be shared: it opens the way of answering ready", async ({ page }) => {
  await remembered(page, "all");
  await page.goto("#/start/homemaker");
  await expect(page).toHaveURL(/#\/all$/);
  await checked(page, "kind", "death");
  await checked(page, "employment", "homemaker");
  await page.goto("#/example/earner");
  await expect(page.locator("#result [data-testid=headline]")).toBeVisible();
  await expect(page.locator("#age")).toHaveValue("34");
  await expect(page).toHaveURL(/#\/all$/);
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

test("on a phone, Escape closes the site menu from the moment it opens", async ({ page }) => {
  await escapeOnOpen(page);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("#/");
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  await expect(page.locator("html")).toHaveAttribute("data-escaped", "1");
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
  // Free legal aid only, until Crashfree India confirms its own helpline: no CFI number, email or promise of help.
  const help = page.getByTestId("help");
  await expect(help).toContainText("District Legal Services Authority");
  await expect(help.getByRole("link", { name: "Call 15100" })).toHaveAttribute("href", "tel:15100");
  await expect(help).not.toContainText("87429");
  await expect(help).not.toContainText("help@crashfreeindia.org");
  await expect(help).not.toContainText("helps families file");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
    "href",
    "https://crashfreeindia.org/privacy-policy",
  );
  await expect(footer.getByRole("link", { name: "Instagram" })).toBeVisible();
  await expect(footer).toContainText("not legal advice");
});

test("with an estimate on the one page, cases like yours come right after it", async ({ page }) => {
  await remembered(page, "all");
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

test("in Hindi the cards still work", async ({ page }) => {
  await remembered(page, "all");
  await page.goto("?lang=hi#/");
  await expect(card(page, "homemaker")).toContainText("उदाहरण · असली व्यक्ति नहीं");
  await card(page, "hurt").getByRole("button", { name: "शुरू करें: कोई घायल हुआ" }).click();
  await radio(page, "kind", "injury");
  await checked(page, "kind", "injury");
});
