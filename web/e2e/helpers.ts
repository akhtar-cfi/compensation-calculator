import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test as base, expect, type Page } from "@playwright/test";
import { parse } from "yaml";
import { estimate } from "../../src/engine/index.js";
import { EstimateInputSchema, type EstimateInput } from "../../src/engine/types.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { chosen, QUESTION, rawAnswer, type ChoiceField, type QuestionId } from "../src/answers.js";
import { refineFields, REFINES } from "../src/flow.js";
import type { FormState } from "../src/form-to-input.js";
import { formFromInput } from "./answers";

export const rules = loadRules();

/** Every test fails if the page throws or logs an error, and the report shows the message. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      // Against the deployed site, test visits must not be counted: visit reports are answered here instead.
      if (process.env.E2E_BASE_URL)
        await page.route("**/_vercel/insights/**", (r) =>
          r.request().method() === "POST" ? r.fulfill({ status: 204 }) : r.continue(),
        );
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}\n${e.stack ?? ""}`));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
      });
      await use(errors);
      expect(errors, "errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** Today in the browser's sense (the page uses the local date as its as-of date). */
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function examples(): { name: string; input: EstimateInput }[] {
  const dir = join(REPO_ROOT, "examples");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => ({ name: f, input: EstimateInputSchema.parse(parse(readFileSync(join(dir, f), "utf8"))) }));
}

export const expected = (input: EstimateInput) => estimate(rules, input, { asOf: today() });

export const radio = (page: Page, name: string, value: string) =>
  page.locator(`input[name="${name}"][value="${value}"]`).check();

/** Types a date (YYYY-MM-DD) into the three day / month / year boxes. */
export async function fillDate(page: Page, id: string, iso: string) {
  const [y, m, d] = iso.split("-");
  await page.fill(`#${id}-day`, String(Number(d)));
  await page.fill(`#${id}-month`, String(Number(m)));
  await page.fill(`#${id}-year`, y!);
}

/** Picks the accident month and year (the quick question). */
export async function pickMonth(page: Page, iso: string) {
  const [y, m] = iso.split("-");
  await page.selectOption("#accidentDate-month", String(Number(m)));
  await page.selectOption("#accidentDate-year", y!);
}

/** Answers the number of children: a choice up to 4, then "5 or more" and the count. */
export async function setChildren(page: Page, n: number) {
  if (n < 5) return radio(page, "children", String(n));
  await radio(page, "children", "more");
  await page.fill("#childrenMore", String(n));
}

/** Opens a group of optional details, as a person would by tapping its title. */
export async function openGroup(page: Page, id: string) {
  const g = page.locator(`details[data-question="${id}"]`);
  if (!(await g.evaluate((d: HTMLDetailsElement) => d.open))) await g.locator("summary").click();
}

/** The page's three-way role question, from the engine's role. */
const role = (r: EstimateInput["victimRole"]) =>
  r === "owner_driver_single_vehicle" || r === "driver_of_involved_vehicle" ? r : "not_driving";

