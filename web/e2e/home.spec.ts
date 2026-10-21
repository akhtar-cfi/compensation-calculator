import type { Page } from "@playwright/test";
import { summariseJourney } from "../../src/cases/match.js";
import { loadCases } from "../../src/cases/load.js";
import { formatLakh } from "../../src/engine/money.js";
import { exampleEstimate, situation } from "../src/situations.js";
import { pickStories } from "../src/stories.js";
import { escapeOnOpen, expect, radio, rules, test, today } from "./helpers";

/**
 * The start page: a welcome page over the whole first screen (what the tool does, what you can find out, and the four
 * ways to answer as buttons, each with one line on what it is like), then real cases from the crash to the final
 * amount. A way to answer is picked once and remembered on the phone; a shared link ("#/start/…", "#/example/…")
 * opens the remembered way (or "Take it slow") ready. The page sits in the crashfreeindia.org frame.
 */

const tiles = (page: Page) => page.getByTestId("chooser").locator("[data-mode]");
const stories = (page: Page) => page.getByTestId("stories").locator("[data-story]");
const checked = (page: Page, name: string, value: string) =>
  expect(page.locator(`input[name="${name}"][value="${value}"]`)).toBeChecked();
/** As if this phone had picked a way of answering before. */
const remembered = (page: Page, mode: string) =>
  page.addInitScript((m) => localStorage.setItem("mact-calculator.mode", m), mode);
const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const LINES = {
  slow: "One question at a time. Easiest on a phone.",
  chat: "Like a WhatsApp chat: tap pictures, type little.",
  all: "All the questions on one page, at once.",
  detail: "Every rule and ruling, for lawyers and helpers.",
};

for (const lang of ["en", "hi"] as const) {
  for (const [w, h] of [
    [1280, 720],
    [1366, 768],
  ] as const)
    test(`on a laptop the welcome covers the first screen, details first and the four ways below, all in view (${w}×${h}, ${lang})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(lang === "hi" ? "?lang=hi#/" : "#/");
      await expect(page.locator("h1#page-title")).toHaveText(
        lang === "hi"
          ? "सड़क दुर्घटना का मुआवज़ा, कुछ ही मिनटों में।"
          : "Road crash compensation, worked out in minutes.",
      );
      const hero = (await page.getByTestId("hero").boundingBox())!;
      expect(hero.y + hero.height, "the welcome reaches the bottom of the screen").toBeGreaterThanOrEqual(h);
      const tells = (await page.getByTestId("tells").boundingBox())!;
      await expect(tiles(page)).toHaveCount(4);
      for (const tile of await tiles(page).all()) {
        const box = (await tile.boundingBox())!;
        expect(box.y, "the ways to answer come after what you can find out").toBeGreaterThan(
          tells.y + tells.height,
        );
        expect(box.y + box.height, "the button is on the first screen").toBeLessThanOrEqual(h);
      }
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });

  test(`on a phone the welcome fills the first screen, with the first way to answer in view (360×740, ${lang})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(lang === "hi" ? "?lang=hi#/" : "#/");
    const hero = (await page.getByTestId("hero").boundingBox())!;
    expect(hero.y + hero.height).toBeGreaterThanOrEqual(740);
    await expect(page.locator("h1#page-title")).toBeInViewport();
    const first = (await tiles(page).first().boundingBox())!;
    expect(first.y + first.height, "'Take it slow' is on the first screen").toBeLessThanOrEqual(740);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });
}

