import { checkOffer } from "../../src/engine/index.js";
import { countSimilar } from "../../src/cases/match.js";
import { loadCases } from "../../src/cases/load.js";
import { onPath } from "../src/flow.js";
import { formFromInput } from "./answers";
import { examples, expect, expected, fillSlow, rules, settle, slowAt, tabTo, test } from "./helpers";

/**
 * "Take it slow": one question at a time, for someone doing this once, on a phone, perhaps in a hospital corridor.
 * A tap moves on by itself; the amount comes straight after the last quick question; every answer stays in reach.
 */

const salaried = examples().find((e) => e.name === "death-salaried.yaml")!.input;
const title = (page: import("@playwright/test").Page) => page.locator("#page-title");

/** Opens "Take it slow" on a fresh tab and picks English. */
async function begin(page: import("@playwright/test").Page) {
  await page.goto("#/slow");
  await page.locator("[data-slow=lang] button[data-value=en]").click();
  await expect(page).toHaveURL(/#\/slow\/kind$/);
}

test("asks the language first, in both languages, then the first question", async ({ page }) => {
  await page.goto("#/slow");
  await expect(page).toHaveURL(/#\/slow\/lang$/);
  await expect(title(page)).toContainText("भाषा चुनें");
  await expect(title(page)).toContainText("Choose a language");
  await page.locator("[data-slow=lang] button[data-value=en]").click();
  await expect(page).toHaveURL(/#\/slow\/kind$/);
  await expect(title(page)).toHaveText("What happened?");
  await expect(title(page)).toBeFocused();
});

test("a tap moves on by itself; a typed answer needs Continue", async ({ page }) => {
  await begin(page);
  await expect(page.locator("[data-action=continue]")).toHaveCount(0);
  await page.locator('[data-field=kind] [data-value="death"]').click();
  await expect(page).toHaveURL(/#\/slow\/role$/);
  await expect(title(page)).toHaveText("How were they involved?");
  await page.locator('[data-field=victimRole] [data-value="not_driving"]').click();
  await page.locator('[data-field=vehicleTraced] [data-value="yes"]').click();
  await page.locator('[data-field=s164] [data-value="none"]').click();
  await expect(page).toHaveURL(/#\/slow\/age$/);
  await page.fill("#age", "30");
  await expect(page).toHaveURL(/#\/slow\/age$/);
  await page.locator("[data-action=continue]").click();
  await expect(page).toHaveURL(/#\/slow\/work$/);
});

test("Continue with an answer missing says so, and stays", async ({ page }) => {
  await begin(page);
  for (const [k, v] of [
    ["kind", "death"],
    ["victimRole", "not_driving"],
    ["vehicleTraced", "yes"],
    ["s164", "none"],
  ])
    await page.locator(`[data-field=${k}] [data-value="${v}"]`).click();
  await page.locator("[data-action=continue]").click();
  await expect(page).toHaveURL(/#\/slow\/age$/);
  await expect(page.locator("#age-error")).toBeVisible();
  await expect(page.locator("#age")).toBeFocused();
});

test("a follow-up question appears on the same screen", async ({ page }) => {
  await fillSlowTo(page, "work");
  await expect(page.locator("[data-field]")).toHaveCount(1);
  await page.locator('[data-field=employment] [data-value="permanent"]').click();
  await expect(page).toHaveURL(/#\/slow\/work$/);
  await expect(page.locator("[data-field=proof]")).toBeVisible();
  await page.locator('[data-field=proof] [data-value="salary_slip"]').click();
  await expect(page.locator("#monthlySalary")).toBeVisible();
});

test("an answer that ends the claim says what to do instead, and can be changed", async ({ page }) => {
  await begin(page);
  await page.locator('[data-field=kind] [data-value="death"]').click();
  await page.locator('[data-field=victimRole] [data-value="owner_driver_single_vehicle"]').click();
  await expect(page).toHaveURL(/#\/slow\/stop$/);
  await expect(title(page)).toHaveText("No estimate");
  await expect(page.locator("[data-stop]")).toBeVisible();
  await page.locator("[data-action=change-stop]").click();
  await expect(page).toHaveURL(/#\/slow\/role$/);
  await page.locator('[data-field=victimRole] [data-value="not_driving"]').click();
  await expect(page).toHaveURL(/#\/slow\/traced$/);
});

test("the amount comes right after the last quick answer, and the steps left only go down", async ({
  page,
}) => {
  const left: number[] = [];
  const screens = new Set<string>();
  const where = await fillSlow(page, salaried, {
    onScreen: async (at) => {
      if (!at.startsWith("screen:")) return;
      screens.add(at);
      left.push(Number(await page.getByTestId("meter").getAttribute("data-left")));
    },
  });
  expect(where).toBe("result");
  for (let i = 1; i < left.length; i++) expect(left[i]).toBeLessThanOrEqual(left[i - 1]!);
  // Death, salaried: what happened, role, vehicle, settlement, age, work, family, when, where. Nine screens.
  expect([...screens]).toEqual(onPath(formFromInput(salaried)).map((s) => `screen:${s}`));
  expect(screens.size).toBe(9);
  await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute(
    "data-amount",
    String(expected(salaried).headline!.amount),
  );
});

test("each detail after the amount says how it moved the amount", async ({ page }) => {
  await fillSlow(page, salaried, { details: false });
  await expect(page).toHaveURL(/#\/slow\/amount$/);
  await page.locator("[data-action=refine]").click();
  await expect(page).toHaveURL(/#\/slow\/more\/medical$/);
  await expect(page.getByTestId("mini-amount")).toBeVisible();
  await page.fill("#medicalBills", "1,00,000");
  await page.locator("[data-action=continue]").click();
  await expect(page).toHaveURL(/#\/slow\/more\/tax$/);
  await expect(page.getByTestId("change")).toContainText("Up ₹1,00,000");
  await page.locator("[data-action=skip]").click();
  await expect(page).not.toHaveURL(/#\/slow\/more\/tax$/);
});

test("an answer chip goes back to its question, then back to where you were", async ({ page }) => {
  await fillSlow(page, salaried);
  await expect(page).toHaveURL(/#\/slow\/amount$/);
  const before = await page.locator("[data-testid=headline] [data-amount]").getAttribute("data-amount");
  await page.locator("[data-chip=age]").click();
  await expect(page).toHaveURL(/#\/slow\/age$/);
  await expect(page.locator("#age")).toHaveValue(String(salaried.victim.ageYears));
  await page.fill("#age", "45");
  await page.locator("[data-action=continue]").click();
  await expect(page).toHaveURL(/#\/slow\/amount$/);
  await expect(page.locator("[data-testid=headline] [data-amount]")).not.toHaveAttribute(
    "data-amount",
    before!,
  );
});

test("the list of answers has a Change link for each, which comes back to the list", async ({ page }) => {
  await fillSlow(page, salaried);
  await page.locator("[data-action=review]").click();
  await expect(page).toHaveURL(/#\/slow\/review$/);
  await expect(title(page)).toHaveText("Check your answers");
  await expect(page.locator("[data-review=age]")).toContainText(String(salaried.victim.ageYears));
  await page.locator("[data-change=state]").click();
  await expect(page).toHaveURL(/#\/slow\/state$/);
  await page.locator('[data-field=state] [data-value="HR"]').click();
  await expect(page).toHaveURL(/#\/slow\/review$/);
  await expect(page.locator("[data-review=state]")).toContainText("Haryana");
});

test("the amount and the list of answers have Start again, which asks first", async ({ page }) => {
  await fillSlow(page, salaried);
  for (const at of ["amount", "review"]) {
    await page.goto(`#/slow/${at}`);
    await page.getByTestId("restart").click();
    await page.getByRole("button", { name: "Keep my answers" }).click();
    await expect(page.getByTestId("restart")).toBeFocused();
  }
  await expect(page.locator("[data-review=age]")).toContainText(String(salaried.victim.ageYears));
  await page.getByTestId("restart").click();
  await page.getByTestId("restart-confirm").click();
  await expect(page).toHaveURL(/#\/slow\/kind$/);
  await expect(page.locator("[data-chip]")).toHaveCount(0);
});

test("the state question says, before a state is picked, where there is no wage to estimate from", async ({
  page,
}) => {
  const { input } = examples().find((e) => e.name === "death-homemaker.yaml")!;
  await fillSlow(page, input, { details: false });
  await page.goto("#/slow/state");
  await expect(page.locator('[data-field=state] [data-value="HR"]')).toContainText("No wage data yet");
  await expect(page.locator('[data-field=state] [data-value="DL"]')).not.toContainText("No wage data yet");
});

test("each screen opens at its top, even when the browser reports the last scroll after the tap", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fillSlowTo(page, "family");
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await page.goto("#/slow/work");
  await expect(title(page)).toBeFocused();
  // On a long screen the person scrolls down to Continue and taps it. The browser can report that scroll after the
  // tap has changed the address; here it does so every time.
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    location.hash = "#/slow/family";
    window.dispatchEvent(new Event("scroll"));
  });
  await expect(page).toHaveURL(/#\/slow\/family$/);
  await expect(title(page)).toBeFocused();
  await expect(title(page)).toBeInViewport();
});

test("the phone's back gesture steps back one question, keeping the answer", async ({ page }) => {
  await begin(page);
  await page.locator('[data-field=kind] [data-value="injury"]').click();
  await expect(page).toHaveURL(/#\/slow\/role$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/slow\/kind$/);
  await expect(page.locator('[data-field=kind] [data-value="injury"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("[data-action=back]").click();
  await expect(page).toHaveURL(/#\/$/);
});

test("an answer that says little on its own says what it answers in the strip", async ({ page }) => {
  await fillSlowTo(page, "age");
  await expect(page.locator("[data-chip=vehicleTraced]")).toContainText("Vehicle found: Yes");
  await expect(page.locator("[data-chip=kind]")).toContainText("They died");
});

test("a reload keeps the place and every answer", async ({ page }) => {
  await fillSlowTo(page, "family");
  await page.reload();
  await expect(page).toHaveURL(/#\/slow\/family$/);
  await expect(page.locator("[data-chip=age]")).toBeVisible();
  await expect(page.locator("[data-chip=employment]")).toBeVisible();
});

test("an address cannot skip questions that are still to answer", async ({ page }) => {
  await begin(page);
  await page.goto("#/slow/state");
  await settle(page);
  await expect(page).toHaveURL(/#\/slow\/kind$/);
  await page.goto("#/slow/amount");
  await settle(page);
  await expect(page).toHaveURL(/#\/slow\/kind$/);
});

test("in Hindi from the first question to the amount", async ({ page }) => {
  let checked = false;
  const where = await fillSlow(page, salaried, {
    lang: "hi",
    onScreen: async (at) => {
      if (at !== "screen:kind" || checked) return;
      checked = true;
      await expect(title(page)).toHaveText("क्या हुआ?");
      await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    },
  });
  expect(where).toBe("result");
  expect(checked).toBe(true);
  await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute(
    "data-amount",
    String(expected(salaried).headline!.amount),
  );
});

test("five or more children: the count is asked before moving on", async ({ page }) => {
  await fillSlowTo(page, "family");
  await page.locator('[data-field=married] [data-value="yes"]').click();
  await page.locator('[data-field=spouse] [data-value="yes"]').click();
  await page.locator('[data-field=children] [data-value="more"]').click();
  await expect(page).toHaveURL(/#\/slow\/family$/);
  await page.locator("#childrenMore-more").click();
  await expect(page.locator("#childrenMore")).toHaveValue("6");
  await page.locator('[data-field=parents] [data-value="0"]').click();
  await expect(page).toHaveURL(/#\/slow\/when$/);
  await expect(page.locator("[data-chip=children]")).toHaveText(/6 children/);
});

test("once the claim and the work are known, it says how many real cases are like this, without amounts", async ({
  page,
}) => {
  const n = countSimilar({ kind: "death", employment: "permanent" }, loadCases());
  expect(n).toBeGreaterThan(1);
  await fillSlowTo(page, "work");
  await expect(page.getByTestId("cases-preview")).toHaveCount(0);
  await fillSlowTo(page, "family");
  await expect(page.getByTestId("cases-preview")).toHaveText(
    `${n} real court cases are like this one. You will see the closest with your estimate.`,
  );
  await expect(page.getByTestId("cases-preview")).not.toContainText("₹");
});

test("the offer check works from the amount", async ({ page }) => {
  await fillSlow(page, salaried, { details: false });
  await page.getByRole("link", { name: "Check an insurer's offer" }).click();
  await page.fill("#offer-amount", "10,00,000");
  await page.getByRole("button", { name: "Check the offer" }).click();
  const c = checkOffer(expected(salaried), 1_000_000, {
    yearsToAward: rules.statutory.pendency.tribunal_years,
    awardInterestPct: 7.5,
    discountPct: 7,
    lawyerFeePct: 0,
  });
  await expect(page.getByTestId("offer-pct-std")).toHaveText(`${c.offerPctOfStandard}%`);
});

test("can be answered with the keyboard alone, to the amount", async ({ page }) => {
  const press = async (selector: string) => {
    await tabTo(page, selector);
    await page.keyboard.press("Enter");
  };
  const type = async (selector: string, text: string) => {
    await tabTo(page, selector);
    await page.keyboard.type(text);
  };
  await page.goto("#/slow");
  await press("[data-slow=lang] button[data-value=en]");
  await press('[data-field=kind] [data-value="death"]');
  await expect(page).toHaveURL(/#\/slow\/role$/);
  await press('[data-field=victimRole] [data-value="not_driving"]');
  await press('[data-field=vehicleTraced] [data-value="yes"]');
  await press('[data-field=s164] [data-value="none"]');
  await type("#age", "30");
  await press("[data-action=continue]");
  await press('[data-field=employment] [data-value="permanent"]');
  await press('[data-field=proof] [data-value="salary_slip"]');
  await type("#monthlySalary", "25000");
  await press("[data-action=continue]");
  await press('[data-field=married] [data-value="yes"]');
  await press('[data-field=spouse] [data-value="yes"]');
  await press('[data-field=children] [data-value="2"]');
  await press('[data-field=parents] [data-value="0"]');
  // The phone's own lists answer to typing.
  await type("#accidentDate-month", "June");
  await type("#accidentDate-year", "2025");
  await press("[data-action=continue]");
  await press('[data-field=state] [data-value="DL"]');
  await expect(page).toHaveURL(/#\/slow\/amount$/);
  await expect(page.locator("[data-testid=headline] [data-amount]")).toHaveAttribute(
    "data-amount",
    String(expected(salaried).headline!.amount),
  );
});

/** Answers the salaried example up to (not including) a screen. */
async function fillSlowTo(page: import("@playwright/test").Page, screen: string) {
  await fillSlow(page, salaried, {
    onScreen: async (at) => {
      if (at === `screen:${screen}`) throw new Arrived();
    },
  }).catch((e: unknown) => {
    if (!(e instanceof Arrived)) throw e;
  });
  expect(await slowAt(page)).toBe(`screen:${screen}`);
}
class Arrived extends Error {}