/** Answers one block on the page from an engine input, as a person would. */
async function answer(page: Page, block: string, input: EstimateInput) {
  const v = input.victim;
  const inc = v.income;
  const fam = input.family;
  const inj = input.injury;
  const traced =
    input.offendingVehicle === "unidentified" ? "no" : input.offendingVehicle ? "yes" : "unknown";
  switch (block) {
    case "kind":
      return radio(page, "kind", input.kind);
    case "checks":
      await radio(page, "victimRole", role(input.victimRole));
      await radio(page, "vehicleTraced", traced);
      return radio(
        page,
        "s164",
        input.s164 === "none" || input.s164 === "accepted_via_insurer" ? input.s164 : "unknown",
      );
    case "age":
      return page.fill("#age", String(v.ageYears));
    case "work":
      await radio(page, "employment", v.employment);
      if (await page.locator('input[name="proof"]').count()) {
        const proof = inc?.proof === "salary_slip" || inc?.proof === "itr" ? inc.proof : "none";
        await radio(page, "proof", proof);
      }
      if (inc?.monthlySalary !== undefined) await page.fill("#monthlySalary", String(inc.monthlySalary));
      if (inc?.itrAnnualIncomes?.[0])
        await page.fill("#itrAnnualIncome", String(inc.itrAnnualIncomes[0].income));
      if (v.occupationCode && (await page.locator("#occupationCode").count()))
        await page.selectOption("#occupationCode", v.occupationCode);
      if (inc?.pensionMonthly !== undefined) await page.fill("#pensionMonthly", String(inc.pensionMonthly));
      return;
    case "family":
      await radio(page, "married", fam.married ? "yes" : "no");
      if (input.kind === "death") {
        if (fam.married) await radio(page, "spouse", fam.spouse ? "yes" : "no");
        await setChildren(page, fam.children ?? 0);
        await radio(page, "parents", String(fam.parents ?? 0));
        if (fam.parents)
          await radio(
            page,
            "dependentParents",
            fam.dependentParents === undefined ? "unknown" : String(fam.dependentParents),
          );
      }
      return;
    case "injury":
      if (inj?.certificatePct !== undefined) {
        await page.fill("#certificatePct", String(inj.certificatePct));
        await radio(page, "certificateBasis", inj.certificateBasis ?? "unknown");
      } else await page.check("#noCertificate");
      return page.fill("#monthsOffWork", String(inj?.monthsOffWork ?? 0));
    case "when":
      return pickMonth(page, input.accidentDate);
    case "state":
      return radio(page, "state", input.state);
    case "dates": {
      const day = Number(input.accidentDate.split("-")[2]);
      if (day === 1 && !input.claimFiledDate) return;
      await openGroup(page, "dates");
      if (day !== 1) await page.fill("#accidentDay", String(day));
      if (input.claimFiledDate) {
        await radio(page, "claimFiled", "yes");
        await fillDate(page, "claimFiledDate", input.claimFiledDate);
      }
      return;
    }
    case "insurance":
      if (!input.offendingVehicle) return;
      await openGroup(page, "insurance");
      return radio(page, "vehicleInsured", input.offendingVehicle === "identified_insured" ? "yes" : "no");
    case "earnings": {
      const todo = [
        inc?.monthlyTax,
        inc?.claimedMonthly,
        inc?.familyPensionMonthly,
        v.studentCourse,
        input.zone,
      ];
      if (todo.every((x) => x === undefined)) return;
      await openGroup(page, "earnings");
      if (inc?.monthlyTax !== undefined) await page.fill("#monthlyTax", String(inc.monthlyTax));
      if (inc?.claimedMonthly !== undefined) await page.fill("#claimedMonthly", String(inc.claimedMonthly));
      if (inc?.familyPensionMonthly !== undefined)
        await page.fill("#familyPensionMonthly", String(inc.familyPensionMonthly));
      if (v.studentCourse) await radio(page, "studentCourse", v.studentCourse);
      if (input.zone) await page.selectOption("#zone", input.zone);
      return;
    }
    case "dependants":
      if (fam.dependentParents === undefined) return;
      await openGroup(page, "dependants");
      return page.fill("#dependentParents", String(fam.dependentParents));
    case "recovery":
      if (!inj?.workCapacity && !inj?.permanentAttendant) return;
      await openGroup(page, "recovery");
      if (inj.workCapacity) await radio(page, "workCapacity", inj.workCapacity);
      if (inj.permanentAttendant) await page.check("#permanentAttendant");
      return;
    case "medical":
      if (input.medical?.bills === undefined) return;
      await openGroup(page, "medical");
      await page.fill("#medicalBills", String(input.medical.bills));
      if (input.medical.paidByCashlessScheme !== undefined)
        await page.fill("#cashlessPaid", String(input.medical.paidByCashlessScheme));
      return;
    default:
      throw new Error(`no answer for block ${block}`);
  }
}

/**
 * Fills the page from an engine input, the way a person would: the quick steps top to bottom (an answer can bring
 * up a follow-up), then any details the input has. Returns what the estimate then shows: an estimate, or a stop.
 * `at`: the address of the page with the form (the start page, or "See it all" and "Full detail").
 */