test("each way to answer is a button with one line on what it is like", async ({ page }) => {
  await page.goto("#/");
  for (const [m, line] of Object.entries(LINES)) {
    const tile = page.locator(`[data-testid=chooser] [data-mode="${m}"]`);
    await expect(tile).toContainText(line);
    await expect(tile).toHaveAttribute("href", `#/${m}`);
  }
  // Nothing on the page says "draft" (the rules' version name in the footer's small print aside).
  await expect(page.locator("main").getByText(/draft/i)).toHaveCount(0);
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

test("real cases are told whole: the story, each step's amount and year, the years it took, and the judgment", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("#/");
  const picked = pickStories(loadCases());
  await expect(stories(page)).toHaveCount(3);
  for (const [i, c] of picked.slice(0, 3).entries()) {
    const story = stories(page).nth(i);
    await expect(story).toHaveAttribute("data-story", c.id);
    await expect(story).toContainText(c.summary.slice(-40).replace(/\bRs\.?\s?/g, "₹"));
    const steps = story.locator("[data-timeline] li");
    await expect(steps).toHaveCount(c.journey.length + 1);
    await expect(steps.first()).toContainText(`Accident (${c.facts.accident_date!.slice(0, 4)})`);
    for (const [k, s] of c.journey.entries()) {
      const amount = steps.nth(k + 1).locator("[data-amount]");
      await expect(amount).toHaveAttribute("data-amount", String(s.amount));
      await expect(amount).toHaveText(formatLakh(s.amount));
    }
    await expect(story.locator("[data-outcome]")).toContainText(
      `${summariseJourney(c).years} years from accident to final amount`,
    );
    await expect(story.getByRole("link", { name: "Read the judgment" })).toHaveAttribute(
      "href",
      c.source_url,
    );
    // Nothing is cut off: the card fits the screen, and the page does not scroll sideways.
    const box = (await story.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
  }
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  // What made the difference opens on a tap.
  const first = stories(page).first();
  await expect(first.locator("details li").first()).toBeHidden();
  await first.getByText("What made the difference").click();
  await expect(first.locator("details li").first()).toBeVisible();
});

test("more real cases show on request, and the focus moves to the first new one", async ({ page }) => {
  await page.goto("#/");
  await page.getByRole("button", { name: "Show 3 more cases" }).click();
  await expect(stories(page)).toHaveCount(6);
  await expect(stories(page).nth(3).locator("h3")).toBeFocused();
  await expect(page.getByRole("button", { name: "Show 3 more cases" })).toHaveCount(0);
});

test("the welcome page links down to the real cases, and they lead back to the ways to answer", async ({
  page,
}) => {
  await page.goto("#/");
  await page.getByRole("link", { name: "Real cases: what families got, and how long it took" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator("#stories")).toBeFocused();
  await expect(page.locator("#stories-h")).toBeInViewport();
  await page.getByRole("link", { name: "Work out your own amount" }).click();
  await expect(page.locator("#choose-h")).toBeFocused();
});

test("in Hindi the real cases say they are told in English, and the steps are named in Hindi", async ({
  page,
}) => {
  await page.goto("?lang=hi#/");
  await expect(page.getByTestId("stories-in-english")).toBeVisible();
  const first = stories(page).first();
  await expect(first).toContainText("मृत्यु");
  await expect(first.locator("[data-timeline] li").first()).toContainText("दुर्घटना");
  await expect(first.locator("[data-timeline]")).toContainText("सुप्रीम कोर्ट");
  await expect(first.locator("p[lang=en]")).toHaveCount(1);
});

test("a shared link opens 'Take it slow' on a first visit, with what it settles", async ({ page }) => {
  await page.goto("#/start/homemaker");
  await expect(page).toHaveURL(/#\/slow\/lang$/);
  await page.locator("[data-slow=lang] button[data-value=en]").click();
  await expect(page).toHaveURL(/#\/slow\/role$/);
  await expect(page.locator("[data-chip=kind]")).toContainText("They died");
  await expect(page.locator("[data-chip=employment]")).toHaveCount(0); // asked on a later screen
});

test("a shared link opens the way of answering picked last time, ready", async ({ page }) => {
  await remembered(page, "all");
  await page.goto("#/start/homemaker");
  await expect(page).toHaveURL(/#\/all$/);
  await checked(page, "kind", "death");
  await checked(page, "employment", "homemaker");
  await expect(page.locator('[data-question="checks"] input').first()).toBeFocused();
});

test("an example's link opens the engine's own amount for that example", async ({ page }) => {
  await remembered(page, "all");
  await page.goto("#/example/hurt");
  await expect(page).toHaveURL(/#\/all$/);
  const est = exampleEstimate(situation("hurt"), rules, today())!;
  await expect(page.locator("#result [data-testid=headline] [data-amount]")).toHaveAttribute(
    "data-amount",
    String(est.headline!.amount),
  );
  expect(est.headline!.amount).toBeGreaterThan(800_000); // more than the ₹8 lakh offer in Madhur's story
  await expect(page.locator("#age")).toHaveValue("21");
  await expect(page.locator("#result")).toBeInViewport();
});

/** Some answers given in this tab, as an earlier family's would be. */
async function answersFromBefore(page: Page) {
  await page.goto("#/all");
  await radio(page, "kind", "death");
  await page.fill("#age", "30");
  await page.locator("#age").blur();
}

test("a shared link over answers from before asks if this is a new case; a new case starts empty", async ({
  page,
}) => {
  await remembered(page, "all");
  await answersFromBefore(page);
  await page.goto("#/start/hurt");
  await expect(page).toHaveURL(/#\/$/);
  const ask = page.getByTestId("start-confirm");
  await expect(ask).toContainText("Hurt, and can’t work like before");
  await expect(ask).toContainText("a death · 30 years old");
  await expect(ask.getByRole("button", { name: /^New case/ })).toBeFocused();
  await ask.getByRole("button", { name: /^New case/ }).click();
  await expect(page).toHaveURL(/#\/all$/);
  await checked(page, "kind", "injury");
  await expect(page.locator("#age")).toHaveValue("");
});

test("a shared link over answers from before can keep them, for the same case", async ({ page }) => {
  await remembered(page, "all");
  await answersFromBefore(page);
  await page.goto("#/start/hurt");
  await page
    .getByTestId("start-confirm")
    .getByRole("button", { name: /^Same case/ })
    .click();
  await expect(page).toHaveURL(/#\/all$/);
  await checked(page, "kind", "injury");
  await expect(page.locator("#age")).toHaveValue("30");
});

test("an example's link over answers from before asks first; keeping them changes nothing", async ({
  page,
}) => {
  await remembered(page, "all");
  await answersFromBefore(page);
  await page.goto("#/example/earner");
  await expect(page).toHaveURL(/#\/$/);
  const ask = page.getByTestId("example-confirm");
  await expect(ask).toContainText("Ravi, 34");
  await expect(ask.getByRole("button", { name: "Keep my answers" })).toBeFocused();
  await ask.getByRole("button", { name: "Keep my answers" }).click();
  await expect(ask).toHaveCount(0);
  await expect(page.locator("#page-title")).toBeFocused();
  await page.goto("#/all");
  await expect(page.locator("#age")).toHaveValue("30");
  await page.goto("#/example/earner");
  await page.getByTestId("example-confirm").getByRole("button", { name: "Use the example" }).click();
  await expect(page).toHaveURL(/#\/all$/);
  await expect(page.locator("#age")).toHaveValue("34");
});

test("an example's answers are marked as the example's in every way, until the person starts their own", async ({
  page,
}) => {
  await remembered(page, "all");
  await page.goto("#/example/hurt");
  await expect(page).toHaveURL(/#\/all$/);
  const notice = page.getByTestId("example-notice");
  await expect(notice).toContainText("Madhur");
  await expect(page.locator("#result").getByTestId("example-mark")).toContainText("Not your answers");
  for (const way of ["slow", "chat", "detail"]) {
    await page.goto(`#/${way}`);
    await expect(notice).toContainText("Madhur");
  }
  await page.reload();
  await expect(notice).toContainText("Madhur");
  await notice.getByRole("button", { name: "Start my own case" }).click();
  await expect(notice).toHaveCount(0);
  await expect(page).toHaveURL(/#\/detail$/);
  await expect(page.locator("#age")).toHaveValue("");
  await expect(page.locator("#page-title")).toBeFocused();
});

test("the hit-and-run link opens the hit-and-run guidance, with the scheme's amounts", async ({ page }) => {
  await remembered(page, "all");
  await page.goto("#/start/hit-and-run");
  await checked(page, "vehicleTraced", "no");
  const stop = page.locator('[data-question="checks"] [data-stop="unidentified"]');
  await expect(stop).toBeVisible();
  await expect(stop).toContainText("₹50,000");
  await expect(stop).toContainText("₹2,00,000");
  // Not the end of every claim: told in amber, with what happens if the vehicle is found later.
  await expect(stop.locator("[data-severity]")).toHaveAttribute("data-severity", "caution");
  await expect(stop).toContainText("If the vehicle is found later, a full claim can be made");
  await expect(page.locator("#result").getByTestId("no-estimate")).toHaveText("What you can claim instead");
});

test("the offer link explains that the offer check follows the estimate", async ({ page }) => {
  await remembered(page, "all");
  await page.goto("#/start/offer");
  await expect(page.getByTestId("offer-hint")).toBeVisible();
  await expect(page.getByTestId("offer-hint")).toBeInViewport();
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

test("with an estimate on the one page, everything after it comes in one order", async ({ page }) => {
  await remembered(page, "all");
  await page.goto("#/example/homemaker");
  const cases = page.getByTestId("cases-card");
  await expect(cases.getByRole("heading", { name: "Cases like yours" })).toBeVisible();
  await expect(cases.locator("[data-case]").first()).toBeVisible();
  // The estimate, the details that narrow it, cases like it, the offer check, then the rest.
  const order = await page.evaluate(() =>
    ["result", "more", "cases", "offer", "details"].map(
      (id) => document.getElementById(id)!.getBoundingClientRect().top,
    ),
  );
  for (let i = 1; i < order.length; i++) expect(order[i - 1]).toBeLessThan(order[i]!);
  // Two cases first, the rest on request.
  await expect(cases.locator("[data-case]")).toHaveCount(2);
  await cases.getByRole("button", { name: /^Show \d more$/ }).click();
  await expect(cases.locator("[data-case]")).toHaveCount(3);
  await expect(cases.locator("[data-case] h3").nth(2)).toBeFocused();
});

test("in Hindi, the cases card says in Hindi why each case is like this one, and that the stories are in English", async ({
  page,
}) => {
  await remembered(page, "all");
  await page.goto("?lang=hi#/example/homemaker");
  const cases = page.getByTestId("cases-card");
  await expect(cases.locator("[data-case]").first()).toBeVisible();
  await expect(cases.getByTestId("cases-in-english")).toBeVisible();
  const why = await cases.locator("[data-why]").allTextContents();
  expect(why.length).toBeGreaterThan(0);
  expect(why.filter((w) => /[A-Za-z]/.test(w))).toEqual([]);
  await page.getByRole("button", { name: "English" }).click();
  await expect(cases.getByTestId("cases-in-english")).toHaveCount(0);
  await expect(cases.locator("[data-why]").first()).toContainText(/also homemaker|same state|similar age/);
});

test("in Hindi a shared link still works", async ({ page }) => {
  await remembered(page, "all");
  await page.goto("?lang=hi#/start/hurt");
  await checked(page, "kind", "injury");
});