export async function fillForm(page: Page, input: EstimateInput, at = "#/all"): Promise<"result" | "stop"> {
  await page.goto(at);
  await expect(page.locator("[data-question]").first()).toBeVisible();
  // From a clean form, whatever an earlier step left ("Start again" shows only when there are answers).
  if (await page.getByTestId("restart").count()) {
    await page.getByTestId("restart").click();
    await page.getByTestId("restart-confirm").click();
  }
  const done = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const ids = await page
      .locator("[data-question]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-question")!));
    const next = ids.find((id) => !done.has(id));
    if (!next) break;
    done.add(next);
    await answer(page, next, input);
  }
  const shown = page.locator("#result [data-testid=headline], #result [data-testid=no-estimate]");
  await expect(shown.first()).toBeVisible();
  if (await page.locator("#result [data-testid=headline]").count()) return "result";
  return "stop";
}

/** Fails the test if the page asks for anything outside its own origin (fonts, data and code are all bundled). */
export function guardRequests(page: Page, baseURL: string): string[] {
  const outside: string[] = [];
  const origin = new URL(baseURL).origin;
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) outside.push(u);
  });
  return outside;
}

/* ------------------------------------------- "Take it slow" -------------------------------------------- */

/** Waits for the page to finish reacting to an answer: the new address, then the new screen drawn. */
export const settle = (page: Page) =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

/** Where "Take it slow" is: "lang", "screen:<id>", "refine:<id>", "amount", "stop" or "review". */
export const slowAt = async (page: Page) =>
  (await page.locator("section[data-slow]").getAttribute("data-slow")) ?? "";

/** Gives one answer on a "Take it slow" screen as a person would: a tap, typing, or a pick from a list. */
export async function giveSlow(page: Page, k: QuestionId, want: FormState) {
  const field = page.locator(`[data-field="${k}"]`);
  switch (QUESTION[k].control.type) {
    case "choice": {
      const value = chosen(k as ChoiceField, want);
      await field.locator(`[data-value="${value}"]`).click();
      if (k === "children" && value === "more") await page.fill("#childrenMore", want.children);
      return;
    }
    case "flag":
      return field.locator(`[data-value="${want.permanentAttendant ? "yes" : "no"}"]`).click();
    case "number":
    case "money":
      return page.fill(`#${k}`, rawAnswer(want, k));
    case "monthYear": {
      const [y = "", m = ""] = want.accidentDate.split("-");
      await page.selectOption("#accidentDate-month", m);
      return page.selectOption("#accidentDate-year", y);
    }
    case "date":
      return fillDate(page, "claimFiledDate", want.claimFiledDate);
    case "occupation":
      return page.selectOption("#occupationCode", want.occupationCode);
    case "zone":
      return page.selectOption("#zone", want.zone);
    case "certificate":
      if (want.noCertificate) return field.locator('[data-value="none"]').click();
      return page.fill("#certificatePct", want.certificatePct);
  }
}

/**
 * Answers "Take it slow" from an engine input, as a person would: the language, then each screen's questions as they
 * come up (a tap moves on by itself; a typed answer needs Continue), then the details the input has, offered one at a
 * time after the amount (the others skipped; none with `details: false`). Returns where it ended: the amount, or a
 * stop. `onScreen` sees each place on the way (to check the steps left).
 */
export async function fillSlow(
  page: Page,
  input: EstimateInput,
  opts: { lang?: "en" | "hi"; onScreen?: (at: string) => Promise<void>; details?: boolean } = {},
): Promise<"result" | "stop"> {
  const want = formFromInput(input);
  const details =
    opts.details !== false &&
    REFINES.some((r) => refineFields(r, want).some((k) => rawAnswer(want, k) !== ""));
  let walked = false;
  // From a clean slate: whatever an earlier step answered in this tab is forgotten.
  await page.goto("#/slow");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  for (let step = 0; step < 80; step++) {
    await settle(page);
    const at = await slowAt(page);
    await opts.onScreen?.(at);
    if (at === "lang") await page.locator(`[data-slow=lang] button[data-value=${opts.lang ?? "en"}]`).click();
    else if (at === "stop") return "stop";
    else if (at === "amount") {
      if (!details || walked) return "result";
      walked = true;
      await page.locator("[data-action=refine]").click();
    } else if (at.startsWith("screen:") || at.startsWith("refine:")) {
      const shown = await page
        .locator("[data-field]")
        .evaluateAll((els) =>
          els.map((e) => [e.getAttribute("data-field")!, e.getAttribute("data-answered")]),
        );
      const next = shown.find(([k, a]) => a === "false" && rawAnswer(want, k as QuestionId) !== "");
      if (next) await giveSlow(page, next[0] as QuestionId, want);
      else if (at.startsWith("refine:")) {
        const gave = shown.some(([k]) => rawAnswer(want, k as QuestionId) !== "");
        await page.locator(`[data-action=${gave ? "continue" : "skip"}]`).click();
      } else await page.locator("[data-action=continue]").click();
    } else throw new Error(`unexpected place "${at}"`);
  }
  throw new Error("'Take it slow' did not reach the amount or a stop");
}

/* ------------------------------------------- "Talk it through" ------------------------------------------- */

/** What the chat asks now: "lang", "ask:<id>", "refine:<id>", "offerRefine", "stop" or "done". */
export const chatAt = async (page: Page) =>
  (await page.locator("[data-chat-step]").getAttribute("data-chat-step")) ?? "";

/** Gives one answer in the chat as a person would: a tap on a picture, or typing (or picking) and Send. */
export async function giveChat(page: Page, k: QuestionId, want: FormState) {
  const ask = page.locator("[data-chat-step]");
  const send = () => ask.locator("[data-action=send]").click();
  switch (QUESTION[k].control.type) {
    case "choice": {
      const value = chosen(k as ChoiceField, want);
      await ask.locator(`[data-value="${value}"]`).click();
      if (k === "children" && value === "more") {
        await page.fill("#childrenMore", want.children);
        await send();
      }
      return;
    }
    case "flag":
      return ask.locator(`[data-value="${want.permanentAttendant ? "yes" : "no"}"]`).click();
    case "certificate":
      if (want.noCertificate) return ask.locator('[data-value="none"]').click();
      await page.fill("#certificatePct", want.certificatePct);
      return send();
    case "number":
    case "money":
      await page.fill(`#${k}`, rawAnswer(want, k));
      return send();
    case "monthYear": {
      const [y = "", m = ""] = want.accidentDate.split("-");
      await page.selectOption("#accidentDate-month", m);
      await page.selectOption("#accidentDate-year", y);
      return send();
    }
    case "date":
      await fillDate(page, "claimFiledDate", want.claimFiledDate);
      return send();
    case "occupation":
      await page.selectOption("#occupationCode", want.occupationCode);
      return send();
    case "zone":
      await page.selectOption("#zone", want.zone);
      return send();
  }
}

/**
 * Answers "Talk it through" from an engine input, as a person would: the language, each question as it is asked
 * (optional ones the input leaves empty are skipped), then, if the input has details and `details` is not false,
 * "make it more accurate" and the details one by one. Returns where it ended: the amount, or a stop.
 */
export async function fillChat(
  page: Page,
  input: EstimateInput,
  opts: { lang?: "en" | "hi"; details?: boolean } = {},
): Promise<"result" | "stop"> {
  const want = formFromInput(input);
  const details =
    opts.details !== false &&
    REFINES.some((r) => refineFields(r, want).some((k) => rawAnswer(want, k) !== ""));
  await page.goto("#/chat");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  for (let step = 0; step < 120; step++) {
    await settle(page);
    const at = await chatAt(page);
    const ask = page.locator("[data-chat-step]");
    if (at === "lang") await ask.locator(`button[data-value=${opts.lang ?? "en"}]`).click();
    else if (at === "stop") return "stop";
    else if (at === "done") return "result";
    else if (at === "offerRefine") await ask.locator(`[data-value=${details ? "yes" : "no"}]`).click();
    else if (at.startsWith("ask:") || at.startsWith("refine:")) {
      const k = at.slice(at.indexOf(":") + 1) as QuestionId;
      if (rawAnswer(want, k) === "") {
        if (!QUESTION[k].optional) throw new Error(`no answer for ${k}`);
        await ask.locator("[data-action=skip]").click();
      } else await giveChat(page, k, want);
    } else throw new Error(`unexpected chat step "${at}"`);
  }
  throw new Error("the chat did not reach the amount or a stop");
}

/** Presses Tab until the element is focused, as a keyboard user moves through a page. */
export async function tabTo(page: Page, selector: string) {
  for (let i = 0; i < 80; i++) {
    if (await page.locator(selector).evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`could not reach ${selector} with Tab`);
}
